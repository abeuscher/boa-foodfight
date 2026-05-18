/**
 * L9 — Level 9 ("The Basement", `data/level-9`) data-set + AI tests.
 *
 * Verifies the Basement loads and schema-validates: a static THREE-plane
 * map (floor + ceiling + south-wall — the dim cramped basement, a
 * reduced set vs L5's all-6), the floor central support-pillar/furnace
 * obstacle block (cols 2–7 × rows 3–6) bisecting the room, the `wet`
 * water-hazard basin (floor cols 2–8 × rows 8–9, movementCost 2 —
 * passable but taxed, NEVER an obstacle — re-placed ON the
 * doctrine-following ant's actual row-9 assault corridor per the L9
 * arbitration §7 ship-gate fallback "a Level-side basin re-placement
 * onto the assault route so `damage:1` actually integrates"; the
 * Level-owned basin region only — the ruled payload is unchanged), the
 * SIX positional POSTs at
 * their authored coordinates/ownership including the `sump-pump`
 * (player-flippable dynamic-hazard, `hazardField` damage 1,
 * `suppressedWhenOwnedBy:'ant'`) and the always-on `boiler`
 * (`hazardField` damage 2, no suppress), and the `capture-post →
 * fuse-box` victory condition.
 *
 * RULED-VALUE static guards (the L4-§9 / L6 / L8 "a silent regression
 * re-inerts the mechanic" discipline, applied to L9's Gameplay-PA-ruled
 * `hazardField` payload — `docs/debate/l9-gameplay-pa-arbitration.md`
 * §3.1/§3.4/§7): `sump-pump.hazardField.damage === 1` (ruled, NEVER
 * tunable up — `2` is the L4-§9-permanent-ON sub-40% wall),
 * `sump-pump.hazardField.suppressedWhenOwnedBy === 'ant'` (the ruled
 * player-flip direction), `boiler.hazardField.damage === 2` always-on
 * (no `suppressedWhenOwnedBy` — the fixed denier),
 * `abilityParamsAuthoritative` unset/false (§4g — L9 stays opt-out;
 * the L1–L8-shipped + gate-29 byte-identity guarantee), and the carried
 * `units.json` plane-affinity byte-identical to L8 (NO L9
 * plane-affinity delta, §4d). Guarded statically so a future data
 * regression is loud regardless of engine path.
 *
 * Finally exercises the L9 AIs: both produce orders, a full scenario
 * reaches a terminal state inside the cap, the same seed replays
 * identically, the run resolves DECISIVELY (`capture-post` — ant wins
 * iff `fuse-box` is ant-owned; the §4c low-`drama` score-grind is the
 * tracked matchup signature, NOT a defect), and — encoding the §3.2
 * binding 2-clause flip/contest doctrine ruled invariant — over a small
 * seed set the `sump-pump` ownership flips to ant (CLAUSE 1) AND is
 * re-captured by the spider (CLAUSE 2) in a clear majority (both
 * demonstrably seed-robust, NOT inert — the §7-hardened ship-gate
 * doctrine guard).
 *
 * Modeled on `engine/level6.test.ts` / `engine/level8.test.ts`; does
 * NOT touch `data/level-1`, `data/level-1-tutorial`, `data/level-2..8`
 * (those stay byte-identical, asserted by their own suites + the coevo
 * gate).
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineL9Player } from '../ai/baseline-l9.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL9 } from '../ai/spider-l9.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PostId, ReplayEvent } from './types.ts';

const L9_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-9');
const L8_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-8');

const PLANE_AFFINITY_TEMPLATES = [
  'spider-soldier',
  'spider-scout',
  'spider-spinner',
  'spider-elite',
  'spider-veteran-soldier',
  'spider-knight',
  'spider-weaver',
  'spider-stalker',
  'ant-footman',
  'ant-mage',
  'spider-queen',
] as const;

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

interface L9Run {
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
}

const runOnce = (seed: number): L9Run => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L9_DIR, seed);
  const out = runScenario(state, data, createRng(seed), tickClock(), {
    maxTurns: 100,
    policies: [baselineL9Player, spiderL9, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return { finalState: out.finalState, events: out.events };
};

describe('Level 9 (The Basement) — data set', () => {
  it('loads and schema-validates as a static three-plane map', () => {
    const data = loadScenarioData(L9_DIR);
    expect(data.map.name).toBe('The Basement');
    expect(data.map.static).toBe(true);
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual(['ceiling', 'floor', 'south-wall']);
  });

  it('does NOT opt in to abilityParamsAuthoritative (§4g — L9 stays opt-out)', () => {
    // §4g (ruled §3.4c): L9 is `capture-post` with no recruit/hypnotize
    // tuning intent; it MUST NOT set `abilityParamsAuthoritative` so the
    // L1–L8-shipped + gate-29 byte-identity guarantee is preserved. A
    // silent regression that flipped this on would change the engine
    // ability path — guarded as a ruled invariant.
    const data = loadScenarioData(L9_DIR);
    expect(data.map.abilityParamsAuthoritative ?? false).toBe(false);
  });

  it('declares the capture-post victory condition on fuse-box', () => {
    const data = loadScenarioData(L9_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'capture-post',
      postId: 'fuse-box',
    });
  });

  it('has the six positional POSTs at their canonical coordinates and ownership', () => {
    const { state } = loadScenario(L9_DIR, 1);
    const post = (id: string) => state.posts.get(id as PostId);
    expect(post('stairwell')?.location).toEqual({ plane: 'floor', x: 0, y: 0 });
    expect(post('boiler')?.location).toEqual({ plane: 'floor', x: 7, y: 7 });
    expect(post('crawlspace-mouth')?.location).toEqual({ plane: 'floor', x: 1, y: 7 });
    expect(post('crawl-vent')?.location).toEqual({ plane: 'south-wall', x: 1, y: 7 });
    expect(post('sump-pump')?.location).toEqual({ plane: 'floor', x: 1, y: 9 });
    expect(post('fuse-box')?.location).toEqual({ plane: 'floor', x: 9, y: 9 });
    expect(post('stairwell')?.owner).toBe('ant');
    expect(post('sump-pump')?.owner).toBe('spider');
    expect(post('fuse-box')?.owner).toBe('spider');
    for (const id of ['boiler', 'crawlspace-mouth', 'crawl-vent'] as const) {
      expect(post(id)?.owner).toBe('neutral');
    }
    expect(state.posts.size).toBe(6);
  });

  it('the floor has the bisecting pillar block and a passable wet basin (never obstacle)', () => {
    const a = loadScenario(L9_DIR, 1).state;
    const b = loadScenario(L9_DIR, 999).state;
    const tile = (s: GameState, plane: string, x: number, y: number) =>
      s.tiles.get(`${plane}:${String(x)},${String(y)}`)?.terrain;
    // FLOOR: the central support-pillar/furnace obstacle block (cols
    // 2–7 × rows 3–6); the `wet` basin (cols 2–8 × rows 8–9, mc 2,
    // NEVER an obstacle — passable but taxed; re-placed ON the
    // doctrine-following ant's actual row-9 assault corridor so the
    // RULED `damage:1` genuinely integrates each flooded turn — the
    // §7 ship-gate fallback Level-side basin re-placement); everything
    // else open.
    for (let y = 0; y <= 9; y++) {
      for (let x = 0; x <= 9; x++) {
        const t = tile(a, 'floor', x, y);
        const pillar = x >= 2 && x <= 7 && y >= 3 && y <= 6;
        const basin = x >= 2 && x <= 8 && y >= 8 && y <= 9;
        if (pillar) {
          expect(t?.kind).toBe('obstacle');
        } else if (basin) {
          expect(t?.kind).toBe('wet');
          expect(t?.movementCost).toBe(2);
          // The §0 navigability invariant: the basin is passable in
          // EVERY pump state (mc 2 < the 99 obstacle threshold).
          expect(t?.movementCost).toBeLessThan(99);
        } else {
          expect(t?.kind).toBe('open');
        }
      }
    }
    // `static` ⇒ no per-seed map pass; tile kinds seed-invariant.
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacles(a)).toBe(obstacles(b));
  });

  it('carries the RULED sump-pump / boiler hazardField damage payload (static guards)', () => {
    // The Gameplay-PA L9 arbitration (§3.1/§3.4/§7,
    // `docs/debate/l9-gameplay-pa-arbitration.md`) RULES the Sump-Pump
    // `hazardField` `damage:1` + `suppressedWhenOwnedBy:'ant'` (the
    // player-flippable lever; `damage` is NEVER loop-tunable up — `2`
    // is the L4-§9-permanent-ON sub-40% wall) and the Boiler
    // `hazardField` `damage:2` always-on (NO `suppressedWhenOwnedBy` —
    // the fixed denier). Guarded statically as ruled invariants exactly
    // as level4/level6/level8 guard theirs — a silent regression that
    // raised the Sump-Pump damage or removed the suppress direction (or
    // changed the Boiler) would be the L4-§9 / §7 falsification, made
    // loud here.
    const { state } = loadScenario(L9_DIR, 1);
    const sump = state.posts.get('sump-pump' as PostId);
    expect(sump?.hazardField?.damage).toBe(1);
    expect(sump?.hazardField?.suppressedWhenOwnedBy).toBe('ant');
    expect((sump?.hazardField?.tiles.length ?? 0) > 0).toBe(true);
    const boiler = state.posts.get('boiler' as PostId);
    expect(boiler?.hazardField?.damage).toBe(2);
    expect(boiler?.hazardField?.suppressedWhenOwnedBy).toBeUndefined();
    expect((boiler?.hazardField?.tiles.length ?? 0) > 0).toBe(true);
  });

  it('carries the L8 units.json plane-affinity UNCHANGED (no L9 plane-affinity delta, §4d)', () => {
    const l9 = loadScenario(L9_DIR, 1).state;
    const l8 = loadScenario(L8_DIR, 1).state;
    for (const id of PLANE_AFFINITY_TEMPLATES) {
      expect(l9.unitTemplates.get(id as never)?.planeAffinity).toEqual(
        l8.unitTemplates.get(id as never)?.planeAffinity,
      );
    }
  });
});

describe('Level 9 (The Basement) — AIs', () => {
  it('both L9 AIs produce orders during a run', () => {
    const { events } = runOnce(1);
    expect(events.filter((e) => e.kind === 'party-moved').length).toBeGreaterThan(0);
  });

  it('a full scenario resolves decisively within the cap (capture-post)', () => {
    const { finalState, events } = runOnce(1);
    expect(finalState.winner === 'ant' || finalState.winner === 'spider').toBe(true);
    const end = [...events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
  });

  it('ant wins ONLY by owning fuse-box (capture-post semantics)', () => {
    for (const seed of [2, 3, 4, 5, 6, 7, 8]) {
      const { finalState } = runOnce(seed);
      if (finalState.winner !== 'ant') continue;
      expect(finalState.posts.get('fuse-box' as PostId)?.owner).toBe('ant');
    }
  });

  it('the §3.2 binding 2-clause flip/contest doctrine is demonstrably seed-robust (NOT inert)', () => {
    // Encodes the §3.2/§7-hardened ship-gate doctrine ruled invariant:
    // over a small seed set the Sump-Pump ownership MUST flip to ant
    // (CLAUSE 1 — the ant detaches a capture element and DRAINS the
    // basin) in a clear majority AND be re-captured by the spider
    // (CLAUSE 2 — the spider actively contests / re-takes it,
    // re-flooding) in a clear majority. A run where the pump never
    // flips (the L4-§9 permanent-ON breach) OR the spider never
    // re-takes (the permanent-OFF breach — the lever inert) is the
    // explicit ship-gate FAILURE the §7 hardening forbids; this test is
    // that hardening, in-suite.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let antFlipped = 0;
    let spiderRetook = 0;
    for (const seed of seeds) {
      const { events } = runOnce(seed);
      let flipped = false;
      let retook = false;
      for (const e of events) {
        if (e.kind === 'post-captured' && e.postId === ('sump-pump' as PostId)) {
          if (e.newOwner === 'ant') flipped = true;
          if (e.newOwner === 'spider') retook = true;
        }
      }
      if (flipped) antFlipped += 1;
      if (retook) spiderRetook += 1;
    }
    // Clear majority of the small seed set — both clauses live, NOT
    // inert. (The measured per-100 rates are flip 100/100, spider
    // re-capture 96/100 — see the AI file headers' falsification
    // record; the win-band itself is a reported clean falsification,
    // distinct from this doctrine-existence invariant which DOES hold.)
    expect(antFlipped).toBeGreaterThan(seeds.length / 2);
    expect(spiderRetook).toBeGreaterThan(seeds.length / 2);
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
