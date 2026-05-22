# Back on the Hill — UX Spec (Between-Scenario Hub)

**Status:** RECORDED — forward spec, not built. Companion to the
per-view UI spec set (main-screen, battle-mode, party-detail,
end-of-scenario) and the cube-view / pacing design memos; recording
status mirrors theirs. The Hill hub UI does not exist; this document
specifies what it should be when built.

## Purpose

The Hill is the player's between-scenario surface — the home base the campaign returns to between every scenario, deployed and recalled from the same place. Mechanically a hub-and-spoke menu; thematically the colony's home turf.

The UX presents the Hill as the persistent between-scenario state — the same place every time, regardless of which scenario was just completed or which is coming next. This is a UX-side requirement that creates a **gameplay-review dependency** on `docs/roadmap-tier-1.md` §6.4–6.5: the persistent-hub model is incompatible with the §6.5 L1/L5/L7/L10 "no shop" schedule as currently written. The UX does not retire §6.5 unilaterally — per cube memo §0, UI specs do not make gameplay rulings. The dependency is flagged for the gameplay process to resolve. Inventory-refresh cadence (when the Grasshopper has new stock) is a separate content/balance decision and is also left to the gameplay team.

## Position in flow

```
[New game]        \
                   ──→  Hill hub  ──→  Briefing  ──→  Scenario (cube)  ──→  End-of-Scenario  ──┐
[End-of-Scenario Continue] ──→  Hill hub                                                       │
                                  ↑──────────────────────────────────────────────────────────┘
                                  │
                                  └──→ sub-views (Organize Army, Recruit, Shop, System)
                                              ↑
                                              └── back to Hill
```

The Hill is the persistent rest state. Sub-views return to it; scenarios start from it (via Briefing) and end into it (via End-of-Scenario → Continue).

## Layout

Three-band, modeled on the Symphony of War base screen (project asset `n5.png`).

```
┌─────────────────────────────────────────────────────────────┐
│  [resource strip — buttons, jelly, ant count, …]            │
├──────────────┬──────────────────────────────────────────────┤
│  Deploy      │                                              │
│              │                                              │
│  Organize    │                                              │
│  Army        │       The Hill — rendered scene              │
│              │       (anthill, grasshopper, staging,        │
│  Recruit     │        Antonio visible, ambient ants)        │
│              │                                              │
│  Shop        │                                              │
│              │                                              │
│  System      │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  Scenario N: <Title>                                        │
│  <brief third-person framing line>                          │
└─────────────────────────────────────────────────────────────┘
```

Top band: thin resource strip. Middle band: verb rail (left) + Hill scene (right). Bottom band: scenario-context strip.

## Chrome elements

### Verb rail (left)

Five vertical framed buttons, top-to-bottom in this order:

1. **Deploy** — initiates the next scenario. Visually weighted as primary action (larger, brighter, or framed as the obvious affordance). Leads to the Briefing view, not directly to the scenario.
2. **Organize Army** — between-scenario squad-rearrangement view. (Separate forward spec.)
3. **Recruit** — recruit new ants from the anthill. (Separate forward spec.)
4. **Shop** — visit the Grasshopper for items, trades, exchanges. (Separate forward spec.)
5. **System** — save, load, settings, quit. Standard system-menu pattern; not designed here.

**The Anthill and Grasshopper are presented as distinct UI surfaces on diegetic grounds.** Recruits are _born_ into the colony at the Anthill — the colony's own nursery, speaking the colony's voice. Items are _bought_ from the Grasshopper — an outside trader you deal with at arm's length. The diegetic distinction is the UX-side rationale. It implies a gameplay-structure decision (Recruit and Shop as separate systems rather than tabs within one Marketplace, as `n3.png` shows in Symphony of War), which is a **gameplay-review dependency** per cube memo §0. If the gameplay team prefers a unified Marketplace, the diegetic rationale still holds — but the UX collapses into a single sub-view with tabs, and the verb rail loses an entry.

**Tech tree slot reserved (not built v1).** A tech tree is anticipated as a likely future addition, modeled on the Symphony of War pattern (`n4.png`). When it lands, it slots into the rail between Shop and System.

### Resource strip (top)

Persistent across the hub. Surfaces the colony's current pocket-state.

Provisional contents — **to be confirmed with the engine team, who tracks the authoritative resource list:**

- Buttons (currency)
- Royal Jelly
- Ant count
- Other resources as the engine tracks

**Queen HP is not in the strip.** The intended UX behavior is that the Queen is at full HP between scenarios — surfacing her HP at home would imply she's an ongoing status to monitor, which she shouldn't be. This depends on the engine treating Queen HP as scenario-bound rather than a persistent campaign resource. **To be confirmed with the engine team** alongside the resource list below.

### Scenario-context band (bottom)

Two lines, modeled on n5's "Chapter 21: Liberating Sandraka" treatment:

