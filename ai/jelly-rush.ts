/**
 * Variant AI: "jelly-rush" (round-23 venom-blast survival rebalance)
 *
 * Rush-tempo field push (all field parties target spider-web from turn 1)
 * paired with a Royal Jelly supply line: every turn the queen-guard's
 * worker issues a `jelly-apply` use-ability order targeting the closest
 * living ant field party. The order is structurally complete (target
 * party id, jelly-apply ability id) so the engine handler that
 * consumes the order transfers doses, boosting attack/armor for the
 * kill battle.
 *
 * Round-23 fix: the round-22 venom-blast pre-battle ability (4 dmg/
 * unit on the front rank) was wiping jelly-rush parties' front rows
 * because all three rush-tempo parties walked into web-watch's
 * intercept arc and ate web-guard's blast at the web simultaneously.
 *
 *   - Ceiling-capable parties (pathfinders, vanguard-bravo) now run
 *     the launch-tile → plane-switch dive line: walk floor (web.x,
 *     web.y), then a follow-up `move-to` with target=web fires
 *     `tryPlaneTransition` → `ant-plane-switch` (uses=1) and
 *     teleports onto the web tile, fully bypassing web-watch's
 *     ceiling intercept and the venom-blast ladder-crawl.
 *   - vanguard-alpha keeps the rush-tempo floor walk straight to the
 *     web (jelly-rush's identity: no staging chain).
 *   - Placement tightens to a single-axis advance: all three field
 *     parties on the floor diagonal (4-5 row), so the jelly supply
 *     line can rotate target via `closestFieldPartyId` without
 *     spreading the multipliers thin.
 *
 * Interactions:
 *   - launch-tile dive (pathfinders, vanguard-bravo) bypasses web-
 *     watch (ceiling 8,9) and sidesteps the ceiling tile-by-tile
 *     venom-blast exposure that the round-22 spider AI exploits.
 *   - jelly-apply ability (interaction with `jellyMultipliers` in
 *     turn.ts — the closest-field-party target rotates each turn,
 *     stacking attack/resilience on whichever party is in front of
 *     the supply line).
 *   - queen-guard worker support: the queen-guard's worker units are
 *     normally idle (queen is immobile per spec). This variant gives
 *     them a job that doesn't move them (target=party order; no
 *     movement), using the existing queen-guard slot productively.
 *
 * Why this is route-distinct from baseline / dive:
 *   - Baseline: vanguard-alpha walks the canonical staging chain
 *     (soap-dish → towel-rack → wall-crack); queen-guard concentrates
 *     jelly-apply doses on pathfinders specifically.
 *   - Dive: queen-guard concentrates doses on pathfinders too.
 *   - Jelly-rush: vanguard-alpha skips staging entirely (rush tempo),
 *     and queen-guard's jelly-apply target rotates to the closest
 *     field party rather than locking on pathfinders. The supply
 *     line distinction (closest vs locked) is what makes jelly-rush
 *     a distinct variant from baseline / dive.
 */

import type { GameState, Party } from '../engine/types.ts';
import type { AbilityId, AbilityOrder, Order } from '../engine/types.ts';

import { launchTileDiveTarget } from './dive-line.ts';
import { tryOpportunisticRecruit } from './neutral-recruit-helper.ts';
import { antPlacement } from './placement-helpers.ts';
import {
  buildAntPolicy,
  CEILING_CAPABLE,
  closestFieldPartyId,
  moveToOrHold,
  postLocation,
  SPIDER_WEB,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

const queenGuardOrders = (state: GameState, queenGuard: Party): readonly Order[] => {
  const target = closestFieldPartyId(state, queenGuard);
  if (target === undefined) return [];
  const order: AbilityOrder = { kind: 'use-ability', abilityId: JELLY_APPLY, target };
  return [order];
};

/** Round-23 placement: tighten to a single-diagonal advance on the
 * floor so the jelly supply line stays compact. The round-9 row-
 * split (5,0)/(4,2)/(0,5) sat on the deep-raider's south-floor band
 * AND fed the venom-blast wipe by spreading parties to multiple
 * spider-engage tiles. Single-diagonal placement at (2,2)/(3,3)/(4,4)
 * keeps the trio one tile back from the deep-raider's Cheb-3 detect
 * arc at floor (8,5) — (4,4) sits at Cheb 4. The closest-field-party
 * jelly target tracks whichever party is leading the diagonal. All
 * within Chebyshev-5 of storm-drain. */
const jellyRushPlacement = (state: GameState): GameState =>
  antPlacement(state, {
    'vanguard-alpha': { plane: 'floor', x: 2, y: 2 },
    'vanguard-bravo': { plane: 'floor', x: 3, y: 3 },
    pathfinders: { plane: 'floor', x: 4, y: 4 },
  });

const jellyRushCore = buildAntPolicy(
  'jelly-rush',
  (state: GameState) => {
    const webLoc = postLocation(state, SPIDER_WEB);
    return (party) => {
      // Round-10 opportunistic neutral recruit. Fires only when a
      // rush-tempo party happens to land on a wandering cockroach or
      // mouse; never detours from the web. Stinkbugs are filtered
      // out by the helper to avoid the damage-zone-on-failure trap.
      const recruit = tryOpportunisticRecruit(state, party);
      if (recruit) return recruit;
      if (webLoc === undefined) return { orders: [], posture: 'fight' };
      // Round-23: ceiling-capable parties take the launch-tile dive
      // route so plane-switch lands them on the web tile, bypassing
      // web-watch's ceiling intercept and avoiding tile-by-tile venom-
      // blast exposure on the ceiling march.
      if (CEILING_CAPABLE.has(party.id)) {
        const dive = launchTileDiveTarget(party, webLoc);
        if (dive !== undefined) return { orders: moveToOrHold(party, dive), posture: 'fight' };
      }
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    };
  },
  queenGuardOrders,
);

export const jellyRushPlayer: AIPolicy = { ...jellyRushCore, placement: jellyRushPlacement };
