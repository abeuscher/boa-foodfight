/**
 * Variant AI: "jelly-rush"
 *
 * Rush-tempo field push (all field parties target spider-web from turn 1)
 * paired with a Royal Jelly supply line: every turn the queen-guard's
 * worker issues a `jelly-apply` use-ability order targeting the closest
 * living ant field party. The order is structurally complete (target
 * party id, jelly-apply ability id) so when the firepower designer
 * wires the engine handler that consumes the order to transfer doses,
 * this variant is the policy that exercises it.
 *
 * Interactions:
 *   - rush tempo (interaction with the spider counter-push timing — by
 *     reaching the web faster than baseline, the silk-line counter-push
 *     fires too late to catch returning parties).
 *   - jelly-apply ability (interaction with `jellyMultipliers` in
 *     turn.ts — once the engine wires order → state mutation, doses
 *     get routed to the field party that actually fights at the web,
 *     boosting attack and resilience for the kill-battle).
 *   - queen-guard worker support: the queen-guard's worker units are
 *     normally idle (queen is immobile per spec). This variant gives
 *     them a job that doesn't move them (target=party order; no movement),
 *     using the existing queen-guard slot productively.
 */

import type { GameState } from '../engine/types.ts';
import type { AbilityId, AbilityOrder, Order, Party } from '../engine/types.ts';

import { antPlacement } from './placement-helpers.ts';
import {
  buildAntPolicy,
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

/** Round-9 placement: split routes so the deep-raider's south-floor
 * intercept arc (forward-stage at floor 8,5, detect radius 3) can't
 * hit the trio simultaneously. The round-7 (4,4)/(5,4)/(4,5) cluster
 * sat directly on the raider's arc — we now spread the trio across
 * three rows: vanguard-alpha at (5, 0) for the NE-floor flank,
 * vanguard-bravo at (4, 2) just above the raider's intercept band so
 * the closest-field-party jelly-supply target picks bravo first and
 * its plane-switch launch tile is only a 4-tile NE diagonal away,
 * and pathfinders at (0, 5) for the SW-floor flank below the raider.
 * Three different rows means deep-raider can engage at most one
 * party per turn. All within Chebyshev-5 of storm-drain. */
const jellyRushPlacement = (state: GameState): GameState =>
  antPlacement(state, {
    'vanguard-alpha': { plane: 'floor', x: 5, y: 0 },
    'vanguard-bravo': { plane: 'floor', x: 4, y: 2 },
    pathfinders: { plane: 'floor', x: 0, y: 5 },
  });

const jellyRushCore = buildAntPolicy(
  'jelly-rush',
  (state: GameState) => {
    const webLoc = postLocation(state, SPIDER_WEB);
    return (party) => {
      if (webLoc === undefined) return { orders: [], posture: 'fight' };
      return { orders: moveToOrHold(party, webLoc), posture: 'fight' };
    };
  },
  queenGuardOrders,
);

export const jellyRushPlayer: AIPolicy = { ...jellyRushCore, placement: jellyRushPlacement };
