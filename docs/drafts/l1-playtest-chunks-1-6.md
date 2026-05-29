# L1 playtest measurement — post-Chunk-6

**Generated:** 2026-05-29 via `pnpm tsx harness/playtest-l1.ts`.

**Run config:** 5 seeds (1, 2, 3, 4, 5), canned baseline ant AI vs spider-l1, neutral AI for non-aligned parties. Each scenario capped at 100 turns.

Compare against the original baseline in `docs/drafts/l1-iteration-design-brief.md` §4 (single-seed, pre-Chunks-1-6).

## TL;DR

**8 of 14 AUTO metrics pass; 6 fail.** The new M-NEW visibility metric **passes at 0.87**, above the 0.80 target.

**Clean wins vs. original baseline:**

- M3.1 animated combat **67% → 74%** (now ≥ 70 target)
- M3.3 modifier-stack visibility **NO → YES** (Chunk 5 part 1 delivered)
- M5.1 scripted beats **0 → 1** (Chunk 3 delivered)
- M-NEW visibility ratio: not previously measured, lands at **0.87**

**Persistent failures (chunk-attributable):**

- M1.2 wall-plane combat **still 0** — the canned AI never fights on walls (Chunks 1+2 placed POSTs / garrisons there, AI doesn't engage).
- M4.4 ant template utilization **still 42%** — canned AI doesn't field the bench; player runs needed.
- M3.2 median combat rounds **1.8** (was 1.5; target ≥ 3) — combat still too fast to follow. No chunk addressed this directly; flagged in reframe #3 of the original brief.

**Chunk-6 specific signal:**

- Aggression cap across all 5 seeds maxes at **7 / 100** (threshold 30). The canned AI does not accrue enough battles for field promotion to fire — **Chunk 6 is invisible in canned playthroughs**, as predicted. A human player engaging aggressively _will_ trigger it.
- Discipline cap maxes at **2 / 100** — POST captures happen but the canned AI rarely holds a capture turn (the wall-crack beat trigger also rarely fires for the same reason).

**Mid-scenario stat-earned events: 11.4 per run** (Chunk 5b is doing measurable work). **Unit promotions: 2 per run** (item-gated, not behavior-gated — confirmed by the low Aggression cap).

**What the AUTO numbers don't tell us** (all OBS — require a player session):

- M1.3 player action density
- M2.4 decision-pull (paused-state: can you name 2 things to do?)
- M3.4 combat legibility (can a first-time viewer name winner + main casualty driver?)
- M4.5 counter-pick variety
- M5.3 dramatic recall

The UI compression session (`l1-ui-compression-brief.md`) directly engages M3.4, M2.4, and M-NEW. The OBS-measurement playthrough should wait until that UI pass lands so we score what the player will actually see.

## Outcomes

| Seed | Turns | Winner | First ant action | Aggression cap | Discipline cap |
| ---- | ----- | ------ | ---------------- | -------------- | -------------- |
| 1    | 100   | spider | 2                | 7              | 1              |
| 2    | 11    | ant    | 5                | 5              | 1              |
| 3    | 11    | ant    | 1                | 5              | 1              |
| 4    | 11    | ant    | 4                | 6              | 2              |
| 5    | 9     | ant    | 3                | 3              | 2              |

## AUTO metrics (averaged across seeds)

### P1 — Sparse engagement

| Metric                    | Value                                       | Target                            | Pass? |
| ------------------------- | ------------------------------------------- | --------------------------------- | ----- |
| **M1.1 temporal spread**  | 0.16                                        | ≥ 0.50                            | ✗     |
| **M1.2 spatial spread**   | 3.80 tiles · 1.20 planes · 0.00 wall planes | ≥ 3 tiles · ≥ 2 planes · ≥ 1 wall | ✗     |
| **M1.4 first ant action** | turn 3.00                                   | ≤ 15                              | ✓     |

### P2 — Empty board

| Metric                      | Value                                                         | Target          | Pass? |
| --------------------------- | ------------------------------------------------------------- | --------------- | ----- |
| **M2.1 POSTs per scenario** | 11.20                                                         | 12–16           | ✗     |
| **M2.2 POSTs per plane**    | floor 3.00 · ceiling 3.00 · N 1.60 · S 1.60 · E 1.00 · W 1.00 | ≥ 2 every plane | ✗     |
| **M2.3 mean ant cap gap**   | 6.25 turns                                                    | ≤ 8             | ✓     |

### P3 — Opaque combat

| Metric                     | Value  | Target          | Pass? |
| -------------------------- | ------ | --------------- | ----- |
| **M3.1 animated ratio**    | 74.15% | ≥ 70%           | ✓     |
| **M3.2 median rounds**     | 1.80   | ≥ 3             | ✗     |
| **M3.3 modifiers visible** | YES    | YES (≥ 2 types) | ✓     |

### P4 — Flat roster

| Metric                         | Value                      | Target               | Pass? |
| ------------------------------ | -------------------------- | -------------------- | ----- |
| **M4.1 templates per faction** | ant 12.00 · spider 10.00   | ant ≥ 6 · spider ≥ 4 | ✓     |
| **M4.2 movement classes**      | 4.00                       | ≥ 3                  | ✓     |
| **M4.4 template utilization**  | ant 41.67% · spider 28.00% | ≥ 70%                | ✗     |

### P5 — No drama

| Metric                  | Value                              | Target        | Pass? |
| ----------------------- | ---------------------------------- | ------------- | ----- |
| **M5.1 scripted beats** | 1.00                               | 1–2           | ✓     |
| **M5.2 beat timing**    | first half 0.80 · second half 0.20 | ≥ 1 each half | ✗     |

### M-NEW — Action-visibility ratio (NEW)

| Metric                     | Value | Target | Pass? |
| -------------------------- | ----- | ------ | ----- |
| **M-NEW visibility ratio** | 0.87  | ≥ 0.80 | ✓     |

## OBS metrics (require player session)

| Metric                         | Status                             |
| ------------------------------ | ---------------------------------- |
| **M1.3 player action density** | OBS — measured during play session |
| **M2.4 decision-pull density** | OBS — measured during play session |
| **M3.4 combat legibility**     | OBS — measured during play session |
| **M4.5 counter-pick**          | OBS — measured during play session |
| **M5.3 recall test**           | OBS — post-playthrough debrief     |

## L1-iteration chunk surfacing (Chunks 1–6 evidence)

- Chunk 5b earned-stats events per run: **11.40** (avg).
- Unit promotions per run: **2.00** (avg).
- Max ant Aggression observed: **7** / 100 (threshold 30).
- Max ant Discipline observed: **2** / 100.

## Per-seed metrics

| Seed | P1.1 | P1.2 tiles/planes/walls | P2.1 | P2.3  | P3.1 | P3.2 | P4.4 ant | P4.4 spi | P5.1 | M-NEW |
| ---- | ---- | ----------------------- | ---- | ----- | ---- | ---- | -------- | -------- | ---- | ----- |
| 1    | 0.06 | 6 / 1 / 0               | 12   | -1.00 | 0.82 | 1.00 | 0.42     | 0.40     | 1    | 0.93  |
| 2    | 0.27 | 5 / 2 / 0               | 10   | 5.00  | 0.88 | 3.00 | 0.42     | 0.40     | 1    | 0.79  |
| 3    | 0.27 | 4 / 1 / 0               | 12   | 9.00  | 0.71 | 1.00 | 0.42     | 0.20     | 1    | 0.71  |
| 4    | 0.09 | 2 / 1 / 0               | 12   | 6.00  | 0.50 | 2.00 | 0.42     | 0.20     | 1    | 1.00  |
| 5    | 0.11 | 2 / 1 / 0               | 10   | 5.00  | 0.80 | 2.00 | 0.42     | 0.20     | 1    | 0.89  |

## Findings

### F1 — The canned baseline AI is the bottleneck for half the rubric

Six of the failing metrics (M1.1, M1.2, M2.3 occasionally, M3.2, M4.4, M5.2) fail not because the engine surface is missing but because the canned baseline AI doesn't _use_ what we built. Specifically:

- The baseline ant policy chain-marches through the floor → ceiling corridor. It never crosses wall planes, so wall-plane battles stay at 0 even though Chunk 2 placed neutral garrisons there and Chunk 1 forced one mid-POST onto each wall.
- The baseline never picks up promotion-key items (Chunk 4 part 2) and never accrues Aggression past 7 / 100. Chunks 4, 5b, and 6 are functionally invisible in the canned playthroughs.
- 4 of 5 seeds end at turn 11 (ant queen falls). At turn 11 there's no time for late-scenario events; M5.2 second-half beat count is essentially "did spider-l1 capture wall-crack while attacking the queen" — and it doesn't.

**Implication.** AUTO measurement against the canned AI is now near-saturated for the engine-side changes. Further AUTO improvement requires either (a) an AI that fields the bench / uses items / pushes Aggression, or (b) shifting to OBS measurement against player runs. **Option (b) is the cheaper signal.**

### F2 — M-NEW (action-visibility) passes the canned bar but is suspicious

The 0.87 average looks healthy. But this is the canned-AI distribution, where ~all battles happen on planes the ant queen-guard sits on (floor). When a player rotates between planes and orders squads on multiple faces, the visibility ratio will degrade — exactly the failure mode the UI compression brief calls out.

**Interpretation.** Treat the 0.87 as a _baseline floor_, not a passing grade. Re-measure during player runs with the UI changes from `l1-ui-compression-brief.md` Problems A and B.

### F3 — Combat is faster, not slower

Median rounds **1.5 → 1.8**. The animated ratio went up (67% → 74%) but the rounds-per-battle is essentially unchanged. The original brief's reframe #3 was explicit:

> Combat is too quick to follow… P3 isn't only a panel issue — units die too fast for the play-by-play to have content.

No chunk addressed this. The play-by-play panel (PR #57) and modifier stack (PR #60) make the rounds **legible**, but there still aren't enough of them. If M3.4 (combat legibility OBS) fails on the next player run, this is the proximate cause.

**Candidate next steps** (out of the candidate doc):

- C1 attack-count progression (was paired with #10, deferred)
- Brace + tier-3+ HP scaling (candidate #11, deferred — was P3-only at 4/1)
- Opening volley as a visible "round 0" beat (engine surface exists in `applyOpeningAbilities`)

None of these are in flight. Worth flagging for design.

### F4 — POST density just barely misses (M2.1)

11.20 POSTs average vs. 12–16 target. Chunk 1 bumped the mid-POST range to 8–10. Plus 2 fixed (storm-drain + spider-web) = 10–12. The current distribution lands at the **bottom of the band**.

**Cheap fix**: bump map-gen extras from 2–4 to 3–5 (gives 11–13 mid-POSTs + 2 fixed = 13–15 total). Trivial data-side, no engine work. Worth doing before the next playtest.

### F5 — Beat clustering (M5.2)

First-half beats average 0.80, second-half 0.20. The two authored beats are:

1. Turn 5 "first-stirrings" — always first half.
2. `wall-crack-1` capture — almost never fires (the canned AI doesn't capture wall-crack; the spider doesn't because it owns spider-web; the ant doesn't because it doesn't go to walls).

**Authoring suggestion**: replace the wall-crack beat with a turn-based late beat (e.g., turn 20 "the colony tires"), OR add a third beat triggered on the existing `spider-web` capture so a winning ant run has a closing moment. **Authoring-only fix, no engine work.**

### F6 — Chunks 4–6 (#7, #8, #9) need a player run to show

Item-gated promotion (#7), earned stats (#8), behavior-gated promotion (#9) are all gated on player-driven behavior that the canned AI doesn't simulate:

| Mechanic                          | Trigger                     | Canned-AI evidence                                                  |
| --------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| #7 phero-crown / iron-fang pickup | party walks the item        | 2 promotions per run avg — fires when items spawn under ant parties |
| #8 Aggression                     | initiate combat (+1)        | max 7 / 100 across all seeds                                        |
| #8 Discipline                     | hold POST through flip (+1) | max 2 / 100 across all seeds                                        |
| #9 field promotion                | Aggression ≥ 30             | 0 firings — threshold unreachable for canned AI                     |

**The chunks are working** — the events are in the stream, the tests prove it, the UI surfaces it. The canned AI just doesn't push the thresholds. The next playtest should be **a player run** so we can see #8 and #9 in real conditions.

## Recommended next steps

In order of leverage:

1. **Wait for `l1-ui-compression-brief.md` deliverables**, then OBS-measure during a player run. This single playthrough scores M1.3 / M2.4 / M3.4 / M4.5 / M5.3 / re-measures M-NEW under realistic camera movement.
2. **Two trivial AUTO improvements before the player run**, both 1-line data tweaks (no engine work):
   - F4 fix: bump map-gen extras 2–4 → 3–5.
   - F5 fix: replace the wall-crack beat with a turn-based late beat.
3. **Hold Chunk 7 (#2 mobile-mortal queen)** until after the OBS playthrough. The candidate doc flagged this as "Walk-back cost: High, one-way door"; landing it before we have OBS data on the current state risks compounding cause-of-feel-bad.

## Cross-references

- `docs/drafts/l1-iteration-design-brief.md` — the original rubric + baseline.
- `docs/drafts/l1-ui-compression-brief.md` — the UI design pass being kicked off in parallel.
- `harness/playtest-l1.ts` — re-run this report any time:
  ```
  pnpm tsx harness/playtest-l1.ts > docs/drafts/l1-playtest-<date>.md
  ```
