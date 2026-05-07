/**
 * engine/item-effects — round-14 buff lookup helpers.
 *
 * Pure functions: given a `Party.item` slot value, return the
 * attack / armor / agility / movement offset that the combat and
 * movement resolvers fold in.
 *
 * Imports allowed: `engine/types` only. Stays a leaf so combat /
 * movement / parties can import without picking up scenario-data
 * dependencies.
 */

import type { ItemId, Party, Stats } from './types.ts';

/**
 * Per-item flat stat offset. Mirrors `PhaseStatOffset` from
 * `engine/phase.ts` but adds `armor` and `movement` because the item
 * surface covers more dimensions than the day/night cycle.
 */
export interface ItemStatOffset {
  readonly attack: number;
  readonly armor: number;
  readonly agility: number;
  readonly movement: number;
}

const ZERO_OFFSET: ItemStatOffset = { attack: 0, armor: 0, agility: 0, movement: 0 };

/**
 * Maximum movement allowance after item buffs. Spec lock: a boots
 * party with ant-scout-majority caps at 4, so the +1 from boots
 * can't compound the round-7 +3 floor allowance into 5.
 */
export const ITEM_MOVEMENT_CAP = 4;

/**
 * Look up the stat offset granted by a party's equipped item.
 * Consumables never appear here (they fire on pickup and clear),
 * so an unknown id maps to the zero offset.
 */
export const itemStatOffsetFor = (item: ItemId | null | undefined): ItemStatOffset => {
  if (!item) return ZERO_OFFSET;
  switch (item) {
    case 'brass-knuckles' as ItemId:
      return { attack: 1, armor: 0, agility: 0, movement: 0 };
    case 'leather-pad' as ItemId:
      return { attack: 0, armor: 1, agility: 0, movement: 0 };
    case 'scout-lens' as ItemId:
      return { attack: 0, armor: 0, agility: 1, movement: 0 };
    case 'boots' as ItemId:
      return { attack: 0, armor: 0, agility: 0, movement: 1 };
    default:
      return ZERO_OFFSET;
  }
};

/** Convenience: read the offset directly off a party. */
export const partyItemOffset = (party: Party): ItemStatOffset =>
  itemStatOffsetFor(party.item ?? null);

/**
 * Apply the combat-relevant slice of an item offset to a Stats
 * record (attack / armor / agility). Movement is consumed by the
 * movement resolver, not combat, so it's intentionally skipped here.
 */
export const applyItemOffsetToStats = (stats: Stats, offset: ItemStatOffset): Stats => ({
  ...stats,
  attack: stats.attack + offset.attack,
  armor: stats.armor + offset.armor,
  agility: stats.agility + offset.agility,
});
