/**
 * engine/abilities — resolves party-level `use-ability` orders.
 *
 * Currently supports:
 *   - `jelly-apply`        ant: transfer a jelly dose source→target party
 *   - `spin-web`           spider: web-spinner lays a web on its tile
 *                          (one-time per spinner; ant parties stepping
 *                          on it pause for a turn)
 *   - `recruit`            ant-mage: 25% chance to convert a single-unit
 *                          enemy party
 *   - `spawn-spiderlings`  spider-queen: emits 10 one-unit spiderling
 *                          parties at her tile
 *
 * Runs at the top of `runTurn` before movement so any battle triggered
 * by the same turn's movement gets the resulting buffs / debuffs.
 *
 * Imports allowed: `engine/coord`, `engine/schemas`, `engine/types`.
 */

import { coordKey } from './coord.ts';
import { assignFormation } from './formation.ts';
import type { AbilitiesFile, JellyFile } from './schemas/index.ts';
import type {
  AbilityId,
  AbilityOrder,
  DamageZone,
  GameState,
  NeutralKind,
  NeutralStatus,
  Order,
  Party,
  PartyId,
  ReplayEvent,
  Rng,
  TileCoord,
  Unit,
  UnitId,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;
const SPIN_WEB: AbilityId = 'spin-web' as AbilityId;
const RECRUIT: AbilityId = 'recruit' as AbilityId;
const SPAWN_SPIDERLINGS: AbilityId = 'spawn-spiderlings' as AbilityId;
const SCOUT_PING: AbilityId = 'scout-ping' as AbilityId;
const HYPNOTIZE: AbilityId = 'hypnotize' as AbilityId;
const WEB_MEND: AbilityId = 'web-mend' as AbilityId;
/**
 * Round 18 — fallback heal-per-unit when the abilities data file does
 * not surface a usable `params.heal`. The web-mend passive in
 * `engine/battle.ts` is `heal: 1`, but spec'd active healing wants ~3
 * HP/turn so the web-guard can sustain itself between turns. We use
 * `params.heal` as a hint and layer on a constant active-cast bonus.
 */
const WEB_MEND_ACTIVE_HEAL = 3;

/** Round 8 hypnotize tuning. Locked by spec. */
const HYPNOTIZE_SUCCESS_RATE = 0.8;
const HYPNOTIZE_MIN_TURNS = 5;
const HYPNOTIZE_MAX_TURNS = 10;
export const HYPNOTIZE_REBOUND_IMMUNITY = 10;

export const partyHasAbility = (
  party: Party,
  abilityId: AbilityId,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): boolean => {
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    const tmpl = templates.get(u.templateId);
    if (!tmpl) continue;
    if (tmpl.abilities.includes(abilityId)) return true;
  }
  return false;
};

/** First living unit in `party` whose template has `abilityId`. */
const firstUnitWithAbility = (
  party: Party,
  abilityId: AbilityId,
  templates: ReadonlyMap<UnitTemplateId, UnitTemplate>,
): Unit | undefined => {
  for (const u of party.units) {
    if (u.currentHp <= 0) continue;
    const tmpl = templates.get(u.templateId);
    if (tmpl?.abilities.includes(abilityId)) return u;
  }
  return undefined;
};

const firstAbilityOrder = (
  orders: readonly Order[],
): { order: AbilityOrder; index: number } | undefined => {
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if (o?.kind === 'use-ability') return { order: o, index: i };
  }
  return undefined;
};

const dropOrderAt = (orders: readonly Order[], index: number): readonly Order[] => {
  if (index < 0 || index >= orders.length) return orders;
  return [...orders.slice(0, index), ...orders.slice(index + 1)];
};

const resolveTargetParty = (
  source: Party,
  order: AbilityOrder,
  parties: ReadonlyMap<PartyId, Party>,
): Party | undefined => {
  const target = order.target;
  if (target === undefined) return source;
  if (typeof target === 'string') return parties.get(target as PartyId);
  return undefined;
};

