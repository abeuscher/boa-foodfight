/**
 * End-of-turn resolution for Food Fight Level 1.
 *
 * Pure transformation. Runs after movement and battle resolution. In order:
 *   1. Heal units on friendly POSTs (capped at template max HP).
 *   2. Increment Queen ultimate charge (capped at chargeMax); emit charge event.
 *   3. Accrue Royal Jelly doses at the Queen's home base (capped per-party).
 *   4. Produce a new ant unit at the configured cadence, if slot capacity allows.
 *   5. Check loss (Queen dead) before victory (spider-web owned by ants).
 *   6. Increment turn counter and emit turn-start for the new turn.
 *
 * Determinism: no randomness. The `tick()` callback is the only side-effect-ish
 * surface and is expected to come from the shared replay tick clock.
 */

import { decayCardBuffs } from './cards.ts';
import { applyCharismaPromotions } from './charisma.ts';
import { distance, sameCoord } from './coord.ts';
import { discoverItems } from './items.ts';
import { PHASE_LENGTH } from './phase.ts';
import type { ItemsFile, JellyFile, QueenFile } from './schemas/index.ts';
import { DEFAULT_VICTORY_CONDITION } from './types.ts';
import type {
  AbilityId,
  DamageZone,
  DayNightPhase,
  Faction,
  GameState,
  NeutralStatus,
  Party,
  PartyId,
  PheroTrailEntry,
  Post,
  PostId,
  ReplayEvent,
  Rng,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
  VictoryCondition,
} from './types.ts';

const HYPNOTIZE_REBOUND_IMMUNITY = 10;
const STINKBUG_TEMPLATE_ID = 'stinkbug' as UnitTemplateId;
/** The ant-mage recruit ability. A living ant unit whose template
 * grants this is a "recruiter"; when none remain the recruit-count
 * objective is unreachable (the §4.3.3 "all ant-mage parties dead"
 * loss, encoded as the precise capability check). */
const RECRUIT_ABILITY = 'recruit' as AbilityId;

/**
 * Maximum age (in turns) a pheromone trail entry survives before being
 * dropped at end-of-turn. With 3, an ant party's trail at end-of-turn
 * holds 4 entries: the current location at age 0 and the previous
 * three at ages 1..3.
 */
const PHERO_MAX_AGE = 3;

export interface EndOfTurnInput {
  /** Tuning data, sourced from data/level-1/queen.json and jelly.json. */
  readonly queen: QueenFile;
  readonly jelly: JellyFile;
  /** Round 14 — items.json content. Used by the discovery tick to
   * categorize spawned items (persistent vs consumable) and apply
   * consumable effects on pickup. Optional for backwards compat with
   * pre-round-14 callers (in which case discovery is skipped). */
  readonly items?: ItemsFile;
}

export interface EndOfTurnOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

const QUEEN_TAG = 'queen';
const QUEEN_PARTY_SLOT_CAPACITY = 12;

/** Sum of slotCost across all units in a party, by their template. */
const usedSlots = (party: Party, templates: ReadonlyMap<UnitTemplateId, UnitTemplate>): number => {
  let total = 0;
  for (const u of party.units) {
    const tmpl = templates.get(u.templateId);
    if (tmpl) total += tmpl.slotCost;
  }
  return total;
};

const isAntQueenUnit = (
  unit: Unit,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  const tmpl = templates.get(unit.templateId);
  if (!tmpl) return false;
  return tmpl.faction === 'ant' && tmpl.tags.includes(QUEEN_TAG);
};

const findQueenParty = (state: GameState): Party | undefined => {
  for (const party of state.parties.values()) {
    if (party.units.some((u) => isAntQueenUnit(u, state.unitTemplates))) {
      return party;
    }
  }
  return undefined;
};

const findQueenUnit = (state: GameState): Unit | undefined => {
  for (const party of state.parties.values()) {
    for (const u of party.units) {
      if (isAntQueenUnit(u, state.unitTemplates)) return u;
    }
  }
  return undefined;
};

