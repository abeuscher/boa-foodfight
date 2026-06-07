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

## 4. Cross-plane targeting silently stalls (no UI feedback)

**Symptom:** PM clicks a tile on the ceiling from a ground squad (or
across any two opposite planes — north↔south, east↔west). The UI
accepts the destination marker, but the squad never moves. No
warning, no "no path" indicator. Player sees a broken pathfinder.

**Root cause (engine-correct, UI-side gap):** Per
`engine/movement.ts:300-328` `tryPlaneTransition`, a cross-plane
order resolves only via one of three routes:

1. **`ant-plane-switch` ability** — same-(x, y) teleport (ant-mage in
   the party).
2. **Edge adjacency** — current plane shares a fold-edge with the
   target plane (floor↔any wall, wall↔adjacent wall, ceiling↔any
   wall).
3. **Paired POST traversal** — party stands on a POST whose
   `pairedWith` partner is on the target plane.

Opposite faces (floor↔ceiling, north↔south, east↔west) are **not
adjacent** — no shared edge. Without an ant-mage or a floor↔ceiling
paired-POST, the engine has no one-step route and `break`s the
movement loop (line 424 — "Order stalls; will retry next turn").
The party sits forever while the order sits in their queue.

Multi-turn cross-plane paths (floor → wall on turn N → ceiling on
turn N+1) work, but the engine's greedy per-turn BFS only commits to
the next step, so the player has to manually re-order the squad
each turn — which doesn't match the click-and-go model elsewhere.

**PM proposal candidates** (none implemented yet — naming for the
chunk that picks this up):

- **A — Reject the click** if no route exists. Compute
  `partyHasPlaneSwitch || edgeAnchor || pairedPostChain` against the
  selected party + target plane; if none, suppress the order and
  surface a brief "no path" hint. Cleanest UX, cheapest to build.
- **B — Show "stalled" feedback** on the destination marker when
  the previous turn's movement loop hit the `break`. Engine already
  decides this; client just doesn't surface it. Pairs well with A
  (catches the rare case where an order was issued before the path
  closed).
- **C — Multi-turn pathfinding in the UI**. Pre-compute the floor →
  wall → ceiling path at order-time and queue the intermediate
  destination. Bigger lift; defers to Path-PA work.

Recommend **A + B** as the production pair: fail fast on the click,
label any in-flight stalls.

**Engine notes:**

- The check needs `partyHasPlaneSwitch(party, templates)`,
  `edgeNeighbor(party.location, targetPlane)`, and POST-pair
  inspection. All three helpers already exist in
  `engine/movement.ts` / `engine/edges.ts`.
- No engine change needed — pure client-side reachability check.

**Affects:** `LiveScenario.tsx` (the order-commit path at the click
handler) and possibly a new shared `client/src/live/reachability.ts`
helper so the same predicate can drive the path-peek preview later.

---

## 5. AI parity audit (post-Chunk-32) — two remaining gaps

**Symptom:** PM concern, "the AI wins 60% but I can't beat L1," led to
the discovery that the AI silently exploits abilities the human had
no UI for. Chunks 24/25 (recruit), 31 (jelly self-buff), and 32 (flee)
closed the three biggest gaps. After Chunk 32 lands, a systematic
audit of every ant AI variant (`ai/baseline.ts`, `ai/flank.ts`,
`ai/turtle.ts`, `ai/rush.ts`, `ai/dive.ts`, `ai/dive-line.ts`,
`ai/baseline-v2.ts`, plus level-specific baselines) identifies what
they still emit that the human cannot. Two gaps remain.

**Confirmed parity (no gap):**

- `move-to`, `hold`, `flee`, `use-ability/recruit`,
  `use-ability/jelly-apply` — all exposed via Chunks 24 / 29 / 31 / 32.
- **Passive abilities the engine fires automatically:** `volley`,
  `mend`, `web-mend` (passive), `queen-ultimate`, `ant-plane-switch`,
  `boat-form`. No order needed; engine fires when conditions met.
