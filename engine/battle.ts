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
import { coordKey, inPlaneNeighbors, sameCoord } from './coord.ts';
import {
  backRowMeleeAttackPenalty,
  formationOrAllFront,
  promoteReserve,
  slotForUnit,
} from './formation.ts';
import { goldForKill } from './gold-table.ts';
import { applyItemOffsetToStats, partyItemOffset } from './item-effects.ts';
import { applyPhaseOffsetToStats, phaseStatOffsetFor } from './phase.ts';
import type { AbilitiesFile } from './schemas/index.ts';
import type {
  BattleAction,
  BattleParticipant,
  BattleResult,
  BattleRound,
  DayNightPhase,
  Faction,
  Formation,
  GameState,
  Order,
  Party,
  PartyId,
  Plane,
  PlaneAffinityRow,
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
  /**
   * Round 15 — last in-plane step each party took this turn (from the
   * movement phase's `party-moved` events). Used to compute knockback
   * direction on a successful flee: the fleer is shoved one tile in
   * the opposite of arrival. Optional — a missing entry means the
   * party didn't move this turn (e.g., it was at-rest when attacked),
   * in which case the engine falls back to opposite-of-attacker
   * bearing (delta from attacker to defender).
   */
  readonly attackerArrival?: { readonly from: TileCoord; readonly to: TileCoord };
  readonly defenderArrival?: { readonly from: TileCoord; readonly to: TileCoord };
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
  /** Affinity row for *this* battle's plane, picked once at battle start.
   * The combat formula folds `attack` into the attacker's effective
   * attack and `armor` into the defender's effective armor. */
  readonly affinity: PlaneAffinityRow;
  /** Round-8: source templateId. Used by the cockroach friendly-fire
   * branch (10% redirect on attack) which keys off the template. */
  readonly templateId: UnitTemplateId;
  /** Round 20 — formation slot at battle start. Mutated when a
   * reserve unit is promoted into front/back mid-battle. Reserve
   * units are NOT included in `live`; they're tracked on the side's
   * `Formation` and only enter the live array on promotion. */
  slot: 'front' | 'back';
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

const ZERO_AFFINITY: PlaneAffinityRow = { attack: 0, armor: 0 };

/**
 * Pick the plane-affinity row that applies on `plane`. All four wall
 * planes share the template's `wall` row; floor and ceiling get their
 * own. Templates that lack a `planeAffinity` (defensive default) map
 * to all-zero so combat math is unchanged for them.
 */
const planeAffinityForPlane = (tmpl: UnitTemplate, plane: Plane): PlaneAffinityRow => {
  const aff = tmpl.planeAffinity;
  if (!aff) return ZERO_AFFINITY;
  if (plane === 'floor') return aff.floor;
  if (plane === 'ceiling') return aff.ceiling;
  return aff.wall;
};

const buildLiveUnits = (
  party: Party,
  side: Side,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
  battlePlane: Plane,
  phase: DayNightPhase,
  formation: Formation,
): LiveUnit[] => {
  // Round 14: equipped persistent item buffs the whole party's stats
  // additively (brass-knuckles +1 atk, leather-pad +1 armor,
  // scout-lens +1 agility). Applied AFTER phase, BEFORE the
  // multiplicative posture/jelly/queen stack — same lane as plane
  // affinity / phase offsets so a +1 from items never doubles into
  // 1.5-2x reach.
  const itemOffset = partyItemOffset(party);
  // Round 20 — reserve units don't fight. Skip them at build time so
  // they're absent from `live` (no targeting, no actions, no damage
  // intake). They re-enter on promotion via `promoteReserve`.
  const reserveSet = new Set<UnitId>(formation.reserve);
  const out: LiveUnit[] = [];
  for (const u of party.units) {
    if (reserveSet.has(u.id)) continue;
    const tmpl = templates.get(u.templateId);
    if (!tmpl) throw new Error(`battle: unknown templateId '${u.templateId}' for unit '${u.id}'`);
    const phaseOffset = phaseStatOffsetFor(tmpl, phase);
    const phaseAdjusted = applyPhaseOffsetToStats(tmpl.baseStats, phaseOffset);
    const itemAdjusted = applyItemOffsetToStats(phaseAdjusted, itemOffset);
    const slot = slotForUnit(formation, u.id);
    // A unit not in front/back/reserve was filtered above; here it's
    // safe to coerce 'reserve' away — but be defensive.
    const liveSlot: 'front' | 'back' = slot === 'back' ? 'back' : 'front';
    // Round 20 — back-row melee `-1 attack` (floored at 1 in
    // `computeDamage`). Apply here so the per-round combat math sees
    // the penalty without re-deriving the slot.
    const meleePenalty = backRowMeleeAttackPenalty(formation, u.id, tmpl);
    const finalStats: Stats =
      meleePenalty < 0
        ? { ...itemAdjusted, attack: Math.max(1, itemAdjusted.attack + meleePenalty) }
        : itemAdjusted;
    out.push({
      id: u.id,
      side,
      stats: finalStats,
      abilities: tmpl.abilities,
      isLeader: u.id === party.leaderId,
      affinity: planeAffinityForPlane(tmpl, battlePlane),
      templateId: u.templateId,
      slot: liveSlot,
      hp: u.currentHp,
      killed: u.currentHp <= 0,
      immobilizedRounds: 0,
      snareUsed: false,
    });
  }
  return out;
};

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
 *   0. Round 20 — front-row absorbs first. If the opposing front row
 *      has any living units, restrict candidates to them. Only when
 *      all opposing front-row units are dead can the back row be
 *      targeted. This applies on top of every other strategy.
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
  // Round 20 — narrow to opposing front row first. Reserves are
  // already absent from the live array (they don't engage); only
  // front + back living units appear here.
  const livingFront = enemies.filter((e) => !e.killed && e.slot === 'front');
  const candidates = livingFront.length > 0 ? livingFront : enemies;
  if (actorStrategies.includes('target-weakest')) {
    let best: LiveUnit | null = null;
    for (const e of candidates) if (best === null || e.hp < best.hp) best = e;
    return best;
  }
  if (enemyStrategies.includes('protect-leader')) {
    const nonLeaders = candidates.filter((e) => !e.isLeader);
    if (nonLeaders.length > 0) return nonLeaders[fallbackIndex % nonLeaders.length] ?? null;
  }
  return candidates[fallbackIndex % candidates.length] ?? null;
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
  actorAffinity: PlaneAffinityRow,
  targetAffinity: PlaneAffinityRow,
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
    // Plane-affinity flat offsets, sourced from each unit's template
    // affinity row for the battle plane. Attacker contributes +attack,
    // target contributes +armor.
    attackerAffinityAttack: actorAffinity.attack,
    defenderAffinityArmor: targetAffinity.armor,
    rng: ctx.damageRng,
  };
};

