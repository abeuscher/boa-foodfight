# Organize Army — UX Spec (Between-Scenario Sub-View)

**Intended location:** `docs/ui-organize-army-subview-spec.md`
**Status:** RECORDED — forward spec, not built. Ratified via
change-request Exchange #11 (dev-verified against shipped `main`).
Third and final member of the between-scenario sub-view
family (siblings: `ui-shop-subview-spec.md`, and the queued Recruit /
Anthill back-fill). Parents: `ui-hill-hub-spec.md` (verb-rail entry
point + diegetic framing) and `ui-shell-integration-spec.md` (the
between-scenario three-band chrome the sub-view operates within).

**Posture — target spec with an as-built baseline.** Unlike the Shop
spec (greenfield: spec drove the build), Organize Army shipped ahead of
any spec (coding-agent commits, ungated, merged to `main` via PR #41,
most recent state post-`dd75621`). This document is therefore _both_:

- a **target spec** for the two-layer architecture the user's visual
  references confirm (army overview + party detail; see "Two-layer
  architecture" below), which the client is to be reworked toward; and
- a **back-fill record** of what ships _today_ — a single composite
  Squads + Barracks view — captured in "As-built today (v0)" so the
  gap between shipped and target is explicit, not lost.

The engine bindings, constraints, and ratified mechanics in this spec
describe **live, shipped engine truth**. The layout/navigation model is
the **target** the as-built v0 is the first step toward.

**Naming note (post-migration):** the Shop spec's cross-refs call this
doc `ui-organize-army-spec.md`; this family uses the longer
`*-subview-spec.md` form (matching `ui-shop-subview-spec.md`). The
shorter name is an alias for the same document.

## Purpose

Organize Army is the between-scenario sub-view where the player
restructures the colony's standing forces between scenarios: form and
disband squads, move units between squads and the barracks, set a
unit's formation rank, swap a squad leader, equip items drawn from the
shop-filled inventory, and dismiss units from the roster. It is the
receiving end of the Shop→inventory→equip pipeline (`ui-shop-subview-spec.md`).

Diegetically it sits closest to the Anthill / staging-ground framing of
`ui-hill-hub-spec.md` (the colony's own forces, mustered on the Hill's
parade ground), distinct from the Grasshopper's at-arm's-length trade.

It is the third instance of the between-scenario sub-view pattern: full
`WorldState` access, persistent resource strip in the top chrome band,
back-to-Hill affordance in the chrome corner, stylized entry/exit
transitions. It reuses that family chrome rather than inventing.

## Position in flow

```
   Hill hub ─── click Organize Army on verb rail ───► Army overview (L1)
       ▲                                                   │   ▲
       │                                          click a  │   │ back
       └────────── click Back (chrome corner) ──────┐      ▼   │
                                                     │   Party detail (L2)
                                                     └───────┘
```

Entry: click Organize Army on the Hill verb rail → **army overview**.
Exit: the chrome-corner Back affordance from the army overview returns
to the Hill. Transitions use the shell IA's stylized default (200–400ms
fade or slide; resource strip persists; only middle and bottom bands
change).

**Within-sub-view back behavior (new pattern, recorded not amended).**
The party detail's Back affordance returns to the **army overview**, not
the Hill — a two-step back (detail → overview → Hill). The shell IA's
back-to-Hill rule was written assuming one-layer sub-views; this is an
_internal_ navigation detail of one sub-view, not a shell-level pattern
change, so it is recorded here without amending `ui-shell-integration-spec.md`.
The two layers are **siblings** within Organize Army, not a
shell-level parent/child; both render inside the between-scenario chrome
(resource strip persists; back affordance in the top-left corner).

## Two-layer architecture

The references confirm a clean responsibility split:

- **Layer 1 — Army overview** (`n2`, `ss`, `ss3`): every squad laid out
  in a grid, each card showing its unit composition in miniature.
  **Army-level** verbs in the right rail. Roster-count footer.
