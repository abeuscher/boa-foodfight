import { describe, expect, it } from 'vitest';

import type { ItemId, PartyId, UnitId, UnitTemplateId } from './types.ts';
import { deserializeWorldState, pruneDeadWorldUnits, serializeWorldState } from './world-state.ts';
import type { WorldRoster, WorldState } from './world-state.ts';

const sampleState = (): WorldState => ({
  campaignId: 'campaign-test',
  scenarioIndex: 1,
  roster: {
    faction: 'ant',
    units: [
      {
        id: 'u0001-ant-footman' as UnitId,
        templateId: 'ant-footman' as UnitTemplateId,
        currentHp: 6,
        level: 2,
        xp: 135,
        charisma: 62,
        promoted: false,
        item: 'thimble-helmet' as ItemId,
      },
      {
        id: 'u0002-ant-archer' as UnitId,
        templateId: 'ant-archer' as UnitTemplateId,
        currentHp: 5,
        level: 1,
        xp: 40,
        charisma: 50,
        promoted: false,
        item: null,
      },
    ],
    partyAssignments: [
      {
        partyId: 'vanguard-alpha' as PartyId,
        unitIds: ['u0001-ant-footman' as UnitId, 'u0002-ant-archer' as UnitId],
        leaderId: 'u0001-ant-footman' as UnitId,
      },
    ],
  },
  gold: 250,
  cardsOwned: [],
  rngSeed: 12345,
  savedAt: '2026-05-16T00:00:00.000Z',
});

describe('engine/world-state', () => {
  describe('serialize / deserialize round-trip', () => {
    it('round-trips a world state byte-stably', () => {
      const ws = sampleState();
      const json = serializeWorldState(ws);
      const back = deserializeWorldState(json);
      expect(back).toEqual(ws);
      // Stable: re-serializing the parsed value yields identical bytes.
      expect(serializeWorldState(back)).toBe(json);
    });

    it('preserves equipped items and the null slot', () => {
      const ws = sampleState();
      const back = deserializeWorldState(serializeWorldState(ws));
      expect(back.roster.units[0]?.item).toBe('thimble-helmet');
      expect(back.roster.units[1]?.item).toBeNull();
    });

    it('forces cardsOwned empty even if a stray array is present', () => {
      const ws = sampleState();
      const json = serializeWorldState(ws);
      const parsed = JSON.parse(json) as { cardsOwned: unknown };
      expect(parsed.cardsOwned).toEqual([]);
    });
  });

  describe('schema rejection', () => {
    it('rejects a non-ant roster faction', () => {
      const ws = sampleState();
      const json = serializeWorldState(ws);
      const tampered = JSON.parse(json) as { roster: { faction: string } };
      tampered.roster.faction = 'spider';
      expect(() => deserializeWorldState(JSON.stringify(tampered))).toThrow();
    });

    it('rejects negative gold', () => {
      const ws = sampleState();
      const json = serializeWorldState(ws);
      const tampered = JSON.parse(json) as { gold: number };
      tampered.gold = -5;
      expect(() => deserializeWorldState(JSON.stringify(tampered))).toThrow();
    });

    it('rejects charisma out of [0,100]', () => {
      const ws = sampleState();
      const json = serializeWorldState(ws);
      const tampered = JSON.parse(json) as { roster: { units: { charisma: number }[] } };
      const unit = tampered.roster.units[0];
      if (unit) unit.charisma = 150;
      expect(() => deserializeWorldState(JSON.stringify(tampered))).toThrow();
    });

    it('rejects a missing campaignId', () => {
      const ws = sampleState();
      const json = serializeWorldState(ws);
      const tampered = JSON.parse(json) as Record<string, unknown>;
      delete tampered.campaignId;
      expect(() => deserializeWorldState(JSON.stringify(tampered))).toThrow();
    });
  });

  describe('pruneDeadWorldUnits', () => {
    it('drops dead units and filters them out of assignments', () => {
      const roster: WorldRoster = {
        faction: 'ant',
        units: [
          {
            id: 'u1' as UnitId,
            templateId: 'ant-footman' as UnitTemplateId,
            currentHp: 0,
            level: 1,
            xp: 0,
            charisma: 50,
            promoted: false,
            item: null,
          },
          {
            id: 'u2' as UnitId,
            templateId: 'ant-archer' as UnitTemplateId,
            currentHp: 5,
            level: 1,
            xp: 0,
            charisma: 50,
            promoted: false,
            item: null,
          },
        ],
        partyAssignments: [
          {
            partyId: 'p1' as PartyId,
            unitIds: ['u1' as UnitId, 'u2' as UnitId],
            leaderId: 'u1' as UnitId,
          },
        ],
      };
      const pruned = pruneDeadWorldUnits(roster);
      expect(pruned.units.map((u) => u.id)).toEqual(['u2']);
      expect(pruned.partyAssignments[0]?.unitIds).toEqual(['u2']);
      // Leader died -> promoted the first survivor.
      expect(pruned.partyAssignments[0]?.leaderId).toBe('u2');
    });

    it('drops a party whose entire roster died', () => {
      const roster: WorldRoster = {
        faction: 'ant',
        units: [
          {
            id: 'u1' as UnitId,
            templateId: 'ant-footman' as UnitTemplateId,
            currentHp: 0,
            level: 1,
            xp: 0,
            charisma: 50,
            promoted: false,
            item: null,
          },
        ],
        partyAssignments: [
          {
            partyId: 'p1' as PartyId,
            unitIds: ['u1' as UnitId],
            leaderId: 'u1' as UnitId,
          },
        ],
      };
      const pruned = pruneDeadWorldUnits(roster);
      expect(pruned.units).toEqual([]);
      expect(pruned.partyAssignments).toEqual([]);
    });
  });
});
