import type { ItemId } from '../../../engine/types.ts';
import { buyItem } from '../../../engine/world-shop.ts';
import type { WorldState } from '../../../engine/world-state.ts';

import { ITEMS, SHOP_CATALOG } from '../fixture.ts';
import { inventoryEntries, itemName, type Apply } from '../shared.ts';

interface Props {
  readonly state: WorldState;
  readonly apply: Apply;
}

/**
 * Grasshopper shop sub-view (ui-shop-subview-spec, DRAFT). Minimal v1:
 * catalog list with affordability-gated Buy, purchases land in the
 * inventory pool (`buyItem`), equipping happens in Organize Army. The
 * spec's detail-card / flavor / figure are deferred build direction.
 */
export function Shop({ state, apply }: Props): JSX.Element {
  const inventory = inventoryEntries(state.roster);

  return (
    <div className="columns">
      <section className="parties">
        <h2>Grasshopper — Shop</h2>
        <p className="hint">
          Buy persistent items into the colony inventory; equip them on units in Organize Army.
        </p>
        <ul>
          {SHOP_CATALOG.items.map((entry) => {
            const affordable = state.gold >= entry.cost;
            return (
              <li key={entry.itemId}>
                <span className="unit">{itemName(entry.itemId)}</span>
                <span className="acts">
                  <span className="cost">{entry.cost} buttons</span>
                  <button
                    disabled={!affordable}
                    onClick={() => {
                      const res = buyItem(state, entry.itemId as ItemId, SHOP_CATALOG, ITEMS);
                      apply(res.state, res, `bought ${itemName(entry.itemId)}`);
                    }}
                  >
                    Buy
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="barracks">
        <h2>Inventory ({state.roster.inventory?.length ?? 0})</h2>
        {inventory.length === 0 && (
          <p className="empty">No unequipped items. Buy some, then equip in Organize Army.</p>
        )}
        <ul>
          {inventory.map(([id, count]) => (
            <li key={id}>
              <span className="unit">
                {itemName(id)} <span className="rank">×{count}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
