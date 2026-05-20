# End-of-scenario spec

**RECORDED — forward spec, not built. Companion to the main screen
spec, battle mode spec, and party detail spec; recording status
mirrors theirs.** The end-of-scenario screen UI does not exist; this
document specifies what it should be when built.

This spec covers the screen the player sees when a scenario ends.

## Outcomes — labels and resolution paths

The end-of-scenario screen has two jobs: present the _outcome label_
(what the player sees) and, where useful, present the _resolution
path_ (why the scenario ended that way). These are two separate
axes.

**Outcome labels** are the player-facing terms:

- **Victory** — the ant side prevailed.
- **Defeat** — the spider side prevailed.
- **Stalemate** — third terminal, neither side prevailed. Reserved
  canon vocabulary per pacing memo §D — see "Forward dependency:
  stalemate variant" below.

**Resolution paths** are how the engine reached that label. The
current engine (pre-§D) produces three paths:

- **Decisive resolution.** A scenario's win condition is met
  outright. Queen alive + POSTs held / escort completed / mission
  objective achieved → Victory. Queen fallen → Defeat.
- **Mission timeout** (per pacing memo §A.5). Mission scenarios
  (L2 escort, L6 eradication, L8 recruit, others) have a thematic
  countdown. If the countdown elapses with the mission objective
  unmet → Defeat.
- **Score-resolved** (per pacing memo §A.3 and engine round-19).
  Conquest scenarios that hit the engine's 100-turn cap without a
  decisive outcome fall back to the score path and resolve to
  Victory or Defeat by score. L1 always uses this path per §A.3 and
  is permanently exempt from the stalemate terminal.

After pacing §D resolves and the stalemate-terminal mechanic is
built, the picture changes for opted-in scenarios:

- **Stalemate-terminal** (forward, pacing §D OPEN). For scenarios
  that opt in, a cap-hit-without-decisive that would today resolve
  by score instead becomes Stalemate. L1 stays score-resolved per
  §A.3 regardless. Which other scenarios opt in is part of what
  pacing §D needs to decide.

