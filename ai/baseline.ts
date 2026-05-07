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
  NeutralKind,
  Order,
  Party,
  PartyId,
  TileCoord,
} from '../engine/types.ts';

import { antPlacement } from './placement-helpers.ts';
import {
  buildAntPolicy,
  CEILING_CAPABLE,
  moveToOrHold,
  nextStageTarget,
  partyAlive,
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
const RECRUIT: AbilityId = 'recruit' as AbilityId;

/**
 * Round-9 neutral recruit priority. Only cockroaches are worth a
 * recruit attempt — 8 units of attack-6/agility-7 on permanent
 * conversion is a major firepower lift. Mice (3 units) and stinkbugs
 * (failed attempt spawns a damage zone) are skipped: stopping to
 * recruit costs the dive-spear party a movement turn each attempt
 * (25% success, so ~4 turns on average), which is too expensive for
 * a 3-unit yield. Stinkbugs are also actively dangerous on failure.
 */
const NEUTRAL_RECRUIT_VALUE: Readonly<Record<NeutralKind, number>> = {
  cockroaches: 1,
  mice: 0,
  stinkbugs: 0,
};

/**
 * Round-9: pick the highest-value co-located, recruitable neutral
 * party. "Recruitable" = same tile as `party`, not already converted,
 * not currently spider-hypnotized (engine consumes the order without
 * effect), at least one living unit, and `kind !== 'stinkbugs'` (we
 * skip stinkbugs to avoid the damage-zone spawn on failure). Tie-break
 * by lex party-id for determinism.
 */
const pickNeutralRecruitTarget = (state: GameState, party: Party): PartyId | undefined => {
  let best: { id: PartyId; value: number } | undefined;
  for (const [id, candidate] of state.parties) {
    if (candidate.faction !== 'neutral') continue;
    if (!sameCoord(candidate.location, party.location)) continue;
    if (candidate.units.every((u) => u.currentHp <= 0)) continue;
    const status = state.neutralStatus.get(id);
    if (!status) continue;
    if (status.hypnotizedBy === 'spider' && status.hypnoticControlRemaining > 0) continue;
    const value = NEUTRAL_RECRUIT_VALUE[status.kind] ?? 0;
    if (value <= 0) continue;
    if (!best || value > best.value || (value === best.value && id < best.id)) {
      best = { id, value };
    }
  }
  return best?.id;
};

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

const baselineCore: AIPolicy = buildAntPolicy(
  'baseline-staging',
  (state: GameState) => {
    const stageTarget = nextStageTarget(state);
    const webLoc = postLocation(state, SPIDER_WEB);
    const isOpeningTurn = state.turn === 0;
    const committed = wallCracksCaptured(state);
    const bravoMayDive = anySoapDishCaptured(state);
    return (party) => {
      // Turn-0 freebie: ceiling-capable parties self-buff with jelly-
      // apply. Costs nothing (no movement yet) and the multiplier
      // persists into the kill battle.
      if (isOpeningTurn && CEILING_CAPABLE.has(party.id)) {
        return { orders: [jellyApplyOrder(party.id)], posture: 'fight' };
      }

      // Round-9 neutral recruit opportunity: any ant-mage-bearing
      // party co-located with a non-stinkbug, non-hypnotized neutral
      // tries `recruit`. 25% success → permanent conversion of the
      // entire neutral party (cockroaches yield 8 units of attack-6/
      // agility-7). On failure the order is consumed but no damage
      // zone (we skip stinkbugs explicitly via NEUTRAL_RECRUIT_VALUE).
      if (partyHasAbility(party, RECRUIT, state.unitTemplates)) {
        const recruitTarget = pickNeutralRecruitTarget(state, party);
        if (recruitTarget !== undefined) {
          const order: AbilityOrder = {
            kind: 'use-ability',
            abilityId: RECRUIT,
            target: recruitTarget,
          };
          return { orders: [order], posture: 'fight' };
        }
      }

      // Coordinated kill-dive (round 6): both ceiling-capable parties
      // (pathfinders, vanguard-bravo) run the floor (web.x, web.y) →
      // ceiling (web.x, web.y) plane-switch route from turn 1 onward.
      // Each mage's `ant-plane-switch` (uses=1) is reserved for the
      // kill-jump rather than spent on staging. The two parties
      // arrive at the launch tile within a turn of each other so the
      // kill battle is two-on-many, not one-on-many. The bravo dive
      // line is a floor approach, so the round-3 deep-raider spider
      // party on east-wall (5,5) cannot intercept; the deep-raider
      // awareness from round 3 (a wall-crack-ladder detour) is no
      // longer needed.
      if (party.id === PATHFINDERS) {
        const target = killDiveTarget(party.location, webLoc);
        if (target !== undefined) {
          return { orders: moveToOrHold(party, target), posture: 'fight' };
        }
      }
      // Round-9: vanguard-bravo joins the dive line earlier. The
      // gate moves from "any wall-crack captured" (round 6) to "any
      // soap-dish captured" (round 9) — the canonical chain's first
      // POST flips around turn 4-5 with the round-9 forward
      // placement, so bravo arrives at the launch tile in time to
      // assist pathfinders rather than trailing by 4-5 turns.
      if (party.id === VANGUARD_BRAVO && bravoMayDive) {
        const target = killDiveTarget(party.location, webLoc);
        if (target !== undefined) {
          return { orders: moveToOrHold(party, target), posture: 'fight' };
        }
      }

      // Commit phase: once the canonical chain is complete, vanguard-
      // alpha (the only field party not on the dive line) walks the
      // canonical wall-crack ladder via the paired-POST shortcut at
      // towel-rack to the spider-web.
      if (committed && webLoc !== undefined) {
        return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
      }

      // Staging phase: walk the canonical chain (soap-dish → towel-
      // rack → wall-crack) per `nextStageTarget`.
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
  },
  queenGuardOrders,
);

export const baselinePlayer: AIPolicy = { ...baselineCore, placement: baselinePlacement };
