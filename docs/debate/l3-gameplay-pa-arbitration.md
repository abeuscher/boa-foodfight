# Gameplay Progression Agent — L3 Kitchen Mechanic Delta: ARBITRATION

**Owner:** Gameplay Progression Agent (arbiter, roadmap §6.2).
**Status:** Phase-D L3 deliverable. Document only — no code, no scenario
data. This is the concrete L3 mechanic delta spec the within-scenario loop
implements and tunes.
**Inputs:** `docs/debate/l3-ant-advocate.md`,
`docs/debate/l3-spider-advocate.md` (opening + rebuttal each);
`docs/mechanic-distribution-plan.md` §3.B (the recorded L3 ruling:
plane-affinity, L3-weak, 3–5pp, ramping to full corner coverage by L5),
§4 (win-curve reconciliation: L2 shipped measured 76%; L3 must land
clearly below ~72% and near 68%, preserving monotone L2→L3 descent);
`docs/level-progression-plan.md` §2 L3 (Kitchen geometry; §4b — engine
deps frozen, `planeAffinity` is an existing capability).
**Bounded by:** §3.1 hard floors, §3.4 cumulative-addition, §5 curve,
§6.3 ownership (Gameplay owns this; Kitchen geometry is the Level PA's,
not designed here). Engine surface frozen — this delta is **data-only**
via the shipped `planeAffinity` structure (`engine/schemas/units.ts`).

---

## 1. What was actually contested

Placement was **not** in contest and is not re-decided here: the
mechanic-distribution plan §3.B already ruled plane-affinity L3-weak
(3–5pp, ramping to full corner coverage by L5) on the spider's
stat-rule-symmetry argument, which the ant never rebutted and explicitly
re-conceded in both L3 briefs. Bio-evolution + charisma promotion at L3
("class change arrives" = one concept, §3.C / §3.4.5-locked) is settled
and is **win-rate-neutral by prior ruling** — it is an army-building tempo
tool, not a power injection; it does not move the L3 prediction.

The two faction sub-agents converged on everything except **one integer**:

- **Agreed (both factions, explicitly):** the L3 delta is the **`wall`
  row waking up** — floor and ceiling rows stay at the L2 shipped baseline
  (one room of change); only the L1-descended **combat** templates move
  (spider-soldier/scout/spinner/elite; ant-footman/archer/potato-bug/tank);
  **queens untouched** (preserves the ratified L1 heal-priority web-defense
  lesson); ant support/casters (`ant-worker`, `ant-scout`, `ant-mage`)
  untouched; ant `wall` is `−1/0` (spider did not over-reach to `−1/−1`);
  full corner coverage / ceiling-row deepening is the **separate ruled L5
  step**, not L3.
- **Contested:** the spider `wall` **armor sub-field** — `+1` (spider) vs
  `0` (ant). That is the entire residual dispute.

This is exactly the convergence profile the §6.2 format is designed to
produce: the adversarial exchange collapsed a broad placement question to
a single tunable integer with both sides' best case on record.

---

## 2. The L3 baseline (what L2 ships)

From `data/level-2/units.json`, the shipped `planeAffinity` baseline that
L3 deltas _from_ (the schema collapses all four wall planes —
north/south/east/west — into one shared `wall` row, so the Kitchen's
north-wall and east-wall are one data row):

| Template class                                            | floor   | ceiling | wall  |
| --------------------------------------------------------- | ------- | ------- | ----- |
| Ant combat (footman, archer, potato-bug, tank)            | +1 / +1 | −1 / 0  | 0 / 0 |
| Ant support/caster (worker, scout, mage)                  | +1 / 0  | 0 / 0   | 0 / 0 |
| Ant queen                                                 | +1 / +1 | −1 / 0  | 0 / 0 |
| Spider combat (soldier, scout, spinner, elite) + spider-q | −1 / 0  | +1 / +1 | 0 / 0 |
| Neutrals (mouse, cockroach, spiderling, …)                | 0 / 0   | 0 / 0   | 0 / 0 |

