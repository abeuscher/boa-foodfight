# Gameplay Progression Agent — L10 Garage (Tier-1 Finale): POSITION

**Owner:** Gameplay Progression Agent (§6.2/§6.3), Phase-D §9 multi-agent
design. Document only — no code, no scenario data; the orchestrator
synthesizes this against the Level PA position into a ruled arbitration.
**Status:** Phase-D L10 position. The Tier-1 campaign finale, the LAST
scenario. Internal adversarial ant + spider faction sub-agent pair run;
their convergence/residual is recorded.
**Inputs read:** `docs/level-progression-plan.md` §1/L10 247–269 / §3
deps / §4 boundary cases / **§4f 512–533** / **§4g 535–572** /
**§4h 574–621** / §5 / §6.2/§6.3; `docs/roadmap-tier-1.md` §4.1 L10
(line 268) / §5 (L10 target **50%**, "Tier finale. Genuinely close.");
`data/level-10/*` scaffold; `docs/debate/l9-gameplay-pa-arbitration.md`
incl. §GRANDFATHERED; `docs/debate/l5-gameplay-pa-arbitration.md` (incl.
the §4g correction — L5's hypnotize cap never bound; 66% carried by
concealment + geometry); `ai/capture-chain.ts`, `ai/index.ts`,
`ai/baseline-l9.ts`, `ai/spider-l9.ts`, `ai/mission-spider-policy.ts`,
`ai/baseline-l5.ts`-shape; `engine/phase.ts`, `engine/schemas/map.ts`,
`engine/battle.ts` (phase-offset call sites), `engine/types.ts`.
**Bounded by:** §4f (NO card-economy rebound), §4g (NO un-opted
abilities.json hypnotize/recruit lever), §4h (the systemic late-tier
finding; grandfather/park is a sanctioned per-level outcome; the
holistic curve policy is the user's at the consolidated review),
§6.3 ownership (I own UNIT/COMBAT/FACTION; map geometry / POST
placement / objective structure are the Level PA's), gate-29
byte-identity sacrosanct, L1–L9 no-regression incl. **L9 ≈ 37**
(grandfathered trough). Engine FROZEN — no `engine/` edits.

---

## 0. The headline finding (read this first — it reframes the brief)

**The day/night combat payload I was told I "OWN" is engine-hardcoded
and inert as a tuning lever, exactly the §4g/§4h class of mis-attributed
lever the brief warns me not to repeat.**

The brief names the L10 day/night cycle as "a candidate continuity
lever … a global combat-profile flip that can modulate assault success
per-window," and assigns me its combat payload. I checked the engine.
`engine/phase.ts` resolves the entire day/night payload from **hardcoded
module constants**:

- `PHASE_LENGTH = 4` (fixed 4-turn cadence: day 1–4, night 5–8, …;
  `engine/phase.ts:27`, consumed by `engine/state.ts:482` and
  `engine/end-of-turn.ts:1064`).
- `phaseStatOffsetFor(template, phase)` (`engine/phase.ts:42–50`):
  night ⇒ **spiders +1 attack / +1 agility**; night ⇒ **ant-archer
  −1 attack**; day ⇒ zero. Nothing else.
- `engine/battle.ts:203–204` and `:999–1000` call `phaseStatOffsetFor`
  **directly off `tmpl` and `state.phase`** — they read **nothing** from
  the scenario/map. `engine/schemas/map.ts` has **no** phase/cadence/
  payload field anywhere (verified: the only global combat modifier in
  the schema is the L4 `combatModifier` flip-state POST; there is no
  `dayNight`, no `phaseSchedule`, no `nightProfile`).

This is **structurally identical to the §4g hypnotize/recruit
hardcoded-constants hole** — a premise-level hole in the data-driven-
tuning assumption. The decisive difference: §4g was **RESOLVED** by
merged engine dep #10 (the opt-in `abilityParamsAuthoritative` flag,
`f39c7bd`). **There is NO equivalent opt-in for the phase payload, and
the engine is FROZEN — I cannot add one.** Therefore:

> **The L10 day/night combat payload is FIXED at spiders-+1/+1-at-night
> / ant-archer-−1-at-night / 4-turn cadence, for ALL scenarios, by
> construction. It is NOT a curve lever I can budget. Any pp I assign to
> "tuning the day/night flip" would be an inert-lever mis-attribution —
> the precise §4g/§4h error the brief binds me not to repeat.** §2 rules
> the payload by _describing the engine-fixed reality and flagging the
> seam_, not by proposing values, because proposing values would be
> proposing un-shippable engine edits.

This finding is load-bearing for the reachability call (§5): the brief's
single named continuity lever ("the day/night global combat-profile
flip can modulate per-window rather than all-or-nothing") **is not
available** under the frozen engine. That removes the one mechanism that
could plausibly have broken the §4h bistability, and is the core reason
my honest prediction is a **third bistable late-tier outcome →
grandfather/park fork**.

---

## 1. Ant + spider roster composition (with the adversarial pair)

L10 is `capture-post → engine-block`, a defended-fortress matchup — the
§4h structurally-bistable family (L9: fortress holds ~14–45% OR overrun
~81–100%, ~40-pt dead-zone). The Level PA owns the multi-cluster
geometry (Workbench W / Car center 3×3 / Shelving E; the Car splits the
floor into ≥2-wide N/S passages; "over the car" plane-transition route
via `car-hood`↔`over-shelf`). My roster job: make the **multi-route**
fortress assault produce a _continuous_ distribution, not the L9
bimodal one. The continuity must come from roster/AI (the only levers
the frozen engine + locked AI convert), since the day/night lever is
dead (§0).

### Adversarial pair — what each sub-agent wanted

**Ant sub-agent (assault):** wants a roster that can split into
**independent route-columns** so the multi-cluster geometry is actually
exercised, not collapsed by a greedy single-mass march into one
passage. Asked for: 5 parties, ≥2 mage-bearing (one per plane-transition
route so `ant-plane-switch` makes the "over the car" route real), high
`ant-potato-bug` content (hp 12 / atk 9 / con 9 — the only ant body that
survives the +6-def `engine-block` fortress trade), and the queen-guard
kept _out_ of the assault (the L9/L5 immobile-spine pattern, so the
muster gate math is unchanged and seed-robust). Ant explicitly does NOT
want a stat buff (the §4g/L5-correction caution: ant buffs that the
greedy AI converts tip straight into the ~81–100% overrun regime — the
L9 1-party-detach → ant 98–100% failure).

**Spider sub-agent (Engine-Block defense):** wants the L5/L9
fortress-attrition shape carried **byte-identical** (`end-guard` queen
pin on the +6-def objective, two pickets on a Chebyshev leash,
`corridor-rovers` forward assault-breaker) because that doctrine is the
locked one the engine actually executes and is seed-robust. Asked for:
the objective `defensiveBonus 6` (highest in tier, scaffold already has
this) + `healingRate 2`, and a **per-cluster picket** so each of the
three Level-PA approach routes meets a real defender (otherwise the ant
routes around an undefended cluster — the L4-§9 route-around
falsification, §3). Spider explicitly refused a buff hung on the
day/night flip ("an inert system" — the §4g lesson cuts for the spider
too, exactly as it conceded at L9).

### Where I settled (the ruled roster)

Net: **carry the L9/L5 fortress roster shape byte-identical; the ONLY
deltas are (a) one extra ant route-column and (b) re-tagging the two
existing spider pickets as per-cluster defenders.** No stat changes, no
new templates, no plane-affinity delta (§4d carries byte-identical from
L9; it is empirically inert under the chain-march/fortress doctrine and
is NOT budgeted). All `units.json` carries forward from L9
byte-identical (verified: `data/level-10/units.json` already equals the
L9 file — spider combat `wall {1,1}`/`ceiling {1,1}`, ants untouched).

**Ant roster (5 parties — scaffold is close; my deltas in bold):**

| Party              | Cap | Composition                                                | Role                                                                                                           |
| ------------------ | --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `queen-guard`      | 12  | ant-queen ×1, ant-footman ×4, ant-archer ×2, ant-worker ×2 | Immobile spine on `side-door` (excluded from muster gate — the locked L5/L9 pattern; seed-robust)              |
| `vanguard-alpha`   | 8   | ant-footman ×4, ant-archer ×2, ant-scout ×1                | N-passage column (route 1)                                                                                     |
| `vanguard-bravo`   | 8   | **ant-mage ×1**, ant-footman ×3, ant-archer ×1             | "Over the car" plane-transition column (route 2 — mage carries `ant-plane-switch` for `car-hood`→`over-shelf`) |
| `vanguard-charlie` | 8   | ant-footman ×4, **ant-potato-bug ×2**                      | S-passage heavy column (route 3 — potato-bug body to survive the +6 fortress trade)                            |
| `pathfinders`      | 8   | ant-mage ×1, ant-scout ×2, ant-archer ×3                   | Second plane-transition-capable column / Shelving-cluster pressure                                             |

This is the scaffold roster **unchanged** — it is already a 5-party,
2-mage, potato-bug-bearing split. I ratify it (critique in §7). The
ant-side continuity mechanism is **the binding multi-route doctrine
(§3)**, not roster stats.

**Spider roster (4 parties — scaffold shape carried; my delta is the
per-cluster picket _binding_, not a stat change):**

| Party             | Cap | Composition                                         | Role                                                                            |
| ----------------- | --- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `end-guard`       | 12  | spider-queen ×1, spider-elite ×2, spider-soldier ×3 | Queen pin on `engine-block` (+6 def / +2 heal). Immovable spine.                |
| `north-picket`    | 8   | spider-spinner ×2, spider-soldier ×3                | **Bound to the N-passage cluster** (route 1 defender)                           |
| `south-picket`    | 8   | spider-spinner ×2, spider-soldier ×3                | **Bound to the S-passage cluster** (route 3 defender)                           |
| `corridor-rovers` | 8   | spider-soldier ×3, spider-scout ×2                  | Forward assault-breaker + the "over the car" / Shelving route (route 2) contest |

Roster compositions are **byte-identical to the L9 scaffold/L5
fortress** (verified). The delta is _behavioral binding_ (§3), expressed
through the existing `FortressDefenseConfig` picket/rover surface — **no
shared-builder default touched**, so L3/L4/L5/L6/L8/L9 + the tutorial
stay byte-identical and gate-29 is sacrosanct.

---

## 2. Day/night combat payload ruling for the L10 debut

**RULING: the L10 day/night combat payload is the ENGINE-FIXED value,
declared here for the record, NOT a tuned delta. I propose NO numbers
because the engine reads none.**

Per §0, `engine/phase.ts` is frozen and data-blind. The L10 debut
payload is therefore, by construction and for ALL scenarios:

- **Cadence:** 4-turn fixed (`PHASE_LENGTH = 4`): day t1–4, night t5–8,
  day t9–12, … Phase starts `day` (`engine/state.ts:482`); flips at
  end-of-turn when `phaseTurnsRemaining` hits 0
  (`engine/end-of-turn.ts:1055–1064`); emits `phase-changed`.
- **Night combat profile:** spider templates **+1 attack / +1 agility**;
  `ant-archer` template **−1 attack**; applied after plane-affinity,
  before the multiplicative posture/jelly/queen stack
  (`engine/battle.ts:203/999` via `applyPhaseOffsetToStats`).
- **Day combat profile:** zero offsets.
- **Ability gating (engine-fixed):** `scout-ping` suppressed at night
  (already reflected in the L10 scaffold: `abilities.json` `scout-ping`
  carries `"phaseRestriction": "day"`).

**What this means for the curve:** the day/night flip _does_ produce a
real per-window combat swing — at night the spider fortress is
materially harder (+1/+1 spider, −1 ant-archer; the L10 ant roster runs
6–7 archers across the columns, so the night archer-nerf bites the
assault specifically). But this swing is **identical in every scenario
that runs past turn 4** and is **not modulable by me**. It is a _fixed
environmental rhythm_, not a continuity _lever_. I budget it at **~0pp
of tunable delta** (it is already implicitly in every measured
post-turn-4 number; L10 is simply the first scenario the roadmap
_narratively_ surfaces it — the mechanic "debuts" as story/UX, not as a
new engine capability).

**SEAM FLAG to the Level PA (and the orchestrator):** the brief asks me
to "flag the cadence-scheduling seam — Level schedules the debut window
cadence spatially/temporally; you own the combat delta." I flag it as
**RESOLVED-BY-IMPOSSIBILITY, not split**: there is _nothing to schedule_
and _nothing to tune_. The cadence is the fixed engine `PHASE_LENGTH=4`;
the Level PA cannot author a window schedule (no schema field exists);
I cannot author a payload (no data path exists). The only Level-side
day/night surface that _does_ exist and _is_ exercised is **geometry
that interacts with the fixed rhythm** — e.g. placing the longest /
most-exposed approach so the assault is forced across it during a
night window. That is a pure Level-PA geometry decision (route length
vs. the fixed 4-turn clock); it is **not** a Gameplay payload and I
explicitly do **not** claim it. **Recommendation to the orchestrator:
record the day/night "boundary case" (level-progression-plan §4 #8 /
§6.3) as RESOLVED — engine-fixed, no split needed, no human payload
decision to make. This is a §4g-class finding for the day/night
mechanic and should be recorded on the trunk the same way §4g was, so
no future level mis-budgets a day/night curve lever.**

---

## 3. AI doctrine (binding, seed-robust) — the multi-route assault + Engine-Block defense

The §4h countermeasure is MULTI-CLUSTER geometry (Level-owned) creating
multiple independent approach routes. My job is the AI side: a binding,
seed-robust doctrine so each route is **genuinely exercised** — the
L4-§9 precedent is decisive (a ruled mechanic the frozen AI routes
around is _inert_; L4-§9 measured ant 99%/+39pp because the AI did not
exercise the contest; L9 re-applied the precedent). The doctrine must
make the greedy engine (greedy Manhattan `moveToOrHold`, no BFS, no
planned path — confirmed in `ai/capture-chain.ts`/`policy-helpers`)
_actually_ split across routes and _actually_ defend each one.

### 3.1 Ant doctrine — BINDING multi-route split (the L4-§9 anti-route-around structure, applied a seventh time)

The L9 chain-marcher musters the **whole body** on one neutral link then
commits as **one mass** — that is precisely the structure that makes the
matchup bistable: one mass either bounces off the fortress (hold regime)
or rolls it (overrun regime), nothing between. The L10 doctrine must
**bind each vanguard column to a _distinct_ route** so the assault
arrives as **three time-staggered waves on three geometries**, not one
mass:

1. **`vanguard-alpha` → N-passage route** (Workbench-side floor). Chain:
   `[side-door-staging, garage-door, engine-block]` walked along the
   north floor passage. Greedy Manhattan around the Car's north end
   (Level-PA-verified ≥2-wide).
2. **`vanguard-bravo` → "over the car" plane-transition route.** Bound
   via the **existing L4 `switchContest` machinery** on
   `buildChainMarchPolicy` (the opt-in surface L9 already reuses — NO
   shared-builder default touched): `captureParties:['vanguard-bravo']`,
   `post: car-hood`, `detachGate:'muster'`, `detachmentIsSpent:false`.
   The mage-bearing column detaches post-muster, takes `car-hood`,
   plane-switches `car-hood`→`over-shelf` (engine
   `tryPlaneTransition` — the mage carries `ant-plane-switch`, exactly
   the L4 mechanism), descends on `engine-block` from the ceiling/E
   side. **This is the route the greedy AI would otherwise never take**
   (greedy Manhattan never volunteers a plane switch) — binding it
   through `switchContest` is the L4-§9 corrective that makes the
   plane-transition route genuinely exercised, not dead geometry.
3. **`vanguard-charlie` → S-passage route** (heavy potato-bug column;
   south floor passage around the Car's south end).
4. **`pathfinders` → Shelving-cluster pressure** (second mage column;
   secondary plane-transition-capable threat that prevents the spider
   collapsing all defense onto one route).

`queen-guard` holds `side-door` (immobile spine, excluded from every
gate — the locked L5/L9 pattern; byte-identical math, seed-robust).

**Binding invariants (changing any reopens the arbitration, L4-§9 /
§7 clause):** (i) each vanguard column is bound to its _named_ route;
(ii) the plane-transition column (`vanguard-bravo`) detaches via
`switchContest` post-muster so the "over the car" route is genuinely
walked in a **seed-robust majority** (the L4-§9 measurable ship-gate —
must be measured ≥ a clear majority of seeds 1..100, the same bar L9
clause 1 was held to: pump-flip 100/100); (iii) `detachmentIsSpent:
false` so the column rejoins (the L9 lesson — `spent` makes the spider
contest inert, the §7 failure). This is **within-loop AI config only**;
no engine change; the shared builder collapses to byte-identical for
all other levels.

### 3.2 Spider doctrine — BINDING per-cluster defense (anti-route-around, the L4-§9 §9.3(b).2 structure)

The fortress-attrition default (`buildFortressDefensePolicy`) garrisons
**one** objective tile; against a 3-route assault it lets the ant
**route around** the undefended clusters — the exact L4-§9
falsification. The L10 spider doctrine binds:

1. **`end-guard`** pins `engine-block` (+6 def / +2 heal). Immovable
   spine — never moves (the locked guard rule; seed-robust by
   construction).
2. **`north-picket` bound to the N-route cluster**, **`south-picket`
   bound to the S-route cluster** — each garrisons its cluster's
   choke on the `interceptRadius` Chebyshev leash and sorties onto the
   closest ant _on that route_, then falls back to bank def+heal. This
   is the existing picket sortie surface (`sortieOrders`), _retargeted
   per-cluster_ via the `FortressDefenseConfig` (no default touched).
3. **`corridor-rovers`** is the forward assault-breaker (L5 role
   carried) **plus** the `car-hood` plane-transition contest — an
   L10-opt-in wrapper _in the L10 spider file only_ (exactly the L9
   `spider-l9` wrapper pattern: `ai/spider-l9.ts` already establishes
   the opt-in-wrapper-no-shared-default precedent). It marches to
   contest `car-hood` whenever an ant detachment closes within a
   `CONTEST_LEASH` (the within-loop difficulty knob), so the "over the
   car" route meets a real defender.

**Binding invariant (L4-§9 / §7):** the _existence_ of a real defender
on **each of the three routes** in a **seed-robust majority of games**
is a RULED INVARIANT (without it the multi-route geometry is the
L4-§9 route-around breach — the ant takes the undefended cluster free,
collapsing straight to the overrun regime). The _difficulty_ of each
contest (leash sizes, picket cluster-bind radius) is the within-loop
tuning latitude. Seed-robustness is asserted the L9 way: each route's
defender must demonstrably engage in ≥ a clear majority of seeds 1..100,
measured, or it is the L4-§9 falsification a seventh time.

### 3.3 Why this is seed-robust and not route-around-able

The greedy engine has no BFS; an ant column bound to a named route
walks that route deterministically (pure `(state,scenario,rng)→state`,
no RNG consulted — verified in `capture-chain.ts`). The spider pickets
are bound to cluster choke tiles, not to "closest ant globally," so a
column on route 1 cannot lure the route-3 picket off route 3. The
plane-transition route is _forced_ through `switchContest`/the opt-in
wrapper on _both_ sides, so it cannot degenerate to "everyone takes the
cheap floor passage" (the greedy collapse). This is the L4-§9 doctrine
("design the contest so the AI genuinely exercises each route") applied
symmetrically to all three routes — the brief's explicit requirement.

---

## 4. Anti-bistability tuning rationale

**The L9 bistability root cause (from §GRANDFATHERED + `ai/baseline-l9.ts`
header):** the win-rate space is bimodal — fortress holds (~14–45%) or
overrun (~81–100%), ~40-pt dead-zone — because the _single-mass_
chain-march is an **all-or-nothing binary**: the mass either has enough
to break the +Ndef fortress (overrun) or it does not (hold). Every
"difficulty knob" swept (leash, musterRing, interceptRadius, detachGate)
was a **flat plateau then an integer cliff** — discrete, not continuous —
because one mass vs. one fortress has no continuous interpolant.

**The L10 anti-bistability thesis (the multi-route continuity argument):**
N independent time-staggered route-waves against N per-route defenders
turn the binary into a **sum of N partially-independent Bernoulli route
outcomes**. The aggregate win rate becomes ≈ "did enough routes succeed
to take `engine-block`," which is a _smoother_ function of per-route
difficulty than the single-mass cliff — a binomial-like CDF rather than
a step. _In principle_ this is the continuity mechanism, and it is the
right structural idea (it is exactly why the Level PA's multi-cluster
geometry is the §4h prescribed countermeasure).

**Which levers are continuous vs binary:**

| Lever                                                 | Type                                                                            | Owner                               | Effect on the distribution                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| Per-route spider leash radii (3 independent)          | **Continuous-ish** (3 integer knobs, partially independent → finer grid than 1) | Gameplay (within-loop)              | The intended continuity engine: each route's difficulty tuned semi-independently    |
| `switchContest` detach timing/size on the plane route | Discrete (the L9 integer-cliff lever)                                           | Gameplay                            | Binary-leaning — the L9 falsification lever; same risk here                         |
| Route count actually exercised (2 vs 3)               | **Binary cliff**                                                                | Geometry (Level) + binding doctrine | The dominant risk: if the doctrine collapses to 1–2 routes it reverts to L9 bimodal |
| Day/night payload                                     | **Inert** (engine-fixed, §0)                                                    | None                                | NOT a lever — the brief's hoped-for continuity lever is unavailable                 |
| Roster stats / plane-affinity                         | Inert/binary (§4d; L5-correction)                                               | Gameplay                            | NOT budgeted — ant buffs tip to overrun, the L9 1-party→98% failure                 |
| Card / heal economy                                   | Forbidden (§4f)                                                                 | —                                   | NOT used                                                                            |
| abilities.json hypnotize/recruit                      | Inert unless opted-in (§4g)                                                     | —                                   | NOT opted in (§6)                                                                   |

**Honest assessment of the thesis:** the multi-route continuity argument
is _structurally sound but empirically unproven and likely insufficient_
under the frozen engine + locked AI, for three reasons:

1. **The continuity engine is weak.** Three partially-correlated integer
   leash knobs is a _finer_ grid than L9's one, but the L9 file header
   shows even L9's knobs were "flat plateaus then integer cliffs." Three
   correlated cliffs do not reliably sum to a smooth CDF; they sum to a
   _staircase_. The binomial-smoothing only works if the routes are
   _independent_ — but they share one fortress objective and one greedy
   spider that re-converges (`buildFortressDefensePolicy`'s "any
   unexpected spider party converges on the objective"), correlating
   the route outcomes back toward the L9 binary.
2. **The strongest available continuity lever is dead (§0).** The
   brief's named per-window modulation lever (day/night profile flip)
   would have been the one genuinely _continuous_ global knob (a
   per-window combat tax that scales assault success smoothly). It is
   engine-fixed and inert. Removing it removes the single mechanism most
   likely to have broken the bistability.
3. **The matchup family is the proven §4h bistable one.** L9 grandfathered
   _after_ a GPA-sanctioned Level-side basin re-placement and _both_
   doctrine clauses fully seed-robust — the bistability survived a
   correct, fully-exercised doctrine. L10 is the same `capture-post`
   contested-fortress family with the same locked fortress doctrine.
   §4h's systemic finding ("§5 late targets not reliably reachable under
   frozen engine + locked AI doctrine") applies directly.

---

## 5. Honest reachability call

**Prediction: ~50% ("genuinely close") is NOT reliably config-reachable
for L10 under the frozen engine + locked AI doctrine. I predict L10 is
the THIRD structurally-bistable late-tier scenario (L7 PARKED, L9
GRANDFATHERED, L10 → GRANDFATHER/PARK fork), and I recommend the
orchestrator escalate the grandfather/park fork to the user per §4h.**

This is the §4h-sanctioned per-level honest call, not defeatism — it is
the §4g/§4h-mandated discipline of not mis-attributing curve weight to
inert levers (the day/night lever, §0) or to levers the locked AI does
not convert (roster stats, §4d; the L9 1-party→98% / 2-party→22% cliff).

**Predicted regimes (best estimate, to be confirmed in the within-loop
seeds-1..100 sweep — these are predictions, not measurements):**

- **Lower regime — fortress holds: ant ~20–45%.** The 3-route doctrine
  fully bound + seed-robust, per-route defenders engaging, the +6-def
  `engine-block` fortress + the night spider +1/+1 windows holding the
  staggered waves piecemeal. This is the L9 ~14–45 lower regime shifted
  modestly up by the multi-route staggering (the routes do add _some_
  continuity, just not enough to land 50). **Most-defensible
  grandfather point likely sits here, around ant ~40–45%** — closer to
  the L10 target than L9's 37 (the multi-route geometry _does_ help),
  but still below [≈48,52] and still the lower lobe of a bimodal
  distribution.
- **Upper regime — overrun: ant ~80–100%.** If the binding doctrine
  degrades (a route un-defended, the plane column not detaching, the
  greedy spider re-converging and leaving a cluster open) the 3-wave
  assault rolls the fortress exactly as the L9 1-party detach measured
  98–100%.
- **Dead-zone: ≈ [46, 78].** I predict **no stable config lands a
  seed-robust majority anywhere in [48,52]** — the same ~30+-point
  dead-zone shape as L9, narrowed somewhat at the lower edge by the
  multi-route help but not eliminated, because the continuity engine is
  three correlated integer cliffs (§4) and the one continuous global
  lever is dead (§0).

**The most-defensible grandfather value I predict: ant ~42–45%**, with
the 3-route doctrine fully implemented and BOTH the ant route-split and
the spider per-cluster defense demonstrably seed-robust (the L9-style
amended ship-gate: interest ≥75 + doctrine clauses seed-robust +
decisive, with the [≈48,52] win-band _withdrawn_ if and only if the
sweep confirms the predicted bistability). This sits **above the L9 ~37
grandfathered trough** (so the §4h "L9 is the brutal-basement trough
_below_ the L10 climax" curve-shape intent is _preserved_ — L10 ~43 > L9
~37, the finale still reads as a climb out of the basement even if it
does not reach the illustrative 50), and **above the §4h-amended
realized late curve** (L6 56 · L7 PARKED · L8 51 · L9 ~37 · L10 ~43),
keeping the late tier monotone-ish toward the finale at the _achievable_
band rather than the illustrative one.

**If the within-loop sweep falsifies this prediction and DOES find a
seed-robust in-band config:** ship it at ~50 — the prediction is
explicitly falsifiable on the built scenario (the L4-§9 / L9 measurable-
ship-gate discipline), and I would be glad to be wrong on the finale.
But per §4g/§4h I will not _budget_ a lever I cannot show the locked AI
converts, and the honest prediction with the day/night lever dead is
bistable.

**Recommended fork to the user (via the orchestrator, per §4h):**
GRANDFATHER L10 at the most-defensible lower-regime value (predicted
~42–45%) with the [≈48,52] band withdrawn, the 3-route doctrine
seed-robust, interest ≥75, decisive — OR park, at the user's discretion
at the consolidated end-of-Phase-D review. The systemic finding is now
**three** late-tier scenarios (L7/L9/L10), three structural blocks, one
root class — the headline Tier-1 retrospective input. The holistic
late-tier-curve policy (re-baseline §5 to achievable bands / accept the
parked-grandfathered shape / a deeper engine-or-AI investment) is the
user's, NOT re-decided here (§4h binding).

---

## 6. `abilityParamsAuthoritative` decision

**RULING: L10 does NOT opt in. The flag stays ABSENT (default opt-out).**

L10 is `capture-post` with **no hypnotize/recruit tuning intent** in any
lever of this position. The §3 doctrine uses route-binding + the
existing `switchContest`/fortress surfaces; no curve weight is budgeted
to any `abilities.json` hypnotize/recruit param. Per §4g, an un-opted
ability-param delta is inert and must NOT be budgeted — and I budget
none, so opting in would _gain nothing at the cost of gate-29 /
L1–L9 byte-identity risk_. This mirrors the L9 ruling exactly ("NO —
default opt-out (§4g-directed); opting in would gain nothing at the cost
of byte-identity; flag stays absent"). The scaffold correctly omits the
flag (verified: `data/level-10/map.json` has no
`abilityParamsAuthoritative`); keep it omitted. The L10 ship-gate must
assert `abilityParamsAuthoritative ?? false === false` (the L9
`engine/level9.test.ts:111–118` precedent).

---

## 7. Critique of the existing `data/level-10/` scaffold

Read and pressure-tested; **do not trust** (built by now-dead pre-context
agents). Findings:

1. **`map.json` — clamped 10×10, all 6 planes, `static:true`,
   `capture-post → engine-block`: CORRECT.** 7 POSTs present
   (`side-door` home/ant, `tool-rack` neutral high-heal, `workbench`
   neutral def, `car-hood`↔`over-shelf` plane-transition pair,
   `garage-door` neutral, `engine-block` spider objective
   `defensiveBonus 6`/`healingRate 2`). This matches the
   level-progression-plan L10 §3 POST list and the §4.2 5–8 rule
   (§5: L10=7). **Level-PA-owned; I do not re-place; I ratify the
   objective `defensiveBonus 6` as the highest-in-tier fortress the
   §4h-family requires and the spider sub-agent asked for.** Flag to
   Level PA: the position's §3 doctrine depends on the Car 3×3 splitting
   the floor into **≥2-wide N/S passages** AND a real "over the car"
   plane route via `car-hood`↔`over-shelf` — confirm both are navigable
   for the greedy engine in _every_ seed (the L9 lesson: a route the
   greedy AI cannot actually walk makes the bound doctrine inert).
2. **No `combatModifier`, no `hazardField`, no `concealment`, no
   `goldPerTurn`, no `jitter`: CORRECT for L10** (L10 is not an L4/L9/L5
   mechanic redo; the finale's distinguishing mechanic is day/night,
   which has no schema surface — §0).
3. **No `abilityParamsAuthoritative`: CORRECT** (§6 — keep absent).
4. **No day/night config of any kind: CORRECT BY NECESSITY, NOT BY
   DESIGN.** The scaffold _cannot_ carry day/night config because the
   schema has no field for it (§0). This is the single most important
   scaffold critique: **a future reader must not interpret the absent
   day/night config as "tuning TBD" — there is no tuning surface; it is
   engine-fixed.** Recommend the orchestrator record this on the trunk
   (the §4g-style resolution note for day/night).
5. **`roster-ants.json` — 5 parties, 2 mage-bearing, potato-bug column,
   queen-guard out of the assault: GOOD, ratified as-is (§1).** Already
   the multi-route-capable split the §3 doctrine needs. No stat changes.
   One note: `vanguard-bravo` and `pathfinders` both carry `ant-mage ×1`
   (both plane-transition-capable) — this is _correct and required_
   (two independent plane-route threats prevent the spider collapsing
   all defense onto one transition, §3.2). Confirm the leaders.json
   `scout-captain`/`sergeant` classes resolve (they do — leaders.json
   carries both, byte-identical to L5).
6. **`roster-spiders.json` — 4 parties, L5/L9 fortress shape
   byte-identical: GOOD, ratified (§1).** `end-guard` queen pin, two
   pickets, `corridor-rovers`. The §3.2 delta is _behavioral binding_
   (per-cluster picket retarget + the `corridor-rovers` car-hood
   wrapper), expressible entirely through the existing
   `FortressDefenseConfig`/opt-in-wrapper surface — **no roster JSON
   change needed**, no shared-builder default touched (gate-29
   sacrosanct).
7. **`units.json` — carries L9 byte-identical** (verified: spider combat
   `wall {1,1}`/`ceiling {1,1}`, ants untouched). CORRECT — §4d:
   plane-affinity is inert under the fortress/chain-march doctrine, NOT
   an L10 lever, NOT budgeted. Keep byte-identical (L1–L9 no-regression
   - the §4g/L5-correction caution against re-crediting the inert
     affinity layer).
8. **`abilities.json` — `scout-ping` correctly carries
   `"phaseRestriction":"day"`** (the engine-fixed night suppression,
   §2). `hypnotize` params present but inert (§6 — not opted in).
   `leaders.json`/`formations.json`/`items.json`/`shop.json`/
   `dialogue.json`/`queen.json`/`jelly.json` byte-identical to L5/L9 —
   acceptable; no Gameplay delta (the §4f no-card-economy binding means
   `shop.json` is narrative-only, the Tool-Rack "shop extension" is
   world-loop, not in-scenario — level-progression-plan L10 §5).

**Net scaffold verdict:** structurally sound and close to the §3
doctrine's needs; the rosters are ratified as-is, `units.json` carries
correctly, and the _absence_ of day/night config is correct-by-
necessity (and the single most important thing for a future reader to
understand). No scaffold JSON change is required to implement this
position — the L10 delta is **AI doctrine config only** (the §3 binding
route-split + per-cluster defense, within-loop), which is exactly the
lever class the brief mandates (levers the locked greedy AI converts).

---

## 8. Termination & ship-gate handed to the within-loop

Adversarial pair terminated by §6.2 discretionary cutoff: both
sub-agents converged on (a) carry the L9/L5 fortress roster
byte-identical, (b) the continuity must be the multi-route doctrine not
stats, (c) the day/night lever is dead and must not be budgeted; the
only residual was the lower-regime grandfather magnitude (ant: "the
multi-route help is real, ~45"; spider: "the fortress + night windows
hold it nearer ~40") — a ~5pp framing gap on an _agreed bistable
structure_, resolved by the honest reachability call (§5: predicted
~42–45 lower regime, band withdrawn pending the sweep).

**L10 ship-gate (handed to the Phase-D within-scenario loop):**
implement the §3 doctrine (AI config only; no engine/`engine/` edit; no
shared-builder default touched; gate-29 + L1–L9 byte-identical incl.
L9 ≈ 37). Then on the seeds-1..100 sweep:

- **If a seed-robust config lands ant ∈ [≈48,52]** with BOTH the
  3-route ant split AND the per-cluster spider defense demonstrably
  seed-robust (each route's defender engaging in a clear majority) AND
  decisive AND interest ≥75 → **ship at ~50** (the prediction §5 is
  falsified; ship the finale in-band; the best outcome).
- **If (as predicted §5) the space is bistable with no in-band seed-
  robust config** → this is the L4-§9 / §7 falsification, reported to
  the orchestrator → **escalate the GRANDFATHER/PARK fork to the user**
  per §4h (amended gate: interest ≥75 + both doctrine sides seed-robust
  - decisive; [≈48,52] band _withdrawn_; ship at the most-defensible
    lower-regime value, predicted ant ~42–45, which is _above_ the L9 ~37
    trough so the finale-climbs-out-of-the-basement curve shape is
    preserved at the achievable band). NO card/heal/plane-affinity/un-
    opted-ability/day-night-payload corrective in any fallback (§4f / §4g
    / §4d / §0 — all those levers are forbidden or inert). A band hit
    with the doctrine inert is an explicit FAILURE, not a pass (the L8 §7
    / L9 hardening).

The day/night payload (§2) and the no-opt-in decision (§6) are RULED,
not free knobs.

---

## 9. Summary of the verdict (≤350 words)

L10 Garage is the Tier-1 finale, `capture-post → engine-block` — the
exact §4h structurally-bistable contested-fortress family that PARKED L7
and GRANDFATHERED L9 (~37). §5 target is ~50 ("genuinely close").

**Headline finding:** the day/night combat payload the brief assigns me
is **engine-hardcoded in `engine/phase.ts`** (spiders +1atk/+1agi at
night, ant-archer −1atk, fixed 4-turn cadence), read directly by
`battle.ts` off template+phase with **no data path and no opt-in flag**,
and the engine is frozen. This is the §4g hardcoded-constants hole
re-instantiated — but UNRESOLVED (no merged opt-in equivalent). **The
day/night flip is therefore NOT a tunable continuity lever; budgeting pp
to it would be the precise §4g/§4h inert-lever mis-attribution the brief
binds me against.** I rule the payload at the engine-fixed value (§2),
flag the cadence seam as RESOLVED-BY-IMPOSSIBILITY (nothing to schedule,
nothing to tune), and recommend recording it on the trunk like §4g.

**Roster:** carry the L9/L5 fortress shape byte-identical (5 ant route-
columns incl. 2 mage/plane-transition; 4 spider fortress parties);
zero stat/affinity changes (§4d; the L5-correction caution). Continuity
comes only from a **binding, seed-robust multi-route AI doctrine** (§3):
each ant column bound to a distinct route (plane route via the existing
`switchContest` opt-in surface), each spider picket bound per-cluster —
the L4-§9 anti-route-around structure applied a seventh time, AI-config
only, no shared-builder default touched, gate-29 sacrosanct.
`abilityParamsAuthoritative`: **NOT opted in** (§6, mirrors L9).

**Honest reachability call:** ~50 is **NOT reliably config-reachable**.
With the one genuinely-continuous global lever (day/night) dead and the
multi-route continuity engine being three correlated integer cliffs
against one re-converging fortress, I predict L10 is the **third
bistable late-tier scenario**: lower regime ant ~20–45, upper ~80–100,
~30+pt dead-zone, no seed-robust config in [≈48,52]. Predicted most-
defensible **GRANDFATHER value ant ~42–45** — _above_ the L9 ~37 trough,
so the finale still reads as a climb-out at the achievable band.
**Recommendation: GRANDFATHER/PARK fork → escalate to the user per
§4h** (band withdrawn, doctrine seed-robust, interest ≥75, decisive).
Falsifiable on the built scenario: if the sweep finds a seed-robust
in-band config, ship at ~50 instead.
