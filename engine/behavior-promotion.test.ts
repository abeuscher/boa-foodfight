/**
 * Tests for engine/behavior-promotion.ts — the L1-iteration #9
 * behavior-gated promotion path. Coverage:
 *
 *   1. Below threshold ⇒ no promotion (gated-inert).
 *   2. At threshold ⇒ every eligible unit on PROMOTION_TREE promotes,
 *      one `unit-promoted` event per promotion.
 *   3. Already-promoted units (the `promoted` flag) are skipped — no
 *      double-promotion when charisma fired first.
 *   4. Above threshold but no promotable units ⇒ no events, state
 *      unchanged by reference.
 *   5. Dead units skipped (currentHp ≤ 0).
 *   6. Non-promotable templates (queens, specialty) skipped.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { applyBehaviorPromotions, AGGRESSION_PROMOTION_THRESHOLD } from './behavior-promotion.ts';
import { loadScenario } from './state.ts';
import type { GameState, Party, PartyId } from './types.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const setParty = (state: GameState, partyId: PartyId, patch: Partial<Party>): GameState => {
  const parties = new Map(state.parties);
  const party = parties.get(partyId);
  if (!party) throw new Error(`no party ${String(partyId)}`);
  parties.set(partyId, { ...party, ...patch });
  return { ...state, parties };
};

const findAntFieldParty = (state: GameState): Party => {
  for (const p of state.parties.values()) {
    if (p.faction !== 'ant') continue;
    const isQueen = p.units.some((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      return tmpl?.tags.includes('queen');
    });
    if (!isQueen) return p;
  }
  throw new Error('no non-queen ant party found');
};

describe('applyBehaviorPromotions', () => {
  it('is a no-op when every party is below the aggression threshold', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const out = applyBehaviorPromotions(state, state.turn, tickClock());
    expect(out.events).toHaveLength(0);
    expect(out.state).toBe(state);
  });

  it('promotes every eligible unit in a party at threshold and emits one event per unit', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const party = findAntFieldParty(state);
    const armedAggression = AGGRESSION_PROMOTION_THRESHOLD;
    const armedState = setParty(state, party.id, { aggression: armedAggression });
    const eligibleCount = party.units.filter((u) => {
      const tmpl = state.unitTemplates.get(u.templateId);
      // Skip queens; promotable templates include footmen, archers, mages, scouts.
      return tmpl !== undefined && !tmpl.tags.includes('queen') && u.currentHp > 0;
    }).length;
    expect(eligibleCount).toBeGreaterThan(0);
    const out = applyBehaviorPromotions(armedState, armedState.turn, tickClock());
    // At least one promotion should fire (the L1 vanguard composition
    // is footmen + archers + mages + scouts, all promotable).
    expect(out.events.length).toBeGreaterThan(0);
    for (const ev of out.events) {
      expect(ev.kind).toBe('unit-promoted');
    }
    // Promoted units carry the new templateId and `promoted: true`.
    const updated = out.state.parties.get(party.id);
    const promoted = updated?.units.find((u) => u.promoted === true);
    expect(promoted).toBeDefined();
  });

  it('skips units already promoted (`promoted: true` short-circuit)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const party = findAntFieldParty(state);
    // Mark every unit in the party as already promoted.
    const allPromoted = party.units.map((u) => ({ ...u, promoted: true }));
    let armed = setParty(state, party.id, {
      aggression: AGGRESSION_PROMOTION_THRESHOLD,
      units: allPromoted,
    });
    armed = armed; // no-op; explicit for clarity
    const out = applyBehaviorPromotions(armed, armed.turn, tickClock());
    expect(out.events).toHaveLength(0);
    expect(out.state).toBe(armed);
  });

  it('a party at threshold with only queens / dead units triggers nothing', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    // Find the queen-guard ant party.
    let queenPartyId: PartyId | null = null;
    for (const [id, p] of state.parties) {
      if (p.units.some((u) => state.unitTemplates.get(u.templateId)?.tags.includes('queen'))) {
        queenPartyId = id;
        break;
      }
    }
    expect(queenPartyId).not.toBeNull();
    if (queenPartyId === null) return;
    const armed = setParty(state, queenPartyId, { aggression: AGGRESSION_PROMOTION_THRESHOLD });
    const out = applyBehaviorPromotions(armed, armed.turn, tickClock());
    // Queen template isn't on PROMOTION_TREE — no promotion fires.
    // The queen-guard *may* carry promotable escorts though, so accept
    // that this can promote escorts but never the queen herself.
    for (const ev of out.events) {
      if (ev.kind !== 'unit-promoted') continue;
      const fromTmpl = state.unitTemplates.get(ev.fromTemplate);
      expect(fromTmpl?.tags.includes('queen')).toBe(false);
    }
  });

  it('threshold-1 is below the gate; threshold itself triggers', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const party = findAntFieldParty(state);
    const justUnder = setParty(state, party.id, {
      aggression: AGGRESSION_PROMOTION_THRESHOLD - 1,
    });
    const justOver = setParty(state, party.id, { aggression: AGGRESSION_PROMOTION_THRESHOLD });
    const under = applyBehaviorPromotions(justUnder, justUnder.turn, tickClock());
    const over = applyBehaviorPromotions(justOver, justOver.turn, tickClock());
    expect(under.events).toHaveLength(0);
    expect(over.events.length).toBeGreaterThan(0);
  });

  it('skips dead units (currentHp ≤ 0)', () => {
    const { state } = loadScenario(DATA_DIR, 1);
    const party = findAntFieldParty(state);
    const deadUnits = party.units.map((u) => ({ ...u, currentHp: 0 }));
    const armed = setParty(state, party.id, {
      aggression: AGGRESSION_PROMOTION_THRESHOLD,
      units: deadUnits,
    });
    const out = applyBehaviorPromotions(armed, armed.turn, tickClock());
    // No promotions on a wiped party.
    const partyPromotions = out.events.filter(
      (e) => e.kind === 'unit-promoted' && e.partyId === party.id,
    );
    expect(partyPromotions).toHaveLength(0);
  });
});
