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
    it('returns the partner post for either end of a paired POST', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const paired = [...state.posts.values()].find((p) => p.pairedWith !== undefined);
      if (!paired) return; // some seeds produce no pair
      const partner = pairedPostAt(state, paired.location);
      expect(partner).toBeDefined();
      expect(partner?.id).toBe(paired.pairedWith);
    });

    it('returns undefined for a coord without a paired post', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      // storm-drain has no `pairedWith`.
      expect(pairedPostAt(state, { plane: 'floor', x: 0, y: 0 })).toBeUndefined();
    });

    it('is symmetric: each end resolves to the other', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const paired = [...state.posts.values()].find((p) => p.pairedWith !== undefined);
      if (!paired) return;
      const partner = state.posts.get(paired.pairedWith!)!;
      const fromA = pairedPostAt(state, paired.location);
      const fromB = pairedPostAt(state, partner.location);
      expect(fromA?.id).toBe(partner.id);
      expect(fromB?.id).toBe(paired.id);
    });
  });
});
