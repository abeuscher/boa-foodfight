# Gameplay Progression Agent — L5 Bedroom Mechanic Delta: ARBITRATION

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2).
**Status:** Phase-D L5 deliverable. Document only — no code, no scenario
data. This is the concrete L5 mechanic delta spec the orchestrator wires
into `data/level-5/` (over the Level PA's placeholder) and the
within-scenario loop tunes.
**Inputs:** `docs/debate/l5-ant-advocate.md`,
`docs/debate/l5-spider-advocate.md` (opening + rebuttal each);
`docs/debate/l3-gameplay-pa-arbitration.md` §4 (the **explicitly banked
L5 plane-affinity ramp** — `spider combat wall +1/0 → +1/+1`, the armor
sub-field, plus full corner coverage, debuting _at L5_; a _pre-ruled_
delta this arbitration ratifies with concrete numbers, **not**
re-litigates or re-places); `docs/debate/l4-gameplay-pa-arbitration.md`
(incl. §9 re-arbitration — the L4 baseline this deltas FROM; the L4
`wall` plane-affinity state, plane-switch range-limited, venom-blast
weak data-capped, combo components, Light-Switch payload, all carry
forward into L5 **unchanged**, **not** relitigated);
`docs/mechanic-distribution-plan.md` §2 (the L5 row), §3.B
(plane-affinity → full corner coverage at L5), §3.C (recruit-as-order →
L5, win-rate-neutral, decided on §3.4.3 cognitive load), §3.H
(hypnotize light debut → L5, duration-capped; full power L8), §4
(win-curve: L5 predicted ~64–65%, **a rebound UP from L4 ~60%**, "player
adapts; concealment"), §5 (boundary case #2: Under-Bed concealment —
Gameplay-owned per the §4a override);
`docs/level-progression-plan.md` §2 L5 (Bedroom geometry: 10×10, **all 6
planes**, bed = 6×5 floor obstacle bisecting the floor, ceiling is the
premium route, Under-Bed = plane-transition-only concealment garrison),
§4a (Under-Bed concealment is **Gameplay-owned** — human override of the
Level PA recommendation; Level places the POST tile only, Gameplay owns
the fog-immunity rule and must not invalidate the locked spider-AI
visibility spec), §4b (engine deps FROZEN; concealment dep #7 already
implemented PR #15, semantics fixed: an ant party on a `concealment`
POST emits no pheromone trail, denying spider trail-scouting).
**Bounded by:** §3.1 hard floors, §3.4 cumulative-addition, §5 curve
(L5 ≈ 65%, a **deliberate rebound UP** from L4 ~60% — the curve is
**non-monotone** here by design; this must read as the player gaining a
favorable tool, **not** a monotone step), §6.3 ownership (Gameplay owns
this; Bedroom geometry / bed bisection / concealment-POST _placement_
are the Level PA's, running in parallel — **not** designed here). Engine
surface frozen (§4b) — this delta is **data-only**: the shipped
`planeAffinity` structure (`engine/schemas/units.ts`), the shipped
`hypnotize` / `recruit` ability definitions tuned via
`data/level-5/abilities.json` params, roster gating via
`data/level-5/roster-*.json`, and the already-implemented concealment
POST property (dep #7). **No new engine code.**

---

## 1. What was actually contested

Placement was **not** in contest and is not re-decided here. The
mechanic-distribution plan §2 / §3.B / §3.C / §3.H already ruled the
entire L5 component set, the L3 arbitration §4 _explicitly banked_ the
L5 plane-affinity ramp with its forward-consistency shape stated, and
the L4 arbitration fixed the state L5 inherits unchanged. Both faction
sub-agents conceded every placement explicitly:

- **Plane-affinity full corner coverage at L5, `spider combat wall +1/0
→ +1/+1`** — pre-ruled (mechanic-distribution §3.B; _explicitly
  banked_ by the L3 arbitration §4 with its concrete forward shape
  stated). **Both factions ratified it, neither relitigated it.** This
  arbitration finalizes its concrete per-template numbers — it does
  **not** re-place or re-decide it.
- **Hypnotize light debut at L5, duration-capped; full power L8** —
  ruled §3.H, conceded by both; both insisted the cap be a real
  data-number, not a placement gesture (agreed).
- **Recruit-as-order, charisma-gated, at L5** — ruled §3.C
  (win-rate-neutral, decided on §3.4.3 cognitive load: spider won the
  slot, ant won the underlying goal of L8 fluency). The spider conceded
  it _entirely_ — "a ratification, not a debate." Not contested.
- **Under-Bed concealment at L5, Gameplay-owned fog-immunity** — Level
  PA places the POST tile (§2 L5); the human resolver assigned the
  fog-immunity rule to Gameplay (§4a override). Both factions agreed it
  is the §5 rebound's mechanism; neither designed the tile placement.
- **The entire L4 state** (`wall` plane-affinity at the L3-ruled
  values, plane-switch range-limited, venom-blast weak data-capped,
  combo components, Light-Switch `{litOwner:"ant", faction:"ant",
attack:2}` + its §9 AI-doctrine) carries forward **byte-identical** —
  not relitigated.

The two faction sub-agents converged — the same §6.2-designed profile
the L3 and L4 debates produced — onto a **narrow residual set of two
tunables**, with strong agreement on structure:

- **Both agree** the plane-affinity ramp ratifies at its _banked_
  values (`+1/0 → +1/+1`, ants unchanged) and must **register** as a
  real swing (not be tuned to ~0). The ant frames it small ("the spider
  catching up, budgeted against the rebound"); the spider insists the
  ruled −2 to −3pp actually register. **This is a convergence, not a
  dispute** — both want the same banked values, both want it to
  register; the only daylight is the pp-magnitude framing, which the
  curve resolves objectively.
- **Both agree** Under-Bed concealment is the rebound's _engine_ and
  must not be cosmetic; **both agree** it is the §5 rebound mechanism.
  Residual: the ant prices it "+4 to +6pp / dominant"; the spider
  prices it "+4 to +5pp / dominant-but-not-uncontested, budgeted
  against the affinity ceiling." This is a ~1pp framing gap on the same
  structure (concealment = engine; affinity completion = ceiling).
- **Both agree** hypnotize-light needs a hard data-cap at
  `maxControlTurns: 3` (independently converged). Residual: a **single
  integer** — the `minControlTurns` floor (spider: `2`, "light ≠
  absent"; ant: implied ≤3, no stated floor).

This is exactly the §6.2 convergence the format is designed to produce:
the adversarial exchange collapsed a four-component room to (1) a
pre-ruled ramp both sides ratified, and (2) two narrow tunable integers
with both sides' best case on record.

---

## 2. The L5 baseline (what L4 ships, what L5 deltas FROM)

From `data/level-4/*` (verified against source). The L5 delta is
expressed against these:

- **`units.json` `planeAffinity`** — the L4 state (= the L3-ruled
  state, byte-identical), verified in `data/level-4/units.json`:

  | Template class                                                  | floor             | ceiling         | wall       |
  | --------------------------------------------------------------- | ----------------- | --------------- | ---------- |
  | Ant combat (footman, archer, potato-bug, tank + promoted)       | +1 / +1           | −1 / 0          | **−1 / 0** |
  | Ant support/caster (worker, scout, mage, archmage, scout-elite) | +1 / +1 or +1 / 0 | −1 / 0 or 0 / 0 | **0 / 0**  |
  | Ant queen                                                       | +1 / +1           | −1 / 0          | **0 / 0**  |
  | Spider combat (soldier, scout, spinner, elite + promoted)       | −1 / 0            | +1 / +1         | **+1 / 0** |
  | Spider queen                                                    | −1 / 0            | +1 / +1         | **0 / 0**  |
  | Neutrals (mouse, cockroach, spiderling, stinkbug, aunt-ant)     | 0 / 0             | 0 / 0           | 0 / 0      |

  The **spider combat `wall` row is `+1 / 0`** (the L3-ruled
  attack-only debut; the armor sub-field was _banked here_). This is
  the exact row the L5 ramp finalizes.

- **`abilities.json`** — `hypnotize` (`tier 3, uses null, cooldown 0,
params {successRate 0.8, minControlTurns 5, maxControlTurns 10,
reboundImmunityTurns 10}`) and `recruit` (`tier 2, uses null,
cooldown 2, params {successRate 0.25}`) are **already present in the
  data L1→L4, byte-identical** (`data/level-4/abilities.json`). They
  have been tutorial-inert (L4's delta touched switching/venom/combos,
  not hypnotize/recruit). The L5 delta is these becoming **live levers,
  data-capped and roster-gated for the Bedroom** — data-only, no engine
  change (§4b). Engine reads the cap from data: `HYPNOTIZE_MIN/MAX_TURNS`
  in `engine/abilities.ts` are spec-fallbacks; the live values are the
  `data/level-5/abilities.json` `hypnotize.params` (the loop's binding
  data path).
- **Concealment POST property** — dep #7, **already implemented**
  (PR #15, level-progression-plan §4b). Semantics fixed and frozen: an
  ant party occupying a `concealment` POST emits **no pheromone trail**,
  denying the spider trail-scout. No `combatModifier`-style payload
  needed; the property is the POST's `concealment` flag (Level places
  the tile; the _rule_ is Gameplay-owned, §4a override) and the engine
  already honors it.

The honest framing of the L5 delta: not "introduce plane-affinity /
hypnotize / recruit / concealment" (all already shipped in data or
engine) — it is **"the banked spider `wall` armor sub-field finally
pays out at the first 6-plane room, hypnotize debuts as a recoverable
short-duration nuisance, recruit becomes a charisma-gated army-building
order, and the player gains Under-Bed — the first tool that denies the
spider its trail-scout, which is the mechanism of the §5 rebound up
from the L4 dip."** One room of change; the single new high-cognitive
mechanic is the Under-Bed concealment tool (recruit-as-order is the
existing recruit primitive as an order — §3.4.3-budget-honest per the
§3.C ruling; the plane-affinity step is a ramp completion of an
already-on passive, not counted; hypnotize-light is a duration-capped
debut of an already-shipped ability).

---

## 3. RULING

This is decided on **win-curve shape** (the §3.4.4 binding arbiter),
with the §5 "interesting > fair" license consulted and found to
**reinforce**, not override, the curve answer (both factions' interest
arguments are credible and aligned with the curve — the room is the
player gaining a tool against a banked-payoff defender). The curve
intent is explicit and binding: **L5 ≈ 65%, a deliberate REBOUND UP
from L4 ~60%. The curve is non-monotone here by design** (§5: "the
player adapts; concealment is a player-favorable tool" — the user's
explicitly-licensed "an occasional surprising spike … the curve doesn't
need to be monotonic"). The binding monotone segment was L3 → L4 (held,
L4 arbitration §9.4). L4 → L5 is the licensed non-monotone _recovery_,
and it **must read as the player gaining a favorable tool, not a
monotone step**.

### 3.1 Plane-affinity ramp — RATIFIED at the banked values (the pre-ruled L3 step, finalized)

**RULING: the L3-banked L5 plane-affinity ramp is ratified at its
banked values, with concrete per-template numbers in §4a. This is the
pre-ruled L3-§4 step finalized — NOT re-placed, NOT re-litigated. Both
factions ratified it; the only daylight (pp-framing) is resolved on the
curve.**

The L3 arbitration §4 committed the exact shape with stated
forward-consistency intent: "at L5 (Bedroom, all 6 planes reopened) the
spider combat `wall` row deepens `+1/0 → +1/+1` (the banked armor
sub-field) and the gradient reaches full corner coverage. Ants do
**not** get stronger at L5; the gap closes by the spider catching up
off-floor, which is the curve's intended closure mechanism." That is a
_ruled debt_, paid here with concrete numbers. The ant ratified it as
"the spider catching up, not the ant nerfed." The spider ratified the
_values_ and demanded only that the ruled swing _register_ (not be
tuned to ~0). **Both are upheld**: the values are exactly the banked
ones (§4a); the swing is priced at a _registering_ −2 to −3pp (§5),
which is the spider's ask and is also what the curve requires for the
rebound to land at a controlled ~65% rather than over-shooting to ~67%.
The ant's "small / budgeted" framing and the spider's "must register"
framing are **the same ruling** viewed from two sides — the curve
(§3.4.4) makes it objective: −2 to −3pp, the rebound's _ceiling_ (the
L4-Light-Switch logic inverted — see §3.2).

"Full corner coverage" is realized **by the Bedroom being the first
6-plane room** (level-progression-plan §2 L5) so the existing shared
`wall` row and the `spider-corner-cross` passive now bite across all
four wall planes — **no new data field** (the schema collapses
north/south/east/west into one `wall` row; `engine/schemas/units.ts`
lines 22–25). The _data_ delta is therefore _only_ the armor sub-field
`0 → 1` on the spider combat `wall` row; coverage is the Level PA's
6-plane geometry doing what the L3 ruling said it would. No engine
change; no schema change.

### 3.2 Under-Bed concealment — the rebound's ENGINE; ratified as the §5 rebound mechanism

**RULING: Under-Bed concealment is the player-favorable info-denial
tool that drives the §5 rebound. Its expected win-rate contribution is
+4 to +5pp ant — the _engine_ of the licensed ~60% → ~65% rebound. The
plane-affinity completion (−2 to −3pp) is the rebound's _ceiling_, the
budgeted counter-pressure that holds the licensed +5pp from
over-shooting to an unlicensed +8pp. Both factions converged on this
exact structure; the curve makes the pp-split objective.**

This is the L4 Light-Switch logic, **inverted**. At L4 the
Light-Switch was the _spike's ceiling_ (the lever holding a licensed
dip from over-shooting into a collapse). At L5 the plane-affinity
completion is the _rebound's ceiling_ (the budgeted counter-pressure
holding a licensed recovery from over-shooting into an unlicensed
second peak). The mechanism of the rebound is **Under-Bed
concealment** — the spec spider's entire defensive-ambush AI runs on
trail-scouting (TBS §1.5); a party garrisoned on the `concealment` POST
emits no trail; the spider cannot pre-position against an approach it
cannot read. That is a clean, player-favorable, **+4 to +5pp** swing —
and it is _exactly_ the §5/§4 "player adapts; concealment is a
player-favorable tool" rebound, delivered by the player gaining a tool,
**not** by a stat re-tune (which is what makes it read as a rebound,
not a monotone step — the §5 binding requirement).

**Balance + interest framing (Gameplay-owned, §4a — required by the
brief).** The fog-immunity is **positional and occupation-bounded**, by
the _already-frozen_ dep #7 semantics: only a party _on_ the
`concealment` POST is trail-suppressed. The arbiter ratifies the
spider's correct reading as the binding balance frame (it does not
invalidate the locked spider-AI visibility spec — the §4a
sign-off obligation, discharged: the rule changes only whether a trail
is _emitted_, not how the spider AI _consumes_ trails it can see):

