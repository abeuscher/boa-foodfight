# Design Memo — Pacing Model & the Turn-Cap / Stalemate Reframe

**Status:** RECORDED. The agreed canonical version, synthesizing the
two design-session drafts (pacing memo + its amendments) with the
coding-agent engineering reconciliation and the decisions the human
reached in review. Supersedes the uploaded drafts. Surfaced during a
UX session; turned out load-bearing on gameplay, so recorded here.

**Provenance:** design agent (UX session) → coding-agent pushback →
amendment → human decisions. This memo is the binding outcome; the
"OPEN" section is the live alignment agenda for continued iteration.

---

## A. DECIDED (binding)

1. **Real-time-with-pause pacing for human play.** The engine stays
   turn-based, deterministic, replayable, agent-parity preserved. The
   _player UI_ runs turns at a controllable rate and auto-pauses on
   attention events (party idle, combat, newly-visible spider, queen
   damaged, scenario milestone). One playback/animation layer serves
   both the replay viewer and live play. No engine change. (Original
   memo §2, unchanged by review.)

2. **Stalemate is a real third outcome — NOT score-resolved.** Human
   decision: "more interesting if score is not resolved at stalemate."
   A scenario that reaches no decisive objective resolves as
   `stalemate`, a first-class result alongside ant-win / spider-win —
   the score-tiebreaker is _not_ used to manufacture a winner on
   opted-in scenarios. This makes the score-resolution pathology
   (recorded as level-progression-plan §4c) a visible designed
   outcome instead of being laundered into "ant win %".

3. **L1 is exempt from the stalemate-terminal — on a design ground,
   not an engineering dodge.** L1's documented role is the **tutorial
   and the fixed reference the other nine levels are designed as
   deviations from** (level-progression-plan §0/§2 L1; roadmap §2).
   A tutorial must give the player a clean win or loss; "nobody won"
   is a _strategic-depth_ outcome that belongs in the levels that
   teach strategy, not the one that teaches the basics. L1 therefore
   keeps today's score-resolution behavior — which also keeps the
   gate-29 byte-identity anchor intact (the regression guard the
   whole Phase-D engine-dep series depends on). The exemption is
   consistent with L1's role; it is not "because it's hard".

4. **Stalemate-rate is a REPORTED DIAGNOSTIC, not a per-scenario
   ship-gate.** This reconciles with level-progression-plan §4c
   (the score-resolution / low-drama pattern is a systemic
   capture-post matchup signature → _track cross-level, do not chase
   per-level_; chasing it destabilizes the deterministic win-rate
   plateaus and can reopen frozen mechanic rulings). Designer agents
   _see_ stalemate rate as a quality signal; it does not gate a
   scenario's ship the way win-rate-vs-target does. (Adopting the
   amendment's §4 <10/25% _gate_ is explicitly NOT decided — see
   OPEN.)

5. **Mission scenarios (L2/L6/L8) are already correct.** The engine
   already makes escort/eradicate/recruit-count timeout an
   unconditional ant-loss with no score path — that _is_ a mission
   timer. The only change there is a player-facing thematic label
   (UI), not engine behavior.

## B. Factual correction (grounding for any cap reasoning)

The drafts argue from a **30-turn cap**. The operative cap in the
measurement harness (`harness/run-batch.ts`, the coevo gate, every
scenario measurement to date) is **100**, not 30 — runs report
`Avg turns at timeout: 100.0`. The "30" is a stale `game-outline` /
roadmap-narrative number. The real-time-with-pause UX motivation
stands; the "turn-budget scarcity" math in the drafts does not and
must be re-derived against the real bound.

## C. ENGINE INTERFACE (concrete; Phase-D additive style)

Small, additive, opt-in, default-inert — same discipline as the 8
shipped engine deps. None breaks determinism, the harness, the
locked AI/strategy paths, or the gate-29 baseline.

