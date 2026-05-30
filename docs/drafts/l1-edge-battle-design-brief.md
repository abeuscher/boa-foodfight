# Design session brief — vertex / edge-spanning battle visibility

**From / To / Status:** Dev (Gameplay/Engine) → Design (UX) / **Kickoff brief.**
Routed via the change-request protocol; design output is expected as one
or more Template-A exchanges with explicit acceptance against §3 below.

**Stance:** L1 UI-compression bundle has landed (PRs #67–#71 — B0
collision legibility, UI-03 column layout, UI-02 battle camera, UI-01
path peek, Chunk-12 battle-feed expansion). The cube layout, interaction
model, and battle camera are all locked. This session is the **last
deferred UI item** from that bundle. **Engine is locked** for this CR
— no new sim surface, no new mechanics; UI works within the existing
edge / paired-POST / plane-switch surface.

---

## 1. Project context (one-screen orientation)

**boa-foodfight** is a turn-based ant-vs-spider strategy game on a cube
("the bathroom") with six 10×10 planes. The current UI:

- **Splayed cube view** — active face center, four edge-docked
  peripherals, click-to-rotate.
- **Battle camera** (PR #69) — when a battle resolves, the cube
  auto-rotates to the contested face and zooms onto the defender's
  tile. Right rail swaps the feed for the round-by-round combat
  panel.
- **Battle play-by-play in the feed** (PR #71) — `battle-resolved`
  events fan into header + per-action + tally lines so the player
  can scroll back through past battles.
- **Path peek** (PR #70 / Chunk-12 trim) — press-and-hold on a
  destination during ordering draws a faint dashed BFS preview.

What the player sees today **works well for same-tile, single-face
battles**. The case this brief addresses is when a battle **straddles
an edge or vertex of the cube** — the camera and panel collapse it to
one face, hiding the cross-plane geometry that made it interesting.

---

## 2. The problem

### Plain English

A wall-climbing ant party can move through an **edge transition**
(`engine/edges.ts:edgeNeighbor`) — a tile on the floor's boundary
maps to a single tile on the adjacent wall plane. A spider party
can do the same; spider parties also have the `spider-corner-cross`
passive that lets them traverse **wall-to-wall corners** in one step
(`isCornerCross`).

When two parties collide via an edge transition, the engine resolves
the battle at the **defender's tile** — one specific plane, one
specific (x, y). But spatially the battle is "at the edge / corner"
— the two parties came from different planes that meet at the edge.

The player's eye reads the cube's **fold** as the most strategic
feature of the geometry (the wall-crack POST mechanic + the
plane-switch ability both make this explicit). When a battle fires
at a fold, the UI collapses it to one face. The cross-plane drama is
invisible.

### Where this hurts in play

- The **camera zooms** to one face's 3×3 region but the _other_
  plane's edge tiles — where the other party came from, where
  reinforcements might arrive — are out of frame.
- The **B0 collision glyph** (`A | S`) shows which factions are
  present, but doesn't communicate _"this fight is at a vertex —
  both planes are involved."_
- **Multi-battle turns** that include an edge-spanning battle
  currently rotate to one face for it; the player loses the spatial
  context that the colliding parties came from different
  approaches.

### What's been deferred to this CR

The L1 UI-compression brief (`l1-ui-compression-brief.md` §7)
explicitly carved this out:

> Out of scope: …the vertex/edge-spanning battle visibility problem
> the PM has flagged separately — that's its own design CR after
> this session. (Acknowledged here so the design agent doesn't
> accidentally try to solve it as part of Problem B.)

UI-02's Sub-fix B0 also scoped itself "**same-tile, same-face
only**." This brief picks up where B0 left off.

---

## 3. The rubric (apply to every proposed change)

Extends the L1 iteration rubric + the UI-compression M-NEW
visibility metric. Three problem axes specific to this CR:

### E1 — Edge legibility

> When a battle resolves at an edge transition, can the player
> see that the colliding parties came from different planes?

Target: a player who pauses on an edge battle can name both
approach planes after one look at the camera + panel state. Y/N
(OBS).

### E2 — Vertex legibility

> When a battle resolves at a wall-to-wall corner (spider
> `corner-cross` passive), is the three-plane vertex visible
> (the active face plus the two contributing planes)?

Target: same as E1 but for the corner case. Y/N (OBS).

### E3 — Path-peek edge respect

> Per the UI-01 design — "no fabricated cross-face line" — when the
> player holds an edge tile as a destination, does the peek **stop
> at the edge** with a "transitions here" hint rather than
> fabricating a continuous line across a fold?

Target: the peek shows where the in-plane portion ends and
labels the transition. Y/N (visual review).

### Scoring a proposal (0–3 per problem)

| Score | Meaning                                                                 |
| ----- | ----------------------------------------------------------------------- |
| 0     | No effect on the problem.                                               |
| 1     | Marginal — fixes one edge case, doesn't change the player's eye-level.  |
| 2     | Meaningful — the player can name the difference; targets begin to move. |
| 3     | Decisive — the problem becomes a non-issue.                             |

Adoption threshold: **total ≥ 5 AND breadth ≥ 2 problems scoring ≥ 2.**

---

## 4. Engine truths the design must respect

(These are facts the proposal must accept; do not propose engine
changes.)

- **Battles resolve at one tile.** The engine emits one
  `battle-resolved` event per collision, with `BattleResult.modifierStack.plane`
  carrying the plane the math ran on (the defender's plane). There
  is **no "edge-spanning" battle kind** at the engine level.
- **Edges are geometric, not data-driven.** `engine/edges.ts`
  `edgeNeighbor(from, targetPlane)` returns the unique tile on
  `targetPlane` adjacent to `from` over the cube fold, or
  `undefined`. `isCornerCross(from, to)` detects wall-to-wall
  corner steps (spider passive only). Both are pure functions of
  TileCoord pairs.
- **`party-moved` events carry `from` + `to` per step.** A battle
  whose participants stepped across an edge in the same turn shows
  up as a `party-moved` event where `from.plane !== to.plane`. The
  client can detect "this battle followed an edge crossing" by
  scanning the turn's `party-moved` events for the defender and
  attacker partyIds.
- **The cube layout `FACE_LAYOUT`** in `CubeBoard.tsx` already
  encodes which face docks on which edge of the active face. An
  edge battle's "other plane" is one of the four peripheral faces
  (or, for wall-corner cases involving the active face's wall
  neighbors, two of them).
- **Path peek BFS is in-plane only.** `client/src/live/pathPreview.ts`
  returns `[]` for cross-plane targets and the UI explicitly states
  "no fabricated cross-face line."

---

## 5. What this session should produce

For each proposed treatment, a Template-A change request including:

1. **Plain-English description** of the visual / interaction change.
2. **Mockup or layout sketch** (text art is fine; SVG accepted in
   `docs/test-feedback/`).
3. **Per-problem rubric score** with rationale (≤ 2 sentences each).
4. **Engine truths consulted** — list the engine fields / events the
   proposal relies on.
5. **Walk-back cost.**

**Suggested directions to consider** (not exhaustive, design may
propose others):

- **Edge-aware camera target.** When the resolved battle's tile is
  on a face boundary AND the turn's `party-moved` events show a
  cross-plane traversal, the camera zooms to a region that includes
  the edge — possibly an off-center zoom that keeps the fold inside
  the visible 3×3 instead of clipping it to one side.
- **Peripheral-face highlight during edge battles.** The peripheral
  face that contributed the cross-plane party gets a temporary
  highlight (border pulse, raised opacity) so the player's
  peripheral vision picks up "the other plane is part of this."
- **Mini-inset preview.** A small inset in the active-face corner
  showing the relevant tile on the other plane — like a sub-camera.
  Trade-off: clutter vs. completeness.
- **"Edge battle" tag in the combat panel header.** The
  `summarizeBattle` output can be extended client-side with a flag
  derived from the events — show a chip / icon next to the header
  that signals cross-plane.
- **Path-peek edge stub.** When the player holds an edge tile, the
  peek draws the in-plane portion then a visual "fold marker" on
  the boundary tile (e.g., a small arrow toward the docked
  peripheral face), making explicit that the route continues on the
  other plane without fabricating tiles.

**Out of scope** (per `l1-ui-compression-brief.md` §7):

- Engine changes (no new event kinds, no per-tile cross-plane
  metadata).
- Multi-cube layouts (the splayed cube is locked).
- Modal takeovers (the modal pattern was retired in UI-02).
- 3D cube rotation animation (the current "rotate = setPlane swap"
  is the v1 visual; smoother rotation needs a real 3D pass which is
  a separate phase).
- Mobile / touch interactions.

---

## 6. Required reading

In priority order:

1. `docs/drafts/l1-ui-compression-brief.md` — the prior UI brief that
   deferred this CR; §7 names this specifically as out-of-scope
   then.
2. `docs/drafts/l1-ui-compression-proposals.md` — the design
   session's three CRs (UI-01/02/03) + B0, all merged. UI-02 §B0
   is the same-tile precedent; this CR is the cross-plane successor.
3. `docs/drafts/l1-ui-compression-dev-reply.md` — dev confirms +
   sign-off context, including the cross-plane simultaneous-battle
   cadence design added (rotate-between, playback paused across
   the set).
4. `docs/design-memo-ui-cube-view.md` — the locked interaction
   model. §A is binding; the cube's splayed geometry and the
   click-to-rotate primitive cannot change.
5. **The deployed app** — pause on a battle in a current L1 run;
   then trigger an edge battle (move an ant party to a wall plane
   via a paired POST so a spider party can intercept at the fold)
   and feel the problem first-hand.
6. **Source orientation** — `engine/edges.ts` for the cross-plane
   math; `client/src/live/CubeBoard.tsx` `FACE_LAYOUT` for the
   peripheral docking adjacency; `client/src/live/LiveScenario.tsx`
   `cameraTarget` derivation for the current camera pipeline.

---

## 7. Constraints / non-goals

- **Don't propose engine changes.** Engine is locked for this CR.
- **Don't propose new event kinds.** `battle-resolved` carries
  enough — the relevant cross-plane info is derivable from the
  turn's `party-moved` stream.
- **Don't break the rotate / two-click ordering primitives.**
- **Don't propose 3D cube animation.** The flat-splay + face-swap
  pattern is the v1; 3D is a separate phase.
- **Don't propose multi-face combat panels.** The combat panel is
  rail-mounted (UI-02 / UI-03) and stays there; visual context for
  the other plane goes on the cube, not in the panel.

---

## 8. Open question for design

The dev reply to the UI-compression bundle (Chunk 7c) recommended
**rotate-then-zoom** sequential (300ms rotate, 500ms zoom) for
hidden-face battles. **Should edge battles override that to a
"hold the rotate, zoom into the edge" treatment** — i.e., the
camera stays on the active face if the battle is at its edge, even
when the defender's plane is technically a peripheral?

Worth picking up in §5's mockups — the "right" camera target for an
edge battle may not be the defender's plane center, but the **edge
midpoint** between the two contributing planes.

---

## 9. Routing

Per the change-request protocol, drop proposals under
`docs/drafts/`. Dev (this agent) reviews + signs off via a
Template-B reply; each adopted treatment becomes its own Exchange
entry when it lands.

Questions / scope clarifications: Template-B reply to dev. PM
brokers if needed.
