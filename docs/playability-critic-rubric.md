# Playability Critic rubric

**Status:** RECORDED — authoritative forward spec. Synthesized from the
design-session draft + the coding-agent engineering reconciliation +
the human's decisions. Stored now so it exists when the UI phase
begins; it is **not active before then** — every criterion is dormant
until its activation gates are met (see "Status and activation
gates"). Companion to `docs/design-memo-ui-cube-view.md` and
`docs/design-memo-pacing-and-turn-cap.md`.

Authoritative rubric for the Playability Critic agent. The orchestrator
passes this verbatim into the agent's prompt when invoking it. Update
here, never inline.

## Status and activation gates

This rubric is a **forward spec**. The substrate it grades does not yet
exist. Specifically:

- The cube-view interface (`docs/design-memo-ui-cube-view.md`) is a
  locked-but-unbuilt interaction model.
- The pacing / stalemate model (`docs/design-memo-pacing-and-turn-cap.md`)
  is designed but its OPEN agenda (§D) is unresolved and the stalemate
  detector / `timeCap` interface is unbuilt.
- An LLM-based player-agent harness — the thing that can articulate
  state-beliefs, answer functional-clutter questions, and learn from
  a tutorial — does not exist. The existing deterministic baseline /
  designer variants are policy functions and cannot serve this role
  (see "Two loops, two agent types" below).
- A tutorial design document does not yet exist as a separate artifact;
  L1 plays the tutorial role today by spec, but onboarding-as-designed
  is deferred per the cube-view memo §D.

**Activation gates per loop and per criterion are listed below.** Every
criterion is dormant by default and activates only when its gates are
met. The orchestrator should treat any criterion whose gates are unmet
as "dormant — awaiting [gate]" and not produce or request traces for it.

| Criterion                         | Activation gate                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Legibility                     | Cube view built + LLM player-agent harness exists                                                                                                                                                                                                                                                                                                                                                                                |
| 2. Operability                    | Cube view built + a harness that drives the real cube-view interaction primitives (select / two-click order / peripheral rotation) so interaction errors are observable. A deterministic policy agent may _drive_ it, but a raw policy function emitting engine orders does NOT satisfy this gate — the harness must exercise the click/rotate/select layer where mis-rotations and wrong-destination clicks can actually occur. |
| 3. Sufficiency diff               | Cube view built + LLM player-agent harness exists + full-info reference run available (see "Comparison protocol" under criterion 3)                                                                                                                                                                                                                                                                                              |
| 4. Pacing fitness                 | Pacing controls + auto-pause built + player-agent harness exists + harness exposes a `pause_requested` affordance with trace logging                                                                                                                                                                                                                                                                                             |
| 5. Clutter                        | Cube view rendered to a form the LLM player-agent can parse                                                                                                                                                                                                                                                                                                                                                                      |
| 6. Stalemate / outcome legibility | Stalemate-terminal decided (currently OPEN in pacing memo §D) AND built AND opted-in for the scenarios being graded                                                                                                                                                                                                                                                                                                              |
| 7. Learnability (naive loop)      | Tutorial design document exists + LLM naive player-agent harness exists + at least two tutorial variants available for delta measurement (see criterion 7)                                                                                                                                                                                                                                                                       |

## Mandate

The Playability Critic complements the interest critic
(`harness/critic-interest.ts`, the §9 ship-gate scoring
density/drama/variety/arc/live) by judging whether the new player-facing
UX systems work for a human player driving the game through the
interface. The interest critic grades whether the _game_ is interesting
when watched as agent-vs-agent replays. The Playability Critic grades
whether the _interface and pacing_ let a player operate the game well.

(Note on naming: earlier docs reference a "Fun Critic." In current
practice this is the interest critic. If a distinct Fun Critic is later
built, this rubric needs reconciliation; for now, "the interest critic"
is the operative sibling.)

The two critics are deliberately separate: a game can be tactically rich
and still unplayable; an interface can be elegant and present an
uninteresting game. Both need to clear their respective bars.

This critic operates against **two player-agent loops**, run separately
when their respective gates are met.

## Two loops, two agent types

The rubric's earlier confusion of agent types is resolved here: the two
loops use different agents producing different traces, and the criteria
divide accordingly.

**Loop 1 — competent player.** A player agent restricted to the
information the cube view exposes, playing scenarios the full-information
baseline has already cleared. Two sub-modes:

- _Deterministic-restricted mode._ An existing policy agent (baseline /
  designer variant) wired to consume only cube-view-exposed state,
  driving the interaction layer through a harness that exercises the
  real select / two-click / rotate primitives. Produces order-event
  and pause-event traces. Cheap. Suitable for criterion 2 and the
  order/pacing portions of 3 and 4. Cannot produce state-beliefs or
  answer questions.
- _LLM-restricted mode._ An LLM-based player agent given the same
  restricted state, asked to articulate its belief about game state at
  decision points and answer functional-clutter questions on demand.
  Required for criteria 1, 5, and the belief-driven portions of 3.

**Loop 2 — naive player.** An LLM player agent with no prior knowledge
of the rules, given access only to the tutorial and the interface. Used
only for criterion 7. Dormant until a tutorial design document exists.

## Determinism fence (non-negotiable)

LLM-based player agents are non-deterministic. The project's gate-29
byte-identity baseline, replay reproducibility, and the coevolution
loop all depend on engine determinism. Therefore:

- The playability loops run in a **separate evaluation harness**,
  fully outside the gate-29 / coevo deterministic path.
- Playability sessions **cannot feed** the replay baseline, the
  byte-identity check, or any deterministic measurement consumed by
  the within-scenario or progression-agent loops.
- Findings produced by this critic are advisory inputs to the
  orchestrator, never inputs to the engine or the locked AI paths.
- The deterministic-restricted sub-mode of Loop 1 is still
  deterministic per-seed and could in principle be incorporated into
  deterministic measurement, but is not part of this critic's output
  pipeline — keep the fence clean.

This is non-negotiable. The orchestrator must not wire playability
traces into any path where engine determinism is load-bearing.

## What to grade

1. **Legibility.** _Gate: cube view built + LLM player-agent harness._
   At any paused moment during a session, can the LLM player agent
   identify the relevant game state from the interface alone? This
   includes: locations of all visible parties (own and enemy), POST
   ownership and capture progress, threats to the queen, available
   orders for the selected party, current pacing state, and any active
   scenario-specific conditions (escort target health on L2,
   eradication progress on L6, recruit count on L8, **and — post
   dep-#9 — the income/ownership/contest state of a `goldPerTurn`
   economy POST where one is present**).

   **Reference for divergence.** The critic compares the player
   agent's stated belief against **what the cube view was meant to
   convey at that frame**, not against full engine state. Hidden
   information (fog of war, peripheral-face occlusion, intentional
   restriction) is working-as-designed; the agent failing to know it
   is not a legibility failure. Only divergence between belief and
   cube-view-exposed state is graded. The critic identifies which
   interface element should have surfaced the missing or
   mis-surfaced information.

2. **Operability.** _Gate: cube view built + a harness driving the real
   interaction primitives (per the gate table — a raw policy function
   emitting engine orders does NOT suffice; the click/rotate/select
   layer must be exercised)._ Can the player agent execute the order
   it intends? Does the two-click command model (party → destination)
   produce the intended order without error? Does peripheral-face
   rotation behave predictably? Are pacing controls (play/pause,
   speed, auto-pause) responsive and unambiguous? The critic counts
   and characterizes operational failures: mis-rotations, unintended
   deselects, orders issued to wrong destinations.

3. **Sufficiency of information (full-info vs. restricted diff).**
   _Gate: cube view built + LLM player-agent harness + full-info
   reference run._ This is the load-bearing measurement for the
   competent-player loop when fully active.

   **Comparison protocol.** The canonical comparison is the _same
   LLM_ run under two information regimes on the _same seed_: once
   with full engine state (`full-info-llm`) and once restricted to
   cube-view-exposed state (`restricted-llm`). Any decision delta
   between the two is then purely the information difference, with
   the LLM's general decision-making held constant. A deterministic
   policy baseline may be reported as a secondary reference but
   **must not** serve as the primary full-info comparator — that
   conflates "interface restriction" with "LLM vs. policy" and
   inflates the (c) attribution bucket.

   Where the restricted agent makes a worse decision than the
   full-info agent, the critic identifies whether the cause is:
   - (a) information the interface failed to surface,
   - (b) information the interface surfaced but at the wrong moment
     or with insufficient salience,
   - (c) a genuine reasoning failure unrelated to the interface.

   Only (a) and (b) are interface defects. (c) is logged but does not
   generate a finding against the UX.

   **(c)-attribution discipline.** Distinguishing (c) from (a)/(b)
   requires judging decision quality, which is the interest critic's
   territory, not this critic's. To stay disciplined: when (c) is
   plausible — i.e., when the restricted agent had access to enough
   information to make the better decision but didn't — the critic
   must **abstain** rather than file a finding. The decision is
   logged for the orchestrator's record but not graded against the
   interface. Findings are only filed when (a) or (b) can be
   established by pointing to specifically-missing or specifically-
   poorly-surfaced information.

4. **Pacing fitness.** _Gate: pacing controls + auto-pause built +
   player-agent harness + harness exposes a `pause_requested`
   affordance._ Do auto-pauses fire on the events the pacing memo
   specifies (party idle, combat, newly-visible spider, queen
   damaged, scenario milestone)? Does the agent want to pause at
   moments the system doesn't auto-pause for? Are there speed
   settings (0.5/1/2/4x) at which decision quality measurably
   degrades? Does the default-paused-on-scenario-start behavior give
   the agent enough time to orient before the first turn elapses?

   **Pause-want elicitation.** The harness must expose a
   `pause_requested` action the LLM-restricted agent may emit at any
   time, with each request logged to the session trace as
   `{ turn, requested_at_ms, reason }`. The auto-pause subsystem
   continues to fire on its configured triggers; the two streams are
   reconciled in scoring as precision (auto-pause fires where the
   agent wanted one) and recall (agent requests preceded by no
   auto-pause within a tolerance window). Without the
   `pause_requested` trace, the "agent wants to pause but system
   doesn't" check is unmeasurable and the criterion runs at reduced
   coverage — flag this in `activation_state`.

5. **Clutter and cognitive load.** _Gate: cube view rendered to a
   form the LLM player-agent can parse._ Two checks, run together:
   - **Functional clutter test.** For sampled paused frames, the
     critic asks the LLM player agent specific questions about game
     state from that frame alone ("which of your parties is closest
     to a capturable POST?", "is the queen currently threatened?").
     Failure to answer reliably indicates the interface is
     functionally cluttered for that question, regardless of how it
     looks. The critic reports which questions fail at which
     scenarios and which interface elements are implicated.
   - **Heuristic density check.** Count of distinct visual elements
     per face, count of simultaneous text labels in the right rail,
     count of overlapping markers on the active face. Crude but
     objective; catches gross failures the functional test might miss.

6. **Stalemate and outcome legibility.** _Gate: stalemate-terminal
   decided (currently OPEN in pacing memo §D) AND built AND opted-in
   for the scenarios being graded._ The pacing memo records that
   stalemate as a third outcome is decided in principle but the scope
   (L2+ uniformly vs. only some levels), detector predicate, N
   threshold, and two-dimensional curve redefinition are all OPEN.
   Until those are resolved and the mechanic is built and opted-in
   per scenario, this criterion is dormant.

   When active: does the interface communicate the _approach_ of a
   stalemate to the player — does the player agent register the
   inactivity detector firing toward termination with enough warning
   to act? Does the end-of-scenario presentation distinguish
   ant-win, spider-win, and stalemate clearly? L1 remains exempt
   from the stalemate-terminal per the pacing memo §A.3; the critic
   does not flag L1 against this criterion regardless of activation
   state.

7. **Learnability from the tutorial (naive-player loop).** _Gate:
   tutorial design document exists + LLM naive player-agent harness
   exists + at least two tutorial variants available._ Once active,
   the naive-player loop runs L1 and L2 and the critic grades two
   distinct things:
   - **Learning curve through L1/L2.** How quickly and how cleanly
     does the naive agent acquire the rules from the tutorial alone?
     Measured by: turns until the agent issues its first
     legal-and-non-trivial order; turns until it correctly identifies
     the win condition; number of operational errors before
     stabilizing; and the agent's stated understanding of mechanics
     at the end of L1 and again at the end of L2. The critic
     identifies which mechanics the tutorial teaches well and which
     it leaves the agent guessing at.
   - **Transfer to L3.** The trained naive agent is then run on L3
     unaided. The critic measures whether it can play L3 competently
     given only what L1 and L2 taught it. Underperformance on L3
     relative to the competent-player baseline is attributed to one
     of: tutorial coverage gaps (rules never taught), tutorial-to-L3
     mechanic deltas the interface should have introduced but didn't
     (e.g., L3's bio-evolution debut, center-island geometry,
     4-plane reduced set), or genuine L3-specific difficulty the
     player would face regardless. Only the first two are findings
     against the UX/tutorial.

   **Variant-delta methodology.** Absolute counts (turns-to-X,
   error counts, transfer scores) are dominated by the naive
   agent's general competence and are weak signals of tutorial
   quality on their own. The primary learnability signal is the
   _delta between tutorial variants run with the same agent on the
   same seed set_. A variant that produces lower turns-to-first-
   legal-order and higher transfer is teaching better, regardless
   of the absolute level either variant achieves. The critic
   reports absolutes for context but files findings on the basis
   of cross-variant deltas. If only one variant exists, the critic
   reports absolutes and flags the criterion as
   `"under_calibrated"` — findings are not filed.

   The naive-player loop is not a test of agent general intelligence
   and must not be treated as one. If the naive agent is demonstrably
   unfit to acquire rules from any reasonable tutorial, the critic
   flags this as a setup gap and grades only the categories it can.

## Permitted recommendations

The Playability Critic may suggest changes to:

- **Cube-view rendering** — what's shown on the active face vs.
  peripheral previews, label density, marker styles, the gutter hint
  for cross-plane destinations.
- **Three-column layout** — what's in the left party roster, what
  hover detail surfaces in the right rail, how pending orders are
  confirmed or cleared.
- **Pacing controls** — speed presets, auto-pause trigger conditions,
  the default-paused behavior, how auto-pause causes are surfaced.
- **Combat panel** — overlay timing, skip-to-summary affordance, how
  front/back rows are presented.
- **Tutorial design** (once it exists) — what L1 teaches and in what
  order, what L2 introduces, how mechanics are surfaced to a player
  who has not seen them before.
- **Player-agent restriction sets** — if either restriction set
  misrepresents what a real player would see, flag it so the
  orchestrator can recalibrate.

## Out of scope

### Standard out-of-scope

- **Engine semantics, AI behavior, scenario balance.** The interest
  critic's and metrics critic's territory. If a playability defect
  correlates with a gameplay imbalance, report the interface defect;
  do not recommend gameplay changes.
- **Cube-view memo §0 / §D quarantined gameplay assumptions** —
  pre-game placement mechanics, world-loop screen scope, path-aware
  hint computation. These are UI-context speculation per the memo,
  not gameplay rulings. Do not grade against features that haven't
  been committed; flag the dependency instead.
- **Visual / art direction, animation, audio, accessibility, platform
  choice.** Deferred per cube memo §D.
- **The "one playback layer" architecture question** (cube memo §B).
- **L1 stalemate legibility** — L1 is exempt per pacing memo §A.3.

### Do not relitigate recorded decisions

Two specific traps the critic must avoid because the underlying
decisions are recorded and grounded in engine reality:

- **"No path preview" is locked** (cube memo §A.3). The engine
  pathfinds greedily per-turn; a preview would be a promise it
  cannot keep. A sufficiency-diff finding (criterion 3) of the shape
  "the player lacks route information" is **not valid** and must
  not be filed. If the restricted agent underperforms because it
  doesn't know the engine's per-turn path, that is (c) — a reasoning
  failure against engine reality, not an interface defect.
- **Recorded gameplay/engine signatures are not interface defects.**
  The following are structural realities of the engine and matchups,
  not legibility or sufficiency problems:
  - `level-progression-plan.md` §4c (capture-post score-grind /
    low-drama): a competent-defender capture-post matchup
    grinding to the cap and resolving by score is the matchup
    signature. The critic must not attribute "the player can't
    tell why nothing decisive is happening" to interface
    legibility.
  - §4d (plane-affinity inert under current AI doctrine): a
    `wall`-plane mechanic having near-zero effect is an AI-doctrine
    fact, not an interface failure.
  - §4e (occupation-`healingRate` inert under `capture-post`): the
    **`healingRate`-as-economy** lever not registering as a
    _curve/balance_ lever is an engine reality, not an interface
    failure. **Scope — balance-only, and post-dep-#9:** engine
    dep #9 added a _working_ ownership-based `goldPerTurn` economy;
    §4e indicts only the dead heal-hack, NOT all economy POSTs.
    This exclusion bars relitigating the _balance_ of the heal
    case — it does **NOT** suppress a _legibility_ finding that the
    interface fails to convey a `goldPerTurn` economy POST's
    income, ownership, or contest state. That is squarely
    criterion 1 and is **in scope**.

  Findings that read as relitigating §4c/§4d (or the §4e _balance_)
  or §A.3 are out of scope and must not be filed. If a finding feels
  like it's in this territory, default to no-finding — but a
  legibility gap on the now-real `goldPerTurn` economy is a valid
  finding, not a §4e relitigation.

## Scoring rules

The criteria above describe what to observe. This section defines how
to convert observations into the numbers in `per_session_scores` and
`batch_scores`, and the sampling discipline required for those numbers
to be trustworthy. The orchestrator parses these as machine output; the
scales must be unambiguous.

### Per-criterion scales

**Legibility.** Proportion in `[0.0, 1.0]`. Numerator: paused frames
sampled in the session where the player agent's stated belief about
cube-view-exposed state matches the cube view's contents on every
queried element. Denominator: paused frames sampled. Per-element
match counts are reported separately under `legibility_detail` so a
single mis-surfaced element type (e.g., `goldPerTurn` income) can be
identified without dragging the headline score across the floor.

**Operability.** Proportion in `[0.0, 1.0]`. Numerator: order
attempts that resolved as the agent's stated intent (intent declared
pre-attempt; resolution checked post-attempt against the engine's
received order). Denominator: order attempts. Failure breakdown
reported under `operability_detail` with counts for: `mis_rotation`,
`unintended_deselect`, `wrong_destination`, `pacing_control_misfire`,
`other`.

**Sufficiency.** Reported as a structured object, not a single
scalar. Fields:

- `decisions_compared`: count of decision points where the
  full-info-LLM and restricted-LLM differed enough to be graded
  (threshold defined by orchestrator config; default: any
  divergence in chosen order).
- `interface_caused_gaps_a`, `interface_caused_gaps_b`: counts
  attributable to (a) and (b) respectively.
- `abstained_c_plausible`: count where (c) could not be ruled out.
- `sufficiency_index`: `(a + b) / (decisions_compared - abstained)`,
  reported only if `decisions_compared - abstained >= 5`; otherwise
  `null` and `coverage_note: "under_sampled"`. Abstentions are
  excluded from both numerator and denominator because they are
  explicitly not graded; including them in the denominator would
  let high-abstention sessions look like clean interfaces.
- `abstention_rate`: `abstained / decisions_compared`. Reported
  separately. An abstention rate above 0.5 is a measurement-quality
  warning, not an interface judgment — flag for orchestrator review.

**Pacing fitness.** Reported as a structured object:

- `auto_pause_precision`: auto-pauses preceded by a `pause_requested`
  within a tolerance window, divided by total auto-pause fires.
- `auto_pause_recall`: `pause_requested` events with an auto-pause
  within tolerance, divided by total `pause_requested`.
- `speed_decision_quality`: `{ "0.5x": Δ, "1x": Δ, "2x": Δ, "4x": Δ }`
  where Δ is the sufficiency_index measured at that speed minus the
  sufficiency_index measured at 1x (1x is by definition 0).
- `startup_orientation_adequate`: boolean; did the
  default-paused-on-scenario-start window precede the first
  non-trivial order by at least the orchestrator-configured
  minimum (default: 10 seconds of agent reasoning time).

**Clutter.**

- `functional`: proportion in `[0.0, 1.0]` — clutter-test questions
  answered correctly / clutter-test questions asked. Per-question-
  type breakdown under `clutter_questions`.
- `density`: raw counts per frame sampled, reported as
  `{ "elements_per_face": [list], "right_rail_labels": [list],
"active_face_marker_overlaps": [list] }`. No normalization; this
  is a heuristic flag, not a score. Density values exceeding
  orchestrator-configured thresholds raise a finding regardless of
  functional score.

**Outcome legibility** (when active). Proportion in `[0.0, 1.0]` of
end-of-scenario frames where the agent correctly classifies the
outcome (ant-win / spider-win / stalemate) on first read, plus a
boolean per session for whether the agent registered an approaching
stalemate with at least the orchestrator-configured warning window
remaining.

**Learnability.** Absolutes (turns-to-X, error counts, transfer
performance) are reported per session for context but the primary
score is reported under `learnability_deltas`:

- `variant_pair`: which two tutorial variants were compared.
- `turns_to_first_legal_order_delta`: variant_A_median - variant_B_median.
- `turns_to_win_condition_delta`: same form.
- `transfer_performance_delta`: variant_A's L3 performance against
  competent baseline minus variant_B's, expressed as the sufficiency
  index delta.

If only one tutorial variant exists, `learnability_deltas` is
`null` and the per-session block carries `"variant_calibration":
"under_calibrated"`. Findings are not filed in this state.

### Sampling discipline

- **Minimum N per scenario per loop:** 5 seeds. Below 3 seeds, the
  criterion reports `"coverage": "insufficient"` and no findings
  are filed. Between 3 and 4 seeds, findings are filed only at
  `severity: "high"`.
- **Reporting form:** every score above is reported as
  `{ "median": M, "range": [min, max], "n": N }`, not a single
  value. Single-value reporting hides agent-variance noise.
- **Finding reproducibility:** a finding is filed only if the
  underlying defect reproduces in at least `ceil(2 * N / 3)` seeds.
  A defect in one of five seeds is logged as
  `anecdotal_observations` and routed to the orchestrator's
  record, not the findings list.

### Aggregation

- `batch_scores` per criterion is the median across all sessions
  passing the coverage gate, reported in the same structured form
  as the per-session scores (object for sufficiency / pacing /
  clutter / learnability, scalar with median+range for legibility /
  operability / outcome_legibility).
- **No single rolled-up playability score.** Composing these into
  one number would pretend they trade off cleanly; they don't.
  Ship-gate thresholds per criterion live in orchestrator config,
  not in the rubric.

## Output format

Findings JSON at `critics/findings/playability.json`:

```json
{
  "source": "<input session-trace directory>",
  "scenarios_evaluated": [...],
  "sampled_sessions": [...],
  "activation_state": {
    "loop_1_competent_deterministic": "active | dormant — awaiting <gate>",
    "loop_1_competent_llm": "active | dormant — awaiting <gate>",
    "loop_2_naive": "active | dormant — awaiting <gate>",
    "criteria_active": ["2", ...],
    "criteria_dormant": [
      { "criterion": "1", "awaiting": "cube view build + LLM player-agent harness" }
    ]
  },
  "per_session_scores": [
    {
      "session_id": "...",
      "scenario": "L3",
      "seed": N,
      "loop": "competent-deterministic | competent-llm | naive",
      "legibility": { "score": 0.0, "legibility_detail": { "<element_type>": 0.0 } },
      "operability": {
        "score": 0.0,
        "operability_detail": {
          "mis_rotation": 0,
          "unintended_deselect": 0,
          "wrong_destination": 0,
          "pacing_control_misfire": 0,
          "other": 0
        }
      },
      "sufficiency": {
        "decisions_compared": 0,
        "interface_caused_gaps_a": 0,
        "interface_caused_gaps_b": 0,
        "abstained_c_plausible": 0,
        "sufficiency_index": null,
        "abstention_rate": 0.0,
        "coverage_note": "ok | under_sampled"
      },
      "pacing_fitness": {
        "auto_pause_precision": 0.0,
        "auto_pause_recall": 0.0,
        "speed_decision_quality": { "0.5x": 0.0, "1x": 0.0, "2x": 0.0, "4x": 0.0 },
        "startup_orientation_adequate": true
      },
      "clutter": {
        "functional": 0.0,
        "clutter_questions": { "<question_id>": 0.0 },
        "density": {
          "elements_per_face": [],
          "right_rail_labels": [],
          "active_face_marker_overlaps": []
        }
      },
      "outcome_legibility": {
        "outcome_classification": 0.0,
        "stalemate_warning_registered": true
      },
      "learnability": {
        "turns_to_first_legal_order": 0,
        "turns_to_win_condition_identified": 0,
        "operational_errors_before_stabilizing": 0,
        "stated_understanding_end_of_scenario": "<summary>",
        "l3_transfer_performance": "<delta vs competent baseline>",
        "variant_calibration": "ok | under_calibrated"
      }
    }
  ],
  "learnability_deltas": {
    "variant_pair": ["variant_A_id", "variant_B_id"],
    "turns_to_first_legal_order_delta": 0,
    "turns_to_win_condition_delta": 0,
    "transfer_performance_delta": 0.0
  },
  "batch_scores": {
    "legibility": { "median": 0.0, "range": [0.0, 0.0], "n": 0 },
    "operability": { "median": 0.0, "range": [0.0, 0.0], "n": 0 },
    "sufficiency": {
      "median_sufficiency_index": null,
      "median_abstention_rate": 0.0,
      "n": 0
    },
    "pacing": {
      "median_auto_pause_precision": 0.0,
      "median_auto_pause_recall": 0.0,
      "n": 0
    },
    "clutter": { "median_functional": 0.0, "n": 0 },
    "outcome_legibility": { "median": 0.0, "range": [0.0, 0.0], "n": 0 },
    "learnability": { "delta_summary": "<see learnability_deltas>", "n": 0 }
  },
  "coverage": {
    "scenarios_meeting_min_n": [],
    "scenarios_under_min_n": [],
    "criteria_under_calibrated": []
  },
  "findings": [
    {
      "rule": "<one of: legibility, operability, sufficiency, pacing, clutter, outcome-legibility, learnability>",
      "severity": "high|medium|low",
      "scenario": "L<N> | all",
      "loop": "competent-deterministic | competent-llm | naive | both",
      "observation": "<concrete description, citing session events>",
      "interface_element": "<which UI element is implicated>",
      "suggested_action": "<concrete change the UX builder or tutorial designer could make>",
      "reproducibility": "<X of N seeds>"
    }
  ],
  "anecdotal_observations": [
    {
      "rule": "...",
      "scenario": "...",
      "observation": "...",
      "reproducibility": "<X of N seeds, below filing threshold>"
    }
  ]
}
```

Findings must cite specific session events — turn number, order
issued, pause requested, state-belief expressed. Generic prose is
not useful to the orchestrator. Findings that would relitigate the
recorded decisions named in "Do not relitigate" must not be filed.
A finding must include its `reproducibility` field; defects that
do not meet the reproducibility threshold belong in
`anecdotal_observations`, not `findings`.