- **Title line**: `Scenario N: <Title>` — the next scenario, not the just-completed one.
- **Framing line**: a short, neutral, third-person sentence about the upcoming scenario ("The next room is wet, slippery, and full of soap.").

**This is not Antonio's voice.** The framing line is ambient text — the game speaking, not the centurion. Antonio's voice is reserved for the Briefing view (see below).

## World elements

### The Hill scene (right side of middle band)

The Hill is a real place at ant scale, rendered per the world-side principles of the chrome/world split (cube memo §B).

Visible in the scene:

- **The anthill** — a mounded earth structure, the colony proper. Diegetic referent of the Recruit verb.
- **The Grasshopper** — present, resting somewhere nearby. Diegetic referent of the Shop verb.
- **A staging area / parade ground** — open space where squads gather. Diegetic referent of Organize Army.
- **Sergeant Antonio** — visible somewhere prominent (likely at the anthill entrance or staging area), recognizable by silhouette and posture, but **mute on this view**. He speaks at the Briefing, not here.
- **Background ants** — workers moving, queen visible if/where appropriate. Atmospheric.

The scene is **flat for v1** — it does not respond to campaign state. State-responsive Hill (returning damaged ants, visible roster size, low jelly stores) is recorded as a v2 forward dep below.

Mood: warm-lit, end-of-day, safe place. Distinct from the cool fluorescent bathroom, harsh kitchen, dim garage of the scenario faces. The Hill is _home_; lighting and palette carry that.

(Per cube memo §D, visual-style finalization is deferred; the above
is build **direction**, not a visual specification.)

References:

- `miniscule1.png`, `miniscule2.png` — the "real place at ant scale" treatment, mood-lit cinematic miniature.
- `bugslife.png`, `antz1.png` — actor character; the ants must read as ants from posture and silhouette.

## Sergeant Antonio — character and role

Antonio is the game's recurring narrator/companion-character.

**Character:** Roman Centurion archetype — Italian, gruff, vocal, punchy. Roman-legion vocabulary used affectionately (the legion, the front, the campaign, parties as _centuriae_, Queen as Caesar). Has a girlfriend, Cleo, he occasionally references as "my queen" — a running gag against the actual Queen of the colony. Cleo references should be incidental flavor, not a defining tic.

**Role:** Voice of mission briefings, in-scenario tutorial guidance, and general player-facing narrative beats.

**Where he speaks:**

- **The Briefing view** — between Deploy and scenario start. Introduces each scenario.
- **The Tutorial dialogue overlay** — in-scenario, when a new mechanic surfaces.
- _(Possibly end-of-scenario commentary — to be folded into a future revision of the end-of-scenario spec if appropriate.)_

**Where he does NOT speak:**

- **The Hill hub.** He's visually present but silent. Players see him; they don't hear from him until they Deploy.

**Briefing and Tutorial overlay are likely the same UI surface** — a portrait + dialogue treatment (compare `ss7.png`, `ss9.png`) rendered against either a scenario backdrop (Briefing) or a translucent overlay on the cube view (Tutorial). Specifying the shared surface is a separate forward spec; it's noted in the deps list below.

## Behavior

- **Click a verb-rail button** → transition to that sub-view. Each sub-view has its own back-to-Hill affordance.
- **Click Deploy** → transition to the Briefing view. Antonio speaks. From Briefing, the player advances into the scenario (cube view).
- **Return to Hill** from any sub-view, and from End-of-Scenario via Continue. The sub-view back-to-Hill affordance is a **chrome-band affordance, not a content affordance** — sub-views render the back control as part of the persistent shell chrome (top-band corner or fixed frame element), not as a button inside the sub-view's own content area. This keeps every sub-view's back affordance in the same screen location across the family. See `docs/ui-shell-integration-spec.md` "The back-to-Hill affordance."
- **No state confirmation modals** on the hub itself. Sub-views handle their own confirms where needed (e.g., spending currency in Shop).

## Forward dependencies surfaced by this spec

### New specs this spec implies:

