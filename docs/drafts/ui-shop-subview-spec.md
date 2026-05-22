# Grasshopper Shop — UX Spec (Between-Scenario Sub-View)

**Intended location:** `docs/ui-shop-subview-spec.md`
**Status:** DRAFT — first formal sub-view spec in the per-view UI spec
family (parents: `ui-hill-hub-spec.md` for the verb-rail entry point and
diegetic framing; `ui-shell-integration-spec.md` for the between-scenario
chrome the sub-view operates within). Recording status will mirror the
family once ratified through the change-request protocol.

**Revision 3** — the `world-shop.ts` rework revision 2 awaited has landed
(merged `dd75621`). This revision rewrites the **Engine binding** section
against the **real shipped signatures**, retires the **Engine-truth
confirmations needed** section (items 1–4 ratified by the rework PR; item
5, sell-back, moves to forward-deps), and makes the **Stock and
out-of-stock** schema reference concrete. The user-facing surface is
unchanged from revision 2.

**Post-migration note:** this document was authored in session 003 but
was not committed to the repo at the time (it existed only as a working
artifact). This revision-3 draft carries the revision-2 text forward and
re-ratifies the engine sections; it is the first committed form.

## Purpose

The Shop is the between-scenario sub-view where the player buys items
from the Grasshopper using gold accumulated from scenarios. Mechanically
a single-purpose catalog: browse, select, afford, buy. Diegetically a
brief visit to an outside trader the colony deals with at arm's length,
per `ui-hill-hub-spec.md`'s framing of the Anthill (nursery, colony's
voice) vs. the Grasshopper (trader, outside).

The Shop is the second instance of the catalog-bound sub-view pattern the
coding agent established with the Recruit (Anthill) view: full
`WorldState` access, catalog binding, affordability-gated buttons, gold
readout in the persistent resource strip, sub-view landing layout. The
Shop spec reuses what Recruit established rather than inventing in
parallel.

## Position in flow

```
   Hill hub  ─── click Shop on verb rail ───►  Shop sub-view
       ▲                                              │
       └────────── click Back (chrome corner) ────────┘
```

Entry: click Shop on the Hill verb rail. Exit: click the chrome-band
Back affordance. No other navigation paths in or out of the Shop in v1.
Both transitions use the shell IA's stylized default (200–400ms fade or
slide; resource strip persists across the transition; only the middle and
bottom bands change).

## Layout

