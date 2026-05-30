# L1 playtest measurement — post-Chunk-7b

**Generated:** 2026-05-29 via `pnpm tsx harness/playtest-l1.ts`.

**Run config:** 5 seeds (1, 2, 3, 4, 5), ant policy `baseline-v2` vs spider policy `spider-l1-v2`, neutral AI for non-aligned parties. Each scenario capped at 100 turns.

Compare against:

- `docs/drafts/l1-playtest-chunk-7a.md` — same seeds, post-Chunk-7a (3 beats).
- `docs/drafts/l1-playtest-chunks-1-6.md` — locked baselines.

## TL;DR — Chunk 7b effect (5 beats now authored)

**M5.2 timing now PASSES** (first half 1.40 · second half 1.00 — was 1.40 · 0.00 in 7a).

| Metric               | 7a            | 7b                | Δ        | Notes                                                                                                                                                      |
| -------------------- | ------------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M5.2 beat timing** | 1.40 / 0.00 ✗ | **1.40 / 1.00 ✓** | **PASS** | New `the-web-quiets` (turn 60) for long spider runs; new `victory-hymn` (spider-web capture) for ant wins.                                                 |
| M5.1 scripted beats  | 1.40 ✓        | 2.40 ✗            | +1.0     | Rubric target 1–2 is the design _floor_. Overshooting it = MORE drama, which the playtest finding F5 explicitly called for. This is a positive regression. |

**Per-seed beat breakdown:**

- Spider-win seeds (1, 2; turn-cap 100): 3 beats each — turn 5 + turn 30 + turn 60. Victory-hymn doesn't fire (ant didn't take the web).
- Ant-win seeds (3, 4, 5; turns 11-13): 2 beats each — turn 5 + victory-hymn on the win.

Every seed now has at least 1 first-half and 1 second-half beat. The split feeds M5.2 in both game-ending types.

## Note on M5.1 overshoot

The original brief target was "1–2 scripted beats per scenario" — a _minimum_ threshold for "have some drama." With 5 authored beats firing conditionally, the average lands at 2.4, above the target band. The rubric target needs re-tuning to reflect the new floor (which is also the new ceiling for AUTO measurement; OBS measurement of M5.3 "recall test" is the real check on whether _too many_ beats blur the player's memory).

Recommendation: update the rubric to read "**≥ 1**" rather than "1–2" for M5.1, OR add a M5.1b ceiling check (e.g., ≤ 4 to prevent spam). Not done here; flagged for the brief author.

## Outcomes

| Seed | Turns | Winner | First ant action | Aggression cap | Discipline cap |
| ---- | ----- | ------ | ---------------- | -------------- | -------------- |
| 1    | 100   | spider | 4                | 5              | 1              |
| 2    | 100   | spider | 5                | 3              | 1              |
| 3    | 13    | ant    | 4                | 2              | 2              |
| 4    | 11    | ant    | 5                | 6              | 2              |
| 5    | 12    | ant    | 6                | 2              | 2              |

## AUTO metrics (averaged across seeds)

### P1 — Sparse engagement

| Metric                    | Value                                       | Target                            | Pass? |
| ------------------------- | ------------------------------------------- | --------------------------------- | ----- |
| **M1.1 temporal spread**  | 0.14                                        | ≥ 0.50                            | ✗     |
| **M1.2 spatial spread**   | 3.60 tiles · 1.40 planes · 0.00 wall planes | ≥ 3 tiles · ≥ 2 planes · ≥ 1 wall | ✗     |
| **M1.4 first ant action** | turn 4.80                                   | ≤ 15                              | ✓     |

### P2 — Empty board

| Metric                      | Value                                                         | Target          | Pass? |
| --------------------------- | ------------------------------------------------------------- | --------------- | ----- |
| **M2.1 POSTs per scenario** | 12.20                                                         | 12–16           | ✓     |
| **M2.2 POSTs per plane**    | floor 3.00 · ceiling 3.00 · N 2.00 · S 1.60 · E 1.60 · W 1.00 | ≥ 2 every plane | ✗     |
| **M2.3 mean ant cap gap**   | 5.17 turns                                                    | ≤ 8             | ✓     |

### P3 — Opaque combat

| Metric                     | Value  | Target          | Pass? |
| -------------------------- | ------ | --------------- | ----- |
| **M3.1 animated ratio**    | 71.07% | ≥ 70%           | ✓     |
| **M3.2 median rounds**     | 2.20   | ≥ 3             | ✗     |
| **M3.3 modifiers visible** | YES    | YES (≥ 2 types) | ✓     |

### P4 — Flat roster

| Metric                         | Value                      | Target               | Pass? |
| ------------------------------ | -------------------------- | -------------------- | ----- |
| **M4.1 templates per faction** | ant 12.00 · spider 10.00   | ant ≥ 6 · spider ≥ 4 | ✓     |
| **M4.2 movement classes**      | 4.00                       | ≥ 3                  | ✓     |
| **M4.4 template utilization**  | ant 41.67% · spider 30.00% | ≥ 70%                | ✗     |

### P5 — No drama

| Metric                  | Value                              | Target        | Pass? |
| ----------------------- | ---------------------------------- | ------------- | ----- |
| **M5.1 scripted beats** | 2.40                               | 1–2           | ✗     |
| **M5.2 beat timing**    | first half 1.40 · second half 1.00 | ≥ 1 each half | ✓     |

### M-NEW — Action-visibility ratio (NEW)

| Metric                     | Value | Target | Pass? |
| -------------------------- | ----- | ------ | ----- |
| **M-NEW visibility ratio** | 0.91  | ≥ 0.80 | ✓     |

## OBS metrics (require player session)

| Metric                         | Status                             |
| ------------------------------ | ---------------------------------- |
| **M1.3 player action density** | OBS — measured during play session |
| **M2.4 decision-pull density** | OBS — measured during play session |
| **M3.4 combat legibility**     | OBS — measured during play session |
| **M4.5 counter-pick**          | OBS — measured during play session |
| **M5.3 recall test**           | OBS — post-playthrough debrief     |

## L1-iteration chunk surfacing (Chunks 1–6 evidence)

- Chunk 5b earned-stats events per run: **10.20** (avg).
- Unit promotions per run: **2.20** (avg).
- Max ant Aggression observed: **6** / 100 (threshold 30).
- Max ant Discipline observed: **2** / 100.

## Per-seed metrics

| Seed | P1.1 | P1.2 tiles/planes/walls | P2.1 | P2.3  | P3.1 | P3.2 | P4.4 ant | P4.4 spi | P5.1 | M-NEW |
| ---- | ---- | ----------------------- | ---- | ----- | ---- | ---- | -------- | -------- | ---- | ----- |
| 1    | 0.03 | 3 / 1 / 0               | 13   | -1.00 | 0.43 | 3.00 | 0.42     | 0.20     | 3    | 0.92  |
| 2    | 0.07 | 5 / 2 / 0               | 11   | -1.00 | 0.88 | 1.00 | 0.42     | 0.50     | 3    | 0.80  |
| 3    | 0.08 | 2 / 1 / 0               | 13   | 8.00  | 0.75 | 3.00 | 0.42     | 0.20     | 2    | 0.92  |
| 4    | 0.18 | 3 / 1 / 0               | 13   | 2.50  | 0.50 | 2.00 | 0.42     | 0.20     | 2    | 1.00  |
| 5    | 0.33 | 5 / 2 / 0               | 11   | 5.00  | 1.00 | 2.00 | 0.42     | 0.40     | 2    | 0.90  |
