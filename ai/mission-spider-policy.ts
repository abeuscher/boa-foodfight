/**
 * Shared builder for the L6/L8 standalone "mission" spider policies.
 *
 * L6 (`eradicate`) and L8 (`recruit-count`) are the two decisive-or-
 * timeout-loss mission scenarios. Their spider AIs (`ai/spider-l6.ts`,
 * `ai/spider-l8.ts`) are deliberately NOT the `ai/capture-chain.ts`
 * fortress doctrine and NOT the `ai/picket-defense.ts` web doctrine —
 * each is a standalone per-party `ordersFor` doctrine wrapped in the
 * exact same generic decide() loop: snapshot the party map, recompute
 * orders for every living spider party, write back only the changed
 * ones, and append (empty) policy events through `appendPolicyEvents`.
 *
 * That loop is identical between the two files (jscpd flags it as a
 * clone). This module is the minimal additive home for it — the same
 * shared-builder consolidation precedent as `ai/picket-defense.ts`
 * (`buildPicketDefensePolicy`) and `ai/closest-party.ts`. It is NEW
 * additive code; it does not touch `ai/capture-chain.ts`,
 * `ai/picket-defense.ts`, or `ai/closest-party.ts` defaults. Both
 * `spider-l6` and `spider-l8` route through it; `spider-l6`'s observable
 * behaviour (orders + events) is byte-for-byte the same as the previous
 * inline loop (verified by the unchanged L6 = 56 measurement), so the
 * L6 no-regression contract holds.
 *
 * Determinism: pure (state) → state; iterates `state.parties` in
 * insertion order; the only mutation is this faction's parties'
 * `orders`; no RNG consulted — fully replayable (the per-party
 * `ordersFor` the callers supply must itself be deterministic).
 */

import type { GameState, Order, Party, PartyId } from '../engine/types.ts';

import { partyAlive } from './policy-helpers.ts';
import { appendPolicyEvents } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

/**
 * Re-exported mission-doctrine primitives. The two standalone mission
 * spiders (`spider-l6`, `spider-l8`) need the same small primitive set
 * (`distance`/`sameCoord` geometry, `livingHpFraction` HP gate,
 * `closestLivingPartyOfFaction` scan, `moveToOrHold` order idiom). Re-
 * exporting them through this one builder module collapses each
 * scenario file's import preamble to a single line — the same
 * "thin file over a shared builder module" shape `spider-l4`/`-l5`
 * have over `ai/capture-chain.ts` (which likewise exports its builder
 * + the types its callers need from one surface). Pure pass-through
 * re-exports — zero behaviour change, no locked path modified.
 */
export { distance, sameCoord } from '../engine/coord.ts';
export { livingHpFraction } from '../engine/parties.ts';
export { closestLivingPartyOfFaction } from './closest-party.ts';
export { moveToOrHold } from './policy-helpers.ts';

/** Per-(id, party) order function the caller supplies — the scenario's
 * spider doctrine. Must be deterministic. */
export type SpiderOrdersFor = (state: GameState, id: PartyId, party: Party) => readonly Order[];

/**
 * Build a standalone mission-spider `AIPolicy`. Recomputes `ordersFor`
 * for every living spider party and writes back only the parties whose
 * order array reference changed (the same `!==` identity check the
 * inline L6 loop used, so a doctrine returning `party.orders`
 * unchanged is a no-op). Always routes the return through
 * `appendPolicyEvents` with an empty event list (parity with the
 * previous inline loop).
 */
export const buildMissionSpiderPolicy = (name: string, ordersFor: SpiderOrdersFor): AIPolicy => ({
  name,
  faction: 'spider',
  decide(state: GameState): GameState {
    const nextParties = new Map(state.parties);
    let changed = false;
    for (const [id, party] of state.parties) {
      if (party.faction !== 'spider') continue;
      if (!partyAlive(party)) continue;
      const orders = ordersFor(state, id, party);
      if (orders !== party.orders) {
        nextParties.set(id, { ...party, orders });
        changed = true;
      }
    }
    if (!changed) return appendPolicyEvents(state, []);
    return appendPolicyEvents({ ...state, parties: nextParties }, []);
  },
});
