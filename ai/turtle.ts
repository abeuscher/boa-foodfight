/**
 * Variant AI: "turtle" (round-4 redesign — charged-up combo)
 *
 * The original turtle held the ceiling-capable parties at home and let
 * the floor vanguards stage POSTs while the Queen ultimate charged.
 * Once charge crossed 80%, ceiling-capable parties walked to the web.
 *
 * The redesign replaces the binary hold-then-release with a true
 * charge-up combo:
 *
 *   Phase A (charge < CHARGE_PREPOSITION_FRACTION):
 *     - Ceiling-capable parties HOLD at home receiving jelly doses
 *       from the queen-guard worker (a `jelly-apply` is fired at the
 *       chosen "spear" party every turn — same supply-line hook the
 *       jelly-rush / dive variants use; the engine routes the dose
 *       and the per-turn jelly multiplier stacks/refreshes).
 *     - Floor vanguards stage POSTs canonically (same as baseline)
 *       so the spider counter-push fires and pulls silk-line/web-
 *       watch off the web — this is the "draw them out" half of the
 *       combo. Without it the spider AI keeps the web fully manned.
 *
 *   Phase B (CHARGE_PREPOSITION_FRACTION <= charge < CHARGE_UNLEASH_FRACTION):
 *     - Ceiling-capable parties move to a captured wall-crack POST
 *       on the canonical ladder (preposition step). Still receiving
 *       jelly doses each turn, but now within one move of the web.
 *     - Floor vanguards continue staging.
 *
 *   Phase C (charge >= CHARGE_UNLEASH_FRACTION):
 *     - ALL field parties commit to the web simultaneously. The
 *       jelly-stacked spear party arrives with a stockpiled attack/
 *       armor multiplier, alongside the queen ultimate window.
 *
 * Strategic trade vs baseline:
 *   - Wins: when the spider AI commits to its silk-line + spawn-
 *     spiderlings counter-push, those harassers are far from the web
 *     when the unleash hits — the kill battle is against a thinned
 *     web-guard while a fully-buffed spear lands.
 *   - Loses: the long charge-up gives the spider AI more turns of
 *     `early-raid` toward storm-drain. If silk-line breaches the
 *     storm-drain timeline before the unleash, the queen could fall
 *     before the assault fires. Real opportunity cost.
 *
 * The "spear" choice is fixed to `pathfinders` (the highest-mobility
 * ceiling-capable party). Concentrating doses on one party — same
 * mechanic that distinguishes `dive` from `jelly-rush` — produces a
 * larger multiplier stack than spreading across all parties.
 */

import type {
  AbilityId,
  AbilityOrder,
  GameState,
  Order,
  Party,
  TileCoord,
} from '../engine/types.ts';

import { tryOpportunisticRecruit } from './neutral-recruit-helper.ts';
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
  SPIDER_WEB,
  TOWEL_RACK_TYPE,
  WALL_CRACK_TYPE,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/** Charge fraction at which ceiling-capable parties begin prepositioning
 * to the wall-crack ladder (still holding back from the web). */
const CHARGE_PREPOSITION_FRACTION = 0.5;

/** Charge fraction at which all field parties commit to the web. */
const CHARGE_UNLEASH_FRACTION = 0.8;

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

/** Pick the ceiling-capable "spear" party that the queen-guard's worker
 * jelly-doses each turn. Concentrating doses on one party (versus
 * spreading like jelly-rush) is what makes the charge-up combo tick. */
const spearTarget = (state: GameState): Party | undefined => {
  const pf = state.parties.get(PATHFINDERS);
  if (pf && !pf.leaderless && partyAlive(pf)) return pf;
  return undefined;
};

const queenGuardOrders = (state: GameState, _queenGuard: Party): readonly Order[] => {
  const target = spearTarget(state);
  if (target === undefined) return [];
  const order: AbilityOrder = {
    kind: 'use-ability',
    abilityId: JELLY_APPLY,
    target: target.id,
  };
  return [order];
};

/** Returns the preposition tile for ceiling-capable parties during
 * phase B. Prefers a captured wall-crack POST (the ladder rung that
 * fires the plane-switch into the ceiling); falls back to a captured
 * towel-rack (the floor tile paired with wall-crack), and finally to
 * the first wall-crack POST regardless of ownership so the party
 * still moves toward the ladder. Returns undefined only if neither
 * wall-cracks nor towel-racks exist at all. */
