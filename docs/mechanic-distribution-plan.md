# Mechanic-Distribution Plan — Tier 1 (L1–L10)

**Owner:** Gameplay Progression Agent (arbiter, per `docs/roadmap-tier-1.md`
§6.2). **Status:** Phase-C planning deliverable. Document only — no code, no
scenario data.

This is the authoritative per-scenario mechanic schedule for Tier-1. It
arbitrates the two-exchange ant/spider debate (`docs/debate/*`), respects every
`docs/roadmap-tier-1.md` §3.1 hard floor and §3.4 constraint, and is held
consistent with the solo Level PA's `docs/level-progression-plan.md` (same
L1–L10 sequence, same special objectives, same flagged engine dependencies).
It references — does not duplicate — those documents.

---

## 1. §6.2 termination ruling

**Ruling: TERMINATE after two exchanges. No third round. Arbitrate now.**

The §6.2 rule terminates debate when EITHER both the fun critic and interest
critic score ≥75/100, OR six exchanges occur. Neither has fired: only two
exchanges have happened, and critic scores are not yet on a frozen proposal.
The roadmap explicitly grants the Gameplay PA standing authority to "cut off
sub-agent debate when it has heard enough" (§6.2, §6.2 Responsibilities) _in
addition_ to the two automatic stops. I invoke that discretionary authority.

Rationale. The format's value (§6.2: "adversarial natural language tends to
surface design considerations neither would generate alone") has already been
realized. The second exchange was overwhelmingly convergent: the ant conceded
heal-priority-L1, partially conceded POST-occupation and hypnotize, and moved
off its venom-blast L6+ floor; the spider conceded jelly-L2, plane-switch-L4,
blitz-L7, placement-L1, and split its own bundle. The remaining contested set
is narrow and _well-argued on both sides from the existing four docs_:

- (a) **retreat L1 vs L2** — fully joined; both factions stated their best case
  (ant: glass-cannon learner-safety; spider: ambush-reveal economy). A third
  round would only restate.
- (b) **plane-affinity L3-weak vs L4-bundled** — the spider's rebuttal §1.2
  supplied a curve-explicit (3–5pp at weak tuning) defense; the ant's only
  counter-instrument (the bundle) was already rebutted on the ant's own
  stat-rule logic. The disagreement is resolvable on merits.
- (c) **venom-blast** — _already converged to L4 by both sides_ (ant rebuttal
  R4, spider rebuttal S4). This is not genuinely contested; it is a
  ratification, not a debate.
- (d) **L1 placement-symmetry condition** — a new, narrow, technical condition
  the spider raised and the ant did not rebut (silence = no opposition). It is
  a tuning constraint, not a placement dispute.

Plus three spider-raised new contests the ant addressed in its rebuttal:
recruit-as-order slot (ant L3 / spider L5), the plane-switch range-limit
banking, and the erasure-weight note. All are resolvable from the record.

A third exchange would extract diminishing returns at real cost (it delays the
Phase-D handoff that gates L3 implementability). The positions have converged
enough to arbitrate decisively. **No point is genuinely unresolvable.** I
terminate and rule on all of them below.

---

## 2. The L1–L10 mechanic schedule (authoritative)

Cumulative: a mechanic introduced at LN is active through L10. Each row lists
only what is **newly introduced** there. "High-cognitive" new mechanics (the
§3.4.3 ≤1-per-scenario budget item) are **bold**; stat-rules, passives,
magnitude ramps, setup phases, and cumulative-already-on items are not counted
against that budget (consistent with the ant-opening Queen-proximity reasoning
the spider accepted symmetrically in rebuttal §1.2).

