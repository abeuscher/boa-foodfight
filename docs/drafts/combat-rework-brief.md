# Combat Tension & Recovery Rework — project-tailored brief

**From / To / Status:** Dev → PM / Tailored from PM directive ("Food
Fight — Combat Tension & Recovery Rework"). Each phase carries
file-path + line-number anchors so the work is concretely sequenced
against the current codebase.
**Stance:** Mechanics intent is set by the PM brief. This document
maps that intent to actual engine surfaces, names what's free vs what
must be built, and asks for the PM's rulings on the four open
checkpoints before the dependent phases start.

---

## Diagnosis — confirmed against the code

The PM's three-part diagnosis lines up cleanly with what the engine
actually does today:

1. **"Combat resolves into attrition spirals."** Confirmed. Spider
   AI policies (`ai/spider-l1.ts:808-1128`) decide orders _de novo
   each turn_ from `GameState`. The `Party` shape has no
   `lastBattleOutcome` / `recentlyDefeated` / `cooldownUntilTurn`
   field, so after a losing engagement a wounded party reads the same
   "highest-priority tile" and re-issues the same move-to. The only
   existing brakes are:
   - `ai/threat-flee.ts:163-169` — HP-threshold flee at 30%
     (`FLEE_HP_THRESHOLD = 0.3`).
   - `ai/threat-flee.ts:112-150` — predictive flee using Lanchester
     loss-prob, but `ai/policy-helpers.ts:209-210` clamps the
     flee chance to 0 below 50% loss-prob. Anything that isn't
     coin-flip lethal feels safe to the AI.
     So in the typical case — a fresh fight where neither side is yet
     wounded — every brake is OFF, and re-engagement is automatic.

2. **"Recovery is illegible."** Confirmed.
   - The only field heal that exists is **POST occupation**
     (`engine/end-of-turn.ts:191-202`) — per-tile `healingRate`
     applied each turn to friendly occupants. Most POST types ship at
     `healingRate: 1`; Sanctum is the only "real" healer at 3.
     This is silent — no event, no UI surfacing.
   - The home anthill (`storm-drain` for ants, `spider-web` for
     spiders) is not a special heal node — just a regular POST with
     whatever `healingRate` its profile carries.
   - The only `mend` ability (ant-mage, ant-archmage) is **battle-
     passive only** — 1 HP/round during the fight itself (`engine/
battle.ts:258-279`). Healers aren't mobile field medics; they're
     in-combat trickle.
   - Royal Jelly produces 1 dose/turn at the queen
     (`engine/end-of-turn.ts:372-381`), capacity 3 per party. Worker
     applies it for **+10% attack / +5% resilience for 2 turns**
     (`engine/abilities.ts:304-333`). It's a silent stat multiplier
     with no clear narrative. PM's "confusing and unfun" is accurate.

3. **"The board is too freely traversable."** Confirmed.
   - All passable tiles cost `movementCost: 1` uniformly
     (`engine/movement.ts:156-203`). The `movementCost` field exists
     but is binary: <99 = passable, ≥99 = impassable.
   - The five terrain types in `engine/types.ts:91` (`'open'`,
     `'wet'`, `'path'`, `'obstacle'`, `'hazard'`) carry a
     `defenseModifier` field, but combat resolution never reads it
     (`engine/battle.ts` has no `tile.terrain` lookup).
   - Map-gen (`engine/map-gen.ts:1-90`) does no chokepoint
     engineering. Obstacles cluster (80% chance to attach to the last
     one placed), which is the only thing approximating a passage —
     but they're placed before POSTs and the cluster shape isn't
     informed by where the player needs to route.

The encouraging news: the PM's brief targets the right three knobs
in the right order, and most of what we need at the data/event level
is already in place — what's missing is targeted behavior + a few
new fields. None of this calls for an engine rewrite.

---

## Phase 1 — Break the attrition spiral

**Goal (unchanged from PM brief):** remove the unconditional
re-engagement so collisions stop running to annihilation, and give
break-off somewhere minimal to recover so it isn't a stutter.

### Build

**1a. AI break-off signal — `recentBattleOutcome` on Party.**

Add a transient field to `Party` (`engine/types.ts:489-548`):

```ts
readonly recentBattleOutcome?: {
  readonly turn: number;        // turn when battle resolved
  readonly hpLossFraction: number; // 0..1, computed at battle end
  readonly winner: 'ant' | 'spider' | 'draw';
  readonly opponentId: PartyId;
};
```

Engine writes this on `battle-resolved` in `engine/battle.ts`
(at the same point the casualties are recorded). The field decays
itself after N turns via end-of-turn cleanup (recommend N = 2; gameplay
ruling — see open checkpoint **R-1**).

**1b. Spider AI consults the signal.**

`ai/spider-l1.ts:1112-1127` is the natural extension point — the
flee/disengage block runs before the move-to. Add a new branch:

```ts
const recent = party.recentBattleOutcome;
if (recent && recent.turn >= state.turn - 1) {
  if (recent.hpLossFraction > BREAKOFF_HP_FRACTION) {
    return [{ kind: 'move-to', target: nearestRecoveryTile(party, state) }];
  }
}
```

`nearestRecoveryTile` returns the closest friendly POST with
`healingRate > 0` (or the home node — see 1c). Recommend
`BREAKOFF_HP_FRACTION = 0.25` as a starting point but it's a gameplay
ruling — see open checkpoint **R-1**.

**1c. Home anthill heals occupying parties.**

The brief's "minimal recovery destination" is the cheapest version of
Phase 2. Implementation:

- Add a `homePost: PostId` field to `ScenarioData` (already implicit
  — the storm-drain id is known at scenario load).
- In `engine/end-of-turn.ts:191-202`, add a special branch: if a
  party is on its faction's home POST, heal by `HOME_HEAL_RATE`
  (recommend 3, ruling needed). This is independent of the POST's
  per-tile `healingRate` so the home node can be tuned without
  affecting the chain-march economy.
- Emit a new `home-heal-applied` `ReplayEvent` so the harness can
  measure recovery utilization (Phase 2's "exit criteria").

### Exit criteria — measurable now

| Criterion                             | Metric                                                                                | Harness path                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Re-attack cadence rises               | mean turns between same-party `battle-resolved` events                                | `harness/run-batch.ts:166-179` (new accumulator) |
| Collision-outcome distribution shifts | bucket `battle-resolved` events by `{winner, attackerCasualties, defenderCasualties}` | same                                             |
| Units lost / scenario falls           | count of `unit-died` events per seed                                                  | already free                                     |
| Win-rate stays in gate-29 band        | `pnpm coevo gate <round>` — band [55%, 65%]                                           | `harness/coevo.ts:53-54,242,265`                 |

All of these can be measured without new engine instrumentation — the
`battle-resolved` event already carries casualties and party ids
(`engine/types.ts:914-1345`). The new accumulators drop into the
existing `for (const seed of args.seeds)` loop.

### Rulings needed (gameplay)

- **R-1**: `BREAKOFF_HP_FRACTION` threshold (recommend 0.25) and
  `recentBattleOutcome` decay window (recommend 2 turns).
- **R-2**: `HOME_HEAL_RATE` for the home anthill (recommend 3 HP/unit/
  turn — same as Sanctum POST profile).

### Engine cost

Small — one new optional field on `Party`, one branch in
`endOfTurn`, one branch in `spider-l1.ts`, one new `ReplayEvent`
kind. The gate-29 coevo loop will catch regressions; the new metrics
ride existing infrastructure.

---

## Phase 2 — Make recovery legible

**Goal (unchanged):** turn recovery from a confusing passive into a
deliberate three-tier loop: mobile healer, field rejuvenation node,
home + paid resurrection.

### Build

**2a. Mobile healer ability.**

Two paths, choose by ruling **R-3**:

- **A.** Extend `mend` (`engine/abilities.ts`) to a field heal: ant-
  mage gets a new `use-ability` order that heals a target party
  (same-tile or adjacent, recommend Chebyshev ≤ 1) by `MEND_HEAL`
  per turn. The current battle-passive 1 HP/round stays.
- **B.** New ability `field-mend` on a new role (the "nurse-ant"
  PM proposed). Cleaner conceptually but requires a new unit
  template (`data/level-1/units.json`), new icon (Lucide already
  has `Sparkles`), new roster slot.

Cost: A is ~50 lines. B is a small chunk including data + Lucide
icon + roster threading. Recommend A first (cheapest signal); B
once recovery utilization confirms the model works.

**2b. Field rejuvenation node — already supported, needs activation.**

`engine/end-of-turn.ts:191-202` already heals on POST occupation; the
per-POST `healingRate` is already tunable. The "field rejuvenation
node" is just a POST with `healingRate ≥ 3` placed deliberately by
map-gen.

Concrete change: extend `engine/map-gen.ts` to place 1-2 mandatory
"rejuvenation" POSTs per scenario (named, e.g., `honeydew-well`),
typed with `healingRate: 4` and a distinct icon. The L1 map-gen Phase
1 mandatory placements (`MANDATORY_PLACEMENTS`) is the natural hook.

**2c. Resurrection at home — new economy hook.**

Currently zero resurrection exists. Gold sinks: card market only
(`engine/cards.ts:428-512`, costs 25-60/card, hand cap 3).

Proposal:

- New ability `resurrect` on the queen (or a new `royal-incubator`
  POST type that only appears at the home node).
- Costs `RESURRECT_COST` gold per unit (ruling **R-4**, recommend
  starting at 30).
- Restores one dead unit from a party currently occupying the home
  POST; chooses the highest-XP fallen unit unless the player
  specifies.
- Emits `unit-resurrected` `ReplayEvent` so the harness can measure
  resurrection spend.

UI cost: a "Resurrect (30 gold)" verb on the PartyDetail action
panel when the party is on its home POST.

**2d. Royal Jelly reconciliation.**

The PM brief says either fold jelly into the new model OR retire it.
My recommendation: **fold into 2c as the resurrection resource**.

- Jelly is already queen-produced, capacity 3 per party. Re-frame as
  "queen's reserve for re-incubating fallen units."
- Resurrect cost becomes: 1 jelly dose + `RESURRECT_COST` gold.
- The existing +10% attack / +5% resilience battle buff is retired
  (or kept on a separate consumable item; ruling needed — see
  checkpoint **R-5**).

This makes jelly visible (it's now spent at a moment the player
chooses, not silently consumed during the next battle), and creates
the brief's "scarce resource that gates resurrection" loop without
inventing a new resource.

### Exit criteria — measurable

| Criterion                              | Metric                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Recovery actually used                 | count of `home-heal-applied`, `mend-applied`, `unit-resurrected` events per seed                     |
| Withdraw → recover → re-commit pattern | sequence-mining over `battle-resolved` → `home-heal-applied` → next `battle-resolved` for same party |
| Healers in surviving squads            | post-scenario unit composition vs roster, scan for healer templates among survivors                  |

### Rulings needed (gameplay)

- **R-3**: Mobile healer path — A (extend `mend`) or B (new role)?
- **R-4**: `RESURRECT_COST` starting value (recommend 30 gold + 1
  jelly).
- **R-5**: Retire jelly's battle buff, keep it on a separate item,
  or stack both effects?

### Engine cost

Medium. New ability + ReplayEvent for resurrect. Map-gen extension
for rejuvenation POST. UI verb on PartyDetail. Healer ability
extension. ~3-4 chunks total.

---

## Phase 3 — Make the board cost something

**Goal (unchanged):** chokepoints + movement-cost terrain + combat-
modifier terrain.

### Build — gated by what the engine currently supports

The good news: the **fields already exist** on the terrain type
(`engine/types.ts:91`):

- `movementCost: number` — currently used binary (<99 vs ≥99).
- `defenseModifier: number` — currently always 0.
- `hazardDamage?: number` — declared but unused.

The bad news: **nothing reads them yet**.

**3a. Activate `movementCost`.**

`engine/movement.ts:156-203` (the BFS pathfinder) sums per-step costs
already; it just never sees a step cost ≠ 1. Add wet/path tiles to
the map-gen pool with `movementCost: 2` / `0.5` respectively. The
pathfinder's tiebreaker (line 272) already prefers low-cost tiles —
no rewrite, just data.

**3b. Activate `defenseModifier`.**

`engine/battle.ts:42-76` reads POST defense bonuses but not tile
defense. Add a small lookup: `const tileDef = state.tiles.get(coord)
?.terrain?.defenseModifier ?? 0;` and apply to the defender. This is
~10 lines. Then map-gen adds path tiles with `defenseModifier: +1`
and wet tiles with `defenseModifier: -1`.

**3c. Activate `hazardDamage`.**

Already designed — `engine/hazard-field.ts` exists. Just unused at
L1 density. Phase 3 places one hazard cluster per plane.

**3d. Chokepoint engineering.**

Map-gen's current obstacle clustering bias is already 80% — extend
this with **route constraints**:

- For each plane, after POSTs are placed, identify the 2-3 critical
  paths between POSTs (BFS).
- Bias the obstacle placement to leave at least one viable route per
  POST-to-POST line, but force it through a narrow band (e.g., 1-2
  tiles wide).

Cost: a non-trivial map-gen extension. Recommend doing this AFTER
3a/3b ship; the lever may be enough on its own to give the board
texture, and chokepoint engineering is a deeper investment.

### Exit criteria

| Criterion                                       | Metric                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Winning runs concentrate at chokepoints / nodes | board-coverage histogram (per-tile visit count) per seed; expect concentration near POSTs |
| Terrain affects engagement outcomes             | win-rate delta between battles on `defenseModifier: +1` vs neutral terrain                |

### Rulings needed

- **R-6**: Terrain modifier values — what's the right `defenseModifier`
  ladder (path +1, wet -1, hazard inherent damage)?
- **R-7**: Movement-cost ladder — path 0.5, open 1.0, wet 2.0?
- **R-8**: Chokepoint density target — do we want 1 chokepoint per
  POST line, or just at the key approaches (e.g., spider-web on
  ceiling)?

### Engine cost

Medium-small for 3a/3b/3c (activate existing fields). Larger for 3d
(map-gen extension).

---

## Phase 4 — Verify the levers bite

**Goal (unchanged):** confirm composition, terrain, positioning,
target priority each move outcomes at matched stats.

### Build / method

This is the gameplay-agent-owned analysis pass. The brief's
"controlled comparisons" map directly to existing test
infrastructure: `engine/level-1-tutorial.test.ts` already runs
seeded scenarios; we extend with paired scenarios that hold raw
stats constant and vary one lever.

Example test shape:

```ts
it('positioning (front vs back row caster) moves win-prob by ≥5pts', () => {
  const wins = runManySeeds(100, (rng) => /* identical squads except caster is in back */);
  const losses = runManySeeds(100, (rng) => /* same squads, caster in front (forced) */);
  expect(wins / 100 - losses / 100).toBeGreaterThanOrEqual(0.05);
});
```

### Exit criteria

| Criterion                                       | Metric                                   |
| ----------------------------------------------- | ---------------------------------------- |
| Each lever moves win-prob ≥ X% at matched stats | paired-seed Δ                            |
| Raw stats don't drown levers                    | sensitivity ratio (lever Δ / stat Δ) > 1 |

### Rulings needed

- **R-9**: Target Δ per lever (5 pts? 10 pts?).
- **R-10**: Which levers to test first — composition, terrain,
  positioning, target priority? (Note: target priority lever
  doesn't exist yet — front/back affinity is hard-coded by tags;
  a player-set "prefer Leader / Weak / Strong" toggle is its own
  build that can fit here.)

### Engine cost

Test infrastructure only (no engine change for the verification
itself). New work depends on what R-9/R-10 surface.

---

## Instrumentation (shared across phases)

Hooking onto the existing gate-29 infrastructure:

- **Gate-29 baseline**: `harness/coevo.ts:53-54,242,265` — band
  [55%, 65%], 100 seeds, baseline vs spider-l1. Phase 1 must keep
  the band; everything past Phase 1 must keep the band.
- **New metrics drop into**: `harness/run-batch.ts:166-179` — per-seed
  event scan loop. The `outcome.events` stream contains all 60+
  `ReplayEvent` kinds we need (`engine/types.ts:914-1345`).

### Concrete new accumulators (Phase 1 set)

```ts
interface BattleStats {
  total: number;
  oneSidedKills: number; // attacker or defender casualties == 0
  routs: number; // loser casualties > 50% of starting hp
  breakOffs: number; // new: when AI flee fires this turn
  draws: number;
}
interface PerSeed {
  // existing fields...
  battleStats: BattleStats;
  meanTurnsBetweenAttacks: number;
  unitsLost: number; // sum of unit-died events
}
```

These are computed by walking `outcome.events` once per seed —
no engine change required.

### New event kinds

Phase 1: `battle-broke-off` (when AI fires the new disengage branch).
Phase 2: `home-heal-applied`, `mend-applied`, `unit-resurrected`.

---

## Open checkpoints — settle before dependent phases start

Listed in dependency order. R-1 and R-2 block Phase 1; R-3/4/5 block
Phase 2; R-6/7/8 block Phase 3; R-9/10 block Phase 4.

1. **R-1**: AI break-off thresholds — `BREAKOFF_HP_FRACTION` and
   `recentBattleOutcome` decay window. (Phase 1)
2. **R-2**: `HOME_HEAL_RATE` for the home anthill. (Phase 1)
3. **R-3**: Mobile healer path — extend `mend` or new role? (Phase 2)
4. **R-4**: `RESURRECT_COST` starting value. (Phase 2)
5. **R-5**: Jelly battle buff — retire, keep on item, or stack? (Phase 2)
6. **R-6**: Terrain `defenseModifier` ladder. (Phase 3)
7. **R-7**: `movementCost` ladder. (Phase 3)
8. **R-8**: Chokepoint engineering density. (Phase 3)
9. **R-9**: Target Δ per lever for "lever bites." (Phase 4)
10. **R-10**: Target-priority lever — does it exist (player-set), or is
    it inherited from front/back tags? (Phase 4)

### Recommended starting values (so Phase 1 can move without waiting)

| Ruling | Recommendation                                      | Risk                                          |
| ------ | --------------------------------------------------- | --------------------------------------------- |
| R-1    | `BREAKOFF_HP_FRACTION = 0.25`, decay = 2 turns      | Low — readily tunable via the coevo loop      |
| R-2    | `HOME_HEAL_RATE = 3` HP/unit/turn (matches Sanctum) | Low — same magnitude as existing healing POST |

If you accept R-1 and R-2 at the recommended values, Phase 1 can
start immediately. Phase 2 still needs R-3/4/5 before building.

---

## Sequenced chunk plan

1. **Chunk C-1** — Phase 1 build (AI break-off + home heal). 1-2 PRs.
2. **Chunk C-2** — Phase 1 measure. Add the harness accumulators,
   run the gate-29 loop, post the before/after distribution.
3. **PM review** — confirm Phase 1 exit criteria; settle R-3/4/5.
4. **Chunk C-3** — Phase 2a (mobile healer per R-3).
5. **Chunk C-4** — Phase 2b (rejuvenation POST in map-gen).
6. **Chunk C-5** — Phase 2c (resurrection economy).
7. **Chunk C-6** — Phase 2d (jelly reconciliation per R-5).
8. **Chunk C-7** — Phase 2 measure. Recovery-utilization metrics.
9. **PM review** — confirm Phase 2; settle R-6/7/8.
10. **Chunk C-8/9/10** — Phase 3 activate-and-tune.
11. **Chunk C-11** — Phase 3 measure (board-coverage histogram).
12. **PM review** — settle R-9/10.
13. **Chunk C-12+** — Phase 4 verification.

Each PR ships its own harness numbers so we never advance on feel.

---

_References: original PM directive (this session, "Food Fight —
Combat Tension & Recovery Rework"), engagement-density brief
(`docs/drafts/engagement-density-brief.md`), Phase-B playthrough notes
(`docs/drafts/phase-b-playthrough-notes.md`), S1/S2 UI audit
(`docs/test-feedback/ui-audit-s{1,2}`)._