/** Find a friendly POST occupied by `party`, if any. */
const friendlyPostUnder = (party: Party, posts: ReadonlyMap<PostId, Post>): Post | undefined => {
  for (const post of posts.values()) {
    if (post.owner === party.faction && sameCoord(post.location, party.location)) {
      return post;
    }
  }
  return undefined;
};

const healParty = (
  party: Party,
  amount: number,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Party => {
  const healed = party.units.map((u) => {
    const tmpl = templates.get(u.templateId);
    if (!tmpl) return u;
    const max = tmpl.baseStats.hp;
    if (u.currentHp <= 0 || u.currentHp >= max) return u;
    const next = Math.min(max, u.currentHp + amount);
    return { ...u, currentHp: next };
  });
  return { ...party, units: healed };
};

/**
 * Round 24 — venom-storm tangle decay (mechanics memo §1.2). Walk
 * every unit in every party; if `tangleTurnsRemaining` is set,
 * decrement by 1 and drop the field when it hits 0. Returns a new
 * state only when at least one unit's field changed (avoids
 * pointless re-allocation on the common no-debuff turn).
 */
const applyTangleDecay = (state: GameState): GameState => {
  let changedAny = false;
  const next = new Map<PartyId, Party>();
  for (const [id, party] of state.parties) {
    let partyChanged = false;
    const newUnits = party.units.map((u) => {
      if (u.tangleTurnsRemaining === undefined || u.tangleTurnsRemaining <= 0) return u;
      partyChanged = true;
      const remaining = u.tangleTurnsRemaining - 1;
      if (remaining <= 0) {
        // Drop the field by spreading without it.
        const { tangleTurnsRemaining: _drop, ...rest } = u;
        void _drop;
        return rest;
      }
      return { ...u, tangleTurnsRemaining: remaining };
    });
    if (partyChanged) {
      changedAny = true;
      next.set(id, { ...party, units: newUnits });
    } else {
      next.set(id, party);
    }
  }
  return changedAny ? { ...state, parties: next } : state;
};

const applyHealing = (state: GameState): GameState => {
  const next = new Map<PartyId, Party>();
  for (const [id, party] of state.parties) {
    const post = friendlyPostUnder(party, state.posts);
    if (post && post.healingRate > 0) {
      next.set(id, healParty(party, post.healingRate, state.unitTemplates));
    } else {
      next.set(id, party);
    }
  }
  return { ...state, parties: next };
};

const applyUltimateCharge = (
  state: GameState,
  queen: QueenFile,
): { state: GameState; charge: number } => {
  const charge = Math.min(
    queen.ultimate.chargeMax,
    state.queenUltimateCharge + queen.ultimate.chargePerTurn,
  );
  return { state: { ...state, queenUltimateCharge: charge }, charge };
};

interface UltimateFireResult {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

/**
 * Fire the Queen ultimate at `queenLoc`. Damages every enemy unit within
 * `radius` (Chebyshev, same plane only — the spec describes the ultimate
 * as a battlefield wipe, not a cross-plane teleport-attack). Returns the
 * mutated state plus the queen-ultimate-fired event and any unit-died
 * events for spider units killed by the blast.
 */
const fireUltimate = (
  state: GameState,
  queenLoc: TileCoord,
  queen: QueenFile,
  turn: number,
  tick: () => number,
): UltimateFireResult => {
  const events: ReplayEvent[] = [];
  const radius = queen.ultimate.radius;
  const damage = queen.ultimate.damage;
  const nextParties = new Map<PartyId, Party>();

  for (const [id, party] of state.parties) {
    const inBlast =
      party.faction === 'spider' &&
      party.location.plane === queenLoc.plane &&
      distance(queenLoc, party.location) <= radius;
    if (!inBlast) {
      nextParties.set(id, party);
      continue;
    }
    const newUnits = party.units.map((u) => {
      if (u.currentHp <= 0) return u;
      const newHp = Math.max(0, u.currentHp - damage);
      return { ...u, currentHp: newHp };
    });
    for (const u of newUnits) {
      const before = party.units.find((p) => p.id === u.id);
      if (before && before.currentHp > 0 && u.currentHp <= 0) {
        events.unshift({ kind: 'unit-died', turn, tick: tick(), unitId: u.id });
      }
    }
    nextParties.set(id, { ...party, units: newUnits });
  }

  events.unshift({ kind: 'queen-ultimate-fired', turn, tick: tick() });
  const nextState: GameState = {
    ...state,
    parties: nextParties,
    queenUltimateCharge: 0,
    queenUltimatesUsed: state.queenUltimatesUsed + 1,
  };
  return { state: nextState, events };
};

/**
 * Returns true iff there is at least one living spider unit within
 * `radius` (Chebyshev) of `center` on the same plane. Used to gate
 * ultimate firing so the AoE doesn't vanish into thin air.
 */
const enemyInUltimateRange = (state: GameState, center: TileCoord, radius: number): boolean => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'spider') continue;
    if (party.location.plane !== center.plane) continue;
    if (distance(center, party.location) > radius) continue;
    if (party.units.some((u) => u.currentHp > 0)) return true;
  }
  return false;
};

