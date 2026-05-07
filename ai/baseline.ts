/**
 * Baseline player AI — the standard ant strategy.
 *
 * Strategy: "soap-dish staging axis + coordinated dual plane-switch
 * kill-dive + queen-guard jelly supply." A competent default that any
 * standard player would discover, with three round-6 additions that
 * respect the round-5 geometry (plane affinity, asymmetric plane-
 * switch, day/night, pheromone trail). Variants like rush / turtle /
 * flank / dive / jelly-rush remain genuine meta-strategies that beat
 * the baseline through smarter routing or timing.
 *
 *   1. Turn 0 freebie: ceiling-capable parties (pathfinders, vanguard-
 *      bravo — both carry an ant-mage) self-buff with `jelly-apply`. The
 *      buff costs nothing on turn 0 (parties haven't moved yet) and the
 *      attack/armor multiplier is still active when the assault hits the
 *      web a few turns later.
 *   2. Coordinated kill-dive (round 6): from turn 1 onward, BOTH
 *      ceiling-capable parties (pathfinders, vanguard-bravo) run the
 *      floor (web.x, web.y) → ceiling (web.x, web.y) plane-switch
 *      route. Each dive goes via the launch tile (floor under the web)
 *      so that a follow-up `move-to` with target=web fires
 *      `tryPlaneTransition` → `ant-plane-switch` (uses=1, consumes
 *      the turn's order), teleporting onto the web tile and bypassing
 *      web-watch's ceiling patrol arc. Pathfinders is the dedicated
 *      jelly-stacked spear; vanguard-bravo arrives a turn or two
 *      behind to sustain the kill battle. The bravo dive line is a
 *      floor approach, so the round-3 deep-raider party on east-wall
 *      (5,5) cannot intercept (its threat arc was specifically the
 *      ceiling/wall-ladder approach the baseline previously took).
 *   3. Queen-guard jelly supply (round 6): the queen-guard's worker
 *      sits idle by spec (queen is immobile). Round 6 puts the worker
 *      on the same supply line the dive variant pioneered — a
 *      `jelly-apply` order targeting pathfinders every turn. Doses
 *      stack / refresh via the engine's `jellyMultipliers` lookup;
 *      combined with the turn-0 self-buff, pathfinders enters the
 *      web battle with a multi-dose attack/armor multiplier stack.
 *      Targeting pathfinders specifically (vs jelly-rush's "closest
 *      field party") concentrates the dose stack on the kill spear.
 *   4. Staging axis (vanguard-alpha): the floor-only vanguard-alpha
 *      walks the canonical chain (soap-dish → towel-rack → wall-
 *      crack) per `nextStageTarget`. This sustains POST capture
 *      pressure and keeps a meaningful target for the spider AI's
 *      counter-push, distinguishing baseline from `rush` (which
 *      abandons the staging axis entirely) and `dive` (which sends
 *      both vanguards to the web).
 *   5. Commit to the kill (vanguard-alpha): once the canonical chain
 *      is complete (every wall-crack ant-owned), vanguard-alpha
 *      paths to the web through the canonical paired-POST ladder.
 *      Pathfinders + vanguard-bravo were already short-circuited
 *      into the dive branch.
 *
 * What this AI deliberately does NOT do (kept as variant-only meta):
 *   - per-spider-party micro-tactics that bypass web-watch via the
 *     (5,5) ceiling waypoint or the corner-flank route; see flank.
 *   - rushing the spider-web from turn 1 with no staging at all on
 *     the secondary axis; see rush / jelly-rush.
 *   - holding ceiling parties at home until the queen ultimate
 *     charges; see turtle.
 *   - per-mage recruit attempts on isolated spiderlings; see flank.
 */

import { partyHasAbility } from '../engine/abilities.ts';
import { sameCoord } from '../engine/coord.ts';
import type {
  AbilityId,
  AbilityOrder,
  GameState,
  Order,
  Party,
  PartyId,
  Rng,
  TileCoord,
} from '../engine/types.ts';

