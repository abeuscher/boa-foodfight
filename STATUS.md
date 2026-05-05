# Status — Phase 4a baseline measurement

This file is updated by the orchestrator after each Phase-4 measurement
pass. It records the current win rate against the locked baseline player
AI plus a one-paragraph diagnosis of what's blocking the target.

## Latest measurement

- **Date:** 2026-05-05
- **Seeds:** 1..100
- **Max turns:** 100
- **Ant win rate:** 0% (target: 65–80%)
- **Outcomes:** ant=0, spider=0, timeout=100
- **Avg events/run:** 271
- **Replays:** `out/baseline-100/`

## Diagnosis

In **all 100** runs the ants reliably capture 4 of 5 POSTs by turn ~5
(storm-drain held, soap-dish + towel-rack + wall-crack captured) and then
stall. The pathfinders party (the only ant party with the `plane-switch`
ability) plane-switches to the ceiling and engages the spider-web
defenders alone — and loses. The other ant field parties have no way to
follow because plane-switch is gated by the `ant-mage` unit, which only
appears in `pathfinders`. Result: 100% stalemate at 4 POSTs held.

Secondary observations:

- The spiders' briefed pattern (hunker at web, scout to soap dish) means
  they never push aggressively. They don't lose either, but they don't
  press the floor plane after the ant push.
- Queen ultimate charges to the cap by turn ~20 but never fires (no
  ability resolution implemented yet, and even if it fired, the radius=5
  AoE at the storm-drain can't reach the ceiling spider-web).
- Royal Jelly accrues at home base but is never applied (no ability
  resolution; baseline AI doesn't issue ability orders).

## Tuning levers available (per the spec's preferred order)

1. **Enemy pattern.** Spider AI is too defensive. Pulling some defenders
   off the web (e.g., having `silk-line` patrol toward wall-crack instead
   of holding ceiling) would create gaps the pathfinders party could
   exploit.
2. **Initial circumstances.** Web defenders are 1 queen + 4 elites + 4
   soldiers + 2 spinners (web-guard + web-watch + silk-line). Reducing
   silk-line composition, or starting silk-line off-ceiling, would soften
   the final assault.
3. **Battlefield.** Adding a wall↔ceiling paired POST would let
   non-mage ant parties reach the ceiling. This violates the "5 POSTs
   locked" rule but the spec is internally inconsistent on this point.
4. **Scenario goal.** Could add an alternate win condition (e.g.,
   defeating the spider queen anywhere counts) to give the ants more
   paths to victory.

## What is locked, and won't change

- `ai/baseline.ts` — the locked reference player AI. **Must not be
  tuned.** Per the plan: tuning against a moving player AI is
  meaningless.
- The 5 spec-locked POST ids and their owners.
- Player roster (ant unit composition).
- Engine semantics (movement, battle math, capture rules).

## Phase 4 next steps

- **Phase 4b:** spawn the three critic agents (metrics, fun,
  spec-compliance) against `out/baseline-100/`. Even at 0% win rate
  they'll produce structured findings that drive the tuning agent.
- **Phase 4c:** tuning agent consumes critic findings and edits enemy /
  initial / battlefield parameters. Cap: 10 rounds. Re-measure win rate
  after each tuning cycle.
- **Phase 4 stop condition:** ant win rate ∈ [65%, 80%], OR 10 tuning
  rounds elapsed (escalate to user).
