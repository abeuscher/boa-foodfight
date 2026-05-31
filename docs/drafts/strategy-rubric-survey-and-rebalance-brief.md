# Strategy rubric survey + rebalance brief

**From / To / Status:** Dev (Gameplay) → PM / **Survey + proposal.**
Triggered by PM playtest note ("strategy is not available inside of
battle ... a rebalance may be worth looking at ahead of [L2 push]").
Filed for PM ratification before any code lands; this is the planning
piece, not the implementation.

**Stance:** Phase B's L1→L2 plumbing is shipped (B1–B5). The
**reassess gate** between B5 and L3+ work is the right slot for this:
PM's stated concern is "did we even have a strategy rubric?" — answer
below — and the rebalance loop the answer implies. Do this before
pushing further into L2 + L3.

---

## 1. PM directive (verbatim)

> There is a sense here that strategy is not available inside of
> battle, and I think there are several pieces to that. But along
> with the view that we have on deck, I think a rebalance may be
> worth looking at ahead of that and naming the outcomes we want in
> terms of playability, fun, and did we have a strategy rubric? Or
> was that folded into fun? I want to look at these evaluators and
> essentially provide some feedback and attempt to rebalance
> slightly. I do not mind if this does not happen immediately but I
> think it may need to come before we advance further toward L2.

Earlier in the same playtest thread (filed inline at chunk-25
exchange), two specific metrics were proposed:

> The percentage of battles where neither side is entirely killed.
> And maybe another measure of how many battles end with each party
> above 50% health left per soldier... There are too many battles
> that feel like they are ending on a dice roll and they too often
> end in one side getting completely wiped out. I think we might
> want to introduce turn limits per battle or maybe conditionally
> enforce that?

This brief responds to all of that as one piece.

---

## 2. Survey: what we measure today

Five surfaces grade the game today. Two are deterministic
(numerical), two are LLM-driven, one is a designer charter (not a
grader). Verbatim from source:

### 2.1 `critics/metrics.ts` (deterministic)

- **win-rate-target** — ant win rate in `[55%, 65%]` for the locked
  baseline against current spider AI.
- **decisive-outcomes** — timeouts ≤ 20% of runs.
- **progress-stalemate** — flags when every run ends with ants
  holding the same POST count (one POST never captured).

### 2.2 `harness/critic-interest.ts` (deterministic, "is this fun

to watch")

Five axes, each 0–100, then averaged into a composite:

- **actionDensity** — events per turn (5/turn = 50, 10/turn = 100).
- **battleDrama** — average rounds per battle (1 round = 0, 4 rounds
  = 100). 1-round wipes are boring; 4-round attrition is dramatic.
- **abilityVariety** — distinct ability ids fired per replay (0 → 0,
  6+ → 100).
- **outcomeArc** — binary: did both sides act (≥ 2 attacker AND ≥ 2
  defender actions in the median battle).
- **liveTurnRatio** — fraction of turns that emitted ≥ 1 non-turn-
  start event.

### 2.3 `critics/fun-rubric.md` (LLM-judged Fun Critic)

Six criteria:

1. **Win-rate band** ([55%, 65%]).
2. **Strategy diversity** — ≥ 3 of 4 variants (baseline / rush /
   turtle / flank) at ≥ 40% win rate each.
3. **Composition diversity** — different rosters viable, no single
   dominant stack.
4. **Outcome credibility** — wins feel earned, losses feel
   outplayed.
5. **Tactical variety per replay** — distinct phases, abilities,
   formation/posture/jelly interactions.
6. **Watchability** — reading 10 replays in a row stays interesting.

### 2.4 `critics/designer-rubric-strategy.md` (NOT a critic — a

designer charter)

This is the prompt the strategy designer agents (`ant-strategy`,
`spider-strategy`) receive in the coevolution loop. They propose AI
policy code with a ≥ 2-existing-system-interaction rule. **It does
not evaluate the game.** The closest thing to a "strategy rubric"
in the repo is misnamed for what it is.

### 2.5 `docs/playability-critic-rubric.md` (LLM-judged Playability

Critic)

Four criteria: legibility, operability, sufficiency of information,
pacing fitness. **UX-focused, not tactical-depth-focused.** Grades
whether the player can read and act, not whether the game has
strategic depth.

---

## 3. The honest answer to "do we have a strategy rubric?"

**No.** The closest things are:

- Fun Critic's **strategy diversity** axis — which is about variant
  win-rate spread, not in-scenario tactical depth.
- Fun Critic's **tactical variety** axis — which is the one that
  _should_ cover PM's concern, but it's a single LLM judgment with
  no quantitative anchor.
