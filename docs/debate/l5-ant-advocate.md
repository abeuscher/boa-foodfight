# Ant Faction Sub-Agent — L5 Bedroom Mechanic Delta (Opening + Rebuttal)

**Debate:** L5 (Bedroom) mechanic delta vs L4, per roadmap §6.2.
**Author:** Ant Faction Sub-Agent (advocate, not arbiter).
**Arbiter:** Gameplay Progression Agent.
**Scope:** the L5 delta only — (a) the ruled L3-banked plane-affinity
ramp finalizing at L5 (spider combat `wall +1/0 → +1/+1` armor sub-field

- full corner coverage); (b) hypnotize light debut (duration-capped,
  ruled §3.H); (c) recruit-as-order, charisma-gated (ruled §3.C); (d) the
  Under-Bed concealment / fog-immunity garrison (Gameplay-owned per
  level-progression-plan §4a override). The L4 state — `wall`
  plane-affinity at the L3-ruled values, plane-switch range-limited,
  venom-blast weak data-capped, combo components, the Light-Switch
  payload — carries forward **unchanged** and is **not relitigated**.
  **Builds on (does not repeat):** `l3-ant-advocate.md`,
  `l4-ant-advocate.md`, `docs/debate/l3-gameplay-pa-arbitration.md` §4
  (the banked L5 ramp), `docs/debate/l4-gameplay-pa-arbitration.md` (the
  L4 baseline), mechanic-distribution plan §2 (the L5 row), §3.B
  (plane-affinity → full corner coverage at L5), §3.C (recruit-as-order
  → L5), §3.H (hypnotize light debut → L5, duration-capped), §5 (boundary
  case #2: Under-Bed concealment, Gameplay-owned).
  **Binding constraints honored:** §3.1 hard floors, §3.4
  cumulative-addition, §5 curve (L5 ≈ 65%, a **rebound up** from L4 ~60%
  — the curve is non-monotone here by design), §6.3 ownership (this is
  Gameplay-owned; Bedroom geometry / bed bisection / concealment-POST
  _placement_ are the Level PA's and not designed here), §4b engine
  freeze (data-only — concealment dep #7 already implemented, semantics
  fixed; no new engine code).

---

## 1. Natural-language argument — opening

### The ant doctrine at L5, and why L5 is the rebound

My through-line is unchanged: the ant experience is a
logistics-and-tempo puzzle, and the curve falling toward ~50% by L10 is
that fantasy maturing, not breaking. But L5 is not a dip and I will not
let it be tuned as one. L4 was the licensed randomization-shock spike —
I conceded it, I fought only to keep it a shaped ~60% and not a cliff.
L5 is the deliberate **rebound**: roadmap §5 and mechanic-distribution
plan §4 both price it at ~65%, _above_ L4, "player adapts; concealment
is a player-favorable tool." The curve is explicitly non-monotone here.
This is the user's licensed structure — a hard level, then the player
gets a real tool and the curve breathes back up before descending
again. My job at L5 is to make sure the rebound is _real and earned by
a player-favorable mechanic_, not a flat re-tune, and that the one
genuinely new ant tool — Under-Bed concealment — is given the weight
the curve assigns it.

### Under-Bed concealment is the rebound, and it is the ant's tool

The headline L5 mechanic from the ant's chair is the Under-Bed
concealment POST. The Level PA owns its tile placement and the bed
bisection (level-progression-plan §2 L5); the human resolver assigned
the _fog-immunity rule itself_ to Gameplay (§4a override — concealment
is an information-warfare mechanic, it manipulates the spider-AI
pheromone-trail visibility layer, TBS §1.5). The engine dependency
(#7) is already implemented and its semantics are fixed: **an ant party
garrisoned on a `concealment` POST emits no pheromone trail, denying
the spider's trail-scouting.**

This is _the_ player-favorable info-denial tool of the early tier, and
it is structurally an ant tool. The spec spider is the
defending-ambush faction whose whole identity is _information_ — it
holds, it scouts the ant's pheromone trail, it ambushes the column it
saw coming. Under-Bed is the first mechanic that lets the ant _deny the
spider its read_. An ant party that stages through Under-Bed arrives at
the Dresser-Top objective without having painted a trail the spider
scout AI can follow. That is not a stat buff — it is the ant finally
getting to do to the spider what the spider has done to the ant since
L2's pheromone-erasure debut: control what the enemy knows.

The win-rate weight is real and I want it priced as real. The §5
rebound from ~60% to ~65% is _this mechanic_. Concealment denies the
spider's trail-scout the very input its defensive-ambush AI runs on; a
spider that cannot pre-position against the ant's approach loses the
interior-line advantage the L3/L4 geometry handed it. My estimate:
Under-Bed contributes **+4 to +6pp ant** as a clean,
player-favorable swing — and that is the entire mechanism of the
licensed rebound. It must not be under-tuned into a cosmetic
"the fog looks different over there" — the exact "dead flavor" failure
the spider itself named at L3 for a height POST with no plane-affinity,
applied here to a concealment POST with no real scouting consequence.

### The plane-affinity ramp finalizes — and it is the spider catching up, not the ant

The L3 arbitration §4 explicitly banked the L5 plane-affinity step and
stated its forward-consistency spec: at L5 the spider combat `wall` row
deepens `+1/0 → +1/+1` (the banked armor sub-field) and the gradient
reaches full corner coverage; **ants do not get stronger at L5; the
gap closes by the spider catching up off-floor.** I do not reopen this
— it is pre-ruled and I ratify it. I only hold the arbiter to its own
stated structure on three points:

1. **It is spider-favoring and I accept it as such.** The armor
   sub-field `+1` on the four spider combat templates' shared `wall`
   row, plus full corner coverage, is the spider's banked L3 payoff
   landing at its designed home — the Bedroom, the first scenario
   reopened to all 6 planes (level-progression-plan §2 L5), where
   off-floor affinity finally has the plane space to matter. This is
   the callback structure the spider argued for its own tools and the
   L3/L4 arbitrations applied symmetrically. I do not begrudge it.

2. **Ants stay exactly where L4 left them.** The ant combat `wall` row
   stays `−1/0` (the L3-ruled value, L4-carried). Ant floor/ceiling
   rows stay byte-identical to L4. Queens, ant support/casters
   (`ant-worker`, `ant-scout`, `ant-mage`, `ant-archmage`,
   `ant-scout-elite`), and all neutrals stay `wall 0/0`. The gap closes
   _upward on the spider side_, not by docking the ant — the curve's
   intended closure mechanism ("the enemy got more dangerous," §5),
   not an ant nerf.

3. **The ramp's spider swing is _budgeted against_ the concealment
   rebound, not stacked on top of a dip.** This is the load-bearing
   point. At L4 the spider-favoring deltas all landed _into_ a licensed
   dip. At L5 the spider's plane-affinity completion lands _against_ a
   player-favorable rebound mechanic. The net must read ~65% — _above_
   L4 — which means the concealment swing must be priced as the
   dominant L5 driver and the affinity-armor step priced as the
   counter-pressure that keeps the rebound from over-shooting back to
   ~70%. The armor sub-field is small (`+1` on one shared row, one
   sub-field) precisely so the rebound stays a rebound.

### Hypnotize light debut and recruit-as-order — both must be real but bounded

- **Hypnotize light debut (ruled §3.H, duration-capped).** The
  arbiter ruled hypnotize debuts _light_ at L5 with the control
  duration as a real data-cap, not only neutral-density — "a short
  hypnotize the ant can play around teaches the concept without losing
  a committed party decisively." I hold the arbiter to that. The
  engine's locked spec values are `minControlTurns 5, maxControlTurns
10` (`engine/abilities.ts` HYPNOTIZE*MIN/MAX_TURNS;
  `data/level-4/abilities.json` `hypnotize.params`). "Light debut" is
  meaningless unless the L5 `data/level-5/abilities.json` caps that
  control window hard — my ask: `maxControlTurns` capped to **3**
  (and `minControlTurns` ≤ that), so a hypnotized neutral is a
  recoverable nuisance, not a stolen party. L8 is where hypnotize goes
  to full power as its designed climax (ruled §3.H; §4.3.3) — three
  scenarios of runway. A first-contact full-power hypnotize at L5 is
  the feel-bad the \_spider itself* disclaimed; the cap is the
  learner-safety knob and it must be a number in the data, not a
  gesture.

- **Recruit-as-order, charisma-gated (ruled §3.C).** Placement is
  ruled L5 and I do not reopen it — the spider won the slot, the ant
  won the underlying goal (fluency before the L8 recruit-or-die spike,
  §4.3.3, on a low-stakes map where a mis-timed recruit costs nothing).
  Recruit already exists in data (`recruit`, `successRate 0.25`,
  `tier 2`, `cooldown 2`; `engine/abilities.ts` `handleRecruit`). The
  L5 delta is making it a _fielded order_ on a charisma-gated carrier
  (the `ant-mage`/`ant-archmage` line, `leader-eligible`, the L3
  charisma-promotion carriers), not a param inflation — the existing
  25% rate and tier-2 cost are already the weak end and must stay
  there at L5. This is win-rate-neutral by the §3.C ruling
  (~0pp; decided on §3.4.3 cognitive load, not balance) and I
  affirm that — recruit-as-order is _army-building tempo fluency_, a
  pedagogical runway to L8, not an L5 power injection.

### Why this serves the ant fantasy (interest)

A glass cannon's comebacks must be _earned_ and its tools must be
_legible_. L4 was the hardest, most disorienting room — no flank,
randomized doorways, a flanking enemy. L5 is the room where the player
learns the answer to _that_ kind of pressure is _information control_,
not more attack. The bed bisects the floor; the ceiling is the premium
route; Under-Bed is a plane-transition-only garrison that makes the
ant's approach unscoutable. The player who lost parties to a spider
that always seemed to know where they'd be at L4 learns at L5 that the
counter is to _stop being seen_ — stage through Under-Bed, deny the
trail, arrive unread. That is the ant doctrine — out-think, don't
out-slug — taught by a player-favorable mechanic, with the rebound
_earned by using the tool well_, not handed by a stat re-tune. The
spider's plane-affinity completion is the legible "enemy got more
dangerous on its own planes" counter-pressure that keeps the room from
being a free ride; both factions get a real new thing and the curve
breathes up because the _player gained a tool_, exactly the §5
non-monotone structure the user licensed.

---

## 2. Natural-language rebuttal — answering the spider's L5 brief

The spider will argue (consistent with its identity brief) that the
plane-affinity completion is _its_ L5 payoff and should be tuned to
register loudly, that Under-Bed concealment over-corrects the curve and
"erases the spider's information identity at the exact scenario the
spec hands the defender its read," and that hypnotize-light should not
be capped so hard it is "tuned to absent." I rebut on three points.

**First — Under-Bed does not erase the spider's information identity;
it _answers_ it, in the room built for the answer.** The spider's
information identity has had four scenarios of uncontested run:
pheromone-erasure (L2), the L3/L4 geometry that handed the defender
interior lines, the randomization shock (L4). The spec spider's read is
not erased by Under-Bed — it is _contested for the first time_, on one
POST, reachable only via plane-transition (the bed blocks the floor;
level-progression-plan §2 L5). The spider still scouts every ant party
_not_ garrisoned on Under-Bed, every turn, everywhere else. This is the
exact "escalation with an answer" doctrine the arbiter ratified for
venom-blast at §3.D and applied to the Light-Switch at L4 §3.2: the
escalation was four scenarios of spider information dominance; the
answer-in-the-room is one concealment POST. The spider cannot invoke
escalation-with-an-answer for its own tools and then deny the ant the
one answer the §5 curve _explicitly prices as the rebound_.

**Second — the plane-affinity completion is _pre-ruled_ and I have
already ratified it; the spider cannot relitigate magnitude upward.**
The L3 arbitration §4 fixed the L5 ramp's shape: `wall +1/0 → +1/+1`
(one sub-field, one shared row) and full corner coverage, with the
explicit constraint that _ants do not get stronger_ and the gap closes
by the spider catching up. That is a small, bounded, _banked_ step —
the spider's own L3-won callback, delivered exactly as specified. The
spider arguing at L5 that the armor sub-field should be tuned to
register _loudly_ is the same over-reach the spider correctly _declined_
at L3 (it did not push `ant wall −1/−1`) and at L4 (it did not push
`+3`). The ramp registers because it lands at its designed home (6
planes reopened, off-floor affinity finally spatially live) — not
because it is inflated past `+1`. Inflating it past the ruled values
re-opens a settled arbitration and over-shoots the licensed ~65%
_downward_ into an unlicensed second dip, breaking the §5 rebound the
exact way a spider-favoring Light-Switch would have broken L4.

**Third — the hypnotize cap is the learner-safety floor, not "tuned to
absent," and the spider's own L3 doctrine demands it.** The spider's
through-line since L3 is "weak must not be tuned to absent." Agreed —
and symmetric: _light must not be tuned to catastrophic_. A
duration-capped hypnotize at `maxControlTurns 3` is not absent: it
still seizes a neutral party 80% of the time, still costs the caster
half its HP, still teaches the entire mechanic (you can lose control of
a neutral; play around it). It is simply _recoverable_ — the player who
mis-positions loses a neutral for ≤3 turns, not a committed party for
5–10. The spider's _own_ strongest interest argument — "first-contact
full-power at the hardest scenario is a feel-bad; a previously-met
mechanic at its designed climax is a payoff" — is _the_ argument for
the cap: L8 is hypnotize's designed climax (§4.3.3, full power), L5 is
first contact. Capping L5 is precisely honoring the spider's own
callback doctrine. The number that makes "light" real is
`maxControlTurns: 3`; anything looser is the feel-bad the spider
disclaimed wearing a "weak must not be absent" label.

Net: I concede every placement (all ruled — plane-affinity full corner
coverage L5, hypnotize light L5, recruit-as-order L5, Under-Bed
concealment L5 Gameplay-owned). I ratify the pre-ruled plane-affinity
ramp at its banked values (`spider combat wall +1/0 → +1/+1`, full
corner coverage, ants unchanged). I contest exactly two tunables the
arbiter has not yet fixed in data: (a) the Under-Bed concealment
win-rate weight must be priced as the _dominant_ L5 driver and the
mechanism of the licensed ~65% rebound (not under-tuned to cosmetic);
(b) the hypnotize-light control-duration cap must be a hard data number
— `maxControlTurns: 3` — not a placement gesture.

---

## 3. Structured summary

### Position

The L5 delta vs L4 carries the L4 state forward **unchanged** and adds:
the **pre-ruled plane-affinity ramp finalized** (spider combat `wall
+1/0 → +1/+1` armor sub-field + full corner coverage; ants, queens,
ant support/casters, neutrals unchanged — ratified, not relitigated);
**hypnotize light debut** (duration-capped, `maxControlTurns: 3` —
a hard data-cap, not a gesture); **recruit-as-order, charisma-gated**
(existing 25%/tier-2 recruit fielded as an order on the
`ant-mage`/`ant-archmage` charisma-promotion carriers; win-rate-neutral
army-building fluency, ruled §3.C); and the **Under-Bed concealment /
fog-immunity garrison** (Gameplay-owned per §4a override; the
player-favorable info-denial tool that is the mechanism of the §5
rebound).

### Faction impact

Under-Bed is the ant's first real information-denial tool — it lets the
ant deny the spider's trail-scout its input, contesting the spec
spider's four-scenario information dominance for the first time, on one
plane-transition-only POST. It is the player-favorable mechanic the §5
curve prices as the ~60% → ~65% rebound. The plane-affinity completion
is the spider catching up off-floor at its designed home (6 planes
reopened) — accepted as the curve's "enemy got more dangerous" closure,
budgeted _against_ the rebound so the net reads ~65% (above L4), not a
second dip. Hypnotize-light and recruit-as-order are bounded,
pedagogical L8 runway — neither an L5 power injection.

### Win-rate prediction

L4 lands ~60% (the licensed spike). L5 **rebounds up to ~65%** — a
deliberate non-monotone step, not a descent. Driver: Under-Bed
concealment **+4 to +6pp ant** (the dominant L5 swing — denies the
spider trail-scout the input its ambush AI runs on; this _is_ the
licensed rebound). Counter-pressure: plane-affinity completion
(`spider wall +1/0 → +1/+1` + full corner coverage) **−2 to −3pp ant**
(the banked L3 spider payoff at its designed 6-plane home; ants
unchanged — the gap closes by the spider catching up). Hypnotize light
(`maxControlTurns 3`) ≈ **−1pp** (negligible inside the rebound, ruled
§3.H). Recruit-as-order ≈ **0pp** (army-building tempo, ruled §3.C
win-rate-neutral). Net: ~60% + (4 to 6) − (2 to 3) − ~1 ≈ **~65%**,
the licensed rebound, monotone constraint _not_ in force here (L4 → L5
is the licensed non-monotone recovery; the binding monotone segment was
L3 → L4, which held).

### Interest claim

L5 teaches the answer to L4's disorientation is _information control,
not more attack_. The player who lost parties to a spider that always
knew where they'd be learns to stop being seen — stage through
Under-Bed, deny the trail, arrive unread. The rebound is _earned by
using a player-favorable tool well_, not handed by a stat re-tune; the
spider's plane-affinity completion is the legible counter-pressure that
keeps L5 from being a free ride and delivers the spider its banked L3
payoff at its designed home. Both factions get a real new thing; the
curve breathes up because the _player gained a tool_ — exactly the §5
licensed non-monotone structure ("the player adapts; rebound"), the
§6.2 good closure, not the boring-but-balanced or feel-bad failure
modes.

### Convergence

All placements **conceded** (ruled, uncontested: plane-affinity full
corner coverage L5, hypnotize light L5, recruit-as-order L5, Under-Bed
concealment L5 Gameplay-owned). Pre-ruled plane-affinity ramp
**ratified at its banked values** (not relitigated). Two residual
tunables the arbiter has not yet fixed in data: (a) Under-Bed
concealment win-rate weight priced as the _dominant_ L5 driver and the
mechanism of the ~65% rebound; (b) hypnotize-light control-duration cap
as a hard data number — `maxControlTurns: 3`.
