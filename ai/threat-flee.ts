/**
 * Round 16 — pre-battle threat-assessment flee helper.
 *
 * Round 15 added a flee-on-low-HP trigger that fires AFTER damage has
 * landed: by the time `livingHpFraction < 0.30`, the party has already
 * absorbed a turn of attacks. Battles resolve in one round, so the
 * "flee from a hurt party" branch rarely fires before the engine's
 * leaderless auto-retreat path takes over (which never emits a
 * `battle-fled` event).
 *
 * This module adds the upstream signal: BEFORE the AI commits to
 * walking into a tile occupied by an enemy, it predicts the matchup
 * with a Lanchester square-law loss-probability estimate
 * (`estimateLossProbability` in engine/parties.ts) and rolls the
 * seeded RNG against `fleeChanceFromLossProb(lossProb)`. Hits prepend
 * a `flee` order to the party's order list and emit a `flee-queued`
 * replay event into the GameState sidecar (`pendingPolicyEvents`).
 *
 * The helper is shared between `ai/baseline.ts` (ant side) and
 * `ai/spider-l1.ts` (spider side); each caller passes its own list of
 * party ids exempt from the trigger (queen-bearers, deep-raider,
 * etc.) and the order list is otherwise untouched.
 */

import { sameCoord } from '../engine/coord.ts';
import { estimateLossProbability } from '../engine/parties.ts';
import type {
  FleeOrder,
  GameState,
  Order,
  Party,
  PartyId,
  ReplayEvent,
  Rng,
  TileCoord,
} from '../engine/types.ts';

import { fleeChanceFromLossProb } from './policy-helpers.ts';

const FLEE_ORDER: FleeOrder = { kind: 'flee' };

/**
 * Identify the tile this party will arrive on at the start of battle
 * resolution this turn. For a `move-to` order that's the target if
 * Chebyshev 1 away on the same plane, otherwise the one-tile step
 * toward the target. With no movement order it's the party's current
 * tile (a battle could still fire if an enemy steps into it). Returns
 * undefined for cross-plane move orders (the engine resolves those
 * via edge adjacency; threat-flee doesn't predict the arrival tile).
 *
 * The one-tile step is the Chebyshev gradient — this matches how
 * `engine/movement.ts` advances a party along a multi-tile move-to
 * order on the first turn of allowance.
 */
const intendedNextTile = (party: Party, orders: readonly Order[]): TileCoord | undefined => {
  for (const order of orders) {
    if (order.kind !== 'move-to') continue;
    if (order.target.plane !== party.location.plane) return undefined;
    const from = party.location;
    const dx = Math.sign(order.target.x - from.x);
    const dy = Math.sign(order.target.y - from.y);
    return { plane: from.plane, x: from.x + dx, y: from.y + dy };
  }
  // No move order: party stays put this turn.
  return party.location;
};

/**
 * Find a living enemy party of the opposite faction whose location
 * matches `tile`. Returns the first match (deterministic by Map iteration
 * order, which is insertion order in our state). Returns undefined if
 * none. Neutral parties are skipped — recruit/hypnotize semantics, not
 * combat, govern collisions with neutrals.
 */
const findEnemyAtTile = (
  state: GameState,
  myFaction: Party['faction'],
  tile: TileCoord,
): Party | undefined => {
  for (const party of state.parties.values()) {
    if (party.faction === myFaction) continue;
    if (party.faction === 'neutral') continue;
    if (party.units.every((u) => u.currentHp <= 0)) continue;
    if (sameCoord(party.location, tile)) return party;
  }
  return undefined;
};

export interface ThreatFleeOptions {
  /** Party ids that never get a threat-flee, regardless of matchup
   * (queen-bearers, deep-raider, web-guard, etc.). */
  readonly exempt: ReadonlySet<PartyId>;
}

export interface ThreatFleeOutcome {
  /** Possibly-modified order list. If a flee was queued, the order is
   * prepended; otherwise the original list is returned by reference. */
  readonly orders: readonly Order[];
  /** A `flee-queued` event to push into `state.pendingPolicyEvents`,
   * or undefined when no flee was queued. */
  readonly event?: ReplayEvent;
}

/**
 * Decide whether to prepend a `flee` order based on a predicted
 * collision this turn. Pure: the caller wires the returned event into
 * the state sidecar. Returns the original orders unchanged when the
 * party is exempt, has no impending collision, has no current move,
 * is already fleeing, or the seeded RNG draw misses the
 * `fleeChanceFromLossProb` threshold.
 */
export const computeThreatFlee = (
  state: GameState,
  party: Party,
  orders: readonly Order[],
  rng: Rng,
  options: ThreatFleeOptions,
): ThreatFleeOutcome => {
  if (options.exempt.has(party.id)) return { orders };
  if (party.leaderless) return { orders };
  if (party.units.every((u) => u.currentHp <= 0)) return { orders };
  // Already fleeing (round-15 HP trigger queued one) — don't
  // double-stack.
  if (orders.some((o) => o.kind === 'flee')) return { orders };
  const arrivalTile = intendedNextTile(party, orders);
  if (arrivalTile === undefined) return { orders };
  const enemy = findEnemyAtTile(state, party.faction, arrivalTile);
  if (enemy === undefined) return { orders };
  const lossProb = estimateLossProbability(party, enemy, state.unitTemplates);
  const fleeChance = fleeChanceFromLossProb(lossProb);
  if (fleeChance <= 0) return { orders };
  const roll = rng.next();
  if (roll >= fleeChance) return { orders };
  // Round 16 — current turn from the engine's perspective. The engine
  // increments `state.turn` at end-of-turn, so policies running at
  // the top of turn N see `state.turn === N - 1` for the just-played
  // turn, and the upcoming one is `N`. We tag the event with the
  // upcoming turn for human-friendly viewer output (matches the
  // `turn-start` event the driver emits before this turn resolves).
  const event: ReplayEvent = {
    kind: 'flee-queued',
    turn: state.turn + 1,
    tick: 0,
    partyId: party.id,
    reason: 'threat-prediction',
    enemyPartyId: enemy.id,
    lossProbability: lossProb,
  };
  return { orders: [FLEE_ORDER, ...orders], event };
};

/**
 * Build a `flee-queued` event for the round-15 HP-threshold trigger.
 * Caller already decided to prepend the flee order; this just
 * constructs the matching telemetry payload.
 */
export const lowHpFleeEvent = (state: GameState, party: Party): ReplayEvent => ({
  kind: 'flee-queued',
  turn: state.turn + 1,
  tick: 0,
  partyId: party.id,
  reason: 'low-hp',
});

/**
 * Append events to `state.pendingPolicyEvents`. Returns the new state.
 * No-op when `events` is empty.
 */
export const appendPolicyEvents = (state: GameState, events: readonly ReplayEvent[]): GameState => {
  if (events.length === 0) return state;
  const prior = state.pendingPolicyEvents ?? [];
  return { ...state, pendingPolicyEvents: [...prior, ...events] };
};
