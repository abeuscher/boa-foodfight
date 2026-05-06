# Status — Phase 6 (coevolution loop, 6 rounds)

## Headline

Two LLM designer agents per faction (firepower + strategy = 4 total)
proposed atomic changes over 6 alternating rounds, with deterministic
gates (typecheck, tests, balance band, diversity floor) auto-rolling
back failures. The ant baseline win rate moved from **75%** to **64%**
— inside the user's "60/40 thereabouts" target band of `[55%, 65%]`.

## Win-rate trajectory (locked baseline AI vs current spider AI)

| Round | Type      | baseline | rush | turtle | flank | result  |
| ----- | --------- | -------- | ---- | ------ | ----- | ------- |
| start |           | 75%      | 77%  | 77%    | 62%   | over    |
| 1     | firepower | **62%**  | 62%  | 62%    | 56%   | in-band |
| 2     | strategy  | 62%      | 62%  | 62%    | 56%   | rest    |
| 3     | firepower | 64%      | 64%  | 64%    | 56%   | in-band |
| 4     | strategy  | 64%      | 64%  | 64%    | 56%   | rest    |
| 5     | firepower | 64%      | 64%  | 64%    | 56%   | rest    |
| 6     | strategy  | 64%      | 64%  | 64%    | 56%   | no-op   |

