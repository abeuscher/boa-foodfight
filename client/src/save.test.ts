import { describe, expect, it } from 'vitest';

import { INITIAL_STATE } from './fixture.ts';
import {
  clearStorage,
  hasSavedState,
  loadFromStorage,
  saveToStorage,
  type SaveStorage,
} from './save.ts';

/** Map-backed mock matching the SaveStorage contract; lets the test
 * exercise the localStorage path without jsdom. */
const mockStorage = (): SaveStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
};

describe('client-side save (Chunk B5)', () => {
  it('round-trips a WorldState through storage', () => {
    const store = mockStorage();
    saveToStorage(INITIAL_STATE, store);
    const loaded = loadFromStorage(INITIAL_STATE.campaignId, store);
    expect(loaded).toBeDefined();
    expect(loaded?.campaignId).toBe(INITIAL_STATE.campaignId);
    expect(loaded?.scenarioIndex).toBe(INITIAL_STATE.scenarioIndex);
    expect(loaded?.gold).toBe(INITIAL_STATE.gold);
    expect(loaded?.roster.units.length).toBe(INITIAL_STATE.roster.units.length);
  });

  it('returns undefined when no save exists', () => {
    const store = mockStorage();
    expect(loadFromStorage(INITIAL_STATE.campaignId, store)).toBeUndefined();
    expect(hasSavedState(INITIAL_STATE.campaignId, store)).toBe(false);
  });

  it('hasSavedState flips true after save and back to false after clear', () => {
    const store = mockStorage();
    expect(hasSavedState(INITIAL_STATE.campaignId, store)).toBe(false);
    saveToStorage(INITIAL_STATE, store);
    expect(hasSavedState(INITIAL_STATE.campaignId, store)).toBe(true);
    clearStorage(INITIAL_STATE.campaignId, store);
    expect(hasSavedState(INITIAL_STATE.campaignId, store)).toBe(false);
  });

  it('survives a malformed blob without throwing', () => {
    const store = mockStorage();
    // Hand-write garbage at the save key — engine deserializer will
    // throw zod, our wrapper must swallow and return undefined.
    store.setItem(`boa-foodfight:save:${INITIAL_STATE.campaignId}`, '{ not valid json');
    expect(loadFromStorage(INITIAL_STATE.campaignId, store)).toBeUndefined();
  });

  it('survives a schema-mismatch blob without throwing', () => {
    const store = mockStorage();
    store.setItem(
      `boa-foodfight:save:${INITIAL_STATE.campaignId}`,
      JSON.stringify({ unrelated: 'shape' }),
    );
    expect(loadFromStorage(INITIAL_STATE.campaignId, store)).toBeUndefined();
  });

  it('no-ops when no storage is available', () => {
    // null store path — saveToStorage / clearStorage are silent, load returns undefined.
    expect(() => {
      saveToStorage(INITIAL_STATE, null);
    }).not.toThrow();
    expect(loadFromStorage(INITIAL_STATE.campaignId, null)).toBeUndefined();
    expect(hasSavedState(INITIAL_STATE.campaignId, null)).toBe(false);
    expect(() => {
      clearStorage(INITIAL_STATE.campaignId, null);
    }).not.toThrow();
  });

  it('preserves scenarioIndex across the round trip (the Phase B exit criterion)', () => {
    const store = mockStorage();
    const post = { ...INITIAL_STATE, scenarioIndex: 1 };
    saveToStorage(post, store);
    const loaded = loadFromStorage(INITIAL_STATE.campaignId, store);
    expect(loaded?.scenarioIndex).toBe(1);
  });
});
