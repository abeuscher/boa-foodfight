import { describe, expect, it } from 'vitest';

import type { ItemId, PartyId, UnitId, UnitTemplate, UnitTemplateId } from './types.ts';
import {
  barracksUnits,
  createParty,
  disbandParty,
  dismissUnit,
  equipItem,
  moveUnit,
  partySlotUsage,
  removeUnit,
  setUnitRank,
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
  mkTemplate('queen', 'huge', 4, ['queen', 'leader-eligible']),
];

/** queen-guard = {q queen(leader), g1 footman}; plus idle scout s1. */
const mkQueenRoster = (): WorldRoster => ({
  faction: 'ant',
  units: [mkUnit('q', 'queen'), mkUnit('g1', 'footman'), mkUnit('s1', 'scout')],
  partyAssignments: [{ partyId: p('queen-guard'), unitIds: [u('q'), u('g1')], leaderId: u('q') }],
});

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
  inventory: ['sword' as ItemId],
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

describe('barracksUnits', () => {
  it('returns roster units that are in no party, in roster order', () => {
    expect(barracksUnits(mkRoster()).map((u2) => u2.id)).toEqual([u('i1'), u('i2')]);
  });

  it('a disbanded squad’s members fall into the barracks', () => {
    const r = disbandParty(mkRoster(), p('bravo'));
    expect(barracksUnits(r.roster).map((u2) => u2.id)).toEqual([u('b1'), u('i1'), u('i2')]);
  });

  it('moving an idle unit into a squad removes it from the barracks', () => {
    const r = moveUnit(mkRoster(), u('i1'), p('alpha'), TEMPLATES);
    expect(barracksUnits(r.roster).map((u2) => u2.id)).toEqual([u('i2')]);
  });

  it('is empty when every unit is assigned', () => {
    const roster: WorldRoster = {
      faction: 'ant',
      units: [mkUnit('a1', 'footman'), mkUnit('a2', 'scout')],
      partyAssignments: [{ partyId: p('alpha'), unitIds: [u('a1'), u('a2')], leaderId: u('a2') }],
    };
    expect(barracksUnits(roster)).toEqual([]);
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
  it('draws an item from inventory to equip, and returns it on unequip', () => {
    const eq = equipItem(mkRoster(), u('a1'), 'sword' as ItemId);
    expect(eq.ok).toBe(true);
    expect(eq.roster.units.find((unit) => unit.id === u('a1'))?.item).toBe('sword');
    expect(eq.roster.inventory).toEqual([]); // consumed from the pool
    const cleared = equipItem(eq.roster, u('a1'), null);
    expect(cleared.roster.units.find((unit) => unit.id === u('a1'))?.item).toBeNull();
    expect(cleared.roster.inventory).toEqual(['sword']); // returned to the pool
  });

  it('rejects equipping an item that is not in the inventory', () => {
    const r = equipItem(mkRoster(), u('a1'), 'shield' as ItemId);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('not in the inventory');
  });

  it('rejects an unknown unit', () => {
    const r = equipItem(mkRoster(), u('nope'), 'sword' as ItemId);
    expect(r.ok).toBe(false);
  });
});

describe('setUnitRank', () => {
  it('records a sparse front placement on the unit’s squad', () => {
    const r = setUnitRank(mkRoster(), u('a2'), 'back', TEMPLATES);
    expect(r.ok).toBe(true);
    const alpha = r.roster.partyAssignments.find((a) => a.partyId === p('alpha'));
    expect(alpha?.formation).toEqual({ front: [], back: [u('a2')], reserve: [] });
  });

  it('re-ranking moves the unit between zones (no duplication)', () => {
    const r1 = setUnitRank(mkRoster(), u('a1'), 'front', TEMPLATES);
    const r2 = setUnitRank(r1.roster, u('a1'), 'reserve', TEMPLATES);
    const alpha = r2.roster.partyAssignments.find((a) => a.partyId === p('alpha'));
    expect(alpha?.formation).toEqual({ front: [], back: [], reserve: [u('a1')] });
  });

  it('rejects an unknown unit and an idle unit', () => {
    expect(setUnitRank(mkRoster(), u('nope'), 'front', TEMPLATES).ok).toBe(false);
    const idle = setUnitRank(mkRoster(), u('i1'), 'front', TEMPLATES);
    expect(idle.ok).toBe(false);
    expect(idle.error).toContain('not in a squad');
  });

  it('enforces the front (≤3) and back (≤2) caps', () => {
    let roster = mkRoster();
    roster = {
      ...roster,
      units: [...roster.units, ...['f1', 'f2', 'f3'].map((id) => mkUnit(id, 'footman'))],
      partyAssignments: roster.partyAssignments.map((a) =>
        a.partyId === p('alpha')
          ? { ...a, unitIds: [u('a1'), u('a2'), u('f1'), u('f2'), u('f3')] }
          : a,
      ),
    };
    let res = setUnitRank(roster, u('a1'), 'front', TEMPLATES);
    res = setUnitRank(res.roster, u('a2'), 'front', TEMPLATES);
    res = setUnitRank(res.roster, u('f1'), 'front', TEMPLATES);
    const full = setUnitRank(res.roster, u('f2'), 'front', TEMPLATES);
    expect(full.ok).toBe(false);
    expect(full.error).toContain('front rank is full');
  });

  it('queen-pin: queen may go front, never back/reserve', () => {
    expect(setUnitRank(mkQueenRoster(), u('q'), 'front', TEMPLATES).ok).toBe(true);
    const off = setUnitRank(mkQueenRoster(), u('q'), 'back', TEMPLATES);
    expect(off.ok).toBe(false);
    expect(off.error).toContain('pinned to the front');
  });
});

describe('removeUnit', () => {
  it('sends a squad member to the barracks', () => {
    const r = removeUnit(mkRoster(), u('a2'), TEMPLATES);
    expect(r.ok).toBe(true);
    expect(barracksUnits(r.roster).map((x) => x.id)).toContain(u('a2'));
  });

  it('auto-reassigns leader and drops an emptied squad', () => {
    const r1 = removeUnit(mkRoster(), u('a1'), TEMPLATES); // a1 was alpha leader
    expect(r1.roster.partyAssignments.find((a) => a.partyId === p('alpha'))?.leaderId).toBe(
      u('a2'),
    );
    const r2 = removeUnit(r1.roster, u('b1'), TEMPLATES); // bravo had only b1
    expect(r2.roster.partyAssignments.some((a) => a.partyId === p('bravo'))).toBe(false);
  });

  it('prunes the removed unit from a formation override', () => {
    const ranked = setUnitRank(mkRoster(), u('a2'), 'back', TEMPLATES);
    const removed = removeUnit(ranked.roster, u('a2'), TEMPLATES);
    const alpha = removed.roster.partyAssignments.find((a) => a.partyId === p('alpha'));
    expect(alpha?.formation?.back ?? []).not.toContain(u('a2'));
  });

  it('queen-pin: the queen cannot be removed; unknown rejected', () => {
    const q = removeUnit(mkQueenRoster(), u('q'), TEMPLATES);
    expect(q.ok).toBe(false);
    expect(q.error).toContain('queen');
    expect(removeUnit(mkRoster(), u('nope'), TEMPLATES).ok).toBe(false);
  });
});

describe('dismissUnit', () => {
  it('removes a unit from the roster entirely (from a squad)', () => {
    const r = dismissUnit(mkRoster(), u('a2'), TEMPLATES);
    expect(r.ok).toBe(true);
    expect(r.roster.units.some((x) => x.id === u('a2'))).toBe(false);
    expect(barracksUnits(r.roster).some((x) => x.id === u('a2'))).toBe(false);
  });

  it('works on a barracks-resident unit too', () => {
    const r = dismissUnit(mkRoster(), u('i1'), TEMPLATES);
    expect(r.ok).toBe(true);
    expect(r.roster.units.some((x) => x.id === u('i1'))).toBe(false);
  });

  it('queen-pin: the queen cannot be dismissed', () => {
    const q = dismissUnit(mkQueenRoster(), u('q'), TEMPLATES);
    expect(q.ok).toBe(false);
    expect(q.error).toContain('queen');
  });
});

describe('queen-pin on move/create', () => {
  it('moveUnit refuses to move the queen out of queen-guard', () => {
    let roster = mkQueenRoster();
    roster = {
      ...roster,
      partyAssignments: [
        ...roster.partyAssignments,
        { partyId: p('alpha'), unitIds: [u('s1')], leaderId: u('s1') },
      ],
    };
    const r = moveUnit(roster, u('q'), p('alpha'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('queen');
  });

  it('createParty refuses to include the queen', () => {
    const r = createParty(mkQueenRoster(), p('rogue'), [u('q')], u('q'), TEMPLATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('queen');
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
    setUnitRank(roster, u('a1'), 'back', TEMPLATES);
    removeUnit(roster, u('a2'), TEMPLATES);
    dismissUnit(roster, u('i2'), TEMPLATES);
    expect(JSON.stringify(roster)).toBe(snapshot);
  });
});
