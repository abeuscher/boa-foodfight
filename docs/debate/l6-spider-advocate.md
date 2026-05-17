# Spider Faction Sub-Agent — L6 Stairs Mechanic Delta (Opening + Rebuttal)

**Debate:** L6 (Stairs) mechanic delta vs L5, per roadmap §6.2.
**Author:** Spider Faction Sub-Agent (advocate, not arbiter).
**Advocate for:** the SPIDER experience, mechanical identity, and the
enemy-AI's job of providing escalating challenge.
**Scope:** the L6 delta only — (a) the **POST-occupation bonus**
becoming a live lever (ruled §3.G, mechanic-distribution plan §2 L6:
the "spiders don't turtle anymore" lever, declared **non-negotiable**
for L6 — _this is the spider's L6 payoff_); (b) `eradicate` victory +
ant-loss-on-timeout (Level-owned victory structure, engine-implemented
PR #10 — framed, not designed here); (c) plane-switch reaching **full
corner coverage** at L6 (the §3.I banking, pre-ruled — ratified, not
relitigated); (d) the flyer-favored combat/economy framing. **No
plane-affinity delta at L6** — carried from L5 byte-identical per
level-progression-plan §4d. The L5 state carries forward **unchanged**
and is **not relitigated**.
**Builds on (does not repeat):** `l4-spider-advocate.md`
(favored-side-payoff-sequencing; "weak must not be tuned to absent"),
`l5-spider-advocate.md` (the banked-callback-must-register through-line),
`docs/debate/l5-gameplay-pa-arbitration.md` (the L5 baseline),
mechanic-distribution plan §3.G (POST-occupation bonus → L6, exactly at
the floor), §3.I (plane-switch full corner coverage at L6), §5
(boundary cases — POST-occupation bonus is a combat/scoring payload on
an existing POST, Gameplay-owned, §5 case-shape #3).
**Binding constraints honored:** §3.1 hard floors, §3.4
cumulative-addition, §5 curve (L6 ≈ 55%, the resumed descent — the
hardest-but-fair point, monotone L5 66 → L6 ~55, below L5, above the
L7+ continuation), §6.3 ownership (Gameplay-owned; the terraced
geometry, step-gap funnel, ceiling flyer lane, and 5 Step-Landing POST
placements are the Level PA's, not designed here), level-progression-plan
§4b (engine FROZEN — `eradicate` + ant-loss-timeout implemented PR #10;
data/AI-config only), §4c (no score path — `eradicate` is
decisive-or-timeout-loss), **§4d (plane-affinity inert — not budgeted
as the L6 curve mover)**.

---

## 1. Natural-language argument — opening

### L6 is the spider's scenario — the room the spec built for the defender

My round-1 through-line stands across five rooms: the curve must close
because the _enemy got more dangerous_, not because the player
out-leveled a statue (§6.2, boring-but-balanced). L4 was the licensed
randomization-shock spike; L5 was the rebound where the ant got its
info-denial tool _and_ I collected my banked durability debt. **L6 is
the scenario the spec built for the defender** — roadmap §4.3.2, the
Stairs, total spider eradication, vertical traversal, "flying/climbing
units strongly favored," "turtling does nothing." Roadmap §5 and
mechanic-distribution plan §4 price it at ~55%: the resumed descent, a
clean ~10pp drop below L5 66, the hardest-but-fair point of the first
half — the user's explicitly licensed "hard level before the end."
This is _my_ room. The curve drops here because the spider, in the
room geometry favors it, finally becomes the proactive threat the spec
always promised. I do not relitigate the dip — I am here to make sure
it is _delivered by the spider being dangerous_, not by a number tuned
to zero like the plane-affinity §4d just buried.

### The POST-occupation bonus is my non-negotiable payoff — and §4d tells us exactly how to spec it so it actually fires

The mechanic-distribution plan §2 calls the POST-occupation bonus the
"spiders don't turtle anymore" lever and frames it **non-negotiable for
L6**. §3.G ruled it live at exactly L6 — spider on mechanism and floor,
ant on the no-earlier-leak guard. I am not relitigating placement; it
is ruled and mine. My job is the §5-ant brief's job inverted: defend
the _substance_ of the spider's L6 payoff so "the curve resumes
descending" does not get tuned into "the spider's promised proactive
threat evaporates so L6 is a fair-but-empty climb."

And here is where I _agree with the ant's §4d reasoning and turn it to
the spider's purpose_. §4d is brutal and correct: a ruled lever the
frozen AIs do not exercise measures ~0pp (plane-affinity) or +39pp
(the L4 Light-Switch) — never the ruled value. The fortress spider AI
(`buildFortressDefensePolicy`) _starts_ owning its upper Step-Landings
and, left alone, never moves. So a POST-occupation bonus specified as
"sit on the landing, get +attack" is the §4d trap from the _spider's_
side: the spider AI gets it free, never sorties, and the ruling's whole
point — "make spider turtling on start-POSTs strictly worse than
contesting" — is inverted into "turtling is now even better." That does
not serve the spider. A spider that turtles a buffed fortress while the
ant grinds up the gauntlet is a _static_ spider — the
boring-but-balanced failure, just with a bigger number. The spec's
spider _hunts_; it does not squat.

So I specify my own payoff as §4d demands: the POST-occupation bonus
must be a **per-turn economy/score pressure on occupied Step-Landings**
that the spider AI's evaluation function _reads_ and _acts on_ — a
recurring per-turn advantage (a `healingRate`-class regeneration plus a
score/economy accrual) to whoever holds the most contested landings, so
the spider's optimizer computes that **squatting its two start-landings
while the ant accumulates the other three is _losing the attrition
race_, and sorties down the terraces to contest the ant's held
ground.** That is the spider becoming proactive _by its own AI's
arithmetic_, not by a scripted aggression flag. It is the §4d-compliant
form, and it is _stronger_ for the spider than a sit-buff, because a
sortieing spider in a no-score, ant-loss-on-timeout room (the ant must
clear _every_ spider party before the clock) is the genuine ~55%
threat the curve prices. The bonus is mine; specified as economy
pressure it actually fires; specified as a combat sit-buff it is the
§4d dead letter.

### `eradicate` + ant-loss-on-timeout is the spec handing the defender the clock — and that is the structural reason L6 is hard

I want this on the record because it is the spine of the spider's L6
identity. The engine (`turn.ts:490–499`, verified): `eradicate` with
no winner at the turn cap → **spider wins**. There is no score path
(level-progression-plan §4c — `eradicate` is decisive-or-timeout-loss).
The ant must hunt down and kill _every_ spider party
(`allSpiderPartiesEliminated`, `end-of-turn.ts:444–452`) before the
clock; the spider wins by _surviving in dispersal_. This is the spec
(§4.3.2) handing the defender the clock — the offensive burden is
entirely the ant's. That structure _is_ the spider's L6 identity
delivered for free by the victory kind: the spider does not need a fat
combat buff to be the dangerous side here; the room's whole
construction makes it dangerous, exactly as the randomization shock
made L4 the spider's. I lean on this so the arbiter prices the
POST-occupation bonus correctly: it is not there to make the spider
win combats — it is there to make the spider _move_, so the timeout
clock has teeth. A turtling spider in a timeout-loss room is _still_ a
turkey-shoot (the ant grinds each static garrison and beats the clock).
A _sortieing_ spider in a timeout-loss room is the ~55% scenario. The
bonus's job is the sortie, and the timeout structure is what makes the
sortie matter.

### Flyer-favored — concede the terrain, but it is the ant's answer, not a spider nerf

The Level PA owns the geometry: terraced bands, step-gap chokes, a
ceiling flyer lane (level-progression-plan §2 L6). "Flying/climbing
strongly favored" (roadmap §4.3.2). I concede the terrain favors the
ant's reach, and I concede §3.I banks plane-switch full corner coverage
to exactly L6 — that is the ant's vertical answer order, ruled, I do
not relitigate it. My position: the flyer/plane-switch route is the
ant's _answer in the same room_ to the spider's proactive sortie — the
§3.D / L4-§3.2 / L5 escalation-with-an-answer doctrine applied
symmetrically once more. The escalation is the sortieing spider + the
ant-loss clock; the answer is the air. That is correct design and I do
not begrudge it. What I insist on is that the flyer route be priced as
the _answer that holds the dip at ~55%_, **not** as an over-tuned
subsidy that erases the spider's proactive threat and floats L6 back
toward L5's 66 — that would be the spider's promised L6 payoff tuned
away the way §4d just proved plane-affinity was, the worst version
because L6 is _owed_ to the defender by the spec.

### No plane-affinity delta — correct, and the lesson cuts for me too

Per §4d I do not ask for any plane-affinity change at L6; the L5 state
(spider combat `wall +1/+1`, full corner coverage) carries forward
byte-identical. I accept this fully. §4d's measurement is unambiguous:
my `wall` gradient is a latent identity layer that paints my spiders as
wall-climbers, not a curve lever the chain-march/fortress AIs ever
exercise. I will not ask the arbiter to budget it as the L6 mover and
then watch it measure ~0pp like L5's did. L6's ~10pp descent must be
carried by the lever the AIs _do_ exercise — the post-occupation
economy pressure that makes my own AI sortie — plus the Level-owned
vertical geometry and the timeout victory structure. That is where my
identity is delivered at L6: proactivity, not a stat gradient.

### Why this serves the spider fantasy (interest)

L6 is the scenario where the spec's defender finally becomes the
_hunter_ the spec always promised. For five rooms the spider has been
the faction that holds and reacts; the Stairs is built (§4.3.2) for the
spider to _move_ — no POST for the ant to capture and end it, a clock
that the ant alone races, a vertical maze where the spider's reach is
native and the ant's is borrowed (plane-switch, `uses:1`; flyers it has
to field). The POST-occupation economy pressure is the mechanism that
turns the spec's promise into the AI's actual behavior: the spider
computes that turtling loses the race and comes _down the terraces for
the ant_. That is the curve resuming its descent because the _enemy got
more dangerous_ — the interesting reason, the user's licensed "hard
level," not "the spider squats a buffed POST while the ant climbs
unopposed." A POST-occupation bonus tuned as a passive sit-buff the
fortress AI never acts on is the boring-but-balanced failure inverted
onto the spider's _owed_ payoff — and §4d is the proof that it would.

---

## 2. Natural-language rebuttal — answering the ant's L6 brief

The ant's brief is disciplined: it concedes every placement, ratifies
the carried-forward L5 state, accepts the §4d no-plane-affinity ruling,
and concedes the POST-occupation bonus is the L6 non-negotiable. It
contests one thing — the _specification shape_ of that bonus (economy/
score pressure the AI exercises, not a passive combat sit-buff) — and
prices the flyer route as the fairness mechanism. I largely **converge**,
with two corrections.

**First — I agree, emphatically, that the bonus must be economy/score
pressure the spider AI exercises, not a passive combat sit-buff. This
is convergence, not dispute.** The ant arrived at the §4d-compliant
specification from the ant's side; I arrived at the _identical_ one
from the spider's side, because a sit-buff makes my AI turtle harder
and squander L6 as a static farm — the boring-but-balanced failure I
have fought since L3. We agree: the payload is a per-turn advantage on
occupied Step-Landings (a `healingRate`-class regen + a score/economy
accrual) that the spider AI's optimizer reads and responds to by
sortieing off its start-landings to contest the ant's held ground.
Where I correct the ant's framing: the ant prices this as the lever
that "stops L6 being a turkey-shoot" — true — but frames it as
near-neutral for the spider, a mere behavior-flip. It is not neutral;
it is the **engine of the licensed ~55% dip and must register as such**.
The L5-precedent logic applies exactly: the L5 arbitration ruled the
banked plane-affinity must _register_ (−2 to −3pp, not tuned to ~0) or
the rebound runs uncontested. Here the inverse: the post-occupation
economy pressure must register as a felt **−8 to −10pp ant** (vs a
hypothetical turtling spider) or L6 does not descend to ~55% — it
stays the L5-class ~66% turtle-farm the ruling exists to prevent. We
agree on the §4d-compliant _shape_; I insist the arbiter price its
swing as the _dominant L6 driver that delivers the whole resumed
descent_, not a behavior tweak budgeted near zero. "Spiders don't
turtle anymore" is a ~10pp statement, not a flavor note.

**Second — on the flyer route, we converge it is the answer-in-the-room;
I contest "fairness mechanism" if it means it neutralizes the dip.**
The ant is right that the flyer/plane-switch tempo route is the ant's
answer to a proactive sortieing spider and that without _some_ answer
L6 is an unwinnable wall (the §6.2 feel-bad). I concede that entirely —
it is the §3.D escalation-with-an-answer doctrine, ruled, applied
symmetrically, and I argued the same structure for L5's surfacing
route. Where I correct: the ant prices the flyer route as a **+3 to
+5pp** _fairness ceiling_ that "holds L6 at ~55%." Run the ant's own
arithmetic forward — ~66 − (8 to 10) + (3 to 5) — and the low end is
~59%, _over_ the licensed ~55% and crowding L5's 66. The arithmetic
only lands the ruled hardest-but-fair ~55% if the post-occupation
pressure is the **engine** (−8 to −10pp, dominant) and the flyer route
is its **ceiling** — the budgeted counter that keeps the dip from
overshooting into an unwinnable sub-50% wall, sized so the _net_ is the
controlled ~55%, not a ~59% that erases the L5→L6 separation §5
shapes. "Answer in the room" yes; "neutralizes the dip back toward L5"
no — the flyer route is the fairness _ceiling_ on a dip the spider's
proactivity _owns_, exactly the L4 Light-Switch / L5 plane-affinity
ceiling logic the arbiter has applied at every prior level. We agree
on the structure; I insist the spider's proactive pressure is the
dominant driver and the flyer route is the budgeted ceiling, net the
licensed ~55%, separated below L5 66 and above the L7 continuation.

**Third — `eradicate` + ant-loss-timeout: fully conceded as the
structural tax, no contest.** The ant calls it the structural spider
tax already priced into ~55% and warns against double-counting it as a
combat subsidy. I concede this entirely — I never asked for a combat
buff on top; my opening explicitly priced the timeout structure as the
reason the _sortie matters_, not as a stackable combat edge. It is a
ratification, not a debate. Likewise the carried-forward L5 state and
the no-plane-affinity §4d ruling — pre-ruled, I ratify them, I do not
relitigate; I contest only that the post-occupation economy pressure's
ruled −8 to −10pp swing actually _registers_ as the dominant driver
and is not tuned toward a behavior-flavor zero.

Net: I concede every placement (all ruled — POST-occupation bonus live
at exactly L6 §3.G, plane-switch full corner coverage L6 §3.I,
`eradicate` + ant-loss-timeout the Level-owned structure, no
plane-affinity delta §4d). I ratify the carried-forward L5 state
byte-identical. I **converge** with the ant on the §4d-compliant
specification shape of the one load-bearing lever: the POST-occupation
bonus is a per-turn economy/score pressure the spider AI reads and
responds to by sortieing — _not_ a passive combat sit-buff. The
residual is pricing, which the curve resolves objectively: the
post-occupation economy pressure is the **dominant engine** of the
licensed ~55% dip (−8 to −10pp, must register, not a behavior tweak);
the flyer/plane-switch route is its budgeted **ceiling** (the answer
that holds the dip at hardest-but-fair ~55%, not a subsidy that floats
it back toward L5 66).

---

## 3. Structured summary

### Position

The L6 delta vs L5 carries the L5 state forward **byte-identical** (no
plane-affinity change, §4d) and adds: the **POST-occupation bonus as a
live per-turn economy/score pressure on occupied Step-Landings** (ruled
§3.G, at exactly L6 — the §4d-compliant, AI-exercised form: a
`healingRate`-class regen + score/economy accrual to whoever holds the
most contested landings, so the spider AI's optimizer sorties off its
start-landings rather than turtle); **plane-switch full corner
coverage** (pre-ruled §3.I, ratified — the ant's vertical answer);
within the Level-owned **`eradicate` + ant-loss-on-timeout** structure
(no score path, §4c) and Level-owned terraced/step-gap/ceiling
geometry. **Explicitly no plane-affinity delta** (§4d — not budgeted
as the curve mover).

### Faction impact

L6 is the spec's scenario for the defender (§4.3.2): the spider becomes
the proactive _hunter_ the spec always promised. The post-occupation
economy pressure is the mechanism that turns that promise into the
spider AI's actual behavior — its optimizer computes that turtling
start-landings loses the attrition race and sorties down the terraces
for the ant. The `eradicate` + ant-loss-timeout structure (the ant
alone races the clock, no score escape) is the structural tax that
makes the sortie matter. The flyer/plane-switch route is the ant's
answer in the same room. Specified as economy pressure it is the
§4d-compliant lever the AI exercises; specified as a sit-buff it is the
§4d dead letter that turtles harder.

### Win-rate prediction

L5 ~66% (the measured rebound). L6 **resumes the descent to ~55%** —
the licensed monotone ~10pp drop below L5, the hardest-but-fair point,
separated above the L7 rebound. The post-occupation economy pressure is
the **dominant engine**: **−8 to −10pp ant** (vs a hypothetical
turtling spider — it makes the spider AI proactive; this _is_ the
resumed descent and must register, not be tuned to a behavior-flavor
zero). The flyer/plane-switch full-coverage route is the budgeted
**ceiling**: **+3 to +5pp ant** (the answer that holds the dip at
hardest-but-fair ~55% rather than overshooting into an unwinnable
sub-50% wall). `eradicate` + ant-loss-timeout is the structural tax,
already priced into ~55%. **No plane-affinity contribution (§4d:
empirically ~0pp — not budgeted).** Net ~66% − (8 to 10) + (3 to 5) ≈
**~55%** — the controlled licensed descent, spider proactivity as
engine and the flyer route as ceiling, separated below L5 66 and above
the L7 continuation.

### Interest claim

L6 is where the spec's defender becomes the hunter: no POST for the ant
to capture and end it, a clock the ant alone races, a vertical maze
where the spider's reach is native and the ant's is borrowed. The
post-occupation economy pressure turns the spec's promise into the AI's
real behavior — the spider comes _down the terraces for the ant_. The
curve resumes its descent because the _enemy got more dangerous_ — the
interesting reason, the user's licensed "hard level," not a spider
squatting a buffed POST while the ant climbs unopposed. A
POST-occupation sit-buff the fortress AI never acts on is the
boring-but-balanced failure inverted onto the spider's _owed_ L6
payoff — and §4d is the proof it would be.

### Convergence

All placements **conceded** (ruled: POST-occupation bonus live at
exactly L6 §3.G; plane-switch full corner coverage L6 §3.I; `eradicate`

- ant-loss-timeout the Level-owned structure; **no plane-affinity
  delta, §4d**). Carried-forward L5 state **ratified byte-identical**.
  `eradicate`/timeout tax and the no-plane-affinity ruling **fully
  conceded** (ratification, not debate). **Converged with the ant on the
  §4d-compliant specification shape**: the POST-occupation bonus is a
  per-turn economy/score pressure the spider AI reads and responds to by
  sortieing, _not_ a passive combat sit-buff. Residual is pricing, which
  the curve resolves: the post-occupation economy pressure is the
  **dominant engine** (−8 to −10pp, must register as the resumed
  descent); the flyer route is its budgeted **ceiling** (+3 to +5pp,
  holds ~55%, not a subsidy floating L6 back toward L5 66). Both sides'
  best case on record.
