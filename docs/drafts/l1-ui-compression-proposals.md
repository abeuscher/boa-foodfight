# L1 UI-compression — design proposals (Template-A set)

**From / To / Status:** Design (UX) → Dev (Gameplay/Engine) / **Proposed.**
Response to `docs/drafts/l1-ui-compression-brief.md`. Three Template-A
change requests, each in the canonical shape
(`docs/change-request-protocol.md` §3) and scored against the brief's §3
rubric (Problems A / B / C + the M-NEW action-visibility ratio).
Date: 2026-05-29.

---

## Above the fold — which CR attacks what

| CR     | Title                              | Mainly attacks | Score | Clears bar?         |
| ------ | ---------------------------------- | -------------- | ----- | ------------------- |
| UI-01  | Press-and-hold path peek           | A (paths)      | 4 / breadth 1 | No (single-problem) |
| UI-02  | Battle camera — go-to-the-fight    | B + C          | 5 / breadth 2 | Yes                 |
| UI-03  | Control / Information column layout | C + B          | 5 / breadth 2 | Yes                 |

The brief's adoption bar is **total ≥ 5 AND breadth ≥ 2**. UI-02 and
UI-03 clear it on their own. **UI-01 (path peek) does not** — it is a
genuinely single-problem affordance. It is included because Problem A was
a named session target and its walk-back cost is the lowest of the three;
recommend adopting it as part of the bundle rather than scoring it as a
standalone. Flagging this honestly rather than padding its score.

- The **collision/stacking legibility** fix lives inside UI-02 as
  **Sub-fix B0**, per the PM's call that it's a sub-fix of Problem B, not
  its own problem. It's the cheapest, lowest-risk piece in the set —
  recommend it **lands first**.
- **Sequencing:** UI-02's combat play-by-play "slides into the right
  rail" — that home is created by UI-03. Ship **layout (UI-03) first**,
  then the camera (UI-02), with Sub-fix B0 ahead of both.

---

# Change Request: Press-and-hold path peek

**From / To / Status:** Design (UX) → Dev / Proposal — awaiting cost/feasibility read
**Blocking:** non-blocking, batched

## Solving for

The player should be able to see **where a squad will go** when ordering,
**how far a multi-turn march has progressed**, and review a **queued
route** — without the UI making a promise the greedy engine can't keep
(cube memo §A.3 "commit to destination, not route" is locked).

## Proposed change

Two additions, scoped deliberately so neither becomes a persistent
route-promise:

1. **On-demand peek (future, provisional).** While the player **holds**
   the pointer down — on a selected squad, or on a candidate destination
   tile mid-order — draw a faint, dashed best-guess route to that tile.
   On **release**, it vanishes.
2. **Past trail (history, persistent).** A marching squad shows
   breadcrumbs of tiles it has **actually traversed** — resolved history,
   so it is safe to keep on screen.

**Not changing:** the locked two-click order model; the destination
marker (stays as today); no always-on predicted route; no valid-tile
range glow.

## Why

Today the board draws only the squad and its destination X; the player
mentally interpolates the route and can't read march progress. A
held-then-released peek is a momentary best-guess, not a drawn
commitment, so it respects §A.3; the past trail is fact, not prediction.
Bonus: holding over an empty tile *before* committing turns the gesture
into a planning aid (M2.4 decision-pull).

## Mockup / sketch

```
Pointer NOT held:                Pointer HELD (peek):
┌───┬───┬───┬───┐                ┌───┬───┬───┬───┐
│ A │   │   │   │  dest X        │ A·│ · │ · │   │   · = faint dashed
├───┼───┼───┼───┤  shown;        ├───┼───┼───┼───┤   provisional route
│   │   │   │   │  route NOT     │   │   │   │ ·│
├───┼───┼───┼───┤  drawn        ├───┼───┼───┼───┤
│   │   │   │ X │                │   │   │ ·│ X │
└───┴───┴───┴───┘                └───┴───┴───┴───┘  (gone on release)

Marching squad (persistent past trail = resolved history):
   A° ° °→●     ° = has been here   ● = now   X = destination
```

## Rubric score (brief §3)

- **A — 3 (decisive).** Route, progress, and queued-order review all
  become directly answerable at the player's eye-level.
- **B — 0.** No effect on battle visibility.
- **C — 1 (marginal).** Preview-before-commit keeps the eye on the board.
- **Total 4, breadth 1** — honest single-problem affordance (below bar;
  see above-the-fold).

## Engine truths consulted

- `party-moved` events (`from`/`to` per step) — source for the **past
  trail**; resolved history, safe to draw.
- `Party.orders` `move-to` + client `live.orders` map — destination
  marker, already rendered in `Board.tsx`.
