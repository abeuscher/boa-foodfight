import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadScenario } from './state.ts';
import type { TileCoord } from './types.ts';
import { inBounds, isPassable, pairedPostAt, tileAt } from './world.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

describe('engine/world', () => {
  describe('tileAt', () => {
    it('returns the tile for a coord on the map', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const tile = tileAt(state, { plane: 'floor', x: 0, y: 0 });
      expect(tile).toBeDefined();
      expect(tile?.coord).toEqual({ plane: 'floor', x: 0, y: 0 });
    });

    it('returns undefined for an off-map coord', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      expect(tileAt(state, { plane: 'floor', x: 99, y: 99 })).toBeUndefined();
      expect(tileAt(state, { plane: 'floor', x: -1, y: 0 })).toBeUndefined();
    });
  });

  describe('isPassable', () => {
    it('returns false for obstacle tiles in the loaded Level 1 map', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      // Find an obstacle tile from the loaded state (no hardcoded coord).
      let obstacleCoord: TileCoord | undefined;
      for (const tile of state.tiles.values()) {
        if (tile.terrain.movementCost >= 99) {
          obstacleCoord = tile.coord;
          break;
        }
      }
      expect(obstacleCoord, 'expected at least one obstacle in Level 1 map').toBeDefined();
      if (obstacleCoord) expect(isPassable(state, obstacleCoord)).toBe(false);
    });

    it('returns true for an open / path tile', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      // Storm drain tile is at (0,0) on floor; per data it is a 'path' tile.
      expect(isPassable(state, { plane: 'floor', x: 0, y: 0 })).toBe(true);
    });

    it('returns false for off-map coords', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      expect(isPassable(state, { plane: 'floor', x: 100, y: 100 })).toBe(false);
    });
  });

  describe('inBounds', () => {
    it('rejects negative coords', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      expect(inBounds(state, { plane: 'floor', x: -1, y: 0 })).toBe(false);
      expect(inBounds(state, { plane: 'floor', x: 0, y: -1 })).toBe(false);
    });

    it('rejects coords beyond plane width / height', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      // Level 1 planes are 10x10; index 10 is out.
      expect(inBounds(state, { plane: 'floor', x: 10, y: 0 })).toBe(false);
      expect(inBounds(state, { plane: 'floor', x: 0, y: 10 })).toBe(false);
      expect(inBounds(state, { plane: 'north-wall', x: 10, y: 10 })).toBe(false);
    });

    it('accepts coords inside the loaded plane', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      expect(inBounds(state, { plane: 'floor', x: 0, y: 0 })).toBe(true);
      expect(inBounds(state, { plane: 'ceiling', x: 9, y: 9 })).toBe(true);
    });
  });

  describe('pairedPostAt', () => {
    it('returns the partner post when given a paired POST coord', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      // towel-rack on floor (8,2) is paired with wall-crack on wall (8,5).
      const partner = pairedPostAt(state, { plane: 'floor', x: 8, y: 2 });
      expect(partner).toBeDefined();
      expect(partner?.id).toBe('wall-crack');
      expect(partner?.location).toEqual({ plane: 'north-wall', x: 8, y: 5 });
    });

    it('returns undefined for a coord without a paired post', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      // storm-drain has no `pairedWith`.
      expect(pairedPostAt(state, { plane: 'floor', x: 0, y: 0 })).toBeUndefined();
      // Empty tile.
      expect(pairedPostAt(state, { plane: 'floor', x: 4, y: 4 })).toBeUndefined();
    });

    it('is symmetric: each end resolves to the other', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const fromFloor = pairedPostAt(state, { plane: 'floor', x: 8, y: 2 });
      const fromWall = pairedPostAt(state, { plane: 'north-wall', x: 8, y: 5 });
      expect(fromFloor?.id).toBe('wall-crack');
      expect(fromWall?.id).toBe('towel-rack');
    });
  });
});