- `critic-interest`'s **battleDrama** and **outcomeArc** —
  proxies for "the battle was a fight, not a wipe," but they
  measure rounds-per-battle and "did both sides act at all," not
  the specific outcomes PM flagged (no-wipe rate, HP-above-50%).

**The PM's two flagged metrics are not measured anywhere today.**
That's the gap, plain.

---

## 4. The strategy-in-battle question (what does it actually mean?)

The engine resolves battles atomically. There are **no in-battle
player decisions** — once two parties collide, the engine plays out
3–5 rounds of agility-ordered attacks and returns a `BattleResult`.
The player's "battle strategy" is entirely **pre-battle**:
composition, leader, formation, posture, position, ability
pre-loading (jelly, mend).

So "strategy in battle" really means: **"did the player's pre-
battle choices visibly steer the outcome, or did the engine roll
dice on them?"** A game where 75% of battles are total wipes
regardless of setup has no strategy in battle — your setup didn't
matter. A game where setup determines whether you take 20% or 80%
casualties has strategy in battle — your setup did matter.

That diagnosis lines up cleanly with PM's two metrics:

- **Survival rate** (% battles where neither side is wiped) — a
  proxy for "the outcome wasn't decided by the dice draw."
- **Healthy-finish rate** (% battles where survivors end > 50%
  HP/soldier) — a proxy for "the battle was a fight, not a
  rout."

If both numbers are low, setup didn't matter — the engine just
crushed someone. If both are high, setup mattered enough to keep
fights survivable on both sides.

---

## 5. Proposal: extend Fun Critic, don't add a new critic

Three reasons:

1. **Strategy diversity** and **tactical variety** are already in
   Fun's scope. Adding "tactical depth in battle" is a natural
   neighbor.
2. A separate "strategy critic" would duplicate orchestration,
   findings JSON, and the LLM-vs-deterministic split. The coevo
   loop already routes Fun findings to designer agents.
3. The two new metrics are deterministic — they belong in
   `critic-interest` (programmatic) and surface in `fun-rubric`
   as criteria the Fun Critic must call out when they go below
   thresholds.

### 5.1 New deterministic axes for `critic-interest.ts`

- **survivalRate** — `1 - (wipes / battles)` where a `wipe` is a
  battle where one side ends with zero living units.
  - Scale: 0% = 0, 50% = 100. (i.e. if half of battles are
    non-wipes, that's a strong signal.)
  - Source: `BattleResult.attackerCasualties.length` /
    `defenderCasualties.length` vs participants per side.

- **healthyFinishRate** — `% of battles where each side has an
average remaining-HP-per-living-unit > 50%`.
  - Strictly: for non-wipe battles only, both sides' surviving
    units avg above the threshold.
  - Scale: 0% = 0, 70% = 100.
  - Source: `result.participants[]` start HP minus `actions[].damage`
    accumulated, against `maxHp`.

- **wipeRate** — the inverse `wipes / battles`. Logged as a finding
  when above 60% (signal: combat too lethal).

### 5.2 New criterion in `fun-rubric.md`

Add to §"What to grade":

> 7. **Combat survivability** — programmatic axes computed by
>    `critic-interest`: `survivalRate` ≥ 40%, `healthyFinishRate`
>    ≥ 30%, `wipeRate` ≤ 60%. The Fun Critic flags when any of
>    these breaches the band, naming the typical combat shape
>    (one-shot one-kill, attrition wipe, attrition survival)
>    seen in replays.

The Fun Critic re-flags these because they bake into "outcome
credibility" and "tactical variety" — but having explicit numerical
thresholds gives designer agents concrete targets.

---

## 6. Levers the rebalance can use

PM proposed two: per-battle round caps, conditionally enforced. The
full menu of plausible levers, from least to most invasive:

### 6.1 Engine tuning (data-only, designer-agent fair game)

- **Battle round count distribution.** Today: 3–5 rounds drawn
  uniformly (`engine/combat.ts:decideRoundCount`). Lowering to 2–4
  reduces total damage; raising to 4–6 lengthens. **Direct knob for
  survivability.**
- **HP inflation** across templates. Bigger pools → slower kills →
  more rounds spent above 50% HP.
- **Attack deflation** or armor inflation. Same effect from the
  other side. Already a coevo lever.
- **Retreat threshold tuning.** Engine has flee orders (R15/R16);
  the retreat-on-low-HP threshold could fire earlier so a losing
  side disengages before being wiped. Data-driven if the engine
  exposes it; otherwise an engine micro-change.

### 6.2 Engine semantics (engine change, gate-29 implication)

- **Hard per-battle turn cap with disengagement.** When a battle
  reaches N rounds with no decisive outcome (e.g. both sides ≥ 25%
  HP), forced disengagement: both parties step back to their
  pre-battle tile, no further damage. **PM's "turn limits per
  battle" — this is the engine-side implementation.**
- **Conditional cap.** Cap only applies in specific contexts
  (terrain, posture, scenario type). PM's "or maybe conditionally
  enforce that." Examples:
  - Cap fires for `escort` scenarios (L2) so Aunt Ant can't get
    pinned in a 5-round wipe.
  - Cap doesn't fire when a leader has died (the death scene gets
    its full arc).
  - Cap fires lower (3 rounds) when both sides are at ≤ 40% HP
    going in.

