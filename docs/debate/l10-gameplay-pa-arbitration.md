# L10 (Garage) — Ruled Arbitration (Tier-1 Finale)

**Status:** Phase-D §9 orchestrator synthesis. Inputs: the Level PA
position (`docs/debate/l10-level-pa-position.md`) and the Gameplay PA
position (`docs/debate/l10-gameplay-pa-position.md`), both read in full.
The two positions **converge** — they do not conflict — so this
document RULES the synthesized design, records the new trunk finding,
states the binding invariants and the single orchestrator-held knob,
and hands a falsifiable measure-or-fork directive to the within-scenario
loop. This is the LAST scenario of Tier-1.

**Bounding canon:** level-progression-plan §2 L10 / §4f (no
card-economy rebound) / §4g (no un-opted abilities.json lever) / §4h
(systemic late-tier finding; grandfather/park is a sanctioned per-level
outcome; the holistic curve policy is the user's at the consolidated
review, NOT re-decided per level) / §4d (plane-affinity/wall inert) /
§4e (heal-occupation inert under capture-post); roadmap §4.1 L10 / §5
(L10 ~50, "genuinely close"); gate-29 byte-identity sacrosanct; L1–L9
no-regression **including L9 ≈ 37** (grandfathered trough). Engine
FROZEN.

---

## 0. The new trunk finding — day/night payload is engine-hardcoded (RESOLVED-BY-IMPOSSIBILITY)

The Gameplay PA's headline finding is **ruled and adopted**. The L10
day/night combat payload is resolved entirely from hardcoded module
constants in `engine/phase.ts` (`PHASE_LENGTH = 4`; night ⇒ spiders
+1 atk / +1 agi, ant-archer −1 atk; day ⇒ zero), read directly by
`engine/battle.ts:203/999` off `template + state.phase`. There is **no
map-schema field, no data path, and no opt-in flag** (verified against
`engine/schemas/map.ts`), and the engine is FROZEN.