const applyJellyProduction = (state: GameState, jelly: JellyFile): GameState => {
  const queenParty = findQueenParty(state);
  if (!queenParty) return state;
  const next = Math.min(jelly.capacityPerParty, queenParty.jellyDoses + jelly.productionPerTurn);
  if (next === queenParty.jellyDoses) return state;
  const updated: Party = { ...queenParty, jellyDoses: next };
  const parties = new Map(state.parties);
  parties.set(queenParty.id, updated);
  return { ...state, parties };
};

const applyUnitProduction = (state: GameState, queen: QueenFile, nextTurn: number): GameState => {
  const cadence = queen.production.turnsPerUnit;
  if (nextTurn <= 0 || nextTurn % cadence !== 0) return state;

  const queenParty = findQueenParty(state);
  if (!queenParty) return state;

  const templateId = queen.production.producedTemplateId as UnitTemplateId;
  const tmpl = state.unitTemplates.get(templateId);
  if (!tmpl) return state;

  const used = usedSlots(queenParty, state.unitTemplates);
  if (used + tmpl.slotCost > QUEEN_PARTY_SLOT_CAPACITY) return state;

  const newUnit: Unit = {
    id: `u-prod-${String(nextTurn)}-${templateId}` as UnitId,
    templateId,
    currentHp: tmpl.baseStats.hp,
    level: 1,
    xp: 0,
  };
  const updated: Party = { ...queenParty, units: [...queenParty.units, newUnit] };
  const parties = new Map(state.parties);
  parties.set(queenParty.id, updated);
  return { ...state, parties };
};

/** True iff every non-queen ant party has zero living units. The
 * queen-guard is immobile and cannot progress the scenario alone, so a
 * wiped field force is a deterministic spider win. */
const antFieldForceWiped = (state: GameState): boolean => {
  let sawAnyFieldParty = false;
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (party.units.some((u) => isAntQueenUnit(u, state.unitTemplates))) continue;
    sawAnyFieldParty = true;
    for (const u of party.units) {
      if (u.currentHp > 0) return false;
    }
  }
  return sawAnyFieldParty;
};

/** True iff the ant queen exists and is alive. The home-base queen
 * rule applies to every objective kind (capture and escort alike). */
const antQueenAlive = (state: GameState): boolean => {
  const queenUnit = findQueenUnit(state);
  return !(!queenUnit || queenUnit.currentHp <= 0);
};

/** True iff at least one living unit of `templateId` sits on the tile
 * occupied by `postId`. Used by the escort objective: the escort
 * succeeds the instant the (still-living) escort unit reaches the exit
 * POST's tile. */
const escortReachedExit = (
  state: GameState,
  escortUnitTemplateId: UnitTemplateId,
  exitPostId: PostId,
): boolean => {
  const exit = state.posts.get(exitPostId);
  if (!exit) return false;
  for (const party of state.parties.values()) {
    if (!sameCoord(party.location, exit.location)) continue;
    for (const u of party.units) {
      if (u.currentHp <= 0) continue;
      if (u.templateId === escortUnitTemplateId) return true;
    }
  }
  return false;
};

/** True iff every unit of `templateId` (across all parties) is dead or
 * absent. The escort objective is an immediate ant loss when the
 * escortee can no longer be delivered. */
