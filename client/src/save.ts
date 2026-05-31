/**
 * Chunk B5 — client-side persistence (localStorage).
 *
 * Phase B exit criterion: "page refresh between L1 win and L2 briefing
 * preserves the carried roster and scenarioIndex." We persist the
 * `WorldState` to `localStorage` keyed by `campaignId`, using the engine's
 * own `serializeWorldState` / `deserializeWorldState` round-trip so the
 * format matches the harness's file-backed save (`engine/world-save.ts`)
 * byte-for-byte.
 *
 * The engine module wraps the serializer in `node:fs`; we wrap it in
 * `localStorage`. Pure-data is identical, only the I/O medium differs.
 *
 * `SaveStorage` is the lightweight injectable interface used by tests so
 * the module stays vitest-friendly without dragging in jsdom.
 */
import {
  deserializeWorldState,
  serializeWorldState,
  type WorldState,
} from '../../engine/world-state.ts';

const SAVE_KEY_PREFIX = 'boa-foodfight:save:';

const saveKey = (campaignId: string): string => `${SAVE_KEY_PREFIX}${campaignId}`;

/** A minimal Storage-like contract — matches the web `Storage` API on the
 * methods we actually call, so a real `localStorage` slots in unchanged
 * and tests can pass a Map-backed mock. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Resolve the browser's `localStorage` if available; `null` otherwise
 * (private mode, SSR, restricted iframe). Wrapped in try/catch because
 * some browsers throw on the `localStorage` access itself rather than
 * the operation. */
const browserStorage = (): SaveStorage | null => {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const ls = (globalThis as { readonly localStorage?: SaveStorage }).localStorage;
      return ls ?? null;
    }
  } catch {
    /* ignore — fall through to null */
  }
  return null;
};

/** Persist `ws` under its `campaignId` key. Silently no-ops if storage
 * is unavailable or the write fails (quota / disabled) — the run
 * continues, just unpersisted. */
export const saveToStorage = (
  ws: WorldState,
  store: SaveStorage | null = browserStorage(),
): void => {
  if (!store) return;
  try {
    store.setItem(saveKey(ws.campaignId), serializeWorldState(ws));
  } catch {
    /* ignore — quota / disabled / serializer mismatch */
  }
};

/** Load + deserialize the save for `campaignId`, or `undefined` if no
 * save exists, the blob is malformed, or storage is unavailable. The
 * engine's deserializer is a zod schema — malformed blobs throw, which
 * we swallow so a bad save degrades to "fresh start" rather than
 * crashing the app. */
export const loadFromStorage = (
  campaignId: string,
  store: SaveStorage | null = browserStorage(),
): WorldState | undefined => {
  if (!store) return undefined;
  try {
    const raw = store.getItem(saveKey(campaignId));
    if (raw === null) return undefined;
    return deserializeWorldState(raw);
  } catch {
    return undefined;
  }
};

/** Drop the save for `campaignId`. Used by New Game / Defeat reset paths
 * so a fresh start really is fresh (otherwise the next boot's
 * loadFromStorage would resurrect stale state). */
export const clearStorage = (
  campaignId: string,
  store: SaveStorage | null = browserStorage(),
): void => {
  if (!store) return;
  try {
    store.removeItem(saveKey(campaignId));
  } catch {
    /* ignore */
  }
};

/** True iff a save exists for `campaignId`. Used at boot to enable the
 * Start screen's Continue menu item without forcing a full load. */
export const hasSavedState = (
  campaignId: string,
  store: SaveStorage | null = browserStorage(),
): boolean => {
  if (!store) return false;
  try {
    return store.getItem(saveKey(campaignId)) !== null;
  } catch {
    return false;
  }
};