- Greedy BFS over a per-target distance map (`movement.ts`
  `pickBfsStep`); engine stores **no** route object → the *future* peek
  is **computed client-side** and is provisional (can change if a webbed
  tile / obstacle / party shifts the map). This is why it's hold-only and
  styled provisional.
- Cross-plane destinations traverse edges/paired POSTs (`engine/edges.ts`)
  → the peek stops at the active-face edge with the existing seam
  direction hint; no fabricated cross-face line.

## Our cost guess (please correct) + walk-back

- Client-side BFS helper mirroring `pickBfsStep` (brief §4 anticipates
  dev writes this); one press/hold gesture branch in the board's click
  logic; two additive overlays (peek + trail).
- **Walk-back: low.** Additive overlays + one handler; revert = today's
  marker-only behavior, no state-model change.

## What we want back

Decision | counter | decline. Specific confirms:

1. Is the client-side BFS helper the intended home for the peek, and can
   it read the live distance map?
2. Hold-duration threshold vs. a modifier key — a quick click must still
   commit/select/rotate as today (`handleTile`).
3. Past trail: retention length, and does it reset on re-issue?

---

# Change Request: Battle camera — go-to-the-fight (retire the modal)

**From / To / Status:** Design (UX) → Dev / Proposal — awaiting cost/feasibility read
**Blocking:** non-blocking, batched

## Solving for

Battles **are** the game, but they resolve atomically and mostly
off-camera — the player is *told* fights happened they never saw (M-NEW
failure). And the combat **modal** is itself the worst single-view
offender the brief (Problem C) wants gone. We need battles to be the
visible headline *without* a modal takeover.

## Proposed change

Replace the full-screen combat modal with a **camera move on the board
itself**:

- On a resolved battle, the view travels to the contested square, zooms
  into a ~3×3 close-up, and the round-by-round play-by-play slides in from
  the right (into the UI-03 information rail). **Continue** slides it off
  and zooms back out.
- **Same-turn battles on the same face (simultaneous, co-planar):** camera
  **pans** square-to-square while staying zoomed; surfaces once; zooms out
  at the end.
- **Same-turn battles on different faces (simultaneous, cross-plane):**
  camera **rotates between** the faces (the rotate-then-zoom move below)
  *without resuming play* — they happened together, so playback stays
  paused across the set; zooms out once at the end. ("Pan" only applies
  within a face; you cannot slide across a fold.)
- **Across-turn battles:** view **zooms out** and play resumes between.
- **Off-screen / hidden faces:** the camera goes to the fight regardless —
  today it snaps to the face then zooms; after 3D it's the cube spinning
  into place (same choreography, more drama). Sequence the move
  **rotate-to-face (~300ms) then zoom-to-region (~500ms)** — sequential,
  so the eye registers *where* before the dive (per dev reply).
- **Skip** ("this fight" / "all this turn") retained.

**Sub-fix B0 — collision legibility (land first).** Fix how a multi-squad
tile renders: today `Board.tsx` draws only the lead squad's faction glyph
+ a faction-blind `+N`, so a **mixed-faction stack is invisible as
mixed**. Show the tile is contested (both factions present); make
selection highlight a squad even when it isn't the stack lead; have the
tooltip enumerate the stack.

**Not changing:** combat stays engine-resolved + auto-paused; the
existing `CombatPanel` content is reused as the play-by-play; the 8-second
recent-battle tile pulse stays as the "a fight happened here" post-zoom
marker. **Out of scope:** edge/vertex-spanning battles (the brief's
separate deferred CR) — B0 is **same-tile, same-face only**.

## Why

B: sending the camera to each fight makes the action the headline and
visits every battle — active, peripheral, *and hidden* face — pushing the
M-NEW ratio toward 1.0. C: the modal is gone; nothing covers the board.
Sub-fix B0 makes the collision legible before and after it resolves, so
the player watches the fight *form*, not just hear about it.

## Mockup / sketch

```
Normal play:                    Battle fires → camera dives to the square:
┌──────────────────┐            ┌───────────────┬──────────────┐
│      [cube]       │            │  ╔═════════╗  │ play-by-play │
│  active + splay   │   ──►      │  ║ 3×3 zoom║  │ R1 Footman→… │
│                   │            │  ║ ant│spdr║  │ R1 Archer →… │
│                   │            │  ╚═════════╝  │ R2 …         │
│                   │            │  (board zoom) │ [Continue]   │
└──────────────────┘            └───────────────┴──────────────┘
Multi-battle, same turn: zoom in → ▶pan▶ next → ▶pan▶ → zoom out once.

Sub-fix B0 — contested tile glyph:
   today:  [ A +1 ]   (reads as allies; enemy hidden)
   fixed:  [ A|S  ]   (both factions shown — a fight is brewing here)
```

## Rubric score (brief §3)

- **A — 0.** No effect on path display.
- **B — 3 (decisive).** Camera visits every fight incl. the hidden face
  (the M-NEW "0" → "1" case); B0 makes the collision legible.
