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
    { itemId: 'leather-pad', cost: 40, stock: 100 },
    { itemId: 'mead', cost: 10, stock: 100 },
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

const mkState = (gold: number): WorldState => ({
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
        item: null,
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
  it('buys a persistent item into the inventory pool when affordable', () => {
    const res = buyItem(mkState(100), PAD, catalog, items);
    expect(res.ok).toBe(true);
    expect(res.state.gold).toBe(60);
    expect(res.state.roster.inventory).toEqual(['leather-pad']);
    expect(res.purchasedItemId).toBe('leather-pad');
    // It does not equip — the unit's slot is untouched.
    expect(res.state.roster.units[0]?.item).toBeNull();
  });

  it('appends to an existing inventory on a second buy', () => {
    const first = buyItem(mkState(200), PAD, catalog, items);
    const second = buyItem(first.state, PAD, catalog, items);
    expect(second.state.roster.inventory).toEqual(['leather-pad', 'leather-pad']);
    expect(second.state.gold).toBe(120);
  });

  it('rejects insufficient gold (state unchanged)', () => {
    const ws = mkState(20);
    const res = buyItem(ws, PAD, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('insufficient gold');
    expect(res.state).toEqual(ws);
  });

  it('rejects an item not in the catalog', () => {
    const res = buyItem(mkState(100), 'boots' as ItemId, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not for sale');
  });

  it('rejects a non-persistent item even if catalogued', () => {
    const res = buyItem(mkState(100), MEAD, catalog, items);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not a persistent item');
  });

  it('does not mutate the input state', () => {
    const ws = mkState(100);
    buyItem(ws, PAD, catalog, items);
    expect(ws.gold).toBe(100);
    expect(ws.roster.inventory).toBeUndefined();
  });
});