- **It is a _staging_ advantage, not a whole-approach cloak.** The bed
  is a 6×5 floor obstacle; Under-Bed is **plane-transition-only**
  (level-progression-plan §2 L5). An ant party stages through Under-Bed
  unscoutable, but to reach the Dresser-Top objective it **must**
  surface onto the ceiling premium route (the bed blocks the floor) —
  and _there_ it emits a trail again and meets the now-complete spider
  `ceiling +1/+1` + full-coverage `wall` affinity. The concealment
  denies the _read of the staging_; the spider's answer is the _hunt on
  the surfacing route_. The escalation (the ant's info tool) and the
  answer (the spider's banked durability) **debut in the same room** —
  the §3.D / L4-§3.2 "escalation with an answer" doctrine, applied
  symmetrically. This is _why_ the L3 ruling banked the plane-affinity
  payoff to _exactly_ L5: the ant's info-denial tool and the spider's
  off-floor durability completion are designed to land together.
- **Win-rate weight ~+4 to +5pp, not +6 to +8.** The §5 rebound is
  ~60% → ~65%, a controlled +5pp. The ant's "+4 to +6 / dominant" and
  the spider's "+4 to +5 / engine-not-uncontested" overlap at **+4 to
  +5**; the spider's _structure_ (engine budgeted against the affinity
  ceiling) is the correct one and is **upheld** — it is the only
  reading that lands the ruled controlled +5pp instead of an
  unlicensed +8pp that would flatten the L4→L5→L6 shape (L6 is the
  ~55% Stairs low; an L5 at ~68% erases the L5→L6 differentiation §5
  shapes). The ant's "dominant" is upheld in _direction_ (concealment
  _is_ the engine, the dominant single driver); the spider's
  "not uncontested" is upheld in _magnitude_ (it is budgeted against
  the −2 to −3pp affinity ceiling). Both factions' framings are honored
  — concealment dominant, affinity completion the registering ceiling.