1. **Briefing view spec** — Antonio + scenario intro. Shared surface with the Tutorial overlay. **RECORDED** as `docs/ui-briefing-spec.md` — Deploy's destination now exists; this dep is resolved (the Tutorial-overlay half remains a separate forward spec). **Cross-doc linkage:** the Briefing/Tutorial-overlay surface is effectively the nascent tutorial-design doc that `docs/playability-critic-rubric.md` criterion 7 (naive-player loop) is explicitly gated on. Landing the Briefing spec partially unblocks rubric criterion 7.
2. **Organize Army spec** — squad-rearrangement sub-view. **Note:** this is the UI for **deferred Phase-B gameplay** (cube memo §D #3 — full party-rearrange is recorded as deferred Phase-B feature work). The spec describes the player-facing surface; landing it does not greenlight the gameplay.
3. **Recruit / Anthill spec** — recruit sub-view, diegetic to the anthill. **Note:** the engine today has only the deliberately-minimal recruit hook (cube memo §D #3). The v1 spec must scope to that minimal hook, with deferred-Phase-B expansion noted as a forward dep within the sub-view spec itself.
4. **Shop / Grasshopper spec** — marketplace sub-view. **Note:** UI for **deferred Phase-B gameplay** (the full shop is recorded as deferred per cube memo §D #3). Structure may follow the `n3.png` tab pattern (Recruit / Trader / Sell / Exchange — our "Recruit" tab being moot if and only if the gameplay-review dependency above resolves in favor of the split structure).
5. **Antonio voice library** — content question, not a UX one, but Briefing and Tutorial specs both depend on having a body of his lines to work against.

### Existing forward deps this spec touches:

- **End-of-scenario "Continue" destination** — was an open forward dep in `docs/ui-end-of-scenario-spec.md`. **Now resolved:** Continue leads to the Hill hub. Update the end-of-scenario spec accordingly at next revision (a reciprocal cross-ref is added there when this records).
- **Roadmap §6.4–6.5 shop schedule** — **gameplay-review dependency — RESOLVED.** At the consolidated end-of-Phase-D review the user ruled **"Retire §6.5 schedule now"**: the persistent-hub model is adopted and roadmap §6.5's per-scenario L1/L5/L7/L10 "no shop" schedule is **retired/superseded** (`roadmap-tier-1.md` §6.5 marked SUPERSEDED). The Hill is the persistent between-scenario hub; the Grasshopper shop and Anthill recruit surface are available every time the player is at the Hill. Inventory-refresh cadence is a separate Tier-2 content/balance decision. This dependency is closed; no remaining open Tier-1→Tier-2 UX/gameplay seam.
- **Recruit-vs-Shop as distinct systems** — **gameplay-review dependency — RESOLVED.** At the consolidated end-of-Phase-D review the gameplay process ruled **Recruit and Shop are two distinct systems** (the Anthill/Grasshopper diegetic split is ratified, not collapsed to a unified Marketplace). The verb-rail split (entry §"Verb rail" above) stands; the verb rail keeps both entries; the `n3.png` unified-Marketplace fallback is **not** taken. This dependency is closed.
- **Pacing memo §D #3 (campaign/world-loop stalemate semantics)** — still OPEN engine-side. The Hill hub does not yet differentiate behavior between returning from a win, a loss, or a stalemate. This is a known gap; resolution is gameplay-side and feeds back into this spec when decided.

### Engine-team confirmations needed:

- **Resource strip contents** — the provisional list (buttons, jelly, ant count) is a starting point. The authoritative list lives with whoever owns the resource model.
- **Queen HP between scenarios** — UX assumes she's at full between scenarios (scenario-bound, not a persistent campaign resource). Confirm this matches the engine model before the resource strip is locked.

## Quarantined / out of scope

- **Pre-game placement.** Per cube memo §0 / §D #1, no placement phase exists; rosters hardcode `startingLocation`. Deploys go from Briefing straight to the scenario's hardcoded starts. If pre-game placement is ever built, it slots between Briefing and scenario start as a new view.
- **Tech tree.** Acknowledged future addition (`n4.png` reference); rail slot reserved between Shop and System. Not v1.
- **Mid-scenario reorganization.** Out of scope — Organize Army is between-scenario only, consistent with cube memo §0 quarantine of mid-scenario unit editing.
- **State-responsive Hill scene.** Flat for v1. v2 enhancement: scene reflects roster condition, jelly stores, post-scenario damage, etc.
- **Save-system specifics.** Handled by the System verb's standard menu; not designed here.

## Cross-references

- `docs/design-memo-ui-cube-view.md` — chrome/world split (§A), world-loop quarantine (§0, §D #3).
- `docs/design-memo-pacing-and-turn-cap.md` §D #3 — campaign/world-loop stalemate semantics (open).
- `docs/ui-end-of-scenario-spec.md` — Continue button destination is this hub.
- `docs/ui-main-screen-spec.md` — the scenario view this hub deploys into.
- `docs/ui-shell-integration-spec.md` — shell layer that records the between-scenario chrome pattern this spec implements (resource strip persistence across sub-views; three-band layout; chrome-band back-to-Hill affordance).
- `docs/ui-briefing-spec.md` — Deploy leads here; resolves the Briefing forward dep above (reciprocal).
- `docs/playability-critic-rubric.md` criterion 7 — naive-player loop, gated on the tutorial-design surface the Briefing spec begins.
- `docs/roadmap-tier-1.md` §6.4–6.5 — **gameplay-review dependency** (shop schedule incompatible with persistent hub).
- Project assets:
  - `n5.png` — primary layout reference.
  - `n3.png` — sub-view tab pattern (Shop / Marketplace structure).
  - `n4.png` — deferred tech-tree pattern.
  - `tp1.png` — chrome panel framing reference (Tropico journal).
  - `miniscule1.png`, `miniscule2.png` — scene realism.
  - `bugslife.png`, `antz1.png` — actor character.