- **Layer 2 — Party detail** (`n1`): drill into one squad — diorama in
  formation, formation slot grid, squad stats, equipped items, leader
  trait callout. **Unit-level** verbs in the right rail.

The rule: army-level changes happen in the overview; unit-level changes
happen in detail. Final layer names are the design agent's call; "army
overview" and "party detail" are the working terms used throughout.

## Layer 1 — Army overview

**Layout.** Middle and bottom bands of the between-scenario three-band
chrome. Top-band resource strip persists; Back affordance in the
top-left chrome corner (Shop precedent).

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back]   [resource strip — gold, ant count, …]                 │
├──────────────────────────────────────────────┬──────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐             │  Army verbs      │
│  │ Squad  │ │ Squad  │ │ Squad  │             │  Form New Squad  │
│  │ (mini  │ │ (mini  │ │ (mini  │             │  Disband Squad   │
│  │ comp.) │ │ comp.) │ │ comp.) │             │  Reorder Squads  │
│  └────────┘ └────────┘ └────────┘             │  Dismiss Unit    │
│  ┌────────┐ ┌────────┐ ┌────────┐             │                  │
│  │  …     │ │  …     │ │  …     │             │                  │
│  └────────┘ └────────┘ └────────┘             │                  │
├──────────────────────────────────────────────┴──────────────────┤
│  Roster: <deployed + barracks> / <cap>                            │
└───────────────────────────────────────────────────────────────────┘
```

**Diegetic frame.** The references go abstract (parchment cards on a
wood panel) rather than rendering the Hill's staging ground through.
The spec calls it **abstract roster grid**, consistent with the
cube-memo §D look-and-feel deferral — the grid is a functional muster
panel, not a diorama of the parade ground (the diorama lives at L2).

**Party grid.** One card per squad, including the structural
queen-guard. Each card surfaces: squad name/id, leader (leader marker),
unit composition in miniature, slot usage (`used/cap`). Grid is
scrollable when squads overflow the visible area; vertical position is
preserved within a session. Density follows `n2` (up to a 3×3 page);
the queen-guard reads as a squad card like the others but carries its
structural constraints (see "Queen-pin").

**Right-rail army-level verbs.**

- **Form New Squad** — opens the barracks picker (see "Barracks");
  player picks members and a leader, a new squad is created, then the
  player can drill in to arrange it. Disabled if the barracks is empty
  or no leader-eligible unit is available.
- **Disband Squad** — disbands the selected squad; its units fall to the
  barracks (they stay in `roster.units`, in no assignment). The
  **queen-guard cannot be disbanded** (structural; engine rejects).
- **Reorder Squads** — display-order reordering of the grid. **Target
  verb; no engine operator exists today** — see "Forward dependencies."
- **Dismiss Unit** — opens a picker to permanently retire a unit from
  the roster. Callable against barracks units or squad members; the
  **queen cannot be dismissed** (loss-condition unit; engine rejects).

**Footer / status.** Total roster count against cap. Gold (and other
pocket-state) ride the persistent top strip. (See "Resource strip
caveat" — jelly has no between-scenario persisted source today.)

**Selection / hover.** The references differ (`ss3` expands a focused
party inline above the grid; `n2` is passive). The spec calls it:
**click selects/drills; hover is passive** (a highlight only, no inline
expansion). Inline-expand-on-hover is noted as a forward enhancement,
not v1, to keep the overview's interaction model simple and to avoid two
competing ways to see a squad's contents (the card already shows
composition; detail is one click away).

**Navigation.** Entry from the Hill verb rail; exit via chrome Back to
Hill; click a squad card → party detail (L2).

## Layer 2 — Party detail

**Layout.** Same shell chrome (resource strip persists; Back affordance
in the chrome corner). The Back affordance returns to the **army
overview**, not the Hill (two-step back; see "Position in flow").

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to overview]   [resource strip]                          │
├──────────────────────────────────────────┬──────────────────────┤
│   ┌─────────────────────────────┐  ┌────┐│  Unit verbs          │
│   │  squad diorama, in formation│  │slot ││  Move Unit (rank)    │
│   │  (front / back ranks;       │  │grid ││  Add Unit            │
│   │   leader pin)               │  └────┘│  Remove Unit          │
│   └─────────────────────────────┘        │  Equip / Unequip      │
│   ┌── stats ──────┐ ┌── equipped items ─┐ │  Swap Leader          │
│   │ Threat  Move  │ │ slot: <item>      │ │  Change Class (gated) │
│   │ Morale  Cap.  │ │ slot: <empty>     │ │  Dismiss Unit         │
│   └───────────────┘ └───────────────────┘ │                       │
├──────────────────────────────────────────┴──────────────────────┤
│  Leader trait callout                                             │
└───────────────────────────────────────────────────────────────────┘
```

