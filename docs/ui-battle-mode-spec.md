# Battle mode spec — combat panel

**RECORDED — forward spec, not built. Companion to the main screen
spec (cube view); recording status mirrors the main screen spec's
treatment.** The combat panel UI does not exist; this document
specifies what it should be when built. Engine-side combat data
(`battle.ts` participant-HP snapshots, per-action stream) already
exists per cube memo §A.6 and is what this panel will consume.

This spec covers the combat panel: the view the player sees when two
parties collide and the engine resolves a fight. It is a sibling to
the main screen spec; other views (party detail / unit inspection,
end-of-scenario) are separate specs.

This view is informational, not interactive in the gameplay sense.
The engine resolves combat at turn granularity; the panel presents
that resolution. The player does not issue orders during combat.

## Purpose

The combat panel does three jobs simultaneously:

1. **Show the matchup** — who is fighting whom, with units arranged
   in their actual front/back ranks.
2. **Show the action** — which unit is attacking which target, with
   damage feedback on the target.
3. **Show the state** — persistent HP per unit, persistent rank,
   persistent alive/down status, and the modifier stack governing
   damage (see "Matchup context" below).

Drill-down (who is this unit, what can they do) is a fourth job
that's not in the panel itself — clicking a unit during or after the
fight opens the unit detail view (overlapping scope with the party
detail spec, to be reconciled there).

The panel is **legibility-first**, not theater-first. Animation is
present to support understanding, not to perform. The Ogre Battle
ss5 reference informs the _layout pattern_ (two parties facing off,
side panels for context); the _animation richness_ is dialed down.

## Vocabulary note (canon-reserved)

**"Stalemate" is reserved canon vocabulary** for the scenario-level
terminal in pacing memo §D (OPEN). It does not apply to combat
results. A single combat resolves to one of:

- **Decisive party outcome** — one party defeats the other (units
  killed or routed).
- **Disengage** — combat ends without a decisive party outcome
  (timeout within the combat resolution, mutual incapacity, or other
  non-decisive end states the engine emits).

Combat-result ≠ scenario-stalemate. The notification strip recap copy
uses "disengage," not "stalemate." (The _existence_ of a non-decisive
combat outcome is a `battle.ts` engine fact to verify at build time —
see Forward dependencies; if combat is always decisive, the disengage
vocabulary is dropped and recaps are win/loss only.)

## Look-and-feel direction

Per the chrome/world split established in the main screen spec, the
combat panel is **world**, not chrome. It should feel like the room
the fight is happening in:

- The stage (the floor the parties stand on) is rendered as the tile
  surface where the collision occurred — porcelain for bathroom,
  countertop for kitchen, carpet for hallway, etc.
- Lighting matches the scenario's face mood (cool fluorescent for
  bathroom, warm amber for kitchen, dim utility for garage).
- The parties are the same characterful ant silhouettes as on the
  active face, just rendered larger so individual units are
  distinguishable. Antz and A Bug's Life are the actor reference.
- Surrounding chrome (action labels, HP, skip buttons) stays out of
  the way — corner-anchored, framed panels, modern strategy-game
  language. Same chrome direction as the main screen.

