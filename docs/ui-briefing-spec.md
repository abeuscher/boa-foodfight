# Briefing View — UX Spec

**Status:** RECORDED — forward spec, not built.

## Purpose

The Briefing view is the surface between Hill Deploy and scenario start. It introduces the upcoming scenario in Sergeant Antonio's voice, then transitions into the scenario via a brief **orientation moment** that lets the player see and understand the room before gameplay begins.

This spec covers two contiguous beats: the **Briefing panel** (reading) and the **orientation moment** (dismissal animation). They are co-specced because they are one experience from the player's perspective — clicking Deploy on the Hill produces both before play starts.

This spec is also the **first half of the shared Briefing/Tutorial UI surface** noted as a forward dep in the Hill hub spec. The Tutorial dialogue overlay (in-scenario, when a new mechanic surfaces) uses the same panel pattern with a translucent overlay instead of a faded backdrop. Specifying that second use is left to a separate Tutorial overlay spec, but the panel structure here is intended to translate forward.

## Position in flow

```
Hill hub  ──Deploy──→  Briefing panel  ──OK──→  Orientation moment  ──→  Scenario (cube view, paused)
```

The Briefing is mandatory v1 — there is no skip-on-replay behavior. (Whether briefings should be skippable on scenario replay is a future gameplay/content decision, not a UX-spec call.)

## Layout

Three-band, with the resource strip carrying forward from the Hill for chrome continuity.

