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
import { edgeAnchor, edgeNeighbor, isCornerCross } from './edges.ts';
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

/**
 * Ant-only one-shot teleport. Ant parties carrying an ant-mage spend
 * the order to land on the same (x, y) of any plane. Replaces the old
 * shared `plane-switch` per rec 1.4 — spiders no longer need (or have)
 * an ability for plane-switching; their corner-cross is automatic.
 */
const ANT_PLANE_SWITCH: AbilityId = 'ant-plane-switch' as AbilityId;

const WALL_PLANES = new Set<string>(['north-wall', 'south-wall', 'east-wall', 'west-wall']);
const isWallPlane = (plane: string): boolean => WALL_PLANES.has(plane);

/**
 * Ant scout-template id. The round-7 ant scout-majority bonus (3 tiles
 * per turn on any plane) keys off this template id rather than the
 * `scout` tag, because spider-scouts also carry a `scout` tag and the
 * bonus is ant-only.
 */
const ANT_SCOUT_TEMPLATE_ID = 'ant-scout';

/**
 * True iff strictly more than half of the party's living units are
 * ant-scouts. Round-7 movement bonus: a strict-majority ant-scout
 * party moves up to 3 tiles per turn on any plane (does not compound
 * with the wall asymmetry — the cap is 3 on any plane). Spider-scout
 * units do NOT trigger this; the check is template-id specific.
 */
const scoutMajorityAnt = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  if (party.faction !== 'ant') return false;
  let livingCount = 0;
  let scoutCount = 0;
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    livingCount += 1;
    const tmpl = templates.get(u.templateId);
    if (tmpl && (tmpl.id as string) === ANT_SCOUT_TEMPLATE_ID) scoutCount += 1;
  }
  if (livingCount === 0) return false;
  return scoutCount * 2 > livingCount;
};

/**
 * Tag that, when present on any LIVING unit in a party, suppresses the
 * party's plane-switch teleport — the unit is too heavy / earthbound to
 * be carried up by a mage. Such parties must use paired POSTs or edge
 * adjacency to cross planes. Tag is data-driven (set on a unit
 * template's `tags` array).
 */
const NO_FLY_TAG = 'no-fly';

const partyHasNoFly = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    const tmpl = templates.get(u.templateId);
    if (tmpl?.tags.includes(NO_FLY_TAG)) return true;
  }
  return false;
};

const partyHasPlaneSwitch = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  // A no-fly unit anchors the whole party to the ground; even a mage
  // carrying ant-plane-switch can't teleport everyone up.
  if (partyHasNoFly(party, templates)) return false;
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    const tmpl = templates.get(u.templateId);
    if (tmpl?.abilities.includes(ANT_PLANE_SWITCH)) return true;
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
 * 1. ant-plane-switch (ant-mage). Teleport to the same (x,y) on the
 *    target plane. Works any plane-to-any plane. Ants only — see
 *    rec 1.4 (asymmetric plane-switch costs).
 * 2. Edge adjacency (geometric). The bathroom is a cube; a tile on a
 *    plane's boundary maps to a single tile on the adjacent plane via
 *    `engine/edges.ts`. Anyone can use floor↔wall and ceiling↔wall
 *    edges. Wall-to-wall *corner* crosses are spider-only — the
 *    `spider-corner-cross` faction passive (no use cap, no order).
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

  // 1. ant-plane-switch ability: teleport same (x,y).
  if (partyHasPlaneSwitch(party, templates)) {
    return { plane: target.plane, x: party.location.x, y: party.location.y };
  }

  // 2. Edge adjacency: party is on a shared edge with the target plane.
  const adj = edgeNeighbor(party.location, target.plane);
  if (adj !== undefined) {
    // Wall-to-wall corner crosses are spider-only. Ants must walk via
    // floor/ceiling or use ant-plane-switch.
    if (isCornerCross(party.location, adj) && party.faction !== 'spider') return undefined;
    return adj;
  }

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
  /** Webs broken by this party this turn (only ants ever break webs).
   * Caller updates state.webbedTiles + emits web-broken events. */
  readonly brokenWebs: readonly TileCoord[];
}

