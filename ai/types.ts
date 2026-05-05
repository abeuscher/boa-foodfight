/**
 * AI policies are pure functions of (state, scenario, rng) -> state, where
 * the only mutation is to the `orders` of parties owned by `faction`. The
 * turn driver calls each policy once per turn, before movement resolves.
 *
 * Policies must be deterministic for a given seed, so the self-play harness
 * can reproduce runs from a replay log.
 */

import type { ScenarioData } from '../engine/state.ts';
import type { Faction, GameState, Rng } from '../engine/types.ts';

export interface AIPolicy {
  readonly name: string;
  readonly faction: Faction;
  decide(state: GameState, scenario: ScenarioData, rng: Rng): GameState;
}
