/**
 * Phase B (B6) — auto-save / scenario-boundary persistence.
 *
 * The only module in the Phase-B set that performs disk I/O. Serializes
 * a `WorldState` to `out/world-loop/<campaignId>/save-scenario-<N>.json`
 * at each scenario boundary, and reloads it for the resume path. The
 * spec's "Save system" section calls for "auto-save on scenario
 * boundaries"; this is that hook.
 *
 * Determinism: `serializeWorldState` is byte-stable, so saving the same
 * `WorldState` twice produces identical bytes (the resume-determinism
 * test relies on this). The only non-deterministic field is `savedAt`
 * (a wall-clock timestamp); it is informational and never feeds back
 * into world ops.
 *
 * Imports allowed: `node:fs`, `node:path`, `engine/world-state`.
 */

import fs from 'node:fs';
import path from 'node:path';

import { deserializeWorldState, serializeWorldState } from './world-state.ts';
import type { WorldState } from './world-state.ts';

/** Default root for world-loop saves (relative to cwd). */
export const DEFAULT_SAVE_ROOT = path.join('out', 'world-loop');

/** The directory holding all saves for one campaign. */
export const campaignDir = (root: string, campaignId: string): string =>
  path.join(root, campaignId);

/** Absolute-ish path of the save file for a given scenario boundary. */
export const saveFilePath = (root: string, campaignId: string, scenarioIndex: number): string =>
  path.join(campaignDir(root, campaignId), `save-scenario-${String(scenarioIndex)}.json`);

/**
 * Write `ws` to its scenario-boundary save file (creating the campaign
 * directory if needed). Returns the path written. The file name is keyed
 * by `ws.scenarioIndex` so each boundary gets its own snapshot (no
 * single-slot overwrite — a resume can pick any boundary).
 */
export const saveWorldState = (ws: WorldState, root: string = DEFAULT_SAVE_ROOT): string => {
  const dir = campaignDir(root, ws.campaignId);
  fs.mkdirSync(dir, { recursive: true });
  const file = saveFilePath(root, ws.campaignId, ws.scenarioIndex);
  fs.writeFileSync(file, `${serializeWorldState(ws)}\n`, 'utf8');
  return file;
};

/**
 * Load + validate a world state from a specific save file. Throws if
 * the file is missing or malformed (the schema is the trust boundary).
 */
export const loadWorldStateFile = (file: string): WorldState =>
  deserializeWorldState(fs.readFileSync(file, 'utf8'));

/**
 * Find the latest (highest scenarioIndex) save for a campaign, or
 * `undefined` if the campaign has no saves yet. Used by the resume
 * path: `--resume` loads this and continues from `scenarioIndex`.
 */
export const findLatestSave = (
  campaignId: string,
  root: string = DEFAULT_SAVE_ROOT,
): { file: string; scenarioIndex: number } | undefined => {
  const dir = campaignDir(root, campaignId);
  if (!fs.existsSync(dir)) return undefined;
  let best: { file: string; scenarioIndex: number } | undefined;
  for (const name of fs.readdirSync(dir)) {
    const m = /^save-scenario-(\d+)\.json$/.exec(name);
    if (m?.[1] === undefined) continue;
    const idx = Number(m[1]);
    if (!Number.isInteger(idx)) continue;
    if (best === undefined || idx > best.scenarioIndex) {
      best = { file: path.join(dir, name), scenarioIndex: idx };
    }
  }
  return best;
};

/**
 * Resume convenience: return the latest saved `WorldState` for a
 * campaign, or `undefined` if there is none.
 */
export const loadLatestWorldState = (
  campaignId: string,
  root: string = DEFAULT_SAVE_ROOT,
): WorldState | undefined => {
  const latest = findLatestSave(campaignId, root);
  if (!latest) return undefined;
  return loadWorldStateFile(latest.file);
};