const COCKROACH_TEMPLATE_ID = 'cockroach' as UnitTemplateId;
const COCKROACH_FRIENDLY_FIRE_RATE = 0.1;

/**
 * Round-8 cockroach friendly fire. With probability 10% per cockroach
 * attack, the attacker's blow lands on a random co-party cockroach
 * (excluding self) instead of the original enemy target. If there is
 * no co-party cockroach to redirect to, the attack proceeds as
 * normal.
 */
const maybeRedirectCockroach = (
  actor: LiveUnit,
  units: readonly LiveUnit[],
  rng: Rng,
): LiveUnit | null => {
  if (actor.templateId !== COCKROACH_TEMPLATE_ID) return null;
  if (rng.next() >= COCKROACH_FRIENDLY_FIRE_RATE) return null;
  const friends = units.filter(
    (u) => !u.killed && u.id !== actor.id && u.templateId === COCKROACH_TEMPLATE_ID,
  );
  if (friends.length === 0) return null;
  return friends[rng.int(friends.length)] ?? null;
};

interface RoundResult {
  readonly round: BattleRound;
  readonly promotions: readonly {
    readonly side: Side;
    readonly slot: 'front' | 'back';
    readonly unitId: UnitId;
  }[];
}

/**
 * Run one battle round. When `actingSide` is provided (round 15 — the
 * post-failed-flee bonus round), only that side's units fire and the
 * other side skips. Default behavior (both sides fire by agility
 * order) is preserved when the parameter is omitted.
 *
 * Round 20 — formation row ordering: within a side, front-row units
 * fire before back-row units. Order is stable across the two row
 * groups (each row independently agility-sorted by `computeAgilityOrder`).
 * When a casualty empties the front row, the next reserve unit (if
 * any) is promoted into front and joins `units` as a freshly-built
 * `LiveUnit` immediately, but only acts on the next round.
 */
interface FormationSlots {
  attacker: Formation;
  defender: Formation;
}

