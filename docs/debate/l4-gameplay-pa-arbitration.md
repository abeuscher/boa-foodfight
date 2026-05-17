# Gameplay Progression Agent — L4 Hallway Mechanic Delta: ARBITRATION

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2).
**Status:** Phase-D L4 deliverable. Document only — no code, no scenario
data. This is the concrete L4 mechanic delta spec the orchestrator wires
into `data/level-4` (over the Level PA's placeholder) and the
within-scenario loop tunes.
**Inputs:** `docs/debate/l4-ant-advocate.md`,
`docs/debate/l4-spider-advocate.md` (opening + rebuttal each);
`docs/debate/l3-gameplay-pa-arbitration.md` (the L3 baseline — the ruled
`wall` plane-affinity state, `spider combat wall +1/0`, `ant combat
wall −1/0`, carries forward into L4 **unchanged**, **not** relitigated);
`docs/mechanic-distribution-plan.md` §2 (the L4 row), §3.D (venom-blast →
L4-weak, ratified), §3.I (asymmetric plane-switch → L4 full strength,
range-limited; full corner coverage banked to L6), §3.J (combos →
components at L4, Venom Storm online L7), §4 (win-curve: L4 predicted
~60%, the licensed randomization-shock spike, monotone L3 ~68 → L4 ~60),
§5 (boundary case #1: Light-Switch split — Level owns the POST
node/flip-state, Gameplay owns the combat-modifier payload);
`docs/level-progression-plan.md` §2 L4 (Hallway geometry; §4a #1 the
ownership split — Gameplay MUST specify the concrete `combatModifier`
values; §4b engine freeze).
**Bounded by:** §3.1 hard floors, §3.4 cumulative-addition, §5 curve,
§6.3 ownership (Gameplay owns this; Hallway geometry, the 4-wide corridor
band, and the seed-jittered Doorway bands are the Level PA's, running in
parallel — **not** designed here). Engine surface frozen (§4b) — this
delta is **data-only**: existing `planeAffinity` (carried unchanged from
L3), existing ability definitions tuned via `data/level-4/abilities.json`
params, roster gating via `data/level-4/roster-*.json`, and the shipped
`postSchema.combatModifier` shape (`engine/schemas/map.ts`). **No new
engine code.**

---

## 1. What was actually contested

Placement was **not** in contest and is not re-decided here. The
mechanic-distribution plan §2 / §3.D / §3.I / §3.J already ruled the
entire L4 component set, and the L3 arbitration fixed the `wall`
plane-affinity state that L4 inherits unchanged. Both faction sub-agents
conceded every placement explicitly:

- **Asymmetric plane-switch, full strength, range-limited at L4, full
  corner coverage banked to L6** — ruled §3.I, conceded by both.
- **Venom-blast, weak debut at L4** — ratified §3.D, conceded by both;
  both insisted "weak" be a real data-cap on the ability params, not a
  placement gesture (agreed).
- **Combo _components_ at L4; the assembled combos (Venom Storm L7,
  Royal Onslaught as the ant answer-combo) roster-gated OUT of L4** —
  ruled §3.J, conceded by both.
- **POST-randomization at L4** — the Level PA's Doorway-jitter band,
  boundary-case-free, Level-owned; both factions explicitly declined to
  design it and only priced its win-rate weight.
- **The L3 `wall` plane-affinity state** (`spider combat wall +1/0`,
  `ant combat wall −1/0`, queens / ant support-casters / neutrals
  `wall 0/0`) carries forward **unchanged** — not relitigated, per the
  brief and the L3 ship-gate.

The two faction sub-agents converged — exactly the §6.2-designed
profile, and the same convergence shape the L3 debate produced — onto a
**single contested binary**: the **direction** of the Light-Switch
`combatModifier`. Both factions _independently_ agreed on:

- **`attack: 2`** (both derived `+1` as below the perceptual floor in a
  five-delta room; both explicitly rejected `+3` as a spike-breaching
  over-correction — neither over-reached, the same restraint the spider
  showed declining `ant wall −1/−1` at L3);
- the **flip-on-capture self-extinguishing structure** (the modifier
  live only while the disfavored side holds the switch; the instant the
  other side captures it the bonus is gone — the ant's framing, which
  the spider conceded as correct because it makes the lever bounded and
  the capture meaningful).

The entire residual dispute is **which side the lever favors**:

- **Ant:** `litOwner: "spider"`, `faction: "ant"` — spider holds the
  switch by default (it is the mid-corridor defender), the modifier is
  live, **ants** get `+2` while pushing the dark corridor; ant captures
  the switch → bonus self-extinguishes. The counter-pressure answer to
  five spider-favoring deltas in a no-flank corridor.
- **Spider:** `litOwner: "ant"`, `faction: "spider"` — ant must
  capture/hold the switch, until then **spiders** get `+2`; the legible
  teeth of L4's licensed randomization-shock spike toward spider.

This is the L3 convergence profile again: the adversarial exchange
collapsed a five-component room to one tunable binary with both sides'
best case fully on record.

---

## 2. The L4 baseline (what L3 ships, what L4 deltas FROM)

From `data/level-3/*` (verified against source). The L4 delta is
expressed against these:

- **`units.json` `planeAffinity`** — the L3-ruled state, **carried into
  L4 byte-identical**: ant combat (footman/archer/potato-bug/tank +
  promoted) `floor +1/+1, ceiling −1/0, wall −1/0`; spider combat
  (soldier/scout/spinner/elite + promoted) `floor −1/0, ceiling +1/+1,
wall +1/0`; queens, ant support/casters, neutrals `wall 0/0`. **L4
  does NOT touch `planeAffinity`** — the L3 ruling stands; this is
  stated for forward consistency, not as an L4 delta.
- **`abilities.json`** — `ant-plane-switch` (`tier 3, uses 1, params {}`),
  `spider-corner-cross` (`passive`, `uses null`), `venom-blast`
  (`tier 2, uses 4, params {damagePerUnit: 4, minSpinnersOrQueen: 1}`),
  `royal-onslaught` / `venom-storm` (combos; `componentAbilities` +
  `mpCostBySource`) are all **already present in the data L1→L3,
  byte-identical**. They have been tutorial-inert at L1–L3 (L3's ruling
  touched only `planeAffinity`; switching/venom/combos were not _live
  levers_ in the flat island-Kitchen). **The L4 delta is these
  abilities becoming live levers, tuned and roster-gated for the
  corridor — data-only, no engine change** (consistent with the L3
  arbitration's data-only discipline and §4b).
- **`map.json`** — no `combatModifier` exists on any shipped POST
  (`combatModifier` is "absent on every shipped map" per the schema doc).
  The Level PA's L4 placeholder has the Light-Switch POST node + flip-
  state with **no payload**; this arbitration supplies the payload.

The honest framing of the L4 delta: not "introduce plane-switch / venom /
combos" (the ability definitions are already shipped) — it is **"in the
no-flank Hallway, switching becomes a live full-strength order, venom-
blast debuts as a weak burst, the combo pieces become understood inputs,
the Doorways randomize, and a new flip-state POST modifier wakes up."**
One room of change in _function_, expressed entirely through existing
data structures.

---

## 3. RULING — the contested binary (Light-Switch direction)

**RULING: the Light-Switch `combatModifier` favors the ANT.
`{ litOwner: "spider", faction: "ant", attack: 2 }`. The spider wins
nothing it asked to win on direction; it is fully upheld on magnitude,
structure, and every placement, and its identity is delivered by the
other five components and the capture-objective — not by this lever.**

This is decided on **win-curve shape** (the §3.4.4 binding arbiter), with
the §5 "interesting > fair" license consulted and found to _reinforce_,
not override, the curve answer. Both factions' interest arguments are
credible; the curve is decisive and the interest reading aligns with it.

### 3.1 Why the ant wins the direction — the curve

The mechanic-distribution plan §4 commits L4 to **~60%**, the licensed
randomization-shock spike, with a **binding monotone constraint**: L3
~68% → L4 ~60% → L5 ~64%. The L3 arbitration §5 hardened this — the L3
plane-affinity split was _engineered_ specifically "to preserve a
monotone descent into the licensed L4 ~60% spike rather than the flatter
§5-illustrative 70→60 cliff." L4 at ~60% is not aspirational; it is the
ruled landing the entire L3 shaping move was issued to set up.

The five ruled L4 components are **all spider-favoring** and **all land
in one no-flank corridor**:

1. **POST-randomization** — the _dominant_ driver. The Doorways move per
   seed; the ant cannot pre-plan the approach; the spider, defending
   fixed regions, is unaffected. The roadmap's own words:
   "randomization shock toward spider." This alone is the bulk of the
   L3 ~68 → ~62 movement.
2. **Asymmetric plane-switch, full strength** (range-limited, §3.I) — a
   flank the single-axis corridor otherwise denies, handed to both but
   net spider-favoring in a defended-corridor capture-post (the spider's
   `spider-corner-cross` passive is free; the ant's `ant-plane-switch` is
   `uses: 1`).
3. **Venom-blast, weak** — a spider burst initiator (~−1 to −2pp at the
   data-capped tuning §4 specifies).
4. **Combo components becoming understood inputs** — net ~neutral at L4
   (the combos do not fire until L7), a slight spider lean from
   `venom-blast`/`web-tangle` being the more naturally-assembled pair in
   the corridor.
5. **The L3 `wall` plane-affinity** carried forward — already priced
   into L3 ~68%, no _new_ L4 movement, but its spider-favoring direction
   persists in a room with a north-wall plane.

Unanswered, those five components drive L4 to **~54–56%** — through the
licensed ~60% spike and into a genuine ant-loss zone. That is **not** the
ruled landing. It breaches the monotone constraint's intent (the L4
spike is _licensed_, but as a ~60% spike, not a ~55% collapse — the
roadmap §5 prices L6 at ~55% as the "geometry favors the defender" low;
L4 at ~55% would erase the L4→L6 differentiation the curve shapes) and
wastes the entire L3-arbitration shaping move that was issued precisely
to land L4 at a _separated_ ~60%.

The Light-Switch is the **only** free combat lever in this room whose
direction the arbiter sets — every other component's direction is fixed
by the roadmap. The arithmetic is decisive:

- **Ant-favoring `+2`, live by default** (spider holds the mid-corridor
  switch; ants get `+2` pushing the dark corridor; self-extinguishes on
  ant capture): returns **+4 to +6pp ant** in a single-axis attrition
  corridor where every engagement is a head-on trade and a flat attack
  bonus compounds across every fight. Net L4: ~54–56% + ~5 ≈ **~60%**.
  On target. Monotone L3 ~68 → L4 ~60 preserved and _shaped_, exactly
  as §4 / the L3 arbitration §5 require.
- **Spider-favoring `+2`** (the spider's ask): adds **−4 to −6pp ant**
  on top of the already-spider-tilted five. Net L4: ~54–56% − ~5 ≈
  **~50–52%** — a hard ant-loss room that overshoots the licensed ~60%
  spike into the L8/L10 ~50% climax zone _four scenarios early_,
  destroying the curve's back-half differentiation and the
  hard-level-before-the-end structure §5 reserves for L8. **Rejected on
  the curve.**

The spider's strongest counter — "L4 is the licensed spike _toward
spider_; an ant-favoring lever erases it; counterweighting a licensed
spike is the 'force it back to spec' move §5 prohibits" — is **rejected
on a magnitude reading the spider's own brief concedes.** The spider's
own win-rate section states an ant-favoring switch "would push L4 back
toward ~64–66%." That estimate _assumes the five spider deltas only move
L3→L4 to "the low ~60s"_ — but it simultaneously argues those five
deltas are strong enough to _be_ the licensed spike on their own. Both
cannot hold: if the five deltas alone deliver the ~60% spike (the
spider's interest argument), then a spider-favoring `+2` on top
**overshoots** to ~52% (the spider's own arithmetic, run forward) — a
spike breach, not a delivery. The licensed spike is **delivered by the
five ruled spider components**; the Light-Switch is the shaping knob that
holds that delivery _at_ ~60% instead of letting it overshoot. An
ant-favoring `+2` does not "erase" the spike — POST-randomization +
full-strength plane-switch + weak venom-blast _are_ the spike, and they
are untouched. The Light-Switch is not the spike's counterweight; it is
the spike's _ceiling_, the lever that keeps the licensed dip from
becoming an unlicensed collapse. §5 prohibits forcing an _interesting_
result back to spec; it does not prohibit preventing a licensed ~60%
spike from overshooting into a ~52% curve-breaker. The curve is the
§3.4.4 arbiter and it rules ant-favoring.

### 3.2 Why the interest reading reinforces the curve answer

The §5 "interesting > fair" license is consulted and found to **agree**
with the curve (so it is not the deciding instrument, but it removes the
spider's strongest non-curve objection):

- **The spider's identity is delivered without this lever.** The spec's
  defending-ambush identity lands at L4 through POST-randomization (the
  spider doesn't care where the Doorway moves; the ant does) and
  full-strength plane-switch (the spider's free `corner-cross` flank in
  a corridor that denies the ant one). The Light-Switch direction is
  _not_ load-bearing for "the enemy got more dangerous" — the
  randomization shock _is_ that, by the roadmap's own framing. The
  spider does not lose its signature room; it loses one of six levers in
  it, and that lever was never what made the room the spider's.
- **The ant-favoring switch is the §3.D doctrine applied consistently.**
  The arbiter ratified venom-blast at L4 _because_ "it debuts the same
  scenario as the ant's Royal Onslaught combo answer — escalation with
  an answer, not unanswered chip." The L4 escalation is five spider
  deltas; the answer-in-the-same-room is the ant-favoring,
  self-extinguishing Light-Switch. A spider-favoring switch would be the
  sixth unanswered escalation — the exact "unanswered chip" structure
  §3.D rejected. The arbiter cannot invoke escalation-with-an-answer for
  venom-blast and then deny the symmetric answer in the same room.
- **The capture is a real spider decision either way.** The
  self-extinguishing structure (both factions agreed) means the spider
  _controls the lever_: hold the switch and the ant keeps the `+2` but
  the spider keeps the mid-corridor position; abandon the switch to deny
  the ant the bonus and the spider has ceded the corridor's center. That
  is a genuine tactical choice _for the spider_ — the spider's interest
  is served by the _decision_ the switch creates, not by the bonus
  pointing at spiders. The spider's "subsidy with an off-switch"
  critique is inverted: an ant-favoring switch the _spider chooses
  whether to feed_ is a spider decision; a spider-favoring switch is a
  flat sixth spider tilt with no decision for either side until the ant
  finally captures it.

The §6.2 "boring-but-balanced" failure mode is avoided: L4 is genuinely
hard (five spider deltas, the curve's ~60% spike), the hardness is
_legible_ (the player sees the enemy holding the lights, feels the bonus
pushing through the dark, earns the corridor by taking the switch), and
the comeback _self-extinguishes_ (no permanent ant stat wall). Both
factions' interest goals are served; neither is denied — the spider's is
delivered by the five components and the capture-decision, the ant's by
the direction.

### 3.3 Where the spider is upheld

Every spider concession is honored and every spider non-over-reach is
ratified, exactly as the L3 arbitration upheld the spider on locus while
the ant won the integer:

- **`attack: 2`** — the spider's magnitude, ratified. `+1` is below the
  perceptual floor in a five-delta room (both factions agreed); `+3` is
  a spike breach in _either_ direction (both factions rejected it,
  neither over-reached — the L3-style restraint that keeps the band
  clean). The spider wins the magnitude entirely.
- **The flip-on-capture self-extinguishing structure** — adopted (the
  ant authored the framing; the spider conceded it correct; it makes
  the lever bounded and the capture a real objective in a
  randomization-shock room).
- **Plane-switch full strength, range-limited at L4, full corner
  coverage banked to L6** — the spider's deep flank is the L6 payoff,
  not an L4 cold open; ruled §3.I, ratified here.
- **Venom-blast "weak" is a real data-cap, not a placement gesture** —
  the spider's explicit demand ("weak must not be tuned to absent," its
  L3 through-line), upheld: §4 specifies the concrete capped params.
- **The L3 `wall` plane-affinity carries forward unchanged** — the
  spider's L3 win (its identity planes register) persists into a room
  with a north-wall plane; not re-litigated, not weakened.

The spider's identity concern ("L4 is the spider's signature room; the
shock must register") is **satisfied at L4 by the five ruled components
and the capture-decision**, and the spider's _favored-side_ payoff is
**deferred to L6** (the ~55% Stairs, where geometry favors the high-
ground defender and plane-switch reaches full corner coverage) — the
exact callback structure the spider itself demanded for hypnotize and
that the L3 arbitration applied to the spider's `wall` armor sub-field.
Applied symmetrically: the spider's signature _favored-side_ scenario is
L6, not L4; L4 is the licensed _dip_, and a dip favors the defender by
being a dip, not by also handing the defender the one free lever.

---

## 4. The L4 mechanic delta — concrete, data-level spec

Implementable directly against shipped schemas; **no engine code** (§4b).
The L4 data set = the L3 data set with **only the changes below**. Every
unmentioned field, template, and the entire `planeAffinity` table are
byte-identical to L3.

### 4a. Light-Switch `combatModifier` payload (the headline deliverable — wired into `data/level-4/map.json` over the Level PA placeholder)

The Level PA owns the Light-Switch POST node, its location (north-wall,
mid-corridor), and its flip-state-ness (§4a #1, boundary case #1 split).
Gameplay (this arbitration) owns and hereby specifies the payload, as the
shipped `postSchema.combatModifier` object:

```
"combatModifier": {
  "litOwner": "spider",
  "faction":  "ant",
  "attack":   2
}
```

**Exact semantics (per the schema doc, `engine/schemas/map.ts`
lines 87–99):** while the Light-Switch POST is **NOT** owned by
`litOwner` (`"spider"`), every unit of `faction` (`"ant"`) gets
`+attack` (`+2`) effective attack engine-wide.

**Resolved behavior in the L4 corridor:**

- **At scenario start the spider garrison holds the Light-Switch**
  (it is mid-corridor, on the defended side of a capture-post map; the
  spider is the defender — this is a Level PA placement fact, stated for
  the orchestrator, not designed here). Since the switch IS spider-owned
  and `litOwner` IS `"spider"`, the literal schema rule ("while NOT
  owned by `litOwner`") means the modifier is **OFF** while the spider
  holds it.

  **Direction correction for the orchestrator (load-bearing):** the
  intended in-game effect is **the ant `+2` is LIVE while the spider
  holds the switch, and self-extinguishes when the ant captures it.**
  The schema's `litOwner` semantics are "modifier active while NOT owned
  by `litOwner`." To get "ant `+2` active while the **spider** holds it,"
  set **`litOwner: "ant"`** (the modifier is active whenever the switch
  is not ant-owned — i.e. while the spider holds it — and turns off the
  instant the ant captures it). **Corrected payload:**

```
"combatModifier": {
  "litOwner": "ant",
  "faction":  "ant",
  "attack":   2
}
```

Reading: _while the Light-Switch is not ant-owned (spider holds the
mid-corridor switch by default), every ant unit gets +2 attack
engine-wide; the instant the ant captures the switch, the bonus
self-extinguishes._ This is the ant-favoring, live-by-default,
flip-on-capture lever the ruling §3 specifies, expressed correctly in
the shipped schema's `litOwner = "the side whose ownership SUPPRESSES
  the modifier"` semantics. **`litOwner: "ant"`, `faction: "ant"`,
`attack: 2`.**

- **Direction:** ant-favoring (ruled §3.1).
- **Magnitude:** `attack: 2` (ruled §3.3; both factions converged; `+1`
  sub-perceptual, `+3` spike-breaching — neither permitted).
- **Self-extinguishing:** built into the `litOwner` semantics — ant
  capture (ant ownership) suppresses the modifier; no extra field, no
  engine change.

**Reasoning for direction & magnitude given the corridor geometry and
the §4a split (required by the brief):** the Level PA's L4 is a 4-wide
**single-axis no-flank corridor** — every engagement is a head-on
attrition trade and a flat `+attack` compounds across every fight in the
room (high leverage, hence `+2` not `+3`; `+1` is drowned out by the
five other deltas and is sub-perceptual — the player cannot _see_ the
lever, losing the interest payoff). **Direction is forced by the curve:**
five ruled components all favor the spider in one corridor; the
Light-Switch is the only free combat lever; ant-favoring is the only
direction that holds the licensed ~60% spike instead of overshooting to
~52% (§3.1 arithmetic). **Magnitude `+2`** delivers ~+4 to +6pp ant in
the attrition corridor — the precise counter-weight to the five spider
deltas' ~−12 to −14pp, netting the ruled ~60%.

### 4b. Asymmetric plane-switch — full strength, range-limited (ruled §3.I)

Data-only via `data/level-4/abilities.json` and roster gating; no engine
change (§4b).

- `ant-plane-switch`: stays `tier 3, uses 1, cooldown 0` (L3-identical).
  It becomes a **live order** at L4 by being fielded on combat-relevant
  ant parties in `roster-ants.json` (at L1–L3 it sat on `ant-mage` /
  `ant-archmage` in support parties; L4 keeps it there — "full strength"
  is the _effect setting_, not a param inflation: the L3 ability is
  already full-effect, it was tutorial-inert for lack of a corridor that
  rewards switching).
- `spider-corner-cross`: stays the L3 `passive, uses null` (full-effect
  already). Live at L4 for the same reason.
- **Range-limit (the §3.I banking, binding):** "range-limited" is
  expressed as **the Level PA's corridor geometry + plane set** — L4 is
  3 planes (floor, ceiling, north-wall; level-progression-plan §2 L4(2)),
  i.e. **fewer corner-pairs are physically present than the full 6-plane
  set**, so plane-switch is full-_strength_ but reduced-_reach_ by the
  scenario's plane set. **No data change is needed to range-limit it —
  the Level PA's reduced plane set _is_ the range limit.** Full corner
  coverage arrives at L6 (Stairs) when the geometry reopens the planes
  switching needs (ruled §3.I; stated for forward consistency, not L4
  work). The arbiter records this as a **binding L4 cross-check**: if the
  Level PA's L4 plane set is later widened beyond 3 planes, this §3.I
  range-limit ruling reopens.

### 4c. Venom-blast — weak debut (ratified §3.D), a real data-cap

Data-only via `data/level-4/abilities.json`. The L3 `venom-blast` is
`uses 4, cooldown 0, params {damagePerUnit: 4, minSpinnersOrQueen: 1}`.
"Weak debut" is a **measurable param cap**, not a placement gesture (both
factions' explicit demand):

```
"venom-blast": { "uses": 2, "cooldown": 1,
  "params": { "damagePerUnit": 2, "minSpinnersOrQueen": 1 } }
```

- `damagePerUnit 4 → 2` (halved — a burst _chip_ that opens a fight, not
  a party-deleter; the §3.D "burst initiator, not sustained attrition"
  reading made concrete).
- `uses 4 → 2`, `cooldown 0 → 1` (a debut, not a spammable staple — the
  staple is Venom Storm at L7).
- `minSpinnersOrQueen 1` unchanged (the gate is identity, not strength).
- Roster-gated to `spider-spinner` / `spider-weaver` / `spider-queen`
  (the L3 carriers — unchanged set; no new carrier at L4).
- **Forward consistency:** L7 restores venom-blast toward its L3 numbers
  and Venom Storm comes online (ruled §3.J) — the 3-scenario runway both
  factions' runway test requires. Stated, not L4 work.

### 4d. Combo components — components only, combos roster-gated OUT (ruled §3.J)

Data-only via roster gating; no ability-definition change. `royal-
onslaught` (`componentAbilities: [magic-arrow, jelly-apply]`) and
`venom-storm` (`componentAbilities: [venom-blast, web-tangle]`) stay in
`data/level-4/abilities.json` byte-identical to L3 (they are already
shipped). At L4 the **component abilities are live** (`magic-arrow`,
`jelly-apply` on ant parties; `venom-blast` (capped, §4c), `web-tangle`
on spider parties — all already rostered at L3). The **assembled combos
do NOT fire at L4**: no L4 party is composed to satisfy a combo's
assembly requirement (the orchestrator gates this in
`data/level-4/roster-*.json` — the same roster-gating lever §4b uses for
plane-switch). The player meets the _pieces_ at L4; the _payoffs_ (Venom
Storm, Royal Onslaught) arrive at L7 (ruled §3.J). This keeps L4's
§3.4.3 budget honest: the one new high-cognitive mechanic is the
plane-switch order; combos are L7's.

### 4e. POST-randomization (Level-owned — stated, NOT designed here)

The three Doorway POSTs' seed-jittered rows are the Level PA's
`postSchema.jitter` bands (level-progression-plan §2 L4(5a); §6.3 — pure
spatial, Level-owned, boundary-case-free). **This arbitration does not
design the jitter bands.** It is recorded only because its win-rate
weight (the dominant driver of the L4 dip) is priced into §5 below so the
Light-Switch is not _also_ over-tuned.

### 4f. The L3 `wall` plane-affinity — carried forward UNCHANGED

`data/level-4/units.json` `planeAffinity` = `data/level-3/units.json`
`planeAffinity`, **byte-identical**. The L3 ruling stands; L4 adds **no**
plane-affinity delta. Stated for the orchestrator's no-touch guarantee.

**One-sentence statement of the L4 delta (the §3.4.3 "name what's new"
test):** _"The hallway is dark and the doorways move every game — flank
through the planes, the enemy can burst you now, and while the enemy
holds the light switch your soldiers hit harder pushing through the dark;
take the switch and you've cleared the hall."_ One room of change; the
single new high-cognitive mechanic is the live plane-switch order.

---

## 5. Win-rate prediction for L4

**Predicted L4 ant win rate: ~60%** (band ~58–61%, within §5 loose
tolerance and the mechanic-distribution plan §4 "~60%, the licensed
randomization-shock spike, monotone L3 ~68 → L4 ~60" requirement).

Derivation, anchored to the L3 arbitration's ruled landing (L3 ~68%,
itself anchored to the measured L2 76%):

1. **Start: L3 ~68% ant** (the ruled L3 landing — the L3 arbitration §5,
   shaped specifically to descend into the licensed L4 spike). Monotone
   descent is measured against ~68%.
2. **POST-randomization: −5 to −7pp ant** (the dominant driver — defeats
   ant pre-planning in a no-flank corridor; the roadmap's
   "randomization shock toward spider"). Level-owned magnitude; priced
   here for the curve.
3. **Asymmetric plane-switch, full strength, range-limited: −3 to −5pp
   ant** (a flank the corridor otherwise denies; net spider-favoring —
   `spider-corner-cross` is a free passive, `ant-plane-switch` is
   `uses: 1`; range-limited by the Level PA's 3-plane set keeps this off
   the −6+ it would be at full 6-plane coverage — the §3.I banking
   working as the L3-arbitration-style shaping knob).
4. **Venom-blast, weak (data-capped §4c): −1 to −2pp ant** (a burst chip
   at `damagePerUnit 2, uses 2, cooldown 1` — doctrinally near-neutral
   for a glass cannon punished by grind not burst, §3.D; the cap is what
   keeps it ~−1.5 instead of the ~−4 to −7 the spider's original L3 ask
   would have been, ant R4).
5. **Combo components live (combos gated out): ~0pp** (the pieces are
   understood inputs; the payoffs are L7 — ruled §3.J; a faint spider
   lean from the venom/web pair being the more naturally-assembled one
   in the corridor, inside the noise).
6. **L3 `wall` plane-affinity carried forward: ~0pp _new_** (already
   priced into L3 ~68%; its spider-favoring direction persists in the
   north-wall plane but adds no _new_ L4 movement).

**Subtotal before the Light-Switch: ~68 − (5 to 7) − (3 to 5) − (1 to 2)
≈ ~54–56% ant.** This is the five-spider-delta floor — through the
licensed ~60% spike and into an ant-loss zone.

7. **Light-Switch, ant-favoring `+2`, live by default
   (ruled §3 / §4a): +4 to +6pp ant.** A flat `+2` attack on every ant
   unit, live for as long as the spider holds the mid-corridor switch
   (most of the scenario in a capture-post defense), compounding across
   every head-on attrition trade in a single-axis room. Self-
   extinguishes only when the ant captures the switch — by which point
   the ant has won the local fight and no longer needs it.

**Net: ~54–56% + (4 to 6) ≈ ~60% ant**, settling to **~60%** with the
within-scenario loop tuning the End-Door defensive bonus (a Level-owned
POST stat, Gameplay-neutral) and the venom-blast cap toward the target.

**Why this preserves the monotone L3 → L4 descent and reads as the
licensed randomization-shock spike:**

- **Strictly below L3.** ~68% → ~60% is an unambiguous ~8pp drop —
  identical in magnitude to the engineered L2 (76) → L3 (~68) step, so
  the descent is _shaped and consistent_, not a flat step or a cliff.
  The L3 arbitration §5 explicitly built ~68% "to preserve a monotone
  descent into the licensed L4 ~60% spike"; this delivers exactly that
  landing.
- **The spike is delivered _by the spider getting more dangerous_, not
  by the lever.** The ~8pp drop is _entirely_ the five ruled spider
  components (randomization + full-strength flank + weak burst); the
  Light-Switch does not _create_ the dip, it _ceilings_ it — it stops
  the five-delta floor (~54–56%) from overshooting the licensed ~60%
  into a ~55% unlicensed collapse that would erase the L4→L6 (~55%)
  differentiation §5 reserves for the geometry-favors-defender Stairs.
  This is the spec-faithful, §6.2-good reading: the curve closes because
  the enemy got more dangerous (randomization shock), with a legible,
  earned, self-extinguishing answer in the same room (§3.D doctrine,
  applied consistently).
- **Strictly above L5.** L5 rebounds to ~64% (mechanic-distribution plan
  §4 — player adapts, concealment is a player-favorable tool). ~60% (L4)
  → ~64% (L5) is the licensed _spike_ shape: a dip that recovers, "an
  occasional surprising spike — a hard level" the user explicitly
  licensed (§5), not a monotone-down violation (the curve is non-
  monotonic by design; the binding monotone constraint is the _L3 → L4
  descent_, which holds).
- **Monotone L3(~68) → L4(~60), spike separated from L6(~55).** Had the
  Light-Switch favored the spider, L4 would land ~50–52% — through the
  spike, into the L8/L10 climax zone four scenarios early, erasing the
  L4/L6/L8 differentiation the back-half curve depends on. Ant-favoring
  `+2` is the knob that holds the ~60% rung and keeps L4 the licensed
  spike rather than an unlicensed collapse — the precise §3.4.4-curve-
  arbiter logic the L3 arbitration used to give the ant the residual
  integer.

---

## 6. Interest claim

**The L4 delta makes the corridor's hostility legible and the comeback
earned, while delivering the spider's signature randomization shock as
the _reason_ the room is hard.**

The Level PA built the Hallway as the tier's first deliberately
disorienting room — a single no-flank axis with objectives that move
every game ("randomized doorways defeat pre-planning → randomization
shock toward spider"). That shock _is_ the spider's identity payoff: the
defending-ambush faction the spec promises, finally landing as a room the
player cannot pre-solve. The five ruled components deliver that — the
spider does not need the Light-Switch to be the more dangerous side here;
it _is_, by the room's whole construction. The Light-Switch, ant-
favoring and self-extinguishing, is the smallest possible change that
makes the hardest early-tier room _fair-feeling and legible_ rather than
"the game got unfair": the player can _see_ the enemy holding the lights,
_feel_ the `+2` while pushing through the dark, and _earn_ the corridor
by taking the switch — at which point the crutch self-extinguishes (no
permanent ant stat wall). That is the ant glass-cannon doctrine — push,
commit, take the objective — taught by the hardest room in the early
tier, with the difficulty _visible_, the cause _nameable_ (the
randomization shock, the dark corridor), and the answer _in the player's
hands_. It is simultaneously the §6.2 "the enemy got more dangerous, and
here is your answer in the same room" closure — the exact escalation-
with-an-answer structure the arbiter ratified for venom-blast at §3.D,
applied consistently. The spider's favored-_side_ payoff is preserved and
_sequenced to L6_ (the ~55% Stairs, where geometry favors the high-ground
defender and plane-switch reaches full corner coverage) — a previously-
met threat deepened at its designed home, the exact callback structure
the spider itself argued for its own tools and the L3 arbitration applied
to the spider's `wall` armor sub-field. Both factions' interest goals are
served; neither is denied — only directed and sequenced: the spider's
shock identity at L4 (delivered by the five components and the capture-
decision), its favored-side payoff at L6; the ant's legible, earned,
bounded answer is the L4 lever's direction.

---

## 7. Termination record

**Termination basis: §6.2 condition 1 — the Gameplay PA's standing
discretionary cutoff authority ("cut off sub-agent debate when it has
heard enough"), invoked after the opening + one rebuttal per faction
(4 documents; equivalently 2 exchanges of the 6-exchange cap; the
automatic 6-exchange stop did NOT fire — terminated early by discretion,
consistent with the mechanic-distribution plan §1 and the L3 arbitration
§7 precedent).**

- **§6.2 automatic stop A (both fun-critic AND interest-critic ≥75/100
  on a frozen proposal):** _Not yet fired_ — critic eval runs in the
  within-scenario loop on the implemented L4 data, downstream of this
  arbitration; there is no frozen scored proposal at debate time. Per
  §6.2 and the L3-arbitration §7 precedent, this does not block
  arbitration; it is a Phase-D loop gate, recorded as the L4 ship-gate
  below.
- **§6.2 automatic stop B (6 exchanges):** _Not fired_ — only 2
  exchanges occurred (opening + rebuttal per faction).
- **Discretionary cutoff (invoked):** The debate converged to a **single
  contested binary** — the Light-Switch `combatModifier` _direction_
  (ant-favoring vs spider-favoring) — with both factions independently
  agreeing on `attack: 2`, the flip-on-capture self-extinguishing
  structure, and every one of the five placements (all ruled). Both
  sides' best case on direction is fully on record. A third exchange
  would only restate the direction dispute the §3.4.4 curve arbiter
  already resolves (an ant-favoring switch holds the licensed ~60%
  spike; a spider-favoring one overshoots to ~52%, a spike breach). The
  §6.2 format's value ("adversarial NL surfaces considerations neither
  generates alone") was fully realized — the exchange itself produced
  the decisive frame (the Light-Switch as the _ceiling_ of the licensed
  spike, not its counterweight; the §3.D escalation-with-an-answer
  doctrine applied symmetrically; the independent two-sided convergence
  on `+2` and the self-extinguishing structure) that neither opening
  contained. Per roadmap §6.2 the Gameplay PA "cuts off sub-agent debate
  when it has heard enough"; that threshold is met. **Terminate;
  arbitrate now.** No point is genuinely unresolvable.

**L4 ship-gate (handed to the Phase-D within-scenario loop):** implement
the §4 data delta; run the loop to fun-critic + interest-critic; the L4
data ships when **both critics ≥75/100** on the measured L4 config
(§6.2 automatic stop A, evaluated where it belongs — on the built
scenario). The loop's tuning latitude is the End-Door defensive bonus (a
Level-owned POST stat, Gameplay-neutral) and the venom-blast cap (§4c)
toward the ~58–61% band; the Light-Switch `combatModifier`
(`litOwner: "ant"`, `faction: "ant"`, `attack: 2`), the plane-switch
range-limit cross-check (§4b), and the combo roster-gate (§4d) are the
**ruled values**, not a free knob — any change to them reopens this
arbitration. **Note the §4c carried-forward cross-level signature**
(level-progression-plan §4c: `capture-post` + competent-defense grinds to
the score path, low `drama`): expect the same `drama` signature on L4;
per the recorded human decision it is tracked cross-level (the deferred
UX/feel pass), **not** chased per-level — do not retune L4 mechanics for
`drama` if win-rate and the monotone curve hold.

---

## 8. Summary of the verdict

| Dimension                       | Ruling                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mechanic                        | L4 Hallway delta vs L3 (data-only; existing structures; no engine — §4b)                                                                               |
| L3 state carried forward        | `wall` plane-affinity **unchanged** (spider combat `wall +1/0`, ant combat `wall −1/0`); not relitigated                                               |
| **Light-Switch combatModifier** | **`{ litOwner: "ant", faction: "ant", attack: 2 }`** — ant-favoring, live while spider holds the mid-corridor switch, self-extinguishes on ant capture |
| Light-Switch direction          | **Ant** (ruled on the §3.4.4 curve — the only direction that holds the licensed ~60% spike vs ~52% overshoot)                                          |
| Light-Switch magnitude          | **`+2`** (mutual convergence; `+1` sub-perceptual, `+3` spike-breaching — neither permitted)                                                           |
| Light-Switch ownership split    | Level owns the POST node/flip-state/location (§4a #1); Gameplay owns this payload — concur, split upheld                                               |
| Asymmetric plane-switch         | **Full strength, range-limited** (ruled §3.I); range-limit = the Level PA's 3-plane set (no data change); full corner coverage banked to **L6**        |
| Venom-blast                     | **Weak debut, data-capped** (ratified §3.D): `damagePerUnit 4→2, uses 4→2, cooldown 0→1`; L3 carrier set unchanged; → Venom Storm L7                   |
| Combo components                | **Components live, combos roster-gated OUT to L7** (ruled §3.J) — Royal Onslaught / Venom Storm pieces understood at L4, payoffs L7                    |
| POST-randomization              | Level-owned (Doorway `jitter` bands); not designed here; priced into the curve                                                                         |
| Favors                          | Net spider (the licensed ~60% randomization-shock spike); the one ant-favoring lever is the Light-Switch direction, the spike's ceiling                |
| L4 win-rate prediction          | **~60%** (band ~58–61%); monotone L3 ~68% → L4 ~60% preserved and shaped; reads as the licensed randomization-shock spike, separated from L6 ~55%      |
| Interest claim                  | Corridor hostility legible + comeback earned/self-extinguishing; spider shock identity delivered by the five components; favored-side payoff → L6      |
| Termination                     | §6.2 discretionary cutoff after 2 exchanges (4 docs); auto-stops A/B not fired; ship-gate = both critics ≥75 on the built L4                           |

> **SUPERSEDED IN PART — see §9.** The §4a `combatModifier`
> (`litOwner: "ant", faction: "ant", attack: 2`) and the §5 prediction
> (~60%, +4 to +6pp) were **empirically falsified** by the within-scenario
> build (deterministic, seeds 1..100): the ruled payload measured **ant
> 99%**, a ~39pp overshoot and a hard L3 67 → L4 ~60 curve breach. §7's own
> clause ("ruled values are not free knobs — any change reopens this
> arbitration") makes an empirical falsification a re-arbitration trigger.
> §9 re-rules the Light-Switch only. §§1–3 (direction logic), 4b/4c/4d/4e/4f,
> 6 (interest direction), 7 (termination) stand except as §9 amends. The
> §3 direction ruling (ant-favoring) is **upheld**; only its §4a
> _expression_ and §5 _magnitude/transience_ are corrected.

---

## 9. RE-ARBITRATION (empirical, post-build) — Light-Switch

**Status:** amendment to §§4a/5/6. Triggered under §7 ("any change
reopens this arbitration") by an empirical falsification of the §4a
payload. Re-arbitrates the **Light-Switch only** — L3, plane-switch,
venom-blast, combos, and the §3 _direction_ finding (ant-favoring) are
**not** reopened. Document-only; no code, no scenario data.

### 9.1 The falsification (measured reality)

Orchestrator, deterministic, seeds 1..100, `baseline-l4` vs `spider-l4`
on the built `data/level-4/`:

| Light-Switch `combatModifier`                                       | Measured ant win                                    | vs target ~60%          |
| ------------------------------------------------------------------- | --------------------------------------------------- | ----------------------- |
| Level-PA placeholder `{litOwner:"ant", faction:"spider", attack:1}` | **54%**                                             | −6pp (under)            |
| §4a ruled `{litOwner:"ant", faction:"ant", attack:2}`               | **99%** (spider 1; 52 score-resolved; avg 58 turns) | **+39pp (hard breach)** |

The §4a ruling is **falsified**: 99% is not the ~60% (band 58–61) the
ruling claimed, not monotone with L3 67, and erases L4 as the licensed
spike. The §5 prediction arithmetic (+4 to +6pp) is falsified with it.

### 9.2 Root cause (engine semantics, re-derived from source — not trusted from the brief)

`engine/light-switch.ts:38–49`, re-derived directly:

```
for (const post of state.posts.values()) {
  const cm = post.combatModifier;
  if (cm === undefined) continue;
  if (post.owner === cm.litOwner) continue; // lit → modifier OFF
  if (cm.faction === 'ant') ant += cm.attack;
  else if (cm.faction === 'spider') spider += cm.attack;
}
```

The modifier is **ACTIVE while `post.owner !== litOwner`**, OFF while
`post.owner === litOwner`. (`engine/schemas/map.ts:87–99` agrees: "While
this POST is NOT owned by `litOwner`, every unit of `faction` gets
`+attack`.") This is exactly as §4a stated — _the schema is not the bug._

`data/level-4/map.json` `light-switch`: `owner: "spider"` (default),
`location { plane: "north-wall", x: 5, y: 4 }`.

The bug is the **interaction with the AIs**, which §4a did not model:

- The L4 ant AI (`ai/baseline-l4.ts` → `buildChainMarchPolicy`,
  `ai/capture-chain.ts:89–163`) marches the fixed chain
  `doorway-east → doorway-mid → doorway-west → end-door` — **all on the
  floor plane**. It computes `nextChainPost`/targets only from that chain;
  it has **no code path** that ever targets, moves to, or captures the
  north-wall `light-switch`. A floor chain-marcher cannot capture a
  north-wall POST.
- The L4 spider AI (`ai/spider-l4.ts` → `buildFortressDefensePolicy`,
  `ai/capture-chain.ts:232–274`) only pins the guard to `end-door` and
  sorties pickets/rover around `end-door`. It never moves to, holds, or
  defends `light-switch` — but it **does not need to**: it _starts_
  owning it (`owner: "spider"`) and nothing ever contests it.

Therefore `light-switch.owner` is **`"spider"` for the entire scenario,
every seed**. With `litOwner: "ant"`, `post.owner ("spider") !==
litOwner ("ant")` holds for **all turns** → the ant `+2` is **permanent,
unconditional, army-wide, every game**. It is not the "live while the
spider holds the mid-corridor switch, self-extinguishing on ant capture"
lever §4a described — _the spider holding it is precisely the permanent-ON
condition._ §4a's §4a-bullet reasoning ("ant capture suppresses the
modifier; self-extinguishing built into the `litOwner` semantics")
assumed an ant that can and will capture a north-wall POST. The shipped
floor-only chain-march AI never can. §5's "+4 to +6pp … self-extinguishes
only when the ant captures the switch" assumed a _contested, transient_
buff; as built it is a _permanent global_ one — hence +39pp, not +5pp.

The §3 _direction_ finding (ant-favoring is the only direction that does
not overshoot the spike toward spider) is **untouched and upheld** — the
placeholder's spider-favoring `+1` measured 54% (an over-spike toward
spider, exactly §3.1's predicted failure of a spider-favoring lever).
The defect is **transience, not direction**: an ant-favoring buff that
is _permanent_ is as curve-breaking upward as a spider-favoring one is
downward. §4a translated direction into the schema correctly but did not
make the buff _conditional_ against the actual frozen AIs.

### 9.3 Corrected ruling — payload + binding AI-doctrine constraint

A `combatModifier` payload **alone cannot** be made transient here: with
both frozen AIs ignoring the north-wall, `light-switch.owner` never
changes for _any_ `{litOwner, faction, attack}`, so the modifier is
always either permanently-ON or permanently-OFF. Permanently-ON
(`litOwner:"ant"`) = 99%. Permanently-OFF (`litOwner:"spider"`, the
schema-literal §4a pre-correction form) = the buff never fires, L4
collapses to the ~54–56% five-spider-delta floor (an unlicensed
_downward_ breach — §5 subtotal). **Neither static outcome is the ruled
~60%.** The §6 "earned, self-extinguishing comeback" is unrealizable by
payload alone against the shipped AIs. The fix is therefore lever **(a) +
(b)**: the payload **and** a binding within-loop AI-doctrine constraint
that makes the switch genuinely _contestable_ so its ownership actually
flips mid-scenario — which is the only thing that makes the buff
transient and the §6 intent real.

**9.3(a) — Corrected `combatModifier` payload (Gameplay-owned, ruled):**

```
"combatModifier": {
  "litOwner": "ant",
  "faction":  "ant",
  "attack":   2
}
```

The **values are unchanged from §4a** — `litOwner:"ant"`,
`faction:"ant"`, `attack:2`. The §4a payload was _correct given a
contestable switch_; it was falsified only because the switch is
uncontested. Direction (ant-favoring, §3 — upheld) and magnitude (`+2`,
§3.3 mutual convergence; `+1` sub-perceptual, `+3` spike-breaching —
upheld) are re-affirmed. The buff is ant-favoring and active **while the
spider holds the switch**; ant capture (ant ownership) suppresses it —
_self-extinguishing_, exactly as §4a intended — **but this is only real
once 9.3(b) makes capture actually occur.** No schema change; no engine
change (§4b).

**9.3(b) — BINDING AI-doctrine constraint for the within-scenario loop
(this is the load-bearing correction; within-loop tuning latitude, §6.2
/ §4b-permitted — data/AI-expressible, engine frozen):**

The orchestrator's within-scenario tuning loop **MUST** field L4 AIs
under which `light-switch` ownership genuinely flips mid-scenario in a
seed-robust majority of games. Concretely, **both** of the following are
binding doctrine (not free knobs — changing them reopens §9):

1. **The ant AI must be able to, and must, contest the Light-Switch.**
   The L4 ant policy must include a path that, once the ant force has
   mustered (the existing `doorway-west` muster gate is the natural
   trigger), **detaches a capture element to take the north-wall
   `light-switch`** (the engine plane-transition the ant roster already
   carries — `ant-plane-switch`, ruled live §4b — is the means; this is
   _why_ §4b put plane-switch live in this room). The ant must be able to
   _earn_ the switch; until it does, it fights the corridor under the
   `+2` it needs (the §6 "push through the dark" beat); once it takes the
   switch the `+2` self-extinguishes (the §6 "earned, then gone" beat).
   This makes capture a real, reachable objective rather than dead data.

2. **The spider AI must actively hold/defend the Light-Switch as a
   secondary objective**, not abandon it. The spider contests the ant's
   capture attempt (a detachment cost to the spider's `end-door`
   fortress — the genuine _tactical decision for the spider_ §3.2 / §6
   promised, now mechanically real: defend the switch and thin the
   end-door garrison, or concede the switch and keep the fortress
   intact). The switch must be _takeable with effort_, not free and not
   impossible.

The loop tunes **how hard** the switch is to take (ant detachment size,
spider switch-garrison strength, the capture timing) toward the §9.4
band. The **payload values (9.3(a)), the direction (§3), and the
existence of the contest (9.3(b).1+2)** are the ruled invariants; the
_difficulty_ of the contest is the loop's tuning latitude. This is
within-loop AI tuning (§4b explicitly permits AI/data tuning; the engine
is untouched). If no fielded AI configuration can make the switch
contestable within the band, the orchestrator escalates to 9.3(c).

**9.3(c) — RECOMMENDATION to the Level PA (Level-owned, not ruled here —
§4a #1 split):** if 9.3(b) cannot land the band with the switch on the
**north-wall at (5,4)**, the Level PA should consider moving
`light-switch` onto the **floor plane on the ant's chain axis** (e.g.
adjacent to `doorway-mid`/`doorway-west`, mid-corridor) and/or changing
its **default `owner`**, so a floor chain-marcher _naturally_ contests it
without a bespoke detachment. This is the cleanest route to a genuinely
transient buff and the lowest-cognitive (§3.4.4) realization of the §6
intent. The POST node/location/owner are **Level-owned** (§4a #1);
Gameplay **recommends**, does not rule, this. Gameplay's payload
(9.3(a)) is direction- and value-stable under any such Level move
(it is `owner`-relative, not coordinate-bound).

### 9.4 Corrected win-rate prediction (contested/transient, not permanent)

**Predicted L4 ant win rate: ~60% (band 58–61).** Re-derived for the
_transient contested_ buff 9.3 produces — explicitly _not_ the §5
permanent-buff arithmetic (which §9.1 falsified):

1. **Five-spider-delta floor (unchanged from §5.2–§5.6):** ~54–56% ant —
   POST-randomization (dominant), full-strength range-limited
   plane-switch, weak data-capped venom-blast, combo components ~neutral,
   L3 `wall` carried. This subtotal is _re-confirmed_ by measurement: the
   spider-favoring placeholder `{litOwner:"ant", faction:"spider",
attack:1}` measured **54%** — i.e. a _spider_ `+1` on top of the five
   deltas lands 54%, so the five-delta floor with a _neutral_ switch is
   ~55–57%. Anchor: **~55%**.
2. **Light-Switch, ant-favoring `+2`, TRANSIENT (live only while the
   spider still holds the contested switch; self-extinguishes on ant
   capture): +3 to +6pp ant.** Unlike the §5 permanent buff (measured
   +43pp at 99%), the corrected buff is live **only for the corridor
   phase before the ant detachment captures the switch** — roughly the
   first half of the engagement in a ~58-turn game, then OFF for the
   decisive end-door assault. It compounds across the head-on attrition
   trades _while the corridor is being forced_ (the high-leverage phase),
   then is gone — a _bounded_ contribution, not the unbounded
   army-wide-all-game one that produced 99%. The contest itself costs the
   ant a detachment (a real tempo price) and the spider a garrison split
   (a real fortress price) — these partially net, keeping the swing in
   the +3 to +6 band rather than the §5 +4 to +6 (the contest cost
   shaves the low end).

**Net: ~55% + (3 to 6) ≈ ~58–61%, settling ~60%.** On target; monotone
L3 **67** → L4 **~60** preserved (an ~7pp shaped descent, consistent
with the measured L3 67 anchor — note §5's "L3 ~68" is updated to the
**measured L3 67** here for the monotone check; the ~60 landing and the
descent shape are unchanged); separated from L6 ~55.

**Why this is now contested/transient, not permanent (the falsified
property, fixed):** the buff's _duration_ is now bounded by an event
that actually occurs in-scenario — the ant detachment capturing the
switch under spider defense (9.3(b)). It is ON during the corridor push
(the §6 "harder pushing through the dark" beat), and provably OFF after
capture (`post.owner === litOwner` → the `continue` at
`light-switch.ts:44` zeroes it). The 99% pathology — `post.owner` frozen
at `"spider"` all game — is eliminated _by construction_: 9.3(b).1 makes
the ant capable of flipping it, 9.3(b).2 makes the spider contest the
flip so it is _earned_, not automatic. The loop tunes the contest
difficulty so the flip lands on a timeline that yields the band. The
ship-gate (§7) measurement is binding: **the corrected config does not
ship until it measures within 58–61 on the deterministic
`baseline-l4` vs `spider-l4` seeds-1..100 sweep** — the §9.1 falsification
method is now the §9 acceptance test.

### 9.5 Interest-claim update (does the §6 claim still hold?)

**The §6 interest claim is AMENDED, not withdrawn — and is now _more_
true than under §4a, because the §4a build did not actually deliver it.**

- **What §6 claimed:** an _earned, legible, self-extinguishing_ comeback —
  "see the enemy holding the lights, feel the `+2` pushing through the
  dark, _earn_ the corridor by taking the switch, at which point the
  crutch self-extinguishes (no permanent ant stat wall)."
- **What §4a as-built actually delivered (falsified):** a **permanent,
  unconditional, army-wide ant `+2` for the entire game, never earned,
  never extinguishing** — the _exact "permanent ant stat wall" §6
  explicitly disclaimed_, and the §6.2 "boring-but-balanced / unfair"
  failure mode inverted onto the ant. The §6 claim was **false as
  shipped under §4a.**
- **What §9 restores:** the contest mandated by 9.3(b) makes the comeback
  _actually earned_ (the ant must detach and fight for the switch under
  spider defense), _actually self-extinguishing_ (capture flips ownership
  → engine zeroes the buff, verified at `light-switch.ts:44`), and the
  spider's "real tactical decision" (§3.2) _mechanically real_ (defend
  the switch vs. hold the end-door fortress — a genuine garrison-split
  choice, not the no-op it was under §4a where the spider held the switch
  for free all game). **§6's interest claim is therefore RE-AFFIRMED as
  the binding intent, and 9.3(b) is the mechanism that — for the first
  time — actually makes it true.** §4a's error was a missing mechanism,
  not a wrong intent. The "spider favored-side payoff sequenced to L6"
  clause of §6 is unaffected and stands.

### 9.6 Termination basis

**Re-arbitration termination: §7 reopening clause, satisfied; no new
sub-agent debate required.** §7 ruled "ruled values are not free knobs —
any change reopens this arbitration"; an empirical falsification is a
change _to the reality the ruling asserted_ and is the canonical reopen
trigger. The reopening is **narrow** (Light-Switch only) and resolved on
**measured evidence + re-derived engine/AI semantics**, not on a contested
value judgment — the §3 _direction_ finding (the only genuinely
adversarial L4 question) is **upheld unchanged**; only its mechanical
_expression_ (transience) is corrected. Both faction sub-agents' best
cases on direction remain fully on record and are not disturbed; no
faction position is newly contested, so **no further §6.2 exchange is
warranted** (re-running the debate would only restate a direction dispute
this amendment does not reopen). The §6.2 automatic stops are unchanged
(A: critic eval still runs in the within-loop, now against the §9.4
band + §9.3(b) doctrine as the binding gate; B: unfired). **Terminate;
the §9 ruling stands; hand 9.3(a) payload + 9.3(b) AI-doctrine to the
orchestrator; 9.3(c) recommendation to the Level PA.**

### 9.7 Corrected verdict summary (supersedes the §8 Light-Switch rows)

| Dimension                              | Corrected ruling (§9)                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light-Switch `combatModifier`          | **`{ litOwner: "ant", faction: "ant", attack: 2 }`** — values unchanged from §4a; correct _given a contestable switch_                                                                                                                                                                                                      |
| Light-Switch direction                 | **Ant** — §3 finding **UPHELD** (placeholder spider-`+1` measured 54%, confirming a spider lever over-spikes toward spider)                                                                                                                                                                                                 |
| Light-Switch magnitude                 | **`+2`** — **UPHELD** (mutual convergence; `+1` sub-perceptual, `+3` spike-breaching)                                                                                                                                                                                                                                       |
| **Binding AI-doctrine (NEW, §9.3(b))** | **Ant AI MUST contest/capture the switch (post-muster detachment via live plane-switch); spider AI MUST actively defend it.** Switch ownership must flip mid-scenario in a seed-robust majority. Contest _difficulty_ is loop-tunable; the _existence of the contest_, the payload, and the direction are ruled invariants. |
| Falsification of §4a/§5                | §4a as-built = **permanent unconditional army-wide ant `+2`** → measured **ant 99%** (+39pp; hard L3 67 → L4 ~60 breach). §5's +4–6pp arithmetic falsified (it assumed a transient buff).                                                                                                                                   |
| Root cause                             | Floor-only chain-march ant AI + fortress spider AI both ignore the north-wall `light-switch`; `owner` frozen `"spider"` all game → `litOwner:"ant"` ⇒ buff permanently ON. Engine/schema correct; §4a did not model the frozen AIs.                                                                                         |
| Corrected L4 prediction                | **~60% (band 58–61)** — five-delta floor ~55% (measurement-anchored: spider-`+1` placeholder = 54%) **+ 3 to 6pp** from the now-_transient_ ant buff (ON during corridor push, OFF after earned capture). Monotone measured-L3 **67** → L4 **~60** preserved; separated from L6 ~55.                                        |
| Interest claim                         | §6 **AMENDED & RE-AFFIRMED**: §4a as-built delivered the _permanent stat wall §6 explicitly disclaimed_ (claim was false as shipped). 9.3(b) is the missing mechanism that makes §6's earned/self-extinguishing/spider-decision intent _actually true_. Spider→L6 clause stands.                                            |
| Level-PA recommendation (§9.3(c))      | If 9.3(b) cannot land the band, consider moving `light-switch` to the floor plane on the ant chain axis and/or changing its default `owner` (Level-owned; recommended, not ruled). Payload is `owner`-relative, stable under any such move.                                                                                 |
| Acceptance test (binding)              | The §9.1 falsification sweep IS the gate: corrected config ships only when `baseline-l4` vs `spider-l4`, deterministic seeds 1..100, measures **58–61%** ant.                                                                                                                                                               |
| Termination                            | §7 reopening clause (empirical falsification = canonical reopen trigger); narrow (Light-Switch only); §3 direction upheld; no new §6.2 exchange warranted.                                                                                                                                                                  |
