/**
 * Movement resolution for one turn.
 *
 * This module is pure: given a `GameState`, an `Rng`, and a `tick` source, it
 * returns the next `GameState`, the `ReplayEvent`s emitted, and any pairs of
 * opposing-faction parties that ended on the same tile (collisions). Battle
 * resolution itself is deferred to the battle module.
 *
 * Per CONTRACTS.md, this module imports only from `engine/types` and
 * `engine/coord`. Tests may import `engine/state` to obtain real fixtures, but
 * runtime code here must not.
 *
 * Determinism notes:
 *
 * - Parties are processed in alphabetical order of `partyId` so that the
 *   iteration order of the input `parties` map cannot perturb output.
 * - Movement is computed greedy-tile-at-a-time off of a *mutable working copy*
 *   of party locations (representing simultaneous-ish movement); each step is
 *   applied immediately so that two parties cannot end on the same source
 *   tile mid-step. Within a single party's allowance, ties between equally
 *   good neighbor tiles are broken by `rng.fork('movement-tiebreak')`.
 * - All randomness flows through `rng.fork('movement')` so adding new
 *   movement-side randomness will not perturb battle / fog / ability streams.
 *
 * Plane-transition policy (Level 1 simplification):
 *   The spec describes flying / climbing units as able to bypass paired POSTs
 *   in some cases. For Level 1 we treat ALL inter-plane movement as requiring
 *   the moving party to occupy a POST that is `pairedWith` another POST on
 *   the destination plane AND for that destination POST to be friendly
 *   (owned by the party's faction). When both endpoints are friendly the
 *   party may "step through" at a cost of one tile of movement allowance.
 *   This unifies movement-mode handling for now; flight-bypass will land in
 *   a later iteration.
 */

import { coordKey, inPlaneNeighbors, sameCoord } from './coord.ts';
import { edgeAnchor, edgeNeighbor } from './edges.ts';
import { baseMovementAllowance } from './parties.ts';
import type {
  AbilityId,
  GameState,
  Order,
  Party,
  PartyId,
  Post,
  ReplayEvent,
  Rng,
  Tile,
  TileCoord,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

const PLANE_SWITCH: AbilityId = 'plane-switch' as AbilityId;

const partyHasPlaneSwitch = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    const tmpl = templates.get(u.templateId);
    if (tmpl?.abilities.includes(PLANE_SWITCH)) return true;
  }
  return false;
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PartyMoveStep {
  readonly partyId: PartyId;
  readonly from: TileCoord;
  readonly to: TileCoord;
}

export interface MovementOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
  /** Pairs of party ids that ended up on the same tile this turn. */
  readonly collisions: readonly (readonly [PartyId, PartyId])[];
}

// ---------------------------------------------------------------------------
// Tunables (Level 1)
// ---------------------------------------------------------------------------

/** Tiles whose `movementCost` is at or above this are impassable. */
const OBSTACLE_COST_THRESHOLD = 99;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const manhattan = (a: TileCoord, b: TileCoord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const firstMoveOrder = (orders: readonly Order[]): MoveOrderWithIndex | undefined => {
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if (o?.kind === 'move-to') return { order: o, index: i };
  }
  return undefined;
};

interface MoveOrderWithIndex {
  readonly order: Extract<Order, { kind: 'move-to' }>;
  readonly index: number;
}

const dropOrderAt = (orders: readonly Order[], index: number): readonly Order[] => {
  const next: Order[] = [];
  for (let i = 0; i < orders.length; i++) {
    if (i === index) continue;
    const o = orders[i];
    if (o) next.push(o);
  }
  return next;
};

/** Returns the post located at `coord`, or undefined. */
const postAt = (coord: TileCoord, posts: ReadonlyMap<unknown, Post>): Post | undefined => {
  for (const post of posts.values()) {
    if (sameCoord(post.location, coord)) return post;
  }
  return undefined;
};

