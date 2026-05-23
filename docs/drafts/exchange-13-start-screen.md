# Change Request: Start Screen (title / main menu)

From / To / Status: UX → Dev (Gameplay/Engine) / **RESOLVED — ratified,
route A.** Canonical record: `change-request-protocol.md` §5 Exchange
#13; decision record `roadmap-tier-1.md` §7.17; spec promoted to
`docs/ui-start-screen-spec.md`.

> **Resolution (for dev's build):** ratified. **Route A** — New Game
> routes straight into the live L1 scenario (skip both Briefing and
> Hill) as the interim, converging to `New Game → Briefing → scenario`
> once the Briefing is built; route B (→ Hill) declined. **Skip-Hill
> recorded** as a conscious ruling (no pre-L1 army management). Build
> the four-item menu + route A; this supersedes the current Start stub.
> Both New-Game confirmations and the Continue/Load/Options save-layer
> surprises are folded into the promoted spec.

Blocking: Non-blocking, batched. One item (New Game) needs wiring this
pass; the rest are stubbed. The substantive ask is what New Game
constructs and whether its route exists.

**Exchange number:** #13 (committed `change-request-protocol.md` §5 log
holds #1–#12; #12 = Tutorial Overlay).

## Solving for

A front door for the game, and specifically a wired **New Game** path so
a fresh player gets **into the L1 loop** dev is building for manual play.
The other three menu items (Continue, Load Game, Options) need to be
placed and stable now but not wired this pass.

## Proposed change

Ratify `docs/ui-start-screen-spec.md` (drafted at
`docs/drafts/ui-start-screen-spec.md`). A single full-screen title/menu
view with four items — **Continue · New Game · Load Game · Options** —
a selection model reusing the main-screen conventions, and a
version/build string. **New Game is the only item wired live**: it
initializes a fresh campaign state and routes to the **first scenario's
Briefing** (`ui-briefing-spec.md`) → cube view, skipping the initial
Hill visit. The first scenario is L1 today, L0 when the prologue ships.

**What is NOT changing:** Continue / Load Game / Options are
present-but-stubbed (render, hold their place, no-op until wired). No
Quit/Exit item (browser client). Visual treatment is §D-deferred. The
save-picker (Load Game) and settings (Options) surfaces are not specced
here. Antonio / Briefing content is unchanged.

## Why

It's the last missing surface before a clean end-to-end manual run
(start → L1 → loop). Speccing it now with a stable four-item shape means
Continue / Load / Options wire in later without moving the menu around.

## Our cost guess (please correct)

- **The button + routing is trivial UI.** The real substance is what
  **New Game constructs** — a fresh-campaign initial `WorldState` /
  roster (starting parties, gold, scenario index). We've recorded that
  as engine/scenario-data config, not UI. **Please confirm:**
  1. **Fresh-campaign init.** Does a "new campaign initial state" exist
     / is it cheap to produce (an authored starting roster + resources +
     scenario pointer), or is that itself unbuilt? This is the one piece
     we can't see the cost of.
  2. **Route-to-Briefing.** Does the New Game → first-scenario-Briefing
     → cube-view path exist in the current build, or is the entry
     currently elsewhere (e.g., straight into a scenario)? We want New
     Game to land wherever the real L1 entry is — correct us if Briefing
     isn't wired yet.
- **Continue / Load / Options:** zero this pass (stubs). Flag if any of
  the forward wiring (campaign-save resume, save-picker, settings)
  carries a surprise we should record now.

## What we want back

Decision (ratify into `docs/`), the two New-Game confirmations above,
and correction on the route/entry if Briefing→scenario isn't the
current path. Decision-record destination: `roadmap-tier-1.md` §7
(next free subsection, §7.17).
