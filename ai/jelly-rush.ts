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

/** Round-7 feature 2 placement: all field parties forward to (4, 4)
 * — ready to plane-switch on the very first turn. Tight clustering
 * keeps the jelly-supply line short. */
const jellyRushPlacement = (state: GameState): GameState =>
  antPlacement(state, {
    'vanguard-alpha': { plane: 'floor', x: 4, y: 4 },
    'vanguard-bravo': { plane: 'floor', x: 5, y: 4 },
    pathfinders: { plane: 'floor', x: 4, y: 5 },
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
