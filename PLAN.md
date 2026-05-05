# Food Fight — Agent Execution Plan

This plan describes how to implement the game specified in `game-outline.md` using
a series of agents, starting from prompts and ending with self-play tests that
assess whether the implementation meets the spec. The goal is **largely
unattended execution**: agents communicate through files, gates are
machine-checkable, and iteration loops have hard caps.

## Guiding decisions

1. **Headless TypeScript engine first; Canvas viewer last.** The spec says: "no
   graphics in the planning phase. State is tracked in structured data; output
   is text and JSON." The success criteria are textual and statistical
   (win-rate, route diversity, transcript review). Visuals are a Phase 5
   consumer of the replay log, not a development surface.
2. **Lock the player AI early; tune everything else against it.** The spec is
   explicit that tuning happens against a fixed reference player force. If the
   player AI drifts, the win-rate target becomes meaningless.
3. **Contracts and schemas are the source of truth.** Agents communicate through
   typed JSON files and a `CONTRACTS.md` doc. Agent prose is not authoritative.
4. **The Fun Critic is non-optional.** The spec calls it out by name. Mechanical
   balance is necessary, not sufficient.
5. **Mechanical checks belong in hooks/CI; LLM reviewers handle the rest.**
   File size, naming, lint, duplicate-string detection are deterministic and
   should block before any LLM agent runs.

## Tech stack

- **Language:** TypeScript (strict, ESM)
- **Runtime:** Node 20+
- **Package manager:** pnpm
- **Tests:** Vitest
- **Schema validation:** Zod
- **Lint/format:** ESLint + Prettier
- **Duplicate detection:** jscpd
- **Replay format:** JSONL (one event per line)
- **Viewer (Phase 5 only):** HTML5 Canvas, no framework

## Repository layout

```
engine/        Pure game logic. No I/O. No randomness except via injected RNG.
data/          Designer-authored JSON. Validated by schemas in engine/schemas/.
  level-1/
ai/            Player and enemy AIs. Pure functions of (state, seed) -> orders.
harness/       Self-play runner, metrics aggregator, transcript dumper.
critics/       Metrics critic, Fun Critic, spec compliance critic.
viewer/        Phase 5 only. Pure consumer of replay JSONL.
CONTRACTS.md   Cross-module type contracts. Updated by reconciler agent only.
PLAN.md        This file.
```

## Phases

### Phase 0 — Scaffold

**One agent, sequential.**

Sets up the repository: pnpm workspace, TypeScript strict, Vitest, ESLint,
Prettier, jscpd config, pre-commit hook running lint + format + jscpd, CI
running lint + tsc --noEmit + test. Writes the initial `CONTRACTS.md` skeleton
listing the named types every later agent will implement against (`Plane`,
`Tile`, `POST`, `Unit`, `Party`, `GameState`, `BattleResult`, `Order`,
`ReplayEvent`).

**Gate:** `pnpm install && pnpm test && pnpm lint && pnpm typecheck` all pass.
Pre-commit hook installed and runs.

### Phase 1 — Design agents (resolve open questions)

**Parallel agents in worktrees.** One per cluster from the spec's "Open design
questions" list. Each writes a single typed JSON file (or a single pure-function
TS module for math) and nothing else.

| Agent | Output | Constraint |
|---|---|---|
| Stats designer | `data/level-1/units.json` | Ants: high Atk/Con, low HP |
| Battle math designer | `engine/combat.ts` (pure fns) | 3–5 rounds, posture modifiers, agility ordering |
| Coop-ant designer | `data/level-1/formations.json` | Queen-proximity + Royal Jelly bonuses; formation thresholds |
| Queen ultimate designer | `data/level-1/queen.json` | Charge curve, AoE shape, scenario-clearing potency |
| Royal Jelly tuner | `data/level-1/jelly.json` | Capacity per party, production rate, duration, magnitude |
| Roster designer | `data/level-1/roster-ants.json`, `roster-spiders.json` | Slot costs match `units.json` |
| Map/POST/terrain designer | `data/level-1/map.json` | 10×10×3, 5 named POSTs, terrain types + path bonuses |
| Leader-class designer | `data/level-1/leaders.json` | Party-wide modifiers per leader class |
| Abilities designer | `data/level-1/abilities.json` | PheroBlast, Plane-Switch, Boat-Form, etc. |
| Shop designer | `data/level-1/shop.json` | Grasshopper shoebox; mouse mercenary |
| Dialogue designer | `data/level-1/dialogue.json` | Sgt. Antonio briefing + barks |

