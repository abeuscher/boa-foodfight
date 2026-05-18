/**
 * L8 — Level 8 ("The Attic", `data/level-8`) data-set + AI tests.
 *
 * Verifies the Attic loads and schema-validates: a static SIX-plane map
 * (the floor cramped cruciform crawl + the heavily-clipped ceiling
 * carry the L8 identity; the four open wall planes are spawn-safety +
 * cross-plane reach scaffolding so the plane-blind frozen cockroach
 * spawn — `engine/neutrals.ts` `pickPlanes` — always lands a REACHABLE
 * party), the cruciform floor (open = cols 3–6 ∪ rows 3–6, everything
 * else the sloping-eaves / wedged-box obstacles), the clipped ceiling
 * (a 5×5 patch rows/cols 3–7 plus the 1-wide col-5 reach spine), the
 * six positional/economy POSTs at their authored coordinates/ownership,
 * and the `recruit-count` victory condition with the orchestrator-
 * reconciled `target: 1` (the single-cockroach engine-forced value —
 * `engine/neutrals.ts` `KIND_RECIPE.cockroaches` spawns exactly ONE
 * 8-unit party; `recruitedPartyCount` caps at 1; §4g).
 *
 * RULED-VALUE static guards (the L4-§9 / L6 "a silent regression
 * re-inerts the mechanic" discipline): the `data/level-8/abilities.json`
 * `hypnotize` full-power restore (`minControlTurns:5`,
 * `maxControlTurns:10`; `successRate:0.8`, `reboundImmunityTurns:10`
 * unchanged) and `recruit.successRate` ∈ [0.40,0.52] (RE-RULED
 * post-dep-#10 — the §R.2(a) amendment; replaces the falsified
 * [0.25,0.35] band set under the §4g inert-constant false premise),
 * plus the carried
 * `units.json` plane-affinity byte-identical to L6 (NO L8
 * plane-affinity delta, §4d). These data fields are guarded as ruled
 * invariants even though the frozen engine resolves hypnotize/recruit
 * from hardcoded constants in `engine/abilities.ts` (the §4g
 * engine-reality finding) — the guard makes a future data regression
 * loud regardless.
 *
 * Finally exercises the L8 AIs: both produce orders, a full scenario
 * reaches a terminal state inside the cap, the same seed replays
 * identically, and the run resolves DECISIVELY (recruit-count has NO
 * score path — ant wins only by recruiting the cockroach party to the
 * target; spider wins on the turn cap; `engine/turn.ts` ~480).
 *
 * Modeled on `engine/level6.test.ts`; does NOT touch `data/level-1`,
 * `data/level-1-tutorial`, `data/level-2..6` (those stay byte-identical,
 * asserted by their own suites + the coevo gate).
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { baselineL8Player } from '../ai/baseline-l8.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL8 } from '../ai/spider-l8.ts';

import { createRng } from './rng.ts';
import { loadScenario, loadScenarioData } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, PostId, ReplayEvent } from './types.ts';

const L8_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-8');
const L6_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-6');

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

interface L8Run {
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
}

const runOnce = (seed: number): L8Run => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L8_DIR, seed);
  const out = runScenario(state, data, createRng(seed), tickClock(), {
    maxTurns: 100,
    policies: [baselineL8Player, spiderL8, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return { finalState: out.finalState, events: out.events };
};

describe('Level 8 (The Attic) — data set', () => {
  it('loads and schema-validates as a static six-plane map', () => {
    const data = loadScenarioData(L8_DIR);
    expect(data.map.name).toBe('The Attic');
    expect(data.map.static).toBe(true);
    expect(data.map.planes.map((p) => p.plane).sort()).toEqual([
      'ceiling',
      'east-wall',
      'floor',
      'north-wall',
      'south-wall',
      'west-wall',
    ]);
  });

  it('opts in to authoritative abilities.json params (the load-bearing dep-#10 flag)', () => {
    // Engine dep #10 (docs §4g): `data/level-8/map.json` MUST set
    // `abilityParamsAuthoritative: true` so the engine reads the
    // `abilities.json` hypnotize/recruit params instead of the
    // hardcoded constants. This flag is LOAD-BEARING — without it the
    // `recruit.successRate` tuning lever is inert (the pre-redo
    // falsification: ant hard-gated at the 0.25 constant). A silent
    // regression that drops this flag would re-inert the lever and the
    // falsification recurs, so it is guarded as a ruled invariant
    // exactly like the level4/level6 ruled-value guards. (Every
    // SHIPPED scenario `data/level-1..7` deliberately does NOT opt in,
    // keeping them + the gate-29 baseline byte-identical — that is
    // asserted by their own suites + the coevo gate, not here.)
    const data = loadScenarioData(L8_DIR);
    expect(data.map.abilityParamsAuthoritative).toBe(true);
  });

  it('declares the recruit-count victory condition with the engine-forced target:1', () => {
    // §4g engine-reality reconciliation: `engine/neutrals.ts`
    // `KIND_RECIPE.cockroaches` spawns exactly ONE 8-unit cockroach
    // party; the recruit handler converts the WHOLE party;
    // `recruitedPartyCount` therefore caps at 1 — `target>1` is
    // engine-impossible with the frozen engine, so L8 ships target:1
    // (NOT the arbitration's illustrative 4).
    const data = loadScenarioData(L8_DIR);
    expect(data.map.victoryCondition).toEqual({
      kind: 'recruit-count',
      target: 1,
      unitTemplateId: 'cockroach',
    });
  });

  it('has the six positional POSTs at their canonical coordinates and ownership', () => {
    const { state } = loadScenario(L8_DIR, 1);
    const post = (id: string) => state.posts.get(id as PostId);
    expect(post('hatch')?.location).toEqual({ plane: 'floor', x: 5, y: 8 });
    expect(post('spider-nest')?.location).toEqual({ plane: 'floor', x: 4, y: 1 });
    expect(post('trunk')?.location).toEqual({ plane: 'floor', x: 5, y: 5 });
    expect(post('rafter-beam')?.location).toEqual({ plane: 'ceiling', x: 5, y: 5 });
    expect(post('box-fort-west')?.location).toEqual({ plane: 'floor', x: 1, y: 4 });
    expect(post('box-fort-east')?.location).toEqual({ plane: 'floor', x: 8, y: 5 });
    expect(post('hatch')?.owner).toBe('ant');
    expect(post('spider-nest')?.owner).toBe('spider');
    for (const id of ['trunk', 'rafter-beam', 'box-fort-west', 'box-fort-east'] as const) {
      expect(post(id)?.owner).toBe('neutral');
    }
    expect(state.posts.size).toBe(6);
  });

  it('the floor is a cramped cruciform and the ceiling is clipped to a 5×5 + col-5 spine', () => {
    const a = loadScenario(L8_DIR, 1).state;
    const b = loadScenario(L8_DIR, 999).state;
    const kind = (s: GameState, plane: string, x: number, y: number) =>
      s.tiles.get(`${plane}:${String(x)},${String(y)}`)?.terrain.kind;
    // FLOOR: open iff in the vertical arm (cols 3–6) OR the horizontal
    // arm (rows 3–6); everything else obstacle (the sloping eaves /
    // wedged boxes). Orthogonally convex ⇒ strictly greedy-navigable.
    for (let y = 0; y <= 9; y++) {
      for (let x = 0; x <= 9; x++) {
        const open = (x >= 3 && x <= 6) || (y >= 3 && y <= 6);
        expect(kind(a, 'floor', x, y)).toBe(open ? 'open' : 'obstacle');
      }
    }
    // CEILING: open iff in the 5×5 patch (rows/cols 3–7) OR on the
    // 1-wide col-5 reach spine — the L8 identity (NOT a free flyer
    // lane, vs L6's fully-open ceiling).
    for (let y = 0; y <= 9; y++) {
      for (let x = 0; x <= 9; x++) {
        const open = (x >= 3 && x <= 7 && y >= 3 && y <= 7) || x === 5;
        expect(kind(a, 'ceiling', x, y)).toBe(open ? 'open' : 'obstacle');
      }
    }
    // The four wall planes are fully open 10×10 (spawn-safety scaffold).
    for (const plane of ['north-wall', 'south-wall', 'east-wall', 'west-wall']) {
      for (let y = 0; y <= 9; y++) {
        for (let x = 0; x <= 9; x++) expect(kind(a, plane, x, y)).toBe('open');
      }
    }
    // `static` ⇒ no per-seed map pass; obstacle count seed-invariant.
    const obstacles = (s: GameState): number =>
      [...s.tiles.values()].filter((t) => t.terrain.kind === 'obstacle').length;
    expect(obstacles(a)).toBe(obstacles(b));
    // floor 36 (the 4 eave corners, 3×3 each) + ceiling 70; walls 0.
    expect(obstacles(a)).toBe(36 + 70);
  });

  it('carries the RULED hypnotize full-power restore + recruit-rate band (static guards)', () => {
    // The Gameplay-PA L8 arbitration (§3.2/§4b,
    // `docs/debate/l8-gameplay-pa-arbitration.md`) RULES the L5
    // duration cap reversed to the exact pre-L5 originals
    // (`minControlTurns 2→5`, `maxControlTurns 3→10`; `successRate 0.8`
    // and `reboundImmunityTurns 10` UNCHANGED). The
    // `recruit.successRate` band was RE-RULED post-dep-#10 by the
    // recorded "RE-ARBITRATION (post-dep-#10, empirical)" amendment
    // (§R.2(a)): the original [0.25,0.35]/start-0.30 band was set when
    // the recruit lever was a hardcoded-inert constant (the §4g /
    // L4-§9 trap, in its purest form — the lever moved the engine not
    // at all). With dep #10 merged and L8 opted in, recruit.successRate
    // is a real continuous engine lever and the band is RE-RULED
    // **[0.40, 0.52]**, start 0.46. Guarded statically as ruled
    // invariants exactly as level4/level6 guard theirs — a silent
    // regression would re-inert the climax (the L4-§9 / §4d
    // falsification). NOTE (§4g, post-dep-#10): L8 opts in via
    // `map.json` `abilityParamsAuthoritative: true` (guarded above), so
    // the engine `engine/abilities.ts` `resolveAbilityParam` reads
    // THESE data params live — the guard protects the actual sim
    // tuning lever, not just spec-fidelity.
    const abilities = JSON.parse(fs.readFileSync(path.join(L8_DIR, 'abilities.json'), 'utf8')) as {
      abilities: { id: string; params: Record<string, number> }[];
    };
    const hyp = abilities.abilities.find((a) => a.id === 'hypnotize');
    expect(hyp?.params.minControlTurns).toBe(5);
    expect(hyp?.params.maxControlTurns).toBe(10);
    expect(hyp?.params.successRate).toBe(0.8);
    expect(hyp?.params.reboundImmunityTurns).toBe(10);
    const recruit = abilities.abilities.find((a) => a.id === 'recruit');
    // RE-RULED band (§R.2(a)): [0.40, 0.52], start 0.46 — replaces the
    // falsified [0.25, 0.35] / start 0.30 set under the §4g
    // inert-constant false premise.
    expect(recruit?.params.successRate).toBeGreaterThanOrEqual(0.4);
    expect(recruit?.params.successRate).toBeLessThanOrEqual(0.52);
  });

  it('carries the L6 units.json plane-affinity UNCHANGED (no L8 plane-affinity delta, §4d)', () => {
    const l8 = loadScenario(L8_DIR, 1).state;
    const l6 = loadScenario(L6_DIR, 1).state;
    for (const id of PLANE_AFFINITY_TEMPLATES) {
      expect(l8.unitTemplates.get(id as never)?.planeAffinity).toEqual(
        l6.unitTemplates.get(id as never)?.planeAffinity,
      );
    }
  });
});

describe('Level 8 (The Attic) — AIs', () => {
  it('both L8 AIs produce orders during a run', () => {
    const { events } = runOnce(1);
    expect(events.filter((e) => e.kind === 'party-moved').length).toBeGreaterThan(0);
  });

  it('a full scenario resolves decisively within the cap (recruit-count has no score path)', () => {
    const { finalState, events } = runOnce(1);
    expect(finalState.winner === 'ant' || finalState.winner === 'spider').toBe(true);
    const end = [...events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
    // recruit-count carries NO score tiebreak — the scenario-end never
    // attaches a scoreBreakdown (engine/turn.ts ~480).
    expect(end && 'scoreBreakdown' in end ? end.scoreBreakdown : undefined).toBeUndefined();
  });

  it('ant wins ONLY by recruiting the cockroach party (recruit-count semantics)', () => {
    // On every ANT win at least one ant-faction party must carry a
    // living `cockroach` unit (the engine `recruitedPartyCount`).
    for (const seed of [2, 3, 4, 5, 6, 7, 8]) {
      const { finalState } = runOnce(seed);
      if (finalState.winner !== 'ant') continue;
      let recruited = 0;
      for (const p of finalState.parties.values()) {
        if (p.faction !== 'ant') continue;
        if (p.units.some((u) => u.templateId === ('cockroach' as never) && u.currentHp > 0)) {
          recruited += 1;
        }
      }
      expect(recruited).toBeGreaterThanOrEqual(1);
    }
  });

  it('recruit-count resolves decisively (0 score-resolved) over a seed sweep', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const { events } = runOnce(seed);
      const end = [...events].reverse().find((e) => e.kind === 'scenario-end');
      expect(end && 'scoreBreakdown' in end ? end.scoreBreakdown : undefined).toBeUndefined();
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
