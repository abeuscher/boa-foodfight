/**
 * Roadmap §7.13 (Exchange #9) — mid-scenario save (Option B,
 * input-stream replay).
 *
 * The engine is fully deterministic from seed + the ordered input
 * stream (the project's most-proven property — gate-29 / replay
 * determinism). So a mid-scenario save is NOT a `GameState` snapshot:
 * it is `{ seed, scenarioId, savedAtTurn, orderLog }`, where
 * `orderLog` is the player's per-turn issued orders. Restore re-runs
 * the scenario feeding that log back in (a replay policy), stopping
 * at `savedAtTurn` — the returned state IS the checkpoint.
 *
 * NOT sim-path / NOT golden-master-gated: `runScenario` and every
 * combat file are untouched. This module only adds two policies and a
 * pure orchestration over the existing `runScenario`. Determinism is
 * the correctness guarantee; if it ever broke, restore would diverge
 * loudly (an intended Option-B property).
 *
 * The on-disk contract (`engine/schemas/scenario-save.ts`) is frozen
 * here; the real-time UI later just emits the same `orderLog` shape.
 * The auto-save *trigger* (a scenario-data point that fires the save)
 * is a defined-but-deferred part of §7.13 — its firing needs the
 * human turn-driver, which is unbuilt; the format + restore (this
 * module) are buildable and tested now with synthetic logs.
 */

import { scenarioSaveSchema } from './schemas/scenario-save.ts';
import type { ScenarioData } from './state.ts';
import type { PolicyHandle, RunScenarioOptions } from './turn.ts';
import { runScenario } from './turn.ts';
import type { Faction, GameState, Order, PartyId, ReplayEvent, Rng } from './types.ts';

export interface PartyOrderLog {
  readonly partyId: PartyId;
  readonly orders: readonly Order[];
}

export interface TurnOrderLog {
  readonly turn: number;
  readonly parties: readonly PartyOrderLog[];
}

export interface ScenarioSave {
  readonly version: 1;
  readonly scenarioId: string;
  readonly seed: number;
  readonly savedAtTurn: number;
  readonly orderLog: readonly TurnOrderLog[];
}

/**
 * Wrap a player `PolicyHandle`, recording the orders it attaches to
 * its faction's parties each turn into `sink`. The future real-time
 * UI produces an equivalent log directly; this wrapper is how a log
 * is captured from a deterministic policy (tests, tooling).
 */
export const recordingPlayer = (inner: PolicyHandle, sink: TurnOrderLog[]): PolicyHandle => ({
  name: `record(${inner.name})`,
  faction: inner.faction,
  ...(inner.placement ? { placement: inner.placement } : {}),
  decide: (state, scenario, rng) => {
    const next = inner.decide(state, scenario, rng);
    const parties: PartyOrderLog[] = [];
    for (const p of next.parties.values()) {
      if (p.faction !== inner.faction) continue;
      if (p.orders.length === 0) continue;
      parties.push({ partyId: p.id, orders: [...p.orders] });
    }
    if (parties.length > 0) sink.push({ turn: state.turn, parties });
    return next;
  },
});

/**
 * A player policy that re-issues a recorded `orderLog`: on each turn
 * it sets the logged orders on the matching (still-present) parties.
 * After the log ends it issues nothing (the restore run is bounded by
 * `savedAtTurn` anyway).
 */
export const replayPlayer = (
  name: string,
  faction: Faction,
  orderLog: readonly TurnOrderLog[],
): PolicyHandle => {
  const byTurn = new Map<number, readonly PartyOrderLog[]>();
  for (const t of orderLog) byTurn.set(t.turn, t.parties);
  return {
    name,
    faction,
    decide: (state) => {
      const logged = byTurn.get(state.turn);
      if (!logged || logged.length === 0) return state;
      const parties = new Map(state.parties);
      for (const pl of logged) {
        const party = parties.get(pl.partyId);
        if (!party) continue; // determinism keeps parties aligned; defensive
        parties.set(pl.partyId, { ...party, orders: [...pl.orders] });
      }
      return { ...state, parties };
    },
  };
};

/**
 * Restore a mid-scenario save: re-run `runScenario` with the player
 * side driven by the saved order log, the deterministic enemy /
 * neutral policies supplied by the caller, bounded to `savedAtTurn`.
 * The returned `finalState` is the checkpoint the player saved at.
 *
 * Pure orchestration — `initial` / `rng` are the freshly seed-loaded
 * scenario (caller's job, mirroring the world-loop runner); this
 * never modifies the sim.
 */
export const restoreScenario = (
  save: ScenarioSave,
  initial: GameState,
  scenario: ScenarioData,
  rng: Rng,
  tick: () => number,
  otherPolicies: readonly PolicyHandle[],
  extras?: Pick<RunScenarioOptions, 'neutralSpawnEvents' | 'itemSpawnEvents'> & {
    readonly playerFaction?: Faction;
  },
): { state: GameState; events: readonly ReplayEvent[] } => {
  const outcome = runScenario(initial, scenario, rng, tick, {
    maxTurns: save.savedAtTurn,
    policies: [
      replayPlayer('replay-player', extras?.playerFaction ?? 'ant', save.orderLog),
      ...otherPolicies,
    ],
    // Forward the seed-loaded spawn payloads so the re-run is
    // bit-for-bit the original up to `savedAtTurn`.
    ...(extras?.neutralSpawnEvents ? { neutralSpawnEvents: extras.neutralSpawnEvents } : {}),
    ...(extras?.itemSpawnEvents ? { itemSpawnEvents: extras.itemSpawnEvents } : {}),
  });
  return { state: outcome.finalState, events: outcome.events };
};

/** Stable JSON for a save (fixed key order — byte-stable like
 * `world-state` serialization). */
export const serializeScenarioSave = (save: ScenarioSave): string =>
  JSON.stringify(
    {
      version: save.version,
      scenarioId: save.scenarioId,
      seed: save.seed,
      savedAtTurn: save.savedAtTurn,
      orderLog: save.orderLog.map((t) => ({
        turn: t.turn,
        parties: t.parties.map((p) => ({ partyId: p.partyId, orders: [...p.orders] })),
      })),
    },
    null,
    2,
  );

/** Parse + validate a save blob (trust boundary — a malformed save
 * fails loudly rather than corrupting a restore). */
export const parseScenarioSave = (str: string): ScenarioSave => {
  const parsed = scenarioSaveSchema.parse(JSON.parse(str) as unknown);
  return {
    version: 1,
    scenarioId: parsed.scenarioId,
    seed: parsed.seed,
    savedAtTurn: parsed.savedAtTurn,
    orderLog: parsed.orderLog.map((t) => ({
      turn: t.turn,
      parties: t.parties.map((p) => ({
        partyId: p.partyId as PartyId,
        orders: p.orders as unknown as readonly Order[],
      })),
    })),
  };
};