const escortUnitLost = (state: GameState, escortUnitTemplateId: UnitTemplateId): boolean => {
  for (const party of state.parties.values()) {
    for (const u of party.units) {
      if (u.templateId === escortUnitTemplateId && u.currentHp > 0) return false;
    }
  }
  return true;
};

/** True iff at least one spider party existed and every spider party
 * now has zero living units. The eradicate objective (L6 Stairs) is an
 * ant win the moment the last living spider falls. */
const allSpiderPartiesEliminated = (state: GameState): boolean => {
  let sawAnySpiderParty = false;
  for (const party of state.parties.values()) {
    if (party.faction !== 'spider') continue;
    sawAnySpiderParty = true;
    for (const u of party.units) {
      if (u.currentHp > 0) return false;
    }
  }
  return sawAnySpiderParty;
};

/** Count distinct ant-faction parties that hold ≥1 *living* unit of
 * `templateId`. The recruit handler flips a converted neutral party to
 * `faction: 'ant'` while its units keep their original (e.g.
 * `cockroach`) templateId, so a recruited party is exactly an ant
 * party carrying that template. Requiring a living unit means a
 * recruited party annihilated by the spiders stops counting — the
 * "recruit-or-die" tension (§4.3.3). */
const recruitedPartyCount = (state: GameState, templateId: UnitTemplateId): number => {
  let count = 0;
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    if (party.units.some((u) => u.templateId === templateId && u.currentHp > 0)) count += 1;
  }
  return count;
};

/** True iff at least one living ant unit still grants the `recruit`
 * ability. When false the recruit-count objective can no longer be
 * progressed — the §4.3.3 "all ant-mage parties dead" loss, encoded
 * as the precise unreachability condition rather than a template name
 * (recruit is mage-only, so the two are equivalent for L8). */
const antRecruiterRemains = (state: GameState): boolean => {
  for (const party of state.parties.values()) {
    if (party.faction !== 'ant') continue;
    for (const u of party.units) {
      if (u.currentHp <= 0) continue;
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl?.abilities.includes(RECRUIT_ABILITY)) return true;
    }
  }
  return false;
};

/**
 * Determine winner. Loss is checked before victory. Returns null if
 * neither. Dispatches on the scenario's `victoryCondition`; a state
 * without the field defaults to the L1 capture-spider-web objective so
 * the static L1 path is byte-identical to the historical hardcoded
 * logic.
 */
const checkWinner = (state: GameState): Faction | null => {
  const vc: VictoryCondition = state.victoryCondition ?? DEFAULT_VICTORY_CONDITION;
  switch (vc.kind) {
    case 'capture-post': {
      // Historical L1 behavior, verbatim: queen-dead loss, then
      // field-force-wiped loss, then the capture victory.
      if (!antQueenAlive(state)) return 'spider';
      if (antFieldForceWiped(state)) return 'spider';
      const post = state.posts.get(vc.postId);
      if (post?.owner === 'ant') return 'ant';
      return null;
    }
    case 'escort': {
      // Escort loss conditions checked before the win: the ant queen
      // (still at the pipe entrance) dying, or the escortee dying,
      // ends the run as a spider win. Otherwise the ants win the
      // moment the living escortee stands on the exit POST.
      if (!antQueenAlive(state)) return 'spider';
      if (escortUnitLost(state, vc.escortUnitTemplateId)) return 'spider';
      if (escortReachedExit(state, vc.escortUnitTemplateId, vc.exitPostId)) return 'ant';
      return null;
    }
    case 'eradicate': {
      // L6 (Stairs) — total spider eradication. Same ant-loss
      // structure as capture-post (queen-dead, then field-force-wiped),
      // then the win: every spider party has zero living units.
      if (!antQueenAlive(state)) return 'spider';
      if (antFieldForceWiped(state)) return 'spider';
      if (allSpiderPartiesEliminated(state)) return 'ant';
      return null;
    }
    case 'recruit-count': {
      // L8 (Attic) — cockroach recruit-or-die (§4.3.3). Hard loss:
      // queen dead. Then the WIN is checked *before* the recruiter
      // loss so a target already met still wins even if the last mage
      // dies the same turn. Finally, with the target unmet and no
      // recruiter left the objective is unreachable → spider.
      if (!antQueenAlive(state)) return 'spider';
      if (recruitedPartyCount(state, vc.unitTemplateId) >= vc.target) return 'ant';
      if (!antRecruiterRemains(state)) return 'spider';
      return null;
    }
  }
};

