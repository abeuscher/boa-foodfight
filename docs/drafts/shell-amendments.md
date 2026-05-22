# Reciprocal amendments — UI shell integration layer

**Intended location:** `docs/drafts/shell-amendments.md` (drafts
bundle; each amendment will land in its target spec when
ratified)
**Status:** Drafted, awaiting ratification. **Revision 2** —
amendment 1 (`ui-main-screen-spec.md` save-touchpoint binding)
removed per Exchange #10 dev reply (§3c); the auto-pause
companion demoted `save-touchpoint` to forward-dep, so there is
no current event to bind. The remaining four amendments are
unchanged from revision 1. Companion to
`docs/ui-shell-integration-spec.md` (this session). Each
amendment follows the §A.4 precedent — RECORDED status,
reciprocal cross-reference back to the shell spec.

This bundle contains four small amendments to per-view specs
that the shell integration layer touches. They are batched here
for ratification; on ratification each amendment edits its
target spec directly. The shell spec carries the forward half
of each cross-reference; the spec being amended carries the
reciprocal half.

---

## Amendment 1 — `docs/ui-hill-hub-spec.md`

**Section affected:** "Behavior"
**Type:** Additive recording (constrains a previously-loose
affordance pattern).

### Change

Replace the bullet:

> - **Return to Hill** from any sub-view, and from
>   End-of-Scenario via Continue.

With:

> - **Return to Hill** from any sub-view, and from
>   End-of-Scenario via Continue. The sub-view back-to-Hill
>   affordance is a **chrome-band affordance, not a content
>   affordance** — sub-views render the back control as part
>   of the persistent shell chrome (top-band corner or fixed
>   frame element), not as a button inside the sub-view's own
>   content area. This keeps every sub-view's back affordance
>   in the same screen location across the family. See
>   `docs/ui-shell-integration-spec.md` "The back-to-Hill
>   affordance."

### Reciprocal cross-reference

Add to the spec's existing cross-reference list:

> - `docs/ui-shell-integration-spec.md` — shell layer that
>   records the between-scenario chrome pattern this spec
>   implements (resource strip persistence across sub-views;
>   three-band layout; chrome-band back-to-Hill affordance).

### Rationale

The hub spec previously left each sub-view to invent its own
back affordance. Without a shell constraint, four sub-views
would land four different back patterns over time, eroding
coherence. The shell rule constrains the affordance to a
known shell location; the spec records the constraint so the
sub-view specs (Organize Army already recorded; Recruit and
Shop drafted/pending) honor it.

---

## Amendment 2 — `docs/ui-briefing-spec.md`

**Section affected:** "Behavior — the orientation moment" (the
section that describes what happens when the player clicks OK)
**Type:** Additive recording (adds an affordance not previously
specified).

### Change

Add a new section before "Behavior — the orientation moment":

> ### Cancelling out of Briefing
>
> The Briefing panel includes a back-to-Hill affordance for
> cancelling out without deploying. The affordance is the
> shell's standard chrome-band back control (top-band corner,
> consistent with sub-views per
> `docs/ui-shell-integration-spec.md` "The back-to-Hill
> affordance"). Clicking it returns the player to the Hill
> without starting the scenario.
>
> The OK button remains the primary forward action. Back is a
> secondary affordance for players who clicked Deploy and want
> to make further preparations (visit a sub-view, save, etc.)
> before committing.

### Reciprocal cross-reference

Add to the spec's existing cross-reference list:

> - `docs/ui-shell-integration-spec.md` — shell layer that
>   records the between-scenario chrome pattern this spec
>   participates in (resource strip continuity from Hill;
>   chrome-band back-to-Hill affordance for Briefing
>   cancellation).

### Rationale

The Briefing spec previously had a single forward path (OK
into the scenario) with no way to back out short of opening
the system menu. This was likely an oversight rather than a
deliberate choice — sub-views have back affordances; the
Briefing is structurally similar and should have one too. The
shell records the affordance here so it's consistent across
between-scenario surfaces.

---

## Amendment 3 — `docs/ui-end-of-scenario-spec.md`

