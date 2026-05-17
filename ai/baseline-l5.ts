/**
 * L5 — ant policy for Level 5 ("The Bedroom", `data/level-5`,
 * level-progression-plan §2 "L5 — Bedroom").
 *
 * L5 is a `capture-post` scenario on a static 10×10 with **all 6 planes**
 * (the room "opens back up" after L3/L4's reduced sets). A 6×5 floor
 * obstacle — the **bed** — occupies cols 2–7 × rows 3–7, bisecting the
 * floor into a north strip (rows 0–2) and a south strip (rows 8–9),
 * connected ONLY at the column ends (cols 0–1 and cols 8–9 are open
 * top-to-bottom, rows 0–9). The ceiling over the bed is fully open → the
 * premium route. Six POSTs: nightstand (ant home, floor 0,1, north
 * strip), under-bed (concealment POST — `concealment:true`, floor 4,5, a
 * single open pocket fully enclosed by the bed so it is reachable ONLY
 * via plane-transition, the fog-immune ant garrison), headboard ↔
 * ceiling-fan (a plane-transition pair onto the open ceiling),
 * pillow-fort (high-def neutral on the ceiling), dresser-top (objective,
 * spider-held, floor 9,9, far corner, +5 def).
 *
 * Modeled on `ai/baseline-l3.ts` (the pure-floor chain-marcher → a
 * spider-held objective). L3, L4 and L5 are the same match-up shape, so
 * this is a thin config over the shared `buildChainMarchPolicy`
 * (`ai/capture-chain.ts`) — the same consolidation precedent as
 * `ai/picket-defense.ts`. It is intentionally NOT `ai/baseline.ts`
 * (full kit) and NOT `ai/baseline-tutorial.ts` (the L1 POST-prefix
 * walk). Additive; registered only under `SCENARIO_PLAYER_AIS` (NOT
 * `PLAYER_AIS`) so the gate-29 diversity sweep stays byte-identical.
 *
 * L5 does NOT supply the optional `switchContest` field, so every new
 * branch in the shared builder short-circuits and the resolved orders
 * take the exact original L3 chain-march code path — the same opt-in
 * discipline L3 relies on (verified byte-identical by the unchanged
 * gate-29 / tutorial-76 / L3-67 / L4-60 measurements). The Under-Bed
 * concealment POST is the player-favorable info-asymmetry *tool* the
 * map provides (it denies the spider's pheromone trail-scouting while a
 * party stands on it — `engine/concealment.test.ts`); it starts
 * ant-owned and needs no capture, so the deterministic winning route is
 * the pure-floor chain and the policy stays simple, robust and
 * replayable (the L3 doctrine; the orchestrator + Gameplay PA tune the
 * L5 deltas and the Under-Bed interaction later).
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   All field parties march the canonical POST chain (headboard →
 *   dresser-top), holding at the last neutral chain POST (headboard)
 *   until every living field party has mustered there, then committing
 *   to the spider-held dresser-top as one mass; the queen-guard holds
 *   the nightstand; any field party below the low-HP threshold runs.
 *
 * Greedy navigability (the §0 strict-closer-neighbour argument): the
 * chain is pure-floor and never crosses the bed. nightstand (0,1) and
 * the muster POST headboard (1,8) both sit in the WEST connector band
 * (cols 0–1), which is open for every row 0–9 — a contiguous open
 * vertical corridor joining the north strip to the south strip. From
 * headboard the body marches the south strip (rows 8–9, every column
 * open) east, then up the EAST connector band (cols 8–9, open every row
 * 0–9) to dresser-top (9,9). For every reachable floor tile and every
 * chain target, a strictly-closer (Manhattan) open neighbour exists:
 *   - within the west connector (x∈{0,1}) a vertical step toward the
 *     target row is open for all rows;
 *   - within the south strip (y∈{8,9}) a one-column step toward the
 *     larger-x target is open for all columns;
 *   - within the east connector (x∈{8,9}) a vertical step toward the
 *     target row is open for all rows.
 * No chain/objective POST requires crossing the bed mask (cols 2–7,
 * rows 3–7), so the engine's strict greedy Manhattan descent
 * (`engine/movement.ts:pickGreedyStep`) never sticks. The under-bed
 * pocket (4,5) is deliberately OUTSIDE the floor-navigable set (it is
 * walled in by the bed on all four sides — verified) so it is reached
 * only by plane-transition, exactly the §2-L5 "reachable only via
 * plane-transition" intent; the chain never targets it.
 *
 * Determinism: pure (state, scenario, rng) → state via `buildAntPolicy`
 * inside the shared builder; no RNG is consulted — fully replayable.
 */

import type { PartyId, PostId } from '../engine/types.ts';

import { buildChainMarchPolicy, type ChainMarchConfig } from './capture-chain.ts';
import type { AIPolicy } from './types.ts';

/** The canonical L5 POST chain, in capture order. Both tiles are on the
 * floor plane in the bed-free connector/strip bands (never the bed
 * mask), so one `move-to` per hop resolves through the engine's greedy
 * descent. The last *neutral* link (headboard) is the muster POST:
 * massing there, then assaulting dresser-top as one body, is the single
 * idea L5 teaches — identical in shape to L3's chain. */
const L5_CHAIN_CONFIG: ChainMarchConfig = {
  name: 'baseline-l5',
  chain: ['headboard' as PostId, 'dresser-top' as PostId],
  objective: 'dresser-top' as PostId,
  musterPost: 'headboard' as PostId,
  /**
   * Muster ring — carried at the L3 plateau-centre default. The
   * orchestrator + Gameplay PA tune the L5 deltas (incl. the ruled L5
   * plane-affinity ramp and the Under-Bed interaction) and this knob
   * toward the §5 ~65% rebound target; it is left at a stable mid value
   * here so the baseline measurement is meaningful, not knife-edge.
   */
  musterRing: 2,
  queenGuard: 'queen-guard' as PartyId,
  // No `switchContest`: L5's Under-Bed is an ant-owned, no-capture
  // concealment tool, not an objective on the chain — the shared
  // builder collapses to the exact original chain-march code path
  // (byte-identical with L3, asserted by the L3-67 / L4-60 measures).
};

export const baselineL5Player: AIPolicy = buildChainMarchPolicy(L5_CHAIN_CONFIG);
