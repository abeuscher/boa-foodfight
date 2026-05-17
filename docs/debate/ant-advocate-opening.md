# Ant Faction Sub-Agent — Opening Position (Round 1 of 6)

**Debate:** Tier-1 mechanic distribution across L1–L10.
**Author:** Ant Faction Sub-Agent (advocate, not arbiter).
**Arbiter:** Gameplay Progression Agent.
**Format:** roadmap §6.2 — natural-language argument + structured summary.
**Binding constraints honored:** §3.1 hard floors, §3.4 cumulative-addition,
§3.2 stripped L1, §5 win-rate curve (L1 ≈ 75% → L10 ≈ 50%, non-monotonic OK).

---

## 1. Natural-language argument

### The ant doctrine I am defending

Per `game-outline.md` ("Ant design principle"), ants are a glass-cannon
faction: disproportionate Attack and Constitution, low HP — built to win
battles fast or lose them costly. The cooperative ant mechanic (Queen
proximity + Royal Jelly stacking) is the lever that converts that fragility
into a tempo advantage: ants are strongest in a concentrated, well-supplied
burst near home or under jelly, and weakest in a war of attrition far from
the Queen. Every placement argument below flows from one thesis: **the ant
experience is a logistics-and-tempo puzzle**, not a slugfest. The win-curve
falling from ~75% to ~50% is not a problem for that fantasy — it is the
fantasy maturing. Early levels should let the player feel the kill-fast
power clearly; later levels should make the logistics tax bite. I will argue
for that arc honestly, including where ants _should_ lose ground.

### L1 — the stripped tutorial (75%, spec-locked)

§3.2 fixes the L1 kit: Queen + ant-footman vs spider-queen + spider-soldier,
basic fight/defend/run, the spec-locked Queen ultimate, simple persistent
fog, and one information ability. I do not contest this; I want to nail the
_ant minimum viable kit_ inside it.

