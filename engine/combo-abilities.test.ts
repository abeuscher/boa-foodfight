/**
 * Round 24 — combo abilities tests (mechanics memo §1.2).
 *
 * Covers the two combo abilities (`royal-onslaught` and `venom-storm`)
 * resolved by `applyOpeningAbilities` when an adjacent same-faction
 * partner party supplies the second component:
 *
 *   1. Royal Onslaught fires when an ant mage party is adjacent to an
 *      ant worker party with the prerequisite MP slots.
 *   2. Royal Onslaught does NOT fire when no adjacent worker party is
 *      present.
 *   3. Royal Onslaught does NOT fire when the worker has no tier-1 MP.
 *   4. Venom Storm fires when a spinner party is adjacent to a queen
 *      party (or two spinner parties).
 *   5. Venom Storm applies the 2-turn debuff (`tangleTurnsRemaining`)
 *      to all units in the target party.
 *   6. Per-scenario cap respected: a combo doesn't fire twice from the
 *      same shooter (the mage / venom-caster has `usedAbilities` set).
 *   7. `combo-fired` replay event has the correct shape (comboId,
 *      sourcePartyId, partnerPartyId, targetPartyId, totalDamage).
 *   8. MP from BOTH parties is decremented on success.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { applyOpeningAbilities } from './battle-abilities.ts';
import { INITIAL_MP_SLOTS } from './mp-tiers.ts';
import { loadScenario } from './state.ts';
import type {
  AbilityId,
  MpSlots,
  Party,
  PartyId,
  Plane,
  Unit,
  UnitId,
  UnitTemplateId,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const ROYAL_ONSLAUGHT: AbilityId = 'royal-onslaught' as AbilityId;
const VENOM_STORM: AbilityId = 'venom-storm' as AbilityId;

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const mkUnit = (
  templateId: string,
  id: string,
  hp: number,
  mp?: MpSlots,
  used?: readonly AbilityId[],
): Unit => ({
  id: id as UnitId,
  templateId: templateId as UnitTemplateId,
  currentHp: hp,
  level: 1,
  xp: 0,
  ...(mp ? { mpSlots: mp } : {}),
  ...(used ? { usedAbilities: used } : {}),
});

const mkParty = (
  id: string,
  units: readonly Unit[],
  faction: 'ant' | 'spider',
  loc?: { plane?: Plane; x?: number; y?: number },
): Party => ({
  id: id as PartyId,
  faction,
  units,
  leaderId: units[0]?.id ?? ('none' as UnitId),
  location: { plane: loc?.plane ?? 'floor', x: loc?.x ?? 0, y: loc?.y ?? 0 },
  orders: [],
  posture: 'fight',
  strategyModifiers: [],
  jellyDoses: 0,
  leaderless: false,
});

describe('royal-onslaught (ant combo)', () => {
  it('fires when ant mage party adjacent to ant worker party + sufficient MP', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const mage = mkUnit('ant-mage', 'm-1', 6, INITIAL_MP_SLOTS);
    const worker = mkUnit('ant-worker', 'w-1', 7, INITIAL_MP_SLOTS);
    const archer = mkUnit('ant-archer', 'a-1', 5);
    // Shooter party: mage + archer (the archer is the legal battle
    // companion; magic-arrow's gate is incidental — combo gates on
    // mage tier-3 MP only).
    const shooter = mkParty('shoot', [mage, archer], 'ant', { x: 1, y: 1 });
    const partner = mkParty('partn', [worker], 'ant', { x: 2, y: 2 });
    const enemy = mkParty(
      'enem',
      [mkUnit('spider-soldier', 'd-1', 99), mkUnit('spider-soldier', 'd-2', 99)],
      'spider',
      { x: 1, y: 1 },
    );
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);

    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );

    const combo = out.events.find((e) => e.kind === 'combo-fired' && e.comboId === ROYAL_ONSLAUGHT);
    expect(combo).toBeDefined();
    if (combo?.kind !== 'combo-fired') throw new Error('expected combo-fired');
    // Damage 18 hits all 2 enemy units = 36 total.
    expect(combo.totalDamage).toBe(36);
  });

  it('does NOT fire when no adjacent worker party is present', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const mage = mkUnit('ant-mage', 'm-1', 6, INITIAL_MP_SLOTS);
    const archer = mkUnit('ant-archer', 'a-1', 5);
    const shooter = mkParty('shoot', [mage, archer], 'ant', { x: 1, y: 1 });
    // Worker party exists but is far away (Chebyshev > 1).
    const worker = mkUnit('ant-worker', 'w-1', 7, INITIAL_MP_SLOTS);
    const partner = mkParty('partn', [worker], 'ant', { x: 5, y: 5 });
    const enemy = mkParty('enem', [mkUnit('spider-soldier', 'd-1', 30)], 'spider', {
      x: 1,
      y: 1,
    });
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);

    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    expect(out.events.some((e) => e.kind === 'combo-fired' && e.comboId === ROYAL_ONSLAUGHT)).toBe(
      false,
    );
    // Enemy untouched (no archer volley either — archer has no volley
    // ability target setup; volley still fires regardless, so we just
    // assert combo didn't fire by event absence above).
  });

  it('does NOT fire when the worker has no tier-1 MP', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const mage = mkUnit('ant-mage', 'm-1', 6, INITIAL_MP_SLOTS);
    const archer = mkUnit('ant-archer', 'a-1', 5);
    const shooter = mkParty('shoot', [mage, archer], 'ant', { x: 1, y: 1 });
    // Worker has explicit MP pool with tier1 = 0. (Workers are non-
    // casters by default, but the spec gates on tier-1 availability —
    // a forced-empty pool simulates exhaustion.)
    const worker = mkUnit('ant-worker', 'w-1', 7, {
      tier1: 0,
      tier2: 0,
      tier3: 0,
    });
    const partner = mkParty('partn', [worker], 'ant', { x: 1, y: 2 });
    const enemy = mkParty('enem', [mkUnit('spider-soldier', 'd-1', 30)], 'spider', {
      x: 1,
      y: 1,
    });
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);

    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    expect(out.events.some((e) => e.kind === 'combo-fired' && e.comboId === ROYAL_ONSLAUGHT)).toBe(
      false,
    );
  });
});

describe('venom-storm (spider combo)', () => {
  it('fires when spinner party adjacent to queen party', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const spinner = mkUnit('spider-spinner', 's-1', 14, INITIAL_MP_SLOTS);
    const queen = mkUnit('spider-queen', 'q-1', 37, INITIAL_MP_SLOTS);
    const shooter = mkParty('shoot', [spinner], 'spider', { x: 1, y: 1 });
    const partner = mkParty('partn', [queen], 'spider', { x: 2, y: 2 });
    const enemy = mkParty(
      'enem',
      [
        mkUnit('ant-footman', 'e-1', 9),
        mkUnit('ant-footman', 'e-2', 9),
        mkUnit('ant-archer', 'e-3', 5),
      ],
      'ant',
      { x: 1, y: 1 },
    );
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);

    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    const combo = out.events.find((e) => e.kind === 'combo-fired' && e.comboId === VENOM_STORM);
    expect(combo).toBeDefined();
  });

  it('applies the 2-turn debuff (tangleTurnsRemaining=2) to every living unit in target', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const spinner = mkUnit('spider-spinner', 's-1', 14, INITIAL_MP_SLOTS);
    const queen = mkUnit('spider-queen', 'q-1', 37, INITIAL_MP_SLOTS);
    const shooter = mkParty('shoot', [spinner], 'spider', { x: 1, y: 1 });
    const partner = mkParty('partn', [queen], 'spider', { x: 2, y: 1 });
    const enemy = mkParty(
      'enem',
      [mkUnit('ant-footman', 'e-1', 9), mkUnit('ant-footman', 'e-2', 9)],
      'ant',
      { x: 1, y: 1 },
    );
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);
    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    // Every living target unit got the 2-turn debuff stamp.
    for (const u of out.defender.units) {
      if (u.currentHp <= 0) continue;
      expect(u.tangleTurnsRemaining).toBe(2);
    }
  });
});

describe('combo per-scenario cap (one fire per shooter)', () => {
  it('does not fire twice from the same shooter party', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    // Mage already used royal-onslaught in a previous battle.
    const mage = mkUnit('ant-mage', 'm-1', 6, INITIAL_MP_SLOTS, [ROYAL_ONSLAUGHT]);
    const archer = mkUnit('ant-archer', 'a-1', 5);
    const shooter = mkParty('shoot', [mage, archer], 'ant', { x: 1, y: 1 });
    const worker = mkUnit('ant-worker', 'w-1', 7, INITIAL_MP_SLOTS);
    const partner = mkParty('partn', [worker], 'ant', { x: 2, y: 2 });
    const enemy = mkParty('enem', [mkUnit('spider-soldier', 'd-1', 30)], 'spider', {
      x: 1,
      y: 1,
    });
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);
    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    expect(out.events.some((e) => e.kind === 'combo-fired' && e.comboId === ROYAL_ONSLAUGHT)).toBe(
      false,
    );
  });
});

describe('combo-fired event shape', () => {
  it('carries comboId, sourcePartyId, partnerPartyId, targetPartyId, totalDamage', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const spinner = mkUnit('spider-spinner', 's-1', 14, INITIAL_MP_SLOTS);
    const queen = mkUnit('spider-queen', 'q-1', 37, INITIAL_MP_SLOTS);
    const shooter = mkParty('shoot-id', [spinner], 'spider', { x: 1, y: 1 });
    const partner = mkParty('partner-id', [queen], 'spider', { x: 2, y: 2 });
    const enemy = mkParty(
      'enemy-id',
      [mkUnit('ant-footman', 'e-1', 9), mkUnit('ant-footman', 'e-2', 9)],
      'ant',
      { x: 1, y: 1 },
    );
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);
    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    const combo = out.events.find((e) => e.kind === 'combo-fired');
    if (combo?.kind !== 'combo-fired') throw new Error('no combo-fired event');
    expect(combo.comboId).toBe(VENOM_STORM);
    expect(combo.sourcePartyId).toBe(shooter.id);
    expect(combo.partnerPartyId).toBe(partner.id);
    expect(combo.targetPartyId).toBe(enemy.id);
    // 3 dmg per unit × 2 living units = 6 total.
    expect(combo.totalDamage).toBe(6);
    expect(combo.debuffApplied).toBe('venom-storm');
  });
});

describe('combo decrements MP from BOTH parties', () => {
  it('mage tier-3 in shooter and worker tier-1 in partner both decrement', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const mage = mkUnit('ant-mage', 'm-1', 6, INITIAL_MP_SLOTS);
    const archer = mkUnit('ant-archer', 'a-1', 5);
    const shooter = mkParty('shoot', [mage, archer], 'ant', { x: 1, y: 1 });
    // Give the worker an explicit caster pool (otherwise it's a non-
    // caster and tier-1 spend is a no-op). The combat code is
    // tier-aware so this exercises the decrement path.
    const worker = mkUnit('ant-worker', 'w-1', 7, INITIAL_MP_SLOTS);
    const partner = mkParty('partn', [worker], 'ant', { x: 2, y: 2 });
    const enemy = mkParty('enem', [mkUnit('spider-soldier', 'd-1', 30)], 'spider', {
      x: 1,
      y: 1,
    });
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partner.id, partner],
      [enemy.id, enemy],
    ]);
    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    // Mage's tier-3 went from 1 → 0.
    const updatedMage = out.attacker.units.find((u) => u.id === mage.id);
    expect(updatedMage?.mpSlots?.tier3).toBe(0);
    // Worker's tier-1 came back via partnerUpdates.
    expect(out.partnerUpdates).toHaveLength(1);
    const partnerUpd = out.partnerUpdates[0];
    expect(partnerUpd?.partyId).toBe(partner.id);
    const updatedWorker = partnerUpd?.party.units.find((u) => u.id === worker.id);
    expect(updatedWorker?.mpSlots?.tier1).toBe(INITIAL_MP_SLOTS.tier1 - 1);
    // Both source units have royal-onslaught marked as used.
    expect(updatedMage?.usedAbilities).toContain(ROYAL_ONSLAUGHT);
    expect(updatedWorker?.usedAbilities).toContain(ROYAL_ONSLAUGHT);
  });
});

describe('combo determinism — partner pick is partyId-sorted', () => {
  it('picks the lexicographically earlier partyId when two partners qualify', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const spinner = mkUnit('spider-spinner', 's-1', 14, INITIAL_MP_SLOTS);
    const shooter = mkParty('shoot', [spinner], 'spider', { x: 5, y: 5 });
    // Two queens; both adjacent. Partner pick must be deterministic
    // (lex by partyId).
    const queenA = mkUnit('spider-queen', 'qa', 37, INITIAL_MP_SLOTS);
    const queenB = mkUnit('spider-queen', 'qb', 37, INITIAL_MP_SLOTS);
    const partnerA = mkParty('aaa-partn', [queenA], 'spider', { x: 5, y: 6 });
    const partnerB = mkParty('zzz-partn', [queenB], 'spider', { x: 6, y: 5 });
    const enemy = mkParty('enem', [mkUnit('ant-footman', 'e-1', 9)], 'ant', { x: 5, y: 5 });
    const allParties = new Map<PartyId, Party>([
      [shooter.id, shooter],
      [partnerA.id, partnerA],
      [partnerB.id, partnerB],
      [enemy.id, enemy],
    ]);
    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      { allParties },
    );
    const combo = out.events.find((e) => e.kind === 'combo-fired');
    if (combo?.kind !== 'combo-fired') throw new Error('no combo-fired event');
    expect(combo.partnerPartyId).toBe(partnerA.id);
  });
});

describe('combo opt-in — older callers without combo context get no combos', () => {
  it('omitting `combo` arg suppresses combo resolution (back-compat)', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const spinner = mkUnit('spider-spinner', 's-1', 14, INITIAL_MP_SLOTS);
    const queen = mkUnit('spider-queen', 'q-1', 37, INITIAL_MP_SLOTS);
    const shooter = mkParty('shoot', [spinner], 'spider', { x: 1, y: 1 });
    const partner = mkParty('partn', [queen], 'spider', { x: 2, y: 2 });
    const enemy = mkParty('enem', [mkUnit('ant-footman', 'e-1', 9)], 'ant', { x: 1, y: 1 });
    void partner;
    const out = applyOpeningAbilities(
      shooter,
      enemy,
      state.unitTemplates,
      data.abilities,
      1,
      tickClock(),
      // no combo arg
    );
    expect(out.events.some((e) => e.kind === 'combo-fired')).toBe(false);
    expect(out.partnerUpdates).toEqual([]);
  });
});
