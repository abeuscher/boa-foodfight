/**
 * engine/battle — auto-resolve a single battle between two parties.
 *
 * Composes the pure math primitives in `engine/combat.ts`; emits replay
 * events and returns an updated `GameState` with HP, casualty, XP, retreat,
 * and leaderless mutations applied. No I/O, no `Math.random()` — all
 * randomness flows through the injected `Rng`.
 *
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
  Post,
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

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal mutable working state
// ---------------------------------------------------------------------------

type Side = 'attacker' | 'defender';

interface LiveUnit {
  readonly id: UnitId;
  readonly side: Side;
  readonly stats: Stats;
  readonly isLeader: boolean;
  hp: number;
  killed: boolean;
}

const buildLiveUnits = (
  party: Party,
  side: Side,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): LiveUnit[] => {
  const out: LiveUnit[] = [];
  for (const u of party.units) {
    const tmpl = templates.get(u.templateId);
    if (!tmpl) {
      throw new Error(`battle: unknown templateId '${u.templateId}' for unit '${u.id}'`);
    }
    out.push({
      id: u.id,
      side,
      stats: tmpl.baseStats,
      isLeader: u.id === party.leaderId,
      hp: u.currentHp,
      killed: u.currentHp <= 0,
    });
  }
  return out;
};

const livingOnSide = (units: readonly LiveUnit[], side: Side): readonly LiveUnit[] =>
  units.filter((u) => !u.killed && u.side === side);

// ---------------------------------------------------------------------------
// Targeting policy
// ---------------------------------------------------------------------------

/**
 * Pick a target on the opposing side per the configured policy.
 *
 *   1. If the actor's side has `target-weakest`, pick the lowest current-HP enemy
 *      (ties broken by enemy roster order — deterministic).
 *   2. Else if the opposing side has `protect-leader`, prefer non-leader enemies;
 *      fall through to round-robin across non-leaders. If only the leader is
 *      left standing, attack the leader.
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
    for (const e of enemies) {
      if (best === null || e.hp < best.hp) best = e;
    }
    return best;
  }

  if (enemyStrategies.includes('protect-leader')) {
    const nonLeaders = enemies.filter((e) => !e.isLeader);
    if (nonLeaders.length > 0) {
      const idx = fallbackIndex % nonLeaders.length;
      return nonLeaders[idx] ?? null;
    }
  }

  const idx = fallbackIndex % enemies.length;
  return enemies[idx] ?? null;
};

// ---------------------------------------------------------------------------
// Retreat geometry
// ---------------------------------------------------------------------------

const HOME_POST_BY_FACTION: Readonly<Record<Faction, string | null>> = {
  ant: 'storm-drain',
  spider: 'spider-web',
  neutral: null,
};

const findHomeCoord = (faction: Faction, posts: ReadonlyMap<PostId, Post>): TileCoord | null => {
  const homeId = HOME_POST_BY_FACTION[faction];
  if (homeId === null) return null;
  const post = posts.get(homeId as PostId);
  return post ? post.location : null;
};

const inPlaneNeighbors = (c: TileCoord): readonly TileCoord[] => [
  { plane: c.plane, x: c.x + 1, y: c.y },
  { plane: c.plane, x: c.x - 1, y: c.y },
  { plane: c.plane, x: c.x, y: c.y + 1 },
  { plane: c.plane, x: c.x, y: c.y - 1 },
];

const tileKey = (c: TileCoord): string => `${c.plane}:${String(c.x)},${String(c.y)}`;

/**
 * Manhattan distance within a plane. Cross-plane returns Infinity. Manhattan
 * (rather than Chebyshev) is the right metric for "step toward home" because
 * retreat candidates are 4-neighbors — diagonals aren't reachable in a single
 * step, so a Chebyshev metric would call (4,5) and (5,4) equidistant from
 * (5,5)→(0,0) and reject both as retreats.
 */