### 3.3 Hypnotize light debut — duration cap ruled; the residual integer decided

**RULING: hypnotize light debut at L5 is data-capped at
`maxControlTurns: 3, minControlTurns: 2` (the SPIDER wins the residual
`minControlTurns` integer; "light ≠ absent" is upheld symmetrically to
the L3/L4 "weak ≠ absent" doctrine). `successRate` and the HP cost are
unchanged (the gate is identity/cost, not strength — same discipline as
L4 venom-blast `minSpinnersOrQueen` unchanged). Full power L8 (ruled
§3.H), unchanged.**

Both factions independently converged on a hard data-cap at
`maxControlTurns: 3`. The only daylight is the `minControlTurns` floor:
the ant implied ≤3 with no stated floor (silence on the floor); the
spider pinned `2` on its consistent "light ≠ absent" through-line. The
spider wins the integer **on the §3.H ruling's own stated intent**:
§3.H made the duration "a real learner-safety knob" whose _purpose_ is
that the player must _feel_ losing a neutral to learn to play around it
_before_ L8 weaponizes hypnotize at full power against the queen
(§4.3.3) — a cap so tight the seizure resolves before the player can
perceive/respond would leave L8's climax a **cold open**, the exact
failure §3.H's light-debut structure was ruled to prevent. A
`minControlTurns: 2` floor (expected window ~2.5 turns) is a real,
perceptible, _recoverable_ seizure — present, not catastrophic, not
absent. This is the symmetric application of the spider's L3/L4 "weak
must not be tuned to absent" doctrine that the arbiter ratified for the
spider's own tools (L3 §3 "weak `wall` not tuned to absent," L4 §4c
"venom-blast weak is a real data-cap") — applied here to _hypnotize_:
light ≠ absent, just as weak ≠ absent. The ant is not denied — a
2–3-turn hypnotize is exactly the "short hypnotize the ant can play
around" §3.H specified; it is recoverable (vs the 5–10 of full power)
and pedagogically real.