const tileAt = (coord: TileCoord, tiles: ReadonlyMap<string, Tile>): Tile | undefined =>
  tiles.get(coordKey(coord));

const isPassableTile = (tile: Tile | undefined): tile is Tile =>
  tile !== undefined && tile.terrain.movementCost < OBSTACLE_COST_THRESHOLD;

/**
 * Pick the in-plane neighbor that (a) decreases Manhattan distance to the
 * target, (b) is passable, and (c) has the lowest `movementCost`. Ties are
 * broken deterministically through the supplied tiebreak Rng.
 */
const pickGreedyStep = (
  from: TileCoord,
  target: TileCoord,
  tiles: ReadonlyMap<string, Tile>,
  tiebreak: Rng,
): TileCoord | undefined => {
  if (from.plane !== target.plane) return undefined;
  const candidates: { coord: TileCoord; cost: number }[] = [];
  const currentDistance = manhattan(from, target);
  for (const neighbor of inPlaneNeighbors(from)) {
    if (manhattan(neighbor, target) >= currentDistance) continue;
    const tile = tileAt(neighbor, tiles);
    if (!isPassableTile(tile)) continue;
    candidates.push({ coord: neighbor, cost: tile.terrain.movementCost });
  }
  if (candidates.length === 0) return undefined;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const c of candidates) if (c.cost < bestCost) bestCost = c.cost;
  const tied = candidates.filter((c) => c.cost === bestCost);
  if (tied.length === 1) return tied[0]?.coord;
  // Deterministic tiebreak via injected RNG.
  const idx = tiebreak.int(tied.length);
  return tied[idx]?.coord;
};

/**
 * Decide where a party should land when stepping toward a target tile
 * on a different plane. Three mechanisms in order:
 *
 * 1. Plane-switch passive (ant-mage). Teleport to the same (x,y) on the
 *    target plane. Works any plane-to-any plane.
 * 2. Edge adjacency (geometric). The bathroom is a cube; a tile on a
 *    plane's boundary maps to a single tile on the adjacent plane via
 *    `engine/edges.ts`. Anyone can use this.
 * 3. Paired POST shortcut. If the party stands on a POST that is
 *    `pairedWith` another POST on the target plane, and the partner
 *    is not enemy-held, the party "steps through" — useful for
 *    non-adjacent planes (e.g., a duct from floor to ceiling).
 */
const tryPlaneTransition = (
  party: Party,
  target: TileCoord,
  posts: ReadonlyMap<unknown, Post>,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): TileCoord | undefined => {
  if (party.location.plane === target.plane) return undefined;

  // 1. Plane-switch ability: teleport same (x,y).
  if (partyHasPlaneSwitch(party, templates)) {
    return { plane: target.plane, x: party.location.x, y: party.location.y };
  }

  // 2. Edge adjacency: party is on a shared edge with the target plane.
  const adj = edgeNeighbor(party.location, target.plane);
  if (adj !== undefined) return adj;

  // 3. Paired POST traversal.
  const here = postAt(party.location, posts);
  if (!here?.pairedWith) return undefined;
  const partner = posts.get(here.pairedWith);
  if (!partner) return undefined;
  if (partner.location.plane !== target.plane) return undefined;
  if (partner.owner !== party.faction && partner.owner !== 'neutral') return undefined;
  return partner.location;
};

// ---------------------------------------------------------------------------
// Per-party resolution
// ---------------------------------------------------------------------------

interface PartyResolution {
  readonly nextParty: Party;
  readonly steps: readonly PartyMoveStep[];
}

