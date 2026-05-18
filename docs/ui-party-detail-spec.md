# Party detail spec — inspection view

**RECORDED — forward spec, not built. Companion to the main screen
spec and the battle mode spec; recording status mirrors theirs.** The
party detail view UI does not exist; this document specifies what it
should be when built.

This spec covers the party detail / inspection view: the view the
player opens when they want to know more about one of their parties
than the main screen's left-rail card and hover tooltip show.

This view is **read-only in this pass.** Editing affordances
(re-arrange formation, swap leader, move units between parties) are
out of scope for this pass but are explicitly _not_ out of scope for
the game — the layout is designed to accommodate them when they go
through gameplay review. See "Forward room for editing" below.

## Purpose

The party detail view does three jobs:

1. **Show the whole party** — formation preview with all units in
   their actual rank positions, party-level stats, leader, current
   state.
2. **Allow drill-down to individual units** — click a unit in the
   formation to surface that unit's specifics (HP, role, abilities,
   any conditions). The drill-down lives inside the same view, not
   in a separate screen.
3. **Show the current order** — destination, current activity (idle,
   moving, holding, in combat, captured, fallen), and a text face
   indicator so the player can see where the party is on the cube.

Drill-down to a single unit is the deepest inspection level in this
pass. There is no per-unit edit, no per-unit history, no per-unit
loadout management — those are gameplay-review items.

## How the view opens

**Layout pattern: side panel that slides in over the right rail.**

- The right rail's contextual actions are temporarily replaced by the
  party detail panel.
- The cube view (active face + peripheral faces) stays visible to
  the player's left, retaining spatial context. The player can still
  see where the party they're inspecting is on the world.
- The HUD pod (bottom-left) stays visible. Speed controls, queen
  status, and scenario name remain available.
- The left rail (party roster) stays visible. The inspected party's
  card is highlighted; clicking another card switches the detail
  view to that party without closing the panel.

Closing the panel returns the right rail to its contextual action
list and restores the previous selection state.

Opening sources:

- **Right-rail "Inspect" action** on a selected party (main screen).
- **Click on a unit** in battle mode's combat panel — opens the
  detail view scoped to that unit's party, with the clicked unit
  pre-selected for drill-down. Per battle mode spec open question
  #5, this pauses the combat animation; closing the detail view
  resumes combat from where it was.

## Look-and-feel direction

Per the chrome/world split established in the prior specs, the party
detail panel is **chrome**, not world. It is an inspection surface,
not a place. Framed panel, modern strategy-game language, mouse-
friendly. Nephilim Saga's n1 (squad detail with formation preview
on a battle backdrop) is the reference for the _structural pattern_;
we apply our chrome language to it rather than borrowing the
backdrop directly.

The formation preview inside the panel has a small backdrop hinting
at the party's current location's surface and lighting (so a party
in the kitchen reads warmer than a party in the bathroom). This is
a small concession to world feel inside an otherwise-chrome view —
enough that the player feels grounded, not so much that the panel
competes with the cube view for attention.

(Per cube memo §D, visual-style finalization is deferred; the above
is build **direction**, not a visual specification.)

## Layout

```
┌────────────────────────────────────────────────┐
│  [party name banner]                  [close]  │
│                                                │
│  [formation preview]                           │
│  units in rank, on a small backdrop            │
│                                                │
│  [party-level stats]    [current order panel]  │
│                          activity + face name  │
│  ─────────────────────────────────────────     │
│                                                │
│  [unit drill-down]                             │
│  (when a unit is selected in the formation)    │
│                                                │
│  [future-editing region — reserved]            │
└────────────────────────────────────────────────┘
```

The panel is sized to fit the right side of the screen, replacing
the contextual action list. Vertical scrolling within the panel is
acceptable if content exceeds the height; horizontal scrolling is
not.

## What's on screen

### Party name banner (top)

- **Party name** ("Vanguard," "Scout patrol," etc.) — prominent.
- **Leader name** — secondary line.
- **One-word status** — same vocabulary as the left-rail card
  ("idle," "moving," "in combat," "holding," "captured," "fallen").
- **Close button** — small X in the top-right of the panel.

### Formation preview

The party shown in its actual rank configuration on a small backdrop
hinting at the party's current location's surface.

Per unit:

- **Unit sprite** at a size where the player can distinguish role
  visually (Footman vs. Mage vs. Scout silhouettes).