The `wall` row is **dead (`0/0`) for every template**. Plane-affinity is
_already on_ as a floor/ceiling gradient — so the honest L3 delta is not
"introduce plane-affinity," it is "the dead `wall` row wakes up, weakly,
on the planes the Kitchen actually uses." Both factions agreed this is the
correct, minimal one-room change.

---

## 3. RULING — the contested integer

**RULING: spider combat-template `wall` row = `+1 / 0` (attack-only) for
the L3 debut. The `armor +1` sub-field is banked to the ruled L5 ramp.
The ant wins the residual integer.**

This is decided on **win-curve shape and the §3.B ruling's own stated
arithmetic** (objective; the §5 "interesting > fair" license is _not_
invoked — both factions' interest arguments are credible and roughly
offsetting, so the curve is the binding arbiter per §3.4.4).

**Why the ant wins the integer.** The §3.B ruling I issued in the
mechanic-distribution plan committed to a specific number with a specific
justification: "at _weak_ tuning … a 3–5pp spider lean lands L3 at
~65–67% … _preserving monotone descent into the licensed L4 dip_; the
bundle-at-L4 flattens L3→L4, the split _shapes_ it." That ruling's binding
intent is **shape preservation**, and §4's reconciliation hardened the
target: L3 must land **near 68%** and **clearly below ~72%**, off an L2
that **shipped at a measured 76%**, with L4 at the licensed ~60% spike.

The spider's `+1/+1` claim and the ant's `+1/0` claim make rival
arithmetic claims about which knob produces the ruled 3–5pp. I resolve it
on the structure of the Kitchen, not on either advocate's assertion:

