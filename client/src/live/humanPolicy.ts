/**
 * The player's "policy". The engine drives every faction through an
 * `AIPolicy.decide(state) => state` that writes orders onto that
 * faction's parties; the human player is no exception — the UI collects
 * destinations and this builds the matching ant policy each turn.
 *
 * Built on the engine-blessed `buildAntPolicy` so order-writing,
 * queen-guard immobility, and leaderless auto-retreat all follow the
 * same rules the AI variants do. The standard `moveToOrHold` idiom
 * issues a single `move-to` toward the (possibly distant) destination;
 * the engine steps the party toward it each turn and clears the order
 * on arrival.
 */
import { buildAntPolicy, moveToOrHold } from '../../../ai/policy-helpers.ts';
import type { AIPolicy } from '../../../ai/types.ts';
import type { PartyId, TileCoord } from '../../../engine/types.ts';

/**
 * Per-party player intent:
 *  - a `TileCoord` → march toward that destination,
 *  - `null` → hold position (clear orders this turn),
 *  - absent → no opinion; the party keeps whatever orders it had.
 */
export type PlayerOrders = ReadonlyMap<PartyId, TileCoord | null>;

export const buildHumanPolicy = (orders: PlayerOrders): AIPolicy =>
  buildAntPolicy('human', () => (party) => {
    const dest = orders.get(party.id);
    if (dest === undefined) return null;
    if (dest === null) return { orders: [], posture: 'defend' };
    return { orders: moveToOrHold(party, dest), posture: 'fight' };
  });
