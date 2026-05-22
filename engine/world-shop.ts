/**
 * Roadmap §7.10 follow-on / §6.4 — the multi-item Grasshopper shop
 * (the last queued world-loop backend item). The Grasshopper (trader)
 * sells R14 *persistent* items; it is a distinct system from the
 * Anthill nursery, which sells units (`engine/world-recruit.ts`).
 * Items-only by design ruling — the prior single `mouse-merc` recruit
 * was a placeholder smoke-test, not a contract.
 *
 * World-loop layer, **ungated** per §7.6: runs between scenarios, off
 * the static / gate-29 path; the catalog is deliberately NOT loaded by
 * `loadScenario`. Pure: no RNG, no I/O, input never mutated. Mirrors
 * `world-recruit`'s `{ state, ok, error? }` result so the UI can
 * surface a rejection reason instead of failing silently.
 *
 * Model: the persisted roster has one persistent-item slot per unit
 * (`WorldUnit.item`, which rides on the party leader at inject —
 * troop-reference §10) and no separate item inventory. A purchase is
 * therefore *buy-and-equip*: deduct gold and set the target unit's
 * item. Buying onto an already-occupied slot is rejected rather than
 * silently discarding the held item (there is no inventory to return
 * it to) — the player clears it first via `equipItem(.., null)`. This
 * "buy fills an empty slot; swapping is explicit" rule is a dev-minimal
 * default, open to a design ruling (mirrors recruit's arrival-level
 * human ruling).
 */

import type { ItemTemplate } from './schemas/items.ts';
import type { ShopCatalogFile } from './schemas/shop-catalog.ts';
import type { ItemId, UnitId } from './types.ts';
import type { WorldRoster, WorldState } from './world-state.ts';

export interface ShopResult {
  readonly state: WorldState;
  /** True iff the purchase applied. When false, `state` is the input
   * unchanged and `error` explains why (UI-surfaceable). */
  readonly ok: boolean;
  readonly error?: string;
  /** The unit the bought item was equipped onto, when a buy applied. */
  readonly equippedUnitId?: UnitId;
}

/**
 * Buy a persistent item from the catalog and equip it onto `unitId`.
 * Rejected if: the item isn't in the catalog, isn't a known template,
 * isn't a `persistent` item, the unit is unknown, the unit's item slot
 * is already occupied, or the campaign can't afford the cost. On
 * success: deducts the catalog cost from `WorldState.gold` and sets the
 * unit's `item`.
 */
export const buyItem = (
  state: WorldState,
  itemId: ItemId,
  unitId: UnitId,
  catalog: ShopCatalogFile,
  items: readonly ItemTemplate[],
): ShopResult => {
  const entry = catalog.items.find((e) => e.itemId === itemId);
  if (!entry) {
    return { state, ok: false, error: `'${String(itemId)}' is not for sale here` };
  }
  const tmpl = items.find((i) => i.id === itemId);
  if (!tmpl) {
    return { state, ok: false, error: `unknown item '${String(itemId)}'` };
  }
  if (tmpl.kind !== 'persistent') {
    return { state, ok: false, error: `'${String(itemId)}' is not a persistent item` };
  }
  const unit = state.roster.units.find((u) => u.id === unitId);
  if (!unit) {
    return { state, ok: false, error: `unknown unit '${String(unitId)}'` };
  }
  if (unit.item !== null) {
    return { state, ok: false, error: 'unit already carries an item (unequip first)' };
  }
  if (state.gold < entry.cost) {
    return { state, ok: false, error: 'insufficient gold' };
  }

  const roster: WorldRoster = {
    ...state.roster,
    units: state.roster.units.map((u) => (u.id === unitId ? { ...u, item: itemId } : u)),
  };
  return {
    state: { ...state, gold: state.gold - entry.cost, roster },
    ok: true,
    equippedUnitId: unitId,
  };
};
