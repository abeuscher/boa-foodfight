# L1 playtest measurement — post-Chunk-7a

**Generated:** 2026-05-29 via `pnpm tsx harness/playtest-l1.ts`.

**Run config:** 5 seeds (1, 2, 3, 4, 5), ant policy `baseline-v2` vs spider policy `spider-l1-v2`, neutral AI for non-aligned parties. Each scenario capped at 100 turns.

Compare against:

- `docs/drafts/l1-playtest-chunks-1-6.md` — same seeds, locked baseline + spider-l1 (PR #63).
- `docs/drafts/l1-iteration-design-brief.md` §4 — original single-seed baseline (pre-Chunks-1-6).

## TL;DR — Chunk 7a effect vs. Chunks 1-6

| Metric                 | Chunks 1-6 | Chunk 7a    | Δ     | Driver                                 |
| ---------------------- | ---------- | ----------- | ----- | -------------------------------------- |
| **M2.1 POSTs**         | 11.20 ✗    | **12.20 ✓** | +1.0  | **F4 data fix** (extras 2–4 → 3–5)     |
| **M2.3 cap gap**       | 6.25       | **5.17**    | −1.08 | baseline-v2 POST opportunism           |
| **M3.2 median rounds** | 1.80       | **2.20**    | +0.40 | Longer battles when the spider engages |
| **M5.1 beats**         | 1.00       | **1.40**    | +0.40 | F5 new turn-30 "colony tires" beat     |
| **M-NEW visibility**   | 0.87       | **0.90**    | +0.03 | Modest                                 |
| M1.2 walls             | 0          | 0           | =     | **Still missing** — see F1 below       |
| M4.4 ant utilization   | 42%        | 42%         | =     | Still bench-locked — see F2            |
| Max Aggression         | 7/100      | 6/100       | =     | Player-only — see F3                   |

**Two wins, two carry-overs, two stuck.** The F4 + F5 data fixes both landed; baseline-v2 POST opportunism is firing (visible in the cap gap drop); spider-l1-v2 wall reaction is firing but doesn't generate battles for reasons explained below.

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
| **M5.1 scripted beats** | 1.40                               | 1–2           | ✓     |
| **M5.2 beat timing**    | first half 1.40 · second half 0.00 | ≥ 1 each half | ✗     |

### M-NEW — Action-visibility ratio (NEW)

| Metric                     | Value | Target | Pass? |
| -------------------------- | ----- | ------ | ----- |
| **M-NEW visibility ratio** | 0.90  | ≥ 0.80 | ✓     |

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
| 1    | 0.03 | 3 / 1 / 0               | 13   | -1.00 | 0.43 | 3.00 | 0.42     | 0.20     | 2    | 0.91  |
| 2    | 0.07 | 5 / 2 / 0               | 11   | -1.00 | 0.88 | 1.00 | 0.42     | 0.50     | 2    | 0.79  |
| 3    | 0.08 | 2 / 1 / 0               | 13   | 8.00  | 0.75 | 3.00 | 0.42     | 0.20     | 1    | 0.92  |
| 4    | 0.18 | 3 / 1 / 0               | 13   | 2.50  | 0.50 | 2.00 | 0.42     | 0.20     | 1    | 1.00  |
| 5    | 0.33 | 5 / 2 / 0               | 11   | 5.00  | 1.00 | 2.00 | 0.42     | 0.40     | 1    | 0.89  |

## Findings

### F1 — Spider wall reaction fires, but ant moves on before contact

The spider-l1-v2 wall-defense heuristic diverts the nearest spider party to ant-captured wall POSTs (confirmed by walking the trace). But the ant doesn't _stay_ on the wall — it captures wall-crack-1 and immediately walks toward the next chain POST. By the time the spider arrives, the tile is empty. The reinforcement spawn from Chunk 2 _does_ fire on capture but spawns at the arrival POST (not the trigger POST), so the reinforced spider party doesn't sit on the ant's path either.

To get M1.2 > 0 we need either:

- A spider doctrine that chases the _ant party_ across planes, not the POST tile. Bigger change — spider-l1's "deep raider" pattern only goes for ceiling.
- An ant doctrine that _holds_ captured wall POSTs for ≥ 1 turn so the spider has time to arrive. Could be the next baseline-v3 tweak.

This is doctrine-level work and probably wants the gameplay-agent session.

### F2 — Bench utilization is gated on combat duration

42% utilization means ~5 ant templates per side never see combat. The unused templates are the higher-tier ones (terminal classes, tanks, mages). They're benched in reserve because the front line resolves combat in 2-3 rounds before the reserve gets promoted in. **M3.2 (median rounds 2.20 vs target 3) is the real blocker** — until battles last longer, the reserve never enters live.

Candidate next steps (out of the original candidate doc):

- Brace + tier-3+ HP scaling (#11, deferred — was P3-only at 4/1 in the rubric).
- Opening volley as a visible "round 0" beat (engine surface exists in `applyOpeningAbilities`).

Neither is in flight. Worth flagging for the next gameplay session.

### F3 — Aggression cap stays at 6-7 across all seeds

Both v2 policies are now firing reactions, but the _number of battles per scenario_ is the floor. Ant wins in 3 / 5 seeds at turn ~12; spider wins in 2 / 5 at the turn cap. Across all 5 runs, 6-7 attacker-initiated battles is the max. Chunk 6's 30-Aggression threshold needs roughly that many battles **per party**, not per scenario.

**Implication.** Chunk 6 field-promotion remains a "human player only" mechanic against any AI baseline we ship. That's fine — the design candidate doc accepted this. But the next OBS playtest should specifically check whether a player who _seeks_ engagements can reach the threshold.

## Per-mechanic Chunk-7a contribution

- **F4 (POST density 2–4 → 3–5):** Lifted M2.1 from 11.20 → 12.20, into the 12–16 target band. ✓
- **F5 (turn-30 colony-tires beat):** Lifted M5.1 from 1.00 → 1.40. ✗ M5.2 (timing) regressed because in fast ant-win seeds (3-5) the turn-30 beat doesn't fire; in slow spider-win seeds (1-2) the turn-30 beat fires but in the _first half_ of a 100-turn game. We need a _true_ second-half beat — maybe turn 60 keyed to "spider-web threatened" or similar. Authoring follow-up.
- **baseline-v2 POST opportunism:** Lifted M2.3 from 6.25 → 5.17 turns. ✓
- **baseline-v2 item attraction:** Unit promotions 2.00 → 2.20 (modest); item discovery distribution didn't shift dramatically. Worth keeping; doesn't move headline metrics.
- **spider-l1-v2 wall reaction:** Outcome ratio shifted from 4-ant/1-spider to 3-ant/2-spider — spider is winning more (turn-cap wins suggest score-based ties). Doesn't move M1.2 walls because of F1 (no contact).

## Recommended next steps

1. **Wait for the UI compression deliverables.** OBS-measure once those land; we want M3.4 / M4.5 / M5.3 + a re-measure of M-NEW under realistic camera movement.
2. **Defer M3.2 / M4.4 / wall-combat to the next gameplay session.** Each requires policy doctrine or combat-math changes that benefit from design review.
3. **Author a true second-half beat** before the OBS playtest — 1-line data add, no engine work.