const planarDistance = (a: TileCoord, b: TileCoord): number => {
  if (a.plane !== b.plane) return Number.POSITIVE_INFINITY;
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

/**
 * Find a walkable in-plane neighbor that is strictly closer to the loser's home
 * base. Returns null if no such tile exists (battle module's caller is then
 * responsible for treating the loser as destroyed-in-place; see resolveBattle).
 */
const computeRetreatTile = (
  from: TileCoord,
  faction: Faction,
  state: GameState,
): TileCoord | null => {
  const home = findHomeCoord(faction, state.posts);
  const candidates: TileCoord[] = [];
  for (const n of inPlaneNeighbors(from)) {
    const tile = state.tiles.get(tileKey(n));
    if (!tile) continue;
    if (tile.terrain.kind === 'obstacle') continue;
    candidates.push(n);
  }
  if (candidates.length === 0) return null;
  if (home?.plane !== from.plane) {
    return candidates[0] ?? null;
  }
  const fromDist = planarDistance(from, home);
  let best: TileCoord | null = null;
  let bestDist = fromDist;
  for (const c of candidates) {
    const d = planarDistance(c, home);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
};

// ---------------------------------------------------------------------------
// Round execution
// ---------------------------------------------------------------------------

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

const buildModifiers = (
  actorSide: Side,
  targetSide: Side,
  ctx: ResolveContext,
): DamageModifiers => {
  const isAttackerActor = actorSide === 'attacker';

  return {
    posture: {
      attack: isAttackerActor ? ctx.atkPosture.attack : ctx.defPosture.attack,
      defense: targetSide === 'attacker' ? ctx.atkPosture.defense : ctx.defPosture.defense,
    },
    strategy: {
      attack: isAttackerActor ? ctx.atkStrat.attack : ctx.defStrat.attack,
      defense: targetSide === 'attacker' ? ctx.atkStrat.defense : ctx.defStrat.defense,
    },
    // POST defense applies only when the defender (i.e., the side being hit) is
    // on the side that holds the post. Per spec the post belongs to whichever
    // party occupies it at the battle tile; the input provides one scalar and
    // we apply it to incoming damage against the defender party.
    postDefense: targetSide === 'defender' ? ctx.input.postDefense : 0,
    jellyAttack: isAttackerActor ? ctx.input.attackerJellyAttack : ctx.input.defenderJellyAttack,
    jellyResilience:
      targetSide === 'attacker'
        ? ctx.input.attackerJellyResilience
        : ctx.input.defenderJellyResilience,
    // Queen proximity is keyed to the attacker party in this battle (per spec:
    // "Ants near the Queen ... gain bonus Attack and resilience"). The input
    // applies to whichever party in this battle is benefiting from proximity;
    // we attribute it to the `attacker` side since the caller assigns the
    // battle's posture-attacker before resolution.
    queenProximityAttack: isAttackerActor ? ctx.input.queenProximityAttack : 1,
    queenProximityResilience: targetSide === 'attacker' ? ctx.input.queenProximityResilience : 1,
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
  const liveForOrder = units.filter((u) => !u.killed).map((u) => ({ id: u.id, stats: u.stats }));
  const order = computeAgilityOrder(liveForOrder, agilityRng);
  const actions: BattleAction[] = [];
  const byId = new Map<UnitId, LiveUnit>();
  for (const u of units) byId.set(u.id, u);

  for (const actorId of order) {
    const actor = byId.get(actorId);
    if (!actor || actor.killed) continue;

    const enemySide: Side = actor.side === 'attacker' ? 'defender' : 'attacker';
    const enemies = livingOnSide(units, enemySide);
    if (enemies.length === 0) break;

    const isAttackerActor = actor.side === 'attacker';
    const myStrats = isAttackerActor ? ctx.attackerStrats : ctx.defenderStrats;
    const theirStrats = isAttackerActor ? ctx.defenderStrats : ctx.attackerStrats;
    const fallbackIdx = isAttackerActor ? targetCounter.atk++ : targetCounter.def++;

    const target = pickTarget(enemies, myStrats, theirStrats, fallbackIdx);
    if (!target) continue;

    const modifiers = buildModifiers(actor.side, target.side, ctx);
    const damage = computeDamage(actor.stats, target.stats, modifiers);
    target.hp = Math.max(0, target.hp - damage);
    const killed = target.hp <= 0;
    if (killed) target.killed = true;
    actions.push({
      attackerId: actor.id,
      defenderId: target.id,
      damage,
      killed,
    });
  }

  return { index, actions };
};

// ---------------------------------------------------------------------------
// State mutation helpers
// ---------------------------------------------------------------------------

const updateUnitsAfterBattle = (
  party: Party,
  liveById: ReadonlyMap<UnitId, LiveUnit>,
  xpDelta: number,
): readonly Unit[] =>
  party.units.map((u) => {
    const live = liveById.get(u.id);
    if (!live) return u;
    const survived = !live.killed;
    return {
      ...u,
      currentHp: live.hp,
      ...(survived ? { xp: u.xp + xpDelta } : {}),
    };
  });

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

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
      } else {
        attackerHp += u.hp;
      }
    } else {
      if (u.killed) {
        defenderCasualties.push(u.id);
        if (u.isLeader) defenderLeaderKilled = true;
      } else {
        defenderHp += u.hp;
      }
    }
  }

  // Decide winner: greater total surviving HP. Tie => draw.
  let winner: PartyId | 'draw';
  if (attackerHp > defenderHp) winner = attacker.id;
  else if (defenderHp > attackerHp) winner = defender.id;
  else winner = 'draw';

  // Determine retreat target for the loser.
  const battleLocation = defender.location;
  let retreatTo: TileCoord | null = null;
  let loserId: PartyId | null = null;
  if (winner === attacker.id) {
    loserId = defender.id;
    retreatTo = computeRetreatTile(battleLocation, defender.faction, state);
  } else if (winner === defender.id) {
    loserId = attacker.id;
    retreatTo = computeRetreatTile(battleLocation, attacker.faction, state);
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

  // Emit events: battle-resolved first (carries the full result), then per-unit
  // deaths in the order attacker-then-defender, then leader-died events.
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

  // XP: surviving winners gain XP_WIN; surviving losers gain XP_LOSE; on a draw
  // both sides receive XP_LOSE (no decisive participation).
  const attackerWon = winner === attacker.id;
  const defenderWon = winner === defender.id;
  const attackerXp = attackerWon ? XP_WIN : defenderWon ? XP_LOSE : XP_LOSE;
  const defenderXp = defenderWon ? XP_WIN : attackerWon ? XP_LOSE : XP_LOSE;

  const liveById = new Map<UnitId, LiveUnit>();
  for (const u of live) liveById.set(u.id, u);

  const newAttackerUnits = updateUnitsAfterBattle(attacker, liveById, attackerXp);
  const newDefenderUnits = updateUnitsAfterBattle(defender, liveById, defenderXp);

  // Locations: winner stays. Loser moves to retreatTo if available; if no
  // retreat is available the loser stays in place (per result.retreatTo === null).
  const attackerNewLocation =
    loserId === attacker.id && retreatTo !== null ? retreatTo : attacker.location;
  const defenderNewLocation =
    loserId === defender.id && retreatTo !== null ? retreatTo : defender.location;

  const newAttacker: Party = {
    ...attacker,
    units: newAttackerUnits,
    location: attackerNewLocation,
    leaderless: attacker.leaderless || attackerLeaderKilled,
  };
  const newDefender: Party = {
    ...defender,
    units: newDefenderUnits,
    location: defenderNewLocation,
    leaderless: defender.leaderless || defenderLeaderKilled,
  };

  const newParties = new Map(state.parties);
  newParties.set(attacker.id, newAttacker);
  newParties.set(defender.id, newDefender);

  const newState: GameState = {
    ...state,
    parties: newParties,
  };

  return { state: newState, result, events };
};
