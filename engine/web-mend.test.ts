/**
 * Round 18 — `web-mend` use-ability handler tests.
 *
 * Web-mend has two implementations that coexist:
 *   - Battle-internal passive (engine/battle.ts): fires every battle
 *     round at half HP, heals 1, no events.
 *   - Use-ability handler (engine/abilities.ts, this test): fires on
 *     a `use-ability` order, heals every living unit by 3 (capped at
 *     each unit's template max HP), emits `web-mended` + `ability-used`.
 *
 * These tests cover the use-ability handler only. The battle-internal
 * passive is covered in engine/battle*.test.ts.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveAbilityOrders } from './abilities.ts';
import { createRng } from './rng.ts';
import { loadScenario } from './state.ts';
import type { AbilityId, GameState, Order, Party, PartyId, Rng } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const WEB_MEND: AbilityId = 'web-mend' as AbilityId;

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const stubRng: Rng = {
  next: () => 0,
  int: () => 0,
  pick: <T>(items: readonly T[]): T => items[0]!,
  fork: () => stubRng,
};

const replaceParty = (state: GameState, party: Party): GameState => {
  const parties = new Map(state.parties);
  parties.set(party.id, party);
  return { ...state, parties };
};

const issueWebMend = (state: GameState, partyId: PartyId): GameState => {
  const party = state.parties.get(partyId);
  if (!party) throw new Error(`missing ${String(partyId)}`);
  const order: Order = { kind: 'use-ability', abilityId: WEB_MEND };
  return replaceParty(state, { ...party, orders: [order] });
};

describe('web-mend use-ability handler', () => {
  it('heals each living unit in the casting party by 3 HP, capped at template max', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const guardId = 'web-guard' as PartyId;
    const guard = state.parties.get(guardId);
    if (!guard) throw new Error('web-guard missing');
    // Knock the queen's HP down by 10 so the heal lands within the cap.
    const wounded: Party = {
      ...guard,
      units: guard.units.map((u) => ({ ...u, currentHp: Math.max(1, u.currentHp - 10) })),
    };
    const before = replaceParty(state, wounded);
    const queued = issueWebMend(before, guardId);
    const out = resolveAbilityOrders(queued, data.jelly, stubRng, tickClock(), data.abilities);
    const after = out.state.parties.get(guardId);
    expect(after).toBeDefined();
    if (!after) throw new Error('no after');
    // Queen unit should have gained exactly 3 HP (still under cap).
    const beforeQueen = wounded.units[0]!;
    const afterQueen = after.units.find((u) => u.id === beforeQueen.id);
    expect(afterQueen?.currentHp).toBe(beforeQueen.currentHp + 3);
  });

  it('emits ability-used + web-mended events with per-unit detail', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const guardId = 'web-guard' as PartyId;
    const guard = state.parties.get(guardId);
    if (!guard) throw new Error('web-guard missing');
    const wounded: Party = {
      ...guard,
      units: guard.units.map((u) => ({ ...u, currentHp: 1 })),
    };
    const queued = issueWebMend(replaceParty(state, wounded), guardId);
    const out = resolveAbilityOrders(queued, data.jelly, stubRng, tickClock(), data.abilities);
    const used = out.events.find(
      (e) => e.kind === 'ability-used' && e.partyId === guardId && e.abilityId === WEB_MEND,
    );
    expect(used).toBeDefined();
    const mended = out.events.find((e) => e.kind === 'web-mended');
    expect(mended).toBeDefined();
    if (mended?.kind !== 'web-mended') throw new Error('shape');
    expect(mended.partyId).toBe(guardId);
    expect(mended.hpHealed).toBeGreaterThan(0);
    expect(mended.perUnit.length).toBeGreaterThan(0);
    for (const entry of mended.perUnit) {
      expect(entry.hpAfter).toBeGreaterThan(entry.hpBefore);
    }
  });

  it('does nothing (heals 0) when every unit is already at max HP', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const guardId = 'web-guard' as PartyId;
    const queued = issueWebMend(state, guardId);
    const out = resolveAbilityOrders(queued, data.jelly, stubRng, tickClock(), data.abilities);
    const mended = out.events.find((e) => e.kind === 'web-mended');
    expect(mended).toBeDefined();
    if (mended?.kind !== 'web-mended') throw new Error('shape');
    expect(mended.hpHealed).toBe(0);
    expect(mended.perUnit).toEqual([]);
  });

  it('consumes the order whether the heal landed or not', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const guardId = 'web-guard' as PartyId;
    const queued = issueWebMend(state, guardId);
    const out = resolveAbilityOrders(queued, data.jelly, stubRng, tickClock(), data.abilities);
    const after = out.state.parties.get(guardId);
    expect(
      after?.orders.find((o) => o.kind === 'use-ability' && o.abilityId === WEB_MEND),
    ).toBeUndefined();
  });

  it('skips the heal when no living unit in the party has web-mend in its template', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const silkId = 'silk-line' as PartyId;
    const silk = state.parties.get(silkId);
    if (!silk) throw new Error('silk-line missing');
    // silk-line has no web-mend in any of its templates; the handler
    // should consume the order and emit nothing of substance.
    const wounded: Party = {
      ...silk,
      units: silk.units.map((u) => ({ ...u, currentHp: 1 })),
      orders: [{ kind: 'use-ability', abilityId: WEB_MEND }],
    };
    const queued = replaceParty(state, wounded);
    const out = resolveAbilityOrders(queued, data.jelly, createRng(1), tickClock(), data.abilities);
    const mended = out.events.find((e) => e.kind === 'web-mended');
    expect(mended).toBeUndefined();
    const after = out.state.parties.get(silkId);
    // HP unchanged.
    expect(after?.units.every((u) => u.currentHp === 1)).toBe(true);
    // Order consumed.
    expect(after?.orders.length).toBe(0);
  });
});
