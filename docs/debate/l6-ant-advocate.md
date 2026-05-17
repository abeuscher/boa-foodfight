# Ant Faction Sub-Agent — L6 Stairs Mechanic Delta (Opening + Rebuttal)

**Debate:** L6 (Stairs) mechanic delta vs L5, per roadmap §6.2.
**Author:** Ant Faction Sub-Agent (advocate, not arbiter).
**Arbiter:** Gameplay Progression Agent.
**Scope:** the L6 delta only — (a) the **POST-occupation bonus**
becoming a live combat/economy lever (ruled §3.G,
mechanic-distribution plan §2 L6: the "spiders don't turtle anymore"
lever, declared non-negotiable for L6); (b) `eradicate` victory +
ant-loss-on-timeout (Level-owned victory structure, engine-implemented
PR #10, level-progression-plan §4b — _not_ designed here, framed for
combat/economy interaction); (c) plane-switch reaching **full corner
coverage** at L6 (the §3.I banking, pre-ruled — ratified, not
relitigated); (d) flyer-favored combat/economy framing (Level owns the
terraced terrain + ceiling flyer lane; Gameplay owns any combat/economy
that tips the flyer payoff). **No plane-affinity delta at L6** —
carried from L5 byte-identical per level-progression-plan §4d (the
`wall` gradient is empirically inert under the chain-march/fortress AI
doctrine; it is a latent identity layer, not a curve lever, and is
**not** budgeted as a win-rate mover here).
**Builds on (does not repeat):** `l4-ant-advocate.md`,
`l5-ant-advocate.md`, `docs/debate/l5-gameplay-pa-arbitration.md` (the
L5 baseline this deltas FROM — plane-affinity at the banked `+1/+1`
spider-combat `wall` values, hypnotize light `maxControlTurns:3,
minControlTurns:2`, recruit-as-order, Under-Bed concealment — all carry
forward **unchanged**), `docs/mechanic-distribution-plan.md` §2 (the L6
row), §3.G (POST-occupation bonus → L6, exactly at the floor), §3.I
(plane-switch full corner coverage at L6), §4 (win-curve: L6 ~55%, the
resumed descent below L5 66).
**Binding constraints honored:** §3.1 hard floors, §3.4
cumulative-addition, §5 curve (L6 ≈ 55%, the resumed descent — the
hardest-but-fair point, monotone L5 66 → L6 ~55, separated below L5 and
above the L7+ continuation), §6.3 ownership (this is Gameplay-owned;
the terraced 5-band geometry, the step-gap funnel, the ceiling flyer
lane, and the 5 Step-Landing POST _placements_ are the Level PA's and
not designed here), level-progression-plan §4b (engine FROZEN — `eradicate`

- ant-loss-timeout implemented PR #10; data/AI-config only, no new
  engine code), §4c (score-resolution N/A — `eradicate` is
  decisive-or-timeout-loss, no score path), **§4d (plane-affinity inert —
  do NOT spend the L6 delta budget on it)**.

---

## 1. Natural-language argument — opening

### The ant doctrine at L6, and why L6 is the hardest-but-fair point

My through-line is unchanged across five rooms: the ant experience is a
logistics-and-tempo puzzle, and the descent toward ~50% by L10 is that
fantasy maturing, not breaking. L5 was the licensed rebound — the
player learned that the answer to a scouting defender is information
control, and the curve breathed up to ~66%. **L6 is where the descent
resumes, and I am not going to pretend it shouldn't.** Roadmap §5 and
mechanic-distribution plan §4 both price L6 at ~55%: the
hardest-but-fair point of Tier 1's first half, a clean ~10pp drop from
L5, separated below L5's rebound and above the L7 rebound that follows.
The curve is monotone here by design — L5 66 → L6 55 — and L6 is
explicitly licensed as the "hard level" the user wanted before the
back-half climaxes. My job at L6 is not to fight the dip. It is to make
sure the dip is _earned by a real, AI-exercised mechanic_ and that the
one thing that makes L6 a _game_ rather than a turkey-shoot — proactive
spiders — is delivered honestly, not as a stat that never fires.

### The POST-occupation bonus is non-negotiable, and I conceded that at §3.G — but it must not leak, and it must actually fire

