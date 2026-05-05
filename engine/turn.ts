/**
 * Turn driver for one scenario. Composes the verb modules in fixed order:
 *
 *   movement -> battles for collisions -> end-of-turn (heal/charge/jelly/
 *   produce/win-check/turn++)
 *
 * The driver is pure: given a state, scenario data, an Rng, and a tick clock
 * it returns a new state plus the `ReplayEvent`s emitted this turn. No I/O.
 */

import { resolveBattle } from './battle.ts';
import type { BattleInput } from './battle.ts';
import { distance } from './coord.ts';
import { endOfTurn } from './end-of-turn.ts';
import { resolveMovement } from './movement.ts';
import { containsQueen } from './parties.ts';
import { postAt } from './posts.ts';
import type { ScenarioData } from './state.ts';
import type { GameState, Party, PartyId, ReplayEvent, Rng, TileCoord } from './types.ts';

export interface TurnOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

const findQueenLocation = (state: GameState): TileCoord | undefined => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (containsQueen(party, state.unitTemplates)) return party.location;
  }
  return undefined;
};

const queenProximityFor = (
  state: GameState,
  party: Party,
  scenario: ScenarioData,
): { attack: number; resilience: number } => {
  if (party.faction !== 'ant') return { attack: 1, resilience: 1 };
  const queenLoc = findQueenLocation(state);
  if (!queenLoc) return { attack: 1, resilience: 1 };
  if (queenLoc.plane !== party.location.plane) return { attack: 1, resilience: 1 };
  if (distance(queenLoc, party.location) > scenario.queen.proximity.radius) {
    return { attack: 1, resilience: 1 };
  }
  return {
    attack: scenario.queen.proximity.attackMultiplier,
    resilience: scenario.queen.proximity.resilienceMultiplier,
  };
};

const jellyMultipliers = (
  party: Party,
  scenario: ScenarioData,
): { attack: number; resilience: number } => {
  if (party.jellyDoses <= 0) return { attack: 1, resilience: 1 };
  return {
    attack: scenario.jelly.attackMultiplier,
    resilience: scenario.jelly.resilienceMultiplier,
  };
};

/**
 * Decide which colliding party defends. If one occupies a friendly POST, that
 * party defends and gets the POST's defensive bonus. Otherwise the
 * lexicographically smaller id is the attacker so the assignment is
 * deterministic.
 */
const assignSides = (
  state: GameState,
  a: Party,
  b: Party,
): { attacker: Party; defender: Party; postDefense: number } => {
  const postA = postAt(state, a.location);
  const postB = postAt(state, b.location);
  const aIsDefending = postA?.owner === a.faction;
  const bIsDefending = postB?.owner === b.faction;

  if (aIsDefending && !bIsDefending && postA) {
    return { attacker: b, defender: a, postDefense: postA.defensiveBonus };
  }
  if (bIsDefending && !aIsDefending && postB) {
    return { attacker: a, defender: b, postDefense: postB.defensiveBonus };
  }
  // Neither side defends, or both occupy friendly POSTs. Pick deterministically
  // and carry whichever defender's POST defense applies (0 if neither has one).
  const sortedA = String(a.id) < String(b.id) ? a : b;
  const sortedB = sortedA === a ? b : a;
  const defenderPost = postAt(state, sortedB.location);
  const postDefense = defenderPost?.owner === sortedB.faction ? defenderPost.defensiveBonus : 0;
  return { attacker: sortedA, defender: sortedB, postDefense };
};

const buildBattleInput = (
  state: GameState,
  scenario: ScenarioData,
  pair: readonly [PartyId, PartyId],
): BattleInput | undefined => {
  const a = state.parties.get(pair[0]);
  const b = state.parties.get(pair[1]);
  if (!a || !b) return undefined;
  const { attacker, defender, postDefense } = assignSides(state, a, b);
  const atkProx = queenProximityFor(state, attacker, scenario);
  const atkJelly = jellyMultipliers(attacker, scenario);
  const defJelly = jellyMultipliers(defender, scenario);
  return {
    attacker,
    defender,
    postDefense,
    queenProximityAttack: atkProx.attack,
    queenProximityResilience: atkProx.resilience,
    attackerJellyAttack: atkJelly.attack,
    attackerJellyResilience: atkJelly.resilience,
    defenderJellyAttack: defJelly.attack,
    defenderJellyResilience: defJelly.resilience,
  };
};

export const runTurn = (
  state: GameState,
  scenario: ScenarioData,
  rng: Rng,
  tick: () => number,
): TurnOutcome => {
  let working = state;
  const events: ReplayEvent[] = [];

  // 1. Movement.
  const moveOutcome = resolveMovement(working, rng.fork('movement'), tick);
  working = moveOutcome.state;
  events.push(...moveOutcome.events);

  // 2. Battles for collisions.
  for (const pair of moveOutcome.collisions) {
    const input = buildBattleInput(working, scenario, pair);
    if (!input) continue;
    const battleRng = rng.fork(`battle-${String(pair[0])}-${String(pair[1])}`);
    const outcome = resolveBattle(working, input, battleRng, tick);
    working = outcome.state;
    events.push(...outcome.events);
  }

  // 3. End of turn (heal / charge / produce / win-check / turn++).
  const eotOutcome = endOfTurn(working, { queen: scenario.queen, jelly: scenario.jelly }, tick);
  working = eotOutcome.state;
  events.push(...eotOutcome.events);

  return { state: working, events };
};

export interface RunScenarioOptions {
  /** Hard cap on turns. Run stops when this is hit even if no winner. */
  readonly maxTurns: number;
}

export interface ScenarioOutcome {
  readonly finalState: GameState;
  readonly events: readonly ReplayEvent[];
  readonly turnsPlayed: number;
}

/**
 * Drive an entire scenario from initial state until a winner is declared or
 * the turn cap is reached. Emits a `scenario-start` event before turn 1 and a
 * `scenario-end` is included if the engine sets a winner.
 */
export const runScenario = (
  initial: GameState,
  scenario: ScenarioData,
  rng: Rng,
  tick: () => number,
  options: RunScenarioOptions,
  scenarioName = 'level-1',
): ScenarioOutcome => {
  const events: ReplayEvent[] = [];
  events.push({ kind: 'scenario-start', turn: 0, tick: tick(), scenario: scenarioName });
  events.push({ kind: 'turn-start', turn: 1, tick: tick() });

  let working = initial;
  let turnsPlayed = 0;
  while (working.winner === null && turnsPlayed < options.maxTurns) {
    const outcome = runTurn(working, scenario, rng, tick);
    working = outcome.state;
    events.push(...outcome.events);
    turnsPlayed += 1;
  }

  return { finalState: working, events, turnsPlayed };
};
