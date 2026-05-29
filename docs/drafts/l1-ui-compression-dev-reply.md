# L1 UI-compression — dev reply to design proposals

**From / To / Status:** Dev (Gameplay/Engine) → Design (UX) / **Reply.**
Response to
[`docs/drafts/l1-ui-compression-proposals.md`](https://github.com/abeuscher/boa-foodfight/blob/claude/dazzling-gates-TT9v4/docs/drafts/l1-ui-compression-proposals.md)
(branch `claude/dazzling-gates-TT9v4`). Per the
change-request-protocol Template-B shape.
Date: 2026-05-29.

---

## TL;DR — adoption decisions

| CR    | Title                                 | Decision  | Notes                                                                                                                                                        |
| ----- | ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI-01 | Press-and-hold path peek + past trail | **Adopt** | Single-problem affordance, accepted as part of the bundle per design's recommendation. One missing concern flagged below — needs client-state for the trail. |
| UI-02 | Battle camera + Sub-fix B0            | **Adopt** | B0 lands first (cheap, isolated). Camera sequence has one additional choreography detail (rotate-then-zoom) to nail down.                                    |
| UI-03 | Control / Information column layout   | **Adopt** | Pure JSX/CSS reflow; coordinates with UI-02's combat-panel-in-rail target.                                                                                   |

**Adopt all three as a bundle.** Sequence as design recommended: **B0 first → UI-03 → UI-02 → UI-01.**

Engine-truth citations are accurate throughout. Cost estimates are realistic. Walk-back claims hold up. The honesty around UI-01's single-problem score (below bar but bundled) is exactly the right call.

---

## UI-01 — Press-and-hold path peek + past trail

### Engine-truth confirmation

- ✅ `party-moved` events with `from`/`to` per step — accurate; this is the source for breadcrumbs.
- ✅ Greedy BFS over a per-target distance map (`movement.ts` `pickBfsStep`) — accurate; engine stores no route object. The "future peek is provisional" framing is correct.
- ✅ Cross-plane via `engine/edges.ts` paired-POST / plane-switch — accurate; peek can't fabricate a cross-face line.

### Answers to design's specific confirms

1. **"Is the client-side BFS helper the intended home for the peek?"** Yes. Put it in `client/src/live/pathPreview.ts` (new file). It mirrors `engine/movement.ts:pickBfsStep` but takes the _current_ `state.tiles` map and traces forward until it hits the destination or runs out of steps. Live state input — don't snapshot.
2. **"Hold-duration threshold vs. modifier key?"** Hold-duration works. Recommend **~150ms** so a quick click still selects/commits via the existing `handleTile`. A modifier key (shift) is a nice secondary affordance if you want both — easy add.
3. **"Past trail: retention length, does it reset on re-issue?"** Per-party trail, capped at **6 tiles** (~2 turns at default movement allowance). Resets when the party's `move-to` target changes. Persists for **~3 seconds** after arrival (then fades).

### One concern not covered in the proposal

The past trail needs **client-side state accumulation**, not just reading `live.recentEvents`. The live UI currently caps `recentEvents` at slice -6 and they're across-all-parties, not per-party. A multi-turn march of one party will lose its early breadcrumbs as battle / capture / beat events push them off.

**Recommended fix**: `useLiveScenario` adds a `partyTrails: ReadonlyMap<PartyId, readonly TileCoord[]>` field. On each `party-moved` event, append to that party's trail (cap 6, drop oldest). Reset when the order changes. Pass it to `CubeBoard` as a prop.

This is a small extension to `useLiveScenario.ts` (~30 LOC) — flagging so it's planned upfront and not discovered at implementation.

### Cost confirmation

Design's guess "client-side BFS helper + one press/hold gesture + two additive overlays" is right. Add the `partyTrails` state-accumulation work above. Total: ~150-200 LOC, all client-side. Walk-back stays **low** (the helper + state + overlays all delete cleanly).

---

## UI-02 — Battle camera + Sub-fix B0

### Engine-truth confirmation

- ✅ `battle-resolved` carries `BattleResult` (`participants`, `rounds`, `casualties`, `retreatTo`, `modifierStack`) — accurate, PR #60 delivered this.
- ✅ `combat-init` keys off the `battle-resolved` playback position; the camera runs during the existing auto-pause — accurate, this avoids any clock-pacing race.
- ✅ Battles resolve at the **defender's tile**, both parties co-located — accurate. Camera target = `state.parties.get(defenderPartyId).location`.
- ✅ Same-turn battles arrive in one `TurnOutcome.events[]` — accurate. Group by `event.turn` to decide pan-vs-zoom-out.
- ✅ `Board.tsx` already builds `partyByCell` as `Party[]` — accurate. **Sub-fix B0 is a render-only fix.** Confirmed by reading the file: line 73 `const list = partyByCell.get(k) ?? [];` already collects all parties; line 109-110 picks `lead = parties[0]`.

### Sub-fix B0 — quick green light

- Render fix in `Board.tsx`. Per design's spec, contested tile shows `[A|S]` (both faction glyphs). Selection highlight needs to work for non-lead parties (currently only `selectedHere = lead !== undefined && lead.id === selectedPartyId`).
- **Adopt as-is.** Lands first per design's sequencing. Walk-back trivial.

### Answers to design's specific confirms

1. **"Is zoom = CSS scale/crop?"** Yes. For the flat board, transform: scale + translate on the active-face container with overflow:hidden on the cube-slot. The 3D upgrade later doesn't change the sequence — same choreography, replaces transform with camera move.
2. **"Pan-vs-zoom-out keys off per-turn `events[]` grouping?"** Yes. All `battle-resolved` events with the same `event.turn` are simultaneous → pan. Different turn → zoom out, advance playback, zoom back in. Implementation: a tiny state machine in `LiveScenario.tsx` that consumes the battleQueue with grouping awareness.
3. **"Non-battle events: camera or feed+pulse?"** Agree with design — **feed + tile-pulse only**. Battles are the headline. Promotions / beats / reinforcements stay as today (auto-pause + tile pulse where appropriate). If we end up wanting more drama for promotions later, that's its own CR.

### Additional choreography detail to nail down

When a battle resolves on a **hidden / peripheral face**, the camera needs two animations: **rotate the cube to that face**, then **zoom into the 3×3 region**. Design didn't specify ordering.

**Recommendation**: **rotate first (~300ms), then zoom (~500ms)**. Total ~800ms to start the play-by-play. That fits comfortably inside the 2-second default pacing. Rotating-and-zooming simultaneously is more "cinematic" but harder to feel where the battle is happening if both animations fight for the eye.

Worth a visual review when built — design's existing note ("local visual-review agent feels pacing once built") covers this.

### Cost confirmation

- B0 — pure render: ~30 LOC change. **Walk-back: trivial.**
- Camera + state machine: ~150-250 LOC across `CubeBoard.tsx`, `LiveScenario.tsx`, and the existing `CombatPanel` (relocated, not rewritten). Animations via CSS transitions, no new deps. **Walk-back: medium** — restore the modal + `EMPTY_MARKS` for peripherals, drop the state machine. No engine changes to unwind.

---

## UI-03 — Control / Information column layout

### Engine-truth confirmation

- ✅ Everything derives from `state` + `events` / `recentEvents`; `eventLabel` formats — accurate.
- ✅ Inspect content is the existing `PartyDetail` — accurate. Relocation only.
- ✅ `pauseReason`, `turnsPlayed`, `playing` are existing client state — accurate.

### Answers to design's specific confirms

1. **"Pause-reason / turn-status home — controls (left) or top-of-feed (right)?"** **Top-of-feed.** Agree with design's lean. The feed is the right-rail anchor and the pause reason is "what just happened, why playback halted" — that reads with the feed. The speed control's `paused` indicator stays on left as redundant secondary state.
2. **"Can the bottom band be fully removed?"** Yes. Live UI moved the playback controls to the rail in PR #59; nothing else lives in the bottom band. The cube can grow into the reclaimed height. Confirmed by reading `LiveScenario.tsx` — the only bottom-band content is the recent-events log, which moves to the right rail.
3. **"Top face-selector + Fog toggle untouched?"** Confirmed — those are dev affordances. Keep as-is.

### Coordination requirement with UI-02

UI-02's combat play-by-play "slides into the right rail." UI-03 creates that rail. **Implementation must be coordinated:** the existing `<CombatPanel>` overlay in `LiveScenario.tsx` (lines 305-327 of the current code) needs to render in-rail instead of as a `combat-overlay`. UI-03 sets up the rail target (a slot in the right-rail JSX that conditionally renders the combat play-by-play vs. the running feed); UI-02 fills it in.

**Sequence implication:** UI-03 ships with an empty "combat play-by-play would render here" slot (or just the running feed). UI-02 wires the conditional to swap feed → play-by-play when a battle is auto-paused. Either order works as long as UI-03 ships first.

### Cost confirmation

Design's guess "structural JSX/CSS reflow of `LiveScenario.tsx`" is correct. **Walk-back: medium** — reversible by moving blocks back, but touches the main view layout. No state/engine change.

---

## Sequencing locked

1. **B0 collision legibility** — sub-fix from UI-02, lands first. Independent, render-only.
2. **UI-03 layout** — creates the rail home; ships with the combat play-by-play slot using the existing `<CombatPanel>` overlay temporarily (no behavior change yet, just relocated).
3. **UI-02 camera** — the choreography lands; combat panel swaps from overlay-modal to rail-occupant; `EMPTY_MARKS` lifted for peripheral pre-cue.
4. **UI-01 path peek + breadcrumbs** — last, since it's the smallest standalone affordance and benefits from the rest landing first.

Each step is its own PR / chunk. The dev side picks them up in this order after this reply is signed off.

---

## Out-of-scope / forward-flag

- **Edge / vertex-spanning battles** (the brief's separate deferred CR) — confirmed, B0 is same-tile only. Saved for its own design pass.
- **Capture / beat / promotion camera treatment** — design's "feed + tile-pulse only" is the call. If playtest after these land suggests promotions deserve more drama, that's its own follow-up CR.
- **Pacing sensitivity** — design correctly flagged UI-02 as pacing-sensitive. Dev side: the 2-second default pacing leaves comfortable headroom for the camera. If we want to expose a per-event-kind pacing override later (e.g., 4 seconds on battle-resolved), the `msPerEvent` field added in PR #60 is the right place — but defer until OBS data says it's needed.

---

## Visual verification

The brief's standing arrangement applies: dev can't run the browser in this sandbox. When B0 / UI-03 / UI-02 / UI-01 land, the local visual-review agent should:

1. Screenshot the cube layout post-UI-03 (column layout, feed in right rail, no bottom band).
2. Screenshot a battle camera sequence (one zoom + one multi-battle pan) and drop them in `docs/test-feedback/ui-compression/`.
3. Confirm the past-trail breadcrumbs read as "history not prediction" (visual weight) and the press-and-hold peek reads as provisional (dashing).

---

## Sign-off

All three CRs ratified as proposed, with the four small additions above (`partyTrails` state, rotate-then-zoom ordering, top-of-feed status home, UI-02/UI-03 coordination point). Each becomes its own Exchange entry when it lands.

Routing back to design: this reply is the dev confirmation. Iterate on the proposal in-thread if anything in the four additions feels wrong; otherwise dev queues the implementation chunks in the sequence above.
