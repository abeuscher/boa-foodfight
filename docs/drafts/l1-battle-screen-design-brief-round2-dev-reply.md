# Dev reply — battle in-zoom round-2 (A-1 ratified)

**From / To / Status:** Dev (Gameplay/UX) → Design (UX) / **Ratified.**
Reply to `docs/drafts/l1-battle-screen-design-brief-round2.md` (the
round-2 brief, A-1 PM-approved).

**Stance:** A-1 (Framed Contest) accepted as-spec with no push-back.
This doc closes the change-request exchange for the round-2 in-zoom
composition and records the three engine-truth confirmations §8 of
the brief asked for. **Implementation waits for the Phase B reassess
gate** per the brief's own §1 ("Filed for dev pickup after Phase B's
L2 lap"); no code change in this PR.

---

## 1. Acceptance

Ratified clean: every item in C1–C9 fits the existing engine + UI
surfaces. No request-revision, no push-back. A-2 stays named as the
cheap fallback if the overlay refactor turns out heavier than
budgeted at pickup time; A-3 retired (weakens C3).

§4b's structure call — flat top-level overlay above a dimmed cube,
not a routed new view — is the right read. The Chunk-20 precedent
(face labels floated out of the `preserve-3d` subtree) is the same
move applied to the panels; it avoids the z-sorting fight inside the
splay subtree and keeps the scenario auto-paused beneath without a
teardown.

---

## 2. Engine-truth confirmations (§7 / §8 forward deps)

### §7.2 — Tile-coord prop for the contested-tile outline pulse (C6)

**Confirmed available.** `LiveScenario.tsx` already derives
`cameraTarget: TileCoord | null` from the active `battleQueue` entry
(`battle.defenderPartyId` → defender party's `location`) and passes
it to `CubeBoard` for the 2.5× zoom translate. The battle-overlay
sibling can read the same value from the same source; passing it as
a prop to a future `BattleOverlay` is one line in `LiveScenario.tsx`,
zero engine change.

### §7.3 — Faction-derivable side mapping (ants-always-left)

**Confirmed client-side.** `BattleResult.participants[].templateId`

- `state.unitTemplates.get(templateId).faction` gives the unit's
  faction without an engine change. The client already maps
  faction → glyph for the board (`A` / `S`); the overlay does the same
  lookup to decide which gutter a roster docks in. PM-confirmed
  "ants left, spiders right" via the wireframe.

### §7.4 — Action-stream interleaving for the volley back-and-forth (C3)

**Confirmed interleaved by agility.** `engine/combat.ts:221`
`computeAgilityOrder` sorts **all units (both sides)** together by
agility with a per-unit RNG tiebreak. `runRound` in `engine/battle.ts`
walks that order once for front-row units (both sides), then once for
back-row units (both sides), pushing one `action` per actor per round.

So the action stream isn't strictly alternating — it's
**agility-ordered across both sides, twice per round (front then
back)**. In practice high-agility ants and high-agility spiders
interleave; same-agility runs (e.g. multiple footmen on one side)
produce small same-side bursts before the other side fires.

For the ping-pong A-1 wants: most beats land on the opposite side
from the previous beat, but runs of 2–3 on the same side are
expected when one side has more units in a given row or higher
agility concentration. **The volley reads as designed** — the
movement isn't a strict tennis rally, it's an agility-paced
exchange. That matches the Ogre Battle reference (units fire by
initiative, not by alternation) better than a forced strict alt
would. No design change needed; just naming the actual rhythm.

If at implementation time the runs feel too long, the cheapest
softener is a tiny intra-run pacing nudge (delay same-side beats by
~+150 ms, alternation gets the base 750 ms) — but that's an
implementation-time tuning call, not a design change.

### Additional check — C6 leader-death pacing delta

**Confirmed available.** `BattleResult.rounds[].actions[].killed`
flags every killing blow. The engine fires a separate `leader-died`
event (`engine/battle.ts:1221, 1224`) when the killing blow hits a
leader. Either signal lets the overlay add the proposed +1-step
pause on a leader's death — no new engine data. Implementation will
read `killed` against the leader-id list from `participants[]`
since that's already in scope.

---

## 3. Implementation notes (for the chunk that picks this up)

Captured so the future-dev doesn't re-discover them:

- **Mount point.** Today `LiveScenario.tsx` mounts `CombatPanel`
  inside the right rail (`<div className="info-rail">`). The
  overlay should mount as a **sibling of `.scenario`** (the
  scenario-root div), not inside the rail. Existing `battleQueue`
  state + `cameraTarget` derivation already drive when the panel
  shows; route both to the new overlay component instead. The rail
  can keep the scrollback feed (per C4) and drop the rail-`CombatPanel`
  mount.
- **Naming.** A new `BattleOverlay` component sibling to
  `CombatPanel` keeps the rail panel available as a fallback during
  development (toggle by feature flag if needed, drop once the
  overlay ships).
- **Stacking context.** The cube uses `transform-style: preserve-3d`
  on `.cube` / `.cube-slot` / `.cube-peripheral` /
  `.cube-peripheral-stage` (Chunk 19/19b). The overlay must sit on
  a **flat** stacking context above all of that — at the scenario
  root, with its own `z-index`, no `preserve-3d` ancestors. Same
  fix Chunk 20 used for the face labels.
- **Dimming.** `cube-camera-active` already dims peripherals to
  0.45. The overlay should _also_ dim the active face and rails
  beneath itself (a backdrop layer at e.g. `rgba(0,0,0,0.55)`)
  rather than relying on the existing peripheral dim — the existing
  dim was scoped to "battle camera engaged," not "battle overlay
  open."
- **Skip controls (C9).** Continue / Skip-this-combat / Skip-all-
  this-turn live in `CombatPanel.tsx:cb-foot` today. The overlay
  takes them as-is into the bottom-right of the bottom gutter; the
  underlying handlers (`onContinue`, `onSkipAll`, internal `setBeat`
  for skip-this) thread through unchanged.
- **Ping-pong flash anchor (C3 PM-directed).** The `flashed` /
  `attackers` maps in `CombatPanel.tsx` already key on `unitId`. The
  overlay just decides which side's panel that unit belongs to and
  applies the existing `cb-dmg` flash there. No new data.
- **Centered banner (C3/C4).** `summarizeBattle()` already produces
  the prose line text per action; the overlay surfaces the current
  action's line as a centered banner above the stage. The
  scrollback continues in the right rail's feed (one source of
  truth — `feedLines.ts`).

---

## 4. Sequencing

Per the brief's §1 stance and PR #83 / `phase-b-through-l2-plan.md`
§5: this lands **after** B5 (client-side save) closes the Phase B
L2 lap and the **reassess gate** runs. PM's L2 playthrough may
surface things that re-prioritize against the battle overlay; we
hold the chunk until then.

If after the reassess gate the overlay is still next-up, dev opens
a chunk (likely `Chunk N — battle in-zoom overlay (A-1)`) that
picks up this reply + the brief.

---

## 5. Open items for design (none)

No questions back. Brief is complete and pick-up ready.
