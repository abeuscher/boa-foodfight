# Change-Request Protocol (UX ↔ Gameplay/Engine)

**Status:** Canonical, living, **official** — ratified as the standing
cross-track process as of Exchange #2 (two exchanges resolved under it).
This is the single home for the
cross-track change-request _process_ and the _exchange log_. Resolved
_decisions_ live in `roadmap-tier-1.md` §7 "Tensions resolved" (this doc
points at them; it does not duplicate them). Structure is fixed —
per the founding agreement we design the shape once and reuse it.

## 1. Purpose

UX and Gameplay/Engine are separate tracks with asymmetric visibility:
UX can see the schema and the player-facing surface; it cannot see
tuning effort, the engine-freeze boundary, or the shipped balance
curve. Dev can see those but not the legibility/affordance pressures
the UI is under. A change request is the instrument that crosses that
gap without either side guessing.

## 2. The protocol (operating rules)

Agreed in exchange #1, binding for all future exchanges:

1. **Intent over solution.** Every request leads with _what it is
   solving for_, stated separately from the proposed change. Dev may
   answer the intent with a cheaper solution than the one proposed.
   This is the single most important rule — it is why decomposition
   and counter-proposals are possible at all.
2. **Blocking status + decide-by.** Every request states whether the
   sending track is _stalled_ on the answer or _batching_. This sets
   priority and answers cadence per-request (blocking → send
   immediately; non-blocking → batch).
3. **Decision-record destination.** Every resolved request is recorded
   in `roadmap-tier-1.md` §7 as a numbered subsection. The exchange
   prose lives here (§5); the ruling lives there. Prevents
   relitigation.
4. **Tighten for steady-state.** Founding exchanges may run long to
   establish shape; recurring requests target ~15 lines.
5. **Meta-thread split.** "Decide this thing" and "calibrate our
   process" are separate threads. Do not bundle.
6. **"No" and "counter" are first-class answers.** A decline or a
   decomposition is a complete, friction-free response — no sunk-cost
   pressure, no obligation to land the literal ask.

## 3. Template A — UX → Dev request

```
# Change Request: <one-line title>
From / To / Status: Proposal — awaiting cost/feasibility read
Blocking: <stalled & needs decision by X> | <non-blocking, batched>

## Solving for
<the intent — the player/UX outcome we need, independent of the fix>

## Proposed change
<the specific change. Scope it: state what is NOT changing.>

## Why
<reasoning, concrete>

## Our cost guess (please correct)
<best-effort list of what we think this costs dev; explicitly deferred
to dev's tuning judgment>

## What we want back
<decision | counter | spike | decline — all acceptable>
```

## 4. Template B — Dev → UX reply

```
# Reply: <title>
From / To / Re
Disposition: Accepted | Decomposed-yes | Counter-proposed |
             Declined | Needs-spike

## 1. Decision
<lead with the answer, 1–2 sentences>

## 2. Cost decomposition
<split the request into independently-priced parts. Per part:
 Cheap / Moderate / Expensive / Freeze-touching — and why.
 Bundled asks get unbundled here; this is dev's core contribution.>

## 3. Invariant impact
<explicit: does any part touch the frozen engine / gate-29 / the
 shipped balance curve? The thing the other track cannot see. If
 nothing does, say so explicitly.>

## 4. Counter-proposal (if any)
<a cheaper path to the stated *intent* — hooks Template A's
 "Solving for" field>

## 5. Confirms needed back
<explicit closing questions. Nothing is decided until these return.>

## 6. Decision record
<the exact text that lands in roadmap §7, and when (next safe git
 window)>

## 7. Protocol notes (omit in steady state)
<only when calibrating the process itself>
```

## 5. Exchange log

### Exchange #1 — Standard party slot capacity 8 → 9

**Request (UX):** raise standard-party `slotCapacity` 8 → 9 (queen-guard
stays 12) so the Organize Army UI renders a legible 3×3 grid. Bundled an
implied formation-rank restructure (front/back/reserve →
front/middle/back).