This is **structurally identical to the §4g hypnotize/recruit
hardcoded-constants hole, but UNRESOLVED**: §4g got a merged opt-in
engine fix (dep #10, `abilityParamsAuthoritative`); the phase payload
has no equivalent and one cannot be added under the freeze.

**RULING:** the L10 day/night payload is FIXED at the engine values for
all scenarios. It is **NOT a curve lever** and **zero pp of tunable
delta is budgeted to it** — budgeting any would be the precise §4g/§4h
inert-lever mis-attribution the process binds against. The
level-progression-plan §4 boundary case #8 ("POST-bound / cadence
global combat modifier — L4 light-switch, L10 day/night") is **RULED
RESOLVED-BY-IMPOSSIBILITY for the day/night half**: there is nothing to
schedule (no schema field) and nothing to tune (no data path); no
human payload decision exists to make. This is recorded on the trunk as
**§4i** (a §4g-class sibling) so no future work mis-budgets a day/night
lever. It is a load-bearing input to the reachability call (§4): the
one genuinely-continuous global lever the brief hypothesized is
**unavailable**.

---

## 1. Ruled design — geometry (Level-PA, ratified with the scaffold overrides)

The Level PA geometry is **ruled as authoritative**. `static`, 10×10,
all 6 planes; the roadmap "16×12" is NOT expressible (dep #5 deferred)
and NOT attempted. Floor layout (`(x,y)`, y=0 North … y=9 South):

- **Car** (kept from scaffold): impassable obstacle `(4,4)(5,4)(6,4)
(4,5)(5,5)(6,5)(4,6)(5,6)(6,6)`. Splits floor into North passage
  rows 0–3 (depth 4) and South passage rows 7–9 (depth 3); lanes x=3,
  x=7, x=9 open all y.
- **Workbench block** (ADD — scaffold lacked it): impassable obstacle
  `(1,4)(2,4)(1,5)(2,5)(1,6)(2,6)` (2×3 NW-side defensive-cluster
  anchor).
- **Shelving block** (ADD — scaffold lacked it): impassable obstacle
  `(8,4)(8,5)(8,6)` (1×3 E-side mirror counterpressure). MUST NOT touch
  the south edge (y≥7 all open) — the single most important specific
  anti-L9 decision (no S-passage re-pinch).

18 obstacle tiles total as **three separated clusters + the Car** —
never one bisecting mass (the L5/L9 single-basin failure mode).

**7 POSTs (ruled coords; rename scaffold `over-shelf` → `shelving`):**

| POST         | Plane   | (x,y) | Owner   | def   | heal   | Role                                                      |
| ------------ | ------- | ----- | ------- | ----- | ------ | --------------------------------------------------------- |
| side-door    | floor   | (0,9) | ant     | 4     | 3      | Ant home (SW)                                             |
| tool-rack    | floor   | (0,7) | neutral | 2     | high\* | High-heal staging; chain fork point                       |
| workbench    | floor   | (3,3) | neutral | 3     | 1      | N-route defensive waypoint                                |
| car-hood     | floor   | (5,3) | neutral | 2     | 1      | Plane-transition; `pairedWith: shelving`                  |
| shelving     | ceiling | (5,2) | neutral | 2     | 1      | Transition endpoint; `pairedWith: car-hood`               |
| garage-door  | floor   | (7,9) | neutral | 2     | 1      | S gate; x≥7 (east of Car span) — hard trap-free invariant |
| engine-block | floor   | (9,9) | spider  | **6** | 2      | Objective / boss arena; strict tier-defensive max         |

\* tool-rack heal "high relative to other POSTs" for staging _feel_
only — per §4e a POST heal is engine-inert as a `capture-post` curve
lever; it MUST NOT be curve-credited (the §4g/L9 over-attribution
caution). Scaffold's heal=3 is acceptable; not a tuning lever.

**Binding spatial invariants (changing any reopens the arbitration):**
(a) ant start CO-LOCATED at Side-Door SW spread `(0,9)(1,9)(0,8)(1,8)
(0,7)` — this **overrides the scaffold's fatal NW start** (the exact
L9 single-basin pre-collapse trap); (b) Engine-Block is the strict
tier-defensive maximum (≥ L5 obj def 5, ≥ L9 fuse-box +5); (c)
Garage-Door x≥7; (d) Car-Hood↔Shelving a real bidirectional plane
pair; (e) the chain forks at Tool-Rack and both branches are trap-free
greedy chains (Level-PA verified §1.4, every RNG tie-ordering, on the
actual chain trajectories).

Level-PA verified greedy-Manhattan trap-freedom on every chain leg
under every RNG tie-branch (faithful `movement.ts` model). Walls are
§4d latent identity texture, NOT a route or curve lever — not budgeted.

---

## 2. Ruled design — roster (Gameplay-PA, ratified byte-identical)

Scaffold rosters **ratified as-is, byte-identical to the L9/L5 fortress
shape**. NO stat changes, NO new templates, NO plane-affinity delta
(§4d inert; the §4g/L5-correction caution against re-crediting inert
layers). `units.json` carries L9 byte-identical (verified).

- **Ants (5 parties):** `queen-guard` (immobile spine on side-door,
  excluded from every gate — the locked L5/L9 pattern, seed-robust);
  `vanguard-alpha` (N-passage column); `vanguard-bravo` (mage-bearing,
  over-the-car plane-transition column); `vanguard-charlie` (heavy
  potato-bug S-passage column); `pathfinders` (2nd mage column /
  Shelving pressure — two independent plane threats so the spider
  cannot collapse all defense onto one transition).
- **Spiders (4 parties):** `end-guard` (queen pin on engine-block, +6
  def/+2 heal, immovable); `north-picket` (bound N-cluster);
  `south-picket` (bound S-cluster); `corridor-rovers` (forward
  assault-breaker + car-hood plane contest).

The spider delta is **behavioral binding only** (§3), expressed through
the existing `FortressDefenseConfig` picket/rover surface and an
L10-only opt-in wrapper (the `ai/spider-l9.ts` precedent) — **no
shared-builder default touched**, so L3/L4/L5/L6/L8/L9 + the tutorial
stay byte-identical and gate-29 is sacrosanct.

**`abilityParamsAuthoritative`: NOT opted in** (flag absent — mirrors
L9). The L10 ship-gate must assert `abilityParamsAuthoritative ?? false
=== false` (the `engine/level9.test.ts` precedent). No card economy
(§4f); shop.json/Tool-Rack narrative is world-loop only.

---

## 3. Ruled binding AI doctrine — the multi-route assault + per-cluster defense

The §4h countermeasure is multi-cluster geometry (ruled §1); the
continuity lever is the **binding, seed-robust multi-route doctrine**
(the only lever class the frozen engine + locked AI converts — the
L4-§9 anti-route-around precedent, applied a seventh time). RULED
BINDING (AI-config only; no engine edit; no shared-builder default
touched):

**Ant — each column bound to a distinct route:**

1. `vanguard-alpha` → N-passage route (chain along the north floor
   passage, greedy around the Car's north end).
2. `vanguard-bravo` → over-the-car plane route, bound via the existing
   L4 `switchContest` machinery on `buildChainMarchPolicy`
   (`captureParties:['vanguard-bravo']`, `post: car-hood`,
   `detachGate:'muster'`, `detachmentIsSpent:false`). Greedy Manhattan
   never volunteers a plane switch — binding it through `switchContest`
   is the L4-§9 corrective that makes the route genuinely walked.
3. `vanguard-charlie` → S-passage route (heavy potato-bug column).
4. `pathfinders` → Shelving-cluster pressure (2nd plane-capable
   threat).
5. `queen-guard` holds side-door (immobile spine, excluded from every
   gate; byte-identical math, seed-robust).

**Spider — per-cluster binding (anti-route-around):**

1. `end-guard` pins engine-block, never moves.
2. `north-picket` bound to the N-cluster choke; `south-picket` bound
   to the S-cluster choke — each sorties on the closest ant _on its
   route_, then banks def+heal (existing `sortieOrders` retargeted
   per-cluster via `FortressDefenseConfig`, no default touched).
3. `corridor-rovers` forward assault-breaker + an L10-only opt-in
   wrapper (the `ai/spider-l9.ts` pattern) contesting `car-hood` when
   an ant detachment closes within `CONTEST_LEASH`.

**Binding invariants (changing any reopens the arbitration — the
L4-§9 / §7 clause, the same bar L9's clauses were held to):**

- (i) each ant vanguard column bound to its _named_ route;
- (ii) the plane-transition column (`vanguard-bravo`) detaches via
  `switchContest` post-muster and **genuinely walks the over-the-car
  route in a seed-robust majority of seeds 1..100** (measured, the
  L4-§9 measurable ship-gate — the L9 clause-1 bar was pump-flip
  100/100);
- (iii) `detachmentIsSpent: false` so the column rejoins (the L9
  lesson — `spent` makes the spider contest inert, the §7 failure);
- (iv) a real defender engages on **each of the 3 routes** in a
  seed-robust majority of seeds 1..100 (without it the multi-route
  geometry is the L4-§9 route-around breach → straight to the overrun
  regime).

---

## 4. The single orchestrator-held knob (the synthesized crux)

**Both** position docs independently identified the **same** single
biggest residual risk: the locked `buildChainMarchPolicy` muster gate
is a **temporal re-synchronizer**. It makes every non-guard field
party wait until all are within `musterRing` of `musterPost`, then all
commit to the same `nextChainPost`. Geometry forces a _spatial_ split;
the muster gate can gather it _back into one mass before contact_,
re-collapsing to L9's one-mass-one-basin binary trial **regardless of
how independent the geometry is**. Level-PA: cannot spatially force the
AI to keep the split — it is a within-loop knob. Gameplay-PA: three
correlated integer leash cliffs against one re-converging fortress is a
staircase, not a smooth CDF.

**This is the orchestrator-held binding knob for the within-scenario
loop** (the L4-§9 / L9 precedent — a ruled knob the orchestrator holds,
not free latitude):

- `musterPost` **MUST be `tool-rack`** (the fork point) — **NOT past
  the fork**. Mustering past Tool-Rack re-collapses to one basin = the
  L9 trap. This is BINDING, not a tuning knob.
- `musterRing` MUST be tight enough that columns do not re-gather into
  one mass _after_ the fork (a wide ring re-synchronizes the split —
  the explicit re-convergence failure). Its exact value is the loop's
  latitude, but the _invariant_ (split survives to contact in a
  seed-robust majority) is BINDING and MEASURED.
- Mage-party assignment fixed (`vanguard-bravo` + `pathfinders` carry
  the only `ant-plane-switch` bodies) so Route 3 is genuinely takeable.

The within-loop's _continuous tuning latitude_ is the **three
per-route spider leash radii + `musterRing`** (within the binding
invariant). That is the §4h continuous lever this design hands the
loop where L9 had none — it converts a binary flip into a tunable
mixture. Whether the mixture mean can be _landed_ in [≈48,52] is the
measurement (§5).

---

## 5. Measure-or-fork directive (falsifiable; NO pre-judging)

Per the §4h / L9 / L4-§9 discipline: **measure, do not assume.** Both
PAs predict L10 is the third structurally-bistable late-tier scenario
(lower regime ant ~20–45, upper ~80–100, ~30+pt dead-zone, predicted
most-defensible grandfather **ant ~42–45** — deliberately _above_ the
L9 ~37 trough so the finale still reads as a climb-out at the
achievable band). The prediction is **explicitly falsifiable on the
built scenario** and is NOT pre-applied.

The within-scenario designer-tuning loop implements §1–§4 (AI config
only; gate-29 + L1–L9 byte-identical incl. L9≈37; the orchestrator
muster knob held), runs the seeds-1..100 sweep + gate-29 +
full L1–L9 no-regression, then:

- **If a seed-robust config lands ant ∈ [≈48,52]** with BOTH the
  3-route ant split AND the per-cluster spider defense demonstrably
  seed-robust (each route's defender engaging in a clear majority of
  seeds) AND decisive AND interest ≥75 → **SHIP L10 at ~50**. The
  prediction is falsified; the finale ships in-band; the best outcome.
- **If (as predicted) the space is bistable with no in-band seed-robust
  config** → this is the L4-§9 / §7 falsification. Apply the
  §4h-sanctioned amended ship-gate (interest ≥75 + both doctrine sides
  seed-robust + decisive; the [≈48,52] band **withdrawn for L10**);
  ship at the most-defensible lower-regime value (predicted ant
  ~42–45, _above_ the L9 ~37 trough). NO card / heal / plane-affinity /
  un-opted-ability / day-night-payload corrective in any fallback (§4f
  / §4e / §4d / §4g / §4i — all forbidden or inert). A band hit with
  the doctrine inert is an explicit FAILURE, not a pass (the L8 §7 /
  L9 hardening).

**Disposition routing.** Per §4h, L10's grandfather/park is **NOT a
separate mid-stream fork to the user** — the holistic late-tier-curve
policy is the user's single decision at the **consolidated
end-of-Phase-D review**, taken with the complete L1–L10
achievable-vs-target picture (L7 PARKED, L9 ≈ 37, L10 measured). This
arbitration's job is to produce L10's _measured, defensible per-level
disposition_ (either a clean in-band ship, or a fully-seed-robust
grandfather value with the band withdrawn) and carry it into that
review — not to re-decide the systemic question per level.

---

## 6. Verdict summary

| Dimension             | Ruling                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Day/night             | §4i: engine-hardcoded, RESOLVED-BY-IMPOSSIBILITY; §4 #8 boundary resolved; 0pp budgeted; recorded on trunk                                                                                                                                 |
| Geometry              | Level-PA ratified: static 10×10 all-6-planes; Car + ADD Workbench(1-2,4-6) + ADD Shelving(8,4-6); 7 POSTs at ruled coords; over-shelf→shelving; ant start co-located SW (0,9) — overrides scaffold NW                                      |
| Roster                | Gameplay-PA ratified byte-identical L9/L5; no stat/affinity change; abilityParamsAuthoritative ABSENT                                                                                                                                      |
| Doctrine              | Binding seed-robust multi-route split (ant: each column→named route, bravo via switchContest) + per-cluster spider defense; AI-config only; no shared-builder default touched                                                              |
| Orchestrator knob     | `musterPost` MUST be tool-rack (NOT past fork); `musterRing` tight (split survives to contact, measured); mage-assignment fixed                                                                                                            |
| Constraint compliance | No card (§4f); no un-opted ability (§4g); no plane-affinity/wall (§4d); no heal-occupation (§4e); no day/night payload (§4i); gate-29 + L1–L9 incl. L9≈37 untouched                                                                        |
| Disposition           | Measure seeds 1..100: in-band seed-robust → ship ~50; else grandfather at most-defensible lower regime (predicted ~42–45, band withdrawn, doctrine seed-robust) — carried to the consolidated review, NOT a per-level systemic re-decision |

This completes the L10 ruled arbitration. Next: record §4i on the
trunk, then implement §1–§4 in the within-scenario loop and produce the
measured disposition.

---

## §GRANDFATHERED — measured outcome + user decision (BINDING, final)

**Measured (within-scenario loop, seeds 1..100; orchestrator
trust-but-verified independently).** The §5 prediction was **confirmed,
not falsified**. L10 is the **third structurally-bistable late-tier
scenario**. gate-29 byte-identical (re-run independently: baseline 58.0
/ rush 55.0 / turtle 52.0 / flank 68.0 / jelly-rush 55.0 / dive 75.0);
L1–L9 no-regression incl. L9 = 37.0; change scope purely additive (no
shipped/shared/engine file touched — L1–L9 cannot regress by
construction); level9 (12) + level10 (14) suites pass.

The §4-named orchestrator residual **realized and controlling**: the
locked `buildChainMarchPolicy` muster gate is a temporal
re-synchronizer. With the BINDING `musterPost=tool-rack` +
`detachGate:'muster'`, the body blitzes engine-block in ~6–7 turns
before the plane detach fires → one basin, doctrine inert, L9-redux;
pre-muster forking to keep the split → fragmented assault annihilated
piecemeal (ant 0/100). **No within-loop config keeps the 4-route split
alive AND the assault viable.** Routes `vanguard-alpha` (0/100) and
`vanguard-bravo` full-ceiling (~48/100) are NOT seed-robust at any
config; the near-band points (ant 48–51) all have the doctrine inert
and were correctly REFUSED (the L8 §7 / L9 hardening: a band hit with
inert doctrine is an explicit FAILURE, not a pass). No binding
invariant relaxed; no forbidden/inert corrective applied
(§4f/§4e/§4d/§4g/§4i). Measured regimes: upper plateau ant ~74–79,
lower lobe ~8–21, wide dead-zone, no in-band seed-robust config.

Most-defensible lower-regime ship measured: **ant 44.0%**, decisive
100/100, avg 96 turns, interest 76 (≥75), [≈48,52] band withdrawn.

**USER DECISION (consolidated end-of-Phase-D review — BINDING, final):
GRANDFATHER L10 at ~44%.** Selected: "Park L7, grandfather L10 @44"
under the "Accept & re-baseline" late-curve policy. L10 ships as the
Tier-1 finale at the _achievable_ band: ~44% > the L9 ~37 trough so the
finale reads as a climb-out; [≈48,52] band formally **withdrawn**; the
**partially-inert multi-route doctrine is honestly recorded, not
papered over** (the cosmetic in-band relabel option was explicitly
rejected — the no-band-fudge discipline holds through the finale). No
engine un-freeze authorized; the multi-route anti-bistability thesis is
recorded as _correctly designed and built but structurally defeated by
the locked AI muster gate under the frozen engine_ — a headline §4h
retrospective input (`level-progression-plan.md` §4h RESOLVED +
`roadmap-tier-1.md` §5.1). This `§GRANDFATHERED` record is final; the
systemic question is closed and not reopened per level.
