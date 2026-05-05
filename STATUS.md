# Status — Phase 4c.1 (engine gaps closed; tuning still required)

This file is updated by the orchestrator after each Phase-4 measurement
pass. It records the current win rate, the consolidated critic findings,
and a one-paragraph diagnosis of what's blocking the target.

## Latest measurement

- **Date:** 2026-05-05
- **Seeds:** 1..100
- **Max turns:** 100
- **Ant win rate:** 0% (target: 65–80%) — unchanged from Phase 4a
- **Outcomes:** ant=0, spider=0, timeout=100
- **Avg events/run:** 191 (down from 271 — charge spam suppressed)
- **Replays:** `out/baseline-100-v2/`

## Engine work landed in Phase 4c.1

Three engine gaps closed (per the Path A recommendation in the prior STATUS):

1. **Queen ultimate firing implemented.** When charge is at cap AND uses
   remaining AND a living spider unit is within `radius` (Chebyshev,
   same plane) of the Queen, the ultimate fires: every spider unit in
   range takes flat damage, charge resets to 0, and `queen-ultimate-fired`
   plus per-kill `unit-died` events are emitted. State now tracks
   `queenUltimatesUsed` to enforce `usesPerScenario`.
2. **Charge-cap event spam fixed.** `queen-ultimate-charged` is now only
   emitted when the value changes. After the cap is hit, no more
   spam events. Roughly 80 events/replay reclaimed.
3. **(`scenario-end` was already implemented**; it just doesn't fire
   because no one wins yet — that's the remaining tuning problem, not
   an engine gap.)

## Why win rate didn't move

The Queen ultimate firing is now correctly gated on having an enemy in
range. Across 100 replays, the ultimate **never fires** — spider
parties stay near the web on the ceiling and the lone scout heads to
soap-dish, none close enough to (0,0) on the floor to be in radius-5.
The ant queen sits with charge=100 from turn ~20 onward but has no
target.

This matches the Fun Critic's #1 recommendation from Phase 4b:

> **Tune the spider AI (lever 1): push silk-line toward wall-crack
> once the ants control 3+ POSTs.** This breaks the 4-POST stalemate
> three ways at once — gives dormant vanguard parties a real opponent,
> puts the back half of the replay back in motion, and the Queen
> ultimate finally has spider parties within range of its AoE near
> the storm-drain.

That's the exact diagnosis the engine fixes confirm. The ultimate
isn't dead code; it's waiting for a target.

## Critic findings against `out/baseline-100-v2/`

| Critic          | High findings                                            | New since v1?                                                                               |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| metrics         | 3 (win-rate, decisive-outcomes, progress-stalemate)      | unchanged                                                                                   |
| spec-compliance | 5 (queen-ult fires, jelly, abilities, fog, scenario-end) | unchanged — these all need the spider AI to push or the player AI to actively use abilities |
| fun             | (not rerun — same root-cause findings hold)              | n/a                                                                                         |

## Phase 4 next steps

The engine is now structurally complete enough that **data-side tuning
can make a difference**. Three options, in order of bang-for-buck:

A. **Tune the spider AI (lever 1).** Add a "counter-push" rule: when
ants control ≥ 3 POSTs, send `silk-line` toward `wall-crack` (or
`soap-dish`) instead of holding the web. This puts spider parties
back on the floor where the Queen ultimate can hit them, AND
gives the dormant ant vanguard parties a real opponent. Single
highest-leverage change.

B. **Distribute plane-switch (lever 2: initial circumstances).**
Split the ant-mage out of `pathfinders` and put a copy in another
field party, OR rebuild pathfinders to be tougher (more units).
This makes the ceiling assault less of a single point of failure.

C. **Add a supplementary win condition (lever 4).** "Hold 4/5 POSTs
for N consecutive turns" turns the current 100-turn stalemate into
a credible victory state. This is a scenario-goal change, the
plan's lowest-priority lever, but it's the cheapest engine work.

A is the recommended single change — closest to the spec's "spiders
will hunker down at the web, send scouts toward the soap dish, and
respond to threats on plane transitions" briefing, just adding a
fourth response for when the ants are clearly winning the floor.

## What is locked, and won't change

- `ai/baseline.ts` — the locked reference player AI.
- The 5 spec-locked POST ids and their owners.
- Player roster (ant unit composition).
- Engine semantics (movement, battle math, capture rules).

The spider AI (`ai/spider-l1.ts`) is **not locked** — it's an
enemy-side tuning lever per the spec.
