import { describe, expect, it } from 'vitest';

import { coordKey } from '../../../engine/coord.ts';
import type { ScenarioData } from '../../../engine/state.ts';

import scenarioData from '../fixtures/scenario-l1-data.json';

import { createInitialState } from './liveScenario.ts';
import { ANT_VISION_RADIUS, computeVisibleTiles, visibleNonAntPartyIds } from './visibility.ts';

const DATA = scenarioData as unknown as ScenarioData;
const SEED = 1;

describe('ant fog-of-war projection', () => {
  it('reveals each ant party tile and only within radius on its own plane', () => {
    const state = createInitialState(DATA, SEED);
    const visible = computeVisibleTiles(state);
    const antParties = [...state.parties.values()].filter(
      (p) => p.faction === 'ant' && p.units.some((u) => u.currentHp > 0),
    );
    expect(antParties.length).toBeGreaterThan(0);
    for (const p of antParties) {
      // Own tile is always visible.
      expect(visible.has(coordKey(p.location))).toBe(true);
      // A tile just outside the radius (same plane) is not revealed by
      // this party (it may still be revealed by another, so only assert
      // when no ant is near it).
      const farKey = coordKey({
        plane: p.location.plane,
        x: p.location.x + ANT_VISION_RADIUS + 1,
        y: p.location.y + ANT_VISION_RADIUS + 1,
      });
      const anyAntNear = antParties.some(
        (q) =>
          q.location.plane === p.location.plane &&
          Math.max(
            Math.abs(q.location.x - (p.location.x + ANT_VISION_RADIUS + 1)),
            Math.abs(q.location.y - (p.location.y + ANT_VISION_RADIUS + 1)),
          ) <= ANT_VISION_RADIUS,
      );
      if (!anyAntNear) expect(visible.has(farKey)).toBe(false);
    }
  });

  it('only reveals tiles that exist in the map', () => {
    const state = createInitialState(DATA, SEED);
    const visible = computeVisibleTiles(state);
    for (const key of visible) expect(state.tiles.has(key)).toBe(true);
  });

  it('larger radius reveals at least as many tiles', () => {
    const state = createInitialState(DATA, SEED);
    const small = computeVisibleTiles(state, 1);
    const big = computeVisibleTiles(state, 4);
    expect(big.size).toBeGreaterThanOrEqual(small.size);
    for (const k of small) expect(big.has(k)).toBe(true);
  });

  it('reports only non-ant parties standing on visible tiles', () => {
    const state = createInitialState(DATA, SEED);
    const visible = computeVisibleTiles(state);
    const ids = visibleNonAntPartyIds(state, visible);
    for (const id of ids) {
      const party = state.parties.get(id)!;
      expect(party.faction).not.toBe('ant');
      expect(visible.has(coordKey(party.location))).toBe(true);
    }
    // An empty visibility set sees no enemies.
    expect(visibleNonAntPartyIds(state, new Set()).size).toBe(0);
  });
});
