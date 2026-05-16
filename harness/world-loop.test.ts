import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadWorldStateFile, saveFilePath } from '../engine/world-save.ts';

import { runWorldLoop } from './world-loop.ts';
import type { Args } from './world-loop.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

let tmpRoot = '';

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'world-loop-test-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// Seed 4: S0 (L1, capture-the-web) is deterministically an ant win;
// S1 is now a REAL L2 (the Pipe, escort Aunt Ant). The baseline
// player AI has no escort logic yet (a documented follow-up), so the
// escort times out and S1 resolves as a spider win — still a stable
// terminal state, and XP still accrues (losers bank ≥35/scenario), so
// the XP -> level assertion holds.
const mkArgs = (over: Partial<Args> = {}): Args => ({
  campaignId: 'it-campaign',
  seed: 4,
  resume: false,
  outRoot: tmpRoot,
  dataDir: DATA_DIR,
  ...over,
});

describe('harness/world-loop integration', () => {
  it('runs two scenarios with a persistent roster, applying XP', () => {
    const summary = runWorldLoop(mkArgs());

    // Two scenarios actually ran.
    expect(summary.scenario0.turnsPlayed).toBeGreaterThan(0);
    expect(summary.scenario1.turnsPlayed).toBeGreaterThan(0);
    expect(summary.scenario0.winner).not.toBeNull();
    expect(summary.scenario1.winner).not.toBeNull();

    // Roster carried across the boundary (non-empty both sides).
    expect(summary.rosterBefore).toBeGreaterThan(0);
    expect(summary.rosterAfter).toBeGreaterThan(0);

    // XP was applied and accumulated (every surviving ant earns ≥35
    // per scenario, so total XP strictly grows across the second
    // scenario's extraction).
    expect(summary.xpAfter).toBeGreaterThan(summary.xpBefore);

    // Gold carried forward as a number (≥ 0).
    expect(summary.goldBefore).toBeGreaterThanOrEqual(0);
    expect(summary.goldAfter).toBeGreaterThanOrEqual(0);
  });

  it('writes reloadable auto-save files at both scenario boundaries', () => {
    const summary = runWorldLoop(mkArgs());

    const s0 = saveFilePath(tmpRoot, 'it-campaign', 0);
    const s1 = saveFilePath(tmpRoot, 'it-campaign', 1);
    expect(fs.existsSync(s0)).toBe(true);
    expect(fs.existsSync(s1)).toBe(true);

    // Reload reproduces the in-memory post-scenario states exactly.
    expect(loadWorldStateFile(s0)).toEqual(summary.postS0);
    expect(loadWorldStateFile(s1)).toEqual(summary.postS1);
  });

  it('carries the same unit ids forward from scenario 0 into scenario 1', () => {
    const summary = runWorldLoop(mkArgs());
    const idsS0 = new Set(summary.postS0.roster.units.map((u) => u.id));
    // Every post-S1 ant unit is one of: (a) carried forward from S0
    // (stable id), (b) a shop recruit, or (c) a member of the L2-
    // scenario-provided escort party (Aunt Ant + her L2 guards, which
    // loadScenario mints with fresh ids — they are NOT in the carried
    // L1 roster by design; that is exactly the L2-4 composition).
    const escortTemplates = new Set(['aunt-ant', 'ant-footman', 'ant-archer']);
    let carried = 0;
    let auntAntSeen = false;
    for (const u of summary.postS1.roster.units) {
      if (String(u.id).startsWith('merc-')) continue;
      if (u.templateId === 'aunt-ant') auntAntSeen = true;
      if (idsS0.has(u.id)) {
        carried += 1;
        continue;
      }
      // A non-carried, non-merc unit must be an escort-party template
      // (the only scenario-provided ant party in L2).
      expect(escortTemplates.has(u.templateId)).toBe(true);
    }
    // The carried roster genuinely flowed into L2 (queen-guard + the
    // veteran field parties), and the scenario-provided Aunt Ant is
    // present — proving the campaign roster + L2 escortee compose.
    expect(carried).toBeGreaterThan(0);
    expect(auntAntSeen).toBe(true);
  });

  it('is deterministic: two fresh runs with the same seed match', () => {
    const a = runWorldLoop(mkArgs({ campaignId: 'det-a' }));
    const b = runWorldLoop(mkArgs({ campaignId: 'det-b' }));
    expect(b.scenario0).toEqual(a.scenario0);
    expect(b.scenario1).toEqual(a.scenario1);
    expect(b.xpBefore).toBe(a.xpBefore);
    expect(b.xpAfter).toBe(a.xpAfter);
    expect(b.rosterAfter).toBe(a.rosterAfter);
    expect(b.goldAfter).toBe(a.goldAfter);
  });

  it('resumes from the latest save instead of recomputing it', () => {
    // First run writes saves for scenario 0 and 1.
    const first = runWorldLoop(mkArgs({ campaignId: 'res' }));
    // Resume: the runner loads the latest save (post-S1) as its
    // starting world state rather than rebuilding it.
    const resumed = runWorldLoop(mkArgs({ campaignId: 'res', resume: true }));
    expect(resumed.resumed).toBe(true);
    // The resumed pre-shop state equals the previous run's latest save.
    expect(resumed.postS0).toEqual(first.postS1);
  });

  it('applies XP -> levels by the second boundary', () => {
    // Two scenarios of XP (≥70 winning / ≥35 losing per scenario) push
    // survivors over the L2 threshold (100). Either some unit leveled
    // this boundary, or the post-S1 roster contains a level ≥ 2 unit.
    const summary = runWorldLoop(mkArgs());
    const anyLeveled =
      summary.unitsLeveledThisBoundary > 0 || summary.postS1.roster.units.some((u) => u.level >= 2);
    expect(anyLeveled).toBe(true);
  });
});