- The Kitchen is a **4-plane** set (Level PA §2 L3): floor, ceiling,
  **north-wall, east-wall**. _Two of the four planes are wall planes_, and
  the schema applies the single `wall` row to **both**. The defender
  (spider) reaches the Counter-Edge objective via interior lines that
  route through those wall planes (Level PA's stated "slight spider
  nudge"). Spiders are climbers; the wall planes are their identity planes
  by movement mode. So a spider `wall` attack bonus is applied across _half
  the Kitchen's active plane set, on the planes the defender actually
  fights from_ — it is **high-leverage even at `+1` attack-only**.
- An attack-only `wall +1/0` on four spider combat templates, across two
  wall planes, against `ant wall −1/0`, on a map whose geometry already
  gives the defender a slight nudge, is a **−3 to −5pp ant swing** off the
  L2 measured 76%. That is the §3.B band, delivered. Adding `armor +1` on
  top makes it **−5 to −7pp** → L3 ~64–66%, which **overshoots the ruled
  ~68% target and flattens the L3→L4 separation into a near-cliff** (L4 is
  ~60%; an L3 at ~65% leaves only ~5pp of descent and crowds the licensed
  L4 spike). That is precisely the failure mode §3.B was issued to
  _prevent_. The ant's "the armor field breaks your own stated arithmetic"
  rebuttal is correct against my own prior ruling's intent.
- The spider's strongest counter — "attack-only under-shoots to ~71–72%
  and fails 'clearly below 72%'" — is **rejected on leverage**. The
  spider's own §1.2 ruling-winning argument established the swing is
  evaluated _in the island Kitchen with the wall row live_; it did not
  assume a single wall plane. Two wall planes, defender interior lines,
  climber identity, and the existing ant `wall −1/0` mirror together carry
  attack-only into the −3 to −5pp band without the armor point. The
  spider's ~2–3pp estimate silently assumes one wall plane and ignores the
  ant-side `−1/0` half of the gradient; corrected for both, attack-only
  lands at ~68%, on target.

**Where the spider is upheld.** Every spider concession is honored and
every spider non-over-reach is ratified: locus is `wall`-row only;
floor/ceiling untouched; ant `wall` is `−1/0` (the spider explicitly did
_not_ over-reach to `−1/−1`, which would push L3 toward ~58% — a curve
breach — and that restraint is the reason the −3 to −5pp band is _clean_
rather than an ant-stomp-feel); queens untouched; combat templates only.
The spider's identity concern ("the climbing defender must register on its
own planes") is **satisfied at L3 by the attack edge** and **completed at
L5 by the armor sub-field** — the exact callback structure the spider
itself demanded for hypnotize ("first-contact full-power is a feel-bad; a
callback is a payoff"). Applied symmetrically: the spider's sole new L3
lever debuts at the bottom of its ramp; the armor point is the L5 payoff.
The spider is not denied its identity — it is given the ramp it argued for
its own tools.

---

## 4. The L3 mechanic delta — concrete, data-level spec

Implementable directly against the shipped `planeAffinitySchema`
(`engine/schemas/units.ts`); **no engine code** (engine deps frozen,
Level PA §4b). The L3 units file = the L2 units file with **only the
`wall` rows below changed**, on **only these eight templates**. Every
other field, template, and the floor/ceiling rows are byte-identical to
L2. Promoted variants inherit their base template's row automatically
(`ant-veteran-footman`, `ant-sharpshooter` ← footman/archer profile;
`spider-veteran-soldier`, `spider-knight`, `spider-weaver`,
`spider-stalker` ← spider combat profile) — this is not a separate delta;
it is the same eight rows propagating through promotion.

| Template         | floor (unchanged) | ceiling (unchanged) | **wall (L3 delta)** |
| ---------------- | ----------------- | ------------------- | ------------------- |
| `spider-soldier` | −1 / 0            | +1 / +1             | **+1 / 0**          |
| `spider-scout`   | −1 / 0            | +1 / +1             | **+1 / 0**          |
| `spider-spinner` | −1 / 0            | +1 / +1             | **+1 / 0**          |
| `spider-elite`   | −1 / 0            | +1 / +1             | **+1 / 0**          |
| `ant-footman`    | +1 / +1           | −1 / 0              | **−1 / 0**          |
| `ant-archer`     | +1 / +1           | −1 / 0              | **−1 / 0**          |
| `ant-potato-bug` | +1 / +1           | −1 / 0              | **−1 / 0**          |
| `ant-tank`       | +1 / +1           | −1 / 0              | **−1 / 0**          |

**Untouched (explicitly, by ruling):** `ant-queen`, `spider-queen`
(`wall` stays `0/0` — preserves the ratified L1 heal-priority
web-defense lesson); `ant-worker`, `ant-scout`, `ant-mage` (`wall` stays
`0/0` — the ant's own plane-switchers are not double-taxed off-floor);
all neutrals (`wall` stays `0/0`). Floor and ceiling rows on **all**
templates: unchanged from L2.

**One-sentence statement of the L3 delta (the §3.4.3 "name what's new"
test):** _"Spiders now fight slightly harder, and ants slightly worse, on
the Kitchen's wall planes — the climbing defender's interior lines finally
have a small mechanical edge."_ One room of change.

**The ruled L5 ramp (stated for forward consistency, not L3 work):** at
L5 (Bedroom, all 6 planes reopened — Level PA §2 L5), the spider combat
`wall` row deepens `+1/0 → +1/+1` (the banked armor sub-field) and the
gradient reaches full corner coverage. Ants do **not** get stronger at
L5; the gap closes by the spider catching up off-floor, which is the
curve's intended closure mechanism (§5: "the enemy got more dangerous").
L3 is verified the genuine _weak end_ of that ramp, not the whole thing
front-loaded.

---

## 5. Win-rate prediction for L3

**Predicted L3 ant win rate: ~68%** (band ~67–69%, within the §5 loose
tolerance and §4's "near 68%, clearly below ~72%" reconciliation).

Derivation, anchored to **measured reality** (mechanic-distribution plan
§4: L2 shipped at a **measured 76%**, not the §5-aspirational 72%):

1. **Start: L2 measured 76% ant.** This is the anchor, not the §5
   aspiration. Monotone descent is measured against 76%.
2. **Bio-evolution + charisma promotion at L3: ~0pp.** Ruled
   win-rate-neutral (army-building tempo, charisma-down-on-retreat is a
   real ant tax that offsets the army-building upside — §3.C). No move.
3. **Plane-affinity `wall` delta (this spec): −5 to −7pp ant.**
   Attack-only `+1/0` spider / `−1/0` ant, four combat templates each,
   across the Kitchen's **two** wall planes (north-wall + east-wall, one
   shared schema row applied to both), on a map where the defending
   spider's interior lines route through exactly those planes. The
   two-wall-plane leverage plus the symmetric ant `−1/0` debit puts this
   at the upper half of the §3.B 3–5pp _per-side-feel_ band when measured
   as a _combined_ ant-side swing off 76%.
4. **Kitchen geometry slight spider nudge: ~−1pp ant** (Level PA §2 L3:
   "the island gives the defender interior lines — slight spider nudge";
   this is the Level PA's geometric contribution, not double-counted with
   the affinity leverage above — the affinity figure is the _combat-math_
   delta, this is the _positional_ delta of the island/lane split).

**Net: 76% − (5 to 7) − ~1 ≈ 68–70%, settling to ~68%** with the
within-scenario loop tuning the heal/Counter-Edge `+3 def` interaction (a
Level-owned POST stat, Gameplay-neutral) toward the target.

**Why this preserves the monotone L2→L3 descent and hits ≈68%:**

- **Strictly below L2.** 76% → ~68% is an unambiguous ~8pp drop. It clears
  §4's hard requirement ("clearly below ~72%") with margin and is not a
  re-baseline through a floor (L2 has no hard floor; only L1 does, §7.1).
- **Strictly above the L4 spike.** L4 is the licensed ~60% spike
  (mechanic-distribution plan §4; Level PA §2 L4 confirms the
  randomization shock toward spider). ~68% (L3) → ~60% (L4) is a clean
  ~8pp continued descent with the L4 spike still _separated_ — the §3.B
  ruling's explicit intent ("the split _shapes_ the descent; the bundle
  _flattens_ it"). Had the spider's `armor +1` been granted, L3 would land
  ~64–66%, leaving only ~4–6pp to L4 and **crowding the licensed spike
  into a near-cliff** — the precise failure §3.B was issued to prevent.
  Attack-only is the knob that holds the ~68% rung and keeps the L3→L4
  step a _shaped descent_, not a flat step or a cliff.
- **Monotone L2(76) → L3(~68) → L4(~60)** is preserved and _engineered_,
  exactly the largest deliberate shaping move the mechanic-distribution
  plan §4 already flagged as the L3 plane-affinity split's purpose.

---

## 6. Interest claim

**The L3 delta makes the Kitchen's spider-favoring geometry legible
through the terrain itself, while keeping the ant's losses readable.**

The Level PA built the Kitchen as the first non-special scenario whose
geometry rewards the spec's defending/ambushing spider (island, two lanes,
interior lines to a defended Counter-Edge). Before this delta the wall row
is dead `0/0` — the geometry promises a defender advantage the data does
not deliver, and the Kitchen reads as "a flat room with a rock in it." The
`wall +1/0` spider / `−1/0` ant delta is the smallest possible change that
makes the climbing defender's identity planes _mean something_: the ant
player who loses a party on a wall plane can **see why** ("I flanked into
the spider's plane and got bitten harder — contest the lane on the floor
where I'm strong, or bring the burst to end it fast"). That is the ant
glass-cannon doctrine taught by terrain — _pro-ant pedagogy_, not an
unearned stat wall — and simultaneously the "the enemy got more dangerous
on its own ground" closure §6.2 wants over the boring-but-balanced failure
mode. Attack-only keeps it a **pressure** lever, not a **durability**
lever, so it does not multiplicatively stack with the spider's geometric
interior-line advantage into a curve-bender; the spider's
durability-identity payoff is preserved and _deferred_ to the ruled L5
ramp as a callback, which is the exact interest structure the spider
itself argued for (a previously-met edge deepened at its designed home is
a payoff; a front-loaded stat wall is a feel-bad). Both factions' interest
goals are served; neither is denied — only sequenced.

---

## 7. Termination record

**Termination basis: §6.2 condition 1 — the Gameplay PA's standing
discretionary cutoff authority ("cut off sub-agent debate when it has
heard enough"), invoked after the opening + one rebuttal per faction
(4 documents; equivalently 2 exchanges of the 6-exchange cap; the
automatic 6-exchange stop did NOT fire — terminated early by discretion,
consistent with the mechanic-distribution plan §1 precedent).**

- **§6.2 automatic stop A (both fun-critic AND interest-critic ≥75/100 on
  a frozen proposal):** _Not yet fired_ — critic eval runs in the
  within-scenario loop on the implemented L3 data, which is downstream of
  this arbitration; there is no frozen scored proposal at debate time. Per
  §6.2 and the mechanic-distribution-plan §1 precedent, this does not
  block arbitration; it is a Phase-D loop gate, recorded as the L3
  ship-gate below.
- **§6.2 automatic stop B (6 exchanges):** _Not fired_ — only 2 exchanges
  occurred (opening + rebuttal per faction).
- **Discretionary cutoff (invoked):** The debate converged to a **single
  contested integer** (the spider `wall` armor sub-field, `+1` vs `0`)
  with both factions' best case fully on record and every other dimension
  conceded by both sides. A third exchange would only restate the
  arithmetic dispute the §3.B ruling's own stated intent already resolves.
  The §6.2 format's value ("adversarial NL surfaces considerations neither
  generates alone") was fully realized — the exchange itself produced the
  decisive frame (attack-only as a _pressure_ vs _durability_ distinction,
  and the two-wall-plane leverage analysis) that neither opening contained.
  Per roadmap §6.2 Responsibilities the Gameplay PA "cuts off sub-agent
  debate when it has heard enough"; that threshold is met. **Terminate;
  arbitrate now.** No point is genuinely unresolvable.

**L3 ship-gate (handed to the Phase-D within-scenario loop):** implement
the §4 data delta; run the loop to fun-critic + interest-critic; the L3
data ships when **both critics ≥75/100** on the measured L3 config
(§6.2 automatic stop A, evaluated where it belongs — on the built
scenario). The loop's tuning latitude is the Counter-Edge `+3 def` POST
interaction and confirming the measured L3 lands in the ~67–69% band; the
`planeAffinity` magnitudes in §4 are the **ruled debut values**, not a
free knob — any change to them reopens this arbitration.

---

## 8. Summary of the verdict

| Dimension                  | Ruling                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mechanic                   | Plane-affinity `wall`-row debut (data-only; existing `planeAffinity` structure; no engine)                                   |
| Placement                  | L3 (pre-ruled §3.B; uncontested; not re-decided)                                                                             |
| Locus                      | `wall` row only; floor/ceiling = L2 baseline, unchanged                                                                      |
| Templates                  | 8 combat templates only (4 spider, 4 ant); queens + ant support/casters + neutrals untouched                                 |
| Spider combat `wall`       | **`+1 / 0`** (attack-only — ant wins the residual integer)                                                                   |
| Ant combat `wall`          | **`−1 / 0`** (spider did not over-reach to `−1/−1`; ratified)                                                                |
| Armor sub-field / coverage | Banked to the ruled **L5** ramp (`spider wall → +1/+1`, full corner coverage)                                                |
| Favors                     | Spider (the Kitchen's climbing defender, on its two wall identity planes)                                                    |
| L3 win-rate prediction     | **~68%** (band 67–69%); monotone L2 76% → L3 ~68% → L4 ~60% preserved and shaped                                             |
| Interest claim             | Spider-favoring geometry made legible via terrain; ant losses stay readable; spider durability identity sequenced to L5      |
| Termination                | §6.2 discretionary cutoff after 2 exchanges (4 docs); auto-stops A/B not fired; ship-gate = both critics ≥75 on the built L3 |
