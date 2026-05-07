/**
 * Turn driver for one scenario. Composes the verb modules in fixed order:
 *
 *   movement -> battles for collisions -> end-of-turn (heal/charge/jelly/
 *   produce/win-check/turn++)
 *
 * The driver is pure: given a state, scenario data, an Rng, and a tick clock
 * it returns a new state plus the `ReplayEvent`s emitted this turn. No I/O.
 */

import { resolveAbilityOrders } from './abilities.ts';
import { resolveBattle } from './battle.ts';
import type { BattleInput } from './battle.ts';
import { distance } from './coord.ts';
import { endOfTurn } from './end-of-turn.ts';
import { resolveMovement } from './movement.ts';
import { containsQueen } from './parties.ts';
import { applyPlacement } from './placement.ts';
import { postAt, resolveCaptures } from './posts.ts';
import type { NeutralSpawnEvent, ScenarioData } from './state.ts';
import type { Faction, GameState, Party, PartyId, ReplayEvent, Rng, TileCoord } from './types.ts';

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
    abilities: scenario.abilities,
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

  // 0. Ability orders (use-ability). Resolved before movement so the
  //    jelly buff is active when movement-triggered battles fire.
  const abilityOutcome = resolveAbilityOrders(working, scenario.jelly, rng.fork('abilities'), tick);
  working = abilityOutcome.state;
  events.push(...abilityOutcome.events);

  // 1. Movement.
  const moveOutcome = resolveMovement(working, rng.fork('movement'), tick);
  working = moveOutcome.state;
  events.push(...moveOutcome.events);

  // 2. Battles for collisions. Re-check liveness against the working state
  // (not the snapshot from movement) because an earlier battle in the loop
  // may have wiped one of the parties already.
  for (const pair of moveOutcome.collisions) {
    const a = working.parties.get(pair[0]);
    const b = working.parties.get(pair[1]);
    if (!a || !b) continue;
    const aAlive = a.units.some((u) => u.currentHp > 0);
    const bAlive = b.units.some((u) => u.currentHp > 0);
    if (!aAlive || !bAlive) continue;
    const input = buildBattleInput(working, scenario, pair);
    if (!input) continue;
    const battleRng = rng.fork(`battle-${String(pair[0])}-${String(pair[1])}`);
    const outcome = resolveBattle(working, input, battleRng, tick);
    working = outcome.state;
    events.push(...outcome.events);
  }

  // 3. POST capture: friendly party sitting on a non-friendly POST takes it.
  const captureOutcome = resolveCaptures(working, tick);
  working = captureOutcome.state;
  events.push(...captureOutcome.events);

  // 4. End of turn (heal / charge / produce / win-check / turn++).
  const eotOutcome = endOfTurn(working, { queen: scenario.queen, jelly: scenario.jelly }, tick);
  working = eotOutcome.state;
  events.push(...eotOutcome.events);

  return { state: working, events };
};

/**
 * Per-turn decision function. Concrete `AIPolicy` implementations live in
 * `ai/`; the turn driver only needs the function signature, so it doesn't
 * import from `ai/` (preserving the engine→ai one-way dependency in
 * CONTRACTS.md). The runScenario harness extracts `.decide` from each
 * policy and passes it here.
 *
 * Round-7 feature 2: an optional `placement` hook fires once before
 * turn 1. The driver passes the just-built initial state plus a
 * dedicated rng fork; the hook returns a state with that policy's
 * faction's parties at chosen tiles. The driver then validates each
 * move against per-faction rules (see engine/placement.ts) and silently
 * reverts invalid placements.
 */
export interface PolicyHandle {
  readonly name: string;
  readonly faction: Faction;
  readonly decide: (state: GameState, scenario: ScenarioData, rng: Rng) => GameState;
  readonly placement?: (state: GameState, scenario: ScenarioData, rng: Rng) => GameState;
}

export interface RunScenarioOptions {
  /** Hard cap on turns. Run stops when this is hit even if no winner. */
  readonly maxTurns: number;
  /** Optional AI policies. Each runs once per turn before movement resolves. */
  readonly policies?: readonly PolicyHandle[];
  /**
   * Round-8 neutral-spawn payloads to emit alongside `scenario-start`.
   * The driver attaches `turn`/`tick` and emits one `neutral-spawned`
   * event per entry. Optional: omitted means no neutrals were spawned
   * (e.g., legacy harness callers).
   */
  readonly neutralSpawnEvents?: readonly NeutralSpawnEvent[];
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
  const policies = options.policies ?? [];