**Party diorama.** The squad rendered in formation, front/back ranks
visible, leader pin per the shipped leader-marker convention. (`reserve`
units render outside the two visible ranks — a bench area; see
"Formation ranks.")

**Formation slot grid.** Surfaces formation positions; the affordance
for the **Move Unit** verb. Front rank max 3, back rank max 2 (engine
hard caps; `reserve` is unbounded). The mid-rank slot is **deliberately
absent** — held on the queen-rear spike (`'middle'` is intentionally not
a rank; see "Fenced items").

**Party stats panel.** Surfaces the ant-game equivalents of the
references' Threat / Move / Morale / Capacity. The shipped client
currently surfaces **per-unit effective stats** (hp / attack / armor via
`unitEffectiveStats`) and **slot usage** (`used/cap`); a squad-level
threat/morale aggregate is **not** in `WorldState` today. The spec
records the panel as surfacing whatever the engine exposes — per-unit
effective stats + slot usage now, with squad-aggregate readouts a
forward dep when the engine computes them. The spec does not invent a
threat formula (gameplay-content territory; see "Fenced items").

**Equipped items panel.** The receiving end of the
Shop→inventory→equip pipeline. Each unit carries a **single item slot**
(`WorldUnit.item`). Equip draws one copy of an item from
`WorldRoster.inventory`; unequip returns it to the pool; equipping over
a held item swaps the old one back to the pool. Bound to the reworked
`equipItem` (see "Engine binding").

**Right-rail unit-level verbs.**

- **Move Unit** — set a unit's formation rank (front / back / reserve),
  via the formation slot grid. Bound to `setUnitRank`. **Not level-gated**
  — see "Formation ranks (no L2 gate)."
- **Add Unit** — opens the barracks picker to fill an open slot in this
  squad (bound to `moveUnit` into this party).
- **Remove Unit** — sends a unit to the barracks (bound to `removeUnit`).
- **Equip / Unequip** — bound to `equipItem` (see above).
- **Swap Leader** — promote a leader-eligible member to leader (bound to
  `swapLeader`).
- **Change Class** — surface only if/when the as-built client carries it.
  **Not present in the shipped client today.** Gated by the mechanic
  distribution plan; the spec records the surface, not the rules (see
  "Fenced items").
- **Dismiss Unit** — permanently retire a unit (bound to `dismissUnit`).

## Barracks (persistent surface + flows)

**The barracks is a real, persistent surface — not flow-only.** Engine
truth: `barracksUnits(roster)` is a _derived view_ — `roster.units`
minus every unit referenced by an assignment; there is **no separate
barracks collection** on `WorldRoster`. Ratified via Exchange #4
(barracks / unassigned-units pool). It is Disband's destination and Form
New Squad / Add Unit's source.

The shipped client renders the barracks as a permanent column (see
"As-built today"). In the target two-layer model the barracks surfaces
as **both**:

- a roster context the overview can show (the count, and — forward — a
  browsable bucket), and
- the **shared barracks-picker** the flows invoke.

**The barracks-picker is one shared component, reused across flows:**

- **Form New Squad** (overview): pick members + a leader from the
  barracks; a new squad is created (`createParty`), then the player can
  drill in to arrange it.