- **C — 2 (meaningful).** Modal retired; combat plays on the board with
  the play-by-play in a persistent rail.
- **Total 5, breadth 2** — clears the bar.

## Engine truths consulted

- `battle-resolved` carries full `BattleResult` (`participants`, `rounds`,
  casualties, `retreatTo`, `modifierStack`) — everything the play-by-play
  needs already exists (PR #60); **no new engine surface**.
- `combat-init` keys off the `battle-resolved` playback position
  (`auto-pause-events.md`); the camera runs while already paused.
- Battles resolve at the **defender's tile**, both parties co-located
  there at resolution (`LiveScenario.tsx`) — the camera target and the B0
  stack.
- All same-turn battles arrive in one `TurnOutcome.events[]` → pan
  (simultaneous) vs. zoom-out (across-turn) is decidable from the stream.
- `Board.tsx` already builds `partyByCell` as a full `Party[]` but renders
  only `parties[0]` — **B0 is a pure render fix**, no engine truth at issue.
- Peripheral faces get `EMPTY_MARKS` (`CubeBoard.tsx`) so off-face battles
  can't pulse today; lifting that for a pre-cue flash is client-only.

## Our cost guess (please correct) + walk-back

- B0: pure render change in `Board.tsx`. **Walk-back: low** (restore
  lead-only draw).
- Camera: zoom/pan transitions + face-snap; reuse `CombatPanel` for
  content; lift `EMPTY_MARKS` for the pre-cue. **Walk-back: medium**
  (revert = re-present `CombatPanel` modally, drop the camera move; no
  engine changes to unwind).

## What we want back

Decision | counter | spike. Specific confirms:

1. For the flat board now, is "zoom" = CSS scale/crop onto the region
   (sequence is fidelity-agnostic for later 3D)?
2. Can pan-vs-zoom-out key off the per-turn `events[]` grouping as
   described?
3. Non-battle notable events (captures, reinforcements, promotions,
   beats) — camera treatment, or feed + tile-pulse only? **Design
   recommends feed + tile-pulse only** (battles are the headline).

---

# Change Request: Control / Information column layout

**From / To / Status:** Design (UX) → Dev / Proposal — awaiting cost/feasibility read
**Blocking:** non-blocking, batched

## Solving for

The player's attention is fragmented across board (center), actions
(right), a fast-scrolling log (bottom strip), a combat modal, and an
Inspect view that *replaces* the action rail. The brief (Problem C) asks
to "keep everything in a single view." There is unused vertical space in
both rails and a wide/short bottom band that's the wrong shape for a
scrolling feed.

## Proposed change

Give the two rails one clear job each and reclaim the bottom band:

- **Left rail = control** (everything touched): squad roster + the
  selected squad's action buttons (Move / Hold / Clear / Inspect, moved
  here so they sit *with* the squad and never get swapped away) + play /
  pause / speed / turn status.
- **Right rail = information** (everything read): the running play-by-play
  feed; the combat blow-by-blow when a fight fires (UI-02's panel lands
  here); a squad's detail/inspect read-out when inspecting.
- **Center = the world** (cube), zooms during battle per UI-02.
- **Bottom band reclaimed** → feed moves to the tall right rail (good
  shape for a stacking feed); cube gets the height.

**Not changing:** the cube geometry / click-to-rotate; the
roster/board/rail three-zone frame (this is a reflow of *contents*, not a
new layout); engine surfaces (derives from `state` + `events`).

## Why

"Touch left / read right" keeps everything on one screen with a stable
place for the eye, retires the modal and the inspect-swap, and finally
gives off-screen *non-battle* events and combat recaps a legible home —
the brief notes the current log "rolls fast… the player isn't tracking" it.

## Mockup / sketch

```
Today:                                 Proposed:
┌──────┬────────────┬──────┐           ┌───────┬────────────┬────────────┐
│roster│   [cube]   │ctrls │           │CONTROL│ THE WORLD  │ INFORMATION│
│      │            │+sel  │           │roster │ [cube]+    │ running    │
│      │            │+hint │           │+actions  splay,    │ play-by-   │
├──────┴────────────┴──────┤           │for sel│ zooms on   │ play →     │
│ play-by-play (wide strip)│           │squad  │ battle     │ blow-by-   │
│ rolls fast, can't track  │           │play/  │            │ blow / or  │
└──────────────────────────┘           │pause/ │            │ inspect    │
                                        │speed  │            │            │
                                        └───────┴────────────┴────────────┘
                                        (bottom band gone → cube taller)
```

## Rubric score (brief §3)

- **A — 0.** No direct path effect (selected-context staying put is a
  mild help, unscored).
