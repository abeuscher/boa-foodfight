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

/**
 * Manhattan distance within a single plane; infinity across planes.
 * The true greedy-descent path metric for single-plane corridors —
 * shared by the L2 escort blocker scan and the L3/L4 chain-march
 * muster gate (both independently grew an identical local helper; this
 * is the single home, the `ai/picket-defense.ts` consolidation
 * precedent applied to the metric). Pure leaf; no behavior delta — the
 * extracted callers resolve byte-identically (verified by the
 * unchanged L2 / L3-67 / gate-29 measurements).
 */
export const planarManhattan = (a: TileCoord, b: TileCoord): number =>
  a.plane === b.plane ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) : Number.POSITIVE_INFINITY;
