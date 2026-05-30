# Design session brief — battle screen takeover + digestibility

**From / To / Status:** Dev (Gameplay/UX) → Design (UX) / **Kickoff brief.**
Routed via the change-request protocol; design output is expected as one
or more Template-A exchanges with explicit acceptance against §6 below.

**Stance:** L1 UI-compression bundle has landed (PRs #67–#75). Engine
is **locked** for this CR — no new sim surface, no new mechanics, no
new modifiers. UI works within the existing `BattleResult` shape (round
→ action stream + participant HP snapshots + modifier stack from
PR #60). A companion **pacing PR** (Chunk 18) ships in parallel that
slows the existing rail-panel beat from per-round to per-action; this
brief is about **layout and presentation**, not pacing math.

---

## 1. Project context (one-screen orientation)

**boa-foodfight** is a turn-based ant-vs-spider strategy game on a cube
("the bathroom") with six 10×10 planes. The current scenario screen:

- **Splayed cube view** — active face center, four edge-docked
  peripherals, click-to-rotate.
- **Right rail (control / info column)** — turn-status header pinned
  at top; below it, a stack of {`CombatPanel` (when a battle is
  active) · `PartyDetail` (when inspecting) · always-visible
  feed at the bottom}.
- **Battle camera** (PR #69) — when a battle resolves, the cube
  auto-rotates to the contested face and zooms onto the defender's
  tile. The `CombatPanel` slides into the rail.
- **Battle play-by-play in the feed** (PR #74) — `battle-resolved`
  events fan into header + per-action ("Round 2: Ant footman attacks
  Spider soldier for 3 damage (4/7 HP).") + tally lines.

This works well for **post-mortem reading** of a battle. The case this
brief addresses is the **live experience** of a battle as it resolves.

---

## 2. The problem (PM, verbatim)

> The whole game is about battles and how they resolve; did we set up a
> good set of soldiers against the enemies and plot them across the
> board in such a way that they were successful despite the sides being
> balanced? That's the crux of the game. So the battle is what tells
> the player whether there is an advantage to one formation, position,
> etc, than another. It needs to be interesting to watch. And this is
> not a graphics problem or a content problem. The graphics are at a
> fine level and the content is here. It's just very hard to digest.

The diagnosis is **legibility and focal weight**, not fidelity:

- The `CombatPanel` lives in the right rail at ~280 px wide. It's
  one of three competing things in that rail. When a battle is the
  thing the player is supposed to be reading, it is structurally
  one column among many.
- The cube board still dominates the visual field, but during a
  battle nothing on the board is changing (auto-paused). The player's
  attention is asked to leave the dominant surface and read a
  cramped sidebar.
- The per-action prose in the feed is _below_ the panel, so the
  player can't easily pair "Round 2: footman attacks soldier for 3"
  with "soldier HP bar drops from 7 to 4" in one glance.

---

## 3. Reference: Ogre Battle (the PM's mental model)

PM supplied two SNES Ogre Battle screenshots in the chat to anchor
the conversation. Local-agent action: stash them at
`docs/test-feedback/battle-screen/ogre-battle-{1,2}.png` so the
design session can cite them directly.

Salient features in those shots the PM wants us to match _in
structure_, not graphics:

- **Battle is its own screen.** The world map disappears; the
  battlefield takes over.
- **Two compact unit panels** (one per side) in top-right + bottom-left
  corners. Each shows: unit silhouette/glyph, HP bar, current HP
  number. Leader marked.
- **Center stage** is the action: damage numbers pop over the
  unit being hit, in sync with their HP bar tic. The eye reads
  "this unit hit that unit for N" as a single moment.
- **Round/turn happens one action at a time.** Each archer fires,
  number pops, HP drops. Then the next. Player can track who hit
  whom for how much.

PM explicit: **we do not need the troop sprites.** Use our existing
unit cards / role labels / faction colors. The structural takeaway is
the screen taking over, the dual unit panels, and the per-action
beat.

---

## 4. Engine truths the design can rely on

All present in `engine/types.ts:BattleResult` + the live `GameState`:

- `result.rounds[].actions[]` — per-round, per-action stream of
  `{attackerId, defenderId, damage, killed}`. PR #57 / #60.
- `result.participants[]` — per-unit `{unitId, templateId, side,
isLeader, hp, maxHp}` start-of-battle snapshots. Lets the panel
  compute running HP by replaying actions.
- `result.attackerCasualties[]` / `result.defenderCasualties[]` —
  final tally.
- `result.modifierStack` (PR #60) — `{plane, attacker: {attackRows,
defenseRows}, defender: {attackRows, defenseRows}}`. Currently
  shown inline at the bottom of the rail's `CombatPanel`. Decide
  in design whether it stays in the takeover (recommended:
  collapsible / corner card so it doesn't dominate the stage) or
  moves to a post-battle review.
- `result.attackerPartyId` / `result.defenderPartyId` — party
  identifiers for header strip.
- `summarizeBattle()` (`client/src/scenario/battleSummary.ts`)
  produces the **same prose lines** the feed already prints, so
  the takeover can render them in-place rather than redefining
  the narration voice.

---

## 5. What today's UI does (so the design can react)

`client/src/live/CombatPanel.tsx`:

- Stage: attacker column / VS / defender column. Each column lists
  unit cards with role label, HP bar, HP numbers, leader mark, and
  a `-N` damage flash for the round just applied.
- Pacing: one round per beat. (Chunk-18 PR is in-flight to switch
  this to one action per step at ~500 ms. Treat per-action pacing
  as the baseline the design composes against.)
- Modifier stack: collapsed block below the stage, split into
  attacker / defender columns of `±N axis` rows.
- Footer: round-of-N status + Skip / Continue controls.

`client/src/live/LiveScenario.tsx` mounts the panel inside the rail,
so today's panel **shares screen** with the cube board, the path-peek
preview, the turn header, and the feed.

`useLiveScenario.ts` already auto-pauses on `battle-resolved`, so
nothing else in the scene is animating while the panel is up — a
takeover is **safe to make modal** without losing concurrent state
the player would miss.

---

## 6. Goal of this session

Specify a **battle screen takeover** that becomes the active scene
while a battle resolves. The cube goes background (dimmed / blurred /
hidden — design call), and a dedicated battle layout takes the
foreground. Goals, in priority order:

1. **Make the battle the focal surface.** The player should not have
   to hunt for it.
2. **Pair HP movement with prose play-by-play in one eyespan.** The
   per-action prose and the HP bar tic for that action are in the
   same field of view, not in different columns.
3. **Preserve auto-pause + skip-this-combat + skip-all-this-turn.**
   The takeover is watch-mode; the player must always be able to
   bail back to the board.
4. **Compose cleanly with multi-battle turns.** Today the rail panel
   shows "Combat n of m this turn" and queues. The takeover should
   either auto-advance through the queue with a between-combat
   pause, or cycle the same surface — design call.
5. **Composes with Chunk-18 pacing.** The base per-action beat is
   ~500 ms (tunable). Design layout for that rhythm; if the design
   wants pauses _between_ rounds or _before_ killing blows, name
   them as deltas on top of the base beat.

---

## 7. Acceptance / rubric

A design proposal lands cleanly when it specifies:

- **B1 — Screen takeover trigger and exit.** When does the takeover
  enter? (engine `battle-resolved` event with auto-pause is the
  obvious hook). How does it exit? (Continue button, end-of-queue,
  esc).
- **B2 — Layout regions.** Concrete zones for: attacker unit panel,
  defender unit panel, action stage / damage numbers, prose play-
  by-play column, modifier stack (kept or moved), header strip
  (Combat n of m · attacker vs defender), footer controls.
- **B3 — Per-action beat treatment.** What animates per step? HP bar
  tic + damage flash + prose-line append at minimum. Killed unit
  treatment (grey-out timing, when the card collapses, whether the
  leader's death gets a marked beat).
- **B4 — Multi-battle turn flow.** Same surface cycles, or distinct
  inter-combat moment. Where the "Combat 2 of 4" reads.
- **B5 — Watch-mode controls.** Skip-this-combat, skip-all-this-
  turn, continue. Where they sit, when they're enabled.
- **B6 — Modifier stack treatment.** Stays in takeover (where,
  collapsible?) or moves to a post-battle review surface.
- **B7 — Cube background treatment.** Hidden, dimmed, blurred,
  letterboxed. Whether the contested tile stays visible at the
  edge of frame.

A design proposal does **not** need to specify:

- Per-pixel measurements, colors, exact font sizes — name the
  hierarchy ("attacker panel is visually equivalent in weight to
  defender panel; prose column is secondary in weight"), dev fits
  it to the existing tokens in `styles.css`.
- New animations beyond what the engine already gives us (HP-bar
  tween, damage flash, prose append, killed grey-out).

---

## 8. Out of scope

- **No new engine data.** No new participant fields, no new event
  kinds, no new modifier axes. If the design wants something the
  engine doesn't ship today, flag it as a forward dep, don't assume
  it.
- **No combat math changes.** Tuning combat duration (M3.2 in the
  playtest backlog) is a separate piece of work; this brief takes
  battle length as a given.
- **Not the world / between-scenario layer.** Hub-screen and
  recruitment UI is Phase B work, separate brief.
- **Vertex / edge battle visibility** is the previous brief
  (`l1-edge-battle-design-brief.md`); cross-reference if the
  takeover needs to surface "this fight straddles an edge," but
  don't re-litigate that scope.

---

## 9. Five directions for the session to weigh

These are starter shapes. Design is free to merge, split, or invent.

### D1 — "Ogre Battle classic" (corner panels + center stage)

Two unit-roster panels in opposite corners (attacker top-right,
defender bottom-left or similar). Center stage is the action: each
beat, an attacker glyph + arrow + damage number pops over the
defender, defender's HP bar tics. Prose feed runs as a one-line
ticker under the stage (or stacks as last-N lines down one side).
Modifier stack collapses to a corner card. Closest to the PM's
reference; biggest visual departure from today.

### D2 — "Inflated rail" (same layout, full width)

Keep today's `CombatPanel` shape (attacker column / VS / defender
column / modifier stack / footer) but inflate it from rail-width
to full-screen. The prose feed becomes a dedicated column to the
right. Cheapest dev path; preserves muscle memory; least dramatic
but least risky.

### D3 — "Stage + log split"

Top half: a quiet "stage" — two large unit cards facing each other,
HP bars, current action's flash. Bottom half: the running prose
log scrolls in real time, with the current beat highlighted.
Modifier stack pinned to a side. Closest to a tactical-sim battle
log; reads as "watch + read" rather than "watch a fight."

### D4 — "Replay scrubber"

The takeover doubles as a scrub surface. The action stream lives on
a horizontal timeline at the bottom; the player can pause and drag
back to re-watch a beat. Layout above is similar to D1/D3. Most
ambitious; turns the battle from a one-shot watch into a thing the
player can study. Probably overshoots Tier-1 scope but worth
naming so it doesn't accidentally creep in.

### D5 — "Letterbox cube" (don't take over fully)

The cube stays visible at top of frame but compressed to a banner
showing the contested face; the bottom 2/3 of the screen becomes
the battle surface. Trades focal weight for spatial continuity —
the player sees _where_ the battle is and _what_ is happening
without losing the world. Hedges between today's rail-panel and a
true takeover.

---

## 10. Deliverables

- One or more Template-A proposals against §6 + §7.
- A pick from §9 (or a merged variant) with B1–B7 specified.
- A short callout for anything the design wants that isn't in §4 /
  §5 (engine data the takeover would need — these become forward
  deps, not assumed deliverables).

Dev ratifies, then ships the takeover behind the Chunk-18 pacing
that's already in flight.
