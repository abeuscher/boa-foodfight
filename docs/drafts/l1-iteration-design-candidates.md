# L1 iteration — candidate mechanics shortlist

**From / To / Status:** Design (UX) → Dev (Gameplay/Engine) / **Candidate
pool for pare-down.** Responds to `docs/drafts/l1-iteration-design-brief.md`.

**Shape note (deviates from brief §6):** the brief asked for 2–4 picks.
PM requested a **wider pool of ~12 candidates to pare down from** rather
than a pre-narrowed shortlist. This doc accordingly lists 12 candidates,
each fully scored against the §3 rubric, ordered by rubric total. The
top block (1–8) all clear adoption threshold (total ≥ 5 **and** breadth
≥ 2 problems scoring ≥ 2). The bottom block (9–12) are below-threshold
on their own but are listed because they are **stackable enablers** for
top-block picks, or because PM may want them on the table for paring.
Promotion of any pick to a Template-A change request happens one-by-one
per brief §6.

**Baseline assumption (§9 open question, answered below):** all scores
in this doc are projected against a **denser-L1 baseline** that already
has the PM's proposed wall-POST density bump applied (12–16 mid-POSTs,
≥ 1 per wall plane). See §C for the explicit confirm/push-back.

---

## A. Above-the-fold — which problem each pick mainly attacks

| #   | Pick                                      | Main problem(s)             | Total / breadth |
| --- | ----------------------------------------- | --------------------------- | --------------- |
| 1   | Tarot dual-purpose deck (B1)              | **P3 + P4 + P5**            | 9 / 3           |
| 2   | Mobile-mortal queen (B2)                  | **P1 + P5** (heavy)         | 8 / 2           |
| 3   | Reinforcement-spawn POSTs                 | **P5 + P2 + P1**            | 8 / 3           |
| 4   | Wall-POST density + typing (§9 baseline+) | **P2 + P1**                 | 7 / 3           |
| 5   | Scripted-beat surface + 1–2 L1 beats      | **P5 + P1**                 | 7 / 2           |
| 6   | Neutral wall-plane garrisons              | **P1 + P2**                 | 6 / 2           |
| 7   | Item-gated terminal classes (A3)          | **P4 + P2**                 | 6 / 2           |
| 8   | Earned stats: Aggression / Discipline (A1)| **P3 + P4**                 | 5 / 2           |
| 9   | Behavior-gated promotions (A2)            | **P4** (deep, narrow)       | 5 / 1           |
| 10  | Attack-count progression (C1)             | **P3 + P4**                 | 4 / 2           |
| 11  | Brace + tier-3+ HP scaling                | **P3**                      | 4 / 1           |
| 12  | Modifier-stack panel (enabler)            | **P3** (precondition)       | 3 / 0           |

