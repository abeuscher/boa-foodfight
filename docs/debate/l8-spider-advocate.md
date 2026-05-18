# Spider Faction Sub-Agent — L8 Attic Mechanic Delta (Opening + Rebuttal)

**Debate:** L8 (Attic) mechanic delta vs **merged L6**, per roadmap §6.2.
**Author:** Spider Faction Sub-Agent (advocate, not arbiter).
**Advocate for:** the SPIDER experience, mechanical identity, and the
enemy-AI's job of providing escalating challenge.
**Scope:** the L8 delta only — (a) the **`recruit-count` victory
target/economy tuning** (the §4f-compliant, AI-exercised curve lever);
(b) **hypnotize FULL-power restore** — the spider's designed L8 climax,
the exact params reverting the L5 cap; (c) **tiered MP debut** —
concrete data-expressible params; (d) **no plane-affinity delta** (§4d)
and **no card-economy curve reliance** (§4f). The merged-L6 state
carries forward **unchanged** and is **not relitigated**.
**Builds on (does not repeat):** `l6-spider-advocate.md`
(the-payoff-must-register through-line; "weak/capped must not be tuned
to absent"), `l5-spider-advocate.md`, `l4-spider-advocate.md`
(favored-side-payoff-sequencing), `docs/debate/l6-gameplay-pa-arbitration.md`
(the merged-L6 baseline this deltas FROM),
`docs/debate/l5-gameplay-pa-arbitration.md` §3.3/§4c (the
hypnotize-light cap restored here — the L5-ruled values cited),
mechanic-distribution plan §3.H (hypnotize light L5 → **full power L8**,
the designed climax), §2 (the L8 row), §4 (win-curve: L8 ~50%, "the
hard level before the end").
**Binding constraints honored:** §3.1 hard floors, §3.4
cumulative-addition, §5 curve (L8 ≈ 50–56% — the continued decisive
descent below L6 56 toward the L10 ~50 climax; **L7 PARKED, a known
gap, NOT interpolated**), §6.3 ownership (Gameplay-owned; the cramped
box-maze geometry, 6 POST placements, ~8 cockroach-spawn _positions_,
the one-way Skylight node are the Level PA's, not designed here),
level-progression-plan §4b (engine FROZEN — `recruit-count` + dual loss
PR #11, one-way transit PR #14, tiered-MP machinery live Round 21;
data/AI-config only), §4c (no score path — `recruit-count` is
mission-decisive), **§4d (plane-affinity inert — not budgeted as the
L8 curve mover)**, **§4e (occupation-`healingRate` economy inert
outside forced co-occupation)**, **§4f (the card economy CANNOT be the
L8 curve lever under the locked card-host heuristic)**.

---

## 1. Natural-language argument — opening

### L8 is the spider's climax — the hypnotize payoff the whole campaign has been building toward

My round-1 through-line stands across the campaign: the curve must
close because the _enemy got more dangerous_, not because the player
out-leveled a statue (§6.2, boring-but-balanced). L4 was the
randomization-shock spike; L5 was the rebound where the ant got
info-denial _and_ I collected my banked durability debt and **debuted
hypnotize, deliberately capped to learner-light** (`minControlTurns
5→2, maxControlTurns 10→3`, L5 §3.3/§4c — a cap I accepted on the
explicit, on-record promise that "L8 restores hypnotize toward full
power as its designed climax"). L6 was the resumed descent where my
defender finally became the proactive hunter. **L8 is the scenario the
whole hypnotize arc was sequenced toward** — roadmap §4.3.3, the Attic,
cockroach recruit-or-die, "spider AI prioritizes hypnotize over
offensive moves," "hypnotized cockroaches charge the ant queen."
Roadmap §5 and mechanic-distribution plan §4 price it at ~50%: "the
hard level before the end," the user's explicitly licensed spike. This
is _my_ climax. The curve drops here because the mechanic the player
met capped at L5 returns at full, weaponized turn against its owner.
I am not here to relitigate the dip — I am here to make sure it is
_delivered by the hypnotize restore being genuinely full power_, not by
a number quietly re-capped, the way §4d just buried plane-affinity and
§4f just buried the card economy.

### The hypnotize full-power restore is my non-negotiable payoff — and it must be the GENUINE pre-L5 original

The L5 arbitration is unambiguous about what was capped and what the
restore is. L5 §2 cites the carried-in baseline:
`hypnotize {successRate 0.8, minControlTurns 5, maxControlTurns 10,
reboundImmunityTurns 10}`. L5 §3.3/§4c capped it to
`minControlTurns 5 → 2, maxControlTurns 10 → 3` with `successRate 0.8`
and `reboundImmunityTurns 10` **explicitly unchanged** (the L5 ruling:
"the gate is identity/cost, not strength"). The forward-consistency
clause is on record: "L8 restores hypnotize toward full power
(`minControlTurns 5 / maxControlTurns 10`)." **The L8 restore is the
exact pre-L5 original: `minControlTurns: 5, maxControlTurns: 10`,
`successRate 0.8` unchanged, `reboundImmunityTurns 10` unchanged.** I
hold the arbiter to the symmetric reading the L5 ruling itself
established: the cap touched _only_ duration, so the restore reverts
_only_ duration — not a partial restore to `maxControlTurns 6` or some
arbiter-invented middle. "Capped ≠ absent" was my L5 through-line; its
inverse is **"full ≠ partial."** A 5–10-turn seizure is the climax the
arc was built for; a 5-or-6-turn half-restore is the §4d/§4f failure
applied to my owed payoff — the promised escalation tuned quietly down,
exactly the boring-but-balanced failure I have fought since L3.

This is a recruit-or-die room (§4.3.3): the spider AI prioritizes
hypnotize over offense and the hypnotized cockroaches charge the ant
queen. A genuinely full-power hypnotize is what makes that promise
real: a 5–10-turn seizure of a recruited cockroach party is long enough
to march it across the cramped attic and into the queen. That is the
spider's L8 identity delivered by the mechanic itself, exactly as the
randomization shock made L4 the spider's and the `eradicate` clock made
L6's.

### `recruit-count` + dual-loss is the spec handing me the recruit-race — and that is the structural reason L8 is hard

I want this on the record because it is the spine of the spider's L8
identity, and §4f points me _toward_ it, not away. The engine
(`end-of-turn.ts:538-548`, verified): `recruit-count` — the ant wins
iff `recruitedPartyCount(state, "cockroach") >= target`; the ant loses
if the queen dies OR no living recruiter (mage) remains. There is no
score path (level-progression-plan §4c — `recruit-count` is
mission-decisive). This is the spec (§4.3.3) handing me the race: my
job is to flip the cockroaches before the ant recruits them, and to
weaponize the flipped ones against the queen, all before the clock. §4f
is explicit that mission scenarios (L6, L8) "force decisive play and do
not exhibit the §4c grind or the card-host trap … prefer their
structurally-robust levers." The recruit-race IS my structurally-robust
lever — it is the win condition, every AI on the board acts on it, it
cannot measure inert the way cards (§4f) or plane-affinity (§4d) or a
`healingRate` co-occupation economy (§4e) do. I lean on this so the
arbiter prices the hypnotize restore correctly: the full-power
hypnotize is not a free-floating combat buff — it is the _tool by which
the spider AI contests the race_ (flip the prize neutral, deny the ant
its recruit, send it at the queen). The recruit-race structure is what
makes the restore _matter_.

### Tiered MP — concede the bound, but it must not gut the climax to a single throwaway cast

I concede tiered MP debuts at L8 (mechanic-distribution plan §2) and I
concede the engine machinery is frozen and live (Round 21,
`engine/mp-tiers.ts`: `INITIAL_MP_SLOTS {tier1:4, tier2:2, tier3:1}`,
hardcoded; `hypnotize` is tier-3, `recruit` tier-2; caster-eligibility
`intelligence>=5`/`'caster'` tag, both data fields). I concede the
data delta makes the pool _bind_ for the first time. My position: the
tier-3 single-slot pool is the ant's _answer in the same room_ to the
full-power restore — the §3.D / L4-§3.2 / L5 / L6 escalation-with-an-
answer doctrine, applied symmetrically once more, and I do not begrudge
it. What I insist on is that the bound be priced as the _answer that
holds the dip at ~50%_, **not** as an over-constraint that guts the
spider's owed climax to a single inconsequential cast. One tier-3 slot
per caster is correct _if_ the restore is genuinely full-power
(5–10 turns) and _if_ the spider roster fields enough hypnotize-capable
casters that the AI gets a meaningful number of decisive seizures across
the scenario — not "one 5-turn hypnotize for the entire spider army,
ever." The bound is the ant's answer; it must not be tuned into the
quiet re-cap of my payoff that §4d/§4f are the proof would otherwise
happen. The caster count and the per-caster pool together must deliver
a hypnotize threat that _registers as the engine of the ~50% dip_, not
a behavior-flavor zero.

### No plane-affinity delta, no card reliance — correct, and the lesson cuts for me too

Per §4d I do not ask for any plane-affinity change at L8; the L6 state
(spider combat `wall +1/+1`, full corner coverage) carries forward
byte-identical. Per §4f I do **not** ask for any spider curve movement
built on the card economy — §4f's root-cause finding is decisive: the
card market is hosted on the immobile queen-guard running the
gate-29-locked heuristic; cards land on the queen-guard/self, never the
assault, so it cannot convert to a win-rate swing. I accept both fully.
§4d's and §4f's measurements are unambiguous: a lever the locked AIs do
not exercise measures inert (plane-affinity ~0pp; the card economy a
structural [62,66] dead zone). I will not ask the arbiter to budget
either as the L8 mover and then watch it measure inert like L5's
plane-affinity and parked-L7's cards did. L8's descent must be carried
by the lever the AIs _do_ exercise — the `recruit-count` race driven by
the full-power hypnotize — plus the Level-owned cramped geometry and
the mission victory structure. That is where my identity is delivered
at L8: the hypnotize climax weaponizing the race, not a stat gradient
and not a card market.

### Why this serves the spider fantasy (interest)

L8 is the scenario the whole hypnotize arc was sequenced for. For the
player, hypnotize has been a known, capped nuisance since L5 — a
short, recoverable seizure of a neutral. At L8 it returns at full
power, in the room built for it (§4.3.3): the spider doesn't just
control a neutral, it flips the very cockroaches the ant is desperately
racing to recruit and marches them into the ant queen. That is the
curve's continued descent because the _enemy got more dangerous in a
way the player can see coming and still finds terrifying_ — the
mechanic you learned to play around at L5, turned to eleven at its
designed climax, the user's explicitly licensed "hard level before the
end." A hypnotize quietly re-capped to half its original duration is
the boring-but-balanced failure inverted onto the spider's _owed_
climax — and §4d/§4f are the proof that a payoff the locked systems
under-deliver measures inert. The recruit-race structure is what makes
the climax land; the full-power restore is what makes it the climax.

---

## 2. Natural-language rebuttal — answering the ant's L8 brief

The ant's brief is disciplined: it concedes every placement, ratifies
the carried-forward merged-L6 state, accepts §4d/§4e/§4f, and concedes
the hypnotize full-power restore is the designed climax. It contests
the _specification shape_: the `recruit-count` race tuning as the
load-bearing §4f-compliant lever, hypnotize restored to the exact
pre-L5 originals but _bounded by the tier-3 MP pool_, and tiered MP as
a real constraint. I largely **converge**, with two corrections.

**First — I agree, emphatically, that the `recruit-count` race tuning
is the load-bearing §4f-compliant curve lever. This is convergence, not
dispute.** The ant arrived at the structurally-robust mission lever
from the no-cold-stomp side; I arrive at the _identical_ one from the
my-payoff-must-actually-fire side, because §4f is brutal and correct:
the card economy cannot convert under the locked card-host heuristic
(parked-L7 proved it across four falsifications), and a hypnotize
"payoff" hung on an inert delivery system is the §4d/§4f dead letter on
_my_ owed climax. We agree: the delta budget is spent on the
`recruit-count` race — `victoryCondition.target`, `recruit`
`successRate`/`cooldown`, the ~8 cockroach-spawn count, the
mage-recruiter survivability gate — because that is the win condition
every AI exercises every turn. Where I correct the ant's framing: the
ant prices the hypnotize restore as "the escalation" but frames it as
subordinate to the race tuning, a thing to be _bounded_ first. It is
not subordinate; it is the **engine of the licensed ~50% dip and must
register as such**. The L5/L6-precedent logic applies exactly: L5 ruled
the banked plane-affinity must _register_ (−2 to −3pp, not tuned to
~0); L6 ruled the post-occupation pressure must _register_ as the
−8/−10pp engine, not a behavior tweak. Here the inverse cap-removal:
the hypnotize full-power restore must register as the dominant L8
driver — a felt **−5 to −7pp ant** vs the L6 anchor — or L8 does not
descend below L6 56; it stays an L6-class number, the recruit-race a
formality. We agree the race is the §4f-robust _lever_; I insist the
arbiter price the full-power hypnotize as the _dominant force acting
through_ that lever, not a thing tuned near zero by an over-eager MP
bound. "Hypnotize returns at full power" is a ~6pp statement, not a
flavor note.

**Second — on tiered MP, we converge it is the answer-in-the-room; I
contest "the bound" if it means a single throwaway cast.** The ant is
right that an uncapped `uses:null` full-power hypnotize is the §4.3.3
cold-stomp and that _some_ bound is the §3.D escalation-with-an-answer
the arbiter has ruled at every level. I concede that entirely — I
argued the same structure for L6's flyer-ceiling and L5's affinity-
ceiling. Where I correct: the ant prices the tier-3 single-slot pool as
the flat bound that "makes the restore survivable," implying one cast
total. Run that against the recruit-race math: the attic spawns ~8
cockroach neutrals; if the _entire_ spider force gets one 5-turn
hypnotize across the whole scenario, the ant out-recruits trivially and
L8 floats back above L6 56 — the dip erased, the climax a non-event,
exactly the quiet re-cap §4d/§4f warn of. The arithmetic only lands the
ruled hardest-but-fair ~50% if the full-power restore is the **engine**
(−5 to −7pp, dominant — genuinely 5–10 turns, fired by _enough_
hypnotize-capable casters that the AI gets multiple decisive seizures
across the scenario, the per-caster tier-3 slot bounding _each caster_,
not the whole army) and the tier-3 pool + target tuning is its
**ceiling** (the budgeted counter that keeps it from overshooting into
a sub-40% cold-stomp wall, sized so the _net_ is the controlled ~50%,
not a ~57% that erases the L6→L8 descent). "Answer in the room" yes;
"one inconsequential cast that neutralizes the climax" no — the MP
bound is the fairness _ceiling_ on a dip the hypnotize restore _owns_,
exactly the L4 Light-Switch / L5 plane-affinity / L6 flyer ceiling
logic. We agree on the structure; I insist the full-power hypnotize is
the dominant driver and the per-caster MP bound + target is the
budgeted ceiling, net the licensed ~50%, separated below L6 56 and
above the L10 ~50 finale (the L7 gap parked, not interpolated).

**Third — `recruit-count` + dual-loss, no plane-affinity (§4d), no card
reliance (§4f): fully conceded, no contest.** The ant calls the mission
structure the spider's structural tax already priced into the dip and
warns against double-counting it. I concede entirely — I never asked
for a stacked combat subsidy; my opening priced the mission structure
as the reason the _hypnotize matters_, not a separable edge. The
no-plane-affinity §4d and no-card §4f rulings I ratify without
relitigation — the lesson cuts for me too, and I will not have my
climax hung on an inert system. I contest only that the full-power
hypnotize restore's ruled −5 to −7pp swing actually _registers_ as the
dominant driver and is not tuned toward a behavior-flavor zero by an
over-constrained MP bound or a too-low recruit target.

Net: I concede every placement (all ruled — hypnotize full power at L8
§3.H, tiered MP at L8 §2, score-tiebreaker-everywhere from L8, Skylight
one-way Level-owned; no plane-affinity §4d; no card reliance §4f).
I ratify the carried-forward merged-L6 state byte-identical. I
**converge** with the ant: the `recruit-count` race tuning is the
load-bearing §4f-compliant lever and the delta budget belongs there;
hypnotize is restored to the exact pre-L5 originals
(`minControlTurns:5, maxControlTurns:10`; successRate / rebound
unchanged) and bounded by the per-caster tier-3 MP slot. The residual
is pricing, which the curve resolves objectively: the full-power
hypnotize restore is the **dominant engine** of the licensed ~50% dip
(−5 to −7pp, must register, not a behavior tweak, fired by enough
casters to matter); the per-caster tier-3 MP bound + the recruit-target
tuning is its budgeted **ceiling** (the answer that holds the dip at
hardest-but-fair ~50–52%, not an over-constraint that erases the climax
and floats L8 back above L6 56).

---

## 3. Structured summary

### Position

The L8 delta vs **merged L6** carries the L6 state forward
**byte-identical** (no plane-affinity §4d; no card reliance §4f; no
`healingRate` occupation economy §4e) and adds: (1) the
**`recruit-count` victory target/economy tuning** as the load-bearing
§4f-compliant, AI-exercised curve lever (`victoryCondition.target`,
`recruit` `successRate`/`cooldown`, ~8 cockroach-spawn count, the
mage-recruiter survivability gate — the win condition every AI acts
on); (2) **hypnotize FULL-power restore** to the exact pre-L5 originals
(`minControlTurns 2→5`, `maxControlTurns 3→10`; `successRate 0.8` and
`reboundImmunityTurns 10` unchanged — the §3.H designed climax, the
dominant engine of the dip); (3) **tiered MP debut** as a real
constraint (ability `tier` + caster-eligibility data + per-ability
`uses`; engine `INITIAL_MP_SLOTS {4,2,1}` frozen) — the per-caster
tier-3 slot is the ant's answer-ceiling that bounds (does not gut) the
restore; within the Level-owned cramped box-maze, 6 POSTs, one-way
Skylight.

### Faction impact

L8 is the scenario the hypnotize arc was sequenced for (§4.3.3): the
mechanic the player met capped at L5 returns at full power and
weaponizes the cockroaches the ant is racing for, against the queen.
The `recruit-count` race is the §4f-robust structure the climax acts
through — the win condition both AIs exercise, not an inert card/stat
delivery. The dual-loss (queen dead OR mages dead) is the structural
tax that makes the hypnotize matter. The per-caster tier-3 MP bound is
the ant's answer in the same room. Specified with a genuine full-power
restore the dip is the spider's owed climax; specified with a quiet
half-restore or a one-cast MP gut it is the §4d/§4f dead letter on the
spider's payoff.

### Win-rate prediction

L6 ~56% (the merged-L6 ruled anchor; L6 arbitration band 53–57 at its
upper edge for the monotone-down reasoning). **L7 is PARKED — a known
curve gap, NOT interpolated.** L8 **continues the decisive descent to
~50–52%** — the licensed monotone drop below L6, "the hard level before
the end," separated above the L10 ~50 finale. The full-power hypnotize
restore is the **dominant engine**: **−5 to −7pp ant** vs the L6 anchor
(genuinely 5–10-turn seizures, fired by enough casters to register —
this _is_ the continued descent and must register, not be tuned to a
behavior-flavor zero). The per-caster tier-3 MP bound + recruit-target
tuning is the budgeted **ceiling**: holds the dip at hardest-but-fair
~50–52% rather than overshooting into a sub-40% cold-stomp wall.
`recruit-count` + dual-loss is the structural tax, already priced in.
**No plane-affinity contribution (§4d: ~0pp, not budgeted). No card
contribution (§4f: inert, not budgeted).** Net ~56% − (5 to 7) +
(bounded by the MP/target ceiling) ≈ **~50–52%**, the continued
decisive descent, monotone below L6 56, separated above L10 ~50, L7 a
parked gap.

### Interest claim

L8 is the hypnotize climax: a known, capped nuisance since L5 returns
at full power in the room built for it (§4.3.3), flipping the prize
cockroaches into the ant queen. The curve continues its descent because
the _enemy got more dangerous in a way the player saw coming and still
fears_ — the user's licensed "hard level before the end," difficulty
_visible_ (your roaches turned against you), the answer _structural_
(out-recruit, screen the queen, exploit the spider's one-big-cast MP
ceiling). A quietly half-restored hypnotize is the boring-but-balanced
failure inverted onto the spider's owed climax — §4d/§4f are the proof
an under-delivered payoff measures inert.

### Convergence

All placements **conceded** (ruled: hypnotize full power at L8 §3.H;
tiered MP at L8 §2; score-tiebreaker-everywhere from L8; Skylight
one-way Level-owned; **no plane-affinity §4d; no card reliance §4f; no
`healingRate` occupation economy §4e**). Carried-forward merged-L6
state **ratified byte-identical**. `recruit-count`/dual-loss tax, §4d,
§4e, §4f **fully conceded** (ratification, not debate). **Converged
with the ant**: the `recruit-count` race tuning is the load-bearing
§4f-compliant lever; hypnotize is restored to the exact pre-L5
originals and bounded by the per-caster tier-3 MP slot. Residual is
pricing, which the curve resolves: the full-power hypnotize restore is
the **dominant engine** (−5 to −7pp, must register as the continued
descent, fired by enough casters to matter); the per-caster tier-3 MP
bound + recruit-target is its budgeted **ceiling** (holds ~50–52%, not
an over-constraint that erases the climax and floats L8 back above L6
56). Both sides' best case on record.
