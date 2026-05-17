/**
 * L3 — Level 3 ("The Kitchen", `data/level-3`) data-set + AI tests.
 *
 * Verifies the Kitchen loads and schema-validates: a static 4-plane
 * manifold (floor + ceiling + north-wall + east-wall — NOT the L1 six,
 * NOT the L2 two), the central 3×3 island obstacle survives the load,
 * the six spec POSTs sit at their authored coordinates with the
 * authored ownership, and the `capture-post → counter-edge` victory
 * condition is declared. Then exercises the L3 AIs: both produce
 * orders, a full scenario reaches a terminal state inside the turn
 * cap, the same seed replays identically, and the spider holds the
 * objective often enough that the measured ant win-band stays sane
 * over a small seed set (the full 1..100 calibration to the
 * arbitration's [67, 69] band lives in the harness, not the unit
 * suite — this is a loose guard-rail, not the gate).
 *
 * Modeled on `engine/level2.test.ts`; does NOT touch `data/level-1`
 * or `data/level-1-tutorial` (those paths stay byte-identical, asserted
 * by their own suites and the coevo gate).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineL3Player } from '../ai/baseline-l3.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL3 } from '../ai/spider-l3.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PostId } from './types.ts';

const L3_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-3');

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const runOnce = (seed: number): GameState => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L3_DIR, seed);
  return runScenario(state, data, createRng(seed), tickClock(), {
    maxTurns: 100,
    policies: [baselineL3Player, spiderL3, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  }).finalState;
};

describe('Level 3 (The Kitchen) — data set', () => {
  it('loads and schema-validates as a static 4-plane map', () => {
    const data = loadScenarioData(L3_DIR);
    expect(data.map.name).toBe('The Kitchen');
    expect(data.map.static).toBe(true);
    // floor + ceiling + the two wall identity planes the Kitchen uses
    // (north-wall + east-wall). Not the L1 six, not the L2 two.
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual([
      'ceiling',
      'east-wall',
      'floor',
      'north-wall',
    ]);
  });

  it('declares the capture-post → counter-edge victory condition', () => {
    const data = loadScenarioData(L3_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'capture-post',
      postId: 'counter-edge',
    });
  });

  it('has the six spec POSTs at their canonical coordinates and ownership', () => {
    const { state } = loadScenario(L3_DIR, 1);
    const at = (id: string): string => {
      const p = state.posts.get(id as PostId);
      if (!p) return 'MISSING';
      return `${p.location.plane}(${String(p.location.x)},${String(p.location.y)})`;
    };
    expect(at('sink-drain')).toBe('floor(0,9)');
    expect(at('pantry')).toBe('floor(2,8)');
    expect(at('crumb-pile')).toBe('floor(7,1)');
    expect(at('stove-hood')).toBe('floor(8,7)');
    expect(at('backsplash')).toBe('east-wall(8,4)');
    expect(at('counter-edge')).toBe('floor(9,0)');
    // The plane-transition pair around the island is bidirectional.
    expect(state.posts.get('stove-hood' as PostId)?.pairedWith).toBe('backsplash');
    expect(state.posts.get('backsplash' as PostId)?.pairedWith).toBe('stove-hood');
    // Authored ownership: ant home, spider objective, rest neutral.
    expect(state.posts.get('sink-drain' as PostId)?.owner).toBe('ant');
    expect(state.posts.get('counter-edge' as PostId)?.owner).toBe('spider');
    for (const id of ['pantry', 'crumb-pile', 'stove-hood', 'backsplash'] as const) {
      expect(state.posts.get(id as PostId)?.owner).toBe('neutral');
    }
    // Exactly six POSTs — no extras.
    expect(state.posts.size).toBe(6);
  });

  it('keeps the central 3×3 island obstacle (static map, seed-invariant)', () => {
    const a = loadScenario(L3_DIR, 1);
    const b = loadScenario(L3_DIR, 999);
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    // The hand-authored island: x∈{4,5,6}, y∈{4,5,6} on the floor → 9
    // obstacle tiles. Seed-invariant (the `static` flag suppressed the
    // per-seed random-map pass).
    expect(obstacles(a.state)).toBe(9);
    expect(obstacles(a.state)).toBe(obstacles(b.state));
    for (let y = 4; y <= 6; y++) {
      for (let x = 4; x <= 6; x++) {
        expect(a.state.tiles.get(`floor:${String(x)},${String(y)}`)?.terrain.kind).toBe('obstacle');
      }
    }
    // POST coordinates identical across seeds (no per-seed jitter).
    for (const id of ['counter-edge', 'sink-drain', 'backsplash'] as const) {
      expect(a.state.posts.get(id as PostId)?.location).toEqual(
        b.state.posts.get(id as PostId)?.location,
      );
    }
  });

  it('counter-edge keeps its ruled defensive/heal profile', () => {
    // The Counter-Edge POST stat is the Level-owned tuning surface
    // referenced by the arbitration; assert the shipped values so a
    // silent regression of the objective's defensibility is loud.
    const { state } = loadScenario(L3_DIR, 1);
    const ce = state.posts.get('counter-edge' as PostId);
    expect(ce?.defensiveBonus).toBe(3);
    expect(ce?.healingRate).toBe(2);
  });
});

describe('Level 3 (The Kitchen) — AIs', () => {
  it('both L3 AIs produce orders during a run', () => {
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L3_DIR, 1);
    const out = runScenario(state, data, createRng(1), tickClock(), {
      maxTurns: 100,
      policies: [baselineL3Player, spiderL3, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    // The ant chain march and the spider picket/rover sorties both
    // emit move orders.
    const moves = out.events.filter((e) => e.kind === 'party-moved').length;
    expect(moves).toBeGreaterThan(0);
    // The ant policy walks the neutral chain, so mid-chain POSTs flip
    // to ant before the counter-edge assault.
    const captures = out.events.filter((e) => e.kind === 'post-captured').length;
    expect(captures).toBeGreaterThan(0);
  });

  it('a full scenario reaches a terminal state within the cap', () => {
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L3_DIR, 1);
    const out = runScenario(state, data, createRng(1), tickClock(), {
      maxTurns: 100,
      policies: [baselineL3Player, spiderL3, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    expect(out.turnsPlayed).toBeGreaterThan(0);
    expect(out.turnsPlayed).toBeLessThanOrEqual(100);
    expect(out.finalState.winner === 'ant' || out.finalState.winner === 'spider').toBe(true);
    const end = [...out.events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
  });

  it('is deterministic: the same seed replays identically', () => {
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
    for (const seed of [3, 42]) {
      const a = runOnce(seed);
      const b = runOnce(seed);
      expect(b.winner).toBe(a.winner);
      expect(b.turn).toBe(a.turn);
      expect(census(b)).toBe(census(a));
    }
  });

  it('the spider contests counter-edge — ant win-band stays sane (loose guard-rail)', () => {
    // A small deterministic seed set. This is NOT the calibration gate
    // (the [67, 69] band is measured over seeds 1..100 in the harness);
    // it only guards against a gross regression of the spider defense
    // (e.g. a no-op AI handing the ant 100% or an over-strong one
    // shutting the ant out). The spider must win at least one of these
    // and the ant must win at least one — both factions are live.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let antWins = 0;
    for (const seed of seeds) {
      if (runOnce(seed).winner === 'ant') antWins += 1;
    }
    expect(antWins).toBeGreaterThan(0);
    expect(antWins).toBeLessThan(seeds.length);
  });
});