**Reply (Dev) — Disposition: Decomposed-yes.**

- **Decision.** Yes to capacity 9 as a _ceiling_. The request bundled
  two things; the legibility intent does not require the engine change.
- **Cost decomposition.**
  - Capacity 8 → 9 (ceiling): **Cheap.** Not schema-hardcoded; two
    real touch-points — `engine/world-inject.ts` `PARTY_SLOT_CAP` and
    the `harness/reconciler.ts` Tier-1 authoring guard. Timing optimal:
    the not-yet-built party-rearrangement operators take the cap as a
    parameter, so 9 is free now vs. expensive to retrofit later.
  - Formation-rank restructure (front/middle/back): **Freeze-touching.**
    `engine/formation.ts` runs inside deterministic scenario execution
    (gate-29). Out of scope; separate decision against freeze policy.
- **Invariant impact.** None for the ceiling. 9 is a ceiling, not a
  mandate to fill — authored rosters keep current compositions, every
  scenario's starting army stays byte-identical, gate-29 holds, the
  L1–L10 win-rate curve is unchanged. The parked formation-rank idea
  _would_ break gate-29; that is why it is split out.
- **Counter-proposal.** Deliver the 3×3 grid from the capacity-9 data
  change + a UI rendering choice; leave the engine formation system
  untouched. "Middle rank as a real mechanic" → its own future request.
- **Confirms (returned, closed):** goal is the grid not the mechanic ✓;
  9 is a ceiling not a target ✓; queen-guard renders 3×4, UX's
  aesthetic call ✓.
- **Decision record:** roadmap §7.5 (below). Code embodied same window.

**Outcome:** Resolved. Recorded in `roadmap-tier-1.md` §7.5. Code:
`PARTY_SLOT_CAP 8→9`, reconciler Tier-1 guard `>8 → >9`, schema/doc
comments updated. Middle-rank-as-mechanic **parked** as a future
standalone request, to be weighed explicitly against engine-freeze
policy after the Organize Army spec lands.

### Exchange #2 — Engine-freeze transition (frozen → golden-master-gated)

**Request (UX):** transition the engine frozen → "gated-open": (1)
acknowledge the freeze succeeded, (2) engine modification re-enters the
change-request flow as a priced item rather than categorically
out-of-scope, (3) renegotiate the byte-identical-replay testing
instrument for the UI era. Schemas/type model stay stable.
Precedent-setting; non-blocking.

**Reply (Dev) — Disposition: Counter-proposed.**

- **Decision.** Yes to a deliberate phase transition; no to the implied
  broad-open mechanism and to retiring byte-identical replays. Frozen →
  **golden-master-gated**, scoped precisely to the deterministic sim
  path.
