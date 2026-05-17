/**
 * L2 — escort-l2 (Aunt Ant escort) policy tests.
 *
 * Verifies the L2 escort player against the real L2 (the Pipe) data:
 * the escort column is identified by its `aunt-ant` unit and walks
 * toward the exit POST; it holds when a spider sits on its forward
 * tile; the guards interpose on the nearest spider; the queen-guard
 * doses the escort with `jelly-apply`; the escort is `defend` and the
 * guards `fight`; the escort is never queued to flee; the policy is
 * deterministic; and a full L2 run reaches a terminal state.
 */

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import { runScenario } from '../engine/turn.ts';
import type { GameState, Order, Party, PartyId, UnitTemplateId } from '../engine/types.ts';

import { escortL2Player } from './escort-l2.ts';
import { neutralPlayer } from './neutral.ts';
import { spiderL2 } from './spider-l2.ts';

const L2_DIR = path.resolve(import.meta.dirname, '..', 'data', 'level-2');
const AUNT_ANT = 'aunt-ant' as UnitTemplateId;
const ESCORT_ID = 'escort-column' as PartyId;
const QUEEN_ID = 'queen-guard' as PartyId;

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

const findEscort = (state: GameState): Party => {
  const e = [...state.parties.values()].find((p) =>
    p.units.some((u) => u.templateId === AUNT_ANT && u.currentHp > 0),
  );
  if (!e) throw new Error('no escort party');
  return e;
};

const moveOrder = (orders: readonly Order[]): Extract<Order, { kind: 'move-to' }> | undefined => {
  const m = orders.find((o) => o.kind === 'move-to');
  return m?.kind === 'move-to' ? m : undefined;
};

describe('escortL2Player — Aunt Ant escort', () => {
  it('1. issues a move-to toward the exit when the path is clear', () => {
    const { state, data } = loadScenario(L2_DIR, 4);
    // Clear all spiders far off the escort's forward tile by parking
    // them on the exit (a single far cluster, not adjacent to (1,0)).
    let s = state;
    for (const [id, p] of state.parties) {
      if (p.faction === 'spider') s = moveParty(s, id, { plane: 'floor', x: 9, y: 9 });
    }
    const out = escortL2Player.decide(s, data, createRng(1));
    const escort = out.parties.get(ESCORT_ID);
    const move = moveOrder(escort?.orders ?? []);
    expect(move).toBeDefined();
    // Exit POST tile is (9,9): a move-to that target.
    expect(move?.target).toEqual({ plane: 'floor', x: 9, y: 9 });
  });

  it('2. holds (no move) when a spider sits on the escort forward tile', () => {
    const { state, data } = loadScenario(L2_DIR, 4);
    // escort-column starts at floor (1,0); the only Manhattan-
    // decreasing forward tile toward (9,9) on the open channel is
    // (1,1). Park a spider there.
    const s = moveParty(state, 'pinch-bend-upper' as PartyId, { plane: 'floor', x: 1, y: 1 });
    const out = escortL2Player.decide(s, data, createRng(1));
    const escort = out.parties.get(ESCORT_ID);
    expect(moveOrder(escort?.orders ?? [])).toBeUndefined();
    expect(escort?.orders.length).toBe(0);
  });

  it('3. a guard moves to interpose toward the nearest spider', () => {
    const { state, data } = loadScenario(L2_DIR, 4);
    const out = escortL2Player.decide(state, data, createRng(1));
    // vanguard-alpha starts at (2,1); the nearest living spider is
    // pinch-bend-upper at (3,3). The guard should issue a move-to
    // onto that spider's tile to body-block.
    const guard = out.parties.get('vanguard-alpha' as PartyId);
    const move = moveOrder(guard?.orders ?? []);
    expect(move).toBeDefined();
    expect(move?.target).toEqual({ plane: 'floor', x: 3, y: 3 });
  });

  it('4. the queen-guard fires jelly-apply on the escort party', () => {
    const { state, data } = loadScenario(L2_DIR, 4);
    const out = escortL2Player.decide(state, data, createRng(1));
    const queen = out.parties.get(QUEEN_ID);
    expect(queen).toBeDefined();
    const escort = findEscort(state);
    const jelly = queen?.orders.find(
      (o) => o.kind === 'use-ability' && o.abilityId === ('jelly-apply' as never),
    );
    expect(jelly).toBeDefined();
    if (jelly?.kind === 'use-ability') {
      expect(jelly.target).toBe(escort.id);
    }
    // Queen-guard always stays defend (queen immobile).
    expect(queen?.posture).toBe('defend');
  });

  it('5. the escort is posture defend; guards are posture fight', () => {
    const { state, data } = loadScenario(L2_DIR, 4);
    const out = escortL2Player.decide(state, data, createRng(1));
    expect(out.parties.get(ESCORT_ID)?.posture).toBe('defend');
    expect(out.parties.get('vanguard-alpha' as PartyId)?.posture).toBe('fight');
    expect(out.parties.get('vanguard-bravo' as PartyId)?.posture).toBe('fight');
    expect(out.parties.get('pathfinders' as PartyId)?.posture).toBe('fight');
  });

  it('6. the escort party is excluded from the flee hook (never flees)', () => {
    const { state, data } = loadScenario(L2_DIR, 4);
    // Wound the escort below the 30% flee threshold AND park a strong
    // spider on its forward tile (would trigger threat-flee for any
    // non-exempt party). The escort must still NOT receive a flee.
    const parties = new Map(state.parties);
    const escort = parties.get(ESCORT_ID);
    if (!escort) throw new Error('no escort');
    const wounded = escort.units.map((u) => ({ ...u, currentHp: 1 }));
    parties.set(ESCORT_ID, { ...escort, units: wounded });
    let s: GameState = { ...state, parties };
    s = moveParty(s, 'pinch-bend-upper' as PartyId, { plane: 'floor', x: 1, y: 1 });
    const out = escortL2Player.decide(s, data, createRng(2));
    const after = out.parties.get(ESCORT_ID);
    expect(after?.orders.some((o) => o.kind === 'flee')).toBe(false);
  });

  it('7. is deterministic — same seed yields identical orders', () => {
    const { state, data } = loadScenario(L2_DIR, 7);
    const a = escortL2Player.decide(state, data, createRng(3));
    const b = escortL2Player.decide(state, data, createRng(3));
    for (const [id, pa] of a.parties) {
      const pb = b.parties.get(id);
      expect(pb?.orders).toEqual(pa.orders);
      expect(pb?.posture).toEqual(pa.posture);
    }
  });

  it('8. drives the full L2 scenario to a terminal state within max turns', () => {
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(L2_DIR, 4);
    const out = runScenario(state, data, createRng(4), tick(), {
      maxTurns: 100,
      policies: [escortL2Player, spiderL2, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    // Terminal state reached (no hang): a winner is decided and a
    // scenario-end event is emitted.
    expect(out.finalState.winner === 'ant' || out.finalState.winner === 'spider').toBe(true);
    const end = [...out.events].reverse().find((e) => e.kind === 'scenario-end');
    expect(end?.kind).toBe('scenario-end');
  });
});