Both of these are gate-29 disruptive — they change AI-vs-AI
deterministic outcomes. Would require a baseline re-measurement
before lock.

### 6.3 Composition / scenario design (Level-PA fair game)

- **Roster size tuning** — fewer units per party = faster fights
  but also less attrition headroom.
- **Reinforcement scheduling** — partial wipe + reinforcement
  → survival.

---

## 7. Proposed sequence (PM-ratifiable)

If PM ratifies this brief, the work splits into three chunks. None
gating each other strictly, but the natural order:

### Step 7.1 — Instrument (small code chunk)

Add `survivalRate`, `healthyFinishRate`, `wipeRate` to
`harness/critic-interest.ts`. Update `critics/fun-rubric.md`'s
"What to grade" to include criterion #7. Run a measurement pass on
the current L1 baseline + L2 baseline. **Output: current numbers.**

### Step 7.2 — Baseline read + finding

Run the Fun Critic against the current build with the new axes.
Read the findings. **Decide whether the numbers are bad enough to
justify a rebalance round.** If `survivalRate` is already 60%+ and
`healthyFinishRate` is 40%+, the perceived "too many wipes" is
about pacing/legibility, not combat math — and we redirect to UX.
If those numbers are bad (survivalRate < 30%, wipeRate > 70%), the
rebalance is justified.

### Step 7.3 — Rebalance round (if Step 7.2 justifies)

Open a coevolution round with the new criterion in the Fun rubric.
Designers propose under the ≥ 2-interactions rule against the band
[55%, 65%] win rate AND the new survivability thresholds. Apply
gate as today: typecheck + tests + win-rate band + diversity
floor + survivability floor. Roll back failures.

For the engine-side levers (§6.2): those would need an explicit
PM ratification and a gate-29 re-baseline. Hold them as the
second-round move if data-only tuning doesn't get survivability
above target.

---

## 8. Sequencing against the L2 reassess gate

PM said "may need to come before we advance further toward L2."
Phase B's plan brief named the reassess gate after B5 closes —
that's now. **This brief slots cleanly into the reassess gate:**

- B5 (client save) is open as PR #93 (or merged by the time this
  brief is read).
- The reassess gate's output is a "what surprised us?" list driven
  by playtest.
- The combat-survivability question is one of those surprises.
- This brief becomes the **first item out of the reassess gate**
  if PM ratifies; the battle-screen overlay (Chunk 27) is the
  second.

Alternative: if rebalance findings show no surprise (Step 7.2
returns "we're already in band"), the brief closes without code
and we proceed to the battle-screen overlay + L3 routing.

---

## 9. What this brief does NOT decide

- **Whether to implement the engine-side turn cap (§6.2)** —
  that's a separate PM call after we see Step 7.2's numbers.
- **Whether to add a separate "Strategy Critic" or fold into Fun.**
  Recommended fold (§5); PM can reject in favor of a dedicated
  critic if the diversity of concerns grows.
- **Specific stat tuning targets.** Designers propose; we gate.
- **The mobile-mortal queen question** (shelved per Chunk 22).
  Still shelved.

---

## 10. PM decision asked

1. **Ratify the survey** (§2-§3) — agree there's no strategy rubric
   today and the gap is real?
2. **Ratify the proposal** (§5) — extend Fun + add deterministic
   axes to `critic-interest`?
3. **Ratify the sequence** (§7) — instrument first, baseline read,
   then decide on rebalance?
4. **Ratify the sequencing** (§8) — this is first out of the
   reassess gate, before battle-screen overlay or L3?

A yes/yes/yes/yes opens Chunk 31 (the instrument step). A no on §5
means we design a dedicated Strategy Critic. A no on §8 means we
sequence after the battle-screen overlay.
