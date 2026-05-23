/**
 * Live engine-in-browser driver core (pure, framework-free).
 *
 * Runs the REAL turn engine in the browser, one turn at a time, instead
 * of animating a pre-baked event stream. The browser bundles the parsed
 * L1 `ScenarioData` (see `client/scripts/gen-l1-scenario.ts`), rebuilds
 * the full `GameState` via the pure `buildInitialStateWithEvents`, then
 * advances with `advanceOneTurn` — the per-turn body of `engine/turn.ts`
 * `runScenario`, lifted here so the player's parties run on a human
 * policy instead of the baseline ant AI. Spider + neutral stay on the
 * fixed L1 reference AIs.
 *
 * Determinism note: the base `rng` is never advanced directly — both
 * `runTurn` and the policy loop only *fork* it (fork reads the parent
 * state without mutating it). Per-turn variation comes from the
 * turn-stamped policy fork label (`policy-<name>-<turn>`) and the
 * evolving game state, mirroring `runScenario`. The only mutable counter
 * is the monotonic `tick`, owned by the caller and threaded in here.
 *
 * Browser-safety: `buildInitialStateWithEvents` shares `engine/state.ts`
 * with the `fs`-based `loadScenarioData`, but the loader is never called
 * from the browser, so the bundle pulls in no `node:` builtins.
 */
import { neutralPlayer } from '../../../ai/neutral.ts';
import { spiderL1 } from '../../../ai/spider-l1.ts';
import type { AIPolicy } from '../../../ai/types.ts';

import { scoreScenario, winnerFromScore, type ScoreBreakdown } from '../../../engine/score.ts';
import { buildInitialStateWithEvents, type ScenarioData } from '../../../engine/state.ts';
import { runTurn } from '../../../engine/turn.ts';
import { DEFAULT_VICTORY_CONDITION } from '../../../engine/types.ts';
import type { Faction, GameState, ReplayEvent, Rng } from '../../../engine/types.ts';
import { injectWorldRoster, scaffoldFromState } from '../../../engine/world-inject.ts';
import type { WorldRoster } from '../../../engine/world-state.ts';

/** Turn cap, matching the L1 reference run (`gen-l1-replay`). */
export const MAX_TURNS = 100;

/** The fixed L1 opponents the player plays against. */
const ENEMY: AIPolicy = spiderL1;
const NEUTRAL: AIPolicy = neutralPlayer;

/**
 * Build the initial L1 `GameState` from bundled scenario data. When a
 * carried `roster` is supplied (the Hill's `WorldState.roster`), the
 * player's organized army is injected over the scaffold ant parties —
 * the same `injectWorldRoster` path `harness/world-loop.ts` uses — so
 * recruits / formation / equipped items carry into the fight. Without a
 * roster, the scenario's own `roster-ants` placement is used (sandbox).
 */
export const createInitialState = (
  scenario: ScenarioData,
  seed: number,
  roster?: WorldRoster,
): GameState => {
  const base = buildInitialStateWithEvents(scenario, seed).state;
  if (!roster) return base;
  return injectWorldRoster(base, roster, scaffoldFromState(base)).state;
};

export interface Terminal {
  readonly winner: Faction;
  /** Present only when the scenario resolved by score (cap hit). */
  readonly scoreBreakdown?: ScoreBreakdown;
}

/** What a finished scenario hands up to the world loop. */
export interface LiveOutcome {
  readonly finalState: GameState;
  readonly terminal: Terminal;
  readonly turnsPlayed: number;
}

/**
 * Decide the final winner, mirroring `runScenario`'s epilogue (which the
 * live driver doesn't run, since it calls `runTurn` directly): a decisive
 * `state.winner` wins outright; otherwise a cap-hit on the capture-post /
 * default path resolves by score (L1's path per pacing §A.3), and the
 * mission victory kinds resolve to spider. Without this, an L1 game that
 * reaches the turn cap would end with `winner = null`.
 */
export const resolveTerminal = (state: GameState): Terminal => {
  if (state.winner !== null) return { winner: state.winner };
  const vc = state.victoryCondition ?? DEFAULT_VICTORY_CONDITION;
  if (vc.kind === 'escort' || vc.kind === 'eradicate' || vc.kind === 'recruit-count') {
    return { winner: 'spider' };
  }
  const scoreBreakdown = scoreScenario(state);
  return { winner: winnerFromScore(scoreBreakdown), scoreBreakdown };
};

export interface TurnResult {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

/**
 * Resolve exactly one turn. `player` is the human policy built from the
 * player's queued destinations; the enemy + neutral are the fixed L1
 * reference AIs. `rng` is the stable base source (never advanced
 * directly); `nextTick` is the caller's monotonic tick generator. Pure
 * w.r.t. its inputs — returns the next state plus this turn's events.
 */
export const advanceOneTurn = (
  state: GameState,
  scenario: ScenarioData,
  player: AIPolicy,
  turn: number,
  rng: Rng,
  nextTick: () => number,
): TurnResult => {
  const policies: readonly AIPolicy[] = [player, ENEMY, NEUTRAL];

  let working = state;
  for (const policy of policies) {
    working = policy.decide(working, scenario, rng.fork(`policy-${policy.name}-${String(turn)}`));
  }

  const events: ReplayEvent[] = [];
  // Round 16 — drain policy-emitted events (e.g. flee-queued), stamping
  // each with the next tick, mirroring runScenario.
  const pending = working.pendingPolicyEvents ?? [];
  if (pending.length > 0) {
    for (const ev of pending) events.push({ ...ev, tick: nextTick() });
    working = { ...working, pendingPolicyEvents: [] };
  }

  const outcome = runTurn(working, scenario, rng, nextTick);
  events.push(...outcome.events);
  return { state: outcome.state, events };
};
