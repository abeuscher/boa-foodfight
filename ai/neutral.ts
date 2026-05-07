/**
 * Neutral-party AI policy (round 8).
 *
 * Three behavior modes per neutral party:
 *
 *   1. Default (uncontrolled, no rebound): one Chebyshev step per turn
 *      in a seeded-random direction. Mice never leave their spawn
 *      plane. Cockroaches and stinkbugs also stay on their spawn plane
 *      (no plane-switching). Same-tile collision with another neutral
 *      is skipped; same-tile collision with ant/spider is allowed
 *      (engine handles engagement).
 *
 *   2. Hypnotized by spider: seek the closest ant party on the same
 *      plane and step toward it. Used by stages 5+; until hypnotize is
 *      live this branch is unreachable.
 *
 *   3. Spider-rebound (post-hypnosis immunity window): random walk that
 *      DOES NOT decrease Chebyshev distance to the closest spider party
 *      on the same plane. If no valid step exists, hold position.
 *
 * The policy reads each neutral party's `NeutralStatus` to dispatch.
 *
 * Determinism: the policy is pure given the injected `Rng`. Per-party
 * RNG draws use `rng.fork(partyId)` so a new neutral kind doesn't shift
 * the entropy of older kinds across replays.
 */

import { coordKey, distance, sameCoord } from '../engine/coord.ts';
import { partyIdForKind } from '../engine/neutrals.ts';
import type { ScenarioData } from '../engine/state.ts';
import type {
  GameState,
  NeutralStatus,
  Order,
  Party,
  PartyId,
  Plane,
  Rng,
  TileCoord,
} from '../engine/types.ts';

import type { AIPolicy } from './types.ts';

const BOARD_MIN = 0;
const BOARD_MAX = 9;