Three-band, within the between-scenario chrome pattern recorded by
`ui-shell-integration-spec.md`.

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back]   [resource strip — gold, jelly, ant count, …]         │
├─────────────────────────────────────────────────────────────────┤
│                          │  Items                                │
│                          │  ┌──────────────────────────────┐    │
│   The Grasshopper        │  │ ⚹  Item A             25 g  │    │
│   (illustrated           │  │ ⚹  Item B   ►          80 g │    │
│   figure, stationary,    │  │ ⚹  Item C            100 g  │    │
│   left third of the      │  │ ⚹  Item D            150 g  │    │
│   middle band)           │  │ ⚹  Item E            200 g  │    │
│                          │  │ ⚹  Item F    (muted, unaff.) │    │
│                          │  └──────────────────────────────┘    │
│                          │                                       │
│                          │  ┌─ Item B ─────────────── 80 g ──┐  │
│                          │  │  + 5 ATK, one ant unit          │  │
│                          │  │                       [ Buy ]    │  │
│                          │  └──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  <selected item's flavor line — one or two sentences>           │
└─────────────────────────────────────────────────────────────────┘
```

**Top band.** Shell chrome, identical to the Hill hub's top band plus the
Back affordance in the **top-left corner**. The resource strip carries
forward from the Hill (jelly, gold, ant count, and whatever else the
engine team confirms — the authoritative list lives with the engine team
per the hub spec's "Engine-team confirmations needed" section). Gold is
the only strip element the Shop reads or mutates; the others render
unchanged from the Hill state.

**Middle band.** Two-column. The Grasshopper figure occupies the left
~1/3, the catalog occupies the right ~2/3. The catalog is a single
scrollable item list with the selected-item detail card docked
immediately below it within the same column.

**Bottom band.** The selected item's **flavor line** — one or two
sentences of descriptive prose, not mechanics. When no item is selected
(a transient state during transitions only — see "First-item
pre-selection" below), the bottom band carries a passive default line.

(Per cube memo §D, visual-style finalization is deferred; the above is
build **direction**, not a visual specification.)

## Chrome elements

### Back affordance (top-left of top band)

A back-arrow icon or "Back" label, per the shell IA's chrome-band
affordance pattern. Destination is implicit: returns to the Hill. Same
position across all sub-views — the player learns it once.

### Resource strip (top band, right of the Back affordance)

Persistent across the hub. Surfaces the colony's current pocket-state.
**Gold** is the only element the Shop reads against (for affordability
gating) or mutates (on purchase). Other elements render passively,
identical to their Hill state.

The strip updates live: on successful purchase, gold decrements visibly
in this band with a subtle flash. No mode switch, no modal — the state
change is visible in the chrome where the player is already looking for
their balance.

## World elements

### The Grasshopper figure (left third of the middle band)

An illustrated figure of the Grasshopper, posed at his exchange counter
or stall. **Stationary in v1** — a single illustration, no animation, no
expression states. The figure reads as a present trader, not a
decoration. Lighting and staging carry the diegetic framing of the Hill
being a real place at ant scale (per the hub spec's "real place at ant
scale" treatment, referencing `miniscule1.png` and `miniscule2.png`).

**v2 / Phase D forward dep.** The figure is the surface where later
additions land — idle animation, blink/breath cycles, expression states
keyed to purchase events, dialogue bubbles when the writer agent specs
the Grasshopper's voice. The v1 illustration should be authored with
these forward additions in mind (rest pose, neutral expression, room for
a dialogue bubble above or beside the figure).

The figure is **not interactive**. Clicking the Grasshopper does nothing
in v1. Interaction is exclusively with the catalog and the chrome Back
affordance.

References (treatment direction, not visual specification):

- `ddshop.png` Darkest Dungeon Nomad Wagon — vendor positioned on the
  left side of the panel, occupying meaningful space as a present figure
  rather than a decoration.
- `bugslife.png`, `antz1.png` — actor character; the Grasshopper should
  read as a Grasshopper from posture and silhouette, in the same diegetic
  register as the hub spec's ant references.

## Voice

**Silent in v1.** The Grasshopper does not speak in v1. The detail card
carries the item's mechanical effect; the flavor line in the bottom band
is **descriptive prose**, not in-character dialogue — it describes the
item, not what the Grasshopper says about it.

Antonio does **not** speak at the Shop, consistent with the hub spec's
recording that Antonio's voice is reserved for the Briefing view and the
Tutorial dialogue overlay.

**Forward dep:** the Grasshopper himself is the eventual voice for trader
dialogue, when the Phase D writer agent specs it. The figure on screen is
the surface where that dialogue will attach (bubble above/beside, modal
pop-up, or another treatment to be decided at Phase D). The v1 spec
reserves the slot without specifying the dialogue.

## Behavior

### First-item pre-selection on load

When the player enters the Shop, the **first item in the catalog is
pre-selected** by default. The detail card and the flavor band render
their selected-item content immediately. The player sees a fully-
populated view on landing, not an empty state.

If the first item is unaffordable, it is still pre-selected. The detail
card surfaces it; the Buy button is in the disabled state (see
"Affordability gating" below). Pre-selection is a display rule, not an
affordability rule.

### Browse and select

Selection moves via keyboard (arrow keys + Enter) or pointer (click). The
selected row gets a clear visual indicator (a pointer or highlight in the
item-list column). Selection updates the detail card and the flavor band
in real time.

Scrolling: when the catalog overflows the visible list area, a scrollbar
or scroll indicator appears. The catalog's vertical position is preserved
within a session — if the player buys an item and returns to the same
row, they don't lose their place.

### Affordability gating

Items the player cannot afford with current `WorldState.gold` render in a
**muted state** — text dimmed, price still legible. Selecting an
unaffordable item still updates the detail card and flavor band so the
player can read what they're saving for, but the Buy button on the detail
card renders in a **disabled state** (visibly inert, no hover affordance,
click no-ops).

When the player's gold balance changes, affordability re-evaluates live
and items transition into or out of the muted state without requiring a
re-load.

### Stock and out-of-stock (target behavior + v1 reality)

**Target behavior (the design intent).** Items currently out of stock —
engine-side, where "stock" means the catalog's remaining count — **do not
appear in the catalog at all**. The list shows only items currently
available to buy. The engine elides entries from the catalog; the UI does
not render an "out of stock" row, a sold-out badge, or any other
indicator that an item is hidden.

Rationale: the gameplay direction is that items will tend to be either
**unique** (a one-off where stock=1 and the item disappears after
purchase) or **plentiful** (stock high enough that the player won't run
out at human pace). The middle ground — small counts where the player
needs to track "how many are left" — is deliberately not used, so a
stock-display affordance would be noise for most cases.

**v1 reality.** v1 ships stock as a **soft cap with no consumption
tracking**. The catalog schema carries a `stock` field per item, but
`buyItem` does **not** decrement it (confirmed in the shipped
`world-shop.ts`). Practical consequence: in v1, no item ever transitions
to out-of-stock, because nothing decrements toward zero. The "elide on
out-of-stock" behavior described above is the design target the UI is
built to handle, but v1 will never exercise it. The v1 stub content (100
of everything in `data/level-N/shop-catalog.json`) makes this concrete:
everything stays buyable indefinitely while the feature is shaken out.

**The gap is a forward dep.** Real stock consumption is required for
genuine unique items to function as intended. It lands when unique items
actually ship — see "Forward dependencies." Until then, the UI's elision
logic is dormant; the engine simply never hands it a depleted item.

The UI implementation should be written against the **target behavior**
(render whatever the catalog hands you; if an item isn't in the catalog,
it's not in the list), so when the engine gains real consumption
tracking, the UI requires no change.

### Buy

Buy is a single verb on the detail card. **No confirmation modal** — the
cost is visible, the item is selected, the click commits. The
decision-cost-of-mistake is low (the player either intended the purchase
or they didn't; v1 has no sell-back to reverse it, but the v1 stub
content of 100-of-everything plus no stock consumption means most
over-buys are inconsequential).

On successful Buy:

1. `WorldState.gold` decrements by the item's cost (engine).
2. One copy of the item is appended to `WorldRoster.inventory` — the
   counted, fungible pool of owned-but-unequipped items (engine; see
   "Engine binding" below).
3. The gold readout in the chrome resource strip updates visibly, with a
   subtle flash to draw the eye.
4. The Buy button cycles through a brief "Purchased ✓" pulse (~300ms) and
   returns to the ready state.
5. **Target behavior:** if the purchased item's stock hits zero, the
   engine elides it from the catalog; the row disappears and selection
   moves to the next available row (or the previous, if it was last).
   **v1 reality:** the row stays — stock isn't decremented — and the
   player can keep buying. UI handles the elision case correctly when the
   engine eventually surfaces it.
6. If the player can no longer afford any items in the catalog, selection
   still highlights the previously-selected row; all Buy buttons render
   disabled per the affordability rule.

On failed Buy (engine returns `ok: false` — should not happen via the UI
in normal flow, since the UI gates affordability before exposing the Buy
button, but defensive against race conditions or engine-side rules the UI
doesn't know about): no state change, brief error indication on the Buy
button (shake or red flash), no modal. The detail card refreshes against
current state, surfacing the operator's `error` string if useful.

### Exit

Click the Back affordance in the top-left corner of the top band.
Stylized fade or slide back to the Hill, same default treatment as the
entry transition. The resource strip persists across the transition
(matches the shell IA's chrome continuity rule). The Hill renders with
the player's updated gold; any items purchased are present in
`WorldRoster.inventory`, available for equipping in the Organize Army
sub-view via the `equipItem` operator (see "Inventory binding" and
"Engine binding" below).

## Inventory binding

The Shop's job ends at **"item is in inventory."** Purchased items land
in `WorldRoster.inventory`, a counted multiset of owned-but-unequipped
items (items are **fungible** — a "leather-pad" is a "leather-pad," not a
unique instance). Equipping happens in the Organize Army sub-view via the
`equipItem` operator: equip consumes one copy of `itemId` from inventory
and places it in the unit's slot; unequip (or equipping over a held item)
returns the prior item to inventory.

The Shop does not surface a "now equip this item" affordance, does not
preview stat deltas against a target unit, does not show the roster. This
is a clean separation by design: Shop owns "what enters the inventory";
Organize Army owns "what is equipped on which unit." The two sub-views
are connected by the shared `WorldRoster`, not by direct UI linking.

**Cross-cutting note for the Organize Army view.** The Organize Army
sub-view binds to the reworked, inventory-consuming `equipItem`. The
formal Organize Army spec (`ui-organize-army-subview-spec.md`) records the
equipping side; this spec records the inventory-filling side. The two are
ratified together (this revision + the Organize Army spec, same package).

## Engine binding

**Re-ratified against the shipped `world-shop.ts` rework (`dd75621`).**
The revision-2 sketch is replaced by the real signatures below.

**`buyItem` (shipped):**

```
buyItem(state, itemId, catalog, items) → ShopResult
  ShopResult = { state, ok, error?, purchasedItemId? }
