# S1 — Layout legibility audit (L1, live scenario)

**Date:** 2026-06-10
**Branch audited:** `fix/cube-fit-and-labels` (HEAD, 37 commits ahead of
`main`) — see note below.
**Viewport:** 1440 × 900, DPR 1 (Chromium via chrome-devtools).
**Rubric:** `docs/playability-critic-rubric.md` §1 (Legibility), §2 (Operability).

> **Branch note.** The setup script says `git pull origin main`, but the
> checked-out branch `fix/cube-fit-and-labels` is 37 commits ahead of
> `main` and contains exactly the surfaces this audit targets: the
> chunk-20 "fit cube to container + perimeter labels" work (the subject
> of the 3D-splay legibility checks) **and** the merged control features
> S2 needs (Flee — chunk 32, Cast Royal Jelly — chunk 31, recruit
> feedback — chunk 29, client save/Continue — B5). Switching to `main`
> would discard all of it. I audited the current branch as the correct
> surface and flag the discrepancy here.

> **Method note.** Screenshots are full-resolution 1440×900 PNGs.
> Navigation/state-setup was driven programmatically (chrome-devtools
> `evaluate_script` dispatching real DOM clicks, which fire React's
> synthetic handlers); all judgements are against what the live app
> rendered.

---

## How the control model actually works (correcting the brief's assumptions)

The session brief assumed an **action rail on the right** with verbs
**Move / Hold / Clear / Inspect**. The shipped build differs in two ways
worth stating up front because they recur below:

1. **Action buttons live in the LEFT column**, stacked under the squad
   list — not in the right rail. The right rail (`aside.info-rail`) holds
   turn/pause status, the event feed, and the Inspect (PartyDetail)
   panel.
2. **Move is pre-armed on selection** (the brief hinted at this). The
   verbs are state-dependent:
   - _On select, no order yet:_ **Cancel / Hold position / Inspect**
     (the party is already in "pick destination" mode).
   - _After a destination is committed:_ **Move / Hold position /
     Clear order / Flee next combat / Inspect** (full set; "Move" here
     re-arms, "Clear order" cancels the committed order).

   So "Move" and "Clear" buttons _do_ exist but only appear once an order
   is in place; the brief's "Clear" is "Clear order", and "Flee" ships as
   "Flee next combat".

Neither is a defect on its own, but the right-rail assumption in the
brief does **not** match the build, and the playthrough note's wish to
relocate the playback controls is relevant (see State 3).

---

## State-by-state

### 01 — Start screen · `01-start.png`

**Pass.** Clean, centered menu. "Continue" is correctly **disabled**
with the inline reason "no save yet" (no save existed at audit start —
the client save is localStorage-backed per chunk B5). "Load Game" and
"Options" are disabled with "forthcoming" hints. No clipping, no
overflow. Version stamp `v0.0.0 · dev` bottom-left.
_Rubric:_ §1 legibility — fine.

### 02 — Briefing screen · `02-briefing.png`

**Pass.** Sgt. Antonio panel (ant glyph + name + briefing copy +
**Objective: Capture The Spider Web (ceiling)** in accent color + OK)
reads cleanly over a dimmed board. The board behind is a **single flat
face**, not the splayed cube — acceptable for a briefing backdrop.
Copy is flagged in-product as placeholder.
_Minor:_ the objective names the **ceiling** as the target — see the
operability finding below; the player cannot actually reach it.

### 03 — Live, nothing selected · `03-live-noselection.png`

**Mixed.**

- **Pass:** three-region layout reads — left squad list (pathfinders,
  queen-guard, vanguard-alpha, vanguard-bravo, each "floor · idle"),
  center splayed cube (active **floor** + four perspective walls labelled
  North-Wall / west-wall / east-Wall / south-Wall), bottom-left playback
  strip (Play, Step, 0.5× / 1× / 2× / 4×), top face tabs + Fog toggle +
  "← End scenario". Hint "Select a party — Move is pre-armed." is clear.
- **FAIL (clipping):** the right rail (`aside.info-rail`, 300px wide)
  starts at x=1228 and needs **x=1528** — it is **clipped 88px off the
  right edge** at a standard 1440 viewport. `document.scrollWidth` is
  1528 vs. a 1440 viewport → a horizontal scrollbar appears and the
  status line "Ready — issue orders, then press P[lay]" is cut off.
  This is the single most visible layout defect and it recurs in every
  live state. _Rubric §1: clipping/overflow._
- **Control-convention note:** playback controls sit bottom-left, well
  separated from the right-rail status they relate to. They stay put
  across selection changes (good — see State 4), but they're visually
  divorced from the turn/pause readout on the opposite side of the
  screen.

### 04 — Live, party selected · `04-live-party-selected.png`

**Pass (with the standing clip).** Selecting vanguard-alpha:

- The squad card highlights (cream fill); the party's tile on the floor
  gets a white selection ring (`.cell.sel`). Good dual feedback.
