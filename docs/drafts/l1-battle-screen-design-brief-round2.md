# Design session — battle in-zoom composition (round 2)

**From / To / Status:** Design (UX) → Dev (Gameplay/UX) / **Template-A
proposals + refined rubric.** Round-2 of the battle-screen conversation;
narrows `l1-battle-screen-design-brief.md` (round-1 / Chunk 17 / PR #76)
to the *in-zoom phase only*. Filed for dev pickup after Phase B's L2 lap
and the reassess gate (`phase-b-through-l2-plan.md`).

**Stance:** Engine locked. This is **layout-and-presentation only** — it
repositions entities and text that already render during the zoom phase
into a more legible composition. No new content, no new mechanics, no new
engine data. Anything the engine doesn't ship is flagged as a forward
dep, not assumed.

---

## 1. Scope (narrower than round 1)

Round-1 asked the big question — *should a battle take over the whole
screen?* — and sketched five directions (D1 takeover … D5 letterbox).
Round-2 takes the **answer as already constrained by the shipped
implementation**: the battle does **not** take over the screen. It plays
inside the **zoomed active face**. The camera auto-rotates to the
contested face and scales 2.5× onto the defender's tile
(`CubeBoard.tsx:CAMERA_ZOOM`); peripherals dim to 0.45; a vignette pulls
focus; the `CombatPanel` slides into the right rail; the feed fans prose
underneath; playback auto-pauses on `battle-resolved`.

This session specifies **what that frame looks like and where the
text/entity panels sit** between camera-engage and camera-disengage.
Everything before (turn playback) and after (resume) is out of scope.

The five questions on the table (session prompt):

1. Is the zoomed 3×3 the right surface, or should something else dominate?
2. Should the `CombatPanel` move out of the rail into a more central spot?
3. Where does the prose feed live — beside the HP bars, under the stage, a ticker?
4. Modifier stack — keep, move, or hide?
5. What motion belongs to *entering* vs *exiting* battle?

---

## 2. What the frame looks like today (evidence)

Ground truth is `docs/test-feedback/chunk-19-splay/07-battle-camera-composed.png`
— the camera composed onto the defender tile. Reading it straight:

- **Center (≈60% of width):** the active face zoomed 2.5×. We see a 3×3-ish
  region: empty floor tiles and a single gold-outlined `A` pawn on the
  contested tile. The peripheral walls (West / East / Floor) sit dimmed at
  the frame edge. **This dominant surface carries almost no battle
  information** — no HP, no attacker, no damage, no prose. During the
  fight nothing on it moves (auto-paused). It is the biggest thing on
  screen and the least informative.
- **Left rail (control):** squad roster + order buttons + pacing controls.
  Untouched by the battle; correctly recedes.
- **Right rail (≈100 px effective, information):** the prose feed —
  `web spun` · `mp spent` · `deep-raider m…` · `neutral-stinkb… wall` ·
  `vanguard-alph…` — **clipping mid-word**. This is where the actual battle
  narration lives and it is unreadable. The `CombatPanel`'s two unit
  columns + modifier stack stack *above* this same rail, sharing its width.

**The diagnosis is a composition inversion.** The surface with the most
pixels (zoomed cube) has the least battle content; the surface with the
most battle content (rail) has the least room. The player is asked to read
HP in a 280-px column, pair it with prose clipping at 100 px, while staring
at a near-empty 3×3 that takes the center of their visual field.

Round-1's framing ("battle is the focal surface but rendered in a 280-px
sidebar with prose disconnected from HP movement") is **still exactly
true** — round-1 didn't fix it, it specified a takeover that wasn't built.
Round-2 fixes it *without* a takeover, by recomposing inside the zoom.

---

## 3. The dead-space insight (the lever this session pulls)

When the camera engages, the four **peripheral gutters dim to 0.45**
(`styles.css` `.cube.cube-camera-active .cube-peripheral`). During the
zoom phase those peripherals are previews of **non-contested faces** —
they carry no information the player needs *right now*. They are
**prime, already-dimmed real estate** flanking the contested tile.

Today we throw the battle content into a 280-px rail and let ~40% of the
screen (the dimmed gutters) sit empty. The recomposition this session
proposes: **let the battle composition occupy the gutters around the
zoomed tile**, so the contested tile is *framed by* the fight rather than
*replaced by* a rail. The eye reads **attacker → contested tile →
defender** across one horizontal line, with prose directly beneath. This
is the Ogre Battle dual-panel pattern (round-1 §3) mapped onto the zoom
frame we already ship — no takeover required.

---

## 4. Refined acceptance rubric (C1–C9)

A round-2 proposal lands cleanly when it commits to each of these. (Numbered
C-N to distinguish from round-1's B-N; C-N is the *in-zoom* rubric.)

- **C1 — Surface hierarchy.** Name what dominates the frame during the
  zoom phase and what recedes. The contested tile must stay visible
  (spatial anchor: *where* the fight is). Rank: stage / unit panels /
  prose / modifiers / cube periphery.
- **C2 — Unit-panel placement.** Where the attacker and defender columns
  sit relative to the contested tile. They must be visually equal in
  weight (neither side is the "main" one) and must read as flanking the
  contest, not stacked in a sidebar.
- **C3 — HP↔prose eyespan.** The per-action prose line and the HP-bar tic
  it describes must be in **one eyespan** (round-1 priority #2, still the
  headline goal). Name the spatial relationship.
- **C4 — Prose treatment.** Live beat vs. scrollback. Does the current
  action read as a single large line (ticker) or a growing list? Where
  does persistent scrollback live, and does it recede during playback?
  The clipping-rail failure (§2) must be designed out.
- **C5 — Modifier-stack treatment.** Keep / move / hide. If kept during
  playback, where, and how it avoids competing with the per-action beat.
  Pre-roll vs. corner card vs. on-demand.
- **C6 — Per-action beat.** What animates per 750-ms step: HP-bar tween +
  `-N` damage flash + attacker glow + prose append, at minimum (all
  already in `CombatPanel`). Killed-unit grey-out timing; whether a
  leader's death gets a marked beat.
- **C7 — Enter / exit motion.** What motion belongs to camera-engage
  (the 2.5× zoom already exists at 500 ms) vs camera-disengage. When do
  panels appear/leave relative to the zoom settle/pull-back.
- **C8 — Multi-battle flow.** The `index of total` strip already exists.
  Same surface cycles or a between-combat beat; where "Combat 2 of 4"
  reads in the new composition.
- **C9 — Watch-mode controls.** Continue / Skip-this-combat /
  Skip-all-this-turn must stay reachable and stay where the player's hand
  already expects them; name the anchor and enable/disable states.

A proposal does **not** need: per-pixel sizes, colors, font sizes (name
hierarchy; dev fits tokens in `styles.css`), or any animation beyond the
four the engine already gives (HP tween, damage flash, prose append,
grey-out).

---

## 5. Proposals

Three Template-A variants against C1–C9. **Recommended: A-1 (Framed
Contest).** A-2 and A-3 are the cheaper/safer fallbacks, named so the
trade is explicit.

### Template-A-1 — "Framed Contest" *(recommended)*

The contested tile stays center as a **stage**; the battle composition
moves into the dimmed peripheral gutters so the fight *frames* the tile.

- **C1 — Hierarchy.** Stage (zoomed contested tile, kept) and the two
  unit panels are **co-equal foreground**. Prose ticker is secondary.
  Modifier card and cube periphery recede. The zoomed tile is demoted
  from "the information" to "the where" — it's the spatial anchor, not
  the read surface.
- **C2 — Unit panels.** Attacker column docks in the **left gutter**,
  defender column in the **right gutter** (matching the engine's
  attacker/defender sides and the existing `cb-attacker`/`cb-defender`
  split). They flank the zoomed tile so the eye reads **attacker →
  contested tile → defender** on one line. Each keeps today's card:
  ★-leader mark, role label, HP bar, HP numbers, `-N` flash, `acting`
  glow, `down` grey-out. Equal width, equal weight.
- **C3 — HP↔prose.** The live prose line sits in the **bottom gutter,
  directly under the zoomed frame**, centered between the two flanking
  panels. When "Round 2: footman attacks soldier for 3 (4/7 HP)" prints,
  the defender card's HP bar tics and the `-3` flashes on the *same
  beat*, and the panel, the tile, and the line are all within one
  eyespan — the round-1 #2 goal, finally satisfied.
- **C4 — Prose.** **Live beat = one large centered line** under the
  stage (the current action only), swapped each 750-ms step. **Persistent
  scrollback stays in the right rail** but visually recedes during the
  zoom phase (it's there for "what just happened / scroll back," not the
  live read). This kills the clipping failure: the live line gets the
  full bottom-gutter width instead of 100 px. Source: `summarizeBattle()`
  lines, unchanged.
- **C5 — Modifiers.** **Collapse to a corner card** (top-left or
  top-right gutter), labelled by plane, showing the attacker/defender
  ±axis rows. Default collapsed to a one-line summary ("Modifiers:
  Terrain +2, Post +1 · tap to expand"); expandable on hover/click. It
  is *context for why the numbers are what they are*, read before/after
  the beat, so it must not compete with the per-action animation. Stays
  in the takeout; does not move to a separate post-battle surface.
- **C6 — Beat.** Unchanged from `CombatPanel` today (it already does the
  four animations). Addition this composition *enables* (not new engine
  data): because the cards now sit beside the tile, the **`acting` glow
  can also pulse the contested tile's outline** on the attacker's beat,
  tying the prose to the board location. Killed unit greys out *after*
  the damage flash resolves (~one beat hold). A **leader's death** holds
  the beat ~1 extra step (a delta on the 750-ms base, named per round-1
  §6.5) — the only pacing delta proposed.
- **C7 — Motion.** **Enter:** the 2.5× zoom (500 ms, exists) is the entry;
  the two unit panels **slide in from their gutters** as the zoom settles
  (panels arrive at ~400–500 ms, riding the camera). **Exit:** on
  Continue/queue-empty, panels slide back out to the gutters first
  (~250 ms), *then* the camera pulls back to 1× (the existing 400 ms
  ease-in). Panels never linger over an un-zoomed board.
- **C8 — Multi-battle.** Same surface cycles. The "Combat n of m this
  turn · attacker vs defender" strip (exists, `cb-strip`) pins to the
  **top edge of the zoomed frame** (top gutter, opposite the modifier
  card). Between combats: a brief cross-fade of the two panels (~250 ms)
  while the camera re-targets the next contested tile, so the player
  registers "different fight," not "same one again."
- **C9 — Controls.** Continue / Skip-this-combat / Skip-all-this-turn
  dock at the **bottom-right of the bottom gutter**, on the same band as
  the prose ticker (prose left/center, controls right). This is roughly
  where `cb-foot` controls already sit relative to the panel, so muscle
  memory holds. Skip-this-combat enabled until the beat finishes;
  Skip-all only when `total > 1`; Continue enabled on `done` (all
  unchanged from today's logic).

**Why recommended:** maximal legibility for the least new surface — it
reuses every existing piece (`CombatPanel` columns, `summarizeBattle`
lines, modifier rows, the zoom, the dim) and just *re-anchors* them into
the dead gutter space. It satisfies C3 (the headline goal) directly, and
it's the closest of the three to the Ogre Battle dual-panel reference
without any takeover.

**Build note / forward dep (flagged, not assumed):** A-1 relocates
`CombatPanel`'s subtrees out of the rail into gutter-anchored regions
around `.cube-camera-frame`. That is a **layout/DOM re-parent + CSS**
job, not an engine job — but it does mean the combat panel stops being a
rail child and becomes an overlay positioned against the cube frame. If
that's a heavier lift than dev wants for the L2 lap, A-2 is the drop-in
fallback.

### Template-A-2 — "Inflated Band" *(cheap fallback)*

Keep the `CombatPanel` shape but **stop confining it to the rail** —
inflate it into a **wide lower-third band** docked across the bottom of
the zoomed frame.

- **C1/C2:** attacker column | (VS / stage echo) | defender column,
  laid out horizontally across a full-width band (not a 280-px rail).
  The zoomed cube keeps the upper ~⅔; the band takes the lower third.
  Contested tile stays visible above the band.
- **C3/C4:** prose runs as a **dedicated column on the right of the
  band** (round-1 D2), or as a ticker line spanning the band's top edge.
  Full band width means no clipping.
- **C5:** modifier stack collapses to the band's left edge as a card.
- **C6:** unchanged. **C7:** band slides up from the bottom as the zoom
  settles; slides down on exit. **C8:** strip on the band's top edge.
  **C9:** controls at the band's right end.

**Trade:** cheapest dev path (the panel keeps its internal structure,
only its container changes from rail to bottom band), preserves muscle
memory, but the unit panels sit *below* the contested tile rather than
flanking it — so the "attacker → tile → defender" line reads top-to-
bottom-ish rather than left-to-right, and the panels don't frame the
contest as cleanly. Still a large legibility win over today.

### Template-A-3 — "Gutter Panels, Rail Prose" *(minimal-move fallback)*

A-1's flanking unit panels (left/right gutters) **without** moving the
prose. Prose stays in the right rail but the rail is *widened during the
zoom phase only* and the **live action line is pinned + enlarged at the
top of the feed** so it doesn't clip.

- Satisfies C2 (flanking panels) and partially C4 (pinned live line, no
  clip) but **weakens C3** — prose is still off to the right of the HP
  bars, not under them, so HP↔prose isn't a single eyespan.

**Trade:** smallest DOM change (panels move, feed stays), but it leaves
the round-1 #2 goal only half-met. Listed as the floor, not a
recommendation.

---

## 6. Reference annotations

### 6a. Round-1 Ogre Battle reference (still applies)

From `l1-battle-screen-design-brief.md` §3 + `docs/ogre-battle-extract/`:

**Import (structural):**
- **Dual unit panels, opposite anchors, equal weight** → A-1's
  left/right gutter panels. This is the load-bearing move.
- **Per-action beat** — one attacker acts, number pops over the target,
  HP tics, then the next → already shipped in `CombatPanel`'s 750-ms
  step; the composition just makes it legible.
- **Leader marked** → already have ★; keep.
- **Center stage = the action** → A-1 keeps the contested tile as the
  stage and pulses its outline on the acting beat (C6).

**Skip (explicitly):**
- **Troop sprites / unit silhouettes** — PM was explicit in round-1: use
  our role labels + faction colors, no sprites. (And `ui-battle-mode-spec.md`'s
  sprite/stage-art layer is §D-deferred — do not pull it into this
  layout pass.)
- **Full-screen takeover** — round-2 is *within the zoom frame*; the
  world map (cube) stays as spatial anchor. Do not import OB's "world
  disappears."
- **Terrain/floor backdrop art** (porcelain/countertop) — §D-deferred;
  the zoomed tile *is* the backdrop, no new art.
- **Off-stage combo banners** (`ui-battle-mode-spec.md`) — L7-relevant,
  not L1/L2; don't compose for it now, but A-1's top gutter is where it
  would land later.

### 6b. PM-supplied SNES references — *pending*

The session prompt notes the PM will share SNES-era tactical battle
screens at session start to anchor the structural target. **They are not
yet in the repo.** When dropped (suggest
`docs/test-feedback/battle-screen/round2-*.png`), this section gets the
import/skip annotation pass and the proposals above are reconciled
against them — in particular which reference confirms *flanking* (A-1)
vs *stacked-below* (A-2) unit panels. Until then the proposals lean on
the round-1 Ogre Battle anchor, which already points at A-1.

---

## 7. Forward deps (flagged, not assumed)

Nothing in §5 requires new engine data. The two non-engine flags:

1. **A-1 re-parents `CombatPanel` out of the rail** into gutter-anchored
   overlays around `.cube-camera-frame`. Layout/CSS work, not engine —
   but a real refactor of where the panel mounts (`LiveScenario.tsx`
   info-rail slot → cube-frame overlay). If too heavy for the L2 lap,
   A-2 keeps it a single band and is near-drop-in.
2. **Contested-tile outline pulse on the acting beat (C6)** wants the
   `CombatPanel` to know which board tile is the stage. The camera
   already computes `cameraTarget`; the panel would need that coord
   passed in. Trivial prop, no engine change — flagged only because it
   crosses the panel/board boundary.

Both are dev-side build calls, not design forward-deps on the engine.

---

## 8. Handoff

- **Pick:** A-1 (Framed Contest), with A-2 as the named cheap fallback if
  the re-parent is too heavy for the L2 lap.
- **Deliverable status:** Template-A ×3 + refined C1–C9 rubric, filed for
  dev ratify after the reassess gate.
- **Open for PM:** drop the SNES references so §6b gets annotated and the
  flanking-vs-stacked question (A-1 vs A-2) is settled against them.
- **Dev action when picked up:** ratify / push-back / request-revision per
  the change-request protocol; engine-truth confirmation on C6's
  tile-coord prop and the leader-death pacing delta.