  // Round-7 feature 2: pre-game placement. Each policy with a
  // `placement` hook runs once before turn 1; the engine validates
  // each requested move and silently reverts invalid ones. Faction
  // order is fixed (ant first, then spider) but the operations are
  // independent — each policy can only diff its own faction's parties.
  let working = initial;
  for (const policy of policies) {
    if (!policy.placement) continue;
    const proposed = policy.placement(working, scenario, rng.fork(`placement-${policy.name}`));
    working = applyPlacement(policy.faction, working, proposed, scenario);
  }

  // Snapshot the initial POST layout and obstacle tiles so the viewer
  // can render per-seed map randomization. (Without this, the viewer
  // would fall back to the canonical layout and per-seed POSTs would
  // appear identical across all replays.)
  const postsSnapshot = [...working.posts.values()].map((p) => ({
    id: p.id,
    location: p.location,
    owner: p.owner,
  }));
  const obstaclesSnapshot: TileCoord[] = [];
  for (const tile of working.tiles.values()) {
    if (tile.terrain.kind === 'obstacle') obstaclesSnapshot.push(tile.coord);
  }
  // Snapshot the FINAL party positions (post-placement) so replays are
  // self-contained — old replays without this field still work because
  // the field is optional.
  const partyPositionsSnapshot: { partyId: PartyId; location: TileCoord }[] = [];
  for (const id of [...working.parties.keys()].sort()) {
    const party = working.parties.get(id);
    if (!party) continue;
    partyPositionsSnapshot.push({ partyId: id, location: party.location });
  }
  // Round-N: full per-party + per-unit snapshot so the viewer can
  // render a parties/units side panel that updates with the scrubber.
  // Same sort order as partyPositionsSnapshot for deterministic output.
  const partiesSnapshot = [...working.parties.keys()]
    .sort()
    .map((id) => working.parties.get(id))
    .filter((p): p is Party => p !== undefined)
    .map((p) => ({
      id: p.id,
      faction: p.faction,
      location: p.location,
      leaderId: p.leaderId,
      posture: p.posture,
      jellyDoses: p.jellyDoses,
      units: p.units.map((u) => ({
        id: u.id,
        templateId: u.templateId,
        currentHp: u.currentHp,
        level: u.level,
        xp: u.xp,
      })),
    }));
  // Unit-template digest. Sort by id for deterministic output.
  const templatesSnapshot = [...working.unitTemplates.keys()]
    .sort()
    .map((id) => working.unitTemplates.get(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .map((t) => ({
      id: t.id,
      name: t.name,
      faction: t.faction,
      baseStats: t.baseStats,
      abilities: t.abilities,
      tags: t.tags,
    }));
  events.push({
    kind: 'scenario-start',
    turn: 0,
    tick: tick(),
    scenario: scenarioName,
    posts: postsSnapshot,
    obstacles: obstaclesSnapshot,
    partyPositions: partyPositionsSnapshot,
    parties: partiesSnapshot,
    unitTemplates: templatesSnapshot,
  });
  // Round 8: emit one `neutral-spawned` event per spawned neutral
  // party. These follow `scenario-start` (same turn 0) so a viewer
  // replaying the log can render the neutrals with the rest of the
  // initial board state.
  for (const ev of options.neutralSpawnEvents ?? []) {
    events.push({
      kind: 'neutral-spawned',
      turn: 0,
      tick: tick(),
      partyId: ev.partyId,
      neutralKind: ev.neutralKind,
      location: ev.location,
    });
  }
  events.push({ kind: 'turn-start', turn: 1, tick: tick() });

  let turnsPlayed = 0;
  while (working.winner === null && turnsPlayed < options.maxTurns) {
    for (const policy of policies) {
      working = policy.decide(
        working,
        scenario,
        rng.fork(`policy-${policy.name}-${String(turnsPlayed)}`),
      );
      // Round 13 — drain any AI-emitted telemetry events the policy
      // queued onto state.pendingPolicyEvents. The driver appends
      // them to the replay stream and clears the queue so subsequent
      // policies start with an empty buffer. Pure pass-through; no
      // policy currently depends on reading the queue back.
      const queued = working.pendingPolicyEvents ?? [];
      if (queued.length > 0) {
        events.push(...queued);
        working = { ...working, pendingPolicyEvents: [] };
      }
    }
    const outcome = runTurn(working, scenario, rng, tick);
    working = outcome.state;
    events.push(...outcome.events);
    turnsPlayed += 1;
  }

  return { finalState: working, events, turnsPlayed };
};
