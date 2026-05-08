/**
 * Tests for engine/formation.ts and the formation-aware battle path
 * (mechanics memo §1.5). The auto-assignment, capacity caps,
 * promotion mechanic, and combat ordering are exercised here. Battle-
 * level interactions reuse the Level-1 fixture for unit templates so
 * stat math matches production.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveBattle, type BattleInput } from './battle.ts';
import {
  assignFormation,
  formationOrAllFront,
  preferredRow,
  promoteReserve,
  slotForUnit,
} from './formation.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type {
  GameState,
  Party,
  PartyId,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const noAbilities = {
  version: 1 as const,
  abilities: [
    {
      id: 'noop' as const,
      name: 'noop',
      category: 'information' as const,
      target: 'self' as const,
      uses: 1,
      cooldown: 0,
      params: {},
      description: 'noop',
    },
  ],
};

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const ANT_TILE: TileCoord = { plane: 'floor', x: 4, y: 4 };

const mkUnit = (state: GameState, templateId: string, unitId: string): Unit => {
  const tmpl = state.unitTemplates.get(templateId as UnitTemplateId);
  if (!tmpl) throw new Error(`fixture: unknown template '${templateId}'`);
  return {
    id: unitId as UnitId,
    templateId: tmpl.id,
    currentHp: tmpl.baseStats.hp,
    level: 1,
    xp: 0,
  };
};

const installParties = (state: GameState, parties: readonly Party[]): GameState => {
  const m = new Map(state.parties);
  for (const p of parties) m.set(p.id, p);
  return { ...state, parties: m };
};

const neutralInput = (attacker: Party, defender: Party): BattleInput => ({
  attacker,
  defender,
  postDefense: 0,
  queenProximityAttack: 1,
  queenProximityResilience: 1,
  attackerJellyAttack: 1,
  attackerJellyResilience: 1,
  defenderJellyAttack: 1,
  defenderJellyResilience: 1,
  abilities: noAbilities,
});

describe('assignFormation', () => {
  it('vanguard-bravo: ant-footman + ant-tank land in front, ant-mage + ant-archer in back', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Tiny synthetic party: 2 footmen + 1 tank + 1 archer + 1 mage.
    const units: Unit[] = [
      mkUnit(state, 'ant-footman', 'u-foot-1'),
      mkUnit(state, 'ant-footman', 'u-foot-2'),
      mkUnit(state, 'ant-tank', 'u-tank-1'),
      mkUnit(state, 'ant-archer', 'u-arch-1'),
      mkUnit(state, 'ant-mage', 'u-mage-1'),
    ];
    const f = assignFormation(units, state.unitTemplates);
    expect(f.front).toEqual(['u-foot-1', 'u-foot-2', 'u-tank-1']);
    expect(f.back).toEqual(['u-arch-1', 'u-mage-1']);
    expect(f.reserve).toEqual([]);
  });

  it('caps at 3 front + 2 back; ≥6 melee party puts overflow in reserve', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const units: Unit[] = [
      mkUnit(state, 'ant-footman', 'u-1'),
      mkUnit(state, 'ant-footman', 'u-2'),
      mkUnit(state, 'ant-footman', 'u-3'),
      mkUnit(state, 'ant-footman', 'u-4'),
      mkUnit(state, 'ant-footman', 'u-5'),
      mkUnit(state, 'ant-footman', 'u-6'),
    ];
    const f = assignFormation(units, state.unitTemplates);
    expect(f.front).toEqual(['u-1', 'u-2', 'u-3']);
    expect(f.back).toEqual(['u-4', 'u-5']);
    expect(f.reserve).toEqual(['u-6']);
  });

  it('two parties built from identical rosters produce identical formations (determinism)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const buildUnits = (): Unit[] => [
      mkUnit(state, 'ant-mage', 'u-mage'),
      mkUnit(state, 'ant-archer', 'u-arch'),
      mkUnit(state, 'ant-footman', 'u-foot'),
    ];
    const f1 = assignFormation(buildUnits(), state.unitTemplates);
    const f2 = assignFormation(buildUnits(), state.unitTemplates);
    expect(f1.front).toEqual(f2.front);
    expect(f1.back).toEqual(f2.back);
    expect(f1.reserve).toEqual(f2.reserve);
  });

  it("queen-guard's queen + 4 elite layout: queen front (huge), 2 elites front, 2 elites back", () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const units: Unit[] = [
      mkUnit(state, 'spider-queen', 'sq-1'),
      mkUnit(state, 'spider-elite', 'se-1'),
      mkUnit(state, 'spider-elite', 'se-2'),
      mkUnit(state, 'spider-elite', 'se-3'),
      mkUnit(state, 'spider-elite', 'se-4'),
    ];
    const f = assignFormation(units, state.unitTemplates);
    // queen has tags ['queen', 'leader-eligible'] but size 'huge' wins → front.
    // spider-elite has tags ['melee', 'elite', 'queen-guard'] → front.
    // Capacity: 3 front (queen + 2 elites), then 2 back, 0 reserve.
    expect(f.front).toEqual(['sq-1', 'se-1', 'se-2']);
    expect(f.back).toEqual(['se-3', 'se-4']);
    expect(f.reserve).toEqual([]);
  });

  it('spider-soldier + spider-elite roster: all melee, fills front then back', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const units: Unit[] = [
      mkUnit(state, 'spider-soldier', 'ss-1'),
      mkUnit(state, 'spider-soldier', 'ss-2'),
      mkUnit(state, 'spider-elite', 'se-1'),
      mkUnit(state, 'spider-elite', 'se-2'),
    ];
    const f = assignFormation(units, state.unitTemplates);
    // All four are melee → all want front. Cap is 3, so 4th overflows
    // to back.
    expect(f.front).toEqual(['ss-1', 'ss-2', 'se-1']);
    expect(f.back).toEqual(['se-2']);
    expect(f.reserve).toEqual([]);
  });

  it('preferredRow: ant-archer (ranged) → back, ant-footman (melee) → front', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const arch = state.unitTemplates.get('ant-archer' as UnitTemplateId);
    const foot = state.unitTemplates.get('ant-footman' as UnitTemplateId);
    expect(arch).toBeDefined();
    expect(foot).toBeDefined();
    // ant-archer tags: ['ranged']. FRONT_TAGS does not include
    // 'ranged'; size 'small'; BACK_TAGS hits 'ranged' → back.
    expect(preferredRow(arch!)).toBe('back');
    // ant-footman tags: ['melee', 'infantry']. FRONT_TAGS includes
    // 'melee' → front.
    expect(preferredRow(foot!)).toBe('front');
  });
});

describe('promoteReserve', () => {
  it('lowest-id reserve unit promotes into the named slot', () => {
    const formation = {
      front: ['u-1' as UnitId],
      back: ['u-2' as UnitId],
      reserve: ['u-9' as UnitId, 'u-3' as UnitId, 'u-7' as UnitId],
    };
    const live = new Map<UnitId, boolean>();
    const r = promoteReserve(formation, 'front', live);
    expect(r.promotedId).toBe('u-3');
    expect(r.formation.front).toContain('u-3');
    expect(r.formation.reserve).not.toContain('u-3');
  });

  it('returns null when reserve is empty', () => {
    const formation = {
      front: ['u-1' as UnitId],
      back: [],
      reserve: [],
    };
    const r = promoteReserve(formation, 'front', new Map());
    expect(r.promotedId).toBeNull();
    expect(r.formation).toEqual(formation);
  });

  it('skips dead reserve units', () => {
    const formation = {
      front: [],
      back: [],
      reserve: ['u-3' as UnitId, 'u-5' as UnitId],
    };
    const live = new Map<UnitId, boolean>([
      ['u-3' as UnitId, false],
      ['u-5' as UnitId, true],
    ]);
    const r = promoteReserve(formation, 'back', live);
    expect(r.promotedId).toBe('u-5');
  });
});

describe('battle: front row absorbs damage first', () => {
  it('back-row units stay alive while front row takes hits', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Attacker: 3 ant-footmen front + 1 ant-mage back.
    const f1 = mkUnit(base, 'ant-footman', 'a-f-1');
    const f2 = mkUnit(base, 'ant-footman', 'a-f-2');
    const f3 = mkUnit(base, 'ant-footman', 'a-f-3');
    const m1 = mkUnit(base, 'ant-mage', 'a-m-1');
    const atk: Party = {
      id: 'p-atk' as PartyId,
      faction: 'ant',
      units: [f1, f2, f3, m1],
      leaderId: f1.id,
      location: ANT_TILE,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation: {
        front: [f1.id, f2.id, f3.id],
        back: [m1.id],
        reserve: [],
      },
    };
    // Defender: 2 spider-soldiers front, 1 spider-spinner back.
    const s1 = mkUnit(base, 'spider-soldier', 'd-s-1');
    const s2 = mkUnit(base, 'spider-soldier', 'd-s-2');
    const sp = mkUnit(base, 'spider-spinner', 'd-sp-1');
    const def: Party = {
      id: 'p-def' as PartyId,
      faction: 'spider',
      units: [s1, s2, sp],
      leaderId: s1.id,
      location: ANT_TILE,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation: {
        front: [s1.id, s2.id],
        back: [sp.id],
        reserve: [],
      },
    };
    const state = installParties(base, [atk, def]);
    const out = resolveBattle(state, neutralInput(atk, def), createRng(7), makeTickClock());
    // Spider-spinner (back row) should be untouched while spider
    // front-row soldiers absorb. We run with seeded rng; soldiers
    // have only 13 HP each so they should take damage first. Verify
    // that across all actions, every defender target is from the
    // front row until both front units die.
    const seenSoldierDeath = { d1: false, d2: false };
    for (const round of out.result.rounds) {
      for (const action of round.actions) {
        // Actions whose defender is the spinner are illegal until
        // both soldiers are dead.
        if (action.defenderId === sp.id) {
          expect(seenSoldierDeath.d1 && seenSoldierDeath.d2).toBe(true);
        }
        if (action.defenderId === s1.id && action.killed) seenSoldierDeath.d1 = true;
        if (action.defenderId === s2.id && action.killed) seenSoldierDeath.d2 = true;
      }
    }
  });
});

describe('battle: reserve promotes when a front-row casualty fires', () => {
  it('emits formation-promoted when front row loses a unit and a reserve is available', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Attacker: 1 huge potato-bug front, no back, but reserve has a
    // footman ready.
    const pb = mkUnit(base, 'ant-potato-bug', 'a-pb-1');
    const reserveFoot = mkUnit(base, 'ant-footman', 'a-foot-r');
    const atk: Party = {
      id: 'p-atk-promote' as PartyId,
      faction: 'ant',
      units: [pb, reserveFoot],
      leaderId: pb.id,
      location: ANT_TILE,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation: {
        front: [pb.id],
        back: [],
        reserve: [reserveFoot.id],
      },
    };
    // Defender: a huge spider-queen so the potato-bug actually dies
    // (spider-queen atk 8 vs potato-bug armor 3 ≈ 5 damage/round; 12 HP
    // → ~3 rounds). We run with high posture / heavy attacker.
    const sq = mkUnit(base, 'spider-queen', 'd-q-1');
    // Pre-damage the potato-bug so it dies in round 1 — keeps the
    // test deterministic without tuning RNG seed.
    const pbWeak: Unit = { ...pb, currentHp: 1 };
    const atkWeakened: Party = { ...atk, units: [pbWeak, reserveFoot] };
    const def: Party = {
      id: 'p-def-promote' as PartyId,
      faction: 'spider',
      units: [sq],
      leaderId: sq.id,
      location: ANT_TILE,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation: {
        front: [sq.id],
        back: [],
        reserve: [],
      },
    };
    const state = installParties(base, [atkWeakened, def]);
    const out = resolveBattle(
      state,
      neutralInput(atkWeakened, def),
      createRng(99),
      makeTickClock(),
    );
    const promotedEvents = out.events.filter((e) => e.kind === 'formation-promoted');
    // Expect at least one promotion event for the attacker.
    expect(promotedEvents.length).toBeGreaterThanOrEqual(1);
    const first = promotedEvents[0];
    expect(first?.kind).toBe('formation-promoted');
    if (first?.kind === 'formation-promoted') {
      expect(first.partyId).toBe(atkWeakened.id);
      expect(first.slot).toBe('front');
      expect(first.unitId).toBe(reserveFoot.id);
    }
  });
});

describe('battle: empty front -> back row takes damage', () => {
  it('after front row is wiped, back-row units start being targeted', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Defender: dead front row + living back row.
    const dead = { ...mkUnit(base, 'spider-soldier', 'd-fr'), currentHp: 0 };
    const back = mkUnit(base, 'spider-spinner', 'd-bk');
    const def: Party = {
      id: 'p-def-empty-front' as PartyId,
      faction: 'spider',
      units: [dead, back],
      leaderId: back.id,
      location: ANT_TILE,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation: {
        front: [dead.id],
        back: [back.id],
        reserve: [],
      },
    };
    const f1 = mkUnit(base, 'ant-footman', 'a-f-1');
    const atk: Party = {
      id: 'p-atk-empty-front' as PartyId,
      faction: 'ant',
      units: [f1],
      leaderId: f1.id,
      location: ANT_TILE,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      formation: { front: [f1.id], back: [], reserve: [] },
    };
    const state = installParties(base, [atk, def]);
    const out = resolveBattle(state, neutralInput(atk, def), createRng(13), makeTickClock());
    // Every defender target should be the back-row spinner since
    // front is empty.
    const targetedIds = new Set<string>();
    for (const r of out.result.rounds) {
      for (const a of r.actions) {
        if (a.attackerId === f1.id) targetedIds.add(String(a.defenderId));
      }
    }
    expect(targetedIds.has(String(back.id))).toBe(true);
    expect(targetedIds.has(String(dead.id))).toBe(false);
  });
});

describe('battle: back-row melee gets -1 attack', () => {
  it('a back-row footman has reduced attack vs the same footman in front', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Use a single-unit attacker in back row (melee) and observe the
    // damage falls compared to the same unit in front row.
    const buildAttacker = (slot: 'front' | 'back'): Party => {
      const f = mkUnit(base, 'ant-footman', `a-foot-${slot}`);
      return {
        id: `p-atk-${slot}` as PartyId,
        faction: 'ant',
        units: [f],
        leaderId: f.id,
        location: ANT_TILE,
        orders: [],
        posture: 'fight',
        strategyModifiers: [],
        jellyDoses: 0,
        leaderless: false,
        formation:
          slot === 'front'
            ? { front: [f.id], back: [], reserve: [] }
            : { front: [], back: [f.id], reserve: [] },
      };
    };
    const buildDefender = (id: string): Party => {
      const s = mkUnit(base, 'spider-soldier', `${id}-d`);
      return {
        id: id as PartyId,
        faction: 'spider',
        units: [s],
        leaderId: s.id,
        location: ANT_TILE,
        orders: [],
        posture: 'fight',
        strategyModifiers: [],
        jellyDoses: 0,
        leaderless: false,
        formation: { front: [s.id], back: [], reserve: [] },
      };
    };
    const atkFront = buildAttacker('front');
    const atkBack = buildAttacker('back');
    const defF = buildDefender('p-def-vs-front');
    const defB = buildDefender('p-def-vs-back');
    const sFront = installParties(base, [atkFront, defF]);
    const sBack = installParties(base, [atkBack, defB]);
    const SEED = 555;
    const outFront = resolveBattle(
      sFront,
      neutralInput(atkFront, defF),
      createRng(SEED),
      makeTickClock(),
    );
    const outBack = resolveBattle(
      sBack,
      neutralInput(atkBack, defB),
      createRng(SEED),
      makeTickClock(),
    );
    // Per-action damage: compare the FIRST attack action from the
    // attacker side. The seeded RNG draws line up because both
    // battles use the same seed and the same agility-order pass
    // (runRound calls computeAgilityOrder once per round on the
    // same number of units), so the first attacker action is on
    // the same RNG state. The penalty floor is 1 but with footman
    // atk 7 vs soldier armor 3 there's a 1-damage gap.
    const firstAtkDmg = (rounds: typeof outFront.result.rounds, attackerId: UnitId): number => {
      for (const r of rounds) {
        for (const a of r.actions) {
          if (a.attackerId === attackerId) return a.damage;
        }
      }
      return 0;
    };
    const frontFirst = firstAtkDmg(outFront.result.rounds, atkFront.units[0]!.id);
    const backFirst = firstAtkDmg(outBack.result.rounds, atkBack.units[0]!.id);
    expect(backFirst).toBeLessThan(frontFirst);
  });
});

describe('formationOrAllFront / slotForUnit', () => {
  it('legacy parties without a formation default to all-front', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const u1 = mkUnit(state, 'ant-footman', 'leg-1');
    const u2 = mkUnit(state, 'ant-mage', 'leg-2');
    const party: Party = {
      id: 'p-legacy' as PartyId,
      faction: 'ant',
      units: [u1, u2],
      leaderId: u1.id,
      location: ANT_TILE,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      // formation omitted on purpose.
    };
    const f = formationOrAllFront(party);
    expect(f.front).toEqual([u1.id, u2.id]);
    expect(f.back).toEqual([]);
    expect(f.reserve).toEqual([]);
    expect(slotForUnit(f, u2.id)).toBe('front');
  });
});
