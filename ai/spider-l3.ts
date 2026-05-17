/**
 * L3 — spider policy for Level 3 ("The Kitchen", `data/level-3`).
 *
 * Companion to `ai/baseline-l3.ts`. L3 is a `capture-post` scenario:
 * the spider must keep the ants from capturing counter-edge (floor 9,0,
 * +3 def, +2 heal), which it starts holding. The ant baseline marches
 * the canonical POST chain (crumb-pile → pantry → stove-hood →
 * counter-edge), musters on stove-hood, then assaults the spider-held
 * objective as one mass.
 *
 * A passive picket (every spider sitting on a lane anchor until an ant
 * walks into a short leash) loses that match-up at ~92% ant — the
 * lone counter-guard is overrun by the mustered ant mass and the
 * scattered pickets bleed out in the open, losing the timeout HP
 * tiebreak too (L3 has no scored mid-POSTs, so a score-resolved
 * timeout is decided purely on queen-alive + total living HP —
 * `engine/score.ts`). The spider therefore wins by *fortress
 * attrition*: counter-edge is spider-owned, so a spider party standing
 * on it gets BOTH the +3 defensive bonus AND +2 healing every turn
 * (`engine/end-of-turn.ts` heals only on a friendly-owned post),
 * while the ants must cross open floor to reach it. Concentrating
 * force on that tile turns every assault into a losing trade for the
 * ants and denies the capture by co-location (the 2-turn capture in
 * `engine/post-capture.ts` only ticks when the capturer is *alone*).
 *
 * This policy does NOT use the shared `buildPicketDefensePolicy`, so
 * `ai/picket-defense.ts` — and therefore `spider-tutorial` — is left
 * exactly as-is and the stripped tutorial still measures 76.
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The queen block holds counter-edge as the immovable spine; the two
 *   pickets garrison that fortified tile and sortie only a short leash
 *   to body-block an ant that strays close before falling straight
 *   back; the island rover stays forward and breaks the ant mass as it
 *   musters — one party deliberately kept off the heal so the
 *   otherwise-impregnable +3/+2 fortress lands at the ruled win band.
 *
 * Roles:
 *   1. counter-guard (queen-bearing): never moves off counter-edge
 *      (floor 9,0). A living spider co-located with the objective keeps
 *      the ants' capture tick paused; its absence aborts any hold —
 *      the immovable spine of the whole defense.
 *   2. north-picket / south-picket: garrison counter-edge. When a
 *      living ant party closes within `INTERCEPT_RADIUS` (Chebyshev)
 *      of the objective, sortie onto that ant's tile to body-block /
 *      bleed it; otherwise fall straight back to counter-edge to bank
 *      the +3 def + +2 heal and keep the fortress stacked. The
 *      short-leash sortie reads as "the spiders come to meet you" and
 *      keeps the trade on the spider's terms (near the healed tile).
 *   3. island-rovers: the assault-breaker. It interposes on the ant
 *      mass once it reaches the muster staging zone (`ROVER_GATE` of
 *      the objective — the island's interior lines, the §2 "slight
 *      spider nudge") so the assault forms up already bled, and
 *      otherwise holds its forward island ground (it never falls back
 *      to bank the +3/+2 — keeping one party permanently forward of
 *      the heal is the structural strength-down that calibrates the
 *      defense down off the otherwise-impregnable fortress).
 *
 * Determinism: pure (state) → state. Every scan iterates
 * `state.parties` in insertion order with a lower-party-id tiebreak;
 * no RNG is consulted — fully replayable.
 */

import { distance } from '../engine/coord.ts';
import type { GameState, Order, Party, PartyId, PostId } from '../engine/types.ts';

// `closestAntParty` is reused from the shared scenario-defense module
// (it is already exported and consumed by `spider-tutorial` via the
// picket builder). This is a READ-ONLY import — it does not call
// `buildPicketDefensePolicy` and changes nothing in `picket-defense.ts`,
// so the stripped tutorial stays byte-for-byte behavior-identical.
// Reusing it (rather than re-deriving the scan) is also what keeps
// this file clear of the duplication gate.
import { closestAntParty } from './picket-defense.ts';
import { moveToOrHold, partyAlive } from './policy-helpers.ts';
import { appendPolicyEvents } from './threat-flee.ts';
import type { AIPolicy } from './types.ts';

/** The queen-bearing party that anchors counter-edge. Never moves. */
const COUNTER_GUARD: PartyId = 'counter-guard' as PartyId;
const NORTH_PICKET: PartyId = 'north-picket' as PartyId;
const SOUTH_PICKET: PartyId = 'south-picket' as PartyId;
const ISLAND_ROVERS: PartyId = 'island-rovers' as PartyId;

/** The objective POST. The `capture-post` victory fires the moment an
 * ant holds this for the 2-turn capture window. */
const COUNTER_EDGE: PostId = 'counter-edge' as PostId;