const prepositionLocation = (state: GameState): TileCoord | undefined => {
  // Prefer a captured wall-crack: safest, already on the ceiling-side.
  const cracks = postsOfType(state, WALL_CRACK_TYPE);
  const capturedCrack = cracks.find((p) => p.owner === 'ant');
  if (capturedCrack) return capturedCrack.location;
  // Otherwise the towel-rack on the floor (paired with wall-crack)
  // staging tile; baseline floor staging captures soap-dish first
  // then towel-rack so this is typically already ant-owned by the
  // time charge enters phase B.
  const towels = postsOfType(state, TOWEL_RACK_TYPE);
  const capturedTowel = towels.find((p) => p.owner === 'ant');
  if (capturedTowel) return capturedTowel.location;
  // Last resort: head toward the wall-crack POST regardless of
  // ownership so the party at least moves toward the ladder.
  return cracks[0]?.location;
};

/** Round-7 feature 2 placement: turtle keeps field parties near base.
 * A slight forward step to (2, 2) only — the variant intent is
 * defensive/charge-up, so we don't push hard. */
const turtlePlacement = (state: GameState): GameState =>
  antPlacement(state, {
    'vanguard-alpha': { plane: 'floor', x: 2, y: 2 },
  });

export const turtlePlayer: AIPolicy = ((): AIPolicy => {
  const base = buildAntPolicy(
    'turtle',
    (state: GameState) => {
      // Without ScenarioData here we can't compute charge fractions,
      // so the inner decideForParty falls through for ceiling-capable
      // parties (returns null = leave untouched). The decide-wrapper
      // below holds the charge-aware authority over those parties.
      const stageTarget = nextStageTarget(state);
      return (party) => {
        if (CEILING_CAPABLE.has(party.id)) {
          return null;
        }
        // Round-10 opportunistic neutral recruit: vanguard-alpha (the
        // only floor party turtle moves) usually doesn't carry an
        // ant-mage, but the helper safely returns undefined when the
        // party lacks the ability. Branch fires only when a co-located
        // recruitable neutral is present.
        const recruit = tryOpportunisticRecruit(state, party);
        if (recruit) return recruit;
        if (stageTarget === undefined) return { orders: [], posture: 'fight' };
        return { orders: moveToOrHold(party, stageTarget.location), posture: 'fight' };
      };
    },
    queenGuardOrders,
  );
  return {
    name: 'turtle',
    faction: 'ant',
    placement: turtlePlacement,
    decide(state, scenario, rng) {
      const intermediate = base.decide(state, scenario, rng);
      const chargeMax = scenario.queen.ultimate.chargeMax;
      const fraction = state.queenUltimateCharge / chargeMax;
      const webLoc = postLocation(state, SPIDER_WEB);
      const nextParties = new Map(intermediate.parties);
      for (const [id, party] of intermediate.parties) {
        if (party.faction !== 'ant') continue;
        if (!CEILING_CAPABLE.has(party.id)) continue;
        if (party.leaderless) continue;
        // Round-10 opportunistic neutral recruit (ceiling-capable
        // override): if the spear is co-located with a recruitable
        // neutral, fire `recruit` instead of moving to the dive
        // target. Skips Phase A's "clear orders" branch because the
        // recruit is strictly better than holding idle.
        const recruit = tryOpportunisticRecruit(state, party);
        if (recruit) {
          nextParties.set(id, { ...party, orders: recruit.orders, posture: recruit.posture });
          continue;
        }
        let target: TileCoord | undefined;
        if (fraction >= CHARGE_UNLEASH_FRACTION) {
          // Phase C: all-out unleash.
          target = webLoc;
        } else if (fraction >= CHARGE_PREPOSITION_FRACTION) {
          // Phase B: preposition on the wall-crack ladder.
          target = prepositionLocation(state);
        } else {
          // Phase A: hold at home receiving jelly doses; clear orders.
          if (party.orders.length === 0 && party.posture === 'fight') continue;
          nextParties.set(id, { ...party, orders: [], posture: 'fight' });
          continue;
        }
        if (target === undefined) continue;
        const orders = moveToOrHold(party, target);
        if (orders === party.orders && party.posture === 'fight') continue;
        nextParties.set(id, { ...party, orders, posture: 'fight' });
      }
      return { ...intermediate, parties: nextParties };
    },
  };
})();
