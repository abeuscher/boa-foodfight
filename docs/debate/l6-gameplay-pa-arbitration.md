# Gameplay Progression Agent — L6 Stairs Mechanic Delta: ARBITRATION

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2).
**Status:** Phase-D L6 deliverable. Document only — no code, no scenario
data. This is the concrete L6 mechanic delta spec the orchestrator
wires into `data/level-6/` (over the Level PA's placeholder) and the
within-scenario loop tunes.
**Inputs:** `docs/debate/l6-ant-advocate.md`,
`docs/debate/l6-spider-advocate.md` (opening + rebuttal each);
`docs/debate/l5-gameplay-pa-arbitration.md` (the **L5 baseline this
deltas FROM** — plane-affinity at the banked `spider combat wall +1/+1`
values + full corner coverage, hypnotize light `maxControlTurns:3,
minControlTurns:2`, recruit-as-order charisma-gated, Under-Bed
concealment, the carried L4 state; all carry forward into L6
**byte-identical**, **not** relitigated);
`docs/debate/l4-gameplay-pa-arbitration.md` §9 (the **empirical-
falsification precedent**: a ruled value the frozen AIs do not exercise
measured ant 99% / +39pp — the §7 reopening clause makes a built level
that misses its band reopen; the ship-gate here MUST be measurable);
`docs/mechanic-distribution-plan.md` §2 (the L6 row), §3.G
(POST-occupation bonus → combat/economy bonus live at **exactly L6**,
the no-earlier-leak guard upheld, the L5-stomp fallback logged as a
Phase-D contingency), §3.I (asymmetric plane-switch → **full corner
coverage at L6**), §4 (win-curve: L6 predicted **~55%**, the resumed
descent, monotone L5 66 → L6 ~55, separated above the L7 ~64), §5
(POST-occupation bonus is a combat/scoring _payload_ on an existing
POST — Gameplay-owned, the same ownership shape as the L7-Remote split,
**not** a new boundary case);
`docs/level-progression-plan.md` §2 L6 (Stairs geometry: `static`,
10×10, **five terraced bands** rows 0–1/2–3/4–5/6–7/8–9 connected by
1-wide zig-zag step gaps, ceiling = the flyer lane, 2 planes; **5
Step-Landing POSTs** one per terrace, heal/stage only, no capture
chain; ant queen bottom landing, spiders scattered on the upper
four — Level-owned, running in parallel, **not** designed here), §4b
(engine FROZEN — `eradicate` victory + ant-loss-on-timeout implemented
PR #10; data/AI-config only, **no new engine code**), §4c
(score-resolution **N/A** for `eradicate` — decisive-or-timeout-loss,
no score path), **§4d (BINDING — plane-affinity `wall` deltas are
empirically inert under the chain-march/fortress AI doctrine; pick
levers the AIs ACTUALLY EXERCISE; plane-affinity is a latent identity
layer carried from L5 unchanged, NOT a curve lever, NOT budgeted)**.
**Bounded by:** §3.1 hard floors, §3.4 cumulative-addition, §5 curve
(L6 ≈ 55%, the **resumed descent** — the hardest-but-fair point,
monotone L5 66 → L6 ~55, **separated below L5 and above the L7+
continuation**), §6.3 ownership (Gameplay owns this; the terraced
geometry, step-gap funnel, ceiling flyer lane, and 5 Step-Landing POST
_placements_ are the Level PA's, running in parallel — **not** designed
here). Engine surface frozen (§4b) — this delta is **data-only**: the
shipped `postSchema` `defensiveBonus` / `healingRate` fields
(`engine/schemas/map.ts:66–133`), the shipped `eradicate`
`victoryConditionSchema` member + the `turn.ts:490–499` ant-loss-on-
timeout path (already implemented PR #10), AI-config via the within-
scenario loop (§4b-permitted), roster gating via
`data/level-6/roster-*.json`, ability params via
`data/level-6/abilities.json`. **No new engine code.**

---

## 1. What was actually contested

Placement was **not** in contest and is not re-decided here. The
mechanic-distribution plan §2 / §3.G / §3.I already ruled the entire L6
component set; the L5 arbitration fixed the state L6 inherits unchanged;
level-progression-plan §4d _directed_ the no-plane-affinity outcome.
Both faction sub-agents conceded every placement explicitly:

- **POST-occupation bonus, combat/economy bonus live at exactly L6**
  — ruled §3.G (spider on mechanism and floor; ant on the
  no-earlier-leak guard; the L5-stomp _proactivity-only_ fallback
  logged as a Phase-D contingency, not pre-adopted). Both factions
  conceded it is the L6 non-negotiable and the engine of the dip.
- **Asymmetric plane-switch → full corner coverage at L6** — pre-ruled
  §3.I (banked from L4 range-limited; the Stairs is where vertical
  reach is the scenario's entire point). Both ratified, neither
  relitigated.
- **`eradicate` victory + ant-loss-on-timeout** — Level-owned victory
  structure, engine-implemented (PR #10, level-progression-plan §4b);
  no score path (§4c). Both conceded it entirely as the structural
  spider tax already priced into ~55% — "a ratification, not a debate."
- **No plane-affinity delta at L6** — _directed_ by
  level-progression-plan §4d (empirically inert; latent identity layer,
  not a curve lever). Both factions accepted it without contest; the
  spider explicitly conceded "the lesson cuts for me too."
- **The entire L5 state** (plane-affinity at the banked `spider combat
wall +1/+1` + full corner coverage, hypnotize light
  `maxControlTurns:3, minControlTurns:2`, recruit-as-order, Under-Bed
  concealment, the carried L4 state) carries forward **byte-identical**
  — not relitigated.

The two faction sub-agents converged — the same §6.2-designed profile
the L3/L4/L5 debates produced — onto a **single residual: the
specification shape of the one load-bearing lever**, with strong
agreement on structure:

- **Both agree** the POST-occupation bonus must be a per-turn
  **economy/score pressure on occupied Step-Landings that the spider
  AI's optimizer reads and responds to by sortieing** — the
  §4d-compliant, AI-exercised form — and **not** a passive combat
  sit-buff the fortress AI gets free while turtling (the §4d trap that
  inverts "spiders don't turtle anymore"). The ant arrived at this from
  the no-turkey-shoot side; the spider arrived at the _identical_
  specification from the no-static-farm side. **This is a convergence,
  not a dispute** — the daylight is pricing, which the curve resolves
  objectively.
- **Both agree** the post-occupation pressure is the _engine_ of the
  resumed ~55% descent and the flyer/plane-switch full-coverage route
  is its budgeted _ceiling_ (the answer that holds the dip at
  hardest-but-fair ~55%, not a subsidy floating L6 back toward L5 66).
  The only daylight is the ~1–2pp pricing of "dominant engine" vs
  "fairness ceiling," which the curve makes objective.
- **Both agree** `eradicate` + ant-loss-on-timeout is the structural
  tax already priced into ~55%, not a stackable combat subsidy
  (mutual; ratification).
- **Both agree** no plane-affinity delta (§4d-directed; mutual).

This is exactly the §6.2 convergence the format is designed to produce:
the adversarial exchange collapsed a four-component room to (1) a set
of pre-ruled / §4d-directed placements both sides ratified, and (2) a
**single specification-shape question with both sides independently
converged on the answer** (economy/score pressure the AI exercises, not
a combat sit-buff) — the residual being pricing the curve resolves.

---

## 2. The L6 baseline (what L5 ships, what L6 deltas FROM)

From `data/level-5/*` (verified against source). The L6 delta is
expressed against these:

- **`units.json` `planeAffinity`** — the L5 state, **carried into L6
  byte-identical** (verified `data/level-5/units.json`): spider combat
  templates (`spider-soldier/scout/spinner/elite` + promoted
  `-veteran-soldier/-knight/-weaver/-stalker`) `wall {attack:1,
armor:1}`, `ceiling {attack:1, armor:1}`; spider-queen `wall {0,0}`,
  `ceiling {1,1}`; ants/queens/support/neutrals per L5. **L6 does NOT
  touch `planeAffinity`** — directed by level-progression-plan §4d
  (empirically inert under the chain-march/fortress AI doctrine; a
  latent identity layer, not a curve lever). Stated for the
  orchestrator's no-touch guarantee; it is **not budgeted as an L6
  win-rate mover**.
- **`postSchema`** (`engine/schemas/map.ts:66–133`, shipped) — the
  data-expressible POST fields the POST-occupation bonus uses:
  `defensiveBonus` (int ≥0, applied to the defender in
  `turn.ts:assignSides` when a party occupies a friendly POST),
  `healingRate` (int ≥0, applied each end-of-turn in
  `end-of-turn.ts:applyHealing` → `friendlyPostUnder` → `healParty` to
  every unit of the party occupying a friendly POST). **No new field,
  no engine change** — both are already honored by the frozen engine.
- **`victoryCondition`** — `{ kind: "eradicate" }` (shipped member,
  `victoryConditionSchema`, carries no POST reference). Engine:
  `checkWinner` `eradicate` case (`end-of-turn.ts:444–452`) — ant loss
  if queen dead or field-force wiped, ant win iff
  `allSpiderPartiesEliminated`; `turn.ts:490–499` — `eradicate` with no
  winner at the turn cap → **spider wins, no score tiebreak** (the §4c
  no-score-path, the §4.3.2 ant-loss-on-timeout). All
  already-implemented (PR #10); **L6 uses it, does not build it**.
- **`abilities.json`** — `ant-plane-switch` (`tier 3, uses 1,
cooldown 0, params {}`), `spider-corner-cross` (`passive, uses
null`) carried byte-identical from L5. "Full corner coverage at L6"
  is realized **by the Level PA's L6 plane/geometry making the
  switch's reach span the terraces** (the §3.I banking — same
  no-data-change mechanism as the L4→L5 affinity full-coverage; the
  reduced L4 plane set _was_ the range limit, the L6 vertical geometry
  _is_ the full reach). **No ability param change.**

The honest framing of the L6 delta: not "introduce the
POST-occupation bonus / plane-switch / eradicate" (the POST fields, the
switch ability, and the eradicate victory are all already shipped) —
it is **"in the no-turtle Stairs, the Step-Landings start paying a
per-turn economy/heal/score advantage to whoever holds the most
contested ground, so the spider AI's own optimizer abandons its
start-landings and comes down the terraces; the ant's answer is to
out-tempo via the now-full-coverage plane-switch and the ceiling flyer
lane; the eradication clock has no score escape."** One room of change
in _function_, expressed entirely through existing data structures and
within-loop AI-config. The single new high-cognitive mechanic is the
POST-occupation bonus (plane-switch full coverage is a ramp completion
of an already-live order — not counted; `eradicate` is the Level-owned
victory structure).

---

## 3. RULING

This is decided on **win-curve shape** (the §3.4.4 binding arbiter),
with the §5 "interesting > fair" license consulted and found to
**reinforce**, not override, the curve answer (both factions' interest
arguments are credible and aligned with the curve — the room is the
spec's defender becoming the proactive hunter the spec always
promised). The curve intent is explicit and binding: **L6 ≈ 55%, the
RESUMED DESCENT — a clean monotone ~10pp drop below L5's measured ~66%
rebound, the hardest-but-fair point of Tier 1's first half, separated
below L5 and above the L7 ~64 continuation** (roadmap §5;
mechanic-distribution plan §4; the user's explicitly-licensed "hard
level before the end"). The L4→L5 step was the licensed non-monotone
rebound; **L5→L6 is the binding monotone resumed-descent segment, and
it must read as the enemy becoming a proactive threat — not a passive
stat dip and not a turkey-shoot.**

### 3.1 POST-occupation bonus — RULING: a per-turn economy/heal/score pressure the spider AI exercises (the §4d-compliant, AI-EXERCISED, load-bearing lever); a passive combat sit-buff is REJECTED on §4d + the L4-§9 precedent

**RULING: the POST-occupation bonus is specified as a per-turn payload
on the 5 Step-Landing POSTs — `healingRate` + `defensiveBonus` on every
landing — paired with a BINDING within-loop AI-doctrine constraint that
makes the spider AI _read_ the held-ground arithmetic and _sortie off
its start-landings to contest_. It is the dominant engine of the
resumed ~55% descent (−8 to −10pp ant vs a hypothetical turtling
spider). A "static combat sit-buff the fortress AI gets free while
turtling" is REJECTED — it is the §4d trap (inverts "spiders don't
turtle anymore") and the exact L4-§9 falsification structure (a ruled
value the frozen AIs do not exercise). Both factions independently
converged on the AI-exercised economy/heal form; the curve makes the
pricing objective.**

This is the L4 Light-Switch / L5 plane-affinity logic, applied with the
§4d lesson now binding. The L4 §9 re-arbitration is the precedent the
brief mandates I honor: a ruled `combatModifier` measured ant 99%
because the frozen chain-march/fortress AIs **never touched the POST it
keyed off**, so the buff was permanent-and-unconditional instead of
contested-and-transient. §4d generalizes that: plane-affinity `wall`
deltas measure ~0pp for the identical reason (the AIs fight floor and
ceiling, never walls). **A POST-occupation bonus specified as a passive
"+attack while you occupy this landing" is the same defect a third
time**: the fortress spider AI _starts_ owning its upper Step-Landings
and never moves, so a combat sit-buff is a buff the spider gets _free,
permanently, while turtling_ — which makes turtling _strictly better_,
the exact inversion of the §3.G ruling's binding intent ("make spider
turtling on start-POSTs strictly worse than contesting the terraced
gauntlet"). Both sub-agents independently derived this — the ant from
the no-turkey-shoot side, the spider from the no-static-farm side. The
arbiter ratifies their convergence as the binding specification.

The §4d-compliant form has two parts, both ruled:

1. **The data payload (Gameplay-owned, ruled; §3.2 gives concrete
   numbers):** every Step-Landing carries a per-turn `healingRate`
   (regeneration to the occupying party each end-of-turn,
   `end-of-turn.ts:applyHealing`) plus a `defensiveBonus` (combat
   resilience while defending the held landing, `turn.ts:assignSides`).
   This is _occupation economy_, not a flat attack stat: holding more
   contested landings = more regen + more durable held ground =
   out-attriting the opponent in a no-score, kill-everything room.
   Crucially it is **symmetric in the data** (both factions get it on
   any landing they hold) but **asymmetric in consequence by the
   victory structure**: the ant must clear _every_ spider party before
   the clock (`eradicate` + ant-loss-timeout); a spider that turtles
   two start-landings while the ant accumulates the other three is
   _winning the regen/durability race on the contested ground the ant
   must take_ — so the spider's own optimizer computes that **NOT
   sortieing loses**. The economy pressure is the thing that makes the
   spider's evaluation function abandon the turtle; it is read by the
   AI because regeneration and held-ground durability are first-order
   inputs to any attrition optimizer, unlike a `wall` affinity gradient
   the chain-march/fortress doctrine never enters.

2. **The BINDING within-loop AI-doctrine constraint (load-bearing,
   §4b-permitted — data/AI-expressible, engine frozen; the L4-§9.3(b)
   pattern applied):** the orchestrator's within-scenario loop **MUST**
   field an L6 spider AI whose decision function _reads the per-turn
   held-landing economy_ and, when turtling its start-landings is
   computed as losing the attrition race, **sorties down the terraces
   to contest the ant's held Step-Landings**. The spider must not
   statically squat. This is not a free knob — like L4-§9.3(b), the
   _existence of the sortie behavior_ (the spider AI provably leaves
   its start-landings to contest in a seed-robust majority of games) is
   a **ruled invariant**; the _aggression threshold / sortie timing /
   detachment size_ is the loop's tuning latitude toward the §6 band.
   If no fielded spider-AI configuration makes the bonus produce the
   sortie within the band, the orchestrator escalates per §3.5 (the
   §3.G-logged proactivity-only contingency / a Level-PA
   landing-placement recommendation).

**Win-curve justification (§5):** a turtling spider in this room is the
~75%+ ant turkey-shoot the §3.G ruling exists to prevent (ant grinds
each static garrison, beats the clock) — _not_ the ruled ~55%. A
_sortieing_ spider, driven by the economy pressure its own AI reads, is
the ~55% scenario: the dominant driver of the L5 66 → L6 ~55 resumed
descent, **−8 to −10pp ant** vs the turtling counterfactual. The
spider's "must register, not a behavior-flavor zero" is **upheld** (it
is the engine of the whole dip, not a tweak); the ant's "must be
AI-exercised economy pressure, not a free combat sit-buff" is **upheld
and is the binding specification** (the §4d trap is rejected). Both
framings are the _same ruling_ viewed from two sides; the curve
(§3.4.4) makes it objective: −8 to −10pp, the resumed descent's
**engine**. **Interesting-vs-fair:** interest decisively reinforces —
a spider that comes _down the terraces for the ant_ is _the reason L6
is a game_; §5's hard-level-before-the-end license covers the ~55% dip
explicitly, and a static buffed turtle is precisely the
boring-but-balanced failure §6.2 names.

### 3.2 The concrete POST-occupation payload (the headline deliverable; data-expressible, no engine code)

**RULING: every one of the 5 Step-Landing POSTs carries
`healingRate: 3` and `defensiveBonus: 3`** (the L6 delta vs the
Level-PA placeholder's heal/stage-only landings). Both are existing
`postSchema` fields already honored by the frozen engine
(`healingRate` → `end-of-turn.ts:applyHealing`/`healParty`;
`defensiveBonus` → `turn.ts:assignSides` defender bonus). **No new
field. No engine change (§4b).**

| Step-Landing POST (Level-PA placement) | `healingRate` (L6 delta) | `defensiveBonus` (L6 delta) |
| -------------------------------------- | ------------------------ | --------------------------- |
| Step-Landing 1 (bottom, ant queen)     | **3**                    | **3**                       |
| Step-Landing 2                         | **3**                    | **3**                       |
| Step-Landing 3                         | **3**                    | **3**                       |
| Step-Landing 4                         | **3**                    | **3**                       |
| Step-Landing 5 (top)                   | **3**                    | **3**                       |

- **`healingRate: 3`** — per-turn regeneration to whoever occupies the
  landing. This is the _economy/score pressure_: in a no-score,
  kill-everything room the side holding more landings out-regenerates
  and out-lasts; a spider squatting two start-landings while the ant
  accumulates three is losing the attrition arithmetic — the input the
  spider AI reads to justify the sortie. `3` is the
  loop-tunable midpoint of the band (see §3.5); strong enough to be a
  first-order optimizer input (not sub-perceptual like a `wall`
  gradient), bounded enough not to make any single landing an
  impregnable fortress.
- **`defensiveBonus: 3`** — held-landing combat durability. Pairs with
  the regen so contested ground is _worth_ contesting (the spider that
  sorties to re-take a landing the ant holds is fighting into a
  defended POST — a real, bidirectional contest, not a one-way ant
  grind). It makes the _ant's_ held landings sticky too, which is what
  forces the spider to _sortie and commit_ rather than poke.
- **Symmetric in data, asymmetric by victory structure:** both factions
  get identical numbers on any landing they own. The asymmetry that
  makes turtling strictly worse for the spider is the `eradicate` +
  ant-loss-timeout structure (§3.3), not an asymmetric stat — which is
  why this is §4d-robust: it is not a faction gradient the AI ignores,
  it is an occupation economy both AIs' optimizers must weigh.
- **One-sentence statement (the §3.4.3 "name what's new" test):**
  _"Every stair landing now heals and hardens whoever holds it — so the
  spiders can't just sit on the top steps and wait you out; they have
  to come down and fight you for the ground."_ The single new
  high-cognitive mechanic.

### 3.3 `eradicate` + ant-loss-on-timeout — the structural tax (carried-in, framed, not designed)

**RULING: ratified as the carried-in Level-owned victory structure;
the `eradicate`-specific combat/economy framing is that there is NO
score path (§4c) so the post-occupation economy pressure is purely an
_attrition-and-tempo_ lever, not a score lever — the bonus's job is to
make the spider AI sortie so the timeout clock has teeth, NOT to feed a
score path (there is none).**

The engine is verified (`turn.ts:490–499`): `eradicate` with no winner
at the turn cap → `winner: 'spider'`, **no `scoreScenario` call, no
tiebreak** (the explicit §4c "score-resolution N/A for `eradicate`"
path — distinct from the `capture-post` round-19 score path). The ant
must satisfy `allSpiderPartiesEliminated` (`end-of-turn.ts:444–452`)
before the cap or lose. This is the structural spider tax both factions
conceded is already priced into ~55%; it is the spider's L6 identity
delivered by the victory kind itself (the spec's defender handed the
clock, §4.3.2). The arbiter records the binding framing: **the
POST-occupation bonus is an attrition/tempo economy, not a score
construct** (there is no score to construct) — its sole curve job is
making the spider AI's optimizer abandon the turtle (§3.1), so the
ant-loss-on-timeout clock becomes a real threat (a sortieing spider the
ant must chase and clear before the cap, not a static garrison the ant
grinds at leisure). Double-counting the timeout tax as a stackable
combat subsidy is **rejected** (the L4-§3.D "unanswered escalation"
the arbiter has refused consistently; both factions conceded this).

### 3.4 Plane-switch full corner coverage + the flyer-favored framing — RULING: the ant's answer-in-the-room, the budgeted ceiling that holds the dip at hardest-but-fair ~55%

**RULING: plane-switch full corner coverage at L6 is ratified
(pre-ruled §3.I) — realized by the Level PA's L6 vertical geometry
making the switch's reach span the terraces (NO data/ability change,
the §3.I no-data-change mechanism). Combined with the Level-owned
ceiling flyer lane, it is the ant's tempo answer in the same room: it
holds L6 at the licensed hardest-but-fair ~55% (+3 to +5pp ant vs no
answer), the budgeted CEILING on a dip the spider's proactivity OWNS —
NOT a subsidy that floats L6 back toward L5 66.**

The Level PA owns the terrain (terraced bands, step-gap chokes funneling
non-flyers, the ceiling flyer lane that skips gaps;
level-progression-plan §2 L6) — _spatial_, Level-owned, not designed
here. Gameplay owns the combat/economy that tips the flyer payoff, and
the brief requires the framing: **the flyer/plane-switch route is the
fairness mechanism, not dead-flavor terrain**. Per §4d, terrain the AI
ignores is suspect (the L3 "height POST with no plane-affinity"
failure). The tip is the §3.1 economy pressure itself: with the spider
AI sortieing (§3.1.2) in a no-score, ant-loss-timeout room, the ant
that grinds the 1-wide step gaps arrives too slowly to re-take
contested landings before the clock — it _loses_. The ant that flies
the ceiling lane or plane-switches up (now full-coverage, §3.I) reaches
and contests the upper Step-Landings _fast enough to win the
post-occupation attrition race_. That is the flyer payoff expressed as
**combat/economy tempo** (Gameplay-owned), not terrain the AI ignores —
and it is _why_ §3.I banked plane-switch full coverage to exactly L6.

**The pricing (the residual the curve resolves):** the spider's
arithmetic correction is **upheld** — the post-occupation economy
pressure is the **dominant engine** (−8 to −10pp, §3.1) and the
flyer/plane-switch route is its **budgeted ceiling** (+3 to +5pp), the
counter that holds the dip at hardest-but-fair ~55% rather than
overshooting into an unwinnable sub-50% wall (the §6.2 feel-bad — a
hard room with no answer). The ant's "fairness mechanism" framing is
**upheld in direction** (it _is_ the answer that keeps the hardest room
winnable); the spider's "ceiling, not neutralizer" framing is **upheld
in magnitude** (it is budgeted against the engine so the net is the
controlled ~55%, separated below L5 66 and above L7 ~64 — not a ~59%
that crowds the L5→L6 separation). This is the exact L4-Light-Switch-
as-spike-ceiling / L5-plane-affinity-as-rebound-ceiling structure,
applied a third time with the §4d lesson binding. Both factions'
framings are the same ruling from two sides; the curve makes the split
objective.

### 3.5 No plane-affinity delta at L6 — RULING: EXPLICITLY CONFIRMED, carried from L5 byte-identical, NOT budgeted (§4d-directed)

**RULING: NO plane-affinity delta is applied at L6. The L5
`planeAffinity` table (spider combat `wall {attack:1, armor:1}` + full
corner coverage, all ant/queen/support/neutral rows) carries forward
into `data/level-6/units.json` BYTE-IDENTICAL. This is the binding
level-progression-plan §4d direction, not an arbiter choice: plane-
affinity `wall` deltas are empirically inert under the chain-march/
fortress AI doctrine (measured ~0pp across L3/L4/L5), a latent identity
layer that paints the spiders as wall-climbers, NOT a curve lever. It
is NOT budgeted as an L6 win-rate mover. The L6 ~10pp resumed descent
is carried ENTIRELY by levers the AIs actually exercise: the
post-occupation economy pressure that makes the spider AI sortie
(§3.1, the engine), the Level-owned vertical geometry, the
full-coverage plane-switch tempo answer (§3.4, the ceiling), and the
`eradicate` + ant-loss-timeout structure (§3.3, the tax).**

Both factions accepted this without contest (the spider explicitly:
"the lesson cuts for me too — I will not ask the arbiter to budget it
as the L6 mover and watch it measure ~0pp"). The arbiter records it as
a binding no-touch guarantee for the orchestrator and as the explicit
§4d-compliance confirmation the brief requires: **the L6 delta budget
is spent on the AI-EXERCISED post-occupation economy lever, NOT on
plane-affinity.**

### 3.6 Where each faction is upheld

Symmetric with the L3/L4/L5 arbitrations (every concession honored, no
over-reach granted, the convergence ratified, neither faction denied
its identity):

- **Spider upheld:** L6 is delivered as the spec's scenario for the
  defender (§4.3.2) — the post-occupation economy pressure is the
  **dominant engine** of the resumed dip and **registers** as such
  (−8 to −10pp, not tuned to a behavior-flavor zero — the spider's
  "must register" ask, upheld, symmetric to the L5 plane-affinity
  "must register" ruling); the `eradicate` + ant-loss-timeout
  structure is ratified as the spider's structural identity tax; the
  spider AI sortie is a **ruled invariant** (§3.1.2), not optional
  flavor — the spider _becomes the hunter_, its core verb, at the room
  built for it. No over-reach granted: no combat sit-buff (the §4d
  trap, rejected), no stacked timeout subsidy (the L4-§3.D unanswered
  escalation, rejected), no plane-affinity inflation (§4d, none).
- **Ant upheld:** the POST-occupation bonus is the **AI-exercised
  economy form** the ant demanded (the §4d trap rejected, the L4-§9
  precedent honored — the ant's load-bearing point); the flyer/plane-
  switch tempo route is ratified as the **fairness mechanism** that
  keeps the hardest room winnable (the answer-in-the-room, §3.4); the
  carried L5 state (Under-Bed concealment, hypnotize cap,
  recruit-as-order, the L4 carry) is **byte-identical** — no ant tool
  weakened; no plane-affinity budget waste (§4d). The ant's "the dip
  must be earned by a real AI-exercised mechanic, not a stat that never
  fires" is the binding §4d/§3.4.4 reading and is **upheld as the
  decisive specification frame**.

Neither faction is denied its identity — the spider becomes the
proactive hunter at the room the spec built for the defender; the ant's
answer is tempo and verticality (out-reach, don't out-grind). They are
sequenced together in one room by design (the §3.G no-leak guard
placed the bonus at _exactly_ L6, the §3.I banking placed full-coverage
plane-switch at _exactly_ L6, _because_ the eradication room is where
proactivity and the vertical answer must debut together): escalation
and answer, the §3.D / L4-§3.2 / L5-§3.2 doctrine, applied a fourth
time with the §4d lesson now binding.

---

## 4. The L6 mechanic delta — concrete, data-level spec

Implementable directly against shipped schemas and the
already-implemented `eradicate` victory + ant-loss-timeout (PR #10);
**no engine code** (§4b). The L6 data set = the L5 data set with
**only the changes below**. Every unmentioned field, template, and row
is byte-identical to L5. The orchestrator wires this into
`data/level-6/`.

### 4a. POST-occupation bonus — the headline deliverable (Gameplay-owned, ruled §3.1/§3.2)

Wired into `data/level-6/map.json` over the Level-PA placeholder's
heal/stage-only Step-Landings. The Level PA owns the 5 Step-Landing
POST nodes (location: one per terrace; ownership: ant queen bottom
landing, spiders the upper landings; the terraced/step-gap/ceiling
geometry — §6.3, Level-owned, **not** designed here). Gameplay (this
arbitration) owns and hereby specifies the per-turn payload, as the
shipped `postSchema` fields:

```
// every Step-Landing POST (all 5), L6 delta vs the Level-PA placeholder:
"defensiveBonus": 3,
"healingRate":    3
```

**Exact engine semantics (verified, no new code):**

- `healingRate: 3` — `end-of-turn.ts:applyHealing` →
  `friendlyPostUnder` → `healParty`: every unit of the party occupying
  a **friendly** (own-owned) Step-Landing heals 3/turn (capped at
  template max HP). The per-turn economy/attrition pressure the spider
  AI's optimizer reads (§3.1.1).
- `defensiveBonus: 3` — `turn.ts:assignSides`: a party defending a
  friendly Step-Landing it occupies gives the attacker that POST's
  `defensiveBonus`. Contested held ground is durable both ways — what
  forces the spider to _commit_ to a sortie, not poke (§3.2).
- **Symmetric in data** (both factions, any landing they own);
  **asymmetric in consequence** by the `eradicate` + ant-loss-timeout
  structure (§3.3) — which is what makes spider start-POST turtling
  _strictly worse_ than contesting (the §3.G ruling's binding intent),
  and what makes this §4d-robust (an occupation economy both
  optimizers must weigh, not a faction gradient an AI ignores).

**Binding within-loop AI-doctrine constraint (ruled §3.1.2,
load-bearing, §4b-permitted — data/AI-config, engine frozen):** the
orchestrator's within-scenario loop **MUST** field an L6 spider AI
whose decision function reads the per-turn held-landing economy and
**sorties off its start-landings to contest the ant's held
Step-Landings** when turtling is computed as losing the attrition race.
The **existence of the sortie** (the spider provably leaves its
start-landings to contest in a seed-robust majority of games) is a
**ruled invariant**; the aggression threshold / sortie timing /
detachment size is the loop's tuning latitude toward the §5 band. If
no fielded spider-AI configuration produces the sortie within the band,
the orchestrator escalates per §3.G's logged proactivity-only
contingency and/or recommends the Level PA adjust Step-Landing
placement/ownership (Level-owned, §6.3 — Gameplay recommends, does not
rule, this; the §3.2 payload is placement-relative and stable under any
such Level move).

### 4b. Plane-switch full corner coverage — ratified, no data change (ruled §3.4, pre-ruled §3.I)

Data-only / no change. `ant-plane-switch` stays `tier 3, uses 1,
cooldown 0` byte-identical to L5; `spider-corner-cross` stays the
passive byte-identical to L5. "Full corner coverage at L6" is realized
**by the Level PA's L6 vertical terraced geometry making the switch's
reach span the terraces** (the §3.I no-data-change mechanism — the L4
reduced plane set _was_ the range limit, the L6 vertical geometry _is_
the full reach). **No ability param change, no engine change.** The
arbiter records a **binding L6 cross-check**: if the Level PA's L6
geometry does not in fact give plane-switch its full terrace reach,
this §3.I/§3.4 ruling reopens (the L4-§4b range-limit cross-check
pattern). The flyer-favored tip is the §3.1 economy pressure +
ceiling-lane tempo (§3.4), not a switch param.

### 4c. `eradicate` + ant-loss-on-timeout — carried-in, framed, not designed (ruled §3.3)

No data delta beyond `victoryCondition: { kind: "eradicate" }` (shipped
member, Level-owned victory structure; carries no POST reference). The
ant-loss-on-timeout path (`turn.ts:490–499`: `eradicate` no-winner →
spider, no score tiebreak) is already implemented (PR #10) and is the
§4c no-score-path. **`eradicate`-specific combat/economy framing
(binding):** there is **no score construct** — the §3.2 payload is a
pure attrition/tempo economy whose sole curve job is making the spider
AI sortie (§3.1) so the timeout clock has teeth; it does **not** feed a
score path (there is none, §4c). Stated for the orchestrator; not
designed here (Level-owned victory structure).

### 4d. No plane-affinity delta — carried from L5 BYTE-IDENTICAL (ruled §3.5, §4d-directed)

`data/level-6/units.json` `planeAffinity` = `data/level-5/units.json`
`planeAffinity`, **byte-identical** (spider combat `wall {1,1}` +
ceiling `{1,1}` + full corner coverage; all ant/queen/support/neutral
rows). **No plane-affinity delta is applied at L6.** This is the
binding level-progression-plan §4d direction (empirically inert under
the chain-march/fortress AI doctrine; latent identity layer, not a
curve lever; **not budgeted as an L6 win-rate mover**). The orchestrator
no-touch guarantee; the explicit §4d-compliance confirmation.

### 4e. The L5 state — carried forward UNCHANGED

`data/level-6/units.json` (the full `planeAffinity` table),
`abilities.json` (hypnotize light `successRate 0.8, minControlTurns 2,
maxControlTurns 3, reboundImmunityTurns 10`; recruit `successRate 0.25,
tier 2, cooldown 2`; venom-blast weak data-cap; combo components;
plane-switch / corner-cross), and all carried L4 state (Light-Switch
payload + its §9 AI-doctrine, plane-switch range-limit-now-full-by-
geometry) = `data/level-5/*`, **byte-identical**, **not** relitigated.
Under-Bed concealment is an L5 POST property (no L6 Bedroom — L6 has no
concealment POST; the L5 ability/affinity state nonetheless carries in
the unit/ability data unchanged).

**One-sentence statement of the L6 delta (the §3.4.3 "name what's new"
test):** _"Every stair landing now heals and hardens whoever holds it,
so the spiders won't sit on the top steps and wait you out — they come
down the terraces for you, and your answer is to fly or switch up the
planes and out-tempo them before the clock runs out."_ One room of
change; the single new high-cognitive mechanic is the POST-occupation
bonus.

---

## 5. Win-rate prediction for L6

**Predicted L6 ant win rate: ~55%** (band ~53–57%, within the §5 loose
tolerance and the mechanic-distribution plan §4 "~55%, the resumed
descent" requirement). **This is the RESUMED DESCENT — a clean monotone
~10pp drop below L5's measured ~66% rebound, the hardest-but-fair point
of Tier 1's first half, separated below L5 and above the L7 ~64
continuation.**

Derivation, anchored to the L5 arbitration's ruled landing (L5 ~65–66%,
the licensed rebound, itself anchored to the measured-L4 ~60 and
measured-L3 67):

1. **Start: L5 ~66% ant** (the L5 ruled rebound landing — the curve
   step is measured _down_ from ~66%). Monotone descent is measured
   against ~66%.
2. **POST-occupation economy pressure → spider AI sorties (the resumed
   descent's ENGINE): −8 to −10pp ant.** The dominant single L6 driver.
   A turtling spider in this `eradicate` + ant-loss-timeout room is the
   ~75%+ turkey-shoot the §3.G ruling exists to prevent (ant grinds
   static garrisons, beats the clock). The §3.2 per-turn
   `healingRate:3` + `defensiveBonus:3` economy makes the spider AI's
   optimizer compute that turtling two start-landings while the ant
   accumulates three is _losing the attrition race_, so it **sorties
   down the terraces** (the §3.1.2 ruled invariant). A proactive
   sortieing spider in a no-score, kill-everything room _is_ the ~55%
   scenario — this swing **must register** (the spider's upheld ask;
   it is the engine, not a behavior tweak). §4d-robust: an occupation
   economy both optimizers weigh, not a `wall` gradient the AI ignores.
3. **Flyer / full-coverage plane-switch tempo route (the dip's
   CEILING): +3 to +5pp ant.** The ant's answer in the same room.
   With the spider sortieing in a timeout-loss room, a ground ant
   grinding the step gaps loses the race; flying the ceiling lane or
   plane-switching up (full coverage, §3.I) reaches/contests the upper
   landings fast enough to win the post-occupation attrition race.
   Budgeted _against_ the engine so the net is the controlled ~55%,
   not an unwinnable sub-50% wall (the §6.2 no-answer feel-bad).
4. **`eradicate` + ant-loss-on-timeout: structural tax, ~0pp _new_**
   (already priced into the ~55% as the reason L6 is the hardest room;
   it is the structure the engine §2/§3.3 makes the sortie matter
   _within_, not a separable −pp).
5. **No plane-affinity contribution: 0pp (§4d).** Carried byte-
   identical; empirically inert; **not budgeted**.

**Net: ~66% − (8 to 10) + (3 to 5) ≈ ~53–57%, settling to ~55%**, with
the within-scenario loop tuning the spider-AI sortie aggression
threshold / timing (the §3.1.2 latitude) and the Step-Landing
`healingRate`/`defensiveBonus` magnitudes (the §3.2 ruled `3/3`
midpoint is loop-tunable inside the band — but the **shape** [economy
pressure + sortie invariant], the **direction**, and the
**no-plane-affinity / no-combat-sit-buff** rulings are ruled
invariants, not free knobs) toward the ~55% target.

**Why this reads as the RESUMED DESCENT — the hardest-but-fair point,
monotone L5→L6, separated (the binding §5 requirement):**

- **Strictly BELOW L5.** ~66% → ~55% is an unambiguous ~10pp drop —
  the curve _resumes descending_ after L5's rebound. This is the
  binding monotone resumed-descent segment (L4→L5 was the licensed
  non-monotone rebound; **L5→L6 is monotone-down by design** —
  roadmap §5 "L6 55% — the hardest-but-fair point";
  mechanic-distribution plan §4 "L6 ~55% — POST-occupation combat bonus
  - plane-switch full + vertical geometry"). The drop is _shaped_ (the
    spider becoming a proactive threat, the user's licensed "hard level
    before the end"), not a flat step and not a cliff.
- **The descent is delivered BY THE ENEMY BECOMING A PROACTIVE THREAT,
  not by a passive stat and not as a turkey-shoot.** The ~10pp drop is
  _entirely_ the spider AI sortieing off its start-landings (driven by
  the §3.2 economy its optimizer reads), with the flyer/plane-switch
  tempo route as the legible, earned answer in the same room. The ant
  gets **no** stat nerf and the spider gets **no** free combat sit-buff
  (the §4d trap, rejected); no plane-affinity moves (§4d). This is the
  §5 "the enemy got more dangerous" reading and the §6.2 "the player
  has the better tool to answer the escalated enemy, and the net is the
  hardest-but-fair point" closure — **not** the boring-but-balanced
  static turtle-farm and **not** the L4-§9 falsification (a ruled value
  the frozen AIs never exercise) repeated a third time.
- **Separated below L5 ~66 and above the L7 ~64 continuation.** L7
  (Living Room) rebounds to ~64 (mechanic-distribution plan §4 — cards
  rebound). ~66 (L5) → ~55 (L6) → ~64 (L7) is the intended shape: the
  rebound, the hardest-but-fair resumed-descent low, the next rebound.
  Had the post-occupation pressure been tuned to a behavior-flavor ~0
  (a static buffed turtle), L6 would land ~70–75% (the turkey-shoot),
  erasing the dip and collapsing the back-half curve. Had the flyer
  ceiling been over-priced, L6 would land ~59%+, crowding the L5→L6
  separation. The §3.1 engine / §3.4 ceiling structure is the knob
  that holds the dip at a _separated_ ~55%, the hardest-but-fair point.

---

## 6. Interest claim

**The L6 delta makes the spec's defender finally become the hunter —
the spiders come _down the terraces for you_ — and the answer is tempo
and verticality, not grinding; the resumed descent is earned by the
enemy becoming proactive at the room the spec built for proactivity.**

The Level PA built the Stairs as the format-break partner to L2
(level-progression-plan §2 L6): five terraced bands, step-gap chokes
funneling non-flyers, a ceiling flyer lane, `eradicate` with no POST
to capture and no score escape. For five rooms the spider has been the
faction that holds and reacts; roadmap §4.3.2 built the Stairs for the
spider to _move_. Before this delta, that promise is empty: the
fortress AI squats its start-landings, the ant grinds the gauntlet at
leisure, L6 is a ~75% turkey-shoot — the boring-but-balanced failure,
and (per §4d / the L4-§9 precedent) exactly what a passive combat
sit-buff would _cement_. The POST-occupation economy pressure is the
smallest possible change that makes the spec's promise the AI's actual
behavior: every landing heals and hardens whoever holds it, so the
spider's own optimizer computes that turtling loses the attrition race
in a kill-everything-before-the-clock room, and it **comes down the
terraces for the ant**. That is the curve resuming its descent because
the _enemy got more dangerous_ — the interesting reason, the user's
explicitly-licensed "hard level before the end," not a stat dip and not
a turkey-shoot. And the ant is not left without an answer: the
flyer/plane-switch full-coverage tempo route (§3.I banked to _exactly_
here) is the legible, earned answer _in the same room_ — out-reach the
sortieing defender via the air, don't out-grind it through the step
gaps. Escalation (the proactive sortieing spider + the ant-loss clock)
_with an answer_ (tempo and verticality), debuting _together by design_
— the §3.D / L4-§3.2 / L5-§3.2 doctrine, applied a fourth time, with
the §4d lesson now binding (the dip is carried by the lever the AIs
_actually exercise_, not the one they ignore). Both factions' interest
goals are served; neither is denied — only sequenced into one room: the
spider's first scenario as the proactive hunter the spec always
promised, and the ant's first scenario where the answer is the air.

---

## 7. Termination record

**Termination basis: §6.2 condition 1 — the Gameplay PA's standing
discretionary cutoff authority ("cut off sub-agent debate when it has
heard enough"), invoked after the opening + one rebuttal per faction
(2 debate documents — `l6-ant-advocate.md`, `l6-spider-advocate.md`,
each opening + ≥1 rebuttal; equivalently 2 exchanges of the 6-exchange
cap; the automatic 6-exchange stop did NOT fire — terminated early by
discretion, consistent with the mechanic-distribution plan §1 and the
L3 §7 / L4 §7 / L5 §7 precedents).**

- **§6.2 automatic stop A (both fun-critic AND interest-critic ≥75/100
  on a frozen proposal):** _Not yet fired_ — critic eval runs in the
  within-scenario loop on the implemented L6 data, downstream of this
  arbitration; there is no frozen scored proposal at debate time. Per
  §6.2 and the L3/L4/L5 precedent, this does not block arbitration; it
  is a Phase-D loop gate, recorded as the L6 ship-gate below.
- **§6.2 automatic stop B (6 exchanges):** _Not fired_ — only 2
  exchanges occurred (opening + rebuttal per faction).
- **Discretionary cutoff (invoked):** The debate converged to (1) a
  set of **pre-ruled / §4d-directed placements both factions
  explicitly ratified** (POST-occupation bonus live at exactly L6
  §3.G; plane-switch full corner coverage §3.I; `eradicate` +
  ant-loss-timeout the Level-owned structure; no plane-affinity delta
  §4d — none genuinely contested, ratifications), and (2) a **single
  specification-shape question on which both factions independently
  converged** — the POST-occupation bonus as a per-turn economy/score
  pressure the spider AI exercises (sortie invariant), _not_ a passive
  combat sit-buff (the §4d trap / L4-§9 falsification structure). Both
  factions' best case is fully on record on every dimension; both
  independently derived the §4d-compliant specification (the ant from
  the no-turkey-shoot side, the spider from the no-static-farm side).
  The only residual is pricing (engine vs ceiling pp-split) the
  §3.4.4 curve arbiter resolves objectively. A third exchange would
  only restate the pp-arithmetic the curve already resolves. The §6.2
  format's value ("adversarial NL surfaces considerations neither
  generates alone") was fully realized — the exchange produced the
  decisive frame (the POST-occupation bonus as an _AI-exercised
  economy pressure that makes the spider's own optimizer sortie_, the
  §4d trap / L4-§9 precedent applied a third time, the flyer route as
  the dip's _ceiling_ not its neutralizer) that neither opening alone
  contained. Per roadmap §6.2 the Gameplay PA "cuts off sub-agent
  debate when it has heard enough"; that threshold is met.
  **Terminate; arbitrate now.** No point is genuinely unresolvable.

**L6 ship-gate (handed to the Phase-D within-scenario loop — MEASURABLE,
per the L4-§9 falsification precedent the brief mandates):** implement
the §4 data delta + the §3.1.2 / §4a binding spider-AI sortie doctrine;
run the loop to fun-critic + interest-critic; **the L6 data ships when
BOTH conditions hold:**

1. **Both critics ≥75/100** on the measured L6 config (§6.2 automatic
   stop A, evaluated where it belongs — on the built scenario), **AND**
2. **The measured ant win-rate lands in the ~53–57% band on the
   deterministic seeds-1..100 sweep** (the `baseline-l6` vs `spider-l6`
   orchestrator sweep, the §9.1/L4 falsification method as the
   acceptance test), **reading as the resumed descent below the
   measured L5 ~66% and above the L7 ~64 continuation.**

The resumed-descent monotone requirement (L5 ~66 → L6 ~53–57) is a
**binding ship-gate**: per the L4-§9 falsification precedent, **a built
L6 that does NOT measure in the ~53–57% band reopens this arbitration**
under the §7 "ruled values are not free knobs — any change reopens"
clause. The specific L4-§9 failure mode is the named acceptance risk
here: if the spider AI does **not** in fact sortie (the §3.1.2 invariant
fails to fire under the fielded AI), the post-occupation bonus
degenerates to a static turtle-buff and L6 measures ~70–75% (the
turkey-shoot / the L4-§9 "frozen AI ignores the ruled lever"
falsification, a third time) — that explicitly reopens, with the
§3.G-logged proactivity-only contingency and the §4a Level-PA
landing-placement recommendation as the corrective levers. The loop's
tuning latitude is the spider-AI sortie aggression threshold/timing
(§3.1.2) and the Step-Landing `healingRate`/`defensiveBonus` magnitudes
(the §3.2 `3/3` midpoint, tunable inside the band). The **ruled
invariants** (not free knobs — any change reopens): the §4a payload
_shape_ (economy/heal pressure, not a combat sit-buff), the §3.1.2
spider-sortie _existence_, the §3.4 flyer/plane-switch ceiling, the
§3.5/§4d **no-plane-affinity-delta**, and the carried-forward L5 state
byte-identity. **Note the §4c/§4d carried-forward cross-level
context:** L6 is `eradicate` (no score path, §4c — the `capture-post`
low-`drama` score-grind signature does NOT apply here; L6 is
decisive-or-timeout-loss); per the recorded human decisions, plane-
affinity inertness (§4d) and any feel signatures are tracked
cross-level (the deferred UX/feel pass), **not** chased per-level — do
not retune L6 mechanics for `drama` or re-introduce plane-affinity as a
lever if win-rate, the ~55% resumed descent, and the L5→L6→L7 shape
hold.

---

## 8. Summary of the verdict

| Dimension                         | Ruling                                                                                                                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanic                          | L6 Stairs delta vs L5 (data-only; existing `postSchema` fields + already-implemented `eradicate`/ant-loss-timeout PR #10; AI-config via the within-loop; no engine — §4b)                                                                                                                |
| L5 state carried forward          | `planeAffinity` (incl. spider combat `wall {1,1}`), hypnotize cap, recruit-as-order, venom-blast/combo/Light-Switch carry, the L4 carry — **byte-identical**, not relitigated                                                                                                            |
| **POST-occupation bonus (FINAL)** | **`defensiveBonus: 3` + `healingRate: 3` on every one of the 5 Step-Landing POSTs** — a per-turn occupation **economy/heal pressure** (NOT a combat sit-buff — the §4d trap, REJECTED), symmetric in data, asymmetric by the `eradicate`/timeout structure. The single new mechanic.     |
| **Binding spider-AI doctrine**    | The within-loop spider AI **MUST** read the held-landing economy and **sortie off its start-landings to contest** (the §4d/L4-§9-compliant mechanism). Sortie _existence_ = ruled invariant; aggression threshold/timing = loop-tunable. (§3.1.2)                                        |
| `eradicate` + ant-loss-on-timeout | Carried-in Level-owned victory structure; **no score path (§4c)** — the bonus is a pure attrition/tempo economy whose job is making the spider sortie so the timeout clock has teeth; double-counting as a combat subsidy **rejected** (§3.3)                                            |
| Plane-switch full corner coverage | **Ratified (pre-ruled §3.I); NO data/ability change** — realized by the Level PA's L6 vertical geometry giving the switch full terrace reach; binding cross-check if the geometry doesn't deliver it (§3.4/§4b)                                                                          |
| Flyer-favored framing             | The flyer/plane-switch tempo route is the **fairness mechanism / budgeted ceiling** (+3 to +5pp ant) that holds the dip at hardest-but-fair ~55% — NOT a subsidy floating L6 back toward L5 66 (§3.4)                                                                                    |
| **No plane-affinity delta**       | **EXPLICITLY CONFIRMED — carried from L5 BYTE-IDENTICAL, NOT budgeted as a curve mover (§4d-directed, §3.5).** The L6 ~10pp descent is carried entirely by AI-exercised levers (the post-occupation economy + sortie, vertical geometry, plane-switch tempo, the eradicate/timeout tax). |
| Favors                            | Net **spider** (the licensed ~55% resumed descent, the hardest-but-fair point); the spider's proactive sortie is the engine, the ant's flyer/switch tempo route is the budgeted ceiling                                                                                                  |
| L6 win-rate prediction            | **~55%** (band ~53–57%); the **RESUMED DESCENT** — clean monotone ~10pp drop below measured L5 ~66, the hardest-but-fair point, separated below L5 and above the L7 ~64 continuation                                                                                                     |
| Interest claim                    | The spec's defender becomes the proactive hunter (the spiders come down the terraces); the answer is tempo/verticality not grinding; the dip is earned by the enemy becoming proactive at the room built for it — escalation + answer debut together                                     |
| Termination                       | §6.2 discretionary cutoff after 2 exchanges (2 debate docs); auto-stops A/B not fired; **measurable ship-gate** = both critics ≥75 **AND** measured ~53–57% on seeds 1..100, reading as the resumed descent below L5; a built L6 outside the band reopens per the L4-§9 precedent        |