Rest rounds added systems (variants, AI wrinkles, ability mods) without
moving scalar metrics — a sign the system was already in equilibrium.
Round 6 was declared a no-op after both designers' proposals failed
the gate (spider overshot to 53%; ant introduced a test for code it
didn't change).

## Architecture

**Designer roles** (autonomous LLM agents, spawned per round):

- `ant-firepower` / `spider-firepower` — propose atomic JSON edits to
  units.json, abilities.json, roster files
- `ant-strategy` / `spider-strategy` — propose AI policy edits to
  ai/\*.ts files

**Locked anchors** (designers cannot touch):

- `engine/**` semantics
- `ai/baseline.ts` (the spec-locked ant reference player; balance
  gate measures THIS AI's win rate)
- `ai/policy-helpers.ts`, `ai/types.ts`
- The 5 spec-locked POSTs (storm-drain, soap-dish, towel-rack,
  wall-crack, spider-web)

**Gate** (per round):

1. Typecheck must pass
2. All tests must pass
3. Baseline ant win rate in [55%, 65%]
4. ≥ 3 of 4 ant variants ≥ 40% (diversity floor)

**Hard caps**:

- ≤ 3 proposals per designer per round
- ≤ 12 unit templates per faction
- ≤ 15 abilities total
- ≤ 6 ant variant AI files; ≤ 4 spider AI files
- Each proposal must declare ≥ 2 existing-system interactions

## What landed across the loop

**New abilities**:

- `web-snare` (spider-queen passive, fires <33% HP, 1-turn immobilize)

**Modified abilities**:

- `volley`: uses 2 → 1; new `queenBonusDamage 4` parameter
- `jelly-apply`: now has real effect params — `attackBonus 1`,
  `armorBonus 1`, `durationTurns 2`, single use, cooldown 2
- `web-tangle`: new `attackPenalty 1` parameter alongside existing
  movement penalty

**Stat tuning**:

- ant-archer atk 6 → 5
- ant-mage atk 4 → 5; gained `jelly-apply` ability
- spider-elite HP 13 → 14
- spider-soldier HP 12 → 13
- spider-spinner atk 5 → 6

**New ant variants** (registered in ai/index.ts but only baseline +
rush + turtle + flank are run by the diversity gate):

- `jelly-rush.ts` — queen-guard issues jelly-apply orders to field
  parties each turn, exercising the previously-dead AbilityOrder
  channel
- `dive.ts` — pathfinders mid-board ceiling entry at floor (5,5),
  bypassing both wall-crack ladder and corner-flank routes

**Modified AI policies**:

- flank.ts: pathfinders + vanguard-bravo issue jelly-apply self-buff
  on turn 0 before starting the corner march
- spider-l1.ts: advance-scout diverts to towel-rack when soap-dish
  flips ant; wall-crack threat radius widens 2 → 3 when ants own
  towel-rack

## Loop mechanics observations

- **Cliff risk is real even between designers**: round 5 first attempt
  was three small ant proposals + three small spider proposals;
  combined effect was +15pp baseline because the spider designer
  misread `web-mend.hpThreshold 0.5 → 0.6` as "starts earlier" when
  the engine treats it as "stops earlier" (heal stops once HP fraction
  falls below threshold). Even a deliberate "small" coevolved round
  required two retries.

- **Strategy-side hard counters break diversity asymmetrically**:
  round 2 first attempt put web-watch at ceiling (1,1) where rush
  plane-switches in. Rush dropped to 1% (broke 40% floor) while other
  variants were unaffected. Lesson: any AI change that fires before
  the kill battle on the ceiling has outsize impact on rush.

- **"Rest rounds" are not failures**: 4 of 6 rounds didn't move scalar
  win rates but added abilities, params, and AI wrinkles that show up
  in replay quality (Fun Critic eval pending at end of loop).

- **Snapshot/restore needs full coverage**: discovered mid-loop that
  the original snapshot skipped `ai/index.ts`. Strategy designers
  edit it to register new variants; without snapshot coverage, rollback
  was incomplete. Fixed in round 2.

## What's next

A Fun Critic re-eval is dispatched against the end state to grade the
loop's effect on watchability / route diversity / composition
diversity. The new abilities (web-snare, jelly armor, web-tangle
attack-debuff) and the new ant variants are mostly "depth" changes
that should show up qualitatively rather than in win-rate.

---

# Status — Phase 5d (Fun Critic iteration loop, 3 rounds)

## Headline

Three rounds of "apply Fun Critic findings → re-measure → re-grade".
The rubric is now satisfied: **no HIGH findings, all batch_scores ≥
2/3**. Score trajectory across iterations:

| Iteration | watchability | route_diversity | composition_diversity | HIGH findings |
| --------- | ------------ | --------------- | --------------------- | ------------- |
| 0 (5c)    | 1/3          | 2/3             | 0/3                   | 2             |
| 1         | 2/3          | 3/3             | 2/3                   | 1             |
| 2         | 2/3          | 3/3             | 2/3                   | 0 ✓           |
| 3         | (not graded) | —               | —                     | —             |

Iter 2 ended with the Fun Critic explicitly stating the orchestrator
can stop iterating. Iter 3 was a small follow-up engine improvement
(early-loss detector) committed for code quality but not re-graded
because measured outcomes are unchanged.

## Diversity / win-rate trajectory

| Iter | baseline | rush | turtle | flank | Comment                                       |
| ---- | -------- | ---- | ------ | ----- | --------------------------------------------- |
| 0    | 64%      | 66%  | 66%    | 64%   | All clustered, 1pp under band                 |
| 1    | 84%      | 90%  | 90%    | 95%   | Web defense lowered, over band                |
| 2    | 75%      | 77%  | 77%    | 62%   | 3 of 4 in [65,80]; flank meaningfully riskier |
| 3    | 75%      | 77%  | 77%    | 62%   | unchanged (early-loss rarely fires)           |

## Per-iteration changes (commits on `claude/game-agent-strategy-XQu8x`)

**Iter 1 — `ef368fe` (composition + strategy diversity)**

- `data/level-1/map.json`: spider-web POST `defensiveBonus` 4 → 2.
  Effective queen defense at the web drops (armor 2 + postDef 4) ×
  defend 1.5 = 9 → (2 + 2) × 1.5 = 6. Creates a real damage step:
  potato-bug atk 9 consistently exceeds the floor; footman atk 7
  sometimes; archer/mage stay at 1.
- `ai/flank.ts`: rewritten to do genuine corner-flank routing.
  pathfinders walks floor (0,9) → ceiling (0,9) → spider-web; vanguard-
  bravo walks floor (9,0) → ceiling (9,0) → spider-web. The two
  ceiling-capable parties enter the ceiling at OPPOSITE corners, far
  from the canonical north-wall ladder.
- Re-tune: queen HP 39 → 41.

**Iter 2 — `4ea265d` (web-mend, the tuning cliff-breaker)**

- New `web-mend` ability (category: `passive`). Heals 1 HP at the
  start of each combat round while the unit's HP fraction > 50%.
  Once below the threshold, mend stops — the threshold non-linearity
  introduces sub-integer effective HP variance that the Fun Critic
  iter-1 prompt asked for. Breaks the integer cliff (one queen HP
  step flipping 84% → 51%) and lets the auto-tuner land cleanly in
  band.
- spider-queen template gets `web-mend` in abilities.
- `engine/battle.ts` gets `applyRoundStartPassives` invoked before
  each combat round.
- `engine/schemas/abilities.ts` adds `passive` to the category enum.

**Iter 3 — early-loss detector (this commit)**

- `engine/end-of-turn.ts`: scenario ends with a spider-win the turn
  every non-queen ant party has zero living units. Avoids the
  worst-case 90-turn dead-air tail when the field force is wiped
  but the immobile queen-guard sits idle. (In practice fires rarely
  because vanguard-alpha typically has at least one survivor; the
  check is harmless when it doesn't apply.)

## Fun Critic verdict at iter 2

> "Rubric satisfied. The orchestrator can stop iterating. Three of
> four variants are in [65,80] (baseline 75, rush 77, turtle 77),
> flank dipped to 62 but the cliff is broken: queen-kill battles
> spread across 1-5 rounds, and timeouts now show queen surviving
> with HP {0,2,7,9,13,18,19} rather than wiping the assault round-1.
> Web-mend is firing as designed (3-7 heals per battle sequence;
> threshold at 50% creates a visible inflection point)."

flank's 62% reads as fun-tactically interesting per the critic, not
a balance bug — the corner-flank routing exposes pathfinders to
web-watch en route, and flank pays a real route-exposure tax for
its earlier capture timing.

## Remaining MEDIUM findings (not in scope for this loop)

- `composition-diversity` archer/mage still floor-1 vs queen — pure
  archer comp (pathfinders) still ineffective on the queen. Suggested
  next: archer base atk 6 → 7 OR queen-targeting bonus on volley.
- `tactical-variety` volley/mend still fire as a fixed prologue;
  jelly never fires; queen ult never fires.
- `outcome-credibility` field-stuck (not field-wiped) timeouts still
  produce dead-air tails. The supplementary "hold ≥4 POSTs for N
  turns" win condition was prototyped but pulled — at 8-turn
  threshold it converted everything to 100% wins, distorting the
  band; would need a higher threshold paired with a re-tune.

These are stable-by-design gaps the critic flagged as "iter-2 change
wasn't scoped to fix"; future work.

---

# Status — Phase 5c (6-plane geometry + obstacles + Fun Critic rerun)

## Latest measurement (2026-05-05, post-geometry)

- **Seeds:** 1..100, max-turns 100
- **Variants:** baseline 64%, rush 66%, turtle 66%, flank 64% (4/4 ≥40% diversity floor)
- **Avg turns to victory:** baseline 10.06, rush 7.0 (fastest), turtle 22.x, flank 10.06
- **Replays:** `out/diversity/<variant>/`

baseline and flank sit 1pp below the rubric's 65% floor. The integer
stat-step search bottoms out at this cliff (α=0.374 → 86%, α=0.375 →
64%). Acceptable for milestone, flagged as a finding.

## What landed in 5c

Five-item plan from the user:

1. **6-plane bathroom geometry** (`46d9cc7`) — extended `Plane` from
   `floor | wall | ceiling` to `floor | ceiling | north-wall |
south-wall | east-wall | west-wall`. New `engine/edges.ts` with
   box-unfold edge mappings: `edgeNeighbor`, `edgeAnchor`,
   `isOnPlaneEdge`. Movement falls back to walking toward edge
   anchors when cross-plane and no direct transit. wall-crack
   re-pinned to north-wall. Tile count 300 → 600. Required spider AI
   patrol fix: non-scout spider parties now hold position when no
   threat, instead of converging on spider-web (otherwise the larger
   geometry caused pile-up at the web tile).

2. **Obstacles** (`9730b53`) — 42 impassable tiles + 1 hazard tile
   distributed across the 6 planes to form bottlenecks.

3. **Playwright viewer harness** (`0c13c44`, `viewer/viewer.spec.ts`)
   — boots a static server pointing at `viewer/dist`, opens each
   variant's first replay, scrubs to start/middle/end, screenshots
   to `out/screenshots/<variant>/`. Run with `pnpm test:viewer` after
   `pnpm build:viewer` and a one-time `pnpm exec playwright install
chromium`.

4. **Click-to-inspect** (`0c13c44`, `viewer/main.js`) — clicking any
   tile in the viewer shows parties, post (if any), and the next 6
   events touching the selected party. Crosshair cursor on canvas.

5. **Fun Critic rubric expansion** (`0c13c44`,
   `critics/fun-rubric.md`) — rubric now grades win-rate band,
   strategy diversity (≥3 variants ≥40%), composition diversity
   (different rosters viable), outcome credibility, tactical variety,
   watchability. Troop mechanics (HP, attack, abilities, slot costs)
   are explicitly fair-game tuning levers per the user's standing
   instruction.

## Fun Critic findings against post-geometry replays

`critics/findings/fun.json`. Batch scores:
`watchability=1/3` (up from 0), `route_diversity=2/3` (up from 0),
`composition_diversity=0/3`.

| Rule                  | Severity | Headline                                                                                                                                                                                                                                                          |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| composition-diversity | high     | Every web-guard fight is identical: queen armor 3 + every-ant atk 4-5 = floor-1 damage on every roll. Heavy-melee, archer-heavy, mage-heavy all do exactly the same thing. Only "more bodies" wins. Suggested: drop queen armor 3→2 or queen HP 36→28.            |
| strategy-diversity    | high     | 4/4 variants pass the 40% floor but baseline ≡ flank tick-for-tick through T6 — flank is a renamed baseline. Turtle is baseline-with-13-idle-turns. Only rush is genuinely route-distinct. Suggested: re-seat flank starting positions on the opposite-side wall. |
| win-rate-band         | medium   | baseline 64% / flank 64% — 1pp below floor. Suggested: +1 archer or footman to vanguard-bravo.                                                                                                                                                                    |
| tactical-variety      | medium   | Volley/mend fire but always as a fixed prologue. Royal Jelly never fires. Queen ult never fires.                                                                                                                                                                  |
| outcome-credibility   | medium   | Wins credible, losses inarticulate (home-base parties never redeploy after field force dies).                                                                                                                                                                     |
| watchability          | medium   | rush + turtle silk-line counter is a real improvement; baseline ≈ flank duplication still hurts.                                                                                                                                                                  |
| route-diversity       | low      | Up from 0/3; rush genuinely uses climb-bypass.                                                                                                                                                                                                                    |

The critic is unambiguous on root cause: **composition diversity is
the highest-leverage knob to fix next**, not win rate.

## Phase 4 success criteria — checking against the plan

1. ✅ `pnpm harness run --seeds 1..100` runs unattended
2. ⚠️ Metrics critic: 64% on baseline/flank, 1pp below 65% floor
3. ✅ Fun Critic rerun completed (`critics/findings/fun.json`)
4. ⚠️ Spec compliance: queen-ult, jelly, fog still don't fire
5. ✅ Canvas viewer + replay (Phase 5 + 5b + this 5c)

## Phase 5c → next steps (per Fun Critic)

1. Drop spider-queen armor 3→2 (composition diversity, highest leverage).
2. Re-seat flank parties on south- or east-wall start (strategy diversity).
3. Re-tune α with the new combat math; should also pull baseline/flank into [65,80].
4. Implement queen-ult firing condition tied to `spider-queen u0029 dies`.
5. Eventually: feature gaps (jelly-apply orders, fog of war).

---

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