I will be direct, because the record already is. At §3.G the spider
argued — and I conceded cleanly — that without proactive spiders the
L6 eradication scenario is a trivial farm. `eradicate` means the ant
must hunt down and kill _every_ spider party (engine `checkWinner`
`allSpiderPartiesEliminated`); the spider has no POST to capture, no
objective to race. If the spider AI simply turtles its start-POSTs on
the upper landings, the ant climbs the terraced gauntlet, grinds each
garrison at leisure, and wins ~75%+ — not the ~55% the curve prices,
and the entire back-half curve collapses with it. The POST-occupation
bonus is the lever that makes turtling _strictly worse_ than
contesting: occupying a Step-Landing must stop being a free fortress
and start being a thing the spider has to _leave_ to stay competitive,
or has to actively contest the ant for. I conceded this is the L6
non-negotiable. I do not reopen it.

But I hold the arbiter to the §3.G guard I _won_: the combat bonus must
land at **exactly L6, neither earlier nor later**, and it must be
specified so the AIs **actually exercise it**. This second clause is
the load-bearing one, and §4d is why. The L4 §9 precedent is burned
into this project: a ruled value (the Light-Switch) that the frozen
chain-march/fortress AIs never touched measured **ant 99%** — a +39pp
falsification, because the spec assumed an AI behavior that did not
exist. The Level PA's §4d ruling generalizes that lesson: plane-affinity
`wall` deltas are empirically ~0pp because the AIs fight on floor and
ceiling, never walls. **A POST-occupation bonus specified as a passive
"sit here and get stronger" buff risks the exact same fate** — if it
only rewards _holding_ a POST, and the fortress spider AI already holds
its start-POSTs, it changes nothing about spider behavior and L6
collapses to the turtle-farm at ~75%. The bonus must be specified as a
**post-occupation _economy/score_ pressure that makes the spider's own
optimizer abandon the turtle** — a per-turn payload on occupied
Step-Landings that the spider AI's evaluation function _reads_ and
_responds to_ by sortieing off its start-landing to contest the ant's
held ground, because staying put is now losing it the attrition race.
That is the only specification that survives §4d. A combat-only "+atk
while you stand here" that the fortress AI gets for free on its
start-POST is the §4d trap.

### The flyer payoff is mine to make legible, and it must be combat/economy, not just terrain

The Level PA owns the L6 geometry: five terraced bands, step gaps that
funnel non-flyers into 1-wide zig-zags, a ceiling flyer lane that
skips the gaps (level-progression-plan §2 L6). That terrain _favors_
flyers spatially — but spatial favoring alone, under §4d's logic, is
suspect: if the ant chain-marcher never fields a flyer-composed party
and grinds up the step gaps anyway, the flyer payoff is dead flavor,
exactly the "height POST with no plane-affinity" failure the spider
itself named at L3. The flyer payoff has to be _tipped by combat or
economy_ — the thing Gameplay owns. My ask: the POST-occupation
economy pressure, plus the full-coverage plane-switch (ruled §3.I),
must make the **ceiling/flyer route the tempo-winning route** — a
flyer or plane-switched column reaches and contests the upper
Step-Landings _fast enough to win the post-occupation attrition race_,
while a ground column grinding the step gaps arrives too late and loses
that race. That is the flyer payoff expressed as combat/economy tempo,
not as terrain the AI ignores. It is also _why_ §3.I banked
plane-switch full coverage to exactly L6: the Stairs is the room where
vertical reach is the entire point, and the ant's answer to the
terraced gauntlet is to _switch up_ rather than _climb_.

### No plane-affinity delta — and that is correct, not a concession I regret

