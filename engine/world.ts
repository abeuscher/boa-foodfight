/**
 * World accessors: tile and plane lookups.
 *
 * Read-only utilities used by movement, battle, and end-of-turn modules.
 * Per CONTRACTS.md, this module imports only from `engine/types` and
 * `engine/coord` — never from `engine/state` (one-way dep).
 */

import { coordKey, sameCoord } from './coord.ts';
import type { GameState, Post, Tile, TileCoord } from './types.ts';

/** Tiles whose `movementCost` is at or above this are impassable. */
const OBSTACLE_COST_THRESHOLD = 99;

/** Returns the Tile at `coord`, or undefined if `coord` is off-map. */
export const tileAt = (state: GameState, coord: TileCoord): Tile | undefined =>
  state.tiles.get(coordKey(coord));

/**
 * Returns true iff the coord is on-map and not an obstacle. Off-map coords
 * are not passable. Obstacle = `movementCost >= OBSTACLE_COST_THRESHOLD`.
 *
 * Note: this only checks the tile itself; party / unit occupancy is the
 * movement module's concern.
 */
export const isPassable = (state: GameState, coord: TileCoord): boolean => {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.terrain.movementCost < OBSTACLE_COST_THRESHOLD;
};

/**
 * Returns true iff the coord lies inside the loaded plane's width / height.
 * Negative x/y, or x/y greater than the maximum in-bounds value, are out.
 *
 * Implementation note: bounds are derived from the loaded tiles map rather
 * than from a separately-tracked plane size, so a missing tile (which loader
 * disallows) would also count as out-of-bounds. That is intentional: a tile
 * that is not in the map cannot be reasoned about.
 */
export const inBounds = (state: GameState, coord: TileCoord): boolean => {
  if (!Number.isInteger(coord.x) || !Number.isInteger(coord.y)) return false;
  if (coord.x < 0 || coord.y < 0) return false;
  return state.tiles.has(coordKey(coord));
};

/**
 * Returns the partner Post if `coord` matches a Post that has a `pairedWith`
 * partner, else undefined. The partner is the Post on the other side of the
 * plane transition. Returns undefined for coords with no Post or with an
 * unpaired Post.
 */
export const pairedPostAt = (state: GameState, coord: TileCoord): Post | undefined => {
  for (const post of state.posts.values()) {
    if (!sameCoord(post.location, coord)) continue;
    if (post.pairedWith === undefined) return undefined;
    return state.posts.get(post.pairedWith);
  }
  return undefined;
};
