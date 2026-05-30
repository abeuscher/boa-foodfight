# Phase B (through L2) — kickoff & implementation plan

**From / To / Status:** Dev (Gameplay/Engine) → Self / PM-ratified scope.
**Stance:** Phase A (L1 frozen + 75% in-band) shipped. L1 UX polish loop
(Chunks 6.5–20) closed. **Pivoting to Phase B**, scoped per PM to
**L1 → L2 playable end-to-end, then pause and reassess.** Engine is
not locked here — the world-loop seams already exist in the engine
(`world-state`, `world-inject`, `world-save`, `extractWorldRoster`,
`applyRosterLevelUps`); the gap is on the **client**, where the
scenario fixture pipeline is L1-only at the moment.

---

## 1. PM directive (verbatim)

> So I think B is the right option through L2, then we should pause
> and see where we are it would not surprise me if adding a
> differently shaped level might end up causing us to want to rethink
> some stuff that is in place currently. so B should be to add L2 and
> complete the world loop that way and to that extent.

Plus, captured in the same exchange:

- **Mobile-mortal queen (#2 candidate) is shelved.** "Hard to
  implement and won't shift gameplay that much." Keep the candidate
  doc (`docs/drafts/l1-playtest-chunks-1-6.md` §3) intact — not
  deleted, just deprioritized — in case it's reconsidered after the
  L2 lap.
- **Combat pacing bumped 500 → 750 ms / step (Chunk 21).** Independent
  of this plan; lands in parallel.

---

## 2. What the canonical roadmap says

`docs/roadmap-tier-1.md` §9 "Phase B — Build the world loop":

> **Work:** roster persistence across scenarios, between-scenario
> party management, recruitment at home base, shop interaction,
> auto-save on scenario boundaries.
>
> **Exit:**
>
> - Two scenarios run end-to-end with a persistent roster between
>   them. (The second scenario can be a stub copy of L1 for this
>   milestone.)
> - The auto-save / scenario-boundary save loop fires.
> - Roster + gold + XP carry over correctly.

PM scope-tightens "second scenario can be a stub copy of L1" to
**second scenario is the real L2** (The Pipe — escort scenario). This
is a stricter exit than the roadmap names: we get one real
differently-shaped scenario, not a duplicate.

---

## 3. What's already built (so we don't redo it)

### Engine layer — mostly done

The engine has been carrying the world loop quietly for many chunks.
What's there:

- `engine/world-state.ts` — `WorldState` shape (`roster`, `gold`,
  `scenarioIndex`, `savedAt`, etc.).
- `engine/world-extract.ts` — `extractWorldRoster()` pulls the
  surviving + leveled roster out of a finished `GameState`.
- `engine/world-levelup.ts` — `applyRosterLevelUps()` folds XP into
  unit base stats between scenarios.
- `engine/world-inject.ts` — `injectWorldRoster()` rebuilds a fresh
  scenario `GameState` from `(scenarioData, seed, carriedRoster)`.
  Already named in comments as "the L1→L2 path"; handles the
  L2-specific Aunt Ant escort party composing with the carried
  veterans.
- `engine/world-save.ts` — save/load by `(campaignId, scenarioIndex)`
  with directory layout, format check, latest-save lookup. The
  harness uses it; the client doesn't yet.
- `engine/turn.ts` — terminal-check for `escort` / `eradicate` /
  `recruit-count` (L2 / L6 / L8) win types.
- `engine/state.ts` — `loadScenarioData()` parses any `data/level-N/`
  directory into a `ScenarioData`.

### Client layer — half-done

What works:

- `client/src/App.tsx` already runs the full loop in JS state:
  start → briefing → live → end → continue → hill → briefing → ...
- On victory: extracts roster, levels up, +gold, advances
  `state.scenarioIndex`, returns to Hill.
- Hub UI built: `Hill`, `OrganizeArmy`, `Recruit`, `Shop`, `System`.
- `Hill.tsx` displays `Scenario {scenarioIndex + 1}`.

What's L1-only:

- `client/scripts/gen-l1-scenario.ts` bakes only `data/level-1/`
  into a single `scenario-l1-data.json` fixture.
- `client/src/fixture.ts` imports the L1 fixture at compile time.
- `client/src/live/useLiveScenario.ts:3` — `import scenarioData from
'../fixtures/scenario-l1-data.json'`. Hard-coded.
- `client/src/briefing/Briefing.tsx` — likely L1-text-specific
  (needs audit).
- No client-side persistence — `state` resets on page reload.

### L2 data — shipped

`data/level-2/` is complete and balanced:

- `map.json` — 2 planes (floor + ceiling), 3-wide anti-diagonal
  channel, obstacle-masked, escort scenario type.
- `roster-ants.json` — includes the Aunt Ant escort party.
- All companion files (`abilities.json`, `units.json`, `posts.json`,
  etc.).
- Harness has measured L2 at ~76% win rate; engine semantics for
  `escort` work.

---

## 4. The actual gap — client fixture pipeline

The L1 → L2 transition is **engine-ready and client-not-quite-ready**.
The whole work item is teaching the client to:

1. Bake L1 + L2 fixtures from `data/level-{1,2}/`.
2. Look up the right fixture given `state.scenarioIndex`.
3. Run the briefing / scenario / end loop for whichever scenario is
   active.
4. Hand the carried roster to L2's `injectWorldRoster` so the L1
   veterans show up alongside L2's escort party.
5. (Optionally) persist `WorldState` to localStorage so a page
   refresh doesn't reset progress.

That's it. The engine pieces are all there.

---

## 5. Implementation plan — five thin chunks

These are sized to ship as independent PRs. Each lands on main; PM
plays after the last and we either find issues to grind or pivot
back to roadmap.

### Chunk B1 — Multi-level fixture bake

**Goal:** `client/scripts/gen-l1-scenario.ts` becomes
`gen-scenarios.ts`, baking `data/level-{1,2}/` into
`client/src/fixtures/scenario-{l1,l2}-data.json`. `client/src/fixture.ts`
exports both. No runtime change yet — just the fixtures sitting on
disk and importable.

**Touch:** `client/scripts/`, `package.json` script entry, `client/src/fixture.ts`.
**Risk:** trivial; same `loadScenarioData()` call, parameterized.
**Exit:** `pnpm gen:scenarios` produces both fixtures; both
typecheck-roundtrip cleanly.

### Chunk B2 — Scenario routing in the client

**Goal:** `useLiveScenario.ts` and `Briefing.tsx` consume the
fixture matching `state.scenarioIndex`, not the hardcoded L1 import.
A lookup table `SCENARIO_DATA: Record<number, ScenarioData>`.

**Touch:** `client/src/live/useLiveScenario.ts`,
`client/src/briefing/Briefing.tsx`, `client/src/fixture.ts`.
**Risk:** moderate — the briefing's plane/start/goal markers are
L1-specific in current text; needs to read from scenarioData rather
than hardcode.
**Exit:** advancing `scenarioIndex` past 0 routes the live engine
to L2's map.

### Chunk B3 — L2 roster injection on continue

**Goal:** the `onContinue` flow in `App.tsx` already calls
`injectWorldRoster` via `buildScenarioState` indirectly. Wire the
L2-specific bit: the carried roster (L1 survivors + levels) composes
with `data/level-2/roster-ants.json` (Aunt Ant escort party).
**Engine already does this** (`world-inject.ts:233-266`); it's about
verifying the client passes the right arguments and the in-scenario
view renders both party sets correctly.

**Touch:** `App.tsx`, `useLiveScenario.ts:buildScenarioState`,
possibly `LiveScenario.tsx`.
**Risk:** moderate — first time we render a scenario with two
distinct ant rosters (carried + escort). May surface UI assumptions
about a single home base.
**Exit:** L2 starts with Aunt Ant's escort party at pipe-entrance
**and** the L1 vets at their L2 home POST.

### Chunk B4 — Differently-shaped board sanity pass

**Goal:** L2 has **2 planes**, not 6. The splayed cube view (Chunks
19/20) assumes 6 faces. The four perimeter peripherals will be
empty / missing for L2's floor+ceiling-only world. Verify the cube
renders cleanly with absent planes; if not, degrade gracefully (hide
empty slots, or render them as "—" placeholders).

**Touch:** `client/src/live/CubeBoard.tsx`, `styles.css`, possibly
`Board.tsx`. **This is the PM's predicted stress point** — "adding a
differently shaped level might end up causing us to want to rethink
some stuff that is in place currently." Don't paper over issues
found here; flag them for the reassess gate.

**Risk:** medium-to-high — this is exactly where latent L1
assumptions will surface (peripheral count, FACE_LAYOUT
adjacency, plane-affinity rendering).
**Exit:** L2 plays end-to-end with a sensible cube view. Issues
that aren't blocking get listed for the reassess gate.

### Chunk B5 — Client-side save (localStorage)

**Goal:** persist `WorldState` to localStorage on every change and
restore on app boot. The engine save format (`world-save.ts`) is
the truth; the client either round-trips that exact format through
localStorage or uses a thin client save wrapper.

**Touch:** `App.tsx` (boot effect, write effect), possibly a new
`client/src/save.ts`.
**Risk:** low — single boundary, single key, single serializer.
**Exit:** page refresh between L1 win and L2 briefing preserves
the carried roster and `scenarioIndex`.

### Reassess gate (after B5)

PM plays L1 → L2 end-to-end. Output is a "what surprised us?"
list:

- Did the cube view degrade gracefully for L2's 2 planes? If not,
  what should change? (Splayed assumption, FACE_LAYOUT, etc.)
- Did the carried-roster + escort-party composition read clearly?
- Did anything about L2's narrow 1-D channel reveal an L1
  assumption (e.g., the path-peek preview, the order lifecycle,
  the recent-battle marks)?
- Did `escort` win condition feel like a game (rather than just a
  loss-trigger)?

**Output of the gate:** either (a) we keep grinding to ship L3, or
(b) we pivot back to something the L2 experience surfaced that
needs to land before we proceed. PM's call.

---

## 6. Out of scope for this Phase B lap

These are real items, **not on this lap**, captured here so they
don't accidentally creep in:

- **L3–L10 client routing.** Engine + data ready; the L2 lap proves
  the pipeline. Routing 3+ is mechanical work once the pattern is
  set, but is **its own chunk after the reassess gate**.
- **Hub UX polish.** Hill, OrganizeArmy, Recruit, Shop all
  technically work; their UX isn't pretty. Reassess gate may surface
  needs, but we don't proactively redesign here.
- **Battle screen takeover** (Chunk 17 brief). Still gated on the
  design session you mentioned firing up. Independent of Phase B.
- **Vertex / edge battle visibility** (Chunk 13 brief). Same status.
- **Mobile-mortal queen** (#2 candidate). PM-shelved.
- **M3.2 combat duration.** Still flagged in the playtest backlog as
  the M4.4 blocker. Not in this lap.
- **Auto-save by scenario boundary** (engine-style file persistence).
  The localStorage path in B5 is the client equivalent; matching the
  engine's `world-save.ts` file format is later work if/when we ship
  a native client.
- **Mid-scenario save** (roadmap §7.13). Way later.

---

## 7. Sequencing

Best path: ship B1 → B2 → B3 → B4 → B5 in sequence on main, each as
its own PR. Each chunk is one or two evenings of work; the whole
lap is a week or so of dev calendar.

Alternative: B1 and B5 can run in parallel branches (data-side and
persistence-side don't conflict). B2/B3/B4 must be sequential because
they each depend on the prior shipping.

PM decides whether to merge each PR as it lands or stack until B4
and play the whole arc at once.

---

## 8. Decisions captured in this exchange

- **Phase B scoped to L1 → L2 only**, with explicit reassess gate
  before L3+.
- **Mobile-mortal queen (#2) deprioritized**; candidate doc retained
  for future reconsideration.
- **Combat pacing bumped to 750 ms / step** (Chunk 21, separate PR).
- **L1 UX polish loop declared closed** — outstanding briefs
  (battle screen takeover, vertex/edge visibility) remain valid but
  off the critical path until Phase B is shipped through L2.
