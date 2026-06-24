# Combat-rework Phase 2 brief — recovery primitives that unlock the break-off branch

**From / To / Status:** Dev → PM / Draft for ratification.
**Stance:** Phase 1 (C-1 engine + C-2 measure) landed clean: the
break-off branch and home-heal events are wired, tested, and gated
on stable seed sweeps. The Phase-1 measurement baseline
(`harness/combat-phase1-measure.ts`, 5 seeds) confirms the
prediction in C-1's commit notes: **spider-break-off fires 0 times
at baseline**, because spider parties either barely scratch their
opponent (50% of battles, <10% HP loss) or wipe outright (31% of
battles, >75% loss). The bimodal collision distribution leaves no
"wounded but alive" state for the break-off branch to trigger on.

Phase 2's mandate, then: **add recovery primitives that keep
spider parties in the 25-75% HP-loss band long enough for them to
disengage rather than wipe.** This brief proposes three mechanics
ranked by my recommendation, with concrete numbers and tradeoffs,
and asks PM to lock the composition for the next implementation
chunk (C-4).

---

## 1. Where Phase 1 landed (the C-2 baseline)

From `pnpm measure:combat-phase1` over seeds 1-5:

| Accumulator                          | Baseline value                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Collision distribution (ant side)    | 50% trivial (0-10%), 3% (10-25%), 16% (25-50%), 0% (50-75%), 31% wipe (75-100%) |
| Collision distribution (spider side) | 53% trivial, 3% (10-25%), 9% (25-50%), 3% (50-75%), 31% wipe (75-100%)          |
| Pairs that re-attacked (≥2 battles)  | 0.6 / seed (mean gap: 1 turn)                                                   |
| Units lost                           | ant 14/seed, spider 10.4/seed                                                   |
| home-heal-applied events             | 5.8 / seed (~24 HP healed)                                                      |
| spider-break-off events              | **0 / seed**                                                                    |

The 50-75% bucket is the **target band**. A battle that lands a
spider party there is one where (a) the party survives, (b) it
takes enough damage to clear the `BREAKOFF_HP_FRACTION = 0.25`
threshold, and (c) it has somewhere to retreat to (home-heal is
already wired). Today, almost no battle lands in that band. Phase
2 needs to widen it.

## 2. What "extending spider lifetimes" means in the engine

Two distinct intervention points:

- **Pre-battle padding** — boost the participating party's HP
  before the swing resolves, so the same damage lands at a
  survivable fraction of max HP. Healing-on-tick (aura, passive)
  is one shape; healing-on-demand (medic ability, used at start
  of turn) is another.
- **Post-battle restoration** — bring back units that died in a
  battle they otherwise survived. Resurrect is the obvious shape;
  C-1's home-heal is the existing post-battle-on-march primitive.

The three mechanics below cover both axes. (A) and (B) are
pre-battle; (C) is post-battle.

## 3. Three mechanics (ranked)

### A. Spider Mender — mobile medic unit (recommended)

A new spider unit template, `spider-mender`, that travels in any
combat party. Carries a Phase-2 ability `spider-mend` modeled on
the existing ant-queen `mend` (heal 6 HP, 3 uses, cooldown 1) but
tuned for the spider side's role: smaller heal, more uses, so the
effect is "steady patching" rather than "burst tank-up."

**Proposed numbers** (locks below in §5):

- `spider-mender` unit: HP 10, attack 2, agility 3, armor 1, slot
  cost 1, movement `climbing`. A fragile but cheap support unit.
- `spider-mend` ability: heal 4 HP to own-party, 4 uses, cooldown 2,
  tier 2, category `buff`. Roughly 16 HP of healing per scenario
  per mender — enough to keep one wounded ally above the wipe
  threshold for 1-2 extra exchanges.
- Deployment: one mender attached to the spider-l1 web-guard
  party at scenario start (scenario data delta only — no engine
  change for placement). A second mender on a roaming raid party
  is optional.

**Why I recommend this.** Mirrors the existing ant-queen `mend`
pattern (engine support for the ability already ships), single new
unit-template (low data risk), and the mender's fragility (HP 10,
no attack output) keeps the spider attack ceiling untouched — it
shifts the **distribution** of fight outcomes without making
spiders strictly stronger.

**Tradeoffs:**

- Adds a new unit template — requires `units.json` + roster +
  scenario data work + a sprite/icon in the client.
- C-2's recovery accumulator (`home-heal-applied` count + HP)
  needs a sibling counter for mend usage. Cheap addition.
- AI integration: spider-l1 must prefer to keep mender-bearing
  parties away from the front line. New constraint for the spider
  AI policy (medium implementation cost).

### B. Web-Mend aura — passive heal-tick on spider-spinner

