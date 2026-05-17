# Ant Faction Sub-Agent — L3 Kitchen Mechanic Delta (Opening + Rebuttal)

**Debate:** L3 (Kitchen) mechanic delta vs L2, per roadmap §6.2.
**Author:** Ant Faction Sub-Agent (advocate, not arbiter).
**Arbiter:** Gameplay Progression Agent.
**Scope:** the L3 plane-affinity debut only. Bio-evolution + charisma
promotion at L3 are §3.4.5-locked and already ruled (mechanic-distribution
plan §3.C, "class change arrives" = one concept) — not relitigated here.
**Builds on (does not repeat):** `ant-advocate-opening.md`,
`ant-advocate-rebuttal.md`, mechanic-distribution plan §3.B (the recorded
L3 ruling: plane-affinity, L3-weak, 3–5pp, ramping to full corner coverage
by L5).
**Binding constraints honored:** §3.1 hard floors, §3.4 cumulative-addition,
§5 curve, §6.3 ownership (this is Gameplay-owned; Kitchen geometry is the
Level PA's and not designed here).

---

## 1. Natural-language argument — opening

### The ant doctrine at L3

My through-line is unchanged from the opening brief: the ant experience is
a logistics-and-tempo puzzle, not a slugfest, and the curve falling from
~75% toward ~50% is that fantasy maturing, not breaking. At L3 I am not
fighting the _placement_ of plane-affinity — that converged in round 2 (my
rebuttal §1.6 conceded the L4 gate only for plane-_switch_; I never rebutted
the spider's stat-rule symmetry on plane-_affinity_, and silence is
concession). L3-weak plane-affinity is ruled and I accept it. What I
advocate here is the **shape of the L3 delta**: which templates move, on
which planes, and by how much, so that the 3–5pp spider lean is _legible
and bounded_ rather than a quiet curve-bender.

The baseline matters. L2 already ships a `planeAffinity` table (data/level-2
/units.json): ants are `floor +1/+1, ceiling −1/0`, spiders are mirror
`floor −1/0, ceiling +1/+1`, and **every `wall` row is `0/0` for both
factions.** That is the critical fact. Plane-affinity is _already on_ as a
floor/ceiling gradient. The honest L3 delta is therefore not "introduce
plane-affinity" — it is "the dead `wall` row wakes up, weakly, on the two
wall planes the Kitchen actually uses." This is the smallest possible
one-room change and I want the arbiter to hold the spider to exactly that
small a step.

### What the L3 Kitchen delta should be — the ant position

The Level PA's L3 (level-progression-plan.md §2, L3) is a 10×10 with a
**reduced 4-plane set: floor, ceiling, north-wall, east-wall**, a center
island, two lanes, and a Counter-Edge objective POST the defender reaches
via interior lines (slight spider nudge — the Level PA's own framing). The
schema collapses all four wall planes into one shared `wall` row, so
north-wall and east-wall _cannot be differentiated in data_ — any `wall`
affinity applies to both. That is fine and I will not pretend otherwise;
it bounds the delta naturally.

My position:

1. **The L3 delta is `wall`-row only.** Do **not** touch the floor or
   ceiling rows. They are the L2 baseline; changing them is two rooms of
   change, not one, and violates the "name what's new in one sentence"
   discipline I have invoked all tier. The one-sentence statement of L3 is:
   _"spiders fight slightly better off the floor — they get a small edge on
   the wall planes, not just the ceiling."_ That is one room's worth.

2. **Magnitude is `+1/0` for spiders on `wall`, and `−1/0` for ants on
   `wall`.** Not `+1/+1`. The armor sub-field stays `0` for the L3 debut.
   Reason from ant experience: an armor bonus on the wall planes compounds
   with the spider's _defensive_ interior-line advantage the Level PA
   already grants geometrically (Counter-Edge, island interior lines). A
   spider that is both positionally protected _and_ harder to kill on the
   wall is the multiplicative stack I warned about for POST-occupation in
   rebuttal §1.2. An _attack-only_ wall edge is a _pressure_ lever, not a
   _durability_ lever — it makes spiders bite harder when they flank to a
   wall plane, which is the readable, bounded version. The armor sub-field
   is where the L5 ramp-to-full lives (see §1, point 4), not L3.

3. **Only the L1-stripped-pair-descended _combat_ templates move.** The
   debut should touch the templates the player actually fields and fights
   at L3: `spider-soldier`, `spider-scout`, `spider-spinner`,
   `spider-elite` get the `wall +1/0`; `ant-footman`, `ant-archer`,
   `ant-potato-bug`, `ant-tank` get the `wall −1/0`. Leave the **queens
   untouched** (`ant-queen` is immobile and `spider-queen` web-defends —
   neither flanks to a wall plane as a doctrine, and moving the queen rows
   muddies the L1 heal-priority web-defense lesson the arbiter already
   ratified). Leave **support/caster ants** (`ant-worker`, `ant-scout`,
   `ant-mage`) at their existing weaker floor profile — they already carry
   `ceiling 0/0` not `−1/0`, i.e. the data already treats them as the
   off-floor-tolerant ant units; do not punish the ant's own
   plane-switchers on the wall, that double-taxes the faction's answer to
   asymmetry. Promoted variants inherit their base template's row (this is
   automatic and I flag it only so the spider cannot later claim the
   promoted set is an uncounted second delta).

4. **The L5 ramp is the armor sub-field plus the floor-row deepening.**
   "Full corner coverage by L5" (the ruled endpoint) means: at L5 the
   spider `wall` row goes `+1/0 → +1/+1` and the ant `floor` advantage is
   _not_ widened (ants do not get stronger; the gap closes by the spider
   catching up off-floor, which is the curve's intent). I state the L5
   endpoint now so the arbiter can confirm the L3 debut is genuinely the
   _weak_ end of a ramp and not the whole thing front-loaded.

### Why this serves the ant fantasy (interest)

A glass cannon is only fun if its losses are _legible_. An attack-only,
wall-only, combat-templates-only delta means the ant player who loses a
party on a wall plane can _see why_ — "I flanked into the spider's plane and
got bitten harder; next time I contest the lane on the floor where I'm
strong, or I bring the burst to end it fast." That is the ant doctrine
being taught by the terrain, which is exactly the pedagogy I argued L1's
heal-priority should deliver. A `+1/+1` wall debut, by contrast, teaches
"the spider is just tankier up there," which reads as an unearned stat wall
— the boring-but-balanced failure mode in §6.2.

### The win-rate floor at L3

The ruled target is ~68% (the mechanic-distribution plan §4 reconciliation:
L2 shipped at a measured 76%, L3 must land clearly below ~72% and near 68%
to preserve monotone L2→L3 descent into the licensed L4 ~60% spike). My
spec lands there _precisely because it is bounded to attack-only/wall-only_.
The spider will argue for `+1/+1` and cite "3–5pp." I price it: `+1/0` on
`wall` for the four spider combat templates, in a 4-plane Kitchen where
two of the four planes are wall and the defender's interior lines route
through them, is a clean **−3 to −5pp ant swing off the L2 76% → ~71–73%**
before the bio-evolution/promotion-neutral wash and the Kitchen geometry's
own slight spider nudge (Level PA's stated interior-line advantage) take it
the rest of the way to **~68%**. A `+1/+1` wall debut would overshoot to
~64–66% — _below_ the L4 ~60% spike's intended separation, flattening the
L3→L4 descent into a cliff. The arbiter's own §3.B ruling rationale ("the
split _shapes_ the descent") is the standard; attack-only is what shapes it.

---

## 2. Natural-language rebuttal — answering the spider's L3 brief

The spider will argue (consistent with its round-2 rebuttal §1.2) that the
stat-rule symmetry licenses a fuller debut and that `wall +1/+1` is "still
weak" because the spider kit lacks venom/blitz/hypnotize at L3. I concede
the symmetry — I never contested plane-affinity's L3 _placement_ and I do
not now. I contest only the spider's magnitude reach.

The spider's "weak because the kit is thin at L3" argument cuts the _other_
way. Precisely _because_ the spider has no venom-blast (ruled L4),
no hypnotize (ruled L5), no blitz (ruled L7) at L3, plane-affinity is the
spider's _only_ new L3 tooth. A faction's sole new lever should debut at
the bottom of its ramp, not the middle — that is the spider's own argument
for its own hypnotize (rebuttal: "first-contact full-power is a feel-bad;
a callback is a payoff"). Apply it symmetrically: `wall +1/0` at L3, the
armor sub-field arriving at L5, _is_ the callback structure the spider
demanded for its own tools. The spider cannot enforce the ramp discipline
selectively.

On "3–5pp": we do not actually disagree on the _target_. We disagree on
_which knob hits it_. Attack-only wall on four combat templates in a
two-wall-plane Kitchen already produces the −3 to −5pp the spider wants.
Adding the armor sub-field on top does not make it "3–5pp" — it makes it
−5 to −7pp, which the spider's _own_ rebuttal §1.2 reasoning rejects
("a 3–5pp spider lean lands L3 at ~65–67%, _preserving monotone descent_").
The spider's own number is my number. The armor field is what _breaks_ the
spider's own stated arithmetic. I am holding the spider to its own brief.

Net: I concede placement (ruled, uncontested). I hold magnitude to
attack-only/wall-only/combat-templates-only for the L3 debut, with the
armor sub-field and any deepening explicitly banked to the L5 ramp the
arbiter already ruled. This is convergence on the target and a contest only
on the instrument.

---

## 3. Structured summary

### Position

The L3 delta vs L2 is the **`wall`-row only**, **attack-only** (`spider
combat templates: wall +1/0`; `ant combat templates: wall −1/0`; armor
sub-field stays `0`), touching only the L1-descended **combat** templates
(spider-soldier/scout/spinner/elite; ant-footman/archer/potato-bug/tank).
Queens and ant support/casters untouched. Floor and ceiling rows unchanged
from the L2 baseline. The armor sub-field and full corner coverage are
explicitly banked to the **L5 ramp** (already ruled).

### Faction impact

Accepts a real, bounded anti-ant pressure tax on the wall planes the
Kitchen's two-lane interior-line geometry routes the defender through.
Attack-only keeps it a _pressure_ lever, not a _durability_ lever, so it
does not multiplicatively stack with the spider's geometric interior-line
advantage into a curve-bender — the same multiplicative-stack guard I held
on POST-occupation in rebuttal §1.2.

### Win-rate prediction

Attack-only wall on four spider combat templates in the 4-plane (two-wall)
Kitchen: **−3 to −5pp ant off the L2 measured 76%**, landing **~71–73%**
pre-geometry, settling to **~68%** after the bio-evolution/promotion-neutral
wash and the Level PA's stated slight spider interior-line nudge. Preserves
monotone L2 (76%) → L3 (~68%) → L4 (~60%) descent. A `+1/+1` wall debut
overshoots to ~64–66%, flattening L3→L4 into a cliff — rejected on the
_spider's own_ §1.2 arithmetic.

### Interest claim

Legible loss. An attack-only, wall-only, combat-only delta lets the ant
player _see_ why a party died on a wall plane (flanked into the spider's
plane, got bitten harder — contest on the floor next time, or burst to end
it fast). That is the ant doctrine taught by terrain — pro-ant pedagogy,
not an unearned stat wall. `+1/+1` teaches "spiders are just tankier up
there," the §6.2 boring-but-balanced failure mode.

### Convergence

Placement **conceded** (ruled, uncontested — I never rebutted the stat-rule
symmetry). Magnitude **contested**: hold attack-only/wall-only/combat-only
for the L3 debut; bank the armor sub-field and deepening to the ruled L5
ramp.