- Left column shows **vanguard-alpha — pick destination / "Click a tile
  on the board (or another squad to switch)." / Cancel / Hold position /
  Inspect.**
- Playback controls did **not** move when selection changed. Good.
  _Note:_ no conditional ability buttons (Try to recruit / Cast Royal
  Jelly) appear for vanguard-alpha — those are gated to mage/in-range
  parties and are exercised in S2.

### 05 — Inspect open (PartyDetail) · `05-live-inspect.png`, `05b-live-inspect-scrolled.png`

**Mixed.** The PartyDetail panel renders in the right rail and is
genuinely information-rich: Leader, **Front / Back / Reserve** unit rows
with per-unit HP (e.g. "Ant Footman 6/6", "★ Ant Scout 5/5"),
Composition summary, "Field promotion at Aggression 30 (7 candidates)",
Earned stats (Aggression / Discipline), Modifiers, Current order, Face,
and "Select a unit to inspect."

- **Content: pass** — all the §1 party-state elements are present.
- **FAIL (clipping):** because the panel lives in the same 300px rail,
  its right ~88px is **cut off** at 1440 (05 shows the real clipped
  experience; 05b is the same panel after scrolling right to read it).
  At a 10×10 roster the panel is also tall; combined with the rail clip
  this is the densest surface in the UI.

### 06 — Ordering state (destination committed) · `06-live-ordering.png`

**Pass.** After clicking a floor destination, a gold **× destination
marker** appears on the target tile and the left column switches to the
full verb set (**Move / Hold position / Clear order / Flee next combat /
Inspect**). The × is legible against the dark board. No path line is
drawn — correct per cube-memo §A.3 ("no path preview" is locked), **not**
filed as a finding.
_Note:_ in this build, selecting a party already arms Move, so State 4
("party selected") and State 6 ("ordering") are nearly the same screen;
the only delta is whether a destination has been committed.

### 07 — Battle camera + CombatPanel · **NOT REACHED** (see finding H-1)

I could not reach a battle through the live UI in L1. Across **two full
auto-played scenarios to the turn-100 cap** and a **40-turn stepped run**
with parties driven onto contested POSTs, **zero battles resolved**
(`Spiders felled 0`, `Ants lost 0` on both results screens) and the
`.combat` panel never mounted. Root cause is operability finding **H-1**
(cross-plane stall) below: every combatant (spiders) and the win-POST
live on the **ceiling**, reachable only by a cross-plane move, which
silently never executes. The CombatPanel component
(`client/src/live/CombatPanel.tsx`) is well-structured (per-action HP
tics, modifier stack, Skip/Continue), but it is **unreachable by a human
player on this branch.** No screenshot exists because no battle could be
produced; fabricating one would misrepresent the build.

### 08 — End-of-scenario · `08-end-scenario.png` (banner), `08b-results-screen.png` (results)

**Mixed — two distinct presentations.**

- **08, in-board banner: FAIL (legibility).** At turn 100 the live
  screen shows a _small_ text overlay tucked at the right —
  "Defeat — the spiders hold." + "Continue →" — and it is **partially
  clipped by the same rail overflow.** For the terminal outcome of a
  scenario this is under-weighted and hard to read.
- **08b, results screen (after Continue): PASS.** "L1 — The Bathroom /
  **Defeat** (color-coded) / Score-resolved" with a clean stat table
  (POSTs held, Spiders felled, Ants lost, Parties lost, Turns elapsed,
  Score ant/spider e.g. 269 / 405) and a **Back to start** button. This
  is exactly the prominent, legible outcome surface the banner is not.
- **Routing note:** the _post-game_ path is Continue → results screen →
  **"Back to start"** (returns to the Start menu, not the Hill). However,
  the _mid-game_ **"← End scenario"** control **does** route to a Hill
  home base (Deploy / Organize Army / Recruit / Shop / System) — see S2.
  So Phase B's Hill _does_ exist on this branch; it's just that the
  natural end-of-scenario flow lands on the Start menu rather than the
  Hill.

### 09 — Ceiling face active · `09-ceiling-active.png` (fog on), `09b-ceiling-fogoff.png` (fog off)

**Mixed.** Rotating to the ceiling works (face tab → active label
"Ceiling"; the four walls remain the peripherals, which is geometrically
correct).

- **Fog on (09): legibility gap.** The active ceiling renders
  **empty** — yet the event feed simultaneously narrates spiderling
  moves "on ceiling". Enemy positions are correctly fog-hidden on the
  board, but the **feed spoils those same positions in plain text**,
  which is an inconsistency between the two information surfaces (the
  board hides what the feed reveals).
- **Fog off (09b): content legible-ish.** Spiders render as red **S**,
  neutral-mice as **N**, POSTs as **◆**. The win-condition **Spider Web**
  POST sits at ceiling (9,9).
