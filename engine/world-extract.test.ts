import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ENEMY_AIS, neutralPlayer, PLAYER_AIS } from '../ai/index.ts';

import { createTickClock } from './replay.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import { runScenario } from './turn.ts';
import type { GameState, ItemId, UnitId, UnitTemplateId } from './types.ts';
import {
  extractGold,
  extractWorldRoster,
  scenarioXpAward,
  XP_ALIVE_AT_END,
  XP_PARTICIPATION,
  XP_WINNING_SIDE,
} from './world-extract.ts';
import type { WorldUnit } from './world-state.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const runL1 = (seed: number): GameState => {
  const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(DATA_DIR, seed);
  const player = PLAYER_AIS.baseline;
  const enemy = ENEMY_AIS['spider-l1'];
  if (!player || !enemy) throw new Error('missing AI');
  const clock = createTickClock();
  const outcome = runScenario(state, data, createRng(seed), clock.next, {
    maxTurns: 100,
    policies: [player, enemy, neutralPlayer],
    neutralSpawnEvents,
    itemSpawnEvents,
  });
  return outcome.finalState;
};

describe('engine/world-extract', () => {
  describe('scenarioXpAward', () => {
    it('awards participation + alive-at-end on a loss', () => {
      expect(scenarioXpAward(false)).toBe(XP_PARTICIPATION + XP_ALIVE_AT_END);
    });
    it('adds the winning-side bonus on a win', () => {
      expect(scenarioXpAward(true)).toBe(XP_PARTICIPATION + XP_ALIVE_AT_END + XP_WINNING_SIDE);
    });
  });

  describe('extractWorldRoster', () => {
    it('keeps only living ant units and applies the XP award', () => {
      const finalState = runL1(1);
      const roster = extractWorldRoster({ finalState, winner: finalState.winner });
      expect(roster.faction).toBe('ant');
      expect(roster.units.length).toBeGreaterThan(0);
      const award = scenarioXpAward(finalState.winner === 'ant');
      // Every extracted unit is an ant, at full HP, with the award added.
      for (const wu of roster.units) {
        const tmpl = finalState.unitTemplates.get(wu.templateId);
        expect(tmpl?.faction).toBe('ant');
        expect(wu.currentHp).toBe(tmpl?.baseStats.hp);
        // Find the source unit in the final state to verify xp delta.
        let sourceXp: number | undefined;
        for (const p of finalState.parties.values()) {
          const found = p.units.find((u) => u.id === wu.id);
          if (found) sourceXp = found.xp;
        }
        expect(sourceXp).toBeDefined();
        if (sourceXp !== undefined) expect(wu.xp).toBe(sourceXp + award);
      }
    });

    it('excludes dead and non-ant units from the roster', () => {
      const finalState = runL1(7);
      const roster = extractWorldRoster({ finalState, winner: finalState.winner });
      const ids = new Set<UnitId>(roster.units.map((u) => u.id));
      for (const p of finalState.parties.values()) {
        for (const u of p.units) {
          if (p.faction !== 'ant' || u.currentHp <= 0) {
            expect(ids.has(u.id)).toBe(false);
          }
        }
      }
    });

    it('records party assignments with a living leader', () => {
      const finalState = runL1(3);
      const roster = extractWorldRoster({ finalState, winner: finalState.winner });
      const livingIds = new Set<UnitId>(roster.units.map((u) => u.id));
      for (const a of roster.partyAssignments) {
        expect(a.unitIds.length).toBeGreaterThan(0);
        expect(livingIds.has(a.leaderId)).toBe(true);
        for (const id of a.unitIds) expect(livingIds.has(id)).toBe(true);
      }
    });

    it('carries an equipped item onto the first surviving member', () => {
      // Pick an ant party that still has at least one living unit, then
      // synthesize an equipped item on it. (The sorted-first ant party
      // may have been wiped depending on the seed.)
      const finalState = runL1(2);
      const antPartyId = [...finalState.parties.keys()].sort().find((id) => {
        const p = finalState.parties.get(id);
        return p?.faction === 'ant' && p.units.some((u) => u.currentHp > 0);
      });
      expect(antPartyId).toBeDefined();
      if (!antPartyId) return;
      const party = finalState.parties.get(antPartyId);
      if (!party) return;
      const withItem = new Map(finalState.parties);
      withItem.set(antPartyId, { ...party, item: 'thimble-helmet' as never });
      const state2: GameState = { ...finalState, parties: withItem };
      const roster = extractWorldRoster({ finalState: state2, winner: state2.winner });
      const sortedFirst = roster.partyAssignments.find((a) => a.partyId === antPartyId);
      expect(sortedFirst).toBeDefined();
      if (sortedFirst) {
        const firstUnitId = sortedFirst.unitIds[0];
        const firstWorldUnit = roster.units.find((u) => u.id === firstUnitId);
        expect(firstWorldUnit?.item).toBe('thimble-helmet');
      }
    });
  });

  describe('extractGold', () => {
    it('carries the ant gold total forward', () => {
      const finalState = runL1(1);
      expect(extractGold(finalState)).toBe(finalState.playerGold.ant);
      expect(extractGold(finalState)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('§7.8 carry-forward barracks', () => {
    const mkWU = (id: string, over: Partial<WorldUnit> = {}): WorldUnit => ({
      id: id as UnitId,
      templateId: 'ant-footman' as UnitTemplateId,
      currentHp: 6,
      level: 1,
      xp: 0,
      charisma: 50,
      promoted: false,
      item: null,
      ...over,
    });

    it('appends undeployed units verbatim, in no party assignment', () => {
      const finalState = runL1(1);
      const benched = mkWU('barracks-vet', {
        level: 3,
        xp: 250,
        promoted: true,
        item: 'sword' as ItemId,
      });
      const roster = extractWorldRoster({
        finalState,
        winner: finalState.winner,
        carryForward: [benched],
      });
      const got = roster.units.find((u) => u.id === ('barracks-vet' as UnitId));
      expect(got).toEqual(benched); // unchanged — no XP, no heal
      const assignedIds = new Set(roster.partyAssignments.flatMap((a) => a.unitIds));
      expect(assignedIds.has('barracks-vet' as UnitId)).toBe(false); // still barracks
      // Survivors are still there too.
      expect(roster.units.length).toBeGreaterThan(1);
    });

    it('absent / empty carryForward is identical to before (no-op)', () => {
      const finalState = runL1(2);
      const a = extractWorldRoster({ finalState, winner: finalState.winner });
      const b = extractWorldRoster({ finalState, winner: finalState.winner, carryForward: [] });
      expect(b).toEqual(a);
    });

    it('id-dedupes against survivors (survivor wins)', () => {
      const finalState = runL1(1);
      const base = extractWorldRoster({ finalState, winner: finalState.winner });
      const survivorId = base.units[0]?.id;
      if (survivorId === undefined) throw new Error('no survivor');
      const collide = mkWU(String(survivorId), { level: 99 });
      const roster = extractWorldRoster({
        finalState,
        winner: finalState.winner,
        carryForward: [collide],
      });
      const matches = roster.units.filter((u) => u.id === survivorId);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.level).not.toBe(99); // survivor retained, carry skipped
    });

    it('prunes a dead carry-forward unit', () => {
      const finalState = runL1(1);
      const roster = extractWorldRoster({
        finalState,
        winner: finalState.winner,
        carryForward: [mkWU('barracks-corpse', { currentHp: 0 })],
      });
      expect(roster.units.some((u) => u.id === ('barracks-corpse' as UnitId))).toBe(false);
    });
  });
});