The screen displays the outcome label prominently and surfaces the
resolution path as part of the debrief (see "Right half: stats
panel" → resolution path line). The player who won by score on a
conquest scenario should be able to tell that's what happened —
both for context ("we held barely enough at the cap") and for
playability (a score-resolved win feels different from a decisive
one).

## Purpose

The end-of-scenario screen does two jobs:

1. **Communicate the outcome.** Which way the scenario ended, with
   appropriate weight given to the outcome (a win is celebratory; a
   loss is sober, not punishing).
2. **Debrief the player.** Show what happened — kills on each side,
   POSTs captured, parties lost, scenario-specific stats — so the
   player can understand the run, regardless of outcome.

This is a moment screen. It is not interactive in a strategic sense
(no orders, no replays-as-gameplay), but it is the player's last
look at the run before continuing.

## Vocabulary

Per the battle mode spec's vocabulary note, "stalemate" is reserved
canon for the scenario-level terminal. It does not refer to combat
results. This spec uses it in its proper sense — a third scenario
outcome distinct from ant win and spider win, with terminal
condition pending pacing §D.

## Layout

One panel, two halves.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   [graphic half]              │     [stats half]                 │
│                               │                                  │
│   outcome-themed image        │     scenario name                │
│   covering left half          │     outcome label                │
│                               │                                  │
│                               │     ─────────                    │
│                               │                                  │
│                               │     stats list (count-up):       │
│                               │     • ant kills                  │
│                               │     • spider kills               │
│                               │     • POSTs captured             │
│                               │     • parties lost               │
│                               │     • turns elapsed              │
│                               │     • [scenario-specific stats]  │
│                               │                                  │
│                               │     [Continue]                   │
│                               │                                  │
└──────────────────────────────────────────────────────────────────┘
```

- **Left half: graphic.** A single image filling the left half of
  the panel. Outcome-themed (see "Graphic variants" below). Static —
  no animation in v1.
- **Right half: stats and outcome label.** Scenario name at top,
  outcome label below it, then the stats list that animates in. A
  single Continue button at the bottom.

No additional chrome — no top bar, no side rails, no notification
strip. The end-of-scenario screen is a takeover, not a panel-over-
gameplay. The player has finished playing; the cube view is no
longer relevant.

## What's on screen

### Left half: graphic

A single themed image. The image is the only visual content on the
left half — no text overlays, no stats. The graphic is for mood and
recognition, not information.

**Graphic variants (one per outcome):**

- **Ant win.** A scene of ant triumph appropriate to the scenario's
  room — the queen on a captured POST in the kitchen, the colony
  arrayed on a held bathroom drain, scouts on a victorious lookout
  in the hallway. Warm lighting, characterful actors, the bug-movie
  feel from A Bug's Life and Antz. Each scenario can have its own
  graphic or there can be a shared library of win graphics —
  decision deferred to the build.
- **Spider win.** A scene of ant defeat, but sober rather than
  grim — the queen fallen at the entrance to the next room, the
  remaining ants in retreat, a spider claiming the contested POST.
  Cooler lighting, the actors still characterful but somber. Not
  punishing — this is "you lost this scenario, try again," not
  "you have failed forever."
- **Stalemate.** Reserved (see forward dependency).

Graphic style direction is consistent with the cube view's world
look-and-feel: Minuscule-style room-as-landscape, ants as
characterful actors, mood-appropriate lighting. Same chrome/world
discipline as the rest of the canon — the graphic is world, the
chrome around it is chrome.

(Per cube memo §D, visual-style finalization is deferred; the above
is build **direction**, not a visual specification.)

### Right half: stats panel

Top of the right half:

- **Scenario name** — "L3 — Kitchen Counter" or similar, in larger
  type.
- **Outcome label** — "Victory," "Defeat," or "Stalemate" (when
  specced). Color-coded — warm for Victory, cool for Defeat, neutral
  for Stalemate. Below the scenario name.
- **Resolution path** — small subordinate line below the outcome
  label, naming how the scenario ended: "Decisive," "Mission
  timeout," "Score-resolved," or (forward) "Stalemate terminal."
  Same resolution paths defined in the Outcomes section above. The
  player sees both the label and how the engine reached it.

Below the outcome label, a horizontal separator and then the stats
list.

**Stats list (count-up animated, see "Animation" below):**

Each line is a labeled value. Lines appear sequentially with a
brief count-up animation per value.

Core stats (always shown):

- **Ant kills** — units the player's parties destroyed.
- **Spider kills** — units of the player's that were lost (named
  from the spiders' perspective to keep the framing consistent).
- **POSTs captured** — number of POSTs the player ended the scenario
  holding.
- **Parties lost** — player parties whose units all fell.
- **Turns elapsed** — total turns the scenario ran. (Note: this is a
  retrospective debrief stat, not a contradiction of the pacing
  model's deliberate suppression of the live turn counter on
  conquest scenarios. A post-hoc retrospective ≠ a live race clock.
  Showing it here is fine; surfacing it as a live counter during
  conquest play is not — per the main screen spec.)

Scenario-specific stats (shown when applicable, after the core
stats):

- **L2 escort:** "Escort target health remaining" / "Escort
  completed."
- **L6 eradication:** "Spiders remaining" / "Eradication progress."
- **L8 recruit:** "Recruits gained."
- Other mission scenarios surface their mission-specific stat per
  the scenario spec.

**All stats are engine-surfaced only.** The panel does not invent
stats. Values come from the engine's end-state and event stream —
the same data the replay viewer consumes. The exact list of
scenario-specific stats per scenario comes from the scenario spec;
this spec describes the surface, not the content.

For **score-resolved** outcomes, the score itself is surfaced as
part of the stats — the player who won or lost by score should be
able to see the score that decided it. Exact placement (alongside
core stats or as a dedicated emphasis line) is for the build to
determine.

Bottom of the right half:

- **Continue button** — a single button. Closes the end-of-scenario
  screen and returns the player to wherever the world-loop screen
  is (when that exists — see §0 quarantine note below). For now,
  Continue returns to the scenario selection or main menu, whatever
  the build provides as the post-scenario destination.

## Animation

The stats list animates in. The animation is brief and contributes
to the moment without slowing the player down.

**Per-line animation:**

- Lines appear one at a time, top to bottom.
- Each line's label appears first, then the numeric value
  count-up animates from 0 to its final value over roughly half a
  second.
- The next line begins shortly after the previous line's value
  settles — so the total animation runs as a cascade, not all at
  once and not sequentially-slowly.

**Pacing.** Total count-up animation should complete in 3-5 seconds
for a typical stats list (5-7 lines). Long enough to feel
intentional, short enough that the player isn't waiting.

**Skip.** Clicking anywhere on the right half during the animation
immediately resolves all stats to their final values. The Continue
button becomes active. The player who has seen this before and
just wants to move on can.

**No animation on the left half.** The graphic is static. It's
visible from the moment the screen appears and stays as is.

## Outcome reveal timing

When does the player see the screen?

Engine-resolution-time and UI-reveal-time are distinct. The engine
determines a scenario has ended at the moment the deciding event
resolves; the screen does not appear until the UI has finished
animating that deciding event. Specifically:

- If the deciding event is a **combat** (e.g., the queen is wiped),
  the battle mode panel plays through normally — auto-paused per
  the battle-mode spec, with skip controls available. Only after
  the battle panel exits does the end-of-scenario screen appear.
- If the deciding event is a **mission timeout** or a **score-
  resolved cap-hit**, the deciding turn's animation completes (any
  movement, any combat on that turn) and then the screen appears.
- The cube view does _not_ return to interactive playable state
  between the deciding event and the end-of-scenario screen. The
  player isn't briefly handed control back only to have it taken
  again.

Same principle the main screen spec applies to Clear-order and the
battle-mode spec applies to combat timing: engine resolves at turn
granularity, UI animates the resolved sequence, and the player sees
each beat play out before the next surface takes over.

Once the screen appears, the graphic and the scenario name +
outcome label + resolution path are visible from the first frame.
The stats list animation begins immediately after — no delay before
the first line.

The Continue button is greyed/inactive during the stats animation
and becomes active when the animation completes or the player
clicks to skip.

## States

Few states.

1. **Animating.** Stats counting up. Continue inactive. Clicking the
   right half skips to final values.
2. **Settled.** All stats at final values, Continue active.
3. **Closing.** Player clicked Continue. Screen fades out.

## Interactions

| Action                            | Result                                             |
| --------------------------------- | -------------------------------------------------- |
| Click right half during animation | Skip to final values, Continue active              |
| Click Continue (settled state)    | Close screen, advance to post-scenario destination |
| Click left half graphic           | Nothing — graphic is decorative                    |

The screen does not support replaying the run, exporting the run,
sharing the run, or any other action beyond Continue.

## Forward dependency: stalemate variant

Per pacing memo §D, the stalemate-terminal is OPEN. Until it
resolves, the resolution paths the screen can present are the three
current paths (decisive, mission timeout, score-resolved) producing
Victory or Defeat. Stalemate is reserved.

§D needs the following decisions before the variant is fully
speccable:

- **Scope.** Which scenarios opt in to the stalemate terminal. L1 is
  permanently exempt per §A.3. Which other scenarios opt in is part
  of what §D decides.
- **Detector predicate.** What engine signal indicates stalemate has
  occurred (the cap-hit-without-decisive on an opted-in scenario is
  the obvious case; whether there are others is open).
- **N threshold.** If an inactivity detector fires before the cap,
  how many turns of the signal trigger the terminal.
- **Outcome label copy.** "Stalemate," "No decisive result," or
  another term. The current spec uses "Stalemate" per §D's working
  vocabulary.

What this spec records now:

- **The layout accommodates the stalemate variant without change.**
  Same one-panel-two-halves structure, same left-half graphic
  (third variant needed), same right-half stats (potentially with
  stalemate-specific framing like "Time ran out — both sides
  withdrew"). Resolution path line shows "Stalemate terminal."
- **The graphic variant** for stalemate is reserved. Tone direction:
  neither triumphant nor defeated. A scene of mutual withdrawal,
  contested ground left empty, the queen retreating with her
  remaining parties. Cool neutral lighting.
- **The outcome label color** for stalemate is neutral (neither
  warm Victory nor cool Defeat).

When §D resolves, this spec is amended with the specifics — in
particular, which scenarios are opted in (so the score-resolved
path correctly remains the resolution for scenarios that don't opt
in, including L1).

## Out of scope for this view

- **Replays.** Per cube memo §B (the "one playback layer" question),
  replay handling is a separate concern.
- **Save / export of the run summary.** Not in canon. If proposed,
  separate spec.
- **Sharing / social.** Not in canon.
- **Score breakdown beyond the listed stats.** Per pacing memo §A.3,
  L1 retains a score path, but the score is computed and not
  displayed as a leaderboard. If a score display is wanted, it's a
  scenario-spec concern, not an end-of-scenario architectural one.
- **Post-scenario destination.** Where Continue takes the player
  depends on the world-loop screen, which is §0 quarantined. This
  spec specifies that Continue closes the screen and hands control
  to the post-scenario destination; that destination is now named
  by `docs/ui-hill-hub-spec.md` (the Hill hub), though the
  world-loop screen itself remains owned by that spec, not this one.
- **Retry from end-of-scenario.** Not specced here. If a "retry
  this scenario" affordance is wanted, it joins the Continue button
  in a small action row; layout supports it. The verb itself is a
  gameplay/world-loop decision, not a UX one.

## Forward dependencies (not silent gaps)

- **Stalemate variant** — pacing §D OPEN. See above.
- **Post-scenario destination** — **now specified** by
  `docs/ui-hill-hub-spec.md`: Continue returns to the Hill hub
  (reciprocal of that spec's "End-of-scenario Continue destination"
  resolution). This spec still does not own the world-loop screen
  (§0); it hands control to the Hill hub as the named destination,
  and the Hill spec carries the world-loop gameplay-review deps.
- **Per-scenario graphic library** — whether each scenario has its
  own win/defeat graphic or there is a shared library is a build
  decision and depends on art-direction work that is §D deferred.
  The layout supports either.
- **Score path for L1** — pacing §A.3 retains a score on L1 only.
  Whether the end-of-scenario screen surfaces it visibly is a
  scenario-spec concern; this spec leaves room for a "score" line
  in the scenario-specific stats area if needed.

## Open questions

1. **Graphic library scope.** One graphic per outcome (3 graphics
   total, reused across all scenarios) vs. one per scenario per
   outcome (3 × 10 = 30 graphics)? Recommend a small per-room
   library (3 graphics × 4-5 rooms = 12-15 graphics) for v1, so
   bathroom scenarios share a bathroom-themed win graphic, kitchen
   scenarios share a kitchen one, etc. Less art work than per-
   scenario, more grounded than a single universal graphic.

2. **Stats list ordering.** Top-to-bottom order of the stats lines.
   Recommend: outcome-relevant first (POSTs captured on conquest
   scenarios; escort target health on L2; spiders remaining on L6),
   then kills, then parties lost, then turns elapsed. The "why did
   I win/lose" stat goes first.

3. **Color treatment of outcome labels.** Warm for victory and cool
   for defeat is the recommendation, but specifics (greens vs.
   golds for victory, blues vs. greys for defeat) are deferred to
   visual direction work per cube memo §D.

4. **Continue button label.** Just "Continue" is the default.
   Alternatives — "Return to map," "Next scenario," "Back" — depend
   on what the post-scenario destination is. Recommend "Continue"
   for v1 since it's destination-agnostic.

5. **Animation skip behavior on second viewing.** Should the
   animation auto-skip if the player has seen this screen before
   (e.g., on a retry)? Recommend no — the animation is brief enough
   that re-running it isn't a burden, and "this run resolved in 3
   seconds of animation" is consistent. Click-to-skip is always
   available.
