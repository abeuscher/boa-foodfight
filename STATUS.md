# Status — Phase 4c.2 (one tuning iteration; engine improvements found mid-tune)

This file is updated by the orchestrator after each Phase-4 measurement
pass. It records the current win rate, the consolidated critic findings,
and a one-paragraph diagnosis of what's blocking the target.

## Latest measurement

- **Date:** 2026-05-05
- **Seeds:** 1..100
- **Max turns:** 100
- **Ant win rate:** 0% (target: 65–80%) — still
- **Outcomes:** ant=0, spider=0, timeout=100
- **Avg events/run:** 220 (up from 191 — more battles fire)
- **Replays:** `out/baseline-100-v6/`

## Tuning iteration 1: spider counter-push + climbing engine rule

Implemented the Fun Critic's #1 recommendation from Phase 4b:

**Data side (`ai/spider-l1.ts`)** — when ants control ≥ 3 POSTs, the
largest non-scout non-web-guard spider party (typically `silk-line`
in the seeded roster) breaks formation and counter-pushes toward
**wall-crack**. Initially targeted the storm-drain (lever 1's
intended effect: pull spiders into queen-ultimate range). That
target turned out to be physically unreachable for spiders, see
below.

**Engine side (`engine/movement.ts`)** — added the spec's "climbing
units can transition between specific plane pairs without using
paired POSTs" rule, scoped to wall↔ceiling only. An all-climbing
party can step at the same (x,y) between wall and ceiling. This
unblocks spider mobility on their natural terrain.

## What the iteration revealed

The structural fix worked: silk-line and web-watch now reliably
counter-push to wall-crack via the climbing bypass and engage the
ant vanguards camped there. Battles per run jumped from 1 to 3–4
(88% with 3, 12% with 4). The replays are dramatically more
watchable now — three battles, two leader deaths per side, real
positional play on the wall plane.

But the win rate is still 0% because:

1. **Pathfinders cannot solo the web.** Even with silk-line and
   web-watch pulled out by the counter-push, the web still has
   `web-guard` (spider queen + 4 elites + 4 soldiers + 2 spinners
   = brutal HP and damage). Pathfinders' 6 weak ants get wiped on
   turn 8, every run.
2. **The Queen ultimate still has no targets.** The counter-push
   stops at wall-crack on the wall plane. Spider parties can't
   reach the floor (no ceiling↔floor route, and the
   towel-rack/wall-crack pair is ant-controlled by the time the
   counter-push fires). So queen ultimate sits at charge=100
   forever with no target.

## Updated diagnosis: this needs _multi-lever_ tuning

Single-lever tuning (one enemy-pattern change) is insufficient. To
flip the win rate, several levers need to move together. Candidates,
ordered cheapest-first:

A. **Lever 4 — supplementary win condition.** "Hold 4/5 POSTs for
N consecutive turns" turns the current 100-turn stalemate into
a credible ant victory. Tiny engine change (2 fields on
GameState + 1 check in end-of-turn). Would single-handedly
move win rate to high-double-digits given current behavior.
_Cheapest path to a measurable win rate._
B. **Lever 2 — initial circumstances.** Weaken `web-guard`
composition (drop 1 elite + 1 spinner) so pathfinders has a
fighting chance solo. Or distribute plane-switch to a second
ant party so ceiling assault is two-pronged.
C. **Lever 1 (extension)** — make the spider AI counter-push more
aggressive: send TWO parties (silk-line + web-watch) to
wall-crack, AND have web-guard pursue ant parties that flee
onto the ceiling. The spider AI is now visibly too restrained.

## Critic findings against `out/baseline-100-v6/`

| Critic          | High findings                                             | Change since v2                                            |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| metrics         | 3 (win-rate, decisive-outcomes, progress-stalemate)       | unchanged                                                  |
| spec-compliance | 5 (queen-ult fires, jelly, abilities, fog, scenario-end)  | unchanged                                                  |
| fun             | (not rerun — replay quality improved but win rate didn't) | qualitative: more battles, real wall-plane positional play |

## What is locked, and won't change

- `ai/baseline.ts` — the locked reference player AI.
- The 5 spec-locked POST ids and their owners.
- Player roster (ant unit composition).
- Engine semantics (movement, battle math, capture rules) **except**
  for spec-faithful additions like the climbing-bypass rule above,
  which was missing.

## Decision point

The engine + AI infrastructure is sound and the tuning loop now
works as a measurement pipeline. The right next step is one of:

1. **Add lever 4 (supplementary win condition).** Cheapest path to
   a real win rate signal. ~30 lines of engine + 1 data field.
2. **Spawn the formal tuning agent.** Multi-round (cap 10),
   multi-lever; consumes critic findings, proposes data edits,
   re-measures. The bigger investment but the unattended-execution
   target the original plan calls for.
3. **Implement Royal Jelly application.** Adds a lever the player
   AI could use to buff pathfinders. Engine work, then AI work.
