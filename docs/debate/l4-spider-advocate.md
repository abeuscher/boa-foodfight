# Spider Faction Sub-Agent — L4 Hallway Mechanic Delta (Opening + Rebuttal)

**Debate:** L4 (Hallway) mechanic delta vs L3, per roadmap §6.2.
**Author:** Spider Faction Sub-Agent (advocate, not arbiter).
**Advocate for:** the SPIDER experience, mechanical identity, and the
enemy-AI's job of providing escalating challenge.
**Scope:** the L4 delta only — asymmetric plane-switch (full strength),
POST-randomization, the combo components, venom-blast (weak debut), and
the Light-Switch flip-state POST combat-modifier payload. The ruled L3
`wall` plane-affinity state carries forward **unchanged** and is **not
relitigated** — L4 adds its delta on top.
**Builds on (does not repeat):** `spider-advocate-opening.md`,
`spider-advocate-rebuttal.md`, `l3-spider-advocate.md` (the
stat-rule-symmetry / "weak must not be tuned to absent" through-line),
mechanic-distribution plan §2 (the L4 row), §3.D / §3.I, §5 (boundary
case #1).
**Binding constraints honored:** §3.1 hard floors, §3.4
cumulative-addition, §5 curve, §6.3 ownership (Gameplay-owned; Hallway
geometry / Doorway jitter is the Level PA's, not designed here), §4b
engine freeze (data-only).

---

## 1. Natural-language argument — opening

### L4 is the spider's signature room — the randomization shock is the spec working

My round-1 through-line stands: the curve must close because the _enemy
got more dangerous_, not because the player out-leveled a statue (§6.2,
boring-but-balanced). L4 is the single most important scenario in the
early tier _for that thesis_. Roadmap §5 prices it at ~60% and calls it
the "POST randomization shock — spike toward spider." The Level PA built
the geometry to deliver exactly that: a single-axis no-flank corridor
with three seed-jittered Doorway POSTs that "defeat pre-planning →
randomization shock toward spider" (level-progression-plan §2 L4). This
is the scenario the whole roadmap hands the defending faction. My job
here is not to make L4 harder than the curve wants — it is to defend the
_substance_ of the spider's signature room so "the licensed dip" does not
get tuned back up into "another room the ants stroll through."

I am not relitigating placement. Plane-switch at L4 full strength
(range-limited) is ruled §3.I. Venom-blast L4-weak is ratified §3.D. The
combo components at L4 are ruled. POST-randomization at L4 is the
roadmap's. All conceded. The single contested integer-and-direction is
the same kind of residual the L3 debate collapsed to: the Light-Switch
`combatModifier` payload, which the arbiter has not yet set.

### The Light-Switch must favor the SPIDER — it is the randomization shock's teeth

The schema (`engine/schemas/map.ts`) is `{ litOwner, faction, attack }`:
while the POST is not owned by `litOwner`, every unit of `faction` gets
`+attack` engine-wide. The ant will demand it favor ants — that it is the
ant's "counter-pressure answer" to a hard room. I contest, hard.

L4's identity, by the roadmap's own words, is _randomization shock toward
spider_. The randomization is the spec's mechanism for the spider's
defensive-ambush identity in a room with no flank: the ant cannot
pre-plan the approach because the Doorways move; the spider, defending
fixed regions, does not care where the Doorway lands because it is
already there. That is the spider fantasy this room exists to deliver.
The Light-Switch is the _legible signature_ of that shock — the moment
the player feels "I cannot rely on the room being what I expected." If
the one free combat lever in this room points at the _ant_, the
signature scenario's signature mechanic _rewards the side the room is
built to disadvantage_. That inverts the spec at the exact scenario
where the spec's defending-faction identity should be loudest — the same
inversion error I named at L3 ("a spider that pokes from the high ground
and folds inverts the spec's defending-faction identity at the exact
scenario where it should be clearest"). L4 is that argument again, one
scenario louder.

The spider position on the payload:

- **`litOwner: "ant"`.** The lever should be _the ant's to lose_, not
  the spider's to lose. The ant is the attacker pushing the corridor;
  the natural narrative and tactical reading is that the ant controls
  the lights it is marching toward, and the spider defenders fight
  _harder in the dark when the ants have not yet secured the switch_.
  So: while the ant does **not** own the Light-Switch, the spider gets
  the bonus. The ant must _capture and hold_ the switch to extinguish
  the spider's edge — a real objective in a room whose whole point is
  that objectives are hard to plan around.
- **`faction: "spider"`.** While the switch is unlit (ant-uncaptured),
  every spider unit gets `+attack` engine-wide. This is the
  randomization shock with teeth: the corridor is dark, the Doorways
  moved, and the defenders are _more dangerous_ until the ant fights to
  the switch. That is "the enemy got more dangerous" (§6.2's good
  closure) made _perceptible_ — the player can name exactly why the hard
  room is hard and exactly what to do about it (take the switch).
- **`attack: +2`.** Same magnitude logic the ant will (correctly) make,
  applied in the spider's favor. `+1` is below the perceptual floor in a
  room this noisy — the signature lever of the signature room must be
  _felt_ or the randomization shock reads as random noise rather than a
  legible spider threat. `+3` over-corrects past the licensed ~60% into
  a true ant-loss zone (~54%), which I do **not** ask for — that breaches
  the spike downward and I will not over-reach it, exactly as I did not
  over-reach `ant wall −1/−1` at L3. `+2` is the integer that delivers
  the ruled ~60% spike: felt, legible, bounded, self-extinguishing the
  moment the ant earns the switch.

The one-sentence statement (the §3.4.3 "name what's new" test): _"the
hallway is dark and the doorways moved — the defenders hit harder until
you fight your way to the light switch and flip it."_ One room of change,
one legible lever, spider-favoring because L4 _is_ the spider's licensed
spike and the lever is the spike's teeth.

### Why this serves the spider fantasy (interest)

The spec spider is the defending, ambushing faction, and L4 is the first
scenario the roadmap explicitly designates as _theirs_ ("spike toward
spider"). Every prior room has been the ant's: L1 tutorial (~75%), L2
escort (76% measured), L3 Kitchen (~68%, a slight spider nudge but still
ant-favored). L4 is where the spec's promise — that the defender becomes
genuinely dangerous — is supposed to land for the first time. If the one
free combat lever in the spider's own signature room favors the ant, the
spider's arc has _no_ scenario in the entire early tier where it is the
favored side, and the curve closes for the boring reason (the ant
out-tools a static defender) rather than the interesting one (the
defender got dangerous). A spider-favoring Light-Switch is the difference
between L4 _feeling_ like the licensed shock and L4 being "a slightly
annoying corridor." The randomization shock without combat teeth is
cosmetic — the same "dead flavor" critique I made of a height POST with
no plane-affinity at L3, now applied to a shock POST with no combat
payload.

### The win-rate target

Roadmap §5 and mechanic-distribution plan §4 both price L4 at ~60%, the
licensed randomization-shock spike, monotone below L3 ~68% and above L5
~64%. The five ruled spider-favoring components (plane-switch full
strength range-limited, venom-blast weak, combo components, randomization)
move L3 ~68% toward the low ~60s on their own. The Light-Switch is what
makes that movement _legible and on-target_: spider-favoring `+2`, live
until the ant captures the switch, holds L4 at the ruled **~60%** with
the dip _perceptible_ rather than a quiet statistical drift. An
ant-favoring switch would push L4 back toward ~64–66% — _erasing_ the
licensed spike, flattening monotone L3→L4 into a near-equal step, and
making the spider's one signature scenario disappear into the curve. The
spider does not ask to exceed ~60%; it asks that ~60% be _delivered by
the spider getting more dangerous_, which is the only spec-faithful and
interesting way to deliver it.

---

## 2. Natural-language rebuttal — answering the ant's L4 brief

The ant's brief is disciplined and concedes every placement. It contests
exactly one thing: the Light-Switch direction, arguing it must favor ants
because "every other delta favors the spider" and the corridor is the
hardest geometry the ant has faced — so the ant needs a "self-
extinguishing counter-pressure lever." I rebut on three points.

**First — "five deltas favor the spider, so the sixth must favor the
ant" proves too much.** By that logic no scenario could ever be the
spider's, because every scenario adds spider-relevant mechanics on the
closing-curve schedule. The roadmap did not say "balance L4 internally."
It said L4 is the ~60% _spike toward spider_ — a scenario the curve
_designs_ to favor the defender, the "occasional surprising spike — a
hard level before the end" the user explicitly licensed (§5). The ant's
framing treats L4 as a room that must be made fair component-by-component;
the roadmap treats L4 as the room that is _deliberately_ the spider's.
The five spider deltas are not an imbalance to correct with a sixth
ant-favoring lever — they _are the licensed spike_, and the Light-Switch
is its legible signature, not its counterweight. Counterweighting the
licensed spike is precisely the "force it back to spec" move §5
prohibits.

**Second — "escalation with an answer" is already satisfied, and the
answer is the capture, not the bonus direction.** The ant invokes §3.D's
"escalation with an answer." The answer is _in the room_: the ant can
**capture the Light-Switch** and extinguish the spider edge. That is a
concrete, legible, in-room answer — exactly the §3.D structure. The ant
conflates "the ant has an answer" with "the bonus must point at the ant."
It need not. A spider-favoring switch the ant can _turn off by capturing
it_ is escalation (spiders dangerous in the dark) _with an answer_ (take
the switch). The ant's own self-extinguishing design works _better_ in
the spider's favor: it gives the ant a clear objective (the switch) whose
capture is the answer, in a room whose entire identity is that objectives
are hard to plan around. An ant-favoring switch, by contrast, _rewards
the ant for nothing_ — the ant gets the bonus by default for being
attacked, with the "answer" being to stop benefiting from it. That is not
escalation-with-an-answer; it is a subsidy with an off-switch the ant has
no reason to flip.

**Third — the magnitude is not contested; we agree on `+2`.** Note the
ant and I _independently_ converged on `attack: 2` and on the
self-extinguishing flip-on-capture structure, and both of us explicitly
rejected `+3` as a spike-breaching over-correction. The entire residual
dispute is _direction_: `litOwner`/`faction` ant-favoring (ant) vs
spider-favoring (spider). This is the exact convergence profile the §6.2
format is built to produce — the adversarial exchange has collapsed a
five-component room to a single binary: which side does the one free
combat lever favor. I concede, genuinely: all five placements (ruled);
`attack: +2` not `+3` (mutual, neither over-reaches); the flip-on-capture
self-extinguishing structure (the ant's framing, and it is correct — it
makes the lever bounded and the capture meaningful); plane-switch
range-limited at L4 with full corner coverage banked to L6 (ruled §3.I,
agreed); venom-blast a real data-capped weak burst (agreed); combo
_abilities_ roster-gated out of L4, components only (agreed — Venom
Storm is the L7 escalation, my own runway test). The single residual
contest is one direction: the Light-Switch favors the spider, because L4
is the licensed spike toward spider and the lever is the spike's teeth,
not its counterweight.

---

## 3. Structured summary

### Position

The L4 delta vs L3 carries the ruled L3 `wall` plane-affinity forward
**unchanged** and adds the five ruled components (plane-switch full
strength range-limited; venom-blast weak data-capped burst; combo
components only; POST-randomization, Level-owned). The single contested
payload: **Light-Switch `combatModifier` =
`{ litOwner: "ant", faction: "spider", attack: +2 }`** — spider-favoring,
live until the ant captures the switch, the legible teeth of L4's
licensed randomization-shock spike.

### Faction impact

L4 is the first and only early-tier scenario the roadmap designates as
the spider's (the ~60% spike toward spider). A spider-favoring
Light-Switch makes the defender genuinely more dangerous in the dark
corridor — the spec's defending-ambush identity finally landing as the
favored side, exactly once, as the curve licenses. The ant's answer is
the capture (a real in-room objective), not the bonus direction.
Self-extinguishes on ant capture — bounded, the ant controls when it
ends.

### Win-rate prediction

The five ruled spider deltas move L3 ~68% toward the low ~60s. A
spider-favoring Light-Switch `+2`, live until the ant fights to the
switch, holds L4 at the ruled **~60%** with the dip _legible_ rather
than a quiet drift — monotone L3 (~68%) → L4 (~60%) → L5 (~64% rebound)
preserved exactly per mechanic-distribution plan §4. An ant-favoring
switch pushes L4 back toward ~64–66%, erasing the licensed spike and
flattening L3→L4 into a non-event; `+3` either direction breaches the
spike — `+2` spider-favoring is the integer that delivers the on-target
~60% _by the spider getting more dangerous_, the only spec-faithful way
to deliver it.

### Interest claim

L4 is where the spec's promise — the defender becomes genuinely
dangerous — lands for the first time in the tier. A spider-favoring
Light-Switch makes the randomization shock _perceptible and legible_:
the corridor is dark, the doorways moved, the defenders hit harder until
you fight to the switch. That is §6.2's good closure ("the enemy got
more dangerous") made nameable, and the user's explicitly-licensed "hard
level" spike landing as designed. An ant-favoring switch makes the
spider's one signature room a subsidy with an off-switch — the
boring-but-balanced failure mode wearing the ant's "fairness" label.

### Convergence

All five placements **conceded** (ruled). `attack: +2` not `+3`
**mutual** (neither over-reaches; both reject `+3` as spike-breaching).
Flip-on-capture self-extinguishing structure **conceded** (the ant's
framing, correct). Plane-switch range-limited L4 / full coverage L6,
venom-blast data-capped weak, combo-abilities roster-gated out of L4 —
**all conceded**. Single residual contest: Light-Switch _direction_ —
`litOwner: "ant"` / `faction: "spider"` (spider) vs `litOwner: "spider"`
/ `faction: "ant"` (ant).
