# Gameplay Progression Agent — L8 Attic Mechanic Delta: ARBITRATION

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2).
**Status:** Phase-D L8 deliverable. Document only — no code, no scenario
data. This is the concrete L8 mechanic delta spec the orchestrator
wires into `data/level-8/` (over the Level PA's placeholder) and the
within-scenario loop tunes.
**Inputs:** `docs/debate/l8-ant-advocate.md`,
`docs/debate/l8-spider-advocate.md` (opening + rebuttal each);
`docs/debate/l6-gameplay-pa-arbitration.md` (the **merged-L6 baseline
this deltas FROM** — POST-occupation `healingRate:3`/`defensiveBonus:3`
Step-Landings + the binding spider-sortie doctrine, plane-switch full
corner coverage, plane-affinity at the carried `spider combat
wall +1/+1` + full coverage, hypnotize light `minControlTurns:2,
maxControlTurns:3`, recruit-as-order, the carried L4/L5 state; all carry
forward into L8 **byte-identical** except where this delta explicitly
changes them; **not** relitigated. **L7 is PARKED** —
level-progression-plan §4f, preserved on `claude/l7-parked-wip`, NOT
merged; the L8 delta is FROM merged L6, the L7 disposition deferred to
the post-L8–L10 review; the curve is reasoned L6 **56** → L8 directly,
L7 a known gap, NOT interpolated);
`docs/debate/l5-gameplay-pa-arbitration.md` §2/§3.3/§4c (the
**hypnotize-light cap being REVERSED here** — L5 cited the carried-in
baseline `hypnotize {successRate 0.8, minControlTurns 5,
maxControlTurns 10, reboundImmunityTurns 10}` and capped it to
`minControlTurns 5→2, maxControlTurns 10→3`, `successRate`/`rebound`
explicitly unchanged; the L8 restore reverts to the pre-L5 originals);
`docs/debate/l4-gameplay-pa-arbitration.md` §9 (the
**empirical-falsification precedent**: a ruled value the frozen AIs do
not exercise measured ant 99% / +39pp; the §7 reopening clause makes a
built level that misses its band reopen; the ship-gate here MUST be
measurable); `docs/mechanic-distribution-plan.md` §2 (the L8 row:
hypnotize full power; tiered MP pool; POST-occupation bonus applies to
attic geometry; score-tiebreaker active in all scenarios from here;
Skylight one-way transit), §3.H (hypnotize light L5 → **full power
L8**, the designed climax), §4 (win-curve: L8 the deliberate spike,
"the hard level before the end"), §5 (boundary cases — Skylight
one-way is Level-owned connectivity, not a Gameplay combat lever);
`docs/level-progression-plan.md` §2 L8 (Attic geometry: `static`,
10×10, navigable 8×8 floor core, ceiling clipped to a 5×5 core, ~10
scattered box obstacles, 6 POSTs incl. one-way Skylight, ~8
cockroach-neutral spawns — Level-owned, running in parallel, **not**
designed here), §4b (engine FROZEN — `recruit-count` victory + dual
loss implemented PR #11, one-way transit PR #14, tiered-MP machinery
live Round 21; **data/AI-config only, no new engine code**), §4c
(score-resolution **N/A for `recruit-count`** — mission-decisive, no
grind-to-score path; the `capture-post` low-`drama` signature does NOT
apply), **§4d (BINDING — plane-affinity `wall` deltas empirically inert
under the chain-march/fortress AI doctrine; carried from L6 unchanged,
NOT a curve lever, NOT budgeted)**, **§4e (BINDING — occupation-
`healingRate` economy is engine-inert outside forced co-occupation;
NOT an L8 lever)**, **§4f (BINDING — the commander-card economy CANNOT
be the L8 curve lever under the locked card-host heuristic; the L8
rebound/curve MUST NOT be built on cards; no card-economy corrective in
any fallback)**.
**Bounded by:** §3.1 hard floors, §3.4 cumulative-addition, §5 curve
(L8 ≈ **50–54%**, the **continued decisive descent** below L6 56 toward
the L10 ~50 climax — the user's explicitly-licensed "hard level before
the end"; monotone-down vs L6, separated above L10; **L7 PARKED, NOT
interpolated**), §6.3 ownership (Gameplay owns this; the cramped
clipped-ceiling box-maze geometry, 6 POST placements, ~8 cockroach
spawn _positions_, the one-way Skylight transit node are the Level PA's,
running in parallel — **not** designed here). Engine surface frozen
(§4b) — this delta is **data-only**: the shipped `recruit-count`
`victoryConditionSchema` member + its `end-of-turn.ts:538-548` win
check + dual loss (PR #11), the shipped `hypnotize`/`recruit` ability
params via `data/level-8/abilities.json`, the live Round-21 tiered-MP
machinery (`engine/mp-tiers.ts`, `INITIAL_MP_SLOTS {4,2,1}` **frozen**)
driven by data ability `tier` + caster-eligibility
(`intelligence>=5`/`'caster'` tag) + per-ability `uses`, roster gating
via `data/level-8/roster-*.json`, AI-config via the within-scenario
loop. **No new engine code.**

---

## 1. What was actually contested

Placement was **not** in contest and is not re-decided here. The
mechanic-distribution plan §2 / §3.H already ruled the entire L8
component set (hypnotize full power, tiered MP, score-tiebreaker-
everywhere, Skylight one-way); the L5 arbitration fixed the cap this
reverses; level-progression-plan §4d/§4e/§4f _directed_ the
no-plane-affinity / no-occupation-economy / no-card outcomes; the L6
arbitration fixed the state L8 inherits. Both faction sub-agents
conceded every placement explicitly:

- **`recruit-count` victory + dual loss** — Level-owned victory
  structure, engine-implemented (PR #11, `end-of-turn.ts:538-548`;
  ant wins iff `recruitedPartyCount(cockroach) >= target`, loses if
  queen dead OR no recruiter remains); no score path (§4c). Both
  conceded it entirely as the structural spider tax already priced into
  the dip — "a ratification, not a debate."
- **Hypnotize full-power restore at L8** — ruled §3.H, the designed
  climax with the L5-§4c forward-consistency clause on record. Both
  conceded the slot; both insisted the restore be the _genuine_ pre-L5
  original, not a quiet half-restore.
- **Tiered MP debut at L8** — ruled §2; both conceded the slot and the
  frozen engine machinery; both insisted it be a _real binding data
  constraint_, not a placement gesture.
- **No plane-affinity delta** — _directed_ by level-progression-plan
  §4d (empirically inert; latent identity layer). Both accepted without
  contest; the spider explicitly: "the lesson cuts for me too."
- **No card-economy curve reliance** — _directed_ by §4f. Both accepted
  without contest; the spider explicitly refused to have its climax
  "hung on an inert system."
- **The entire merged-L6 state** (POST-occupation Step-Landings +
  sortie doctrine, plane-switch full corner coverage, plane-affinity
  `spider combat wall +1/+1` + full coverage, recruit-as-order, the
  carried L4/L5 state) carries forward **byte-identical** — not
  relitigated.

The two faction sub-agents converged — the same §6.2-designed profile
the L3/L4/L5/L6 debates produced — onto a **single residual: the
pricing of two load-bearing levers and the specification shape of the
binding bound**, with strong agreement on structure:

- **Both agree** the **`recruit-count` race tuning is the load-bearing,
  §4f-compliant, AI-exercised curve lever** — the win condition every
  AI on the board acts on every turn, in the §4f-preferred
  structurally-robust mission class (the ant from the no-cold-stomp
  side, the spider from the my-payoff-must-fire side). **This is a
  convergence, not a dispute.**
- **Both agree** the **hypnotize full-power restore must be the genuine
  pre-L5 original** (`minControlTurns 2→5, maxControlTurns 3→10`;
  `successRate 0.8` and `reboundImmunityTurns 10` unchanged, the L5
  §3.3 "the cap touched only duration" symmetric reading) and must
  **register** as the dominant engine of the dip (not a quiet
  half-restore tuned to a behavior-flavor zero — the §4d/§4f failure
  inverted). The daylight is pp-pricing, which the curve resolves.
- **Both agree** **tiered MP is the ant's answer-in-the-room ceiling**
  that bounds the restore. The daylight is whether the per-caster
  tier-3 slot is an over-constraint (one throwaway cast, the spider's
  fear) or an under-constraint (the ant's cold-stomp fear) — a sizing
  question the curve + roster make objective.
- **Both agree** no plane-affinity (§4d), no card reliance (§4f), no
  `healingRate` occupation economy (§4e); mission-structure tax not
  double-counted (mutual; ratification).

This is exactly the §6.2 convergence the format is designed to produce:
the adversarial exchange collapsed a multi-component room to (1) a set
of pre-ruled / §4d-§4e-§4f-directed placements both sides ratified, and
(2) a **single specification-and-pricing question with both sides
independently converged on the answer** (the `recruit-count` race as
the §4f-robust lever; full-power hypnotize the genuine pre-L5 original
as the engine; the per-caster tier-3 MP slot as the ceiling) — the
residual being pricing the curve resolves.

---

## 2. The L8 baseline (what merged L6 ships, what L8 deltas FROM)

From `data/level-6/*` (verified against source). The L8 delta is
expressed against these:

- **`units.json` `planeAffinity`** — the merged-L6 state, **carried
  into L8 byte-identical** (verified `data/level-6/units.json`: spider
  combat templates `wall {attack:1, armor:1}`, `ceiling {1,1}`; ant /
  queen / support / neutral rows per L6). **L8 does NOT touch
  `planeAffinity`** — directed by level-progression-plan §4d. Stated
  for the orchestrator's no-touch guarantee; **not** budgeted as an L8
  win-rate mover.
- **`victoryCondition`** — the Level-owned L8 objective is
  `{ kind: "recruit-count", target: <N>, unitTemplateId: "cockroach" }`
  (shipped `victoryConditionSchema` member, `engine/schemas/map.ts:34-38`;
  carries no POST reference). Engine: `checkWinner` `recruit-count`
  case (`end-of-turn.ts:538-548`, verified) — ant loss if queen dead;
  ant win iff `recruitedPartyCount(state, "cockroach") >= target`
  (checked _before_ the recruiter-loss so a target met the same turn
  the last mage dies still wins); ant loss if target unmet AND
  `antRecruiterRemains` is false (no living unit grants `recruit`). All
  already-implemented (PR #11); **L8 uses it; the `target` value is the
  Gameplay-owned curve tuning ruled below.**
- **`abilities.json` `hypnotize`** — carried from L6 byte-identical:
  `tier:3, uses:null, cooldown:0, params {successRate 0.8,
minControlTurns 2, maxControlTurns 3, reboundImmunityTurns 10}`.
  These are the **L5-capped values** (L5 §3.3/§4c capped
  `minControlTurns 5→2, maxControlTurns 10→3` from the pre-L5
  baseline L5 §2 cites). The L8 delta reverts the cap.
- **`abilities.json` `recruit`** — carried from L6 byte-identical:
  `tier:2, uses:null, cooldown:2, params {successRate 0.25}`. The L8
  delta tunes the recruit-race economy here.
- **Tiered-MP machinery** — live since Round 21
  (`engine/mp-tiers.ts`), engine-FROZEN: caster-eligible units
  (`baseStats.intelligence >= 5` OR template `tags` includes
  `'caster'`) carry the hardcoded `INITIAL_MP_SLOTS {tier1:4, tier2:2,
tier3:1}` pool; each ability's data `tier` (1/2/3/null) gates which
  slot it drains; higher tiers cannot drain lower; the legacy `uses: N`
  cap still applies on top. **The engine constant is frozen and NOT
  changed.** `hypnotize` is tier-3, `recruit` is tier-2 (both already
  in the carried L6 abilities data). The L8 _data_ delta is the tier /
  caster-eligibility / `uses` configuration that makes the pool
  **bind for the first time**.

The honest framing of the L8 delta: not "introduce `recruit-count` /
hypnotize / tiered MP" (the victory member, the ability, and the
tiered-MP machinery are all already shipped) — it is **"in the
cramped, no-turtle Attic, the win condition becomes a flat-out race to
recruit cockroach parties, the hypnotize the player has played around
since L5 returns at its genuine original full power and weaponizes the
prize roaches against the queen, and the tiered-MP pool finally bites —
bounding that full-power hypnotize (and the recruit cadence) to a
structured, plannable scarcity so the climax is hard-but-fair, not an
unbounded cold-stomp."** One room of change in _function_, expressed
entirely through existing data structures + within-loop AI-config. The
single new high-cognitive mechanic is the hypnotize full-power restore
(tiered MP is a low-cognitive structured-scarcity refinement per the
roadmap §2 queue / mechanics memo §1.1 "mild balance impact";
score-tiebreaker-everywhere is a passive scoring rule and is moot under
`recruit-count`'s no-score-path §4c; `recruit-count` is the Level-owned
victory structure).

---

## 3. RULING

Decided on **win-curve shape** (the §3.4.4 binding arbiter), with the
§5 "interesting > fair" license consulted and found to **reinforce**,
not override, the curve answer (both factions' interest arguments are
credible and aligned — the room is the spec's hypnotize climax racing
the player for the same prize). The curve intent is explicit and
binding: **L8 ≈ 50–54%, the CONTINUED DECISIVE DESCENT — a clean
monotone drop below merged L6's ~56% toward the L10 ~50 climax, the
hardest-but-fair "hard level before the end"** (roadmap §5;
mechanic-distribution plan §4). **L7 is PARKED**
(level-progression-plan §4f): the curve is reasoned **L6 56 → L8
directly**; L7 is a known gap, **NOT interpolated** into the descent
math; the L7 disposition is deferred to the post-L8–L10 review.

### 3.1 The `recruit-count` race tuning — RULING: the load-bearing, §4f-compliant, AI-EXERCISED curve lever; the delta budget is spent HERE

**RULING: the L8 curve is carried by the `recruit-count` race economy
— `victoryCondition.target`, the `recruit` ability `successRate` /
`cooldown`, the cockroach-neutral spawn count, and the mage-recruiter
survivability gate. This is the §4f-compliant, structurally-robust
mission lever both factions independently converged on: the win
condition every AI on the board reads and acts on every turn. A
card-economy lever is REJECTED (§4f — the locked card-host heuristic
makes it inert; parked-L7's four falsifications are the precedent). A
plane-affinity lever is REJECTED (§4d — empirically ~0pp). A
`healingRate` occupation-economy lever is REJECTED (§4e — winner-take-
all POST race nullifies it outside forced co-occupation). The delta
budget is spent on the recruit-race, the lever the locked AI paths
demonstrably convert.**

This is the §4d/§4e/§4f discipline applied affirmatively: rather than
ruling a lever and watching it falsify (the L4-§9 / parked-L7
precedent), the arbiter spends the budget _only_ on the lever the
frozen AIs provably exercise. `recruit-count` (§4.3.3) is a mission
race: the ant mage-escort prioritizes reaching and recruiting
cockroach neutrals; the spider AI (§4.3.3: "prioritizes hypnotize over
offensive moves") races to flip the same neutrals first and send them
at the queen. Both AIs' decision functions read the live
recruited-count, the remaining-neutral pool, and the recruiter roster
every turn — these are first-order inputs to the mission optimizer, not
a `wall` gradient the chain-march/fortress doctrine never enters, not a
card the immobile queen-guard never plays offensively, not a per-turn
heal the winner-take-all race nullifies. The concrete data dials
(§3.4):

1. **`victoryCondition.target`** — the count of recruited-and-alive
   cockroach parties the ant must hold. The single highest-leverage
   curve dial; read by the engine win check every end-of-turn (maximally
   AI-exercised). Roadmap §4.3.3 illustrative "≥4".
2. **`recruit` `params.successRate` (L6 `0.25`) and `cooldown`
   (L6 `2`)** — the recruit-race _tempo_: how fast the ant mage line
   converts neutrals. The recruit-race tightness knob.
3. **The cockroach-neutral spawn count** (roadmap §4.3.3: "~8 instead
   of the standard 1") — more neutrals = more recruit opportunities =
   the ant absorbs more spider hypnotize-denials. Gameplay
   recruit-economy dial (Level PA owns spawn _positions_; the _count_
   is "pure Gameplay, deliberately not flagged" per Level PA §4).
4. **The mage-recruiter survivability gate** — `recruit` is mage-only
   (`antRecruiterRemains` keys off `RECRUIT_ABILITY`); the dual-loss
   "no recruiter remains" arm means the spider's alternative to
   out-flipping is to _kill the mages_, making mage roster
   survivability (`data/level-8/roster-ants.json` composition) a real
   curve input.

**Win-curve justification (§5):** the recruit-race under full-power
hypnotize is a genuine coin-flip mission — the dominant structure of
the L6 56 → L8 ~50–54 continued descent (the spider actively flips the
prize neutrals against the queen; no turtle, no score escape). It is
§4f-robust: the win condition itself, which the locked AIs cannot
ignore the way they ignore cards/plane-affinity/heal-economy.
**Interesting-vs-fair:** interest reinforces — a race for the same
prize against an enemy that turns your recruits into queen-charging
suicides is _the reason L8 is a game_; §5's hard-level-before-the-end
license covers the dip.

### 3.2 Hypnotize FULL-power restore — RULING: the exact pre-L5 originals, the dominant engine of the dip; a partial/quiet half-restore is REJECTED

**RULING: hypnotize is restored to the exact pre-L5 original values.
The L5 cap (`minControlTurns 5→2, maxControlTurns 10→3`,
`docs/debate/l5-gameplay-pa-arbitration.md` §3.3/§4c) is REVERSED:
`minControlTurns 2→5`, `maxControlTurns 3→10`. `successRate` stays
`0.8` and `reboundImmunityTurns` stays `10` — UNCHANGED (the L5 §3.3
binding "the cap touched only duration; the gate is identity/cost, not
strength" symmetric reading: restore exactly and only what the cap
touched — no arbiter-invented `maxControlTurns 6` middle). This is the
§3.H designed climax and the dominant engine of the continued descent
(−5 to −7pp ant vs the L6 anchor). A partial restore or a hypnotize
quietly tuned toward a behavior-flavor zero is REJECTED — it is the
§4d/§4f failure (a ruled payoff the system under-delivers measures
inert) inverted onto the spider's owed climax.**

Citing the L5 record exactly (the brief mandates it):

- **L5-capped values (carried into merged L6, the L8 baseline):**
  `hypnotize {successRate 0.8, minControlTurns 2, maxControlTurns 3,
reboundImmunityTurns 10}` (`data/level-6/abilities.json`, verified;
  L5 arbitration §4c).
- **Pre-L5 original values (the L5-§2-cited carried-in baseline, the
  engine `HYPNOTIZE_MIN/MAX_TURNS` spec-fallback shape):**
  `hypnotize {successRate 0.8, minControlTurns 5, maxControlTurns 10,
reboundImmunityTurns 10}`.
- **L8 restore (the delta):** `minControlTurns 2 → 5`,
  `maxControlTurns 3 → 10`. `successRate 0.8` and
  `reboundImmunityTurns 10` **unchanged**.

The "capped ≠ absent" doctrine the arbiter ratified for the spider at
L5 §3.3 has its exact inverse here: **full ≠ partial.** The L5 cap was
explicitly a learner-safety knob with the on-record forward-consistency
promise ("L8 restores hypnotize toward full power
`minControlTurns 5 / maxControlTurns 10`"). The runway has been run
(L5 capped debut → live-but-capped through merged L6 → L8 full restore;
the parked-L7 gap does not break it — the player met and learned the
mechanic at L5 and it has been live since). A 5–10-turn seizure in the
cramped attic is long enough to march a flipped cockroach party into
the queen (§4.3.3) — the genuine climax the arc was sequenced for. Both
factions demanded the genuine original; the spider's "full ≠ partial"
and the ant's "the escalation must be real" are the **same ruling** —
the curve (§3.4.4) prices it as the registering −5 to −7pp engine.

**Win-curve justification (§5):** the full-power restore is the
dominant single L8 driver — the engine of the L6 56 → L8 ~50–54
continued descent. It **must register** (the spider's upheld ask,
symmetric to the L5 plane-affinity / L6 post-occupation "must register"
rulings); a half-restore would land L8 back near L6 56, erasing the
licensed spike. **Interesting-vs-fair:** interest decisively reinforces
— "the mechanic you learned to play around at L5, turned to eleven at
its designed climax, weaponizing the very roaches you're racing for" is
the strongest interest argument in either brief; a quiet re-cap is
precisely the boring-but-balanced / under-delivered-payoff failure §6.2
and §4d/§4f name.

### 3.3 Tiered MP debut — RULING: a REAL binding data constraint; the per-caster tier-3 slot is the ant's answer-ceiling that bounds (does not gut) the restore

**RULING: tiered MP debuts at L8 as a real binding data constraint, NOT
a placement gesture. The engine machinery is frozen and live (Round 21,
`engine/mp-tiers.ts`, `INITIAL_MP_SLOTS {tier1:4, tier2:2, tier3:1}` —
NOT changed). The L8 data delta is: `hypnotize` stays tier-3 and
`recruit` stays tier-2 (both already so in the carried L6 abilities
data — ratified, no change) AND the per-ability `uses` cap is set so
the MP pool is the binding constraint, not a redundant looser `uses`
counter. The per-caster tier-3 single slot is the §3.D
escalation-with-an-answer CEILING on the full-power hypnotize: it
bounds EACH caster to one decisive full-power seizure, so the
escalation is a survivable climax — NOT the §4.3.3 unbounded
cold-stomp, and NOT an over-constraint that guts the spider army to one
throwaway cast.**

The load-bearing data ruling: **`hypnotize.uses` is set to `null`**
(carried from L6 — unchanged) so the **tier-3 MP pool is the sole
binding constraint** on hypnotize frequency (a redundant tight `uses:N`
would double-bind and is rejected; a redundant loose `uses` is moot
under the pool). Under the frozen `INITIAL_MP_SLOTS.tier3 = 1`, **each
hypnotize-capable spider caster gets exactly one full-power
(5–10-turn) hypnotize per scenario.** This resolves the residual
objectively on roster, not arbiter fiat:

- **The ant's cold-stomp fear is answered:** an `uses:null` full-power
  hypnotize with NO binding pool would be unlimited 5–10-turn seizures
  — the §4.3.3 cold-stomp / sub-40% wall that would falsify the
  ship-gate (the L4-§9 precedent). The tier-3 single slot is the bound
  that makes the genuine full-power restore _shippable_.
- **The spider's "one throwaway cast" fear is answered:** the bound is
  **per caster**, not per army. The spider roster
  (`data/level-8/roster-spiders.json` — caster-eligible templates:
  `spider-queen` int 9, `spider-spinner` int 5, plus any `'caster'`-
  tagged; verified `data/level-6/units.json`) fields enough
  hypnotize-capable casters that the AI gets a meaningful _number_ of
  decisive full-power seizures across the scenario — the climax
  registers (§3.2) without any single caster looping it. The caster
  count is the loop's roster-tuning latitude toward the band (§3.5);
  its _existence as a multi-caster threat that registers_ is a ruled
  invariant.

This is the L4-Light-Switch-ceiling / L5-plane-affinity-ceiling /
L6-flyer-ceiling structure, applied a fifth time: the full-power
hypnotize is the engine the dip _owns_ (§3.2); the per-caster tier-3 MP
pool is the budgeted ceiling that holds it at hardest-but-fair ~50–54%
rather than overshooting into a sub-40% cold-stomp wall. **`recruit` is
tier-2** (two tier-2 slots/caster) — the recruit cadence is likewise
bounded by the pool, which is part of why the recruit-race (§3.1) is a
genuine race and not a free ant grind; this is the §3.1 lever and the
§3.3 ceiling being the _same structured-scarcity system_ viewed from
the two factions' sides.

**Win-curve justification (§5):** the per-caster tier-3 bound is the
ceiling that prices the §3.2 engine to the controlled ~50–54% (not
sub-40%); the tier-2 recruit bound keeps §3.1 a contested race. **One-
sentence statement (§3.4.3 "name what's new"):** _"You and the spiders
are racing to recruit the attic's cockroaches — but every spider caster
now gets one full-power hypnotize to turn your prize roaches against
your own queen, so spend your magic, screen the Queen, and out-recruit
them before your mages fall."_ The single new high-cognitive mechanic
is the hypnotize full-power restore; tiered MP is the low-cognitive
structured-scarcity bound that makes it shippable.

### 3.4 The concrete L8 data payload (the headline deliverable; data-expressible, no engine code)

**RULING: the L8 data set = the merged-L6 data set with ONLY the
changes below. Every unmentioned field, template, and row is
byte-identical to L6.** Wired into `data/level-8/` over the Level-PA
placeholder. The Level PA owns the cramped box-maze geometry, the 6
POST nodes incl. the one-way Skylight, and the ~8 cockroach-neutral
spawn _positions_ (§6.3 — Level-owned, **not** designed here). Gameplay
(this arbitration) owns and hereby specifies:

**(a) `recruit-count` race economy (§3.1 — the load-bearing
§4f-compliant lever):**

```
// data/level-8/map.json — Level-owned victory node; Gameplay-owned
// target tuning (the curve dial):
"victoryCondition": { "kind": "recruit-count",
                       "target": 4,            // ruled START value; §3.5 loop-tunable 3..5
                       "unitTemplateId": "cockroach" }

// data/level-8/abilities.json — recruit-race tempo (the L8 delta vs L6):
"recruit": { "tier": 2, "uses": null, "cooldown": 2,
             "params": { "successRate": 0.30 } }   // L6 0.25 → 0.30 ruled START; §3.5 loop-tunable 0.25..0.35

// cockroach-neutral spawn COUNT (Gameplay economy dial; Level owns positions):
//   ~8 cockroach-neutral parties (roadmap §4.3.3); ruled START 8, §3.5 loop-tunable 6..10
```

- `target: 4` is the roadmap §4.3.3 illustrative and the ruled START;
  it is the single highest-leverage curve dial and the primary §3.5
  loop knob (3 = ant-favorable, 5 = spider-favorable). Read by
  `checkWinner` every end-of-turn (maximally AI-exercised).
- `recruit.successRate 0.25 → 0.30` (ruled START): a mild ant-favorable
  recruit-tempo nudge, budgeted _against_ the full-power hypnotize
  engine so the race is a coin-flip, not a wall. `cooldown 2` and
  `tier 2` unchanged (the gate is the MP pool + the race, not the
  recruit rate alone — the L5-§3.4 "no param inflation" discipline).
- ~8 cockroach-neutral spawn count (Gameplay dial; positions
  Level-owned) — more neutrals absorb more spider hypnotize-denials,
  the race-fairness knob.

**(b) Hypnotize FULL-power restore (§3.2 — the single new
high-cognitive mechanic; the dip's engine):**

```
// data/level-8/abilities.json — REVERSE the L5 cap to the pre-L5 originals:
"hypnotize": { "tier": 3, "uses": null, "cooldown": 0,
  "params": { "successRate": 0.8,
              "minControlTurns": 5,      // L5-capped 2 → restored 5
              "maxControlTurns": 10,     // L5-capped 3 → restored 10
              "reboundImmunityTurns": 10 } }   // UNCHANGED
```

- `minControlTurns 2 → 5`, `maxControlTurns 3 → 10` — reverts exactly
  the L5 §3.3/§4c cap to the pre-L5 originals.
- `successRate 0.8` and `reboundImmunityTurns 10` **UNCHANGED** (the
  L5-§3.3 binding "the cap touched only duration" symmetric reading;
  the HP-half cost in `engine/abilities.ts` `handleHypnotize` is
  engine-fixed and unchanged).
- `tier 3` and `uses: null` **unchanged** (carried from L6) — so the
  **tier-3 MP pool is the sole binding frequency constraint** (§3.3).

**(c) Tiered MP debut as the binding bound (§3.3 — the ceiling):**

```
// ENGINE FROZEN: engine/mp-tiers.ts INITIAL_MP_SLOTS {tier1:4,tier2:2,tier3:1}
//   — NOT changed. Caster-eligibility = baseStats.intelligence>=5 OR
//   tags includes 'caster' — both data fields in data/level-8/units.json,
//   carried from L6 byte-identical (spider-queen int 9, spider-spinner
//   int 5, ant-mage int 8, ant-archmage int 9 — all caster-eligible
//   unchanged). NO units.json change.
// DATA DELTA: abilities.json `tier` fields — hypnotize tier:3,
//   recruit tier:2 (both ALREADY so in carried L6 data — ratified, no
//   change); the binding ruling is that hypnotize.uses=null so the
//   tier-3 single slot is the sole hypnotize bound (per caster: one
//   full-power seizure/scenario). Spider roster fields ≥2
//   hypnotize-capable casters so the threat registers across the
//   scenario (§3.3) — roster-tunable count, §3.5.
```

The tiered-MP debut is therefore expressed entirely as: (i) the engine
machinery (frozen, untouched) finally _binding_ because (ii) the L8
recruit-race + full-power hypnotize make the tier-3/tier-2 pools the
operative scarcity for the first time, and (iii) the ruled
`hypnotize.uses:null` makes the tier-3 slot the sole hypnotize bound.
No `units.json` change, no engine change.

**(d) Explicitly carried byte-identical (the no-touch guarantees):**

- **No plane-affinity delta (§4d):** `data/level-8/units.json`
  `planeAffinity` = `data/level-6/units.json` `planeAffinity`,
  byte-identical (spider combat `wall {1,1}` + ceiling `{1,1}` + full
  corner coverage; all ant/queen/support/neutral rows). NOT budgeted
  as an L8 win-rate mover. The orchestrator no-touch guarantee.
- **No card-economy curve reliance (§4f):** NO `goldPerTurn` POST is
  added for a card-funding purpose; NO card-deck/market tuning is part
  of the L8 curve. The L8 descent is carried entirely by §3.1/§3.2/§3.3.
  Explicit §4f-compliance: the L8 rebound/curve is NOT built on cards;
  no card-economy corrective appears in any fallback (§3.5).
- **No `healingRate` occupation economy (§4e):** L8 does not introduce
  a POST `healingRate`/`defensiveBonus` "occupation economy" as a curve
  lever (it is `recruit-count`, not forced-co-occupation; §4e is
  explicit it is engine-inert here). The carried-in merged-L6
  Step-Landing values are an L6 map artifact; L8's Level-owned POSTs
  are the Level PA's, not a Gameplay occupation-economy lever.
- **The merged-L6 state** (POST-occupation Step-Landings + sortie
  doctrine, plane-switch full corner coverage, recruit-as-order, the
  carried L4/L5 state, all ability params not listed above) carries
  forward **byte-identical**, not relitigated.

### 3.5 Per-lever: AI-exercised vs needs a binding within-loop AI-doctrine

Per the §4d/L6 discipline the brief mandates — for EACH lever, whether
the L8 AIs exercise it natively or it needs a binding within-loop
AI-doctrine constraint (named, with a measurable ship-gate and a
non-card falsification fallback):

1. **`recruit-count` race tuning (§3.1) — AI-EXERCISED natively. NO new
   AI-doctrine needed.** The win condition itself; both the ant
   mage-escort optimizer and the spider hypnotize-priority optimizer
   read the live recruited-count / remaining-neutral pool / recruiter
   roster every turn (§4.3.3 already specifies the spider AI
   "prioritizes hypnotize over offensive moves"). This is the
   §4f-preferred structurally-robust class — it cannot measure inert
   the way cards/plane-affinity/heal-economy do. Loop latitude: the
   `target` (3..5), `recruit.successRate` (0.25..0.35), spawn count
   (6..10).
2. **Hypnotize full-power restore (§3.2) — AI-EXERCISED via a BINDING
   within-loop AI-doctrine (named): the "L8 spider hypnotize-priority"
   doctrine.** §4.3.3 specifies it; the within-scenario loop **MUST**
   field an L8 spider AI whose decision function prioritizes hypnotizing
   recruitable/recruited cockroach parties and marching the seized party
   toward the ant queen, over generic offense — and **MUST** spend the
   one tier-3 slot per caster on a high-value seizure (a recruited or
   about-to-be-recruited roach near the queen), not a random distant
   neutral. The _existence_ of this hypnotize-priority + queen-vector
   behavior in a seed-robust majority of games is a **ruled invariant**
   (the L4-§9 / L6-§3.1.2 pattern); the aggression threshold / target-
   selection heuristic / timing is the loop's tuning latitude. This is
   the named binding doctrine, the §4d/L6 discipline applied: a
   full-power hypnotize the fielded AI does not actually aim at the
   race/queen is the L4-§9 falsification (a ruled value the frozen AI
   doesn't exercise) a fourth time.
3. **Tiered MP bound (§3.3) — AI-EXERCISED natively (engine-enforced).
   NO new AI-doctrine needed.** The frozen `mp-tiers.ts` machinery
   enforces the per-caster tier-3/tier-2 pool deterministically on
   every cast (`canCastTier`/`spendSlot`); no AI cooperation required —
   the bound binds in the engine regardless of AI behavior. Loop
   latitude: the spider hypnotize-caster roster count (≥2, the
   threat-registers invariant).
4. **No plane-affinity / no card / no heal-economy (§3.4d) — N/A
   (carried byte-identical, not levers).** No AI-doctrine; explicitly
   not budgeted.

### 3.6 Where each faction is upheld

Symmetric with the L3/L4/L5/L6 arbitrations (every concession honored,
no over-reach granted, the convergence ratified, neither faction denied
its identity):

- **Spider upheld:** the hypnotize full-power restore is the **genuine
  pre-L5 original** (`minControlTurns 5, maxControlTurns 10`; NOT a
  quiet half-restore — "full ≠ partial", symmetric to the spider's L5
  "capped ≠ absent" the arbiter ratified) and the **dominant engine**
  of the dip that **registers** (−5 to −7pp); the per-caster tier-3 MP
  bound is **per caster, not per army** (≥2-caster roster invariant —
  the climax registers across the scenario, not one throwaway cast);
  the `recruit-count` + dual-loss is ratified as the spider's
  structural identity tax; the spider hypnotize-priority + queen-vector
  is a **ruled invariant** (§3.5.2). No over-reach: no unbounded
  hypnotize (the §4.3.3 cold-stomp, rejected), no stacked mission-tax
  subsidy (the L4-§3.D / L6-§3.3 double-count, rejected), no
  plane-affinity inflation (§4d, none).
- **Ant upheld:** the load-bearing curve lever is the **§4f-compliant
  AI-exercised `recruit-count` race** the ant demanded (cards rejected
  §4f, plane-affinity rejected §4d, heal-economy rejected §4e — the
  ant's load-bearing point, the L4-§9 / parked-L7 precedent honored);
  the tier-3 MP bound is ratified as the **answer-ceiling** that makes
  the full-power restore survivable (not the cold-stomp); the carried
  merged-L6 state is **byte-identical** — no ant tool weakened; no
  budget waste on inert levers. The ant's "the dip must be earned by a
  real AI-exercised mechanic, not a system the locked AI can't convert"
  is the binding §4d/§4e/§4f/§3.4.4 reading and is **upheld as the
  decisive specification frame**.

Neither faction is denied its identity — the spider gets its genuine
full-power hypnotize climax at the room the arc was sequenced for; the
ant's answer is the recruit-race tempo + the spider's one-big-cast MP
ceiling + screening the queen. They are sequenced together in one room
by design (§3.H banked the full restore to _exactly_ L8 _because_ the
recruit-or-die room is where weaponized hypnotize is the scenario's
whole tension): escalation and answer, the §3.D / L4-§3.2 / L5-§3.2 /
L6-§3.6 doctrine, applied a fifth time, with the §4d/§4e/§4f lessons
all now binding (the dip is carried by the lever the locked AIs
_demonstrably convert_, not the ones they ignore).

---

## 4. The L8 mechanic delta — concrete, data-level spec

Implementable directly against shipped schemas and the
already-implemented `recruit-count` victory + dual loss (PR #11), the
one-way Skylight transit (PR #14, Level-owned node), and the live
Round-21 tiered-MP machinery; **no engine code** (§4b). The L8 data set
= the merged-L6 data set with **only the changes below**. Every
unmentioned field, template, and row is byte-identical to L6. The
orchestrator wires this into `data/level-8/`.

### 4a. Tiered MP debut — FIRST and clearest (ruled §3.3; the binding bound)

**ENGINE FROZEN, NOT CHANGED:** `engine/mp-tiers.ts`
`INITIAL_MP_SLOTS = { tier1: 4, tier2: 2, tier3: 1 }`; caster-
eligibility `baseStats.intelligence >= 5 OR tags includes 'caster'`.

**Data delta (the debut = the pool finally BINDS):**

- `data/level-8/abilities.json` `hypnotize.tier: 3`,
  `hypnotize.uses: null` (both carried from L6 — **ratified
  unchanged**; the ruling is that this makes the **tier-3 single slot
  the SOLE hypnotize frequency bound: one full-power seizure per caster
  per scenario**).
- `data/level-8/abilities.json` `recruit.tier: 2`,
  `recruit.uses: null` (carried — **ratified unchanged**; the tier-2
  two-slot pool bounds the recruit cadence so §3.1 is a contested
  race).
- `data/level-8/units.json` caster-eligibility fields
  (`baseStats.intelligence`, `tags`) = `data/level-6/units.json`,
  **byte-identical** (spider-queen int 9, spider-spinner int 5,
  ant-mage int 8, ant-archmage int 9 — caster-eligible unchanged).
  **NO units.json change.**
- `data/level-8/roster-spiders.json` fields **≥2 hypnotize-capable
  caster** parties so the per-caster tier-3 bound delivers a
  multi-seizure threat that registers (§3.3; roster count §3.5-tunable).

The tiered-MP debut is the engine machinery (frozen) finally binding
because the L8 recruit-race + full-power hypnotize make the
tier-3/tier-2 pools the operative scarcity for the first time. **No
engine change, no `units.json` change.**

### 4b. Hypnotize FULL-power restore — the single new high-cognitive mechanic (ruled §3.2)

`data/level-8/abilities.json`, reversing the L5 §3.3/§4c cap:

```
"hypnotize": { "id": "hypnotize", "name": "Hypnotize",
  "category": "special-attack", "target": "party",
  "tier": 3, "uses": null, "cooldown": 0,
  "params": { "successRate": 0.8,
              "minControlTurns": 5,      // L5-capped 2 → RESTORED 5
              "maxControlTurns": 10,     // L5-capped 3 → RESTORED 10
              "reboundImmunityTurns": 10 } }   // UNCHANGED
```

- L5-capped (carried into merged L6): `minControlTurns 2,
maxControlTurns 3`. **L8 restore: `5` / `10`** — the exact pre-L5
  originals (L5 §2 carried-in baseline; engine `HYPNOTIZE_MIN/MAX_TURNS`
  spec-fallback shape).
- `successRate 0.8`, `reboundImmunityTurns 10`, the engine-fixed
  HP-half cost: **UNCHANGED** (the L5-§3.3 "the cap touched only
  duration" symmetric reading — restore exactly and only what the cap
  touched).
- `tier 3`, `uses: null`: **unchanged** — the tier-3 MP pool (§4a) is
  the sole binding frequency constraint.

### 4c. `recruit-count` race economy — the load-bearing §4f-compliant lever (ruled §3.1)

```
// data/level-8/map.json — Gameplay-owned target on the Level-owned node:
"victoryCondition": { "kind": "recruit-count", "target": 4,
                       "unitTemplateId": "cockroach" }

// data/level-8/abilities.json — recruit-race tempo (delta vs L6):
"recruit": { "id": "recruit", "name": "Recruit",
  "category": "special-attack", "target": "party",
  "tier": 2, "uses": null, "cooldown": 2,
  "params": { "successRate": 0.30 } }   // L6 0.25 → 0.30

// cockroach-neutral spawn COUNT: ~8 (Gameplay dial; Level owns positions)
```

Ruled START values: `target 4`, `recruit.successRate 0.30`, ~8
cockroach spawns. All §3.5 loop-tunable inside the band; the
`recruit-count` victory member + dual loss is already engine-
implemented (PR #11) — no engine work.

### 4d. Carried byte-identical — the no-touch guarantees (ruled §3.4d)

- `data/level-8/units.json` `planeAffinity` = `data/level-6/units.json`
  `planeAffinity`, **byte-identical** (§4d; NOT budgeted).
- **No `goldPerTurn` POST / no card-market tuning** is part of the L8
  curve (§4f). The L8 descent is carried entirely by §4a–§4c.
- **No POST `healingRate`/`defensiveBonus` occupation-economy** curve
  lever (§4e — engine-inert under `recruit-count`).
- All other merged-L6 ability params, rows, and the carried L4/L5
  state: **byte-identical**, not relitigated.

**One-sentence statement of the L8 delta (§3.4.3 "name what's new"):**
_"It's a flat-out race to recruit the attic's cockroaches before the
spiders do — and every spider caster gets one full-power, 5-to-10-turn
hypnotize (the L5 cap lifted) to flip your prize roaches into your own
Queen, with the tiered-MP pool the only thing keeping that to one big
play per caster."_ One room of change; the single new high-cognitive
mechanic is the hypnotize full-power restore.

---

## 5. Win-rate prediction for L8

**Predicted L8 ant win rate: ~52%** (band **~50–54%**, within the §5
loose tolerance and the mechanic-distribution plan §4 "the hard level
before the end" requirement). **This is the CONTINUED DECISIVE DESCENT
— a clean monotone drop below merged L6's ~56%, the hardest-but-fair
pre-finale point, separated above the L10 ~50 climax. L7 is PARKED — a
known curve gap, NOT interpolated into this math.**

Derivation, anchored to merged L6 (the L6 arbitration §5 ruled band
~53–57%, taken at its **upper edge ~56%** as the conservative
monotone-down anchor — the descent must read clearly below it):

1. **Start: L6 ~56% ant** (the merged-L6 anchor; the curve step is
   measured _down_ from ~56%). **L7 is PARKED (§4f) — NOT an anchor,
   NOT interpolated.** Monotone descent is measured L6 56 → L8 directly.
2. **`recruit-count` race + hypnotize full-power restore → the
   continued descent's ENGINE: −5 to −7pp ant.** The dominant single
   L8 driver. The recruit-race is a genuine coin-flip mission (§3.1,
   §4f-robust — the win condition both AIs exercise); the genuine
   pre-L5-original 5–10-turn hypnotize (§3.2), fired by the binding
   §3.5.2 spider hypnotize-priority + queen-vector doctrine and
   bounded per-caster by the tier-3 MP pool, weaponizes the prize
   cockroaches against the queen with no turtle/score escape. This
   swing **must register** (the spider's upheld ask; the engine, not a
   behavior tweak). §4f/§4d/§4e-robust: the win condition + a
   genuinely-restored ability the AI is doctrinally bound to aim — NOT
   cards, plane-affinity, or a heal-economy the locked AIs ignore.
3. **Tiered-MP bound + recruit-race tuning → the dip's CEILING.** The
   per-caster tier-3 slot (§3.3) bounds the full-power hypnotize to one
   decisive seizure per caster (not unbounded — the §4.3.3 cold-stomp
   averted); `recruit.successRate 0.30` + ~8 spawns + `target 4` size
   the race so the ant can still win it. Holds the −5/−7 engine from
   overshooting into a sub-40% wall — the budgeted ceiling, the net
   landing at the controlled ~52%.
4. **`recruit-count` + dual-loss: structural tax, ~0pp _new_** (already
   priced into the dip as the reason L8 is the hard pre-finale room;
   the structure §3.1 makes the engine matter _within_, not a
   separable −pp).
5. **No plane-affinity (§4d), no card (§4f), no heal-economy (§4e)
   contribution: 0pp.** Carried byte-identical; empirically inert;
   **not budgeted.**

**Net: ~56% − (5 to 7) + (bounded by the MP/target ceiling) ≈
~50–54%, settling to ~52%**, with the within-scenario loop tuning the
`target` (3..5), `recruit.successRate` (0.25..0.35), the cockroach
spawn count (6..10), and the spider hypnotize-caster roster count
(≥2) toward ~52% — but the **shape** [recruit-race engine + full-power
hypnotize + per-caster tier-3 ceiling], the **direction**, the
**hypnotize restore exact values**, and the **no-plane-affinity /
no-card / no-heal-economy** rulings are ruled invariants, not free
knobs.

**Why this reads as the CONTINUED DECISIVE DESCENT (the binding §5
requirement):**

- **Strictly BELOW merged L6.** ~56% → ~52% is an unambiguous monotone
  drop — the curve _continues descending_ toward the L10 ~50 climax.
  This is "the hard level before the end" (roadmap §5;
  mechanic-distribution plan §4). The drop is _shaped_ (the hypnotize
  the player learned at L5 returns at full power in the recruit-race
  room), not flat and not a cliff.
- **L7 is a PARKED gap, NOT interpolated.** Per the brief and
  level-progression-plan §4f, the curve is reasoned L6 56 → L8 directly;
  no L7 win rate is factored in; the L7 disposition is deferred to the
  post-L8–L10 consolidated review.
- **The descent is delivered BY THE ENEMY BECOMING THE DEADLIEST
  VERSION OF ITSELF, not by a passive stat / inert system.** The drop
  is the genuine full-power hypnotize (the §4d/§4f failure inverted —
  NOT a quietly under-delivered payoff) weaponizing the recruit-race
  prize, fired by an AI doctrinally bound to aim it (§3.5.2), bounded
  to a survivable climax by the MP ceiling. The ant gets no stat nerf;
  the spider gets no inert card/affinity/heal lever. This is the §5
  "the enemy got more dangerous" reading and the §6.2 "the player has
  the structural answer (race tempo + the one-big-cast MP ceiling +
  screen the queen), net the hardest-but-fair pre-finale point" closure
  — NOT the boring-but-balanced / under-delivered-payoff failure
  §4d/§4e/§4f name.
- **Separated above the L10 ~50 finale.** ~52% (L8) sits clearly above
  the ~50% L10 climax — the intended shape: the hard pre-finale spike,
  then the genuinely-close finale. Had the hypnotize been
  half-restored or the recruit-race over-tuned ant-favorable, L8 would
  land near/above L6 56, erasing the spike; had the MP ceiling been an
  over-constraint or the target too high, L8 would land sub-40% (the
  cold-stomp). The §3.2 engine / §3.3 ceiling / §3.1 race-tuning
  structure holds the dip at a _separated_ ~52%.

---

## 6. Interest claim

**The L8 delta is the hypnotize climax the whole campaign was sequenced
for: the mechanic the player learned to play around at L5, returned at
its genuine full power in the recruit-or-die room built for it,
weaponizing the very cockroaches the player is racing to recruit
against their own Queen — the continued decisive descent earned by the
enemy becoming the deadliest version of itself, with a structural
answer in the player's hands.**

The Level PA built the Attic as variety-bookend #1 (level-progression-
plan §2 L8): a cramped clipped-ceiling box-maze, `recruit-count` with
no POST to capture and no score escape (§4c), the queen hard to screen
while the mages chase recruits. Roadmap §4.3.3 built it for the spider
to prioritize hypnotize and turn flipped roaches into queen-chargers.
For three live rooms (L5 capped debut → merged L6) the player has
played around a short, recoverable hypnotize. At L8 it returns at its
genuine pre-L5 original — 5 to 10 turns, long enough to march a seized
cockroach party across the cramped attic and into the Queen. That is
the curve continuing its descent because the _enemy got more dangerous
in a way the player saw coming and still fears_ — the interesting
reason, the user's explicitly-licensed "hard level before the end," not
a stat dip (§4d) and not a card economy that can't fire (§4f). And the
player is not without an answer, and the answer is _structural and
in-hand_: out-recruit the spiders (the §4f-robust race the player
controls), screen the Queen, and exploit the spider's one-big-cast
tier-3 MP ceiling — the answer-in-the-same-room, the §3.D / L4-§3.2 /
L5-§3.2 / L6-§3.6 doctrine, applied a fifth time, with the §4d/§4e/§4f
lessons all now binding (the dip is carried by the lever the locked
AIs _demonstrably convert_ — the win condition and a genuinely-restored
ability the AI is doctrinally bound to aim — not the ones they ignore).
Both factions' interest goals are served; neither is denied — only
sequenced into one room: the spider's genuine hypnotize climax and the
player's hardest race before the finale, the escalation and its
structural answer.

---

## 7. Termination record

**Termination basis: §6.2 condition 1 — the Gameplay PA's standing
discretionary cutoff authority ("cut off sub-agent debate when it has
heard enough"), invoked after the opening + one rebuttal per faction
(2 debate documents — `l8-ant-advocate.md`, `l8-spider-advocate.md`,
each opening + ≥1 rebuttal; equivalently 2 exchanges of the 6-exchange
cap; the automatic 6-exchange stop did NOT fire — terminated early by
discretion, consistent with the mechanic-distribution plan §1 and the
L3 §7 / L4 §7 / L5 §7 / L6 §7 precedents).**

- **§6.2 automatic stop A (both fun-critic AND interest-critic ≥75/100
  on a frozen proposal):** _Not yet fired_ — critic eval runs in the
  within-scenario loop on the implemented L8 data, downstream of this
  arbitration; there is no frozen scored proposal at debate time. Per
  §6.2 and the L3/L4/L5/L6 precedent, this does not block arbitration;
  it is a Phase-D loop gate, recorded as the L8 ship-gate below.
- **§6.2 automatic stop B (6 exchanges):** _Not fired_ — only 2
  exchanges occurred (opening + rebuttal per faction).
- **Discretionary cutoff (invoked):** the debate converged to (1) a
  set of **pre-ruled / §4d-§4e-§4f-directed placements both factions
  explicitly ratified** (`recruit-count` + dual loss the Level-owned
  structure; hypnotize full power at L8 §3.H; tiered MP at L8 §2;
  score-tiebreaker-everywhere — moot under §4c no-score-path; Skylight
  one-way Level-owned; no plane-affinity §4d; no card reliance §4f; no
  heal-economy §4e — none genuinely contested, ratifications), and (2)
  a **single specification-and-pricing question on which both factions
  independently converged** — the `recruit-count` race as the
  §4f-robust load-bearing lever, the hypnotize restore as the genuine
  pre-L5 original engine, the per-caster tier-3 MP slot as the
  budgeted ceiling. Both factions' best case is fully on record on
  every dimension; both independently derived the §4f-compliant
  specification (the ant from the no-cold-stomp side, the spider from
  the my-payoff-must-fire side). The only residual is pricing the
  §3.4.4 curve arbiter resolves objectively. The §6.2 format's value
  ("adversarial NL surfaces considerations neither generates alone")
  was fully realized — the exchange produced the decisive frame (the
  `recruit-count` race as the §4f-robust lever; full-power hypnotize
  the genuine pre-L5 original — "full ≠ partial"; the per-caster
  tier-3 MP slot as the ceiling that makes the genuine restore
  shippable) that neither opening alone contained. Per roadmap §6.2 the
  Gameplay PA "cuts off sub-agent debate when it has heard enough";
  that threshold is met. **Terminate; arbitrate now.** No point is
  genuinely unresolvable.

**L8 ship-gate (handed to the Phase-D within-scenario loop — MEASURABLE,
per the L4-§9 falsification precedent the brief mandates):** implement
the §4 data delta + the §3.5.2 binding spider hypnotize-priority +
queen-vector doctrine; run the loop to fun-critic + interest-critic;
**the L8 data ships when BOTH conditions hold:**

1. **Both critics ≥75/100** on the measured L8 config (§6.2 automatic
   stop A, evaluated where it belongs — on the built scenario), **AND**
2. **The measured ant win-rate lands in the ~50–54% band on the
   deterministic seeds-1..100 sweep** (the `baseline-l8` vs
   `spider-l8` orchestrator sweep, the §9.1/L4 falsification method as
   the acceptance test), **reading as the continued decisive descent
   below the merged-L6 ~56% and separated above the L10 ~50 finale —
   with L7 a PARKED gap, NOT interpolated into the curve.**

The continued-descent monotone requirement (L6 ~56 → L8 ~50–54) is a
**binding ship-gate**: per the L4-§9 falsification precedent, **a built
L8 that does NOT measure in the ~50–54% band reopens this
arbitration** under the §7 "ruled values are not free knobs — any
change reopens" clause. The specific L4-§9 failure mode is the named
acceptance risk here: if the fielded spider AI does **not** in fact
aim hypnotize at the recruit-race/queen (the §3.5.2 invariant fails to
fire), the full-power restore degenerates and L8 measures back near or
above L6 56 (the L4-§9 "frozen AI ignores the ruled lever"
falsification, a fourth time) — that explicitly reopens, with the
recruit-race retuning (`target` / `recruit.successRate` / spawn count /
spider hypnotize-caster roster count) and the §3.5.2 doctrine as the
corrective levers. **Explicitly, per §4f: NO card-economy corrective
appears in any fallback** — a missed band is corrected by the
recruit-race tuning, the hypnotize-priority doctrine, or the MP/roster
ceiling, NEVER by a card-deck/`goldPerTurn`-for-cards lever (the
parked-L7 precedent). The loop's tuning latitude is the §3.5 dials
(`target` 3..5, `recruit.successRate` 0.25..0.35, cockroach spawn
6..10, spider hypnotize-caster roster ≥2). The **ruled invariants**
(not free knobs — any change reopens): the §4b hypnotize restore exact
values (`minControlTurns 5, maxControlTurns 10`; `successRate 0.8` /
`reboundImmunityTurns 10` unchanged), the `hypnotize.uses:null` →
tier-3-slot-as-sole-bound shape (§4a), the §3.5.2 spider
hypnotize-priority doctrine _existence_, the §3.4d **no-plane-affinity
/ no-card / no-heal-economy** carries, and the carried-forward merged-L6
state byte-identity. **Note the §4c/§4d/§4e/§4f carried-forward
cross-level context:** L8 is `recruit-count` (no score path, §4c — the
`capture-post` low-`drama` score-grind signature does NOT apply; L8 is
mission-decisive); per the recorded human decisions, plane-affinity
inertness (§4d), heal-economy inertness (§4e), the card-host trap
(§4f), and any feel signatures are tracked cross-level (the deferred
UX/feel pass and the post-L8–L10 L7-disposition review), **not** chased
per-level — do not retune L8 mechanics for `drama`, do not re-introduce
plane-affinity / a card economy / a heal-economy as a lever if
win-rate, the ~52% continued descent, and the L6 56 → L8 → L10 ~50
shape (L7 parked, not interpolated) hold.

---

## 8. Summary of the verdict

| Dimension                                                 | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanic                                                  | L8 Attic delta vs **merged L6** (data-only; existing `recruit-count` member + dual loss PR #11, live Round-21 tiered-MP machinery, one-way Skylight PR #14; AI-config via the within-loop; no engine — §4b). **L7 PARKED — delta is FROM merged L6, L7 NOT interpolated.**                                                                                                                                                                                                             |
| Merged-L6 state carried forward                           | POST-occupation Step-Landings + sortie doctrine, plane-switch full corner coverage, `planeAffinity` (spider combat `wall {1,1}` + full coverage), recruit-as-order, the carried L4/L5 state — **byte-identical**, not relitigated                                                                                                                                                                                                                                                      |
| **Tiered MP (FIRST/clearest)**                            | **Engine FROZEN** (`INITIAL_MP_SLOTS {tier1:4,tier2:2,tier3:1}`, caster-eligibility `int>=5`/`'caster'` — NO change). Data debut = the pool finally **binds**: `hypnotize tier:3 uses:null` (carried, ratified) ⇒ **tier-3 single slot = sole hypnotize bound (one full-power seizure per caster/scenario)**; `recruit tier:2 uses:null` bounds the recruit cadence. Spider roster fields ≥2 hypnotize-casters (threat registers). NO `units.json` change.                             |
| **Hypnotize FULL-power restore**                          | `data/level-8/abilities.json`: **`minControlTurns 2→5`, `maxControlTurns 3→10`** (reverses the L5 §3.3/§4c cap to the **exact pre-L5 originals**). **`successRate 0.8` UNCHANGED**, **`reboundImmunityTurns 10` UNCHANGED**, `tier 3`/`uses:null` unchanged. The single new high-cognitive mechanic; the dip's engine; "full ≠ partial" — no half-restore.                                                                                                                             |
| **`recruit-count` race economy (load-bearing §4f lever)** | `victoryCondition {kind:"recruit-count", target:4, unitTemplateId:"cockroach"}` (ruled START; §3.5 loop-tunable 3..5); `recruit.successRate 0.25→0.30` (START; 0.25..0.35); ~8 cockroach-neutral spawns (START; 6..10). The §4f-compliant, AI-exercised win condition both AIs act on.                                                                                                                                                                                                 |
| **No plane-affinity delta**                               | **EXPLICITLY CONFIRMED — `data/level-8/units.json` `planeAffinity` = L6 BYTE-IDENTICAL, NOT budgeted (§4d-directed).**                                                                                                                                                                                                                                                                                                                                                                 |
| **No card-economy curve reliance**                        | **EXPLICITLY CONFIRMED — NO `goldPerTurn`-for-cards / card-market tuning in the L8 curve; no card corrective in any fallback (§4f-directed).**                                                                                                                                                                                                                                                                                                                                         |
| No heal-economy lever                                     | Confirmed — no POST `healingRate` occupation-economy curve lever (§4e — engine-inert under `recruit-count`).                                                                                                                                                                                                                                                                                                                                                                           |
| Per-lever AI exercise                                     | recruit-race: **AI-exercised natively** (the win condition). Hypnotize restore: **AI-exercised via a BINDING within-loop doctrine** — the named "L8 spider hypnotize-priority + queen-vector" doctrine (§3.5.2, ruled invariant). Tiered MP: **AI-exercised natively** (engine-enforced by frozen `mp-tiers.ts`).                                                                                                                                                                      |
| Favors                                                    | Net **spider** (the licensed ~52% continued descent, the hard pre-finale point); the full-power hypnotize restore is the engine, the per-caster tier-3 MP bound + recruit-race tuning is the budgeted ceiling                                                                                                                                                                                                                                                                          |
| L8 win-rate prediction                                    | **~52%** (band **~50–54%**); the **CONTINUED DECISIVE DESCENT** — clean monotone drop below merged L6 ~56, the hard pre-finale point, separated above the L10 ~50 climax; **L7 PARKED, NOT interpolated**                                                                                                                                                                                                                                                                              |
| Interest claim                                            | The hypnotize climax the campaign was sequenced for — the L5-learned mechanic restored to genuine full power in the recruit-or-die room, weaponizing the prize roaches against the Queen; the descent earned by the enemy becoming deadliest, with a structural in-hand answer                                                                                                                                                                                                         |
| Termination                                               | §6.2 discretionary cutoff after 2 exchanges (2 debate docs); auto-stops A/B not fired; **measurable ship-gate** = both critics ≥75 **AND** measured ~50–54% on seeds 1..100, reading as the continued descent below merged L6 ~56 (L7 parked, not interpolated); a built L8 outside the band reopens per the L4-§9 precedent — **non-card fallback only (§4f)**; **SUPERSEDED in part by the RE-ARBITRATION below: the recruit band and the L8 target band are re-ruled post-dep-#10** |

---

## RE-ARBITRATION (post-dep-#10, empirical) — recruit band re-ruled

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2),
reconvening per the §7 reopening clause and the L4-§9
empirical-falsification precedent. **Status:** recorded amendment to
the §3 ruling. Scope is **L8 only** — the §1–§8 ruling above stands
**except** the two values explicitly re-ruled here (the
`recruit.successRate` band/start and the §5 L8 target band). Engine
remains FROZEN (dep #10 was the last authorized un-freeze); no code, no
scenario data touched by this amendment. **L7 is PARKED — not a
dependency; the curve is reasoned merged L6 (56) → L8 directly, L7 a
known gap, NOT interpolated.**

### R.1 The falsification + the §4g context (why the band reopens)

The original §3.1 / §3.4(a) / §4c ruling set `recruit.successRate` band
**[0.25, 0.35]**, start `0.30`. That band was set when
`recruit.successRate` was — **unknown to the arbiter at ruling time** —
a **hardcoded-inert module constant** (`engine/abilities.ts`
`RECRUIT_SUCCESS_RATE = 0.25 "locked by spec"`; verified
`recruitNeutral` / `handleRecruit` read it via `resolveAbilityParam`
only when the scenario opts in). Per `level-progression-plan` §4g, every
shipped scenario's `abilities.json` recruit/hypnotize delta was inert;
the band was a **lever the engine did not actually expose** — the exact
L4-§9 trap (a ruled value the frozen system does not exercise), here in
its purest form: the lever didn't move the engine _at all_.

**Engine dep #10 is now merged** (`f39c7bd` lineage; the opt-in
`abilityParamsAuthoritative` flag — verified `resolveAbilityParam`:
flag `true` ⇒ `abilities.json` `recruit.successRate` flows into the
unchanged single `rng.next() < rate` gate; RNG draw sequence and
ordering provably untouched). **L8 opts in.** So
`recruit.successRate` is now a **real, live, continuous engine lever**
for L8 — and the original band can be re-ruled against _measured_
leverage rather than the false hardcoded-inert premise.

**Orchestrator-verified measurements** (L8 opted in, dep #10 live, the
§3.5.2 binding "spider hypnotize-priority + queen-vector" doctrine
intact, lightest coherent deny screen):

| `recruit.successRate`  | measured ant win | hypnotize fires |
| ---------------------- | ---------------- | --------------- |
| 0.25 (engine constant) | ~30%             | ~11–16/100      |
| 0.30 (ruled START)     | ~37%             | ~11–16/100      |
| 0.35 (ruled CEILING)   | ~41–46%          | ~11–16/100      |

**[50,54] is unreachable at the ruled ceiling 0.35** with the §3.5.2
doctrine intact. Reaching [50,54] at ≤0.35 required driving hypnotize
firing to **0/100** — disabling the binding invariant, the explicit
L4-§9 trap — which was correctly NOT done. **Root cause (verified
against engine reality):** `engine/neutrals.ts` spawns exactly **one**
cockroach party (`KIND_ORDER` one `cockroaches`; `KIND_RECIPE` = 8
`cockroach` units in the single `neutral-cockroaches` party) on a
**random non-floor/ceiling plane** at a seeded tile; the §4g
engine-forced single-cockroach `target:1` reality stands (the "~8
spawns / target:4" of §3.4(a) is the design intent the orchestrator
maps onto the one-party engine — not relitigated, kept as-is). The
recruit race is therefore a single fast RNG gate (median ant win ~6
turns); the non-mage spider seizer cannot reach the random-plane
cockroach before resolution, so hypnotize only bites when a deny picket
follows the racer onto the prize tile — and any deny screen strong
enough to keep the hypnotize invariant alive (the §3.2/§3.5.2 ruled
climax) holds ant **≤46% at recruit ≤0.35**. The band's ceiling, not
the doctrine, is the binding error.

### R.2 The corrected ruling

Levers available (all data / AI-config; engine FROZEN — no §4d
plane-affinity, §4e heal-economy, §4f card-economy; keep the engine
`target:1` single-cockroach reality; the §3.2 hypnotize restore exact
values and the §3.5.2 hypnotize-priority + queen-vector doctrine
_existence_ remain **ruled invariants** — they are NOT touched, NOT
weakened, NOT driven to the 0/100 trap). The arbiter rules **(a) + (b)
together** — a re-priced recruit ceiling AND a corrected, slightly
widened L8 target band — and declines (c):

**(a) RE-RULED — `recruit.successRate` band ceiling raised (the now-real
continuous lever).** The measurements give a near-linear slope of
~+1.3–1.6pp ant per +0.01 recruit-rate over [0.30, 0.35] (0.30→37,
0.35→~43.5 midpoint). Extrapolating _conservatively_ (slope flattens as
the ant race saturates and the deny screen still costs recruited
parties): reaching the **~50–52%** corrected target needs roughly
0.35 + (50−43.5)/~1.3 ≈ **0.40–0.50**. Ruling, with margin for the
saturation flattening:

> **`recruit.successRate` band re-ruled `[0.40, 0.52]`, start
> `0.46`.** (Replaces the falsified `[0.25, 0.35]` / start `0.30`.)
> `cooldown 2`, `tier 2`, `uses:null` UNCHANGED (the gate stays the MP
> pool + the race + the deny screen, not recruit-rate inflation alone —
> the L5-§3.4 "no param inflation" discipline preserved; the ceiling is
> raised only because the lever is now _real_ and was measured short).

`0.46` start: the measured slope projects ~0.46 → ~**48–50%** with the
doctrine fully intact (hypnotize still firing ~11–16/100); it sits
mid-band so the loop can move ±0.06 either way to land the corrected
target on the seed sweep. The ceiling `0.52` is the reasoned headroom
to reach the upper corrected band (~54) if the deny screen measures
heavier than the light screen; the floor `0.40` prevents the loop from
regressing toward the falsified sub-46 region.

**(b) RE-RULED — the §5 L8 target band corrected/widened.** The
structural ceiling with the §3.5.2 doctrine _intact_ and `target:1`
engine reality is empirically ~46–50 even at an aggressive but
non-trap recruit rate; the original §5 "≈50–54, settling ~52" was
itself set under the §4g false premise (the recruit lever credited with
leverage the inert constant never had — sibling to the §4g L5
mis-attribution caution). L7 is PARKED, so the curve **already has a
declared gap**; L8's exact value has latitude as the continued descent
_below_ merged L6 56 and _above_ the L10 ~50 climax. Ruling:

> **L8 target band re-ruled `[49, 53]`, point prediction ~51%**
> (replaces "≈50–54, ~52"). Still a clean monotone drop below merged
> L6 ~56; still separated above the L10 ~50 finale (≥1pp clearance at
> the band floor); still "the hard level before the end." The 1pp
> downward shift of the band centre absorbs the structural ceiling the
> intact-doctrine + `target:1` engine imposes, without flattening the
> descent or colliding with L10.

The shape, direction, the §3.2 hypnotize restore exact values, the
§3.5.2 doctrine existence, and the §3.4d no-plane-affinity / no-card /
no-heal carries remain ruled invariants — only the two scalar values
above move.

**(c) DECLINED — no recruit-cadence / doctrine-timing tweak.** A
cadence change (e.g. lowering `recruit.cooldown`, or retiming the
spider hypnotize-priority threshold so it bites earlier in the fast
race) was considered and **rejected**: any timing change that makes
hypnotize bite _more_ inside the ~6-turn race pushes toward
over-firing/cold-stomp, and any that makes the ant win the race faster
to "earn headroom" pushes hypnotize toward the 0/100 trap — both are
the failure modes the §3.5.2 invariant exists to forbid. Re-pricing the
now-real recruit lever (a) plus correcting the band that was set on the
false premise (b) reaches the target _without_ perturbing the binding
doctrine's timing. The doctrine's aggression-threshold / target-
selection remains the loop's existing §3.5.2 latitude — unchanged by
this amendment.

### R.3 Corrected prediction + measurable ship-gate

**Corrected L8 ant win-rate prediction: ~51%** (corrected band
**[49, 53]**), at `recruit.successRate` start **0.46**, the §3.2
full-power hypnotize and §3.5.2 doctrine **intact and firing**, the
per-caster tier-3 MP ceiling and `target:1` single-cockroach engine
reality unchanged. The continued decisive descent: merged L6 ~56 →
L8 ~51 (clean monotone drop), separated above the L10 ~50 climax;
**L7 PARKED — a known gap, NOT interpolated.**

**Re-ruled measurable ship-gate (replaces the §7 numeric gate; the
structural gate clauses of §7 otherwise stand):** the L8 data ships
**iff ALL hold** on the deterministic `baseline-l8` vs `spider-l8`
seeds-1..100 sweep:

1. **Both critics ≥75/100** (§6.2 automatic stop A, on the built
   scenario), **AND**
2. **Measured ant win-rate ∈ [49, 53]** (the corrected band), reading
   as the continued descent below merged L6 ~56 and separated above
   L10 ~50 (L7 a parked gap, NOT interpolated), **AND**
3. **The §3.5.2 binding hypnotize doctrine still fires in a
   seed-robust set** — hypnotize attempts > 0 in a clear majority of
   the 100 seeds (the invariant is _alive_, NOT driven to the 0/100
   L4-§9 trap to hit the band). A measured band hit obtained _with_
   hypnotize at ~0/100 is a **ship-gate FAILURE**, not a pass.

**Non-card falsification fallback (§4f — binding, unchanged):** a
missed band reopens; the **only** correctives are (i)
`recruit.successRate` within the re-ruled `[0.40, 0.52]`, (ii) the §3.5
recruit-economy / spider hypnotize-caster roster dials, (iii) a further
small correction of the [49,53] band on the curve if the
intact-doctrine structural ceiling proves even tighter. **NEVER** a
card-deck / `goldPerTurn`-for-cards lever, **NEVER** plane-affinity,
**NEVER** a heal-economy, and **NEVER** by disabling/weakening the
§3.5.2 hypnotize doctrine to the 0/100 trap (the parked-L7 / L4-§9
precedents). Confirmed: this amendment is **non-card,
no-plane-affinity, `target:1` engine reality preserved, §3.2 hypnotize
restore values and §3.5.2 doctrine intact.**

### R.4 Cross-level note (RECORDED, not decided here)

L7 PARKED after 4 falsifications, **and** L8 now requiring a
re-arbitration to reach its band (and even then only by raising the
recruit lever well above the original ceiling and _widening/lowering_
the §5 target), is corroborating evidence that the §5 **late-level**
win-curve targets (L7–L10) may be **systematically tight** versus what
the frozen engine + locked AI doctrine can actually deliver — the §4g
mis-attribution (inert levers over-credited) compounds this. **Flagged
as a Tier-1-retrospective input for the post-L8–L10 consolidated
review** (alongside the L7 disposition, §4f.3). This amendment does
**NOT** re-rule the curve — scope is L8 only; the systemic question is
the consolidated review's to decide with the full L8–L10 data.
