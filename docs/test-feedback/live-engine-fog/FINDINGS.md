# QA / visual review — PR #44: live engine-in-browser + ant fog-of-war

**Reviewer:** local browser/QA agent (real Chromium + Playwright/DevTools)
**Date:** 2026-05-22
**Branch reviewed:** `main` — PR #44 is **already merged** (merge commit `f3f5f4c`).
The two target commits are present in the history I tested:

```
f3f5f4c Merge pull request #44 from abeuscher/claude/phase4-rebalance
ab912c3 Add ant fog-of-war to the live board (visibility projection + sighting pause)
e30b707 Add live engine-in-browser L1 path (player orders → runTurn → board)
b4c8343 Add inline-SVG favicon to client to zero the /favicon.ico 404
```

Since the PR is merged, I validated the merged code on `main` (byte-for-byte the
same `e30b707` + `ab912c3` the prompt names). Flagging the branch delta so dev
isn't surprised that `claude/phase4-rebalance` is no longer the live tip.

---

## Overall verdict

**SHIP / PASS.** The live engine genuinely runs in the browser, the order
lifecycle matches the main-screen spec, all four auto-pause causes fire with the
three documented signals, and the fog projection behaves as the auto-pause draft
intends. I found **no blocking bugs and no console/`pageerror` output** across
multiple full play-throughs (including a run to the turn-100 terminal and a run
that drove ant parties into the spider cluster to force combat).

