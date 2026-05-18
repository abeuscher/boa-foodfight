# Main screen spec — cube view

**Status:** RECORDED — authoritative per-view UI spec, the first of the
per-view set. Synthesized through review against engine reality + the
recorded canon (cube-view memo §A–§D, pacing memo, playability
rubric, level-progression-plan §4c–§4g). Companion to
`docs/design-memo-ui-cube-view.md`. **Forward spec** — the cube-view
interface is not built; this describes what to build when the UI
phase begins, not active behavior today.

**Supersession note.** This spec supersedes UI memo §A.4 in one
respect: the pending-order Confirm/Clear panel in the right rail is
removed. The destination-click is the confirm. See "Right rail" and
"Order lifecycle" below. `docs/design-memo-ui-cube-view.md` §A.4
carries a reciprocal reconciliation note pointing here.

## Layout overview

The screen divides into three vertical zones, with two persistent
corner overlays.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [left rail]      [cube view: active face + 4 splayed]   [right │
│  party roster                                            rail]   │
│                                                          actions │
│                                                                  │
│                                                                  │
│  [HUD pod]                                  [notification strip] │
└──────────────────────────────────────────────────────────────────┘
```

- **Left rail** — party roster. Always visible. Cards for each of the
  player's parties.
- **Center** — the cube view itself. Active face head-on, four
  peripheral faces splayed around it. Dominates the screen.
- **Right rail** — contextual action list. Always visible but its
  contents change with selection state.
- **Bottom-left HUD pod** — persistent game-state pod. Corner-anchored,
  doesn't move.
- **Bottom-right notification strip** — transient banner for auto-pause
  causes, scenario milestones, objective updates.

A hover tooltip floats near the cursor when hovering tiles, parties,
or POSTs. It is not a region — it appears and disappears.

The center cube view is where the bug-movie look-and-feel lives. The
rails, HUD, and notification strip are chrome and follow the strategy-
game language.

## Look-and-feel direction

**Chrome (rails, HUD, notification strip, tooltips, right-rail
actions).** Modern, framed, mouse-friendly. Panels are bordered, not
naked floating text. Themed but not retro — closer to Nephilim Saga
than to SNES Ogre Battle. Type is legible at hit-target scale. Action
buttons are clear and obvious.

**World (active face, peripheral faces).** Cinematic miniature. The
room is rendered as an actual place at ant scale — bathroom tile as a
porcelain landscape, kitchen as a countertop with crumbs and grout,
hallway as carpet with baseboards as cliffs. Mundane room objects
(soap dish, towel, drain cover, toaster, doormat) are the dominant
landmarks on each tile, drawn large and characterful. Lighting carries
the room's mood — bathroom cool fluorescent, kitchen warm amber,
hallway mid-light, garage dim utility. The parties are characterful
ant silhouettes at small scale, readable as ants from posture and
shape, not as abstract circles. Minuscule is the reference for the
room; A Bug's Life and Antz are the reference for the actors.

Chrome and world share a color palette base and complementary
typography so they feel like one game, but they do different jobs:
chrome stays out of the way, world is the place.

(Per cube memo §D, visual-style finalization is deferred; the above
is build **direction**, not a visual specification.)

## Regions

### Active face (center)

The face the player is currently looking at head-on. Top-down view
into the room from that face's perspective.

What's on it:

- The room rendered as a place (see look-and-feel above), not a grid.
  Subtle tile boundaries visible enough to support click targeting but
  not dominating the visual.
- **Parties** — both the player's and visible enemies — rendered as
  small actor sprites at room scale. Each party has a name label that
  appears on hover and stays visible when the party is selected.
- **POSTs** — capturable objects, rendered as their physical referent
  (a drain cover, a power outlet, a particular floor object — whatever
  the scenario specifies). Capture state shown by a colored ring or
  glow at the base of the object, reflecting the engine's round-17
  capture mechanic: neutral, ant-held, spider-held, and a capturing
  state during the 2-turn sole-occupancy hold. The capturing state
  is shown as a discrete affordance with a small turn-counter pip
  (e.g., "1/2") rather than a smooth continuous fill — co-located
  parties pause progress, which the counter can hold steady to show.
- **The queen** (when on this face) — distinct from other parties,
  larger or more prominent silhouette, with a clear visual mark that
  she's the queen.
- **Destination markers** — diegetic objects placed at a destination
  tile when a party has been given a move order. A flag, a paw-print,
  a glowing tile — exact form TBD, but it's a thing in the world, not
  a text label off in a rail. The marker is visible whenever the
  party has an active order, not only while she's being commanded.
- **Selection highlight** — the currently selected party gets a soft
  glow or ring at her feet. If she has an active order, her
  destination marker is also highlighted (a brighter version of the
  default marker) so the player can see the existing order at a
  glance.

What's not on it:

- No path preview between origin and destination (memo §A.3 — locked).
- No valid-destination tile glow. The engine has no per-turn movement
  range; every non-obstacle tile is a legal destination, and a
  "validity" overlay would either be trivial or imply a reachability
  computation §A.3 forecloses. The destination-picker cursor itself
  is the affordance — it changes to indicate "click here to place
  marker" when over a legal tile, and to a forbidden cursor over
  obstacles.
- No range overlays, no movement cones.
- No floating stat readouts on parties (those live in tooltip / right
  rail / party detail).

### Peripheral faces (4 splayed)

The four faces adjacent to the active face, splayed outward in
perspective around the active face.

What's on them:

- Same room rendering at smaller scale and reduced detail. The player
  should be able to tell at a glance which face is which (bathroom
  north wall vs. east wall) from the landmarks visible.
- Parties visible at small scale — ant-sized silhouettes with team
  color. No labels.
- POSTs visible at small scale with their capture-state glow.
- Destination markers on a peripheral face are visible at small
  scale (so the player can see "her destination is over there").
- A clickable affordance — when the player hovers a peripheral face,
  its frame lights up and a "click to face" hint appears at the bottom
  edge of that face.

Peripheral faces are _previews_ and _navigation targets_. They are
not order-issuing targets. Per the cube memo §A.3 and the interactions
table below, orders are issued only by clicking a destination on the
active face; to order to a tile on another face, the player rotates
the cube first by clicking that face. This is the deliberate-rotation
model.

When a selected party's destination is on a different face from the
one currently active, the gutter between the active face and the
relevant peripheral face shows a small directional hint (a chevron or
arrow at the seam). This is the §A.3 cross-plane hint, not a path
preview — it indicates direction only.

### Left rail — party roster

Always visible. Stacked party cards from top to bottom, one per
player party currently on the map.

Each card contains:

- **Party name** (e.g., "Vanguard," "Scout patrol," "Queen's Guard").
- **A small formation sprite** — the party shown in front/back row
  configuration as small icon-sized ants. This is the Nephilim Saga
  pattern: the unit composition is visible at a glance from the card
  itself, not described in text. Front row vs. back row is visible
  spatially.
- **Per-unit HP indicators** — small bars under each unit sprite in
  the formation.
- **A one-word status line** — "idle," "moving," "in combat,"
  "holding," "captured," "fallen." Single word, not a sentence.
- **Selection state** — the active party's card has a prominent
  border highlight (the Ogre Battle orange glow translates fine here).

The card does _not_ contain destination text, role descriptions, or
multi-line stats. Those live in the hover tooltip and the party
detail view.

The roster scrolls if there are more parties than fit. Order is by
party creation / scenario default — not sorted by status.

Clicking a card selects that party. Selecting a party:

- Highlights the card.
- Highlights the party on the active face if she's there.
- If she's on a peripheral face: flashes her position on that
  peripheral face briefly, but does _not_ auto-rotate the cube. The
  player rotates manually if they want to see her face-on. (This is
  the deliberate-rotation discipline from the recorded model.)
- Updates the right rail to show party actions, including any
  in-progress order.

### Right rail — contextual action list

Always visible. Contents change based on selection state. The
Nephilim Saga pattern: a vertical text-button list, persistent, not
a popup.

**When nothing is selected:**
A short list of global actions:

- Step (advance one turn, paused only — see "Advancing time" below)
- Recenter (returns the active face to scenario default — a UI
  convention, not a scenario data field)
- Options / menu

Note: there is no "End turn" verb. Time advances via play/pause/speed
in the HUD pod, per pacing memo §A.1 (real-time-with-pause). Step is
the optional paused-only single-advance for fine-grained planning.

**When a party is selected (no active order):**

- Move
- Hold position
- Inspect (opens party detail view)

**When a party is selected (with an active order):**

- Re-issue order (enters order-issuing state; placing a new marker
  replaces the old one)
- Clear order (removes the marker, party becomes idle next turn)
- Hold position (treated as Clear-and-hold)
- Inspect

**When a tile is selected (no party):**

- Inspect tile (pins the tooltip content into the right rail as a
  small panel)

**When in order-issuing state:**
Top of rail shows "Pick destination" with a Cancel button. No other
actions available. Exited by clicking a destination on the active
face (confirms order) or by clicking Cancel (reverts without
changing the existing order, if any).

The right rail does not have separate Confirm/Clear buttons during
order placement. The destination-click is the confirm; Cancel
reverts. This supersedes UI memo §A.4.

Disabled actions appear greyed-but-present (see open question #5)
rather than hidden, for early-level discoverability.

**Quarantined actions (NOT in this spec).** "Attack target" and
"Recall" appeared in an earlier draft and are removed. These imply
verbs the engine doesn't have — combat is collision-resolved by the
engine on movement, not a player-issued verb; "Recall" has no
engine mechanic. Per the cube memo §0 framing, UI-context gameplay
assumptions go through gameplay review before they appear in a live
action list. If either is later proposed and approved as a mechanic,
this spec is amended.

### Bottom-left HUD pod

Persistent. Anchored to the corner. Doesn't move with selection.

Contains:

- **Queen status indicator** — small icon/portrait of the queen with
  an HP indicator. First build: chrome version (icon + HP bar).
  Diegetic version (expressive portrait) is a v2 enhancement.
- **Speed controls** — Pause / 0.5x / 1x / 2x / 4x as a row of small
  icon buttons. Current speed highlighted. Default state at scenario
  start is paused (per pacing memo).
- **Scenario name** — small text label for orientation when resuming
  a session.
- **Time element — scenario-type-conditional.** This is the part the
  earlier draft got wrong and must not be raw "Turn N/M" generically.
  Per the pacing memo §B and the operative cap=100 model:
  - **Conquest scenarios** (e.g., L3 Kitchen, L4 Hallway): **no
    visible timer.** The HUD pod's time element is empty for these
    scenarios. The 100-turn cap exists as a safety in the engine but
    is not presented as a clock the player races.
  - **Mission scenarios** (L2 escort, L6 eradication, L8 recruit, and
    similar): a **thematic countdown** appropriate to the scenario's
    fiction — "Time until the pipe floods," "Turns until the spiders
    breach," "Recruits remaining" — not a raw "Turn N/M." The
    thematic copy is part of the scenario's mission spec and is
    surfaced here.
  - Never raw "Turn N/M." Never the stale 30. Never a generic timer
    on a conquest level.

The pod is compact and corner-anchored. It does not extend into the
cube-view area.

### Bottom-right notification strip

Transient. Anchored to the corner.

Shows short single-line messages about state changes:

- Auto-pause causes — "Paused: spider sighted," "Paused: queen
  damaged," "Paused: party idle."
- Scenario milestones — "POST captured: Drain Cover," "Escort target
  has entered the corridor."
- Objective changes — scenario-spec-driven.
- **Stalemate-approach warning (forward dependency).** Per playability
  rubric criterion 6 and pacing memo §D, when the stalemate-terminal
  is decided and built, the inactivity detector will need to surface
  an approach-warning on this strip ("Stalemate imminent — 5 turns of
  inactivity remaining" or similar). The exact predicate, threshold,
  and copy are OPEN in pacing §D. This spec records the dependency
  and the surface (this strip + a parallel HUD pod cue) but does not
  spec the warning until the terminal is decided. The build should
  leave room for this addition without requiring a re-layout.

Messages stack briefly and fade. Recent ones can be expanded by
clicking the strip (opens a small log of the last 10 events).

Auto-pause notifications are paired with the actual pause — the game
state pauses, the notification appears, the speed control in the HUD
pod shows the paused state. Three signals for one event, which is
correct given how load-bearing pause cues are.

### Hover tooltip (transient)

Floats near the cursor. Appears on hover-and-hold over tiles,
parties, or POSTs.

For a **tile** — name (e.g., "Towel Rack"), terrain/surface type,
which face/wall transition it leads to (if it's at a seam), any
relevant scenario state.

For a **party** — name, composition summary, current status, current
order destination if any. Two or three lines maximum.

For a **POST** — name, current owner, capture progress turn-counter
if in the 2-turn capturing state, capture reward in shorthand.

Tooltips do not persist after the cursor moves off. To pin tile
content for sustained reading, the player uses the right-rail
"Inspect tile" action.

## Order lifecycle

The most-used interaction after the first round of orders. Worth
specifying explicitly.

**Placing a first order.**

1. Player clicks a party (in the left rail or on the active face).
2. Right rail shows party actions including "Move."
3. Player clicks "Move." Right rail switches to "Pick destination /
   Cancel." Cursor enters destination-picker mode.
4. Player clicks a destination tile on the active face. (If the
   intended destination is on another face, the player clicks that
   peripheral face first to rotate, then clicks the tile.)
5. Destination marker appears on the target tile. Right rail returns
   to party actions, now showing "Re-issue order / Clear order /
   Hold / Inspect." Party status becomes "moving."

**Viewing an existing order.**

- Selecting a party who already has an order highlights her on her
  face and shows her destination marker brightly. If destination is
  on another face, the gutter chevron between the active face and
  the relevant peripheral face indicates direction. The right rail
  shows the in-progress action set.

**Changing an order mid-march.**

- Player selects the party. Right rail shows "Re-issue order."
- Player clicks "Re-issue order" — enters destination-picker. The old
  marker remains visible (dimmed) as a reference.
- Player clicks new destination. Old marker is replaced by new one.
  Party continues moving, now toward the new destination.
- If player clicks Cancel instead, the old order persists unchanged.

**Cancelling an order mid-march.**

- Player selects the party. Clicks "Clear order."
- Marker disappears immediately. Orders take effect at turn
  granularity — clearing the order means the party issues no
  movement next turn. The UI continues to animate the already-
  resolved current turn (this is a UI presentation concern, in the
  same family as combat-panel timing per the pacing memo), so the
  player sees the party finish her current step before halting.
  Status changes to idle on the next engine tick. Optional
  notification strip: "Vanguard halted."

**Holding position.**

- Player selects the party. Clicks "Hold position."
- Treated as Clear + flag-as-holding. Status becomes "holding"
  instead of "idle." Behavior in the engine is the same (no
  movement order); the status word is the difference.

## Advancing time

Per pacing memo §A.1, the player experience is real-time-with-pause.
There is no "end turn" verb. Time advances as follows:

- **Play / pause / speed** in the HUD pod is the primary loop. Click
  Play (or a speed button) to advance time at the chosen rate. Click
  Pause to halt. Auto-pause events (per pacing memo) halt
  automatically and surface a cause in the notification strip.
- **Step** (right-rail global action, available only while paused)
  advances exactly one turn, then re-pauses. This is the fine-grained
  planning tool for players who want to see one turn play out before
  reassessing. Step is not available while playing — it has no
  meaning at non-zero speed.

Scenarios begin paused per the pacing memo, so the player issues
initial orders, then presses Play (or Steps once) to begin.

## States

The screen has a small set of distinct states.

1. **Idle.** No party selected. Game running or paused. Right rail
   shows global actions. Hover tooltips work over everything.
2. **Tile-hovered.** Mouse over a tile, no selection change. Tooltip
   shown.
3. **Party-selected (no active order).** Party card highlighted,
   party highlighted on active face (or flashed on peripheral face),
   right rail shows party actions including Move.
4. **Party-selected (with active order).** As above, but destination
   marker brightly highlighted, gutter chevron if cross-face. Right
   rail shows Re-issue / Clear / Hold / Inspect.
5. **Order-issuing (destination-pick).** Player clicked Move or
   Re-issue. Cursor in destination-picker mode. No valid-tile glow
   (every non-obstacle tile is legal); cursor changes over obstacles.
   Right rail shows "Pick destination / Cancel." Clicking active-face
   tile confirms; clicking peripheral face rotates and stays in this
   state; clicking Cancel reverts.
6. **Auto-paused.** Game paused due to a pacing-memo trigger.
   Notification strip shows cause. Speed control shows paused. All
   interactions remain available. Resume by clicking a speed button.
7. **Cube-rotating.** Brief animation when a peripheral face is
   clicked. The whole cube rotates to bring that face to center. No
   interactions accepted during rotation; under half a second.

## Interactions

| Action                                                               | Result                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Click party card (left rail)                                         | Select that party                                          |
| Click party on active face                                           | Select that party                                          |
| Click peripheral face (anywhere except a party on it)                | Rotate cube to make that face active                       |
| Click empty tile on active face (party selected, not in order state) | Deselect party                                             |
| Click "Move" in right rail (no active order)                         | Enter order-issuing state                                  |
| Click "Re-issue order" in right rail (active order)                  | Enter order-issuing state with old marker shown dimmed     |
| Click tile on active face (order-issuing state)                      | Confirm order; place / replace destination marker          |
| Click peripheral face (order-issuing state)                          | Rotate cube to that face, stay in order-issuing            |
| Click "Cancel" in right rail (order-issuing state)                   | Exit order-issuing; keep existing order (if any) unchanged |
| Click "Clear order" in right rail (active order)                     | Remove marker; party halts after finishing current step    |
| Click "Hold position" in right rail                                  | Clear order; set status to holding                         |
| Hover tile, party, or POST                                           | Tooltip appears                                            |
| Click speed control in HUD                                           | Change speed or pause                                      |
| Click "Step" in right rail (idle, paused)                            | Advance one turn, re-pause                                 |
| Click notification strip                                             | Expand recent-events log                                   |

## Out of scope for this screen

- **World loop / between-scenario screen** (cube memo §0, deferred).
- **Pre-game placement / edit units** (cube memo §0, deferred).
- **Tutorial dialogue overlay** — dependent on tutorial design doc.
- **Combat panel** — separate spec (called out by cube memo).
- **Party detail / inspection view** — separate spec.
- **End-of-scenario screen** — separate spec, three variants per
  pacing memo (ant-win, spider-win, stalemate-when-built).
- **Attack and Recall player verbs** — not engine-backed. Quarantined
  per cube memo §0 until proposed-and-approved through gameplay
  review.
- **Visual style finalization** — deferred per cube memo §D.

## Forward dependencies (not silent gaps)

- **Stalemate-approach warning.** Pacing §D OPEN. This spec records
  the surface (notification strip + HUD cue) and leaves layout room
  but does not spec the warning until the terminal is decided.
- **Path-aware gutter hint refinement.** The cross-face chevron is a
  direction-only hint per §A.3. If §A.3 is later relaxed to allow
  richer hints (it likely won't be — it's grounded in engine reality),
  this spec is amended.
- **Diegetic queen HUD.** Chrome version in first build; expressive
  portrait is a v2 enhancement (see open question #3).

## Open questions

1. **Auto-rotate to selected party.** Recommend no auto-rotation;
   flash on the peripheral face and let the player rotate manually,
   consistent with the recorded deliberate-rotation model.

2. **Pinned tile-detail.** Right-rail "Inspect tile" provides the pin
   mechanism. Recommend keeping the floating tooltip transient and
   relying on Inspect for sustained reading.

3. **Queen HUD: chrome vs. diegetic.** Recommend chrome for first
   build; diegetic as v2 enhancement.

4. **Recent-events log scope.** Recommend last 10 events.

5. **Disabled action visibility.** Recommend greyed-but-present in
   early levels (L1/L2) for discoverability; reconsider per
   playability-critic findings once active.
