/**
 * AI policies are pure functions of (state, scenario, rng) -> state, where
 * the only mutation is to the `orders` of parties owned by `faction`. The
 * turn driver calls each policy once per turn, before movement resolves.
 *
 * Policies must be deterministic for a given seed, so the self-play harness
 * can reproduce runs from a replay log.
 *
 * Round-7 feature 2: an optional `placement` hook fires once before turn 1.
 * Each policy gets the just-built initial state and may reposition its own
 * faction's parties subject to the engine's per-faction placement rules
 * (see `engine/placement.ts`). The engine validates each repositioned
 * party and silently reverts invalid placements to the roster default,
 * so a buggy or aggressive policy can't escape the scenario constraints.
 */

import type { ScenarioData } from '../engine/state.ts';
import type { Faction, GameState, Rng } from '../engine/types.ts';

export interface AIPolicy {
  readonly name: string;
  readonly faction: Faction;
  decide(state: GameState, scenario: ScenarioData, rng: Rng): GameState;
  /**
   * Optional pre-game placement hook (round-7 feature 2). Called once,
   * before turn 1, after the initial state is built. The hook should
   * return a new GameState with this faction's parties at their chosen
   * starting tiles. The engine then validates each move and reverts
   * invalid ones, so the implementation can be best-effort. Undefined
   * means "use roster positions".
   */
  readonly placement?: (state: GameState, scenario: ScenarioData, rng: Rng) => GameState;
}