const runRound = (
  index: number,
  units: LiveUnit[],
  ctx: ResolveContext,
  agilityRng: Rng,
  targetCounter: { atk: number; def: number },
  formations: FormationSlots,
  promote: (side: Side, slot: 'front' | 'back') => { unitId: UnitId; live: LiveUnit } | null,
  actingSide?: Side,
): RoundResult => {
  // Round 20 — agility-sort all living non-reserve units in one pass
  // (preserves the prior RNG draw count: one tiebreak per unit), then
  // partition the resulting order by row so front-row units across
  // both sides fire before any back-row unit. Within a row group the
  // agility-sorted order is preserved.
  const fullOrder = computeAgilityOrder(
    units.filter((u) => !u.killed).map((u) => ({ id: u.id, stats: u.stats })),
    agilityRng,
  );
  const slotById = new Map<UnitId, 'front' | 'back'>();
  for (const u of units) slotById.set(u.id, u.slot);
  const frontOrder: UnitId[] = [];
  const backOrder: UnitId[] = [];
  for (const id of fullOrder) {
    if (slotById.get(id) === 'back') backOrder.push(id);
    else frontOrder.push(id);
  }
  const order: UnitId[] = [...frontOrder, ...backOrder];

  const byId = new Map<UnitId, LiveUnit>();
  for (const u of units) byId.set(u.id, u);
  const actions: BattleAction[] = [];
  const promotions: { side: Side; slot: 'front' | 'back'; unitId: UnitId }[] = [];

  for (const actorId of order) {
    const actor = byId.get(actorId);
    if (!actor || actor.killed) continue;
    // Snared / immobilized: skip this round's attack entirely. The
    // counter is decremented at end-of-round below so the unit is free
    // again for the next round (when durationTurns hits 0).
    if (actor.immobilizedRounds > 0) continue;
    // Round 15 — bonus-round side mask: in a one-sided round the
    // fleer's units skip entirely.
    if (actingSide !== undefined && actor.side !== actingSide) continue;
    const enemies = livingOnSide(units, actor.side === 'attacker' ? 'defender' : 'attacker');
    if (enemies.length === 0) break;

    const isAtk = actor.side === 'attacker';
    const myStrats = isAtk ? ctx.attackerStrats : ctx.defenderStrats;
    const theirStrats = isAtk ? ctx.defenderStrats : ctx.attackerStrats;
    const fallbackIdx = isAtk ? targetCounter.atk++ : targetCounter.def++;

    const originalTarget = pickTarget(enemies, myStrats, theirStrats, fallbackIdx);
    if (!originalTarget) continue;
    // Round-8: 10% friendly fire for cockroach attackers. Roll
    // unconditionally for cockroach actors so RNG consumption stays
    // deterministic across friendly-fire / no-fire branches.
    const redirect = maybeRedirectCockroach(actor, units, ctx.damageRng);
    const target = redirect ?? originalTarget;

    const dmg = computeDamage(
      actor.stats,
      target.stats,
      buildModifiers(actor.side, target.side, ctx, actor.affinity, target.affinity),
    );
    target.hp = Math.max(0, target.hp - dmg);
    const killed = target.hp <= 0;
    if (killed) {
      target.killed = true;
      // Round 20 — promotion fires immediately when a front- or
      // back-row casualty resolves. Promote from reserve into the
      // emptied row. Promoted unit joins `units` but doesn't act
      // this round (the round's `order` array was frozen above).
      const promotion = promote(target.side, target.slot);
      if (promotion) {
        promotions.push({ side: target.side, slot: target.slot, unitId: promotion.unitId });
        units.push(promotion.live);
        byId.set(promotion.live.id, promotion.live);
        // Mutate the side's formation list so `pickTarget`'s
        // front/back filter sees the new unit immediately on
        // subsequent actions.
        const f = target.side === 'attacker' ? formations.attacker : formations.defender;
        const updated: Formation =
          target.slot === 'front'
            ? {
                front: [...f.front, promotion.unitId],
                back: f.back,
                reserve: f.reserve.filter((id) => id !== promotion.unitId),
              }
            : {
                front: f.front,
                back: [...f.back, promotion.unitId],
                reserve: f.reserve.filter((id) => id !== promotion.unitId),
              };
        if (target.side === 'attacker') formations.attacker = updated;
        else formations.defender = updated;
      }
    }
    actions.push({ attackerId: actor.id, defenderId: target.id, damage: dmg, killed });
  }

  // Tick down active snares so they expire after `durationTurns` rounds.
  for (const u of units) {
    if (u.immobilizedRounds > 0) u.immobilizedRounds -= 1;
  }

  return { round: { index, actions }, promotions };
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

// ---------------------------------------------------------------------------
// Round 15 — flee mechanic
// ---------------------------------------------------------------------------

/** True iff `orders` contains a `flee` entry. */
const partyHasFleeOrder = (orders: readonly Order[]): boolean =>
  orders.some((o) => o.kind === 'flee');

/** Drop the first `flee` order from `orders`. */
const dropFleeOrder = (orders: readonly Order[]): readonly Order[] => {
  const next: Order[] = [];
  let dropped = false;
  for (const o of orders) {
    if (!dropped && o.kind === 'flee') {
      dropped = true;
      continue;
    }
    next.push(o);
  }
  return next;
};

/**
 * Average agility across the party's living units (currentHp > 0).
 * Returns 0 if no living units. Used to derive the flee success
 * probability per the round-15 spec.
 */
const avgLivingAgility = (
  party: Party,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): number => {
  let sum = 0;
  let count = 0;
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    const tmpl = templates.get(u.templateId);
    if (!tmpl) continue;
    sum += tmpl.baseStats.agility;
    count += 1;
  }
  if (count === 0) return 0;
  return sum / count;
};

