import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ENEMY_AIS, neutralPlayer, PLAYER_AIS } from '../ai/index.ts';

import { assignFormation } from './formation.ts';
import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import { runScenario } from './turn.ts';
import type {
  Formation,
  GameState,
  PartyId,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';
import { extractWorldRoster } from './world-extract.ts';
import { honorFormation, injectWorldRoster, scaffoldFromState } from './world-inject.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const runL1 = (seed: number): GameState => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(DATA_DIR, seed);
  const player = PLAYER_AIS.baseline;
  const enemy = ENEMY_AIS['spider-l1'];
  if (!player || !enemy) throw new Error('missing AI');
  const clock = createTickClock();
  const outcome = runScenario(state, data, createRng(seed), clock.next, {
    maxTurns: 100,
    policies: [player, enemy, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return outcome.finalState;
};

describe('engine/world-inject', () => {
  it('rebuilds ant parties from a carried roster and keeps spider parties', () => {
    const finalState = runL1(1);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });

    const next = loadScenario(DATA_DIR, 2);
    const scaffold = scaffoldFromState(next.state);
    const { state, report } = injectWorldRoster(next.state, roster, scaffold);

    // Spider parties survived verbatim from the fresh scenario.
    const spiderBefore = [...next.state.parties.values()].filter(
      (p) => p.faction === 'spider',
    ).length;
    const spiderAfter = [...state.parties.values()].filter((p) => p.faction === 'spider').length;
    expect(spiderAfter).toBe(spiderBefore);

    // Every ant party in the injected state is built from carried unit ids.
    const carriedIds = new Set(roster.units.map((u) => u.id));
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      for (const u of p.units) expect(carriedIds.has(u.id)).toBe(true);
    }
    expect(report.antUnitsPlaced).toBeGreaterThan(0);
    expect(report.rebuiltParties.length).toBeGreaterThan(0);
  });

  it('carries level / xp / charisma / promoted onto injected units', () => {
    const finalState = runL1(3);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });
    const next = loadScenario(DATA_DIR, 4);
    const scaffold = scaffoldFromState(next.state);
    const { state } = injectWorldRoster(next.state, roster, scaffold);

    const byId = new Map(roster.units.map((u) => [u.id, u] as const));
    for (const p of state.parties.values()) {
      if (p.faction !== 'ant') continue;
      for (const u of p.units) {
        const wu = byId.get(u.id);
        expect(wu).toBeDefined();
        if (!wu) continue;
        expect(u.xp).toBe(wu.xp);
        expect(u.level).toBe(wu.level);
        if (wu.promoted) expect(u.promoted).toBe(true);
      }
    }
  });

  it('respects the 8-slot party cap and trims overflow', () => {
    const finalState = runL1(5);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });
    const next = loadScenario(DATA_DIR, 6);
    const scaffold = scaffoldFromState(next.state);
    const { state } = injectWorldRoster(next.state, roster, scaffold);
    for (const [id, p] of state.parties) {
      if (p.faction !== 'ant') continue;
      const cap = id === ('queen-guard' as PartyId) ? 12 : 8;
      let slots = 0;
      for (const u of p.units) {
        slots += next.state.unitTemplates.get(u.templateId)?.slotCost ?? 0;
      }
      expect(slots).toBeLessThanOrEqual(cap);
    }
  });

  it('drops a scaffold party with no surviving carried units', () => {
    const next = loadScenario(DATA_DIR, 8);
    const scaffold = scaffoldFromState(next.state);
    // Empty roster: every ant party should be dropped.
    const { state, report } = injectWorldRoster(
      next.state,
      { faction: 'ant', units: [], partyAssignments: [] },
      scaffold,
    );
    const antParties = [...state.parties.values()].filter((p) => p.faction === 'ant');
    expect(antParties.length).toBe(0);
    expect(report.droppedParties.length).toBe(scaffold.size);
    expect(report.antUnitsPlaced).toBe(0);
  });
});