| Change                                              | Type                        | Risk                                      |
| --------------------------------------------------- | --------------------------- | ----------------------------------------- |
| Per-scenario `timeCap` field, default = current cap | Additive, opt-in            | None on locked baseline (L1 not opted in) |
| Stalemate detector (observer; see predicate)        | Additive, observe-only      | None — observer pattern                   |
| `stalemate` as a 3rd reported harness outcome       | Reporting change            | None on engine                            |
| (Optional) inactivity-penalty scoring term          | Additive, gated inert on L1 | None **iff** gated inert (else gate-29!)  |

**Detector predicate (v1).** Stalemate fires when, for N consecutive
turns, NONE of: a combat engagement initiated; a POST changed hands;
**a POST capture is in progress** (round-17 `capturingFaction` set);
**a unit died**. (The drafts started stricter — combat+POST-change
only; the coding-agent build note adds capture-in-progress and deaths
from v1 because a legitimate long approach on the bigger maps would
false-positive otherwise. N starts ~15–20, tuned empirically.)

**Score path.** Stays exactly as today for non-opted scenarios (L1).
Removing the cap entirely was rejected in review precisely because it
deletes the only trigger for `victory == "score"`; the cap stays as a
safety bound, the detector terminates degenerate runs early as
`stalemate`, and neither fires the score path on opted-in scenarios.

**Fallback.** If the detector is costly to build cleanly: ship
without it — run to cap, report cap-hit-without-objective as
`stalemate`. Zero engine work, same 3-outcome reporting; loses only
the active-but-indecisive vs truly-stalled distinction.

## D. OPEN — alignment agenda (NOT decided; needs design-agent iteration)

These are recorded as open precisely so they are not silently
decided:

1. **The win-curve becomes two-dimensional.** Every shipped scenario
   (tutorial 76, L2 76, L3 67, L4 60) is tuned to _score-inclusive_
   win%. Making stalemate non-resolved redefines "win rate". The
   curve must be re-expressed as `(decisive-win band, stalemate
ceiling)`; exact target shape TBD.
2. **Grandfather vs. re-tune** the already-shipped score-inclusive
   scenarios (L2/L3/L4) against the new metric. Re-tuning risks the
   §4c plateau-destabilization; grandfathering keeps them
   score-resolved. Undecided.
3. **Campaign/world-loop stalemate semantics.** `world-loop.ts` +
   `world-*` (roster/XP/gold carry, level-up) assume a binary
   winner. A `stalemate` needs defined progression behavior
   (end / replay / soft-loss / carry-roster). Engine + test work,
   undecided.
4. **Detector N threshold** and whether it scales with map size.
5. **Scope of the stalemate-terminal**: L2+ uniformly, or only some
   levels (L3/L5 with a partial mechanic suite may warrant staying
   simple). Sequence: land the interface (default-inert) before
   building L5–L10 so they are stalemate-aware from birth; defer the
   cap/metric experiments until the full L3–L10 baseline exists, with
   L3/L4 as the canary (baselines exist, the pathology is visible).
6. **Whether §4's per-scenario stalemate _gate_ (<10/25%) is ever
   adopted** — currently DECIDED against (see A.4); reopenable only
   with a deliberate re-baselining of the curve and §4c.

---

## One-paragraph summary

Real-time-with-pause is adopted for human play (engine unchanged).
Stalemate becomes a real third outcome that is _not_ score-resolved
("more interesting"); L1 is exempt because it is the tutorial/anchor
and tutorials must resolve cleanly (this also preserves gate-29).
The engine change is tiny and Phase-D-style (optional `timeCap`,
observer stalemate detector, a third reported outcome — all
default-inert, score path unchanged for L1). Stalemate-rate is a
reported diagnostic, not a per-scenario gate (consistent with §4c).
The drafts' 30-turn premise is corrected: the real harness cap is 100. The metric redefinition (two-dimensional curve), grandfather-
vs-retune, campaign semantics, and detector tuning are recorded as
the open alignment agenda for continued design-agent iteration —
none blocks the in-flight L3–L10 builds.