- **Abilities defined in data but no AI fires them:** `brace`,
  `scout-ping`, `pheroblast`, `magic-arrow`, `phalanx-charge`,
  `venom-blast`. Either L7+ content or design stubs; not gaps the
  human is missing relative to the AI.
- **Spider-only abilities:** `web-tangle`, `web-snare`, `spin-web`,
  `spawn-spiderlings`, `hypnotize`. N/A for the ant player.

### Gap 5.A — Run posture

**Symptom:** AI variants pair `flee` orders with `posture: 'run'`
(`ai/baseline-tutorial.ts:173`, `ai/baseline-l6.ts:160`,
`ai/baseline-l8.ts:164`, `ai/capture-chain.ts:244`,
`ai/baseline.ts:fleeWithRun`, etc.). Engine combat-multipliers:

| Posture  | Attack | Defense | canRetreat |
| -------- | ------ | ------- | ---------- |
| `fight`  | 1.0    | 1.0     | **false**  |
| `defend` | 0.7    | 1.5     | false      |
| `run`    | 0.5    | 0.7     | **true**   |

`canRetreat: true` is the engine's second escape path — if the battle
is lost (not the flee roll, but the whole fight), the party
auto-retreats instead of being wiped. The AI's "flee + run" combo
gives them TWO chances to get out: succeed the flee roll, OR lose the
battle and auto-retreat.

**Human policy** (`client/src/live/humanPolicy.ts:53`): when intent
is `flee`, posture is set to `'fight'`. The flee roll still works,
but if it fails, the party fights at full attack (no defense bonus,
no retreat fallback). Human's flee is more dangerous than AI's flee.

**PM proposal candidates:**

- **A — Match AI behavior**: when the human queues a `flee` intent,
  the policy emits posture `'run'` to match. Cheapest fix, matches
  established AI convention.
- **B — Expose posture as a separate intent**: a posture selector
  alongside move/hold/recruit/jelly/flee. Adds UI surface but lets
  the player set `defend` posture on a moving party (currently only
  reachable via `hold` which also prevents movement).

Recommend **A** for first cut. **B** is a future enhancement if PM
wants finer-grained tactical control.

**Affects:** `humanPolicy.ts` — one-line change in the `flee` branch.

### Gap 5.B — Cross-party jelly-apply

**Symptom:** AI variants buff adjacent allied parties before assault
(the dive/turtle pattern: mage party stands next to assault force,
casts jelly on the assault, then both engage). Engine accepts any
ant party as the `target` of a `jelly-apply` order — no range check
(`engine/abilities.ts:handleJellyApply`).

**Human (Chunk 31)** — `canCastJelly` predicate sets target to
`selected.id` always. The mage can only self-buff. To buff the assault
force, the player would need to walk the mage party to the assault
target tile, but then the mage is the assault — it can't reach the
ally separately.

**Strategic impact:** in the baseline assault on web-guard (~20 ant
units across 4 parties vs the boss's 93 HP / 24 attack), the AI
multi-buffs the assault force for +25% attack across ~20 units —
that's the math that flips the fight. Human self-buff only multiplies
the mage party's ~6 units. Significant gap for the boss fight, smaller
elsewhere.

**PM proposal candidates:**

- **A — Co-located ally picker**: when the mage party is on the same
  tile (or Chebyshev ≤ 1 from) one or more ally parties, surface a
  target picker. Default to first co-located ally; fall back to self.
- **B — Target-range gating**: as A but use Chebyshev ≤ 1 like
  recruit (Chunk 25).

Recommend **A** with same-tile gating (no range relaxation needed —
the AI also casts at distance 0). Adds a small target dropdown or
multi-button to the action rail.

**Affects:** `LiveScenario.tsx` (button group), possibly a new small
`JellyTargetPicker` subcomponent.

---

## Recording protocol

When dev picks one of these up, file it as its own chunk PR
(`Chunk N — <slug>`) and cross-reference this doc. Removing an item
from this list = a follow-up edit when the chunk lands.

PM playthrough during Phase B is ongoing; expect more notes appended
here as the L1→L2 loop closes.
