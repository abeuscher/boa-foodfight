/**
 * Tests for the UI-01 client-side BFS path preview helper.
 * Coverage:
 *   1. Empty inputs (from === target, cross-plane) return [].
 *   2. Adjacent tiles → single-step preview.
 *   3. Multi-step path on an open plane reaches the target.
 *   4. Obstacles force a detour (preview never enters an obstacle).
 *   5. Unreachable target (sealed pocket) returns [].
 *   6. maxSteps cap honored — long paths truncate.
 */

import { describe, expect, it } from 'vitest';

import { previewPath } from './pathPreview.ts';

import { coordKey } from '../../../engine/coord.ts';
import type { Tile, TileCoord } from '../../../engine/types.ts';

const openTerrain = { kind: 'open' as const, movementCost: 1, defenseModifier: 0 };
const obstacleTerrain = { kind: 'obstacle' as const, movementCost: 99, defenseModifier: 0 };

/** Build a 10x10 open-plane tile map. Pass `obstacles` to plant
 * impassable tiles inside it. */
const makePlane = (
  plane: TileCoord['plane'],
  obstacles: readonly TileCoord[] = [],
): ReadonlyMap<string, Tile> => {
  const obstacleKeys = new Set(obstacles.map(coordKey));
  const tiles = new Map<string, Tile>();
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const coord = { plane, x, y };
      const key = coordKey(coord);
      tiles.set(key, {
        coord,
        terrain: obstacleKeys.has(key) ? obstacleTerrain : openTerrain,
      });
    }
  }
  return tiles;
};

describe('previewPath', () => {
  it('returns [] when from === target', () => {
    const tiles = makePlane('floor');
    const c: TileCoord = { plane: 'floor', x: 3, y: 3 };
    expect(previewPath(c, c, tiles)).toEqual([]);
  });

  it('returns [] for cross-plane from / target', () => {
    const tiles = makePlane('floor');
    const from: TileCoord = { plane: 'floor', x: 3, y: 3 };
    const target: TileCoord = { plane: 'ceiling', x: 5, y: 5 };
    expect(previewPath(from, target, tiles)).toEqual([]);
  });

  it('produces a single-step preview for an adjacent target', () => {
    const tiles = makePlane('floor');
    const from: TileCoord = { plane: 'floor', x: 3, y: 3 };
    const target: TileCoord = { plane: 'floor', x: 3, y: 4 };
    const path = previewPath(from, target, tiles);
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual(target);
  });

  it('produces a multi-step path along an open lane', () => {
    const tiles = makePlane('floor');
    const from: TileCoord = { plane: 'floor', x: 1, y: 1 };
    const target: TileCoord = { plane: 'floor', x: 1, y: 5 };
    const path = previewPath(from, target, tiles);
    // Distance is 4 → 4 steps.
    expect(path).toHaveLength(4);
    expect(path[path.length - 1]).toEqual(target);
    // Every step is on the same plane.
    for (const c of path) {
      expect(c.plane).toBe('floor');
    }
  });

  it('detours around an obstacle row that blocks the direct line', () => {
    // Mirrors the engine pathfinder regression test from PR #57.
    const obstacles: TileCoord[] = [
      { plane: 'floor', x: 5, y: 4 },
      { plane: 'floor', x: 6, y: 4 },
    ];
    const tiles = makePlane('floor', obstacles);
    const from: TileCoord = { plane: 'floor', x: 5, y: 3 };
    const target: TileCoord = { plane: 'floor', x: 5, y: 5 };
    const path = previewPath(from, target, tiles);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual(target);
    // Path must not enter an obstacle tile.
    const obstacleKeys = new Set(obstacles.map(coordKey));
    for (const c of path) {
      expect(obstacleKeys.has(coordKey(c))).toBe(false);
    }
  });

  it('returns [] when target is unreachable (sealed pocket)', () => {
    // Surround the target with obstacles so BFS can't reach it.
    const target: TileCoord = { plane: 'floor', x: 5, y: 5 };
    const obstacles: TileCoord[] = [
      { plane: 'floor', x: 5, y: 4 },
      { plane: 'floor', x: 5, y: 6 },
      { plane: 'floor', x: 4, y: 5 },
      { plane: 'floor', x: 6, y: 5 },
    ];
    const tiles = makePlane('floor', obstacles);
    const from: TileCoord = { plane: 'floor', x: 0, y: 0 };
    expect(previewPath(from, target, tiles)).toEqual([]);
  });

  it('honors the maxSteps cap', () => {
    const tiles = makePlane('floor');
    const from: TileCoord = { plane: 'floor', x: 0, y: 0 };
    const target: TileCoord = { plane: 'floor', x: 9, y: 9 };
    const path = previewPath(from, target, tiles, 5);
    expect(path).toHaveLength(5);
    // The preview is partial — last tile is NOT the target.
    expect(path[path.length - 1]).not.toEqual(target);
  });
});
