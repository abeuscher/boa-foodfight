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
 * own POST ids and a pure-floor winning route, so the chain is spelled
 * out explicitly here. Additive; registered only under
 * `SCENARIO_PLAYER_AIS` (NOT `PLAYER_AIS`) so the gate-29 diversity
 * sweep stays byte-identical.
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
 * Determinism: pure (state, scenario, rng) → state via `buildAntPolicy`;
 * no RNG is consulted — fully replayable.
 */

import type { FleeOrder, GameState, PartyId, PostId, TileCoord } from '../engine/types.ts';

import { partyShouldFlee } from './picket-defense.ts';
import {
  buildAntPolicy,
  moveToOrHold,
  type PartyDecision,
  partyAlive,
  postLocation,
} from './policy-helpers.ts';
import type { AIPolicy } from './types.ts';

/** The canonical L3 POST chain, in capture order. All five tiles are on
 * the floor plane in a zero-trap open corner block, so one `move-to`
 * per hop resolves through the engine's greedy descent. */
const CHAIN: readonly PostId[] = [
  'crumb-pile' as PostId,
  'pantry' as PostId,
  'stove-hood' as PostId,
  'counter-edge' as PostId,
];

/** The objective POST (last chain link). The `capture-post` victory
 * fires the moment this is ant-owned. */
const COUNTER_EDGE: PostId = 'counter-edge' as PostId;

/** The neutral POST the field force musters on before committing to the
 * spider-held objective: the last *neutral* link (stove-hood). Massing
 * here, then assaulting as one body, is the single idea L3 teaches. */
const MUSTER_POST: PostId = 'stove-hood' as PostId;

/** Manhattan ring within which a field party counts as "mustered" at
 * the muster POST (it need not be exactly on the tile). */
const MUSTER_RING = 2;

/** The non-queen ant field parties. The queen-guard is driven by the
 * `buildAntPolicy` framework (immobile, always `defend`) and excluded
 * here so it never counts toward / blocks the muster gate. */
const QUEEN_GUARD: PartyId = 'queen-guard' as PartyId;

/** Round-15-style low-HP retreat threshold (mirrors the tutorial). */
const FLEE_HP_THRESHOLD = 0.3;
const FLEE_ORDER: FleeOrder = { kind: 'flee' };

/** Manhattan distance between two tile coords on the same plane;
 * infinity across planes. */
const planarDistance = (a: TileCoord, b: TileCoord): number =>
  a.plane === b.plane ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) : Number.POSITIVE_INFINITY;

/** Next chain POST that is not yet ant-owned, or undefined when every
 * link including the objective is ant-owned (scenario already won). */
const nextChainPost = (state: GameState): PostId | undefined => {
  for (const id of CHAIN) {
    const post = state.posts.get(id);
    if (post && post.owner !== 'ant') return id;
  }
  return undefined;
};

export const baselineL3Player: AIPolicy = buildAntPolicy('baseline-l3', (state: GameState) => {
  const next = nextChainPost(state);
  const counterEdge = state.posts.get(COUNTER_EDGE);
  const objectiveOwned = counterEdge?.owner === 'ant';
  // Assault phase: every neutral chain link is ant-owned and only the
  // spider-held objective is left (or it is already ours).
  const assaultPhase = next === COUNTER_EDGE || objectiveOwned;

  // Muster gate: while still walking the neutral chain, parties that
  // already reached the muster POST wait there until EVERY living
  // field party is within the muster ring, so the counter-edge
  // assault lands as one mass. Once we flip to the assault phase the
  // gate is moot (everyone commits).
  const musterLoc = postLocation(state, MUSTER_POST);
  let mustered = assaultPhase;
  if (!assaultPhase && musterLoc !== undefined) {
    const musterOwned = state.posts.get(MUSTER_POST)?.owner === 'ant';
    if (musterOwned) {
      mustered = true;
      for (const [id, p] of state.parties) {
        if (p.faction !== 'ant') continue;
        if (id === QUEEN_GUARD) continue;
        if (!partyAlive(p)) continue;
        if (planarDistance(p.location, musterLoc) > MUSTER_RING) {
          mustered = false;
          break;
        }
      }
    }
  }

  const nextLoc = next === undefined ? undefined : postLocation(state, next);
  const objLoc = postLocation(state, COUNTER_EDGE);

  return (party): PartyDecision | null => {
    const fleeing = partyShouldFlee(party, state.unitTemplates, FLEE_HP_THRESHOLD);

    // Target selection:
    //   - assault phase / chain done → commit to counter-edge.
    //   - chain incomplete, mustered → push the next chain link.
    //   - chain incomplete, this party already at the muster POST and
    //     it is the next link → hold for stragglers.
    //   - otherwise → walk the next chain link.
    let target: TileCoord | undefined;
    const atMuster = musterLoc !== undefined && planarDistance(party.location, musterLoc) <= 1;
    if (assaultPhase || next === undefined) {
      target = objLoc;
    } else if (mustered) {
      target = nextLoc;
    } else if (atMuster && next === MUSTER_POST) {
      target = musterLoc;
    } else {
      target = nextLoc;
    }

    if (target === undefined) {
      return fleeing ? { orders: [FLEE_ORDER], posture: 'run' } : { orders: [], posture: 'fight' };
    }
    const moveOrders = moveToOrHold(party, target);
    return fleeing
      ? { orders: [FLEE_ORDER, ...moveOrders], posture: 'run' }
      : { orders: moveOrders, posture: 'fight' };
  };
});