/**
 * Flee success probability per the round-15 spec:
 *
 *   successPct = clamp(30 + (avgAgility - 1) * 6.25, 30, 80)
 *
 * Returned as a [0, 1) fraction. Avg agility 1 → 0.30, avg agility 9 →
 * 0.80, linear in between.
 */
const fleeSuccessProbability = (avgAgility: number): number => {
  const pct = 30 + (avgAgility - 1) * 6.25;
  const clamped = Math.max(30, Math.min(80, pct));
  return clamped / 100;
};

/**
 * Knockback target on a successful flee. The fleer is shoved one tile
 * "opposite of the tile it arrived from" — i.e., it continues forward
 * in the direction of motion, landing one tile past where it stopped.
 * Returns null if blocked (off-plane bounds, on an obstacle tile, or
 * the same coord as the fleer).
 *
 * Direction sources, in priority order:
 *  1. Last `party-moved` step this turn (caller passes via `BattleInput`).
 *     The arrival delta is `to - from`; knockback target is
 *     `to + (to - from) = location + delta`.
 *  2. Fallback (no movement this turn — typically the defender was
 *     attacked at its own tile): use the delta from the attacker's
 *     location to the defender's, i.e., the direction the attack came
 *     in. The fleer is shoved "past" itself away from the attacker:
 *     target = `defenderLoc + (defenderLoc - attackerLoc)`. The
 *     attacker's symmetric fallback (rare — attackers always moved
 *     into the battle tile) shoves them past the defender in the
 *     same model.
 */
const computeKnockbackTile = (
  fleeingSide: Side,
  attackerLoc: TileCoord,
  defenderLoc: TileCoord,
  attackerArrival: BattleInput['attackerArrival'],
  defenderArrival: BattleInput['defenderArrival'],
  state: GameState,
): TileCoord | null => {
  const fleerLoc = fleeingSide === 'attacker' ? attackerLoc : defenderLoc;
  const arrival = fleeingSide === 'attacker' ? attackerArrival : defenderArrival;

  let dx = 0;
  let dy = 0;
  let plane: Plane = fleerLoc.plane;
  if (arrival && arrival.from.plane === arrival.to.plane && arrival.to.plane === fleerLoc.plane) {
    dx = arrival.to.x - arrival.from.x;
    dy = arrival.to.y - arrival.from.y;
    plane = arrival.to.plane;
  } else if (attackerLoc.plane === defenderLoc.plane) {
    // Fallback: attack-bearing delta. For the defender (the natural
    // "didn't move" case) the attack came in along (def - atk), so
    // knockback continues past the defender in that direction. The
    // attacker's symmetric branch shoves them past the defender.
    if (fleeingSide === 'defender') {
      dx = defenderLoc.x - attackerLoc.x;
      dy = defenderLoc.y - attackerLoc.y;
    } else {
      dx = attackerLoc.x - defenderLoc.x;
      dy = attackerLoc.y - defenderLoc.y;
    }
    plane = fleerLoc.plane;
  }

  // No usable direction — knockback fails.
  if (dx === 0 && dy === 0) return null;

  // Normalize to a single tile step (sign per axis). The arrival vector
  // can be longer than 1 (multi-tile move); the knockback is always
  // exactly one tile past the fleer in the same direction.
  const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
  const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
  const target: TileCoord = {
    plane,
    x: fleerLoc.x + stepX,
    y: fleerLoc.y + stepY,
  };

  // Off-plane bounds (10×10).
  if (target.x < 0 || target.x > 9 || target.y < 0 || target.y > 9) return null;
  // Same coord (no knockback) is treated as blocked per spec.
  if (sameCoord(target, fleerLoc)) return null;
  // Obstacle / missing tile is blocked.
  const tile = state.tiles.get(coordKey(target));
  if (!tile) return null;
  if (tile.terrain.kind === 'obstacle') return null;
  return target;
};

