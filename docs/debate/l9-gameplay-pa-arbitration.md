# Gameplay Progression Agent — L9 Basement Mechanic Delta: ARBITRATION

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2).
**Status:** Phase-D L9 deliverable. Document only — no code, no scenario
data. This is the concrete L9 mechanic delta spec the orchestrator wires
into `data/level-9/` (over the Level PA's placeholder) and the
within-scenario loop tunes.
**Inputs:** `docs/debate/l9-ant-advocate.md`,
`docs/debate/l9-spider-advocate.md` (opening + rebuttal each);
`docs/debate/l8-gameplay-pa-arbitration.md` incl. its RE-ARBITRATION
(the **merged-L8 baseline this deltas FROM** — full-power hypnotize
`minControlTurns:5, maxControlTurns:10` / `successRate 0.8` /
`reboundImmunityTurns 10`, the tier-3 single-slot MP bound, the
`recruit-count` race economy with the post-dep-#10 re-ruled
`recruit.successRate` start `0.46`, the §3.5.2 binding spider
hypnotize-priority doctrine, plane-affinity at the carried `spider
combat wall {1,1}` + ceiling `{1,1}` + full corner coverage, the
carried L4/L5/L6 state; **all carry forward into L9 byte-identical
except where this delta explicitly changes them — and this delta
changes NOTHING in that set; the merged-L8 state is not relitigated**.
**L7 is PARKED** — level-progression-plan §4f, preserved on
`claude/l7-parked-wip`, NOT merged; the L9 delta is FROM **merged L8**,
the L7 disposition deferred to the post-L8–L10 review; the curve is
reasoned merged L8 **51** → L9 directly, L7 a known gap, **NOT
interpolated**);
`docs/debate/l4-gameplay-pa-arbitration.md` §9 (the
**empirical-falsification precedent, decisive here**: a ruled
ownership-gated effect the frozen AIs do not exercise measured ant
99% / +39pp; the corrective is the payload **plus a binding
within-loop AI-doctrine** that makes the contest genuinely flip
mid-scenario, with the payload + direction + the _existence_ of the
contest as ruled invariants and the _difficulty_ as the loop's
latitude; the ship-gate MUST be measurable);
`docs/mechanic-distribution-plan.md` §2 (the L9 row: **Sump-Pump /
Boiler dynamic-hazard control** — the player-shaping debut), §4
(win-curve: L9 ~60% _aspiration_), §5 boundary cases #5/#6 (the
ownership SPLIT — Level owns the water region + pump/boiler node
placement; Gameplay owns the damage payload);
`docs/level-progression-plan.md` §2 L9 (Basement geometry: `static`,
10×10, dim; floor water-`hazard`-tile region; `south-wall`
crawlspace; 6 POSTs incl. Sump-Pump / Boiler / Fuse-Box objective;
Level-owned, running in parallel, **not** designed here), §4a #5/#6
(the binding split: Level owns the water region + pump/boiler node
placement; Gameplay owns the damage magnitude/cadence/who-it-favors),
§4b (engine FROZEN — dynamic `hazardField` implemented PR #17;
**data/AI-config only, no new engine code**), §4c (the `capture-post`
score-grind / low-`drama` is the **matchup signature** — track
cross-level, do NOT chase per-level; **L9 IS `capture-post`** so it
applies — do not retune L9 for `drama`), **§4d (BINDING —
plane-affinity `wall` deltas empirically inert under the chain-march /
fortress AI doctrine; carried from L8 byte-identical, NOT a curve
lever, NOT budgeted)**, **§4e (BINDING — occupation-`healingRate`
economy engine-inert in non-forced-co-occupation `capture-post`; NOT
an L9 lever)**, **§4f (BINDING — the commander-card economy CANNOT be
the L9 curve lever under the locked card-host heuristic; the L9
shaping/curve MUST NOT be built on cards; no card-economy corrective
in any fallback — the parked-L7 four-falsification precedent)**,
**§4g (BINDING — `abilities.json` hypnotize/recruit params inert
unless the scenario sets `abilityParamsAuthoritative:true`; L9 must
explicitly opt in to tune them and must NOT budget an un-opted
ability-param delta; default NO — justified below)**.
**Bounded by:** §3.1 hard floors, §3.4 cumulative-addition, §5 curve
(L9 ≈ **52–54%**, the **continued descent** below merged L8 51 toward
the L10 ~50 climax — a small player-favorable shaping margin off the
L8 floor, **below the §5-illustrative 60**, monotone-ish toward the
climax; **L7 PARKED, NOT interpolated**), §6.3 ownership (Gameplay
owns the damage payload; the dim 10×10 basement geometry, the
water-`hazard`-tile region, the Sump-Pump / Boiler / Fuse-Box /
Crawlspace POST node _placements_, the `south-wall` crawlspace pairing
are the Level PA's, running in parallel — **not** designed here).
Engine surface FROZEN (§4b) — this delta is **data-only**: the shipped
`postSchema.hazardField` member (`engine/schemas/map.ts:106-112`) +
its `end-of-turn.ts:702-762` `applyHazardFieldTicks` tick + the
shipped `engine/post-capture.ts` ownership/flip rules, the
already-implemented dynamic `hazardField` (PR #17), AI-config via the
within-scenario loop. **No new engine code.**

---

## 1. What was actually contested

Placement was **not** in contest and is not re-decided here. The
mechanic-distribution plan §2 already ruled the L9 component (Sump-Pump
/ Boiler dynamic-hazard control, the player-shaping debut); §5 boundary
cases #5/#6 and level-progression-plan §4a #5/#6 _directed_ the
ownership split (Level owns the water region + pump/boiler node
placement; Gameplay owns the damage payload); §4d/§4e/§4f/§4g _directed_
the no-plane-affinity / no-heal-economy / no-card / no-ability-opt-in
outcomes; the L8 arbitration (incl. its RE-ARBITRATION) fixed the state
L9 inherits. Both faction sub-agents conceded every placement
explicitly:

- **Sump-Pump / Boiler dynamic-hazard control at L9** — ruled §2, the
  Level-owned water region + pump/boiler placement with the
  Gameplay-owned damage payload (§4a #5/#6). Both conceded the slot
  entirely.
- **No plane-affinity delta** — _directed_ by §4d (empirically inert;
  latent identity layer). Both accepted without contest; the spider
  explicitly: "the lesson cuts for me too."
- **No card / heal-economy curve reliance** — _directed_ by §4f/§4e.
  Both accepted without contest; the spider explicitly refused to have
  its terrain climax "hung on an inert system."
- **No `abilityParamsAuthoritative` opt-in** — _directed_ by §4g
  applied to a `capture-post` room with no recruit/hypnotize tuning
  intent. Both accepted; default NO.
- **The entire merged-L8 state** (full-power hypnotize, tier-3 MP
  bound, the `recruit-count` race economy as inert `capture-post`
  structure, plane-affinity, the carried L4/L5/L6 state) carries
  forward **byte-identical** — not relitigated.

The two faction sub-agents converged — the same §6.2-designed profile
the L3/L4/L5/L6/L8 debates produced — onto a **single residual: the
specification shape and pricing of the one §4-clean lever (the
`hazardField` payload) and the binding doctrine that makes it
non-inert**, with strong agreement on structure:

- **Both agree** the **`hazardField` damage payload is the
  load-bearing, §4-clean, AI-spatially-exercised curve lever** — the
  field damages whoever stands on the governed tiles every end-of-turn,
  and POST ownership (which both AIs' optimizers read) gates it. This
  is the §4d/§4e/§4f/§4g-surviving lever; it is a convergence, not a
  dispute.
- **Both agree**, citing the **L4-§9 precedent**, that a payload-only
  spec is the guaranteed falsification: the frozen floor-marching ant
  AI never detours to an off-axis pump (permanent-ON breach, a sub-40%
  ant wall), or the spider never contests it (permanent-OFF breach,
  the lever inert, L9 collapses to the carried L8 ~51 with no shaping).
  The fix is the payload **plus a binding within-loop AI-doctrine**
  that makes the Sump-Pump genuinely flip mid-scenario. **This is a
  convergence, not a dispute.**
- **Both agree** the band is the **continued descent ~52–54%, below
  the §5-illustrative 60** — the ant from the "the frozen engine does
  not durably deliver a late-tier rebound (parked-L7 / L8
  RE-ARBITRATION)" side; the spider from the "the descent is mine to
  carry, low-end ~52" side. Both independently reject the §5 ~60
  aspiration as falsified-in-advance by the late-tier record.
- **The daylight is pricing** (the spider argues the low end ~52 and
  that the field must _register_ hard; the ant argues ~53 with a small
  player-favorable bump when the pump is flipped) — which the §3.4.4
  curve arbiter resolves objectively.

This is exactly the §6.2 convergence the format is designed to produce:
the adversarial exchange collapsed a player-shaping room to (1) a set
of pre-ruled / §4d-§4e-§4f-§4g-directed placements both sides
ratified, and (2) a **single specification-and-pricing question with
both sides independently converged on the answer** (the `hazardField`
payload as the §4-clean lever; the L4-§9 binding flip/contest doctrine
as the thing that makes it non-inert; the band below 60) — the
residual being pricing the curve resolves.

---

## 2. The L9 baseline (what merged L8 ships, what L9 deltas FROM)

From `data/level-8/*` and the L8 arbitration incl. RE-ARBITRATION
(verified against source). The L9 delta is expressed against these:

- **`units.json` `planeAffinity`** — the merged-L8 state (carried from
  L6: spider combat templates `wall {1,1}`, `ceiling {1,1}` + full
  corner coverage; all ant/queen/support/neutral rows), **carried into
  L9 byte-identical**. **L9 does NOT touch `planeAffinity`** — directed
  by §4d. Stated for the orchestrator's no-touch guarantee; **not**
  budgeted as an L9 win-rate mover.
- **`abilities.json` `hypnotize` / `recruit`** — the merged-L8 values
  (`hypnotize {successRate 0.8, minControlTurns 5, maxControlTurns 10,
reboundImmunityTurns 10, tier 3, uses null}`; `recruit {successRate
0.46, tier 2, uses null, cooldown 2}`), **carried into L9
  byte-identical**. **L9 does NOT set `abilityParamsAuthoritative`**
  (§4g default NO — justified §3.4); these params are therefore inert
  at L9 by construction (the engine uses the historical hardcoded
  constants on the byte-identical RNG-free path) **and** moot in a
  `capture-post` room. Stated for the no-touch guarantee; **not** a
  lever.
- **`victoryCondition`** — the Level-owned L9 objective is
  `{ kind: "capture-post", postId: "fuse-box" }` (the shipped
  `victoryConditionSchema` `capture-post` member,
  `engine/schemas/map.ts:27`; the L1 template, dispatched at
  `end-of-turn.ts:523`). Ant wins iff `fuse-box` is ant-owned; ant
  loses if queen dead. **No score path is removed** — but per §4c the
  `capture-post` low-`drama` score-grind signature is the **matchup
  signature** (tracked cross-level, NOT chased per-level): expect it at
  L9; it is not a new defect, do not retune L9 for `drama`.
- **`hazardField` (the L9 lever surface)** — the shipped optional
  `postSchema.hazardField` member (`engine/schemas/map.ts:106-112`:
  `{ tiles: TileCoord[], damage: positive int, suppressedWhenOwnedBy?:
faction }`) + the `end-of-turn.ts:702-762` `applyHazardFieldTicks`
  tick, **already implemented (PR #17)**. **Absent on every shipped
  map** (`data/level-1..8` declare none) — so the L9 introduction is
  byte-identical-safe for all prior scenarios and the gate-29 baseline.
  L9 is the first scenario to populate it. Engine semantics, re-derived
  from source (not trusted from the brief):
  1. For every POST with a `hazardField`, the field is **OFF (drained)**
     iff `suppressedWhenOwnedBy` is set **and** `post.owner ===
suppressedWhenOwnedBy`; otherwise **ON**.
  2. While ON, each end-of-turn every living unit standing on a
     governed `tiles` coordinate loses `damage` HP. Pure, no RNG.
     Overlapping fields stack additively (the stinkbug damage-zone
     convention).
  3. POST ownership (the flip control) follows `engine/post-capture.ts`:
     a non-owner faction party captures a POST by standing on it
     **alone** (no enemy co-located) for `POST_CAPTURE_TURNS = 2`
     end-of-turns; an enemy co-located **pauses** the capture (no
     decrement); the capturer leaving mid-capture **reverts the POST to
     neutral** (which, for a `suppressedWhenOwnedBy:"ant"` field,
     **re-activates** it). This is the exact player-flip + spider-
     re-flood instrument both advocates correctly re-derived.

The honest framing of the L9 delta: not "introduce dynamic hazards"
(the `hazardField` member, the tick, and the capture/flip rules are
all already shipped, PR #17) — it is **"in the dim flooded basement,
the Sump-Pump and Boiler nodes the Level PA places carry a
Gameplay-owned damage payload: the flooded approach lane taxes the ant
column 1 HP/turn until the player fights a detachment to the Sump-Pump
and captures it (draining the flood), while the always-on Boiler
hot-zone is a fixed 2 HP/turn no-go zone that herds the approach into
the flood — and the spider AI actively re-takes the pump to re-flood
the basement, so the player-shaping is a real, contested fight, not a
free off-switch."** One room of change in _function_, expressed
entirely through the shipped `hazardField` data structure + the
post-capture rules + within-loop AI-config. The single new
high-cognitive mechanic is the player-flippable hazard (the
player-shaping debut, mechanic-distribution plan §2); nothing else in
the merged-L8 set changes.

---

## 3. RULING

Decided on **win-curve shape** (the §3.4.4 binding arbiter), with the
§5 "interesting > fair" license consulted and found to **reinforce**,
not override, the curve answer (both factions' interest arguments are
credible and aligned — the room is the player-shaping debut, a flooded
basement the player must drain under a contesting defender). The curve
intent is explicit and binding: **L9 ≈ 52–54%, the CONTINUED DESCENT —
a small player-favorable shaping margin off merged L8's ~51 floor,
held below the §5-illustrative 60, monotone-ish toward the L10 ~50
climax.** **L7 is PARKED** (level-progression-plan §4f): the curve is
reasoned **merged L8 51 → L9 directly**; L7 is a known gap, **NOT
interpolated**; the L7 disposition is deferred to the post-L8–L10
review.

The §5-illustrative L9 ~60 is **explicitly rejected as
falsified-in-advance**. Both advocates independently reached this and
the arbiter ratifies it on the record: parked-L7's four falsifications
(level-progression-plan §4f) and the L8 RE-ARBITRATION (which had to
raise the recruit lever well above its original ceiling _and_
widen/lower the §5 target to `[49,53]` even after dep #10 made the
lever real) are direct, recorded evidence that the late-tier (L7–L10)
§5 targets are **systematically tighter than the frozen engine + locked
AI doctrine can durably deliver** (level-progression-plan §4f RE-ARB
R.4, flagged for the post-L8–L10 consolidated review). A 9-point L8 51
→ L9 60 rebound is precisely the late-tier upward jump that record
shows is not durably reachable; ruling it would set up the L4-§9 /
parked-L7 falsification a fifth time. L9 is ruled as the **continued
descent with a bounded player-favorable shaping margin**, not a
rebound.

### 3.1 The `hazardField` payload — RULING: the load-bearing, §4-clean, AI-spatially-exercised curve lever; the delta budget is spent HERE

**RULING: the L9 curve is carried by the Sump-Pump / Boiler
`hazardField` damage payload — the Sump-Pump field `damage` +
`suppressedWhenOwnedBy:"ant"` (the player-flippable lever) and the
Boiler field `damage` + always-on (the fixed denier). This is the
§4-clean, AI-spatially-exercised lever both factions independently
converged on: the field damages whoever stands on the governed tiles
every end-of-turn, and POST ownership — which both the chain-march ant
and the fortress-defense spider optimizers read — gates it. A
plane-affinity lever is REJECTED (§4d — empirically ~0pp). A
`healingRate` occupation-economy lever is REJECTED (§4e —
winner-take-all POST race nullifies it in `capture-post`). A
card-economy lever is REJECTED (§4f — locked card-host heuristic
inert; parked-L7's four falsifications are the precedent). An
ability-param lever is REJECTED (§4g — un-opted at L9, inert, and moot
in `capture-post`). The delta budget is spent on the `hazardField`,
the lever the locked AIs spatially exercise.**

This is the §4d/§4e/§4f/§4g discipline applied affirmatively: rather
than ruling a lever and watching it falsify (the L4-§9 / parked-L7
precedent), the arbiter spends the budget _only_ on the lever the
frozen AIs provably exercise — here, spatially: a tile-damage tick the
chain-march ant cannot avoid on its approach line and a POST whose
ownership both AIs' decision functions already read. The concrete data
dials (§3.4):

1. **Sump-Pump POST `hazardField.damage`** (ruled START `1`) — the
   per-tile, per-end-of-turn HP tax on the Level-owned flooded
   approach lane while the field is ON (neutral/spider-owned). The
   curve weight is the _path tax integrated over the contested march_,
   not a single hit; `1`/turn over ~4–6 governed tiles and a long
   contested-ON window is the −3 to −5pp tax the descent needs. `2`
   here under the L4-§9 permanent-ON failure mode is a sub-40% ant
   wall (the cold-stomp the L8 §3.3 ceiling discipline forbids) — the
   ruled START is `1`; loop-tunable `1` only (the magnitude is NOT the
   real lever — see §3.2; the integrated contested duration is).
2. **Sump-Pump `hazardField.suppressedWhenOwnedBy`** (ruled `"ant"`) —
   the player-flip direction. Ant-owned ⇒ field OFF (drained);
   neutral/spider-owned ⇒ field ON (flooded). This is a **ruled
   invariant**, not a knob: the player-shaping debut _is_ the player
   draining the flood by capturing the pump.
3. **Boiler POST `hazardField.damage`** (ruled START `2`), **no
   `suppressedWhenOwnedBy`** — the always-on fixed denier. A small,
   high-damage no-go zone the entrenched spider near `fuse-box` eats
   almost none of while the advancing ant must route around it,
   herding the ant column into the Sump-Pump-governed flood (the two
   fields interact _spatially_ — the §4-clean property the brief
   requires of the L9 load-bearing lever). The Boiler is **not**
   flippable (the player cannot drain it); its asymmetry is the
   structural spider tax already priced into the dip — NOT
   double-counted as a reason to over-tune the flood (the L4-§3.D /
   L8-§3.3 stacked-subsidy rejection, applied a sixth time).
4. **The contested-ON duration of the Sump-Pump field** — governed by
   the binding flip/contest doctrine (§3.2). This, not the per-tick
   `damage`, is the real magnitude lever: `damage:1` integrated over a
   long contested-ON window is the −3 to −5pp tax; flipped trivially
   early it is a behavior-flavor zero (the §4d/§4f inert-payoff
   failure, in terrain form — the spider's correct non-negotiable).

**Win-curve justification (§5):** the contested Sump-Pump/Boiler field
is a genuine terrain tax — a −3 to −5pp ant drain while ON, partially
recovered (+3 to +5pp) by the doctrinally-mandated player pump-flip,
the spider's doctrinally-mandated re-take re-flooding it. It is
§4-clean: a tile-damage tick and a POST-ownership gate the locked AIs
spatially exercise, NOT cards / plane-affinity / heal-economy / an
un-opted ability param the locked AIs ignore.
**Interesting-vs-fair:** interest reinforces — a flooded basement the
player must fight to drain while the spider re-floods it is the
player-shaping debut and _the reason L9 is a game_; §5's
player-shaping framing covers the bounded margin.

### 3.2 The binding within-loop flip/contest AI-doctrine — RULING: the load-bearing correction (the L4-§9 precedent); a payload-only spec is the guaranteed falsification

**RULING: per the decisive L4-§9 empirical-falsification precedent, the
`hazardField` payload ALONE cannot be made transient against the frozen
AIs. The fix is the payload (§3.1) PLUS a binding within-loop
AI-doctrine constraint — the "L9 Sump-Pump flip/contest" doctrine —
under which the Sump-Pump's ownership genuinely flips mid-scenario in a
seed-robust majority of games. Both of the following are binding
doctrine (not free knobs — changing them reopens this arbitration
under the §7 / L4-§9 clause):**

1. **The ant AI must be able to, and must, contest the Sump-Pump.**
   The L9 ant policy must include a path that, once the ant force has
   mustered, **detaches a capture element to take the Sump-Pump POST**
   (the engine plane-transition the ant roster carries —
   `ant-plane-switch`, live since L4 — is the means to reach an
   off-floor / crawlspace-adjacent node if the Level PA places it
   there; this is part of _why_ plane-switch is live). The ant must
   _earn_ the pump; until it does, it fights the approach under the
   flood (the "fight through the dark water" beat); once it captures
   the pump the field drains (the "earned, then drained" beat). This
   makes the flip a real, reachable objective rather than dead data —
   the L4-§9 §9.3(b).1 structure, applied a second time.
2. **The spider AI must actively contest / re-take the Sump-Pump as a
   real secondary objective**, not abandon it. The spider picks the
   pump to **pause** the ant's capture (co-locate a picket — engine
   `post-capture.ts` pause rule), and counter-attacks to drive the ant
   detachment off so the POST **reverts to neutral and the flood
   re-activates** (the engine capturer-leave revert rule) — a genuine
   detachment cost to its `fuse-box` fortress (defend/re-take the pump
   and thin the garrison, or concede it and keep the fortress, the
   genuine spider tactical decision the L4-§9 §9.3(b).2 ruling made
   real). **The _existence_ of this spider pump-contest behavior in a
   seed-robust majority of games is a RULED INVARIANT** (the spider's
   correct load-bearing non-negotiable — without it the field is the
   L4-§9 permanent-OFF breach, dead data, the spider's L9 identity
   erased).

The loop tunes **how hard** the pump is to take and **how long** the
field stays contested-ON (ant detachment size, spider pump-garrison
strength, capture timing) toward the §3.3 band. The **payload values
(§3.1), the `suppressedWhenOwnedBy:"ant"` direction, and the
_existence_ of the contest (both clauses 1 and 2)** are the ruled
invariants; the _difficulty_ of the contest is the loop's tuning
latitude. This is within-loop AI tuning (§4b explicitly permits
AI/data tuning; the engine is untouched). The named acceptance risk is
the exact L4-§9 failure: if the fielded ant AI does **not** detour to
capture the pump (field permanently ON → sub-40% wall) **or** the
fielded spider AI does **not** contest it (field trivially OFF → the
lever inert, L9 collapses toward the carried L8 ~51 with no shaping) —
either is the L4-§9 falsification, a fifth time, and **explicitly
reopens this arbitration**.

**Win-curve justification (§5):** the binding doctrine is the only
structure under which `damage:1` integrates to the −3 to −5pp
contested tax (clause 2 holds the field ON long enough) AND the player
recovers a bounded +3 to +5pp by flipping it (clause 1), netting the
ruled ~52–54 continued-descent margin off the L8 ~51 floor. A
payload-only spec measures the L4-§9 permanent breach (either sign).
**Interesting-vs-fair:** interest reinforces — escalation (the flood +
the Boiler herding the approach into it) with a structural in-hand
answer (fight to the pump, hold it against the spider's re-take), the
§3.D doctrine a sixth time.

### 3.3 The continued-descent band — RULING: ~52–54%, point ~53%, below the §5-illustrative 60

**RULING: predicted L9 ant win rate ~53% (band ~52–54%), the CONTINUED
DESCENT — a small player-favorable shaping margin off merged L8's ~51
floor, held BELOW the §5-illustrative 60 (rejected as
falsified-in-advance), monotone-ish toward the L10 ~50 climax. L7 is
PARKED — a known curve gap, NOT interpolated into this math.**

Derivation, anchored to merged L8 (the L8 RE-ARBITRATION R.3 re-ruled
band `[49,53]`, point ~51%, taken as the conservative monotone anchor —
the descent continues from there):

1. **Start: merged L8 ~51% ant** (the L8 RE-ARBITRATION re-ruled
   anchor). **L7 is PARKED (§4f) — NOT an anchor, NOT interpolated.**
   The curve step is reasoned merged L8 51 → L9 directly.
2. **Contested Sump-Pump/Boiler hazard field → the descent's terrain
   engine: −3 to −5pp ant** while ON (the dominant single L9 driver):
   the flooded approach lane (`damage:1` over the contested march) +
   the always-on Boiler hot-zone (`damage:2`) herding the column into
   it, fired by the binding §3.2 doctrine so the field is ON for a
   genuinely-contested window (no cosmetic drizzle — the §4d/§4f
   inert-payoff failure inverted, the spider's upheld "must register"
   ask). §4-clean: a tile-damage tick + a POST-ownership gate the AIs
   spatially exercise — NOT cards / plane-affinity / heal-economy / an
   un-opted ability param.
3. **The doctrinally-mandated player pump-flip → the dip's recovery:
   +3 to +5pp ant.** Clause 1 of the §3.2 doctrine: the ant detaches,
   fights to the Sump-Pump, captures it, drains the flood — the
   player-shaping debut realized. Clause 2 (the spider re-takes it,
   re-flooding) bounds the recovery so it does not overshoot toward
   the rejected §5 ~60. Net the field is a _bounded player-favorable
   margin_, not a 9-point rebound.
4. **No plane-affinity (§4d), no card (§4f), no heal-economy (§4e), no
   ability-param (§4g un-opted, inert) contribution: 0pp.** Carried
   byte-identical; empirically/structurally inert; **not budgeted.**

**Net: ~51% + (a small contested player-favorable shaping margin,
bounded by the spider's re-take) ≈ ~52–54%, settling ~53%**, with the
within-scenario loop tuning the contested-ON duration (ant detachment
size, spider pump-garrison strength, capture timing) toward ~53% — but
the **shape** [contested hazard field + binding flip/contest doctrine],
the **direction** (`suppressedWhenOwnedBy:"ant"`), the **payload
values** (Sump-Pump `damage:1`, Boiler `damage:2`), the **existence of
both doctrine clauses**, and the **no-plane-affinity / no-card /
no-heal / no-ability-opt-in** rulings are ruled invariants, not free
knobs.

**Why this reads as the CONTINUED DESCENT (the binding §5
requirement):**

- **In the neighborhood of, and not a rebound above, merged L8.**
  ~51% → ~53% is a small player-favorable margin (the player _does_
  get a real shaping tool), explicitly **NOT** the §5-illustrative
  L8 50 → L9 60 rebound (rejected — falsified-in-advance by parked-L7
  / the L8 RE-ARBITRATION). The curve continues its gentle descent
  toward the L10 ~50 climax; L9 is the player-shaping room, not a
  difficulty trough.
- **L7 is a PARKED gap, NOT interpolated.** Per the brief and
  level-progression-plan §4f, the curve is reasoned merged L8 51 → L9
  directly; no L7 win rate is factored in; the L7 disposition is
  deferred to the post-L8–L10 consolidated review.
- **The margin is delivered BY THE PLAYER EDITING THE BOARD UNDER A
  CONTESTING ENEMY, not by a passive stat / inert system.** The small
  player-favorable bump is the player draining the flood by capturing
  the pump (clause 1), bounded by the spider re-flooding it (clause 2)
  — the §5 "the player has a structural in-hand answer" reading and
  the §6.2 player-shaping debut, NOT the boring-but-balanced /
  under-delivered-payoff failure §4d/§4e/§4f name.
- **Separated above the L10 ~50 finale.** ~53% (L9) sits clearly above
  the ~50% L10 climax — the intended shape: the player-shaping room is
  a small step above the genuinely-close finale, not a spike and not a
  trough. Had the field been tuned to a cosmetic drizzle or the pump
  been trivially-flippable, L9 would drift toward the rejected ~60
  rebound; had the field been permanently ON (the L4-§9 breach), L9
  would crater sub-40%. The §3.1 payload / §3.2 binding doctrine
  structure holds the dip at a _separated_ ~53%.

### 3.4 The concrete L9 data payload (the headline deliverable; data-expressible, no engine code)

**RULING: the L9 data set = the merged-L8 data set with ONLY the
changes below. Every unmentioned field, template, and row is
byte-identical to merged L8.** Wired into `data/level-9/` over the
Level-PA placeholder. The Level PA owns the dim 10×10 basement
geometry, the water-`hazard`-tile region, the 6 POST nodes incl. the
Sump-Pump / Boiler / Fuse-Box placements and the `south-wall`
crawlspace pairing (§6.3 / §4a #5/#6 — Level-owned, **not** designed
here; Gameplay specifies only the `hazardField` damage payload _on_
the Level-placed pump/boiler nodes and which Level-placed water tiles
each field governs as a Gameplay damage-magnitude/coverage decision —
the §4a #5/#6 split). Gameplay (this arbitration) owns and hereby
specifies:

**(a) The Sump-Pump / Boiler `hazardField` damage payload (§3.1 — the
load-bearing §4-clean lever; the headline deliverable, FIRST and
clearest):**

```
// data/level-9/map.json — Gameplay-owned damage payload ON the
// Level-owned Sump-Pump POST node (Level owns the node location +
// which floor tiles are the water region; Gameplay owns damage +
// suppress direction + which of the Level water tiles this field
// governs):
"sump-pump": {
  ... Level-owned id/name/location/owner/defensiveBonus/healingRate/
      pairedWith/tags ...,
  "hazardField": {
    "tiles": [ /* the Level-owned flooded-approach water-region
                  coordinates — ~4–6 tiles on the ant chain axis */ ],
    "damage": 1,                       // ruled START + ruled value (NOT loop-tunable up; §3.1)
    "suppressedWhenOwnedBy": "ant"     // RULED INVARIANT: ant-owned ⇒ OFF (drained);
                                       //   neutral/spider-owned ⇒ ON (flooded)
  }
}

// data/level-9/map.json — Gameplay-owned damage payload ON the
// Level-owned Boiler POST node (always-on fixed denier; NOT flippable):
"boiler": {
  ... Level-owned id/name/location/owner/defensiveBonus/healingRate/
      pairedWith/tags ...,
  "hazardField": {
    "tiles": [ /* the Level-owned boiler hot-zone — the few tiles
                  immediately around the Boiler node */ ],
    "damage": 2                        // ruled START; always-on (NO suppressedWhenOwnedBy)
  }
}
```

- Sump-Pump `damage: 1` is the ruled value — the per-tile per-turn
  flood tax; the curve weight is the _integrated contested march_
  (§3.1.4), not the per-tick magnitude. **NOT loop-tunable upward**
  (`2` is the L4-§9-permanent-ON sub-40% wall risk); the loop's
  magnitude latitude is the contested-ON _duration_ via the §3.2
  doctrine, not `damage`.
- `suppressedWhenOwnedBy: "ant"` is a **ruled invariant** — the
  player-shaping direction. Ant-owned pump ⇒ flood drained;
  neutral/spider ⇒ flooded.
- Boiler `damage: 2`, no `suppressedWhenOwnedBy` — always-on fixed
  denier (the player cannot drain it). `2` ruled START; the Boiler
  asymmetry is the structural spider tax already priced in (§3.1.3),
  NOT double-counted.
- Overlapping tiles (if the Level region places a tile under both
  fields) stack additively per the engine (`end-of-turn.ts:721`) —
  intended (the Boiler herds the column into the flood; a tile in both
  is a genuine kill-zone).

**(b) The binding within-loop flip/contest AI-doctrine (§3.2 — the
load-bearing correction; data/AI-config, engine frozen):**

```
// within-scenario loop AI-config (the L4-§9 §9.3(b) structure, a 2nd time):
// CLAUSE 1 (ruled invariant — its existence): the L9 ant policy MUST
//   field a path that detaches a capture element to take the
//   `sump-pump` POST once the ant force has mustered (ant-plane-switch
//   is the means if the Level node is off-floor/crawlspace-adjacent).
// CLAUSE 2 (ruled invariant — its existence): the L9 spider policy
//   MUST actively contest the `sump-pump` — picket to pause the ant
//   capture, counter-attack to revert it to neutral (re-flooding) —
//   as a real secondary objective with a genuine fuse-box-garrison
//   detachment cost.
// LOOP LATITUDE (NOT invariant): ant detachment size, spider
//   pump-garrison strength, capture timing — i.e., how hard the pump
//   is to take and how long the field stays contested-ON.
```

**(c) Explicitly carried byte-identical (the no-touch guarantees):**

- **No plane-affinity delta (§4d):** `data/level-9/units.json`
  `planeAffinity` = merged-L8 `planeAffinity`, **byte-identical**
  (spider combat `wall {1,1}` + ceiling `{1,1}` + full corner
  coverage; all ant/queen/support/neutral rows). NOT budgeted as an L9
  win-rate mover. The orchestrator no-touch guarantee.
- **No card-economy curve reliance (§4f):** NO `goldPerTurn` POST is
  added for a card-funding purpose; NO card-deck/market tuning is part
  of the L9 curve. The L9 descent is carried entirely by §3.1/§3.2.
  No card-economy corrective appears in any fallback (§3.6).
- **No `healingRate` occupation economy (§4e):** L9 introduces no POST
  `healingRate`/`defensiveBonus` "occupation economy" as a curve lever
  (it is `capture-post`, winner-take-all POST race; §4e is explicit it
  is engine-inert here). Any Level-placed POST `healingRate`/
  `defensiveBonus` values are Level map artifacts, not a Gameplay
  curve lever.
- **No `abilityParamsAuthoritative` opt-in (§4g — default NO,
  justified):** L9 does **NOT** set `abilityParamsAuthoritative`. L9
  is `capture-post`, not the recruit-or-die room; it has no
  recruit/hypnotize tuning intent; the merged-L8 hypnotize/recruit
  params carry forward byte-identical but are inert at L9 by
  construction (the engine uses the historical hardcoded constants on
  the byte-identical RNG-free path when the flag is absent) **and**
  moot in a `capture-post` room. An un-opted ability-param delta is
  inert and is **not** budgeted as a lever (§4g). The flag stays
  absent (the L1–L8-shipped + gate-29 byte-identity guarantee
  preserved). Default NO is justified: opting in would gain L9 nothing
  (no ability-param lever is wanted) at the cost of the byte-identity
  guarantee — there is no §4g-required justification to opt in, so we
  do not.
- **The merged-L8 state** (full-power hypnotize `minControlTurns 5,
maxControlTurns 10` / `successRate 0.8` / `reboundImmunityTurns 10`,
  tier-3 MP bound, the `recruit-count` race economy as inert
  `capture-post` structure, plane-affinity, the carried L4/L5/L6
  state, all ability params) carries forward **byte-identical**, not
  relitigated.

### 3.5 Per-lever: AI-exercised vs needs a binding within-loop AI-doctrine

Per the §4d/L6/L8 discipline the brief mandates — for EACH lever,
whether the L9 AIs exercise it natively or it needs a binding
within-loop AI-doctrine constraint (named, with a measurable ship-gate
and a non-card §4f falsification fallback):

1. **Sump-Pump / Boiler `hazardField` damage tick (§3.1) —
   PARTIALLY AI-exercised natively; the FLIP needs a BINDING
   within-loop AI-doctrine (named): the "L9 Sump-Pump flip/contest"
   doctrine (§3.2).** The _damage tick itself_ is AI-exercised
   natively and engine-enforced: `applyHazardFieldTicks` deals damage
   to any unit on a governed tile every end-of-turn deterministically,
   no AI cooperation required — the chain-march ant cannot avoid the
   flooded approach tiles on its line, so the tax bites natively. But
   the **flip** (the curve's player-favorable recovery) and the
   **contested-ON duration** (the curve's tax magnitude) are NOT
   natively exercised: per the decisive L4-§9 precedent, the frozen
   floor-marching ant AI does not natively detour to capture an
   off-axis pump, and the fortress-defense spider does not natively
   contest it. The named binding doctrine (§3.2 clauses 1+2) is
   required; its _existence_ in a seed-robust majority of games is a
   **ruled invariant** (the L4-§9 §9.3(b) / L8-§3.5.2 pattern); the
   difficulty/timing is the loop's tuning latitude. A `hazardField`
   the fielded AIs do not flip/contest is the L4-§9 falsification (a
   ruled value the frozen AIs don't exercise) a fifth time.
2. **No plane-affinity / no card / no heal-economy / no
   ability-param (§3.4c) — N/A (carried byte-identical, not levers).**
   No AI-doctrine; explicitly not budgeted.

### 3.6 Where each faction is upheld

Symmetric with the L3/L4/L5/L6/L8 arbitrations (every concession
honored, no over-reach granted, the convergence ratified, neither
faction denied its identity):

- **Spider upheld:** the `hazardField` payload **registers** as a
  genuine biting terrain tax (NOT a cosmetic drizzle tuned to a
  behavior-flavor zero — the §4d/§4f inert-payoff failure inverted,
  the spider's correct non-negotiable); the **spider pump-contest
  clause (§3.2 clause 2) is a RULED INVARIANT** (without it the field
  is the L4-§9 permanent-OFF breach, the spider's L9 identity erased —
  the spider's load-bearing demand, upheld); the Boiler always-on
  asymmetry favoring the entrenched defender is ratified as the
  structural spider terrain tax; the band low-end is honored (~52–54,
  the spider's "the descent is mine to carry, not a rebound to 60"
  framing — upheld). No over-reach: no `damage:2` Sump-Pump (the
  L4-§9-permanent-ON sub-40% wall, rejected), no stacked Boiler-tax
  subsidy (the L4-§3.D / L8-§3.3 double-count, rejected), no
  plane-affinity inflation (§4d, none).
- **Ant upheld:** the load-bearing curve lever is the **§4-clean
  AI-spatially-exercised `hazardField`** the ant demanded (cards
  rejected §4f, plane-affinity rejected §4d, heal-economy rejected
  §4e, ability-param rejected §4g — the ant's load-bearing point, the
  L4-§9 / parked-L7 precedent honored); the **ant pump-flip clause
  (§3.2 clause 1) is a ruled invariant** so the player-shaping is real
  and the flood is genuinely drainable (not the L4-§9 permanent-ON
  sub-40% wall); the band is the **continued descent**, not the
  falsified §5 ~60 rebound (the ant's "the frozen engine does not
  durably deliver a late-tier rebound" reading — upheld as the
  decisive specification frame); the carried merged-L8 state is
  **byte-identical** — no ant tool weakened; no budget waste on inert
  levers.

Neither faction is denied its identity — the spider gets its genuine
biting, genuinely-contested terrain defense at the room built for it;
the ant's answer is the player-shaping flip (fight the detachment to
the pump, hold it against the spider's re-take, route the Boiler).
They are sequenced together in one room by design (the player-shaping
debut _is_ a contested editing of the board): escalation and answer,
the §3.D / L4-§3.2 / L8-§3.6 doctrine, applied a sixth time, with the
§4d/§4e/§4f/§4g lessons all now binding (the dip is carried by the
lever the locked AIs _demonstrably exercise spatially_, made
non-inert by a binding doctrine, not the ones they ignore).

---

## 4. The L9 mechanic delta — concrete, data-level spec

Implementable directly against shipped schemas and the
already-implemented dynamic `hazardField` (PR #17,
`engine/schemas/map.ts:106-112` + `end-of-turn.ts:702-762`) and the
shipped `engine/post-capture.ts` ownership/flip rules; **no engine
code** (§4b). The L9 data set = the merged-L8 data set with **only the
changes below**. Every unmentioned field, template, and row is
byte-identical to merged L8. The orchestrator wires this into
`data/level-9/` over the Level-PA placeholder.

### 4a. Sump-Pump / Boiler `hazardField` damage payload — FIRST and clearest (ruled §3.1; the load-bearing §4-clean lever)

`data/level-9/map.json`, on the Level-owned Sump-Pump and Boiler POST
nodes (Level owns id/name/location/owner/water-region; Gameplay owns
the `hazardField` block + which Level water tiles it governs):

```
"sump-pump": { ...Level-owned node fields...,
  "hazardField": {
    "tiles": [ /* Level-owned flooded-approach water tiles, ~4–6 on
                  the ant chain axis */ ],
    "damage": 1,                       // RULED value (not loop-tunable up)
    "suppressedWhenOwnedBy": "ant"     // RULED INVARIANT (player-flip direction)
  } }

"boiler": { ...Level-owned node fields...,
  "hazardField": {
    "tiles": [ /* Level-owned boiler hot-zone, the few tiles around it */ ],
    "damage": 2                        // RULED START; always-on (no suppress)
  } }
```

- Sump-Pump: ON while neutral/spider-owned (flooded approach, 1
  HP/turn/tile); OFF while ant-owned (drained — the player-shaping
  flip). Captured per `engine/post-capture.ts` (stand alone 2
  end-of-turns; enemy co-located pauses; capturer-leave reverts to
  neutral ⇒ re-floods). `damage:1` ruled, NOT loop-tunable upward; the
  magnitude lever is the contested-ON duration (§3.2), not `damage`.
- Boiler: always-on fixed denier, 2 HP/turn/tile, not flippable. The
  asymmetry (entrenched spider eats ~none, advancing ant routes
  around it into the flood) is the structural spider tax, priced in,
  NOT double-counted.

### 4b. The binding within-loop flip/contest AI-doctrine (ruled §3.2; the load-bearing correction — the L4-§9 precedent)

Within-scenario loop AI-config (engine frozen; data/AI-expressible):

- **CLAUSE 1 (ruled invariant — its existence):** the L9 ant policy
  MUST field a path that detaches a capture element to take the
  `sump-pump` POST once the ant force has mustered (ant-plane-switch
  is the means if the Level node is off-floor).
- **CLAUSE 2 (ruled invariant — its existence):** the L9 spider
  policy MUST actively contest the `sump-pump` (picket to pause the
  ant capture; counter-attack to revert it to neutral, re-flooding) as
  a real secondary objective with a genuine fuse-box-garrison
  detachment cost.
- **LOOP LATITUDE (NOT invariant):** ant detachment size, spider
  pump-garrison strength, capture timing — how hard the pump is to
  take, how long the field stays contested-ON. Tuned toward the §5
  band.

### 4c. Carried byte-identical — the no-touch guarantees (ruled §3.4c)

- `data/level-9/units.json` `planeAffinity` = merged-L8
  `planeAffinity`, **byte-identical** (§4d; NOT budgeted).
- **No `goldPerTurn` POST / no card-market tuning** is part of the L9
  curve (§4f). The L9 descent is carried entirely by §4a–§4b.
- **No POST `healingRate`/`defensiveBonus` occupation-economy** curve
  lever (§4e — engine-inert under `capture-post`).
- **`abilityParamsAuthoritative` ABSENT — default NO (§4g, justified
  §3.4c):** L9 sets no opt-in; merged-L8 hypnotize/recruit params
  carry byte-identical but are inert at L9 by construction and moot in
  a `capture-post` room; not budgeted; the L1–L8-shipped + gate-29
  byte-identity guarantee is preserved.
- All other merged-L8 ability params, rows, and the carried
  L4/L5/L6 state: **byte-identical**, not relitigated.

**One-sentence statement of the L9 delta (§3.4.3 "name what's new"):**
_"The basement is flooded — the approach lane costs you 1 HP a turn
and the boiler roasts a 2-HP no-go zone around it — until you peel a
detachment off the march, fight to the Sump-Pump, and capture it to
drain the water, all while the spiders fight to re-take the pump and
flood you again."_ One room of change; the single new high-cognitive
mechanic is the player-flippable hazard (the player-shaping debut).

---

## 5. Win-rate prediction for L9

**Predicted L9 ant win rate: ~53%** (band **~52–54%**, within the §5
loose tolerance; the §5-illustrative L9 ~60 is **rejected as
falsified-in-advance** by the parked-L7 four-falsification + the L8
RE-ARBITRATION evidence — level-progression-plan §4f / the L8
RE-ARB R.4 late-tier-tightness flag). **This is the CONTINUED DESCENT
— a small player-favorable shaping margin off merged L8's ~51 floor,
held below 60, monotone-ish toward the L10 ~50 climax, separated
above it. L7 is PARKED — a known curve gap, NOT interpolated into this
math.**

Derivation, anchored to merged L8 (the L8 RE-ARBITRATION R.3 re-ruled
`[49,53]`, point ~51%, the conservative monotone anchor):

1. **Start: merged L8 ~51% ant.** **L7 PARKED — NOT an anchor, NOT
   interpolated.** Reasoned merged L8 51 → L9 directly.
2. **Contested Sump-Pump/Boiler hazard field → the descent's terrain
   engine: −3 to −5pp ant** while ON (the dominant single L9 driver),
   fired by the binding §3.2 doctrine so it registers (no cosmetic
   drizzle). §4-clean (a tile tick + POST-ownership gate the AIs
   spatially exercise) — NOT cards/plane-affinity/heal-economy/an
   un-opted ability param.
3. **Doctrinally-mandated player pump-flip → the recovery: +3 to +5pp
   ant** (clause 1), bounded by the spider's doctrinally-mandated
   re-take re-flooding (clause 2) so it does not overshoot toward the
   rejected §5 ~60.
4. **No plane-affinity (§4d), no card (§4f), no heal-economy (§4e), no
   ability-param (§4g): 0pp.** Carried byte-identical; inert; not
   budgeted.

**Net: ~51% + (a small contested player-favorable shaping margin,
bounded by the spider re-take) ≈ ~52–54%, settling ~53%**, with the
loop tuning the contested-ON duration (ant detachment size, spider
pump-garrison strength, capture timing) toward ~53% — but the
**shape**, **direction** (`suppressedWhenOwnedBy:"ant"`), **payload
values** (Sump-Pump `damage:1`, Boiler `damage:2`), **the existence of
both §3.2 doctrine clauses**, and the **no-plane-affinity / no-card /
no-heal / no-ability-opt-in** rulings are ruled invariants, not free
knobs.

**Why this reads as the CONTINUED DESCENT (the binding §5
requirement):** see §3.3 — in merged-L8's neighborhood (~51 → ~53, a
small player-favorable margin, NOT the rejected 9-point §5 rebound to
60); L7 a PARKED gap NOT interpolated; the margin delivered BY THE
PLAYER EDITING THE BOARD UNDER A CONTESTING SPIDER (the player-shaping
debut), not a passive stat / inert system; separated above the L10
~50 finale.

---

## 6. Interest claim

**The L9 delta is the player-shaping debut the tier was building
toward: the first room where the player does not just maneuver the
board but _edits_ it — the basement is flooded and the boiler roasts
the short line, and the answer is not to slug through it but to fight
a detachment to the Sump-Pump and drain the water, while the spider
fights to re-take the pump and flood you again — the continued descent
earned by the terrain becoming the deadliest version of the defense,
with a structural board-editing answer in the player's hands.**

The Level PA built the Basement as variety-bookend #2 (level-
progression-plan §2 L9): dim, damp, a flooded approach lane, a Boiler
emitter, a player-controllable Sump-Pump, `capture-post` to the
Fuse-Box. Mechanic-distribution plan §2 built it as the player-shaping
debut. For eight rooms the player has maneuvered a fixed board; at L9
the board fights back and the player can fight it back. The flood
taxes the chain-march; the Boiler herds it into the flood; the answer
is to peel a detachment off the march, fight to the pump, capture it,
and drain the water — and then hold it, because the spider's whole L9
defense is re-taking the pump to re-flood the basement. That is the
curve continuing its descent because the _terrain became the deadliest
version of the defense in a way the player sees and can solve_ — the
player-shaping reason, not a stat dip (§4d) and not a card economy
that can't fire (§4f). And the player is not without an answer, and
the answer is _structural and in-hand_: drain the flood by taking the
pump (the §4-clean AI-spatially-exercised lever the player controls),
hold it against the spider's re-take, route the Boiler — the
answer-in-the-same-room, the §3.D / L4-§3.2 / L8-§3.6 doctrine, a
sixth time, with the §4d/§4e/§4f/§4g lessons all now binding (the dip
is carried by the lever the locked AIs _demonstrably exercise
spatially_, made non-inert by a binding doctrine — not the ones they
ignore). Both factions' interest goals are served; neither is denied —
only sequenced into one contested room: the spider's genuine terrain
defense and the player's first board-editing fight before the finale,
the escalation and its structural answer.

---

## 7. Termination record

**Termination basis: §6.2 condition 1 — the Gameplay PA's standing
discretionary cutoff authority ("cut off sub-agent debate when it has
heard enough"), invoked after the opening + one rebuttal per faction
(2 debate documents — `l9-ant-advocate.md`, `l9-spider-advocate.md`,
each opening + ≥1 rebuttal; equivalently 2 exchanges of the 6-exchange
cap; the automatic 6-exchange stop did NOT fire — terminated early by
discretion, consistent with the mechanic-distribution plan §1 and the
L3 §7 / L4 §7 / L5 §7 / L6 §7 / L8 §7 precedents).**

- **§6.2 automatic stop A (both fun-critic AND interest-critic
  ≥75/100 on a frozen proposal):** _Not yet fired_ — critic eval runs
  in the within-scenario loop on the implemented L9 data, downstream of
  this arbitration; there is no frozen scored proposal at debate time.
  Per §6.2 and the L3/L4/L5/L6/L8 precedent, this does not block
  arbitration; it is a Phase-D loop gate, recorded as the L9 ship-gate
  below.
- **§6.2 automatic stop B (6 exchanges):** _Not fired_ — only 2
  exchanges occurred (opening + rebuttal per faction).
- **Discretionary cutoff (invoked):** the debate converged to (1) a
  set of **pre-ruled / §4a-§4d-§4e-§4f-§4g-directed placements both
  factions explicitly ratified** (Sump-Pump / Boiler dynamic-hazard
  control the §2 slot; the Level/Gameplay ownership split §4a #5/#6;
  no plane-affinity §4d; no card/heal reliance §4f/§4e; no
  `abilityParamsAuthoritative` opt-in §4g; the merged-L8 state
  byte-identical — none genuinely contested, ratifications), and (2)
  a **single specification-and-pricing question on which both
  factions independently converged** — the `hazardField` payload as
  the §4-clean load-bearing lever, the L4-§9 binding flip/contest
  doctrine as the thing that makes it non-inert, the band below the
  falsified §5 ~60. Both factions' best case is fully on record on
  every dimension; both independently derived the L4-§9-precedent
  specification (the ant from the no-permanent-ON-breach side, the
  spider from the my-terrain-must-register-and-be-contested side). The
  only residual is pricing the §3.4.4 curve arbiter resolves
  objectively. The §6.2 format's value ("adversarial NL surfaces
  considerations neither generates alone") was fully realized — the
  exchange produced the decisive frame (the `hazardField` as the
  §4-clean lever; the L4-§9 binding doctrine with the spider
  pump-contest clause as a load-bearing ruled invariant; the band
  below the falsified §5 ~60) that neither opening alone contained.
  Per roadmap §6.2 the Gameplay PA "cuts off sub-agent debate when it
  has heard enough"; that threshold is met. **Terminate; arbitrate
  now.** No point is genuinely unresolvable.

**L9 ship-gate (handed to the Phase-D within-scenario loop —
MEASURABLE and HARDENED, per the L4-§9 falsification precedent and the
L8 §7 ship-gate hardening the brief mandates):** implement the §4 data
delta + the §4b binding flip/contest AI-doctrine; run the loop to
fun-critic + interest-critic; **the L9 data ships iff ALL THREE
conditions hold** on the deterministic `baseline-l9` vs `spider-l9`
seeds-1..100 sweep (the §9.1/L4 falsification method as the acceptance
test):

1. **Both critics ≥75/100** on the measured L9 config (§6.2 automatic
   stop A, evaluated where it belongs — on the built scenario),
   **AND**
2. **Measured ant win-rate ∈ ~52–54% on the seeds-1..100 sweep**,
   reading as the continued descent in merged-L8 ~51's neighborhood
   (NOT the rejected §5 ~60 rebound) and separated above the L10 ~50
   finale — **with L7 a PARKED gap, NOT interpolated into the curve**,
   **AND**
3. **The §3.2 binding flip/contest doctrine demonstrably exercised in
   a seed-robust set:** the `sump-pump` POST ownership genuinely flips
   mid-scenario (ant captures it) AND the spider genuinely contests it
   (pause/re-take) in a clear majority of the 100 seeds. **A measured
   band hit obtained with the flip/contest doctrine INERT — the pump
   never flipped (field permanently ON) or never contested (field
   trivially OFF) — is an explicit ship-gate FAILURE, NOT a pass**
   (the L8 §7 hardening, applied to L9's terrain lever; the exact
   L4-§9 falsification mode is the named acceptance risk).

The continued-descent monotone-ish requirement (merged L8 ~51 → L9
~52–54, below the rejected §5 ~60) is a **binding ship-gate**: per the
L4-§9 falsification precedent, **a built L9 that does NOT measure in
the ~52–54% band, or hits it with the §3.2 doctrine inert, reopens
this arbitration** under the §7 "ruled values are not free knobs — any
change reopens" clause. The specific L4-§9 failure mode is the named
acceptance risk: if the fielded ant AI does **not** detour to capture
the Sump-Pump (field permanently ON → sub-40% wall) **or** the fielded
spider AI does **not** contest it (field trivially OFF → the lever
inert, L9 collapses toward the carried L8 ~51 with no shaping) — that
explicitly reopens, with the §4b doctrine (ant detachment / spider
pump-garrison / capture timing) and the contested-ON duration as the
corrective levers. **Explicitly, per §4f: NO card-economy corrective
appears in any fallback** — a missed band is corrected by the §3.2
flip/contest doctrine tuning (detachment size, pump-garrison strength,
capture timing) or a further small correction of the [52,54] band on
the curve if the contested-field structural ceiling proves tighter,
**NEVER** by a card-deck/`goldPerTurn`-for-cards lever (the parked-L7
precedent), **NEVER** plane-affinity (§4d), **NEVER** a heal-economy
(§4e), **NEVER** an `abilityParamsAuthoritative` opt-in (§4g — L9
stays opt-out), and **NEVER** by raising Sump-Pump `damage` above `1`
(the L4-§9-permanent-ON sub-40% wall) or disabling the §3.2 doctrine
to hit the band (the L4-§9 / parked-L7 / L8-RE-ARB precedent). The
loop's tuning latitude is the §3.2 doctrine difficulty/timing and the
contested-ON duration. The **ruled invariants** (not free knobs — any
change reopens): the §4a payload values (Sump-Pump `damage:1` +
`suppressedWhenOwnedBy:"ant"`; Boiler `damage:2` always-on), the
§3.2/§4b binding flip/contest doctrine _existence_ (both clauses, the
spider pump-contest clause load-bearing), the §3.4c
**no-plane-affinity / no-card / no-heal-economy / no-ability-opt-in**
carries, and the carried-forward merged-L8 state byte-identity. **Note
the §4c/§4d/§4e/§4f/§4g carried-forward cross-level context:** L9 IS
`capture-post` (the §4c score-grind / low-`drama` matchup signature
applies — expect it; it is the tracked matchup signature, NOT a new
L9 defect; do **not** retune L9 mechanics for `drama`, that is the
deferred UX/feel pass's, not a per-level fix); per the recorded human
decisions, plane-affinity inertness (§4d), heal-economy inertness
(§4e), the card-host trap (§4f), the ability-param opt-in gate (§4g),
and any feel signatures are tracked cross-level (the deferred UX/feel
pass and the post-L8–L10 L7-disposition / late-tier-curve-tightness
review — level-progression-plan §4f RE-ARB R.4), **not** chased
per-level — do not re-introduce plane-affinity / a card economy / a
heal-economy / an ability-param opt-in as a lever if win-rate, the
~53 continued descent, and the merged-L8 51 → L9 → L10 ~50 shape
(L7 parked, not interpolated) hold.

---

## 8. Summary of the verdict

| Dimension                                                     | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanic                                                      | L9 Basement delta vs **merged L8** (data-only; existing `hazardField` member + `applyHazardFieldTicks` tick PR #17, shipped `post-capture.ts` flip rules; AI-config via the within-loop; no engine — §4b). **L7 PARKED — delta is FROM merged L8, L7 NOT interpolated.**                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Merged-L8 state carried forward                               | Full-power hypnotize (`minControlTurns 5, maxControlTurns 10`, `successRate 0.8`, `reboundImmunityTurns 10`), tier-3 single-slot MP bound, the `recruit-count` race economy (inert `capture-post` structure here), `planeAffinity` (spider combat `wall {1,1}` + ceiling `{1,1}` + full coverage), the carried L4/L5/L6 state — **byte-identical**, not relitigated                                                                                                                                                                                                                                                                                                                                                  |
| **Sump-Pump / Boiler `hazardField` payload (FIRST/clearest)** | `data/level-9/map.json` on the Level-owned nodes: `sump-pump.hazardField {tiles:<Level water region>, damage:1, suppressedWhenOwnedBy:"ant"}` (ON neutral/spider-owned ⇒ flooded 1 HP/turn/tile; OFF ant-owned ⇒ drained — the player-flip; `damage:1` RULED, NOT loop-tunable up); `boiler.hazardField {tiles:<Level hot-zone>, damage:2}` (always-on fixed denier, no suppress, RULED START `2`). Overlaps stack additively (engine). The §4-clean AI-spatially-exercised lever.                                                                                                                                                                                                                                   |
| **Binding within-loop flip/contest doctrine**                 | The L4-§9 precedent applied a 2nd time: payload alone cannot be transient vs frozen AIs. **CLAUSE 1 (ruled invariant): ant MUST detach to capture the Sump-Pump. CLAUSE 2 (ruled invariant, load-bearing — the spider's non-negotiable): spider MUST actively contest/re-take it (pause / revert-to-neutral re-flood).** Difficulty/timing = loop latitude.                                                                                                                                                                                                                                                                                                                                                          |
| **No plane-affinity delta**                                   | **EXPLICITLY CONFIRMED — `data/level-9/units.json` `planeAffinity` = merged-L8 BYTE-IDENTICAL, NOT budgeted (§4d-directed).**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **No card-economy curve reliance**                            | **EXPLICITLY CONFIRMED — NO `goldPerTurn`-for-cards / card-market tuning in the L9 curve; no card corrective in any fallback (§4f-directed, parked-L7 precedent).**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| No heal-economy lever                                         | Confirmed — no POST `healingRate` occupation-economy curve lever (§4e — engine-inert under `capture-post`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **`abilityParamsAuthoritative` opt-in**                       | **NO — default opt-out (§4g-directed, justified §3.4c).** L9 is `capture-post` with no recruit/hypnotize tuning intent; merged-L8 params carry byte-identical but inert+moot; opting in would gain nothing at the cost of byte-identity. Flag stays absent.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Per-lever AI exercise                                         | `hazardField` damage tick: **AI-exercised natively** (engine-enforced, the chain-march cannot avoid the flooded approach tiles). The FLIP + contested-ON duration: **AI-exercised via a BINDING within-loop doctrine** — the named "L9 Sump-Pump flip/contest" doctrine (§3.2, both clauses ruled invariants, spider clause load-bearing).                                                                                                                                                                                                                                                                                                                                                                           |
| Favors                                                        | Net **player-favorable but bounded** — a small ~53 shaping margin off the merged-L8 ~51 floor; the contested flood is the engine, the spider's doctrinally-mandated pump re-take is the ceiling that holds it below the rejected §5 ~60                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| L9 win-rate prediction                                        | **~53%** (band **~52–54%**); the **CONTINUED DESCENT** — a small player-favorable shaping margin in merged-L8 ~51's neighborhood, **below the §5-illustrative 60 (rejected as falsified-in-advance by parked-L7 / the L8 RE-ARBITRATION)**, monotone-ish toward and separated above the L10 ~50 climax; **L7 PARKED, NOT interpolated**                                                                                                                                                                                                                                                                                                                                                                              |
| Interest claim                                                | The player-shaping debut — the first room where the player edits the board: fight a detachment to the Sump-Pump and drain the flood while the spider re-takes it to re-flood you; the descent earned by the terrain becoming the deadliest defense, with a structural board-editing answer in-hand                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Termination                                                   | §6.2 discretionary cutoff after 2 exchanges (2 debate docs); auto-stops A/B not fired; **measurable HARDENED ship-gate** = both critics ≥75 **AND** measured ~52–54% on seeds 1..100 (continued descent in merged-L8 ~51's neighborhood, L7 parked not interpolated) **AND** the §3.2 flip/contest doctrine demonstrably exercised (pump flips AND is contested in a seed-robust majority) — **a band hit with the doctrine inert is an explicit FAILURE** (the L8 §7 hardening); a built L9 outside band or doctrine-inert reopens per the L4-§9 precedent — **non-card §4f fallback only** (NEVER cards/plane-affinity/heal-economy/ability-opt-in, NEVER Sump-Pump `damage>1`, NEVER disabling the §3.2 doctrine) |

---

## GRANDFATHERED (human decision, post-2nd-falsification)

**Status: RECORDED human ruling. Supersedes the §52–54 win-band /
~53 prediction above.** L9 was falsified twice without fudging any
ruled value or weakening either doctrine clause:

1. Binding 2-clause doctrine implemented + tuned → 22%, bistable,
   ruled hazard structurally off the doctrine ant's route.
2. GPA-sanctioned Level-side basin re-placement onto the _actual_
   row-9 assault route → the ruled `damage:1` now genuinely
   integrates (affected-units 536 → 1469+, win-rate became a
   responsive monotone function of basin extent), **both clauses
   fully seed-robust** (pump-flip 100/100, spider re-take 96/100) —
   yet the reachable space is **structurally bistable**: ~14–45%
   (fuse-box +5def/+2heal fortress holds) or ~81–100% (overrun),
   a ~40-point dead-zone with **no config / knob / plateau / basin
   extent anywhere near [52,54]**. The GPA's remaining named
   corrective ("a small band correction") is mathematically
   inapplicable — there is no near-band config to correct to.

**Human ruling:** ship L9 at its defensible lower-regime value
**~37%** (shipped config: on-route basin cols 2–8 × rows 8–9,
AI-defaults; decisive, 0 score-resolved, avg 9.5 turns;
pump-flip 100/100, spider re-take 96/100; interest composite **87**).
L9 is a deliberate **"brutal basement" trough** — a conscious §5
curve **inversion** (L9 ~37 sits _below_ the L10 ~50 climax),
justified by the proven structural bistability of the
contested-fortress capture-post under the frozen engine + locked AI
doctrine. See level-progression-plan §4h for the §5 amendment + the
systemic late-tier finding.

**Amended ship-gate (this is what L9 ships against):** interest
critic ≥75 (**87 ✓**) AND both §3.2 doctrine clauses seed-robust
(pump-flip & spider-re-take in a clear majority — **100/100 &
96/100 ✓**) AND decisive (**0 score-resolved ✓**). The [52,54]
win-band requirement is **withdrawn** for L9 by this human ruling.
Ruled invariants otherwise intact: `sump-pump damage:1` /
`suppressedWhenOwnedBy:'ant'`, `boiler damage:2`, no plane-affinity
(§4d), no card/heal economy (§4e/§4f), `abilityParamsAuthoritative`
unset (§4g), shared-builder defaults untouched, gate-29
byte-identical, L1–L8 no-regression.

**Systemic flag (not decided here):** L7 parked (4 failures) + L8
re-arbitrated (late-tier tightness, succeeded) + L9 grandfathered
(structural bistability) = the §5 late-tier curve targets are
empirically tight vs. what the frozen engine + locked AI doctrine
deliver. Recorded as level-progression-plan §4h; the holistic
late-tier-curve policy decision is deferred to the consolidated
end-of-Phase-D review (with the complete 10-level picture, incl.
whatever L10 reveals).
