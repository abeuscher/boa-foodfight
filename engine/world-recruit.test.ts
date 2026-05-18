import { describe, expect, it } from 'vitest';

import type { RecruitsFile } from './schemas/recruits.ts';
import type { PartyId, UnitId, UnitTemplate, UnitTemplateId } from './types.ts';
import { recruitArrivalLevel, recruitUnit } from './world-recruit.ts';
import type { WorldState } from './world-state.ts';

const ZERO_AFF = {
  floor: { attack: 0, armor: 0 },
  ceiling: { attack: 0, armor: 0 },
  wall: { attack: 0, armor: 0 },
};

const mkTemplate = (id: string, tags: string[]): UnitTemplate => ({
  id: id as UnitTemplateId,
  name: id,
  faction: 'ant',
  size: 'small',
  slotCost: 1,
  movement: 'ground',
  baseStats: { hp: 6, attack: 7, agility: 5, armor: 2, intelligence: 1, constitution: 7 },
  abilities: [],
  tags,
  planeAffinity: ZERO_AFF,
});

// Real ids so isPromotableTemplate (PROMOTION_TREE) resolves correctly:
// ant-footman is promotable; cockroach is not.
const TEMPLATES: UnitTemplate[] = [
  mkTemplate('ant-footman', ['melee']),
  mkTemplate('cockroach', ['swarm']),
];

const CATALOG: RecruitsFile = {
  version: 1,
  recruits: [
    { templateId: 'ant-footman', cost: 30 },
    { templateId: 'cockroach', cost: 40 },
  ],
};

const mkState = (gold: number, levels: number[] = []): WorldState => ({
  campaignId: 'camp-recruit',
  scenarioIndex: 2,
  roster: {
    faction: 'ant',
    units: levels.map((lvl, i) => ({
      id: `u${String(i)}` as UnitId,
      templateId: 'ant-footman' as UnitTemplateId,
      currentHp: 6,
      level: lvl,
      xp: 0,
      charisma: 50,
      promoted: false,
      item: null,
    })),
    partyAssignments:
      levels.length > 0
        ? [{ partyId: 'alpha' as PartyId, unitIds: ['u0' as UnitId], leaderId: 'u0' as UnitId }]
        : [],
  },
  gold,
  cardsOwned: [],
  rngSeed: 4242,
  savedAt: '2026-05-18T00:00:00.000Z',
});

describe('recruitArrivalLevel', () => {
  it('empty roster → level 1', () => {
    expect(recruitArrivalLevel(mkState(0).roster)).toBe(1);
  });

  it('lower-median minus one, clamped at 1', () => {
    expect(recruitArrivalLevel(mkState(0, [4]).roster)).toBe(3);
    expect(recruitArrivalLevel(mkState(0, [2, 4]).roster)).toBe(1); // lower median = 2
    expect(recruitArrivalLevel(mkState(0, [3, 5, 5]).roster)).toBe(4);
    expect(recruitArrivalLevel(mkState(0, [1, 1, 1]).roster)).toBe(1);
  });

  it('soft-cap: barracks-resident low units drag the median down', () => {
    expect(recruitArrivalLevel(mkState(0, [10, 10, 10]).roster)).toBe(9);
    expect(recruitArrivalLevel(mkState(0, [1, 1, 1, 10, 10, 10]).roster)).toBe(1);
  });
});

describe('recruitUnit', () => {
  it('recruits a unit: deducts gold, appends to roster (barracks)', () => {
    const r = recruitUnit(mkState(100), 'ant-footman' as UnitTemplateId, CATALOG, TEMPLATES);
    expect(r.ok).toBe(true);
    expect(r.state.gold).toBe(70);
    expect(r.state.roster.units).toHaveLength(1);
    expect(r.recruitedUnitId).toBeDefined();
    // Lands unassigned (barracks) — not in any party.
    expect(r.state.roster.partyAssignments).toHaveLength(0);
    expect(r.state.roster.units[0]?.id).toBe(r.recruitedUnitId);
  });

  it('seeds charisma per the promotable rule', () => {
    const footman = recruitUnit(mkState(100), 'ant-footman' as UnitTemplateId, CATALOG, TEMPLATES);
    expect(footman.state.roster.units[0]?.charisma).toBe(50);
    const roach = recruitUnit(mkState(100), 'cockroach' as UnitTemplateId, CATALOG, TEMPLATES);
    expect(roach.state.roster.units[0]?.charisma).toBe(0);
  });

  it('is deterministic for the same state', () => {
    const a = recruitUnit(mkState(100), 'ant-footman' as UnitTemplateId, CATALOG, TEMPLATES);
    const b = recruitUnit(mkState(100), 'ant-footman' as UnitTemplateId, CATALOG, TEMPLATES);
    expect(a.recruitedUnitId).toBe(b.recruitedUnitId);
  });

  it('rejects insufficient gold (state unchanged)', () => {
    const s = mkState(10);
    const r = recruitUnit(s, 'ant-footman' as UnitTemplateId, CATALOG, TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('insufficient gold');
    expect(r.state).toBe(s);
  });

  it('rejects a template not in the catalog', () => {
    const r = recruitUnit(mkState(100), 'ant-mage' as UnitTemplateId, CATALOG, TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('not recruitable');
  });

  it('rejects an unknown template (in catalog, missing from templates)', () => {
    const cat: RecruitsFile = {
      version: 1,
      recruits: [{ templateId: 'ghost', cost: 5 }],
    };
    const r = recruitUnit(mkState(100), 'ghost' as UnitTemplateId, cat, TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('unknown template');
  });

  it('scales the recruit to median-minus-one with a computed bonus', () => {
    const r = recruitUnit(
      mkState(100, [3, 5, 5]),
      'ant-footman' as UnitTemplateId,
      CATALOG,
      TEMPLATES,
    );
    const recruited = r.state.roster.units.find((u) => u.id === r.recruitedUnitId);
    expect(recruited?.level).toBe(4); // median 5 − 1
    // footman primary = attack; 3 levels of growth (level−1).
    expect(recruited?.levelUpBonus).toEqual({ hp: 6, attack: 3, agility: 0, intelligence: 0 });
    expect(recruited?.currentHp).toBe(12); // base 6 + bonus 6
  });

  it('a level-1 recruit omits levelUpBonus (byte-stable)', () => {
    const r = recruitUnit(
      mkState(100, [1, 1]),
      'ant-footman' as UnitTemplateId,
      CATALOG,
      TEMPLATES,
    );
    const recruited = r.state.roster.units.find((u) => u.id === r.recruitedUnitId);
    expect(recruited?.level).toBe(1);
    expect(recruited?.levelUpBonus).toBeUndefined();
  });
});