- **Add Unit** (detail): pick one barracks unit to fill an open slot
  (`moveUnit` into the current party).
- **Dismiss Unit** (overview, and available in detail): pick a unit to
  retire (`dismissUnit`). Not limited to barracks units — the engine
  dismisses squad members too (auto-detaches first).

Speccing the picker once keeps the barracks from quietly demanding
view-status as flows accumulate. **No dedicated barracks "view" is
needed** — confirmed against the as-built: the barracks is a column /
picker, never its own navigable surface. If a future barracks picker
grows filtering/sorting/inspection heavy enough to merit view-status,
that's a forward design call against that future reality.

## Cross-layer concerns

### Formation ranks (no L2 gate)

The three-rank model — **front / back / reserve** — is ratified and
shipped **ungated** via Exchange #5 (player-mutable formation + three-rank
restructure). `setUnitRank` enforces front ≤ 3, back ≤ 2, reserve
unbounded, and applies the queen-pin (queen cannot be ranked off front);
it carries **no campaign-level gate**. The mechanic distribution plan
confirms no formation-template / standing-order mechanic is scheduled
anywhere in Tier 1.

**This corrects the session brief**, which framed formation-rank editing
as debuting at L2. There is no L2 gate — not in the engine operator, not
in the catalog data, not in the UI. The Move Unit verb is available
whenever a unit is in a squad. (`'middle'` rank remains reserved on the
queen-rear spike and is not surfaced.)

### Equipment binding

Equip consumes one copy of `itemId` from `WorldRoster.inventory` and
places it in the unit's single slot; unequip (or equipping over a held
item) returns the prior item to inventory. This spec records the
equipping side; `ui-shop-subview-spec.md` records the inventory-filling
side. The two sub-views connect only through the shared `WorldRoster`.

### Slot capacity (9 / 12, canon)

Squad capacity is a **slot-cost-weighted cap**, not a flat unit count:
**9 for a standard squad, 12 for the queen-guard** (`PARTY_SLOT_CAP` /
`QUEEN_GUARD_SLOT_CAP`, via `slotCapForParty`). Each unit's `slotCost`
(from its template) consumes against the cap. The UI respects the cap:
Form New Squad / Add Unit / Move Unit are rejected by the engine when
they would exceed it, and the UI surfaces the rejection reason.

**Provenance note:** an earlier design carried a flat "party-cap-8."
That was superseded by **Exchange #1** (standard slot capacity 8 → 9, so
the overview renders a legible 3×3 grid; queen-guard stays 12). **9 / 12
slot-cost-weighted is canon**; "party-cap-8" is retired and is not
relitigated here.

### Queen-pin

A unit whose template carries the `queen` tag is structurally bound: it
cannot be moved out of the queen-guard, cannot be dismissed, and cannot
be ranked off the front. The queen-guard party itself cannot be
disbanded. The UI surfaces these as disabled/rejected verbs on the queen
and the queen-guard card. (Engine: `world-organize.ts`, queen-pin §7.7.)

## Engine binding

All operators are pure `WorldRoster → OrganizeResult` (or
`WorldState`-level for reads), returning `{ roster, ok, error? }`; on
failure the input roster is returned unchanged with a surfaceable
`error`. They live in `engine/world-organize.ts` (between-scenario
world-loop layer; engine-freeze boundary per roadmap §7.6 — never runs
inside `runScenario`, no gate-29 involvement). Signatures **as shipped**:

```
createParty(roster, partyId, unitIds, leaderId, templates) → OrganizeResult
moveUnit(roster, unitId, toPartyId, templates)             → OrganizeResult
swapLeader(roster, partyId, newLeaderId, templates)        → OrganizeResult
disbandParty(roster, partyId)                              → OrganizeResult
setUnitRank(roster, unitId, rank, templates)               → OrganizeResult   // rank: 'front'|'back'|'reserve'
removeUnit(roster, unitId, templates)                      → OrganizeResult
dismissUnit(roster, unitId, templates)                     → OrganizeResult
equipItem(roster, unitId, itemId | null)                   → OrganizeResult   // inventory-consuming; no templates arg

// read accessors
partySlotUsage(roster, partyId, templates) → { used, cap, free }
unitEffectiveStats(unit, templates)        → Stats | undefined
barracksUnits(roster)                      → readonly WorldUnit[]   // derived; no separate collection
```

