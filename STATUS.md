# Status — Phase 4c.4 (capture bug fix + roster reshuffle; tuning open)

## Latest measurement

- **Date:** 2026-05-05
- **Seeds:** 1..100
- **Max turns:** 100
- **Ant win rate:** 0% (target: 65–80%) — engine bug fixed but stats untuned
- **Replays:** `out/baseline-100-v13/`

## Real engine bug uncovered (the headline finding)

`engine/posts.ts::resolveCaptures` was counting wiped parties as
occupants. When pathfinders won a battle at the spider-web tile and
killed every web-guard unit, the wiped web-guard _party_ (now
holding 0 living units) still sat at (9,9). The capture rule saw
`factions = {ant, spider}` → contested → no capture. The win
condition then never triggered.

**Demonstrated by a "test the test"**: setting all spider HP to 1
should produce 100% ant wins. With the bug, it gave 0%. With the
fix (skip parties whose units are all dead), it gave **100% wins
in 9 turns avg**.

This bug masked all prior tuning iterations. Several rounds of
"why doesn't the win rate move" were actually "the engine ate the
capture."

Fix landed in `engine/posts.ts`:

```ts
const alive = party.units.some((u) => u.currentHp > 0);
if (!alive) continue;
```

## Other changes in this iteration

**`data/level-1/roster-ants.json` — reshuffle (count-preserving):**

- pathfinders: dropped 2 workers, added 2 archers → now 1 mage +
  2 scouts + 3 archers (3 volleys instead of 1 in the web fight)
- vanguard-bravo: dropped 1 worker, added 1 mage → 3 footmen +
  1 potato-bug + 1 archer + 1 mage. Now also has plane-switch, so
  it can follow pathfinders to the ceiling.
- Total ant unit count unchanged (28).

**`engine/battle.test.ts`** — the round-count test was using
`ant-queen` + footman vs 2 elites. With the elite stat changes I
explored mid-tune, that battle finished in 2 rounds (elites too
weak). Restructured to use `ant-queen × 2` vs `spider-queen × 2` so
the test is robust to elite/footman tuning.

## Why win rate is still 0% with original spider stats

The web-guard composition (1 spider-queen + 4 spider-elites = 5
units, 168 HP) is too tough for any current ant assault even with
two parties hitting it sequentially. The math on this is mechanical
(see Phase 4c.3 STATUS) and **doesn't change with the capture-bug
fix** — the bug was about win detection, not damage.

To actually land in the 65–80% band requires spider stat tuning.
Manual experiments in this session showed:

| Spider config                                             | Ant wins / 100        |
| --------------------------------------------------------- | --------------------- |
| Original (queen 80/15/6, elite 22/7/3, web-guard 5 units) | 0%                    |
| Web-guard 4 units (drop 1 elite)                          | 0%                    |
| + Queen HP 60, armor 5                                    | 0%                    |
| + Queen HP 40, armor 4                                    | 0%                    |
| + Queen ATK 8, HP 50, armor 5; elite ATK 4                | 0%                    |
| + Queen 30/3/6; elite 14/2/4                              | **100%, 9 turns avg** |
| All spider HP=1, armor=0 (test the test)                  | 100%, 9 turns avg     |

The 65–80% band lies somewhere between the last two (queen
30/3/6 + elite 14/2/4) and the second-to-last (queen 50/8/5 +
elite ATK 4). Coordinate descent or bisection on a single axis
would land it in 3–5 evals.

## Algorithmic tuning (the user's framing)

Reverse-engineering parameters from a target win rate is a
black-box optimization problem. The harness IS the objective
function (`f(params) → ant_win_rate over 100 seeds`, ~700 ms per
eval). Approaches in increasing power:

1. **Bisect on one axis.** Cheap when a single knob is monotone.
2. **Coordinate descent.** A few axes, weak interactions.
3. **Random search** in a bounded box.
4. **Bayesian optimization** (overkill at this eval cost).
5. **Cliff-aware tuner** — read `engine/combat.ts`, derive HP/ATK
   breakpoints analytically (e.g., spider-elite ATK > footman HP +
   armor → one-shot regime), search only between cliffs.

For this codebase the cliff-aware tuner is the right approach.
Maybe 5 harness evals to land 65–80%. Phase 4c was always meant to
be a real tuner agent — that's the unattended-execution target.

## What's locked / not

- `ai/baseline.ts` — locked.
- 5 spec-locked POST ids and ownerships — locked.
- Engine semantics — locked except for spec-faithful gaps that
  surface mid-tune (climbing bypass, opening abilities,
  capture-on-wipe — all now implemented).
- Ant roster: reshuffled (count-preserving), now considered the
  current baseline.
- Spider stats / composition: open tuning levers.

## Phase 4 next steps

1. **Write the cliff-aware tuner.** Reads combat math, derives
   HP/ATK thresholds, bisects within breakpoint intervals,
   re-measures, iterates capped at 10 rounds. Outputs the final
   tuned `data/level-1/units.json` + `roster-spiders.json` plus a
   tuning report.
2. **Apply your three changes from this turn permanently.** They
   moved the structural needle (battles per run 1 → 4, ability
   uses 0 → 400 across runs) but couldn't flip win rate at
   original spider stats. The reshuffle is committed; the
   spider-stat tuning is the open work.