(Per cube memo §D, visual-style finalization is deferred; the above
is build **direction**, not a visual specification.)

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [scenario context strip]                                        │
│                                                                  │
│  [ant party]                              [spider party]         │
│  back     front                           front     back         │
│  units in rank                            units in rank          │
│                                                                  │
│         (stage / floor where the collision happened)             │
│                                                                  │
│  [matchup context]                              [skip controls]  │
└──────────────────────────────────────────────────────────────────┘
```

- **Center stage** — the floor of the colliding tile, rendered as
  that tile's surface, with the two parties facing off across it.
- **Two party clusters** — ant party on the left, spider party on
  the right, each with units placed in their actual rank positions
  (front row forward, back row behind). Each unit shows persistent
  HP and a small name/role label.
- **Scenario context strip (top)** — small line identifying where
  this fight is ("North Wall · near Towel Rack") and which fight in
  a sequence it is if applicable ("Combat 1 of 2 this turn").
- **Matchup context (bottom-left)** — panel summarizing party-level
  info and the active combat-modifier stack (see "Matchup context"
  section below).
- **Skip controls (bottom-right)** — Skip this combat / Skip all
  this turn / (after combat resolves) Continue.

The cube view does not remain visible behind the combat panel — the
panel is a full-attention focus surface, since the player is paused
and the cube state isn't actionable during the fight. This is a
deliberate departure from the Tropico "menu doesn't blot out the
world" pattern, because here the world _is_ the panel.

The other in-scenario chrome elements — left rail party roster,
right rail contextual actions, HUD pod, and notification strip —
are also hidden during the battle panel. The panel reads as the
full attention focus that the design calls for; partial chrome
would dilute the focus and conflict with the panel's own
scenario-context strip and matchup-context panel.

When the panel auto-dismisses to the paused cube view, all hidden
chrome resurfaces. The notification strip surfaces the combat recap
at that moment (per "Auto-pause and resume," below). The HUD pod's
speed control already shows paused, since combat-init triggered the
auto-pause.

See `docs/ui-shell-integration-spec.md` "In-scenario mode" for the
shell ruling that governs this behavior.

## What's on screen

### The stage

The floor of the tile where the collision happened. Rendered as that
tile's surface (porcelain, countertop, carpet), in the lighting of
that face. Visual continuity with the cube view's active face when
the player was looking at it.

The stage is not interactive — it's a backdrop.

### The two parties

Each party's units stand on their side of the stage in their actual
formation:

- **Front row units** are forward on the stage (closer to the enemy).
- **Back row units** are behind, further from the enemy.
- Spacing reflects rank — front row visibly closer to the center of
  the stage than back row. If a spell or ability swaps a unit's rank
  during the fight, the unit visibly moves to her new position.

Per unit, the panel shows:

- **The unit sprite** at a size where individual units are
  distinguishable from each other.
- **HP meter** under the unit. Same visual treatment as the left-rail
  party-card meters in the main screen.
- **A small name/role label** under or beside the unit — enough to
  tell a Footman from a Mage from a Scout at a glance.
- **Alive/down state** — a downed unit is shown collapsed and
  greyed-out in her rank position (not removed from the formation,
  so the rank stays readable).

The leader of each party is visually distinguished (a small marker,
a slight scale bump, or a leader-icon overlay — exact treatment for
the build to determine).

### Action feedback

When a unit in the battle attacks:

- **The attacker** plays a brief tell — a forward lean, a small
  flash, an attack-animation gesture. Doesn't need to be elaborate;
  just enough that the player can see "this one is acting."
- **The target** shows the hit: a damage number flashes on top of the
  target's sprite (red, large enough to read at a glance, fades
  after ~1 second). The target's HP meter updates to the new value
  in the same beat.
- **If the target falls**, she collapses in place to the downed state
  described above, after the damage number resolves.

Group attacks (one attacker hitting multiple targets, or multiple
attackers hitting one target in the same engine sub-step) play
together — damage numbers flash on all affected targets in the same
beat, attackers all show their tell. One engine sub-step is one
visual beat. The panel does not invent sub-animation.

In-battle abilities that swap rank, buff, or otherwise affect units
play their effect on the target unit (a brief glow, an icon flash)
and then the unit moves / changes as appropriate.

### Off-stage combo effects

The engine supports combos (e.g., Royal Onslaught, Venom Storm — see
`engine/battle-abilities.ts`, Round-24) fired by a partner party
that is **not** one of the two combatants in this fight. The partner
sits outside the battle's two-party scope — its MP is decremented
and the combo effect is emitted into the fight, but it is not on
stage.

For these, the spec's two-party layout would otherwise leave the
player wondering where the damage came from. The panel handles this
explicitly:

- When a combo effect lands, an **incoming-effect banner** appears
  briefly at the top edge of the affected party's side, naming the
  ability and the partner party that fired it — e.g., "Venom Storm
  — Scout Patrol." The banner uses a distinct visual treatment from
  in-battle ability flashes so the player can tell at a glance "this
  came from off-stage."
- A brief visual trail (a streak, an arrow, a falling-in effect)
  connects the banner to the affected units, conveying directionality
  ("the effect arrived from outside the fight").
- Damage numbers then flash on the affected targets per the normal
  hit pattern; the source is attributed by the banner, not by the
  damage number itself.
- If multiple off-stage combos arrive in the same engine sub-step,
  each gets its own banner, stacked or sequenced — one beat per
  engine sub-step holds.

This is L7-relevant (combos debut around then per the engine
roadmap) and a real legibility concern: the player sees their front
rank hit by an effect from a party that isn't in the panel.
Attribution is the fix.

### Scenario context strip (top)

Single line, small text, identifies:

- Where this fight is happening — face and nearest landmark, e.g.,
  "North Wall · near Towel Rack."
- If part of a sequence, which fight this is — "Combat 1 of 2 this
  turn."

This strip is the only place the player learns "by the way, there's
another fight queued after this one."

### Matchup context (bottom-left)

The player's window into why the damage numbers are what they are.
Because the panel is legibility-first and the playability rubric's
criterion 1 will grade exactly this surface, the content is
enumerated against the engine's real combat-modifier stack.

Party-level info:

- Party names ("Vanguard" vs. "Spider Pack 3").
- Leader names.

Active modifier stack (each shown only when non-zero / applicable;
empty modifiers do not display):

- **Terrain / defensive bonus** — the tile-defense offset for the
  defending party.
- **Post-occupation offset** — any active bonus from POSTs held by
  either party at the time of combat.
- **Card offset** — any active card-based modifier.
- **Level bonus** — party-level offset, where applicable.
- **Plane-affinity** — `wall`-plane affinity for either party, where
  the engine surfaces it. (Per level-progression-plan §4d, this is
  inert under current AI doctrine in many matchups; the surface is
  here for when it's not, and so the playability critic can verify
  it's visibly in play rather than inferred.)
- **Combat modifier** — any scenario-specific `combatModifier` (e.g.,
  the L4-style modifier) currently affecting the fight.

Each modifier shows its sign (+/−) and magnitude in shorthand. The
panel does not show derivation math — the player sees "Terrain +2,
Post-occupation +1, Card −1" not the underlying calculation. The
modifier list is read-only.

Active modifiers on the attacking side show on the left half of the
panel; on the defending side, right half. Mirrors the on-stage
layout so the player can map "this is my modifier" vs. "this is
theirs" at a glance.

### Skip controls (bottom-right)

The player's only interactive controls during the fight.

- **Skip this combat.** Immediately resolves the panel to its
  summary state (final HP, casualties), holds for a beat (~1 second),
  then advances to the next queued combat or dismisses.
- **Skip all this turn.** Resolves all queued combats for this turn
  to their summary states without showing them. The notification
  strip back on the main screen surfaces a brief recap. Useful
  escape valve for the edge case of many combats in one turn.
- **Continue** (replaces Skip controls after the current combat ends)
  — advances to the next queued combat, or dismisses the panel if
  this was the last one.

There is no "fast forward" — the panel plays at one consistent pace.
Skip is the only acceleration tool.

## Multi-combat handling

When the engine resolves multiple collisions in the same turn, the
panel handles them as a queue. This is rare in practice — current
simulations see it infrequently — but the queue exists for when it
does happen.

- **Ordering.** Active-face-first, then the remaining combats in
  spatial order (a deterministic walk through the faces). Rationale:
  the player is already oriented to the active face, so a fight
  there is the most contextually obvious to open with.
- **Sequencing.** The player sees one combat, hits Continue (or Skip
  this combat), the panel transitions to the next. The transition is
  visible — a brief fade or wipe — so the player knows they are
  moving to a different fight, not seeing the same one again.
- **Skip-all.** At any point, "Skip all this turn" resolves all
  remaining queued combats and dismisses the panel.

To the player, these fights are not simultaneous — they happened
close to the same time, and the panel sequences them.

## States

The panel has a small number of states:

1. **Entering.** Auto-pause has fired (per pacing memo), the cube
   view fades, the combat panel animates in with the two parties in
   their starting formation. Brief — under a second.
2. **Combat-playing.** Action feedback is happening. Skip controls
   active.
3. **Summary.** Combat has resolved. Final HP and casualties shown.
   Continue control replaces Skip controls. The panel holds in this
   state until the player continues or until a brief auto-hold
   elapses (~2 seconds) and it auto-advances.
4. **Transitioning** (multi-combat only). Wipes to the next queued
   combat.
5. **Exiting.** Last combat done. Panel fades, cube view returns
   (still paused, per the auto-pause trigger). Player resumes on
   their own time.

## Auto-pause and resume

Per the pacing memo, combat is an auto-pause trigger and the panel
appears with the game paused. After the panel exits:

- The cube view returns in its paused state.
- The notification strip surfaces a brief recap of the combat(s) —
  "Vanguard defeated Spider Pack 3 near Towel Rack" for a decisive
  outcome, or "Vanguard and Spider Pack 3 disengaged" for a
  non-decisive one. Multi-combat recaps aggregate ("3 combats
  resolved: 2 ant wins, 1 disengage").
- The player resumes by clicking Play (or a speed button) when ready.

The player does not have to dismiss the panel manually after the
last combat — it auto-dismisses to the cube view. The pause is what
gives them time to think, not the panel itself.

## Out of scope for this view

- **Targeting decisions.** Engine-resolved. Player does not pick
  targets.
- **Mid-combat orders.** No such mechanic. Per cube memo §0, any
  player-issued combat verb would need gameplay review before it
  could be added to this view.
- **Item use mid-combat.** No such mechanic in the canon.
- **Manual rank changes mid-combat.** Same — the engine handles
  ability-driven rank changes; the player does not issue them.
- **Watching every combat at high speed.** The panel is the focus
  surface, not the only surface — the notification strip and cube
  view's HP state carry enough information that a skipped combat is
  recoverable.
- **Fast-forward within the panel.** Skip is the only acceleration
  tool. Revisit if playability finds players want a watch-faster
  mode.
- **Unit detail drill-down.** Overlaps with the party detail /
  inspection spec. Battle mode allows clicking a unit to open that
  view; the view itself is specified separately.
- **Morale, fatigue, or other UI-invented modifiers.** Not in the
  engine's combat-modifier stack. If proposed, they go through
  gameplay review per cube memo §0 before appearing in the matchup
  context panel.

## Forward dependencies (not silent gaps)

- **"Disengage" combat outcome — verify against `battle.ts`.** This
  spec asserts a non-decisive combat result exists ("timeout within
  combat resolution / mutual incapacity / other non-decisive end
  states the engine emits"). Confirm `battle.ts` actually emits a
  non-decisive outcome. If combat always resolves decisively to a
  party victory, the "disengage" vocabulary is dropped entirely and
  combat recaps collapse to win/loss only. Build-time engine check,
  not a spec change; the rest of the spec is unaffected either way.
- **Auto-pause-on-combat opt-in by scenario.** Per the pacing memo,
  auto-pause triggers are opt-in per scenario. This spec assumes
  auto-pause-on-combat is on for L1/L2 (so new players see fights)
  and assumes it's available for later scenarios but tunable.
- **Off-stage combo banner copy.** "Venom Storm — Scout Patrol" style
  is illustrative; the actual ability names and copy come from the
  engine's combo definitions (`battle-abilities.ts`).
- **Combat-result-to-notification copy.** "Vanguard defeated Spider
  Pack 3" / "Vanguard and Spider Pack 3 disengaged" — illustrative;
  actual copy comes from the scenario-spec / engine combat result
  format.
- **Plane-affinity surfacing.** Per §4d, plane-affinity is inert
  under current AI doctrine in many matchups. The matchup context
  panel shows it when the engine surfaces it; if §4d is later
  revisited and plane-affinity becomes a live lever, the surface
  here is already in place.

## Open questions

1. **Multi-combat ordering.** Active-face-first vs.
   queen-adjacent-first. Recommend active-face-first; queen-adjacent
   is the alternative if playability findings suggest otherwise.

2. **Summary auto-hold duration.** 2 seconds before auto-advance is a
   placeholder. May need to be longer for new players, shorter for
   experienced ones. Could be a setting. Recommend 2 seconds for v1,
   revisit per playability findings.

3. **Leader visual distinction.** Small marker, scale bump, or icon
   overlay — three options listed in the spec. Recommend the build
   pick one and iterate; not a load-bearing decision.

4. **Skipping the entering animation.** Should the panel's entry
   animation be skippable, or does it always play? Recommend always
   plays (it's short, under a second) so the player has a moment to
   register that combat has started, not just appears mid-fight.

5. **Click-on-unit during combat.** Recommend yes — clicking a unit
   opens her detail view (party detail spec), pausing the combat
   animation. Closing the detail view resumes the combat from where
   it was. This couples battle mode to the party detail spec but
   keeps drill-down available where the player naturally looks for
   it.

6. **Off-stage combo banner placement.** Top edge of the affected
   party's side is the recommended location, but a dedicated banner
   strip across the top of the panel is an alternative. Recommend
   the top-edge-of-affected-side approach so the player's eye is
   already in roughly the right place to track damage flashes; flag
   for revisit if combo legibility findings suggest otherwise.

## Cross-references

- `docs/ui-shell-integration-spec.md` — shell layer that rules on chrome behavior during the battle panel (rails, HUD pod, notification strip hidden; resurface on dismissal) and binds the combat-init auto-pause event to this panel.
- `docs/auto-pause-events.md` — the `combat-init` event (keyed off `battle-resolved` in the turn stream) that fires this panel.
