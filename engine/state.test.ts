import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { coordKey } from './coord.ts';
import { loadScenario } from './state.ts';
import type { PostId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

describe('loadScenario(level-1)', () => {
  it('builds a complete initial GameState from data files', () => {
    const { state } = loadScenario(DATA_DIR, 12345);
    expect(state.turn).toBe(0);
    expect(state.seed).toBe(12345);
    expect(state.winner).toBeNull();
    expect(state.queenUltimateCharge).toBe(0);
  });

  it('loads fixed start + finish + 3-5 random mid-POSTs with correct ownership', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // 2 fixed (storm-drain, spider-web) + 3-5 mid-POSTs (per map-gen).
    expect(state.posts.size).toBeGreaterThanOrEqual(5);
    expect(state.posts.size).toBeLessThanOrEqual(7);
    const stormDrain = state.posts.get('storm-drain' as PostId);
    const spiderWeb = state.posts.get('spider-web' as PostId);
    expect(stormDrain?.owner).toBe('ant');
    expect(stormDrain?.location).toEqual({ plane: 'floor', x: 0, y: 0 });
    expect(spiderWeb?.owner).toBe('spider');
    expect(spiderWeb?.location).toEqual({ plane: 'ceiling', x: 9, y: 9 });
    // Every mid-POST should be neutral.
    for (const post of state.posts.values()) {
      if (post.id === ('storm-drain' as PostId) || post.id === ('spider-web' as PostId)) continue;
      expect(post.owner).toBe('neutral');
    }
  });

  it('builds tile maps for all six planes', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // 6 planes * 10*10 = 600 tiles.
    expect(state.tiles.size).toBe(600);
    expect(state.tiles.has(coordKey({ plane: 'floor', x: 0, y: 0 }))).toBe(true);
    expect(state.tiles.has(coordKey({ plane: 'north-wall', x: 5, y: 5 }))).toBe(true);
    expect(state.tiles.has(coordKey({ plane: 'south-wall', x: 0, y: 0 }))).toBe(true);
    expect(state.tiles.has(coordKey({ plane: 'east-wall', x: 0, y: 0 }))).toBe(true);
    expect(state.tiles.has(coordKey({ plane: 'west-wall', x: 0, y: 0 }))).toBe(true);
    expect(state.tiles.has(coordKey({ plane: 'ceiling', x: 9, y: 9 }))).toBe(true);
  });

  it('builds parties from both faction rosters with stable unit ids', () => {
    const { state: s1 } = loadScenario(DATA_DIR, 1);
    const { state: s2 } = loadScenario(DATA_DIR, 1);
    expect(s1.parties.size).toBeGreaterThan(0);
    expect(s1.parties.size).toBe(s2.parties.size);
    for (const [id, p1] of s1.parties) {
      const p2 = s2.parties.get(id);
      expect(p2).toBeDefined();
      expect(p1.units.map((u) => u.id)).toEqual(p2?.units.map((u) => u.id));
    }
  });

  it('queen-bearing party has exactly 12 slots used', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const queenParty = [...state.parties.values()].find((p) =>
      p.units.some((u) => {
        const tmpl = state.unitTemplates.get(u.templateId);
        return tmpl?.tags.includes('queen') && tmpl.faction === 'ant';
      }),
    );
    expect(queenParty).toBeDefined();
    let used = 0;
    for (const u of queenParty?.units ?? []) {
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl) used += tmpl.slotCost;
    }
    expect(used).toBe(12);
    expect(data.units.templates.length).toBeGreaterThan(0);
  });

  it('every unit in every party starts at full HP', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    for (const party of state.parties.values()) {
      for (const u of party.units) {
        const tmpl = state.unitTemplates.get(u.templateId);
        expect(u.currentHp).toBe(tmpl?.baseStats.hp);
      }
    }
  });

  it('every party leader id is a real unit in that party', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    for (const party of state.parties.values()) {
      const leader = party.units.find((u) => u.id === party.leaderId);
      expect(leader, `party ${party.id} has dangling leaderId ${party.leaderId}`).toBeDefined();
    }
  });
});
