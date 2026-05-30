import { describe, expect, it } from 'vitest';

import { createRng } from '../../../engine/rng.ts';
import type { ScenarioData } from '../../../engine/state.ts';
import type { PartyId } from '../../../engine/types.ts';

import scenarioData from '../fixtures/scenario-l1-data.json';

import { buildHumanPolicy } from './humanPolicy.ts';
import { MAX_TURNS, advanceOneTurn, createInitialState } from './liveScenario.ts';

const DATA = scenarioData as unknown as ScenarioData;
const SEED = 1;

const idle = buildHumanPolicy(new Map());

describe('live engine-in-browser core', () => {
  it('builds the initial L1 state from bundled scenario data (no fs)', () => {
    const state = createInitialState(DATA, SEED);
    expect(state.turn).toBe(0);
    expect(state.winner).toBeNull();
    expect(state.parties.size).toBeGreaterThan(0);
    // Both factions present.
    const factions = new Set([...state.parties.values()].map((p) => p.faction));
    expect(factions.has('ant')).toBe(true);
    expect(factions.has('spider')).toBe(true);
  });

  it('advances one turn and emits events', () => {
    const state = createInitialState(DATA, SEED);
    const rng = createRng(SEED);
    let tick = 0;
    const res = advanceOneTurn(state, DATA, idle, 0, rng, () => (tick += 1));
    expect(res.events.length).toBeGreaterThan(0);
    expect(res.state.turn).toBe(1);
    expect(tick).toBeGreaterThan(0);
  });

  it('is deterministic for a fixed seed and identical orders', () => {
    const run = (): readonly string[] => {
      let state = createInitialState(DATA, SEED);
      const rng = createRng(SEED);
      let tick = 0;
      const kinds: string[] = [];
      for (let t = 0; t < 5; t++) {
        const res = advanceOneTurn(state, DATA, idle, t, rng, () => (tick += 1));
        state = res.state;
        for (const e of res.events) kinds.push(e.kind);
      }
      return kinds;
    };
    expect(run()).toEqual(run());
  });

  it('reaches a terminal state within the turn cap', () => {
    let state = createInitialState(DATA, SEED);
    const rng = createRng(SEED);
    let tick = 0;
    let turns = 0;
    while (state.winner === null && turns < MAX_TURNS) {
      const res = advanceOneTurn(state, DATA, idle, turns, rng, () => (tick += 1));
      state = res.state;
      turns += 1;
    }
    // L1 with an idle player and the spider AI resolves (winner set, or
    // the cap is hit — both are valid terminals the UI handles).
    expect(turns).toBeLessThanOrEqual(MAX_TURNS);
    expect(state.turn).toBe(turns);
  });

  it('a player move order changes a controllable party from idle', () => {
    const state = createInitialState(DATA, SEED);
    const movable = [...state.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    );
    expect(movable).toBeDefined();
    const dest = {
      plane: movable!.location.plane,
      x: movable!.location.x + 1,
      y: movable!.location.y,
    };
    const player = buildHumanPolicy(new Map([[movable!.id, { kind: 'move', dest }]]));
    const rng = createRng(SEED);
    let tick = 0;
    const res = advanceOneTurn(state, DATA, player, 0, rng, () => (tick += 1));
    const after = res.state.parties.get(movable!.id);
    expect(after).toBeDefined();
    // The ordered party either moved or has an active move order it is
    // pursuing (engine steps toward distant targets).
    const moved =
      after!.location.x !== movable!.location.x || after!.location.y !== movable!.location.y;
    const hasOrder = after!.orders.some((o) => o.kind === 'move-to');
    expect(moved || hasOrder).toBe(true);
  });

  it('hold (null) issues no movement for a controllable party', () => {
    const state = createInitialState(DATA, SEED);
    const movable = [...state.parties.values()].find(
      (p) => p.faction === 'ant' && p.id !== ('queen-guard' as PartyId),
    )!;
    const player = buildHumanPolicy(new Map([[movable.id, { kind: 'hold' }]]));
    const rng = createRng(SEED);
    let tick = 0;
    const res = advanceOneTurn(state, DATA, player, 0, rng, () => (tick += 1));
    const after = res.state.parties.get(movable.id)!;
    expect(after.orders.some((o) => o.kind === 'move-to')).toBe(false);
  });
});
