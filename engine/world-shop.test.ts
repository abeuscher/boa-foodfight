import { describe, expect, it } from 'vitest';

import type { PartyId, UnitId, UnitTemplateId } from './types.ts';
import {
  applyShopPurchase,
  MERC_PARTY_ID,
  MOUSE_MERC_COST,
  MOUSE_MERC_TEMPLATE,
} from './world-shop.ts';
import type { WorldState } from './world-state.ts';

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
      {
        partyId: 'vanguard-alpha' as PartyId,
        unitIds: ['u1' as UnitId],
        leaderId: 'u1' as UnitId,
      },
    ],
  },
  gold,
  cardsOwned: [],
  rngSeed: 4242,
  savedAt: '2026-05-16T00:00:00.000Z',
});

describe('engine/world-shop', () => {
  it('recruits a mouse-merc when gold is sufficient', () => {
    const ws = mkState(800);
    const res = applyShopPurchase(ws, {
      kind: 'recruit',
      templateId: MOUSE_MERC_TEMPLATE,
      cost: MOUSE_MERC_COST,
    });
    expect(res.applied).toBe(true);
    expect(res.state.gold).toBe(800 - MOUSE_MERC_COST);
    expect(res.state.roster.units.length).toBe(2);
    const merc = res.state.roster.units.find((u) => u.templateId === MOUSE_MERC_TEMPLATE);
    expect(merc).toBeDefined();
    expect(merc?.currentHp).toBe(25);
    expect(merc?.charisma).toBe(0);
    const mercParty = res.state.roster.partyAssignments.find((a) => a.partyId === MERC_PARTY_ID);
    expect(mercParty?.unitIds).toContain(res.recruitedUnitId);
  });

  it('is a no-op when gold is insufficient', () => {
    const ws = mkState(100);
    const res = applyShopPurchase(ws, {
      kind: 'recruit',
      templateId: MOUSE_MERC_TEMPLATE,
      cost: MOUSE_MERC_COST,
    });
    expect(res.applied).toBe(false);
    expect(res.state).toEqual(ws);
  });

  it('produces a deterministic recruit id from the campaign seed', () => {
    const a = applyShopPurchase(mkState(800), {
      kind: 'recruit',
      templateId: MOUSE_MERC_TEMPLATE,
      cost: MOUSE_MERC_COST,
    });
    const b = applyShopPurchase(mkState(800), {
      kind: 'recruit',
      templateId: MOUSE_MERC_TEMPLATE,
      cost: MOUSE_MERC_COST,
    });
    expect(a.recruitedUnitId).toBe(b.recruitedUnitId);
  });

  it('appends to an existing mercenaries party on a second recruit', () => {
    const first = applyShopPurchase(mkState(2000), {
      kind: 'recruit',
      templateId: MOUSE_MERC_TEMPLATE,
      cost: MOUSE_MERC_COST,
    });
    const second = applyShopPurchase(first.state, {
      kind: 'recruit',
      templateId: MOUSE_MERC_TEMPLATE,
      cost: MOUSE_MERC_COST,
    });
    const mercParty = second.state.roster.partyAssignments.find((a) => a.partyId === MERC_PARTY_ID);
    expect(mercParty?.unitIds.length).toBe(2);
    expect(second.state.roster.units.length).toBe(3);
  });
});