Per §4d I do not ask for, and do not accept, any plane-affinity change
at L6. The L5 state (spider combat `wall +1/+1`, full corner coverage)
carries forward byte-identical. This is not me giving something up — it
is me refusing to let the L6 budget be wasted on a lever §4d proved
inert. Every prior arbitration that leaned on plane-affinity as a
curve-mover was measuring ~0pp. L6's ~10pp descent must be carried by
levers the AIs _exercise_: the post-occupation economy pressure
(spider AI reads it and sorties), the vertical geometry (Level-owned),
the full-coverage plane-switch (the ant's live answer order), and the
`eradicate` victory structure (no turtle escape). Plane-affinity is a
latent identity layer that paints the spiders as wall-climbers; it is
not, and must not be budgeted as, the reason L6 is hard.

### Why this serves the ant fantasy (interest)

A glass cannon's hardest room must be hard for a _legible_ reason.
L6's reason is clean: the spider doesn't turtle anymore, so the ant
can't grind the gauntlet at leisure — it must reach and hold the upper
ground _fast_, and that means flying or plane-switching, not trudging
the step gaps. The player who learned info-control at L5 now learns
_tempo and verticality_: the answer to a defender that won't sit still
is to out-reach it, not out-grind it. The descent to ~55% is the
spider finally being a proactive threat at the room built for
proactivity (`eradicate`, no POST to hide behind) — the hardest-but-fair
point, the user's licensed "hard level," with the difficulty _visible_
(the spiders are coming for your held ground) and the answer _in the
player's hands_ (fly, switch, out-tempo). That is the ant doctrine —
out-think and out-maneuver, don't out-slug — taught by the hardest
room of the first half.

---

## 2. Natural-language rebuttal — answering the spider's L6 brief

The spider will argue (consistent with its identity brief) that the
POST-occupation bonus is _its_ L6 payoff and should register loudly as
the engine of the ~55% dip; that the `eradicate` + ant-loss-timeout
structure is already a heavy ant tax it should be allowed to lean on;
and that the flyer payoff over-helps the ant in a room the spec hands
the high-ground defender. I rebut on three points.

**First — the POST-occupation bonus is the spider's payoff _only if it
makes the spider proactive_; a passive turtle-buff is the §4d trap and
helps the ant by accident.** The spider and I agree the bonus is
non-negotiable and is the engine of L6. Where I correct: the spider's
instinct will be to price it as a fat _combat_ buff on occupied
landings. Run that against the actual frozen fortress AI (the same
`buildFortressDefensePolicy` family the L4 §9 re-arbitration dissected):
the spider AI _starts_ owning its upper Step-Landings and never leaves
them. A combat buff on occupied POSTs is therefore a buff the spider
gets _for free, permanently, while turtling_ — which is the **exact
opposite of "spiders don't turtle anymore."** It makes turtling
_better_, not worse, and the ant climbing into a buffed garrison gets
ground down — that overshoots the dip toward an unlicensed spider stomp
_or_, if the AI still doesn't move, leaves L6 a static farm at the
wrong number. The §3.G ruling's own words are "make spider turtling on
start-POSTs strictly worse than contesting." That is an _economy/score
pressure_ specification, not a combat-buff one: the payload must be a
per-turn advantage that _accrues to whoever holds the most contested
ground_, so the spider's optimizer computes that sitting on its
start-landing while the ant accumulates the rest is _losing_, and
sorties. The lever that makes the spider proactive is the lever that
makes L6 a game — and it is an economy lever, per §4d, not a combat
sit-buff.

**Second — `eradicate` + ant-loss-timeout is already the structural
spider tax; do not double-count it as a combat subsidy.** The spider
will note, correctly, that L6 has no score path (level-progression-plan
§4c) and that timeout is a hard ant loss (engine `turn.ts:490–499`:
`eradicate` with no winner → spider). That _is_ a real, heavy ant
burden — the offensive clock is entirely on the ant, the spider wins by
_not losing_ in time. Granted. But that tax is _already priced into the
~55%_; it is the structural reason L6 is the hardest room, the spider's
identity delivered by the victory structure itself. The spider cannot
invoke the timeout tax _and_ ask for a fat combat buff on top — that is
the L4 "unanswered sixth escalation" the arbiter rejected at §3.D and
again at §3.G's no-leak guard. The escalation (an unforgiving victory
structure + a proactive sortieing defender) already lands the dip; the
ant's answer-in-the-same-room is the flyer/plane-switch tempo route
(§3.I full coverage banked _to exactly here_). Escalation with an
answer, both in L6 — the §3.D doctrine the arbiter has applied
consistently since L4.

**Third — the flyer payoff does not over-help the ant; it is the only
thing that keeps the post-occupation race _winnable_, which is what
makes the dip _fair_ rather than a wall.** The spider will say the
high-ground defender is spec-favored on the Stairs and a strong flyer
route erases that. It does not. The Level PA gives the spider the
terrain advantage (terraced bands, step-gap chokes, the defender holds
the high landings). The flyer/plane-switch route is the ant's _only_
counter to a proactive sortieing spider in a no-score, timeout-loss
room — without it, the post-occupation pressure makes L6 not ~55% but
an unwinnable ~40% wall (the spider sorties, the ground ant can't
re-take contested landings in time, timeout = loss). The flyer tempo
route is the knob that holds L6 at the licensed _hardest-but-fair_ ~55%
instead of overshooting into an unlicensed ant-loss collapse — the
exact role the Light-Switch played as the L4 spike's _ceiling_, applied
here. A hard room with no answer is the §6.2 feel-bad; a hard room with
a legible answer (out-tempo via the air) is the user's licensed "hard
level." The flyer payoff is the fairness mechanism, not an ant subsidy.

