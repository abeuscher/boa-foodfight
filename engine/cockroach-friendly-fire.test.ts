/**
 * Round 8 stage 6 — cockroach friendly fire.
 *
 * 10% chance per cockroach attack to redirect the blow to a co-party
 * cockroach instead of the original target.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveBattle, type BattleInput } from './battle.ts';
import { loadScenario } from './state.ts';
import type {
  GameState,
  Party,
  PartyId,
  Rng,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const BATTLE_TILE: TileCoord = { plane: 'floor', x: 4, y: 4 };

const noAbilities = {
  version: 1 as const,
  abilities: [
    {
      id: 'noop' as const,
      name: 'noop',
      category: 'information' as const,
      target: 'self' as const,
      uses: 1,
      cooldown: 0,
      params: {},
      description: 'noop',
    },
  ],
};

const makeTickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const mkUnit = (state: GameState, templateId: string, unitId: string): Unit => {
  const tmpl = state.unitTemplates.get(templateId as UnitTemplateId);
  if (!tmpl) throw new Error(`unknown template '${templateId}'`);
  return {
    id: unitId as UnitId,
    templateId: tmpl.id,
    currentHp: tmpl.baseStats.hp,
    level: 1,
    xp: 0,
  };
};

const baseParty = (
  id: string,
  faction: 'ant' | 'neutral',
  units: readonly Unit[],
  leaderId: UnitId,
): Party => ({
  id: id as PartyId,
  faction,
  units,
  leaderId,
  location: BATTLE_TILE,
  orders: [],
  posture: 'fight',
  strategyModifiers: [],
  jellyDoses: 0,
  leaderless: false,
});

const installParties = (state: GameState, parties: readonly Party[]): GameState => {
  const m = new Map(state.parties);
  for (const p of parties) m.set(p.id, p);
  return { ...state, parties: m };
};

const buildInput = (atk: Party, def: Party): BattleInput => ({
  attacker: atk,
  defender: def,
  postDefense: 0,
  queenProximityAttack: 1,
  queenProximityResilience: 1,
  attackerJellyAttack: 1,
  attackerJellyResilience: 1,
  defenderJellyAttack: 1,
  defenderJellyResilience: 1,
  abilities: noAbilities,
});

/**
 * Stub Rng that yields a programmable sequence for `next()`.
 * `int(maxExclusive)` always returns 0 (deterministic). `pick` always
 * picks the first element.
 */
const sequenceRng = (rolls: readonly number[]): Rng => {
  let i = 0;
  const self: Rng = {
    next: () => rolls[Math.min(i++, rolls.length - 1)] ?? 0,
    int: () => 0,
    pick: <T>(items: readonly T[]): T => items[0]!,
    fork: () => self,
  };
  return self;
};

describe('round 8 — cockroach friendly fire', () => {
  it('a non-cockroach attacker never redirects to a cockroach co-party', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    const f = mkUnit(base, 'ant-footman', 'ff-1');
    const a = baseParty('atk', 'ant', [f], f.id);
    // Defender: 3 cockroaches.
    const c1 = mkUnit(base, 'cockroach', 'def-c1');
    const c2 = mkUnit(base, 'cockroach', 'def-c2');
    const c3 = mkUnit(base, 'cockroach', 'def-c3');
    const d = baseParty('def', 'neutral', [c1, c2, c3], c1.id);
    const state = installParties(base, [a, d]);
    // Constant rng yields all zeros — would 100% trigger redirect IF
    // the attacker were a cockroach. The footman attacker is not.
    const out = resolveBattle(state, buildInput(a, d), sequenceRng([0, 0, 0]), makeTickClock());
    // Every action where attackerId is the footman must target one of the cockroaches (a defender).
    const defIds = new Set([c1.id, c2.id, c3.id]);
    for (const round of out.result.rounds) {
      for (const action of round.actions) {
        if (action.attackerId === f.id) {
          expect(defIds.has(action.defenderId)).toBe(true);
        }
      }
    }
  });

  it('a cockroach attacker redirects to a co-party cockroach when the friendly-fire roll lands', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    // Attacker: 3 cockroaches. Defender: 1 footman with massive HP so
    // we have plenty of attack rounds to observe.
    const c1 = mkUnit(base, 'cockroach', 'atk-c1');
    const c2 = mkUnit(base, 'cockroach', 'atk-c2');
    const c3 = mkUnit(base, 'cockroach', 'atk-c3');
    const a = baseParty('atk', 'neutral', [c1, c2, c3], c1.id);
    const f = mkUnit(base, 'ant-footman', 'def-f');
    const d = baseParty('def', 'ant', [f], f.id);
    const state = installParties(base, [a, d]);
    // Constant 0.0 rng → every cockroach attack redirects.
    const stub: Rng = {
      next: () => 0.0,
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stub,
    };
    const out = resolveBattle(state, buildInput(a, d), stub, makeTickClock());
    const cockroachIds = new Set([c1.id, c2.id, c3.id]);
    let cockroachOnCockroachActions = 0;
    for (const round of out.result.rounds) {
      for (const action of round.actions) {
        if (cockroachIds.has(action.attackerId) && cockroachIds.has(action.defenderId)) {
          cockroachOnCockroachActions += 1;
          // The redirect target is never the attacker themselves.
          expect(action.defenderId).not.toBe(action.attackerId);
        }
      }
    }
    expect(cockroachOnCockroachActions).toBeGreaterThanOrEqual(1);
  });

  it('a cockroach attacker hits the original target when the friendly-fire roll misses', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    const c1 = mkUnit(base, 'cockroach', 'atk-c1');
    const c2 = mkUnit(base, 'cockroach', 'atk-c2');
    const a = baseParty('atk', 'neutral', [c1, c2], c1.id);
    const f = mkUnit(base, 'ant-footman', 'def-f');
    const d = baseParty('def', 'ant', [f], f.id);
    const state = installParties(base, [a, d]);
    // 0.99 → > 0.1, so no redirect.
    const stub: Rng = {
      next: () => 0.99,
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stub,
    };
    const out = resolveBattle(state, buildInput(a, d), stub, makeTickClock());
    const cockroachIds = new Set([c1.id, c2.id]);
    for (const round of out.result.rounds) {
      for (const action of round.actions) {
        if (cockroachIds.has(action.attackerId)) {
          // No friendly-fire: defender must NOT be a co-party
          // cockroach. (Defender side units are not cockroaches.)
          expect(cockroachIds.has(action.defenderId)).toBe(false);
        }
      }
    }
  });

  it('skips redirect when there is no other living cockroach in the attacker party', () => {
    const { state: base } = loadScenario(DATA_DIR, 1);
    const c1 = mkUnit(base, 'cockroach', 'atk-c1');
    const a = baseParty('atk', 'neutral', [c1], c1.id);
    const f = mkUnit(base, 'ant-footman', 'def-f');
    const d = baseParty('def', 'ant', [f], f.id);
    const state = installParties(base, [a, d]);
    const stub: Rng = {
      next: () => 0.0, // would redirect, but no friend
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stub,
    };
    const out = resolveBattle(state, buildInput(a, d), stub, makeTickClock());
    for (const round of out.result.rounds) {
      for (const action of round.actions) {
        if (action.attackerId === c1.id) {
          // Defender is the footman — no friend available.
          expect(action.defenderId).toBe(f.id);
        }
      }
    }
  });
});
