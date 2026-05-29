# Design session brief — L1 UI compression pass

**From / To / Status:** Dev (Gameplay/Engine) → Design (UX) / **Kickoff brief.**
Routed via the change-request protocol; design output is expected as one or
more Template-A exchanges with explicit acceptance against §3 below.

**Stance for this phase (PM-ratified):** L1 iteration is still ongoing
(Chunks 1–6 have landed; the queen-mobility spike #2 is the last
gameplay chunk and is deliberately gated on the outcome of this UI
pass). World-loop work remains deferred. **This session is UI-only** —
no engine changes proposed, no new gameplay mechanics. The engine surface
is the constraint; the design works within it.

---

## 1. Project context (one-screen orientation)

**boa-foodfight** is a turn-based ant-vs-spider strategy game. The TBS
reference is Ogre Battle (`docs/ogre-battle-extract/`). The interaction
model is the splayed cube view (`docs/design-memo-ui-cube-view.md`
DECIDED, `docs/ui-main-screen-spec.md` RECORDED).

**What's currently live on the live site (`boafoodfight.netlify.app`):**

- Splayed cube view with active face + four edge-docked peripherals,
  click-to-rotate.
- Auto-Move on squad selection (PR #59): selecting any movable squad
  arms the next board click as a destination; switching squads
  mid-order swaps selection rather than misfiring.
- Playback controls (Play / Pause / Step / speed 0.5×–4×) on the
  right rail beside the board (PR #59); default per-event pacing is
  2 seconds at 1× (PR #60).
- Battle play-by-play panel (PRs #57 + #60): round-by-round actions
  with running HP, a per-battle modifier-stack panel below.
- Recent-battle tile pulse on the cube board for ~8 seconds after a
  resolution (PR #60).
- Party-detail panel: composition, formation rows, earned-stats bars
  (Aggression / Discipline), promotion-hint chip (PRs #61 + #62).
- Five scripted-beat / reinforcement / promotion auto-pause kinds in
  addition to `post-captured` and `battle-resolved`.

**Where the player feedback says we are:** play is now legible at the
event level — the player can pause on a battle and read the rounds —
but **what the player is _looking at_ drifts away from what the
engine is _doing_.** Specifically, three problems the PM has named
from playtest:

1. **Paths aren't shown** when they should be (during ordering, while
   a party is en route, and after a destination has been queued).
2. **Battles are "happening" without being seen** — the engine
   resolves a turn atomically; if a battle resolves on a face the
   player isn't looking at, the only signal is the notif strip / log,
   which the player isn't tracking when their eye is on the cube.
3. **The interface is fragmented** — selecting a squad opens the
   action panel; pausing on a battle opens the combat panel; ordering
   moves your attention from the rail to the board and back. The
   player's eye doesn't stay in one place.

The previous design session (`claude/compassionate-hamilton-mldWZ`)
proposed mechanic candidates and was scored against
`docs/drafts/l1-iteration-design-brief.md`. That session was
gameplay-focused. **This session is UI-only** — the gameplay surface
is locked.

---

## 2. The three problems we are solving

### Problem A — Path display

**Plain English.** When the player issues a move order, they should
see where the squad will go. While the squad is en route over multiple
turns, they should see how far it has progressed. After they queue an
order they should still be able to see the queue. Today, the engine
emits one `party-moved` event per step, but the **cube board doesn't
draw the path** — it draws the destination tile and the current
location, and the player has to mentally interpolate.

**Where this hurts in play.**

- The pathfinder is now BFS (PR #57) — squads route around obstacles.
  But the player can't see the route, only the endpoint.
- Multi-turn moves leave the player guessing how many turns until
  arrival.
- Queuing an order on plane A and rotating to plane B for another
  order hides the first squad's queued path.

**Engine truths the design must respect.**

- The engine returns `party-moved` events with `from` / `to` per
  step. Sequence is in `ScenarioOutcome.events`; live `useLiveScenario`
  exposes per-turn events.
- Pathfinding is BFS over a per-target distance map (movement.ts
  `pickBfsStep`). The engine does NOT precompute a full path object —
  it picks one step per allowance. So a "show the full route" UI
  needs the client to either replay the BFS or render the queued
  destination + intermediate breadcrumbs from past `party-moved`
  events.
- Cross-plane moves traverse paired POSTs / edges / plane-switch ability;
  these aren't an in-plane straight line.

**What this session should produce for Problem A.**

- A spec for **path display states**: queued (order issued, not yet
  resolved), en-route (resolved, more turns needed), arrived (order
  cleared).
- A decision on **whose paths the player sees** (selected squad only?
  all friendly squads on the active face? always-on or hover?).
- A treatment for **cross-plane paths** when the destination is on a
  different face.

### Problem B — Battle visibility

**Plain English.** "We are creating more action than we are showing
and that is like not how games should work." The engine resolves
movement → battles → end-of-turn atomically. Multiple battles can
fire in a single turn on different faces. The player's eye, parked on
the active face, sees one tile pulse if a battle happens there and
nothing if a battle happens elsewhere. The notif strip flashes the
event text, but at the 2-second pacing the player is mid-blink.

**Where this hurts in play.**

- Combat panel opens AFTER all of a turn's battles resolve. The
  player sees a panel that may queue 3 battles, none of which they
  saw happen.
- Battles on non-active faces are invisible until the player
  rotates over.
- Recent-battle tile pulses (PR #60) help when the player is already
  looking at the right face. They don't help when they aren't.

**Engine truths the design must respect.**

- The engine cannot "wait for the player to look." A turn resolves
  atomically and returns its full event stream.
- Each `battle-resolved` event carries a full `BattleResult` payload
  including `participants`, `rounds`, and `modifierStack` (PR #60).
- The cube has 5 faces visible (active + 4 peripherals); the 6th
  (opposite) is hidden.
- Battles happen at the defender's tile; if the battle is at an
  edge-crossing tile, both planes' edges are visually adjacent on
  the splayed layout.

**What this session should produce for Problem B.**

- A spec for **multi-battle turn surfacing**: how does the cube
  signal "3 battles this turn" before the panel opens?
- A treatment for **peripheral-face battles**: should the peripheral
  faces pulse too? Auto-rotate? Show an inset preview?
- A decision on **whether to slow turn resolution per battle** (the
  per-event pacing is currently uniform; a turn with three battles
  takes 3 × (event count) × 2s, which is long; if we slow the panel
  hand-off it gets longer).
- Optional: a treatment for **edge-spanning battles** (the vertex
  visibility problem the user has flagged separately).

### Problem C — Single-view consolidation

**Plain English.** Right now the player's attention is dispersed:

- Board (center) for spatial state
- Rail (right) for action verbs and playback controls
- Notif strip (bottom of rail) for pause reason
- Combat panel (overlay) when a battle resolves
- Party detail (replaces rail) when "Inspect" is clicked
- Log band (bottom of board) for recent events

Each of these is useful in isolation; together they fragment the
player's attention. The PM has asked: **"how can we tighten up the
interface at this graphic level to just keep everything in a single
view?"**

**Where this hurts in play.**

- The player loses track of which squad is selected when the action
  panel disappears (e.g., during Move-mode).
- Combat panel modal-takes the screen; closing it returns to a board
  the player has cognitively reset.
- The log band rolls fast at 2s pacing — readable when paused, scroll-
  blurred when playing.

**Engine truths the design must respect.**

- Engine state has a stable, queryable shape; the UI can derive any
  rendering from `state` + `events`.
- The existing per-view UI specs (`docs/ui-main-screen-spec.md`,
  `docs/ui-battle-mode-spec.md`, `docs/ui-party-detail-spec.md`)
  describe the spec-decided layout. This session may amend those
  specs but should respect their **interaction primitives**:
  two-click ordering, click-to-rotate-peripheral, single-click-to-
  select.

**What this session should produce for Problem C.**

- A **single-screen consolidation proposal** that brings the rail's
  context (selected squad, action verbs, recent events, pause reason)
  into a unified view alongside the board, ideally without modal
  takeovers.
- A treatment for **combat-during-play**: instead of the panel
  modal-blocking the board, can the combat play-by-play live in a
  designated zone (e.g., the log band, the right rail's lower half)?
- A decision on **what the rail should look like during ordering**
  — Move mode currently shows "Pick destination" but the contextual
  info disappears.

---

## 3. The rubric (apply to every proposed UI change)

This rubric extends the L1 iteration rubric
(`docs/drafts/l1-iteration-design-brief.md` §3) with a new metric
**M-NEW** that the PM has authorized:

### M-NEW — Action-visibility ratio (NEW for this rubric)

> "% of described action that's actually visible when it is described."

**Definition.** For a turn that produces N notable events (battles
resolved, posts captured, beats fired, promotions, reinforcements),
the action-visibility ratio is:

```
events that the player can attend to without rotating ÷ N
```

A battle on the active face is visible (1). A battle on a peripheral
face is "attendable" (0.5 — they can see the pulse but not the
detail). A battle on the hidden 6th face is invisible (0). Beats and
scripted callouts are surfaced by the notif strip → always visible
(1) when paused.

**Target ≥ 0.80** across a representative L1 playthrough. Below 0.5
means the player is being told things have happened that they cannot
see; that's the failure state the PM has named.

### Other rubric metrics this session should consider

From `docs/drafts/l1-iteration-design-brief.md`:

- **M3.4 Combat legibility** (OBS) — a first-time viewer can name (a)
  winner, (b) main casualty driver. The modifier stack landing in
  PR #60 should now make (b) tractable; the multi-battle pacing
  problem (B above) regresses (a) when battles flash by.
- **M2.4 Decision-pull density** (OBS) — when paused, can the player
  name ≥ 2 different meaningful things to do? Path display (Problem
  A) directly attacks this; an invisible queued path is a forgotten
  decision-pull.
- **M5.3 Recall test** (OBS) — after a playthrough, can the player
  name one non-combat moment they remember? Single-view consolidation
  (Problem C) supports this by keeping context together.

### Scoring a proposal (0–3 per problem)

| Score | Meaning                                                                    |
| ----- | -------------------------------------------------------------------------- |
| 0     | No effect on the problem.                                                  |
| 1     | Marginal — fixes one edge case, doesn't change the player's experience.    |
| 2     | Meaningful — the player can name the difference; some target metrics move. |
| 3     | Decisive — the problem becomes a non-issue at the player's eye-level.      |

Adoption threshold for any proposed change: **total ≥ 5 across A/B/C
AND breadth ≥ 2 problems scoring ≥ 2.** Identical pattern to the L1
iteration rubric.

---

## 4. Engine state the design can read

The design proposal can assume the client has access to:

- `state: GameState` — full deterministic snapshot. Includes
  `parties`, `posts`, `tiles`, `fog`, `webbedTiles`, `aggression` /
  `discipline` on parties, `firedBeats`, `firedReinforcements`.
- `events: readonly ReplayEvent[]` — the full ordered turn-resolution
  stream (live + replay).
- `pausedAt: ReplayEvent | null` — current auto-pause trigger if any.
- Each `Party` carries `orders: readonly Order[]` (the queued
  move-to destination is here) and `location`.
- Each `BattleResult` carries `participants`, `rounds`,
  `attackerCasualties`, `defenderCasualties`, `retreatTo`,
  `modifierStack`.

The design proposal does NOT need to specify path computation — the
client can replay BFS from current location to queued destination
using the existing `pickBfsStep` (or an equivalent client-side helper
the dev agent will write).

---

## 5. Required reading

In order of priority for this session:

1. `docs/design-memo-ui-cube-view.md` — the interaction model. **§A
   is binding.** The cube and two-click ordering are not negotiable.
2. `docs/ui-main-screen-spec.md` — the current per-view UI spec. This
   session may amend it; flag amendments via the change-request
   protocol.
3. `docs/ui-battle-mode-spec.md` — the combat panel spec. Problem B
   directly engages this.
4. `docs/ui-party-detail-spec.md` — the rail / detail panel spec.
   Problem C engages this.
5. `docs/drafts/l1-iteration-design-brief.md` — the gameplay rubric
   the M-NEW metric extends. Cross-reference the §3 rubric so
   proposals can be scored against both rubrics.
6. `docs/drafts/auto-pause-events.md` — how the engine surfaces
   events for the clock layer. Relevant to Problem B.
7. **Live site:** `boafoodfight.netlify.app` — play one scenario
   end-to-end before proposing. The session output will read better
   if the design agent has felt the problems themselves.
8. **Source orientation:** `client/src/live/LiveScenario.tsx` (the
   container), `client/src/live/CubeBoard.tsx` (the layout), and
   `client/src/live/PartyDetail.tsx` (the rail). Reading is optional
   but accelerates concrete proposals.

---

## 6. What we want back

Deliverable: one or more **Template-A** change requests under
`docs/drafts/` (or amendments to the per-view UI specs), each scored
against §3.

**Shape of a proposal.** Each one should include:

1. **Plain-English description** of the UI change.
2. **Mockup or layout sketch** — text-art is fine; design agent can
   author SVG if helpful (the repo accepts SVG under
   `docs/test-feedback/` per the standing arrangement). No JPEG/PNG
   mockups unless the agent can render them in-context.
3. **Per-problem rubric score** with rationale (≤ 2 sentences per
   problem).
4. **Engine truths consulted** — list the engine fields / events the
   proposal relies on.
5. **Walk-back cost.** If the player rejects the proposal after
   playtest, how hard is it to revert?

**Volume guidance.** PM prefers 3–5 substantive proposals over one
big "redesign the whole thing" pitch. We will pare down to 1–3 for
implementation.

**Out of scope.**

- New engine surfaces (events, fields, math). Engine is locked for
  this session.
- New gameplay mechanics. Gameplay is locked for this session.
- The vertex/edge-spanning battle visibility problem the PM has
  flagged separately — that's its own design CR after this session.
  (Acknowledged here so the design agent doesn't accidentally try to
  solve it as part of Problem B.)
- Mobile / touch layout. Cube view is desktop-first per `docs/design-
memo-ui-cube-view.md`.

---

## 7. Constraints / non-goals (don't propose these)

- **Don't break two-click ordering.** Select → click destination is
  the locked interaction primitive.
- **Don't propose multi-cube layouts** (all six faces simultaneously
  visible). The splayed cube is the locked geometry.
- **Don't propose "modal takeover" patterns** — Problem C is
  explicitly about reducing those.
- **Don't gate the design on engine work.** Anything that requires
  "the engine should emit a new event" goes back to the gameplay
  session, not this one.
- **Don't propose tutorial copy.** Tutorial design lives in the L0
  brief, not here.

---

## 8. Cross-references

- `docs/design-memo-ui-cube-view.md` — interaction model (DECIDED, §A binding)
- `docs/ui-main-screen-spec.md` — current per-view UI spec
- `docs/ui-battle-mode-spec.md` — combat panel spec
- `docs/ui-party-detail-spec.md` — rail / detail spec
- `docs/drafts/l1-iteration-design-brief.md` — gameplay rubric
- `docs/drafts/auto-pause-events.md` — event surface for the clock layer
- `docs/playability-critic-rubric.md` — the future playability-critic
  rubric; M-NEW is consistent with criterion 1 (Legibility) and
  criterion 4 (Pacing fitness) once those activate.

---

## 9. Open question for design (before proposing)

We're not sure how much the **2-second pacing default** (PR #60)
helps or hurts these problems. The pacing was chosen to give the
play-by-play time to read; it may also be the reason multi-battle
turns feel long. Design should:

- Note whether their proposals are sensitive to the pacing default.
- If a proposal works at one pacing but breaks at another, flag it.
- Otherwise treat 2-second pacing as the steady-state for this
  session.

---

## 10. Routing

When the session is complete, deliver proposals to `docs/drafts/` on
the design branch. Dev (this agent) will review, ratify, and build —
same workflow as the gameplay iteration session.

Questions or scope clarifications: route via Template-B to dev. The
PM will broker if needed.
