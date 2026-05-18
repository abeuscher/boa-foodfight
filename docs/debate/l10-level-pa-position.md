# L10 (Garage) — Level PA Position Document

**Status:** Phase-D position deliverable, Level Progression Agent (solo,
roadmap §6.2/§6.3). Spatial/environmental rulings only. Synthesized by
the orchestrator against the Gameplay PA position into the L10 ruled
arbitration. Document only — no engine/AI/data writes from this agent.

**Scope (§0 discipline).** This agent rules the Garage geometry, the 7
POST placements (spatial fields + proposed defensive/heal values flagged
for Gameplay sign-off where they are a combat payload), the
multi-route Side-Door→Engine-Block topology, and the spatial start
asks. It does NOT rule unit/combat/faction tuning, the day/night combat
payload, the Tool-Rack heal magnitude as a balance lever, or any
concealment/spider-perception interaction — those are FLAGGED for the
orchestrator/Gameplay PA (§5 below).

**Required-reading anchors.** level-progression-plan §2 L10 (247–269),
§3 dep #5 DEFERRED (10×10 obstacle-approximation is engine reality;
"16×12" is not expressible), §4a/§4f/§4g/§4h (binding); roadmap §4.1
L10 / §5 (L10 ~50, "genuinely close"); the L9 GRANDFATHERED record and
its §4h systemic finding; `ai/capture-chain.ts` (the locked
chain-march vs guard+pickets+rover fortress doctrine); engine
`movement.ts:203–284` + `coord.ts:26–42` + `edges.ts` (greedy
single-plane Manhattan descent; plane transitions only via
ant-plane-switch / floor↔wall–ceiling↔wall edge adjacency / paired-POST
shortcut).

---

## 0. The binding problem, restated in spatial terms

§4h is the governing finding. L9 (Basement) was falsified twice and
GRANDFATHERED at ~37% because a **single-objective, single-route
contested-fortress capture-post is structurally bistable**: the locked
guard+pickets+rover fortress (`ai/capture-chain.ts`
`buildFortressDefensePolicy`) either holds (objective +def/+heal stack
the chain-march cannot out-attrit → ~14–45%) or is overrun
(~81–100%), with a ~40-point dead zone and _no_ config landing near
target. L7 parked, L9 grandfathered, all three late-tier scenarios hit
one root class.

The root cause is spatial as much as it is combat: the locked
chain-march (`buildChainMarchPolicy`) musters the **entire field force
as one mass** on the last neutral POST, then commits that mass down
**one greedy basin of attraction** to the objective. One mass + one
basin = one binary trial: the fortress wins it or loses it. There is no
mechanism for a _partial_ outcome, so the win-rate distribution is
bimodal, not continuous.

The §4h-prescribed countermeasure is **MULTI-CLUSTER GEOMETRY**. My job
is to make the Side-Door→Engine-Block assault decompose into **multiple
genuinely independent approach routes of comparable-but-not-identical
viability**, so that across the seed sweep the _aggregate_ outcome is a
sum of several partially-correlated binary route-trials rather than one
binary fortress flip — a sum that is continuous through ~50 instead of
bimodal. This is a geometry/objective/victory-structure lever (the kind
§4f/§4d say the locked AI demonstrably converts, the kind that carried
L5/L6), not a combat re-tune.

---

## 1. Map geometry ruling

**Realization method.** `static: true`, 10×10, **all 6 planes**
(floor, ceiling, north/south/east/west-wall) — the max-richness
finale, the only L2–L10 scenario using all 6, bookending L1
(level-progression-plan §2 L10). Per §3 dep #5 DEFERRED + §4a, the
roadmap's "16×12" is **NOT expressible** and is NOT attempted; the
Garage ships as a 10×10 obstacle-approximation. The "feels big"
fidelity gap is a recorded UX-phase concern, not an engine ask, and is
explicitly NOT a curve lever here.

### 1.1 Floor layout (10×10; y=row, 0=North … 9=South; x=col, 0=West … 9=East)

Three obstacle clusters + the Car divider. Coordinates are
`(x, y)`. **18 obstacle tiles, 82 open** — a dense field (denser than
L5's 29-obstacle bed-room only in _structure_, not count; the obstacles
are arranged as three separated clusters, deliberately NOT one bisecting
mass, which is the whole anti-bistability point).

```
        x:  0   1   2   3   4   5   6   7   8   9
   y=0      .   .   .   .   .   .   .   .   .   .     ┐ NORTH PASSAGE
   y=1      .   .   .   .   .   .   .   .   .   .     │  (rows 0–3,
   y=2      .   .   .   .   .   .   .   .   .   .     │   full width 10,
   y=3      .   .   .   ░WB .   ◊CH .   .   .   .     ┘   depth 4)
   y=4      .   #W  #W  .   ▓C  ▓C  ▓C  .   #S  .
   y=5      .   #W  #W  .   ▓C  ▓C  ▓C  .   #S  .     ← CAR BAND (rows 4–6)
   y=6      .   #W  #W  .   ▓C  ▓C  ▓C  .   #S  .
   y=7      ░TR .   .   .   .   .   .   .   .   .     ┐ SOUTH PASSAGE
   y=8      .   .   .   .   .   .   .   .   .   .     │  (rows 7–9,
   y=9      ⌂SD .   .   .   .   .   .  ⌐GD .   ⊗EB    ┘   full width 10,
                                                          depth 3)
   legend: . open   ▓C Car (impassable, movementCost 999)
           #W Workbench cluster block   #S Shelving cluster block
           ⌂SD Side-Door   ░TR Tool-Rack   ░WB Workbench POST
           ◊CH Car-Hood    ⌐GD Garage-Door  ⊗EB Engine-Block
```

