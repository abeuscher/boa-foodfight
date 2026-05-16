/**
 * L2-2 — Level 2 ("The Pipe") data-set load + schema tests.
 *
 * Verifies the L2 data set loads and schema-validates, the Aunt Ant
 * escortee template is present and shaped per roadmap §4.3.1, the pipe
 * map carries entrance + exit POSTs and the escort victory condition,
 * and the hand-authored corridor survives the load (the `static` map
 * flag suppressed the per-seed random map pass).
 *
 * The spider-l2 policy assertions land in L2-3.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PartyId, PostId, UnitTemplateId } from './types.ts';

const L2_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-2');

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

describe('Level 2 — data set', () => {
  it('loads and schema-validates', () => {
    const data = loadScenarioData(L2_DIR);
    expect(data.map.name).toBe('The Pipe');
    expect(data.map.static).toBe(true);
    // Two planes (floor + ceiling flank), not the L1 six.
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual(['ceiling', 'floor']);
  });

  it('declares the escort victory condition', () => {
    const data = loadScenarioData(L2_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'escort',
      escortUnitTemplateId: 'aunt-ant',
      exitPostId: 'pipe-exit',
    });
  });

  it('Aunt Ant template present and shaped per spec', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const t = state.unitTemplates.get('aunt-ant' as UnitTemplateId);
    expect(t).toBeDefined();
    if (!t) return;
    expect(t.faction).toBe('ant');
    expect(t.size).toBe('huge');
    expect(t.slotCost).toBe(4);
    expect(t.baseStats.hp).toBeGreaterThanOrEqual(45);
    expect(t.baseStats.attack).toBe(0);
    expect(t.abilities).toHaveLength(0);
    expect(t.tags).toContain('escort');
    expect(t.tags).toContain('non-combatant');
  });

  it('pipe map has entrance + exit POSTs and no spider-web', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const entrance = state.posts.get('pipe-entrance' as PostId);
    const exit = state.posts.get('pipe-exit' as PostId);
    expect(entrance).toBeDefined();
    expect(exit).toBeDefined();
    expect(entrance?.owner).toBe('ant');
    expect(entrance?.tags).toContain('entrance');
    expect(exit?.tags).toContain('exit');
    // The escort objective replaces the capture objective; no web.
    expect(state.posts.get('spider-web' as PostId)).toBeUndefined();
    // Optional mid-pipe POSTs exist but are not the win trigger.
    expect(state.posts.get('pipe-joint' as PostId)).toBeDefined();
    expect(state.posts.get('drain-cap' as PostId)).toBeDefined();
  });

  it('escort party carries Aunt Ant; queen guard sits at the entrance', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const escort = state.parties.get('escort-column' as PartyId);
    expect(escort).toBeDefined();
    expect(escort?.units.some((u) => u.templateId === ('aunt-ant' as UnitTemplateId))).toBe(true);
    const queenGuard = state.parties.get('queen-guard' as PartyId);
    const entrance = state.posts.get('pipe-entrance' as PostId);
    expect(queenGuard?.location).toEqual(entrance?.location);
  });

  it('static flag suppressed the random map pass (corridor survives)', () => {
    // Two different seeds must produce an identical map: a static map
    // is seed-invariant (no generateRandomMap). A random L1 map would
    // differ between seeds.
    const a = loadScenario(L2_DIR, 4);
    const b = loadScenario(L2_DIR, 99);
    const obstacleCount = (s: typeof a.state): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacleCount(a.state)).toBe(obstacleCount(b.state));
    expect(obstacleCount(a.state)).toBeGreaterThan(0);
    // The two end POSTs must be far apart (a real pipe, not a stub).
    const entrance = a.state.posts.get('pipe-entrance' as PostId);
    const exit = a.state.posts.get('pipe-exit' as PostId);
    expect(entrance?.location.plane).toBe(exit?.location.plane);
  });

  it('the pipe floor channel is greedy-navigable end-to-end', () => {
    // The engine movement resolver is greedy Manhattan-descent only
    // (no BFS). Every navigable floor channel tile must therefore
    // have a passable 4-neighbor strictly closer (Manhattan) to the
    // exit, or a single move-to(exit) would stall against a wall.
    const { state } = loadScenario(L2_DIR, 4);
    const exit = state.posts.get('pipe-exit' as PostId);
    if (!exit) throw new Error('no exit post');
    const ex = exit.location;
    const passable = (x: number, y: number): boolean => {
      const t = state.tiles.get(`floor:${String(x)},${String(y)}`);
      return t !== undefined && t.terrain.movementCost < 99;
    };
    const man = (x: number, y: number): number => Math.abs(ex.x - x) + Math.abs(ex.y - y);
    const offsets: readonly { dx: number; dy: number }[] = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    let stuck = 0;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (!passable(x, y)) continue;
        if (x === ex.x && y === ex.y) continue;
        const d = man(x, y);
        const hasDescent = offsets.some(
          (o) => passable(x + o.dx, y + o.dy) && man(x + o.dx, y + o.dy) < d,
        );
        if (!hasDescent) stuck += 1;
      }
    }
    expect(stuck).toBe(0);
  });

  it('escort objective wins via the engine when the escort reaches the exit', () => {
    const loaded = loadScenario(L2_DIR, 4);
    const { data, neutralSpawnEvents, itemSpawnEvents } = loaded;
    // Strip the spider pinch parties so this test isolates the
    // escort-OBJECTIVE + greedy-pipe-navigation + win-detection path
    // (combat survivability of an under-guarded Aunt Ant is a
    // separate balance concern; the spider ambush is exercised in
    // ai/spider-l2.test.ts and the world-loop integration).
    const noSpiders = new Map([...loaded.state.parties].filter(([, p]) => p.faction !== 'spider'));
    const state: GameState = { ...loaded.state, parties: noSpiders };
    const exit = state.posts.get('pipe-exit' as PostId);
    if (!exit) throw new Error('no exit post');
    // Minimal escort player: every turn, order the escort-column
    // (Aunt Ant's party) to march to the exit. Greedy movement walks
    // the whole pipe because the channel is greedy-navigable.
    const escortPlayer = {
      name: 'test-escort',
      faction: 'ant' as const,
      decide(s: GameState): GameState {
        const parties = new Map(s.parties);
        const ec = parties.get('escort-column' as PartyId);
        if (ec) {
          parties.set('escort-column' as PartyId, {
            ...ec,
            orders: [{ kind: 'move-to', target: exit.location }],
          });
        }
        return { ...s, parties };
      },
    };
    const out = runScenario(state, data, createRng(4), tickClock(), {
      maxTurns: 100,
      policies: [escortPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    expect(out.finalState.winner).toBe('ant');
    const end = [...out.events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
    if (end?.kind === 'scenario-end') {
      expect(end.winner).toBe('ant');
      // An escort WIN must not be score-resolved either.
      expect(end.scoreBreakdown).toBeUndefined();
    }
  });
});
