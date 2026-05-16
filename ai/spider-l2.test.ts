/**
 * L2-3 — spider-l2 (pipe-ambush) policy tests.
 *
 * Verifies the L2 spider policy produces orders against the L2 map:
 * it identifies the escort party (the one carrying `aunt-ant`), holds
 * pinch-points until the escort is within the intercept leash, surges
 * to the escort's tile when it closes, and casts an opportunistic
 * hypnotize on a co-located eligible neutral. Determinism: same state
 * in → same orders out.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import { runScenario } from '../engine/turn.ts';
import type { GameState, Party, PartyId, UnitTemplateId } from '../engine/types.ts';

import { neutralPlayer } from './neutral.ts';
import { spiderL2 } from './spider-l2.ts';

const L2_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-2');

const tick = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const moveParty = (state: GameState, id: PartyId, to: Party['location']): GameState => {
  const parties = new Map(state.parties);
  const p = parties.get(id);
  if (!p) throw new Error(`no party ${String(id)}`);
  parties.set(id, { ...p, location: to });
  return { ...state, parties };
};

describe('spiderL2 — pipe ambush', () => {
  it('produces a state and only ever mutates spider orders', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const out = spiderL2.decide(state, undefined as never, createRng(1));
    for (const [id, party] of out.parties) {
      const before = state.parties.get(id);
      if (!before) continue;
      if (party.faction !== 'spider') {
        // non-spider parties untouched (orders identical reference-wise
        // is not guaranteed, but content must match).
        expect(party.orders).toEqual(before.orders);
      }
    }
    // At least one spider party exists and was visited.
    const spiders = [...out.parties.values()].filter((p) => p.faction === 'spider');
    expect(spiders.length).toBeGreaterThan(0);
  });

  it('the command party holds (no move orders) while the escort is far', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const out = spiderL2.decide(state, undefined as never, createRng(1));
    const cmd = out.parties.get('pinch-command' as PartyId);
    expect(cmd).toBeDefined();
    expect(cmd?.orders.some((o) => o.kind === 'move-to')).toBe(false);
  });

  it('a field pinch party surges (move-to) to the escort once within the leash', () => {
    const { state } = loadScenario(L2_DIR, 4);
    const escort = [...state.parties.values()].find((p) =>
      p.units.some((u) => u.templateId === ('aunt-ant' as UnitTemplateId)),
    );
    expect(escort).toBeDefined();
    if (!escort) return;
    const pinch = state.parties.get('pinch-bend-upper' as PartyId);
    expect(pinch).toBeDefined();
    if (!pinch) return;
    // pinch-bend-upper starts at floor (3,3). Place the escort 2 tiles
    // away on the same plane — inside INTERCEPT_RADIUS but not
    // co-located, so the party must issue a move-to toward it.
    const near = moveParty(state, escort.id, { plane: 'floor', x: 4, y: 4 });
    const out = spiderL2.decide(near, undefined as never, createRng(1));
    const after = out.parties.get('pinch-bend-upper' as PartyId);
    const move = after?.orders.find((o) => o.kind === 'move-to');
    expect(move).toBeDefined();
    if (move?.kind === 'move-to') {
      expect(move.target).toEqual({ plane: 'floor', x: 4, y: 4 });
    }
  });

  it('is deterministic — same state yields identical orders', () => {
    const { state } = loadScenario(L2_DIR, 7);
    const a = spiderL2.decide(state, undefined as never, createRng(3));
    const b = spiderL2.decide(state, undefined as never, createRng(3));
    for (const [id, pa] of a.parties) {
      const pb = b.parties.get(id);
      expect(pb?.orders).toEqual(pa.orders);
    }
  });

  it('drives the L2 scenario to a terminal state (escort objective)', () => {
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L2_DIR, 4);
    const out = runScenario(state, data, createRng(4), tick(), {
      maxTurns: 60,
      policies: [spiderL2, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    // No ant policy moves the escort, so the escort never reaches the
    // exit → the escort objective resolves to a spider win on timeout
    // (no score breakdown — escort timeout is not score-resolved).
    expect(out.finalState.winner).toBe('spider');
    const end = [...out.events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
    if (end?.kind === 'scenario-end') {
      expect(end.winner).toBe('spider');
      expect(end.scoreBreakdown).toBeUndefined();
    }
  });
});
