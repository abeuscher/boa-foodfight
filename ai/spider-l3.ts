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
 * L3 and L4 are the same defensive shape, so both are thin configs over
 * the shared `buildFortressDefensePolicy` (`ai/capture-chain.ts`) — the
 * `ai/picket-defense.ts` consolidation precedent applied to the
 * capture-post defender. This is a pure structural extraction: the
 * resolved orders are byte-identical to the prior inline policy
 * (verified by the unchanged gate-29 / tutorial-76 / L3-67
 * measurements). The shared builder does NOT use
 * `buildPicketDefensePolicy`, so `ai/picket-defense.ts` — and therefore
 * `spider-tutorial` — is left exactly as-is and the stripped tutorial
 * still measures 76.
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
 * The measured L3 ant win rate is 67% — inside the arbitration's ruled
 * [67, 69] band (l3-gameplay-pa-arbitration §5/§7), at the lower
 * shape-preserving edge of the ~68% target. `INTERCEPT_RADIUS` sits on
 * a wide flat plateau (every value 8–14 measures a stable, deterministic
 * ant=67/100; an isolated tight leash of 6 measures ~46%, 7 jumps the
 * band — the muster-gated rover is what flattens 8–14 into the
 * plateau). 10 is the plateau centre and the shipped value; the
 * `planeAffinity` magnitudes are ruled and were NOT touched, the
 * counter-edge defensiveBonus was measured inert here and left at its
 * ruled debut value of 3, and the spider roster was left at its
 * authored composition — the spider AI is the sole lever exercised, as
 * the within-scenario design loop intends.
 *
 * Determinism: pure (state) → state inside the shared builder; scans
 * iterate `state.parties` in insertion order with a lower-party-id
 * tiebreak; no RNG is consulted — fully replayable.
 */

import type { PartyId, PostId } from '../engine/types.ts';

import { buildFortressDefensePolicy, type FortressDefenseConfig } from './capture-chain.ts';
import type { AIPolicy } from './types.ts';

/**
 * Chebyshev range from counter-edge within which a picket sorties onto
 * an approaching ant to body-block it. Wide, flat win-rate plateau
 * (8–14 all measure ant=67/100); 10 is the plateau centre and shipped
 * value. See the file header for the full calibration record.
 */
const INTERCEPT_RADIUS = 10;

/**
 * Chebyshev range from counter-edge inside which the island rover
 * commits to interposing on an ant. Set to the counter-edge →
 * stove-hood distance (the ants' muster POST: Chebyshev(9,0 → 8,7) = 7)
 * on purpose — the rover ignores ants still walking the far chain and
 * only sallies once the ant mass reaches the muster staging zone,
 * otherwise holding its forward island position. This muster-gated
 * behavior produces the flat, robust win-rate plateau that makes the L3
 * calibration stable rather than knife-edge.
 */
const ROVER_GATE = 7;

const L3_DEFENSE_CONFIG: FortressDefenseConfig = {
  name: 'spider-l3',
  objective: 'counter-edge' as PostId,
  guard: 'counter-guard' as PartyId,
  pickets: ['north-picket' as PartyId, 'south-picket' as PartyId],
  rover: 'island-rovers' as PartyId,
  interceptRadius: INTERCEPT_RADIUS,
  roverGate: ROVER_GATE,
};

export const spiderL3: AIPolicy = buildFortressDefensePolicy(L3_DEFENSE_CONFIG);
