/**
 * L5 — spider policy for Level 5 ("The Bedroom", `data/level-5`).
 *
 * Companion to `ai/baseline-l5.ts`. L5 is a `capture-post` scenario:
 * the spider must keep the ants from capturing dresser-top (floor 9,9,
 * +5 def, +2 heal), which it starts holding. The ant baseline marches
 * the canonical POST chain (headboard → dresser-top), musters on
 * headboard, then assaults the spider-held objective as one mass.
 *
 * Same fortress-attrition doctrine as `ai/spider-l3.ts`, retargeted
 * from the Kitchen's counter-edge to the Bedroom's dresser-top. L3, L4
 * and L5 are the same defensive shape, so all are thin configs over the
 * shared `buildFortressDefensePolicy` (`ai/capture-chain.ts`) — the
 * same consolidation precedent as `ai/picket-defense.ts`. dresser-top
 * is spider-owned, so a spider party standing on it gets BOTH the +5
 * defensive bonus AND +2 healing every turn (`engine/end-of-turn.ts`
 * heals only on a friendly-owned post), while the ants must cross the
 * open floor strips/connectors to reach it. Concentrating force on that
 * tile turns every assault into a losing trade and denies the capture
 * by co-location (the 2-turn capture in `engine/post-capture.ts` only
 * ticks when the capturer is *alone*).
 *
 * L5 supplies NEITHER the optional `switchDefense` nor any L4-specific
 * field, so every L4-only branch in the shared builder short-circuits
 * and the fortress defense resolves on the exact original L3 code path
 * (the opt-in discipline that keeps L3 byte-identical — verified by the
 * unchanged gate-29 / tutorial-76 / L3-67 / L4-60 measurements). The
 * shared builder does NOT use `buildPicketDefensePolicy`, so
 * `ai/picket-defense.ts` — and therefore `spider-tutorial` /
 * `spider-l3` — is left exactly as-is and the stripped tutorial still
 * measures 76, L3 still 67 and L4 still 60.
 *
 * Strategy (one sentence, §3.4.3 learnability):
 *
 *   The queen block holds dresser-top as the immovable spine; the two
 *   pickets garrison that fortified tile and sortie only a short leash
 *   to body-block an ant that strays close before falling straight
 *   back; the rover stays forward and breaks the ant mass as it musters
 *   on headboard — one party deliberately kept off the heal so the
 *   otherwise-impregnable +5/+2 fortress lands at the ruled win band.
 *
 * Roles: end-guard (queen-bearing) pins dresser-top (floor 9,9);
 * north-picket / south-picket garrison it on the `INTERCEPT_RADIUS`
 * leash; corridor-rovers is the muster-gated forward assault-breaker
 * (kept off the heal — the structural strength-down that calibrates the
 * fortress down off impregnable). The L5 spider roster starts the
 * fortress on/adjacent to dresser-top (9,9)/(9,8)/(8,9) with the rover
 * one tile forward at (8,8) in the open south strip (the L4 roster's
 * mid-corridor coordinates do not fit the Bedroom's far-corner
 * objective, so only the roster `startingLocation`s were re-placed for
 * the L5 geometry — the party ids, unit compositions and the carried
 * `units.json` plane-affinity are unchanged).
 *
 * The L5 §5 target is a deliberate REBOUND UP to ~65% (the player
 * gains the Under-Bed trail-denial tool; L5 is NOT monotone-down). The
 * AI is the sole lever exercised here (the L3 within-scenario design
 * doctrine): seeds 1..100 vs `baseline-l5` (`musterRing:2`), the
 * fortress lands a wide flat plateau at **ant 66** for
 * `INTERCEPT_RADIUS:2` across every `ROVER_GATE` in 8–14 (RG 7 drops
 * off to 30 — the plateau interior, not its knife-edge, is shipped;
 * `INTERCEPT_RADIUS:1` is the parallel flat 64 plateau, 2 the 66 one).
 * 66 sits in the §5 ~65% rebound band, at the upper shape-preserving
 * edge. The ruled L5 plane-affinity ramp (the banked spider
 * `wall +1/0 → +1/+1` + full corner coverage — L3 arbitration §4 / the
 * L5 step) is the Gameplay PA's and is applied by the orchestrator from
 * the parallel L5 arbitration LATER; it is deliberately NOT applied
 * here (the carried L4 `units.json` plane-affinity is byte-identical),
 * so this 66 is the pre-ramp baseline the orchestrator tunes from.
 *
 * Determinism: pure (state) → state inside the shared builder; scans
 * iterate `state.parties` in insertion order with a lower-party-id
 * tiebreak; no RNG is consulted — fully replayable.
 */

import type { PartyId, PostId } from '../engine/types.ts';

import { buildFortressDefensePolicy, type FortressDefenseConfig } from './capture-chain.ts';
import type { AIPolicy } from './types.ts';

/**
 * Chebyshev range from dresser-top within which a picket sorties onto
 * an approaching ant to body-block it, then falls straight back to bank
 * the +5 def + +2 heal. The L5 contest-difficulty knob: swept seeds
 * 1..100 vs `baseline-l5`, `INTERCEPT_RADIUS` 2 is the plateau that
 * lands ant 66 (1 → flat 64, 2 → flat 66, 3–4 → 72–83, 6 → 11–38,
 * 10 → 86–93). 2 is the shipped value — the §5 ~65% rebound band, at
 * the upper shape-preserving edge, on a flat-in-`ROVER_GATE` plateau
 * (not knife-edge).
 */
const INTERCEPT_RADIUS = 2;

/**
 * Chebyshev range from dresser-top inside which the forward rover
 * commits to interposing on the ant mass. Chebyshev((9,9)→headboard
 * (1,8)) = 8 is the dresser-top → ant-muster-POST distance, so any
 * `ROVER_GATE` ≥ 8 makes the rover sally once the ant mass reaches the
 * muster staging zone. With `INTERCEPT_RADIUS:2` every value in 8–14
 * measures a stable ant=66 (7 falls off the plateau to 30 — the
 * muster-gated rover flattens 8–14 into the plateau, exactly the L3
 * shape). 12 is a plateau-interior value and the shipped one.
 */
const ROVER_GATE = 12;

const L5_DEFENSE_CONFIG: FortressDefenseConfig = {
  name: 'spider-l5',
  objective: 'dresser-top' as PostId,
  guard: 'end-guard' as PartyId,
  pickets: ['north-picket' as PartyId, 'south-picket' as PartyId],
  rover: 'corridor-rovers' as PartyId,
  interceptRadius: INTERCEPT_RADIUS,
  roverGate: ROVER_GATE,
  // No `switchDefense`: L5 has no Light-Switch; the shared builder
  // collapses to the exact original L3 fortress code path
  // (byte-identical, asserted by the L3-67 / L4-60 measures).
};

export const spiderL5: AIPolicy = buildFortressDefensePolicy(L5_DEFENSE_CONFIG);