/** All eight Chebyshev step deltas plus stay-put (5 candidates? no: 9). */
const STEP_DELTAS: readonly { dx: number; dy: number }[] = [
  { dx: -1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
];

const inBounds = (c: TileCoord): boolean =>
  c.x >= BOARD_MIN && c.x <= BOARD_MAX && c.y >= BOARD_MIN && c.y <= BOARD_MAX;

const neutralOccupiedTiles = (state: GameState, selfId: PartyId): Set<string> => {
  const taken = new Set<string>();
  for (const p of state.parties.values()) {
    if (p.faction !== 'neutral') continue;
    if (p.id === selfId) continue;
    if (p.units.every((u) => u.currentHp <= 0)) continue;
    taken.add(coordKey(p.location));
  }
  return taken;
};

const isStepValid = (
  state: GameState,
  selfId: PartyId,
  to: TileCoord,
  occupiedNeutrals: Set<string>,
): boolean => {
  if (!inBounds(to)) return false;
  const tile = state.tiles.get(coordKey(to));
  if (!tile) return false;
  if (tile.terrain.kind === 'obstacle') return false;
  for (const post of state.posts.values()) {
    if (sameCoord(post.location, to)) return false;
  }
  if (occupiedNeutrals.has(coordKey(to))) return false;
  void selfId;
  return true;
};

/** Random in-plane Chebyshev step from `from`. Stay-put is also a
 * valid pick. Returns the chosen tile (which may equal `from`). */
const pickRandomStep = (
  state: GameState,
  selfId: PartyId,
  from: TileCoord,
  rng: Rng,
  occupiedNeutrals: Set<string>,
): TileCoord => {
  // Pick a random delta; if the resulting tile is invalid, fall back
  // to staying put. Per spec: "Skip the step if the chosen tile is
  // invalid".
  const delta = STEP_DELTAS[rng.int(STEP_DELTAS.length)] ?? STEP_DELTAS[4]!;
  const to: TileCoord = { plane: from.plane, x: from.x + delta.dx, y: from.y + delta.dy };
  if (sameCoord(to, from)) return from;
  if (isStepValid(state, selfId, to, occupiedNeutrals)) return to;
  return from;
};

/** Closest spider/ant party on the same plane as `from`. Returns null
 * if none. */
const closestPartyOnPlane = (
  state: GameState,
  faction: 'ant' | 'spider',
  plane: Plane,
  from: TileCoord,
): Party | null => {
  let best: { party: Party; d: number } | null = null;
  for (const p of state.parties.values()) {
    if (p.faction !== faction) continue;
    if (p.location.plane !== plane) continue;
    if (p.units.every((u) => u.currentHp <= 0)) continue;
    const d = distance(from, p.location);
    if (best === null || d < best.d || (d === best.d && p.id < best.party.id)) {
      best = { party: p, d };
    }
  }
  return best?.party ?? null;
};

/** One Chebyshev step from `from` toward `target`, clamped to bounds. */
const stepToward = (from: TileCoord, target: TileCoord): TileCoord => {
  if (from.plane !== target.plane) return from;
  const dx = Math.sign(target.x - from.x);
  const dy = Math.sign(target.y - from.y);
  return {
    plane: from.plane,
    x: Math.max(BOARD_MIN, Math.min(BOARD_MAX, from.x + dx)),
    y: Math.max(BOARD_MIN, Math.min(BOARD_MAX, from.y + dy)),
  };
};

/**
 * Rebound walk: pick a random step that does NOT decrease Chebyshev
 * distance to the closest spider party on the same plane. If no valid
 * step exists, hold position (returns `from`).
 */
const pickReboundStep = (
  state: GameState,
  selfId: PartyId,
  from: TileCoord,
  rng: Rng,
  occupiedNeutrals: Set<string>,
): TileCoord => {
  const closestSpider = closestPartyOnPlane(state, 'spider', from.plane, from);
  if (closestSpider === null) {
    return pickRandomStep(state, selfId, from, rng, occupiedNeutrals);
  }
  const currentDist = distance(from, closestSpider.location);
  const candidates: TileCoord[] = [];
  for (const delta of STEP_DELTAS) {
    const to: TileCoord = { plane: from.plane, x: from.x + delta.dx, y: from.y + delta.dy };
    if (!isStepValid(state, selfId, to, occupiedNeutrals)) continue;
    if (distance(to, closestSpider.location) >= currentDist) candidates.push(to);
  }
  if (candidates.length === 0) return from;
  return candidates[rng.int(candidates.length)] ?? from;
};

const moveOrder = (target: TileCoord): Order => ({ kind: 'move-to', target });

interface DecideContext {
  readonly state: GameState;
  readonly status: NeutralStatus | undefined;
  readonly party: Party;
  readonly rng: Rng;
  readonly occupiedNeutrals: Set<string>;
}

const decideNeutralOrders = (ctx: DecideContext): readonly Order[] => {
  const { state, status, party, rng, occupiedNeutrals } = ctx;
  // Hypnotized: seek the closest ant party on the same plane and step
  // toward it. If no ant on the plane, fall through to random walk.
  if (status?.hypnotizedBy === 'spider' && status.hypnoticControlRemaining > 0) {
    const target = closestPartyOnPlane(state, 'ant', party.location.plane, party.location);
    if (target !== null) {
      const stepped = stepToward(party.location, target.location);
      return sameCoord(party.location, stepped) ? [] : [moveOrder(stepped)];
    }
  }
  // Spider rebound: random walk that doesn't decrease distance to the
  // closest spider party on the same plane.
  if (status && status.spiderImmunityRemaining > 0) {
    const stepped = pickReboundStep(state, party.id, party.location, rng, occupiedNeutrals);
    return sameCoord(party.location, stepped) ? [] : [moveOrder(stepped)];
  }
  // Default: random walk on the spawn plane.
  const stepped = pickRandomStep(state, party.id, party.location, rng, occupiedNeutrals);
  return sameCoord(party.location, stepped) ? [] : [moveOrder(stepped)];
};

export const neutralPlayer: AIPolicy = {
  name: 'neutral',
  faction: 'neutral',
  decide(state: GameState, _scenario: ScenarioData, rng: Rng): GameState {
    const nextParties = new Map<PartyId, Party>();
    const occupiedNeutrals = new Map<PartyId, Set<string>>();
    // Snapshot once: compute the set of neutral-occupied tiles excluding
    // the focal party. We rebuild per-party so a freshly-moved neutral
    // doesn't bump its successor.
    for (const id of state.parties.keys())
      occupiedNeutrals.set(id, neutralOccupiedTiles(state, id));
    for (const [id, party] of state.parties) {
      if (party.faction !== 'neutral') {
        nextParties.set(id, party);
        continue;
      }
      if (party.units.every((u) => u.currentHp <= 0)) {
        nextParties.set(id, party);
        continue;
      }
      const status = state.neutralStatus.get(id);
      const partyRng = rng.fork(`neutral-${String(id)}`);
      const occupied = occupiedNeutrals.get(id) ?? new Set<string>();
      const orders = decideNeutralOrders({
        state,
        status,
        party,
        rng: partyRng,
        occupiedNeutrals: occupied,
      });
      nextParties.set(id, { ...party, orders });
    }
    return { ...state, parties: nextParties };
  },
};

// Re-export for tests that want to construct neutral ids.
export { partyIdForKind };
