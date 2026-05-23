# Start Screen — UX Spec (Title / Main Menu)

**Intended location:** `docs/ui-start-screen-spec.md`
**Status:** DRAFT — awaiting ratification through the change-request
protocol. The application entry point, upstream of every other view.
Simple by design; the only item wired live this pass is **New Game**.

**Posture.** The first screen on load — the title/main-menu surface
that precedes the campaign flow. It is not a between-scenario sub-view
(no resource strip, no Hill chrome); it is the app's front door. Most
of its menu is present-but-stubbed for this pass — only New Game
routes into gameplay, to support the L1 manual-play loop dev is
building.

## Purpose

Give the player a front door: a titled main menu offering Continue,
New Game, Load Game, and Options. For this pass it exists to get a
fresh player **into the L1 loop** via New Game; the other three items
are speccd-and-placed but wired later.

## Position in flow

```
   app load ──► Start screen
                   │
   ┌───── New Game (LIVE) ──► first scenario Briefing ──► cube view
   │
   ├───── Continue   (stub) ──► resume latest save  (save system, forward)
   ├───── Load Game  (stub) ──► save picker          (forward)
   └───── Options    (stub) ──► settings surface     (forward)
```

**New Game** is the only connected path this pass: it initializes a
fresh campaign state and routes to the **first scenario's Briefing**
(`ui-briefing-spec.md`) → cube view, skipping the initial Hill visit
(a brand-new game has no prior Hill state to land on; the first
return-to-Hill happens after the scenario via the existing
Continue→Hill flow). The first scenario is **L1** today and becomes
**L0** when the prologue ships (Exchange #7 / §7.11).

## Layout

A single full-screen view. Background art slot (left/full), title-logo
slot, a vertical menu list, and a version/build string in a corner —
the shared shape of the three references.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                  ┌──────────────┐  │
│                                                  │  TITLE LOGO  │  │
│   [ background key-art slot —                    └──────────────┘  │
│     diegetic to the ant war;                                       │
│     §D-deferred ]                                  Continue        │
│                                                  ▸ New Game        │
│                                                    Load Game       │
│                                                    Options         │
│                                                                    │
│  v<build>                                                          │
└──────────────────────────────────────────────────────────────────┘
```

Menu placement (right-aligned under the logo per Symphony of War, or
centered per Octopath/Bounty Train) is a visual-direction call
(§D-deferred); the spec fixes the **item set, order, selection model,
and wiring**, not the composition.

## Menu items

Order: **Continue · New Game · Load Game · Options.** Continue sits on
top **when a save exists**; when none exists it is hidden (or
disabled-styled), and New Game is the effective top item.

- **Continue** — resume the most recent save directly into where the
  player left off (the Hill hub, or mid-scenario via the save system,
  §7.13). Carries a **sub-label of the latest save's context** (e.g.,
  scenario + turn — the Bounty Train precedent) so resume is legible.
  _Stubbed this pass_ (present, inert or hidden-when-no-save); wiring
  is a forward-dep on the campaign-save surface.
- **New Game** — **LIVE this pass.** Initializes a fresh campaign state
  and routes to the first scenario's Briefing → cube view (see
  "Position in flow"). The button itself is trivial; the substantive
  part dev wires is the **fresh-campaign initial state** (starting
  roster, gold, scenario index) — an engine/scenario-data config, not
  UI.
- **Load Game** — open a save picker to choose among saved games.
  _Stubbed this pass_; the picker is its own forward surface (not
  specced here).
- **Options** — open a settings surface (audio, language, display,
  etc.). _Stubbed this pass_; settings contents are a forward surface
  (not specced here). Language lives under Options rather than as its
  own top-level item.

## Wiring status (this pass)

| Item      | This pass           | When wired (forward)               |
| --------- | ------------------- | ---------------------------------- |
| New Game  | **LIVE** → Briefing | —                                  |
| Continue  | present / stub      | campaign-save resume (save system) |
| Load Game | present / stub      | save-picker surface                |
| Options   | present / stub      | settings surface                   |

## Selection & interaction

Pointer (click an item) or keyboard (up/down to move the selection,
Enter to activate), with a clear selection indicator — the same
interaction conventions as `ui-main-screen-spec.md` (a highlight /
cursor / box; exact treatment §D-deferred). Stubbed items still
render and accept focus; activating one is a no-op (or shows a
"coming soon" affordance) until wired — they are not removed, so the
menu's shape is stable from this pass forward.

## Quit / Exit — intentionally omitted

Unlike the three references (Symphony's Shutdown, Bounty Train's Exit,
Octopath's Quit Game), this menu has **no Quit/Exit item**: the game is
a **browser client**, so there is no application to quit — closing the
tab suffices. Recorded so the omission reads as deliberate, not a gap.
If a hosted build later wants an explicit exit (e.g., back to a landing
page), it slots in as a forward addition.

## Fenced items / out of scope

1. **Visual treatment.** Background key-art, title-logo art, menu
   composition, selection styling — all §D-deferred (cube memo). The
   spec fixes structure and behavior, not the look.
2. **Save-picker surface** (Load Game's destination) — its own forward
   surface; not specced here.
3. **Settings contents** (Options' destination) — forward surface; not
   specced here.
4. **Audio / title music.** Forward; not specced here.
5. **Fresh-campaign initial state** (what New Game constructs) —
   engine/scenario-data config, not UX. The spec records that New Game
   triggers it and where it routes, not its contents.

## Forward dependencies

1. **Wire Continue** — resume the latest campaign save; depends on a
   campaign-level save surface (the §7.13 mid-scenario save is the
   in-scenario primitive; campaign-save is the broader forward piece).
2. **Continue sub-label** — the latest-save context line; depends on
   save metadata being readable.
3. **Wire Load Game** — the save-picker surface.
4. **Wire Options** — the settings surface (incl. Language).
5. **Background art + title logo** — §D visual-direction pass;
   optional idle animation is a later enhancement.
6. **First-scenario destination** — L1 today; becomes L0 when the
   prologue ships (Exchange #7 / §7.11). New Game's route follows
   whatever the campaign's first scenario is.

## Cross-references

- `docs/ui-briefing-spec.md` — New Game's destination (the first
  scenario's Briefing) and the entry into the cube view.
- `docs/ui-hill-hub-spec.md` — the between-scenario hub Continue
  resumes to (when a mid-campaign save exists); New Game skips the
  initial Hill visit.
- `docs/ui-main-screen-spec.md` — the selection / interaction
  conventions this menu reuses.
- `docs/roadmap-tier-1.md` §7.11 — L0 prologue, the eventual
  first-scenario destination; §7.13 — mid-scenario save primitive.
- `docs/design-memo-ui-cube-view.md` §D — visual-treatment deferral.

## Visual references (treatment direction, not specification)

- **Symphony of War: The Nephilim Saga** — full-bleed character
  key-art left, title top-right, right-aligned vertical menu with a
  box-outline selection; version string bottom-left. Primary reference
  for the key-art-plus-side-menu composition.
- **Bounty Train** — centered banner menu over a full scene,
  decorative dividers between items, and a **Continue with a save-context
  sub-label** ("Campaign, Pittsburgh, Dec 03, 1860"); copyright +
  version bottom-center. Reference for the Continue sub-label and the
  ornamented-menu option.
- **Octopath Traveler** — minimalist: black field, centered title,
  centered menu with a pointing-hand cursor on the selected item, thin
  dividers, copyright bottom-center. Reference for the restrained
  alternative if the key-art route isn't taken.

All references are inputs to the structural call; visual treatment is
deferred per cube memo §D.
