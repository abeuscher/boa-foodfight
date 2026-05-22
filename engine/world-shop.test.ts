import { describe, expect, it } from 'vitest';

import type { ItemTemplate } from './schemas/items.ts';
import type { ShopCatalogFile } from './schemas/shop-catalog.ts';
import type { ItemId, PartyId, UnitId, UnitTemplateId } from './types.ts';
import { buyItem } from './world-shop.ts';
import type { WorldState } from './world-state.ts';

const PAD = 'leather-pad' as ItemId;
const MEAD = 'mead' as ItemId;

const catalog: ShopCatalogFile = {
  version: 1,
  items: [
    { itemId: 'leather-pad', cost: 40 },
    { itemId: 'mead', cost: 10 },
  ],
};

const items: readonly ItemTemplate[] = [
  {
    id: 'leather-pad',
    name: 'Leather Pad',
    kind: 'persistent',
    effect: 'armor',
    magnitude: 1,
    description: 'x',
  },
  { id: 'mead', name: 'Mead', kind: 'consumable', effect: 'heal', magnitude: 0, description: 'x' },
];

const mkState = (gold: number, item: ItemId | null = null): WorldState => ({
  campaignId: 'camp-shop',
  scenarioIndex: 1,
  roster: {
    faction: 'ant',
    units: [
      {
        id: 'u1' as UnitId,
        templateId: 'ant-footman' as UnitTemplateId,
        currentHp: 6,
        level: 1,
        xp: 0,
        charisma: 50,
        promoted: false,
        item,
      },
    ],
    partyAssignments: [
      { partyId: 'vanguard-alpha' as PartyId, unitIds: ['u1' as UnitId], leaderId: 'u1' as UnitId },
    ],
  },
  gold,
  cardsOwned: [],
  rngSeed: 4242,
  savedAt: '2026-05-16T00:00:00.000Z',
});

describe('engine/world-shop buyItem', () => {
  it('buys and equips a persistent item when affordable', () => {
    const res = buyItem(mkState(100), PAD, 'u1' as UnitId, catalog, items);
    expect(res.ok).toBe(true);
    expect(res.state.gold).toBe(60);
    expect(res.state.roster.units[0]?.item).toBe('leather-pad');
    expect(res.equippedUnitId).toBe('u1');
  });

  it('rejects insufficient gold (state unchanged)', () => {
    const ws = mkState(20);
    const res = buyItem(ws, PAD, 'u1' as UnitId, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('insufficient gold');
    expect(res.state).toEqual(ws);
  });

  it('rejects an item not in the catalog', () => {
    const res = buyItem(mkState(100), 'boots' as ItemId, 'u1' as UnitId, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not for sale');
  });

  it('rejects a non-persistent item even if catalogued', () => {
    const res = buyItem(mkState(100), MEAD, 'u1' as UnitId, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not a persistent item');
  });

  it('rejects an unknown target unit', () => {
    const res = buyItem(mkState(100), PAD, 'nope' as UnitId, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('unknown unit');
  });

  it('rejects buying onto an already-occupied slot', () => {
    const res = buyItem(mkState(100, 'boots' as ItemId), PAD, 'u1' as UnitId, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('already carries an item');
  });

  it('does not mutate the input state', () => {
    const ws = mkState(100);
    buyItem(ws, PAD, 'u1' as UnitId, catalog, items);
    expect(ws.gold).toBe(100);
    expect(ws.roster.units[0]?.item).toBeNull();
  });
});