const resolveParty = (
  partyIn: Party,
  state: GameState,
  movementRng: Rng,
  webbedTiles: Map<string, TileCoord>,
): PartyResolution => {
  // No orders -> hold.
  const moveSlot = firstMoveOrder(partyIn.orders);
  if (!moveSlot) return { nextParty: partyIn, steps: [], brokenWebs: [] };

  const target = moveSlot.order.target;

  // Already at target -> drop the order, no movement.
  if (sameCoord(partyIn.location, target)) {
    return {
      nextParty: { ...partyIn, orders: dropOrderAt(partyIn.orders, moveSlot.index) },
      steps: [],
      brokenWebs: [],
    };
  }

  let allowance = baseMovementAllowance(partyIn, state.unitTemplates);
  // Asymmetric wall traversal: spiders climb walls fluently while
  // ants struggle. Initial Phase-1 ratio of 2:1 was structurally
  // hostile to baseline (which routes through wall-crack); softened
  // to 3:2 in Phase 4 so the asymmetry is real but doesn't hard-
  // counter the locked baseline player. Floor and ceiling keep the
  // default allowance from `baseMovementAllowance`.
  if (isWallPlane(partyIn.location.plane)) {
    allowance = partyIn.faction === 'spider' ? 3 : 2;
  }
  // Round-7 feature 1: ant scout-majority parties move 3/turn on any
  // plane. Does not compound with the wall asymmetry — the cap is 3
  // regardless of plane. Spider-scout parties do NOT trigger this.
  if (scoutMajorityAnt(partyIn, state.unitTemplates)) {
    if (allowance < 3) allowance = 3;
  }
  let location = partyIn.location;
  const steps: PartyMoveStep[] = [];
  const brokenWebs: TileCoord[] = [];
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

    // Web blocking: if this party is an ant attempting to enter a webbed
    // tile, abort the step, consume the web (it breaks), and end the
    // party's turn. Spiders pass through webs freely.
    const destKey = coordKey(next);
    if (partyIn.faction === 'ant' && webbedTiles.has(destKey)) {
      const broken = webbedTiles.get(destKey)!;
      webbedTiles.delete(destKey);
      brokenWebs.push(broken);
      break;
    }

    steps.push({ partyId: partyIn.id, from: location, to: next });
    location = next;
    allowance -= 1;
  }

  // If we reached the target this turn, drop the order; otherwise keep it.
  const arrived = sameCoord(location, target);
  const ordersOut = arrived ? dropOrderAt(partyIn.orders, moveSlot.index) : partyIn.orders;

  const nextParty: Party = { ...partyIn, location, orders: ordersOut };
  return { nextParty, steps, brokenWebs };
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
  // Mutable copy of webbedTiles. Ant parties stepping onto a web break
  // it; we emit web-broken events and reflect the change in nextState.
  const webbedTiles = new Map<string, TileCoord>(state.webbedTiles);

  // Seed the working map with current parties; we will overwrite as we go.
  for (const [id, party] of state.parties) nextParties.set(id, party);

  // Process in stable alphabetical order so input map iteration order is
  // irrelevant to the output.
  const orderedIds = [...state.parties.keys()].sort();

  for (const id of orderedIds) {
    const partyIn = nextParties.get(id);
    if (!partyIn) continue;
    const { nextParty, steps, brokenWebs } = resolveParty(partyIn, state, movementRng, webbedTiles);
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
      // Emit corner-crossed for spider parties traversing a wall-to-wall
      // corner edge (the spider-corner-cross faction passive — rec 1.4).
      // Engine-side detection only; no order or use cap is consumed.
      if (partyIn.faction === 'spider' && isCornerCross(step.from, step.to)) {
        events.push({
          kind: 'corner-crossed',
          turn: state.turn,
          tick: tick(),
          partyId: step.partyId,
          from: step.from,
          to: step.to,
        });
      }
    }
    for (const broken of brokenWebs) {
      events.push({
        kind: 'web-broken',
        turn: state.turn,
        tick: tick(),
        partyId: id,
        coord: broken,
      });
    }
  }

  const nextState: GameState = { ...state, parties: nextParties, webbedTiles };
  const collisions = detectCollisions(nextParties);

  return { state: nextState, events, collisions };
};
