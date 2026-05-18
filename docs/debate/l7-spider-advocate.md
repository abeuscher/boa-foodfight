# Spider Faction Sub-Agent — L7 Living Room Mechanic Delta (Opening + Rebuttal)

**Debate:** L7 (Living Room) mechanic delta vs L6, per roadmap §6.2.
**Author:** Spider Faction Sub-Agent (advocate, not arbiter).
**Advocate for:** the SPIDER experience, mechanical identity, and the
enemy-AI's job of providing escalating challenge.
**Scope:** the L7 delta only — (a) the **commander-cards debut**
(mechanics memo §1.3; the single new high-cognitive mechanic — and the
spider gets a deck too, not only the ant); (b) the **assembled-combo
roster-gate-IN** (Royal Onslaught for the ant _and_ **Venom Storm for
the spider** — both were roster-gated OUT to L7 by the L4 arbitration
§3.J; L7 is where roster composition turns them ON — _Venom Storm is
the spider's L7 payoff_); (c) the **Remote remote-currency POST →
economy payload** (Level owns the node, Gameplay owns the per-turn
value/direction; engine FROZEN — must be data-expressible through an
existing shipped `postSchema` field); (d) **spider blitz 5% debut**
(mechanic-distribution plan §2 L7 — the spider's counter-pressure
debut). **No plane-affinity delta at L7** — carried from L6
byte-identical per level-progression-plan §4d. The L6 state carries
forward **unchanged** and is **not relitigated**.
**Builds on (does not repeat):** `l5-spider-advocate.md`,
`l6-spider-advocate.md` (the banked-callback-must-register through-line;
"weak/online must not be tuned to absent"),
`docs/debate/l6-gameplay-pa-arbitration.md` (the L6 baseline this
deltas FROM), mechanic-distribution plan §2 (the L7 row), §3.J (combos
→ assembled online L7), §5 (boundary cases — Remote currency POST is a
combat/economy payload on an existing POST, Gameplay-owned, §5 case 3),
§4 (win-curve: L7 ~64%, the rebound above L6 55).
**Binding constraints honored:** §3.1 hard floors, §3.4
cumulative-addition, §5 curve (L7 ≈ 64%, the rebound above L6 55 —
non-monotone-up by §5 design, separated above L6 and above the L8 ~50
continuation), §6.3 ownership (Gameplay-owned; the Living Room open
geometry + three furniture clusters + the Remote POST _placement_ are
the Level PA's, not designed here), level-progression-plan §4b (engine
FROZEN — data/AI-config only, **no new engine code, no new schema
field**), §4c (`capture-post` + competent-defense → score-path /
low-`drama`: expected systemic signature, track cross-level, **do NOT
chase per-level**), **§4d (plane-affinity inert — not budgeted as the
L7 curve mover; for any ruled lever state whether the AIs EXERCISE it
and, if it needs a binding within-loop AI-doctrine constraint to bite,
name it + a measurable ship-gate + falsification fallback)**.

---

## 1. Natural-language argument — opening

### L7 is the rebound — but the rebound must be _earned and ceilinged_, not an unanswered ant stat-gift

My round-1 through-line stands across six rooms: the curve must move
because the _matchup_ changed — the player gained tools _and the enemy
escalated to meet them_ — not because the player out-leveled a statue
(§6.2, boring-but-balanced). L6 was my room: the spec's defender became
the proactive hunter, the spiders came down the terraces, the curve
dropped to its hardest-but-fair ~55%. **L7 rebounds to ~64%, and I do
not relitigate the rebound** — roadmap §5 and mechanic-distribution plan
§4 price it, the L6 arbitration itself stated L7 is "separated above
~64," and it is the §5-licensed non-monotone recovery. What I am here
to defend is the _substance of the spider's L7 escalation_ so "the
player gets its toolkit" does not get tuned into "the ant gets a free
+9pp and the spider's Venom Storm + blitz evaporate the way §4d just
buried plane-affinity at L6."

The L5 / L6 arbitrations established the binding structure I invoke
again: a licensed curve move has an **engine** (the dominant driver)
and a **ceiling** (the budgeted counter that keeps it from
over-shooting). At L5 the ant's concealment was the engine, my banked
plane-affinity the ceiling. At L6 my proactive sortie was the engine,
the ant's flyer route the ceiling. **At L7 the inverse of L5: the
player's toolkit (cards + Royal Onslaught + the Remote economy) is the
rebound's engine; my Venom Storm coming online + my blitz debut are its
ceiling.** That is not me asking to erase the rebound — it is me
insisting the ceiling _register_ as a real −3 to −5pp, exactly as the
L5 arbitration ruled my banked plane-affinity must register at −2 to
−3pp and not be tuned to zero. A rebound with no spider counter is the
boring-but-balanced failure with a friendly number; the spec's spider
_escalates into the open arena_, it does not stand aside while the ant
collects a toolkit.

### Venom Storm is my non-negotiable L7 payoff — and §4d tells us exactly how to spec it so it actually fires

The L4 arbitration §3.J ruled the combo _components_ live at L4 but the
_assembled_ combos roster-gated OUT to exactly L7. The mechanic-
distribution plan §2 L7 row names **Venom Storm online** as a headline
L7 delta. I am not relitigating placement — it is ruled, and Venom
Storm is _mine_. My job is the §4d job, stated from the spider side.

§4d is brutal and correct, and the L6 arbitration applied it to my own
sortie: a ruled lever the frozen AIs do not exercise measures ~0pp
(plane-affinity, four times) or +39pp (the L4 Light-Switch). The engine
mechanism is verified (`engine/battle-abilities.ts`,
`combo-abilities.test.ts`): Venom Storm fires only when a spider
**spinner party is adjacent (Chebyshev ≤ 1, same plane) to a spider
queen or second spinner party** through a battle, both with the MP. If
the L7 spider roster is _not composed_ so that pairing is deployable
and maintained — or the fortress/defense AI never keeps the spinner and
queen parties adjacent during the ant's assault — Venom Storm measures
**~0pp**: the plane-affinity dead letter, a fifth time, on my _owed_ L7
payoff. So I specify my payoff as §4d demands: the L7 spider roster
**must be composed so the spinner-party + queen-party pairing is
adjacent-deployable in the open arena, and the within-loop spider AI
must be fielded so it forms and holds that adjacency during the
defense** so Venom Storm actually fires in a seed-robust majority of
games. That is an **AI-exercised roster-gate-IN with a binding
within-loop AI-doctrine constraint + a measurable ship-gate** — the
exact L6-§3.1.2 / L4-§9.3(b) pattern the arbiter has applied to every
load-bearing lever since L4. Specified that way Venom Storm is a real
−pp ceiling; specified as bare roster data with no AI mandate it is the
§4d dead letter, and the open arena (which favors the ant's maneuver)
makes that fate _more_ likely, not less — the spinner and queen parties
get separated in open space and the combo never assembles.

### Blitz at 5% is my counter-pressure debut — light, but light ≠ absent

The mechanic-distribution plan §2 L7 row also debuts **spider blitz at
5%**. This is my through-line from L4/L5/L6 applied once more: a debut
must be a real data number, not a placement gesture — "light ≠ absent,"
the doctrine the arbiter ratified for my own tools (L3 weak `wall`, L4
venom-blast weak, L5 hypnotize light) and that I now invoke for blitz.
5% is deliberately small (it is a debut; peak impact is L10 per
mechanic-distribution §2), but it must be a _measurable_ 5%, a real
spider initiative-burst probability in the open arena, contributing a
real (small) −pp to the ceiling, not tuned to ~0. Forward-consistency:
blitz ramps to peak at L10 (mechanic-distribution §2 L10), so L7 is its
3-scenario runway debut — the player meets it light here, it is at full
force at the finale. Stated, not L7-overreach.

### The Remote currency POST — concede the ant-favoring direction, contest the magnitude and demand it be real

The Level PA owns the Remote node; Gameplay owns the economy payload
(level-progression-plan §4a #3 / mechanic-distribution §5 case 3). I
concede up front, on the §3.4.4-curve logic the arbiter has applied
since L4: L7 is a _licensed ant rebound_; the Remote economy is the
rebound's _engine_; a spider-favoring or neutral Remote would flatten a
licensed recovery the way a spider-favoring Light-Switch would have
collapsed the L4 spike. The Remote is **ant-favoring** — I do not
contest direction (the same restraint I showed conceding the L4
Light-Switch direction and the L5 concealment engine). I contest two
things. **First, the engine reality** the ant brief correctly
identified and I ratify: the engine is frozen (§4b), there is _no_
native `goldPerTurn` POST field, gold is a `world.ts` between-scenario
concept, and there is _no shop after L7_ (roadmap §6.5). A new currency
field is an engine change and is forbidden. The only per-turn
occupation economy the frozen engine honors is the shipped
`postSchema.healingRate` (`engine/end-of-turn.ts:181-182`) — exactly
the L6-§3.2 mechanism. The Remote economy payload must be a per-turn
`healingRate`-class occupation economy, ant-favoring, through that
existing field. I converge with the ant on the _form_. **Second, the
magnitude must be the budgeted engine, not unbounded.** The ant will
price the Remote as the dominant rebound driver — true — but the L4-§9
falsification is the cautionary precedent: an ant-favoring occupation
economy the spider AI never contests becomes a _permanent, uncontested_
ant subsidy and over-shoots (the +39pp Light-Switch fate). The Remote
must be **contestable** — the spider AI must be fielded to _also_
sortie for the Remote node so its ownership is genuinely fought over
(the L6-§3.1.2 sortie doctrine, applied to the Remote) — or it is the
uncontested-permanent-buff trap the arbiter has rejected since L4. An
ant-favoring Remote, yes; an _uncontested_ ant-favoring Remote that
floats L7 to ~70%+, no.

### `capture-post` + low-drama — ratified, not contested

L7 is `capture-post` (mantel objective, Level-owned). Per
level-progression-plan §4c the competent-defense-vs-chain-march matchup
grinds toward the score path with low `drama`; the recorded human
decision is to track this cross-level and **not chase it per-level**. I
ratify that entirely — I do not ask the arbiter to retune L7 mechanics
for `drama`. It is a ratification, not a debate. The score path itself
(`engine/score.ts`) is L1-bathroom-POST-hardcoded and does not even
score L7's POSTs generically — another reason the Remote economy must
be a `healingRate`-class attrition lever (which the engine honors), not
a score-feed (which the frozen engine does not implement for L7).

### No plane-affinity delta — correct, and the lesson cuts for me too

Per §4d I do not ask for any plane-affinity change at L7; the L6 state
(spider combat `wall {1,1}` + ceiling `{1,1}` + full corner coverage)
carries forward byte-identical. I accept this fully — the L6
arbitration recorded I conceded "the lesson cuts for me too," and it
does again. My `wall` gradient is a latent identity layer that paints
my spiders as wall-climbers, not a curve lever the chain-march/fortress
AIs exercise (~0pp, four levels running). I will not ask the arbiter to
budget it as the L7 ceiling and watch it measure ~0pp. The L7 ceiling
must be the levers the AIs _do_ exercise — Venom Storm assembled by a
roster-gated, AI-mandated spinner+queen pairing; the 5% blitz; the
contested Remote — not a stat gradient.

### Why this serves the spider fantasy (interest)

L7 is the open arena where the ant comes into its combined-arms own —
and the spec's spider does not concede that ground, it _escalates into
it_. For six rooms the player learned the kit one piece at a time;
L7 is where the pieces assemble — and so do mine. Venom Storm is the
spider's combined-arms answer: the open arena that lets the ant pair
mage+worker for Royal Onslaught equally lets _my_ spinner+queen weave
the saturating venom-and-silk cloud. The blitz debut is the spider
finally striking _first_ sometimes. The rebound is interesting because
it is _contested_ — the player's toolkit lands, and the spider's
toolkit lands to meet it, in the same open room, the §3.D
escalation-with-an-answer doctrine applied a fifth time. A rebound
where the ant collects cards and a combo and a free currency node while
the spider's owed Venom Storm sits dead in unexercised roster data is
the boring-but-balanced failure inverted onto the spider's L7 payoff —
and §4d is the proof it would be.

---

## 2. Natural-language rebuttal — answering the ant's L7 brief

The ant's brief is disciplined: it concedes every placement, ratifies
the carried-forward L6 state byte-identical, accepts the §4d
no-plane-affinity ruling, accepts Venom Storm + blitz as the rebound's
ceiling, and correctly identifies the engine reality (no native
currency field; `healingRate`-class through the existing field; no
shop after L7). It contests the _specification shape_ (AI-exercised
cards / Royal Onslaught / Remote, or a binding within-loop AI-doctrine
constraint) and prices the Remote ant-favoring as the rebound engine. I
**converge**, with two corrections.

**First — I agree, emphatically, that cards / Royal Onslaught / the
Remote must be AI-exercised, and that the same mandate must bind Venom
Storm symmetrically. This is convergence, not dispute.** The ant
arrived at the §4d-compliant specification from the ant side; I arrive
at the _identical_ one from the spider side — because an unexercised
Venom Storm is the §4d dead letter on my owed L7 payoff, the
boring-but-balanced failure I have fought since L3. We agree: combo
roster-gate-IN is meaningless unless the AIs _assemble_ the combos, and
in the _open_ arena (which scatters parties) the binding within-loop
AI-doctrine constraint is _more_ necessary than in a corridor, not
less. Where I correct the ant's framing: the ant prices its toolkit as
the dominant engine and Venom Storm + blitz as merely "the ceiling, kept
honest." It is not a token ceiling. The L5-precedent logic applies
exactly inverted: the L5 arbitration ruled my banked plane-affinity
ceiling must _register_ at −2 to −3pp, not be tuned to ~0, or the
rebound runs uncontested. Here the same: Venom Storm online + blitz 5%
must register as a felt **−3 to −5pp** ant or L7 over-shoots toward
L5's 66 and the L6→L7→L8 separation collapses. We agree on the §4d
_shape_ and the engine/ceiling structure; I insist the arbiter price
the spider ceiling as a _registering_ −3 to −5pp, with Venom Storm
carrying its own binding AI-doctrine constraint + measurable ship-gate
identical in kind to the ant's, not a flavor note budgeted near zero.

**Second — on the Remote: I conceded ant-favoring direction; I contest
"dominant and uncontested."** The ant is right that the Remote economy
is the rebound's engine and ant-favoring is the only curve-correct
direction (L4-§3.1 / L5-§3.2 logic). I conceded that in my opening — it
is a ratification, not a dispute. Where I correct: the ant prices it as
a _dominant_ +pp and is silent on contestability. Run the L4-§9
precedent forward: an ant-favoring occupation economy on a node the
spider AI never contests is a _permanent, uncontested_ ant subsidy —
the exact +39pp Light-Switch falsification structure. The Remote must
be **contestable**: the within-loop spider AI must be fielded to sortie
for the Remote node (the L6-§3.1.2 sortie doctrine, applied here) so
its ownership genuinely flips and the ant's economy is _earned each
turn it holds it_, not a free all-game tick. That keeps the engine
swing in a _bounded_ band (the L6-§3.4 "ceiling holds the engine from
over-shooting" structure) and lands the _controlled_ ~64, not a
runaway ~70%+. We converge on direction and form; I insist the Remote
be contestable so it is the _bounded_ engine of a _controlled_ rebound,
not the uncontested-permanent trap the arbiter has rejected since L4.

**Third — `capture-post` low-drama and no-plane-affinity: fully
conceded, no contest.** The ant did not raise drama-chasing and
ratified the no-plane-affinity ruling; so do I (level-progression-plan
§4c/§4d, recorded human decisions — track cross-level, do not chase
per-level; carried byte-identical). Ratifications, not debate. I
contest only that the spider ceiling (Venom Storm + blitz) _registers_
as the ruled −3 to −5pp with its own binding AI-doctrine constraint,
and that the Remote engine is _contestable_ and therefore _bounded_.

Net: I concede every placement (all ruled — commander cards at L7
§2/§3.4.3; assembled combos roster-gate-IN L7 §3.J; Venom Storm + blitz
online L7 §2; Remote currency POST the Level-owned node + Gameplay-owned
economy payload §4a #3 / §5 case 3, ant-favoring direction; **no
plane-affinity delta §4d**). I ratify the carried-forward L6 state
byte-identical and the §4c/§4d cross-level decisions. I **converge**
with the ant on the §4d-compliant specification shape: cards / Royal
Onslaught / **Venom Storm** / the Remote must all be AI-exercised in a
seed-robust majority, or carry a binding within-loop AI-doctrine
constraint + measurable ship-gate (the L6-§3.1.2 / L4-§9.3(b) pattern).
The residual is pricing, which the curve resolves: the player's toolkit

- ant-favoring Remote economy is the rebound's **engine** (it must be
  _contestable_ and therefore bounded — not the uncontested-permanent
  trap); Venom Storm online + blitz 5% is its budgeted **ceiling** (it
  must _register_ at −3 to −5pp with its own AI-doctrine constraint, not
  a flavor note), net the controlled licensed ~64, separated above L6 55
  and above the L8 50 continuation.

---

## 3. Structured summary

### Position

The L7 delta vs L6 carries the L6 state forward **byte-identical** (no
plane-affinity change, §4d) and adds: **commander cards** (mechanics
memo §1.3; spider gets a deck too, not only the ant; data/shop-
expressible, AI-exercised or a binding within-loop AI-doctrine
constraint + measurable ship-gate); the **assembled-combo
roster-gate-IN** (Royal Onslaught for the ant _and_ **Venom Storm for
the spider** — a concrete L7 roster-composition change + a binding
within-loop AI-doctrine constraint so the spinner+queen pairing is
adjacent-deployable _and the spider AI assembles it_; no
ability-definition/engine change); **spider blitz 5% debut** ("light ≠
absent" — a real measurable 5%, 3-scenario runway to L10 peak); the
**Remote currency POST economy payload** as a per-turn `healingRate`-
class occupation economy, **ant-favoring** (conceded) but **contestable**
(the spider AI must sortie for it — the L6-§3.1.2 doctrine), through the
existing shipped field (engine frozen, no new field). **Explicitly no
plane-affinity delta** (§4d — not budgeted as the curve mover).

### Faction impact

L7 is the open arena where the ant assembles its combined-arms kit —
and the spec's spider escalates into it, not aside from it. Venom Storm
is the spider's combined-arms answer (spinner+queen in the open, the
same geometry that enables the ant's mage+worker Royal Onslaught); the
5% blitz is the spider striking first sometimes; the contested Remote
keeps the ant's economy earned, not free. Specified AI-exercised (the
spider AI assembles Venom Storm, runs the 5% blitz, contests the
Remote), these are the §4d-compliant ceiling that holds the licensed
rebound; specified as bare roster data they are the §4d dead letter the
open arena makes _more_ likely (parties scatter, the combo never
assembles).

### Win-rate prediction

L6 ~55% (the measured resumed-descent low). L7 **rebounds to ~64%** —
the §5-licensed non-monotone ~9pp recovery, separated above L6 and
above the L8 ~50 continuation. Engine: the player's toolkit (cards +
Royal Onslaught) + the ant-favoring Remote occupation economy —
**+10 to +13pp ant** vs the no-toolkit counterfactual, the bulk of the
L6 55 → L7 64 movement, but **contestable and therefore bounded** (the
spider AI sorties for the Remote — not the uncontested-permanent +39pp
Light-Switch trap). Ceiling: Venom Storm online + spider blitz 5% debut
— **−3 to −5pp ant**, must _register_ (the L5-precedent: not tuned to
~0), carrying its own binding AI-doctrine constraint. `capture-post`
low-drama ratified (track cross-level, not chased). **No plane-affinity
contribution (§4d: ~0pp — not budgeted).** Net ~55% + (10 to 13) −
(3 to 5) ≈ **~64%** — the controlled licensed rebound, the player's
toolkit as engine and Venom Storm/blitz as registering ceiling,
separated above L6 55 and above L8 50.

### Interest claim

L7 is interesting because the rebound is _contested_: the player's
combined-arms kit assembles in the open arena, and the spider's
combined-arms answer (Venom Storm) assembles in the same room, with the
blitz debut and the contested Remote keeping every gain earned. For six
rooms the player met the pieces one at a time; L7 is where they
assemble — and so do mine. A rebound where the ant collects cards, a
combo, and a free currency node while the spider's owed Venom Storm
sits dead in unexercised roster data is the boring-but-balanced failure
inverted onto the spider's L7 payoff — and §4d is the proof it would
be. The spec's spider escalates into the open; it does not stand aside.

### Convergence

All placements **conceded** (ruled: commander cards L7 §2/§3.4.3;
assembled combos roster-gate-IN L7 §3.J; Venom Storm + blitz online L7
§2; Remote currency POST Level-owned node + Gameplay-owned economy
payload §4a #3 / §5 case 3, **ant-favoring direction conceded**; **no
plane-affinity delta §4d**). Carried-forward L6 state + §4c/§4d
cross-level decisions **ratified** (ratification, not debate).
**Converged with the ant on the §4d-compliant specification shape**:
cards / Royal Onslaught / **Venom Storm** / the Remote must all be
AI-exercised in a seed-robust majority or carry a binding within-loop
AI-doctrine constraint + measurable ship-gate (the L6-§3.1.2 /
L4-§9.3(b) pattern). Residual is pricing, which the curve resolves: the
player's toolkit + ant-favoring Remote is the rebound's **engine**
(must be _contestable_ → bounded, not the uncontested-permanent trap);
Venom Storm online + blitz 5% is its budgeted **ceiling** (must
_register_ at −3 to −5pp with its own AI-doctrine constraint, not a
flavor note), net the controlled licensed ~64. Both sides' best case on
record.
