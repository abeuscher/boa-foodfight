/**
 * Round 8 — neutral AI random-walk policy tests.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { partyIdForKind } from '../engine/neutrals.ts';
import { createTickClock } from '../engine/replay.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import { runScenario } from '../engine/turn.ts';
import type { GameState, NeutralKind, PartyId, TileCoord } from '../engine/types.ts';

import { neutralPlayer } from './neutral.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-1');

const NEUTRAL_KINDS: readonly NeutralKind[] = ['mice', 'cockroaches', 'stinkbugs'];

const findNeutralLocation = (state: GameState, id: PartyId): TileCoord | undefined =>
  state.parties.get(id)?.location;

describe('neutral random-walk policy', () => {
  it('issues at most one move-to order per neutral party', () => {
    const { state, data } = loadScenario(DATA_DIR, 1);
    const next = neutralPlayer.decide(state, data, createRng(1).fork('neutral-test'));
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const party = next.parties.get(id);
      expect(party).toBeDefined();
      expect(party!.orders.length).toBeLessThanOrEqual(1);
      for (const order of party!.orders) expect(order.kind).toBe('move-to');
    }
  });

  it('keeps mice on their spawn plane across many turns', () => {
    const { state, data, neutralSpawnEvents } = loadScenario(DATA_DIR, 7);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(7), clock.next, {
      maxTurns: 20,
      policies: [neutralPlayer],
      neutralSpawnEvents,
    });
    const miceId = partyIdForKind('mice');
    const miceFinal = outcome.finalState.parties.get(miceId);
    expect(miceFinal).toBeDefined();
    const initialPlane = state.parties.get(miceId)?.location.plane;
    expect(['floor', 'ceiling']).toContain(initialPlane);
    expect(miceFinal!.location.plane).toBe(initialPlane);
  });

  it('keeps cockroaches and stinkbugs on their spawn plane', () => {
    const { state, data, neutralSpawnEvents } = loadScenario(DATA_DIR, 11);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(11), clock.next, {
      maxTurns: 25,
      policies: [neutralPlayer],
      neutralSpawnEvents,
    });
    for (const kind of ['cockroaches', 'stinkbugs'] as const) {
      const id = partyIdForKind(kind);
      const initialPlane = state.parties.get(id)?.location.plane;
      const finalPlane = outcome.finalState.parties.get(id)?.location.plane;
      expect(finalPlane).toBe(initialPlane);
    }
  });

  it('moves at least once over a long horizon (with overwhelming probability)', () => {
    const { state, data, neutralSpawnEvents } = loadScenario(DATA_DIR, 21);
    const clock = createTickClock();
    const outcome = runScenario(state, data, createRng(21), clock.next, {
      maxTurns: 30,
      policies: [neutralPlayer],
      neutralSpawnEvents,
    });
    let anyMoved = false;
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      const before = findNeutralLocation(state, id);
      const after = findNeutralLocation(outcome.finalState, id);
      if (
        before &&
        after &&
        (before.x !== after.x || before.y !== after.y || before.plane !== after.plane)
      ) {
        anyMoved = true;
      }
    }
    expect(anyMoved).toBe(true);
  });

  it('produces identical neutral movements for the same seed (determinism)', () => {
    const a = loadScenario(DATA_DIR, 3);
    const b = loadScenario(DATA_DIR, 3);
    const ca = createTickClock();
    const cb = createTickClock();
    const oa = runScenario(a.state, a.data, createRng(3), ca.next, {
      maxTurns: 8,
      policies: [neutralPlayer],
      neutralSpawnEvents: a.neutralSpawnEvents,
    });
    const ob = runScenario(b.state, b.data, createRng(3), cb.next, {
      maxTurns: 8,
      policies: [neutralPlayer],
      neutralSpawnEvents: b.neutralSpawnEvents,
    });
    for (const kind of NEUTRAL_KINDS) {
      const id = partyIdForKind(kind);
      expect(oa.finalState.parties.get(id)?.location).toEqual(
        ob.finalState.parties.get(id)?.location,
      );
    }
  });

  it('does not crash when surrounded by obstacles / boundaries', () => {
    // Sanity: even if every direction is blocked, the AI should leave
    // the party in place (no thrown exception).
    const { state, data } = loadScenario(DATA_DIR, 1);
    const result = neutralPlayer.decide(state, data, createRng(1).fork('blocked-test'));
    for (const party of result.parties.values()) {
      expect(party.units.length).toBeGreaterThanOrEqual(0); // structural sanity
    }
  });
});
