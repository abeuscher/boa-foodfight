# Tutorial Overlay — UX Spec (In-Scenario Coaching System)

**Location:** `docs/ui-tutorial-overlay-spec.md`
**Status:** RECORDED (Exchange #12, accepted) — ratified through the
change-request protocol; dev-verified zero engine work, byte-safe
(read-only consumer over the turn-stream + client UI state, same posture
as the auto-pause layer). **Forward spec** — not built; the action-gate
build sequences after the live engine-in-browser path (see
"Engine/client confirmations"). The in-scenario half of the tutorial
surface; the between-scenario half (goal statement, narrative
orientation) lives in the already-RECORDED `docs/ui-briefing-spec.md`.
Companion to `docs/ui-main-screen-spec.md` (the chrome the overlay
coaches against) and `docs/auto-pause-events.md` (the observable signals
action-gates and nudges bind to).

**Posture — a system, not a script.** This spec defines a **reusable
grammar of tutorial step-types** and answers "how do we introduce an
action / a control / a strategy element / a world-loop piece?" as
patterns. The L0 sequence is the **first worked instance** of that
grammar, authored as scenario-data — not hardcoded UI. When features
land or flow shifts (and they will, repeatedly), you re-author the
beat list, not the system. The approach is the deliverable; the L0
beat order is an illustration of it.

## Purpose

The tutorial overlay coaches a player through the in-scenario UI and
the core command loop, in Sergeant Antonio's voice, while the player
**plays** the level — not while they watch it. It is the surface that
turns L0 from a cutscene into a playable first level, and it is the
mechanism every later scenario reuses to introduce whatever is new in
that scenario.

It is the in-scenario continuation of `ui-briefing-spec.md`: the
Briefing view states the goal and orients the player before the
scenario; the overlay picks up at scenario start to introduce the
controls and hand the player real agency. Together they are the
"tutorial-design surface" `playability-critic-rubric.md` criterion 7
(naive-player loop) is gated on.

## Design principle — active, not passive (load-bearing)

The engine is a deterministic turn simulator: the player issues orders
to parties, advances time, and the world resolves. The standing risk
is that coaching turns this into a **watch-the-PC-play-itself**
experience. This spec's first commitment is against that:

1. **Hand over real agency early.** The first action-gate is the
   player issuing a **real order to a real party** — the core "you
   command, the world executes" loop — reached in a handful of steps,
   not after a long lecture.
2. **The back half of L0 is "play with nudges," not "guided beats."**
   Once the core controls are taught and the first order is issued,
   the player drives. The overlay only speaks up to introduce a new
   element when it first becomes relevant, or to nudge if the player
   stalls. (Ratified engagement model — see "Step sequencing.")
3. **Teach the pause/time controls first** so that by the time the
   clock is live under the player, pausing is a tool they own — agency
   over pace is part of the agency the tutorial is protecting.

Every step-type and sequencing rule below exists to serve this
principle. A coaching step that could be a nudge should be a nudge; a
beat that could be free play should be free play.

## The two surfaces (and the boundary)

- **Goal + narrative orientation → Briefing view** (`ui-briefing-spec.md`,
  pre-scenario). "Antonio has to cross the board and stay alive." This
  is consistent across all levels and is **not** redrawn here.
- **In-scenario UI introduction + action-gating + nudges → this
  overlay.** Begins at scenario start (which is already paused per
  pacing §A.1) and runs alongside gameplay.

The boundary is clean: the player reads the goal in the Briefing,
clicks into the scenario, and the overlay's first step is already
about the board in front of them.

## Step-type grammar

A tutorial is an ordered list of **steps**. Each step is one of a
small set of types. This grammar is the spec's spine; new tutorial
content is authored by composing these types, not by adding code.

### 1. Acknowledge-modal (read + dismiss)

A parchment panel floated to one side of the **paused** world, with
Antonio's portrait + name caption docked in the panel corner, a title,
prose body, and an **OK affordance** (the diegetic stamp) to dismiss.
Optional **« / » step chevrons** for moving within a multi-step
acknowledge sequence. Pure read-and-acknowledge; blocks input until
dismissed.

- **Pause:** always paused while open (see "Pause model").
- **Placement:** offset so it does not occlude anything it references
  (see "Anchoring & layout").
- **Use for:** the opening orientation-to-the-board, framing a new
  concept before the player acts on it, and the closing recap.

### 2. Highlight-and-explain (introduce a _control_)

An acknowledge-modal **plus** a visual emphasis on a named chrome
region (a glow/outline/arrow on the time controls, a rail, the HUD
pod, the active face, etc.). Reads the same as type 1 but the panel
points at the thing it describes. Dismiss with OK.

- **Pause:** paused (it is an acknowledge-modal variant).
- **Use for:** "this is the time control," "this is your party
  roster," "this is how you issue an order" (select party → Move →
  click destination — there is no separate Confirm affordance; the
  destination-click is the issue, per `ui-main-screen-spec.md`). The
  **answer to "how do we introduce a control."**

