# Spike: Queen Rear-Zone — Balance Blast Radius

**Status:** Scoped, not started. Standalone follow-up to Exchange #3
(roadmap §7.7; `docs/change-request-protocol.md` §5). This is a
**measurement spike**, not an implementation — its output is a go/no-go
report that feeds a future Template A request. It is the honest
precondition to a golden-master-gated sim change (roadmap §7.6), not an
afterthought.

## The question

If the queen moves from her current **front-row damage-soak** role
(`engine/formation.ts:59-63`) to a **rear zone** (targetable by
ranged/magic only, not melee; initiates her own attacks against either
row), **how far does the L1–L10 win-rate curve move, per scenario and
per faction** — and is that delta recoverable by a Phase-D-style
rebalance, or does it break the curve's shape?

## Why a spike (the uncertainty)

- The queen-as-front-soak is a **load-bearing difficulty lever**. Every
  queen-guard scenario is currently balanced around the queen absorbing
  the guard's incoming damage and sometimes dying.
- The change is **bilateral**: `engine/formation.ts` applies the same
  huge+leader-eligible→front rule to the spider-queen. A rear-zone rule
  in the shared Formation model affects **both** queens unless
  explicitly made asymmetric — so the net curve effect is a difference
  of two large shifts and is **not predictable by inspection**.
- Magnitude is unknown. We must measure, not assume, before committing
  to (and pricing) the gated sim change.

## Prior (hypothesis to test, not assume)

Removing the queen's melee exposure materially increases queen-guard
durability on whichever side holds the queen. Because both sides hold
one, the curve effect is the _net_ of two same-direction shifts of
possibly-different size across scenarios — plausibly small in some,
curve-breaking in others (esp. late-tier, where the curve is already
fragile per the Phase-D retrospective).

## In scope (what the spike does)

1. Pin the **minimal precise rule**: exact rear-targetability set
   (which attack kinds reach rear), exact queen-initiation behavior
   (targets, cadence), and whether it is symmetric or
   ant-queen-only.
2. Implement that rule in an **isolated experiment branch / behind a
   throwaway flag** — never on the trunk, never re-baselining gate-29.
3. Run the existing AI-vs-AI win-rate harness across the shipped
   scenarios **with and without** the rule, **per faction**.
4. Produce the **per-scenario, per-faction curve delta**: which
   scenarios move, by how much, and the resulting curve shape vs. the
   §5.1 shipped curve.
5. Catalog the **AI-behavior surface** that would need updating
   (targeting, queen-protection, threat assessment) and estimate the
   rebalance effort in Phase-D-equivalent terms.

## Out of scope (what the spike must NOT do)

- No trunk changes; no gate-29 re-baseline; no schema/data ship.
- No UI work (the accurate distinct-queen rendering proceeds
  independently per §7.7 (1) and is not blocked on this).
- Not the gated change itself — the spike only sizes it.

## Deliverable / exit criteria

A short report containing:

- The measured per-scenario, per-faction win-rate delta and the
  resulting curve shape.
- A **go / no-go** recommendation against the §7.6 gating bar.
- If **go**: the scoped Template A cost — rebalance magnitude, the AI
  update list, and the re-baseline plan.
- If **no-go**: the specific reason (e.g., curve becomes
  unrecoverable late-tier) and any cheaper alternative that serves the
  same gameplay intent.

## Timebox

One focused iteration. If the rule can't be pinned precisely enough to
measure within that box, that itself is a finding (the proposal needs
design definition before it can be cost-gated).
