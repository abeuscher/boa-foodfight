/**
 * Shared scenario-defense helpers for the stripped-kit capture/defense
 * AIs (`spider-tutorial` / `baseline-tutorial` / `spider-l3` /
 * `baseline-l3`).
 *
 * These four policies independently grew the same three primitives — a
 * "closest living ant party" scan, a "hold-anchor-then-surge-on-leash"
 * picket order, and a low-HP flee predicate. This module is the single
 * home for them so each policy file expresses only its strategy. It is
 * additive and imports nothing the policies didn't already import
 * (engine/coord, engine/parties, engine/types, ai/policy-helpers); it
 * deliberately does NOT live in `ai/policy-helpers.ts` (the gate-29
 * byte-identity reference surface, which must stay untouched).
 *
 * Determinism: every function here is pure — no RNG, stable iteration
 * (`state.parties` insertion order) with a lower-party-id tiebreak.
 */

import { distance } from '../engine/coord.ts';
import { livingHpFraction } from '../engine/parties.ts';
import type {
  GameState,
  Order,
  Party,
  PartyId,
  UnitTemplate,
  UnitTemplateId,
} from '../engine/types.ts';

import { moveToOrHold, partyAlive } from './policy-helpers.ts';
import { appendPolicyEvents } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

/**
 * Closest living ant field party to `from` (Manhattan within a plane,
 * infinite across planes), or null. Ties break on the lower party id so
 * the pick is deterministic.
 */
export const closestAntParty = (state: GameState, from: Party): Party | null => {
  let best: { party: Party; d: number } | null = null;
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (!partyAlive(party)) continue;
    const d = distance(from.location, party.location);
    if (best === null || d < best.d || (d === best.d && party.id < best.party.id)) {
      best = { party, d };
    }
  }
  return best?.party ?? null;
};

/**
 * Orders for a holding picket: stay on the anchor tile until a living
 * ant party closes within `interceptRadius` (Chebyshev), then move onto
 * that ant's tile to body-block. Returns `[]` (clear stale orders) when
 * no ant is alive or the nearest is still outside the leash / on
 * another plane. The immovable queen block is the caller's concern and
 * never reaches here.
 */
export const picketOrders = (
  state: GameState,
  party: Party,
  interceptRadius: number,
): readonly Order[] => {
  const ant = closestAntParty(state, party);
  if (ant === null) return [];
  const d = distance(party.location, ant.location);
  if (d === Number.POSITIVE_INFINITY || d > interceptRadius) return [];
  return moveToOrHold(party, ant.location);
};

/**
 * True iff the party has taken enough damage to break off but is not
 * already wiped (a 0-fraction party is dead, not fleeing). `threshold`
 * is the living-HP fraction below which the policy prepends a flee.
 */
export const partyShouldFlee = (
  party: Parameters<typeof livingHpFraction>[0],
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  threshold: number,
): boolean => {
  const frac = livingHpFraction(party, templates);
  return frac > 0 && frac < threshold;
};

/**
 * Build a spider defense policy: one immovable queen block (the party
 * whose id is `blockPartyId`, which holds the objective/web tile and is
 * never given orders) and every other living spider party acting as a
 * hold-then-surge picket on `interceptRadius`. This is the shared shape
 * of both the stripped-tutorial web defense and the L3 counter-edge
 * defense — the scenario differs only in the objective post and which
 * roster party is the block. `prelude` runs once per turn before the
 * party loop (the tutorial uses it to touch its objective post id so a
 * map rename surfaces loudly); omit it when not needed.
 *
 * Determinism: pure (state) → state; the only mutation is this
 * faction's parties' `orders`; no RNG consulted.
 */
export const buildPicketDefensePolicy = (
  name: string,
  blockPartyId: PartyId,
  interceptRadius: number,
  prelude?: () => void,
): AIPolicy => ({
  name,
  faction: 'spider',
  decide(state: GameState): GameState {
    prelude?.();
    const nextParties = new Map(state.parties);
    for (const [id, party] of state.parties) {
      if (party.faction !== 'spider') continue;
      if (!partyAlive(party)) continue;
      const orders: readonly Order[] =
        id === blockPartyId ? [] : picketOrders(state, party, interceptRadius);
      if (orders === party.orders) continue;
      nextParties.set(id, { ...party, orders });
    }
    const next: GameState = { ...state, parties: nextParties };
    return appendPolicyEvents(next, []);
  },
});