import {
  decideNeutralFollow,
  findRecruitableNeutralNear,
  partyHasScoutAndMage,
  pursueStep,
  RECRUIT_ABILITY,
  tryOpportunisticRecruit,
} from './neutral-recruit-helper.ts';
import { antPlacement } from './placement-helpers.ts';
import {
  buildAntPolicyWithRng,
  CEILING_CAPABLE,
  moveToOrHold,
  nextStageTarget,
  partyAlive,
  type PartyDecision,
  PATHFINDERS,
  postLocation,
  postsOfType,
  SOAP_DISH_TYPE,
  SPIDER_WEB,
  VANGUARD_BRAVO,
  WALL_CRACK_TYPE,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

/** True iff every wall-crack POST is ant-owned. After that, vanguard-
 * alpha (the only field party not on the dive line) commits to the
 * web. */
const wallCracksCaptured = (state: GameState): boolean => {
  const cracks = postsOfType(state, WALL_CRACK_TYPE);
  if (cracks.length === 0) return false;
  return cracks.every((p) => p.owner === 'ant');
};

/** True iff at least one soap-dish POST is ant-owned. Used as a light
 * gate on vanguard-bravo's dive: with the canonical chain just
 * cracked open, bravo's dive timing lines up with pathfinders'
 * launch-tile arrival — neither too early (no spider counter-push
 * commitment yet) nor too late (the round-8 wall-crack gate left
 * bravo trailing). */
const anySoapDishCaptured = (state: GameState): boolean => {
  for (const post of postsOfType(state, SOAP_DISH_TYPE)) {
    if (post.owner === 'ant') return true;
  }
  return false;
};

/** Constructs a `jelly-apply` ability order. Used for both the turn-0
 * self-buff (target = own party id) and the queen-guard supply line
 * (target = pathfinders). */
const jellyApplyOrder = (target: PartyId): AbilityOrder => ({
  kind: 'use-ability',
  abilityId: JELLY_APPLY,
  target,
});

/** True iff a living spider party occupies the same tile as `party`.
 * Used by the round-10 detour branch to avoid pulling a party off the
 * tile where a kill battle is about to resolve. */
const coLocatedWithSpider = (state: GameState, party: Party): boolean => {
  for (const candidate of state.parties.values()) {
    if (candidate.faction !== 'spider') continue;
    if (candidate.units.every((u) => u.currentHp <= 0)) continue;
    if (sameCoord(candidate.location, party.location)) return true;
  }
  return false;
};

/** Kill-dive target for a ceiling-capable party. The dive walks the
 * floor tile directly under the web (the "launch tile"); from the
 * launch tile a `move-to` order with target=web fires
 * `tryPlaneTransition` → `ant-plane-switch` (uses=1), teleporting
 * the party onto the ceiling web tile and bypassing web-watch's
 * patrol arc. Returns the launch tile while the party is on the
 * floor and not yet at the launch coord; otherwise returns the web
 * tile. Undefined iff web location is unknown. */
const killDiveTarget = (
  partyLoc: TileCoord,
  webLoc: TileCoord | undefined,
): TileCoord | undefined => {
  if (webLoc === undefined) return undefined;
  if (partyLoc.plane !== 'floor') return webLoc;
  const launchTile: TileCoord = { plane: 'floor', x: webLoc.x, y: webLoc.y };
  if (sameCoord(partyLoc, launchTile)) return webLoc;
  return launchTile;
};

/** Queen-guard hook (round 6): each turn, the queen-guard worker
 * fires a `jelly-apply` at pathfinders so doses stack / refresh.
 * Returns `[]` if pathfinders is missing, leaderless, or dead. The
 * engine routes the order via `jellyMultipliers`. */
const queenGuardOrders = (state: GameState, _queenGuard: Party): readonly Order[] => {
  const pf = state.parties.get(PATHFINDERS);
  if (!pf || pf.leaderless || !partyAlive(pf)) return [];
  return [jellyApplyOrder(PATHFINDERS)];
};

/**
 * Round-9 placement: vanguard-alpha forward to (3, 3) for early
 * canonical-chain capture; pathfinders forward to (4, 4) — one tile
 * back from the round-7 (5, 5) so the dive line keeps a tile of
 * slack from the deep-raider's forward-staged Chebyshev-3 detect arc
 * at floor (8, 5); vanguard-bravo forward to (3, 5) on the SW row.
 * Queen-guard stays at storm-drain (engine rejects any attempt to
 * move it). All within Chebyshev-5 of storm-drain.
 */
const baselinePlacement = (state: GameState): GameState =>
  antPlacement(state, {
    'vanguard-alpha': { plane: 'floor', x: 3, y: 3 },
    pathfinders: { plane: 'floor', x: 4, y: 4 },
    'vanguard-bravo': { plane: 'floor', x: 3, y: 5 },
  });

/**
 * Bundle of derived per-turn state passed to the main-strategy helper
 * so the round-11 layered branches don't recompute it. Single struct
 * instead of four parameters keeps the helper's signature short.
 */
interface MainStrategyContext {
  readonly stageTarget: ReturnType<typeof nextStageTarget>;
  readonly webLoc: TileCoord | undefined;
  readonly committed: boolean;
  readonly bravoMayDive: boolean;
}

/**
 * The pre-round-11 baseline order-pick: kill-dive for ceiling parties,
 * web-commit / staging-walk for vanguard-alpha. Returns the orders +
 * posture exactly as the policy-helpers framework expects. Pulled out
 * into a helper so the round-11 commit-or-abandon branches can fall
 * through to it after stashing an `ignore` decision.
 */
const mainStrategyOrders = (party: Party, ctx: MainStrategyContext): PartyDecision => {
  const { webLoc, committed, bravoMayDive, stageTarget } = ctx;
  // Coordinated kill-dive (round 6): both ceiling-capable parties
  // (pathfinders, vanguard-bravo) run the floor (web.x, web.y) →
  // ceiling (web.x, web.y) plane-switch route from turn 1 onward.
  if (party.id === PATHFINDERS) {
    const target = killDiveTarget(party.location, webLoc);
    if (target !== undefined) {
      return { orders: moveToOrHold(party, target), posture: 'fight' };
    }
  }
  // Round-9: vanguard-bravo joins the dive line earlier — gate flips
  // on any soap-dish captured.
  if (party.id === VANGUARD_BRAVO && bravoMayDive) {
    const target = killDiveTarget(party.location, webLoc);
    if (target !== undefined) {
      return { orders: moveToOrHold(party, target), posture: 'fight' };
    }
  }
  // Commit phase: every wall-crack ant-owned → vanguard-alpha walks
  // the canonical ladder to the web.
  if (committed && webLoc !== undefined) {
    return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
  }
  // Staging phase: walk the canonical chain (soap-dish → towel-rack
  // → wall-crack) per `nextStageTarget`.
  if (stageTarget !== undefined) {
    return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
  }
  // Every stage POST is ours but the wall-cracks-captured branch
  // didn't fire (rare race) — fall back to the web.
  if (webLoc !== undefined) {
    return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
  }
  return { orders: [], posture: 'fight' };
};

const baselineCore: AIPolicy = buildAntPolicyWithRng(
  'baseline-staging',
  (state: GameState, rng: Rng) => {
    const ctx: MainStrategyContext = {
      stageTarget: nextStageTarget(state),
      webLoc: postLocation(state, SPIDER_WEB),
      committed: wallCracksCaptured(state),
      bravoMayDive: anySoapDishCaptured(state),
    };
    const isOpeningTurn = state.turn === 0;
    // Round-11 dice fork. One stream per turn (forked off the policy
    // rng) so the per-party rolls are deterministic and don't share
    // entropy with battle/movement subsystems.
    const decisionRng = rng.fork('neutral-decision');
    return (party) => {
      // Turn-0 freebie: ceiling-capable parties self-buff with jelly-
      // apply. Costs nothing (no movement yet) and the multiplier
      // persists into the kill battle.
      if (isOpeningTurn && CEILING_CAPABLE.has(party.id)) {
        return { orders: [jellyApplyOrder(party.id)], posture: 'fight' };
      }

      // Round-11 neutral-recruit "commit-or-abandon" mechanic
      // (baseline only). Three layered branches:
      //
      //   (a) Opportunistic recruit — always fires when co-located
      //       with a recruitable neutral (cockroaches/mice; stinkbugs
      //       skipped to avoid the damage-zone spawn on failure).
      //       Independent of any pursue/ignore decision.
      //
      //   (b) Active pursue — if the party is currently committed to a
      //       `pursue` decision, walk one tile toward the target each
      //       turn until co-located, the target dies/converts, or the
      //       5-turn window expires (engine end-of-turn tick).
      //
      //   (c) New-decision roll — if the party is eligible (carries
      //       both ant-scout and ant-mage), no active decision, and a
      //       recruitable neutral sits within Chebyshev-3 on the same
      //       plane, roll 1-in-3:
      //         pursue → 5-turn detour toward the spotted target.
      //         ignore → 5-turn suppression of any further detour.
      //       This replaces round 10's per-turn detour-or-not flip
      //       (which was dragging baseline off-task on every cockroach
      //       random walk).
      //
      // Variants run only branch (a) so dive/rush/turtle/flank/jelly-
      // rush keep their primary strategies intact.
      const recruit = tryOpportunisticRecruit(state, party);
      if (recruit) return recruit;

      // Branch (b): an active `pursue` decision overrides all other
      // movement targets until it expires or the target is gone.
      if (party.neutralDecision?.kind === 'pursue') {
        const step = pursueStep(state, party, party.neutralDecision);
        if (step !== null) {
          return { orders: moveToOrHold(party, step), posture: 'fight' };
        }
        // Target gone or co-located — fall through. The end-of-turn
        // tick will drop the modifier next turn.
      }

      // Branch (c): roll a fresh decision. Eligible parties only
      // (scout + mage in the roster), no active decision, no enemy
      // spider co-located (a battle this turn outranks neutral
      // chasing), and a recruitable neutral within Chebyshev-3.
      // Active-ignore parties skip this block entirely (their decision
      // is non-undefined so the gate fails fast).
      const hasRecruit = partyHasAbility(party, RECRUIT_ABILITY, state.unitTemplates);
      if (
        hasRecruit &&
        party.neutralDecision === undefined &&
        partyHasScoutAndMage(party, state.unitTemplates) &&
        !coLocatedWithSpider(state, party)
      ) {
        const spotted = findRecruitableNeutralNear(state, party);
        if (spotted !== undefined) {
          const decision = decideNeutralFollow(decisionRng, spotted.partyId);
          if (decision.kind === 'pursue') {
            // Step toward the just-committed target this turn.
            const step = pursueStep(state, party, decision);
            return {
              orders: step !== null ? moveToOrHold(party, step) : [],
              posture: 'fight',
              setNeutralDecision: true,
              neutralDecision: decision,
            };
          }
          // Ignore: stash the 5-turn modifier and fall through to the
          // main strategy below this turn.
          const main = mainStrategyOrders(party, ctx);
          return { ...main, setNeutralDecision: true, neutralDecision: decision };
        }
      }

      return mainStrategyOrders(party, ctx);
    };
  },
  queenGuardOrders,
);

export const baselinePlayer: AIPolicy = { ...baselineCore, placement: baselinePlacement };