```

- Looks up the catalog entry; rejects unknown `itemId`
  (`'… is not for sale here'`).
- Resolves the item template; rejects unknown template, and rejects a
  non-`persistent` item kind (`'… is not a persistent item'`).
- Rejects when `state.gold < entry.cost` (`'insufficient gold'`).
- On success: deducts `entry.cost` from `WorldState.gold` and appends one
  copy of `itemId` to `WorldRoster.inventory`. No target unit — the
  operator does not equip.
- The 4th argument `items` is the item templates / definitions (parallel
  to `recruitUnit`'s `templates` 4th arg). Catalog (3rd arg) is the
  per-level `ShopCatalogFile`.
- **Does not decrement `stock`** — v1 soft cap, no consumption (matches
  "Stock and out-of-stock").

**`WorldRoster.inventory` (shipped):**

- A counted list of owned-but-unequipped item ids (fungible).
- Optional / omitted-when-empty (`roster.inventory ?? []` throughout), so
  existing saves are byte-stable — no save-compat or gate-29 break.

**`equipItem` rework (shipped, in `world-organize.ts`):**

```
equipItem(roster, unitId, itemId | null) → OrganizeResult
```

- Consumes one copy of `itemId` from `WorldRoster.inventory`; rejects if
  the item is not present in inventory.
- Sets the unit's single slot to that item; a previously held item
  returns to inventory (swap). `null` unequips, returning the held item
  to inventory.
- 3-arg — no `templates` needed (it doesn't read templates).
- This was a behavior change to a shipped operator; the Organize Army
  client rebound against it in the same rework PR.

**Catalog file + schema (shipped):**

- Path: `data/level-N/shop-catalog.json` (note: `shop.json` is the legacy
  in-scenario shop, so the filename differs).
- Schema (`engine/schemas/shop-catalog.ts`): `version: 1`; `items: [{
  itemId, cost (int ≥ 0), stock: number | null }]`. `null` = uncapped; a
  number = soft cap (no consumption in v1).
- v1 stub content: 100 of everything in level-N catalog data. Per-scenario
  item assortment is the deferred design pass (same shape as the Recruit
  catalog's deferred per-level content).

## Fenced items (gameplay-review dependencies)

Per the brief, two gameplay-review items the hub spec originally flagged.
Both have been resolved in the hub spec at the end-of-Phase-D review;
recording here so future readers have the trail.

1. **Persistent-hub vs. `roadmap-tier-1.md` §6.4–§6.5 no-shop-schedule.**
   The hub spec records the resolution: persistent-hub is authoritative;
   the per-scenario L1/L5/L7/L10 "no shop" schedule is retired/superseded.
   The Shop sub-view is always reachable from the Hill in v1.
   **Agnosticism note:** if gameplay-review later reverses, the Shop
   view's layout and interactions do not change — the only thing that
   changes is whether the Shop verb-rail button is enabled at certain
   scenarios. No spec revision required.

2. **Recruit vs. Shop as distinct vs. unified systems (Marketplace
   model).** The hub spec records the resolution: distinct sub-views. The
   Anthill (Recruit) and Grasshopper (Shop) are two verb-rail entries, two
   sub-views, two catalogs. **Agnosticism note:** if gameplay-review later
   reverses to a unified Marketplace (the Symphony of War `n3.png` model),
   the Shop sub-view's internal layout collapses into one tab of a
   Marketplace view. The catalog UI, browse pattern, detail card, Buy
   flow, and inventory binding all carry forward unchanged into a tabbed
   container; only the chrome around them changes. No spec revision
   required at the inner layout level.

## Forward dependencies

### Within this spec (v1 → v2):

1. **Sell-back.** Queued for post-v1 amendment when engine support is
   confirmed. Most likely shape: a mode switch in the middle band (Buy /
   Sell verbs in a slim sub-tab above the catalog), with Sell rendering
   `WorldRoster.inventory` in place of the Shop catalog. Detail card and
   flavor band stay identical. (Was item 5 of the revision-2 "Engine-truth
   confirmations needed" section; moved here now that the rework has
   landed. Whether the reworked engine surface supports sell-back, and the
   operator shape, determines the amendment scope.)

2. **Real stock consumption (engine).** v1 ships stock as a soft cap with
   no consumption tracking. Real stock-consumption on purchase is the
   engine work that lands when genuine unique items actually ship in the
   gameplay-content pass. Until then, the UI's elision logic is dormant
   and the v1 stub content (100 of everything) ensures nothing depletes.
   UI requires no change when consumption lands.

3. **Grasshopper voice.** Deferred to Phase D writer agent. The v1 figure
   is the surface where dialogue attaches when specced. Shape (bubble,
   modal, side-panel) decided at Phase D.

4. **State-responsive Grasshopper.** Parallel to the hub spec's
   "state-responsive Hill scene" v2 forward dep. The Grasshopper might
   react to scenario events, player purchase history, or campaign state.
   v1 is flat.

### Cross-spec deps this spec creates or touches:

1. **`ui-organize-army-subview-spec.md` (ratified together).** The
   Organize Army sub-view binds the inventory-consuming `equipItem`. That
   spec inherits the inventory-binding model recorded here; this spec
   calls out the linkage without owning it. Both ratify in the same
   exchange.

2. **`ui-hill-hub-spec.md` (none expected).** The Shop is a verb-rail
   destination the hub spec already names. No amendment anticipated.

3. **`ui-shell-integration-spec.md` (none expected).** The Shop is built
   within the shell IA's between-scenario chrome pattern. No amendment
   anticipated.

4. **`mechanic-distribution-plan.md` / `roadmap-tier-1.md` (no edit).**
   Per-scenario item content is gameplay-content's call, downstream of
   this spec. The spec describes the UI that renders whatever the catalog
   data hands it.

## Quarantined / out of scope

- **Equipping.** Owned by the Organize Army sub-view via `equipItem`. The
  Shop ends at "item is in inventory."
- **Sell-back.** v2 / post-v1 amendment, scoped above.
- **Real stock consumption.** Forward dep when unique items actually ship,
  scoped above.
- **Trader dialogue.** Phase D writer agent territory, scoped above.
- **Per-scenario item content / inventory-refresh cadence.** Gameplay-
  content's call, not UX. The spec describes the rendering surface; the
  catalog data drives content.
- **Commander cards** (the future R14 expansion per
  `mechanic-distribution-plan.md` and Mechanics memo §1.3). Not v1 stock.
  When cards ship, they may surface in the Shop catalog as an additional
  item type, or in a separate sub-view — a forward-design call.
- **Visual chrome direction.** Same look-and-feel deferral as every
  recorded spec, per cube memo §D.
- **State-responsive Grasshopper figure.** v2 forward dep, scoped above.
- **Stock display.** Deliberately omitted per the unique-or-plentiful
  gameplay direction (stock exists engine-side but is never surfaced to
  the player).

## Cross-references

- `docs/ui-hill-hub-spec.md` — parent spec; Shop verb-rail entry point,
  the diegetic Anthill vs. Grasshopper distinction, the persistent-hub
  model, and the Hill scene where the Grasshopper is visible (resting)
  before the player visits.
- `docs/ui-shell-integration-spec.md` — between-scenario three-band
  chrome; sub-view back-to-Hill affordance pattern; stylized-transition
  default.
- `docs/ui-organize-army-subview-spec.md` — sibling; the equipping half of
  the inventory pipeline.
- `docs/troop-reference.md` §10 — operator-contract pattern the Shop binds
  to (parallel to the `recruitUnit` precedent recorded there).
- `docs/roadmap-tier-1.md` §6.5 (struck-through shop-schedule; provenance)
  and §7.10 (Recruit exchange precedent).
- `docs/change-request-protocol.md` Exchange #6 — Recruit exchange; the
  closest precedent for the Shop exchange.
- `docs/design-memo-ui-cube-view.md` §0 (cardinal rule), §B (chrome/world
  split), §D (visual-style deferred).
- `docs/mechanic-distribution-plan.md` — R14 items mechanic.

## Visual references (treatment direction, not specification)

For layout direction (Pattern C + A combination — vendor on left,
functional catalog on right):

- `ddshop.png` — Darkest Dungeon Nomad Wagon. Vendor position on the left
  side of the panel. Reference for the spatial posture only.
- `nshop.png` / `n3.png` — Symphony of War Trader. Reference for the
  functional catalog: list with prices, selected-item detail card, flavor
  description band below.
- `ctshopmain.png` — Chrono Trigger shop. Reference for the utilitarian
  catalog density and affordability gating.
- `ctshop.png` / `ctshopdetail.png` — Octopath Traveler shop. Reference
  for the "place visible behind chrome" diegetic treatment and the
  selected-item stat-preview pattern (though Octopath's against-target-unit
  preview is not adopted — the Shop view does not select a target unit).

All references are inputs to the structural call, not visual
specifications. Visual treatment is deferred per cube memo §D.
