import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  baseMovementAllowance,
  containsQueen,
  isAlive,
  livingUnits,
  slotsUsed,
  totalHp,
} from './parties.ts';
import { loadScenario } from './state.ts';
import type {
  MovementMode,
  Party,
  PartyId,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const QUEEN_PARTY_ID = 'queen-guard' as PartyId;

/**
 * Build a synthetic party of N identical units using a synthetic template
 * with the given movement mode. Used to test movement-allowance behavior
 * without depending on level-1 data exclusively.
 */
const fixtureMovementParty = (
  modes: readonly MovementMode[],
): {
  party: Party;
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>;
} => {
  const templates = new Map<UnitTemplateId, UnitTemplate>();
  const units: Unit[] = [];
  modes.forEach((mode, idx) => {
    const tid = `tmpl-${mode}-${String(idx)}` as UnitTemplateId;
    templates.set(tid, {
      id: tid,
      name: `t-${mode}`,
      faction: 'ant',
      size: 'small',
      slotCost: 1,
      movement: mode,
      baseStats: { hp: 5, attack: 1, agility: 1, armor: 0, intelligence: 1, constitution: 1 },
      abilities: [],
      tags: [],
    });
    units.push({
      id: `u-${String(idx)}` as UnitId,
      templateId: tid,
      currentHp: 5,
      level: 1,
      xp: 0,
    });
  });
  const leaderId = units[0]?.id ?? ('u-0' as UnitId);
  const party: Party = {
    id: 'fix-party' as PartyId,
    faction: 'ant',
    units,
    leaderId,
    location: { plane: 'floor', x: 0, y: 0 },
    orders: [],
    posture: 'fight',
    strategyModifiers: [],
    jellyDoses: 0,
    leaderless: false,
  };
  return { party, templates };
};

describe('engine/parties', () => {
  describe('slotsUsed', () => {
    it("returns 12 for the Queen's party in the loaded Level 1 state", () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const queen = state.parties.get(QUEEN_PARTY_ID);
      expect(queen).toBeDefined();
      if (!queen) return;
      expect(slotsUsed(queen, state.unitTemplates)).toBe(12);
    });

    it('returns at most 8 for every non-queen Level 1 party', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      for (const party of state.parties.values()) {
        // Both factions' queen-guard parties get the exceptional 12-slot capacity.
        if (containsQueen(party, state.unitTemplates)) continue;
        expect(slotsUsed(party, state.unitTemplates)).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('isAlive', () => {
    it('is false at 0 HP', () => {
      const dead: Unit = {
        id: 'u-dead' as UnitId,
        templateId: 'any' as UnitTemplateId,
        currentHp: 0,
        level: 1,
        xp: 0,
      };
      expect(isAlive(dead)).toBe(false);
    });

    it('is true at positive HP', () => {
      const alive: Unit = {
        id: 'u-alive' as UnitId,
        templateId: 'any' as UnitTemplateId,
        currentHp: 1,
        level: 1,
        xp: 0,
      };
      expect(isAlive(alive)).toBe(true);
    });
  });

  describe('livingUnits', () => {
    it('excludes dead units', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const queen = state.parties.get(QUEEN_PARTY_ID);
      expect(queen).toBeDefined();
      if (!queen) return;
      const deadOne = queen.units[0];
      expect(deadOne).toBeDefined();
      if (!deadOne) return;
      const partyWithCasualty: Party = {
        ...queen,
        units: [{ ...deadOne, currentHp: 0 }, ...queen.units.slice(1)],
      };
      const living = livingUnits(partyWithCasualty);
      expect(living).toHaveLength(queen.units.length - 1);
      expect(living.some((u) => u.id === deadOne.id)).toBe(false);
    });

    it('returns an empty array when every unit is dead', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const queen = state.parties.get(QUEEN_PARTY_ID);
      expect(queen).toBeDefined();
      if (!queen) return;
      const allDead: Party = {
        ...queen,
        units: queen.units.map((u) => ({ ...u, currentHp: 0 })),
      };
      expect(livingUnits(allDead)).toHaveLength(0);
    });
  });

  describe('totalHp', () => {
    it('sums over living units only', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const queen = state.parties.get(QUEEN_PARTY_ID);
      expect(queen).toBeDefined();
      if (!queen) return;
      const u0 = queen.units[0];
      const u1 = queen.units[1];
      expect(u0).toBeDefined();
      expect(u1).toBeDefined();
      if (!u0 || !u1) return;
      const mixed: Party = {
        ...queen,
        units: [
          { ...u0, currentHp: 0 },
          { ...u1, currentHp: 3 },
          ...queen.units.slice(2).map((u) => ({ ...u, currentHp: 0 })),
        ],
      };
      expect(totalHp(mixed)).toBe(3);
    });
  });

  describe('baseMovementAllowance', () => {
    it('returns 3 for an all-ground party', () => {
      const { party, templates } = fixtureMovementParty(['ground', 'ground', 'ground']);
      expect(baseMovementAllowance(party, templates)).toBe(3);
    });

    it('returns 4 for an all-flying party', () => {
      const { party, templates } = fixtureMovementParty(['flying', 'flying']);
      expect(baseMovementAllowance(party, templates)).toBe(4);
    });

    it("falls to the slowest mode's value when mixed", () => {
      // restricted=2, flying=4 -> slowest is restricted -> 2
      const { party, templates } = fixtureMovementParty(['flying', 'restricted', 'ground']);
      expect(baseMovementAllowance(party, templates)).toBe(2);
    });

    it('returns 0 when there are no living units', () => {
      const { party, templates } = fixtureMovementParty(['ground']);
      const dead: Party = { ...party, units: party.units.map((u) => ({ ...u, currentHp: 0 })) };
      expect(baseMovementAllowance(dead, templates)).toBe(0);
    });
  });

  describe('containsQueen', () => {
    it('is true for the queen-bearing ant party', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      const queen = state.parties.get(QUEEN_PARTY_ID);
      expect(queen).toBeDefined();
      if (!queen) return;
      expect(containsQueen(queen, state.unitTemplates)).toBe(true);
    });

    it('is false for other parties', () => {
      const { state } = loadScenario(DATA_DIR, 1);
      for (const party of state.parties.values()) {
        if (party.id === QUEEN_PARTY_ID) continue;
        if (party.id === ('web-guard' as PartyId)) continue; // spider queen
        expect(containsQueen(party, state.unitTemplates)).toBe(false);
      }
    });
  });
});
