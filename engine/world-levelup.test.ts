import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadScenarioData } from './state.ts';
import type { Stats, UnitId, UnitTemplate, UnitTemplateId } from './types.ts';
import {
  applyLevelUp,
  applyRosterLevelUps,
  effectiveStats,
  HP_PER_LEVEL,
  levelForXp,
  primaryStatForTemplate,
  xpForLevel,
} from './world-levelup.ts';
import type { LeveledWorldUnit } from './world-levelup.ts';
import type { WorldRoster, WorldUnit } from './world-state.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const mkUnit = (over: Partial<WorldUnit> = {}): WorldUnit => ({
  id: 'u1' as UnitId,
  templateId: 'ant-footman' as UnitTemplateId,
  currentHp: 6,
  level: 1,
  xp: 0,
  charisma: 50,
  promoted: false,
  item: null,
  ...over,
});

describe('engine/world-levelup', () => {
  describe('xpForLevel (triangular curve)', () => {
    it('matches the documented thresholds', () => {
      expect(xpForLevel(1)).toBe(0);
      expect(xpForLevel(2)).toBe(100);
      expect(xpForLevel(3)).toBe(300);
      expect(xpForLevel(4)).toBe(600);
      expect(xpForLevel(5)).toBe(1000);
    });
  });

  describe('levelForXp', () => {
    it('maps XP totals to the right level', () => {
      expect(levelForXp(0)).toBe(1);
      expect(levelForXp(99)).toBe(1);
      expect(levelForXp(100)).toBe(2);
      expect(levelForXp(299)).toBe(2);
      expect(levelForXp(300)).toBe(3);
      expect(levelForXp(1000)).toBe(5);
    });
  });

  describe('primaryStatForTemplate', () => {
    it('routes mages to intelligence, archers to agility, footmen to attack', () => {
      const data = loadScenarioData(DATA_DIR);
      const byId = new Map<UnitTemplateId, UnitTemplate>();
      for (const t of data.units.templates) {
        byId.set(t.id as UnitTemplateId, {
          id: t.id as UnitTemplateId,
          name: t.name,
          faction: t.faction,
          size: t.size,
          slotCost: t.slotCost,
          movement: t.movement,
          baseStats: t.baseStats,
          abilities: [],
          tags: t.tags,
          planeAffinity: t.planeAffinity,
        });
      }
      expect(primaryStatForTemplate(byId.get('ant-mage' as UnitTemplateId))).toBe('intelligence');
      expect(primaryStatForTemplate(byId.get('ant-archer' as UnitTemplateId))).toBe('agility');
      expect(primaryStatForTemplate(byId.get('ant-footman' as UnitTemplateId))).toBe('attack');
    });
  });

  describe('applyLevelUp', () => {
    const footman: UnitTemplate = {
      id: 'ant-footman' as UnitTemplateId,
      name: 'Ant Footman',
      faction: 'ant',
      size: 'small',
      slotCost: 1,
      movement: 'ground',
      baseStats: { hp: 6, attack: 7, agility: 5, armor: 2, intelligence: 1, constitution: 7 },
      abilities: [],
      tags: ['melee', 'infantry'],
      planeAffinity: {
        floor: { attack: 1, armor: 1 },
        ceiling: { attack: -1, armor: 0 },
        wall: { attack: 0, armor: 0 },
      },
    };

    it('grants no growth below the next threshold and re-heals to max', () => {
      const r = applyLevelUp(mkUnit({ xp: 50, currentHp: 1 }), footman, 6);
      expect(r.levelsGained).toBe(0);
      expect(r.unit.level).toBe(1);
      expect(r.unit.currentHp).toBe(6);
      expect(r.unit.levelUpBonus).toEqual({ hp: 0, attack: 0, agility: 0, intelligence: 0 });
    });

    it('levels a footman and grants +2 HP and +1 attack per level', () => {
      const r = applyLevelUp(mkUnit({ xp: 300, currentHp: 1 }), footman, 6);
      expect(r.levelsGained).toBe(2); // L1 -> L3
      expect(r.unit.level).toBe(3);
      expect(r.unit.levelUpBonus.hp).toBe(2 * HP_PER_LEVEL);
      expect(r.unit.levelUpBonus.attack).toBe(2);
      expect(r.unit.levelUpBonus.agility).toBe(0);
      // Re-healed to (templateMax + bonus hp).
      expect(r.unit.currentHp).toBe(6 + 2 * HP_PER_LEVEL);
    });

    it('accumulates bonus across successive applications', () => {
      const first = applyLevelUp(mkUnit({ xp: 100 }), footman, 6);
      expect(first.unit.level).toBe(2);
      const second = applyLevelUp({ ...first.unit, xp: 300 }, footman, 6);
      expect(second.unit.level).toBe(3);
      expect(second.unit.levelUpBonus.hp).toBe(2 * HP_PER_LEVEL);
      expect(second.unit.levelUpBonus.attack).toBe(2);
    });
  });

  describe('applyRosterLevelUps', () => {
    it('levels the whole roster and counts gains', () => {
      const data = loadScenarioData(DATA_DIR);
      const templates = new Map<UnitTemplateId, UnitTemplate>();
      for (const t of data.units.templates) {
        templates.set(t.id as UnitTemplateId, {
          id: t.id as UnitTemplateId,
          name: t.name,
          faction: t.faction,
          size: t.size,
          slotCost: t.slotCost,
          movement: t.movement,
          baseStats: t.baseStats,
          abilities: [],
          tags: t.tags,
          planeAffinity: t.planeAffinity,
        });
      }
      const roster: WorldRoster = {
        faction: 'ant',
        units: [
          mkUnit({ id: 'a' as UnitId, xp: 300 }),
          mkUnit({ id: 'b' as UnitId, templateId: 'ant-archer' as UnitTemplateId, xp: 100 }),
          mkUnit({ id: 'c' as UnitId, xp: 0 }),
        ],
        partyAssignments: [],
      };
      const out = applyRosterLevelUps(roster, templates);
      expect(out.unitsLeveled).toBe(2);
      expect(out.totalLevelsGained).toBe(2 + 1);
      expect(out.roster.units[2]?.level).toBe(1);
    });
  });

  describe('effectiveStats', () => {
    it('folds the level-up bonus onto base template stats', () => {
      const base: Stats = {
        hp: 6,
        attack: 7,
        agility: 5,
        armor: 2,
        intelligence: 1,
        constitution: 7,
      };
      const leveled: LeveledWorldUnit = {
        ...mkUnit(),
        levelUpBonus: { hp: 4, attack: 2, agility: 0, intelligence: 0 },
      };
      expect(effectiveStats(base, leveled)).toEqual({
        hp: 10,
        attack: 9,
        agility: 5,
        armor: 2,
        intelligence: 1,
        constitution: 7,
      });
      // No bonus -> base unchanged.
      expect(effectiveStats(base, mkUnit())).toEqual(base);
    });
  });
});