The ant footman must already telegraph the doctrine. That means: (a) the
Queen-proximity Attack bonus is **on at L1** (it is the cooperative ant
mechanic, not a "layered" mechanic — it is the faction's defining stat
interaction, and stripping it would make ants read as generic melee), and
(b) retreat is **on at L1 for both sides**, not L2. The roadmap's §3.3 sketch
hints retreat at "likely L2," but §3.3 is explicitly illustrative and the
user's verbatim plan says retreat should "fold in early" and "applies to
both sides." Retreat at L1 is pedagogically essential _for ants
specifically_: the low-HP unit that cannot retreat is just a unit that dies,
and the player never learns the core ant lesson ("commit hard or pull out
clean") if the pull-out option does not exist in the tutorial. I anticipate
the Spider Sub-Agent will be neutral-to-favorable here (retreat is
symmetric), so this should be cheap to win.

What I explicitly do **not** ask for at L1: Royal Jelly application,
recruit, combos, plane-switch-as-order, cards, promotion. Agreed per §3.2.
The Queen-proximity _passive_ is not an "ability" in the stripped sense — it
is a stat rule — so it does not violate the stripped-kit spirit.

### L2 — Pipe / Escort Aunt Ant: jelly logistics debut (target ~72%)

L2 is the escort objective (§4.3.1) in a 4×16 tube. This is the single most
important ant placement in the tier and I will spend my strongest argument
here: **Royal Jelly application must debut at L2.**

Reasoning from ant experience: the escort objective _is_ a logistics
problem. Aunt Ant is a non-combatant who must be walked the length of a
corridor with no room to maneuver (plane-switch is the only flank). The ant
doctrine is "strong near supply, weak far from it" — and an escort that
marches away from the home Queen is the textbook scenario where jelly
logistics becomes the entire game. Without jelly at L2, the escort is a
dull "move the blob and tank hits" exercise; with jelly, it becomes "do I
send the dose forward with the escort or stage a supply runner?" That is the
ant fantasy in its purest tutorial form. Jelly at L2 also gives the player
their first taste of the resupply tax _before_ the curve starts punishing
them for ignoring it.

Hard floors that land here anyway: pheromone-erasure (L2+, §3.1). I accept
it — but I flag it as **ant-negative** and want it explicitly logged. The
ant info-advantage (ants see everything; spiders see only the decaying
pheroTrail, per TBS §1.5) is an ant subsidy by design. Pheromone-erasure
lets spiders restore fog where no ant stands — directly attacking the ant
information edge. In a one-dimensional pipe where the escort's position is
nearly deducible anyway, the erasure hurt is _minimized_, which is exactly
why L2 is the right floor for it: it is the least-bad scenario to introduce
an anti-ant mechanic. I concede this rather than fight a hard floor, and I
expect the Spider Sub-Agent to push for erasure to _matter more_ in open
maps later — that is fine; cumulative addition means it is on from L2
regardless.

### L3 — Kitchen / bio-evolution debut (target ~70%)

§3.1 and §3.4(5) lock bio-evolution debut at L3. From the ant side this is
_positive_ and I support it landing exactly here, not later. The
charisma-gated promotion chain (mechanics §1.4) and bio-evolution are the
ant army-building payoff. Crucially, mechanics §1.4 makes charisma go **up**
for engaging larger/higher-tier parties and **down** for fleeing or farming
small ones. That gating _rewards the ant doctrine_: ants are supposed to
pick big fights and win them fast. A footman that promotes by punching above
its weight is the glass-cannon fantasy formalized. I want charisma-promotion
introduced **at L3, simultaneously with bio-evolution**, since both are
class-change and §3.4(3) ("at most one new high-cognitive mechanic per
scenario") is satisfied by treating "class change arrives" as one concept.

Honest concession: the §5 curve only dips to ~70% here, so I am not claiming
promotion is a free ant buff — it is a _tempo_ tool, not a _power_ tool, and
its charisma-down-on-retreat clause is a real anti-ant tax (ants retreat
more than spiders by design). I price that into the win prediction below.

### L4 — Hallway / POST randomization + the spider-favored cluster

§3.3 and §4.1 put POST randomization at L4 (fixed regions, randomized
within). The §5 curve takes its biggest dip here, to ~60% — the deliberate
"spike toward spider." I accept this and will not fight the dip; arguing
ants should stay at 70% at L4 would be a homer position that costs me
credibility with the arbiter. Randomized POSTs blunt the ant pre-game
placement lever (see below) because you cannot pre-plan a route to a fixed
target. That is a fair, interesting tax.

This is the natural home for the cluster of TBS balance mechanics that are
**ant-negative if introduced earlier**: asymmetric plane-switch (TBS §1.4 —
spider passive / ant order-cost), plane-affinity (TBS §1.3 — spiders strong
on ceiling/wall, ants on floor), and combo abilities (mechanics §1.2). I
argue all three land **L4–L6**, not before:

- **Asymmetric plane-switch and plane-affinity must NOT precede L4.** These
  are explicitly the strongest balance levers in the TBS memo (§4 ranks 1.4
  and 1.3 #1 and #2, "10–15pp" and "5–10pp" toward spiders). In the
  stripped L1–L3 kit the ant has _no jelly-rich, recruit-supported answer_
  to a spider that flanks freely across planes and out-stats them off-floor.
  Introducing them at L2 or L3 would crater the ant win rate below the §5
  curve floor (L2 target 72%, L3 70%) and — more importantly for my
  mandate — it would teach the player the ant doctrine is _unviable_ before
  they have the toolkit (jelly, recruit, combos) that makes asymmetry a
  puzzle rather than a punishment. The Spider Sub-Agent will absolutely
  argue for these early; that is the predicted counter and the arbiter
  should weigh that the §5 curve itself (70%+ through L3) forbids it.
- **Combo abilities (mechanics §1.2) at L4.** Royal Onslaught / Venom Storm
  class combos favor whoever can stage two adjacent same-faction parties.
  Ants, being the aggressor faction with shorter capture chains, naturally
  cluster; Royal Onslaught is the burst-damage payoff that _makes the
  glass-cannon doctrine close fights before attrition wins_. I want combos
  introduced the same scenario the curve dips, because the combo is the
  ant's _answer_ to the plane-asymmetry shock — landing them together makes
  L4 read as "harder, but here is your new power," not "harder, full stop."

### L5–L7 — concealment, stairs, living room (65 / 55 / 65)

L5 (concealment POSTs) rebounds to 65% — the player adapts; ants exploit
fog-immune POSTs as forward jelly-supply anchors. I support commander cards
(mechanics §1.3) debuting **L7**, where §4.1 says "cards economy starts
paying off" and the first shop-fed gold has accumulated (shops after L2/L3/
L4/L6 per §6.5). The Ant deck (`Forced March`, `Pheromone Beacon`, `Royal
Decree`) is pure tempo — exactly the ant identity — but it is a _gold sink_,
and gold only accrues after several shop visits. Cards before L6 would be a
dead mechanic for ants (no gold to spend); cards at L7 are a real lever.

L6 (Stairs, eradication, ~55%) is the honest low point and I **endorse** it.
§4.3.2 makes the win condition "kill every spider party," with ant-loss on
timeout because the offensive burden is on ants. This is the purest possible
expression of the ant doctrine — _you must close, attrition kills you, the
clock is your enemy_ — and it is correct that it is the hardest pre-finale
scenario for ants. Vertical traversal favoring the defender is a fair,
interesting tax, not an unfair one. Arguing ants up here would betray the
doctrine I am defending. I want **venom-blast and spider blitz** explicitly
kept _out_ until at least L6: venom-blast is a sustained-damage tool that
punishes the low-HP ant in exactly the protracted fights the doctrine says
ants should avoid; introducing it before the player has combos + cards +
promotion to enable fast kills would make the glass cannon read as just
"glass." I expect the Spider Sub-Agent to push venom-blast early and hard;
the §5 curve (≥60% through L5) is my arbiter-facing defense.

### L8–L10 — tiered MP, day/night, score, the finale

L8 (Attic, cockroach recruit-or-die, ~50% — the deliberate "hard level
before the end"). Recruit is _load-bearing for ants here_ (it is the win
condition: recruit ≥4 cockroaches). I argue **recruit as an order debuts
earlier — L3, gated by charisma** — so that by L8 the player is fluent with
it under pressure rather than meeting it cold at the hardest scenario.
Meeting the win-condition mechanic for the first time _at_ the spike level
is anti-fun; familiarity with recruit is what makes L8's pressure
_interesting_ rather than _opaque_.

L8 is the right home for **tiered MP** (mechanics §1.1) and **POST-occupation
bonus**: both reward the disciplined, supply-aware ant late-game and add
texture without swinging balance much (mechanics §1.1: "mild balance
impact"). Day/night (TBS §1.2) is locked to **L10** by §4.1 and is
ant-negative (night gives spiders +1 atk/+1 agi and suppresses ant-scout);
L10 is the correct floor — it lands at the 50/50 finale where a spider
forced-tempo window is _interesting_, not where it would prematurely crater
the curve. Score-tiebreaker (mechanics §1.6) should be **active in all
scenarios by L8** at the latest; it converts "ants ran out the clock" from
an implicit ant default into an earned, measurable outcome. I support this
even though it removes a soft ant subsidy — because a tiebreaker that
rewards held POSTs and a living Queen still rewards competent ant play, and
because a credible advocate concedes subsidies that make the game duller.

### Pre-game placement — the ant strategic lever, on from L1

Pre-game placement (R7) is already in the end-state build and is not a
"layered" ability — it is the setup phase. I argue it is **on from L1** as
the ant's signature strategic expression: ants are the aggressor with a
route-planning problem (§ "Route diversity" in the spec lists three ant
openings). Taking placement away early would flatten the one lever that
lets the ant player express the fast-kill plan _before_ turn 1. It costs no
win-rate (both sides place) and is pure interest.

---

## 2. Structured summary

### Placement A — Royal Jelly application → L2 (escort)

- **Position:** Jelly application debuts at L2, not L3+.
- **Faction impact:** Converts the escort from a tank-and-walk chore into a
  forward-supply puzzle; introduces the ant logistics tax early, while the
  curve is still ant-favored, so the player learns it before it punishes.
- **Win-rate prediction:** Roughly neutral at L2 (≈0 to +2pp ant). Jelly is
  a skill expression, not a free buff; weak players gain nothing. Keeps L2
  inside the ~72% target.
- **Interest claim:** The escort objective is structurally a logistics
  problem; jelly is the mechanic that gives it depth. Without it L2 is the
  dullest scenario in the tier for ants.

### Placement B — Asymmetric plane-switch + plane-affinity → no earlier than L4

- **Position:** Both TBS top balance levers gated to L4–L6; never L1–L3.
- **Faction impact:** These are the strongest anti-ant mechanics in the
  inventory. Pre-L4, ants lack jelly-rich/recruit/combo answers, so they
  read as unviable rather than challenged.
- **Win-rate prediction:** If introduced at L2/L3: −10 to −18pp ant
  (TBS §1.3/§1.4 cited magnitudes), violating the §5 floor (72%/70%). At
  L4, paired with combos, the dip is the _intended_ ~60% spike.
- **Interest claim:** Asymmetry is a puzzle only when the player has the
  toolkit to solve it. Introduced naked, it teaches "ants lose," which kills
  the faction fantasy. The Spider Sub-Agent will contest this; the §5 curve
  is the objective tiebreaker.

### Placement C — Combo abilities (Royal Onslaught) → L4, same scenario as the dip

- **Position:** Combos debut at L4, alongside POST randomization and the
  plane-asymmetry cluster.
- **Faction impact:** Royal Onslaught is the burst tool that lets the glass
  cannon close fights before attrition wins — the ant _answer_ to the L4
  difficulty spike.
- **Win-rate prediction:** +5 to +8pp ant relative to L4-without-combos;
  net L4 still ≈60% (the spike is intended), but the _experience_ shifts
  from "punished" to "empowered-but-tested."
- **Interest claim:** Pairing the hardest new tax with the ant's signature
  payoff makes L4 read as escalation, not a wall. Splitting them (combos
  later) makes L4 feel unfair and L-combos-level feel like a free win.

### Placement D — Recruit (charisma-gated) → L3, not first-seen at L8

- **Position:** Recruit-as-order debuts L3 (with charisma promotion /
  bio-evolution), well before it becomes the L8 win condition.
- **Faction impact:** L8's recruit-or-die is the deliberate ~50% spike;
  fluency with recruit by L8 makes the spike _hard-but-fair_ instead of
  _opaque_.
- **Win-rate prediction:** Negligible at L3 (≈+1pp). At L8, prior fluency is
  worth roughly +5 to +8pp vs. cold introduction — and L8's target is 50%,
  so this keeps the spike honest rather than degenerate.
- **Interest claim:** Meeting a win-condition mechanic for the first time at
  the hardest scenario is the textbook anti-fun pattern. Early familiarity
  is what makes pressure interesting.

### Placement E — Venom-blast + spider blitz → no earlier than L6

- **Position:** Sustained-damage / fast-spider tools gated to L6+.
- **Faction impact:** Both punish the low-HP ant in protracted fights — the
  exact situation the doctrine says ants must avoid. Pre-combo/card/promote,
  ants cannot generate the fast kills that justify the fragility.
- **Win-rate prediction:** If at L2–L4: −8 to −12pp ant, breaching the curve
  floor. At L6+ (curve already ~55%), the impact is absorbed by the intended
  low point.
- **Interest claim:** The glass cannon is only fun if it can be a _cannon_
  first. Introduce the anti-attrition punishment after the player has the
  burst toolkit, or the faction just reads as fragile. Predicted strongest
  Spider counter-position; §5 curve is the defense.

### Placement F — Retreat (both sides) + Queen-proximity passive + pre-game placement → L1

- **Position:** All three on at L1 (retreat per the user's verbatim "fold in
  early"; the other two are stat-rules/setup, not stripped abilities).
- **Faction impact:** These are the ant doctrine's load-bearing primitives.
  Without retreat the low-HP unit just dies; without Queen-proximity ants
  read as generic melee; without placement the ant route-planning identity
  is gone from turn 0.
- **Win-rate prediction:** ≈0pp net (retreat and placement are symmetric;
  Queen-proximity is already in the L1 ≈75% baseline).
- **Interest claim:** The L1 tutorial must teach the ant fantasy, not a
  generic one. These are the cheapest, highest-identity placements in the
  tier and I expect little Spider resistance.

### Concessions logged (credibility with the arbiter)

- L4 dip to ~60%, L6 to ~55%, L8 to ~50%: **endorsed**, not contested. The
  curve maturing toward 50/50 is the ant fantasy maturing.
- Pheromone-erasure at L2 (hard floor): accepted; flagged ant-negative but
  L2 is the least-bad introduction point.
- Score-tiebreaker by L8: supported despite removing a soft ant subsidy.
- L6 eradication as the honest pre-finale low point: endorsed; arguing ants
  up here would betray the doctrine.