```
┌─────────────────────────────────────────────────────────────┐
│  [resource strip — buttons, jelly, ant count, …]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│       ┌────────────────────────────────┐                    │
│       │  Scenario Title                │                    │
│       │                                │  ┌─────────┐       │
│       │  Antonio body text             │  │ portrait│       │
│       │  (3-5 short paragraphs)        │  │         │       │
│       │                                │  └─────────┘       │
│       │  Goal statement                │  Antonio           │
│       │                                │                    │
│       │                          [OK]  │                    │
│       └────────────────────────────────┘                    │
│                                                             │
│         (Faded cube view behind, room in starting state)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Reference template: `tp4.png` (Tropico mission briefing). The panel structure is directly translatable — title, body, portrait, OK stamp — with the world visible-but-faded behind.

## Chrome elements

### The Briefing panel

Centered, occupies the middle of the screen, sized to its content (not full-screen). Framed in the same chrome treatment as other panels in the game (Nephilim Saga / Tropico chrome reference).

**Structure, top to bottom:**

1. **Title** — the scenario name (e.g., "The Tub," "The Hallway Tile"). Styled as the panel's header.
2. **Body text** — Antonio's briefing, 3–5 short paragraphs. Sets the scene, names the obstacle, names the goal, lands a personality beat (Cleo reference, Roman vocabulary, etc.). Written in his voice.
3. **Goal statement** — a single short line stating the explicit objective ("Capture the drain cover," "Eradicate the spiders," "Recruit five workers from the colony"). Distinguished visually from the body text — possibly a different color or treatment — so the player can find it at a glance without re-reading the briefing.
4. **OK dismissal** — a stamp-style button in the lower-right of the panel, matching `tp4.png`'s treatment.

**No reward callout v1.** Per current canon, scenarios have goals but no points/bonuses/per-scenario rewards. A reward slot would sit between Goal Statement and OK if and when scenario rewards become a concept.

### Antonio's portrait

Right-aligned within (or alongside) the panel, with his name beneath in styled text.

**Treatment** (per cube memo §D, visual-style direction only — not visual specification):

- Stylized illustration in the cinematic-miniature aesthetic — A Bug's Life / Antz actor-character reference (project assets `bugslife.png`, `antz1.png`).
- He must read as the same character visible in the Hill scene, just rendered larger and head-on.
- Centurion silhouette: crested helmet, gladius or staff if practical, posture upright and slightly stern.

**Spec leaves room for future animation.** The portrait is a still image v1. If/when voice work happens, the portrait should be specced to support a lipsync/animation pass without changing the surrounding layout. Forward dep noted below.

### Resource strip (top)

Same resource strip as the Hill — buttons, jelly, ant count, and whatever else the engine team confirms. Persistent across Hill and Briefing for chrome continuity. (Same engine-confirm dep as in the Hill spec.)

## World elements

### Faded cube view (background)

Behind the Briefing panel, the **upcoming scenario's cube view renders at reduced opacity** — the room in its starting state, with units positioned where they'll be when play begins.

This is intentional: the player reads the briefing while _already looking at_ the room they'll be playing in. By the time they hit OK, they've half-oriented themselves.

**Treatment:**

- Faded to roughly 40–60% opacity (tunable).
- Static — units do not animate, hover effects do not fire, the world is dim and still.
- Active face is the same active face the scenario will open on.
- All chrome from the main-screen spec (HUD, rails, etc.) is **hidden** at this point — only the cube view itself renders, faded, behind the panel.

The Tropico tp4 reference uses the same convention: world visible behind the briefing panel, slightly desaturated, the player oriented before they dismiss.

## Behavior — the orientation moment

**Triggered when the player clicks OK on the Briefing panel.**

The orientation moment is a brief animated sequence that flashes the scenario's spatial endpoints so the player understands where they are and where they're going before gameplay begins. Duration: roughly 2–3 seconds end-to-end.

### Default sequence (capture-post)

1. **Briefing panel dismisses** — fades out (~200ms).
2. **Cube view fades to full opacity** — the faded backdrop becomes the live world (~200ms).
3. **START pulses** — a glow or marker animation on the player's starting tile. Pulses 2–3 times over ~800ms.
4. **Directional indicator travels** — a stylized indicator (glowing dot, arrow, or similar) travels from START in the general direction of GOAL across the active face. If GOAL is on a peripheral face, the indicator travels toward the appropriate gutter edge. Duration ~600ms.
5. **GOAL pulses** — same treatment as START, on the goal tile. Pulses 2–3 times over ~800ms.
6. **Game begins, paused.** Per pacing memo §A.1, scenarios open paused; player can plan before un-pausing.

**Critical canon constraint:** the directional indicator is **not** a path preview. Per cube memo §A.3, no specs surface routes, valid-tile glow, reachability overlays, or anything implying a planned path. The orientation indicator is:

- A stylized element that travels _above_ the play area, not along it.
- A straight or simply-curved trajectory, not following terrain or pathing logic.
- Visually distinct from anything that could be mistaken for a unit movement preview.
- Faded out before gameplay begins so it doesn't persist.

The point is _direction_, not _route_. The player learns "GOAL is over there"; nothing implies "your units will travel like this."

### Variants by victory kind

The default sequence above assumes a spatial GOAL on the active face. Other victory kinds have different shapes; treatments below.

- **Escort scenarios.** START and GOAL are both engine-exposed. START is the escort-target party's location (from the roster's `startingLocation` for that party); GOAL is the escort destination POST (from the escort `victoryCondition`). Sequence is the default sequence applied to that pair.

- **Eradicate scenarios.** No single GOAL location. Sequence: START pulses as default → enemies-to-eradicate pulse (one at a time if reasonable, simultaneously if too numerous). No directional indicator — direction isn't the concept. Total duration ~2–3 seconds; specifics tuned per scenario.

  **Intentional fog interaction.** The orientation moment reveals enemy starting positions that the spider-visibility / pheromone fog will then re-hide once gameplay begins. This is a **deliberate one-shot fog exception for orientation legibility** — the orientation moment is a privileged "see the shape of the fight" beat, not a continuous information surface. It exists because eradicate scenarios are otherwise opaque on entry; the player needs _some_ hook to understand what they're facing before play starts. Once the orientation moment completes, fog resumes as normal and the revealed positions become un-revealed unless and until the engine's visibility rules expose them. This trade-off is intentional and ties to playability-rubric legibility; flagging it explicitly so the fog-bypass isn't implicit.

- **Recruit-count scenarios.** GOAL is a count condition (recruit N of X), and per engine reality (recorded at `docs/level-progression-plan.md` §4g) the target is **not** a POST and **not** a fixed location — it spawns as a single neutral party on a randomly-chosen non-floor/ceiling plane per seed, unknowable pre-resolution. There is no recruit POST tile to point at. Sequence: START pulses as default → goal-condition overlay text appears briefly stating the count requirement ("Recruit 1 from the colony" or similar). **No directional indicator** — direction is undefined pre-spawn. Total duration ~2 seconds.

- **Future victory kinds.** Treatment to be defined per scenario spec; the orientation-moment vocabulary (pulses, optional directional indicator where direction is engine-definite, no path preview) carries forward.

This handling depends on the scenario's victory kind being legible to the orientation system. Engine-side confirmation needed — see forward deps.

## Forward dependencies

### New deps surfaced by this spec

1. **Antonio's voice library.** Same content workstream noted in the Hill hub spec. The Briefing depends on having a body of his lines per scenario. Without them, the spec describes a container, not its content.
2. **Antonio portrait illustration.** A single illustrated image v1, with the layout leaving room for future animation/voice support without rework. Art-pipeline dep.
3. **Goal statement copy per scenario.** A single short line per scenario, separate from the body text. Lives with the scenario specs (not this spec).
4. **Per-scenario briefing content.** Each scenario needs its own briefing body, title, and goal statement. Lives with scenario specs.
5. **Per-scenario tuning of the orientation moment.** The treatments above cover capture-post, escort, eradicate, and recruit-count at the structural level. Per-scenario specifics — exact pulse timings, overlay text content, future victory kinds — live with the individual scenario specs.

### Existing canon this spec touches

- **Cube memo §A.3 (no path preview).** Honored — the orientation indicator is direction-only, not route. Specced explicitly so the constraint doesn't drift in implementation.
- **Cube memo §A.1 (stylized transition, not simulated camera).** Honored — the orientation moment does not pan, zoom, or simulate camera motion. The world is already framed when the panel dismisses; only the indicators animate.
- **Pacing memo §A.1 (default paused on scenario start).** Honored — gameplay begins paused after the orientation moment completes.
- **Hill hub spec — Briefing forward dep.** This spec resolves that dep; the Hill spec can be revised at its next safe window to cross-reference this one.
- **Playability rubric criterion 7 (naive-player loop).** Partially unblocked by landing this spec — the Briefing surface is the primary surface a naive player encounters scenario context through. Criterion 7 remains formally dormant until a Tutorial overlay spec also lands.

### Engine-team confirmations needed

- **Victory kind is exposed to the UI layer at scenario start.** The orientation moment needs to know which victory kind it's setting up for (capture-post → use default; eradicate → use eradicate variant; etc.). Confirm the data is available pre-scenario-start.
- **GOAL location data per victory kind.** Capture-post and escort have explicit GOAL tiles. The orientation system needs read access to those pre-start. (No engine change anticipated; just confirming the data path.)
- **Resource strip contents** — same engine confirm as the Hill spec; resolved together.

## Quarantined / out of scope

- **Skippable briefings on replay.** Out of scope v1. Briefings show every time. If gameplay later decides replays should skip briefings, that's a future revision.
- **Voice acting / audio.** Out of scope v1 — Antonio is text-only. The portrait layout leaves room for future VO support without rework. Production-decision dep.
- **Multi-stage briefings.** Out of scope v1 — single panel, single OK dismissal. If a scenario needs multi-stage briefing (e.g., Antonio talks, then a NPC talks, then a map preview), that's a future enhancement.
- **Pre-game placement step.** Out of scope per cube memo §0 / §D #1 — no placement phase exists. The orientation moment goes straight from briefing dismissal into the scenario's hardcoded starts.
- **Briefing dismissal beyond OK.** No "Skip," "Replay Briefing," or "Notes" affordances v1. Single OK button, single forward path.

## Cross-references

- `docs/design-memo-ui-cube-view.md` §A.1 (stylized transition), §A.3 (no path preview), §D (visual-style deferred).
- `docs/design-memo-pacing-and-turn-cap.md` §A.1 (default paused on scenario start).
- `docs/level-progression-plan.md` §4g — recruit-count engine reality (informs the recruit-count variant).
- `docs/ui-hill-hub-spec.md` — Deploy verb leads here.
- `docs/ui-main-screen-spec.md` — the cube view the orientation moment hands off to.
- `docs/playability-critic-rubric.md` criterion 7 — partially unblocked by this spec.
- Project assets:
  - `tp4.png` — primary panel structure reference (Tropico mission briefing).
  - `ss7.png`, `ss9.png` — secondary portrait + dialogue treatment references (Ogre Battle).
  - `bugslife.png`, `antz1.png` — Antonio portrait character reference.