const resolveParty = (partyIn: Party, state: GameState, movementRng: Rng): PartyResolution => {
  // No orders -> hold.
  const moveSlot = firstMoveOrder(partyIn.orders);
  if (!moveSlot) return { nextParty: partyIn, steps: [] };

  const target = moveSlot.order.target;

  // Already at target -> drop the order, no movement.
  if (sameCoord(partyIn.location, target)) {
    return {
      nextParty: { ...partyIn, orders: dropOrderAt(partyIn.orders, moveSlot.index) },
      steps: [],
    };
  }

  let allowance = baseMovementAllowance(partyIn, state.unitTemplates);
  let location = partyIn.location;
  const steps: PartyMoveStep[] = [];
  const tiebreak = movementRng.fork('movement-tiebreak');

  while (allowance > 0 && !sameCoord(location, target)) {
    let next: TileCoord | undefined;

    if (location.plane !== target.plane) {
      // Cross-plane: try a direct transition first (ability teleport,
      // edge adjacency, or paired POST). If none works, walk toward
      // the boundary edge that connects to the target plane.
      next = tryPlaneTransition({ ...partyIn, location }, target, state.posts, state.unitTemplates);
      if (!next) {
        const anchor = edgeAnchor(location, target.plane);
        if (anchor) next = pickGreedyStep(location, anchor, state.tiles, tiebreak);
      }
      if (!next) break; // Order stalls; will retry next turn.
    } else {
      next = pickGreedyStep(location, target, state.tiles, tiebreak);
      if (!next) break; // Boxed in; party stays put for the rest of this turn.
    }

    steps.push({ partyId: partyIn.id, from: location, to: next });
    location = next;
    allowance -= 1;
  }

  // If we reached the target this turn, drop the order; otherwise keep it.
  const arrived = sameCoord(location, target);
  const ordersOut = arrived ? dropOrderAt(partyIn.orders, moveSlot.index) : partyIn.orders;

  const nextParty: Party = { ...partyIn, location, orders: ordersOut };
  return { nextParty, steps };
};

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

const detectCollisions = (
  parties: ReadonlyMap<PartyId, Party>,
): readonly (readonly [PartyId, PartyId])[] => {
  // Group parties by tile key, in alphabetical id order so output is stable.
  const sortedIds = [...parties.keys()].sort();
  const byTile = new Map<string, PartyId[]>();
  for (const id of sortedIds) {
    const p = parties.get(id);
    if (!p) continue;
    const key = coordKey(p.location);
    const bucket = byTile.get(key);
    if (bucket) bucket.push(id);
    else byTile.set(key, [id]);
  }
  const pairs: [PartyId, PartyId][] = [];
  for (const ids of byTile.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        if (!a || !b) continue;
        const pa = parties.get(a);
        const pb = parties.get(b);
        if (!pa || !pb) continue;
        if (pa.faction === pb.faction) continue;
        if (pa.faction === 'neutral' || pb.faction === 'neutral') continue;
        // Skip wiped parties: a party with no living units shouldn't
        // trigger phantom battles.
        const aAlive = pa.units.some((u) => u.currentHp > 0);
        const bAlive = pb.units.some((u) => u.currentHp > 0);
        if (!aAlive || !bAlive) continue;
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export const resolveMovement = (
  state: GameState,
  rng: Rng,
  tick: () => number,
): MovementOutcome => {
  const movementRng = rng.fork('movement');
  const events: ReplayEvent[] = [];
  const nextParties = new Map<PartyId, Party>();

  // Seed the working map with current parties; we will overwrite as we go.
  for (const [id, party] of state.parties) nextParties.set(id, party);

  // Process in stable alphabetical order so input map iteration order is
  // irrelevant to the output.
  const orderedIds = [...state.parties.keys()].sort();

  for (const id of orderedIds) {
    const partyIn = nextParties.get(id);
    if (!partyIn) continue;
    const { nextParty, steps } = resolveParty(partyIn, state, movementRng);
    nextParties.set(id, nextParty);
    for (const step of steps) {
      events.push({
        kind: 'party-moved',
        turn: state.turn,
        tick: tick(),
        partyId: step.partyId,
        from: step.from,
        to: step.to,
      });
    }
  }

  const nextState: GameState = { ...state, parties: nextParties };
  const collisions = detectCollisions(nextParties);

  return { state: nextState, events, collisions };
};