- **HP meter** under the unit.
- **Small name label.**
- **Selection state** — hover highlights the unit; click selects her
  for drill-down (populates the unit drill-down region below).
- **Alive/down state** — same convention as battle mode (downed
  units shown collapsed in their rank position, greyed-out, not
  removed).
- **Leader marker** — the leader of the party is visually
  distinguished, same treatment as in battle mode (the open question
  on which exact treatment is shared across the two specs).

Formation is read-only in this pass. Units are individually
clickable for drill-down. The interaction model is structured so
that adding drag-to-rearrange in the future does not require
re-laying-out the panel — units are individually-targeted elements
already.

### Party-level stats panel

Compact summary of party-level information:

- **Composition summary** — counts and roles in shorthand ("3
  Footmen, 2 Mages, 1 Scout"). Redundant with the formation preview
  visually, but provides the textual readout.
- **Party-level modifiers active** — any persistent buffs/effects on
  the party as a whole. Same vocabulary as battle mode's matchup
  context: terrain/defensive bonus (if currently on a tile with
  one), post-occupation offset (if holding a POST), card offset (if
  active), level bonus, plane-affinity, scenario-specific combat
  modifier. Modifiers shown only when applicable; empty list shows
  "No active modifiers."
- **Leader traits or party traits** if any are present and engine-
  surfaced.

This is the same modifier surface as battle mode's matchup context,
deliberately. The player who learned to read it in combat can read
it here. Consistency is the point.

### Current order panel

- **Current activity** — one-line summary ("Moving to Towel Rack,"
  "Holding at Soap Dish," "In combat near Drain," "Idle on East
  Wall").
- **Destination** (if moving) — the tile name.
- **Face indicator** — text-only, naming the face the party is
  currently on (e.g., "North Wall"). Helps the player orient when
  the cube view is showing a different face. Text only, not a map
  thumbnail — per cube memo §A.4, the cube is the map; a thumbnail
  would introduce a second mental model.

The current order panel does not allow editing the order. Re-issuing
or clearing happens on the main screen (close the panel, use the
right-rail actions). This is intentional — the detail view is for
inspection; order management lives where orders are normally issued.

### Unit drill-down region

Appears when a unit in the formation is selected. Empty (or shows a
"select a unit to inspect" placeholder) when no unit is selected.

Per selected unit:

- **Unit name and role** — prominent header.
- **HP** — current / max, plus the same visual meter as in the
  formation.
- **Role-level abilities** — list of the unit's abilities as engine-
  surfaced. The source is the unit's template `abilities` list
  (`units.json`), resolved against `abilities.json` definitions via
  `engine/abilities.ts`. The panel does not invent abilities. (Note:
  `engine/battle-abilities.ts` is the combo resolver, not the
  per-unit ability registry — not the source here.)
- **Ability values shown must be scenario-resolved.** Per §4g, a
  unit's ability parameters (e.g., hypnotize/recruit magnitudes) are
  the static `abilities.json` values _unless_ the scenario sets
  `abilityParamsAuthoritative: true` (currently L8 only), in which
  case the scenario's resolved values apply. The drill-down shows
  the engine-resolved values for the current scenario — whichever
  source the engine actually uses — not the raw file values.
  Otherwise the panel would mislead the player by showing magnitudes
  the engine ignores.
- **Status conditions** if any — buffs, debuffs, captured state,
  any per-unit modifiers the engine surfaces.
- **Position in formation** — "front row, left" / "back row, right"
  — text confirmation of what the formation preview shows visually.

Drill-down is one unit at a time. Selecting a different unit replaces
the content. Closing the panel deselects the unit.

## Forward room for editing

This view is read-only in this pass, but the game's future is not
read-only. The layout is designed so editing affordances can be
added without restructuring. Specifically:

- **The unit drill-down region** has reserved vertical space below
  its current content for per-unit edit verbs (e.g., a "Move to back
  row" or "Make leader" action list, the same Nephilim-style
  vertical text-button pattern used elsewhere).
- **The formation preview's interaction model** treats each unit as
  an individually-targeted element. Adding drag-to-rearrange means
  adding drag handlers to elements that already exist as click
  targets — no layout change required.
- **A reserved region at the bottom of the panel** ("future-editing
  region — reserved" in the layout sketch) holds space for party-
  level edit verbs (e.g., "Disband party," "Reorder roster," "Move
  unit between parties") when they become live. In this pass the
  region is empty or shows a single small "More actions coming
  soon" placeholder — exact treatment for the build to decide,
  but the space is held.
- **The current order panel** has space for an "Edit order from
  here" affordance that would shortcut the close-panel-and-use-
  right-rail flow. Not present in this pass; the space is held.

Each of these future verbs is a §0 gameplay-review item — the UX is
ready to receive them; the rules around them aren't decided yet.
None require relayout.

## States

The panel has a small number of states:

1. **Closed.** Default. Right rail shows contextual actions.
2. **Open, no unit selected.** Panel shows party name, formation
   preview, party-level stats, current order. Unit drill-down region
   is empty or shows the placeholder.
3. **Open, unit selected.** As above, with drill-down region
   populated for the selected unit.
4. **Open, switching party.** Player clicked a different party card
   in the left rail while the panel was open. Panel content updates
   to the new party; unit selection is cleared.
5. **Opened from battle mode.** Panel scoped to a battle participant
   party, with the clicked unit pre-selected. Combat animation
   paused. Closing returns to combat at where it was.

## Interactions

| Action                                             | Result                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Click "Inspect" in right rail (main screen)        | Open panel for selected party, no unit selected                               |
| Click unit in battle mode combat panel             | Open panel scoped to that unit's party, that unit pre-selected, combat paused |
| Click unit in formation preview                    | Select that unit for drill-down                                               |
| Click another party card in left rail (panel open) | Switch panel content to new party, clear unit selection                       |
| Click close (X)                                    | Close panel, restore right rail and previous selection                        |
| Click outside panel on cube view                   | Does not close panel (cube view interactions remain available)                |

The panel is non-modal in the sense that the player can still
interact with the cube view (rotate faces, click parties on faces,
hover tiles) while it's open. Most of those interactions just change
the selection underneath the panel; the panel doesn't fight for
input.

## Out of scope for this view

**For this pass:**

- **Editing affordances of any kind** — formation rearrangement,
  leader swap, unit movement between parties, unit dismissal. Layout
  is ready for them; the verbs are not.
- **Per-unit historical data** — XP curves, kill counts, narrative
  history.
- **Equipment / loadout management** — no such mechanic in current
  canon. If proposed, gameplay-review item.
- **Cross-party comparison** — single-party view only.

**Permanently or until canon changes:**

- **Targeting / order-issuing from within this view.** Orders are
  issued on the main screen.
- **Combat resolution from within this view.** Combat happens via
  movement collision; this view does not let the player initiate
  combat.

## Forward dependencies (not silent gaps)

- **Engine-surfaced ability/condition lists.** The drill-down's
  abilities content is the unit's template `abilities` list
  (`units.json`) resolved via `engine/abilities.ts` — **not**
  `engine/battle-abilities.ts` (that is the combo resolver, not the
  per-unit ability registry). Ability _values_ are the
  scenario-resolved values per §4g (honoring
  `abilityParamsAuthoritative`), not the raw file values. Status
  conditions are whatever the engine's per-unit state reports. The
  panel does not invent; if the engine reports nothing, the panel
  shows nothing.
- **Editable verbs (party and unit level).** Each is a §0 gameplay-
  review item. Layout holds space for them; this spec does not
  enumerate them. When they become live, this spec is amended to
  cover them.
- **Leader marker treatment.** Same open question as battle mode —
  small marker, scale bump, or icon overlay. Decision should be
  consistent across the two specs (to be resolved once in a shared
  UI-conventions home, not re-decided per spec).

## Open questions

1. **Does opening party detail from battle mode pre-select the
   clicked unit?** Recommend yes — the player clicked the unit
   specifically. The spec assumes yes.

2. **When the panel is open and the player issues a re-order from
   the main screen** (close panel, click Move on the party in the
   left rail), does the panel auto-reopen after the order is placed?
   Recommend no — the player closed it for a reason; auto-reopening
   is presumptuous. Closing is closing.

3. **Behavior when the inspected party is destroyed mid-inspection.**
   E.g., the player is reading the panel and the party falls in
   combat that resolves in the same turn. Recommend the panel
   updates to show the fallen state (greyed formation, "fallen"
   status), with a brief notification on the strip. Closing returns
   to a deselected state since there's no party to re-select.

4. **Placeholder copy for the reserved future-editing region.** "More
   actions coming soon" is one option; an empty space is another;
   a subtle visual cue (a dashed outline saying "reserved") is a
   third. Recommend empty space for first build — no copy debt for
   features that don't exist yet.
