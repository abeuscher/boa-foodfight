# Clock-playback validation — FINDINGS

**Scope:** Runtime + visual validation of PR #43 (the in-scenario real-time
clock layer that animates a recorded L1 scenario's `ReplayEvent[]`), plus a
regression pass on the Hill hub and its sub-views. This is the browser-side
validation the build sandbox couldn't do.

**Branch:** `test/hub-shell-verify`
**Date:** 2026-05-22
**Environment:** Windows 10, Node v22.15.0, pnpm 10.33.0 (via corepack), Chromium (Playwright + chrome-devtools).

**Overall read: PASS / ship-ready for what it claims to be.** The clock behaves
exactly per the auto-pause contract — playback advances at watchable beats,
auto-pauses at all 47 trigger points with the right copy, resumes past the
trigger it stopped on, Step is paused-only and single-step, and the stream ends
cleanly at "Playback complete." Zero JavaScript/runtime/`pageerror` events
across a full 1221-event walk. The Hill hub and all four sub-views still work
and currency reads **"buttons"** everywhere (including Recruit). One gate step
(`format:check`) fails, but it is a pre-existing local line-ending artifact, not
a PR regression (details below).

---

## 1. Command results

| Command                                 | Result          | Notes                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                          | ✅ pass         | Lockfile up to date.                                                                                                                                                                                                                                                                                                                                   |
| `pnpm exec playwright install chromium` | ✅ pass         | One-time.                                                                                                                                                                                                                                                                                                                                              |
| `pnpm check`                            | ⚠️ 1 step fails | `typecheck`, `gen:fixture`, `typecheck:client`, `lint`, `duplication` (0 clones), `test` (766 passed / 6 skipped), `reconcile` (0 findings) **all pass**. **`format:check` fails** — see §1a. Because the script is a `&&` chain that stops at `format:check`, I ran the downstream steps (`duplication`, `test`, `reconcile`) individually; all pass. |
| `pnpm test:client` (Playwright smoke)   | ✅ pass         | 3/3: Hill hub, Organize Army, Shop purchase. Predates the clock view (doesn't cover it) — clock validation below is manual.                                                                                                                                                                                                                            |

Relevant unit tests inside `pnpm test`:

- `client/src/clock/clock.test.ts` — **10 passed**
- `client/src/scenario/eventLabel.test.ts` — **3 passed**
- `client/src/shared.test.ts` — 11 passed

### 1a. `format:check` failure — diagnosed as a pre-existing local CRLF artifact, NOT a PR regression

Prettier reports `Code style issues found in 388 files`. Investigation:

- The flagged set is essentially **every pre-existing repo file** (engine, docs,
  data, harness, viewer …) — **not** the PR's changed files.
- **None of the PR's new/changed clock files are flagged.** `clock.ts`,
  `useClock.ts`, `Scenario.tsx`, `eventLabel.ts`, `App.tsx`, `Hill.tsx`,
  `Recruit.tsx` all have **0 CRLF pairs** (LF-clean) and pass prettier:
  `pnpm exec prettier --check` scoped to them → _"All matched files use Prettier
  code style!"_.
- The flagged files have **CRLF in the working tree** (e.g. `engine/types.ts` =
  1519 CRLF pairs, `client/src/shared.ts` = 78) yet `git status` shows them as
  **unmodified** — i.e. git stores LF; `core.autocrlf=true` produced CRLF
  working-tree copies on a checkout that predates `.gitattributes`.
- `.gitattributes` is present and correct (`* text=auto eol=lf`); it normalizes
  on a _fresh_ checkout / `git add --renormalize`, but does not retroactively
  rewrite files already sitting in the working tree.

**Conclusion:** environmental, on my Windows checkout — `format:check` would pass
in CI / on a fresh clone, and the PR introduced nothing that trips it. (This
matches the task note that CRLF "shouldn't trip it" given `.gitattributes`; the
remaining trip is stale working-tree bytes, fixable locally with
`git add --renormalize .` or a re-clone.) **Not filed as a bug.** No source
files were modified.

---

## 2. Replay fixture (what the walk should hit)

`client/src/fixtures/replay-l1.json`: **1221 events**, ends at **turn 100**
(spiders win at the turn cap — expected, the canned L1 game).

Auto-pause triggers (the event-keyed contract subset:
`post-captured` + `reinforcement-spawned` + `battle-resolved`):

| kind                    | count  |
| ----------------------- | ------ |
| `post-captured`         | 38     |
| `battle-resolved`       | 9      |
| `reinforcement-spawned` | 0      |
| **total triggers**      | **47** |

`reinforcement-spawned` = 0 is correct and expected: per
`docs/drafts/auto-pause-events.md` it sits behind a guard that is false on every
shipped scenario (keeps gate-29 byte-identical). So the live trigger universe in
L1 is the 38 POST captures + 9 combats = **47**, matching the brief's "~47."

---

## 3. Playback validation (manual, `pnpm dev:client` @ localhost:5173)

### Entry / exit ✅

- "▶ Watch L1 replay (dev)" enters a **standalone** in-scenario screen with its
  own chrome: "← End playback" header, world band placeholder + rolling event
  log, and a bottom HUD pod. **No between-scenario resource strip** is present
  (confirmed `document.querySelector('.resource-strip')` → null in-scenario).
- "← End playback" returns to the Hill with the resource strip restored
  (`120 buttons / 28 ants`). Screenshots: `01`, `02`, `05`.

### Initial state ✅

- Opens paused: `Turn 0 · 0/1221`, notification "Paused at start", `1×`
  highlighted (`active` class), Play + Step enabled.

### Play advances ✅

- Pressing Play flips the button to "⏸ Pause", the readout climbs
  (`Turn N · K/1221`), the now-playing line and rolling log update.

### 1× pace ✅ (watchable discrete beats)

- Measured ~0.75 s/event over a clean window at 1× (and `4×` measured
  **154 ms/event** ≈ exactly the 600/4 = 150 ms the core implies via
  `MS_PER_EVENT = 600`). Discrete, watchable beats — not instant, not frozen.
  The slight overshoot at 1× vs the 600 ms nominal is requestAnimationFrame
  `dt`-aggregation when the page isn't foregrounded, not a logic issue; the 4×
  measurement lands on the nominal almost exactly.

### Speed control ✅

- 0.5 / 1 / 2 / 4× all change pace and the active button is highlighted
  (verified `active` class moves). Switching mid-playback takes effect
  immediately. 4× ≈ 8× the event rate of 0.5× as expected.

### Auto-pause — the load-bearing check ✅✅

- Playback **stops on its own** at trigger events. I drove the **entire stream**
  (1221 events) and recorded every auto-pause. Tally:
  - 38 stops with **"⏸ Paused — POST captured"**
  - 9 stops with **"⏸ Paused — Combat"**
  - = **47 total**, exactly matching the fixture's 38 `post-captured` + 9
    `battle-resolved`. Only those two notification strings ever appeared.
- Each stop is correct on all three signals (per `ui-main-screen-spec` "three
  signals for one event"): playback pauses, the notification strip shows the
  reason with the `paused` class, and the HUD shows paused (button back to
  "⏵ Play", Step re-enabled). Spot-checks:
  - First trigger at playhead **78**: `Turn 2 · 78/1221`, now-playing
    "soap-dish-1 captured by the ants", strip "⏸ Paused — POST captured"
    (screenshot `03`).
  - First combat at playhead **149**: "Battle resolved", strip
    "⏸ Paused — Combat" (screenshot `04`).
- **Resume continues past the trigger** (does not immediately re-pause on the
  same one): from the pause at 78, pressing Play advanced to the **next** trigger
  at 80 (not back to 78). Verified repeatedly across all 47 stops by an
  auto-resumer that clicked Play once per pause and always landed on a _new_
  index.

### Step ✅

- Works only while paused: advances **exactly one event** per press (0→1→2→3,
  now-playing/log update each press), and flags a trigger if the stepped event is
  one. **Disabled while playing** (verified `disabled === true` mid-play).
  Disabled at end of stream.

### End of stream ✅

- Reaches **"Playback complete."**, now-playing "Scenario over", readout
  `Turn 100 · 1221/1221`. **Play and Step both disabled** (speed buttons remain
  enabled but are inert at end — harmless). Screenshot `05`.

### Console / pageerror ✅ (zero app errors)

- Across the full 1221-event walk + all sub-view navigation, the only console
  entries were Vite HMR `[debug]` lines, the React DevTools `[info]` notice, and
  a single `[error] Failed to load resource: 404` which is **`GET /favicon.ico`**
  (the browser's automatic favicon request; the dev `index.html` ships no
  favicon). This is **not** an app/runtime error and not from the clock view —
  it is present on any page load and unrelated to PR #43. **Zero JavaScript
  errors and zero `pageerror` events.**

---

## 4. Regression pass — Hill hub + sub-views

| View          | Result | Evidence                                                                                                                                                                                      |
| ------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hill hub      | ✅     | Verb rail (Deploy disabled w/ "Briefing not built" tooltip; Organize/Recruit/Shop/System enabled), watch-replay button, scenario-context band. Resource strip `120 buttons / 28 ants`. (`01`) |
| Organize Army | ✅     | Squads (queen-guard, vanguard-alpha/bravo, pathfinders) with per-unit stats, rank buttons, inventory-backed equip dropdowns, barracks + form-new-squad. (`07`)                                |
| Recruit       | ✅     | Costs read **"buttons"** (30/30/40), recruiting Ant Footman: `120→90 buttons`, `28→29 ants`, barracks +1, notice "recruited Ant Footman (lvl 1)". (`06`)                                      |
| Shop          | ✅     | "Grasshopper — Shop", costs in **"buttons"** (40/50/45), buying Leather Pad: `90→50 buttons`, Inventory `4→5`, Leather Pad `×1→×2`. (`08`)                                                    |
| System        | ✅     | Placeholder copy renders.                                                                                                                                                                     |

### Currency = "buttons" everywhere ✅

- Resource strip, Recruit, and Shop all label currency **"buttons"** — no "gold"
  in user-facing text. The only "gold" occurrences in the client are the engine
  field name `state.gold` (rendered with a " buttons" suffix), replay event-kind
  names (`gold-earned`/`newGold`, internal, not currency labels), and an unused
  `.gold` CSS selector. None are user-visible currency labels.

---

## 5. "Not bugs" confirmed present as designed (not reported as faults)

- Cube-view world render deferred — the world band is the structural placeholder
  - event log ("Cube view deferred (look-and-feel, cube memo §D)"). ✅
- Minimal styling. ✅
- Deploy disabled (needs the unbuilt Briefing). ✅
- Canned L1 game where the spiders win at the turn cap (turn 100). ✅

---

## 6. Minor observations (non-blocking, not filed as bugs)

- **`favicon.ico` 404.** Cosmetic console noise on every load; adding a favicon
  link (or a 1×1 inline icon) to the client `index.html` would zero out the
  console. Not a regression and outside the clock layer.
- **Event-label fallthrough.** A few stream event kinds with no explicit case in
  `eventLabel.ts` (e.g. `neutral-spawned`, `post-capture-progressed`,
  `phase-changed`) render via the default `kind.replace(/-/g,' ')` →
  "neutral spawned", "post capture progressed". Readable and intentional
  (default branch exists), just less polished than the cased labels. Fine for
  this structural slice.
- **Speed buttons stay enabled at end-of-stream.** Harmless (no effect once
  `atEnd`), only Play/Step disable. Matches the code (`disabled={atEnd(state)}`
  is only on Play/Step). Noting for completeness, not a defect.

---

## 7. Screenshots

1. `01-hill-with-watch-button.png` — Hill hub with the "▶ Watch L1 replay" button.
2. `02-mid-playback.png` — mid-playback (playing, log rolling).
3. `03-autopaused-post-captured.png` — auto-paused on a POST capture (notification visible).
4. `04-autopaused-combat.png` — auto-paused on Combat.
5. `05-playback-complete.png` — end of stream, "Playback complete."
6. `06-recruit-buttons.png` — Recruit sub-view, currency in "buttons".
7. `07-organize-army.png` — Organize Army squads + equip picker + barracks.
8. `08-shop-buttons.png` — Shop, currency in "buttons", post-purchase.
