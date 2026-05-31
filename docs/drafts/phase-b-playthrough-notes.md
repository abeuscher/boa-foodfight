# Phase B playthrough notes — tracked feedback

**From / To / Status:** PM (playtest) → Dev / Tracked-for-action.
**Stance:** Captured from PM playthrough during Phase B. Filed for
action when convenient — none are L1→L2 blockers. Items here are
not in the current critical path (B4 / B5 + the design-session
deliverables); pull from this list when those clear or when one of
these surfaces as more urgent.

---

## 1. Squad numbering on the board

**Symptom:** Hard to track which squad is going where when the player
has multiple parties in motion. Destination markers show an `x` but
no party identity, so the player has to mentally cross-reference
"that x belongs to which squad?"

**PM proposal:**

- Assign each squad a stable number (1, 2, 3, …).
- Render the number on the squad's board glyph (the pawn).
- Include the number next to the `x` on the destination marker —
  e.g. `x1` for squad 1's destination, `x2` for squad 2's.

**Engine notes:**

- Stable per-party id already exists (`PartyId`). The number can
  derive from a per-scenario party-id → index mapping computed
  client-side at scenario load (sort by id, assign 1..N). No engine
  change needed.
- Destination markers render in `client/src/live/Board.tsx` around
  the `dest` block; pawn glyphs render in the same file.

**Affects:** `Board.tsx`, possibly `LiveScenario.tsx` (for the squad
list display so it shows the number too).

---

## 2. Playback controls move to top-left

**Symptom:** Play / Pause / Step / speed buttons are below the squad
list and action buttons. The PM hits them often and wants them above
the squad list.

**PM proposal:**

- Move the playback control block (Play/Pause, Step, 0.5×/1×/2×/4×)
  to the top of the left rail — above the squad list and action
  buttons.

**Affects:** `LiveScenario.tsx` — the `control-actions` /
`control-playback` div ordering. Probably just a JSX reorder + a
small CSS tweak so the playback block reads as the rail header.

---

## 3. Ceiling light — 2×2 white square in the center

**Symptom:** When the player rotates to the ceiling face, there's no
visual anchor for which way is "up" relative to the floor below.
Spatial orientation across the cube is the player's job, and the
ceiling face is the hardest one to mentally place.

**PM proposal:**

- Render a **2×2 white square at the center of the ceiling face**
  (i.e. tiles (4, 4) through (5, 5) on the ceiling plane).
- The light **penetrates fog**: those 4 tiles are always visible to
  the player, regardless of vision / seen-tile state.
- The light **does not extend visibility past its own edges**: no
  vision aura, no adjacent tiles revealed.
- Treat as a per-scenario constant for now (L1 specifically); when
  L2+ ship with non-square or non-existent ceilings the rule can
  evolve. (L2 has a ceiling plane but it's a narrow skylight strip;
  the light may need to relocate or disappear there.)

**Engine notes:**

- Cleanest implementation: a `staticLight` map in the scenario data
  (or a hardcoded per-scenario constant on the client) that
  `computeVisibleTiles` / `Board.tsx` consult when deciding fog.
- Engine-side: the visibility module would learn about "always-
  visible tiles" as a top-up to the visible set. Pure UI-side: the
  Board could render an always-on white overlay and OR the tiles
  into its visible mask before applying fog.
- Decision: probably client-only first cut. The engine doesn't need
  to know about lighting if it's purely a fog-suppression layer.

**Affects:** `Board.tsx` (render the 2×2 light + fog override),
`visibility.ts` (fold the always-visible tiles into the visible
set), possibly `data/level-N/map.json` (declare the light per
scenario).

---

## Recording protocol

When dev picks one of these up, file it as its own chunk PR
(`Chunk N — <slug>`) and cross-reference this doc. Removing an item
from this list = a follow-up edit when the chunk lands.

PM playthrough during Phase B is ongoing; expect more notes appended
here as the L1→L2 loop closes.
