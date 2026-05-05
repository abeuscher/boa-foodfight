# Status — Phase 4c.5 (auto-tuner landed the win-rate band)

## Latest measurement

- **Date:** 2026-05-05
- **Seeds:** 1..100
- **Max turns:** 100
- **Ant win rate:** **77.0%** ✓ (target: 65–80%)
- **Outcomes:** ant=77, spider=0, timeout=23
- **Avg turns to victory:** 10.4
- **Replays:** `out/tune/eval-005/`
- **Tuner report:** `out/tune/report.json`

## What landed in 4c.5

**`harness/tune.ts`** — the auto-tuner the user asked for. Per the
"reverse-engineer from desired win percentage" framing.

Approach: 1D bisection on a single difficulty knob α ∈ [0, 1] that
linearly interpolates **all** spider stat axes simultaneously between
hand-chosen `lo` (ant-favoring) and `hi` (spec-original) bounds. This
captures cross-axis interaction (queen armor + HP + atk jointly
determine survivability) that pure coordinate descent missed —
single-axis bisection bottomed out at 0% wins for every axis even at
its lo bound, because each axis alone doesn't cross the threshold.

Six axes interpolated:

| Axis                | lo (easy) | hi (original) | tuned (α=0.125) |
| ------------------- | --------- | ------------- | --------------- |
| spider-queen.armor  | 2         | 6             | **3**           |
| spider-elite.armor  | 1         | 3             | **1**           |
| spider-queen.hp     | 30        | 80            | **36**          |
| spider-elite.hp     | 12        | 22            | **13**          |
| spider-queen.attack | 6         | 15            | **7**           |
| spider-elite.attack | 4         | 7             | **4**           |

The bisection trajectory was instructive — there's a sharp **cliff**
between α=0.25 and α=0.125:

| α                | Win rate  |
| ---------------- | --------- |
| 0.000 (easiest)  | 100%      |
| 0.125            | **77%** ✓ |
| 0.250            | 0%        |
| 0.500            | 0%        |
| 1.000 (original) | 0%        |

So even α=0.25 was too hard. The win-rate function is highly
non-linear in spider parameters (consistent with the combat math's
floor-at-1 damage and one-shot-when-atk>HP step edges). 5 harness
evals to converge.

## Critic findings against the tuned configuration

| Critic          | High  | Change since untuned (v13)                                                             |
| --------------- | ----- | -------------------------------------------------------------------------------------- |
| metrics         | **0** | down from 3 — win rate, decisive-outcomes, progress-stalemate all resolved             |
| spec-compliance | **3** | down from 4 — `scenario-decisive` is now exercised (77 of 100 runs reach scenario-end) |

Remaining 3 spec-compliance HIGH findings, none of which are tuning
issues — they're feature gaps:

- `queen-ultimate-fires` — Queen ult coded but never has targets in
  range (no spider on the floor in the new tuned dynamic).
- `jelly-applied` — AI doesn't issue ability orders for jelly.
- `fog-revealed` — fog module not implemented.

## Engine + tuning state

The engine is now spec-complete enough that data tuning alone
delivers the win-rate target. The tuner is reproducible: `pnpm tune`
will reproduce the alpha-search and apply the same final stats given
the same harness behavior.

What's locked:

- `ai/baseline.ts` — locked.
- 5 spec-locked POST ids and ownerships — locked.
- Engine semantics — spec-faithful additions only (climbing bypass,
  opening abilities, capture-on-wipe — all from earlier phases).
- Ant roster: reshuffled (count-preserving in 4c.4).

What was tuned and is now committed:

- Spider stats (queen + elite HP/ATK/armor).

## Phase 4 success criteria — checking against the plan

The original plan defined success as:

1. ✅ `pnpm harness run --seeds 1..100` runs unattended end-to-end
2. ✅ Metrics critic reports win rate ∈ [65%, 80%] for the baseline AI
3. Fun Critic: not rerun this iteration; would benefit from a refresh
4. ⚠️ Spec compliance: 3 player-locked rules still don't fire
   (queen ult, jelly, fog) — these are feature gaps documented above
5. ❌ Canvas viewer can replay any of the 100 runs (Phase 5, deferred)

**Route diversity** (the spec's "≥3 strategies achieve ≥40% win
rate") is not yet measured — we only have one player AI
(`baselinePlayer`). The variant AIs (`rush`, `turtle`, `staging`)
were deferred from Phase 3.

## Phase 4 next steps

1. Build variant AIs (`rush`, `turtle`, `staging`) and re-run the
   harness with each to measure route diversity.
2. Implement the 3 missing strategic systems (Queen ult firing
   conditions, jelly-apply ability orders, fog of war) so the spec-
   compliance critic clears.
3. Phase 5: Canvas viewer over the replay log.
4. Re-run the Fun Critic against `out/tune/eval-005/` for a
   post-tune watchability assessment.

## How to reproduce

```
pnpm tune                           # land in 65-80% band
pnpm tune --target-min 0.7 --target-max 0.75  # tighter band
pnpm tune --dry-run                 # measure but don't write
pnpm critic:metrics --in out/tune/eval-005
pnpm critic:spec --in out/tune/eval-005
```
