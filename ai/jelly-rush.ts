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
 *
 * The variant cannot use `buildAntPolicy` because that helper hardcodes
 * the queen-guard to defend with empty orders. We open-code the decide
 * loop so queen-guard can carry an ability order while keeping its
 * `defend` posture.
 */

import { distance, sameCoord } from '../engine/coord.ts';
import type { ScenarioData } from '../engine/state.ts';
import type {
  AbilityId,
  AbilityOrder,
  GameState,
  MoveOrder,
  Order,
  Party,
  PartyId,
  PostId,
  Rng,
} from '../engine/types.ts';

import { QUEEN_PARTY, SPIDER_WEB } from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

const FACTION = 'ant' as const;
const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

const findPostLocation = (state: GameState, id: PostId) => state.posts.get(id)?.location;

const partyAlive = (party: Party): boolean => party.units.some((u) => u.currentHp > 0);

const closestFieldPartyId = (state: GameState, from: Party): PartyId | undefined => {
  let best: { id: PartyId; d: number } | undefined;
  for (const [id, party] of state.parties) {
    if (party.faction !== FACTION) continue;
    if (party.id === from.id) continue;
    if (party.leaderless) continue;
    if (!partyAlive(party)) continue;
    const d = distance(from.location, party.location);
    if (!best || d < best.d || (d === best.d && id < best.id)) {
      best = { id, d };
    }
  }
  return best?.id;
};

const moveOrder = (target: {
  plane: 'floor' | 'ceiling' | 'north-wall' | 'south-wall' | 'east-wall' | 'west-wall';
  x: number;
  y: number;
}): MoveOrder => ({
  kind: 'move-to',
  target,
});

const fieldOrders = (
  party: Party,
  webLoc: ReturnType<typeof findPostLocation>,
): readonly Order[] => {
  if (webLoc === undefined) return [];
  if (sameCoord(party.location, webLoc)) return [];
  return [moveOrder(webLoc)];
};

const queenGuardOrders = (state: GameState, queenGuard: Party): readonly Order[] => {
  const target = closestFieldPartyId(state, queenGuard);
  if (target === undefined) return [];
  const order: AbilityOrder = {
    kind: 'use-ability',
    abilityId: JELLY_APPLY,
    target,
  };
  return [order];
};

export const jellyRushPlayer: AIPolicy = {
  name: 'jelly-rush',
  faction: FACTION,
  decide(state: GameState, _scenario: ScenarioData, _rng: Rng): GameState {
    const webLoc = findPostLocation(state, SPIDER_WEB);
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== FACTION) continue;

      if (party.id === QUEEN_PARTY) {
        // Queen stays put, but the worker issues a jelly-apply order each
        // turn aimed at the nearest field party. Posture stays defend.
        const orders = queenGuardOrders(state, party);
        if (
          orders.length === party.orders.length &&
          orders.every((o, i) => {
            const cur = party.orders[i];
            if (cur?.kind !== o.kind) return false;
            if (o.kind !== 'use-ability' || cur.kind !== 'use-ability') return false;
            return cur.abilityId === o.abilityId && cur.target === o.target;
          }) &&
          party.posture === 'defend'
        ) {
          continue;
        }
        nextParties.set(id, { ...party, orders, posture: 'defend' });
        continue;
      }

      if (party.leaderless) continue;
      const orders = fieldOrders(party, webLoc);
      if (orders === party.orders && party.posture === 'fight') continue;
      nextParties.set(id, { ...party, orders, posture: 'fight' });
    }
    return { ...state, parties: nextParties };
  },
};
