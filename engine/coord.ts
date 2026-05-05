/**
 * TileCoord helpers. Coords are flat data; this module exists so multiple
 * engine modules don't reinvent the keying convention.
 */

import type { TileCoord } from './types.ts';

/** String key for use in Maps. Format: `${plane}:${x},${y}`. */
export const coordKey = (c: TileCoord): string => `${c.plane}:${String(c.x)},${String(c.y)}`;

export const sameCoord = (a: TileCoord, b: TileCoord): boolean =>
  a.plane === b.plane && a.x === b.x && a.y === b.y;

/** 4-neighbor offsets within a single plane. */
export const NEIGHBOR_OFFSETS: readonly { dx: number; dy: number }[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

export const inPlaneNeighbors = (c: TileCoord): readonly TileCoord[] =>
  NEIGHBOR_OFFSETS.map((o) => ({ plane: c.plane, x: c.x + o.dx, y: c.y + o.dy }));

/** Chebyshev distance within a single plane. Cross-plane returns Infinity. */
export const distance = (a: TileCoord, b: TileCoord): number => {
  if (a.plane !== b.plane) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};
