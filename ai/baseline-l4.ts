/**
 * L4 — ant policy for Level 4 ("The Hallway", `data/level-4`,
 * level-progression-plan §2 "L4 — Hallway").
 *
 * L4 is a `capture-post` scenario on a static 10×10 with a 4-wide
 * corridor band along rows 3–6 (all 10 columns open); rows 0–2 and 7–9
 * are obstacle paneling. Three planes: floor, ceiling, north-wall.
 * Entrance is hall-threshold (floor 0,4, in-band); the objective is
 * end-door (floor 9,4, spider-held, +5 def). Six POSTs: hall-threshold
 * (home, col 0), three Doorway POSTs at cols 3/5/7 (each fixed column,
 * per-seed jittered row in-band rows 3–6 — the §3.3 POST-randomization
 * debut, resolved by the loader's `applyPostJitter`), a Light-Switch
 * flip-state POST on the north-wall mid-corridor, and end-door
 * (objective).
 *
 * Modeled on `ai/baseline-l3.ts` (the chain-marcher → spider-held
 * objective). L3 and L4 are the same match-up shape, so both are thin
 * configs over the shared `buildChainMarchPolicy`
 * (`ai/capture-chain.ts`) — this is the same consolidation precedent as
 * `ai/picket-defense.ts`. It is intentionally NOT `ai/baseline.ts`
 * (full kit) and NOT `ai/baseline-tutorial.ts` (L1 POST-prefix walk).
 * Additive; registered only under `SCENARIO_PLAYER_AIS` (NOT
 * `PLAYER_AIS`) so the gate-29 diversity sweep stays byte-identical.
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   All field parties march the canonical Doorway chain (doorway-east →
 *   doorway-mid → doorway-west), holding at the last neutral link until
 *   every living field party has mustered there, then committing to the
 *   spider-held end-door as one mass — EXCEPT `vanguard-bravo`, which
 *   carries an ant-mage and, once the body has mustered, peels off to
 *   plane-switch onto the north-wall and capture the spider-held
 *   `light-switch` (re-arbitration §9.3(b).1); the queen-guard holds
 *   the hall threshold; any field party below the low-HP threshold runs.
 *
 * The Light-Switch contest is the load-bearing §9 correction: the
 * ruled `combatModifier {litOwner:"ant",faction:"ant",attack:2}` gives
 * every ant unit +2 attack *while the spider still holds the switch*.
 * Marching under that buff is the §6 "push through the dark" beat;
 * `vanguard-bravo` capturing the switch flips owner→ant, which (the
 * `litOwner:"ant"` engine semantics, `engine/light-switch.ts:44`)
 * self-extinguishes the +2 — the ruled *earned, transient* comeback,
 * not the permanent army-wide wall the §4a build measured at ant 99%.
 * This is the *only* L4 delta vs the shared chain-march; it is opt-in
 * config (`switchContest`) so L3 — which omits it — is byte-identical
 * (verified by the unchanged L3-67 / gate-29 / tutorial-76 measures).
 *
 * Greedy navigability under jitter: every chain POST sits on the floor
 * plane at a fixed column (3, 5, 7) with its row re-drawn each seed
 * uniformly in the in-band rows 3–6. Every row in [3,6] is open floor
 * for all 10 columns, and rows 0–2 / 7–9 are solid paneling, so the
 * corridor band is a single open rectangle. The engine's strict greedy
 * Manhattan descent (`engine/movement.ts:pickGreedyStep`) always finds
 * a strictly-closer open neighbour toward each target: from any in-band
 * tile a one-column step toward the (larger-x) target is open and
 * strictly closer; the row component is reached by an in-band vertical
 * step, also always open. This holds for *every* realized jitter row
 * because the jitter band is a strict subset of the open corridor band
 * — no jitter outcome can place a Doorway on a panelled tile or behind
 * a wall. The single straight axis removes flanking (no lane choice),
 * which is the L4 identity.
 *
 * Determinism: pure (state, scenario, rng) → state via `buildAntPolicy`
 * inside the shared builder; no RNG is consulted — fully replayable.
 * The jitter is resolved once at scenario load (seeded), so the
 * realized POST tiles are fixed for the whole game and this policy
 * simply reads `state.posts`.
 */

import type { PartyId, PostId } from '../engine/types.ts';

import { buildChainMarchPolicy, type ChainMarchConfig } from './capture-chain.ts';
import type { AIPolicy } from './types.ts';

/** The canonical L4 POST chain, in capture order. All four tiles are on
 * the floor plane inside the open corridor band (rows 3–6, every
 * column), so one `move-to` per hop resolves through the engine's
 * greedy descent regardless of the seed's jittered Doorway rows. The
 * last *neutral* link (doorway-west) is the muster POST: massing there,
 * then assaulting end-door as one body, is the single idea L4 teaches. */
const L4_CHAIN_CONFIG: ChainMarchConfig = {
  name: 'baseline-l4',
  chain: [
    'doorway-east' as PostId,
    'doorway-mid' as PostId,
    'doorway-west' as PostId,
    'end-door' as PostId,
  ],
  objective: 'end-door' as PostId,
  musterPost: 'doorway-west' as PostId,
  /**
   * Muster ring — the within-loop's finest, most-robust calibration
   * knob (the other knobs hit integer cliffs; this one has a flat
   * plateau). Seeds 1..100 vs `spider-l4` (detach=`vanguard-bravo`,
   * not spent, `detachGate:'muster'`, spider `garrisonRadius:1`):
   * ring 1 → ant 64, ring 2 → ant 56, ring **3/4/5 → ant 60** (a flat
   * plateau — stable, not knife-edge). 4 is the plateau centre and the
   * shipped value, landing the §9.4 [58,61] band dead-centre at 60.
   */
  musterRing: 4,
  queenGuard: 'queen-guard' as PartyId,
  /**
   * L4-only Light-Switch contest (re-arbitration §9.3(b).1). The
   * detach element is `vanguard-bravo` — it carries an `ant-mage`
   * (roster-ants.json), so a `move-to` toward the north-wall switch
   * triggers the engine's `ant-plane-switch` teleport
   * (`engine/movement.ts:tryPlaneTransition`) onto the wall plane,
   * where it greedily walks to and captures the switch (verified: the
   * switch flips to ant in 100/100 seeds, median turn 9 — a fully
   * seed-robust transient buff, the §9.3(b).3 invariant). Detaching
   * exactly one footman-heavy mid party, *post-muster* (so the whole
   * body pushes the corridor under the +2 — the §6 "push through the
   * dark" beat — before peeling off), with the detachment NOT spent
   * (it rejoins the assault once the switch is ant-owned and the +2 has
   * self-extinguished) is the calibrated contest difficulty: detaching
   * `pathfinders` instead measured ant 65, marking the detachment
   * "spent" measured ant 80, `detachGate:'early'` measured ant ~39 —
   * this combination + spider `garrisonRadius:1` + `musterRing:4`
   * lands ant 60. The *existence* of the contest is the §9 ruled
   * invariant; this difficulty tuning is the within-loop latitude.
   */
  switchContest: {
    post: 'light-switch' as PostId,
    captureParties: ['vanguard-bravo' as PartyId],
    detachmentIsSpent: false,
    detachGate: 'muster',
  },
};

export const baselineL4Player: AIPolicy = buildChainMarchPolicy(L4_CHAIN_CONFIG);
