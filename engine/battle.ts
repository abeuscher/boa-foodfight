/**
 * engine/battle — auto-resolve a single battle between two parties on the same
 * tile. Composes pure math from `engine/combat.ts`; emits replay events and
 * returns a new GameState with HP/casualty/XP/retreat/leaderless mutations.
 * No I/O, no `Math.random()` — all randomness flows through the injected Rng.
 * Imports allowed: `engine/types`, `engine/combat` only (see CONTRACTS.md).
 */

import { applyOpeningAbilities } from './battle-abilities.ts';
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
import { inPlaneNeighbors } from './coord.ts';
import type { AbilitiesFile } from './schemas/index.ts';
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
  /** Ability definitions for pre-battle resolution (volley, mend, etc.). */
  readonly abilities: AbilitiesFile;
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
  readonly abilities: readonly UnitTemplate['abilities'][number][];
  readonly isLeader: boolean;
  hp: number;
  killed: boolean;
  /** Number of upcoming rounds in which this unit cannot attack
   * (decremented at end-of-round). Set by debuff abilities like
   * web-snare. 0 = unimpaired. */
  immobilizedRounds: number;
  /** Set once a per-unit one-shot debuff (currently web-snare) has
   * fired. Prevents the bearer from re-firing in subsequent rounds. */
  snareUsed: boolean;
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
      abilities: tmpl.abilities,
      isLeader: u.id === party.leaderId,
      hp: u.currentHp,
      killed: u.currentHp <= 0,
      immobilizedRounds: 0,
      snareUsed: false,
    };
  });

const livingOnSide = (units: readonly LiveUnit[], side: Side): readonly LiveUnit[] =>
  units.filter((u) => !u.killed && u.side === side);

/**
 * Apply round-start passive abilities:
 *
 *   web-mend  — heals `heal` HP at the start of every round while the
 *               unit's HP fraction is above `hpThreshold`. Once the unit
 *               drops to / below the threshold it stops mending — which
 *               is what introduces sub-integer effective-HP variance and
 *               breaks the queen-HP integer cliff for the tuner.
 *
 *   web-snare — one-shot debuff that fires the round the bearer's HP
 *               crosses below `hpThreshold` for the first time. Picks
 *               the lowest-HP non-leader enemy and immobilizes them for
 *               `durationTurns` rounds (their attack action is skipped).
 *               Bearer flips `snareUsed` so the snare doesn't re-fire.
 */
const applyRoundStartPassives = (units: readonly LiveUnit[], abilities: AbilitiesFile): void => {
  const mend = abilities.abilities.find((a) => a.id === 'web-mend');
  if (mend) {
    const heal = Number(mend.params.heal ?? 0);
    const threshold = Number(mend.params.hpThreshold ?? 0.5);
    if (heal > 0) {
      for (const u of units) {
        if (u.killed) continue;
        if (!u.abilities.includes('web-mend' as UnitTemplate['abilities'][number])) continue;
        if (u.hp / u.stats.hp <= threshold) continue;
        u.hp = Math.min(u.stats.hp, u.hp + heal);
      }
    }
  }

  const snare = abilities.abilities.find((a) => a.id === 'web-snare');
  if (snare) {
    const snareThreshold = Number(snare.params.hpThreshold ?? 0.33);
    const snareDuration = Number(snare.params.durationTurns ?? 1);
    const snareCount = Number(snare.params.immobilizeCount ?? 1);
    if (snareDuration > 0 && snareCount > 0) {
      for (const bearer of units) {
        if (bearer.killed) continue;
        if (bearer.snareUsed) continue;
        if (!bearer.abilities.includes('web-snare' as UnitTemplate['abilities'][number])) continue;
        if (bearer.hp / bearer.stats.hp > snareThreshold) continue;
        // Pick `snareCount` enemies on the opposite side, preferring
        // non-leader and lowest HP. Leader-protect prevents the snare
        // from instantly killing tactical depth when a leader exists.
        const enemySide: Side = bearer.side === 'attacker' ? 'defender' : 'attacker';
        const candidates = units
          .filter((u) => u.side === enemySide && !u.killed && u.immobilizedRounds === 0)
          .sort((a, b) => {
            if (a.isLeader !== b.isLeader) return a.isLeader ? 1 : -1;
            if (a.hp !== b.hp) return a.hp - b.hp;
            return a.id < b.id ? -1 : 1;
          });
        if (candidates.length === 0) break;
        const targets = candidates.slice(0, snareCount);
        for (const t of targets) t.immobilizedRounds = snareDuration;
        bearer.snareUsed = true;
      }
    }
  }
};

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
    // Snared / immobilized: skip this round's attack entirely. The
    // counter is decremented at end-of-round below so the unit is free
    // again for the next round (when durationTurns hits 0).
    if (actor.immobilizedRounds > 0) continue;
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

  // Tick down active snares so they expire after `durationTurns` rounds.
  for (const u of units) {
    if (u.immobilizedRounds > 0) u.immobilizedRounds -= 1;
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
  // Pre-battle: fire opening abilities (volley, mend) on both sides. The
  // returned parties carry usedAbilities flags and any HP changes from
  // volley damage / mend healing; combat then runs against those parties.
  const opening = applyOpeningAbilities(
    input.attacker,
    input.defender,
    state.unitTemplates,
    input.abilities,
    state.turn,
    tick,
  );
  const attacker = opening.attacker;
  const defender = opening.defender;
  const openingEvents = opening.events;

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
    applyRoundStartPassives(live, input.abilities);
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

  // Events: opening-ability events first (volley, mend, opening kills),
  // then battle-resolved, then unit-died (atk then def), then leader-died.
  const events: ReplayEvent[] = [...openingEvents];
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