### 3.4 Recruit-as-order — ratified, win-rate-neutral, uncontested

**RULING: ratify §3.C. Recruit-as-order debuts at L5 as the existing
`recruit` primitive (25% successRate, tier 2, cooldown 2 — unchanged)
fielded as a charisma-gated _order_ on the `ant-mage` / `ant-archmage`
line (the L3 charisma-promotion / `leader-eligible` carriers). No param
inflation. Win-rate-neutral (~0pp) — army-building tempo fluency, the
L8 recruit-or-die runway (§4.3.3), decided on §3.4.3 cognitive load,
not balance. Spider conceded it entirely; not contested.**

### 3.5 Where each faction is upheld

Symmetric with the L3/L4 arbitrations (every concession honored, no
over-reach granted, the loser of an integer fully upheld elsewhere):

- **Spider upheld:** the banked L3 plane-affinity payoff is _paid in
  full_ at its designed 6-plane home, at the exact banked values
  (`+1/0 → +1/+1`, full corner coverage), and priced to _register_
  (−2 to −3pp, the spider's ask — not tuned to ~0); the
  `minControlTurns: 2` residual integer (light ≠ absent); the
  positional-staging concealment frame (the spider's hunt on the
  surfacing route is real, the §4a sign-off discharged on the spider's
  reading); the L4 state carried forward unchanged. No over-reach
  granted: armor sub-field is `+1` (not inflated), ants untouched, the
  spider did not push past the banked values.
- **Ant upheld:** Under-Bed concealment is ratified as the _dominant_
  rebound driver and the §5 mechanism (+4 to +5pp, the engine);
  plane-affinity completion is the spider catching up, _ants unchanged_
  (no ant nerf — ant `wall −1/0`, ant floor/ceiling, ant queens /
  support / casters all byte-identical to L4); hypnotize is _capped_
  and _recoverable_ (`maxControlTurns 3`); recruit-as-order is the weak
  existing primitive, no inflation, the L8 fluency runway the ant
  argued for. The ant's "rebound must be earned by a player-favorable
  tool, not a re-tune" is the binding §5 reading and is upheld as the
  decisive frame.

Neither faction is denied its identity — the spider's banked durability
payoff lands at its designed home; the ant's first information-denial
tool drives the licensed rebound. They are _sequenced together in one
room by design_ (the L3 ruling banked the payoff to L5 _because_
concealment debuts there): escalation and answer, the §3.D doctrine.

---

## 4. The L5 mechanic delta — concrete, data-level spec

Implementable directly against shipped schemas and the
already-implemented concealment POST property; **no engine code**
(§4b). The L5 data set = the L4 data set with **only the changes
below**. Every unmentioned field, template, and row is byte-identical
to L4. The orchestrator wires this into `data/level-5/`.

### 4a. Plane-affinity ramp — FINALIZED (the headline deliverable; the pre-ruled L3-banked step, concrete numbers)

**This is the ruled L3-banked step ratified with concrete values — NOT
re-placed, NOT re-litigated.** Implementable directly against the
shipped `planeAffinitySchema` (`engine/schemas/units.ts`). The L5
`units.json` = the L4 `units.json` with **only the `wall` `armor`
sub-field changed from `0` to `1`** on **exactly these eight spider
combat templates**. The `wall` `attack` stays `+1` (L3-ruled,
L4-carried). Floor/ceiling rows on **all** templates: byte-identical to
L4. "Full corner coverage" requires **no data change** — it is the
Level PA's 6-plane Bedroom geometry making the existing shared `wall`
row + `spider-corner-cross` passive bite across all four wall planes.

| Template                 | floor (unchanged) | ceiling (unchanged) | wall (L4) | **wall (L5 delta)** |
| ------------------------ | ----------------- | ------------------- | --------- | ------------------- |
| `spider-soldier`         | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |
| `spider-scout`           | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |
| `spider-spinner`         | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |
| `spider-elite`           | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |
| `spider-veteran-soldier` | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |
| `spider-knight`          | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |
| `spider-weaver`          | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |
| `spider-stalker`         | −1 / 0            | +1 / +1             | +1 / 0    | **+1 / +1**         |

(The four base combat templates + their four promoted variants — the
same eight-template propagation pattern the L3 ruling §4 established;
this is not a separate delta, it is the banked armor sub-field
completing on the L3 combat profile.)

**Untouched (explicitly, by ruling — byte-identical to L4):**
`ant-footman`, `ant-archer`, `ant-potato-bug`, `ant-tank` and their
promoted variants (`wall` stays `−1 / 0` — **ants do NOT get stronger
at L5**, the L3-§4 binding constraint); `ant-queen`, `spider-queen`
(`wall` stays `0 / 0`); `ant-worker`, `ant-scout`, `ant-mage`,
`ant-archmage`, `ant-scout-elite` (`wall` stays `0 / 0`); all neutrals
(`mouse`, `mouse-merc`, `cockroach`, `stinkbug`, `spiderling`,
`aunt-ant` — `wall` stays `0 / 0`). **Floor and ceiling rows on ALL
templates: byte-identical to L4.** Spider combat `wall` `attack`:
**unchanged at `+1`** (only `armor` moves `0 → 1`).

**One-sentence statement of the plane-affinity delta (the §3.4.3 "name
what's new" test):** _"The climbing spiders are now as hard to kill as
they are dangerous on the walls and corners — the durability the L3
ruling promised them, paid out at the first room with all six planes
open."_ A ramp completion of an already-on passive — not a new
high-cognitive mechanic.

### 4b. Under-Bed concealment — balance + interest framing (Gameplay-owned, §4a; the rebound's engine)

No `combatModifier`-style payload and **no engine change** — dep #7 is
already implemented (PR #15) and its semantics are frozen: a party
occupying a POST with the `concealment` property emits **no pheromone
trail**. The Level PA places the Under-Bed POST tile and its
`concealment` flag (level-progression-plan §2 L5; plane-transition-only,
the bed blocks the floor). Gameplay (this arbitration) owns the
**balance + interest framing** of that rule, hereby specified as the
binding Gameplay-side spec:

- **Positional, occupation-bounded** (the frozen dep #7 semantics,
  ratified as the balance frame): trail-suppression applies **only
  while the party is on the Under-Bed POST**. A party that leaves to
  advance resumes emitting a trail and is scoutable/ambushable.
  Concealment is a _staging_ advantage, not a whole-approach cloak.
- **§4a sign-off obligation (discharged):** the rule changes only
  whether a trail is _emitted_, not how the spider AI _consumes_ trails
  it can see — it does **not** invalidate the locked spider-AI
  visibility spec (the deciding factor of the §4a human override). The
  spider's defensive-ambush AI is intact; it simply has no trail input
  for the concealed staging party.
- **Win-rate contribution: +4 to +5pp ant** (the dominant single L5
  driver; the _engine_ of the §5 rebound — see §5). Budgeted against
  the −2 to −3pp plane-affinity completion (the rebound's _ceiling_).
- **Interest framing:** the player who lost parties at L4 to a spider
  that always seemed to know where they'd be learns at L5 that the
  answer is _information control, not more attack_ — stage through
  Under-Bed, deny the trail, surface to the ceiling, arrive unread.
  The rebound is _earned by using a player-favorable tool well_. This
  is what makes L5 read as **the player gaining a favorable tool, not
  a monotone step** — the binding §5 non-monotone requirement.

### 4c. Hypnotize light debut — data-capped (ruled §3.3)

Data-only via `data/level-5/abilities.json`. The L4 `hypnotize` is
`tier 3, uses null, cooldown 0, params {successRate 0.8,
minControlTurns 5, maxControlTurns 10, reboundImmunityTurns 10}`.
"Light debut" is a **measurable param cap** (both factions' explicit
demand; the engine reads the live cap from data — the
`HYPNOTIZE_MIN/MAX_TURNS` in `engine/abilities.ts` are spec-fallbacks,
the binding values are the data params):

```
"hypnotize": { "tier": 3, "uses": null, "cooldown": 0,
  "params": { "successRate": 0.8, "minControlTurns": 2,
    "maxControlTurns": 3, "reboundImmunityTurns": 10 } }
```

- `maxControlTurns 10 → 3`, `minControlTurns 5 → 2` (ruled §3.3 — a
  recoverable short seizure the player can play around; "light", not
  catastrophic; "light ≠ absent" — present and perceptible).
- `successRate 0.8` **unchanged** (the gate is identity/cost, not
  strength — same discipline as L4 venom-blast `minSpinnersOrQueen`
  unchanged; the HP-half cost in `engine/abilities.ts` `handleHypnotize`
  is engine-fixed and unchanged).
- `reboundImmunityTurns 10` **unchanged**.
- Roster-gated to the existing spider hypnotize carriers (any spider
  unit may attempt per `handleHypnotize`; no new carrier at L5 — the
  L4 spider roster, unchanged).
- **Forward consistency:** L8 restores hypnotize toward full power
  (`minControlTurns 5 / maxControlTurns 10`) as its designed climax
  (ruled §3.H; §4.3.3) — the 3-scenario runway (L5→L8) both factions'
  runway test requires. Stated, not L5 work.

### 4d. Recruit-as-order — charisma-gated (ruled §3.4)

Data-only via roster gating; **no ability-definition change**.
`recruit` stays in `data/level-5/abilities.json` byte-identical to L4
(`tier 2, uses null, cooldown 2, params {successRate 0.25}`). The L5
delta is roster: `recruit` is fielded as a live _order_ on the
charisma-gated `ant-mage` / `ant-archmage` line (`leader-eligible`, the
L3 charisma-promotion carriers) in `data/level-5/roster-ants.json` — at
L1–L4 it sat on the same templates but tutorial-inert as an order. No
param change (the 25% rate / tier-2 cost are the weak end, unchanged).
Win-rate-neutral (~0pp, ruled §3.C). The L8 recruit-or-die fluency
runway (§4.3.3). Stated; the §3.4.3 budget item is the Under-Bed tool,
not this (the §3.C ruling: recruit-as-order is the existing primitive
as an order, not a new high-cognitive mechanic — upheld).

### 4e. The L4 state — carried forward UNCHANGED

`data/level-5/units.json` floor/ceiling rows + all ant/queen/support/
neutral `wall` rows = `data/level-4/units.json`, **byte-identical**
(only the eight spider-combat `wall` `armor` sub-fields move `0 → 1`).
Plane-switch (range-limited; full corner coverage banked to L6 —
**not** L5; L5 is the _affinity_ full-coverage room, plane-_switch_
full coverage is L6, ruled §3.I — stated to prevent conflation),
venom-blast weak data-capped, combo components roster-gated, the
Light-Switch `{litOwner:"ant", faction:"ant", attack:2}` + its §9
AI-doctrine: all carried forward byte-identical, **not** relitigated.

**One-sentence statement of the L5 delta (the §3.4.3 "name what's new"
test):** _"The bed splits the room and the ceiling is the only way over
— hide your column Under-Bed so the spiders can't track your approach,
but the spiders are now as tough as they are deadly up on the walls
where you have to surface."_ One room of change; the single new
high-cognitive mechanic is the Under-Bed concealment tool.

---

## 5. Win-rate prediction for L5

**Predicted L5 ant win rate: ~65%** (band ~64–66%, within the §5 loose
tolerance and the mechanic-distribution plan §4 "~64–65%, rebound;
player adapts; concealment" requirement). **This is a deliberate
REBOUND UP from L4 ~60% — a non-monotone step, NOT a descent.**

Derivation, anchored to the L4 arbitration's ruled landing (L4 ~60%,
the §9.4 corrected band 58–61, itself anchored to the measured-L3 67):

1. **Start: L4 ~60% ant** (the L4 §9.4 ruled landing — the licensed
   randomization-shock spike). The L5 step is measured _up_ from ~60%.
2. **Under-Bed concealment (the rebound's ENGINE): +4 to +5pp ant.**
   The dominant single L5 driver. The spec spider's defensive-ambush
   AI runs on trail-scouting (TBS §1.5); a party on the `concealment`
   POST emits no trail; the spider cannot pre-position against an
   unreadable staging approach. A clean, player-favorable swing — and
   _the mechanism of the licensed rebound_ (the player gained a tool,
   not a stat re-tune). Occupation-bounded (staging advantage, not a
   whole-approach cloak — §4b), which caps it at +5, not +8.
3. **Plane-affinity completion (the rebound's CEILING): −2 to −3pp
   ant.** The banked L3 spider payoff (`spider combat wall +1/0 →
+1/+1`, full corner coverage) at its designed 6-plane home. Ants
   unchanged — the gap closes by the spider catching up off-floor (the
   §5 "enemy got more dangerous" closure). Registers (the spider's
   ask, upheld); budgeted _against_ the concealment engine so the net
   is the controlled licensed +5pp, not an over-shoot.
4. **Hypnotize light (`maxControlTurns 3, minControlTurns 2`): ~−1pp
   ant.** A recoverable short seizure of a neutral; negligible inside
   the rebound (ruled §3.H "≈ +1pp spider, negligible inside the ~65%
   rebound").
5. **Recruit-as-order (charisma-gated): ~0pp.** Army-building tempo
   fluency; win-rate-neutral by the §3.C ruling.

**Net: ~60% + (4 to 5) − (2 to 3) − ~1 ≈ ~64–66%, settling to ~65%**,
with the within-scenario loop tuning the concealment-staging timing
(how much trail-denial the Under-Bed garrison actually buys against the
spider scout AI) and the Pillow-Fort / Dresser-Top POST def (Level-owned
POST stats, Gameplay-neutral) toward the target.

**Why this reads as a deliberate REBOUND UP, not a monotone step
(the binding §5 requirement):**

- **Strictly ABOVE L4.** ~60% → ~65% is an unambiguous **+5pp recovery**
  — the curve _rises_. This is the §5/§4-licensed non-monotone rebound
  ("the player adapts; concealment is a player-favorable tool"), the
  user's explicitly-licensed structure ("the curve doesn't need to be
  monotonic; an occasional surprising spike … is a good thing"). The
  binding monotone segment was L3 → L4 (held, L4 §9.4); **L4 → L5 is
  the licensed non-monotone recovery and is _engineered_ to rise**,
  exactly as the mechanic-distribution plan §4 ("L5 ~64% — rebound")
  and roadmap §5 ("L5 65% — concealment POSTs; player adapts; rebound")
  require.
- **The rebound is delivered BY THE PLAYER GAINING A TOOL, not a stat
  re-tune.** The +5pp net is _driven by Under-Bed concealment_ (the
  player's new info-denial tool), _ceilinged by_ the spider's banked
  durability payoff. Ants get **no** stat buff at L5 (ant rows
  byte-identical to L4); the rebound is entirely the player learning to
  use a favorable mechanic against a defender that _also_ got more
  dangerous on its own planes. This is precisely the §5 "player adapts"
  reading and the §6.2 "the player gained an answer, the enemy also
  escalated, and the net is the player ahead because they have the
  better tool in this room" closure — **not** a boring monotone step
  and **not** the "ants got a free stat" failure mode.
- **Separated from L6 ~55%.** L6 (Stairs) is the ~55% geometry-favors-
  the-defender low (mechanic-distribution §4; Level PA §2 L6). ~65%
  (L5) → ~55% (L6) is a clean ~10pp resumed descent with the L5 rebound
  _separated_ — the curve's intended shape (a dip at L4, a rebound at
  L5, a deeper descent into L6). Had the plane-affinity completion been
  tuned to ~0 (the ant's over-soft framing) L5 would land ~67–68%,
  crowding the L5→L6 differentiation; had concealment been priced +8
  (the over-dominant framing) L5 would land ~68%+, the same crowding.
  The §3.2 engine/ceiling structure is the knob that holds the rebound
  at a _separated_ ~65%.

---

## 6. Interest claim

**The L5 delta makes the answer to L4's disorientation legible — it is
information control, not more attack — while paying the spider its
banked durability debt at its designed home, the two debuting together
in one room.**

The Level PA built the Bedroom as the first info-asymmetry room: the
bed bisects the floor, the ceiling is the premium route, Under-Bed is a
plane-transition-only concealment garrison. Before this delta the
player who lost parties at L4 to a spider that always seemed to know
where they'd be has no answer; L4 reads as "the enemy is psychic." The
Under-Bed concealment tool is the smallest possible change that makes
the rebound _earned and legible_: the player learns the counter to a
defending-ambush faction is to _stop being scoutable_ — stage Under-Bed,
deny the trail, surface to the ceiling unread, take the objective. That
is the ant doctrine — out-think, don't out-slug — taught by a
player-favorable mechanic, with the rebound _earned by using the tool
well_, not handed by a stat re-tune (which is exactly why L5 reads as a
rebound, not a monotone step — the binding §5 requirement). It is
simultaneously the §6.2 good closure: the curve breathes up because the
_player gained a real answer_. And the spider is not a punching bag for
it — the plane-affinity completion pays the L3-banked durability debt
_at its designed 6-plane home_, landing in the same room as the ant's
tool: the ant cloaks its staging, must surface to the ceiling for the
objective, and there meets a spider that is now as hard to kill as it
is dangerous on its identity planes. Escalation (the ant's info tool)
_with an answer_ (the spider's banked durability), debuting _together
by design_ — the §3.D / L3-§4 / L4-§3.2 doctrine, the reason the L3
ruling banked the payoff to _exactly_ L5. Both factions' interest goals
are served; neither is denied — only sequenced into one room: the
player's first information-denial tool and the spider's first
favored-durability scenario, the rebound and its ceiling, the
escalation and its answer.

---

## 7. Termination record

**Termination basis: §6.2 condition 1 — the Gameplay PA's standing
discretionary cutoff authority ("cut off sub-agent debate when it has
heard enough"), invoked after the opening + one rebuttal per faction
(2 debate documents — `l5-ant-advocate.md`, `l5-spider-advocate.md`,
each opening + ≥1 rebuttal; equivalently 2 exchanges of the 6-exchange
cap; the automatic 6-exchange stop did NOT fire — terminated early by
discretion, consistent with the mechanic-distribution plan §1 and the
L3 §7 / L4 §7 precedents).**

- **§6.2 automatic stop A (both fun-critic AND interest-critic ≥75/100
  on a frozen proposal):** _Not yet fired_ — critic eval runs in the
  within-scenario loop on the implemented L5 data, downstream of this
  arbitration; there is no frozen scored proposal at debate time. Per
  §6.2 and the L3/L4 precedent, this does not block arbitration; it is
  a Phase-D loop gate, recorded as the L5 ship-gate below.
- **§6.2 automatic stop B (6 exchanges):** _Not fired_ — only 2
  exchanges occurred (opening + rebuttal per faction).
- **Discretionary cutoff (invoked):** The debate converged to (1) a
  **pre-ruled plane-affinity ramp both factions explicitly ratified**
  at its banked values (the L3-§4 step — not genuinely contested, a
  ratification; the only daylight was a pp-framing both sides agreed
  the curve resolves objectively), and (2) **two narrow tunables** —
  the concealment win-rate weight (both agreed it is the rebound's
  engine and must not be cosmetic; ~1pp framing gap on identical
  structure) and the hypnotize `minControlTurns` floor (a **single
  contested integer**, `2` vs implied-≤3). Both factions' best case is
  fully on record on every dimension; both independently converged on
  the structure (concealment = engine, affinity completion = ceiling;
  hard hypnotize cap at 3). A third exchange would only restate the
  pp-arithmetic the §3.4.4 curve arbiter already resolves objectively
  and the one-integer floor the §3.H ruling's own stated intent
  resolves. The §6.2 format's value ("adversarial NL surfaces
  considerations neither generates alone") was fully realized — the
  exchange produced the decisive frame (concealment as the rebound's
  _engine_ and the plane-affinity completion as its _ceiling_ — the L4
  Light-Switch logic inverted; and the "escalation and answer debut
  together by design, which is why L3 banked the payoff to exactly L5"
  reading) that neither opening alone contained. Per roadmap §6.2 the
  Gameplay PA "cuts off sub-agent debate when it has heard enough";
  that threshold is met. **Terminate; arbitrate now.** No point is
  genuinely unresolvable.

**L5 ship-gate (handed to the Phase-D within-scenario loop):**
implement the §4 data delta; run the loop to fun-critic +
interest-critic; the L5 data ships when **both critics ≥75/100** on the
measured L5 config (§6.2 automatic stop A, evaluated where it belongs —
on the built scenario), **AND the measured ant win-rate lands in the
~64–66% band on the deterministic seeds-1..100 sweep, reading as a
REBOUND ABOVE the measured L4 ~60%** (the non-monotone-up requirement
is a binding ship-gate, per the L4 §9 falsification precedent — a built
L5 that does _not_ rebound above L4 falsifies this arbitration and
reopens it under the §7 "ruled values are not free knobs" clause). The
loop's tuning latitude is the concealment-staging timing (how much
trail-denial the Under-Bed garrison buys against the spider scout AI)
and the Pillow-Fort / Dresser-Top POST def (Level-owned POST stats,
Gameplay-neutral) toward the ~65% target. The §4a `planeAffinity`
magnitudes (the banked `+1/+1` armor sub-field), the hypnotize cap
(`maxControlTurns 3, minControlTurns 2`), and the recruit-as-order
roster gate are the **ruled values**, not a free knob — any change to
them reopens this arbitration. **Note the §4c carried-forward
cross-level signature** (level-progression-plan §4c: `capture-post` +
competent-defense grinds to the score path, low `drama`): expect the
same signature on L5; per the recorded human decision it is tracked
cross-level (the deferred UX/feel pass), **not** chased per-level — do
not retune L5 mechanics for `drama` if win-rate, the ~65% rebound, and
the L4→L5→L6 shape hold.

---

## 8. Summary of the verdict

| Dimension                       | Ruling                                                                                                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanic                        | L5 Bedroom delta vs L4 (data-only; existing structures + already-implemented concealment dep #7; no engine — §4b)                                                                                                                                           |
| L4 state carried forward        | Floor/ceiling + all ant/queen/support/neutral `wall` rows, plane-switch, venom-blast, combos, Light-Switch — **unchanged**, not relitigated                                                                                                                 |
| **Plane-affinity ramp (FINAL)** | **Spider combat `wall` `armor` `0 → 1` (`+1/0 → +1/+1`) on 8 templates** (`spider-soldier/scout/spinner/elite` + `-veteran-soldier/-knight/-weaver/-stalker`); `attack` stays `+1`. The pre-ruled L3-§4 banked step, ratified — NOT re-placed/re-litigated. |
| Full corner coverage            | Realized by the Level PA's 6-plane Bedroom geometry making the shared `wall` row + `spider-corner-cross` bite on all 4 wall planes — **no data/engine change**                                                                                              |
| Ants at L5                      | **Unchanged** (ant `wall −1/0`, floor/ceiling, queens/support/casters all byte-identical to L4 — the gap closes by the spider catching up, NOT an ant nerf)                                                                                                 |
| Under-Bed concealment           | Gameplay-owned framing (§4a); occupation-bounded staging advantage; the §5 rebound's **engine**, **+4 to +5pp ant**; §4a AI-spec sign-off discharged                                                                                                        |
| Hypnotize light debut           | Data-capped `maxControlTurns: 3, minControlTurns: 2` (spider wins the residual integer — "light ≠ absent"); `successRate 0.8` unchanged; → full power L8                                                                                                    |
| Recruit-as-order                | Existing `recruit` (25%/tier-2, unchanged) fielded as a charisma-gated order on `ant-mage`/`ant-archmage`; win-rate-neutral (~0pp, ruled §3.C); roster-only                                                                                                 |
| Favors                          | Net **player/ant** (the licensed ~65% rebound); concealment is the engine, the spider's banked plane-affinity payoff is the budgeted ceiling                                                                                                                |
| L5 win-rate prediction          | **~65%** (band 64–66%); a **deliberate REBOUND UP** from L4 ~60% (NON-monotone by §5 design; the player gained a tool, not a stat re-tune); separated from L6 ~55%                                                                                          |
| Interest claim                  | The answer to L4's disorientation made legible (info control, not attack); the spider's banked durability debt paid at its designed home; escalation + answer debut together by design                                                                      |
| Termination                     | §6.2 discretionary cutoff after 2 exchanges (2 debate docs); auto-stops A/B not fired; ship-gate = both critics ≥75 AND measured ~64–66% rebound above L4 on the built L5                                                                                   |
