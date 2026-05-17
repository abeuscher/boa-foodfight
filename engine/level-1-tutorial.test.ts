/**
 * Phase D-0 — stripped tutorial Level 1 (`data/level-1-tutorial`,
 * roadmap §3.2) data-set + AI tests.
 *
 * Verifies the additive stripped kit: loads + schema-validates; exactly
 * two ant unit types (queen + footman) and two spider types (queen +
 * soldier); the three stripped abilities only (queen-ultimate, brace,
 * scout-ping — the footman info ability); five FIXED canonical POSTs at
 * their spec coordinates; a `static` map (seed-invariant); a
 * capture-post → spider-web victory condition. Then exercises the
 * stripped AIs: both produce orders, a full scenario reaches a terminal
 * state inside the turn cap, and the same seed replays identically.
 *
 * This file does NOT touch `data/level-1` (the fully-loaded gate-29
 * reference) — that path stays byte-identical, asserted by the
 * untouched `engine/level2.test.ts`-style suites and the coevo gate.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineTutorialPlayer } from '../ai/baseline-tutorial.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderTutorial } from '../ai/spider-tutorial.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PostId } from './types.ts';

const TUT_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1-tutorial');

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

describe('Level 1 (stripped tutorial) — data set', () => {
  it('loads and schema-validates as a static map', () => {
    const data = loadScenarioData(TUT_DIR);
    expect(data.map.name).toBe('The Bathroom (Tutorial)');
    expect(data.map.static).toBe(true);
    // Full 6-plane manifold (so edge/transition geometry is identical
    // to the fully-loaded L1 — the route is real, not a 2-plane stub).
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual([
      'ceiling',
      'east-wall',
      'floor',
      'north-wall',
      'south-wall',
      'west-wall',
    ]);
  });

  it('has exactly two ant and two spider unit types', () => {
    const data = loadScenarioData(TUT_DIR);
    const ant = data.units.templates
      .filter((t) => t.faction === 'ant')
      .map((t) => t.id)
      .sort();
    const spider = data.units.templates
      .filter((t) => t.faction === 'spider')
      .map((t) => t.id)
      .sort();
    expect(ant).toEqual(['ant-footman', 'ant-queen']);
    expect(spider).toEqual(['spider-queen', 'spider-soldier']);
  });

  it('strips abilities to queen-ultimate + brace + the footman info ability', () => {
    const data = loadScenarioData(TUT_DIR);
    expect(
      data.abilities.abilities
        .map((a) => a.id)
        .slice()
        .sort(),
    ).toEqual(['brace', 'queen-ultimate', 'scout-ping']);
    // The single info ability is on the footman (the 2-type kit has no
    // scout unit, so the footman carries scout-ping — the documented
    // choice in roadmap §3.2). No jelly/recruit/hypnotize/venom/etc.
    const footman = data.units.templates.find((t) => t.id === 'ant-footman');
    expect(footman?.abilities.sort()).toEqual(['brace', 'scout-ping']);
    const queen = data.units.templates.find((t) => t.id === 'ant-queen');
    expect(queen?.abilities).toEqual(['queen-ultimate']);
  });

  it('has the five spec-fixed POSTs at their canonical coordinates', () => {
    const { state } = loadScenario(TUT_DIR, 1);
    const at = (id: string): string => {
      const p = state.posts.get(id as PostId);
      if (!p) return 'MISSING';
      return `${p.location.plane}(${String(p.location.x)},${String(p.location.y)})`;
    };
    expect(at('storm-drain')).toBe('floor(0,0)');
    expect(at('soap-dish')).toBe('floor(5,5)');
    expect(at('towel-rack')).toBe('floor(8,2)');
    expect(at('wall-crack')).toBe('north-wall(8,5)');
    expect(at('spider-web')).toBe('ceiling(9,9)');
    // The plane-transition pair is bidirectional.
    expect(state.posts.get('towel-rack' as PostId)?.pairedWith).toBe('wall-crack');
    expect(state.posts.get('wall-crack' as PostId)?.pairedWith).toBe('towel-rack');
    // Exactly five POSTs — no extras.
    expect(state.posts.size).toBe(5);
  });

  it('declares the capture-post → spider-web victory condition', () => {
    const data = loadScenarioData(TUT_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'capture-post',
      postId: 'spider-web',
    });
  });

  it('is seed-invariant (static flag suppressed the random-map pass)', () => {
    const a = loadScenario(TUT_DIR, 1);
    const b = loadScenario(TUT_DIR, 999);
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacles(a.state)).toBe(obstacles(b.state));
    // POST coordinates are identical across seeds (no per-seed jitter).
    for (const id of ['storm-drain', 'spider-web', 'wall-crack'] as const) {
      expect(a.state.posts.get(id as PostId)?.location).toEqual(
        b.state.posts.get(id as PostId)?.location,
      );
    }
  });

  it('rosters use only the two unit types per side', () => {
    const { state } = loadScenario(TUT_DIR, 1);
    for (const p of state.parties.values()) {
      if (p.faction === 'neutral') continue;
      for (const u of p.units) {
        const tmpl = state.unitTemplates.get(u.templateId);
        if (p.faction === 'ant') {
          expect(['ant-queen', 'ant-footman']).toContain(tmpl?.id);
        } else {
          expect(['spider-queen', 'spider-soldier']).toContain(tmpl?.id);
        }
      }
    }
  });
});

describe('Level 1 (stripped tutorial) — AIs', () => {
  it('both stripped AIs produce orders during a run', () => {
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(TUT_DIR, 1);
    const out = runScenario(state, data, createRng(1), tickClock(), {
      maxTurns: 100,
      policies: [baselineTutorialPlayer, spiderTutorial, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    // Movement only happens if the policies issued move orders — the
    // ant chain march and the spider picket surge both emit them.
    const moves = out.events.filter((e) => e.kind === 'party-moved').length;
    expect(moves).toBeGreaterThan(0);
    // The ant policy walks the POST chain, so neutral-owned mid-POSTs
    // flip to ant before the assault.
    const captures = out.events.filter((e) => e.kind === 'post-captured').length;
    expect(captures).toBeGreaterThan(0);
  });

  it('a full stripped scenario reaches a terminal state within the cap', () => {
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(TUT_DIR, 1);
    const out = runScenario(state, data, createRng(1), tickClock(), {
      maxTurns: 100,
      policies: [baselineTutorialPlayer, spiderTutorial, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    // Round-19 score-resolution: a 100-turn run still resolves to a
    // faction (never a null winner). Terminal state, bounded turns.
    expect(out.turnsPlayed).toBeGreaterThan(0);
    expect(out.turnsPlayed).toBeLessThanOrEqual(100);
    expect(out.finalState.winner === 'ant' || out.finalState.winner === 'spider').toBe(true);
    const end = [...out.events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
  });

  it('the ant footmen reach the ceiling web (the staged route works)', () => {
    // The stripped kit has no ant-plane-switch; the only way ground
    // footmen reach the ceiling web is the towel-rack ↔ wall-crack
    // paired-POST step onto the north-wall, then the wall→ceiling edge.
    // Proven by at least one ant party ending on the ceiling.
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(TUT_DIR, 1);
    const out = runScenario(state, data, createRng(1), tickClock(), {
      maxTurns: 100,
      policies: [baselineTutorialPlayer, spiderTutorial, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    const antOnCeiling = [...out.finalState.parties.values()].some(
      (p) => p.faction === 'ant' && p.location.plane === 'ceiling',
    );
    expect(antOnCeiling).toBe(true);
  });

  it('is deterministic: the same seed replays identically', () => {
    const run = (): GameState => {
      const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(TUT_DIR, 7);
      return runScenario(state, data, createRng(7), tickClock(), {
        maxTurns: 100,
        policies: [baselineTutorialPlayer, spiderTutorial, neutralPlayer],
        neutralSpawnEvents,
        itemSpawnEvents,
      }).finalState;
    };
    const a = run();
    const b = run();
    expect(b.winner).toBe(a.winner);
    expect(b.turn).toBe(a.turn);
    // Strong determinism: identical surviving-unit census per party.
    const census = (s: GameState): string =>
      [...s.parties.entries()]
        .map(
          ([id, p]) =>
            `${String(id)}:${String(p.units.filter((u) => u.currentHp > 0).length)}@${
              p.location.plane
            }`,
        )
        .sort()
        .join('|');
    expect(census(b)).toBe(census(a));
  });
});

describe('Level 1 reference (data/level-1) is untouched by the tutorial kit', () => {
  it('the fully-loaded L1 still has its full unit roster', () => {
    const ref = loadScenarioData(path.resolve(import.meta.dirname, '..', 'data', 'level-1'));
    // The reference keeps ant-archer / ant-mage / spider-spinner etc.
    // (stripped only from the tutorial). A regression here would mean
    // the tutorial edit leaked into the locked reference.
    const ids = ref.units.templates.map((t) => t.id);
    expect(ids).toContain('ant-archer');
    expect(ids).toContain('ant-mage');
    expect(ids).toContain('spider-spinner');
    expect(ref.map.name).toBe('The Bathroom');
    expect(ref.map.static).toBeUndefined();
  });
});