- **Cost decomposition.**
  - Posture transition (freeze succeeded; engine changes become
    priceable, not categorically barred): **Cheap** — policy, no code.
  - World-loop / between-scenario layer declared _not under the sim
    freeze_: **Free / already true.** Never executed inside
    `runScenario`; built without breaking gate-29 twice already.
    Unblocks all operator work now.
  - Sim-path changes become golden-master-gated (Template A +
    re-baselined replay set + explicit L1–L10 balance re-check +
    review): **Moderate, per-change.** Phase-D discipline promoted from
    ad-hoc to policy, not a new philosophy.
  - New UI-experience test instrument ("plays the same" not "bytes the
    same"): **Unknown — deferred to a scoped spike**, held as a
    separate follow-up per requester's election.
- **Invariant impact.** This decision _defines_ how invariant impact is
  handled henceforth. Litmus: _does the change alter the bytes
  `runScenario` produces under a fixed seed?_ No → ungated; yes →
  admissible but gated (re-baseline + balance re-check + review).
  Gate-29 is **retained and repurposed** as the change-detection
  tripwire that forces the deliberate-re-baseline conversation —
  explicitly **not** decommissioned. Trustworthy numbers are protected
  by making every sim-path change loud and deliberate, not by
  forbidding change.
- **Counter-proposal.** Three-layer model: schemas/types hard-stable;
  world-loop layer ungated (build now); sim path golden-master-gated.
  UI-experience instrument → separate scoped spike; the posture
  decision does not block on it.
- **Confirms (returned, closed):** gated-open = golden-master-gated for
  the sim path specifically ✓; world-loop operators proceed now,
  decoupled ✓; UI-experience test spike held as a separate follow-up ✓.
- **Decision record:** roadmap §7.6. No code (posture/policy only;
  gate-29 unchanged).

**Outcome:** Resolved. Engine posture: frozen → **golden-master-gated**,
effective now. World-loop operator work unblocked immediately and
decoupled from any further posture question. Exchange #1's parked
middle-rank-as-mechanic is hereby **un-parked** — fileable as a normal
gated sim-path request (Exchange #3), naturally sequenced after the
Organize Army spec. UI-experience "plays-the-same" validation
instrument: separate scoped spike, to be proposed as a standalone
follow-up. Recorded in `roadmap-tier-1.md` §7.6.

### Exchange #3 — Queen-behind-grid rear zone

**Request (UX):** add a rear formation zone (third position beyond
front/back) inhabited only by the queen; from rear she is targetable by
ranged/magic only (not melee) and initiates attacks against either row;
rendered behind the squad grid in Organize Army + party-detail. Intent:
the queen reads as the architecturally distinct, scenario-ending anchor.

**Reply (Dev) — Disposition: Counter-proposed + Needs-spike.**

- **Decision.** Legibility intent met now by an _accurate_
  distinct-queen rendering; the rear-zone _mechanic_ is a gated sim
  redesign pursued on a separate spike-gated track. "Rendering-only
  now, mechanic later" is **withdrawn for this request** (it would ship
  a UI that contradicts the sim).
- **Decisive code fact.** `engine/formation.ts:59-63` deliberately
  places the queen in the **front** row ("the queen needs to soak the
  queen-guard's damage"), bilaterally (spider-queen identical). The
  request _inverts_ the queen's combat role (front damage-soak →
  melee-immune rear unit); it does not merely make her legible.
- **Cost decomposition.**
  - Accurate distinct-queen rendering (unique, loss=scenario-loss,
    depicted as the front-anchor she is): **Cheap**, world-loop/UI
    layer, ungated, truthful. Unblocks Organize Army now.
  - "Rendering-only safe-rear" preview: **rejected as a correctness
    hazard** — the engine fights the queen front; a rear-safe diagram
    would make Organize Army lie. Differs from the middle-rank
    precedent (harmless cosmetic); explicitly withdrawn.
  - Rear-zone combat mechanic (rear-targeting profile + queen
    initiation): **Expensive, golden-master-gated, bilateral.** Changes
    a load-bearing difficulty lever in every queen-guard scenario, both
    factions; net curve effect non-obvious → must be measured. Mini
    Phase-D rebalance + AI updates + re-baseline + review.
  - §7.5 "9 + 1-in-rear" cleanup: **not independently bankable** — it
    presupposes the expensive mechanic.
- **Invariant impact.** Rendering: none. Mechanic: golden-master-gated
  (§7.6) _and_ high-magnitude / bilateral — the spike is the honest
  precondition, not an afterthought. queen-loss-as-scenario-loss and
  non-queen front/back semantics unchanged.
- **Counter-proposal.** Split the intent (legible queen — accurate
  rendering, now) from the proposed solution (rear mechanic — a
  gameplay redesign, spike-gated then Template A).
- **Confirms (returned, closed):** accurate distinct-queen rendering
  satisfies the intent for now ✓; rear-zone mechanic pursued as a
  separate gated track ✓; "rendering-only now" withdrawn for this
  request ✓.
- **Decision record:** roadmap §7.7. Spike scoped as a standalone
  follow-up (`docs/spike-queen-rear-zone.md`).

**Outcome:** Resolved. Organize Army proceeds with an accurate
distinct-queen rendering (no sim risk). The rear-zone mechanic is an
approved pursuit on a spike-gated track: the spike quantifies the
balance blast radius across all queen-guard scenarios (both factions)
_before_ any Template A sim change. Recorded in `roadmap-tier-1.md`
§7.7.

### Exchange #4 — Barracks (unassigned-units pool)

**Request (UX):** introduce a barracks data shape for units outside any
party; Disband Squad pushes into it, Form/add-to Squad pulls from it;
rendered as a bucket beside the 3×3 grid. Hard-blocking on Organize
Army canonicalization.

**Reply (Dev) — Disposition: Accepted (decomposed) + cost correction.**

- **Decision.** The barracks data shape **already exists** — it is the
  derived view `roster.units` minus everything in an assignment. No new
  collection, no schema change, no serialization change. Spec
  unblocked now via one read accessor; cross-scenario persistence is a
  real but separable follow-on.
- **Cost correction (the guess was wrong in 3 of 4 places).**
  - New barracks shape → **don't create; exists** (`WorldRoster.units`
    is the master pool; assignments are the grouping).
  - Per-party operators as source/sink → **already shipped**:
    `disbandParty` → idle, `createParty` / `moveUnit` ← idle.
  - Save/load serialization → **already works**: `schemas/world.ts`
    validates `units` / `partyAssignments` independently, no
    "must-be-assigned" constraint; idle units round-trip today.
  - **Real gap (missed by the guess):** `extractWorldRoster` rebuilds
    the next roster from **combat survivors only** (input is just
    `{finalState, winner}`), so an _undeployed_ barracks unit is
    silently dropped at the scenario boundary. Cross-scenario barracks
    persistence needs an extract/runner **carry-forward merge** (prior
    undeployed ∪ fresh survivors) — world-loop layer, **ungated**
    (§7.6), behaviorally testable.