Four items are **design-judgment / product calls**, not defects — detailed in
their own section below. The most notable: the `newly-visible-enemy` pause
**re-fires when an already-seen enemy leaves vision and re-enters** (consistent
with the draft's literal wording, but worth a conscious decision).

---

## Build-sandbox parity checks (run locally)

`pnpm check` is one chained script (`typecheck && gen:fixture && … && reconcile`).
In this Windows environment the chained form fails immediately because the nested
`pnpm` invocations aren't resolvable from the script shell (`'pnpm' is not
recognized…`) — an environment quirk, not a code issue — so I ran each step
individually.

| Step                      | Result                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `typecheck` (root tsc)    | ✅ clean                                                                                  |
| `gen:fixture`             | ✅ regenerates l1.json                                                                    |
| `typecheck:client`        | ✅ clean                                                                                  |
| `lint` (eslint)           | ✅ clean                                                                                  |
| `format:check` (prettier) | ❌ **381 files** — see diagnosis                                                          |
| `duplication` (jscpd)     | ✅ 0 clones                                                                               |
| `test` (vitest)           | ✅ **776 passed, 6 skipped = 782 total** (incl. `client/src/live/visibility.test.ts` 4/4) |
| `reconcile`               | ✅ **0 cross-file findings** (gate-29 byte-identity intact)                               |

### `format:check` — diagnosed: the known CRLF working-tree artifact, **not** a PR #44 regression

- The repo has `core.autocrlf=true`, so checkout rewrites files LF→CRLF in the
  working tree, while `.prettierrc.json` mandates `"endOfLine": "lf"`. Prettier
  therefore flags ~the entire repo. Confirmed CRLF terminators on flagged files
  (`.prettierrc.json`, `ai/baseline-l3.ts` → `file` reports "with CRLF line
  terminators").
- **PR #44's own files pass Prettier.** `prettier --check "client/src/live/*"`
  → _"All matched files use Prettier code style!"_, and no `client/src/live/*`
  file appears in the 381-file flagged list.
- Verdict: same stale-CRLF artifact flagged on the prior clock-layer review;
  no regression introduced by PR #44.

### `reconcile` = 0 (appendix sanity check)

Confirmed per the engine-truth appendix: the fog projection is read-only over
`GameState` and does not perturb deterministic replay.

---

## Per-check results

### Core live loop

| #   | Check                               | Result  | Notes                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Entry/exit                          | ✅ PASS | Hill → "Play L1 live" enters standalone chrome; "← End scenario" returns to the Hill with the resource strip (120 buttons / 28 ants) restored. No resource strip while in-scenario.                                                                                                                                                                                        |
| 2   | Order issuing                       | ✅ PASS | Select via roster **and** by clicking the board pawn both work. Move → rail shows "Pick destination / Cancel"; obstacle tiles disable in picker mode; clicking a tile sets a `×` marker and **is** the confirm (no separate Confirm button). Cancel leaves the existing order unchanged.                                                                                   |
| 3   | March                               | ✅ PASS | Stepped vanguard-alpha from (1,0) toward dest (4,4): it walks one tile/turn toward the target and **idles on arrival** (status flips moving→idle, marker reached).                                                                                                                                                                                                         |
| 4   | Hold / Clear / Queen                | ✅ PASS | Hold → status "holding", no movement. Clear removes the order. Queen-guard rail shows "The Queen holds the hill — immobile." with **no** Move/Hold/Clear.                                                                                                                                                                                                                  |
| 5   | Speed + Step                        | ✅ PASS | 0.5/1/2/4× change cadence; **Step is paused-only**, advances exactly one turn; both **Play and Step disable at scenario end** (verified at turn 100).                                                                                                                                                                                                                      |
| 6   | Auto-pause (capture **and** combat) | ✅ PASS | **Capture:** turn 3 → "⏸ Paused — POST captured" ("wall-crack-2 captured by the spiders"). **Combat:** drove ants into the ceiling spider cluster → turns 5–7 "⏸ Paused — Combat" (log: "A unit fell" ×3, "A squad lost its leader"). Both show all three signals: playback halts, notif strip shows the cause (cream-highlighted), Play button returns + Step re-enables. |
| 7   | Terminal                            | ✅ PASS | Ran to MAX_TURNS → board shows "Scenario over.", Play **and** Step disabled (speed buttons remain, which is fine). A passive (no-orders) run reaches a 100-turn stalemate; an ordered/aggressive run resolves combat earlier.                                                                                                                                              |

### Fog of war

| #   | Check                              | Result    | Notes                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8   | Three render states                | ✅ PASS   | Unseen = near-black (`#14161a`); seen = terrain dimmed (`brightness .55 / saturate .6`) with terrain + POSTs but no live enemy/neutral pawns; visible = full-bright (radius-3 Chebyshev disk per living ant party). Own ant parties always visible.                                                                                                                                            |
| 9   | Reveal on move / hide out of range | ✅ PASS   | Marching expands the visible/seen footprint (entry vs mid-march screenshots). Actors render only on currently-visible tiles (`Board.tsx`: `parties = cellVisible ? … : []`); when a party leaves an ant's range the tile drops to "seen" and the pawn disappears — directly evidenced by the turn-9 re-sighting (the trigger requires the enemy to have first dropped out of the visible set). |
| 10  | "Enemy sighted" auto-pause         | ✅ PASS\* | With fog on, first sighting of a non-ant party auto-pauses with "⏸ Paused — Enemy sighted" (verified standalone at turn 9 with no capture/combat in that turn's log). \*Re-fires on re-entry — see design-judgment item.                                                                                                                                                                       |
| 11  | Fog toggle                         | ✅ PASS   | Header "Fog on/off": off → entire plane fully revealed (terrain everywhere, all on-plane actors); on → fog returns. No desync; board stays consistent across toggles.                                                                                                                                                                                                                          |

### Console / errors

Clean across every play-through. Only messages present:

```
[debug] [vite] connecting...
[debug] [vite] connected.
[info]  Download the React DevTools for a better development experience: …
```

No errors, no `pageerror`, **no `/favicon.ico` 404** (favicon fix `b4c8343` confirmed).

---

## Design-judgment opinions (the open calls)

### 1. Vision radius (`ANT_VISION_RADIUS = 3`, Chebyshev) — _lean keep, consider 2_

On a 10×10 plane, radius-3 Chebyshev reveals a 7×7 = **49-tile disk** for a
centered party — roughly **half the plane per scout**. At a corner it's 16
tiles. With the 4 starting ant parties stacked at the home corner the whole home
quadrant is lit, which reads well for orientation; but a _single_ advanced scout
revealing half the board feels generous and bleeds the fog tension.

- **Metric:** keep **Chebyshev**. The square reveal matches the grid and reveals
  diagonals naturally; Manhattan's diamond would look odd on a top-down square
  board and hide corner tiles the player intuitively expects to see.
- **Number:** **2 (5×5 = 25 tiles)** would give meaningfully more fog tension and
  make scouting a real decision; **3 is acceptable** if the design wants generous,
  forgiving visibility for the L1 tutorial. I'd ship 2 for a 10×10, revisit per
  plane size later. (Strictly a knob, as the module note says.)

### 2. Auto-plane-switch on party select — _correct call, keep_

Selecting a party (roster or pawn) switches the active plane to hers. In L1 all
ant parties start on the floor, so this is invisible for the starting roster —
**but it does fire** once an ant transits to a wall/ceiling (I saw it when
selecting parties that had marched to the ceiling: selecting jumps you to that
plane). For the structural board this is the right convenience: it takes you to
where your unit actually is, and the manual plane buttons remain for free
inspection. The cube's "deliberate-rotation" discipline is cube-specific and
doesn't apply to a flat plane-selector. **Keep auto-switch.**

(Verified the inverse is _not_ true and is correct: clicking a **plane button**
does **not** change the selected party — selection survives plane changes.)

### 3. Legibility at current cell size (~36 px) — _mostly good; two small nits_

- **Faction glyphs:** distinguishable by **both** letter and color — A ant gold
  `#f0c060`, S spider salmon `#e88080`, N neutral light-grey `#c8c2b4`. Good.
- **POSTs:** `◆` owner-tinted (ant `#e0a23a`, spider `#d06a6a`, neutral `#9a958a`)
  with a capture pip `1/2` (`0.55rem`). Readable but small; the pip is tiny.
- **Nit — destination markers:** the `×` is a small bottom-right corner glyph.
  The selected party's marker is gold/bold (`.dest.mine`, `#e7c97a`) and fine; a
  **non-selected** party's marker has no color override, so it's easy to miss.
  Consider a faint tint for non-mine markers too.
- **Nit — seen vs unseen contrast:** "seen" (dimmed terrain) vs "unseen"
  (`#14161a`) is present but **subtle** on darker terrain tiles. Widening the gap
  (e.g. a hair more brightness on seen, or a faint border) would make the
  explored/unexplored boundary read at a glance.

### 4. "Seen" POST owner freshness — _minor intel leak; acceptable for L1, flag for later_

Confirmed the cheat the prompt flagged: `Board.tsx` builds POST cells from the
**current** `state.posts`, gated only on `cellSeen`. So an explored-but-not-
currently-visible POST shows its **live** owner/capture state — if a spider flips
a POST on a tile the ant once explored but can't currently see, the player sees
the ownership change with no vision there. For the all-cues-on L1 tutorial this is
arguably helpful (less confusion), but it is a real fog-fidelity leak. If fog
fidelity matters later, snapshot POST owner at last-seen time. **Not a bug; note
for product.**

---

## The one behavior to decide on (not a bug, but flagging loudly)

**`newly-visible-enemy` re-fires on re-entry.** `useLiveScenario.ts` computes the
trigger as a per-turn delta of visible non-ant party IDs (`after` minus `before`):

- Enemy **continuously** visible across turns → in both sets → does **not**
  re-fire. ✅ (satisfies the prompt's "not repeatedly for an already-seen enemy".)
- Enemy that **leaves** an ant's vision and **re-enters** → counts as "not visible
  at the start of the turn, visible at the end" → **re-fires**.

I reproduced this: neutral-stinkbugs was sighted at turn 3, drifted out of the
idle scout's radius, and re-entering at turn 9 produced a fresh "Enemy sighted"
pause. This **matches the draft's literal definition** ("an enemy party visible to
the ant player that was not visible at the start of the turn"), so I'm classifying
it **PASS / by-design** rather than a defect. But if an enemy hovering at the
vision boundary produces repeated pauses, it could feel noisy. If "first sighting
ever" was the intent, switch the comparison basis from per-turn `visible` to an
ever-`seen`-enemy set. **Product call.**

---

## Bugs with repro steps

**None blocking.** For the record, one thing that looked alarming mid-session but
is a **test-harness artifact, not a product bug**:

- While clicking plane/fog/roster buttons by stale element IDs _during active
  playback_, the board re-renders every turn and reassigns those IDs, so a couple
  of my automated clicks landed on the wrong element (Play/Pause), advancing the
  turn unexpectedly. Re-tested deterministically with live state reads: plane
  switching does not advance turns and does not change selection. No product
  defect — just noting why an earlier observation about "turns jumping while
  paused" doesn't hold up.

---

## Screenshots (`./shots/`)

| File                             | What it shows                                                         |
| -------------------------------- | --------------------------------------------------------------------- |
| `01-live-entry.png`              | Live entry: standalone chrome, fog-on initial state, home cluster lit |
| `02-order-picker.png`            | Order issuing — "Pick destination" picker state                       |
| `03-mid-march.png`               | vanguard-alpha mid-march to (4,4), expanded fog, `×` dest marker      |
| `04-autopause-capture.png`       | "⏸ Paused — POST captured" (capture auto-pause, all 3 signals)        |
| `05-autopause-enemy-sighted.png` | "⏸ Paused — Enemy sighted" (fog sighting pause)                       |
| `06-fog-off.png`                 | Fog **off** — whole floor revealed (compare vs 01/05)                 |
| `07-terminal.png`                | "Scenario over." at turn 100, Play/Step disabled                      |
| `08-autopause-combat.png`        | "⏸ Paused — Combat"; roster shows parties "fallen" on the ceiling     |

---

## Setup notes for the next reviewer

- `pnpm` resolves in the bash shell here but **not** from the npm-script shell, so
  the chained `pnpm check` aborts on its first nested `pnpm`. Run steps
  individually, or fix PATH for the script shell.
- `pnpm dev:client` serves on `http://localhost:5173/`. SEED is fixed (`SEED=1`),
  so the live run is deterministic — the turn-3 capture pause reproduces every time.
- To witness **combat**: idle ants never engage (spiders roam the walls/ceiling and
  don't reach the floor queen within 100 turns). Order vanguard parties onto the
  **ceiling** (4-spider cluster, bottom-right) — select party → Move → switch to the
  ceiling plane → click a tile there. Combat resolves within a few turns.
