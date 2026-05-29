/**
 * L6 — Level 6 ("The Stairs", `data/level-6`) data-set + AI tests.
 *
 * Verifies the Stairs loads and schema-validates: a static TWO-plane
 * map (floor + ceiling — the minimal set expressing the §5-#4 single
 * terraced floor + open ceiling flyer lane; "5 stacked floor planes"
 * is NOT expressible, terraces realize the vertical-traversal intent),
 * the five-tread terraced floor (riser obstacles cols 2–7 on rows
 * 1,3,5,7; full-height open connector columns 0–1 and 8–9), the fully
 * open ceiling flyer lane, the five spec POSTs at their authored
 * coordinates/ownership, and the `eradicate` victory condition (no
 * POST reference — the L6 Stairs objective). Asserts the carried
 * `units.json` plane-affinity is byte-identical to L5 (NO L6
 * plane-affinity delta here — that ruled step is the Gameplay PA's,
 * applied by the orchestrator later) as a static guard-rail so a
 * silent regression is loud. Finally exercises the L6 AIs: both
 * produce orders, a full scenario reaches a terminal state inside the
 * cap, the same seed replays identically, and the run resolves
 * decisively (eradicate has NO score path — ant wins only by wiping
 * every spider party; spider wins on the turn cap).
 *
 * Modeled on `engine/level5.test.ts`; does NOT touch `data/level-1`,
 * `data/level-1-tutorial`, `data/level-2..5` (those stay
 * byte-identical, asserted by their own suites + the coevo gate).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineL6Player } from '../ai/baseline-l6.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL6 } from '../ai/spider-l6.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PostId, ReplayEvent } from './types.ts';

const L6_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-6');
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

interface L6Run {
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
}

const runOnce = (seed: number): L6Run => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L6_DIR, seed);
  const out = runScenario(state, data, createRng(seed), tickClock(), {
    maxTurns: 100,
    policies: [baselineL6Player, spiderL6, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return { finalState: out.finalState, events: out.events };
};

describe('Level 6 (The Stairs) — data set', () => {
  it('loads and schema-validates as a static two-plane map', () => {
    const data = loadScenarioData(L6_DIR);
    expect(data.map.name).toBe('The Stairs');
    expect(data.map.static).toBe(true);
    // The minimal plane set expressing the terraced floor + flyer lane.
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual(['ceiling', 'floor']);
  });

  it('declares the eradicate victory condition (no POST reference)', () => {
    const data = loadScenarioData(L6_DIR);
    expect(data.map.victoryCondition).toEqual({ kind: 'eradicate' });
  });

  it('has the five spec POSTs at their canonical coordinates and ownership', () => {
    const { state } = loadScenario(L6_DIR, 1);
    const post = (id: string) => state.posts.get(id as PostId);
    expect(post('stairwell-base')?.location).toEqual({ plane: 'floor', x: 1, y: 9 });
    expect(post('lower-landing')?.location).toEqual({ plane: 'floor', x: 8, y: 6 });
    expect(post('mid-landing')?.location).toEqual({ plane: 'floor', x: 1, y: 4 });
    expect(post('upper-landing')?.location).toEqual({ plane: 'floor', x: 8, y: 2 });
    expect(post('top-rail')?.location).toEqual({ plane: 'ceiling', x: 5, y: 1 });
    expect(post('stairwell-base')?.owner).toBe('ant');
    expect(post('top-rail')?.owner).toBe('spider');
    for (const id of ['lower-landing', 'mid-landing', 'upper-landing'] as const) {
      expect(post(id)?.owner).toBe('neutral');
    }
    expect(state.posts.size).toBe(5);
  });

  it('the terraced floor has riser obstacles cols 2–7 on rows 1,3,5,7 and open connectors', () => {
    const a = loadScenario(L6_DIR, 1).state;
    const b = loadScenario(L6_DIR, 999).state;
    const kind = (s: GameState, x: number, y: number) =>
      s.tiles.get(`floor:${String(x)},${String(y)}`)?.terrain.kind;
    // Riser walls span cols 2–7 on the odd rows 1,3,5,7; tread bands
    // (even rows) and the connector columns are fully open.
    for (let y = 0; y <= 9; y++) {
      for (let x = 0; x <= 9; x++) {
        const isRiser = x >= 2 && x <= 7 && (y === 1 || y === 3 || y === 5 || y === 7);
        expect(kind(a, x, y)).toBe(isRiser ? 'obstacle' : 'open');
      }
    }
    // Both connector bands (cols 0–1, 8–9) open top-to-bottom.
    for (const x of [0, 1, 8, 9]) {
      for (let y = 0; y <= 9; y++) expect(kind(a, x, y)).toBe('open');
    }
    // The ceiling flyer lane is fully open (no obstacle tile at all).
    for (let y = 0; y <= 9; y++) {
      for (let x = 0; x <= 9; x++) {
        expect(a.tiles.get(`ceiling:${String(x)},${String(y)}`)?.terrain.kind).toBe('open');
      }
    }
    // `static` ⇒ no per-seed map pass; obstacle count is seed-invariant.
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacles(a)).toBe(obstacles(b));
    // 4 riser rows × 6 cols (2–7) = 24 obstacle tiles, floor only.
    expect(obstacles(a)).toBe(24);
  });

  it('carries the ruled POST-occupation bonus (defensiveBonus:3, healingRate:3) on the 3 landings', () => {
    // The Gameplay-PA L6 arbitration (§3.2,
    // `docs/debate/l6-gameplay-pa-arbitration.md`) RULES every one of
    // the three contested neutral Step-Landings to carry
    // `defensiveBonus: 3` + `healingRate: 3` — the §4d-compliant
    // per-turn occupation economy the spider-AI sortie doctrine
    // exercises. These are ruled invariants, NOT loop knobs: a silent
    // regression here would re-inert the mechanic (the L4-§9 / §4d
    // falsification a third time), so guard them statically exactly as
    // level4/level5 guard their ruled values.
    const { state } = loadScenario(L6_DIR, 1);
    for (const id of ['lower-landing', 'mid-landing', 'upper-landing'] as const) {
      const post = state.posts.get(id as PostId);
      expect(post?.owner).toBe('neutral');
      expect(post?.defensiveBonus).toBe(3);
      expect(post?.healingRate).toBe(3);
    }
  });

  it('carries the L5 units.json plane-affinity UNCHANGED (no L6 plane-affinity delta here)', () => {
    // The ruled L6 plane-affinity step is the Gameplay PA's, applied
    // by the orchestrator later — L6 carries L5 forward byte-identical.
    const l6 = loadScenario(L6_DIR, 1).state;
    const l5 = loadScenario(L5_DIR, 1).state;
    for (const id of RULED_RAMP_TEMPLATES) {
      expect(l6.unitTemplates.get(id as never)?.planeAffinity).toEqual(
        l5.unitTemplates.get(id as never)?.planeAffinity,
      );
    }
    expect(l6.unitTemplates.get('ant-footman' as never)?.planeAffinity).toEqual(
      l5.unitTemplates.get('ant-footman' as never)?.planeAffinity,
    );
    expect(l6.unitTemplates.get('spider-queen' as never)?.planeAffinity).toEqual(
      l5.unitTemplates.get('spider-queen' as never)?.planeAffinity,
    );
  });
});

describe('Level 6 (The Stairs) — AIs', () => {
  it('both L6 AIs produce orders during a run', () => {
    const { events } = runOnce(1);
    expect(events.filter((e) => e.kind === 'party-moved').length).toBeGreaterThan(0);
  });

  it('a full scenario resolves decisively within the cap (eradicate has no score path)', () => {
    const { finalState, events } = runOnce(1);
    expect(finalState.winner === 'ant' || finalState.winner === 'spider').toBe(true);
    const end = [...events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
    // eradicate carries NO score tiebreak — the scenario-end never
    // attaches a scoreBreakdown (engine/turn.ts ~480).
    expect(end && 'scoreBreakdown' in end ? end.scoreBreakdown : undefined).toBeUndefined();
  });

  it('ant wins ONLY by wiping every spider party (eradicate semantics)', () => {
    // Sweep a deterministic set; on every ANT win, no spider party may
    // retain a living unit (the engine `allSpiderPartiesEliminated`).
    for (const seed of [2, 3, 4, 5, 6, 7, 8]) {
      const { finalState } = runOnce(seed);
      if (finalState.winner !== 'ant') continue;
      for (const p of finalState.parties.values()) {
        if (p.faction !== 'spider') continue;
        expect(p.units.every((u) => u.currentHp <= 0)).toBe(true);
      }
    }
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

  it('every seed resolves decisively (loose guard-rail, not the gate)', () => {
    // L1-iteration chunk 3.5 — the in-plane pathfinder was upgraded from
    // Manhattan-greedy to BFS so squads route around obstacles instead of
    // stalling. The L6 / Stairs map's defining feature is rows of riser
    // obstacles that the greedy walker happened to choke on, so ants now
    // sweep the small-seed sweep (30 / 30 in measurement). The original
    // mixed-outcome bound (`antWins < seeds.length`) was implicitly held
    // up by that bug — L6 balance is now a real design question, to be
    // re-tuned by the gameplay agent rather than re-baked silently here.
    // The guard-rail still verifies every seed reaches a decisive winner.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let resolved = 0;
    for (const seed of seeds) {
      const w = runOnce(seed).finalState.winner;
      if (w === 'ant' || w === 'spider') resolved += 1;
    }
    expect(resolved).toBe(seeds.length);
  });
});