Each agent receives `game-outline.md`, `CONTRACTS.md`, and the relevant Zod
schema as input. No agent reads another design agent's output during this phase
— they run in parallel against the spec only.

**Reconciler agent** runs after all design agents complete:

1. Validates every JSON file against its schema.
2. Performs cross-file checks (every roster entry exists in `units.json`; every
   ability referenced in `roster-*.json` exists in `abilities.json`; slot cost
   sum on the Queen's party equals 12 with the Queen taking 4; etc.).
3. On failure, files structured findings back to the responsible design agent
   for revision. Cap: 3 reconciliation rounds before escalating.

**Gate:** all schemas valid, all cross-file references resolve, reconciler
reports clean.

### Phase 1.5 — PR consistency reviewer

**Triggered by orchestrator on every Phase 1 and Phase 2 PR.**

Mechanical checks first (blocking, in CI, no LLM):

- ESLint clean
- Prettier clean
- `tsc --noEmit` clean
- jscpd: no duplicated blocks above threshold (configurable; start at 50 tokens)
- File size cap: 400 LOC per file (warn at 300)
- Naming conventions: `camelCase` for TS identifiers, `kebab-case.json` for
  data files, `PascalCase` for types, `SCREAMING_SNAKE` for constants
- No reaching across module boundaries: imports must match the public surface
  declared in `CONTRACTS.md`

Only after mechanical checks pass does the **`pr-consistency-reviewer` agent**
run. Its rubric:

- **Contract compliance.** Does every exported symbol match a contract in
  `CONTRACTS.md`? Cite the contract.
- **Duplication.** Does this PR reimplement logic that already exists elsewhere
  in the repo? Cite the existing implementation by `path:line`.
- **Boundary respect.** Does this module reach into another module's internals
  instead of going through the contract?
- **Schema drift.** For data files: does the content respect the schema's
  *intent*, not just its types? (e.g., a `units.json` entry that validates but
  has 0 HP probably violates intent.)

Reviewer output is **structured findings only**:
`{file, line, rule, severity, suggested_fix}`. No prose reviews. Each finding
must cite either a contract, a schema, or an existing implementation.

**Iteration loop:** submitter agent addresses findings, reviewer re-runs.
Hard cap: **3 rounds**. On round-3 failure, the orchestrator writes a status
note and escalates to the user.

**Out of scope for this reviewer:** game balance, design opinions, stylistic
preferences not encoded in a rule. Balance is Phase 4's job.

### Phase 2 — Engine modules

**Parallel agents in worktrees, contract-driven.**

Each module agent reads `CONTRACTS.md` and the relevant schema, writes the
module + tests, and nothing else. A paired test-author subagent writes property
+ golden tests against the spec.

- **World** — planes, tiles, plane transitions, paired-POST traversal rule.
- **POSTs** — ownership transitions, defensive bonus, healing accelerator,
  pairing for plane transitions.
- **Parties** — slot accounting, leader assignment, slowest-member movement
  allowance, terrain modifiers.
- **Movement** — order persistence across turns; simultaneous resolution; path
  bonuses for ground units; flying-unit straight-line movement; battle trigger
  on same-tile occupation.
- **Battle** — auto-resolver consuming `engine/combat.ts`; pre-battle posture
  (Run / Fight / Defend); strategy modifiers; retreat semantics; leader-death
  retreat-to-base behavior; XP awards.
- **Abilities** — PheroBlast, Plane-Switch, Boat-Form, Royal Jelly application,
  Queen ultimate. Each ability is a pure function of state.
- **Fog of war** — visibility radius; size-class enemy reveal (small/medium/
  large only); pheromone trails reveal terrain.
- **Save/load** — `GameState` is the only persisted artifact; mid-scenario
  save slots; auto-save on scenario boundary.
- **Replay log** — every state mutation emits a `ReplayEvent` to a JSONL
  stream. This is the single artifact AI training, tests, critics, and the
  Phase 5 viewer all consume.

**Gate per module:** module tests green, jscpd clean against the rest of the
repo, contract reviewer (Phase 1.5) clean.

### Phase 3 — AI players

- **Baseline Player AI** — the locked reference. Scripted policy: capture Soap
  Dish → secure Towel Rack/Wall Crack pair → ceiling assault. Once committed,
  **never tuned**. Lives in `ai/baseline/` and is treated as part of the
  measurement instrument.
- **Spider Enemy AI (Level 1)** — implements the briefed pattern verbatim:
  hunker at web, send scouts toward soap dish, react to threats on plane
  transitions.
- **Variant Player AIs** — `rush`, `turtle`, `staging`. Used only by the
  route-diversity critic in Phase 4. Not used to tune.

**Gate:** each AI plays a full scenario without throwing, deterministic given a
seed, and emits a complete replay log.

### Phase 4 — Self-play harness + critics (the unattended core)

The harness:

```
pnpm harness run --seeds 1..100 --player baseline --enemy level1
  → out/runs/<timestamp>/replay-<seed>.jsonl + summary.json
```

Three critic agents run against the output:

1. **Metrics critic.** Confirms win rate ∈ [65%, 80%]; variance bounds met;
   ≥3 variant strategies achieve ≥40% win rate (route diversity per the spec).
   Pure script + LLM summary.
2. **Fun Critic.** Reads ~10 sampled transcripts against a rubric: are
   decisions articulable? Do battles feel scripted or noisy? Are there moments
   of tactical interest beyond mechanical balance? Returns structured findings.
3. **Spec compliance critic.** Verifies every player-locked rule is observably
   exercised in at least one transcript: Queen immobility, retreat-on-leader-
   death, paired-POST plane traversal, Royal Jelly logistics, fog of war,
   leader-death retreat, simultaneous movement, etc. Each rule maps to a
   transcript-grep pattern.

**Tuning agent** consumes critic findings and edits parameters in the spec's
preferred order:

1. Enemy pattern (predictability, aggression, response thresholds)
2. Initial circumstances (party positions, starting POST ownership, Queen
   guard composition)
3. Battlefield (POST placement, terrain features, plane transition layout)
4. Scenario goal (alternative or supplementary win conditions)

The player roster is **locked**. The baseline AI is **locked**.

**Iteration loop:** harness → critics → tuner → harness. Cap: **10 rounds**.
On exhaustion, the orchestrator writes a status report to `out/status.md`
and stops.

**Gate:** all three critics pass, or the cap is hit with a written report.

### Phase 5 — Canvas viewer

**Only after Phase 4 passes.** One agent, no game logic.

Pure consumer of `out/runs/<timestamp>/replay-<seed>.jsonl`. Renders three
stacked planes, POSTs as nodes, parties as tokens, a scrubber timeline, and
battle popovers. No simulation; the engine is the simulation.

**Gate:** loads a replay, scrubs without errors, renders all five named POSTs.

## Orchestration mechanics

- **One source of truth per concern.** Design JSON, `CONTRACTS.md`, replay log.
  Agents communicate through these, not prose.
- **Schemas as contracts.** Zod on every JSON file. Reconciler runs after
  every design phase and on every PR.
- **Deterministic seeds.** Harness pins RNG via a single injected source.
- **Parallelism via worktrees.** Phases 1 and 2 are embarrassingly parallel.
  Use isolated worktrees so agents don't stomp each other.
- **Hard iteration caps.**
  - Reconciler loop: 3 rounds
  - PR consistency reviewer loop: 3 rounds
  - Phase 4 tuning loop: 10 rounds
  On exhaustion: write report, stop, escalate.
- **Meta-orchestrator agent.** Drives Phases 0 → 4 from a single prompt.
  Calls `/ultrareview` between phases for an outside read.
- **Escalation policy.** Any cap exhaustion, any schema conflict that survives
  the reconciler, any AI throwing under deterministic seeds: stop, write a
  status note, do not silently proceed.

## What's deliberately out of scope for v1

- Levels beyond Level 1.
- Class change trees (deferred per spec).
- Pheromone-erasure mechanic (Level 2+ per spec).
- Real-currency economy (Tier 3+ per spec).
- Multi-platform UI. Canvas in-browser only.
- Sound, animation polish, accessibility audit.

## Success definition for the whole effort

The plan is successful when:

1. `pnpm harness run --seeds 1..100` runs unattended end-to-end.
2. The metrics critic reports win rate ∈ [65%, 80%] for the baseline AI.
3. The Fun Critic returns no severity-high findings.
4. The spec compliance critic confirms every player-locked rule fires.
5. The Canvas viewer can replay any of the 100 runs.

At that point, Level 1 is shippable, and the same pipeline scales to Level 2
by adding a new design phase + new enemy AI without touching the engine.
