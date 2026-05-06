/**
 * Plane edge-adjacency for the unfolded-bathroom geometry.
 *
 * The bathroom is a 10x10x10 box. Six planes:
 *
 *   - `floor` (10x10): the bottom surface
 *   - `ceiling` (10x10): the top surface
 *   - `north-wall`, `south-wall`, `east-wall`, `west-wall`: vertical
 *     surfaces, each 10 wide x 10 tall
 *
 * Wall coordinates: x runs along the wall's length (parallel to the
 * floor edge it meets), y runs along the height — y=0 is the
 * ceiling-adjacent top row, y=9 is the floor-adjacent bottom row.
 *
 * Adjacency: every plane shares one edge with each of four other
 * planes. The mappings below let movement and the AI treat the
 * bathroom surface as one connected manifold — a party at a plane's
 * boundary tile can step onto the adjacent plane at the corresponding
 * tile in one move.
 *
 * Coordinate conventions:
 *   - north-wall x runs west(0) → east(9), matching floor's x axis
 *   - south-wall x runs west(0) → east(9), matching floor's x axis
 *   - east-wall x runs south(0) → north(9), matching floor's y axis
 *   - west-wall x runs south(0) → north(9), matching floor's y axis
 *   - all walls: y=0 is at the ceiling, y=9 is at the floor
 *   - floor: y=0 is north, y=9 is south, x=0 is west, x=9 is east
 *   - ceiling: same compass as floor when looking down
 */

import type { Plane, TileCoord } from './types.ts';

const GRID = 10;
const LAST = GRID - 1;

interface EdgeRule {
  readonly a: Plane;
  readonly b: Plane;
  /** Returns the b-side coord of the edge tile matching `coord` on plane a, or null. */
  readonly aToB: (coord: TileCoord) => TileCoord | null;
  /** Returns the a-side coord of the edge tile matching `coord` on plane b, or null. */
  readonly bToA: (coord: TileCoord) => TileCoord | null;
}

const onEdge = (v: number, target: number): boolean => v === target;

const EDGES: readonly EdgeRule[] = [
  // Floor ↔ walls (floor edges meet walls' bottom row y=9).
  {
    a: 'floor',
    b: 'north-wall',
    aToB: (c) => (onEdge(c.y, 0) ? { plane: 'north-wall', x: c.x, y: LAST } : null),
    bToA: (c) => (onEdge(c.y, LAST) ? { plane: 'floor', x: c.x, y: 0 } : null),
  },
  {
    a: 'floor',
    b: 'south-wall',
    aToB: (c) => (onEdge(c.y, LAST) ? { plane: 'south-wall', x: c.x, y: LAST } : null),
    bToA: (c) => (onEdge(c.y, LAST) ? { plane: 'floor', x: c.x, y: LAST } : null),
  },
  {
    a: 'floor',
    b: 'west-wall',
    aToB: (c) => (onEdge(c.x, 0) ? { plane: 'west-wall', x: c.y, y: LAST } : null),
    bToA: (c) => (onEdge(c.y, LAST) ? { plane: 'floor', x: 0, y: c.x } : null),
  },
  {
    a: 'floor',
    b: 'east-wall',
    aToB: (c) => (onEdge(c.x, LAST) ? { plane: 'east-wall', x: c.y, y: LAST } : null),
    bToA: (c) => (onEdge(c.y, LAST) ? { plane: 'floor', x: LAST, y: c.x } : null),
  },

  // Ceiling ↔ walls (ceiling edges meet walls' top row y=0).
  {
    a: 'ceiling',
    b: 'north-wall',
    aToB: (c) => (onEdge(c.y, 0) ? { plane: 'north-wall', x: c.x, y: 0 } : null),
    bToA: (c) => (onEdge(c.y, 0) ? { plane: 'ceiling', x: c.x, y: 0 } : null),
  },
  {
    a: 'ceiling',
    b: 'south-wall',
    aToB: (c) => (onEdge(c.y, LAST) ? { plane: 'south-wall', x: c.x, y: 0 } : null),
    bToA: (c) => (onEdge(c.y, 0) ? { plane: 'ceiling', x: c.x, y: LAST } : null),
  },
  {
    a: 'ceiling',
    b: 'west-wall',
    aToB: (c) => (onEdge(c.x, 0) ? { plane: 'west-wall', x: c.y, y: 0 } : null),
    bToA: (c) => (onEdge(c.y, 0) ? { plane: 'ceiling', x: 0, y: c.x } : null),
  },
  {
    a: 'ceiling',
    b: 'east-wall',
    aToB: (c) => (onEdge(c.x, LAST) ? { plane: 'east-wall', x: c.y, y: 0 } : null),
    bToA: (c) => (onEdge(c.y, 0) ? { plane: 'ceiling', x: LAST, y: c.x } : null),
  },

  // Wall ↔ adjacent wall (corner traversal at shared vertical edges).
  // NW corner: north-wall x=0 column ↔ west-wall x=LAST column.
  {
    a: 'north-wall',
    b: 'west-wall',
    aToB: (c) => (onEdge(c.x, 0) ? { plane: 'west-wall', x: LAST, y: c.y } : null),
    bToA: (c) => (onEdge(c.x, LAST) ? { plane: 'north-wall', x: 0, y: c.y } : null),
  },
  // NE corner: north-wall x=LAST ↔ east-wall x=LAST.
  {
    a: 'north-wall',
    b: 'east-wall',
    aToB: (c) => (onEdge(c.x, LAST) ? { plane: 'east-wall', x: LAST, y: c.y } : null),
    bToA: (c) => (onEdge(c.x, LAST) ? { plane: 'north-wall', x: LAST, y: c.y } : null),
  },
  // SW corner: south-wall x=0 ↔ west-wall x=0.
  {
    a: 'south-wall',
    b: 'west-wall',
    aToB: (c) => (onEdge(c.x, 0) ? { plane: 'west-wall', x: 0, y: c.y } : null),
    bToA: (c) => (onEdge(c.x, 0) ? { plane: 'south-wall', x: 0, y: c.y } : null),
  },
  // SE corner: south-wall x=LAST ↔ east-wall x=0.
  {
    a: 'south-wall',
    b: 'east-wall',
    aToB: (c) => (onEdge(c.x, LAST) ? { plane: 'east-wall', x: 0, y: c.y } : null),
    bToA: (c) => (onEdge(c.x, 0) ? { plane: 'south-wall', x: LAST, y: c.y } : null),
  },
];

