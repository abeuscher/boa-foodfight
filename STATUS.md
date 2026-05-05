# Status — Phase 4b critic findings

This file is updated by the orchestrator after each Phase-4 measurement
pass. It records the current win rate, the consolidated critic findings,
and a one-paragraph diagnosis of what's blocking the target.

## Latest measurement

- **Date:** 2026-05-05
- **Seeds:** 1..100
- **Max turns:** 100
- **Ant win rate:** 0% (target: 65–80%)
- **Outcomes:** ant=0, spider=0, timeout=100
- **Avg events/run:** 271 (every run ends with antPostsAtEnd=4)
- **Replays:** `out/baseline-100/`

## Critics (Phase 4b)

Three critics ran against `out/baseline-100/`. Findings are written to
`critics/findings/`:

- `metrics.json` — deterministic numerical checks
- `spec-compliance.json` — deterministic transcript-rule checks
- `fun.json` — Fun Critic agent's structured judgment

### Convergent HIGH findings

The three critics converge on the same root causes. By severity:

1. **Engine: abilities not implemented** (spec critic, fun critic).
   `queen-ultimate-fires`, `jelly-applied`, `pheroblast-used`,
   `ability-used`, `order-issued` events: NEVER observed across 100
   runs. The Queen ultimate, Royal Jelly logistics, PheroBlast — the
   strategic texture of Level 1 — is unimplemented. Engine work, not
   data tuning.
2. **Engine: fog of war not implemented** (spec critic).
   `fog-revealed` events: NEVER observed. The fog map exists in
   `GameState` but no module computes visibility. AIs currently see
   full state.
3. **Engine: no scenario-end events fire** (spec critic).
   `scenario-decisive`: NEVER observed. The end-of-turn module sets
   `winner`, but no one emits a `scenario-end` event when it does.
4. **Engine: queen-ultimate-charged spams after cap** (fun critic).
   34% of every replay is the literal line
   `queen-ultimate-charged charge:100` repeated. Engine should stop
   emitting this once charge is at the cap.
5. **Design: pathfinders is a single point of failure**
   (fun critic, metrics critic). Only one ant party (`pathfinders`)
   contains an `ant-mage` and can plane-switch. Every run, that one
   party plane-switches alone, gets crushed by `silk-line` at
   (9,9), and the other ant parties go dormant. The dominant
   tuning lever the Fun Critic surfaced: **distribute plane-switch
   capability across at least two field parties**, OR pull spider
   defenders off the web on a counter-push.
6. **Design: ants hold 4/5 POSTs but can't finish** (all three
   critics). Either weaken the spider stronghold (lever 2: initial
   circumstances) or add an alternate win condition (lever 4:
   scenario goal — e.g., "hold 4 of 5 POSTs for N consecutive
   turns" gives the current stalemate a credible resolution).

### Tuning levers (recap, in the spec's preferred order)

1. **Enemy pattern.** Spider AI is too defensive — pull silk-line
   onto a counter-push once ants control 3+ POSTs. (Fun critic
   strongest single recommendation.)
2. **Initial circumstances.** Distribute the ant-mage across two
   field parties so plane-switch is not a single point of failure.
   Or weaken silk-line composition.
3. **Battlefield.** Could add a wall↔ceiling paired POST (violates
   "5 POSTs locked"; defer unless other levers fail).
4. **Scenario goal.** Add a supplementary win condition for the
   ants — "hold 4/5 POSTs for N turns" or "wipe the spider queen's
   elite guard." Resolves the stalemate state into a credible
   victory.

### Engine gaps to close before Phase 4c (tuning loop) can be useful

Tuning data parameters won't help if the strategic systems they
configure (jelly, queen ultimate, abilities) never fire in the
engine. Recommended order:

1. **Quick:** stop emitting `queen-ultimate-charged` after charge
   hits the cap. (1-line fix in `engine/end-of-turn.ts`.)
2. **Quick:** emit `scenario-end` when winner is set. (1-line fix
   in `engine/end-of-turn.ts`.)
3. **Medium:** implement Queen ultimate firing — when charge is
   maxed AND there's an enemy in radius, fire it. The data already
   has `damage`, `radius`, `usesPerScenario`. Need an `engine/abilities`
   module hooked into the turn loop.
4. **Medium:** implement Royal Jelly application — AI can issue an
   ability order, abilities module consumes a dose and applies the
   buff for `durationTurns`.
5. **Larger:** fog of war. Visibility radius from each friendly
   party. Defer unless required for AI input filtering.

## What is locked, and won't change

- `ai/baseline.ts` — the locked reference player AI. Tuning
  against a moving player AI is meaningless.
- The 5 spec-locked POST ids and their owners.
- Player roster (ant unit composition).
- Engine semantics (movement, battle math, capture rules).

## Phase 4 next steps

Two paths from here, in priority order:

A. **Close engine gaps first** (recommended). The critics' top
findings are all engine-side: abilities don't fire, fog never
reveals, scenario-end never emits. Tuning loops can't address
these. Estimated work: 1–2 more module agents (abilities,
small fog) plus quick engine-fix commits.

B. **Run the tuning loop now** anyway. The Fun Critic's strongest
single suggestion (spider AI counter-push) is data-side and
would shift the win rate even without abilities. But it would
thrash against the absent abilities and not reach the
65–80% target.

Recommendation: do A's quick fixes (queen-ult cap suppression,
scenario-end emission) immediately, then implement Queen ultimate
firing, then re-measure. That probably moves win rate noticeably
without spawning the full tuning loop yet.
