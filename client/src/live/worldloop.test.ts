import { describe, expect, it } from 'vitest';

import { createRng } from '../../../engine/rng.ts';
import type { ScenarioData } from '../../../engine/state.ts';
import { extractWorldRoster } from '../../../engine/world-extract.ts';

import scenarioData from '../fixtures/scenario-l1-data.json';

import { computeEndStats } from './endStats.ts';
import { buildHumanPolicy } from './humanPolicy.ts';
import { MAX_TURNS, advanceOneTurn, createInitialState, resolveTerminal } from './liveScenario.ts';
import { antHpFraction, scenarioReward } from './reward.ts';

const DATA = scenarioData as unknown as ScenarioData;
const SEED = 1;
const idle = buildHumanPolicy(new Map());

const runToTerminal = () => {
  let state = createInitialState(DATA, SEED);
  const rng = createRng(SEED);
  let tick = 0;
  let turns = 0;
  while (state.winner === null && turns < MAX_TURNS) {
    state = advanceOneTurn(state, DATA, idle, turns, rng, () => (tick += 1)).state;
    turns += 1;
  }
  return { state, turns };
};

describe('world-loop bridge', () => {
  it('injects a carried roster over the scenario scaffold', () => {
    // Round-trip: extract a roster from a fresh state, inject it back.
    const fresh = createInitialState(DATA, SEED);
    const roster = extractWorldRoster({ finalState: fresh, winner: 'ant' });
    expect(roster.units.length).toBeGreaterThan(0);
    const injected = createInitialState(DATA, SEED, roster);
    const antParties = [...injected.parties.values()].filter((p) => p.faction === 'ant');
    expect(antParties.length).toBeGreaterThan(0);
    // Spider parties are untouched by the inject.
    expect([...injected.parties.values()].some((p) => p.faction === 'spider')).toBe(true);
  });

  it('resolveTerminal returns a decisive winner outright', () => {
    const fresh = createInitialState(DATA, SEED);
    const t = resolveTerminal({ ...fresh, winner: 'ant' });
    expect(t.winner).toBe('ant');
    expect(t.scoreBreakdown).toBeUndefined();
  });

  it('resolveTerminal resolves an L1 cap-hit by score (never null)', () => {
    const { state } = runToTerminal();
    const t = resolveTerminal(state);
    expect(t.winner === 'ant' || t.winner === 'spider').toBe(true);
    // Idle L1 reaches the cap with no decisive winner → score path.
    if (state.winner === null) {
      expect(t.scoreBreakdown).toBeDefined();
    }
  });

  it('scenarioReward is flat 100 + up to 25 + 25, bounded 100..150', () => {
    const fresh = createInitialState(DATA, SEED);
    const fast = scenarioReward(fresh, 0); // full HP, instant
    expect(fast.flat).toBe(100);
    expect(fast.total).toBeGreaterThanOrEqual(100);
    expect(fast.total).toBeLessThanOrEqual(150);
    expect(fast.speedBonus).toBe(25); // (MAX-0)/MAX = 1
    const slow = scenarioReward(fresh, MAX_TURNS);
    expect(slow.speedBonus).toBe(0); // cap hit → no speed bonus
    expect(antHpFraction(fresh)).toBeGreaterThan(0);
  });

  it('computeEndStats maps the terminal to a player-facing debrief', () => {
    const { state, turns } = runToTerminal();
    const terminal = resolveTerminal(state);
    const stats = computeEndStats(state, terminal, turns);
    expect(stats.outcome).toBe(terminal.winner === 'ant' ? 'Victory' : 'Defeat');
    expect(stats.turnsElapsed).toBe(turns);
    expect(stats.postsHeld).toBeGreaterThanOrEqual(0);
    expect(stats.spiderKills).toBeGreaterThanOrEqual(0);
    if (terminal.scoreBreakdown) {
      expect(stats.resolution).toBe('Score-resolved');
      expect(stats.score).not.toBeNull();
    }
  });
});