/**
 * Returns the tile on `targetPlane` adjacent to `from` if `from` is on
 * the shared edge between `from.plane` and `targetPlane`; otherwise
 * undefined.
 */
export const edgeNeighbor = (from: TileCoord, targetPlane: Plane): TileCoord | undefined => {
  if (from.plane === targetPlane) return undefined;
  for (const e of EDGES) {
    if (e.a === from.plane && e.b === targetPlane) {
      const r = e.aToB(from);
      if (r !== null) return r;
    }
    if (e.b === from.plane && e.a === targetPlane) {
      const r = e.bToA(from);
      if (r !== null) return r;
    }
  }
  return undefined;
};

/** True iff `coord` lies on any plane boundary. */
export const isOnPlaneEdge = (coord: TileCoord): boolean =>
  coord.x === 0 || coord.x === LAST || coord.y === 0 || coord.y === LAST;

/**
 * Returns the boundary tile on `from.plane` closest (Manhattan) to
 * `from` from which a party can step to `targetPlane`. If no edge of
 * `from.plane` borders `targetPlane`, returns undefined and the
 * caller should fall back to a paired POST or stall. Used by
 * movement to walk a party from interior to the right boundary
 * before transiting planes.
 */
export const edgeAnchor = (from: TileCoord, targetPlane: Plane): TileCoord | undefined => {
  if (from.plane === targetPlane) return undefined;
  let best: { coord: TileCoord; dist: number } | undefined;
  const tryCoord = (c: TileCoord): void => {
    if (edgeNeighbor(c, targetPlane) === undefined) return;
    const d = Math.abs(from.x - c.x) + Math.abs(from.y - c.y);
    if (!best || d < best.dist) best = { coord: c, dist: d };
  };
  for (let i = 0; i < GRID; i++) {
    tryCoord({ plane: from.plane, x: i, y: 0 });
    tryCoord({ plane: from.plane, x: i, y: LAST });
    tryCoord({ plane: from.plane, x: 0, y: i });
    tryCoord({ plane: from.plane, x: LAST, y: i });
  }
  return best?.coord;
};