Notes binding the surface to truth:

- **`equipItem` is 3-arg** (`roster, unitId, itemId|null`) — it draws
  from `WorldRoster.inventory`, so it needs no `templates`. This is the
  reworked, inventory-consuming shape from `dd75621`; it replaced the
  pre-rework "assign item directly" form. The Shop spec's
  inventory-binding section is the matching half.
- **`moveUnit` is "add to existing party"**; **`createParty`** forms a
  new one. There is no separate `addUnit` operator — Add Unit binds to
  `moveUnit`.
- **No `reorderParties` operator exists.** Reorder Squads is a target
  verb with no engine binding yet (display-order only when built; forward
  dep).
- **`setUnitRank`** records a _sparse_ formation override; ranks the
  player never set are auto-assigned by `world-inject` at staging.
- Templates flow in from the client fixture (`TEMPLATES`) so cost,
  leader-eligibility, queen tag, and slot cost are catalog-authoritative.
- Operator contracts live in `docs/troop-reference.md` §10.

## As-built today (v0 — the composite view)

What ships on `main` (`client/src/organize/OrganizeArmy.tsx`,
post-`dd75621`) is **a single composite, two-column view**, not the
two-layer model above:

- **Left column "Squads":** every squad listed at once, each with its
  units inline. Per-unit controls inline on every row: Make leader
  (`swapLeader`), front/back/reserve rank buttons (`setUnitRank`), an
  item `<select>` driven by `inventoryEntries` (`equipItem`), → barracks
  (`removeUnit`), Dismiss (`dismissUnit`). Per-squad: slot usage,
  Disband (`disbandParty`).
- **Right column "Barracks":** the derived unassigned pool, with
  per-unit checkbox-select, a "move to…" squad dropdown (`moveUnit`), and
  Dismiss. A "Form new squad" sub-panel takes a new id + the checked
  units + a leader pick (`createParty`).

