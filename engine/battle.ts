/**
 * engine/battle — auto-resolve a single battle between two parties on the same
 * tile. Composes pure math from `engine/combat.ts`; emits replay events and
 * returns a new GameState with HP/casualty/XP/retreat/leaderless mutations.
 * No I/O, no `Math.random()` — all randomness flows through the injected Rng.
 * Imports allowed: `engine/types`, `engine/combat` only (see CONTRACTS.md).
 */

import {
  computeAgilityOrder,
  computeDamage,
  computePostureMultipliers,
  computeStrategyMultiplier,
  decideRoundCount,
  type DamageModifiers,
  type PostureMultipliers,
  type StrategyMultipliers,
} from './combat.ts';
import type {
  BattleAction,
  BattleResult,
  BattleRound,
  Faction,
  GameState,
  Party,
  PartyId,
  PostId,
  ReplayEvent,
  Rng,
  Stats,
  StrategyModifier,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

export interface BattleInput {
  readonly attacker: Party;
  readonly defender: Party;
  /** Defensive bonus from any POST occupied by the defender at the battle tile (0 if none). */
  readonly postDefense: number;
  /** Multiplicative attack/resilience bonuses if the Queen is in proximity (1.0 if none). */
  readonly queenProximityAttack: number;
  readonly queenProximityResilience: number;
  /** Jelly multipliers active for each party (1.0 if no jelly active). */
  readonly attackerJellyAttack: number;
  readonly attackerJellyResilience: number;
  readonly defenderJellyAttack: number;
  readonly defenderJellyResilience: number;
}

export interface BattleOutcome {
  readonly state: GameState;
  readonly result: BattleResult;
  readonly events: readonly ReplayEvent[];
}

// XP tuning placeholder per spec ("individual battle participation").
const XP_WIN = 10;
const XP_LOSE = 3;

type Side = 'attacker' | 'defender';

interface LiveUnit {
  readonly id: UnitId;
  readonly side: Side;
  readonly stats: Stats;
  readonly isLeader: boolean;
  hp: number;
  killed: boolean;
}

interface ResolveContext {
  readonly attackerStrats: readonly StrategyModifier[];
  readonly defenderStrats: readonly StrategyModifier[];
  readonly atkPosture: PostureMultipliers;
  readonly defPosture: PostureMultipliers;
  readonly atkStrat: StrategyMultipliers;
  readonly defStrat: StrategyMultipliers;
  readonly input: BattleInput;
  readonly damageRng: Rng;
}

const buildLiveUnits = (
  party: Party,
  side: Side,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): LiveUnit[] =>
  party.units.map((u) => {
    const tmpl = templates.get(u.templateId);
    if (!tmpl) throw new Error(`battle: unknown templateId '${u.templateId}' for unit '${u.id}'`);
    return {
      id: u.id,
      side,
      stats: tmpl.baseStats,
      isLeader: u.id === party.leaderId,
      hp: u.currentHp,
      killed: u.currentHp <= 0,
    };
  });

const livingOnSide = (units: readonly LiveUnit[], side: Side): readonly LiveUnit[] =>
  units.filter((u) => !u.killed && u.side === side);

/**
 * Targeting policy:
 *   1. `target-weakest` on actor side: pick the lowest-HP enemy.
 *   2. `protect-leader` on enemy side: prefer non-leader enemies (round-robin).
 *   3. Otherwise round-robin: actor[i] hits enemies[i % enemies.length].
 */
const pickTarget = (
  enemies: readonly LiveUnit[],
  actorStrategies: readonly StrategyModifier[],
  enemyStrategies: readonly StrategyModifier[],
  fallbackIndex: number,
): LiveUnit | null => {
  if (enemies.length === 0) return null;
  if (actorStrategies.includes('target-weakest')) {
    let best: LiveUnit | null = null;
    for (const e of enemies) if (best === null || e.hp < best.hp) best = e;
    return best;
  }
  if (enemyStrategies.includes('protect-leader')) {
    const nonLeaders = enemies.filter((e) => !e.isLeader);
    if (nonLeaders.length > 0) return nonLeaders[fallbackIndex % nonLeaders.length] ?? null;
  }
  return enemies[fallbackIndex % enemies.length] ?? null;
};

const HOME_POST_BY_FACTION: Readonly<Record<Faction, string | null>> = {
  ant: 'storm-drain',
  spider: 'spider-web',
  neutral: null,
};

const tileKey = (c: TileCoord): string => `${c.plane}:${String(c.x)},${String(c.y)}`;

const inPlaneNeighbors = (c: TileCoord): readonly TileCoord[] => [
  { plane: c.plane, x: c.x + 1, y: c.y },
  { plane: c.plane, x: c.x - 1, y: c.y },
  { plane: c.plane, x: c.x, y: c.y + 1 },
  { plane: c.plane, x: c.x, y: c.y - 1 },
];

/**
 * Manhattan distance within a plane (4-neighbor moves don't reach diagonals,
 * so Chebyshev would falsely tie (4,5) and (5,4) when retreating to (0,0)).
 */
const manhattan = (a: TileCoord, b: TileCoord): number =>
  a.plane !== b.plane ? Number.POSITIVE_INFINITY : Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Walkable in-plane neighbor strictly closer to home, or null if none. */
const computeRetreatTile = (
  from: TileCoord,
  faction: Faction,
  state: GameState,
): TileCoord | null => {
  const homeId = HOME_POST_BY_FACTION[faction];
  const home: TileCoord | null =
    homeId === null ? null : (state.posts.get(homeId as PostId)?.location ?? null);

  const candidates: TileCoord[] = [];
  for (const n of inPlaneNeighbors(from)) {
    const tile = state.tiles.get(tileKey(n));
    if (!tile || tile.terrain.kind === 'obstacle') continue;
    candidates.push(n);
  }
  if (candidates.length === 0) return null;
  if (home?.plane !== from.plane) return candidates[0] ?? null;

  let best: TileCoord | null = null;
  let bestDist = manhattan(from, home);
  for (const c of candidates) {
    const d = manhattan(c, home);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
};

const buildModifiers = (
  actorSide: Side,
  targetSide: Side,
  ctx: ResolveContext,
): DamageModifiers => {
  const isAtk = actorSide === 'attacker';
  const targetIsAtk = targetSide === 'attacker';
  return {
    posture: {
      attack: isAtk ? ctx.atkPosture.attack : ctx.defPosture.attack,
      defense: targetIsAtk ? ctx.atkPosture.defense : ctx.defPosture.defense,
    },
    strategy: {
      attack: isAtk ? ctx.atkStrat.attack : ctx.defStrat.attack,
      defense: targetIsAtk ? ctx.atkStrat.defense : ctx.defStrat.defense,
    },
    // POST defense applies only to incoming damage on the defender (post holder).
    postDefense: targetSide === 'defender' ? ctx.input.postDefense : 0,
    jellyAttack: isAtk ? ctx.input.attackerJellyAttack : ctx.input.defenderJellyAttack,
    jellyResilience: targetIsAtk
      ? ctx.input.attackerJellyResilience
      : ctx.input.defenderJellyResilience,
    // Queen-proximity bonuses are attributed to the attacker side; caller sets
    // these to 1.0 when the bonus is not active for this battle.
    queenProximityAttack: isAtk ? ctx.input.queenProximityAttack : 1,
    queenProximityResilience: targetIsAtk ? ctx.input.queenProximityResilience : 1,
    rng: ctx.damageRng,
  };
};

const runRound = (
  index: number,
  units: readonly LiveUnit[],
  ctx: ResolveContext,
  agilityRng: Rng,
  targetCounter: { atk: number; def: number },
): BattleRound => {
  const order = computeAgilityOrder(
    units.filter((u) => !u.killed).map((u) => ({ id: u.id, stats: u.stats })),
    agilityRng,
  );
  const byId = new Map<UnitId, LiveUnit>();
  for (const u of units) byId.set(u.id, u);
  const actions: BattleAction[] = [];

  for (const actorId of order) {
    const actor = byId.get(actorId);
    if (!actor || actor.killed) continue;
    const enemies = livingOnSide(units, actor.side === 'attacker' ? 'defender' : 'attacker');
    if (enemies.length === 0) break;

    const isAtk = actor.side === 'attacker';
    const myStrats = isAtk ? ctx.attackerStrats : ctx.defenderStrats;
    const theirStrats = isAtk ? ctx.defenderStrats : ctx.attackerStrats;
    const fallbackIdx = isAtk ? targetCounter.atk++ : targetCounter.def++;

    const target = pickTarget(enemies, myStrats, theirStrats, fallbackIdx);
    if (!target) continue;

    const dmg = computeDamage(
      actor.stats,
      target.stats,
      buildModifiers(actor.side, target.side, ctx),
    );
    target.hp = Math.max(0, target.hp - dmg);
    const killed = target.hp <= 0;
    if (killed) target.killed = true;
    actions.push({ attackerId: actor.id, defenderId: target.id, damage: dmg, killed });
  }

  return { index, actions };
};

const updateUnits = (
  party: Party,
  liveById: ReadonlyMap<UnitId, LiveUnit>,
  xpDelta: number,
): readonly Unit[] =>
  party.units.map((u) => {
    const live = liveById.get(u.id);
    if (!live) return u;
    return { ...u, currentHp: live.hp, ...(live.killed ? {} : { xp: u.xp + xpDelta }) };
  });

export const resolveBattle = (
  state: GameState,
  input: BattleInput,
  rng: Rng,
  tick: () => number,
): BattleOutcome => {
  const { attacker, defender } = input;

  const ctx: ResolveContext = {
    attackerStrats: attacker.strategyModifiers,
    defenderStrats: defender.strategyModifiers,
    atkPosture: computePostureMultipliers(attacker.posture),
    defPosture: computePostureMultipliers(defender.posture),
    atkStrat: computeStrategyMultiplier(attacker.strategyModifiers),
    defStrat: computeStrategyMultiplier(defender.strategyModifiers),
    input,
    damageRng: rng.fork('battle-damage'),
  };

  const live: LiveUnit[] = [
    ...buildLiveUnits(attacker, 'attacker', state.unitTemplates),
    ...buildLiveUnits(defender, 'defender', state.unitTemplates),
  ];

  const roundCount = decideRoundCount(rng.fork('battle-rounds'));
  const agilityRng = rng.fork('battle-agility');
  const targetCounter = { atk: 0, def: 0 };
  const rounds: BattleRound[] = [];
  for (let i = 0; i < roundCount; i++) {
    if (livingOnSide(live, 'attacker').length === 0) break;
    if (livingOnSide(live, 'defender').length === 0) break;
    rounds.push(runRound(i, live, ctx, agilityRng, targetCounter));
  }

  // Tally casualties and surviving HP totals.
  const attackerCasualties: UnitId[] = [];
  const defenderCasualties: UnitId[] = [];
  let attackerLeaderKilled = false;
  let defenderLeaderKilled = false;
  let attackerHp = 0;
  let defenderHp = 0;
  for (const u of live) {
    if (u.side === 'attacker') {
      if (u.killed) {
        attackerCasualties.push(u.id);
        if (u.isLeader) attackerLeaderKilled = true;
      } else attackerHp += u.hp;
    } else {
      if (u.killed) {
        defenderCasualties.push(u.id);
        if (u.isLeader) defenderLeaderKilled = true;
      } else defenderHp += u.hp;
    }
  }

  // Winner: greater surviving HP. Tie -> draw.
  const winner: PartyId | 'draw' =
    attackerHp > defenderHp ? attacker.id : defenderHp > attackerHp ? defender.id : 'draw';

  // Retreat target for the loser; battle tile is the defender's location.
  let retreatTo: TileCoord | null = null;
  let loserId: PartyId | null = null;
  if (winner === attacker.id) {
    loserId = defender.id;
    retreatTo = computeRetreatTile(defender.location, defender.faction, state);
  } else if (winner === defender.id) {
    loserId = attacker.id;
    retreatTo = computeRetreatTile(defender.location, attacker.faction, state);
  }

  const result: BattleResult = {
    attackerPartyId: attacker.id,
    defenderPartyId: defender.id,
    winner,
    rounds,
    attackerCasualties,
    defenderCasualties,
    retreatTo,
  };

  // Events: battle-resolved first, then unit-died (atk then def), then leader-died.
  const events: ReplayEvent[] = [];
  const turn = state.turn;
  events.push({ kind: 'battle-resolved', turn, tick: tick(), result });
  for (const id of attackerCasualties) {
    events.push({ kind: 'unit-died', turn, tick: tick(), unitId: id });
  }
  for (const id of defenderCasualties) {
    events.push({ kind: 'unit-died', turn, tick: tick(), unitId: id });
  }
  if (attackerLeaderKilled) {
    events.push({ kind: 'leader-died', turn, tick: tick(), partyId: attacker.id });
  }
  if (defenderLeaderKilled) {
    events.push({ kind: 'leader-died', turn, tick: tick(), partyId: defender.id });
  }

  // XP: surviving winners gain XP_WIN; losers (and draws) gain XP_LOSE.
  const attackerXp = winner === attacker.id ? XP_WIN : XP_LOSE;
  const defenderXp = winner === defender.id ? XP_WIN : XP_LOSE;

  const liveById = new Map<UnitId, LiveUnit>();
  for (const u of live) liveById.set(u.id, u);

  // Locations: winner stays. Loser moves to retreatTo if available; otherwise
  // stays in place (caller treats retreatTo === null as loser stuck/destroyed).
  const newAttacker: Party = {
    ...attacker,
    units: updateUnits(attacker, liveById, attackerXp),
    location: loserId === attacker.id && retreatTo !== null ? retreatTo : attacker.location,
    leaderless: attacker.leaderless || attackerLeaderKilled,
  };
  const newDefender: Party = {
    ...defender,
    units: updateUnits(defender, liveById, defenderXp),
    location: loserId === defender.id && retreatTo !== null ? retreatTo : defender.location,
    leaderless: defender.leaderless || defenderLeaderKilled,
  };

  const newParties = new Map(state.parties);
  newParties.set(attacker.id, newAttacker);
  newParties.set(defender.id, newDefender);

  return { state: { ...state, parties: newParties }, result, events };
};