**Section affected:** "Forward dependencies (not silent gaps)"
**Type:** Cross-reference completion (the hub spec already
recorded its half of this; the end-of-scenario spec needs the
reciprocal note).

### Change

In the "Forward dependencies (not silent gaps)" section,
replace the existing "Post-scenario destination" bullet:

> - **Post-scenario destination** — **now specified** by
>   `docs/ui-hill-hub-spec.md`: Continue returns to the Hill
>   hub (reciprocal of that spec's "End-of-scenario Continue
>   destination" resolution). This spec still does not own the
>   world-loop screen (§0); it hands control to the Hill hub as
>   the named destination, and the Hill spec carries the
>   world-loop gameplay-review deps.

With:

> - **Post-scenario destination** — **resolved** by
>   `docs/ui-hill-hub-spec.md` and recorded in
>   `docs/ui-shell-integration-spec.md`: Continue returns to
>   the Hill hub. This spec still does not own the world-loop
>   screen (§0); it hands control to the Hill hub as the named
>   destination, and the Hill spec carries the world-loop
>   gameplay-review deps. The shell layer's "Mode transitions"
>   section records the Continue→Hill transition as a brief
>   fade-out / fade-in following the shell's stylized-transition
>   default.

### Reciprocal cross-reference

Add to the spec's existing cross-reference list:

> - `docs/ui-shell-integration-spec.md` — shell layer that
>   records the takeover chrome pattern this spec implements
>   (no top bar, no rails, no HUD pod, no notification strip)
>   and the Continue→Hill transition treatment.

### Rationale

The Continue→Hill destination was previously half-recorded —
the hub spec recorded the destination, but the end-of-scenario
spec's forward-dependency bullet was still phrased as if the
resolution had only been noted from one direction. The shell
layer pulls the loose end fully closed and adds the transition
treatment (stylized fade, not simulated camera) on top.

---

## Amendment 4 — `docs/ui-battle-mode-spec.md`

**Section affected:** "Layout" (the section that begins "The
cube view does not remain visible behind the combat panel —
the panel is a full-attention focus surface…")
**Type:** Additive recording (closes silence on whether the
non-cube chrome elements persist).

### Change

After the existing sentence about the cube view not remaining
visible, add:

> The other in-scenario chrome elements — left rail party
> roster, right rail contextual actions, HUD pod, and
> notification strip — are also hidden during the battle
> panel. The panel reads as the full attention focus that the
> design calls for; partial chrome would dilute the focus and
> conflict with the panel's own scenario-context strip and
> matchup-context panel.
>
> When the panel auto-dismisses to the paused cube view, all
> hidden chrome resurfaces. The notification strip surfaces
> the combat recap at that moment (per "Auto-pause and
> resume," below). The HUD pod's speed control already shows
> paused, since combat-init triggered the auto-pause.
>
> See `docs/ui-shell-integration-spec.md` "In-scenario mode"
> for the shell ruling that governs this behavior.

### Reciprocal cross-reference

Add to the spec's existing cross-reference list:

> - `docs/ui-shell-integration-spec.md` — shell layer that
>   rules on chrome behavior during the battle panel (rails,
>   HUD pod, notification strip hidden; resurface on
>   dismissal) and binds the combat-init auto-pause event to
>   this panel.

### Rationale

The battle-mode spec was explicit that the cube view doesn't
remain visible behind the panel but silent on the rails, HUD
pod, and notification strip. A literal reading could go either
way. The shell rules they hide, matching the panel's
full-attention framing; recording the ruling here so the build
doesn't have to infer it.

---

## Ratification

Each amendment lands by direct edit to its target spec when
the spec's owner ratifies. Amendments 1, 2, and 4 are additive
recordings (no behavior change for anything currently built,
since none of the affected specs is built); amendment 3 is a
cross-reference completion. None requires engine work.

The shell spec (`docs/ui-shell-integration-spec.md`) carries
the forward half of each cross-reference and can land
independently; the reciprocal halves above land when each
target spec's owner ratifies the corresponding amendment.

This bundle is the next §7 entry for the
`change-request-protocol.md` exchange log — see the bundling
exchange document drafted alongside this one.