**Obstacle tiles (impassable, `kind:"obstacle"`, movementCost 999):**

- **Car** — `(4,4)(5,4)(6,4) (4,5)(5,5)(6,5) (4,6)(5,6)(6,6)`. The
  3×3 dead-center floor divider (the scaffold's; **kept**). Splits the
  floor into a North passage (rows 0–3, full width, depth **4**) and a
  South passage (rows 7–9, full width, depth **3**), each ≥2 wide so
  greedy Manhattan routes around either end (verified §1.4). Plus two
  open vertical lanes flanking the car at **x=3** (West lane, between
  Workbench and Car, open all y) and **x=7** (Mid lane, between Car and
  Shelving, open all y) and the **x=9 East lane** (open all y).
- **Workbench cluster (W)** — `(1,4)(2,4) (1,5)(2,5) (1,6)(2,6)`. A
  2×3 NW-side block. It is the _defensive cluster_ anchor; it narrows
  the West approach so the North route bows around it (x=0 or x=3),
  giving the North route its own distinct geometry.
- **Shelving cluster (E)** — `(8,4)(8,5)(8,6)`. A 1×3 E-side block,
  the **mirror-image counterpressure** to the Workbench block, placed
  so the Mid lane (x=7) and East lane (x=9) remain the two
  independent ways past the car on the east side. Deliberately **does
  NOT touch the south edge** (y=7+ all open) — touching it would
  re-create a single S-passage pinch (the L9 single-chokepoint trap).

This is the §4h "multi-cluster anti-bistability geometry": three
_separated_ clusters, never one bisecting mass. The L5 bed and the L9
fuse-box approach were single bisecting/funneling masses → one basin →
bistable. The Garage is deliberately the opposite.

### 1.2 Plane assignment (which of the 6 planes carry what)

- **Floor** — the primary battlefield: home, the three clusters, the
  Car, Garage-Door, the objective. Carries 4 of the 7 POSTs.
- **Ceiling** — fully open (no obstacles), the "over the car"
  premium route. Carries the Car-Hood's paired endpoint **Shelving**
  (the transition endpoint POST). Ceiling is the _independent third
  axis_: a party that transitions up bypasses the Car and both floor
  passages entirely.
- **North-wall / South-wall / East-wall / West-wall** — present
  (all 6 planes active, the finale richness + bookend-L1 intent) and
  passable on the standard 40-open / 60-obstacle mask the shipped
  L5/L9 walls already use (format-conformant). Per the binding
  **§4d cross-level finding**, wall planes are a _latent identity
  layer, NOT a curve lever_ under the locked chain-march-vs-fortress
  doctrine (the AIs fight on floor + ceiling, almost never on walls).
  The walls are therefore the all-6-planes finale _texture_ and the
  geometric substrate for the **floor↔wall / ceiling↔wall edge
  adjacency** the engine uses for plane transitions
  (`movement.ts:262–269`) — they are NOT budgeted as a route or a
  win-rate mover, and the orchestrator/Gameplay PA must not credit
  them as one (§4d-directed, the L9-mis-attribution caution in §4g).

### 1.3 The Side-Door→Engine-Block multi-route topology (the core deliverable)

Side-Door (ant home) is SW `(0,9) floor`. Engine-Block (objective) is
SE `(9,9) floor`. There are **four genuinely independent routes** from
home to the objective. "Independent" has a precise engine meaning here:
each route is a _distinct greedy basin_ — the set of intermediate
greedy targets (chain POSTs) is different, the floor tiles traversed do
not substantially overlap, and a fortress posture optimized to deny one
route does not by construction deny the others (the guard is pinned to
the objective tile; pickets/rover leash off the _objective_, so their
coverage is a single radius around `(9,9)` — it cannot simultaneously
seal four approaches that arrive from four different bearings).

**Route 1 — North-floor passage (Workbench arm).** Side-Door (0,9) →
Tool-Rack (0,7) → Workbench POST (3,3) → Car-Hood floor anchor (5,3) →
Engine-Block (9,9), descending the East lane (x=9). Greedy Manhattan
takes it because every leg has a strictly-Manhattan-closer open
neighbor at every reachable tile on the trajectory (proven §1.4, every
RNG tie-branch). This is the **defensive/high-ground arm** — it passes
the Workbench (def POST) and the Car-Hood, and arrives at the objective
**from the north** (descending x=9, then west along y=9).

**Route 2 — South-floor passage (Garage-Door arm).** Side-Door (0,9) →
Tool-Rack (0,7) → Garage-Door (7,9) → Engine-Block (9,9), running
along the South passage (rows 7–9). Greedy-trivial: a near-straight
eastward descent, no cluster in the path. This is the **fast direct
arm** — shortest, lowest-cover, arrives at the objective **from the
west** along y=9. It is _comparable but not identical_ in viability to
Route 1: shorter (fewer turns to contact) but lower defensive cover
(no Workbench, no high-ground), so it trades tempo for survivability —
the asymmetry that makes the route-mix produce a _spread_ of outcomes
rather than two identical coin-flips.

**Route 3 — Over-the-car plane transition (Car-Hood → Shelving).** A
mage-bearing party (carries `ant-plane-switch`, `units.json`
`ant-mage`/`ant-archmage`) on the **Car-Hood** floor node (5,3)
transitions to the **Shelving** ceiling endpoint, crosses the fully
open ceiling, and descends to the objective via the ceiling→south-wall
or ceiling→east-wall edge, or plane-switches back down near the
objective. Engine basis: `movement.ts:271–283` paired-POST shortcut
(Car-Hood `pairedWith` Shelving, Shelving neutral/ant-owned) **and**
`movement.ts:257–260` ant-plane-switch teleport. This route **does not
touch either floor passage or the Car band** — it is the
maximally-independent axis. It arrives at the objective **from above**
(ceiling), where the pinned floor guard and the floor-leashed pickets
have _zero_ coverage until the party descends onto the final approach
tile. This is the L5-precedent lever: the ceiling premium route the
locked AI demonstrably converts (L5 shipped 66% carried by
concealment + the ceiling route; §4g confirms L5's real carry was
geometry/concealment, not the inert combat deltas).

**Route 4 — Direct South-East dash (fallback basin).** If the chain
collapses to the assault phase early (`buildChainMarchPolicy`
`assaultPhase`), the mustered body commits straight Side-Door (0,9) →
Engine-Block (9,9) along the open South passage. Greedy-trivial
(verified §1.4). This is the _degenerate_ route — present so the
chain-march never stalls — and is the one most like the L9 single
basin; it is deliberately the **least** defended of the four (no
waypoint cover) so that when the AI takes it the fortress's structural
advantage is largest, providing the _low_ tail of the distribution
that the other three routes' partial successes fill upward toward ~50.

**Why these are independent under the locked AI (the load-bearing
claim).** The chain-march walks `cfg.chain` POSTs in order, each a
separate greedy target (`buildChainMarchPolicy` `nextChainPost`). By
authoring **two chain branches that fork at Tool-Rack** — a North
branch (…→Workbench→Car-Hood→Engine) and a South branch
(…→Garage-Door→Engine) — and by the Car-Hood→Shelving plane pair
being available only to mage parties, the _single mustered mass is
forced to split by composition and by which branch its parties' greedy
targets resolve to_. The fortress (`buildFortressDefensePolicy`) is
**geometrically incapable of denying all four at once**: its guard is
_pinned_ to `(9,9)` and never moves (`cfg.guard`, `ordersFor` returns
`[]`); its pickets and rover sortie on a _single_ Chebyshev leash
measured **from the objective** (`sortieOrders`, `distance(objectiveRef,
ant)`), i.e. one isotropic radius around `(9,9)`. A radius cannot
simultaneously be tight against a north-bearing arm, a west-bearing
arm, and an above-bearing (ceiling) arm — committing the rover to
intercept one bearing necessarily under-defends the other three. That
is the precise engine reason the outcome becomes a _distribution over
which-route-got-through_ rather than one fortress flip.

### 1.4 Greedy-Manhattan navigability — verified, not asserted

Every chain leg was checked against the faithful engine model
(`movement.ts:203–220`: from the current tile choose an in-plane
neighbor whose Manhattan distance to the target is _strictly_ smaller,
passable, lowest movementCost; ties broken by `rng.fork`). The
correctness criterion applied is the strict one: **every RNG
tie-branch must reach the target** (a leg that traps under _any_ tie
ordering is rejected). Result, all legs of both chain branches +
fallbacks:

| Leg                                         | Result (all RNG tie-orderings) |
| ------------------------------------------- | ------------------------------ |
| Side-Door (0,9) → Tool-Rack (0,7)           | trap-free                      |
| Tool-Rack (0,7) → Workbench (3,3)           | trap-free                      |
| Workbench (3,3) → Car-Hood (5,3)            | trap-free                      |
| Car-Hood (5,3) → Engine-Block (9,9)         | trap-free                      |
| Tool-Rack (0,7) → Garage-Door (7,9)         | trap-free                      |
| Garage-Door (7,9) → Engine-Block (9,9)      | trap-free                      |
| Side-Door (0,9) → Engine-Block (9,9) direct | trap-free                      |

Passage-width invariants (the level-progression-plan §2 L10 "≥2 wide,
greedy around either end" requirement, verified): North passage rows
0–3 fully open (depth 4); South passage rows 7–9 fully open (depth 3);
West lane x=3, Mid lane x=7, East lane x=9 each open for all y. The
L2-style invariant is satisfied per shape: at every reachable tile on
every actual chain trajectory a strictly-closer open neighbor exists,
so Manhattan-descent never sticks. **Note for the orchestrator:** the
trap-freedom proof is over the _actual chain trajectories the AI
walks_, not the unconstrained reachable set — a party on the
Workbench→Car-Hood leg is north of the Car by construction (it came
from Workbench (3,3)) and never occupies the concave pocket south of
the Car relative to Car-Hood. The chain ordering (North branch entirely
in the north half before Car-Hood; Garage-Door east of the Car's
x-span) is what guarantees this; it is a _ruled invariant of this
geometry_, not an incidental.

---

## 2. The 7 POST placements

Exactly 7 POSTs (level-progression-plan §5 L10:7, the largest-room
count, matching the §4.2 5–8 rule). For each: exact plane + local
coords, owner, and proposed spatial defensive/heal values. **The
defensive/heal _magnitudes_ are a combat payload — proposed here for
completeness and ordering intent, but FLAGGED for Gameplay PA sign-off
(§5).** The Level PA rules the _placement, ownership topology, paired
linkage, and the in-tier ordering constraint_ (Engine-Block strictly
highest defensive value in the tier; Workbench a real defensive node;
Tool-Rack the high-heal staging node).

| #   | POST             | Plane   | (x,y) | Owner   | def (proposed)                    | heal (proposed)    | Role / tags                                                                                                                                                                                     |
| --- | ---------------- | ------- | ----- | ------- | --------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Side-Door**    | floor   | (0,9) | ant     | 4                                 | 3                  | Ant home/entrance. SW. `home-base,entrance`                                                                                                                                                     |
| 2   | **Tool-Rack**    | floor   | (0,7) | neutral | 2                                 | **HIGH — flagged** | High-heal staging node, W edge near home. Narrative "shop extension" is world-loop flavor only (§6.5), mechanically a high-heal POST, NOT an in-scenario shop. `staging,high-heal`              |
| 3   | **Workbench**    | floor   | (3,3) | neutral | **3 (defensive)**                 | 1                  | Defensive cluster anchor, N-route waypoint. `cluster-workbench,def`                                                                                                                             |
| 4   | **Car-Hood**     | floor   | (5,3) | neutral | 2                                 | 1                  | Plane-transition node, just N of the Car's top edge, x within the Car's column span (the literal "over the car" mount). `pairedWith: shelving`. `plane-transition,cluster-car`                  |
| 5   | **Shelving**     | ceiling | (5,2) | neutral | 2                                 | 1                  | Transition endpoint (Car-Hood's pair), on the open ceiling. `pairedWith: car-hood`. `plane-transition,ceiling,cluster-shelving`                                                                 |
| 6   | **Garage-Door**  | floor   | (7,9) | neutral | 2                                 | 1                  | Neutral gate, S passage, **east of the Car's x-span** (so the S-route greedy descent never has the Car between an approacher and it — a ruled placement invariant, §1.4). `cluster-garage,gate` |
| 7   | **Engine-Block** | floor   | (9,9) | spider  | **6 — highest in tier (flagged)** | 2                  | Objective / boss arena. SE. Highest defensive value in Tier-1. `objective,boss-arena`                                                                                                           |

**Ruled spatial constraints on the POST set (Level-owned, binding):**

1. **Engine-Block is the objective and the strict tier-defensive
   maximum.** def 6 proposed; the _magnitude_ is Gameplay's, but the
   _ordering invariant_ — Engine-Block ≥ every other POST in L1–L10,
   strictly the boss arena — is a Level-owned spatial/victory-structure
   ruling (level-progression-plan §2 L10). L5's objective shipped def 5;
   L9's fuse-box +5; the finale must be ≥ both.
2. **The chain forks at Tool-Rack into two branches** (North:
   Tool-Rack→Workbench→Car-Hood→Engine; South:
   Tool-Rack→Garage-Door→Engine). This fork is the §4h multi-route
   structure expressed in the POST chain the locked `buildChainMarchPolicy`
   walks. The Gameplay PA owns which `chain`/`musterPost` the within-loop
   AI-config uses; the Level PA's spatial ruling is that **both branches
   must be expressible as trap-free greedy chains** (verified §1.4) and
   that the muster POST should be **Tool-Rack** (the fork point), so the
   mass splits _at_ the fork rather than mustering past it as one body
   (mustering past the fork would re-collapse to one basin = the L9
   trap).
3. **Car-Hood↔Shelving is a real bidirectional plane pair** (engine
   `movement.ts:271–283`), Shelving on the open ceiling, both
   neutral-start so either faction may use the shortcut (the spider
   `spider-corner-cross` passive plus ant-plane-switch keep the route
   live for both — symmetric, no faction claim by Level).
4. **Garage-Door's x must be ≥ 7** (east of the Car's x-span 4–6) so
   the South-route greedy descent is provably trap-free (§1.4). This is
   a hard spatial invariant, not a tuning value.
5. **Owner topology:** home ant; objective spider; the five middle
   POSTs neutral (matches the shipped L5/L9 capture-post topology;
   the chain-march captures neutral links en route, the fortress holds
   only the objective — `buildFortressDefensePolicy` `cfg.guard`).

---

## 3. Anti-bistability rationale (the most important section)

**The §4h finding, named and confronted.** Per
level-progression-plan §4h, the contested-fortress capture-post is
**structurally bistable under the frozen engine + locked AI doctrine**:
L9's reachable space was ~14–45% (fortress holds) or ~81–100%
(overrun), a ~40-point dead zone, _no config near target_. L7 parked,
L9 grandfathered, three late-tier scenarios, one root class. The §4h
prescribed lever for L10 is multi-cluster geometry creating multiple
independent routes so the win-rate is a _continuous distribution_
through ~50 rather than bimodal. The following is the rigorous argument
that this geometry delivers that.

### 3.1 Why L9 was bimodal (the mechanism to defeat)

The locked chain-march musters the **entire field force as one mass**
on the last neutral POST, then commits that single mass down **one
greedy basin** to the objective (`buildChainMarchPolicy`: all non-guard
parties wait at `musterPost` until _every_ living party is within
`musterRing`, then _all_ target the objective). The fortress defends
_one_ tile with a pinned guard + an isotropic pickets/rover leash
around that tile. One mass vs one radius around one tile is **one
binary trial**: either the mass's integrated attrition cracks the
+def/+heal stack (overrun, ~81–100%) or it does not (held,
~14–45%). There is no in-engine mechanism for the mass to _partially_
succeed — the post-capture co-located-pause rule (§4e) makes the
objective winner-take-all. A binary trial repeated over seeds yields a
**bimodal** histogram with an empty middle. That is precisely the L9
dead zone.

### 3.2 Why this geometry is continuous, not bimodal

The fix is to **decompose the one binary trial into several
partially-independent binary route-trials whose sum is continuous**.
Concretely:

1. **The mass is forced to split, by the chain fork + composition
   gate.** The chain forks at Tool-Rack (§2 ruling 2). Mage-bearing
   parties can additionally take the Car-Hood→Shelving plane route
   (Route 3) that non-mage parties cannot (engine: only
   `ant-plane-switch`-carriers teleport, `movement.ts:257–260`; the
   paired-POST shortcut also requires reaching Car-Hood, a North-branch
   waypoint). So the single mustered body necessarily distributes
   across **North-floor / South-floor / over-the-car** by which branch
   each party's greedy target resolves to and by composition. The L9
   single mass becomes 3–4 sub-forces.
2. **The routes arrive from different bearings, and the locked
   fortress cannot cover all bearings.** Route 1 arrives from the
   **north** (descending x=9), Route 2 from the **west** (along y=9),
   Route 3 from **above** (ceiling), Route 4 the degenerate west dash.
   The fortress's only mobile coverage is the rover + pickets on a
   _single Chebyshev radius around the pinned guard at (9,9)_
   (`sortieOrders`: `distance(objectiveRef, ant)`, one isotropic
   number). Geometric fact: a single radius around one tile **cannot
   be simultaneously tight against three different bearings plus the
   ceiling axis**. Whichever bearing the rover commits to, the others
   are under-defended _that seed_. Which bearing the rover commits to
   depends on `closestAntParty` (insertion order + Manhattan), which
   varies with the route-split — so **across seeds the rover defends
   different bearings, and a different subset of routes gets through
   each seed**.
3. **Partial success is now an in-engine outcome.** Because the
   sub-forces arrive separately and from different bearings, a seed can
   resolve as "Route 2 got through while Route 1 was intercepted" or
   "Route 3 (ceiling) slipped a mage party onto the objective from
   above while the rover was committed north." Each is a _partial_
   result — exactly the outcome class L9's one-mass-one-basin structure
   could not produce. The aggregate win-rate is then `P(at least one
route converts the objective)` summed over a _mixture_ of
   route-trials with **different and only partially-correlated success
   probabilities** (North ≈ defended/high-cover/slow; South ≈
   fast/low-cover; ceiling ≈ uncovered-until-descent/mage-gated;
   direct ≈ least-defended fallback). A sum of several Bernoulli trials
   with _distinct, non-degenerate_ p's is a **smooth, unimodal
   distribution with mass in the middle** — the continuous-through-~50
   shape §4h requires — precisely _because_ the per-route p's are
   different (identical routes would just re-collapse to one trial).
4. **The clusters are separated, never one bisecting mass.** This is
   the geometric crux distinguishing L10 from L5/L9. L5's bed and L9's
   fuse-box approach were a _single_ bisecting/funneling obstacle → one
   basin → one trial → bimodal. The Garage's Workbench / Car / Shelving
   are **three separated blocks with three open lanes between them**
   (x=3, x=7, x=9). Separation is what makes the routes _geometrically_
   independent rather than three labels on one corridor. The Shelving
   block deliberately does NOT touch the south edge (§1.1) so the South
   passage never re-pinches into a single chokepoint — the single most
   important specific anti-L9 decision in the layout.

### 3.3 Asymmetry is load-bearing, not incidental

The four routes are **comparable but deliberately not identical** in
viability (level-progression-plan §2 L10 / the brief): North is
high-cover but slow (Workbench def, longer path); South is fast but
low-cover; ceiling is uncovered-until-descent but mage-gated and
longest; direct is least-defended. If the routes were _identical_ the
sum-of-Bernoulli argument degenerates back to one trial (n identical
coins = one scaled coin, still bimodal at the extremes). The _spread of
per-route p's_ is what fills the histogram middle. This is the same
structural insight the L4 Light-Switch / L5 concealment rulings used
(an earned, route-conditioned advantage rather than a flat army-wide
modifier); applied here to _spatial_ routes rather than a combat buff.

### 3.4 What this is NOT (constraint compliance)

- **Not a card-economy rebound.** No `goldPerTurn`-for-cards, no
  card-market reliance. §4f-directed; the L7 card-host park precedent.
  The continuity is purely geometric/objective-structural.
- **Not an un-opted ability-param lever.** This position does **not**
  request `abilityParamsAuthoritative: true`; no hypnotize/recruit
  param delta is budgeted. §4g-directed. (Whether to opt in for any
  Gameplay reason is the Gameplay PA's explicit call, not Level's.)
- **Not a plane-affinity / wall-combat lever.** §4d-directed: walls
  are latent identity texture, not a curve mover; not budgeted as a
  route or win-rate driver (§1.2).
- **Not a `healingRate` occupation economy.** §4e-directed: a POST
  heal/def occupation economy is engine-inert under `capture-post`
  (winner-take-all co-located-pause). Tool-Rack's heal is a _staging_
  affordance, not a curve lever (its magnitude is flagged to Gameplay
  precisely so it is not mis-credited as one — the L9-attribution
  caution, §4g).
- **gate-29 / L1–L9 untouched.** No shipped scenario, baseline, or
  shared AI builder is modified; L9≈37 grandfather preserved; L1 six
  recorded baselines byte-identical. L10 is purely additive
  `data/level-10/`.

### 3.5 Honest residual risk (stated, not hidden)

Multi-route geometry **mitigates** but does not **prove the absence of**
bistability under the frozen engine. The §4h finding is _systemic_;
L10 is the same root family. The residual risk is in §7 (the single
biggest risk I could not fully design out). This position's claim is
narrow and defensible: this geometry gives the within-loop a
_continuous_ lever (the per-route viability spread, tunable by
Gameplay's choice of which branch is `musterPost`/which parties carry
mages/leash widths) where L9 had _none_ — it converts a binary flip
into a tunable mixture. Whether the mixture's mean can be _landed_ at
~50 within the loop's latitude is a Gameplay/loop measurement, and if
it cannot, the §4h precedent (grandfather/park as a sanctioned
per-level outcome, holistic decision deferred) applies — this geometry
is explicitly designed to make that the _last_ resort, not the first.

---

## 4. Roster / start spatial asks (spatial only; composition deferred)

Unit composition and combat tuning are the Gameplay PA's (§6.3). The
Level PA rules only the **spatial** start structure required for the
multi-route topology to actually exercise:

1. **Ant start: a clustered home muster at Side-Door (0,9), spread
   across (0,9),(1,9),(0,8),(1,8),(0,7)** (the Side-Door + Tool-Rack
   pocket). The scaffold starts ants at the _opposite_ corner-ish
   (x∈0–1, y∈0–2, the NW). That is **wrong for this geometry** — it
   puts the ant home adjacent to the North passage only, biasing every
   seed toward Route 1 and collapsing the multi-route structure to one
   basin (re-creating the L9 single-basin failure). Side-Door is SW
   (0,9) by ruling (§2); the ant start MUST be co-located with
   Side-Door so the chain fork at Tool-Rack is the _first_ decision,
   not pre-decided by spawn geometry.
2. **Party count (spatial standpoint): ≥4 field parties + queen-guard.**
   The §4h split argument requires the mustered body to be _divisible_
   across ≥3 routes; with <3 field parties the "mass splits across
   routes" mechanism cannot express partial outcomes (too few parties
   to distribute). 4–5 field parties (the scaffold's 4 spider / 5 ant
   party counts are spatially fine) is the minimum for the
   distribution-not-flip behavior. **At least one field party must be
   mage-bearing** (spatially required so Route 3, the over-the-car
   plane transition, is actually takeable — `ant-plane-switch`/paired-
   POST gating). Exact composition is Gameplay's.
3. **Spider start: fortress-clustered at/around Engine-Block (9,9)**,
   i.e. (9,9),(9,8),(8,9),(8,8) — the scaffold's spider starts are
   already correct (SE cluster around the objective). No change asked.
4. **Spider queen-guard pinned to Engine-Block (9,9)** — the
   `buildFortressDefensePolicy` `cfg.guard` tile. This is the objective
   tile by ruling; the guard's _pinning_ is the AI doctrine
   (Gameplay/loop), the _tile_ is Level-owned and is (9,9).

---

## 5. Flagged boundary cases (human / Gameplay resolution — NOT claimed)

Per §6.3 / §4a the Level PA claims none of these; they are flagged for
the orchestrator/Gameplay PA exactly as the prior arbitrations handled
L4/L7/L9 splits.

1. **Day/night cycle debut at L10 — GAMEPLAY-owned (§4a #7, RECORDED
   binding).** Day/night is a _shipped_ Gameplay mechanic (round 5,
   global turn-cadence combat-profile flip; `abilities.json`
   `scout-ping` already carries `phaseRestriction:"day"`). The Level PA
   **only schedules its L10 debut** (it debuts here, the finale, per
   level-progression-plan §2 L10 / roadmap §4.1). The combat payload
   (what day vs night does to unit profiles, the forced-tempo window
   length, interaction with the route mix) is **entirely Gameplay's** —
   flagged, not designed, not budgeted by Level as a route or win-rate
   lever. Spatial note for Gameplay: night suppressing `scout-ping`
   interacts with the _information_ layer over the multi-route
   approach; that interaction is a Gameplay/perception call (see #3).
2. **Tool-Rack heal magnitude — Gameplay sign-off.** Tool-Rack is the
   high-heal staging node (its _placement_ at (0,7) and its _role_ as
   the chain-fork muster point are Level-ruled). Its `healingRate`
   _magnitude_ is a combat payload and, per §4e, a POST heal is
   engine-inert as a `capture-post` curve lever — so it must NOT be
   credited as a balance lever. Flagged so the orchestrator does not
   repeat the L9/§4g over-attribution of an inert heal value. Level
   proposes "high relative to other POSTs" for staging _feel_;
   Gameplay rules the number.
3. **Concealment / spider-perception interaction — GAMEPLAY-owned
   (§4a L5 override precedent).** L10 introduces **no new concealment
   POST** (the 7 POSTs are enumerated; none is a concealment garrison).
   But the over-the-car ceiling route (Route 3) and the day/night
   `scout-ping` suppression both touch _what the spider AI can
   perceive_ about which route an ant force took. Per the binding L5
   ruling (concealment/perception is an information-warfare mechanic,
   Gameplay-owned, must be proven not to invalidate the locked
   spider-AI visibility spec), **any claim that the ceiling route is
   "unscoutable" or that night blinds the fortress to a bearing is a
   Gameplay/perception ruling, flagged here, not asserted by Level.**
   Level asserts only the _geometry_ (the ceiling route exists, arrives
   from above, the fortress's leash is one floor-referenced radius);
   whether the spider AI _perceives_ the approach is Gameplay's.
4. **Which chain branch is `musterPost` / mage-party assignment /
   leash widths — Gameplay/within-loop.** The Level PA rules that the
   chain MUST fork at Tool-Rack and both branches MUST be trap-free
   greedy chains (verified §1.4). _Which_ branch the within-loop AI
   musters on, how many mage parties take Route 3, and the
   pickets/rover `interceptRadius`/`roverGate` are the tunable knobs
   that move the route-mix mean toward ~50 — those are
   Gameplay/within-loop, flagged as the continuous lever this geometry
   hands them (§3.5).

---

## 6. Critique of the existing `data/level-10/` scaffold

The dead build agents' scaffold (`data/level-10/`) before the context
break. Assessed against this ruling.

**Got right (keep):**

- **Car as a 3×3 dead-center floor obstacle at (4–6,4–6)**, splitting
  the floor into N (rows 0–3, depth 4) / S (rows 7–9, depth 3)
  passages. This is exactly the level-progression-plan §2 L10
  requirement and is **kept verbatim**.
- **All 6 planes present**, floor primary, ceiling fully open, walls on
  the standard 40/60 mask. Correct finale richness + L1 bookend.
- **`static: true`, 10×10, `victoryCondition: {kind:"capture-post",
postId:"engine-block"}`.** Correct engine reality (no 16×12) and
  correct victory wiring.
- **Engine-Block at (9,9) spider-owned, highest def (scaffold def 6),
  Side-Door ant home, Tool-Rack as a neutral high-heal staging node,
  Car-Hood↔(ceiling endpoint) plane pair.** The _topology_ is sound;
  Engine-Block def 6 matches the tier-max ordering ruling.
- **Spider starts SE-clustered around the objective** (9,9 region) —
  spatially correct fortress start.

**Got wrong (this ruling overrides):**

1. **Ant start placed NW (x∈0–1, y∈0–2), opposite Side-Door's SW
   (0,9).** This is the single biggest scaffold error. It pre-biases
   every seed toward the North passage and **collapses the multi-route
   structure to one basin — re-creating the exact L9 single-basin
   bistable failure §4h tells us to design against.** Overridden:
   ant start MUST be co-located with Side-Door at SW (0,9) (§4.1).
2. **Only the Car is an obstacle (9 tiles); no Workbench or Shelving
   cluster blocks.** The scaffold has the Car but **not the
   multi-cluster geometry §4h prescribes** — with only the Car, the
   "three clusters" are POST labels, not geometric structure, and the
   N/S passages are two undifferentiated lanes (≈ identical viability →
   the sum-of-Bernoulli argument degenerates → still bimodal).
   Overridden: add the Workbench 2×3 block (1–2,4–6) and the Shelving
   1×3 block (8,4–6) per §1.1 (18 obstacles total) so the routes are
   _geometrically_ distinct and _asymmetric_ in viability.
3. **POST coords: Workbench at (2,7), Garage-Door at (7,9),
   Over-Shelf ceiling endpoint at (5,2), Car-Hood at (3,3).** Workbench
   at (2,7) is in the South passage, not a North-route defensive
   waypoint — it does not anchor the defensive cluster the §4h geometry
   needs; moved to (3,3) (N-route waypoint, adjacent to the Workbench
   block). Car-Hood at (3,3) is too far west to be the "over the car"
   mount; moved to (5,3) (x within the Car's column span, just north of
   its top edge — the literal over-the-car transition point). Shelving
   endpoint kept on the ceiling near (5,2). Garage-Door at (7,9) is
   **correct and kept** (east of the Car's x-span — the §1.4 trap-free
   invariant; the scaffold got this right).
4. **Scaffold POST id `over-shelf` for the ceiling endpoint.** This
   ruling names the 7th-of-7 POST **Shelving** (level-progression-plan
   §2 L10 names "Shelving (transition endpoint)"); rename
   `over-shelf` → `shelving`, keep the Car-Hood↔Shelving `pairedWith`
   linkage the scaffold correctly established.
5. **Tool-Rack heal = 3 in scaffold, flat with Side-Door.** Not a
   Level error per se (it is a flagged Gameplay magnitude), but noted:
   the scaffold treats Tool-Rack's heal as ordinary; per §5.2 its
   _high-heal staging_ role is Level-ruled, the _number_ is flagged to
   Gameplay and must not be curve-credited (§4e).

**Net:** the scaffold's victory wiring, Car divider, plane set, and
objective/home topology are sound and kept. Its two fatal flaws — the
NW ant start and the missing multi-cluster geometry — are exactly the
two things that would have reproduced the L9 single-basin bistable
trap; this ruling corrects both, which is the entire §4h point of L10.

---

## 7. Summary of the verdict (Level-PA position)

| Dimension             | Ruling                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Realization           | `static`, 10×10, all 6 planes; 18-tile obstacle field as **three separated clusters + a 3×3 Car**; "16×12" NOT attempted (§3 dep #5 DEFERRED / §4a)                                                                                                                                                                            |
| Floor geometry        | Car (4–6,4–6); Workbench block (1–2,4–6); Shelving block (8,4–6); N passage rows 0–3 (depth 4); S passage rows 7–9 (depth 3); lanes x=3 / x=7 / x=9 open all y — all greedy-verified trap-free on every actual chain leg under every RNG tie-ordering (§1.4)                                                                   |
| Multi-route topology  | 4 independent routes: N-floor (Workbench arm), S-floor (Garage-Door arm), over-the-car plane (Car-Hood→Shelving, mage-gated), direct dash (fallback); independent because the pinned-guard + single-radius fortress geometrically cannot cover 4 bearings at once (§1.3/§3.2)                                                  |
| 7 POSTs               | Side-Door floor(0,9) ant; Tool-Rack floor(0,7) neutral high-heal; Workbench floor(3,3) neutral def; Car-Hood floor(5,3) neutral, paired→Shelving; Shelving ceiling(5,2) neutral, paired→Car-Hood; Garage-Door floor(7,9) neutral; Engine-Block floor(9,9) spider, tier-max def — defensive/heal magnitudes FLAGGED to Gameplay |
| Anti-bistability      | §4h-named: decompose L9's one-mass-one-basin binary trial into a _mixture of 3–4 partially-correlated route-trials with distinct viability p's_ → sum is continuous/unimodal through ~50, not bimodal; clusters SEPARATED (never one bisecting mass), Shelving NOT touching the S edge (the key specific anti-L9 decision)     |
| Spatial start asks    | Ant home co-located at Side-Door SW (0,9) — overrides the scaffold's fatal NW start; ≥3–4 divisible field parties + ≥1 mage-bearing (so Route 3 exists); spider fortress-clustered at (9,9), queen-guard pinned to (9,9)                                                                                                       |
| Flagged (not claimed) | Day/night payload (Gameplay, §4a#7); Tool-Rack heal magnitude (Gameplay, §4e — not a curve lever); concealment/perception of route taken (Gameplay, L5-override precedent); `musterPost`/mage-assignment/leash widths (Gameplay/within-loop — the continuous lever this geometry hands them)                                   |
| Constraint compliance | No card economy (§4f); no `abilityParamsAuthoritative` request (§4g); no plane-affinity/wall lever (§4d); no heal-occupation economy (§4e); gate-29 + L1–L9 (incl. L9≈37) byte-identical / untouched                                                                                                                           |
| Honest residual       | Multi-route _mitigates_ but cannot _prove the absence of_ the §4h systemic bistability; it converts a binary flip into a tunable mixture where L9 had none; if the mixture mean cannot be loop-landed at ~50, the §4h grandfather/park precedent applies as the sanctioned last resort (§3.5/§7-risk)                          |

---

### Single biggest anti-bistability risk I could not fully design out

**The locked chain-march re-converges the split mass before contact.**
`buildChainMarchPolicy`'s muster gate makes _every_ non-guard field
party wait until _all_ are within `musterRing` of `musterPost`, then
_all_ commit to the same `nextChainPost`. My geometry forces a _spatial_
split (different bearings, mage-gated ceiling route), but the AI's
muster logic is a _temporal re-synchronizer_: if the within-loop sets
`musterPost` past the Tool-Rack fork (or sets a wide `musterRing`), the
parties that took different routes are gathered back into one mass at
the next chain link and commit to the objective together — re-collapsing
to L9's one-mass-one-basin binary trial regardless of how independent
the _geometry_ is. I have ruled the spatial counter (fork the chain at
Tool-Rack; Tool-Rack is the muster point; Shelving off the S edge so no
re-pinch) and proven the routes geometrically independent and
trap-free — but **whether the split actually survives to contact is
controlled by the within-loop's `musterPost`/`musterRing`/mage-party
choices, which are Gameplay/loop-owned, not Level-owned.** I cannot
spatially force the locked AI to _keep_ the mass split; I can only
build the geometry that makes a kept-split continuous and make the
re-convergence a _visible, ruled_ knob the orchestrator must hold (§5.4).
If the loop re-synchronizes the mass, L10 inherits the full §4h
structural bistability and the grandfather/park precedent becomes the
likely disposition — this is the precise residual the consolidated
end-of-Phase-D review must weigh.
