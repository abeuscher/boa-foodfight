/**
 * L7 — Level 7 ("The Living Room", `data/level-7`) data-set + AI tests.
 *
 * Verifies the Living Room loads and schema-validates: a static map
 * with **all 6 planes** (floor + ceiling + the four walls — the tier's
 * first genuinely open arena), the open floor with exactly three small
 * 2×2 furniture clusters (Couch, Coffee-Table, TV-Stand) and every
 * other plane fully open, the seven spec POSTs at their authored
 * coordinates/ownership, and the `capture-post → mantel` victory
 * condition.
 *
 * Carries **ruled-value static guards** (Gameplay-PA L7 arbitration
 * `docs/debate/l7-gameplay-pa-arbitration.md`, **RE-ARBITRATION 3** —
 * the third and intended-final amendment, Remote RESTORED as a
 * `goldPerTurn` economy on the merged engine dep #9):
 *
 *   - The Remote POST is RESTORED to its original §4a #3 `goldPerTurn`
 *     currency-economy role: RULED to `owner:"neutral",
 *     defensiveBonus:0, healingRate:0, goldPerTurn ∈ [3,6]` at floor
 *     (6,5). `owner:"neutral"` / `defensiveBonus:0` / `healingRate:0`
 *     are the RULED load-bearing invariants (`defensiveBonus:0` must
 *     never re-introduce the §3.1 uncontestable-holder trap;
 *     `healingRate:0` removes the §4e-inert heal confound entirely);
 *     `goldPerTurn` is the loop-tunable economy magnitude, RULED to
 *     the band [3,6]. Guard them statically exactly as level4/5/6
 *     guard their ruled values. The RE-ARB-3 R3.3(a) "Remote flips > 0
 *     / bidirectional" + R3.3(b) "card economy funded" acceptance
 *     sub-checks are RE-IMPOSED (the Remote is load-bearing again):
 *     this suite additionally asserts that an L7 run emits at least
 *     one `gold-earned` event with `source:'post'` (proving the
 *     ownership economy registers in-sim).
 *   - The re-ruled card/combo magnitudes (the rebound is carried by
 *     the proven-exercised cards+combos, NOW Remote-funded): Royal
 *     Onslaught `damage:26` and Venom Storm `damage:5` are RULED
 *     VALUES, NOT tuning knobs. A silent regression would re-inert the
 *     re-ruled rebound engine (the §4d / L4-§9 falsification), so they
 *     are guarded statically exactly as level4/5/6 guard their ruled
 *     values.
 *
 * Also asserts the carried `units.json` plane-affinity is byte-
 * identical to L6 (NO L7 plane-affinity delta — the §3.5/§4e ruling,
 * §4d-directed) and that the combo partner-parties (ant mage+worker;
 * spider spinner+queen) deploy ADJACENT at start (the §3.3 roster
 * composition the shipped combo resolver needs). Finally exercises the
 * L7 AIs for determinism.
 *
 * Modeled on `engine/level6.test.ts`; does NOT touch `data/level-1`,
 * `data/level-1-tutorial`, `data/level-2..6` (those stay byte-identical,
 * asserted by their own suites + the coevo gate).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineL7Player } from '../ai/baseline-l7.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL7 } from '../ai/spider-l7.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PartyId, PostId, ReplayEvent } from './types.ts';

const L7_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-7');
const L6_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-6');

const numericParam = (
  params: Readonly<Record<string, number | readonly string[] | Record<string, number>>>,
  key: string,
): number | undefined => {
  const raw = params[key];
  return typeof raw === 'number' ? raw : undefined;
};

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

interface L7Run {
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
}

const runOnce = (seed: number): L7Run => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L7_DIR, seed);
  const out = runScenario(state, data, createRng(seed), tickClock(), {
    maxTurns: 100,
    policies: [baselineL7Player, spiderL7, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return { finalState: out.finalState, events: out.events };
};

describe('Level 7 (The Living Room) — data set', () => {
  it('loads and schema-validates as a static all-6-plane map', () => {
    const data = loadScenarioData(L7_DIR);
    expect(data.map.static).toBe(true);
    // The first genuinely open arena: all 6 planes present.
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual([
      'ceiling',
      'east-wall',
      'floor',
      'north-wall',
      'south-wall',
      'west-wall',
    ]);
  });

  it('declares the capture-post victory condition targeting mantel', () => {
    const data = loadScenarioData(L7_DIR);
    expect(data.map.victoryCondition).toEqual({ kind: 'capture-post', postId: 'mantel' });
  });

  it('has the seven spec POSTs at their canonical coordinates and ownership', () => {
    const { state } = loadScenario(L7_DIR, 1);
    const post = (id: string) => state.posts.get(id as PostId);
    expect(post('floor-vent')?.location).toEqual({ plane: 'floor', x: 0, y: 0 });
    expect(post('couch-cushion')?.location).toEqual({ plane: 'floor', x: 0, y: 4 });
    expect(post('coffee-table-top')?.location).toEqual({ plane: 'floor', x: 3, y: 6 });
    expect(post('remote')?.location).toEqual({ plane: 'floor', x: 6, y: 5 });
    expect(post('tv-stand')?.location).toEqual({ plane: 'floor', x: 9, y: 4 });
    expect(post('bookshelf')?.location).toEqual({ plane: 'ceiling', x: 5, y: 1 });
    expect(post('mantel')?.location).toEqual({ plane: 'floor', x: 9, y: 9 });
    expect(post('floor-vent')?.owner).toBe('ant');
    expect(post('mantel')?.owner).toBe('spider');
    expect(state.posts.size).toBe(7);
  });

  it('the open arena has exactly three 2×2 floor clusters; every other plane is fully open', () => {
    const a = loadScenario(L7_DIR, 1).state;
    const b = loadScenario(L7_DIR, 999).state;
    const kind = (s: GameState, plane: string, x: number, y: number) =>
      s.tiles.get(`${plane}:${String(x)},${String(y)}`)?.terrain.kind;
    // The three small furniture clusters (Couch / Coffee-Table /
    // TV-Stand) — convex 2×2 blocks placed OFF the capture-order march
    // lanes; every other floor tile open.
    const clusters = new Set([
      '1,2',
      '1,3',
      '2,2',
      '2,3', // Couch
      '4,4',
      '4,5',
      '5,4',
      '5,5', // Coffee-Table
      '7,6',
      '7,7',
      '8,6',
      '8,7', // TV-Stand
    ]);
    for (let y = 0; y <= 9; y++) {
      for (let x = 0; x <= 9; x++) {
        const inCluster = clusters.has(`${String(x)},${String(y)}`);
        expect(kind(a, 'floor', x, y)).toBe(inCluster ? 'obstacle' : 'open');
      }
    }
    // Ceiling + all four walls are fully open (the open-arena maneuver
    // lanes — no obstacle tile anywhere off the floor).
    for (const plane of ['ceiling', 'north-wall', 'south-wall', 'east-wall', 'west-wall']) {
      for (let y = 0; y <= 9; y++) {
        for (let x = 0; x <= 9; x++) {
          expect(kind(a, plane, x, y)).toBe('open');
        }
      }
    }
    // `static` ⇒ no per-seed map pass; obstacle count is seed-invariant
    // (3 clusters × 4 tiles = 12 floor obstacles, nothing elsewhere).
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacles(a)).toBe(12);
    expect(obstacles(a)).toBe(obstacles(b));
  });

  it('carries the RE-ARB-3 RESTORED Remote POST payload (owner:neutral, defensiveBonus:0, healingRate:0, goldPerTurn∈[3,6]) at floor (6,5) — the §4a #3 currency economy', () => {
    // RE-ARBITRATION 3 (the third, intended-final amendment) RESTORES
    // the Remote from RE-ARB-2's demoted neutral-flavor classification
    // to its original `level-progression-plan.md` §4a #3 `goldPerTurn`
    // currency-economy role, finally expressible on the merged engine
    // dep #9 (`engine/end-of-turn.ts` `applyPostGoldIncome`: a
    // real-faction-owned POST with `goldPerTurn>0` credits the OWNING
    // faction's `state.playerGold` each turn — ownership-based,
    // race-proof, sidestepping the §4e co-located-pause race that
    // falsified the heal-hack expression three times). RULED load-
    // bearing invariants: `owner:"neutral"` (contestable, pays nobody
    // until captured), `defensiveBonus:0` (never re-introduce the §3.1
    // uncontestable-holder trap that made the node permanently
    // uncapturable), `healingRate:0` (the §4e-inert heal confound
    // removed entirely — the economy is GOLD now). `goldPerTurn` is
    // the loop-tunable economy magnitude, RULED to the band [3,6]
    // (R3.2). Guard the invariants + the band statically exactly as
    // level4/5/6 guard their ruled values.
    const { state } = loadScenario(L7_DIR, 1);
    const remote = state.posts.get('remote' as PostId);
    expect(remote?.location).toEqual({ plane: 'floor', x: 6, y: 5 });
    expect(remote?.owner).toBe('neutral');
    expect(remote?.defensiveBonus).toBe(0);
    expect(remote?.healingRate).toBe(0);
    expect(remote?.goldPerTurn).toBeGreaterThanOrEqual(3);
    expect(remote?.goldPerTurn).toBeLessThanOrEqual(6);
  });

  it('an L7 run emits at least one gold-earned event with source:post (the Remote ownership economy registers in-sim — RE-ARB-3 R3.3(b))', () => {
    // The RE-ARB-3 R3.3(b) ship-gate sub-check, asserted in-suite: the
    // restored Remote `goldPerTurn` economy must demonstrably reach the
    // card market in-sim — i.e. across a deterministic L7 run the
    // engine emits the dep-#9 `gold-earned` (`source:'post'`,
    // `sourceId:'remote'`) credit, proving ownership-based income
    // accrues (the §4e-dead heal-hack provably never did). This is the
    // economy-registers proof distinct from the static spec guard
    // above; the loop's seeds-1..100 sweep measures the magnitude.
    const { events } = runOnce(1);
    const postGold = events.filter(
      (e) => e.kind === 'gold-earned' && e.source === 'post' && e.sourceId === 'remote',
    );
    expect(postGold.length).toBeGreaterThan(0);
  });

  it('carries the RE-ARB-2 ruled card/combo magnitudes (royal-onslaught.damage===26, venom-storm.damage===5)', () => {
    // RE-ARBITRATION 2 R2.2 carries the entire ~64% rebound through the
    // proven-exercised cards+combos (the Remote is demoted, §4e). Royal
    // Onslaught `damage` 18→26 (the dominant re-ruled engine, +pp on
    // the 108×/100 genuinely-exercised combo) and Venom Storm `damage`
    // 3→5 (the bounded spider ceiling, raised LESS than RO so the net
    // stays player-favorable) are RULED VALUES, NOT tuning knobs (the
    // §7 "ruled values are not free knobs" clause). A silent regression
    // here would re-inert / re-shape the re-ruled rebound engine (the
    // §4d / L4-§9 falsification), so guard them statically exactly as
    // level4/5/6 guard their ruled values.
    const data = loadScenarioData(L7_DIR);
    const ability = (id: string) => data.abilities.abilities.find((a) => a.id === id);
    const ro = ability('royal-onslaught');
    const vs = ability('venom-storm');
    expect(ro).toBeDefined();
    expect(vs).toBeDefined();
    expect(numericParam(ro!.params, 'damage')).toBe(26);
    expect(numericParam(vs!.params, 'damage')).toBe(5);
  });

  it('starts the combo partner-parties ADJACENT (§3.3/§4c roster composition)', () => {
    // The shipped combo resolver (`engine/battle-abilities.ts`) fires a
    // combo only when a same-faction partner of the right composition
    // is Chebyshev ≤1 on the same plane. The L7 rosters are composed so
    // both partner-pairs DEPLOY adjacent (the §3.3/§4c ruled invariant;
    // the open arena would otherwise scatter them — the §4d dead-letter
    // fate). Royal Onslaught (ant): mage party + worker party. Venom
    // Storm (spider): spinner party + queen party.
    const { state } = loadScenario(L7_DIR, 1);
    const cheb = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    const party = (id: string) => state.parties.get(id as unknown as PartyId)?.location;
    const mage = party('vanguard-bravo'); // ant-mage
    const worker = party('vanguard-charlie'); // ant-workers (jelly-apply)
    expect(mage?.plane).toBe(worker?.plane);
    expect(mage && worker ? cheb(mage, worker) : 99).toBeLessThanOrEqual(1);
    const queen = party('end-guard'); // spider-queen
    const spinner = party('north-picket'); // spider-spinners
    expect(queen?.plane).toBe(spinner?.plane);
    expect(queen && spinner ? cheb(queen, spinner) : 99).toBeLessThanOrEqual(1);
  });

  it('carries the L6 units.json plane-affinity UNCHANGED (no L7 plane-affinity delta)', () => {
    // The §3.5/§4e ruling (§4d-directed): NO L7 plane-affinity delta —
    // L7 carries L6 forward byte-identical (empirically inert under the
    // chain-march/fortress AI doctrine; latent identity layer, not a
    // curve lever; not budgeted as an L7 win-rate mover).
    const l7 = loadScenario(L7_DIR, 1).state;
    const l6 = loadScenario(L6_DIR, 1).state;
    for (const id of RULED_RAMP_TEMPLATES) {
      expect(l7.unitTemplates.get(id as never)?.planeAffinity).toEqual(
        l6.unitTemplates.get(id as never)?.planeAffinity,
      );
    }
    expect(l7.unitTemplates.get('ant-footman' as never)?.planeAffinity).toEqual(
      l6.unitTemplates.get('ant-footman' as never)?.planeAffinity,
    );
    expect(l7.unitTemplates.get('spider-queen' as never)?.planeAffinity).toEqual(
      l6.unitTemplates.get('spider-queen' as never)?.planeAffinity,
    );
  });
});

describe('Level 7 (The Living Room) — AIs', () => {
  it('both L7 AIs produce orders during a run', () => {
    const { events } = runOnce(1);
    expect(events.filter((e) => e.kind === 'party-moved').length).toBeGreaterThan(0);
  });

  it('a full scenario reaches a terminal state inside the cap', () => {
    const { finalState, events } = runOnce(1);
    expect(finalState.winner === 'ant' || finalState.winner === 'spider').toBe(true);
    const end = [...events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
  });

  it('resolves capture-post → mantel: a decisive (pre-cap) ant win owns mantel', () => {
    // capture-post semantics: an ant win BEFORE the turn cap is a real
    // mantel capture (the objective is ant-owned at the terminal
    // state). A win AT the cap is the round-19 score path
    // (`engine/score.ts`) — the §4c low-`drama` score-grind signature,
    // tracked cross-level, NOT asserted per-seed here.
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { finalState } = runOnce(seed);
      if (finalState.winner !== 'ant') continue;
      if (finalState.turn >= 100) continue; // score-resolved at the cap
      expect(finalState.posts.get('mantel' as PostId)?.owner).toBe('ant');
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
});
