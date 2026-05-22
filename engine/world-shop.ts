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
 * Model: a purchase appends the item to `WorldRoster.inventory` (the
 * owned-but-unequipped pool) — it does NOT equip. Equipping is a
 * separate step in the Organize Army sub-view (`world-organize`'s
 * `equipItem`, which draws one out of the inventory onto a unit). This
 * mirrors the Anthill precedent (recruits land in the barracks pool;
 * deploying is separate) and keeps the Shop's job at "item is owned".
 *
 * Stock: catalog entries carry an optional `stock` (`null` = uncapped).
 * v1 is a **soft cap** — `buyItem` does not decrement or enforce it (no
 * consumption tracking); the field exists so data can express it and a
 * later unique-item pass can add real consumption. The v1 stub is
 * "100 of everything", so nothing depletes.
 */

import type { ItemTemplate } from './schemas/items.ts';
import type { ShopCatalogFile } from './schemas/shop-catalog.ts';
import type { ItemId } from './types.ts';
import type { WorldRoster, WorldState } from './world-state.ts';

export interface ShopResult {
  readonly state: WorldState;
  /** True iff the purchase applied. When false, `state` is the input
   * unchanged and `error` explains why (UI-surfaceable). */
  readonly ok: boolean;
  readonly error?: string;
  /** The item id added to the inventory, when a buy applied. */
  readonly purchasedItemId?: ItemId;
}

/**
 * Buy a persistent item from the catalog into `WorldRoster.inventory`.
 * Rejected if: the item isn't in the catalog, isn't a known template,
 * isn't a `persistent` item, or the campaign can't afford the cost. On
 * success: deducts the catalog cost from `WorldState.gold` and appends
 * one copy of the item to the inventory pool (no equip — that's
 * `equipItem` in the Organize Army layer).
 */
export const buyItem = (
  state: WorldState,
  itemId: ItemId,
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
  if (state.gold < entry.cost) {
    return { state, ok: false, error: 'insufficient gold' };
  }

  const roster: WorldRoster = {
    ...state.roster,
    inventory: [...(state.roster.inventory ?? []), itemId],
  };
  return {
    state: { ...state, gold: state.gold - entry.cost, roster },
    ok: true,
    purchasedItemId: itemId,
  };
};