- **Open questions, from the code.** Persistence across scenarios:
  intended-correct but blocked by the merge gap (not free). Cap:
  confirmed **none** (slot caps are per-party only). Wiped-in-combat:
  confirmed **die-not-return** (decision (d) + `pruneDeadWorldUnits`);
  benched units also correctly earn no scenario XP.
- **Invariant impact.** None — all world-loop layer, ungated. Combat /
  schema / gate-29 untouched.
- **Decision record:** roadmap §7.8. Shipped this window:
  `barracksUnits` accessor + tests. Follow-on (sequenced **before**
  multi-item shop): the extract/runner carry-forward merge.

**Outcome:** Resolved. Organize Army hard-block cleared — spec
canonicalizes against barracks-as-derived-view + `barracksUnits`
(stable contract, independent of the runner internals).
`engine/world-organize.ts` `barracksUnits` shipped (704/704). The
extract carry-forward merge is the next backend item, before
multi-item shop. Recorded `roadmap-tier-1.md` §7.8.

### Exchange #5 — Player-mutable formation + three-rank restructure

**Request (UX):** make formation a player verb (persistent, player-set)
and extend front/back → front/middle/back; deliberately coupled, one
balance re-check argued. Hard-blocking on Organize Army.

**Reply (Dev) — Disposition: Decomposed-yes + counter, cost
correction.**

- **Decisive architecture.** `assignFormation` is called at two
  chokepoints: `engine/state.ts` (static / gate-29 / coevo — no
  `WorldRoster`) and `engine/world-inject.ts` (campaign). The balance
  curve is AI-vs-AI on the static path, which never carries a player
  formation. So the CR's coupling premise (both halves need one shared
  balance re-check) is **false**: the front/back player-mutable half is
  ungated world-loop work that does not move the AI curve at all.
- **Cost correction.** Persistent data shape → ungated (additive,
  byte-stable). `setUnitRank` + `removeUnit` + `dismissUnit` +
  queen-pin → ungated world-loop ops. world-inject honoring → a
  `world-inject`-only change (formation.ts / state.ts / battle.ts
  untouched), provably byte-identical on the static path. Middle rank
  → the _only_ genuinely gated piece (changes `Formation` consumed by
  frozen `battle.ts`).
