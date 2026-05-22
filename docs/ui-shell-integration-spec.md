# UI shell integration layer

**Intended location:** `docs/ui-shell-integration-spec.md`
**Status:** RECORDED — forward spec, not built. Integration layer
over the existing per-view UI spec family
(`docs/ui-main-screen-spec.md`, `docs/ui-hill-hub-spec.md`,
`docs/ui-briefing-spec.md`, `docs/ui-party-detail-spec.md`,
`docs/ui-battle-mode-spec.md`, `docs/ui-end-of-scenario-spec.md`).
Recording status mirrors theirs. **Forward spec** — the shell does
not exist; this describes what to build when the UI phase begins.
**Revision 2** — Engine-truth confirmations section trimmed per
Exchange #10 dev reply (§5): Escape key-event hook and
mode-transition timing are client-runtime concerns, not engine
concerns; only the resource-strip contents item remained, and
dev answered it inline.

## What this document is

The six per-view UI specs each describe one screen of the game.
None of them owns the cross-view layer — the chrome that
persists between screens, the rules for transitioning between
modes, the global menu access, the auto-pause binding. Each
spec gestures at the cross-view layer implicitly; none of them
names it.

This document is that naming. The shell is not new structural
foundation under the per-view family; the per-view family is
RECORDED and load-bearing. The shell **codifies** the cross-view
patterns the family already implements, **fills four small
specific gaps** that fall between specs, and **binds the
auto-pause companion** to the surfaces that surface its events.

Where this document amends an existing per-view spec, the
amendment follows the §A.4 precedent: this spec records the
change here; the affected spec gets a reciprocal cross-reference
in its next revision.

## What this document is not

- **Not new ownership of any per-view screen.** Each screen's
  layout, content, and interactions remain owned by its
  per-view spec.
- **Not a visual chrome direction.** Look-and-feel finalization
  is deferred per cube-view memo §D. This spec describes shell
  structure and behavior, not visual treatment.
- **Not a gameplay decision.** Per cube-view memo §0, UI specs
  flag gameplay dependencies; they do not make gameplay
  rulings. Two such dependencies (persistent-hub vs.
  `roadmap-tier-1.md` §6.4–§6.5 schedule; Recruit-vs-Shop
  distinct-vs-unified) are flagged by `ui-hill-hub-spec.md` and
  remain so; the shell does not relitigate them.

## The chrome model — three modes, three patterns

The per-view family implements three distinct chrome patterns
for three distinct kinds of screen. The shell names these
explicitly so future specs and amendments can refer to the
pattern by name.

### Between-scenario mode (Hill, Briefing, sub-views)

Screens that sit between scenarios share a three-band layout
and a persistent **resource strip** at the top of the screen:

