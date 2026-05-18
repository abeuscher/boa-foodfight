# Ant Faction Sub-Agent — L8 Attic Mechanic Delta (Opening + Rebuttal)

**Debate:** L8 (Attic) mechanic delta vs **merged L6**, per roadmap §6.2.
**Author:** Ant Faction Sub-Agent (advocate, not arbiter).
**Arbiter:** Gameplay Progression Agent.
**Scope:** the L8 delta only — (a) the **`recruit-count` victory
target/economy tuning** as the load-bearing, §4f-compliant curve lever
(recruit-race parameters: `victoryCondition.target`, the `recruit`
ability `successRate`/`cooldown`, cockroach-neutral spawn count, the
charisma/recruiter gate); (b) **hypnotize FULL-power restore** — exact
params reverting the L5 cap (cite L5's capped values, restore the
pre-L5 originals); (c) **tiered MP debut** — concrete data-expressible
params (ability `tier` fields, caster-eligibility, per-ability `uses`
caps); (d) explicit **no plane-affinity delta** (carried from L6
byte-identical, §4d) and **no card-economy curve reliance** (§4f).
**Builds on (does not repeat):** `l6-ant-advocate.md`,
`l5-ant-advocate.md`, `docs/debate/l6-gameplay-pa-arbitration.md` (the
**merged-L6 baseline this deltas FROM** — POST-occupation
`healingRate:3`/`defensiveBonus:3` Step-Landings + the binding
spider-sortie doctrine, plane-switch full corner coverage,
plane-affinity at the carried `spider combat wall +1/+1`, hypnotize
light `minControlTurns:2/maxControlTurns:3`, recruit-as-order,
`eradicate` — all carry forward **unchanged** except where this delta
explicitly changes them), `docs/debate/l5-gameplay-pa-arbitration.md`
§3.3/§4c (the **hypnotize-light cap I am reversing at L8**),
`docs/mechanic-distribution-plan.md` §2 (the L8 row: hypnotize full
power; tiered MP; score-tiebreaker-everywhere; Skylight one-way),
§3.H (hypnotize light L5 → **full power L8**, the designed climax),
§4 (win-curve: L8 ~50%, "the hard level before the end").
**Binding constraints honored:** §3.1 hard floors, §3.4
cumulative-addition, §5 curve (L8 ≈ 50–56% — the continued decisive
descent below L6 56 toward the L10 ~50 climax; **L7 is PARKED, a known
gap, NOT interpolated**), §6.3 ownership (Gameplay-owned; the cramped
clipped-ceiling box-maze geometry, the 6 POST placements, the ~8
cockroach-neutral spawn _positions_, the Skylight one-way transit node
are the Level PA's, **not** designed here), level-progression-plan §4b
(engine FROZEN — `recruit-count` victory + dual loss implemented
PR #11, one-way transit PR #14, tiered-MP machinery live Round 21;
**data/AI-config only, no new engine code**), §4c (score-resolution
**N/A for `recruit-count`** — mission-decisive, no grind-to-score
path), **§4d (plane-affinity inert — do NOT spend the L8 delta budget
on it)**, **§4e (occupation-`healingRate` economy engine-inert outside
forced co-occupation — not a lever here)**, **§4f (the commander-card
economy CANNOT be the L8 curve lever under the locked card-host
heuristic; a player-favorable rebound MUST NOT be built on cards)**.

---

## 1. Natural-language argument — opening

### The ant doctrine at L8, and why L8 is the decisive descent below L6 56

My through-line is unchanged across the campaign: the ant experience is
a logistics-and-tempo puzzle, and the descent toward ~50% by L10 is
that fantasy maturing into its hardest, most committed form, not
breaking. L6 was the resumed descent — the spider stopped turtling and
the curve dropped to ~56% (the merged L6 ruled landing; the L6
arbitration §5 prediction band 53–57, taken at its upper edge as the
merged anchor for the monotone-down argument). **L8 is where the
descent continues, decisively, and I am not going to pretend it
shouldn't.** Roadmap §5 and mechanic-distribution plan §4 both price L8
as "the hard level before the end" — the user's explicitly licensed
spike before the L10 ~50 climax. The curve heads L6 56 → L8 → L10 ~50,
and the brief is explicit that **L7 is parked and must NOT be
interpolated**: I reason the curve as the L6-56 anchor descending
directly to an L8 band I will argue, separated above the L10 ~50
finale. My job at L8 is not to fight the dip. It is to make sure the
dip is _earned by a real, AI-exercised mechanic_ — and the brutal
lesson of §4f is that the obvious-looking lever (cards) is exactly the
one that will measure inert. I will not let L8's descent be hung on a
mechanic the locked AI cannot convert.

### The `recruit-count` objective IS the curve lever — and that is §4f-correct, not a compromise

The single most important thing I can say at L8: **the load-bearing
curve lever is the victory structure itself.** `recruit-count`
(engine-implemented PR #11, `end-of-turn.ts:538-548`, verified): the
ant wins iff `recruitedPartyCount(state, "cockroach") >= target`; the
ant loses if the queen dies OR no living recruiter (mage) remains. This
is a _mission_ scenario, exactly like L6 was — and §4f is explicit that
mission scenarios (L6, L8) "force decisive play and do not exhibit the
§4c grind or the card-host trap the same way — prefer their
structurally-robust levers." The recruit-race is the structurally-robust
lever. It is not a stat the chain-march/fortress AI ignores (the §4d
failure); it is not a co-occupation heal economy the winner-take-all
POST race nullifies (the §4e failure); it is not a card market the
immobile queen-guard never spends offensively (the §4f failure). It is
the win condition. Every AI on the board — the ant mage-escort racing
cockroaches, the spider racing to hypnotize them first — acts on it
because it _is_ the game.

The tuning knobs are concrete data, all §4f-compliant:

- **`victoryCondition.target`** — the number of recruited cockroach
  parties the ant must hold alive. The roadmap §4.3.3 illustrative is
  "≥4". This is the single highest-leverage curve dial: target 3 is
  easier (ant-favorable), target 5 is a brutal race (spider-favorable).
  It is read by the engine win check every end-of-turn — maximally
  AI-exercised.
- **`recruit` ability `params.successRate`** (L6: `0.25`) and
  **`cooldown`** (L6: `2`) — how fast the ant mage line can convert
  the cockroach neutrals. A lower successRate / longer cooldown makes
  the race tighter; this is the recruit-race _tempo_ knob.
- **The cockroach-neutral spawn count** — roadmap §4.3.3 says the attic
  spawns "many" (e.g., ~8 instead of the standard 1). More neutrals =
  more recruit opportunities = the ant can absorb more spider
  hypnotize-denials. This is a roster/spawn data knob (Level PA owns the
  _positions_; the _count_ is the Gameplay recruit-economy dial, noted
  not a Level boundary per the Level PA's own §4 "deliberately not
  flagged: L8 cockroach recruit-race — pure Gameplay").
- **The recruiter gate** — `recruit` is mage-only
  (`antRecruiterRemains` keys off the `RECRUIT_ABILITY` template). The
  dual-loss "all ant-mage parties dead" arm means the spider's
  alternative to out-recruiting is to _kill the mages_ — which makes
  mage survivability (a roster/composition data knob) a real curve
  input.

These are levers the L8 AIs demonstrably exercise: the recruit-race
optimizer on both sides reads the live recruited-count and the
remaining-neutral pool every turn. **This is the §4f-compliant,
structurally-robust core of the L8 delta, and it must be where the
delta budget is spent.**

### Hypnotize full-power restore — the designed climax, and I conceded this structure at L5

I do not contest the hypnotize full-power restore — I have been on
record since L5 that this is the designed payoff. At L5 the arbitration
(§3.3, §4c) capped hypnotize light: `minControlTurns 5 → 2`,
`maxControlTurns 10 → 3`, `successRate 0.8` unchanged,
`reboundImmunityTurns 10` unchanged. That cap was explicitly a
learner-safety knob with a stated forward-consistency intent: "L8
restores hypnotize toward full power (`minControlTurns 5 /
maxControlTurns 10`) as its designed climax (ruled §3.H; §4.3.3) — the
3-scenario runway (L5→L8)." That runway has been run (L5, [L6], [L7],
L8 — the L7 gap does not break the runway; the player met capped
hypnotize at L5 and it has been live-but-capped since). **L8 reverts
the cap to the pre-L5 originals: `minControlTurns: 5,
maxControlTurns: 10`.** Those are the exact values the L5 arbitration
§2 cites as the carried-in baseline it capped FROM, and the engine
`HYPNOTIZE_MIN/MAX_TURNS` spec-fallbacks. `successRate 0.8` and
`reboundImmunityTurns 10` stay unchanged (the gate was always
duration, per the L5 §3.3 "the gate is identity/cost, not strength"
discipline — I hold the arbiter to that symmetric reading: restore
_only_ what the cap touched).

Here is the ant concern, and it is a §4.3.3 concern, not a placement
fight: a 5–10-turn hypnotize at L8 is **catastrophic** because the
attic's hypnotized cockroaches charge the ant queen (§4.3.3 loss arm).
A full-power seizure of a recruited cockroach party near the queen is a
near-instant lose. I accept that — it _is_ the designed climax, the
"previously-met mechanic turned to eleven" payoff §3.H ruled. But it
means hypnotize full-power and the `recruit-count` target must be tuned
_together_: the target cannot be set so high that, against full-power
hypnotize racing the same neutrals, the ant cannot mathematically
reach it. The hypnotize restore is the escalation; the recruit-race
tuning is where the answer (more neutrals, recruiter survivability,
the target itself) is priced. Escalation with an answer, in the same
room — the §3.D doctrine, a fifth time.

### Tiered MP debut — a real data constraint, not a placement gesture

Mechanic-distribution plan §2 schedules tiered MP at L8 and the roadmap
§2 queue calls it "mild balance impact … almost free." I do not contest
the slot — I contest that it be a _real data number_, the same demand
I made of hypnotize-light at L5 ("light ≠ absent"). The engine
machinery is already live (Round 21, `engine/mp-tiers.ts`): casters
(`intelligence >= 5` OR `'caster'` tag — both data fields in
`data/level-8/units.json`) carry the hardcoded
`INITIAL_MP_SLOTS {tier1:4, tier2:2, tier3:1}` pool; each ability's
`tier` (a `data/level-8/abilities.json` field) gates which slot it
drains; the legacy `uses: N` cap still applies on top. The engine
constant is frozen — I do not ask to change it. The L8 _data_ delta is
that the tiers and caster-eligibility are tuned so the pool **actually
binds for the first time**: `hypnotize` is tier-3
(`data/level-6/abilities.json` already `tier:3`, `uses:null`) — under
the single tier-3 slot, a spider caster gets **one** full-power
hypnotize per scenario, not unlimited. `recruit` is tier-2
(`tier:2, uses:null`) — under two tier-2 slots, a mage gets a bounded
number of recruit attempts before the pool is dry. **This is the knob
that makes hypnotize-full-power survivable**: an uncapped-`uses`
full-power hypnotize would be the §4.3.3 cold-stomp; the tier-3
single-slot pool is what bounds it to a climactic _one big seizure_
the player can plan around, not an endless one. Tiered MP at L8 is not
flavor — it is the structural bound that lets the hypnotize restore be
a climax instead of a wall.

### No plane-affinity delta, no card reliance — and that is correct

Per §4d I do not ask for any plane-affinity change at L8; the L6 state
(spider combat `wall +1/+1`, full corner coverage) carries forward
byte-identical. Per §4f I do **not** ask for, and will actively oppose,
any L8 rebound or curve movement built on the commander-card economy:
§4f is decisive that the card market is hosted on the immobile
queen-guard running the gate-29-locked card heuristic — cards land on
the queen-guard/self, never the assault, so funding the economy cannot
convert to a win-rate swing in this matchup. L8's descent is carried
**entirely** by the `recruit-count` race tuning (the AI-exercised
engine), the hypnotize-full-power escalation, and the tiered-MP bound
that makes that escalation survivable. Not cards. Not plane-affinity.
Not a `healingRate` co-occupation economy (§4e). The levers the locked
AI paths demonstrably convert, and only those.

### Why this serves the ant fantasy (interest)

A glass cannon's hardest pre-finale room must be hard for a _legible_
reason. L8's reason is the cleanest in the tier: it is a _race_, and
the enemy is racing you for the same prize. The player who learned
info-control at L5 and tempo/verticality at L6 now learns _commitment
under a clock with no turtle option_: there is no POST to grind, no
score to stall into — you out-recruit the spiders or you lose your
mages and lose. The hypnotize-restore is the visible escalation (the
mechanic you've known since L5, turned to full power, weaponizing the
very cockroaches you're racing for, against your queen). The answer is
in the player's hands: recruit faster, screen the queen, spend your
one big play wisely under the tier-3 cap. That is the ant doctrine —
out-tempo and out-commit, don't out-slug — at its hardest expression
before the finale, the user's licensed "hard level before the end,"
with the difficulty _visible_ (the spiders are flipping your roaches)
and the answer _structural and in-hand_ (the race tuning, the MP
bound). Not a card economy that can't fire. Not a stat the AI ignores.

---

## 2. Natural-language rebuttal — answering the spider's L8 brief

The spider will argue (consistent with its identity brief) that
hypnotize full-power is _its_ L8 payoff and must register loudly as the
engine of the ~50% dip; that the `recruit-count` + dual-loss structure
is already a heavy ant tax it should be allowed to lean on; and that
tiered MP over-constrains the spider's one big play. I rebut on three
points, and I expect heavy convergence — this is a mission scenario and
§4f points both of us at the same robust lever.

**First — hypnotize full-power is the spider's payoff _only if the
recruit-race target is tuned so the ant can still win the race_; an
unbounded restore is the §4.3.3 cold-stomp, not a ~50% climax.** The
spider and I agree the full-power restore is the designed callback
(ruled §3.H, conceded since L5). Where I correct: the spider's instinct
will be to price it as the dominant standalone driver and resist the
tier-3 MP bound. Run that against the actual `recruit-count` math: the
attic spawns ~8 cockroach neutrals; the ant must hold `target` of them
alive; the spider hypnotizes them to charge the queen. If hypnotize is
full-power (5–10 turns) AND uncapped (`uses:null` with no binding MP
pool), a spider caster flips neutral after neutral indefinitely, each
seizure lasting up to 10 turns, each hypnotized roach a queen-charging
suicide unit — the ant cannot out-recruit an unbounded denial+offense
engine and the room is a sub-40% wall, not the licensed ~50%. **The
tier-3 single-slot MP pool is the knob that makes the spider's restore
a climax instead of a stomp**: one big full-power seizure per caster,
not an endless stream. The spider gets its loud payoff — one
devastating, fully-restored hypnotize — _bounded_ so the ant's
recruit-race remains mathematically winnable. That is "escalation with
an answer," and the answer is structural (the MP bound + the target
tuning), exactly the §3.D doctrine the arbiter has applied at every
prior level.

**Second — `recruit-count` + dual-loss is already the structural spider
tax; do not double-count it as a reason to over-tune hypnotize.** The
spider will note, correctly, that L8 has no score path
(level-progression-plan §4c — `recruit-count` is mission-decisive) and
that the dual loss (queen dead OR all mages dead) is a heavy ant
burden: the offensive recruiting clock is entirely the ant's, and the
spider wins by _denying_ (kill mages, or flip enough roaches to swamp
the queen) within the turn cap. Granted — that is a real, heavy tax,
the spider's L8 identity delivered by the victory structure itself,
the same shape as L6's `eradicate` + ant-loss-timeout. But that tax is
_already priced into the ~50%_. The spider cannot invoke the
mission-structure tax _and_ demand an unbounded hypnotize on top —
that is the L4 "unanswered escalation" the arbiter rejected at §3.D and
the L6 §3.3 "double-counting the structural tax as a stackable subsidy,
rejected." The escalation (the unforgiving mission structure + one
full-power hypnotize) lands the dip; the ant's answer-in-the-same-room
is the recruit-race tuning (more neutrals, recruiter survivability, the
target). Escalation with an answer, both in L8.

**Third — tiered MP does not nerf the spider's payoff; it is the only
thing that makes the full-power restore _shippable_ in a recruit-race
room.** The spider will say the tier-3 single slot guts its one big
play. It does the opposite. Without the MP bound, hypnotize-full-power
is `uses:null` (unlimited) at 5–10 turns each — the §4.3.3 cold-stomp,
which the within-loop will measure as a sub-40% wall and which (per the
L4-§9 / L6-§7 falsification precedent) _reopens this arbitration_. The
spider does not want its payoff to be the lever that fails the
ship-gate. The tier-3 single-slot pool is precisely what lets the
arbiter ship a _genuinely full-power_ hypnotize: it is restored to the
real 5–10-turn original (the loud payoff the spider is owed) AND
bounded to one decisive cast per caster (so the ant's race survives).
That is the same "weak ≠ absent / capped ≠ absent" discipline applied
inversely: full ≠ infinite. The spider's payoff is _maximized in
magnitude_ (true 5–10-turn restore) and _bounded in frequency_ (the MP
pool) — the only structure under which a recruit-race room can carry
both a full-power hypnotize and a winnable ant objective.

Net: I concede the placements (all ruled — hypnotize full power at L8
§3.H, tiered MP at L8 §2, score-tiebreaker-everywhere from L8,
Skylight one-way Level-owned; no plane-affinity §4d; no card reliance
§4f). I ratify the carried-forward merged-L6 state byte-identical
(POST-occupation Step-Landings + sortie doctrine, plane-switch full
coverage, plane-affinity, recruit-as-order). I contest exactly the
_specification shape_ and _pricing_ of the L8 delta: (a) the
**`recruit-count` target/economy tuning is the load-bearing,
§4f-compliant, AI-exercised curve lever** and the delta budget must be
spent there — not on cards (§4f), not on plane-affinity (§4d), not on a
`healingRate` co-occupation economy (§4e); (b) **hypnotize full-power
is restored to the exact pre-L5 originals** (`minControlTurns:5,
maxControlTurns:10`; `successRate 0.8` and `reboundImmunityTurns 10`
unchanged) as the escalation, but it is **bounded by the tier-3
single-slot MP pool** so it is a survivable climax, not the §4.3.3
cold-stomp; (c) **tiered MP is a real data constraint** (the binding
bound on the restore), not a placement gesture.

---

## 3. Structured summary

### Position

The L8 delta vs **merged L6** carries the L6 state forward
**byte-identical** (no plane-affinity change §4d; no card-economy
reliance §4f; no `healingRate` occupation economy §4e) and adds: (1)
the **`recruit-count` victory target/economy tuning as the load-bearing
§4f-compliant curve lever** — `victoryCondition.target`, `recruit`
`successRate`/`cooldown`, the ~8 cockroach-neutral spawn count, the
mage-recruiter survivability gate (all AI-exercised, the win condition
itself); (2) **hypnotize FULL-power restore** reverting the L5 cap to
the pre-L5 originals (`minControlTurns 2→5`, `maxControlTurns 3→10`;
`successRate 0.8` and `reboundImmunityTurns 10` unchanged) — the §3.H
designed climax; (3) **tiered MP debut** as a real data constraint
(ability `tier` fields + caster-eligibility `intelligence>=5`/`'caster'`

- per-ability `uses` caps; engine `INITIAL_MP_SLOTS {4,2,1}` frozen) —
  the tier-3 single-slot pool is the binding bound that makes the
  hypnotize restore a survivable climax not a cold-stomp; within the
  Level-owned cramped clipped-ceiling box-maze geometry, 6 POSTs, and
  one-way Skylight transit.

### Faction impact

The `recruit-count` race tuning is what makes L8 a _game_ rather than
either a cold-stomp or a free win: it is the win condition both AIs
act on every turn (§4f-robust, the structurally-sound mission lever, in
the §4f-preferred class). The hypnotize full-power restore is the
visible escalation — the spiders weaponize the very cockroaches the ant
is racing for, against the queen. The tier-3 MP bound is the answer
that keeps the escalation survivable (one big seizure per caster, not
unlimited). Specified this way the dip is carried by AI-exercised
levers; specified as a card rebound or a plane-affinity stat it is the
§4f / §4d dead letter that measures inert and reopens.

### Win-rate prediction

L6 lands ~56% (the merged-L6 ruled anchor; the L6 arbitration band
53–57 taken at its upper edge for the monotone-down reasoning). **L7 is
PARKED — a known curve gap, NOT interpolated.** L8 **continues the
decisive descent**: I predict the **~50–54% band, settling ~52%** — a
clean monotone drop below L6 56, separated above the L10 ~50 finale.
Driver: the `recruit-count` race under full-power hypnotize is a
genuine coin-flip race — the dominant **−4 to −6pp ant** vs the L6
anchor (the spider now actively flips the prize neutrals against the
queen, no turtle/score escape). The hypnotize full-power restore is the
escalation _engine_ of that swing; the tier-3 MP bound + target tuning
is the _ceiling_ that holds it at hardest-but-fair ~52% rather than
overshooting into a sub-40% cold-stomp wall. `recruit-count` +
dual-loss is the structural tax, already priced in. **No plane-affinity
contribution (§4d: ~0pp, not budgeted). No card contribution (§4f:
inert under the locked card-host heuristic, not budgeted).** Net ~56%
− (4 to 6) + (bounded by the MP/target ceiling) ≈ **~52%**, the
continued decisive descent, monotone below L6, separated above L10 ~50.

### Interest claim

L8 teaches _commitment under a no-turtle clock_: out-recruit the
spiders or lose your mages and lose — there is no POST to grind, no
score to stall into. The hypnotize-restore is the legible escalation
(the mechanic met at L5, turned to full power, weaponizing the prize
roaches against the queen); the answer is in hand and structural (the
race tuning, the one-big-cast MP bound, screening the queen). The
descent to ~52% is the spiders becoming the deadliest version of
themselves at the room built for the race — the user's licensed "hard
level before the end," difficulty _visible_, answer _structural_. Not a
card economy that can't fire (§4f), not a stat the AI ignores (§4d).

### Convergence

All placements **conceded** (ruled: hypnotize full power at L8 §3.H;
tiered MP at L8 §2; score-tiebreaker-everywhere from L8; Skylight
one-way Level-owned; **no plane-affinity delta §4d; no card-economy
curve reliance §4f; no `healingRate` occupation economy §4e**).
Carried-forward merged-L6 state **ratified byte-identical**. Residuals
the arbiter must fix in data: (1) the **`recruit-count` target/economy
values** as the load-bearing §4f-compliant lever (target,
recruit-successRate/cooldown, cockroach spawn count, recruiter gate);
(2) the **exact hypnotize full-power restore values** (revert L5 cap to
pre-L5 originals `minControlTurns:5/maxControlTurns:10`; successRate /
rebound unchanged); (3) **tiered MP as a real binding constraint**
(tier-3 single-slot bound on the restore, not a gesture). Residual is
pricing the curve resolves objectively: the recruit-race + hypnotize
restore is the dominant engine of the continued descent; the MP bound +
target tuning is the ceiling that holds it at hardest-but-fair ~52%,
monotone below L6 56, separated above L10 ~50, L7 a parked gap.