interface FleeAttemptOutcome {
  readonly success: boolean;
  readonly probability: number;
  readonly roll: number;
  readonly knockbackTo: TileCoord | null;
}

const attemptFleeRoll = (
  fleeingParty: Party,
  fleeingSide: Side,
  attackerLoc: TileCoord,
  defenderLoc: TileCoord,
  input: BattleInput,
  state: GameState,
  rng: Rng,
): FleeAttemptOutcome => {
  const avgAgi = avgLivingAgility(fleeingParty, state.unitTemplates);
  const probability = fleeSuccessProbability(avgAgi);
  const roll = rng.next();
  const rollSuccess = roll < probability;
  if (!rollSuccess) {
    return { success: false, probability, roll, knockbackTo: null };
  }
  const knockbackTo = computeKnockbackTile(
    fleeingSide,
    attackerLoc,
    defenderLoc,
    input.attackerArrival,
    input.defenderArrival,
    state,
  );
  if (knockbackTo === null) {
    // Roll succeeded but knockback blocked → flee fails.
    return { success: false, probability, roll, knockbackTo: null };
  }
  return { success: true, probability, roll, knockbackTo };
};

export const resolveBattle = (
  state: GameState,
  input: BattleInput,
  rng: Rng,
  tick: () => number,
): BattleOutcome => {
  // Pre-battle: fire opening abilities (volley, mend, round-24 combos)
  // on both sides. The returned parties carry usedAbilities flags and
  // any HP changes from volley damage / mend healing; combat then
  // runs against those parties. Round 24 — pass the full parties map
  // so combo resolvers can locate adjacent same-faction partners and
  // emit `partnerUpdates` for the harness to fold back into state.
  const opening = applyOpeningAbilities(
    input.attacker,
    input.defender,
    state.unitTemplates,
    input.abilities,
    state.turn,
    tick,
    { allParties: state.parties },
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

  // The battle resolves on the defender's tile; both sides' affinity
  // rows are picked off that plane (so a spider attacking onto the
  // floor uses its floor row, not its ceiling row).
  const battlePlane: Plane = defender.location.plane;
  const phase: DayNightPhase = state.phase;
  // Round 20 — formation slots. Reserve units are excluded from
  // `live` until promotion. Old replays / hand-built test parties
  // without `formation` fall through to "all front" so existing
  // tests keep working.
  const formations: FormationSlots = {
    attacker: formationOrAllFront(attacker),
    defender: formationOrAllFront(defender),
  };
  const live: LiveUnit[] = [
    ...buildLiveUnits(
      attacker,
      'attacker',
      state.unitTemplates,
      battlePlane,
      phase,
      formations.attacker,
    ),
    ...buildLiveUnits(
      defender,
      'defender',
      state.unitTemplates,
      battlePlane,
      phase,
      formations.defender,
    ),
  ];

  // Snapshot every participant's HP at battle start (post-opening, since
  // volley/mend already fired). The replay viewer subtracts each
  // action's damage from these to render running HP in the play-by-play
  // panel without needing to load template data or track HP across
  // battles.
  const participants: BattleParticipant[] = live.map((u) => {
    // Recover the templateId by looking up the source unit; the live
    // shape doesn't carry it (only template ref via stats), so we walk
    // the parties.
    const sourceParty = u.side === 'attacker' ? attacker : defender;
    const sourceUnit = sourceParty.units.find((su) => su.id === u.id);
    const templateId = sourceUnit?.templateId ?? ('' as UnitTemplateId);
    return {
      unitId: u.id,
      templateId,
      side: u.side,
      hp: u.hp,
      maxHp: u.stats.hp,
      isLeader: u.isLeader,
    };
  });

  const roundCount = decideRoundCount(rng.fork('battle-rounds'));
  const agilityRng = rng.fork('battle-agility');
  const fleeRng = rng.fork('battle-flee');
  const targetCounter = { atk: 0, def: 0 };
  const rounds: BattleRound[] = [];

  // Round 15 — flee state. Track which side has flee orders queued
  // (mutable: a flee attempt consumes the order on either outcome) and
  // whether a successful flee has ended the battle. `pendingBonusRound`
  // is set when a flee fails so the next round runs only the non-
  // fleeing side's actions.
  let attackerOrders: readonly Order[] = attacker.orders;
  let defenderOrders: readonly Order[] = defender.orders;
  let fleeSucceeded = false;
  let fleeingPartyId: PartyId | null = null;
  let knockbackFrom: TileCoord | null = null;
  let knockbackTo: TileCoord | null = null;
  /** When non-null, the next round runs only this side; the other side
   * (the fleer who just failed) skips. Cleared after that round. */
  let pendingBonusActingSide: Side | null = null;
  const fleeEvents: ReplayEvent[] = [];
  const turnNum = state.turn;

  for (let i = 0; i < roundCount; i++) {
    if (livingOnSide(live, 'attacker').length === 0) break;
    if (livingOnSide(live, 'defender').length === 0) break;

    // Flee attempt phase: defender first if both sides queued a flee,
    // then attacker. A successful flee ends the battle immediately; a
    // failed flee schedules the bonus round (non-fleer-only) for THIS
    // round and consumes the flee order. Bonus rounds are only honored
    // when no fresh flee is being attempted this round (the bonus
    // is the engine's "punishment" for the failed roll).
    if (pendingBonusActingSide === null) {
      const sidesToTry: Side[] = [];
      if (partyHasFleeOrder(defenderOrders)) sidesToTry.push('defender');
      if (partyHasFleeOrder(attackerOrders)) sidesToTry.push('attacker');
      let consumedThisRound = false;
      for (const side of sidesToTry) {
        if (consumedThisRound) break;
        const fleeingParty = side === 'attacker' ? attacker : defender;
        const attempt = attemptFleeRoll(
          fleeingParty,
          side,
          attacker.location,
          defender.location,
          input,
          state,
          fleeRng,
        );
        fleeEvents.push({
          kind: 'battle-flee-attempted',
          turn: turnNum,
          tick: tick(),
          partyId: fleeingParty.id,
          successProbability: attempt.probability,
          roll: attempt.roll,
          success: attempt.success,
        });
        if (side === 'attacker') {
          attackerOrders = dropFleeOrder(attackerOrders);
        } else {
          defenderOrders = dropFleeOrder(defenderOrders);
        }
        consumedThisRound = true;
        if (attempt.success && attempt.knockbackTo !== null) {
          fleeSucceeded = true;
          fleeingPartyId = fleeingParty.id;
          knockbackFrom = fleeingParty.location;
          knockbackTo = attempt.knockbackTo;
          break;
        }
        // Failed: queue the bonus round for the non-fleeing side.
        fleeEvents.push({
          kind: 'battle-flee-failed',
          turn: turnNum,
          tick: tick(),
          partyId: fleeingParty.id,
        });
        pendingBonusActingSide = side === 'attacker' ? 'defender' : 'attacker';
      }
      if (fleeSucceeded) break;
    }

    applyRoundStartPassives(live, input.abilities);
    // Round 20 — promotion callback. When the round detects a
    // casualty in front/back, it asks for the next reserve unit on
    // the same side; we build a fresh `LiveUnit` for that promoted
    // reserve and update `formations`. Liveness map: a reserve
    // unit's `currentHp` is the source unit's HP (reserve units
    // never enter `live` so their HP doesn't change mid-battle).
    const buildLive = (side: Side, unitId: UnitId, slot: 'front' | 'back'): LiveUnit | null => {
      const sourceParty = side === 'attacker' ? attacker : defender;
      const u = sourceParty.units.find((su) => su.id === unitId);
      if (!u) return null;
      const tmpl = state.unitTemplates.get(u.templateId);
      if (!tmpl) return null;
      if (u.currentHp <= 0) return null;
      const itemOffset = partyItemOffset(sourceParty);
      const phaseOffset = phaseStatOffsetFor(tmpl, phase);
      const phaseAdjusted = applyPhaseOffsetToStats(tmpl.baseStats, phaseOffset);
      const itemAdjusted = applyItemOffsetToStats(phaseAdjusted, itemOffset);
      // Re-derive the back-row melee penalty against a temporary
      // formation that has the unit in `slot` already (so the
      // helper short-circuits to "back" when slot === 'back').
      const tmpFormation: Formation = { front: [], back: [], reserve: [] };
      const slottedFormation: Formation =
        slot === 'front'
          ? { ...tmpFormation, front: [unitId] }
          : { ...tmpFormation, back: [unitId] };
      const meleePenalty = backRowMeleeAttackPenalty(slottedFormation, unitId, tmpl);
      const finalStats: Stats =
        meleePenalty < 0
          ? { ...itemAdjusted, attack: Math.max(1, itemAdjusted.attack + meleePenalty) }
          : itemAdjusted;
      return {
        id: unitId,
        side,
        stats: finalStats,
        abilities: tmpl.abilities,
        isLeader: unitId === sourceParty.leaderId,
        affinity: planeAffinityForPlane(tmpl, battlePlane),
        templateId: u.templateId,
        slot,
        hp: u.currentHp,
        killed: false,
        immobilizedRounds: 0,
        snareUsed: false,
      };
    };
    const promote = (
      side: Side,
      slot: 'front' | 'back',
    ): { unitId: UnitId; live: LiveUnit } | null => {
      const f = side === 'attacker' ? formations.attacker : formations.defender;
      // Build liveness map from the source party so dead reserves
      // (rare — reserves never take damage in v1) aren't promoted.
      const sourceParty = side === 'attacker' ? attacker : defender;
      const liveByUnitId = new Map<UnitId, boolean>();
      for (const u of sourceParty.units) liveByUnitId.set(u.id, u.currentHp > 0);
      const result = promoteReserve(f, slot, liveByUnitId);
      if (result.promotedId === null) return null;
      const liveUnit = buildLive(side, result.promotedId, slot);
      if (!liveUnit) return null;
      // Mutation of `formations` is also done inside runRound after
      // it inspects this return; do it here too so any future early-
      // return caller sees the updated state.
      if (side === 'attacker') formations.attacker = result.formation;
      else formations.defender = result.formation;
      return { unitId: result.promotedId, live: liveUnit };
    };
    const rr = runRound(
      i,
      live,
      ctx,
      agilityRng,
      targetCounter,
      formations,
      promote,
      pendingBonusActingSide ?? undefined,
    );
    rounds.push(rr.round);
    for (const p of rr.promotions) {
      const partyId = p.side === 'attacker' ? attacker.id : defender.id;
      fleeEvents.push({
        kind: 'formation-promoted',
        turn: turnNum,
        tick: tick(),
        partyId,
        slot: p.slot,
        unitId: p.unitId,
      });
    }
    pendingBonusActingSide = null;
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

  // Winner: greater surviving HP. Tie -> draw. Round 15: a successful
  // flee always ends the battle as a draw with retreatTo populated as
  // the fleer's knockback tile.
  let winner: PartyId | 'draw';
  let retreatTo: TileCoord | null = null;
  let loserId: PartyId | null = null;
  if (fleeSucceeded && fleeingPartyId !== null && knockbackTo !== null) {
    winner = 'draw';
    retreatTo = knockbackTo;
    loserId = fleeingPartyId;
  } else {
    winner = attackerHp > defenderHp ? attacker.id : defenderHp > attackerHp ? defender.id : 'draw';
    if (winner === attacker.id) {
      loserId = defender.id;
      retreatTo = computeRetreatTile(defender.location, defender.faction, state);
    } else if (winner === defender.id) {
      loserId = attacker.id;
      retreatTo = computeRetreatTile(defender.location, attacker.faction, state);
    }
  }

  const result: BattleResult = {
    attackerPartyId: attacker.id,
    defenderPartyId: defender.id,
    winner,
    rounds,
    attackerCasualties,
    defenderCasualties,
    retreatTo,
    participants,
  };

  // Events: opening-ability events first (volley, mend, opening kills),
  // then any flee attempts/outcomes (round 15 — emitted as the rounds
  // ran so they appear before the battle-resolved summary), then
  // battle-resolved, then unit-died (atk then def), then leader-died,
  // then battle-fled if applicable.
  const events: ReplayEvent[] = [...openingEvents, ...fleeEvents];
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
  if (fleeSucceeded && fleeingPartyId !== null && knockbackFrom !== null && knockbackTo !== null) {
    events.push({
      kind: 'battle-fled',
      turn,
      tick: tick(),
      partyId: fleeingPartyId,
      knockbackFrom,
      knockbackTo,
    });
  }

  // Round 12 — gold credit for kills inside this battle. Per-kill model:
  // walk every `killed` action across the rounds and credit the killer's
  // faction with the dead unit's bounty (see `engine/gold-table.ts`).
  // Cockroach friendly fire (attacker and defender on the same side) is
  // skipped — the spec says FF deaths credit no one. Neutral-faction
  // kills also credit nobody (only ant/spider have gold totals).
  let postBattleState: GameState = state;
  const sideById = new Map<UnitId, Side>();
  for (const u of live) sideById.set(u.id, u.side);
  const sideToFaction: Record<Side, Faction> = {
    attacker: attacker.faction,
    defender: defender.faction,
  };
  const templateById = new Map<UnitId, UnitTemplateId>();
  for (const u of attacker.units) templateById.set(u.id, u.templateId);
  for (const u of defender.units) templateById.set(u.id, u.templateId);
  for (const round of rounds) {
    for (const action of round.actions) {
      if (!action.killed) continue;
      const attackerSide = sideById.get(action.attackerId);
      const defenderSide = sideById.get(action.defenderId);
      if (attackerSide === undefined || defenderSide === undefined) continue;
      // Friendly fire: no gold credit (spec).
      if (attackerSide === defenderSide) continue;
      const killerFaction = sideToFaction[attackerSide];
      if (killerFaction !== 'ant' && killerFaction !== 'spider') continue;
      const deadTemplate = templateById.get(action.defenderId);
      if (!deadTemplate) continue;
      const amount = goldForKill(deadTemplate);
      if (amount <= 0) continue;
      const newTotal = postBattleState.playerGold[killerFaction] + amount;
      postBattleState = {
        ...postBattleState,
        playerGold: { ...postBattleState.playerGold, [killerFaction]: newTotal },
      };
      events.push({
        kind: 'gold-earned',
        turn,
        tick: tick(),
        faction: killerFaction,
        source: 'kill',
        sourceId: deadTemplate,
        amount,
        newTotal,
      });
    }
  }

  // XP: surviving winners gain XP_WIN; losers (and draws) gain XP_LOSE.
  const attackerXp = winner === attacker.id ? XP_WIN : XP_LOSE;
  const defenderXp = winner === defender.id ? XP_WIN : XP_LOSE;

  const liveById = new Map<UnitId, LiveUnit>();
  for (const u of live) liveById.set(u.id, u);

  // Locations: winner stays. Loser moves to retreatTo if available; otherwise
  // stays in place (caller treats retreatTo === null as loser stuck/destroyed).
  // Round 15: the fleer's knockback tile is stored in retreatTo and the
  // fleer is treated as the loser for relocation purposes (winner ===
  // 'draw' so the non-fleeing side stays put). Any consumed flee orders
  // are persisted on the resulting parties so an AI re-issuing flee on
  // the next turn doesn't double-fire on a stale order.
  const newAttacker: Party = {
    ...attacker,
    units: updateUnits(attacker, liveById, attackerXp),
    location: loserId === attacker.id && retreatTo !== null ? retreatTo : attacker.location,
    leaderless: attacker.leaderless || attackerLeaderKilled,
    orders: attackerOrders,
    // Round 20 — persist any mid-battle promotions so the next
    // battle's formation reflects the casualty churn. (Dead units
    // remain in the formation slot lists; combat skips them via
    // the live filter, but the slot id stays so a subsequent
    // promotion doesn't double-up.)
    formation: formations.attacker,
  };
  const newDefender: Party = {
    ...defender,
    units: updateUnits(defender, liveById, defenderXp),
    location: loserId === defender.id && retreatTo !== null ? retreatTo : defender.location,
    leaderless: defender.leaderless || defenderLeaderKilled,
    orders: defenderOrders,
    formation: formations.defender,
  };

  const newParties = new Map(state.parties);
  // Round 24 — apply partner-party updates from combo abilities (mp
  // decrements + usedAbilities flags) BEFORE writing the two combatants,
  // so a partner that's also the attacker / defender (rare — the partner
  // is by spec a third party, but defensively allow overlap) is
  // overwritten by the combatant's post-battle state. Combos are
  // pre-battle so the partner's units are unchanged from this battle's
  // POV beyond the MP / used-abilities bump.
  for (const upd of opening.partnerUpdates) {
    if (upd.partyId === attacker.id || upd.partyId === defender.id) continue;
    newParties.set(upd.partyId, upd.party);
  }
  newParties.set(attacker.id, newAttacker);
  newParties.set(defender.id, newDefender);

  return {
    state: { ...postBattleState, parties: newParties },
    result,
    events,
  };
};
