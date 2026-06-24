/**
 * Shared L1 seed-sweep wiring used by `playtest-l1.ts` and
 * `combat-phase1-measure.ts`. Encapsulates the 3-policy roster
 * (baseline-v2 ant, spider-l1-v2 spider, neutral) + `runScenario`
 * invocation so the measurement scripts stop redeclaring the same
 * boilerplate (jscpd was flagging it as a clone). Returns the loaded
 * initial state alongside the scenario outcome — measurement scripts
 * commonly need `initialState.parties` for faction lookup that
 * `outcome.finalState` alone can't always provide (e.g. parties that
 * wiped pre-final-tick).
 */

import { baselineV2 } from '../ai/baseline-v2.ts';
import { neutralPlayer } from '../ai/neutral.ts';
import { spiderL1V2 } from '../ai/spider-l1-v2.ts';
import { createTickClock } from '../engine/replay.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import { runScenario } from '../engine/turn.ts';
import type { Faction, GameState, ReplayEvent } from '../engine/types.ts';

export interface L1SweepResult {
  readonly initialState: GameState;
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
  readonly turnsPlayed: number;
  readonly winner: Faction | null;
}

export const L1_SWEEP_AIS = {
  player: baselineV2,
  enemy: spiderL1V2,
  neutral: neutralPlayer,
} as const;

const wrapPolicy = (
  policy: typeof baselineV2,
): {
  name: string;
  faction: Faction;
  decide: typeof policy.decide;
} => ({
  name: policy.name,
  faction: policy.faction,
  decide: (state, scenario, rng) => policy.decide(state, scenario, rng),
});

export const runL1Seed = (seed: number, dataDir: string): L1SweepResult => {
  const loaded = loadScenario(dataDir, seed);
  const tickClock = createTickClock();
  const outcome = runScenario(loaded.state, loaded.data, createRng(seed), tickClock.next, {
    maxTurns: 100,
    policies: [
      wrapPolicy(L1_SWEEP_AIS.player),
      wrapPolicy(L1_SWEEP_AIS.enemy),
      wrapPolicy(L1_SWEEP_AIS.neutral),
    ],
    neutralSpawnEvents: loaded.neutralSpawnEvents,
    itemSpawnEvents: loaded.itemSpawnEvents,
  });
  return {
    initialState: loaded.state,
    finalState: outcome.finalState,
    events: outcome.events,
    turnsPlayed: outcome.turnsPlayed,
    winner: outcome.finalState.winner,
  };
};
