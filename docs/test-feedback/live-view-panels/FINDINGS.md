# QA / visual review — PR #46: party-detail panel, combat panel, + PR #44 fog tuning

**Reviewer:** local browser/QA agent (real Chromium + DevTools)
**Date:** 2026-05-22
**Branch reviewed:** `main` at `3ce148a` (PR #46 merge). Reviewed on a sibling
branch `test-feedback/live-view-panels`. PR #46 is **already merged**; I synced
local `main` forward (it had been parked at the PR #44 merge) before reviewing.

Covers the test plan the build sandbox couldn't run (no Chromium): the read-only
**party-detail (Inspect)** panel, the **combat overlay**, and the **PR #44 fog
tuning** (radius 2, first-sighting-only, legibility nits).

---

## Overall verdict

**SHIP / PASS.** Both new surfaces work and bind cleanly to engine-surfaced
state; the fog tuning lands exactly as specced. **No blocking bugs, no console /
`pageerror` output** across party-detail, combat, and full fog play-throughs.

One finding deserves a product/design decision (not a defect): **most L1 battles
are decided in the opening volley, so `BattleResult.rounds` is empty and the
combat panel shows them instantly** — the round-by-round animation only plays for
battles that survive into the round loop. Detail below.

---

## Build-sandbox gates (re-run locally)

| Gate                             | Result                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `typecheck` / `typecheck:client` | ✅ clean                                                                                                                       |
| `lint`                           | ✅ clean                                                                                                                       |
| `test` (vitest)                  | ✅ **776 passed, 6 skipped (782)**                                                                                             |
| `reconcile`                      | ✅ 0 findings (gate-29 intact)                                                                                                 |
| `build:client`                   | ✅ built in ~2.3s                                                                                                              |
| `format:check`                   | ❌ same repo-wide CRLF working-tree artifact (none of PR #46's files flagged) — not a regression, matches the PR #44 diagnosis |

---

## Part 1 — Party-detail (Inspect) panel — ✅ PASS

Rail gains an **Inspect** button (all selected parties, including queen-guard);
it opens a read-only panel replacing the rail.

| Check                     | Result | Notes                                                                                                                                                                                                                                                               |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open / layout             | ✅     | Banner (party id, leader role, status) + × close. Formation preview front/back/reserve, **leader starred (★)**, per-unit HP bars.                                                                                                                                   |
| Composition + modifiers   | ✅     | Real engine-surfaced modifiers only. Verified on queen-guard: **"Holding The Storm Drain" + "Terrain defense +1"** — confirms the POST/terrain lookups work (the manual tile key matches `coordKey`'s `${plane}:${x},${y}`). vanguard-alpha: "No active modifiers". |
| Current order / face      | ✅     | "Idle" / "Moving toward …" / "Holding …"; face = plane.                                                                                                                                                                                                             |
| Unit drill-down           | ✅     | Click a unit → role, `(leader)`, level, HP, **row (front/back/reserve)**, and **abilities by name + category** (e.g. queen → "Wrath of the Queen · special-attack"; footman → "Brace · buff"). Resolves names from `abilities.json`, falls back to id.              |
| Switch party clears drill | ✅     | Selecting another roster card keeps the panel open, swaps content, resets the unit drill-down to "Select a unit to inspect."                                                                                                                                        |
| Close (×)                 | ✅     | Returns to the rail (verified rail shows queen immobility hint + Inspect after close).                                                                                                                                                                              |
| queen-guard inspectable   | ✅     | Full 9-unit roster renders; immobile party still inspectable.                                                                                                                                                                                                       |

**Minor (legibility):** a 9-unit party (the queen) makes the panel taller than the
viewport, so the unit drill-down sits below an internal scroll. Not a bug; consider
compacting rows or a denser formation layout so the drill-down is visible without
scrolling.

---

## Part 2 — Combat overlay — ✅ PASS (with one product call)

Ordered vanguards onto the ceiling spider cluster (select → Move → ceiling plane →
click tile) to force combat. A combat turn auto-pauses (`battle-resolved`) and
opens the full-attention overlay over the dimmed board.

| Check                    | Result                         | Notes                                                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opens on combat turn     | ✅                             | "Combat _n_ of _m_ this turn · A vs B" strip; board dimmed; HUD shows "⏸ Paused — Combat".                                                                                                                                                                           |
| Round-by-round animation | ✅                             | Verified on the 5-round **vanguard-bravo vs web-watch** battle (Step + immediate capture): running HP bars drain, **damage flashes** ("-6", "-1"), **downed units grey out in place** (0 HP), acting unit highlighted, leaders starred. See `04-combat-midplay.png`. |
| Skip this combat         | ✅                             | Present while a battle is mid-play; jumps it to resolved.                                                                                                                                                                                                            |
| Skip all this turn       | ✅                             | Shown when _m_ > 1; dismisses the whole queue.                                                                                                                                                                                                                       |
| Continue                 | ✅                             | Advances to the next queued battle; on the last, dismisses the overlay back to the **still-paused** board (verified notif stays "⏸ Paused — Combat").                                                                                                                |
| Winner / casualties      | ✅                             | "X prevailed" + "Casualties — A: n · B: n".                                                                                                                                                                                                                          |
| `draw` → disengage       | ⚪ code-correct, not exercised | The panel renders `winner: 'draw'` as "A and B disengaged". A full L1 run (seed 1) produces **0 draws**, so this path couldn't be triggered live — verified by reading the code + an engine probe, not on screen.                                                    |

### The product call: opening-volley battles show instantly (engine-truth)

The combat resolver snapshots participant HP **after the opening volley/mend
phase**, and `BattleResult.rounds` only accumulates the **round-loop** phase
(`engine/battle.ts:878`). Battles decided in the opening volley therefore arrive
with `rounds: []` and a participant snapshot already showing the losers at 0 HP —
so the panel is `done` at mount and shows the outcome **with no animation**.

I confirmed this against the engine (probe over a full L1 run): **8 battles, only
3 had `rounds > 0`** (max 5). Every `pathfinders vs spiderling` fight is a 1-shot
opening-volley kill (`rounds: 0`) and flashes by instantly; only tougher matchups
(e.g. vs `web-watch` spider-soldiers) survive into the round loop and animate.

**This is engine-truth, not a panel bug** — the panel correctly has nothing to
animate. But two consequences are worth a product decision:

1. **The headline "play-by-play" rarely plays on L1.** A player ordering ants
   into spiderlings sees instant resolutions; the animation only appears for the
   occasional surviving matchup. Options: surface the opening volley as a "round
   0" beat so 1-shot kills still show a hit, or set expectations that decisive
   kills resolve instantly.
2. **Opening-phase damage is never visualized.** Since the snapshot is
   post-opening, volley/mend damage is invisible in the play-by-play even for
   multi-round battles (their displayed "start" HP already reflects it). The
   `BattleParticipant.hp` doc says "battle start," but it's post-opening — a
   minor naming/fidelity mismatch, engine-side, not the panel's doing.

### Forward-deps the panel flags (correctly not invented)

Per-battle **modifier stack** (terrain/POST/card/plane) isn't on `battle-resolved`
(it's combat-math input), and `BattleParticipant` carries **no front/back rank** —
both surfaced as in-panel "forward dep" notes rather than fabricated. Good
discipline; these remain design/engine decisions.

---

## Part 3 — PR #44 fog tuning — ✅ PASS (all three actioned items verified)

| Item                                        | Result | Evidence                                                                                                                                                                                                                                            |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vision radius 3 → 2 (Chebyshev)             | ✅     | `ANT_VISION_RADIUS = 2`; at turn 0 the clustered parties reveal **16 bright cells** (4×4 union) vs the larger PR #44 footprint. Noticeably tighter fog.                                                                                             |
| `newly-visible-enemy` → first-sighting-only | ✅     | Accumulating `seenEnemies` set (seeded with start-visible enemies). Passive run now produces **1 "Enemy sighted" pause** (turn 16) vs PR #44's **3** (turns 12/15/91) re-firing on re-entry. No re-pause when an enemy leaves and re-enters vision. |
| Legibility nits                             | ✅     | Non-selected destination `×` now light-blue + bold (was uncolored); **seen vs unseen contrast widened** (seen band clearly brighter than near-black unseen); capture pip enlarged. See `05-fog-tuning.png`.                                         |

Deferred items confirmed unchanged as agreed: "seen" POST owner freshness (still
shows live owner — fine for L1), auto-plane-switch on select (kept).

---

## Console

Clean across party-detail, combat, and full fog play-throughs. Only:

```
[debug] [vite] connecting… / connected.
[info]  Download the React DevTools…
```

No errors, no `pageerror`.

---

## Bugs with repro steps

**None blocking.**

Low-priority / for-awareness only:

- **Opening-volley instant resolution** (Part 2) — product decision, not a defect.
- **Party-detail scroll for 9-unit party** — minor legibility.
- **Possible 1-frame stale-"done" flash on Continue** between queued battles (the
  next battle can render with the prior beat for a frame before resetting to 0).
  Low confidence — the queue I exercised was mostly instant (`rounds:0`) battles,
  so I couldn't cleanly reproduce a visible flash on a multi-round → multi-round
  advance. Flagging only so dev can glance at the `[result]`-reset effect in
  `CombatPanel.tsx` if they want belt-and-suspenders.

---

## Screenshots (`./shots/`)

| File                              | Shows                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `01-party-detail.png`             | Inspect panel — vanguard-alpha formation/stats                                  |
| `02-party-detail-queen-drill.png` | Queen panel — 9-unit roster, "Holding The Storm Drain" + terrain modifiers      |
| `03-combat-done.png`              | Combat overlay, resolved (downed enemy greyed, casualties, controls)            |
| `04-combat-midplay.png`           | **Combat mid-animation** — HP drain, "-6"/"-1" damage flashes, acting highlight |
| `05-fog-tuning.png`               | Radius-2 vision, widened seen/unseen contrast, light-blue non-mine dest marker  |

---

## Setup notes

- `pnpm dev:client` → `http://localhost:5173/`. Deterministic (`SEED=1`).
- **To witness the combat animation** (not just instant kills): the spiderling
  fights are 1-shot opening-volley kills (`rounds:0`, no animation). The 5-round
  **vanguard-bravo vs web-watch** battle (≈turn 6 with all three vanguards ordered
  to the ceiling) is the one that actually animates — pause just before it and
  **Step** to catch it from the first beat.
