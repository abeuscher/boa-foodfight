/**
 * L3 — ant policy for Level 3 ("The Kitchen", `data/level-3`,
 * level-progression-plan §2 "L3 — Kitchen").
 *
 * L3 is a `capture-post` scenario on a static 10×10 floor with a
 * central 3×3 island obstacle (x∈{4,5,6}, y∈{4,5,6}) splitting the room
 * into a north lane (rows 0–3) and a south lane (rows 7–9). Entrance is
 * sink-drain (floor 0,9); the objective is counter-edge (floor 9,0),
 * held by the spider (+3 def). Six POSTs: sink-drain (home), pantry
 * (neutral, south lane), crumb-pile (neutral, north lane),
 * stove-hood↔backsplash (plane-transition pair around the island),
 * counter-edge (objective).
 *
 * It is intentionally NOT `ai/baseline.ts` (full kit) and NOT
 * `ai/baseline-tutorial.ts` (which walks the L1 mid-POST *type
 * prefixes* and musters onto a north-wall→ceiling latch). L3 has its
 * own POST ids and a pure-floor winning route, so the chain is given as
 * an explicit config to the shared `buildChainMarchPolicy`
 * (`ai/capture-chain.ts`) — the same chain-march shape L4 reuses, the
 * `ai/picket-defense.ts` consolidation precedent applied to the
 * capture-post attacker. This is a pure structural extraction: the
 * resolved orders are byte-identical to the prior inline policy
 * (verified by the unchanged gate-29 / tutorial-76 / L3-67
 * measurements). Additive; registered only under `SCENARIO_PLAYER_AIS`
 * (NOT `PLAYER_AIS`) so the gate-29 diversity sweep stays
 * byte-identical.
 *
 * Strategy (one sentence, per the §3.4.3 learnability rule):
 *
 *   All field parties march the canonical POST chain (crumb-pile →
 *   pantry → stove-hood → counter-edge), holding at the last neutral
 *   chain POST until every living field party has mustered there, then
 *   committing to the spider-held counter-edge as one mass; the
 *   queen-guard holds the sink drain; any field party below the low-HP
 *   threshold runs.
 *
 * Greedy navigability: every chain POST tile lies in one of the four
 * open corner blocks (columns 0–3 or 7–9, rows 0–3 or 7–9), away from
 * the island's blocked row/column bands. The engine's strict greedy
 * Manhattan descent (`engine/movement.ts:pickGreedyStep`) therefore
 * always finds a strictly-closer open neighbour from every reachable
 * floor tile toward each target — verified exhaustively over the
 * obstacle mask. The two lanes give a north and a south route around
 * the island (route diversity, §2); stove-hood↔backsplash is a real
 * plane-transition flank, but the pure-floor chain alone wins so the
 * policy stays simple and deterministic.
 *
 * Determinism: pure (state, scenario, rng) → state via `buildAntPolicy`
 * inside the shared builder; no RNG is consulted — fully replayable.
 */

import type { PartyId, PostId } from '../engine/types.ts';

import { buildChainMarchPolicy, type ChainMarchConfig } from './capture-chain.ts';
import type { AIPolicy } from './types.ts';

/** The canonical L3 POST chain, in capture order. All five tiles are on
 * the floor plane in a zero-trap open corner block, so one `move-to`
 * per hop resolves through the engine's greedy descent. The last
 * *neutral* link (stove-hood) is the muster POST: massing there, then
 * assaulting as one body, is the single idea L3 teaches. */
const L3_CHAIN_CONFIG: ChainMarchConfig = {
  name: 'baseline-l3',
  chain: [
    'crumb-pile' as PostId,
    'pantry' as PostId,
    'stove-hood' as PostId,
    'counter-edge' as PostId,
  ],
  objective: 'counter-edge' as PostId,
  musterPost: 'stove-hood' as PostId,
  musterRing: 2,
  queenGuard: 'queen-guard' as PartyId,
};

export const baselineL3Player: AIPolicy = buildChainMarchPolicy(L3_CHAIN_CONFIG);