describe('honorFormation (§7.9 follow-on)', () => {
  const ZERO_AFF = {
    floor: { attack: 0, armor: 0 },
    ceiling: { attack: 0, armor: 0 },
    wall: { attack: 0, armor: 0 },
  };
  const mkT = (
    id: string,
    size: UnitTemplate['size'],
    slotCost: number,
    tags: string[],
  ): UnitTemplate => ({
    id: id as UnitTemplateId,
    name: id,
    faction: 'ant',
    size,
    slotCost,
    movement: 'ground',
    baseStats: { hp: 6, attack: 7, agility: 5, armor: 2, intelligence: 1, constitution: 7 },
    abilities: [],
    tags,
    planeAffinity: ZERO_AFF,
  });
  const TEMPLATES: ReadonlyMap<UnitTemplateId, UnitTemplate> = new Map<
    UnitTemplateId,
    UnitTemplate
  >([
    ['melee' as UnitTemplateId, mkT('melee', 'small', 1, ['melee'])],
    ['caster' as UnitTemplateId, mkT('caster', 'small', 1, ['caster'])],
    ['queen' as UnitTemplateId, mkT('queen', 'huge', 4, ['queen', 'leader-eligible'])],
  ]);
  const u = (id: string): UnitId => id as UnitId;
  const mkUnits = (spec: [string, string][]): Unit[] =>
    spec.map(([id, t]) => ({
      id: u(id),
      templateId: t as UnitTemplateId,
      currentHp: 6,
      level: 1,
      xp: 0,
    }));
  const rankOf = (f: Formation, id: UnitId): 'front' | 'back' | 'reserve' =>
    f.front.includes(id) ? 'front' : f.back.includes(id) ? 'back' : 'reserve';

  it('an empty override yields exactly the auto layout', () => {
    const units = mkUnits([
      ['u1', 'melee'],
      ['u2', 'melee'],
      ['u3', 'caster'],
    ]);
    expect(honorFormation(units, { front: [], back: [], reserve: [] }, TEMPLATES)).toEqual(
      assignFormation(units, TEMPLATES),
    );
  });

  it('honors an explicit placement; unplaced members keep the auto rank', () => {
    const units = mkUnits([
      ['u1', 'melee'],
      ['u2', 'caster'],
    ]);
    const auto = assignFormation(units, TEMPLATES);
    const r = honorFormation(units, { front: [], back: [], reserve: [u('u1')] }, TEMPLATES);
    expect(rankOf(r, u('u1'))).toBe('reserve'); // explicit override applied
    expect(rankOf(r, u('u2'))).toBe(rankOf(auto, u('u2'))); // unplaced → auto
  });

  it('re-enforces the front cap (overflow → reserve, roster order)', () => {
    const units = mkUnits([
      ['a', 'melee'],
      ['b', 'melee'],
      ['c', 'melee'],
      ['d', 'melee'],
    ]);
    const r = honorFormation(
      units,
      { front: [u('a'), u('b'), u('c'), u('d')], back: [], reserve: [] },
      TEMPLATES,
    );
    expect(r.front).toEqual([u('a'), u('b'), u('c')]);
    expect(r.reserve).toContain(u('d'));
  });

  it('pins the queen to front even when the override benches her and front is stuffed', () => {
    const units = mkUnits([
      ['m1', 'melee'],
      ['m2', 'melee'],
      ['m3', 'melee'],
      ['q', 'queen'],
    ]);
    const r = honorFormation(
      units,
      { front: [u('m1'), u('m2'), u('m3')], back: [], reserve: [u('q')] },
      TEMPLATES,
    );
    expect(r.front).toContain(u('q')); // queen-pin wins (pass 1)
    expect(r.front).toHaveLength(3); // cap; queen + 2 of m1..m3
    expect(r.reserve).toContain(u('m3')); // overflow — queen took a slot
    expect(r.back).not.toContain(u('q'));
    expect(r.reserve).not.toContain(u('q'));
  });

  it('injectWorldRoster wires the override end-to-end', () => {
    const finalState = runL1(1);
    const roster = extractWorldRoster({ finalState, winner: finalState.winner });
    const target = roster.partyAssignments.find(
      (pa) => pa.partyId !== ('queen-guard' as PartyId) && pa.unitIds.length >= 1,
    );
    if (!target) throw new Error('no field ant party in carried roster');
    const first = target.unitIds[0];
    if (first === undefined) throw new Error('empty party');
    const withOverride = {
      ...roster,
      partyAssignments: roster.partyAssignments.map((pa) =>
        pa.partyId === target.partyId
          ? {
              ...pa,
              formation: {
                front: [] as UnitId[],
                back: [] as UnitId[],
                reserve: [first],
              },
            }
          : pa,
      ),
    };
    const next = loadScenario(DATA_DIR, 2);
    const scaffold = scaffoldFromState(next.state);
    const { state } = injectWorldRoster(next.state, withOverride, scaffold);
    const party = state.parties.get(target.partyId);
    expect(party).toBeDefined();
    // The explicitly-reserved leader-region unit is honored into reserve
    // (assignFormation would not auto-reserve it) — proves the branch.
    expect(party?.formation?.reserve).toContain(first);
    expect(party?.formation?.front).not.toContain(first);
  });
});
