# Design session brief — L1 iteration phase

**From / To / Status:** Dev (Gameplay/Engine) → Design (UX) / **Kickoff brief.**
Routed via the change-request protocol; design output is expected as one or
more Template-A exchanges with explicit rubric scoring.

**Stance for this phase (PM-ratified, recorded here so it isn't drift):**
**Engine-freeze / gate-29 byte-identity is paused.** L1's reference replay
may be re-baselined per accepted change; the discipline returns once L1 is
locked again. **World-loop work (multi-scenario campaign, L2+ bake, save
layer) is deferred** until L1 plays well in isolation — there's no point
tuning a campaign whose first chapter doesn't feel good. Treat L1 as the
design playground until further notice.

---

## 1. Project context (one-screen orientation)

**boa-foodfight** is a turn-based ant-vs-spider strategy game. The
canonical TBS reference is Ogre Battle (`docs/ogre-battle-extract/`); the
canonical UI references are the per-view UI specs (`docs/ui-*-spec.md`,
ratified).

**Current state (what the design agent can assume exists):**

- A deployed, playable client: start menu → Hill → Briefing → live L1
  scenario → end-of-scenario screen → Hill (loop closes for one
  scenario). Source under `client/src/`.
- A splayed cube view (active face + four edge-docked peripherals,
  click-to-rotate) — the structural realization of the cube model.
- Engine surfaces in play: orders / `runTurn` / fog projection (client-side, per
  auto-pause draft §3d) / inject ↔ extract for the world loop / scenario-end
  by score path.
- The Ogre Battle extract on `main`: `docs/ogre-battle-extract/01–05`,
  with the editorial pass at `05-design-hooks.md` already nominating
  **B1 (Tarot dual-use deck)** as the single first pick, with **A2
  (behavior-gated promotions)** and **B3 (prologue questionnaire)** as
  runners-up.

**What is intentionally NOT in scope this phase:**

- World-loop / multi-scenario / L2+ / client save layer (deferred).
- §D visual/art direction (deferred separately; design hooks it any time).
- Engine-internal refactors not needed for an L1 mechanic adoption.

---

## 2. The five problems we are solving (PM-named)

| #   | Problem                                                                                    |
| --- | ------------------------------------------------------------------------------------------ |
| P1  | **Sparse engagement.** Battles cluster in one predictable spot at the end.                 |
| P2  | **Empty board.** Not enough POSTs / intermediate goals; just a push to the end.            |
| P3  | **Opaque combat.** Battle isn't descriptive enough — no sense of what occurred, no pause.  |
| P4  | **Flat-feeling roster.** Deployment doesn't matter; large/small/flying variety isn't felt. |
| P5  | **No drama.** No scripted story beats; nothing to pull the player around the board.        |

---

## 3. The rubric (apply to every proposed mechanic)

Each metric is either **AUTO** (computable from the event stream / scenario
data — re-measurable per change) or **OBS** (observable by a human play
session — closes the loop). Targets are a starting bar; revise with reason.

### P1 — Sparse engagement

- **M1.1 Combat temporal spread.** `(last battle turn − first battle turn) / MAX_TURNS`. **Target ≥ 0.50.** (AUTO)
- **M1.2 Combat spatial spread.** Distinct tiles × distinct planes where battles resolve. **Target ≥ 3 tiles across ≥ 2 planes**, _with at least one wall plane_. (AUTO)
- **M1.3 Player action density.** Turns on which the player issued/changed an order ÷ total turns. **Target ≥ 0.40.** (OBS)
- **M1.4 Time-to-first ant action.** Turn of the first ant-involved combat or capture. **Target ≤ 15.** (AUTO)

### P2 — Empty board

- **M2.1 POSTs per scenario.** Raw count after map gen. **Target 12–16.** (AUTO)
- **M2.2 POSTs per plane** (combat-relevant planes only). **Target ≥ 2.** (AUTO)
- **M2.3 Mean turns between ant-side non-goal captures.** **Target ≤ 8.** (AUTO)
- **M2.4 Decision-pull density.** When paused mid-scenario, can the player name ≥ 2 different meaningful things to do _right now_? Y/N. (OBS)

### P3 — Opaque combat

- **M3.1 Animated-battle ratio.** `battles with rounds.length > 0 / total battles`. **Target ≥ 70%.** (AUTO)
- **M3.2 Median rounds per animated battle.** **Target ≥ 3.** (AUTO)
- **M3.3 Modifier-stack visibility.** Per-battle modifiers (terrain / POST / card / rank) shown in panel? Today: **No** (engine forward-dep on `battle-resolved` payload). **Target Yes for ≥ 2 modifier types.** (AUTO/eng)
- **M3.4 Combat legibility.** A first-time viewer can name (a) winner, (b) main casualty driver, after one combat. Y/N. (OBS)

### P4 — Flat roster

- **M4.1 Mechanically-distinct templates per faction.** **Target ant ≥ 6, spider ≥ 4.** (AUTO)
- **M4.2 Movement / placement classes.** Distinct `planeAffinity` profiles. **Target ≥ 3.** (AUTO)
- **M4.3 Composition outcome variance.** Across ≥ 5 different ant compositions vs. fixed spider AI: **≥ 30% of outcomes flip** (win↔loss, or ≥ 25% delta in surviving HP). Measurable via `harness/diversity` / `run-batch`. (AUTO)
- **M4.4 Template utilization.** Templates that saw combat ÷ total templates per playthrough. **Target ≥ 0.70.** (AUTO)
- **M4.5 Counter-pick.** At least one rock-paper-scissors triangle where the player's _choice_ of squad determines the outcome. Y/N. (OBS)

### P5 — No drama

- **M5.1 Scripted beats per scenario.** Authored mid-scenario events (reinforcement arrival, NPC appearance, POST-flip moment, named-enemy entrance, etc.). **Target 1–2.** (AUTO/eng)
- **M5.2 Beat timing.** Spread across the scenario (≥ one in the first half, ≥ one in the second). (AUTO)
- **M5.3 Recall test.** After a playthrough, the player can name **one non-combat moment** they remember. Y/N. (OBS)

### Scoring a candidate mechanic (0–3 per problem)

- **0** no effect or worsens.
- **1** small shift on one metric.
- **2** moves multiple metrics meaningfully.
- **3** significantly moves the headline metric.

**Adoption threshold:** total ≥ 5 across the five problems **AND** ≥ 2
problems scored ≥ 2 (breadth, not one-trick).

---

## 4. Baseline measurements (already taken — anchor your projections to these)

Auto-measured against two L1 reference runs (seed 1): the canned baseline
(`gen-l1-replay`, competent ant AI vs `spider-l1`) and a passive-ant
(`turtle` vs `spider-l1`) run. The two bracket the felt player experience.

| Metric                 | Competent baseline (15 turns, spider win)   | Passive baseline (20 turns activity, then dead until cap; spider win) | Target                  |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------------------- | ----------------------- |
| P1.1 temporal spread   | **0.10**                                    | **0.14**                                                              | ≥ 0.50                  |
| P1.2 spatial spread    | 3 tiles / 2 planes (floor + ceiling)        | same                                                                  | ≥ 3 / ≥ 2 with ≥ 1 wall |
| P1.4 first ant action  | turn 2                                      | turn 1                                                                | ≤ 15                    |
| P2.1 POSTs             | **7** (5 base + 2 random)                   | 7                                                                     | 12–16                   |
| P2.2 POSTs / plane     | floor 2, ceiling 2, walls 1 / 1 / 1 / **0** | same                                                                  | ≥ 2                     |
| P2.3 ant cap gap       | 5 turns                                     | 2 turns (only 2 caps)                                                 | ≤ 8                     |
| P3.1 animated ratio    | 67% (6/9)                                   | 80% (4/5)                                                             | ≥ 70%                   |
| P3.2 median rounds     | **1.5**                                     | 3                                                                     | ≥ 3                     |
| P3.3 modifiers visible | NO                                          | NO                                                                    | YES                     |
| P4.1 templates         | **ant 12, spider 10, neutral 4**            | same                                                                  | ant ≥ 6, spider ≥ 4     |
| P4.2 movement classes  | **4 `planeAffinity` profiles**              | same                                                                  | ≥ 3                     |
| P4.4 utilization       | **ant 50% / spider 60%**                    | ant 42% / spider 50%                                                  | ≥ 70%                   |
| P5.1 scripted beats    | **0**                                       | 0                                                                     | 1–2                     |

Existing ant template ids:
`ant-queen / footman / archer / worker / scout / potato-bug / mage / tank / veteran-footman / sharpshooter / archmage / scout-elite`.
Spider:
`spider-queen / scout / soldier / spinner / elite / spiderling / veteran-soldier / knight / weaver / stalker`.

---

## 5. Reframed problem set (what the baseline actually reveals)

Three reframes that should change which OB hooks score well:

1. **The roster is NOT flat — it's _underused_.** 12 ant + 10 spider templates already exist with 4 distinct movement profiles; ~half never see combat (P4.4 = 50%). **"Add more units" would be redundant.** What moves the dial is **deployment incentives** that make the bench worth fielding — exactly what OB Tier A1 (earned stats), A2 (behavior-gated promotions), A3 (item-gated terminal classes), and B1 (situational Tarot use) attack. _Score these high on P4._

2. **The walls are abandoned.** Both baselines fight only on floor + ceiling (3 tiles / 2 planes — scrapes the target but on only one axis). East-wall has 1 POST, **west-wall has zero**. The "all in one spot" complaint (P1) is _geographic_. Adding POSTs on the walls + reasons to take them (objectives, reinforcement spawns, gold flow) is higher leverage than a flat POST-count bump alone. _Score wall-engaging mechanics high on P1 + P2 together._

3. **Combat is too quick to follow.** Competent baseline median = **1.5 rounds**; opening-volley kills dominate. P3 isn't only a panel issue — units _die too fast_ for the play-by-play to have content. Mechanics that lengthen combat (HP scaling on tier-3+, opening-volley as a visible "round 0" beat, defensive abilities like brace/heal) or surface modifier math score on P3.

Two more candid notes:

- **Drama (P5) requires both engine surface and authored content.** No `scripted-beat` event surface exists; the closest engine hook is `reinforcement-spawned` (inert on shipped maps). Mechanics that propose narrative beats must specify the **engine surface needed** + the **authored content**, and flag both as cost.
- **B2 (mortal queen)** reads differently after the baseline: she's already the win-loss pin but immobile, so the game collapses to "spider beelines for storm-drain." Making her **mobile + vulnerable** would force _the player_ to maneuver and _the spider_ to hunt — directly hitting P1.1, P1.2, P5.3 simultaneously. High blast-radius rewrite; flag as a spike-then-commit candidate.

---

## 6. What we want back

For each candidate mechanic you propose (from the OB extract or otherwise):

1. **Name + one-paragraph description.** What the mechanic does, in player terms.
2. **Rubric score**, 0–3 per problem, with the rationale per non-zero score. Total + breadth count.
3. **Engine / data / UI cost.** Flag which surfaces exist today (good), which need extension (cost), which need new authoring (cost). Distinguish: data-only changes (POSTs in `map.json`, units in `units.json`) vs. engine ops vs. new client surfaces.
4. **L1-containment check.** Does adopting this mechanic stay inside L1, or does it leak into the world-loop / Hill economy / save layer? Anything that leaks gets a yellow flag.
5. **Walk-back cost.** If it doesn't feel right, how hard is it to remove? Spike-friendly mechanics score better than one-way doors at this phase.

**Recommended deliverable shape:** an ordered shortlist of 2–4 picks
that _together_ push the rubric over the line, with the engine/data/UI
work each requires explicitly named. Above-the-fold: one paragraph
saying which problem each pick mainly attacks, so we don't accidentally
adopt four overlapping P4 mechanics and ignore P1.

**Routing:** Each adopted mechanic becomes its own Template-A change
request (one per pick), so dev can give feasibility per pick rather
than for the whole package. Promotion + §5 / §7.x records happen the
same way Exchange #13 did.

---

## 7. Constraints / non-goals (don't propose these)

- **No final art / illustration assets.** SVG primitives (circle, triangle,
  shape + color) are the ceiling; the §D visual pass is a separate
  workstream.
- **No world-loop / multi-scenario / save-layer work.** Deferred until L1
  is locked.
- **No engine surfaces "for free."** Anything you propose that needs a new
  event kind, a new field on an existing event, or a new operator gets
  costed explicitly as engine work.
- **No re-litigation of locked decisions.** Cube interaction model (§A),
  per-view UI specs, change-request protocol — all locked. Propose new
  mechanics, not new interaction models.
- **Stay measurable.** If a proposal moves _only_ observable-not-automated
  metrics, flag it explicitly — it'll be ratifiable only on play feedback,
  not on numbers.

---

## 8. Cross-references

- `docs/ogre-battle-extract/` — the source material; the editorial pass at
  `05-design-hooks.md` already pre-sorts the candidates.
- `docs/playability-critic-rubric.md` — existing related rubric; cross-check
  for overlap (don't reinvent criteria 1, 6, 7).
- `docs/change-request-protocol.md` — Template A shape; §5 ledger; §7.x
  decision records.
- `docs/roadmap-tier-1.md` §7.6 — the engine-freeze decision now paused for
  this phase.
- `docs/design-memo-mechanics-research.md` — existing mechanics-research
  memo that already cites OB and flags some of the same gaps.
- Engine surfaces worth knowing: `engine/types.ts` `ReplayEvent` union,
  `engine/turn.ts` `runScenario` / `runTurn`, `engine/world-inject.ts`
  (only relevant for L1's inject sanity).

---

## 9. Open question for design (before proposing)

The PM's instinct is that **P2 (POST density on the walls)** is the cheapest
unblock — bumping the map-gen mid-POST range from 3–5 to 5–7 _and_ moving
at least one POST onto each wall is a data-only change with no engine cost
and re-baselines gate-29 once. Worth doing as the baseline-shifter _before_
the OB picks land, so the rubric measures the OB picks against a denser L1
rather than today's sparse one. **Confirm or push back.**
