# Ant Faction Sub-Agent — L4 Hallway Mechanic Delta (Opening + Rebuttal)

**Debate:** L4 (Hallway) mechanic delta vs L3, per roadmap §6.2.
**Author:** Ant Faction Sub-Agent (advocate, not arbiter).
**Arbiter:** Gameplay Progression Agent.
**Scope:** the L4 delta only — asymmetric plane-switch (full strength),
POST-randomization, the combo-ability components (Royal Onslaught /
Venom Storm), venom-blast (weak debut), and the Light-Switch flip-state
POST combat-modifier payload. The ruled L3 `wall` plane-affinity state
(`docs/debate/l3-gameplay-pa-arbitration.md`) carries forward **unchanged**
and is **not relitigated** — L4 adds its delta on top.
**Builds on (does not repeat):** `ant-advocate-opening.md`,
`ant-advocate-rebuttal.md`, `l3-ant-advocate.md`, mechanic-distribution
plan §2 (the L4 row), §3.D (venom-blast → L4-weak, ratified), §3.I
(asymmetric plane-switch → L4 full strength, range-limited, full corner
coverage banked to L6), §5 (boundary case #1: Light-Switch split).
**Binding constraints honored:** §3.1 hard floors, §3.4
cumulative-addition, §5 curve, §6.3 ownership (this is Gameplay-owned;
Hallway geometry / Doorway jitter bands are the Level PA's and not
designed here), §4b engine freeze (data-only — no new engine code).

---

## 1. Natural-language argument — opening

### The ant doctrine at L4, and why L4 is the licensed dip

My through-line is unchanged: the ant experience is a logistics-and-tempo
puzzle, and the curve falling toward ~50% by L10 is that fantasy maturing,
not breaking. L4 is the one place in the early tier where I _do not_ fight
the dip. The roadmap §5 prices L4 at ~60% — the licensed randomization
shock toward spider — and the mechanic-distribution plan §2 already
schedules the heaviest single cumulative delta in the tier here:
asymmetric plane-switch at full strength, POST-randomization, the combo
components, venom-blast (weak), and the Light-Switch. I accept the dip.
What I will not accept is the dip becoming a _cliff_ — L4 sliding below
~55% into a genuine ant-loss zone, which breaches the licensed spike and
flattens the engineered monotone descent L3 (~68%) → L4 (~60%) the L3
arbitration deliberately shaped.

My job at L4 is therefore narrow and specific: hold each of the five
delta components to the _weakest_ tuning that still delivers its stated
identity, and — critically — make sure the **Light-Switch combat-modifier
payload favors the ANT**, because every other component of the L4 delta
favors the spider. The Light-Switch is the one knob in this room that can
keep the dip a shaped ~60% instead of a ~54% over-correction.

### The Light-Switch is the ant's counter-pressure lever — it must favor ants

The Level PA owns the Light-Switch POST node and its flip-state (north-wall,
mid-corridor; `docs/level-progression-plan.md` §2 L4, §4a #1). Gameplay
(the arbiter) owns the `combatModifier` payload. The schema
(`engine/schemas/map.ts`) expresses it as
`{ litOwner, faction, attack }`: while the POST is **not** owned by
`litOwner`, every unit of `faction` gets `+attack` engine-wide.

The corridor geometry is the whole argument. The Level PA's L4 is a
4-wide single-axis corridor with no flank — "single long axis removes
flanking, raises variance" (level-progression-plan §2 L4(6)). In a
corridor with no flank, the attacker (ant) is marching into a defended
End-Door through three seed-jittered Doorway POSTs the spider defends.
The spider already gets: full-strength asymmetric plane-switch (a flank
the corridor otherwise denies), POST-randomization (defeats the ant's
pre-planning — the spec's whole "randomization shock toward spider"),
weak venom-blast (a burst initiator), and the combo components coming
online. Five spider-tilted deltas in one room.

The Light-Switch must be the ant's answer in the same room — "escalation
with an answer," the exact structure the arbiter ratified for venom-blast
at §3.D ("it debuts the same scenario as the ant's Royal Onslaught combo
answer — escalation with an answer, not unanswered chip"). Concretely:

- **`litOwner: "spider"`** — the spider garrison naturally holds the
  Light-Switch at scenario start (it is mid-corridor, on the spider's
  defended side of a capture-post map; the spider is the defender). So
  the modifier is **live by default** and the ant must _fight to flip it
  off_ by capturing the switch.
- **`faction: "ant"`** — while the spider holds the lit switch, **ants**
  get the `+attack`. This is the counter-pressure lever: the corridor is
  dark and hostile, the ants are pushing into it under fire, and the
  "lights" being controlled by the enemy is exactly when the attacker
  needs the edge to make the push survivable. When the ant captures the
  switch (flips it to ant ownership), the bonus _turns off_ — the ant
  has cleared the corridor and no longer needs the crutch. This is a
  self-extinguishing comeback knob: strongest exactly when the ant is
  most pressured, gone once the ant has won the local fight. That is the
  legible, bounded, pro-ant-pedagogy shape — not a permanent stat wall.
- **`attack: +2`** — magnitude. A `+1` is below the perceptual floor in
  a room this noisy (five other deltas drowning it out); the ant player
  cannot _see_ the lever working and the interest payoff is lost. A `+3`
  over-corrects: a corridor full of `+3` ants erases the entire licensed
  ~60% dip and pushes L4 back toward ~66%, breaking the monotone descent
  upward instead of downward. `+2` is the Goldilocks integer: a felt,
  legible swing of roughly +4 to +6pp ant in a single-axis room where
  every engagement is a head-on attrition trade, enough to hold the dip
  at a _shaped_ ~60% against the five spider deltas rather than letting
  it slide to ~54%.

The one-sentence statement of the Light-Switch (the §3.4.3 "name what's
new" test): _"the enemy holds the lights; while they do, your soldiers
hit harder pushing through the dark — take the switch and you've cleared
the hall."_ One room of change, one legible lever, ant-favoring by
direction because the corridor geometry and the other five deltas are all
spider-favoring.

### The other four components — hold each to its weakest stated tuning

1. **Asymmetric plane-switch, full strength, range-limited (ruled §3.I).**
   I do not reopen placement or the full-strength setting — that is ruled.
   I hold the arbiter to its own §3.I banking: plane-switch ships
   **range-limited at L4** (fewer corner-pairs active), full corner
   coverage banked to **L6**. The prior state (L3): the ant's
   `ant-plane-switch` ability and the spider's `spider-corner-cross`
   passive both exist in data but are tutorial-inert (L3 is a flat
   island-Kitchen; the L3 ruling touched only `planeAffinity`, not
   switching). L4 is where switching becomes a _live order_ — full
   strength in effect, range-limited in reach. The range limit is the
   non-negotiable: L4 is the heaviest cumulative room in the tier (the
   §3.4.3 budget is spent), and full corner coverage on top of the other
   four deltas in a no-flank corridor is the curve-breaker §3.I was
   issued to prevent. The spider's deep flank is the L6 payoff, not the
   L4 cold open — the same callback discipline the spider demanded for
   hypnotize.

2. **Venom-blast, weak debut (ratified §3.D).** Already converged: both
   factions landed on L4-weak (ant R4, spider S4). Venom-blast is a
   _burst initiator_, not the sustained attrition tool — and a glass
   cannon is punished by grind, not by burst (spider rebuttal §1.3,
   which I conceded). I hold only that "weak" is a real, measurable
   data-cap on the venom-blast ability params, not a placement gesture:
   the burst must be a chip that opens a fight, not a party-deleter. The
   spider will agree — Venom Storm (the sustained-pressure combo) is the
   L7 escalation, three scenarios away, clearing the spider's own
   runway test.

3. **Combo components (Royal Onslaught / Venom Storm), components only —
   not the combos.** The L4 row schedules the _components_. Royal
   Onslaught's components (`magic-arrow` + `jelly-apply`) and Venom
   Storm's components (`venom-blast` + `web-tangle`) become _understood
   inputs_ at L4; the assembled combos do not fire until L7 (Venom Storm,
   ruled §3.J; Royal Onslaught is the ant's answer-combo, same gating).
   This is symmetric and I support it: the player meets the pieces before
   the payoff. I only insist the gating be _explicit_ — the combo
   _abilities themselves_ are roster-gated OUT of L4 (no party fields a
   unit that can assemble them); only the component abilities are live.
   This keeps L4's §3.4.3 budget honest (the one new high-cognitive
   mechanic is the plane-switch order; combos are L7's).

4. **POST-randomization.** Purely the Doorway-jitter band — Level-owned
   (level-progression-plan §2 L4(5a), boundary-case-free). I do not
   design it. I only note its win-rate weight here so the arbiter prices
   it into the L4 ~60% and does not _also_ over-tune the Light-Switch
   down: the randomization shock is real spider-favoring variance
   (defeats ant pre-planning) and it is _already_ the dominant driver of
   the ~60% dip. The Light-Switch ant-favoring `+2` is the
   counter-weight that keeps that dip from becoming a cliff — not a
   redundant ant subsidy on top of an already-shaped curve.

### Why this serves the ant fantasy (interest)

A glass cannon's losses must be legible, and its comebacks must be
_earned_. The corridor is the most hostile geometry the ant has faced —
no flank, randomized objectives, a flanking enemy. If the ant simply
loses ground here with no lever of its own, L4 reads as "the game got
unfair," the §6.2 feel-bad. The ant-favoring Light-Switch is the lever
that makes the hard room _fair-feeling_: the player can _see_ the enemy
holding the lights, _feel_ the attack bonus while pushing through the
dark, and _earn_ the corridor by taking the switch (at which point the
crutch self-extinguishes — no permanent stat wall). That is the ant
doctrine — push, commit, take the objective — taught by the hardest room
in the early tier, with the difficulty legible and the answer in the
player's hands. Pro-ant pedagogy, not an unearned subsidy.

---

## 2. Natural-language rebuttal — answering the spider's L4 brief

The spider will argue (consistent with its identity brief) that the
Light-Switch should favor the **spider** — that L4 is _the_ randomization-
shock spike, the spider's signature room, and an ant-favoring switch
neuters the one scenario the spec hands the defender. I rebut on three
points.

**First — direction is determined by what the other five deltas already
do.** The spider's case treats the Light-Switch in isolation. It is not
isolated: plane-switch (full strength), POST-randomization, venom-blast,
and the combo components are _all_ spider-favoring and _all_ land in this
same room. The Light-Switch is the _only_ free knob whose direction the
arbiter sets. If it also favors the spider, L4 is six spider-tilted
deltas in one no-flank corridor — that is not a ~60% licensed dip, it is
a ~52–54% ant-loss room that breaches the spike (mechanic-distribution
plan §4: L4 predicted ~60%, monotone L3 ~68 → L4 ~60). The spider does
not need the Light-Switch to make L4 hard; the other five deltas _are_
the hardness. The Light-Switch is the shaping counter-weight that keeps
the engineered descent a descent and not a fall.

**Second — the spider's own §3.D / §3.I logic is "escalation with an
answer."** The arbiter ratified venom-blast at L4 _specifically because_
it "debuts the same scenario as the ant's Royal Onslaught combo answer —
escalation with an answer, not unanswered chip." Apply that doctrine
consistently: the L4 escalation (five spider deltas) needs an answer _in
the same room_. The Light-Switch, ant-favoring, self-extinguishing on
capture, _is_ that answer. A spider-favoring Light-Switch would be the
sixth unanswered escalation — the exact "unanswered chip" structure the
arbiter rejected for venom-blast at L3. The spider cannot invoke
"escalation with an answer" for its own venom-blast and then deny the ant
the answer in the same room.

**Third — the self-extinguishing design already concedes the spider's
fairness concern.** I am not asking for a permanent ant stat wall. The
modifier is live _only while the spider holds the switch_; the instant
the ant captures it, the bonus is gone. The spider _controls the lever_ —
hold the switch and the ant gets the bonus but the spider keeps the
position; lose the switch and the bonus dies but the spider has ceded
ground. That is a genuine tactical decision _for the spider_, not a flat
ant subsidy. The spider's interest is served by the _decision_ the switch
creates, not by the bonus pointing at spiders. `litOwner: "spider"`,
`faction: "ant"`, `attack: +2` is the design that gives the spider a real
choice and the ant a legible, earned, bounded answer.

Net: I concede every placement (all ruled — plane-switch L4 full
strength, venom-blast L4 weak, combos-components L4, randomization L4).
I contest exactly one thing the arbiter has not yet set: the Light-Switch
`combatModifier` direction and magnitude. Hold it `litOwner: "spider"` /
`faction: "ant"` / `attack: +2`.

---

## 3. Structured summary

### Position

The L4 delta vs L3 carries the ruled L3 `wall` plane-affinity state
forward **unchanged** and adds: asymmetric plane-switch **full strength,
range-limited** (ruled §3.I — full corner coverage banked to L6);
venom-blast **weak** (ruled §3.D — a data-capped burst initiator);
combo **components only** (Royal Onslaught / Venom Storm components live,
the assembled combos roster-gated OUT to L7); POST-randomization
(Level-owned Doorway jitter, not designed here); and the **Light-Switch
`combatModifier` = `{ litOwner: "spider", faction: "ant", attack: +2 }`**
— the ant's self-extinguishing counter-pressure lever, the one
ant-favoring delta in a room of five spider-favoring ones.

### Faction impact

Accepts the heaviest cumulative spider-favoring delta in the tier
(five spider-tilted components) as the licensed ~60% randomization-shock
dip. The Light-Switch is the sole counter-weight: ant-favoring by
direction, magnitude `+2` (felt but bounded), self-extinguishing on
capture (no permanent stat wall, the spider controls the lever by
choosing whether to hold the switch). Keeps the dip a shaped ~60%, not
a ~54% cliff.

### Win-rate prediction

The five spider deltas drive L4 from L3 ~68% toward ~54–56% ant if
unanswered (POST-randomization is the dominant driver — defeats ant
pre-planning; plane-switch full strength + venom-blast weak + combo
components add the rest). The ant-favoring Light-Switch `+2`, live by
default in a no-flank attrition corridor, returns roughly **+4 to +6pp
ant**, settling L4 at **~60%** — preserving monotone L3 (~68%) → L4
(~60%) and landing the licensed randomization-shock spike exactly on the
mechanic-distribution plan §4 target. A spider-favoring switch overshoots
the dip to ~52–54% (cliff, spike breach); an ant `+3` under-corrects the
dip away (~66%, monotone-up violation); `+2` is the integer that holds
~60%.

### Interest claim

The corridor is the hardest geometry the ant has faced — no flank,
randomized objectives, a flanking enemy. The ant-favoring,
self-extinguishing Light-Switch makes that hardness _fair-feeling and
legible_: the player sees the enemy holding the lights, feels the bonus
while pushing through the dark, and earns the corridor by taking the
switch (crutch then self-extinguishes). The ant doctrine — push, commit,
take the objective — taught by the hardest early-tier room, with the
difficulty visible and the answer in the player's hands. Pro-ant
pedagogy, not an unearned subsidy; the §6.2 "enemy got more dangerous,
and here is your answer" closure, not the boring-but-balanced or the
feel-bad-unfair failure modes.

### Convergence

All placements **conceded** (ruled, uncontested: plane-switch L4 full
strength, venom-blast L4 weak, combo-components L4, randomization L4).
Single residual contest: the Light-Switch `combatModifier` direction +
magnitude — hold `litOwner: "spider"` / `faction: "ant"` / `attack: +2`,
with venom-blast "weak" pinned to a real data-cap and the combo
_abilities_ roster-gated out of L4.