- **FAIL (POST labels):** POSTs are **never labelled on the board** —
  only a ◆ glyph; the names ("The Spider Web", "Wall Crack", "Soap Dish")
  exist **only in hover-tooltip `title` attributes.** The rubric asks
  "POST labels?" on the splay — there are none. The chunk-20 "perimeter
  labels" are _face_ labels (North-Wall, Ceiling…), not POST labels.
- **Peripheral readability:** measured, the four peripheral slots are
  compressed to **141px** in their depth dimension (active face is
  480×480 with 45px tiles; peripherals are ~14px per tile in depth).
  Pawn glyphs / POST markers on the tilted walls are effectively
  **unreadable at default viewport** — you must rotate a wall to active
  to read it.
- **Cube vertices:** at the layout level the slots are flush
  (active 565–1045 × 232–712; top/left/right/bottom edges abut exactly).
  Visible dark **seams** at the corners come from the `rotateX/Y`
  transform, not from layout gaps — so "vertices meet cleanly"
  structurally; the seams are cosmetic.

---

## Console

No console errors or warnings across the entire session
(`list_console_messages` filtered to error/warn → none).

---

## Punch-list (by severity)

### High

- **H-1 — Cross-plane move is silently accepted but never executes
  (operability, §2).** Selecting a floor party, rotating to the ceiling,
  and clicking a ceiling tile **commits a normal-looking order** (gold ×
  marker, verb set switches to "Move/Clear/…") with **no error and no
  signal it is unfulfillable.** Stepping 10 turns, the party never
  leaves floor (0,1) — it stalls in place. Because L1's **objective is on
  the ceiling** and **all combatants are cross-plane**, this makes the
  **win condition and all combat unreachable by a human player**, and is
  the direct cause of State 07 being unreachable. The underlying stall is
  logged (chunk 28); the _interface_ defect is the **silent acceptance** —
  the order layer should refuse the order, or surface a "cross-plane
  movement unavailable / use the gutter" affordance, rather than
  pantomime a normal move. _Reproduced: 1/1 attempts (10-turn trace)._

- **H-2 — Right rail is clipped ~88px offscreen at 1440 (clipping, §1).**
  `scrollWidth` 1528 > 1440 viewport. The rail's status line, feed, and
  the PartyDetail panel all lose their right edge and require horizontal
  scrolling. Present in **every** live state (03, 04, 05, 06, 08, 09).
  The center cube is fixed at ~762px wide (141+480+141) and is not shrunk
  to coexist with the 300px rail + left column inside 1440. _Reproduced:
  every live frame._

### Medium

- **M-1 — Terminal outcome banner is small and clipped (legibility, §1,
  State 08).** The in-board "Defeat — the spiders hold / Continue" banner
  is under-weighted and partially under the rail clip. The good results
  screen is one click away, but the first thing the player sees at
  scenario end is the weakest version of it. _Suggest:_ promote the
  end-banner to a centered modal, or route straight to the results
  screen.
- **M-2 — POSTs are unlabelled on the board (legibility, §1, State 09).**
  Capturable POSTs — including the **win-condition Spider Web** — show
  only a ◆ glyph; names are tooltip-only. A player scanning the cube
  cannot identify which ◆ is the objective without hovering each one.
  _Suggest:_ short on-tile/perimeter POST labels (at least for the
  objective POST), consistent with the chunk-20 face-label overlay.

### Low

- **L-1 — Peripheral-face content unreadable at default viewport
  (legibility, §1, State 09).** Walls compress to ~141px depth (~14px per
  tile); pawn glyphs and POST markers on tilted faces can't be read until
  rotated to active. May be working-as-designed for "preview" peripherals,
  but the rubric's "can you read content on the four tilted faces?" is a
  **no** today.
- **L-2 — Feed vs. fog inconsistency (legibility, §1, State 09).** With
  fog on, the board hides enemy positions while the event feed prints
  them ("spiderling-3-0 moved … on ceiling"). Either the feed should
  respect fog, or this is a dev-omniscient feed that should be flagged as
  such.
- **L-3 — Playback controls are divorced from the status they drive
  (control conventions, §1, State 03).** Play/Step/speed sit bottom-left;
  the turn/pause status they control sits top-right (and is clipped).
  Matches the playthrough note's wish to relocate them. Cosmetic but
  affects scan path.
- **L-4 — Brief/build mismatch (informational).** Action verbs are in the
  **left** column, not a right action rail; "Clear" is "Clear order",
  "Flee" is "Flee next combat"; Move is pre-armed. Flagged so the brief
  and the build can be reconciled.

### Not filed (out of scope / working-as-designed)

- No path-preview line on move orders — **locked** per cube-memo §A.3;
  not a finding.
- Cube corner seams — cosmetic artifact of the 3D transform; layout
  vertices abut exactly.
- Scene-art placeholder on the results screen ("Scene art deferred (cube
  memo §D)") — deferred per memo §D; not a finding.
  </content>
  </invoke>
