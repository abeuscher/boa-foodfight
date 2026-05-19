# L0 ruleset (working draft, v4)

**Intended location:** `docs/drafts/L0-ruleset-draft.md`
**Status:** Working draft, downstream of recorded §7.11.
**Owner:** UX track.
**Revision:** v4 — staleness cleanup pass after §7.11 records:
§7.12 and §7.13 are landed (Exchange #8 commit `53a7252` and
Exchange #9 commit `a248cfc`), past tense throughout; gate-29
language tightened to reflect that it's a win-rate metric anchor,
not a stored replay-file set.

---

## What this document is

The list of rules — interface + game — that L0 surfaces to a
brand-new player. Combined ruleset (interface + game in one list,
per PM session call). Substrate document for the tutorial design
doc, Level PA handoff, and UX-surface spec downstream of §7.11.

## What L0 is

A prepended prologue scenario at `data/tutorial/`, outside the
Tier-1 L1–L10 curve, additive and not balance-measured. Recorded
in §7.11.

**Narrative kernel.** Summer is ending. The ant colony lives at the
**summer hill**, a mound of earth in the yard outside a human
house. The queen has chosen a new winter home: the inside of the
human house. Spiders hold the entrance. Antonio leads the advance
party. Other ant squads are at work in the yard on errands of
their own; some may join him.

**Spatial scope.** A single flat surface (the yard outside the
house). Multi-plane / cube navigation deferred to L1.

**Skip-default.** Antonio at the summer hill, world loop initiates.
Linear `L0 → world loop → L1`, no roster carry-forward.

**Tutorial philosophy.** Skill-building, not difficulty. Advance
absent catastrophic mistake. Failure modes are teaching moments.

## Engine-truth constraints (dev-verified)

- All 11 scenario JSON files must exist in `data/tutorial/`, even
  narratively degenerate ones (`queen.json`, `shop.json`, etc.).
- L0 is **exempt-by-absence** from the win-rate curve metric
  (gate-29 is a win-rate anchor measured AI-vs-AI, not a stored
  replay-file set; L0 simply isn't in any measured set), coevo,
  tune, and the reconciler. No flags, no path magic.
- Single-party-at-start, queen-less is a clean `loadScenario`
  path. Forward note: the reconciler currently requires a
  queen-bearing party but is hardcoded to `data/level-1`; if
  anyone ever generalizes the reconciler across all scenarios, a
  queen-less L0 will fail it. Known, deliberate boundary.
- L0 needs its own scouting AI registered in `SCENARIO_PLAYER_AIS`
  and a hardcoded invocation pointer in the world-loop runner,
  mirroring the existing `level-1-tutorial` precedent.
- Victory kind: **`capture-post`**.
- G5 / G12 / G14 composition is engine-clean: victory and score
  read live `state.parties`; reinforcement-added ant party
  correctly counted; queen-less never triggers queen-death loss;
  capture-post score-resolves without a queen.
- Three troop types (G9) load fine in a stripped
  `data/tutorial/units.json`.

## Engine dependencies — landed

L0's engine prerequisites are complete:

- **§7.12 Reinforcement-at-POST.** Shipped as Exchange #8, commit
  `53a7252`. Gated sim-path change, byte-identity proven (full
  suite green, replays unchanged). Backs G14.
- **§7.13 Mid-scenario save.** Shipped as Exchange #9, commit
  `a248cfc`. Option B (input-stream replay) with
  `engine/scenario-save.ts`, schema, record/replay/restore, and
  determinism round-trip test. 741/741 tests passing. Backs
  beat 7 (the save touchpoint, per the beat outline).

The "L0 cannot ship until..." language from earlier drafts is
resolved.

## Cube-view single-plane degradation

`loadScenario` is geometry-agnostic; a single-plane map loads
identically to multi-plane. The cube-view memo's single-face
degradation behavior is the only adjacent UI doc that touches
this; routed via the standard amendment queue (not an engine
question).

---

## Game rules surfaced by L0

**G1. The world is a flat tactical map.** A grid of tiles parties
move across.

**G2. Antonio's starting party — and parties can grow in number.**
L0 starts with Antonio's single squad. Mid-scenario, a second
squad joins (see G14). The player learns the colony has multiple
squads under one commander. Multi-party-from-the-start (queen plus
authored field force) lands at L1.

**G3. POSTs exist and have owners.** Specific tiles are POSTs.
They can be ant-owned, spider-owned, or neutral. The **summer
hill** starts ant-owned (home base). The **winter-house entrance**
is the spider-defended objective. At least one intermediate POST
sits along the route.

**G4. POST capture.** Park your party alone on an unowned or
enemy-owned POST for two turns to capture it. A co-located enemy
party pauses capture progress. Capture is discrete (a 2-turn
counter).

**G5. Win condition — capture the winter-house entrance.**

**G6. Combat on collision.** When Antonio's party meets a spider
party on the same tile, combat triggers automatically.

**G7. Combat is performative.** A combat panel appears; the engine
resolves the matchup; the player watches and can skip to summary
(except as noted in the beat outline, where the first combat
disables skip).

**G8. HP, downed units, and unit death.** Units take damage.
Downed units stay in formation, greyed and collapsed. **Units can
die.** L0's first scripted spider combat is the teaching moment:
Antonio survives, one soldier in his squad dies.

**G9. Troop types — three at L0.** Antonio's squad has two
footmen, two archers, two mages. The player sees what each does in
combat; this is type _exposure_, not type _management_.
Squad-composition tools (slot costs, formation editing) deferred
to L1+.

**G10. Neutral parties.** Creatures on the map that are not
ant-aligned and not spider-aligned. Not enemies by default.
Cockroaches and stinkbugs are canonical neutrals.

**G11. Recruit verb (canonically `recruit-as-order`).** Antonio's
party can win over a neutral party. Player-facing label TBD.

**G12. Lose condition (narrow for L0).** L0 fails _only if_
Antonio is killed _and_ the spiders take the summer hill. Either
alone is recoverable. Given the burly-squad-versus-weak-foe
authoring, this is reachable only through catastrophic mistake.

**G13. No queen as a game piece in L0.** Queen is narratively
present but does not appear on the field. Queen-as-unit lands at
L1.

**G14. Reinforcement-at-POST.** Capturing a designated POST spawns
a new player-controlled party defined in scenario data. At L0,
capturing the intermediate POST triggers the lost squad joining.
Backed by §7.12 (Exchange #8, commit `53a7252`). Ruled shape:
capture-complete trigger, configurable arrival POST (default =
captured), configurable faction (L0 uses ant), single-shot per
scenario, named pre-defined party identity.

## Interface rules surfaced by L0

**I1. Real-time-with-pause pacing.** Time advances continuously
when unpaused. Default paused at scenario start.

**I2. Pause / play.** Spacebar or HUD pod button.

**I3. Speed control.** Half / normal / double / quadruple in the
HUD pod.

**I4. Step verb.** Paused-only single-advance in the HUD pod.

**I5. Auto-pause on attention events.** The clock auto-pauses on
combat init, party idle, newly-visible enemy, POST-capture
completion, reinforcement spawn, save touchpoint, and scenario
milestones. (Some are engine-backed events; others are UI-derived
— see beat outline's auto-pause event-set section.)

**I6. Two-click command model.** Select party (first click), click
destination tile (second click is the confirm). Destination marker
appears.

**I7. No "End turn" verb.** Time advances via play/pause/speed.

**I8. No minimap.** The world is the world.

**I9. Three-column layout.** Left rail = parties roster. Center =
world. Right rail = hover detail, pending-order controls.

**I10. POST capture indicator.** Turn-counter pip on the POST
being captured.

**I11. Combat panel during combat.** Front/back row staging
visible (read-only at L0); engine auto-resolves; skip-to-summary
control.

**I12. Combat-modifier surface (introduced, not fully explained).**
Modifiers appear in the combat panel as a labeled stack. Same
vocabulary and presentation forever: read-once principle.

**I13. Leader marker.** Star in the leader unit's square. Visible
across all views.

**I14. Recruit verb UI.** Issuance shape resolves at
UX-surface-spec time.

**I15. Reinforcement-arrival UX.** Auto-pause, visible spawn at
the captured POST, left-rail roster update, brief named
announcement. UI shape resolves at UX-surface-spec time. Consumes
the engine's `reinforcement-spawned` event (§7.12).

---

## Rules deliberately NOT in L0 (where they land)

**Cube rotation / six-face navigation** — L1.
**Queen as field unit** — L1.
**Authored multi-party starting force** — L1.
**Formation slots / front-back rows as a player verb** — L1.
**Royal Jelly application** — L2.
**Stalemate as a scenario terminal** — L2+.
**Bio-evolution / class change** — L3.
**Plane affinity** — L3 (weak), L5 (full).
**Asymmetric plane-switch** — L4 (range-limited), L6 (full).
**POST randomization** — L4.
**Environment-mechanic POSTs** — L4 onward.
**Combo abilities (Royal Onslaught / Venom Storm)** — L4.
**Hypnotize (the spider mirror of recruit-as-order)** — L5
(light, duration-capped), L8 (full power).
**Tiered MP** — L8.
**Score tiebreaker** — L8.
**Cards / card economy** — Mid-tier transitions.
**Charisma promotion** — Mid-tier transitions.
**Day / night cycle** — L10.

---

## Cross-track amendments queued

Captured in §7.11's recorded form; included here for completeness.

- **Recruit-as-order debut moves L5 → L0; L5 becomes
  strategic-use surface.** Routed as direct amendment to
  mechanic-distribution-plan (see
  `amendment-mechanic-distribution.md`).
- **Archer/mage debut moves to L0; mid-tier becomes roster-build
  choice surface.** Same amendment.
- **Playability rubric criterion 7 learnability remap.** Direct
  amendment (see `amendment-playability-rubric-c7.md`).
- **Pacing memo §A.3 justification restructure.** Direct
  amendment (see `amendment-pacing-memo-A3.md`).
- **Cube-view memo's L1-tutorial language → L0.** Queued
  amendment.
- **Level-progression-plan §0/§2 L1 entries.** Drop tutorial
  characterization; keep anchor. Queued amendment.
- **UX handoff doc.** Cross-references updated. Queued amendment.
- **Briefing view spec.** Adopt briefing-with-objectives-list as
  a general convention. Queued.

---

## Open items / decisions still needed

1. **Winter-house entrance starting owner.** Spider-owned or
   neutral-with-spider-patrols? Design call at progression-pass
   time.
2. **Intermediate POST count and placement.** At minimum one (the
   reinforcement spawn point). Level PA input.
3. **Dead-soldier scripting (beat 4 in the beat outline).**
   Scripted or probabilistic-with-floor? Likely scripted.
4. **Troop composition across Antonio's and the reinforcement
   squad.** Three types must appear; the split shapes the
   teaching surface. Design call.
5. **Recruit verb UI.** Resolves at UX-surface-spec time.
6. **Failure UX** when the G12 AND-condition triggers. Affects
   tutorial dialogue overlay design.
7. **Reinforcement squad's named leader.** "Beatrice" used as
   placeholder.

---

## Parked for later (Tier-1-wide future consideration)

**Two-phase scenario shape (pheromone trail then defend).** Each
Tier-1 conquest scenario could split into two phases — establish
a pheromone trail, then defend it while the queen traverses. Too
late for L0 (and L0's single-party / no-queen framing doesn't
support it anyway). To be drafted as a parked-idea memo for the
team to revisit post-L0.

---

## What feeds out of this ruleset

- **Tutorial design doc.** Beat-by-beat copy (downstream of beat
  outline).
- **Level PA handoff.** Concrete level design.
- **UX-surface spec for L0.** Interface affordances per beat.
- **Playability rubric criterion 7 amendment.** Specific
  knowledge the naive player walks out of L0 with —
  pause/play/speed, two-click ordering, POST capture,
  combat-on-collision, recruit verb, parties-vs-colony.

Look-and-feel deferred per established discipline.