/**
 * Round 8 — return the 5-tile plus shape (center + N/S/W/E) clamped to
 * the 10x10 plane. Tile order is deterministic.
 */
const zonePlusTiles = (zone: DamageZone): readonly TileCoord[] => {
  const center: TileCoord = { plane: zone.plane, x: zone.centerX, y: zone.centerY };
  return [
    center,
    { plane: zone.plane, x: zone.centerX, y: zone.centerY - 1 },
    { plane: zone.plane, x: zone.centerX, y: zone.centerY + 1 },
    { plane: zone.plane, x: zone.centerX - 1, y: zone.centerY },
    { plane: zone.plane, x: zone.centerX + 1, y: zone.centerY },
  ].filter((c) => c.x >= 0 && c.x <= 9 && c.y >= 0 && c.y <= 9);
};

interface ZoneTickOutcome {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

const applyDamageZoneTicks = (
  state: GameState,
  turn: number,
  tick: () => number,
): ZoneTickOutcome => {
  const events: ReplayEvent[] = [];
  if (state.damageZones.length === 0) {
    return { state, events };
  }
  // Build a per-tile damage map: tileKey -> total hp this turn.
  // Multiple zones stack additively. Stinkbug units are immune.
  const damagePerTile = new Map<string, number>();
  for (const zone of state.damageZones) {
    if (zone.turnsRemaining <= 0) continue;
    for (const t of zonePlusTiles(zone)) {
      const k = `${t.plane}:${String(t.x)},${String(t.y)}`;
      damagePerTile.set(k, (damagePerTile.get(k) ?? 0) + 1);
    }
  }

  // Apply damage to each party's units standing on a zone tile.
  const newParties = new Map<PartyId, Party>();
  const affectedByZoneCenter = new Map<string, UnitId[]>();
  for (const [id, party] of state.parties) {
    const tileKey = `${party.location.plane}:${String(party.location.x)},${String(party.location.y)}`;
    const dmg = damagePerTile.get(tileKey) ?? 0;
    if (dmg <= 0) {
      newParties.set(id, party);
      continue;
    }
    const newUnits: Unit[] = [];
    for (const u of party.units) {
      if (u.currentHp <= 0) {
        newUnits.push(u);
        continue;
      }
      // Stinkbugs are immune to damage zones (own kind).
      const tmpl = state.unitTemplates.get(u.templateId);
      if (tmpl?.id === STINKBUG_TEMPLATE_ID) {
        newUnits.push(u);
        continue;
      }
      const before = u.currentHp;
      const after = Math.max(0, before - dmg);
      newUnits.push({ ...u, currentHp: after });
      // Bucket by tile (zone center is harder to determine when zones
      // overlap; key the bucket by tileKey for the per-tile sum and
      // emit a separate damage-zone-tick event per zone center).
      void affectedByZoneCenter;
    }
    newParties.set(id, {
      ...party,
      units: newUnits,
      leaderless: party.leaderless || newUnits.every((u) => u.currentHp <= 0),
    });
  }

  // Emit per-zone tick events (with the units affected on that zone's
  // tiles) and decrement turnsRemaining; drop zones that hit 0.
  const newZones: DamageZone[] = [];
  for (const zone of state.damageZones) {
    const zoneTiles = zonePlusTiles(zone);
    const tileKeys = new Set(zoneTiles.map((t) => `${t.plane}:${String(t.x)},${String(t.y)}`));
    // Find units in the zone (post-damage) by walking parties at
    // matching locations.
    const affected: UnitId[] = [];
    for (const party of state.parties.values()) {
      const k = `${party.location.plane}:${String(party.location.x)},${String(party.location.y)}`;
      if (!tileKeys.has(k)) continue;
      for (const u of party.units) {
        if (u.currentHp <= 0) continue;
        const tmpl = state.unitTemplates.get(u.templateId);
        if (tmpl?.id === STINKBUG_TEMPLATE_ID) continue;
        affected.push(u.id);
      }
    }
    events.push({
      kind: 'damage-zone-tick',
      turn,
      tick: tick(),
      center: { plane: zone.plane, x: zone.centerX, y: zone.centerY },
      damage: 1,
      affectedUnits: affected,
    });
    const remaining = zone.turnsRemaining - 1;
    if (remaining > 0) {
      newZones.push({ ...zone, turnsRemaining: remaining });
    } else {
      events.push({
        kind: 'damage-zone-expired',
        turn,
        tick: tick(),
        center: { plane: zone.plane, x: zone.centerX, y: zone.centerY },
      });
    }
  }

  return {
    state: { ...state, parties: newParties, damageZones: newZones },
    events,
  };
};

/**
 * Round 11 — true iff the target party is a valid pursue target: it
 * exists in `state.parties`, is not leaderless, and has at least one
 * living unit. Used by the neutral-decision tick to drop stale
 * `pursue` modifiers as soon as the target disappears (recruited,
 * killed, or otherwise gone).
 */
const pursueTargetAlive = (state: GameState, targetId: PartyId | undefined): boolean => {
  if (targetId === undefined) return false;
  const target = state.parties.get(targetId);
  if (!target) return false;
  if (target.leaderless) return false;
  return target.units.some((u) => u.currentHp > 0);
};

/**
 * Round 11 — decrement every ant party's `neutralDecision.turnsRemaining`
 * by 1; drop the field when it hits 0 or when a `pursue` decision's
 * target is gone. Non-ant parties carry no decision (the AI never sets
 * one) so are skipped without inspection.
 */
const applyNeutralDecisionTick = (state: GameState): GameState => {
  const next = new Map<PartyId, Party>();
  let changed = false;
  for (const [id, party] of state.parties) {
    if (!party.neutralDecision) {
      next.set(id, party);
      continue;
    }
    const decision = party.neutralDecision;
    // Drop early if pursuing a target that is no longer reachable.
    if (decision.kind === 'pursue' && !pursueTargetAlive(state, decision.targetPartyId)) {
      const { neutralDecision: _drop, ...rest } = party;
      void _drop;
      next.set(id, rest);
      changed = true;
      continue;
    }
    const remaining = decision.turnsRemaining - 1;
    if (remaining <= 0) {
      const { neutralDecision: _drop, ...rest } = party;
      void _drop;
      next.set(id, rest);
      changed = true;
      continue;
    }
    next.set(id, { ...party, neutralDecision: { ...decision, turnsRemaining: remaining } });
    changed = true;
  }
  return changed ? { ...state, parties: next } : state;
};

export const endOfTurn = (
  state: GameState,
  input: EndOfTurnInput,
  tick: () => number,
  rng?: Rng,
): EndOfTurnOutcome => {
  const events: ReplayEvent[] = [];
  const currentTurn = state.turn;

  // 1. Healing.
  let working = applyHealing(state);

  // 1b. Round 24 — venom-storm tangle decay (mechanics memo §1.2).
  //     Per-unit `tangleTurnsRemaining` decrements by 1 each end-of-
  //     turn; reaches 0 → field is dropped on the next tick. Pure
  //     bookkeeping; no event emitted (the combo-fired event already
  //     captured the application).
  working = applyTangleDecay(working);

  // 1c. Round 25 — commander-card buff decay (mechanics memo §1.3).
  //     Per-party `cardBuffs.bonusTurnsRemaining` decrements by 1;
  //     reaches 0 → buffs cleared. Forced-march clears each turn (it's
  //     a one-shot movement bonus). Pure bookkeeping; no event.
  working = decayCardBuffs(working);

  // 2. Queen ultimate charge. Only emit if the value actually changed —
  //    once the cap is hit, repeated charge=cap events are pure noise.
  const oldCharge = working.queenUltimateCharge;
  const chargeStep = applyUltimateCharge(working, input.queen);
  working = chargeStep.state;
  if (chargeStep.charge !== oldCharge) {
    events.push({
      kind: 'queen-ultimate-charged',
      turn: currentTurn,
      tick: tick(),
      charge: chargeStep.charge,
    });
  }

  // 2b. Fire the ultimate if it's ready, has uses remaining, and would
  //     hit at least one living spider unit. The AoE clears most or all
  //     attackers per the spec.
  if (
    working.queenUltimateCharge >= input.queen.ultimate.chargeMax &&
    working.queenUltimatesUsed < input.queen.ultimate.usesPerScenario
  ) {
    const queenParty = findQueenParty(working);
    if (
      queenParty &&
      enemyInUltimateRange(working, queenParty.location, input.queen.ultimate.radius)
    ) {
      const fireResult = fireUltimate(working, queenParty.location, input.queen, currentTurn, tick);
      working = fireResult.state;
      events.push(...fireResult.events);
    }
  }

  // 2c. Round 26 — charisma-gated promotion (mechanics memo §1.4).
  //     Walk every party at home base; promote any unit whose
  //     charisma reached the threshold (and hasn't already
  //     promoted) to its paired template. Single-step, automatic,
  //     one-time per unit per scenario. Fires before jelly /
  //     production / win-check so a freshly-promoted unit's stats
  //     are visible the moment the new turn starts.
  const promoOutcome = applyCharismaPromotions(working, currentTurn, tick);
  working = promoOutcome.state;
  events.push(...promoOutcome.events);

  // 3. Royal Jelly production (silent).
  working = applyJellyProduction(working, input.jelly);

  // 4. Queen unit production (cadence keyed to the NEW turn number).
  const nextTurn = currentTurn + 1;
  working = applyUnitProduction(working, input.queen, nextTurn);

  // 5. Win/loss check (loss before victory).
  const winner = checkWinner(working);
  if (winner) {
    working = { ...working, winner };
    events.push({
      kind: 'scenario-end',
      turn: currentTurn,
      tick: tick(),
      winner,
    });
  }

  // 5b. Pheromone trail update (rec 1.5). For each living ant party,
  //     age existing entries by 1 turn, drop any older than
  //     PHERO_MAX_AGE, then prepend the current location at age 0.
  //     Spider parties don't carry trails (asymmetric visibility).
  // L5 Under-Bed concealment (§3.7): an ant party standing on a
  // `concealment` POST leaves it with an EMPTY trail this turn — no
  // fresh breadcrumb and existing ones dropped — so the spider's
  // trail-scouting (the locked `getSpiderVisibleAntTrail`, unchanged)
  // finds nothing for it. No concealment POSTs on any shipped map, so
  // this branch never fires there and trails stay byte-identical.
  const concealmentPosts: TileCoord[] = [];
  for (const post of working.posts.values()) {
    if (post.concealment) concealmentPosts.push(post.location);
  }
  const isConcealed = (loc: TileCoord): boolean => concealmentPosts.some((c) => sameCoord(c, loc));

  const newTrails = new Map<PartyId, readonly PheroTrailEntry[]>();
  for (const [id, party] of working.parties) {
    if (party.faction !== 'ant') continue;
    const alive = party.units.some((u) => u.currentHp > 0);
    if (!alive) continue;
    if (isConcealed(party.location)) {
      newTrails.set(id, []);
      continue;
    }
    const previous = working.pheroTrails.get(id) ?? [];
    const aged: PheroTrailEntry[] = [];
    for (const entry of previous) {
      const next = entry.ageInTurns + 1;
      if (next > PHERO_MAX_AGE) continue;
      aged.push({ plane: entry.plane, x: entry.x, y: entry.y, ageInTurns: next });
    }
    const fresh: PheroTrailEntry = {
      plane: party.location.plane,
      x: party.location.x,
      y: party.location.y,
      ageInTurns: 0,
    };
    newTrails.set(id, [fresh, ...aged]);
  }
  working = { ...working, pheroTrails: newTrails };

  // 5c. Round 8 — neutral hypnotize/rebound timer ticks. For every
  //     entry in `neutralStatus`:
  //       hypnoticControlRemaining > 0 → decrement; if it hits 0,
  //       transition to `spiderImmunityRemaining = 10` and emit
  //       `hypnotize-rebound-started`.
  //       spiderImmunityRemaining > 0 (without active hypnosis) →
  //       decrement; immunity expires when it hits 0.
  const newStatus = new Map<PartyId, NeutralStatus>();
  for (const [id, status] of working.neutralStatus) {
    let next: NeutralStatus = status;
    if (status.hypnotizedBy === 'spider' && status.hypnoticControlRemaining > 0) {
      const remaining = status.hypnoticControlRemaining - 1;
      if (remaining <= 0) {
        next = {
          ...status,
          hypnotizedBy: null,
          hypnoticControlRemaining: 0,
          spiderImmunityRemaining: HYPNOTIZE_REBOUND_IMMUNITY,
        };
        events.push({
          kind: 'hypnotize-rebound-started',
          turn: currentTurn,
          tick: tick(),
          partyId: id,
        });
      } else {
        next = { ...status, hypnoticControlRemaining: remaining };
      }
    } else if (status.spiderImmunityRemaining > 0) {
      next = {
        ...status,
        spiderImmunityRemaining: Math.max(0, status.spiderImmunityRemaining - 1),
      };
    }
    newStatus.set(id, next);
  }
  working = { ...working, neutralStatus: newStatus };

  // 5c-bis. Round 11 — neutral-decision tick on ant parties. For each
  //         party with a `neutralDecision`: drop a `pursue` decision
  //         immediately if the target is dead/leaderless/missing;
  //         otherwise decrement `turnsRemaining` and drop the field
  //         when it hits 0. The mechanic is "decide once, commit for
  //         5 turns" — this tick is the commit clock.
  working = applyNeutralDecisionTick(working);

  // 5d. Round 8 — stinkbug damage-zone ticks. For each active zone:
  //     deal 1 hp to every non-stinkbug unit standing on a zone tile,
  //     decrement turnsRemaining, then drop expired zones. Multiple
  //     zones stacking on the same tile compound their damage by
  //     adding up across iterations.
  const zoneTickResult = applyDamageZoneTicks(working, currentTurn, tick);
  working = zoneTickResult.state;
  events.push(...zoneTickResult.events);

  // 5e. Round 14 — item discovery. Eligible (ant/spider, non-queen-
  //     guard, leadered, alive) parties roll 25% per adjacent
  //     undiscovered item. Consumables fire on pickup; persistents
  //     occupy `Party.item` (with a swap heuristic when slots are
  //     full). Skipped when the caller doesn't supply items + rng so
  //     pre-round-14 callers / unit tests stay deterministic.
  if (input.items && rng) {
    const itemRng = rng.fork('item-discovery');
    const discoveryResult = discoverItems(
      working,
      { itemsFile: input.items, jelly: input.jelly },
      itemRng,
      currentTurn,
      tick,
    );
    working = discoveryResult.state;
    events.push(...discoveryResult.events);
  }

  // 6. Day/night phase advance. Decrement remaining-in-phase; if it
  //    hits 0, flip the phase and reset the counter to PHASE_LENGTH.
  //    Emit phase-changed *for* the upcoming turn (nextTurn) when the
  //    flip occurs so consumers (combat / AI policies) can read the
  //    new phase off state.
  const decremented = working.phaseTurnsRemaining - 1;
  let newPhase: DayNightPhase = working.phase;
  let newPhaseTurnsRemaining = decremented;
  if (decremented <= 0) {
    newPhase = working.phase === 'day' ? 'night' : 'day';
    newPhaseTurnsRemaining = PHASE_LENGTH;
    events.push({
      kind: 'phase-changed',
      turn: nextTurn,
      tick: tick(),
      phase: newPhase,
    });
  }

  // 7. Increment turn counter; emit turn-start for the new turn.
  working = {
    ...working,
    turn: nextTurn,
    phase: newPhase,
    phaseTurnsRemaining: newPhaseTurnsRemaining,
  };
  events.push({ kind: 'turn-start', turn: nextTurn, tick: tick() });

  return { state: working, events };
};
