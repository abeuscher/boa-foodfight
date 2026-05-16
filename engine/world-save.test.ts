import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PartyId, UnitId, UnitTemplateId } from './types.ts';
import {
  findLatestSave,
  loadLatestWorldState,
  loadWorldStateFile,
  saveFilePath,
  saveWorldState,
} from './world-save.ts';
import { serializeWorldState } from './world-state.ts';
import type { WorldState } from './world-state.ts';

let tmpRoot = '';

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'world-save-test-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

const mkState = (scenarioIndex: number): WorldState => ({
  campaignId: 'camp-1',
  scenarioIndex,
  roster: {
    faction: 'ant',
    units: [
      {
        id: 'u1' as UnitId,
        templateId: 'ant-footman' as UnitTemplateId,
        currentHp: 6,
        level: 2,
        xp: 135,
        charisma: 55,
        promoted: false,
        item: null,
      },
    ],
    partyAssignments: [
      {
        partyId: 'vanguard-alpha' as PartyId,
        unitIds: ['u1' as UnitId],
        leaderId: 'u1' as UnitId,
      },
    ],
  },
  gold: 120,
  cardsOwned: [],
  rngSeed: 999,
  savedAt: '2026-05-16T12:00:00.000Z',
});

describe('engine/world-save', () => {
  it('save then load reproduces the WorldState exactly', () => {
    const ws = mkState(0);
    const file = saveWorldState(ws, tmpRoot);
    expect(fs.existsSync(file)).toBe(true);
    const loaded = loadWorldStateFile(file);
    expect(loaded).toEqual(ws);
    // Byte-identical serialization (resume determinism).
    expect(serializeWorldState(loaded)).toBe(serializeWorldState(ws));
  });

  it('keys the save file by scenario index (no single-slot overwrite)', () => {
    saveWorldState(mkState(0), tmpRoot);
    saveWorldState(mkState(1), tmpRoot);
    expect(fs.existsSync(saveFilePath(tmpRoot, 'camp-1', 0))).toBe(true);
    expect(fs.existsSync(saveFilePath(tmpRoot, 'camp-1', 1))).toBe(true);
  });

  it('findLatestSave returns the highest scenario index', () => {
    saveWorldState(mkState(0), tmpRoot);
    saveWorldState(mkState(2), tmpRoot);
    saveWorldState(mkState(1), tmpRoot);
    const latest = findLatestSave('camp-1', tmpRoot);
    expect(latest?.scenarioIndex).toBe(2);
  });

  it('loadLatestWorldState returns the most recent boundary', () => {
    saveWorldState(mkState(0), tmpRoot);
    saveWorldState(mkState(3), tmpRoot);
    const ws = loadLatestWorldState('camp-1', tmpRoot);
    expect(ws?.scenarioIndex).toBe(3);
  });

  it('returns undefined when a campaign has no saves', () => {
    expect(findLatestSave('nope', tmpRoot)).toBeUndefined();
    expect(loadLatestWorldState('nope', tmpRoot)).toBeUndefined();
  });

  it('rejects a corrupted save file on load', () => {
    const ws = mkState(0);
    const file = saveWorldState(ws, tmpRoot);
    fs.writeFileSync(file, '{ "campaignId": 5 }', 'utf8');
    expect(() => loadWorldStateFile(file)).toThrow();
  });
});