- **Counter (= the CR's offered fallback, but it's strictly better,
  not a compromise).** Ship 1+2+3 (front/back) now, ungated; fold
  middle-rank into the §7.7 queen-rear spike so all three
  formation/`battle.ts` sim changes share **one** re-baseline, not
  three. Decoupling loses nothing because the front/back half was
  never gated.
- **Shipped this window.** Persistent `WorldFormation` (sparse,
  omit-when-absent); `setUnitRank`/`removeUnit`/`dismissUnit`;
  queen-pin hardening on `moveUnit`/`createParty`. 718/718, gate-29
  intact. **Deferred (next backend item):** world-inject honoring.
- **Confirms (returned, closed):** decomposition accepted ✓;
  middle-rank folded into queen-rear spike ✓; ship 1+2+3 + queen-pin
  before §7.8 extract-merge + shop ✓.
- **Decision record:** roadmap §7.9; contract in `troop-reference.md`
  §10 (incl. the `removeUnit`/`dismissUnit` `templates` refinement
  over Q10, required by the queen-pin).

**Outcome:** Resolved. Player-mutable front/back formation +
remove/dismiss + queen-pin shipped (ungated, world-loop layer);
mid-scenario formation locked; `party-detail-spec.md` mid-scenario
"change formation" dropped (amendment). Middle rank held on the §7.7
spike. world-inject honoring is next, before the §7.8 extract-merge
and multi-item shop. Recorded `roadmap-tier-1.md` §7.9.

### Exchange #6 — Anthill recruit (operator + catalog)

**Request (UX):** Recruit (Anthill) view needs the `recruitUnit`
operator + a per-scenario recruit catalog, both flagged by dev's
earlier Q-list as committed-contract-not-yet-built; plus a human
ruling on recruit level (flat-1 vs scaled).

**Reply (Dev) — Disposition: Accepted + human design ruling.**

- **Decision.** Recruit is its own system (≠ Shop), shipped as
  `engine/world-recruit.ts` + `data/level-N/recruits.json` schema +
  a level-1 stub. World-loop layer, ungated (catalog not on the
  static path → gate-29 untouched).
- **Contract refinement.** Operator is 4-arg —
  `recruitUnit(state, templateId, catalog, templates)` — so cost +
  recruitable-set are authoritative from the catalog data, not
  UI-passed (parallels the Q10→removeUnit `templates` refinement).
- **Misattribution corrected (the review's blocking item).** The
  spec had presented level-scaling as "dev's committed contract";
  dev committed _flat level-1_. Scaling is a **human balance
  ruling**, made here: lower-median-of-full-roster − 1, clamped ≥ 1;
  `levelUpBonus` via `cumulativeLevelBonus`. The whole-roster median
  soft-cap (mass-recruiting self-nerfs) was raised in review and
  **confirmed intended** by the human.
- **Flat-state contract (dev's, unchanged):** xp 0, item null,
  charisma via `isPromotableTemplate` (same rule as `loadScenario`),
  currentHp = full effective.
- **Confirms (returned, closed):** soft-cap intentional ✓; scaling
  owned as human ruling not dev contract ✓; recordable post §4.2
  fix + stale §6 bullet cleanup (spec-side) ✓.
- **Decision record:** roadmap §7.10; contract in `troop-reference.md`
  §10.

**Outcome:** Resolved. `recruitUnit` + recruit-catalog schema +
level-1 stub shipped (ungated; 729/729, gate-29 intact). Median-minus-
one arrival level is the recorded human design ruling. Per-level
catalog content is the deferred design pass. Recorded
`roadmap-tier-1.md` §7.10.

---

_New exchanges append a `### Exchange #N` block here. Decisions are
mirrored as a one-paragraph ruling in `roadmap-tier-1.md` §7._