Extend the existing `web-mend` passive (Spider Queen self-heal
+1/turn when HP < 50%) to a new variant `web-mend-aura` on the
existing `spider-spinner` unit. Passively heals adjacent
same-faction parties by `webMendRate` HP/turn at end-of-turn,
no ability use required.

**Proposed numbers:**

- `web-mend-aura` passive on `spider-spinner`: heal 1 HP/turn to
  adjacent (Chebyshev 1) friendly spider parties, no cap, no
  cooldown.
- Optional: cap at "wounded only" (target party HP < 75% of max)
  to avoid free top-up on already-healthy parties.

**Why this is appealing.** Zero new unit templates — spider-spinner
already exists and is already tagged `support`. The passive
mechanic precedent (`web-mend` on queen) means the engine plumbing
is partly there; this is "open the existing passive to multi-party
targeting." Heal rate is steadier than (A) — pushes more battles
toward the 25-75% band by tick-up rather than burst.

**Tradeoffs:**

- Weaker effect per turn. May not move the bimodal distribution
  by itself; C-2 might still show >70% of battles in the trivial-
  or-wipe buckets after this.
- Range-check infrastructure needed: end-of-turn passive needs
  to look at adjacent friendly parties, which is a new query
  shape vs the existing self-heal.
- Composability with (A): if both ship together, ant balance
  shifts noticeably. We'd need to re-baseline gate-29.

### C. Resurrect — Spider Queen single-use ability

A new spider-queen ability `queen-resurrect` (one use per
scenario, no cooldown — single-shot). Reattaches the most-recently-
killed spider unit to the queen's party at 50% of its max HP.
Cinematic / emotional moment rather than a steady-state lever.

**Proposed numbers:**

- 1 use per scenario, tier 3.
- Resurrect targets the most-recent `unit-died` event with
  `faction === 'spider'` that hasn't already been resurrected.
- Restored HP = floor(maxHp / 2).
- New ReplayEvent `unit-resurrected { partyId, unitId, hp }`
  (mirrors the home-heal-applied event shape, surfaces for the
  measurement harness).

**Why this is appealing.** Strong narrative beat (the spider
queen rebuilds her army from corpses), engine-light (reuses the
killed unit's stats), and gives the spider side a "comeback"
moment that the ant medic doesn't have an equivalent for.

**Tradeoffs:**

- Doesn't change the per-battle HP-loss math — a resurrected
  unit shows up on a SUBSEQUENT battle, not the one it died in.
  Won't move the C-2 collision-distribution bimodality.
- Requires unit-id liveness tracking for "last-killed spider"
  across the turn boundary. Modest engine work.
- Binary moment vs steady pressure — useful for drama, less
  useful for measurement.

## 4. Recommended composition for Phase 2

**Ship A only as the C-4 implementation chunk.** Re-run the C-2
measurement script after; expect:

- Collision distribution: 50-75% bucket rises from 0-3% toward
  ~10-15% (the band the mender's 16 HP/scenario can push battles
  into).
- spider-break-off events: 0 → ~2-4/seed (the goal — every
  break-off event is the C-1 branch firing as designed).
- home-heal-applied count: probably rises (more wounded
  spider parties returning home).

If the post-A measurement still shows >70% of battles in the
trivial-or-wipe buckets, ship **B as C-5** (lower-cost
modification, low risk, additive). C is deferred to Phase 3 — it
addresses a different design need (narrative beat) and deserves
its own brief.

## 5. What I'm asking you to decide

1. **Mechanic composition.** A only / A+B / A+B+C / hybrid /
   different ranking.
2. **Numbers for A.** Heal-per-use (proposed 4), uses (proposed 4),
   cooldown (proposed 2). All three are tunable knobs against
   the C-2 baseline; the proposed values are deliberately
   conservative to leave headroom.
3. **Re-baseline target.** What change in C-2's
   `spider-break-off events` counter is "Phase 2 worked"?
   I'm proposing **≥2 break-offs / seed averaged across the
   5-seed sweep** as the success line. If it's lower, Phase 2
   underdelivered; higher, we may need to re-tune
   `BREAKOFF_HP_FRACTION` upward to keep the break-off branch
   from over-firing.
4. **L1 scope.** All three mechanics are L1-only as proposed.
   L2+ may want different tuning. Confirm L1-only or call out a
   forward-compat constraint.

Once locked, C-4 ships A (engine + AI + data) and re-runs the
C-2 measurement script. Phase 2 closes the moment the
break-off / re-attack / recovery counters land in the target
band — same closure shape as Phase 1.

---

_Reference: C-1 implementation (`engine/battle.ts`, `ai/spider-l1.ts`),
C-2 baseline (`harness/combat-phase1-measure.ts`), engagement-density
brief (`docs/drafts/engagement-density-brief.md`)._