/**
 * Chebyshev range from counter-edge within which a picket sorties onto
 * an approaching ant to body-block it, instead of holding the fortress
 * tile. A tight leash keeps both pickets banking the +3 def / +2 heal
 * on counter-edge (an over-strong fortress that overruns the ant
 * march); a loose leash pulls the pickets out to body-block ants the
 * moment they enter the room, trading the fortress's durability for
 * forward pressure and handing the ant a real shot at the objective.
 *
 * In combination with the muster-gated rover (`ROVER_GATE` below) this
 * leash has a wide, flat win-rate plateau: every value from 8 through
 * 14 measures a stable, deterministic ant=67/100 (an isolated tight
 * leash of 6 measures ~46%, 7 jumps the band — the gated rover is what
 * flattens 8–14 into the plateau). 10 is the plateau centre and is the
 * shipped value; the calibration is robust precisely because the
 * operative knob sits on a flat region rather than a knife-edge.
 *
 * The measured L3 ant win rate is 67% — inside the arbitration's ruled
 * [67, 69] band (l3-gameplay-pa-arbitration §5/§7), at the lower
 * shape-preserving edge of the ~68% target. The `planeAffinity`
 * magnitudes are ruled and were NOT touched; the counter-edge
 * defensiveBonus was measured to be inert here (the fortress strength
 * is dominated by the +2 healing + stacking, not the post def bonus)
 * and was left at its ruled debut value of 3; the spider roster was
 * left at its authored composition. The spider AI is the sole lever
 * exercised, as the within-scenario design loop intends.
 */
const INTERCEPT_RADIUS = 10;

/**
 * Chebyshev range from counter-edge inside which the island rover
 * commits to interposing on an ant. Set to the counter-edge →
 * stove-hood distance (the ants' muster POST: Chebyshev(9,0 → 8,7) =
 * 7) on purpose — the rover is the "break the assault as it forms up"
 * party: it ignores ants still walking the far chain and only sallies
 * once the ant mass reaches the muster staging zone, otherwise holding
 * its forward island position (it never collapses back to bank the
 * heal). This muster-gated behavior produces a flat, robust win-rate
 * plateau (insensitive to the exact picket leash across 8–14), which
 * is what makes the L3 calibration stable rather than knife-edge.
 */
const ROVER_GATE = 7;

/**
 * The shared sortie decision for every mobile spider party. The party
 * looks at the closest living ant *to the objective* (the objective
 * reference is the pinned counter-guard, which never leaves
 * counter-edge, so its location IS the objective tile — letting this
 * reuse the shared `closestAntParty` rather than re-deriving a
 * tile-distance scan):
 *
 *   - ant within `gate` Chebyshev of the objective → sortie onto that
 *     ant's tile to body-block / bleed it;
 *   - otherwise → the party's `hold` fallback.
 *
 * Pickets pass the objective tile as their `hold` (garrison the
 * fortress, banking the +3 def / +2 heal); the rover passes `null`
 * (hold its forward island ground — never fall back to the heal). One
 * helper, two postures: the only difference between a fortress picket
 * and the forward assault-breaker is the fallback and the gate width.
 */
const sortieOrders = (
  state: GameState,
  party: Party,
  objectiveRef: Party | null,
  gate: number,
  hold: Party['location'] | null,
): readonly Order[] => {
  if (objectiveRef !== null) {
    const ant = closestAntParty(state, objectiveRef);
    if (ant !== null) {
      const d = distance(objectiveRef.location, ant.location);
      if (d !== Number.POSITIVE_INFINITY && d <= gate) {
        return moveToOrHold(party, ant.location);
      }
    }
  }
  return hold === null ? [] : moveToOrHold(party, hold);
};

/**
 * Per-party order resolver. `objectiveRef` is the pinned counter-guard
 * (its location is the counter-edge objective tile); it is `null` only
 * if the counter-guard is already wiped, in which case the scenario is
 * effectively lost and the survivors just converge on the objective
 * post location.
 */
const ordersFor = (
  state: GameState,
  id: PartyId,
  party: Party,
  objectiveRef: Party | null,
  objectivePost: Party['location'] | undefined,
): readonly Order[] => {
  // The immovable spine: never leave counter-edge. Its presence pauses
  // the ant capture tick; its absence aborts any in-progress hold.
  if (id === COUNTER_GUARD) return [];
  // Fortress pickets: wide leash, fall back to garrison the +3/+2 tile.
  if (id === NORTH_PICKET || id === SOUTH_PICKET) {
    return sortieOrders(state, party, objectiveRef, INTERCEPT_RADIUS, objectivePost ?? null);
  }
  // Forward assault-breaker: muster-gated, holds its island ground.
  if (id === ISLAND_ROVERS) {
    return sortieOrders(state, party, objectiveRef, ROVER_GATE, null);
  }
  // Any future / unexpected spider party: converge on the objective so
  // it is never idle dead weight.
  return objectivePost === undefined ? [] : moveToOrHold(party, objectivePost);
};

export const spiderL3: AIPolicy = {
  name: 'spider-l3',
  faction: 'spider',
  decide(state: GameState): GameState {
    // The counter-guard is pinned to counter-edge and never moves, so
    // it is a stable proxy for "the objective tile" — distance-to-
    // objective is measured from it (see `sortieOrders`).
    const counterGuard = state.parties.get(COUNTER_GUARD) ?? null;
    const objectiveRef = counterGuard !== null && partyAlive(counterGuard) ? counterGuard : null;
    const objectivePost = state.posts.get(COUNTER_EDGE)?.location;

    const updates: [PartyId, Party][] = [];
    for (const [id, party] of state.parties) {
      if (party.faction !== 'spider' || !partyAlive(party)) continue;
      const orders = ordersFor(state, id, party, objectiveRef, objectivePost);
      if (orders !== party.orders) updates.push([id, { ...party, orders }]);
    }
    if (updates.length === 0) return appendPolicyEvents(state, []);
    const nextParties = new Map(state.parties);
    for (const [id, p] of updates) nextParties.set(id, p);
    return appendPolicyEvents({ ...state, parties: nextParties }, []);
  },
};
