import { describe, expect, it } from 'vitest';

import { createRng } from '../../../engine/rng.ts';
import type { ScenarioData } from '../../../engine/state.ts';
import type { PartyId, UnitTemplateId } from '../../../engine/types.ts';
import { extractWorldRoster } from '../../../engine/world-extract.ts';

import scenarioL1Data from '../fixtures/scenario-l1-data.json';
import scenarioL2Data from '../fixtures/scenario-l2-data.json';
import { scenarioPreserveFor } from '../fixture.ts';

import { computeEndStats } from './endStats.ts';
import { buildHumanPolicy } from './humanPolicy.ts';
import { MAX_TURNS, advanceOneTurn, createInitialState, resolveTerminal } from './liveScenario.ts';
import { antHpFraction, scenarioReward } from './reward.ts';

const DATA = scenarioL1Data as unknown as ScenarioData;
const L2_DATA = scenarioL2Data as unknown as ScenarioData;
const L2_ESCORT_PARTY = 'escort-column' as PartyId;
const AUNT_ANT_TEMPLATE = 'aunt-ant' as UnitTemplateId;
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

  // Chunk B3 — L2 roster injection on continue.
  it('L2 boot with L1 carry preserves the Aunt Ant escort-column party', () => {
    // Extract a roster as if L1 just won — the App-side flow that the
    // continue button drives.
    const l1Final = createInitialState(DATA, SEED);
    const carry = extractWorldRoster({ finalState: l1Final, winner: 'ant' });

    // Without preserve: the L2 inject would silently drop escort-column
    // because the carried L1 roster has no assignment for that id.
    const naive = createInitialState(L2_DATA, SEED, carry);
    expect(naive.parties.get(L2_ESCORT_PARTY)).toBeUndefined();

    // With preserve (the fixture's per-scenario lookup): escort-column
    // survives the inject with its Aunt Ant intact, while the carried
    // L1 vets still rebuild every other ant party.
    const preserved = createInitialState(L2_DATA, SEED, carry, scenarioPreserveFor(1));
    const escort = preserved.parties.get(L2_ESCORT_PARTY);
    expect(escort).toBeDefined();
    expect(escort?.faction).toBe('ant');
    expect(escort?.units.some((u) => u.templateId === AUNT_ANT_TEMPLATE)).toBe(true);

    // And the carried roster's other parties (queen-guard, vanguards,
    // pathfinders) also show up — composition, not replacement.
    const antIds = [...preserved.parties.values()]
      .filter((p) => p.faction === 'ant')
      .map((p) => p.id);
    expect(antIds).toContain('queen-guard');
    expect(antIds).toContain(L2_ESCORT_PARTY);
  });

  it('L1 boot is unaffected by the B3 preserve plumbing', () => {
    // L1's preserve set is empty, so passing it explicitly should be
    // identical to omitting it. Sanity check: same ant party set.
    const fresh = createInitialState(DATA, SEED);
    const roster = extractWorldRoster({ finalState: fresh, winner: 'ant' });
    const withPreserve = createInitialState(DATA, SEED, roster, scenarioPreserveFor(0));
    const withoutPreserve = createInitialState(DATA, SEED, roster);
    const ids = (s: typeof withPreserve): string[] =>
      [...s.parties.values()]
        .filter((p) => p.faction === 'ant')
        .map((p) => String(p.id))
        .sort();
    expect(ids(withPreserve)).toEqual(ids(withoutPreserve));
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
