/**
 * L5 — Level 5 ("The Bedroom", `data/level-5`) data-set + AI tests.
 *
 * Verifies the Bedroom loads and schema-validates: a static SIX-plane
 * manifold (the room reopens after L3/L4's reduced sets), the 6×5 bed
 * obstacle (cols 2–7 × rows 3–7) bisects the floor with both column-
 * end connectors (cols 0–1, 8–9) open, the six spec POSTs sit at their
 * authored coordinates/ownership, the Under-Bed POST carries the
 * `concealment` flag (the engine-dep-#7 scenario debut), the
 * Headboard↔Ceiling-Fan plane-transition pair is declared, and the
 * `capture-post → dresser-top` victory condition is set. Then asserts
 * the ruled L5 deltas as static guard-rails so a silent regression is
 * loud: the L3-banked plane-affinity ramp (spider combat `wall`
 * `+1/0 → +1/+1`, ants/queens byte-identical to L4) and the
 * hypnotize-light cap (`minControlTurns 2 / maxControlTurns 3`).
 * Finally exercises the L5 AIs: both produce orders, a full scenario
 * reaches a terminal state inside the cap, the same seed replays
 * identically, and both factions stay live over a small seed set (the
 * full 1..100 ~65% rebound calibration lives in the harness, not the
 * unit suite — this is the invariant guard-rail, not the gate).
 *
 * Modeled on `engine/level4.test.ts`; does NOT touch `data/level-1`,
 * `data/level-1-tutorial`, `data/level-3` or `data/level-4` (those
 * stay byte-identical, asserted by their own suites + the coevo gate).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineL5Player } from '../ai/baseline-l5.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL5 } from '../ai/spider-l5.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PostId, ReplayEvent } from './types.ts';

const L5_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-5');

const RULED_RAMP_TEMPLATES = [
  'spider-soldier',
  'spider-scout',
  'spider-spinner',
  'spider-elite',
  'spider-veteran-soldier',
  'spider-knight',
  'spider-weaver',
  'spider-stalker',
] as const;

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

interface L5Run {
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
}

const runOnce = (seed: number): L5Run => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L5_DIR, seed);
  const out = runScenario(state, data, createRng(seed), tickClock(), {
    maxTurns: 100,
    policies: [baselineL5Player, spiderL5, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return { finalState: out.finalState, events: out.events };
};

describe('Level 5 (The Bedroom) — data set', () => {
  it('loads and schema-validates as a static six-plane map', () => {
    const data = loadScenarioData(L5_DIR);
    expect(data.map.name).toBe('The Bedroom');
    expect(data.map.static).toBe(true);
    // The room reopens to all six planes after L3 (4) / L4 (3).
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual([
      'ceiling',
      'east-wall',
      'floor',
      'north-wall',
      'south-wall',
      'west-wall',
    ]);
  });

  it('declares the capture-post → dresser-top victory condition', () => {
    const data = loadScenarioData(L5_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'capture-post',
      postId: 'dresser-top',
    });
  });

  it('has the six spec POSTs at their canonical coordinates and ownership', () => {
    const { state } = loadScenario(L5_DIR, 1);
    const post = (id: string) => state.posts.get(id as PostId);
    expect(post('nightstand')?.location).toEqual({ plane: 'floor', x: 0, y: 1 });
    expect(post('under-bed')?.location).toEqual({ plane: 'floor', x: 4, y: 5 });
    expect(post('headboard')?.location).toEqual({ plane: 'floor', x: 1, y: 8 });
    expect(post('ceiling-fan')?.location).toEqual({ plane: 'ceiling', x: 5, y: 4 });
    expect(post('pillow-fort')?.location).toEqual({ plane: 'ceiling', x: 5, y: 1 });
    expect(post('dresser-top')?.location).toEqual({ plane: 'floor', x: 9, y: 9 });
    expect(post('nightstand')?.owner).toBe('ant');
    expect(post('under-bed')?.owner).toBe('ant');
    expect(post('dresser-top')?.owner).toBe('spider');
    for (const id of ['headboard', 'ceiling-fan', 'pillow-fort'] as const) {
      expect(post(id)?.owner).toBe('neutral');
    }
    expect(state.posts.size).toBe(6);
  });

  it('Under-Bed carries the concealment flag (engine-dep-#7 debut) and the transition pair is declared', () => {
    const data = loadScenarioData(L5_DIR);
    const underBed = data.map.posts.find((p) => p.id === 'under-bed');
    expect(underBed?.concealment).toBe(true);
    // No other POST is a concealment POST.
    expect(data.map.posts.filter((p) => p.concealment === true)).toHaveLength(1);
    const headboard = data.map.posts.find((p) => p.id === 'headboard');
    const fan = data.map.posts.find((p) => p.id === 'ceiling-fan');
    expect(headboard?.pairedWith).toBe('ceiling-fan');
    expect(fan?.pairedWith).toBe('headboard');
  });

  it('carries the ruled L5 plane-affinity ramp (spider combat wall +1/+1; ants/queen untouched)', () => {
    // The L3-arbitration-banked L5 step, finalized: only the
    // `wall.armor` sub-field rises 0→1 on the eight spider combat
    // templates; attack stays +1; ants, queens, floor/ceiling rows
    // byte-identical to L4. Asserted so a silent reopen-trigger is loud.
    const { state } = loadScenario(L5_DIR, 1);
    for (const id of RULED_RAMP_TEMPLATES) {
      const tmpl = state.unitTemplates.get(id as never);
      expect(tmpl?.planeAffinity.wall).toEqual({ attack: 1, armor: 1 });
    }
    // Ant combat unchanged; spider-queen untouched (queens excluded).
    expect(state.unitTemplates.get('ant-footman' as never)?.planeAffinity.wall).toEqual({
      attack: -1,
      armor: 0,
    });
    expect(state.unitTemplates.get('spider-queen' as never)?.planeAffinity.wall).toEqual({
      attack: 0,
      armor: 0,
    });
  });

  it('carries the ruled hypnotize-light cap (minControlTurns 2 / maxControlTurns 3)', () => {
    const data = loadScenarioData(L5_DIR);
    const hypnotize = data.abilities.abilities.find((a) => a.id === 'hypnotize');
    expect(hypnotize?.params.minControlTurns).toBe(2);
    expect(hypnotize?.params.maxControlTurns).toBe(3);
  });

  it('the 6×5 bed bisects the floor with both column-end connectors open; seed-invariant', () => {
    const a = loadScenario(L5_DIR, 1).state;
    const b = loadScenario(L5_DIR, 999).state;
    const kind = (s: GameState, x: number, y: number) =>
      s.tiles.get(`floor:${String(x)},${String(y)}`)?.terrain.kind;
    // Bed obstacle: cols 2–7 × rows 3–7, EXCEPT the single open
    // Under-Bed pocket at (4,5) — walled in by the bed on all four
    // orthogonal sides, so it is unreachable by floor walking and
    // reachable only via plane-transition (the concealment garrison).
    for (let x = 2; x <= 7; x++) {
      for (let y = 3; y <= 7; y++) {
        expect(kind(a, x, y)).toBe(x === 4 && y === 5 ? 'open' : 'obstacle');
      }
    }
    // The pocket is sealed: its four orthogonal floor neighbours are bed.
    expect(kind(a, 3, 5)).toBe('obstacle');
    expect(kind(a, 5, 5)).toBe('obstacle');
    expect(kind(a, 4, 4)).toBe('obstacle');
    expect(kind(a, 4, 6)).toBe('obstacle');
    // Both column-end connectors (cols 0–1, 8–9) open top-to-bottom —
    // the only floor links between the north and south strips.
    for (const x of [0, 1, 8, 9]) {
      for (let y = 0; y <= 9; y++) {
        expect(kind(a, x, y)).toBe('open');
      }
    }
    // `static` ⇒ no per-seed map pass; obstacle count is seed-invariant.
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacles(a)).toBe(obstacles(b));
  });
});

describe('Level 5 (The Bedroom) — AIs', () => {
  it('both L5 AIs produce orders during a run', () => {
    const { events } = runOnce(1);
    expect(events.filter((e) => e.kind === 'party-moved').length).toBeGreaterThan(0);
  });

  it('a full scenario reaches a terminal state within the cap', () => {
    const { finalState, events } = runOnce(1);
    expect(finalState.winner === 'ant' || finalState.winner === 'spider').toBe(true);
    expect([...events].reverse().find((e) => e.kind === 'scenario-end')?.kind).toBe('scenario-end');
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
      expect(b.finalState.winner).toBe(a.finalState.winner);
      expect(b.finalState.turn).toBe(a.finalState.turn);
      expect(census(b.finalState)).toBe(census(a.finalState));
    }
  });

  it('both factions stay live over a small seed set (loose guard-rail, not the gate)', () => {
    // NOT the calibration gate (the ~65% rebound is measured over
    // seeds 1..100 in the harness); only guards a gross regression of
    // either side over a deterministic set.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let antWins = 0;
    for (const seed of seeds) {
      if (runOnce(seed).finalState.winner === 'ant') antWins += 1;
    }
    expect(antWins).toBeGreaterThan(0);
    expect(antWins).toBeLessThan(seeds.length);
  });
});