- **Top band:** the resource strip (jelly, ant count, and
  whatever else the engine team confirms — see "Engine-truth
  confirmations" below). Persists across the Hill, the Briefing
  panel, and every sub-view (Organize Army, Recruit, Shop,
  System).
- **Middle band:** the screen's primary content.
- **Bottom band:** screen-specific context (scenario context
  strip on the Hill, faded cube view behind on the Briefing,
  sub-view-specific on each sub-view).

The Hill hub spec records this pattern for the hub itself; the
Briefing spec records it for the Briefing panel ("Same resource
strip as the Hill — buttons, jelly, ant count … persistent
across Hill and Briefing for chrome continuity"). The shell
records that the same persistent strip carries through every
sub-view as well. The strip is the visual signature of
between-scenario mode — it tells the player "you are at home,
between deployments."

### In-scenario mode (main screen / cube view, plus party detail and battle mode)

The main screen spec's three-zone layout (left rail party
roster, center cube view, right rail contextual actions) plus
two corner overlays (bottom-left HUD pod, bottom-right
notification strip) defines in-scenario chrome. The resource
strip is **absent** — replaced by the HUD pod, which carries a
different and scenario-specific vocabulary (queen status, speed
controls, scenario name, scenario-type-conditional time
element).

Party detail and battle mode are **panels within in-scenario
chrome**, not independent modes:

- **Party detail** slides in over the right rail, retaining the
  cube view, left rail, and HUD pod. The right rail's
  contextual actions are temporarily replaced; everything else
  persists.
- **Battle mode** takes over the cube-view area as its stage,
  but the spec is silent on whether the rails and HUD pod
  persist or are hidden. **Shell ruling:** the rails and HUD
  pod are **hidden** during battle mode, so the panel reads as
  the full attention focus the battle-mode spec calls for; the
  notification strip is also hidden during the panel and
  resurfaces only after the panel dismisses to deliver the
  combat recap. This amends `ui-battle-mode-spec.md` to record
  the chrome behavior explicitly. The auto-pause
  pause-state itself is still reflected when the cube view
  returns (the HUD pod's speed control shows paused, as the
  main screen spec already specifies for any auto-pause).

### Takeover mode (end-of-scenario)

End-of-scenario is a full takeover — no resource strip, no
rails, no HUD pod, no notification strip. The end-of-scenario
spec is explicit: _"no top bar, no side rails, no notification
strip. The end-of-scenario screen is a takeover, not a
panel-over-gameplay."_ The shell records this as the third
chrome pattern: takeover screens replace everything.

Future takeover-pattern screens (game-over, hypothetical
campaign-complete, etc.) follow this same rule.

### Why three patterns and not one

The three patterns track three different things the player is
doing:

- Between-scenario: **managing the colony.** Persistent state
  is the focus; the resource strip is the visual anchor.
- In-scenario: **playing a scenario.** Scenario state is the
  focus; the HUD pod is the visual anchor; the resource strip
  is irrelevant during play.
- Takeover: **a moment that closes a scenario.** The previous
  state is no longer relevant; chrome that would imply
  continued interaction is removed.

The shell preserves this separation rather than forcing
uniform chrome across modes. The resource strip does **not**
extend into in-scenario mode; the HUD pod does **not** appear
on the Hill.

## Mode transitions

The per-view specs each describe their entry and exit points;
none specifies the transition treatment. The shell records the
following principle, drawn from the cube-view memo §A.1:

**Stylized transitions, not simulated camera.** Transitions
between modes are brief, visually deliberate, and do not
attempt to convey continuous physical motion (no flythrough
from Hill to scenario; no pan from cube view to end-of-scenario
panel). A 200–400ms fade or slide is the default treatment
unless a specific spec calls for something else.

Specific transitions called out by the per-view specs:

- **Hill → Briefing.** Click Deploy. Briefing panel appears;
  faded cube view of the upcoming scenario renders behind. The
  resource strip persists; everything else fades through.
- **Briefing → Scenario.** Click OK. The orientation moment
  plays (briefing panel fades, cube view comes to full opacity,
  START and GOAL pulse with the directional indicator between
  them, scenario opens paused). This transition is fully
  specified in `ui-briefing-spec.md`; the shell does not
  override it.
- **Scenario → End-of-scenario.** Deciding event resolves, its
  animation completes (including any battle panel that plays
  through), then the end-of-scenario screen appears. Per the
  end-of-scenario spec, the player is not handed control back
  between the deciding event and the screen.
- **End-of-scenario → Hill.** Click Continue. End-of-scenario
  fades out, Hill fades in. Resolves the previously-open
  "Continue destination" forward dependency between the two
  specs.
- **Hill → sub-view, sub-view → Hill.** Brief fade or slide.
  The resource strip persists across the transition (it does
  not animate out and back in); only the middle and bottom
  bands change.
- **Main screen → Party detail panel.** Panel slides in from
  the right over the right rail. Cube view and other chrome
  do not transition.
- **Main screen → Battle mode → Main screen.** Cube view fades
  to the battle stage as the panel opens; reverses as the panel
  auto-dismisses. Rails and HUD pod are hidden during the panel
  per the shell ruling above.

The shell does not specify millisecond timings beyond the
200–400ms default; the build determines exact values that feel
right. The principle is the spec: stylized, not simulated.

## Global menu access

The hub's System verb and the main screen's right-rail "Options
/ menu" entry are the two recorded global menu entry points.
The shell records the rule that governs menu access in modes
that don't surface their own menu entry:

**Menu access by mode:**

- **Between-scenario:** the hub's System verb is the access
  point. Sub-views do not surface their own System entry; the
  player returns to the Hill (via the sub-view's back-to-Hill
  affordance) and clicks System from there. Briefing inherits
  this — Briefing does not surface a menu entry; the player can
  return to the Hill via the Briefing's own back-affordance
  (see "The back-to-Hill affordance" below for the gap this
  fills) and access System from there.
- **In-scenario:** the right-rail "Options / menu" entry is the
  access point. Party detail and battle mode inherit from the
  main screen; they do not surface their own menu entries.
  Party detail's right rail is replaced by the detail panel —
  closing the panel restores the right rail, which carries the
  menu entry.
- **Takeover (end-of-scenario):** no menu access. The screen is
  the entire interaction surface; Continue is the only verb.

**Escape key behavior** is unified across modes:

- In any mode with a closable overlay (Briefing panel, party
  detail panel, battle mode if dismissible), **Escape closes
  the overlay** and returns to the underlying mode.
- In modes without a closable overlay (Hill, sub-views, main
  screen with no panel open, end-of-scenario), **Escape opens
  the system menu** at the mode's menu access point.
- In takeover mode, **Escape does nothing** — the screen is the
  only valid surface.

This is the shell's call, not a spec amendment — none of the
per-view specs takes a position on Escape, so the shell defines
it without conflict. Escape handling is a client-runtime concern
(key-event binding lives in the client, not the headless engine),
so it needs no engine confirmation — see "Engine-truth
confirmations" below.

## The back-to-Hill affordance

The Hill hub spec says _"Each sub-view has its own back-to-Hill
affordance"_ but does not constrain what the affordance looks
like. To prevent each sub-view from inventing its own back
affordance ad hoc (which would erode shell coherence), the
shell records the pattern:

**Sub-view back-to-Hill is a chrome-band affordance, not a
content affordance.** Sub-views render the back-to-Hill control
as part of the persistent shell chrome — top-band corner or a
fixed affordance in a frame element — not as a button inside
the sub-view's own content area. The label is "Back" or a
back-arrow icon; the destination ("Hill") is implicit from the
shell context. This keeps every sub-view's back affordance in
the same screen location, so the player learns it once.

The Briefing panel gets the same affordance treatment as a
sub-view for return-to-Hill purposes (cancelling out of a
briefing without deploying). The Briefing spec does not record
a back-to-Hill flow currently; this is a small extension the
shell adds. The amendment is filed as a reciprocal note in the
Briefing spec.

## Auto-pause binding

The auto-pause event-set companion (`docs/auto-pause-events.md`,
this session) defines the five v1-bindable events that fire
auto-pause (plus forward-dep triggers reserved for later). The
shell binds those events to UI surfaces:

- **HUD pod (main screen, in-scenario chrome).** The speed
  control reflects paused state. Source surface for every
  auto-pause event. Already specified in
  `ui-main-screen-spec.md`; the binding is recorded for
  completeness.
- **Notification strip (main screen, in-scenario chrome).**
  Surfaces the per-event copy ("Paused: spider sighted,"
  "Paused: party idle"). Already specified in
  `ui-main-screen-spec.md`'s notification strip section.
- **Battle mode panel.** Opens on `combat-init`. The pause from
  `combat-init` and the auto-pause framing in
  `ui-battle-mode-spec.md` are the same pause, not two.
  Notification strip surfaces the combat recap after panel
  dismissal.
- **Save-touchpoint binding (forward-dep, not v1).** Revision 1
  of this spec proposed binding a `save-touchpoint` event to the
  notification strip. Per the Exchange #10 dev reply (§3c), §7.13
  is a record/replay/restore primitive with no authored
  save-point marker concept; there is no event to bind today. The
  auto-pause companion has demoted `save-touchpoint` to a forward
  dependency on an unbuilt authored-save-point feature. When that
  feature is specced (its own small exchange), the binding lands
  here as a notification-strip surface ("Game saved" or similar)
  and amends `ui-main-screen-spec.md` then — not now.

The shell does not enumerate the events themselves — that's
the auto-pause companion's job. The shell records which
surfaces consume which events.

## What the shell intentionally does not do

- **Does not specify visual chrome direction.** Deferred per
  cube-view memo §D.
- **Does not resolve the persistent-hub vs. §6.4–§6.5
  no-shop-schedule gameplay-review dependency.** Flagged by
  `ui-hill-hub-spec.md`; remains a gameplay-review item.
- **Does not resolve the Recruit-vs-Shop distinct-vs-unified
  gameplay-review dependency.** Same — flagged by the hub
  spec; remains.
- **Does not specify the world-loop screen.** End-of-scenario
  spec quarantines this; the shell respects that
  quarantine. End-of-scenario hands to the Hill, which is the
  named destination; the world-loop screen itself is owned
  elsewhere.
- **Does not spec the Tutorial overlay surface.** Briefing spec
  notes that Briefing is the first half of the shared
  Briefing/Tutorial UI surface; the second half (Tutorial
  overlay) is a separate forward spec. The shell does not
  pre-empt that spec.
- **Does not handle accessibility, localization, or
  controller-vs-mouse input.** All three are own-spec
  concerns that touch the shell when they happen, but the
  shell does not pre-spec them.

## Engine-truth confirmations needed

One confirmation, answered in the Exchange #10 dev reply:

1. **Resource strip contents — answered.** Per dev: gold from
   `WorldState.gold`, jelly from `Party.jellyDoses`, ant count
   derivable from the roster/parties. Dev offered to hand over
   the canonical element list on request; design agent or hub
   spec owner can request it when the resource strip is built.
   The Hill hub spec and the Briefing spec can update their
   "engine confirm" notes to point here once this layer
   ratifies.

The two items that appeared in revision 1 of this spec
(key-event hook for Escape, mode-transition timing tolerance)
are **not engine concerns** and have been removed. Per dev,
the engine is a headless deterministic turn simulator with no
input handling and no render loop; input handling and
animation timing are 100% client-runtime concerns the client
owns outright. The shell rulings on Escape behavior and
transition treatment stand without engine confirmation; they
are client-side rules.

(See `docs/change-request-protocol.md` §7 protocol note from
the Exchange #10 reply: engine confirmations are for engine
surfaces only.)

## Reciprocal amendments to per-view specs

Four per-view specs receive amendments from this layer. Each
amendment is small (a recorded note pointing here, plus the
specific change). Drafts of the amendments are bundled with
this exchange.

1. **`ui-hill-hub-spec.md`** — record the back-to-Hill
   affordance pattern for sub-views (chrome-band, not content).
2. **`ui-briefing-spec.md`** — add the back-to-Hill affordance
   for cancelling out of Briefing without deploying.
3. **`ui-end-of-scenario-spec.md`** — record the reciprocal
   cross-reference for the Continue→Hill destination (the hub
   spec already recorded its half).
4. **`ui-battle-mode-spec.md`** — record that rails, HUD pod,
   and notification strip are hidden during the panel and
   resurface on dismissal.

(Note: revision 1 of this spec proposed five amendments. The
fifth — a save-touchpoint binding to the main-screen
notification strip — is **dropped from this exchange** because
the auto-pause companion's `save-touchpoint` event was demoted
to forward-dep per the Exchange #10 dev reply. When the
authored-save-point feature is specced, the
`ui-main-screen-spec.md` amendment lands then as a separate
small exchange.)

## Cross-references

This spec is consumed by and consumes:

- `docs/ui-main-screen-spec.md`, `docs/ui-hill-hub-spec.md`,
  `docs/ui-briefing-spec.md`, `docs/ui-party-detail-spec.md`,
  `docs/ui-battle-mode-spec.md`,
  `docs/ui-end-of-scenario-spec.md` — the per-view family this
  shell integrates over.
- `docs/auto-pause-events.md` (drafted this session) — the
  auto-pause event-set this shell binds to UI surfaces.
- `docs/design-memo-ui-cube-view.md` — §A.1 (stylized
  transitions), §0 (UI specs flag gameplay deps; do not make
  gameplay rulings), §D (visual-style deferred).
- `docs/design-memo-pacing-and-turn-cap.md` §A.1 — the
  real-time-with-pause model the auto-pause companion
  operationalizes.
- `docs/change-request-protocol.md` — protocol for any future
  amendment to this layer.