Net: I concede every placement (all ruled — POST-occupation bonus live
at exactly L6 §3.G, plane-switch full corner coverage L6 §3.I,
`eradicate` + ant-loss-timeout the Level-owned victory structure, no
plane-affinity delta §4d). I ratify the carried-forward L5 state
byte-identical. I contest exactly the _specification shape_ of the one
load-bearing lever the arbiter has not yet fixed in data: (a) the
POST-occupation bonus must be a per-turn **economy/score pressure** the
spider AI _reads and responds to by sortieing_ (the §4d-compliant,
AI-exercised form) — **not** a passive combat sit-buff the fortress AI
gets free while turtling (the §4d trap that inverts "no more turtling");
(b) the flyer/plane-switch tempo route must be priced as the
_fairness_ mechanism that holds L6 at the licensed hardest-but-fair
~55%, not an over-tuned ant subsidy and not a dead-flavor terrain
favoring the AI ignores.

---

## 3. Structured summary

### Position

The L6 delta vs L5 carries the L5 state forward **byte-identical** (no
plane-affinity change, per §4d) and adds: the **POST-occupation bonus
as a live per-turn economy/score pressure on occupied Step-Landings**
(ruled §3.G, at exactly L6 — the AI-exercised, §4d-compliant form that
makes spider start-POST turtling strictly worse than contesting the
terraced gauntlet); **plane-switch reaching full corner coverage**
(pre-ruled §3.I, ratified — the ant's vertical answer order); within
the Level-owned **`eradicate` + ant-loss-on-timeout** victory structure
(no score path, §4c) and the Level-owned terraced/step-gap/ceiling
geometry. **Explicitly no plane-affinity delta** (carried from L5
unchanged, §4d — not budgeted as a curve mover).

### Faction impact

The POST-occupation economy pressure is what stops the ant's L6 from
being a free turkey-shoot: it forces the spider AI off its turtle, so
the ant must _reach and hold_ contested ground fast rather than grind
the gauntlet at leisure. The ant's answer is tempo — fly the ceiling
lane or plane-switch up (§3.I full coverage), not trudge the step
gaps. Specified as economy/score pressure (not a combat sit-buff), it
is a lever the spider AI's optimizer actually exercises (§4d-compliant);
specified as a combat buff it would be a free turtle-bonus that inverts
the ruling. The flyer tempo route is the _fairness_ mechanism that
keeps the hardest room winnable.

### Win-rate prediction

L5 lands ~66% (the measured rebound). L6 **resumes the descent to
~55%** — a clean monotone ~10pp drop below L5, the hardest-but-fair
point, separated above the L7 rebound. Driver: the POST-occupation
economy pressure makes the spider proactive (it sorties off
start-POSTs), which is the bulk of the L5 66 → L6 ~55 movement —
**−8 to −10pp ant** vs a hypothetical turtling spider, the engine of
the licensed dip. The full-coverage plane-switch + flyer tempo route is
the ant's answer, holding L6 at the licensed ~55% rather than letting
the proactive-spider + timeout-loss structure overshoot into an
unlicensed sub-50% wall (the fairness ceiling, +3 to +5pp ant vs no
answer). `eradicate` + ant-loss-timeout is the structural tax, already
priced into the ~55%. **No plane-affinity contribution (§4d:
empirically ~0pp — not budgeted).** Net: ~66% − (8 to 10) + (3 to 5,
the flyer/switch answer holding the floor) ≈ **~55%**, the resumed
descent. Monotone L5 66 → L6 ~55 preserved; separated above L7.

### Interest claim

L6 teaches _tempo and verticality_: the answer to a defender that
won't sit still is to out-reach it, not out-grind it. The player who
learned info-control at L5 now learns the air. The descent to ~55% is
the spider finally being a proactive threat at the room built for it
(`eradicate`, no POST to hide behind, no score escape) — the
hardest-but-fair point, the user's licensed "hard level," difficulty
_visible_ (the spiders come for your held ground), answer _in hand_
(fly, switch, out-tempo). Not the boring-but-balanced turtle-farm and
not the no-answer feel-bad wall.

### Convergence

All placements **conceded** (ruled, uncontested: POST-occupation bonus
live at exactly L6 §3.G; plane-switch full corner coverage L6 §3.I;
`eradicate` + ant-loss-timeout the Level-owned victory structure; **no
plane-affinity delta, §4d**). Carried-forward L5 state **ratified
byte-identical**. One residual the arbiter has not yet fixed in data:
the **specification shape of the POST-occupation bonus** — a per-turn
economy/score pressure the spider AI reads and responds to by sortieing
(the §4d-compliant, AI-exercised, "turtling strictly worse" form) vs a
passive combat sit-buff the fortress AI gets free (the §4d trap);
secondarily, the flyer/plane-switch tempo route priced as the fairness
mechanism, not an over-tuned subsidy.