**Coverage check.** Top-8 collectively cover all five problems with no
P-axis below "two picks meaningfully push it" — i.e. we are not
accidentally adopting an all-P4 slate. Even paring to a 4-pick subset is
feasible without leaving a P uncovered (sample 4-pick: 1 + 2 + 4 + 5
hits all five P's, total breadth ≥ 3 each).

**Dependency lattice.** #12 (modifier panel) is a hard precondition for
#1, #5, #8 to score what's projected. #2 (mobile queen) is the §7.7
queen-rear spike's natural sequel — it should not advance until that
spike resolves. #3 (reinforcement-spawn POSTs) **reuses the already-shipped
§7.12 engine surface** (`reinforcement-spawned` event); strictly cheaper
than the rest. #4 is the §9 data-only baseline shifter and should land
**first**, alone, so subsequent picks measure against the denser map.

---

## B. Candidates

### 1. Tarot dual-purpose deck (B1)

**Description.** A small deck (6–8 cards to start, not OB's 22) where
each card has **two mutually-exclusive uses**: spend it as a one-shot
**battle effect** (mid-fight swing) **or** as a **persistent POST
effect** (boon attached to a held POST for the rest of the scenario).
Cards are bought from town POSTs with the dormant R12 gold. Hand size
capped at 3. Card pool is deterministic and visible (the shop is the
draw — no RNG). Pattern: 2 attack, 2 defense/heal, 2 status, 2 meta.

**Rubric.**

| P   | Score | Rationale                                                                                                                                                              |
| --- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | 1     | Cards enable surprise plays in new map regions (battle-effect can teleport pressure); minor M1.3 player-action-density gain.                                           |
| P2  | 1     | Card-purchase is a named decision-pull; M2.4 (player can name ≥ 2 things to do).                                                                                       |
| P3  | 2     | Cards are a **visible, named modifier source** — directly attacks M3.3 (≥ 2 modifier types). Heal/defense cards lengthen combat (M3.2 median rounds).                  |
| P4  | 2     | Card effects naturally favor specific compositions ("scout-boost" rewards a fielded scout) → M4.4 utilization; opens M4.5 counter-pick triangles.                     |
| P5  | 3     | Card moments are the cleanest "drama" generator in the slate — M5.1 (a play-card is an authored mid-scenario beat by player intent), M5.3 recall is essentially free. |

**Total: 9 / breadth 3.** Clears threshold with room.

**Engine / data / UI cost.**

- **New data** (`data/level-1/cards.json`): card templates, cost, both
  effect-modes. Authoring cost.
- **New engine state**: `hand: { ant: cardId[], spider: cardId[] }` on
  `GameState` — **golden-master-gated** (`runScenario`-touching).
- **New order type**: `play-card` (engine ops + AI scoring). Gated.
- **New POST modifier**: persistent-mode cards stamp a modifier onto a
  POST; ties into modifier panel (#12). Gated.
- **UI**: hand display in active-face peripheral + card-selection modal
  + battle-mode card slot. Significant client surface.
- Mechanics-research memo §1.3 already costed this; the engine work
  here is the same shape it estimated ("Medium-large").

**L1 containment.** Mostly clean — cards exist for the duration of a
scenario, hand resets on scenario end. **Yellow flag**: if cards
persist across scenarios, this leaks into the world loop. Recommend
**hand wipes on scenario boundary** for L1; persistence is a future
world-loop CR.

**Walk-back cost.** Moderate. Pulling the feature means deleting
`cards.json`, removing `play-card` order, reverting `GameState.hand`.
Save-format breaks for any in-flight runs. Spike-friendly with the
caveat that the gated-sim change needs re-baselining either way.

---

### 2. Mobile-mortal queen (B2)

**Description.** The queen stops being a passive POST-bound sink. She
becomes **deployable, mobile, and vulnerable**: the player issues
queen-orders like any other party; she has reduced HP relative to her
current "POST anchor" form; **if she dies, the scenario is lost
immediately** (existing queen-loss = scenario-loss is retained, but now
that condition can fire in the open field).

**Rubric.**

| P   | Score | Rationale                                                                                                                                                                      |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | 3     | Both sides have to maneuver across the map — the spider has to **hunt** the queen, the player has to **screen** her. Directly attacks M1.1 temporal and M1.2 spatial spread. |
| P2  | 1     | Queen relocation is a meaningful named action — M2.4 decision-pull.                                                                                                            |
| P3  | 0     | No direct combat-legibility effect (her abilities surface modifiers, but that's #12's job).                                                                                    |
| P4  | 1     | Queen is now a fielded combat asset — her abilities matter; bench composition matters more because she needs an escort.                                                       |
| P5  | 3     | The most reliable drama generator. M5.3 recall: every playthrough has a queen moment. M5.1 if "queen-under-threat" emits an event.                                            |

**Total: 8 / breadth 2.** Clears threshold.

**Engine / data / UI cost.**

- **Major sim-path change** — `engine/formation.ts:59-63` currently
  pins the queen to the front row as a damage-soak. This pick removes
  that pin and re-classifies her as a deployable. Bilateral
  (spider-queen identical per Exchange #3).
- **Net curve effect non-obvious** — same risk profile as the §7.7
  queen-rear-zone spike. Recommend folding this into that spike
  rather than spinning a separate one.
- **AI** — both ant and spider AIs need queen-handling logic (escort,
  hunt). Substantial.
- **Schemas** — `WorldRoster.queen` shape may need movement state /
  HP. Likely backward-incompatible; gold-master-gated.
- **UI** — queen renders on the active face as a movable unit. Per-view
  spec updates for Hill, Briefing, Battle, End-of-Scenario.

**L1 containment.** Mostly clean within L1, but it touches the
shipped per-faction queen contract — affects every L1–L10 scenario the
moment it lands. **Yellow flag** on bilateral re-balance: queen-guard
roster compositions across the full tier may need re-authoring.

**Walk-back cost.** **High — one-way door.** Once AIs and rosters
reflect mobile queens, reverting means re-pinning queens and
re-baselining the whole curve again. **Recommend spike-then-commit.**
Honest read: this is the highest-leverage pick on P1+P5 and the most
expensive to undo. The OB extract flagged this same trade-off.

---

### 3. Reinforcement-spawn POSTs

**Description.** A capturing-side reinforcement party spawns at a
designated wall POST when that POST is captured (or held for N turns).
**Reuses the engine surface shipped in §7.12 / Exchange #8** —
`reinforcements` array on the roster file + `reinforcement-spawned`
event. Currently inert on every shipped L1 roster (the brief
acknowledges this).

**Rubric.**

| P   | Score | Rationale                                                                                                                                  |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | 2     | New parties spawn on wall planes mid-scenario → M1.1 temporal spread, M1.2 spatial (drives combat onto walls).                             |
| P2  | 2     | Reinforcement-bearing POSTs are themselves a named decision-pull (M2.4); raises mean-turns-between-caps because capture is now contested. |
| P3  | 0     | No direct effect.                                                                                                                          |
| P4  | 1     | Reinforcement parties are authored from the existing roster — a good vehicle for fielding the under-utilized 50% of templates.            |
| P5  | 3     | Reinforcement-spawn IS the canonical M5.1 scripted beat. M5.2 timing controlled by author. M5.3 recall ("the spider reinforcements arrived at the west wall"). |

**Total: 8 / breadth 3.** Clears threshold.

**Engine / data / UI cost.**

- **Engine: zero** — surface already shipped (§7.12, 732/732).
- **Data**: extend `data/level-1/roster-*.json` `reinforcements`
  entries; author 1–2 per scenario. Pure data, no schema change.
- **UI**: the `reinforcement-spawned` event already exists — the
  client needs to *consume* it as an auto-pause beat (per the brief
  §3d on auto-pause). Modest client work; specced via the
  `docs/drafts/auto-pause-events.md` mechanism.
- **Map-gen**: needs to guarantee designated POSTs land on the
  intended wall planes. Could be the same data change as #4.

**L1 containment.** **Clean.** Engine surface is L1-internal; world
loop sees nothing.

**Walk-back cost.** **Trivial.** Delete the `reinforcements` array
from each roster file; no engine revert needed. Most spike-friendly
pick on the slate. **Strong candidate for first-to-land** (paired
with or following #4).

---

### 4. Wall-POST density + typing (§9 baseline-shifter, extended)

**Description.** Two changes bundled:

1. **Density bump (PM's §9 proposal):** raise map-gen mid-POST range
   from 3–5 to 5–7, place ≥ 1 mid-POST on each wall plane (currently
   east=1, west=0). Data-only; re-baselines gate-29 once.
2. **POST typing (extension):** introduce 2–3 POST templates
   (`gold-mine`, `sanctum`, `watchpost`) with differing per-turn
   yields and capture incentives. Replaces the homogeneous POST
   array.

**Rubric.**

| P   | Score | Rationale                                                                                                                          |
| --- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| P1  | 2     | Densifying walls directly attacks M1.2 (≥ 3 tiles, ≥ 2 planes, ≥ 1 wall) — current baseline scrapes by on one wall, fails on the other. |
| P2  | 3     | This **is** the P2 fix. M2.1 (12–16 POSTs) and M2.2 (≥ 2 per plane) both directly addressed by the data change.                    |
| P3  | 0     | No combat-loop effect.                                                                                                             |
| P4  | 1     | Typed POSTs create slight comp pull (gold-mine favors scouts to flip fast; sanctum favors casters).                                |
| P5  | 1     | Named POST types give M5.3 recall a foothold ("we held the west sanctum").                                                         |

**Total: 7 / breadth 3.** Clears threshold.

**Engine / data / UI cost.**

- **Density bump alone**: pure data / map-gen tuning. No engine change.
  **Re-baselines gate-29 once** — the brief explicitly accepts this
  during the L1 iteration phase.
- **POST typing**: adds a `type` field on POSTs (additive schema), per-
  type yield/effect handling in `engine/post-capture.ts` and turn-end
  econ. Modest gated sim work; bundle the re-baseline with the density
  bump to avoid two re-baselines.
- **UI**: per-view UI specs need POST-type rendering on the active
  face and on the Briefing summary.

**L1 containment.** **Clean.** All map-gen / POST work is L1-internal.

**Walk-back cost.** **Trivial for density bump** (revert the
constant); **moderate for typing** (the per-type effects would need
to be torn out). Recommend landing the density bump first as a
free-standing change, then evaluating typing against the new baseline.

---

### 5. Scripted-beat surface + 1–2 authored L1 beats

**Description.** Introduce a generic `scripted-beat` engine event kind
keyed off a (turn, condition) trigger array on the scenario data file.
Each scenario authors 1–2 beats: named-enemy entrance ("the Stalker
arrives at turn 12"), POST-flip cinematic ("the sanctum darkens when
captured by spiders"), terrain shift, NPC dialogue cue. Beats consume
the existing auto-pause mechanism.

**Rubric.**

| P   | Score | Rationale                                                                                                       |
| --- | ----- | --------------------------------------------------------------------------------------------------------------- |
| P1  | 2     | Beats are authored to fire at off-peak turns and at non-default tiles — directly tools temporal+spatial spread. |
| P2  | 1     | Beats add decision-pull (M2.4).                                                                                 |
| P3  | 0     | No combat-loop effect.                                                                                          |
| P4  | 1     | Beats can introduce one-off units (a named-enemy template) → roster diversity exposure.                         |
| P5  | 3     | This IS M5.1/5.2/5.3. Authored beats are the most direct lever.                                                 |

**Total: 7 / breadth 2.** Clears threshold.

**Engine / data / UI cost.**

- **New engine surface** — `scripted-beat` event union variant; trigger
  evaluator in `engine/turn.ts`. **Gated** (touches `runScenario`).
  Could be guarded inert-on-empty per §7.12 precedent (byte-identical
  if no scenario authors any beat).
- **New data** — `beats: [...]` on each scenario roster file. Each
  beat is `{ trigger: {turn?, condition?}, kind, payload }`.
- **Authoring content** — 1–2 beats per L1 scenario. Design+writing
  work.
- **UI** — auto-pause consumer + a beat-display surface (toast?
  modal?). New per-view spec content.
- Distinct from #3 (reinforcement-spawn POSTs): #3 reuses an existing
  beat-shaped surface; #5 generalizes it for non-reinforcement beats.

**L1 containment.** **Clean** if beats are scenario-scoped. **Yellow
flag** if beats reference world-loop state (e.g. "Antonio's anger from
L0 carries over") — keep beats L1-internal for now.

**Walk-back cost.** **Low-to-moderate.** The engine event variant
stays guarded-inert; removing the feature is mostly deleting
authored content.

---

### 6. Neutral wall-plane garrisons

**Description.** Place neutral parties (using existing R8/R10/R11
neutral mechanics) on wall planes — these are non-aggressive but
ranged-threatening occupants of wall tiles. Flipping a wall POST may
require clearing the garrison; defeating one drops a small reward
(gold, ability charge, or — paired with #7 — a promotion-key item).

**Rubric.**

| P   | Score | Rationale                                                                                              |
| --- | ----- | ------------------------------------------------------------------------------------------------------ |
| P1  | 2     | Battles happen on walls who currently see none. M1.2 spatial spread.                                   |
| P2  | 2     | Garrisons are visible board-state non-goal targets — M2.3 mean-turns-between-caps drops; M2.4 decision-pull. |
| P3  | 0     | No combat-loop effect.                                                                                 |
| P4  | 1     | Comp pressure — flying / ranged units are favored for walls.                                            |
| P5  | 1     | Named garrisons (the Stalker's Web, the Old Sanctum guardians) give M5.3 recall.                       |

**Total: 6 / breadth 2.** Clears threshold.

**Engine / data / UI cost.**

- **Data only** if neutral placement is authored via existing R10/R11
  mechanisms. No engine change.
- **Map-gen** — needs to guarantee neutral parties land on intended
  wall planes; either authored per scenario or a map-gen tuning bump.
- **AI** — spider AI may need a "leave the garrison alone unless
  threatened" hint; otherwise the garrison's pathing/aggression rules
  are already in R10/R11.
- **UI** — neutral garrison rendering already exists.

**L1 containment.** **Clean.**

**Walk-back cost.** **Trivial.** Remove neutral entries from the
scenario rosters.

---

### 7. Item-gated terminal classes (A3)

**Description.** Repurpose 2–3 of the existing 6-template item slots
(R14) as **promotion keys**: holding the item doesn't buff the unit
directly, but unlocks a unique elite promotion on next level-up
("ant-mage holding `phero-crown` → ant-archmage with the Hex chain").
Items drop from neutral garrisons (#6) or are sold at sanctum POSTs
(#4). Eats the R12 gold-without-a-sink problem and the R14 flat-+1
problem in one move.

**Rubric.**

| P   | Score | Rationale                                                                                                                                          |
| --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | 0     | No direct effect.                                                                                                                                  |
| P2  | 2     | Items at POSTs make POSTs worth flipping for reasons other than score (M2.4). Requires #4's typing for the drop location to feel motivated.       |
| P3  | 0     | No combat-loop effect.                                                                                                                             |
| P4  | 3     | M4.1 templates expand via terminal classes; M4.4 utilization (the item recipient is fielded); M4.5 counter-pick (terminal classes have distinct silhouettes). |
| P5  | 1     | Promotion-via-rare-item is memorable. M5.3 recall.                                                                                                 |

**Total: 6 / breadth 2.** Clears threshold (depends on #4 to land
strong).

**Engine / data / UI cost.**

- **Data** — promotion keys flagged on item templates; `promotionTo`
  + `promoteItemRequired` on caster/footman templates.
- **Engine** — promotion gate consults item slot. Gated (sim-path)
  but cheap — the item slot is already consulted in combat.
- **UI** — Organize Army shows which units have unlocks pending; the
  battle UI shows the item that enabled the promotion.

**L1 containment.** **Yellow flag.** Cleanest if promotion is
within-scenario only. If terminal-class units persist to the world
roster, the world loop sees the change. Recommend per-L1-scenario
promotion that **does not** persist for first pass.

**Walk-back cost.** **Moderate.** The terminal-class templates would
need deleting from data and the gate would need un-wiring.

---

### 8. Earned stats: Aggression / Discipline (A1)

**Description.** Two per-party stats accrued from observed behavior:
**Aggression** (gains from initiating combat, loses from defending);
**Discipline** (gains from holding POST, loses from retreating).
Stats are visible on the party card and gate ability access /
promotion eligibility ("Aggression ≥ 30 unlocks Charge"; "Discipline
≥ 20 unlocks Brace"). Behavioral fingerprints, not allocations.

**Rubric.**

| P   | Score | Rationale                                                                                                                                |
| --- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | 1     | Aggression-gain incentivizes initiation — M1.3 player-action-density nudges up.                                                          |
| P2  | 0     | No direct effect.                                                                                                                        |
| P3  | 2     | Stats appear in the combat modifier stack — M3.3 visibility; M3.4 legibility ("she hit harder because Aggression 45").                  |
| P4  | 2     | Gate access encourages bench rotation — M4.4 utilization; different stat profiles ≈ M4.5 counter-pick.                                  |
| P5  | 0     | No direct beat.                                                                                                                          |

**Total: 5 / breadth 2.** Clears threshold (just).

**Engine / data / UI cost.**

- **Engine** — two new fields on `Party` or `Unit`; accrual hooks in
  `engine/battle.ts` (initiation, retreat) and
  `engine/post-capture.ts` (hold). Gated, modest.
- **Data** — `requiresAggression` / `requiresDiscipline` on ability
  templates.
- **UI** — stats on party card; gate indication on ability tooltip.
- **AI** — both AIs need stat-aware scoring (don't farm low-tier kills
  for Aggression; don't retreat away a high-Discipline gate).
- Dependency: **#12 modifier panel** to actually surface the stat
  modifiers in battle.

**L1 containment.** **Yellow flag** if stats persist to world loop
(a unit's accrued stats follow it). Recommend per-scenario reset for
v1, persistence as a later world-loop CR.

**Walk-back cost.** **Moderate.** Removing the gate is easy;
removing the accrual hooks requires a sim re-baseline.

---

### 9. Behavior-gated promotions (A2)

**Description.** Single base unit → 2-3 variants based on the
behavior band it stayed in during the scenario. An ant-mage that cast
`pheroblast` ≥ N times promotes to one branch; one that healed
mostly promotes to another. Per OB extract, this is flagged as
**Phase-5 not Phase-4** — the slowest-burn, highest-replayability
mechanic.

**Rubric.**

| P   | Score | Rationale                                                                                            |
| --- | ----- | ---------------------------------------------------------------------------------------------------- |
| P1  | 0     | No direct effect.                                                                                    |
| P2  | 0     | No direct effect.                                                                                    |
| P3  | 1     | Promoted variants have distinct silhouettes → mild M3.4 legibility uplift.                           |
| P4  | 3     | Heavy P4 lift: M4.1 (templates expand), M4.4 (players field-and-shape variety), M4.5 (counter-pick). |
| P5  | 1     | Promotion at scenario end ≈ M5.3 recall.                                                             |

**Total: 5 / breadth 1.** **Fails breadth threshold** — P4-only.
Listed because PM may want it for paring against #7 (both P4-heavy).

**Engine / data / UI cost.**

- **Engine** — per-unit behavior counters (cast-count by type, kill
  type, etc.); promotion gate consults bands. Gated. **Modest engine,
  large balance surface.**
- **Data** — promotion forks on existing templates; new template
  variants per branch.
- **UI** — promotion outcome on End-of-Scenario screen; behavior
  histogram on party detail.

**L1 containment.** **Yellow flag** — same as #7 / #8 on whether
promoted templates persist to the world roster. Per-scenario reset
recommended for v1.

**Walk-back cost.** **Moderate-to-high.** Once players see variants,
removing them is a feature retraction. The OB extract's "Phase-5,
not Phase-4" sequencing is the right pacing — defer.

---

### 10. Attack-count progression (C1)

**Description.** Replace stat-bump promotions with **extra-attack-per-
turn** thresholds at tier 2 and tier 3 — a fighter goes 1 attack → 2
→ 3 across promotion. Borrowed from OB's central progression lever
(stat creep is small; attack-count creep is the real progression).

**Rubric.**

| P   | Score | Rationale                                                                                  |
| --- | ----- | ------------------------------------------------------------------------------------------ |
| P1  | 0     | No direct effect.                                                                          |
| P2  | 0     | No direct effect.                                                                          |
| P3  | 2     | M3.2 median rounds — more attacks per fight ≈ more rounds; M3.1 animated ratio improves.   |
| P4  | 2     | Tier-3 units feel distinct (M4.1 distinct templates); M4.4 utilization (bench fielded).    |
| P5  | 0     | No direct effect.                                                                          |

**Total: 4 / breadth 2.** **Fails total threshold.** Listed because
it pairs cleanly with #11 to attack P3.

**Engine / data / UI cost.**

- **Engine** — `engine/battle.ts` round loop already supports
  multi-attack; the change is on the template (`attacksPerTurn`).
  Gated, **cheap by sim standards**.
- **Data** — `attacksPerTurn` on each template tier.
- **UI** — battle log shows N attacks per unit; mostly free if
  battle replay already iterates rounds.
- **Balance** — non-trivial. Doubling attacks doubles damage; needs
  HP scaling (#11) to not collapse fights faster.

**L1 containment.** **Clean.**

**Walk-back cost.** **Low.** Revert `attacksPerTurn` per template
(re-baseline).

---

### 11. Brace + tier-3+ HP scaling

**Description.** Two combat-lengthening changes bundled:

1. **Brace ability** — a defensive ability that boosts incoming-damage
   resistance for the next round, with a visible animation.
2. **HP scaling on tier-3+ promotion** — promoted templates get
   substantial HP increases (not stat creep — a meaningful jump) so
   that fights last long enough for the play-by-play to have content.

**Rubric.**

| P   | Score | Rationale                                                                                                                          |
| --- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| P1  | 0     | No direct effect.                                                                                                                  |
| P2  | 0     | No direct effect.                                                                                                                  |
| P3  | 3     | This **is** the P3.2 fix. Lengthens combat to ≥ 3 rounds. M3.4 legibility (brace is a visible defensive moment).                  |
| P4  | 1     | Brace differentiates "tanky" templates; mild M4.1 distinction.                                                                     |
| P5  | 0     | No direct effect.                                                                                                                  |

**Total: 4 / breadth 1.** **Fails both.** Listed as the cleanest
direct hit on M3.2 (median rounds = 1.5 → ≥ 3 is one of the harshest
target gaps in the rubric).

**Engine / data / UI cost.**

- **Data** — HP curve per template tier; one new ability.
- **Engine** — Brace as an ability hooks the modifier stack. Gated,
  modest.
- **UI** — animation surface for Brace.
- **Balance** — HP scaling shifts the curve hard; full re-baseline.

**L1 containment.** **Clean.**

**Walk-back cost.** **Moderate.** HP curve revert requires
re-baseline; Brace removal is data-only.

---

### 12. Modifier-stack panel (enabler / precondition)

**Description.** Extend the `battle-resolved` event payload with the
**list of modifiers** that contributed to the combat outcome (terrain,
POST aura, card, formation rank, earned-stat) and add a UI panel that
displays them per-round. This is **engine work that scores low alone
but multiplies P3 returns on every other pick that adds a modifier
source** (#1 cards, #4 typed POSTs, #8 earned stats, #11 brace).

**Rubric.**

| P   | Score | Rationale                                                                              |
| --- | ----- | -------------------------------------------------------------------------------------- |
| P1  | 0     | —                                                                                      |
| P2  | 0     | —                                                                                      |
| P3  | 3     | Directly attacks M3.3 (NO → YES on ≥ 2 modifier types) and M3.4 legibility.            |
| P4  | 0     | —                                                                                      |
| P5  | 0     | —                                                                                      |

**Total: 3 / breadth 0.** **Listed as a precondition / multiplier**,
not a standalone pick. It is what allows #1/#4/#8/#11 to score what
they score on P3.

**Engine / data / UI cost.**

- **Engine** — extend `ReplayEvent` `battle-resolved` payload (a
  forward-dep flagged in the brief). **Schema change**; gated;
  byte-identity may need re-baseline depending on whether the field
  is opt-in / sparse.
- **UI** — new modifier-stack panel on Battle view; per-view spec
  update.

**L1 containment.** **Clean** (engine surface is L1-internal).

**Walk-back cost.** **Low.** Removing the panel is UI-only; rolling
back the event payload is awkward (schema migration) but isolated.

---

## C. Response to brief §9 (PM open question)

**The §9 proposal:** bump map-gen mid-POST range from 3–5 to 5–7 **and**
move at least one POST onto each wall, as a baseline shifter before the
OB picks land.

**Design response: confirm.** Three reasons:

1. **It is the cheapest non-trivial dial.** Pure data / map-gen; one
   gate-29 re-baseline; no engine change. Risk-of-regret is minimal.
2. **Without it, scoring is dishonest.** Several of the picks above
   (#3 reinforcement-spawn POSTs, #6 garrisons, #7 item-gated classes)
   project their P2 contribution **on top of** the §9 baseline. If §9
   doesn't land, those picks score lower and pull breadth coverage.
3. **It re-tests the "P1 is geographic" hypothesis.** The reframe in
   brief §5.2 (the walls are abandoned) is testable as soon as walls
   have POSTs to fight over. If wall fights still don't materialize
   after the bump, that itself is a finding that shifts the slate.

**One refinement to add:** the bump alone gives more POSTs but not
necessarily more *reasons* to take wall POSTs. Pair it with at least
one of #3 or #6 in the same release window so the new wall POSTs
have content. If only the count is bumped, the spider's "beeline to
storm-drain" still dominates and the M1.2 gain is paper-only.

**Recommended sequence:**

1. §9 density bump (data-only) — **lands first, alone, re-baselines gate-29**.
2. #4 POST typing (after measuring §9 in isolation).
3. #3 reinforcement-spawn POSTs (reuses §7.12 surface; cheap).
4. Then the slate of higher-leverage picks per pare-down.

---

## D. Questions surfaced for PM

These came up while drafting; flagging rather than blocking on them.

1. **B3 (prologue questionnaire) is omitted.** The OB extract Tier-B
   nominated it; the brief defers world-loop / L0 work. L0 has shipped
   (§7.11) but is "prepended-prologue, outside Tier-1 curve" — does it
   count as "L1 iteration" scope? Default assumption: **no**, propose
   B3 as a separate L0-track exchange. Push back if PM wants it in
   this slate.
2. **Phase-5 deferrals.** OB extract flagged A2 (behavior-gated
   promotions, #9 here) as Phase-5. PM may want #9 explicitly dropped
   from the L1-iteration window rather than carried as a below-
   threshold candidate. Confirm.
3. **B2 sequencing.** Mobile-mortal queen (#2) reads as the §7.7
   queen-rear spike's natural sibling. Should the spike's scope
   extend to cover the mobility variant, or should B2 be a fresh
   spike? Default assumption: **extend the existing spike**.
4. **Modifier panel (#12) as a standalone Template-A.** Because #12
   is a precondition for #1/#8/#11's P3 scores, it may need to land
   *before* those picks — even though it doesn't clear threshold on
   its own. Recommend filing #12 as a Template-A immediately on
   adopting any of {1, 8, 11}.
5. **Tarot deck (#1) hand-persistence.** L1-containment flagged it
   yellow: confirm that hand wipes on scenario boundary for v1, with
   cross-scenario persistence as a deferred world-loop CR.
6. **Pare-down target.** Brief §6 wants 2–4 final picks. Above-the-
   fold §A's 4-pick sample (1 + 2 + 4 + 5) is one viable slate;
   alternative 4-pick slates exist. Happy to draft 2–3 alternative
   slates with their rubric coverage if useful for the pare-down
   conversation.

---

## E. Promotion to Template-A

Per brief §6, each adopted pick becomes its own Template-A. Suggested
order of conversion once PM has pared:

1. §9 density bump — file as a fast Template-A (data-only,
   re-baseline-once).
2. Any chosen #3-class pick (reinforcement-spawn POSTs) — same window
   as §9 if possible; reuses shipped engine.
3. #4 typing, #12 modifier panel — sequenced as paired
   precondition + payload work.
4. The "big" picks (#1 cards, #2 mobile queen) — each gets its own
   Template-A and likely a re-baseline window.

Each conversion happens via the existing change-request-protocol shape;
this doc is **upstream of** Template A, not a substitute for it.
