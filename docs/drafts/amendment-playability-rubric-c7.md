# Amendment — Playability rubric criterion 7

**Intended location:** `docs/drafts/amendment-playability-rubric-c7.md`
**Status:** Amendment letter, routed directly to the Playability
rubric owner per coding agent's recommendation.
**From:** UX track, with PM authorization.
**For:** Playability rubric owner (critic-side).
**Triggered by:** Exchange #7 / roadmap §7.11 (L0 prologue),
recorded.

---

## What this amendment changes

**Criterion 7's learnability mapping** changes from:

> Naive loop on L1/L2, transfer to L3.

to:

> Naive loop on L0, transfer to L1.

Criterion 7 also gains specificity about what L0 actually teaches.
The naive player should walk out of L0 knowing:

- Pause / play / speed control
- Two-click ordering (select party, click destination tile)
- POST existence, ownership, and 2-turn capture
- Combat on collision (engine-resolved on tile co-location)
- The recruit verb (neutral parties can be won over)
- The parties-vs-colony distinction (parties grow in number; the
  colony is larger than what's on the map at any moment)

Transfer to L1 means: the player applies these on L1 against the
full mechanic set (queen as a field unit, the cube, the authored
multi-party starting force, formation as a fixed structure rather
than something they edit, all six planes navigable).

## Why this amendment

§7.11 establishes L0 as a prepended prologue scenario at
`data/tutorial/`, outside the Tier-1 curve. L0 takes the tutorial
role outright. L1 remains the all-mechanics-on frozen reference
build it was designed to be (roadmap §2/§3, gate-29 anchor).

Criterion 7 as currently written reflects L1's pre-§7.11 dual role
(tutorial + reference), which §7.11 dissolves. The remapped
criterion is in fact cleaner: L1 was never well-suited to be a
learning surface (its density was authored as the deviation
baseline, not as an introduction), and measuring transfer on L1
rather than L3 puts the rubric closer to what the level is
actually doing.

## What the amendment does _not_ change

- **Criterion 7's function in the rubric** — it still measures
  learnability and transfer; the scenarios it points at change,
  the measurement stays.
- **Any other criterion** — this amendment is criterion 7 only.
- **The rubric's adoption posture** — recently adopted as
  canonical (commit `78caee9`); this amendment is to an active
  canonical doc, not a draft.

## Engine-side confirmation

Dev (coding agent) verified during §7.11's concurrence review
that the L0 vehicle this amendment depends on is engine-clean:

- `loadScenario` is path-agnostic; `data/tutorial/` loads through
  the existing path with no engine changes.
- L0 is exempt-by-absence from the balance harness, gate-29
  measurement, coevo, tune, and the reconciler.
- Single-party-at-start / queen-less / single-plane configurations
  are all clean engine paths.

The amendment itself is design-side; no engine work is implied.

## Pre-existing item worth resolving alongside

Coding agent flagged a pre-existing "Fun Critic" naming note in
the rubric (raised at adoption time, never resolved). Since this
amendment opens criterion 7 for substantive review, it may be a
good moment to resolve the naming question in the same pass —
either bundling the naming fix into this amendment or settling it
as a sibling change. Owner's call on whether to combine.

## Recording

Amendment lands by direct edit to `docs/playability-critic-rubric.md`
when the rubric owner ratifies. The §7.11 record references this
amendment as a queued cross-track change; once it lands, the
reference becomes a back-reference to the rubric.

## What this amendment asks of the rubric owner

1. **Ratify the criterion 7 remap** (L1/L2 → L0, transfer to L1
   instead of L3) and the gained specificity about what L0
   teaches.
2. **Decide on the Fun Critic naming question** — resolve in this
   amendment, defer to a sibling change, or leave parked.
3. **Confirm the recording mechanism** — direct edit to the
   rubric file, or a separate ratification record alongside it.

No engine work, no design review of L0 itself (settled in §7.11).
