/**
 * Round 8 stage 5 — hypnotize ability + rebound transitions.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveAbilityOrders } from './abilities.ts';
import { endOfTurn } from './end-of-turn.ts';
import { partyIdForKind } from './neutrals.ts';
import { loadScenario } from './state.ts';
import type {
  AbilityId,
  GameState,
  NeutralKind,
  Order,
  Party,
  PartyId,
  Rng,
  Unit,
} from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const HYPNOTIZE: AbilityId = 'hypnotize' as AbilityId;

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const stubRng = (rolls: readonly number[], ints: readonly number[] = []): Rng => {
  let rIdx = 0;
  let iIdx = 0;
  const self: Rng = {
    next: () => rolls[Math.min(rIdx++, rolls.length - 1)] ?? 0,
    int: () => ints[Math.min(iIdx++, ints.length - 1)] ?? 0,
    pick: <T>(items: readonly T[]): T => items[0]!,
    fork: () => self,
  };
  return self;
};

/** Find a spider party with at least one living unit. */
const findSpiderParty = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    if (p.faction !== 'spider') continue;
    if (p.units.some((u) => u.currentHp > 0)) return p;
  }
  throw new Error('no spider party');
};

const setupHypnotize = (
  state: GameState,
  kind: NeutralKind,
): { state: GameState; spiderId: PartyId; targetId: PartyId; casterUnit: Unit } => {
  const spider = findSpiderParty(state);
  const neutralId = partyIdForKind(kind);
  const neutral = state.parties.get(neutralId);
  if (!neutral) throw new Error(`no neutral '${kind}'`);
  const order: Order = { kind: 'use-ability', abilityId: HYPNOTIZE, target: neutralId };
  const newSpider: Party = { ...spider, location: neutral.location, orders: [order] };
  const parties = new Map(state.parties);
  parties.set(spider.id, newSpider);
  const casterUnit = newSpider.units.find((u) => u.id === newSpider.leaderId)!;
  return { state: { ...state, parties }, spiderId: spider.id, targetId: neutralId, casterUnit };
};

describe('round 8 — hypnotize handler', () => {
  it('halves the caster currentHp on cast (rounded down)', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'cockroaches');
    const hpBefore = setup.casterUnit.currentHp;
    // Force success.
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng([0.0], [0]), tickClock());
    const newSpider = out.state.parties.get(setup.spiderId)!;
    const newCaster = newSpider.units.find((u) => u.id === setup.casterUnit.id)!;
    expect(newCaster.currentHp).toBe(Math.floor(hpBefore / 2));
    const events = out.events.filter((e) => e.kind === 'hypnotize-attempted');
    expect(events).toHaveLength(1);
    if (events[0]?.kind !== 'hypnotize-attempted') throw new Error('shape');
    expect(events[0].casterHpBefore).toBe(hpBefore);
    expect(events[0].casterHpAfter).toBe(Math.floor(hpBefore / 2));
    expect(events[0].success).toBe(true);
  });

  it('on success: sets hypnotizedBy=spider with 5..10 control turns', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // ints[0] used for the controlSpan roll: 0 → controlTurns = 5.
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng([0.0], [0]), tickClock());
    const status = out.state.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBe('spider');
    expect(status.hypnoticControlRemaining).toBe(5);
    expect(status.spiderImmunityRemaining).toBe(0);
  });

  it('on failure: silently no-op control state (no rebound, no hypnosis)', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // 0.99 > 0.8 → fail.
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng([0.99], [0]), tickClock());
    const status = out.state.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBeNull();
    expect(status.spiderImmunityRemaining).toBe(0);
  });

  it('end-of-turn ticks down hypnoticControlRemaining and transitions to rebound', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'cockroaches');
    let working = resolveAbilityOrders(
      setup.state,
      data.jelly,
      stubRng([0.0], [0]),
      tickClock(),
    ).state;
    // 5-turn control. After 5 end-of-turn ticks the rebound starts.
    const eotInput = { queen: data.queen, jelly: data.jelly };
    let reboundEvent = false;
    for (let i = 0; i < 5; i++) {
      const eot = endOfTurn(working, eotInput, tickClock());
      working = eot.state;
      if (eot.events.some((e) => e.kind === 'hypnotize-rebound-started')) reboundEvent = true;
    }
    expect(reboundEvent).toBe(true);
    const status = working.neutralStatus.get(setup.targetId)!;
    expect(status.hypnotizedBy).toBeNull();
    expect(status.spiderImmunityRemaining).toBe(10);
  });

  it('rebound immunity prevents re-hypnotize attempts (silently)', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'mice');
    // Mark target as in-rebound: bypass hypnotize handler entirely
    // and set the status manually.
    const status = setup.state.neutralStatus.get(setup.targetId)!;
    const newStatus = new Map(setup.state.neutralStatus);
    newStatus.set(setup.targetId, { ...status, spiderImmunityRemaining: 7 });
    const stateAfter = { ...setup.state, neutralStatus: newStatus };
    const hpBefore = setup.casterUnit.currentHp;
    const out = resolveAbilityOrders(stateAfter, data.jelly, stubRng([0.0], [0]), tickClock());
    // Caster HP unchanged (no cost paid).
    const newSpider = out.state.parties.get(setup.spiderId)!;
    const newCaster = newSpider.units.find((u) => u.id === setup.casterUnit.id)!;
    expect(newCaster.currentHp).toBe(hpBefore);
    // No hypnotize-attempted event emitted.
    const events = out.events.filter((e) => e.kind === 'hypnotize-attempted');
    expect(events).toHaveLength(0);
  });

  it('failed hypnotize against a stinkbug spawns a damage zone', () => {
    const { state: base, data } = loadScenario(DATA_DIR, 1);
    const setup = setupHypnotize(base, 'stinkbugs');
    const out = resolveAbilityOrders(setup.state, data.jelly, stubRng([0.99], [0]), tickClock());
    expect(out.state.damageZones.length).toBeGreaterThanOrEqual(1);
    const zone = out.state.damageZones[0]!;
    expect(zone.turnsRemaining).toBe(5);
    const ev = out.events.find((e) => e.kind === 'damage-zone-spawned');
    expect(ev).toBeDefined();
  });
});