export interface AbilityResolution {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

const livingUnits = (party: Party): readonly Unit[] => party.units.filter((u) => u.currentHp > 0);

interface HandlerResult {
  readonly nextParties: Map<PartyId, Party>;
  readonly nextWebbedTiles: Map<string, TileCoord>;
  readonly events: readonly ReplayEvent[];
  readonly handled: boolean;
}

interface HandlerArgs {
  party: Party;
  slot: { order: AbilityOrder; index: number };
  state: GameState;
  parties: Map<PartyId, Party>;
  webbedTiles: Map<string, TileCoord>;
  /**
   * Round 8 — neutral-control state. Mutated in place by hypnotize /
   * recruit handlers when a neutral is taken or converted. Recruit
   * deletes the neutral's entry on success; hypnotize sets the
   * `hypnotizedBy` / `hypnoticControlRemaining` fields.
   */
  neutralStatus: Map<PartyId, NeutralStatus>;
  /**
   * Round 8 — active stinkbug damage zones. Pushed onto by the
   * recruit / hypnotize handlers when a failed attempt targets a
   * stinkbug.
   */
  damageZones: DamageZone[];
  tick: () => number;
}

/** Drop the ability order from the issuing party. Used by every
 * handler when bailing out (missing ability, invalid target, etc.). */
const consumeOrder = (
  party: Party,
  slot: { order: AbilityOrder; index: number },
  parties: Map<PartyId, Party>,
): void => {
  parties.set(party.id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
};

/** Standard ability-used event for handler emission. */
const abilityUsedEvent = (
  state: GameState,
  partyId: PartyId,
  abilityId: AbilityId,
  tick: () => number,
): ReplayEvent => ({
  kind: 'ability-used',
  turn: state.turn,
  tick: tick(),
  partyId,
  abilityId,
});

const handleJellyApply = (args: HandlerArgs & { jelly: JellyFile }): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, tick, jelly } = args;
  const events: ReplayEvent[] = [];
  if (!partyHasAbility(party, JELLY_APPLY, state.unitTemplates)) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const target = resolveTargetParty(party, slot.order, parties);
  if (!target) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const newDoses = Math.min(jelly.capacityPerParty, target.jellyDoses + 1);
  const targetUpdated: Party = { ...target, jellyDoses: newDoses };
  parties.set(target.id, targetUpdated);
  if (target.id !== party.id) {
    parties.set(party.id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
  } else {
    parties.set(party.id, { ...targetUpdated, orders: dropOrderAt(party.orders, slot.index) });
  }
  events.push(abilityUsedEvent(state, party.id, JELLY_APPLY, tick));
  events.push({
    kind: 'jelly-applied',
    turn: state.turn,
    tick: tick(),
    partyId: target.id,
    doses: newDoses,
  });
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

const handleSpinWeb = (args: HandlerArgs): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, tick } = args;
  const events: ReplayEvent[] = [];
  if (!partyHasAbility(party, SPIN_WEB, state.unitTemplates)) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const coord = party.location;
  const key = coordKey(coord);
  // Already a web here? skip but consume the order.
  if (!webbedTiles.has(key)) {
    webbedTiles.set(key, { plane: coord.plane, x: coord.x, y: coord.y });
  }
  consumeOrder(party, slot, parties);
  events.push(abilityUsedEvent(state, party.id, SPIN_WEB, tick));
  events.push({
    kind: 'web-spun',
    turn: state.turn,
    tick: tick(),
    partyId: party.id,
    coord: { plane: coord.plane, x: coord.x, y: coord.y },
  });
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

const RECRUIT_SUCCESS_RATE = 0.25;

/**
 * Round 8 — 5-tile plus shape (center + 4 neighbors), clamped to the
 * 10x10 plane bounds. Returned ordering is deterministic (center,
 * north, south, west, east) so replay events stay stable.
 */
const damageZonePlusTiles = (state: GameState, center: TileCoord): readonly TileCoord[] => {
  const candidates: TileCoord[] = [
    center,
    { plane: center.plane, x: center.x, y: center.y - 1 },
    { plane: center.plane, x: center.x, y: center.y + 1 },
    { plane: center.plane, x: center.x - 1, y: center.y },
    { plane: center.plane, x: center.x + 1, y: center.y },
  ];
  return candidates.filter((c) => state.tiles.has(coordKey(c)));
};

/**
 * Round 8 — push a freshly-spawned damage zone onto the running list
 * and emit the matching replay event. Shared by recruit and hypnotize
 * stinkbug-failure branches so the spawn logic stays one place.
 */
const spawnStinkbugDamageZone = (
  state: GameState,
  center: TileCoord,
  damageZones: DamageZone[],
  events: ReplayEvent[],
  tick: () => number,
): void => {
  damageZones.push({
    plane: center.plane,
    centerX: center.x,
    centerY: center.y,
    turnsRemaining: 5,
  });
  events.push({
    kind: 'damage-zone-spawned',
    turn: state.turn,
    tick: tick(),
    center: { plane: center.plane, x: center.x, y: center.y },
    tiles: damageZonePlusTiles(state, center),
  });
};

/**
 * Round 8 — neutral recruit branch. The ant-mage may target a neutral
 * party (mice/cockroaches/stinkbugs) at the same tile regardless of
 * unit count. On success the entire neutral party converts to faction
 * `'ant'` permanently; the `neutralStatus` entry is dropped.
 */
const recruitNeutral = (args: {
  party: Party;
  slot: { order: AbilityOrder; index: number };
  state: GameState;
  parties: Map<PartyId, Party>;
  webbedTiles: Map<string, TileCoord>;
  neutralStatus: Map<PartyId, NeutralStatus>;
  damageZones: DamageZone[];
  tick: () => number;
  rng: Rng;
  target: Party;
  targetKind: NeutralKind;
}): HandlerResult => {
  const {
    party,
    slot,
    state,
    parties,
    webbedTiles,
    neutralStatus,
    damageZones,
    tick,
    rng,
    target,
    targetKind,
  } = args;
  const events: ReplayEvent[] = [];
  const success = rng.next() < RECRUIT_SUCCESS_RATE;
  events.push(abilityUsedEvent(state, party.id, RECRUIT, tick));
  events.push({
    kind: 'recruit-attempted-neutral',
    turn: state.turn,
    tick: tick(),
    partyId: party.id,
    targetId: target.id,
    targetType: targetKind,
    success,
  });
  if (success) {
    // Convert the entire neutral party to ant. Drop neutralStatus.
    parties.set(target.id, { ...target, faction: 'ant' });
    neutralStatus.delete(target.id);
  } else if (targetKind === 'stinkbugs') {
    spawnStinkbugDamageZone(state, target.location, damageZones, events, tick);
  }
  // Always consume the order regardless of outcome.
  parties.set(party.id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

/**
 * Round 8 — hypnotize handler. Any spider unit may attempt against a
 * neutral party at the same tile. Cost: caster's currentHp halved
 * (rounded down). 80% success. On success the neutral gains
 * `hypnotizedBy: 'spider'` + a 5-10 turn control counter. On failure
 * the order is consumed; if the target is a stinkbug the caller's
 * stage-7 wiring will spawn a damage zone (pushed onto `damageZones`
 * here).
 *
 * Auto-fail (silently consume) when the neutral is currently
 * hypnotized OR has rebound immunity remaining.
 */
const handleHypnotize = (args: HandlerArgs & { rng: Rng }): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, neutralStatus, damageZones, tick, rng } = args;
  const events: ReplayEvent[] = [];
  if (party.faction !== 'spider') {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  // Pick the caster: leader if living, else first living unit.
  const leader = party.units.find((u) => u.id === party.leaderId && u.currentHp > 0);
  const caster = leader ?? party.units.find((u) => u.currentHp > 0);
  if (!caster) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const target = resolveTargetParty(party, slot.order, parties);
  const sameTile =
    target?.location.plane === party.location.plane &&
    target.location.x === party.location.x &&
    target.location.y === party.location.y;
  if (!target || !sameTile || target.faction !== 'neutral') {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const status = neutralStatus.get(target.id);
  if (!status) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  // Auto-fail when already hypnotized or in the rebound immunity
  // window. Silently consume the order — no event, no HP cost.
  if (status.hypnotizedBy === 'spider' || status.spiderImmunityRemaining > 0) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  // Pay the cost: halve the caster's currentHp (rounded down). The
  // caster lives unless the halving brings them to 0 (Math.floor(0/2)
  // = 0 already, so this only kills a 1-HP caster).
  const casterHpBefore = caster.currentHp;
  const casterHpAfter = Math.floor(caster.currentHp / 2);
  const newUnits = party.units.map((u) =>
    u.id === caster.id ? { ...u, currentHp: casterHpAfter } : u,
  );
  const success = rng.next() < HYPNOTIZE_SUCCESS_RATE;
  // Compute control duration unconditionally (the RNG is consumed
  // either way) but only apply on success. This keeps replay-stream
  // RNG draws aligned across success/fail branches for a given seed.
  const controlSpan = HYPNOTIZE_MAX_TURNS - HYPNOTIZE_MIN_TURNS + 1;
  const controlTurns = HYPNOTIZE_MIN_TURNS + rng.int(controlSpan);
  events.push(abilityUsedEvent(state, party.id, HYPNOTIZE, tick));
  events.push({
    kind: 'hypnotize-attempted',
    turn: state.turn,
    tick: tick(),
    partyId: party.id,
    targetId: target.id,
    success,
    casterHpBefore,
    casterHpAfter,
  });
  // Apply HP cost + leaderless / unit liveness derivations.
  parties.set(party.id, {
    ...party,
    units: newUnits,
    leaderless: newUnits.every((u) => u.currentHp <= 0),
    orders: dropOrderAt(party.orders, slot.index),
  });
  if (success) {
    neutralStatus.set(target.id, {
      ...status,
      hypnotizedBy: 'spider',
      hypnoticControlRemaining: controlTurns,
      spiderImmunityRemaining: 0,
    });
  } else if (status.kind === 'stinkbugs') {
    spawnStinkbugDamageZone(state, target.location, damageZones, events, tick);
  }
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

const handleRecruit = (args: HandlerArgs & { rng: Rng }): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, neutralStatus, damageZones, tick, rng } = args;
  const events: ReplayEvent[] = [];
  if (!partyHasAbility(party, RECRUIT, state.unitTemplates)) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const target = resolveTargetParty(party, slot.order, parties);
  const targetLiving = target ? livingUnits(target) : [];
  const sameTile =
    target?.location.plane === party.location.plane &&
    target.location.x === party.location.x &&
    target.location.y === party.location.y;
  // Round 8: neutral target — convert entire party at the same 25%
  // rate. Multi-unit targets allowed.
  if (target && sameTile && target.faction === 'neutral' && targetLiving.length > 0) {
    const status = neutralStatus.get(target.id);
    if (status) {
      return recruitNeutral({
        party,
        slot,
        state,
        parties,
        webbedTiles,
        neutralStatus,
        damageZones,
        tick,
        rng,
        target,
        targetKind: status.kind,
      });
    }
  }
  // Legacy: single-unit enemy spider party at the same tile.
  if (!target || !sameTile || targetLiving.length !== 1 || target.faction === party.faction) {
    consumeOrder(party, slot, parties);
    events.push(abilityUsedEvent(state, party.id, RECRUIT, tick));
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const success = rng.next() < RECRUIT_SUCCESS_RATE;
  events.push({
    kind: 'ability-used',
    turn: state.turn,
    tick: tick(),
    partyId: party.id,
    abilityId: RECRUIT,
  });
  events.push({
    kind: 'recruit-attempted',
    turn: state.turn,
    tick: tick(),
    partyId: party.id,
    targetUnitId: targetLiving[0]!.id,
    success,
  });
  if (success) {
    const recruitedUnit = targetLiving[0]!;
    const newSourceUnits = [...party.units, recruitedUnit];
    const newTargetUnits = target.units.filter((u) => u.id !== recruitedUnit.id);
    parties.set(party.id, {
      ...party,
      units: newSourceUnits,
      // Round 20 — recompute formation so the recruited unit gets
      // an active slot (otherwise it'd silently land in reserve).
      formation: assignFormation(newSourceUnits, state.unitTemplates),
      orders: dropOrderAt(party.orders, slot.index),
    });
    parties.set(target.id, {
      ...target,
      units: newTargetUnits,
      formation: assignFormation(newTargetUnits, state.unitTemplates),
      leaderless: newTargetUnits.every((u) => u.currentHp <= 0),
    });
  } else {
    parties.set(party.id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
  }
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

/**
 * Scout-ping handler. The ability is reveal-only and has no live
 * scouting consequence in the engine yet, so resolution is just an
 * event emission. The night-phase gate (rec 1.2) suppresses it: at
 * night we emit `ability-blocked-by-phase` instead of `ability-used`.
 */
const handleScoutPing = (args: HandlerArgs): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, tick } = args;
  const events: ReplayEvent[] = [];
  if (!partyHasAbility(party, SCOUT_PING, state.unitTemplates)) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  if (state.phase === 'night') {
    consumeOrder(party, slot, parties);
    events.push({
      kind: 'ability-blocked-by-phase',
      turn: state.turn,
      tick: tick(),
      partyId: party.id,
      abilityId: SCOUT_PING,
      phase: state.phase,
    });
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  consumeOrder(party, slot, parties);
  events.push(abilityUsedEvent(state, party.id, SCOUT_PING, tick));
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

const handleSpawnSpiderlings = (args: HandlerArgs): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, tick } = args;
  const events: ReplayEvent[] = [];
  if (!partyHasAbility(party, SPAWN_SPIDERLINGS, state.unitTemplates)) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const tmpl = state.unitTemplates.get('spiderling' as UnitTemplateId);
  if (!tmpl) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const newPartyIds: PartyId[] = [];
  // Spawn N one-unit spiderling parties at the queen's tile. The
  // count is hard-coded here to match the data-file `count` param so
  // the AI behavior stays aligned with the value the firepower
  // designer tunes. Coevo round 1 dropped this from 10 to 5.
  const SPIDERLING_COUNT = 5;
  for (let i = 0; i < SPIDERLING_COUNT; i++) {
    const partyId = `spiderling-${String(state.turn)}-${String(i)}` as PartyId;
    if (parties.has(partyId)) continue;
    const unitId = `${partyId}-u` as UnitId;
    const unit: Unit = {
      id: unitId,
      templateId: tmpl.id,
      currentHp: tmpl.baseStats.hp,
      level: 1,
      xp: 0,
    };
    parties.set(partyId, {
      id: partyId,
      faction: 'spider',
      units: [unit],
      leaderId: unitId,
      location: party.location,
      orders: [],
      posture: 'fight',
      strategyModifiers: [],
      jellyDoses: 0,
      leaderless: false,
      // Round 20 — single-unit party: the spiderling sits in front
      // by default (size: small, no caster/ranged tags).
      formation: { front: [unitId], back: [], reserve: [] },
    });
    newPartyIds.push(partyId);
  }
  parties.set(party.id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
  events.push({
    kind: 'ability-used',
    turn: state.turn,
    tick: tick(),
    partyId: party.id,
    abilityId: SPAWN_SPIDERLINGS,
  });
  events.push({
    kind: 'spiderlings-spawned',
    turn: state.turn,
    tick: tick(),
    fromPartyId: party.id,
    newPartyIds,
  });
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

/**
 * Round 18 — `web-mend` use-ability. Heals every living unit in the
 * caster's party by `WEB_MEND_ACTIVE_HEAL` HP, capped at the unit
 * template's `baseStats.hp`. The caster must have `web-mend` in its
 * abilities (currently only `spider-queen`). Costs nothing; uses are
 * uncapped (`uses: null` in the data file).
 *
 * The existing battle-internal `web-mend` passive in `engine/battle.ts`
 * is intentionally untouched — that fires DURING battle rounds (the
 * 0.5-fraction self-mend), this fires BETWEEN turns when the AI
 * issues a use-ability order in response to ant proximity. They're
 * complementary: the passive bleeds the heal during a long fight, the
 * active recovers between fights.
 */
const handleWebMend = (
  args: HandlerArgs & { abilities: AbilitiesFile | undefined },
): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, tick, abilities } = args;
  const events: ReplayEvent[] = [];
  if (!partyHasAbility(party, WEB_MEND, state.unitTemplates)) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  // Heal-per-unit: prefer the active-cast constant. The data file's
  // `params.heal` is the passive trickle (1 HP), which is too small
  // for the strategic heal-priority response — so we layer on the
  // active-cast value. The `abilities` arg is reserved for future
  // tuning if a designer wants to surface a separate active-heal key.
  void abilities;
  const heal = WEB_MEND_ACTIVE_HEAL;
  const perUnit: { unitId: UnitId; hpBefore: number; hpAfter: number }[] = [];
  let totalHealed = 0;
  const newUnits = party.units.map((u) => {
    if (u.currentHp <= 0) return u;
    const tmpl = state.unitTemplates.get(u.templateId);
    if (!tmpl) return u;
    const cap = tmpl.baseStats.hp;
    if (u.currentHp >= cap) return u;
    const after = Math.min(cap, u.currentHp + heal);
    const delta = after - u.currentHp;
    if (delta <= 0) return u;
    perUnit.push({ unitId: u.id, hpBefore: u.currentHp, hpAfter: after });
    totalHealed += delta;
    return { ...u, currentHp: after };
  });
  parties.set(party.id, {
    ...party,
    units: newUnits,
    orders: dropOrderAt(party.orders, slot.index),
  });
  events.push(abilityUsedEvent(state, party.id, WEB_MEND, tick));
  events.push({
    kind: 'web-mended',
    turn: state.turn,
    tick: tick(),
    partyId: party.id,
    hpHealed: totalHealed,
    perUnit,
  });
  return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
};

/**
 * Walk every party's order queue once. For the first `use-ability`
 * order that resolves to a known ability, apply it and pop the order.
 * Returns the new state plus emitted events.
 *
 * `abilities` is optional for back-compat with tests that don't load
 * the full scenario; handlers that need it (currently web-mend) gate
 * on its presence and parameter shape.
 */
export const resolveAbilityOrders = (
  state: GameState,
  jelly: JellyFile,
  rng: Rng,
  tick: () => number,
  abilities?: AbilitiesFile,
): AbilityResolution => {
  const events: ReplayEvent[] = [];
  const parties = new Map<PartyId, Party>(state.parties);
  const webbedTiles = new Map<string, TileCoord>(state.webbedTiles);
  // Round 8: thread neutral-control state + damage-zone list through
  // every ability handler. Recruit (against a neutral) drops a status
  // entry on success; hypnotize sets one. Failed recruit/hypnotize
  // against a stinkbug pushes a damage zone.
  const neutralStatus = new Map<PartyId, NeutralStatus>(state.neutralStatus);
  const damageZones: DamageZone[] = [...state.damageZones];
  // Snapshot original ids so we don't iterate over freshly-spawned
  // spiderling parties and try to resolve their (empty) orders.
  const originalIds = [...state.parties.keys()];
  for (const id of originalIds) {
    const party = parties.get(id);
    if (!party) continue;
    const slot = firstAbilityOrder(party.orders);
    if (!slot) continue;
    let r: HandlerResult | undefined;
    const baseArgs: HandlerArgs = {
      party,
      slot,
      state,
      parties,
      webbedTiles,
      neutralStatus,
      damageZones,
      tick,
    };
    switch (slot.order.abilityId) {
      case JELLY_APPLY:
        r = handleJellyApply({ ...baseArgs, jelly });
        break;
      case SPIN_WEB:
        r = handleSpinWeb(baseArgs);
        break;
      case RECRUIT:
        r = handleRecruit({ ...baseArgs, rng });
        break;
      case SPAWN_SPIDERLINGS:
        r = handleSpawnSpiderlings(baseArgs);
        break;
      case SCOUT_PING:
        r = handleScoutPing(baseArgs);
        break;
      case HYPNOTIZE:
        r = handleHypnotize({ ...baseArgs, rng });
        break;
      case WEB_MEND:
        r = handleWebMend({ ...baseArgs, abilities });
        break;
      default:
        break;
    }
    if (r) events.push(...r.events);
  }
  void firstUnitWithAbility; // export-by-side-effect: keeps helper testable
  return {
    state: { ...state, parties, webbedTiles, neutralStatus, damageZones },
    events,
  };
};
