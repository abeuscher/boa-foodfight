# Change-Request Protocol (UX ↔ Gameplay/Engine)

**Status:** Canonical, living. This is the single home for the
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

---

_New exchanges append a `### Exchange #N` block here. Decisions are
mirrored as a one-paragraph ruling in `roadmap-tier-1.md` §7._
