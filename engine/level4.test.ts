/**
 * L4 — Level 4 ("The Hallway", `data/level-4`) data-set + AI tests.
 *
 * Verifies the Hallway loads and schema-validates: a static 3-plane
 * manifold (floor + ceiling + north-wall — NOT the L1 six, NOT the L2
 * two, NOT the L3 four), the 4-wide corridor band (rows 3–6, all
 * columns) survives the load with rows 0–2/7–9 panelled, the six spec
 * POSTs sit at their authored columns with the authored ownership, the
 * three Doorway POSTs carry a per-seed row `jitter` (column + plane
 * fixed, row re-drawn in-band) while the fixed POSTs do not, the
 * north-wall Light-Switch carries the ruled `combatModifier`
 * (`litOwner:"ant", faction:"ant", attack:2`), and the
 * `capture-post → end-door` victory condition is declared. Then
 * exercises the L4 AIs: both produce orders, a full scenario reaches a
 * terminal state inside the turn cap, the same seed replays
 * identically, and — encoding the re-arbitration §9.3(b) transience
 * invariant as a test — the Light-Switch ownership flips to ant in a
 * clear majority of a small seed set (the ant detachment earns and
 * extinguishes the +2; the full 1..100 [58,61] calibration lives in
 * the harness, not the unit suite — this is the invariant guard-rail,
 * not the gate).
 *
 * Modeled on `engine/level3.test.ts`; does NOT touch `data/level-1`,
 * `data/level-1-tutorial` or `data/level-3` (those paths stay
 * byte-identical, asserted by their own suites and the coevo gate).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineL4Player } from '../ai/baseline-l4.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL4 } from '../ai/spider-l4.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PostId, ReplayEvent } from './types.ts';

const L4_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-4');

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

interface L4Run {
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
}

const runOnce = (seed: number): L4Run => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L4_DIR, seed);
  const out = runScenario(state, data, createRng(seed), tickClock(), {
    maxTurns: 100,
    policies: [baselineL4Player, spiderL4, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return { finalState: out.finalState, events: out.events };
};

describe('Level 4 (The Hallway) — data set', () => {
  it('loads and schema-validates as a static 3-plane map', () => {
    const data = loadScenarioData(L4_DIR);
    expect(data.map.name).toBe('The Hallway');
    expect(data.map.static).toBe(true);
    // floor + ceiling + the single north-wall identity plane the
    // Hallway uses. Not the L1 six, not the L2 two, not the L3 four.
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual(['ceiling', 'floor', 'north-wall']);
  });

  it('declares the capture-post → end-door victory condition', () => {
    const data = loadScenarioData(L4_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'capture-post',
      postId: 'end-door',
    });
  });

  it('has the six spec POSTs at their canonical columns and ownership', () => {
    const { state } = loadScenario(L4_DIR, 1);
    const post = (id: string) => state.posts.get(id as PostId);
    // Fixed POSTs (no jitter) sit at their authored coordinates.
    expect(post('hall-threshold')?.location).toEqual({ plane: 'floor', x: 0, y: 4 });
    expect(post('end-door')?.location).toEqual({ plane: 'floor', x: 9, y: 4 });
    expect(post('light-switch')?.location).toEqual({ plane: 'north-wall', x: 5, y: 4 });
    // The three Doorways keep their fixed column + floor plane; the
    // resolved row is in-band [3,6] (the §3.3 jitter band).
    for (const [id, col] of [
      ['doorway-east', 3],
      ['doorway-mid', 5],
      ['doorway-west', 7],
    ] as const) {
      const loc = post(id)?.location;
      expect(loc?.plane).toBe('floor');
      expect(loc?.x).toBe(col);
      expect(loc?.y).toBeGreaterThanOrEqual(3);
      expect(loc?.y).toBeLessThanOrEqual(6);
    }
    // Authored ownership: ant home, spider objective + spider-held
    // mid-corridor switch, doorways neutral.
    expect(post('hall-threshold')?.owner).toBe('ant');
    expect(post('end-door')?.owner).toBe('spider');
    expect(post('light-switch')?.owner).toBe('spider');
    for (const id of ['doorway-east', 'doorway-mid', 'doorway-west'] as const) {
      expect(post(id)?.owner).toBe('neutral');
    }
    // Exactly six POSTs — no extras.
    expect(state.posts.size).toBe(6);
  });

  it('carries the ruled Light-Switch combatModifier (litOwner ant / faction ant / +2)', () => {
    // The §9.3(a) ruled payload. Asserted so a silent regression of the
    // re-arbitrated values (a reopen trigger) is loud.
    const data = loadScenarioData(L4_DIR);
    const ls = data.map.posts.find((p) => p.id === 'light-switch');
    expect(ls?.combatModifier).toEqual({ litOwner: 'ant', faction: 'ant', attack: 2 });
  });

  it('keeps the 4-wide corridor band; Doorways jitter per-seed, fixed POSTs do not', () => {
    const a = loadScenario(L4_DIR, 1);
    const b = loadScenario(L4_DIR, 999);
    // The corridor band is rows 3–6 on the floor (every column open),
    // rows 0–2 and 7–9 panelled. Seed-invariant (the `static` flag
    // suppressed the per-seed random-map pass); count is identical.
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacles(a.state)).toBe(obstacles(b.state));
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y <= 2; y++) {
        expect(a.state.tiles.get(`floor:${String(x)},${String(y)}`)?.terrain.kind).toBe('obstacle');
      }
      for (let y = 3; y <= 6; y++) {
        expect(a.state.tiles.get(`floor:${String(x)},${String(y)}`)?.terrain.kind).toBe('open');
      }
      for (let y = 7; y <= 9; y++) {
        expect(a.state.tiles.get(`floor:${String(x)},${String(y)}`)?.terrain.kind).toBe('obstacle');
      }
    }
    // Fixed POSTs are seed-invariant; the three Doorways are jittered
    // (their rows differ across at least one of the two seeds — a
    // non-flaky check since the loader re-draws the row per seed in a
    // 4-row band and the two seeds are far apart).
    for (const id of ['hall-threshold', 'end-door', 'light-switch'] as const) {
      expect(a.state.posts.get(id as PostId)?.location).toEqual(
        b.state.posts.get(id as PostId)?.location,
      );
    }
    const doorwayRowsDiffer = (['doorway-east', 'doorway-mid', 'doorway-west'] as const).some(
      (id) =>
        a.state.posts.get(id as PostId)?.location.y !== b.state.posts.get(id as PostId)?.location.y,
    );
    expect(doorwayRowsDiffer).toBe(true);
  });

  it('end-door keeps its ruled defensive/heal profile', () => {
    // The End-Door POST stat is the Level-owned objective defensibility
    // referenced by the arbitration; assert the shipped values so a
    // silent regression of the objective is loud.
    const { state } = loadScenario(L4_DIR, 1);
    const ed = state.posts.get('end-door' as PostId);
    expect(ed?.defensiveBonus).toBe(5);
    expect(ed?.healingRate).toBe(2);
  });
});

describe('Level 4 (The Hallway) — AIs', () => {
  it('both L4 AIs produce orders during a run', () => {
    const { events } = runOnce(1);
    const moves = events.filter((e) => e.kind === 'party-moved').length;
    expect(moves).toBeGreaterThan(0);
    // The ant chain march walks the neutral Doorway chain, so mid-chain
    // POSTs flip to ant before the end-door assault.
    const captures = events.filter((e) => e.kind === 'post-captured').length;
    expect(captures).toBeGreaterThan(0);
  });

  it('a full scenario reaches a terminal state within the cap', () => {
    const { finalState, events } = runOnce(1);
    expect(finalState.winner === 'ant' || finalState.winner === 'spider').toBe(true);
    const end = [...events].reverse().find((e) => e.kind === 'scenario-end');
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
      expect(b.finalState.winner).toBe(a.finalState.winner);
      expect(b.finalState.turn).toBe(a.finalState.turn);
      expect(census(b.finalState)).toBe(census(a.finalState));
    }
  });

  it('the Light-Switch flips to ant in a clear majority — the §9.3(b) transience invariant', () => {
    // Re-arbitration §9.3(b)/§9.4: the ruled `combatModifier` must be a
    // TRANSIENT, earned buff — the ant detachment must actually capture
    // the spider-held switch mid-scenario (which self-extinguishes the
    // +2 via the `litOwner:"ant"` engine semantics), NOT a permanent
    // army-wide wall (the falsified §4a state that measured ant 99%).
    // This encodes that invariant: over a small deterministic seed set
    // the switch must flip to ant in a clear majority (the harness
    // measures 100/100 over seeds 1..100; this is the loose guard-rail,
    // not the gate). A regression to "switch never flips" (permanent
    // buff) or "ant never even contests it" fails loudly here.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let flipped = 0;
    for (const seed of seeds) {
      const { events } = runOnce(seed);
      const fl: ReplayEvent | undefined = events.find(
        (e) => e.kind === 'post-captured' && e.postId === ('light-switch' as PostId),
      );
      if (fl !== undefined) flipped += 1;
    }
    // Clear majority — strictly more than half the seed set.
    expect(flipped).toBeGreaterThan(seeds.length / 2);
  });

  it('the spider genuinely contests — ant win-band stays sane (loose guard-rail)', () => {
    // A small deterministic seed set. NOT the calibration gate (the
    // [58,61] band is measured over seeds 1..100 in the harness); it
    // only guards against a gross regression of either side (a no-op
    // spider handing the ant 100%, or an over-strong turtle shutting
    // the ant out). Both factions must be live over the set.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let antWins = 0;
    for (const seed of seeds) {
      if (runOnce(seed).finalState.winner === 'ant') antWins += 1;
    }
    expect(antWins).toBeGreaterThan(0);
    expect(antWins).toBeLessThan(seeds.length);
  });
});
