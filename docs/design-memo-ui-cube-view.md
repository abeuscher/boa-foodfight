# Design Memo — Player-Facing UI / Cube-View Interaction Model

**Status:** RECORDED. Canonical version of the UI design-session
brief, synthesized with the coding-agent engineering reconciliation
and the human's framing note. Companion to
`docs/design-memo-pacing-and-turn-cap.md`. The interaction model is
DECIDED; the gameplay assumptions the brief carried are explicitly
quarantined (see §0). A reference mockup exists in the design thread
(three-column layout, cube centered) — not committed to the repo.

---

## 0. Framing note (human, binding) — read this first

The source brief was written **while designing an interactive UI**.
In that context, statements about how a human will _play_ the game
(pre-game placement, world-loop screen scope, what a path "will do")
were written as **facts**. They are not. They are _commentary on how
future gameplay could fit the UI being presented_ — **UI-context
speculation, not gameplay rulings**. Nothing in this memo commits the
engine or the gameplay design to those mechanics. If any of them is
ever built, it goes through the normal gameplay / Gameplay-PA process
on its own merits. This memo locks the **interaction model only**.

## A. DECIDED (binding) — the interaction model

1. **Cube view.** One _active face_ rendered head-on orthographic
   top-down (the operable surface); the four edge-adjacent faces
   splayed in perspective as lower-fidelity previews; the opposite
   face hidden. Gravity is a UI convention ("whatever you face is the
   floor"), not a world fact. Click active-face tile = act; click a
   peripheral wall = rotate it to active (stylized ~250–400ms
   transition, **not** a simulated camera); click outside = deselect.
   Peripherals are previews only — never directly clickable.
2. **Per-face local coordinates.** The player works in the active
   face's local (x,y); absolute world coords never shown. **This
   already matches the engine** — every plane has its own local
   frame; `engine/edges.ts` holds the global mapping. No engine work
   for the coordinate model.
3. **Command model (Ogre-Battle, verbatim).** Two-click order: party
   → destination tile on the active face. Editable destination
   marker. **No path preview** — commit to destination, not route.
   This is a _better_ fit for the engine than a path UI: the engine
   pathfinds greedily per turn with no planned route, so a preview
   would be a promise it cannot keep. Endorsed on engine grounds.
4. **Three-column layout.** Left rail = parties roster (selected /
   idle / holding / queued-destination one-liner); center = cube;
   right rail = hover detail + pending-order confirm/clear + turn
   controls. No minimap, no path preview, no compass at v1 (all
   listed as later affordances if playtest demands).
   **SUPERSEDED (in one respect) by `docs/ui-main-screen-spec.md`:**
   the right-rail pending-order **Confirm/Clear** panel is removed —
   the destination-click is the confirm, Cancel reverts; mid-march
   orders use Re-issue / Clear-order in the party-selected action
   list. The rest of §A.4 stands. See the main-screen spec's "Right
   rail" + "Order lifecycle".
5. **Pacing controls = the UI surface of the recorded pacing memo.**
   Play/pause (spacebar + button), 0.5/1/2/4x, auto-pause-cause
   surfaced non-intrusively. Default paused on scenario start.
   Consistent with `design-memo-pacing-and-turn-cap.md` §A — no
   collision.
6. **Combat panel (Ogre-Battle, performative).** Overlay on combat
   init; front/back rows; auto-resolves; skip-to-summary. **Lowest
   risk piece — the engine already emits the exact data:** `battle.ts`
   produces the participant-HP-snapshot + per-action stream the
   replay viewer was purpose-built to consume. Liftable as claimed.
7. **The cube view does NOT require the deferred geometry refactor
   (dep #5).** It is a _rendering convention over the existing
   10×10×6 data_, and the stylized-transition (not simulated-camera)
   choice keeps it so. It is fully compatible with — and is the
   natural home of — the recorded dep-#5 "proportional rendering
   lives in the view layer" deferral. Positive reconciliation.

## B. Load-bearing reconciliation — "one playback layer"

The pacing memo recorded "one playback layer serves both replay and
live play" as an architectural win. Grounded against the shipped
viewer (`viewer/main.js`): it renders all six planes as an **unfolded
grid of separate squares** (`PLANE_GRID` / `drawPlane` / single-plane
focus mode) — _not_ the active-face+splay cube. So the claim is true
only at the **event-reduction + simulation-timing layer** (the
viewer's replay reducer already consumes exactly the right events —
scenario-start posts/obstacles, party-moved, combat stream — and that
logic is reusable). It is **not** true at the _spatial renderer_: the
cube view is a new renderer; the existing grid-of-planes viewer is
replaced by it or demoted to a dev tool. **Binding correction:** both
this memo and the pacing memo's "one layer" mean _shared event/timing
layer + a new spatial renderer_. Do not budget the cube view as
"share the existing viewer."

## C. Mockup-vs-recorded-doc fix (noted)

The reference mockup shows "Turn 4 / 30." Per the recorded pacing
memo: conquest scenarios get **no visible timer**; mission scenarios
get a _thematic_ timer (not "Turn N/M"); "30" is the stale cap (real
is 100). The brief's §5 text is correct; the _mockup_ lags. The timer
widget must reconcile with the pacing model before the mockup becomes
a spec reference.

## D. OPEN — alignment agenda (NOT decided)

Recorded so they are not silently treated as locked:

1. **Pre-game placement (brief §7) is engine work, not "only a commit
   button."** Rosters hardcode `startingLocation`; there is no
   placement phase, no player-chosen placement feeding the
   deterministic sim, no spider-AI placement + symmetric reveal.
   Quarantined per §0 — a future gameplay feature, not a UI detail.
2. **Plane-transition hint (brief §3.4)** must be driven by the
   _computable face-level fact_ — destination on a non-active face ⇒
   a transition is implied → show the gutter hint — **not** a
   path-crossing computation (greedy per-turn pathing has no planned
   route to inspect). The mockup's dashed gutter visual is right; its
   trigger is face-level.
3. **World-loop screens (brief §8)** are not all "build, not design":
   full shop + party-rearrange are deferred Phase-B _feature_ work
   (the engine shop is a deliberately minimal recruit hook today).
4. **"One playback layer" wording** in both memos to be sharpened per
   §B before either is a build spec.
5. Deferred by the brief itself (not re-opened here): visual/art
   direction, combat animation language, audio, onboarding,
   accessibility, platform/engine choice, mobile tile-size.

---

## One-paragraph summary

The cube-view interaction model is locked: one head-on active face +
four splayed peripheral previews, click-wall-to-rotate, per-face
local coords (already the engine's model), two-click no-path-preview
Ogre-Battle command model (a better fit for the greedy engine than a
path UI), three-column layout, performative combat panel (the engine
already emits exactly its data), pacing controls matching the
recorded pacing memo. It needs no geometry refactor and is the home
of the dep-#5 proportional-rendering deferral. The gameplay
assumptions the brief carried (pre-game placement, world-loop scope,
path-aware hints) are quarantined as UI-context speculation, not
gameplay rulings — recorded OPEN. The "one playback layer" win is
real only at the event/timing layer; the cube spatial renderer is
new (the shipped viewer is an unfolded-grid model). None of this
blocks the in-flight Phase-D L5–L10 builds; it is the parallel UX
track.