### 3. Point-and-do action-gate (introduce an _action_)

No blocking panel. A **small docked callout with a directional arrow
anchored to a real UI element** ("Issue an order to this party"), and
the step **advances only when the player actually performs the
action**. The clock runs at the player's chosen speed during the gate
(unless the player has paused).

- **Pause:** live (player-controlled). This is where agency is handed
  over.
- **Advance condition:** bound to an observable player action (see
  "Advance conditions"). The step does not advance on a timer or a
  click-anywhere; it waits for the real thing.
- **Use for:** the first real order, the first time-control use, the
  first sub-view visit. The **answer to "how do we introduce an
  action."**

### 4. Free-play nudge (introduce a _strategy element / world-loop piece_, or unstick)

A **non-blocking** contextual callout that appears during normal play
when a new element first becomes relevant ("the spiders are near —
watch your morale") or when the player stalls. The player keeps full
control; the nudge does not block input and times/dismisses out. May
optionally point at an element, but does not gate progression.

- **Pause:** live; the nudge never forces a pause (though the player
  may pause to read it).
- **Use for:** the back half of L0 and most later-scenario teaching —
  strategy hints, world-loop introductions (a Shop/Recruit prompt
  between scenarios), and stall-recovery. The **answer to "how do we
  introduce a strategy element / world-loop piece."**

### Step-type summary

| Type                    | Blocks input?         | Pause  | Introduces                                  |
| ----------------------- | --------------------- | ------ | ------------------------------------------- |
| 1 Acknowledge-modal     | yes                   | paused | a concept / recap                           |
| 2 Highlight-and-explain | yes                   | paused | a control                                   |
| 3 Point-and-do gate     | no (waits for action) | live   | an action                                   |
| 4 Free-play nudge       | no                    | live   | a strategy / world-loop element, or unstick |

## Pause model (per-step, rides existing pacing)

- **Acknowledge-modal and highlight-and-explain (types 1–2): paused.**
  The game pauses while the panel is open. Scenarios already start
  paused (pacing §A.1), so the opening steps ride that rather than
  inventing a new pause state.
- **Point-and-do and free-play (types 3–4): live**, at the player's
  chosen speed — **unless the player has paused themselves.** The
  time/pause control is taught (type 2) before the first live gate, so
  the player owns pausing by then.
- **Layering:** the tutorial's pause is the same pause surface the
  HUD-pod speed control drives; the overlay sets it, the player can
  also set it. When a modal closes, time returns to the player's
  pre-modal speed setting (paused stays paused; running resumes
  running).

Pause is therefore a **property each step declares**, not a global
tutorial mode.

## Step sequencing — the L0 spine (ratified engagement model)

The ratified shape, applied to L0 (the worked example below fills in
the specifics):

1. **Briefing view** states the goal (pre-scenario; not this spec).
2. **Orient to the board** — acknowledge-modal: where Antonio is,
   where he's going, what "cross the board and survive" looks like on
   this map. (Paused; scenario opens paused.)
3. **Introduce the controls mission 1 needs** — a short run of
   highlight-and-explain steps: time/pause controls **first**, then
   the party roster rail, the contextual-action rail (order issuance),
   and the HUD pod read-outs. Only the controls L0 actually uses; not
   an exhaustive UI tour.
4. **Hand over agency** — point-and-do gate: the player **issues a
   real order to a real party** and **starts the clock**. This is the
   "get the player playing" moment, reached in a few steps.
5. **Play with nudges** — the rest of L0 runs as free play. The
   overlay introduces each new element with a single nudge the first
   time it matters (a combat, a POST, a fog reveal) and nudges if the
   player stalls. The player is playing the level, not watching it.
6. **Closing recap** — optional acknowledge-modal (the recap-icon
   variant) summarizing what was learned, leading into the
   between-scenario loop.

**The <3-minutes-to-playing goal** is structural, not timed: steps
2–4 are a handful of steps, and step 4 is where real play begins. The
spec optimizes for "few steps to first real order," and the back half
being free play means the level's length is the _player's_ play, not
the tutorial's runtime.

## Anchoring & layout

- **Modals (types 1–2)** float over the world, offset to one side
  (Tropico precedent), positioned so they **do not occlude the element
  the step references**. A step that points at the HUD pod (bottom-left)
  places its panel right-of-center; a step about the right rail places
  it left-of-center. The panel never covers its own subject.
- **Arrows / callouts (types 3–4)** dock adjacent to the **named
  main-screen chrome region** they target and point at it. Targets are
  the regions named in `ui-main-screen-spec.md`: active face,
  peripheral faces, left rail (party roster), right rail (contextual
  actions / order issuance), bottom-left HUD pod (incl. time/pause
  controls), bottom-right notification strip.
- **Emphasis treatment** (glow vs outline vs arrow, and whether to
  dim/spotlight-mask the rest of the screen) is **visual-direction
  deferred** per cube memo §D. The spec ratifies _that_ the target is
  emphasized and _which_ region; the look is a later call. (v1 default
  direction: arrow + docked callout, per the Tropico references; a
  spotlight-mask is a forward enhancement, not v1.)
- **Antonio portrait + name caption** ride in the modal corner for
  types 1–2 (the in-scenario instance of the Briefing's Antonio
  portrait). Free-play nudges (type 4) are lighter — a small callout,
  optionally with the portrait, not the full panel.

## Advance conditions (how gates and nudges detect the player)

Point-and-do gates (type 3) advance on an **observable player action**;
free-play nudges (type 4) fire on an **observable state condition**.
Both bind to signals the client already has or that the auto-pause
contract already names — the overlay is a consumer, not a new producer:

- **Player actions** (gate advance): an **order issued** for a party
  (the destination-click that places a move order — `ui-main-screen-spec.md`
  has no separate Confirm affordance; the destination-click _is_ the
  issue); **time/speed changed** via the HUD pod; a **sub-view opened**;
  a **face rotated/selected**. These are all **client UI events** — the
  engine is headless and does not emit them. Dev-confirmed observability
  split (Exchange #12): speed/pause-changed and sub-view-opened are
  observable **today** (the merged clock layer + app nav own them);
  **order-issued** is observable once the **live engine-in-browser /
  order-issuance path** exists (today's in-scenario view is replay
  playback, no order issuance), and **face-select** once the cube view
  is built. Both are unbuilt-but-client-owned-when-built, so the gate is
  trivial to wire then.
- **State conditions** (nudge fire): the same turn-stream signals the
  auto-pause set reads, and they **inherit auto-pause's observability
  split** — they are not all "free." A **combat resolved**
  (`combat-init` / `battle-resolved`) and a **POST captured**
  (`post-captured`) are directly event-keyed and observable today; a
  **party went idle** (`party-idle`) is state-derived (needs per-turn
  order-queue diffing) and an **enemy became newly visible**
  (`newly-visible-enemy`) still rides the **pending ant-visibility
  projection** (the open Exchange #10 §3d confirmation, unresolved). So
  nudges keyed on those two carry the same deferred / pending-visibility
  status they have in the clock layer.
- A **stall** is "no player action for N seconds of live play" — a
  **pure client-side idle timer** (a last-input timestamp + an elapsed
  check that resets on any player action and accrues only while the
  clock is live). Dev-confirmed: this is **unrelated** to the engine
  `stalemate-approach` forward-dep (a sim-level inactivity terminal,
  pacing §D) — conceptually similar, no shared mechanism, and the
  tutorial stall is **not blocked** on anything.

## Skip, replay, and forgiveness

- **Skip the whole tutorial** — a skip affordance (the `««` precedent)
  is available; skipping drops all overlay steps and leaves the player
  in normal play. Scenario-data flag for whether a given scenario's
  tutorial is skippable (L0 likely yes-with-confirm).
- **Recap / step-back** — within an acknowledge sequence, `« / »`
  step among the panels; the recap-icon variant (Tropico screen 4)
  re-opens the last explanation.
- **Forgiveness** — point-and-do gates do not punish wrong actions;
  they simply don't advance until the right action occurs, and may
  re-surface the callout if the player wanders. No fail state inside
  the tutorial.

## L0 worked example (illustrative, re-authorable)

This is **one instance** of the grammar, not a fixed contract. It will
change as features land and UI testing reshapes flow; treat it as the
reference fill-in, kept in sync with `docs/drafts/L0-beat-outline.md`
(the beat source).

- **Orient (type 1):** Antonio's start, the exit he must reach,
  "survive the crossing." Paused.
- **Controls (type 2 ×N):** pause/speed first → party roster → how to
  issue an order (select → Move → destination) → HUD read-outs. Only
  L0's controls.
- **First order (type 3):** point at Antonio's party → "give him a move
  order" → click destination (the order issues) → "now start the
  clock." Live from here.
- **Play with nudges (type 4):** first fog reveal, first spider
  contact, first combat each get a one-time nudge; stall-nudge if the
  player idles. Player plays the crossing.
- **Recap (type 1, optional):** what was learned; into the
  between-scenario loop.

L0 beat 7's save touchpoint is **not** an overlay event in v1
(`auto-pause-events.md` demoted `save-touchpoint` to a forward-dep);
the beat lands as scripted prose with no gate behind it until the
authored-save-point feature exists.

## Fenced items (do not relitigate)

1. **Antonio's actual lines.** Content, not UX — the writer agent owns
   the script (parallel to the Grasshopper's deferred voice in the
   Shop spec). This spec reserves the portrait + panel slot and defines
   the step-types; it does not author copy.
2. **Goal statement / narrative orientation.** Owned by
   `ui-briefing-spec.md`; not redrawn here.
3. **Visual treatment** (emphasis style, spotlight-mask, transition
   timing). Cube memo §D deferral; v1 direction is arrow + docked
   callout.
4. **Pacing default-paused-on-start.** Pacing memo §A.1 canon; the
   overlay rides it, does not redefine it.

## Engine/client confirmations (dev-answered, Exchange #12)

1. **Client action-observability for gates — GRANTED, by construction.**
   Every action a gate keys off is a client UI event the client itself
   produces (never the headless engine). With a today/when-built split:
   **speed/pause-changed** and **sub-view-opened** are observable now;
   **order-issued** is observable once the live engine-in-browser /
   order-issuance path lands; **face-select** once the cube view is
   built. See "Advance conditions."
2. **Stall detection — GRANTED, fully client-side, today.** A
   last-input timestamp + elapsed check; unrelated to the engine
   `stalemate-approach` forward-dep.

**Build-sequencing note (does not block ratification).** The
acknowledge-modal, highlight-and-explain, and free-play-nudge step-types
can largely be built over the existing replay-playback view. The
**point-and-do action-gate** — specifically the load-bearing "first real
order" moment — depends on the **live engine-in-browser / order-issuance
path** (the next dev arc), since replay playback has no order issuance.
So the spec ratifies now (free), but the action-gate build sequences
after live-play lands — which aligns with where dev is headed next.

No engine work: the overlay consumes already-emitted turn-stream events
and client UI state; it produces nothing the sim path sees, so no
gate-29 / balance-curve impact (confirmed read-only, same posture as the
auto-pause layer).

## Appendix — Observable signals (dev-verified, Exchange #12)

The canonical signal inventory the gates, nudges, and stall timer bind
to. Gates (type 3) advance on **client UI events**; nudges (type 4) fire
on **event-stream signals**; stall is a **client idle timer**.
Availability splits by what is built today vs. what arrives with a
future surface.

**A. Client UI events** — the client is the source; the headless engine
never emits these, so they are observable by construction once the
surface exists.

| Signal                                                             | Source surface               | Available                                    |
| ------------------------------------------------------------------ | ---------------------------- | -------------------------------------------- |
| speed / pause / play / step changed                                | clock layer (`useClock`)     | **today**                                    |
| sub-view opened / return-to-Hill nav                               | hub shell (`App` view state) | **today**                                    |
| world-loop op applied (equip, buy, recruit, move/create/disband)   | between-scenario sub-views   | **today**                                    |
| order issued — party selected → **destination click** (no Confirm) | live order/command UI        | **when built** (live engine-in-browser path) |
| cube face selected / rotated                                       | cube view                    | **when built** (cube render, §D-deferred)    |

**B. Event-stream signals** — read from `TurnOutcome.events[]`
(`ReplayEvent[]`), the same stream auto-pause consumes; work in both
replay playback and live play.

| Signal                                                                                                                                                                   | Status                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `post-captured`, `battle-resolved`, `reinforcement-spawned`, + any raw `ReplayEvent` kind (`unit-died`, `party-moved`, `ability-used`, `jelly-applied`, `fog-revealed`…) | **observable today** (directly event-keyed)                                                                                   |
| `party-idle`                                                                                                                                                             | **derived** — needs a per-turn order-queue diff (non-empty→empty), not a single event kind                                    |
| `newly-visible-enemy`                                                                                                                                                    | **pending** — needs the ant-perspective fog-filtered visible-enemy projection (§3d, open; `fog-revealed` carries coords only) |

**C. Stall** — "no player action for N seconds of live play" is a **pure
client-side idle timer** (last-input timestamp; resets on any category-A
event; accrues only while the clock is live/playing). No engine
dependency; **distinct from** the engine `stalemate-approach` forward-dep
(a sim-level inactivity terminal, pacing §D).

**Cross-cutting.** The category-A "order issued" / "face" gates occur
only in **live play** (replay playback has no player order issuance), so
the action-gate half sequences after the live engine-in-browser path.
Category-B signals and the acknowledge / highlight / free-play-nudge
step-types work over playback today.

## Forward dependencies

1. **Tutorial-step data schema.** The step-script is scenario-data;
   its on-disk shape (step type, target region, advance condition,
   pause flag, copy key) is a forward-dep schema, authored when the
   overlay is built. The overlay renders it; this spec defines the
   grammar the schema encodes.
2. **Spotlight/dim-mask emphasis.** v1 is arrow + callout; a
   dim-everything-but-the-target treatment is a forward enhancement.
3. **Antonio voice library.** Shared dep with the Briefing and hub
   specs.
4. **Save-touchpoint coaching.** Joins when the authored-save-point
   feature ships (`auto-pause-events.md` forward-dep).
5. **Between-scenario / world-loop nudges.** The type-4 nudge pattern
   extends to introducing Shop / Recruit / Organize Army the first
   time the player reaches the Hill; the in-Hill instance is a forward
   application of the same grammar (the hub spec names the surfaces).

## Cross-references

- `docs/ui-briefing-spec.md` — the between-scenario half; owns the
  goal statement and narrative orientation this overlay continues from.
- `docs/ui-main-screen-spec.md` — the chrome regions the overlay
  anchors to (time controls, rails, HUD pod, faces, notification
  strip) and the order-lifecycle (destination-click issue, no separate
  Confirm affordance) that the first action-gate detects.
- `docs/auto-pause-events.md` — the observable turn-stream signals the
  free-play nudges and stall detector reuse; the shared pause surface.
- `docs/design-memo-pacing-and-turn-cap.md` §A.1 — default-paused-on-
  start, which the per-step pause model rides.
- `docs/drafts/L0-beat-outline.md` — the beat source the L0 worked
  example stays in sync with.
- `docs/ui-hill-hub-spec.md` — reserves Antonio's voice for Briefing +
  this Tutorial overlay; the world-loop nudge surfaces it names.
- `docs/ui-shell-integration-spec.md` — in-scenario chrome the overlay
  layers over.
- `docs/playability-critic-rubric.md` criterion 7 — the naive-player
  loop this surface (with the Briefing) unblocks.
- `docs/design-memo-ui-cube-view.md` §0, §D — visual-treatment
  deferral.

## Visual references (treatment direction, not specification)

Tropico tutorial-coaching set (provided this session) — the primary
model, and apt because the shell is already Tropico-grounded
(`tp1`/`tp4`):

- **Acknowledge-modal** ("Tasks", "How to Rule?") — parchment panel
  offset over a paused world, mentor (Santana) portrait + name caption
  in-panel, red title, prose, OK stamp, `« / »` chevrons. The model
  for step-types 1–2 (Santana → Antonio).
- **Recap variant** ("Tasks — Summary") — same panel with a recap icon
  replacing the chevrons; the "look back at what you learned"
  affordance.
- **Point-and-do arrow** ("Click on this task") — small docked callout
  - red arrow anchored to a live UI element, game **running**,
    advancing on the real action. The model for step-type 3.
- **Full-screen journal** ("How to Rule 1/4") — the paginated
  briefing/score book. Noted as an **adjacent** surface (our Briefing
  view / hill journal `tp1`), explicitly **not** part of this overlay,
  to keep the boundary clean.

All references are inputs to the structural call; visual treatment is
deferred per cube memo §D.
