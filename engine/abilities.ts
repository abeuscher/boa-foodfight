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
import type { JellyFile } from './schemas/index.ts';
import type {
  AbilityId,
  AbilityOrder,
  GameState,
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

const partyHasAbility = (
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

const handleRecruit = (args: HandlerArgs & { rng: Rng }): HandlerResult => {
  const { party, slot, state, parties, webbedTiles, tick, rng } = args;
  const events: ReplayEvent[] = [];
  if (!partyHasAbility(party, RECRUIT, state.unitTemplates)) {
    consumeOrder(party, slot, parties);
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  // Target must be a single-unit enemy party at the same tile.
  const target = resolveTargetParty(party, slot.order, parties);
  const targetLiving = target ? livingUnits(target) : [];
  const sameTile =
    target?.location.plane === party.location.plane &&
    target.location.x === party.location.x &&
    target.location.y === party.location.y;
  if (!target || !sameTile || targetLiving.length !== 1 || target.faction === party.faction) {
    consumeOrder(party, slot, parties);
    events.push(abilityUsedEvent(state, party.id, RECRUIT, tick));
    return { nextParties: parties, nextWebbedTiles: webbedTiles, events, handled: true };
  }
  const success = rng.next() < 0.25;
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
    // Move the unit from target party to mage's party.
    const recruitedUnit = targetLiving[0]!;
    const newSourceUnits = [...party.units, recruitedUnit];
    const newTargetUnits = target.units.filter((u) => u.id !== recruitedUnit.id);
    parties.set(party.id, {
      ...party,
      units: newSourceUnits,
      orders: dropOrderAt(party.orders, slot.index),
    });
    parties.set(target.id, {
      ...target,
      units: newTargetUnits,
      leaderless: newTargetUnits.every((u) => u.currentHp <= 0),
    });
  } else {
    parties.set(party.id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
  }
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
 * Walk every party's order queue once. For the first `use-ability`
 * order that resolves to a known ability, apply it and pop the order.
 * Returns the new state plus emitted events.
 */
export const resolveAbilityOrders = (
  state: GameState,
  jelly: JellyFile,
  rng: Rng,
  tick: () => number,
): AbilityResolution => {
  const events: ReplayEvent[] = [];
  const parties = new Map<PartyId, Party>(state.parties);
  const webbedTiles = new Map<string, TileCoord>(state.webbedTiles);
  // Snapshot original ids so we don't iterate over freshly-spawned
  // spiderling parties and try to resolve their (empty) orders.
  const originalIds = [...state.parties.keys()];
  for (const id of originalIds) {
    const party = parties.get(id);
    if (!party) continue;
    const slot = firstAbilityOrder(party.orders);
    if (!slot) continue;
    let r: HandlerResult | undefined;
    const baseArgs: HandlerArgs = { party, slot, state, parties, webbedTiles, tick };
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
      default:
        break;
    }
    if (r) events.push(...r.events);
  }
  void firstUnitWithAbility; // export-by-side-effect: keeps helper testable
  return {
    state: { ...state, parties, webbedTiles },
    events,
  };
};
