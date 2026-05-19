# Amendment — Mechanic-distribution-plan (recruit + archer/mage debut shifts)

**Intended location:** `docs/drafts/amendment-mechanic-distribution.md`
**Status:** Amendment letter, routed directly to the
mechanic-distribution / curve-balance owner (Gameplay Progression
Agent territory) per coding agent's recommendation.
**From:** UX track, with PM authorization.
**For:** Gameplay Progression Agent / mechanic-distribution-plan
owner.
**Triggered by:** Exchange #7 / roadmap §7.11 (L0 prologue),
recorded.

---

## What this amendment changes

Two debut shifts, both moving mechanics earlier in the player's
journey to land at L0 (the new prologue) rather than where the
plan currently schedules them.

### Shift 1: Recruit-as-order debut moves L5 → L0

Mechanic-distribution-plan **ruling C** currently schedules
recruit-as-order's debut at L5, with both factions agreed on the
slot (ant pushed L3 and was overruled, spider's L5 won).

**The shift.** L0 introduces the recruit verb. L5 becomes the
**strategic-use surface** rather than first-contact.

By L5, the player already knows what recruiting _is_ and _does_.
L5 can then concentrate on the strategic context — concealment
POSTs interacting with recruit-as-order, duration-capped
hypnotize as the strategic foil from the spider side, the
multi-creature roster diversity that makes recruit-as-order a
real strategic axis rather than a novelty.

This is cleaner than the current ruling C in design terms: a
mechanic's first-contact and its strategic-use surface are
different teaching tasks, and bundling them at L5 (which the
plan's existing language already half-acknowledges) compresses
both into one scenario.

### Shift 2: Archer/mage troop-type debut moves to L0

Roadmap §3.3 currently schedules archer / mage addition to the
mid-tier (L4–L7). L1's stripped opening is footman-only.

**The shift.** Antonio's L0 squad contains two footmen, two
archers, and two mages. The player sees all three engine-canonical
troop types in L0's first combat. L1 keeps its footman-only
opening (it remains the stripped reference build); mid-tier
(L4–L7) becomes the **roster-build choice surface** rather than
first-contact.

By the time the player reaches L4, they have seen what archers and
mages do (in L0's combat panel) but have not yet had to think
about _when_ to compose with them, _which_ to include, _which to
slot-cost against_. Mid-tier is the right scenario range to teach
that — strategic composition, slot economics, formation choices
with mixed types — but only if first-contact has already happened.

L0 makes that possible. The mid-tier no longer has to do
first-contact _and_ roster-build at the same time.

## Why these shifts

§7.11 establishes L0 as a tutorial scenario whose job is to walk
the player through what the game is, broadly, before L1 hands
them the all-mechanics-on reference build. "Inclusivity" in the
tutorial — the principle that L0 should expose the player to as
much of the game's mechanic surface as it can without
overwhelming them — implies that mechanics the player will see
elsewhere should debut here when feasible.

Both recruit-as-order and the three troop types are _engine-clean_
to debut at L0 (verified by coding agent during §7.11 concurrence
review). `recruit-neutral` is a faction-flip-in-place,
scenario-data-driven; archer and mage are canonical templates that
load fine in a stripped `data/tutorial/units.json`. Nothing
prevents these debuts at L0 from the engine side; the question is
whether the curve / balance plan wants them there.

## What the amendment does _not_ change

- **L1's stripped opening.** Footman-only at L1 stands. The shift
  is in _first-contact ordering_, not in L1's composition.
- **Any mechanic's later strategic-use surface.** Recruit at L5
  becomes strategic-use rather than first-contact; archer/mage at
  mid-tier becomes roster-build rather than first-contact. The
  later scenarios still own their mechanics; what changes is what
  they're _introducing_ versus what they're _deepening_.
- **The plan's win-rate curve.** L0 is exempt from the curve
  entirely (§7.11). The mid-tier and L5 win-rate targets stand;
  whether they need re-tuning given the shift is a curve-owner
  call, not a §7.11 question.
- **Ruling C's arbitration logic.** Ruling C was correctly
  reasoned given the inputs at the time (no L0 in play). The
  shift here is post-§7.11; it doesn't relitigate ruling C, it
  reframes the question ruling C was answering.

## What the curve / balance owner needs to weigh

The shifts ripple into how mid-tier scenarios are authored and
measured. Specifically:

1. **Mid-tier roster-build teaching pressure.** When archer/mage
   are no longer first-contact at mid-tier, the mid-tier
   scenarios need to make roster-build _choices_ the player can
   weigh, rather than spending part of their teaching budget on
   "here is what an archer does." Authored differently — possibly
   more cleanly.
2. **L5's strategic concentration.** L5 currently has to introduce
   recruit-as-order, demonstrate it strategically, and introduce
   concealment POSTs / hypnotize-foil in the same scenario. The
   shift gives L5 more room for the strategic concentration.
   Whether the scenario authoring takes advantage is a level-design
   call downstream.
3. **L0 itself.** L0's authored content (Antonio's six-unit
   squad, the optional recruit, the spider entrance guard, the
   reinforcement squad's composition) carries the inclusivity
   load. Level PA's job downstream; the §7.11 record establishes
   the framing but Level PA designs the geometry.
4. **The curve as a whole.** The plan's existing win-rate-curve
   targets for L1–L10 are not affected by L0 (which is off-curve).
   But the qualitative shape of "where mechanics enter and how
   they deepen" shifts — recruit's surface widens (L0 + L5
   instead of L5 alone), troop diversity widens (L0 + mid-tier).
   Whether that shift is what the curve owner wants is the call
   this amendment asks for.

## Engine-side confirmation

Dev verified during §7.11 concurrence:

- Recruit-as-order debut at L0: `recruit-neutral` is
  faction-flip-in-place, scenario-data-driven, existing
  mechanism. No engine work required to debut it earlier.
- Archer/mage debut at L0: both are canonical templates; a
  stripped `data/tutorial/units.json` loads them fine. No engine
  work.

Both shifts are design-side; the engine doesn't constrain them.

## Recording

Amendment lands by direct edit to
`docs/mechanic-distribution-plan.md`. The recruit-as-order ruling
C entry updates to reflect the L0 debut + L5 strategic-use split.
The archer/mage mid-tier scheduling note updates to reflect L0
first-contact + mid-tier roster-build.

## What this amendment asks of the owner

1. **Ratify the recruit-as-order debut shift** (L5 → L0; L5
   becomes strategic-use surface).
2. **Ratify the archer/mage debut shift** (mid-tier → L0; mid-tier
   becomes roster-build choice surface; L1's stripped opening
   preserved).
3. **Confirm whether mid-tier and L5 win-rate targets need
   re-tuning** in light of the shift, or whether they stand. The
   shift is design-side, not balance-direct, so the targets may
   well stand — but the owner should make that call.
4. **Identify any downstream design implications** the amendment
   surfaces that should route back to Level PA or other tracks
   before §7.11 work proceeds.

No engine work, no design review of L0 itself (settled in §7.11).
