# Status — Phase 4c.3 (in-battle ability resolver: volley + mend)

This file is updated by the orchestrator after each Phase-4 measurement
pass. It records the current win rate, the consolidated critic findings,
and a one-paragraph diagnosis of what's blocking the target.

## Latest measurement

- **Date:** 2026-05-05
- **Seeds:** 1..100
- **Max turns:** 100
- **Ant win rate:** 0% (target: 65–80%) — still
- **Outcomes:** ant=0, spider=0, timeout=100
- **Avg events/run:** 225 (up from 220)
- **Replays:** `out/baseline-100-v7/`

## What landed in 4c.3

`engine/battle-abilities.ts` — pre-battle ability resolver, called by
`engine/battle.ts` at the start of every battle. Currently handles:

- **`volley`** (special-attack, target=party). Each archer (or any unit
  carrying volley) with charges remaining picks the lowest-HP living
  enemy unit and deals `params.damage` (12) flat damage. Marked as used
  on that unit; one shot per scenario per unit. Emits `ability-used` and
  `unit-died` if the volley kills outright.

- **`mend`** (buff, target=party). Each medic-bearing unit (ant-mage)
  heals every living unit in its own party by `params.heal` (6),
  capped at the template's baseStats.hp.

Type contract change: `Unit.usedAbilities?: readonly AbilityId[]`
tracks one-shot ability consumption.

`BattleInput.abilities: AbilitiesFile` is the new wiring — turn driver
threads scenario abilities through every battle.

7 new tests in `engine/battle-abilities.test.ts` cover targeting,
charge tracking, deterministic order, mend-doesn't-heal-enemies, and
volley-kills-outright.

## What the measurement reveals

The abilities **fire correctly** — 304 volleys + 100 mends across
100 runs (~4 ability uses per run, matches the 304-battle count from
4c.2). The spec-compliance critic's `pheroblast-used / ability-used:
NEVER observed` finding is now resolved.

Wall-crack battles are now **decisive ant wins** with zero ant
casualties. Volley pre-kills spider scouts/soldiers (10/12 HP) before
combat starts — vanguard-alpha (with 2 archers) opens with two
volleys that kill silk-line's scout and a soldier outright; combat
then mops up. Same for web-watch. The vanguards are essentially
untouchable on the wall plane now.

But **pathfinders still loses to web-guard** every run. The math:
pathfinders has only 1 archer → 1 volley → 12 damage to one of the
4 spider elites (22 HP each). Net: 1 elite at 10 HP, 3 elites + spider
queen still at full. Web-guard total HP: 168. Pathfinders total HP:
44 (1 mage + 2 scouts + 2 workers + 1 archer). Outcome unchanged:
pathfinders wiped on turn 8, web-guard intact.

## Updated diagnosis

The engine + abilities are working. The locked player AI sends
pathfinders alone to the web because it's the only ant party with
plane-switch. That party simply doesn't have enough firepower to
break web-guard's front-loaded composition (queen + 4 elites).

To flip the win rate, a **single additional change** is needed —
exactly one of these:

A. **Lever 1 — pull web-guard off the web.** When ants control 4
POSTs, have web-guard pursue the nearest ant party. The spider
queen would then be in the field, vulnerable to ant attacks +
queen ultimate. Risky for spiders (queen exposed) but matches a
"desperate counterattack" briefing.

B. **Lever 2 — distribute plane-switch.** Add a second ant-mage to
one of the vanguards. Two parties on the ceiling = enough force
to break web-guard. Player roster IS technically locked but
re-balancing party composition (which ant party gets which units)
while keeping the unit counts identical isn't a roster change —
it's an initial-circumstances change (lever 2). Spec-compliant.

C. **Lever 4 — supplementary win condition.** "Hold 4 of 5 POSTs
for N consecutive turns" wins. Given ants reliably hold 4 by
turn 5 and stay there to turn 100, this would single-handedly
convert ~100% of timeouts to ant victories (probably need to
choose a value of N like 10 turns to leave room for tactical
recovery). Cheapest path to a measurable win rate — but feels
like papering over the core fight.

## Critic findings against `out/baseline-100-v7/`

| Critic          | High findings | Change since v6                                                         |
| --------------- | ------------- | ----------------------------------------------------------------------- |
| metrics         | 3             | unchanged (win-rate, decisive-outcomes, progress-stalemate)             |
| spec-compliance | **3**         | **down from 5** — `pheroblast-used` (ability-used) is no longer flagged |
| fun             | n/a           | not rerun this iteration; replay quality continued to improve           |

The spec-compliance critic now reports only 3 HIGH findings (was 5):
queen-ultimate-fires, jelly-applied, fog-revealed. Of those, jelly-
applied and queen-ult-fires both depend on AI activity that doesn't
yet exist (jelly orders, spiders within ult range), and fog-revealed
needs the fog module.

## What is locked, and won't change

- `ai/baseline.ts` — the locked reference player AI.
- The 5 spec-locked POST ids and their owners.
- Player roster TOTALS (ant unit composition counts).
- Engine semantics (movement, battle math, capture rules) **except**
  for spec-faithful gaps — climbing bypass (4c.2), opening abilities
  (4c.3) — neither of which existed before.

Party COMPOSITION (which units go in which party) is NOT explicitly
locked by the spec — the rosters were proposed by the Phase 1 design
agent. Reshuffling units across parties is a lever-2 (initial
circumstances) change.

## Phase 4 next steps

Three single-lever changes, each likely sufficient to flip the win
rate from 0%. Pick one:

1. **Spider counter-push from web-guard** (data: ai/spider-l1.ts).
2. **Reshuffle ant-mage** so vanguard-bravo also has plane-switch
   (data: roster-ants.json).
3. **Supplementary win condition** (engine: end-of-turn.ts +
   GameState field).