So today: no drill-in, no navigation, no diorama, no formation slot
grid, no squad-stats panel, no leader-trait callout, no Reorder Squads,
no Change Class. The barracks is a persistent column (consistent with
the target's "barracks is a real surface"); ranks are ungated
(consistent with "no L2 gate"); equip is inventory-consuming (consistent
with the binding). The composite view is a faithful **v0** — the engine
surface is right; the layout is pre-two-layer.

**Gap to target (the rework this spec greenlights for the client track):**
split the composite into army overview (L1) + party detail (L2) with
drill-in navigation; add the diorama, formation slot grid, squad-stats
and leader-trait surfaces at L2; route Form New Squad / Add Unit /
Dismiss through the shared barracks-picker; add Reorder Squads (pending
its operator) and Change Class (pending the mechanic). No engine change
is required for the split itself — it re-presents existing operators.

## Resource strip caveat

`antCount` is available (total `roster.units.length`, deployed +
barracks) and gold rides the strip from `WorldState.gold`. **Jelly has
no between-scenario persisted source in `WorldState` today**, so the
strip omits it until the engine persists it (forward dep, noted in the
shared view helpers).

## Fenced items (do not relitigate)

1. **Per-unit progression (xp / leveling / class-change).** Gameplay-
   content, not UX. The spec describes the surface that renders a unit's
   level/xp/class _when those exist in `WorldState`_; it does not specify
   rules. Change Class is recorded as a surface, not a mechanic; timing
   and gating live in the mechanic distribution plan. (Not in the shipped
   client today.)
2. **Slot capacity 9 / 12.** Canon (Exchange #1). Recorded as a UI
   constraint; not relitigated. "Party-cap-8" is retired.
3. **Formation slots beyond front/back.** The mid-rank (`'middle'`) is
   reserved on the queen-rear spike. The spec describes the front/back/
   reserve model that ships; mid-rank is a forward dep.
4. **Save / load in OA.** Save touchpoints are a shell-IA forward dep.
   The OA spec introduces no save behavior; the shipped client has none
   inside OA. Defers to the eventual save-system spec.

## Forward dependencies

1. **`reorderParties` operator.** Reorder Squads (overview verb) has no
   engine binding today. Display-order persistence + the operator are the
   engine work when the verb ships.
2. **Squad-aggregate stats** (threat / morale equivalents). Not in
   `WorldState`; the L2 stats panel surfaces per-unit effective stats +
   slot usage until the engine computes aggregates.
3. **Change Class surface + mechanic.** Deferred to the mechanic
   distribution plan; surface lands when the mechanic does.
4. **Inline-expand-on-hover** at L1 (the `ss3` pattern). Forward
   enhancement; v1 hover is passive.
5. **Jelly in the resource strip.** Pending an engine-persisted source.
6. **Barracks carry-forward across scenarios.** `extractWorldRoster`
   rebuilds from combat survivors only; carrying an undeployed unit
   across a scenario boundary needs the extract/runner carry-forward
   merge (roadmap §7.8 follow-on).
7. **Mid-rank formation slot.** Forward dep when it lands in Tier-1
   progression.

## Cross-references

- `docs/ui-hill-hub-spec.md` — parent; Organize Army verb-rail entry,
  staging-ground diegetic framing.
- `docs/ui-shell-integration-spec.md` — between-scenario three-band
  chrome, back-to-Hill affordance, stylized transitions. This spec's
  detail→overview back behavior is recorded here, not amended there.
- `docs/ui-shop-subview-spec.md` — sibling; the inventory-filling half of
  the equip pipeline.
- `docs/ui-party-detail-spec.md` — the in-scenario read-only party
  inspection view. Distinct surface from this sub-view's L2 (that one is
  reached from the main screen and is read-only this pass); naming
  overlap is incidental. Worth aligning visual treatment when both build.
- `docs/troop-reference.md` §10 — operator contracts the OA spec binds to.
- `docs/roadmap-tier-1.md` §6.5 (provenance; shop-schedule superseded),
  §7.5–§7.9 (slot cap, engine-freeze boundary, three-rank formation),
  §7.10 (Recruit precedent).
- `docs/mechanic-distribution-plan.md` — confirms no Tier-1 formation/
  standing-order gate; Change Class scheduling.
- `docs/change-request-protocol.md` — Exchange #1 (slot cap 8→9),
  Exchange #4 (barracks pool), Exchange #5 (three-rank formation),
  Exchange #6 (Recruit precedent).
- `docs/design-memo-ui-cube-view.md` §0, §B, §D.

## Visual references (treatment direction, not specification)

- **`n2.png`** Symphony of War squad list — primary for L1 (army
  overview): 3×3 squad grid, mini-composition cards, army-level
  right-rail verbs, footer roster counter ("Army: 156/250").
- **`n1.png`** Symphony of War squad detail — primary for L2 (party
  detail): diorama in formation, formation slot grid (top-right), stats
  panel (Threat / Move / Morale / Capacity), equipped-artifacts panel,
  leader-trait callout, unit-level right-rail verbs.
- **`ss.png`** Ogre Battle party grid — secondary for L1: lower-density
  grid with an idle-unit reservoir on the right (informs barracks-as-
  surface; the spec keeps barracks as picker/column rather than an
  always-visible reservoir).
- **`ss3.png`** Ogre Battle focused party — the L1 selection state: a
  focused party expanded inline with cost/move-type. The spec keeps v1
  hover passive and notes inline-expand as a forward enhancement.
- `ddchardetail.png` (Darkest Dungeon) — direction for a future per-unit
  inspection card if L2 ever drills below the squad to a single unit.

All references are inputs to the structural call. Visual treatment is
deferred per cube memo §D.
