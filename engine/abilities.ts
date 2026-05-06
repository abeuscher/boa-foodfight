/**
 * engine/abilities — resolves party-level `use-ability` orders that the
 * coevolution loop staged but were previously dropped on the floor.
 *
 * Currently supports:
 *   - `jelly-apply` — source party with at least one unit possessing
 *     the ability transfers one jelly dose to the target party (or
 *     itself, if no target is specified). Target is capped at
 *     `scenario.jelly.capacityPerParty`. Emits `ability-used` and
 *     `jelly-applied` events.
 *
 * Runs at the top of `runTurn` before movement so any battle triggered
 * by the same turn's movement gets the jelly multipliers.
 *
 * Imports allowed: `engine/types` only (see CONTRACTS.md).
 */

import type { JellyFile } from './schemas/index.ts';
import type {
  AbilityId,
  AbilityOrder,
  GameState,
  Order,
  Party,
  PartyId,
  ReplayEvent,
  UnitTemplate,
  UnitTemplateId,
} from './types.ts';

const JELLY_APPLY: AbilityId = 'jelly-apply' as AbilityId;

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
  // Target may be a party id, a tile coord, or a post id. We only
  // handle PartyId for jelly-apply right now.
  if (typeof target === 'string') {
    return parties.get(target as PartyId);
  }
  return undefined;
};

export interface AbilityResolution {
  readonly state: GameState;
  readonly events: readonly ReplayEvent[];
}

/**
 * Walk every party's order queue once. For the first `use-ability`
 * order that resolves to a known ability, apply it and pop the order.
 * Returns the new state plus emitted events.
 */
export const resolveAbilityOrders = (
  state: GameState,
  jelly: JellyFile,
  tick: () => number,
): AbilityResolution => {
  const events: ReplayEvent[] = [];
  const nextParties = new Map<PartyId, Party>(state.parties);
  for (const [id, party] of state.parties) {
    const slot = firstAbilityOrder(party.orders);
    if (!slot) continue;
    if (slot.order.abilityId !== JELLY_APPLY) continue;

    if (!partyHasAbility(party, JELLY_APPLY, state.unitTemplates)) {
      // Drop the order silently — issuer doesn't have the ability.
      nextParties.set(id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
      continue;
    }

    const target = resolveTargetParty(party, slot.order, nextParties);
    if (!target) {
      nextParties.set(id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
      continue;
    }

    // Increment target's jelly doses, capped at capacity.
    const newDoses = Math.min(jelly.capacityPerParty, target.jellyDoses + 1);
    const targetUpdated: Party = { ...target, jellyDoses: newDoses };
    nextParties.set(target.id, targetUpdated);
    // Drop the source's order (preserving the source party reference if
    // it isn't the target — otherwise the targetUpdated above handles
    // the orders too).
    if (target.id !== id) {
      nextParties.set(id, { ...party, orders: dropOrderAt(party.orders, slot.index) });
    } else {
      nextParties.set(id, { ...targetUpdated, orders: dropOrderAt(party.orders, slot.index) });
    }

    events.push({
      kind: 'ability-used',
      turn: state.turn,
      tick: tick(),
      partyId: id,
      abilityId: JELLY_APPLY,
    });
    events.push({
      kind: 'jelly-applied',
      turn: state.turn,
      tick: tick(),
      partyId: target.id,
      doses: newDoses,
    });
  }
  return { state: { ...state, parties: nextParties }, events };
};
