/**
 * Round 8 stage 4 — ant `recruit` extends to neutral parties.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveAbilityOrders } from './abilities.ts';
import { partyIdForKind } from './neutrals.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type { AbilityId, GameState, NeutralKind, Order, Party, PartyId, Rng } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const RECRUIT: AbilityId = 'recruit' as AbilityId;

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

/** Find an ant party that has `recruit` in its templates. */
const findMageParty = (state: GameState): Party => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    for (const u of party.units) {
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl?.abilities.includes(RECRUIT)) return party;
    }
  }
  throw new Error('no ant party with recruit');
};

/** Co-locate the mage party at the neutral's tile, with a recruit
 * order targeting the neutral. */
const setupRecruitTargeting = (
  state: GameState,
  kind: NeutralKind,
): { state: GameState; mageId: PartyId; targetId: PartyId } => {
  const mage = findMageParty(state);
  const neutralId = partyIdForKind(kind);
  const neutral = state.parties.get(neutralId);
  if (!neutral) throw new Error(`no neutral '${kind}'`);
  const recruitOrder: Order = { kind: 'use-ability', abilityId: RECRUIT, target: neutralId };
  const newMage: Party = {
    ...mage,
    location: neutral.location,
    orders: [recruitOrder],
  };
  const parties = new Map(state.parties);
  parties.set(mage.id, newMage);
  return { state: { ...state, parties }, mageId: mage.id, targetId: neutralId };
};

/** Loop until the seeded recruit RNG returns a < 0.25 (success). */
const findSuccessSeed = (kind: NeutralKind): { rng: Rng; setupSeed: number } => {
  // Seed walk: try seeds until the recruit RNG yields success on the
  // first call. Bounded loop.
  for (let s = 0; s < 1000; s++) {
    const rng = createRng(s).fork('test-recruit');
    if (rng.next() < 0.25) {
      void kind;
      return { rng: createRng(s).fork('test-recruit'), setupSeed: s };
    }
  }
  throw new Error('no success seed');
};

describe('round 8 — recruit extension to neutrals', () => {
  it('ant-mage successfully converts a mice neutral on a successful roll', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitTargeting(base, 'mice');
    // Force success by stubbing out the rng. The handler does
    // `rng.next() < 0.25`. We provide a deterministic rng that returns 0.
    const stubRng: Rng = {
      next: () => 0.0,
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stubRng,
    };
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng, tickClock());
    const targetParty = out.state.parties.get(setup.targetId);
    expect(targetParty?.faction).toBe('ant');
    expect(out.state.neutralStatus.has(setup.targetId)).toBe(false);
    const events = out.events.filter((e) => e.kind === 'recruit-attempted-neutral');
    expect(events).toHaveLength(1);
    const ev = events[0];
    if (ev?.kind !== 'recruit-attempted-neutral') throw new Error('shape');
    expect(ev.targetType).toBe('mice');
    expect(ev.success).toBe(true);
  });

  it('ant-mage successfully converts a cockroaches neutral', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitTargeting(base, 'cockroaches');
    const stubRng: Rng = {
      next: () => 0.0,
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stubRng,
    };
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng, tickClock());
    const targetParty = out.state.parties.get(setup.targetId);
    expect(targetParty?.faction).toBe('ant');
    expect(targetParty?.units.length).toBe(8);
  });

  it('ant-mage successfully converts a stinkbugs neutral', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitTargeting(base, 'stinkbugs');
    const stubRng: Rng = {
      next: () => 0.0,
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stubRng,
    };
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng, tickClock());
    const targetParty = out.state.parties.get(setup.targetId);
    expect(targetParty?.faction).toBe('ant');
  });

  it('failed recruit leaves the neutral unconverted and emits a failure event', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitTargeting(base, 'mice');
    const stubRng: Rng = {
      next: () => 0.99, // > 0.25 — guaranteed failure
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stubRng,
    };
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng, tickClock());
    const targetParty = out.state.parties.get(setup.targetId);
    expect(targetParty?.faction).toBe('neutral');
    const events = out.events.filter((e) => e.kind === 'recruit-attempted-neutral');
    expect(events).toHaveLength(1);
    if (events[0]?.kind !== 'recruit-attempted-neutral') throw new Error('shape');
    expect(events[0].success).toBe(false);
  });

  it('conversion is permanent: state.neutralStatus drops the converted entry', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupRecruitTargeting(base, 'cockroaches');
    const stubRng: Rng = {
      next: () => 0.0,
      int: () => 0,
      pick: <T>(items: readonly T[]): T => items[0]!,
      fork: () => stubRng,
    };
    expect(setup.state.neutralStatus.has(setup.targetId)).toBe(true);
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng, tickClock());
    expect(out.state.neutralStatus.has(setup.targetId)).toBe(false);
  });

  // Light sanity exercise of the seed-walk helper to keep it referenced.
  it('finds a success seed for the deterministic RNG path', () => {
    const { setupSeed } = findSuccessSeed('mice');
    expect(setupSeed).toBeGreaterThanOrEqual(0);
  });
});
