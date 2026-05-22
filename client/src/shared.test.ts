import { describe, expect, it } from 'vitest';

import type { ItemId, UnitId, UnitTemplateId } from '../../engine/types.ts';
import type { WorldRoster, WorldUnit } from '../../engine/world-state.ts';

import { INITIAL_STATE, ITEMS, RECRUITS, SHOP_CATALOG, TEMPLATES } from './fixture.ts';
import {
  antCount,
  inventoryEntries,
  isLeaderEligible,
  itemName,
  noticeOf,
  templateName,
  unitLabel,
} from './shared.ts';

const mkUnit = (id: string, templateId: string, item: ItemId | null = null): WorldUnit => ({
  id: id as UnitId,
  templateId: templateId as UnitTemplateId,
  currentHp: 1,
  level: 1,
  xp: 0,
  charisma: 50,
  promoted: false,
  item,
});

const rosterWith = (inventory?: readonly ItemId[]): WorldRoster => ({
  faction: 'ant',
  units: [mkUnit('a', 'ant-footman'), mkUnit('b', 'ant-scout')],
  partyAssignments: [],
  ...(inventory !== undefined ? { inventory } : {}),
});

describe('client fixture', () => {
  it('loads a non-empty world seed + catalogs', () => {
    expect(INITIAL_STATE.roster.units.length).toBeGreaterThan(0);
    expect(TEMPLATES.length).toBeGreaterThan(0);
    expect(RECRUITS.recruits.length).toBeGreaterThan(0);
    expect(SHOP_CATALOG.items.length).toBeGreaterThan(0);
  });
});

describe('noticeOf', () => {
  it('maps an ok result to an ok notice with the supplied text', () => {
    expect(noticeOf({ ok: true }, 'done')).toEqual({ kind: 'ok', text: 'done' });
  });

  it('maps a failure to an error notice carrying the reason', () => {
    expect(noticeOf({ ok: false, error: 'nope' }, 'done')).toEqual({ kind: 'error', text: 'nope' });
  });

  it('falls back to a generic reason when none is given', () => {
    expect(noticeOf({ ok: false }, 'done')).toEqual({ kind: 'error', text: 'rejected' });
  });
});

describe('inventoryEntries', () => {
  it('counts a fungible multiset of owned items', () => {
    const inv = ['pad', 'pad', 'boots'] as ItemId[];
    expect(inventoryEntries(rosterWith(inv))).toEqual([
      ['pad', 2],
      ['boots', 1],
    ]);
  });

  it('is empty when the roster has no inventory', () => {
    expect(inventoryEntries(rosterWith())).toEqual([]);
  });
});

describe('antCount', () => {
  it('counts all colony units (deployed + barracks)', () => {
    expect(antCount(rosterWith())).toBe(2);
    expect(antCount(INITIAL_STATE.roster)).toBe(INITIAL_STATE.roster.units.length);
  });
});

describe('name + tag helpers', () => {
  it('resolves a template name, falling back to the id', () => {
    const t = TEMPLATES[0]!;
    expect(templateName(t.id)).toBe(t.name);
    expect(templateName('mystery' as UnitTemplateId)).toBe('mystery');
  });

  it('labels a unit by its template name', () => {
    const t = TEMPLATES[0]!;
    expect(unitLabel(mkUnit('x', t.id))).toBe(t.name);
  });

  it('resolves an item name, falling back to the id', () => {
    const i = ITEMS[0]!;
    expect(itemName(i.id)).toBe(i.name);
    expect(itemName('mystery')).toBe('mystery');
  });

  it('reads leader-eligibility from template tags', () => {
    const eligible = TEMPLATES.find((t) => t.tags.includes('leader-eligible'));
    const plain = TEMPLATES.find((t) => !t.tags.includes('leader-eligible'));
    if (eligible) expect(isLeaderEligible(mkUnit('e', eligible.id))).toBe(true);
    if (plain) expect(isLeaderEligible(mkUnit('p', plain.id))).toBe(false);
  });
});