- **B — 2 (meaningful).** The right-rail feed gives off-face captures,
  beats, and combat recaps a legible, persistent home (the surface the
  brief says the player can't currently track).
- **C — 3 (decisive).** This *is* the single-view consolidation: no modal,
  no rail-swap on inspect, no fast bottom strip; controls + context
  co-located.
- **Total 5, breadth 2** — clears the bar.

## Engine truths consulted

- Everything here derives from `state` + `events` / `recentEvents`;
  `eventLabel` already formats the feed. **No engine surface needed** —
  client layout reflow.
- Inspect content is the existing `PartyDetail`; this CR changes *where*
  it renders, not what it shows.
- `pauseReason` + turn status (`turnsPlayed`, `playing`) relocate with the
  controls and/or surface at the top of the feed (see confirm).

## Our cost guess (please correct) + walk-back

- Structural JSX/CSS reflow of `LiveScenario.tsx` (rail contents move;
  bottom band removed; `PartyDetail` renders in the right rail).
- **Walk-back: medium.** Reversible by moving blocks back, but it touches
  the main view's layout — not a one-line revert. No state/engine change.

## What we want back

Decision | counter. Specific confirms:

1. Pause-reason / turn-status home — with the controls (left) or pinned
   atop the information feed (right)? **Design leans top-of-feed**, with
   the paused *state* also on the speed control.
2. Can the bottom band be fully removed (nothing else depends on it)?
3. The top face-selector + Fog toggle are dev affordances; this CR leaves
   them untouched — confirm that's the intent.

---

## Notes / surfaced back to PM

- **Path "whose + progress" decision** is baked into UI-01 as *past trail
  persists (fact), future route is hold-only (guess)* — a designer's
  recommendation, tiny walk-back if you'd rather show less.
- **Non-battle events don't get the camera** (UI-02 confirm #3) — only
  battles travel the view; captures/beats stay as feed + tile-pulse.
  Flag if you'd want a capture to also pull the camera.
- **Edge/vertex-spanning battles untouched** — the brief's separate
  deferred CR; B0 is same-tile only.
- **Pacing (brief §9):** UI-02 is pacing-sensitive in the multi-battle
  case (pan vs. zoom-out cadence) — recommend the local visual-review
  agent feel both once built rather than settling it on paper.
- **Visual verification** can't run in this build sandbox (Playwright
  Chromium blocked, per CLAUDE.md) — once any of these land, order a local
  visual-review agent to screenshot the zoom sequence + new layout into
  `docs/test-feedback/`.
- **Format note:** these are proposals in `docs/drafts/`; per the protocol
  each adopted CR becomes its own `### Exchange #N` entry in
  `docs/change-request-protocol.md` §5 when dev rules on it.

---

## Design sign-off (response to `docs/drafts/l1-ui-compression-dev-reply.md`)

**Status:** Signed off — dev cleared to queue the implementation chunks.
Date: 2026-05-30.

All three CRs ratified as adopted. The four dev additions are **accepted**:

1. **`partyTrails` client-state accumulation (UI-01).** Accepted — a fair
   catch. The past trail reads from per-party accumulated state in
   `useLiveScenario`, not the capped shared `recentEvents` slice. Confirms
   accepted as given: BFS helper at `client/src/live/pathPreview.ts`,
   ~150ms hold, 6-tile trail, ~3s fade after arrival, reset on order change.
2. **Rotate-then-zoom ordering (UI-02).** Accepted — rotate-to-face
   (~300ms) then zoom-to-region (~500ms), sequential. Folded into the CR
   choreography above.
3. **Top-of-feed pause-reason home (UI-03).** Accepted — matches our lean;
   speed-control paused state stays on the left as redundant secondary cue.
4. **UI-02/UI-03 coordination (rail slot).** Accepted — UI-03 ships the
   right-rail slot using the existing `CombatPanel` overlay temporarily;
   UI-02 wires the feed ↔ play-by-play swap on battle auto-pause.

**One clarification added by design** (folded into UI-02 above, not a
pushback): the "simultaneous = pan" rule only holds **within a face**.
Same-turn battles on **different faces** can't be panned between — they
need a **rotate-between** move with playback staying paused across the set
(zoom out once at the end). This matters because the gameplay rubric
(M1.2) actively pushes battles across multiple planes, so cross-plane
simultaneous fights are a designed-for case, not an edge case. Dev's
rotate-then-zoom timing covers the per-fight move; this just names the
multi-fight cross-plane cadence so the camera state machine plans for it.

**Build sequence confirmed:** B0 (collision legibility) → UI-03 (layout)
→ UI-02 (camera) → UI-01 (path peek). Each its own PR/chunk; each becomes
its own Exchange entry on landing. Dev's deferred-pacing note (per-event
timing knob from PR #60, held pending OBS data) and the visual-review
plan (`docs/test-feedback/ui-compression/`) are both endorsed.
</content>