| #   | Room (Level PA) | Victory        | Newly introduced this scenario (cumulative)                                                                                                                                                                                                           |
| --- | --------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Bathroom        | capture-post   | Stripped pair (Queen+footman / s-queen+s-soldier); fight/defend/**run**; spec-locked queen ultimate; one info ability; simple persistent fog; Queen-proximity passive; pre-game placement (symmetric); spider heal-priority web-defense (mild tuning) |
| L2  | The Pipe        | escort         | **Royal Jelly application**; pheromone-erasure (§3.1 floor); retreat behavioral layer + spider threat-assessment/ambush; Aunt Ant escort party                                                                                                        |
| L3  | Kitchen         | capture-post   | **Bio-evolution** (§3.4.5 locked) + charisma-gated promotion (one "class-change arrives" concept); plane-affinity passive (weak)                                                                                                                      |
| L4  | Hallway         | capture-post   | **Asymmetric plane-switch** (full strength); POST-randomization; combo abilities (Royal Onslaught / Venom Storm components); venom-blast (weak); Light-Switch flip-state POST¹                                                                        |
| L5  | Bedroom         | capture-post   | **Recruit-as-order** (charisma-gated); hypnotize light debut (duration-capped); plane-affinity reaches full corner coverage; Under-Bed concealment/fog-immunity¹                                                                                      |
| L6  | Stairs          | eradicate²     | **POST-occupation bonus** (combat bonus live); plane-switch reaches full corner coverage; vertical-traversal funnel (Level-owned)                                                                                                                     |
| L7  | Living Room     | capture-post   | **Commander cards** (Ant/Spider decks); Venom Storm combo online; spider blitz (5%) debut; Remote currency POST¹                                                                                                                                      |
| L8  | Attic           | recruit-count² | **Hypnotize full power**; tiered MP pool; POST-occupation bonus applies to attic geometry; score-tiebreaker active in all scenarios from here; Skylight one-way transit¹                                                                              |
| L9  | Basement        | capture-post   | **Sump-Pump / Boiler dynamic-hazard control**¹ (player-shaping debut)                                                                                                                                                                                 |
| L10 | Garage          | capture-post   | **Day/night cycle**¹; blitz at peak impact; all systems on (finale)                                                                                                                                                                                   |

¹ Mechanic-ownership boundary case — see §5; not unilaterally claimed.
² Victory kind not yet implemented — Phase-D engine dependency (Level PA §3).

**Internal-consistency proof obligations, discharged:**

- **§3.1 hard floors.** Pheromone-erasure debuts L2 (≥L2 ✓). Class-change /
  bio-evolution debuts L3 (≥L3 ✓; locked at exactly L3 per §3.4.5).
  Party-cap-8 unaffected (no formation-template / standing-order mechanic is
  scheduled anywhere in Tier-1 — those are §3.1-reserved for tier
  transitions). ✓
- **§3.4.2 cumulative-addition.** No mechanic is removed. Magnitude ramps
  (plane-affinity weak→full L3→L5; plane-switch full-strength-but-range-limited
  L4→full-coverage L6; venom-blast weak→Venom-Storm L7; hypnotize light L5→full
  L8) are _strengthenings of an already-on mechanic_, not removals. ✓
- **§3.4.3 ≤1 new high-cognitive mechanic per scenario.** Exactly one bolded
  item per row L2–L10. L1's stripped kit is the §3.2 spec-locked baseline, not
  a free-choice cognitive load. L3 bundles bio-evolution+charisma-promotion as
  the single "class change arrives" concept (the ant's framing, _upheld_);
  recruit-as-order is explicitly **moved out of L3 to L5** to keep that single,
  honoring the discipline the spider correctly demanded (§3 ruling C). L8
  carries hypnotize-full-power as the one new high-cognitive item; tiered MP is
  a low-cognitive resource-pool refinement and score-tiebreaker is a passive
  scoring rule (both explicitly "mild balance impact" / "almost free" per the
  roadmap §2 queue + mechanics memo), neither a new high-cognitive mechanic. ✓
- **Consistency with Level PA.** Same L1–L10 room sequence and victory kinds
  (Level PA §1). Bio-evolution at L3 matches Level PA L3 note. Pheromone-erasure
  at L2 matches Level PA L2 §5. POST-randomization at L4 matches Level PA L4
  §5(a). Concealment at L5 matches Level PA L5 §5. POST-occupation-bonus
  combat-power gated to L6 (the eradication scenario the Level PA L6 §6 says
  "turtling is useless") — fully aligned. Day/night at L10 matches Level PA L10
  §5. No scheduled mechanic contradicts a Level PA geometry decision. ✓
- **Special objectives.** L2 escort (§4.3.1): jelly+erasure+ambush land here,
  none of which conflicts with the escort win check. L6 eradicate (§4.3.2):
  POST-occupation-bonus is scheduled _exactly here_ so spiders contest
  stair-landings instead of being farmed. L8 recruit-or-die (§4.3.3):
  recruit-as-order is fluent by L8 (debut L5, two-scenario runway), and
  hypnotize-full-power lands here as its designed climax with a prior L5 light
  debut — no cold open. ✓

---

## 3. Contested-point rulings

I rule decisively. Where a faction made an honest concession I honor it; where
a faction held, I rule on merits against the §5 curve (the §3.4.4 binding
arbiter) and the "interesting > fair" license (§5).

### A. Retreat — L1 vs L2 → **RULING: split. Run-posture L1; threat-assessment/ambush behavioral layer L2.**

**Winner: both, on the distinction the ant's own rebuttal §1.5 surfaced.** The
ant opening asked for "retreat" at L1 and predicted the spider would be
neutral; the spider rebuttal §1.4 correctly refused — retreat-as-spider-ambush
is the spec's core spider identity reveal and spending it in the stripped
tutorial (no pinch-point geometry per Level PA L1) wastes it as tutorial noise.
But the ant rebuttal §1.5 then _itself_ drew the load-bearing distinction: the
**run posture** (the §3.2-listed basic fight/defend/**run**, the thing that
lets a low-HP unit pull out so the glass-cannon tutorial is survivable) is
_already in the L1 stripped kit by spec_ and is not the same mechanic as
**retreat-as-threat-assessment-behavior** (decline-and-re-engage, the spider
ambush AI). These are compatible under cumulative addition.

So: run-posture is L1 (it is spec-locked into §3.2 already; this is
ratification, not a grant). The retreat _behavioral layer_ + spider
threat-assessment debuts **L2**, the pipe escort built for it (§4.3.1), exactly
as the spider held and the ant conceded in rebuttal §1.5. The spider wins the
substantive point (the _mechanic_ with identity weight is L2); the ant's
non-negotiable (the low-HP unit can pull out in the tutorial) is satisfied by
the spec-given run posture, costing the spider nothing.

**Win-curve justification (§5):** retreat is symmetric in rule; the spider's
rebuttal S6 correctly noted the ant's own "≈0pp" estimate argues _against_
urgency, not for L1. L1 stays ~75%/measured-58% band unaffected either way; L2
~72% target absorbs the ambush behavioral layer as the honest mechanism of its
dip (spider opening §1.3). **Interesting-vs-fair:** interest decides this, not
balance — the spider's "don't burn the ambush reveal in the tutorial" is the
stronger _interest_ argument and §5 licenses interest as the tiebreaker when
win-rate is neutral. Spider's framing wins; ant's safety floor honored via spec.

### B. Plane-affinity — L3-weak vs L4-bundled → **RULING: L3, weak (3–5pp), ramping to full corner coverage L5.**

**Winner: spider, on its own rebuttal §1.2 reasoning.** The ant opening
bundled plane-affinity (TBS §1.3, 5–10pp) with asymmetric plane-switch (TBS
§1.4, 10–15pp) under one L4 gate. The spider rebuttal §1.2 split the bundle
with an argument the ant cannot consistently refute: plane-affinity is a
_passive stat gradient_, "a stat rule, not an order" — **the identical class
the ant opening used to justify Queen-proximity at L1.** Consistency cuts both
ways: if a passive stat interaction is L1-legal for ants on stat-rule logic, a
passive plane stat gradient is L3-legal for spiders on identical logic. The ant
never rebutted this symmetry (its rebuttal §1.6 conceded plane-_switch_ at L4
and only pushed the range-limit on _switch_, not affinity). The spider's claim
is uncontested on the merits.

L3 also _needs_ it: the Level PA L3 §3 places a Counter-Edge height-advantage
POST; a height/plane POST with no plane-affinity is dead flavor (spider
rebuttal §1.2, and Level PA L3 §6 notes the island already gives the defender
interior lines — affinity makes that legible).

**Win-curve justification (§5):** the spider supplied the curve-explicit
defense and I accept it: at _weak_ tuning in the L3 10×10-with-island (spider
kit still lacks venom/blitz/hypnotize at L3), a 3–5pp spider lean lands L3 at
**~65–67%**, inside loose tolerance, below the L4 ~60% spike and _above_ it
enough to preserve monotone descent L3→L4. The bundle-at-L4 would _flatten_
L3→L4 (L3 at 70%, L4 at 60%, a cliff); the split _shapes_ the descent — which
is what the non-monotonic-licensed curve wants. Plane-affinity reaches full
corner coverage at **L5** (the Bedroom, which Level PA L5 §2 reopens to all 6
planes — the first scenario where full off-floor affinity has the plane space
to matter). **Interesting-vs-fair:** not invoked; this is decided on curve
shape and stat-rule consistency, both objective.

### C. Recruit-as-order — ant L3 vs spider L5 → **RULING: L5.**

**Winner: spider.** The ant opening (Placement D) wanted recruit-as-order at
L3, smuggled under §3.4.3 by claiming bio-evolution + charisma-promotion +
recruit-as-order are "one concept." The spider rebuttal §1.5 correctly called
this "three mechanics wearing one coat" — and it is the _same_ §3.4.3
discipline the ant invoked against the spider's hypnotize and plane-switch
over-reaches. The ant cannot enforce the cognitive-load floor selectively. I
_uphold_ "class change arrives" = one concept (bio-evolution + charisma-promote
are the same class-change primitive, L3, §3.4.5-locked). Recruit-as-order is a
distinct _order_ and a third high-cognitive item; it cannot also be at L3.

The ant's _interest_ goal — fluency before the L8 recruit-or-die spike
(§4.3.3) — is sound and I grant it. L5 (Bedroom, concealment capture, Level PA
L5: low-stakes, ~65% rebound) gives a clean two-scenario runway to L8 and a
map where a mis-timed recruit costs nothing. Spider wins the slot; ant wins the
underlying goal.

**Win-curve justification (§5):** spider-neutral either way (~0pp); decided
purely on §3.4.3 cognitive load. **Interesting-vs-fair:** the ant's anti-fun
argument ("meeting a win-condition mechanic cold at the hardest scenario")
_wins_ as interest reasoning — which is _why_ L5 (not "never") is the ruling.
L5 satisfies the interest claim without the L3 pile-up.

### D. Venom-blast — already converged → **RULING: ratify L4, weak, paired with the ant combo answer.**

**Winner: convergence (spider's reframing prevailed; ant moved correctly).**
Both rebuttals landed on L4 (ant R4, spider S4). The spider's reframing won the
underlying argument: venom-blast is a _burst initiator_ (the round-28/29
reactivity fix), not the _sustained attrition_ tool the ant opening guarded
against — that is the Venom Storm combo (L7). A burst tool _shortens_ fights,
which is doctrinally neutral for a glass cannon ("a glass cannon is punished by
grind, not by burst," spider rebuttal §1.3). The ant honestly conceded this and
moved off L6+. L4 is the licensed ~60% spike (Level PA L4 §6 confirms the
randomization shock toward spider); a weak spider initiator (~3–4pp) is
_absorbed by_ that endorsed dip, not a floor breach. It debuts the same
scenario as the ant's Royal Onslaught combo answer — "escalation with an
answer," not unanswered chip. Venom-blast → Venom Storm (L7) is a 3-scenario
runway, clearing the spider's own stated runway test (component understood
before the combo lands).

**Win-curve justification (§5):** at the spider's original L3 ask, −4 to −7pp
on top of cumulative L2 erasure with no ant combo yet would breach the 70% L3
floor (ant R4). At L4-weak, absorbed by the ~60% spike, net L4 unchanged.
**Interesting-vs-fair:** the spider's "spiders aren't punching bags for five
scenarios" interest concern is fully satisfied at L4 (mid-tier, four scenarios
before Venom Storm). Both factions and the curve agree.

### E. L1 placement-symmetry condition → **RULING: ADOPTED as a binding L1 exit gate.**

The spider rebuttal §1.6 conceded pre-game placement at L1 (it is the setup
phase, not a stripped ability — the ant's framing, upheld) but attached a new
condition the ant opening omitted and the ant did not rebut (silence ⇒ no
opposition): placement must be _symmetric in information_. If the ant places
knowing L1's fixed POST locations (Level PA L1 §3: 5 spec-fixed POSTs) while
the spider web-garrison places with no equivalent defensive-anchor heuristic,
L1 drifts above the 80% spec ceiling — breaching the **hard** L1
`[65%,80%]` floor/ceiling (roadmap §5, §7.1). I adopt the condition: the
spider web-garrison must receive a defensive-anchor placement heuristic of
equal strength. This is a **named L1 exit gate for Phase D**, not a free knob.

**Win-curve justification (§5):** asymmetric placement on fixed L1 POSTs pushes
L1 >80% — a hard-ceiling breach, not a soft-curve miss. The condition is the
mechanism that keeps L1 inside `[65%,80%]`. **Interesting-vs-fair:** not a
trade; symmetric setup is a correctness constraint on a hard ceiling.

### F. Heal-priority web-defense L1 → **RULING: ratify ON at L1, mild tuning a named L1 exit gate.**

Both factions converged (spider opening §1.2 / 2.1; ant rebuttal §1.1 conceded
cleanly). I ratify. Without it, L1's win condition ("capture the defended web,"
Level PA L1 §4) degenerates to a generic POST and the tutorial fails to teach
"spiders defend; mass and commit" — _pro-ant pedagogy_ (ant rebuttal §1.1). The
ant's binding condition is honored: heal magnitude tuned so a _correctly massed_
ant assault wins **decisively**, not marginally — legible hardness, the player
loses to their _dribbling mistake_, not to opacity. This is a named L1 exit
gate (magnitude is not a free spider knob).

**Win-curve justification (§5):** with mild tuning L1 stays in band; _removing_
the mechanic pushes L1 toward ~82% (ant-stomp, breaching the hard ceiling per
§7.1 and the spider's 2.1 estimate). **Interesting-vs-fair:** legible hardness
is the interest payoff; both factions agree.

### G. POST-occupation bonus — ant L8 vs spider "by L6 non-negotiable" → **RULING: combat bonus debuts L6 (exactly at the floor).**

**Winner: spider on mechanism and floor; ant on the no-earlier-leak guard.**
The spider's strongest, declared-non-negotiable argument: without proactive
spiders, the L6 eradication scenario (§4.3.2; Level PA L6 §6 "turtling is
useless… geometry favors the high-ground defender") is a trivial farm — a
75%+ ant-stomp, not a 55% scenario, and the whole back-half curve collapses.
The ant rebuttal §1.2 conceded this cleanly and I uphold the spider: the
**combat bonus is live at L6.** The ant's held point — the combat bonus must
_not_ leak to L4/L5 where it would multiply with the plane-asymmetry cluster
into a true curve-breaker — is also correct and I uphold it: the schedule
places the combat bonus at _exactly_ L6, neither earlier nor later. The ant's
falsifiable fallback (if the within-scenario loop shows L5 turtle-stomping, a
_proactivity-only_ L5 variant — target-selection behavior, **zero** combat
bonus) is **logged as a Phase-D contingency**, not pre-adopted (no L5 stomp is
demonstrated yet; it is a loop-time decision).

**Win-curve justification (§5):** holds L6 at the ~55% target (Level PA L6 §6
agrees geometry favors spider here — curve intent). Combat-bonus at L4 instead
would drive L4 below ~50%, breaching the licensed ~60% spike into a true
ant-loss zone (ant R2). **Interesting-vs-fair:** "interesting" decisively wins
here — a proactive spider contesting stair-landings is _the reason L6 is a
game_; §5's hard-level-before-the-end license covers the ~55% dip explicitly.

### H. Hypnotize — debut L4 vs L5, full power L8 → **RULING: light debut L5 (duration-capped), full power L8.**

**Winner: ant on the slot; structural convergence on L8.** Both converged on
the weak-debut→L8-climax structure (spider opening §1.6 / 2.5; ant rebuttal
§1.3). The residual: spider offered L4-or-L5; ant held L5 specifically because
L4 already carries plane-switch + POST-randomization + combos + venom-blast (the
heaviest scenario in the tier) and adding even a weak hypnotize debut violates
§3.4.3 _in spirit_ — "the player cannot name what's new in one sentence." The
ant is right and the spider's own opening called L5 "a natural home" (bedroom,
concealment POST — a hypnotized neutral emerging from concealment is
thematically coherent; Level PA L5 §6 confirms L5 is the info-asymmetry room).
The ant's second hold — "weak" must be a _control-duration cap_, not only
neutral-density — is the load-bearing learner-safety knob and I adopt it: a
short-duration hypnotize the ant can play around teaches the concept without
losing a committed party decisively. **L8 full power lands as a designed
callback** (§4.3.3 hypnotize climax), not a cold open.

**Win-curve justification (§5):** L5 duration-capped debut ≈ +1pp spider,
negligible inside the ~65% rebound; L8 full power drives the deliberate ~50%
spike (§5 "hard level before the end"). **Interesting-vs-fair:** the
"previously-met mechanic turned to eleven at its designed climax is a payoff;
first-contact full-power at the hardest scenario is a feel-bad" argument is
_the_ strongest interest argument in either brief — both factions made it
(spider for hypnotize, ant for recruit). Interest decides: L5→L8.

### I. Asymmetric plane-switch + range-limit banking → **RULING: L4 full strength, range-limited; full corner coverage by L6.**

**Winner: convergence; the ant's banking ask granted.** Both agreed L4 (ant
opening Placement B, spider rebuttal S2). The ant rebuttal §1.6 asked the
arbiter to _bank_ the spider's own structured-summary 2.4 offer ("ships
range-limited if pushed") as a binding _condition_ of L4 placement, not a later
courtesy — because L4 is the heaviest cumulative scenario in the tier (five
deltas) and the spider's own §3.4.3 discipline applies. I grant it: plane-switch
ships **range-limited at L4** (fewer corner-pairs active), reaching **full
corner coverage at L6** (the Stairs, where plane traversal is the scenario's
entire point per Level PA L6, and where the curve is at its ~55% honest low so
the strengthening lands inside the intended dip rather than overshooting L4).

**Win-curve justification (§5):** range-limited at L4 keeps the spike at the
intended ~60%; full coverage _at_ L4 would overshoot toward ~52–55% (ant R5),
breaching the licensed spike into an ant-loss zone. Staggering L4→L6 makes each
room teach a facet of flanking. **Interesting-vs-fair:** interest _supports_
the stagger — "harder, but here is the spider threat and your answer together"
at L4 (spider S2), then a deeper flank at L6 — escalation, not a wall.

### J. Closed/agreed points (logged, no contest)

Blitz L7 / peak L10 (mutual: spider S5, ant rebuttal §1.5 — _upheld_).
Day/night L10 (mutual; matches Level PA L10 §5 — _upheld_). Score-tiebreaker
active in all scenarios by L8 (ant opening endorsed; removes a soft ant subsidy
the ant conceded — _upheld_, scheduled L8). Tiered MP at L8 (ant opening; "mild
balance impact" — _upheld_). Pheromone-erasure L2 hard floor with the spider's
attached weight note ("decides the plane at the pinch-point, not cosmetic" —
spider rebuttal §1.1) — _adopted as a tuning note for the L2 within-scenario
loop_ so the spider's only L2 teeth are not under-tuned on the ant's
"minimized" framing. No L1 hypnotize/venom/asymmetry/erasure (mutual — _upheld_,
all gated ≥L2).

---

## 4. Win-curve mapping

Predicted ant win-rate per scenario given the schedule, reconciled with the
**real measured anchors L1 = 58% (capture; gate 29), L2 = 76% (escort)**:

| #   | §5 aspiration | Predicted (this schedule) | Driver of the delta from the prior scenario                                 |
| --- | ------------- | ------------------------- | --------------------------------------------------------------------------- |
| L1  | 75% (±5)      | **58% (measured)**        | Measured reality — below §5 aspiration (see re-baseline note).              |
| L2  | 72%           | **76% (measured)**        | Escort + jelly skill-expression (≈0pp) + erasure/ambush; measured high.     |
| L3  | 70%           | **~68%**                  | Bio-evolution+promote ≈neutral; plane-affinity weak −3 to −5pp.             |
| L4  | 60%           | **~60%**                  | Plane-switch (range-limited) + venom-blast weak + randomization, vs combos. |
| L5  | 65%           | **~64%**                  | Rebound (player adapts; concealment); hypnotize light +1pp spider.          |
| L6  | 55%           | **~55%**                  | POST-occupation combat bonus + plane-switch full + vertical geometry.       |
| L7  | 65%           | **~64%**                  | Cards rebound; Venom Storm + blitz debut as spider counter-pressure.        |
| L8  | 50%           | **~50%**                  | Hypnotize full power (designed spike) + recruit-or-die objective.           |
| L9  | 60%           | **~60%**                  | Player shapes the field (sump-pump) — player-favorable rebound.             |
| L10 | 50%           | **~50%**                  | Day/night + blitz peak over the densest obstacle field; genuinely close.    |

**Reconciliation of the L1=58% anchor (recommendation, not implementation —
this is a Phase-D call for the within-scenario loop).** The measured L1 = 58%
sits below the §5 ~75% aspiration _and_ below the spec hard floor of 65%
(roadmap §5/§7.1: L1 is the one scenario with a hard `[65%,80%]` window). This
is the genuine reconciliation problem the brief flags. Two options:

1. **Re-baseline the curve to measured reality.** Treat 58→76→…→50 as the true
   anchored shape. _Rejected_ for L1 specifically: 58% _breaches the spec hard
   floor_ (65% is not aspirational for L1 — §7.1 makes the `[65%,80%]` window a
   hard constraint for L1 only). The curve cannot re-baseline _through_ a hard
   floor; L1 must be brought up to ≥65%.

2. **Stripped-kit adjustment at L1 in Phase D (RECOMMENDED).** The 58% almost
   certainly reflects gate-29's _full_ mechanic kit being measured, not the
   §3.2 _stripped_ L1 kit this plan specifies (no jelly, no plane-switch, no
   combos/cards/promotion, mild heal-tuning). Stripping the spider's advanced
   toolkit out of L1 (which this schedule _does_ — every anti-ant lever is
   gated ≥L2) should recover L1 toward the ~75% top-of-spec target on its own.
   **Recommendation:** Phase-D measures L1 with the actual stripped kit + the
   §3 ruling-F mild heal tuning + the §3 ruling-E symmetric placement gate;
   expect L1 to land in `[65%,80%]` without further intervention. If it still
   reads <65% on the stripped kit, the within-scenario loop tunes the heal
   magnitude _down_ and/or the footman Queen-proximity bonus _up_ until L1 ≥65%
   — heal magnitude is already a named exit gate (ruling F), so this is in
   scope. **Do not re-baseline the published curve below the L1 hard floor.**

L2's measured 76% slightly exceeds the §5 ~72% aspiration but is well inside
the loose tolerance §5 authorizes and _below_ L1's hard ceiling — no action;
the spider's erasure-weight note (ruling J) is the lever if L2 needs to be
brought toward 72% in the within-scenario loop. L3–L10 predictions track the §5
shape closely under the schedule's rulings; the largest engineered shaping is
the L3 plane-affinity split (ruling B) which deliberately holds L3 at ~68% to
preserve a monotone descent into the licensed L4 ~60% spike rather than the
flatter §5-illustrative 70→60 cliff.

---

## 5. Mechanic-ownership boundary cases — FLAGGED FOR HUMAN REVIEW

The Level PA flagged 7 spatial/environment boundary cases (`level-progression-
plan.md` §4). The debate surfaced **no new combat/unit-side mechanic that
crosses into spatial/environment territory** — every contested mechanic
(retreat, jelly, plane-switch, plane-affinity, venom-blast, hypnotize,
POST-occupation bonus, combos, cards, recruit-as-order, blitz, tiered MP,
score-tiebreaker) is cleanly unit/combat/faction (Gameplay-owned, §6.3) and
does not introduce a spatial effect. POST-occupation bonus is the closest call
— it is _triggered_ by occupying a spatial node — but it is a combat/scoring
_payload_ on an existing POST, identical in ownership shape to the Level PA's
own L7-Remote split (Level PA §4 case 3). I therefore do **not** add it as a
new boundary case; I record the Gameplay-side recommendation inline below and
**consolidate the Level PA's 7 unchanged**. Total: **7 boundary cases for human
review** (count unchanged — the debate added none).

Consolidated list (Level PA's 7, each with my Gameplay-side recommendation; I
do **not** unilaterally claim any cross-boundary mechanic):

1. **L4 Light-Switch flip-state POST → global combat modifier.** _Level PA: split._
   _Gameplay rec: concur — split._ Level owns the POST node/flip-state; Gameplay
   owns the combat-resolution payload. The schedule places this at L4; the
   payload must be a single low-cognitive modifier so L4's §3.4.3 budget
   (spent on plane-switch) is not exceeded.
2. **L5 Under-Bed concealment → garrison fog-immunity.** _Level PA: Level, with
   Gameplay sign-off._ _Gameplay rec: concur._ It interacts with the
   pheromone/fog layer (TBS §1.5) and the spider scout AI; Gameplay confirms it
   does not invalidate the locked spider info-AI spec. No win-curve effect
   beyond the Level PA's ~65% rebound.
3. **L7 Remote currency POST → bonus gold/turn.** _Level PA: Gameplay owns
   economy; Level owns node._ _Gameplay rec: concur — split._ The gold feeds the
   commander-card economy this plan debuts at L7 (ruling J); Gameplay owns the
   card-economy coupling.
4. **L8 Skylight one-way plane transit.** _Level PA: Level (connectivity)._
   _Gameplay rec: concur_ — connectivity is Level territory; flagged only for
   the engine-owner to confirm one-way transit does not break movement AI
   (Level PA §3 dependency 4). No faction-balance stake.
5. **L9 Sump-Pump player-toggleable hazard tiles.** _Level PA: split._ _Gameplay
   rec: concur — split._ Level owns the water region + pump node; Gameplay owns
   the hazard damage application. §6.3 pre-names "basement water" as the
   clearest line-crosser — neither agent claims it whole.
6. **L9 Boiler hazard-emitting POST.** _Level PA: same split as #5, bundle the
   human decision._ _Gameplay rec: concur_ — shares the dynamic-hazard engine
   surface; bundle with #5 for one human ruling.
7. **L10 Day/night cycle.** _Level PA: Gameplay._ _Gameplay rec: concur —
   Gameplay owns the combat-profile flip (TBS §1.2: +1 atk/+1 agi spiders at
   night); Level owns only the L10 scheduling._ Both factions and the Level PA
   agree on the L10 slot; ownership of the _effect_ is Gameplay. This is the
   one case where the debate directly informs the recommendation: the schedule
   binds day/night to L10 exactly (ruling J), so the human ruling only needs to
   confirm the _ownership split_, not the placement.

**FLAGGED FOR HUMAN REVIEW: 7 boundary cases (consolidated; debate added 0).**
None claimed unilaterally by Gameplay.

---

## 6. Phase-D handoff (ordered build list)

So that **L3 is implementable immediately after Phase C**, Phase D must build
in this order. Engine dependencies are from the Level PA §3 (verified against
source there); earliest-scenario mechanics are from the §2 schedule above.

**Tier 0 — unblocks L1–L2 (must precede any L3 work):**

1. **L1 stripped-kit configuration + ruling-F mild heal tuning + ruling-E
   symmetric placement heuristic.** Named L1 exit gates (rulings E, F). Measure
   L1 against `[65%,80%]`; this is the curve-reconciliation action (§4).
2. **L2 mechanic delta:** Royal Jelly application; pheromone-erasure (§3.1
   floor); retreat behavioral layer + spider threat-assessment/ambush; Aunt Ant
   escort party. L2 escort victory kind already implemented (Level PA §1) — no
   engine dep here; this is data + AI config + the within-scenario loop with
   the spider erasure-weight tuning note (ruling J).

**Tier 1 — unblocks L3 (the immediate post-Phase-C target):**

3. **Bio-evolution debut engine support (L3, §3.4.5 locked).** Pure Gameplay,
   no spatial component (Level PA §4 "deliberately not flagged"). The
   first-promotion-eligible unit data + the charisma-gated promotion chain
   (mechanics §1.4) as the single "class change arrives" concept (ruling C).
4. **Plane-affinity passive stat gradient (L3, weak tuning).** A terrain stat
   rule (ruling B); needs the affinity table wired to the plane set. Low
   engine surface (passive stat modifier, no new order). L3's Counter-Edge
   height POST (Level PA L3 §3) depends on this for non-dead flavor.

_After step 4, L3 is fully implementable_ (capture-post victory already exists;
Kitchen geometry is Level-owned and specified in Level PA §2).

**Tier 2 — L4 (next, heaviest scenario):**

5. **Per-seed POST jitter on `static` maps** (Level PA §3 dep 3 — L4
   POST-randomization). Loader-resolved `jitter` field.
6. **POST-bound flip-state global combat modifier** (Level PA §3 dep 8 — L4
   Light-Switch; boundary case #1 — needs the §5 human split ruling first).
7. **Asymmetric plane-switch (range-limited, ruling I) + combo abilities
   (Royal Onslaught / Venom Storm components) + venom-blast (weak, ruling D).**
   The L4 mechanic delta; venom-blast must exist before its L7 Venom-Storm
   combo.

**Tier 3 — L5–L10 engine dependencies (in scenario order, per Level PA §3):**

8. Concealment / fog-immunity POST property (L5; dep 7; boundary case #2).
9. Recruit-as-order (L5, ruling C) — Gameplay; no engine dep beyond the
   existing R8/R10 recruit primitive being addressable as an order.
10. **`eradicate` victory kind + ant-loss-on-timeout default (L6; dep 1).**
    Highest-priority _new victory kind_ — L6 is unplayable without it.
11. POST-occupation combat bonus (L6, ruling G) + plane-switch full corner
    coverage (ruling I) + plane-affinity full coverage (ruling B; lands L5,
    sequence it before L6 step).
12. Commander cards + Remote currency POST (L7; dep 5 economy coupling;
    boundary case #3).
13. **`recruit-count` victory kind + dual loss (L8; dep 2)** + one-way Skylight
    transit (dep 4; boundary case #4) + hypnotize full power + tiered MP +
    score-tiebreaker-everywhere.
14. Dynamic terrain state — sump-pump/boiler (L9; dep 6; boundary cases #5/#6).
15. Day/night cadence global modifier (L10; dep 8; boundary case #7) + blitz
    peak.

**Critical-path note for Phase D:** the two new victory kinds (`eradicate` L6,
`recruit-count` L8 — Level PA §3 deps 1–2) are the only true _blockers_ for
their scenarios; everything L3–L5 ships on existing `capture-post`/`escort`
victory code. The single highest-leverage _quality_ (not correctness)
investment remains the Level PA's flagged 10×10 map-gen refactor (Level PA §3
dep 5), most felt at L7/L10 — recommended but not on the L3 critical path.
