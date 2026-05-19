# Amendment — Pacing memo §A.3 (L1 exemption justification)

**Intended location:** `docs/drafts/amendment-pacing-memo-A3.md`
**Status:** Amendment letter, routed directly to the pacing memo
owner per coding agent's recommendation.
**From:** UX track, with PM authorization.
**For:** Pacing memo owner (design-side).
**Triggered by:** Exchange #7 / roadmap §7.11 (L0 prologue),
recorded.

---

## What this amendment changes

The pacing memo's **§A.3 L1 exemption from the stalemate-terminal**
currently rests on two justifications:

1. **L1 as anchor / gate-29 baseline.** A score-resolution carve-out
   keeps L1's deterministic behavior intact and preserves the
   byte-identity anchor.
2. **L1 as tutorial.** A tutorial must give the player a clean win
   or loss; "nobody won" is a strategic-depth outcome that
   belongs in levels that teach strategy.

§7.11 dissolves L1's tutorial role by creating L0 as a separate
prologue scenario. After §7.11, L1 is the all-mechanics-on
reference build only; it is no longer the tutorial.

**The exemption itself stands.** The amendment changes the
_justification structure_, not the carve-out. The tutorial leg
drops away. The anchor / gate-29 leg carries the exemption alone.

## Why the exemption still stands

The anchor / gate-29 justification was always the load-bearing
leg. The pacing memo's stalemate-terminal would change L1's
deterministic behavior, which would break the byte-identity
guarantee that the entire Phase-D engine-dependency series rests
on. §7.6 (golden-master gating) and the gate-29 anchor are the
core of why L1's behavior is frozen.

The tutorial leg was a secondary justification — true at the time
the memo was written (L1 _was_ the tutorial then) but not
load-bearing. Removing it doesn't weaken the exemption; it just
makes the justification structure honest about which leg actually
carries the weight.

## What the amendment does _not_ change

- **The exemption itself.** L1 keeps today's score-resolution
  behavior. No behavioral change.
- **Any other §A decision.** This amendment is §A.3's
  justification only.
- **Stalemate as a real third outcome elsewhere in the memo.**
  Decision §A.2 (stalemate is not score-resolved on non-L1
  scenarios) stands unchanged.
- **The mission-scenario carve-outs (L2/L6/L8).** Decision §A.5
  stands unchanged.

## A subtle but important distinction

Before this amendment, the §A.3 exemption could be read as "L1
gets a pass for two reasons." After this amendment, the exemption
reads as "L1 gets a pass for one reason — the anchor — and that
reason carries the full weight." The change is purely how the
justification is structured in the text.

This matters because if the tutorial leg is left in place after L0
ships, a future reader could read the exemption as still partly
contingent on L1's tutorial role, and could question the exemption
when L1 is no longer the tutorial. The amendment closes that
ambiguity in advance.

## What L0's pacing looks like by contrast

L0 is **also** exempt from the stalemate-terminal, but for a
different reason: L0 is exempt by absence from the entire
opt-in system that includes the stalemate detector. The
stalemate-as-real-third-outcome behavior never applies to L0
because L0 was never opted into the measurement framework that
the stalemate detector lives within. This is engine-truth
(verified by coding agent during §7.11 concurrence review), not
an exemption ruling.

The pacing memo doesn't need to mention L0 explicitly — L0 is
out of scope of the memo by virtue of being outside the curve —
but it's worth noting in the amendment record that L0's pacing
posture is structurally different from L1's and doesn't require
a sibling exemption.

## Engine-side confirmation

Dev (coding agent) verified during §7.11's concurrence review:
the stalemate detector does not exist in the engine today
(comments only); L0 is exempt-by-absence from the entire opt-in
balance/measurement system; L1's gate-29 anchor is verified
intact through the recent §7.12 byte-identity proof.

The amendment itself is documentation-only; no engine work.

## Recording

Amendment lands by direct edit to `docs/design-memo-pacing-and-turn-cap.md`
when the pacing memo owner ratifies. The §A.3 section's
justification text rewrites; the decision text doesn't.

## What this amendment asks of the pacing memo owner

1. **Ratify the justification restructure** — the tutorial leg of
   the §A.3 exemption drops away; the anchor / gate-29 leg
   carries alone.
2. **Confirm no behavioral change is implied.** L1's
   score-resolution behavior is unchanged; what changes is how
   the carve-out is written about.
3. **Optional — decide whether to add a note about L0's
   structural exemption-by-absence.** Not required (L0 is out of
   scope of the memo), but useful if the pacing memo wants to be
   self-contained about why L0 isn't a parallel concern.

No engine work, no design review of L0 itself (settled in §7.11).
