import { describe, expect, it } from 'vitest';

import type { ItemId, PartyId, UnitId, UnitTemplate, UnitTemplateId } from './types.ts';
import {
  createParty,
  disbandParty,
  equipItem,
  moveUnit,
  partySlotUsage,
  swapLeader,
  unitEffectiveStats,
} from './world-organize.ts';
import type { WorldRoster, WorldUnit } from './world-state.ts';

const ZERO_AFF = {
  floor: { attack: 0, armor: 0 },
  ceiling: { attack: 0, armor: 0 },
  wall: { attack: 0, armor: 0 },
};

const mkTemplate = (
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

const TEMPLATES: UnitTemplate[] = [
  mkTemplate('footman', 'small', 1, ['melee']),
  mkTemplate('scout', 'small', 1, ['scout', 'leader-eligible']),
  mkTemplate('tank', 'large', 3, ['melee', 'heavy']),
];

const mkUnit = (id: string, templateId: string): WorldUnit => ({
  id: id as UnitId,
  templateId: templateId as UnitTemplateId,
  currentHp: 6,
  level: 1,
  xp: 0,
  charisma: 50,
  promoted: false,
  item: null,
});

const u = (id: string): UnitId => id as UnitId;
const p = (id: string): PartyId => id as PartyId;

/** alpha = {a1 footman(leader), a2 scout}; bravo = {b1 scout(leader)};
 *  idle pool: i1 footman (not leader-eligible), i2 scout (eligible). */
const mkRoster = (): WorldRoster => ({
  faction: 'ant',
  units: [
    mkUnit('a1', 'footman'),
    mkUnit('a2', 'scout'),
    mkUnit('b1', 'scout'),
    mkUnit('i1', 'footman'),
    mkUnit('i2', 'scout'),
  ],
  partyAssignments: [
    { partyId: p('alpha'), unitIds: [u('a1'), u('a2')], leaderId: u('a1') },
    { partyId: p('bravo'), unitIds: [u('b1')], leaderId: u('b1') },
  ],
});

describe('read accessors', () => {
  it('partySlotUsage reports used/cap/free', () => {
    expect(partySlotUsage(mkRoster(), p('alpha'), TEMPLATES)).toEqual({
      used: 2,
      cap: 9,
      free: 7,
    });
  });

  it('queen-guard gets the exceptional 12 cap', () => {
    expect(partySlotUsage(mkRoster(), p('queen-guard'), TEMPLATES).cap).toBe(12);
  });

  it('a party with no assignment reports used 0 against its cap', () => {
    expect(partySlotUsage(mkRoster(), p('ghost'), TEMPLATES)).toEqual({
      used: 0,
      cap: 9,
      free: 9,
    });
  });

  it('unitEffectiveStats folds the campaign level bonus', () => {
    const base = mkUnit('x', 'footman');
    expect(unitEffectiveStats(base, TEMPLATES)?.attack).toBe(7);
    const leveled: WorldUnit = {
      ...base,
      levelUpBonus: { hp: 4, attack: 3, agility: 1, intelligence: 0 },
    };
    const eff = unitEffectiveStats(leveled, TEMPLATES);
    expect(eff?.attack).toBe(10);
    expect(eff?.hp).toBe(10);
  });

  it('unitEffectiveStats is undefined for an unknown template', () => {
    expect(unitEffectiveStats(mkUnit('x', 'mystery'), TEMPLATES)).toBeUndefined();
  });
});

describe('moveUnit', () => {
  it('moves an idle unit into a party', () => {
    const r = moveUnit(mkRoster(), u('i1'), p('bravo'), TEMPLATES);
    expect(r.ok).toBe(true);
    const bravo = r.roster.partyAssignments.find((a) => a.partyId === p('bravo'));
    expect(bravo?.unitIds).toEqual([u('b1'), u('i1')]);
  });

  it('rejects an unknown unit', () => {
    const r = moveUnit(mkRoster(), u('nope'), p('alpha'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('unknown unit');
  });

  it('rejects a non-existent target party', () => {
    const r = moveUnit(mkRoster(), u('i1'), p('ghost'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('use createParty');
  });

  it('is idempotent when the unit is already in the target', () => {
    const r = moveUnit(mkRoster(), u('a1'), p('alpha'), TEMPLATES);
    expect(r.ok).toBe(true);
    expect(r.roster).toEqual(mkRoster());
  });

  it('rejects a move that exceeds the target slot cap', () => {
    // Fill bravo to 9 with small units, then a slot-3 tank won't fit.
    let roster = mkRoster();
    roster = {
      ...roster,
      units: [
        ...roster.units,
        ...Array.from({ length: 8 }, (_, i) => mkUnit(`f${String(i)}`, 'footman')),
        mkUnit('t1', 'tank'),
      ],
      partyAssignments: roster.partyAssignments.map((a) =>
        a.partyId === p('bravo')
          ? {
              ...a,
              unitIds: [a.leaderId, ...Array.from({ length: 8 }, (_, i) => u(`f${String(i)}`))],
            }
          : a,
      ),
    };
    const r = moveUnit(roster, u('t1'), p('bravo'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('slot capacity');
  });

  it('drops an emptied source party and reassigns an orphaned leader', () => {
    // a1 is alpha's leader; move it out → alpha keeps a2, leader→a2.
    const r1 = moveUnit(mkRoster(), u('a1'), p('bravo'), TEMPLATES);
    const alpha = r1.roster.partyAssignments.find((a) => a.partyId === p('alpha'));
    expect(alpha?.unitIds).toEqual([u('a2')]);
    expect(alpha?.leaderId).toBe(u('a2'));
    // Now move a2 out too → alpha is empty → assignment dropped.
    const r2 = moveUnit(r1.roster, u('a2'), p('bravo'), TEMPLATES);
    expect(r2.roster.partyAssignments.some((a) => a.partyId === p('alpha'))).toBe(false);
  });
});

describe('createParty', () => {
  it('forms a new party from idle units', () => {
    const r = createParty(mkRoster(), p('charlie'), [u('i2')], u('i2'), TEMPLATES);
    expect(r.ok).toBe(true);
    expect(r.roster.partyAssignments.find((a) => a.partyId === p('charlie'))).toEqual({
      partyId: p('charlie'),
      unitIds: [u('i2')],
      leaderId: u('i2'),
    });
  });

  it('pulls members out of their existing parties', () => {
    const r = createParty(mkRoster(), p('charlie'), [u('a2'), u('i1')], u('a2'), TEMPLATES);
    expect(r.ok).toBe(true);
    const alpha = r.roster.partyAssignments.find((a) => a.partyId === p('alpha'));
    expect(alpha?.unitIds).toEqual([u('a1')]);
  });

  it('rejects a duplicate party id', () => {
    const r = createParty(mkRoster(), p('alpha'), [u('i1')], u('i1'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('already exists');
  });

  it('rejects an empty unit list', () => {
    const r = createParty(mkRoster(), p('charlie'), [], u('i1'), TEMPLATES);
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate unit ids', () => {
    const r = createParty(mkRoster(), p('charlie'), [u('i1'), u('i1')], u('i1'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('duplicate');
  });

  it('rejects a leader not in the set', () => {
    const r = createParty(mkRoster(), p('charlie'), [u('i1')], u('a1'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('member');
  });

  it('rejects a leader that is not leader-eligible', () => {
    // i1 is a footman (no leader-eligible tag).
    const r = createParty(mkRoster(), p('charlie'), [u('i1')], u('i1'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('leader-eligible');
  });

  it('rejects a set that exceeds the slot cap', () => {
    // 10 scouts (slotCost 1, leader-eligible) → 10 > 9 cap; the leader
    // passes eligibility so the capacity check is what rejects it.
    let roster = mkRoster();
    const big = Array.from({ length: 10 }, (_, i) => mkUnit(`g${String(i)}`, 'scout'));
    roster = { ...roster, units: [...roster.units, ...big] };
    const ids = big.map((b) => b.id);
    const r = createParty(roster, p('charlie'), ids, u('g0'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('slot capacity');
  });
});

describe('disbandParty', () => {
  it('disbands a party; its units stay in the roster pool', () => {
    const r = disbandParty(mkRoster(), p('bravo'));
    expect(r.ok).toBe(true);
    expect(r.roster.partyAssignments.some((a) => a.partyId === p('bravo'))).toBe(false);
    expect(r.roster.units.some((unit) => unit.id === u('b1'))).toBe(true);
  });

  it('refuses to disband the queen-guard party', () => {
    let roster = mkRoster();
    roster = {
      ...roster,
      partyAssignments: [
        ...roster.partyAssignments,
        { partyId: p('queen-guard'), unitIds: [u('b1')], leaderId: u('b1') },
      ],
    };
    const r = disbandParty(roster, p('queen-guard'));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('queen-guard');
  });

  it('rejects a non-existent party', () => {
    const r = disbandParty(mkRoster(), p('ghost'));
    expect(r.ok).toBe(false);
  });
});

describe('swapLeader', () => {
  it('promotes another member to leader', () => {
    const r = swapLeader(mkRoster(), p('alpha'), u('a2'), TEMPLATES);
    expect(r.ok).toBe(true);
    expect(r.roster.partyAssignments.find((a) => a.partyId === p('alpha'))?.leaderId).toBe(u('a2'));
  });

  it('rejects a unit not in the party', () => {
    const r = swapLeader(mkRoster(), p('alpha'), u('b1'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('not in party');
  });

  it('rejects a unit that is not leader-eligible', () => {
    // alpha = [a1 footman, a2 scout]; footman has no leader-eligible tag.
    const r = swapLeader(mkRoster(), p('alpha'), u('a1'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('leader-eligible');
  });

  it('rejects a non-existent party', () => {
    const r = swapLeader(mkRoster(), p('ghost'), u('a1'), TEMPLATES);
    expect(r.ok).toBe(false);
  });
});

describe('equipItem', () => {
  it('equips and clears an item', () => {
    const eq = equipItem(mkRoster(), u('a1'), 'sword' as ItemId);
    expect(eq.ok).toBe(true);
    expect(eq.roster.units.find((unit) => unit.id === u('a1'))?.item).toBe('sword');
    const cleared = equipItem(eq.roster, u('a1'), null);
    expect(cleared.roster.units.find((unit) => unit.id === u('a1'))?.item).toBeNull();
  });

  it('rejects an unknown unit', () => {
    const r = equipItem(mkRoster(), u('nope'), 'sword' as ItemId);
    expect(r.ok).toBe(false);
  });
});

describe('purity', () => {
  it('never mutates the input roster', () => {
    const roster = mkRoster();
    const snapshot = JSON.stringify(roster);
    moveUnit(roster, u('i1'), p('alpha'), TEMPLATES);
    createParty(roster, p('z'), [u('i1')], u('i1'), TEMPLATES);
    disbandParty(roster, p('bravo'));
    swapLeader(roster, p('alpha'), u('a2'), TEMPLATES);
    equipItem(roster, u('a1'), 'sword' as ItemId);
    expect(JSON.stringify(roster)).toBe(snapshot);
  });
});
