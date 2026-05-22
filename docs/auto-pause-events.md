# Auto-pause event-set — UI-binding contract

**Location:** `docs/auto-pause-events.md`
**Status:** RECORDED (Exchange #10) — ratified as the stable UI-binding
contract; the feature itself is forward (not built). The real-time
clock layer binds against this contract when it lands. Small companion
to the UI shell integration-layer doc; promoted out of the L0
beat-outline working draft (`docs/drafts/L0-beat-outline.md`).
**Revision 2** — corrections-pass against engine source per Exchange
#10 dev reply (§3a–§3d, §4).
**Owner:** UX track.
**Companions:** `docs/ui-main-screen-spec.md` (notification strip
copy and HUD-pod speed-control state), `docs/ui-battle-mode-spec.md`
(`combat-init` triggers the panel via the `battle-resolved` playback
position), `docs/design-memo-pacing-and-turn-cap.md` (auto-pause
triggers are opt-in per scenario, §A.1).

---

## Purpose

The real-time-with-pause model (pacing memo §A.1) requires the UI to
know **which observable state changes pause the game and surface a
notification**. The set is small, well-defined, and split by who
produces the signal:

- **Engine-backed events** — already emitted in the engine's
  per-turn `TurnOutcome.events[]` stream; the UI reads them from
  the completed turn.
- **UI-derived events** — the engine emits nothing; the UI computes
  the trigger from observable state in the same event stream or
  from world state already exposed.

The split is load-bearing, not stylistic. Adding new engine events
to the in-scenario sim path would change shipped replay bytes and
re-baseline the win-rate metric anchor (gate-29 / §7.6). Dev
confirmed `reinforcement-spawned` was deliberately added behind a
guard that's false on every shipped scenario specifically to keep
gate-29 byte-identical (`engine/post-capture.ts:198–215`); a
`battle-started` event firing every scenario would force a full
rebaseline. The contract therefore binds **only** events already
emitted (`post-captured`, `reinforcement-spawned`); everything else
the UI handles on its own.

---

## How the engine surfaces events (architectural note)

The engine's only public driver is whole-turn (`runTurn`) or
whole-scenario (`runScenario`). **There is no sub-turn stepping
API.** A turn resolves abilities → movement → battles → end-of-turn
internally and returns one `TurnOutcome` carrying a flat,
tick-ordered `events[]` list.

Consequence for the real-time clock layer:

- Events are **not a live bus** the UI subscribes to. The UI reads
  them from each completed turn's `events[]`.
- The clock layer **animates a completed turn's ordered event
  stream** — same model as the existing `viewer/` replay scrubber.
  "Pause" pauses _playback_, not the sim.
- Byte-safe: no new engine events, no sub-turn API, no engine work.

All triggers below describe **when in the playback stream** a pause
fires, not a live state observation.

---

## The contract (v1-bindable now)

These five events are bindable against the current engine. The UI
can implement and ship the auto-pause behavior using only what's
already exposed.

### Engine-backed

```
post-captured
  source:  engine
  defined: engine/types.ts (ReplayEvent union)
  emitted: engine/post-capture.ts
  payload: { turn, tick, postId: PostId, newOwner: Faction }
           Faction = 'ant' | 'spider' | 'neutral'
  trigger: playback reaches this event in the turn's stream.
  default: on
  notes:   No prevOwner field. If the UI wants "recaptured from the
           spiders" copy, the prior owner comes from a different event
           in the stream — post-capture-started.fromOwner (when the
           2-turn hold began) or post-capture-aborted.previousOwner.
           Already emitted; UI binds; no engine work.

reinforcement-spawned
  source:  engine
  emitted: engine/post-capture.ts:208
  payload: { turn, tick,
             postId: PostId,         // the trigger POST whose capture completed
             arrivalPostId: PostId,  // where the party spawned (defaults to postId)
             newPartyIds: PartyId[]  // spawned parties (array; currently single-element)
           }
  trigger: playback reaches this event in the turn's stream.
  default: on
  notes:   No faction field — derive from the spawned party if needed
           (L0 = ant). Already emitted, byte-identical against gate-29
           via the §7.12 guard; UI binds; no engine work.
```

### UI-derived

```
party-idle
  source:  ui
  trigger: at playback's end-of-turn position, the UI detects a
           player party whose order queue transitioned from
           non-empty to empty during this turn (i.e., the party
           finished its order this turn).
  payload: { partyId }
  default: on
  notes:   Binds to party-orders state the main-screen spec already
           reads. Does not fire for parties that have never been
           ordered — those are still in the "no order yet" state,
           distinct from "completed an order, now idle." Distinction
           matters on scenario start: every party begins with no
           order and the spec does not want to auto-pause for every
           party on turn 1.

combat-init
  source:  ui
  trigger: playback reaches a `battle-resolved` event in the turn's
           stream. The UI pauses at that playback position and opens
           the battle-mode panel; the panel animates the combat from
           the engine's resolved state. The UI may optionally
           synthesize a brief collision pre-roll from the preceding
           `party-moved` events that put the parties on the same
           tile.
  payload: derived from the `battle-resolved` event the playback
           keys off; battle-mode panel reads the full battle data.
  default: on
  notes:   By the time the `TurnOutcome` exists, the battle is
           already resolved (no observable pre-battle co-located
           state). The pause-and-panel-open coincide and key off
           `battle-resolved` in the stream, not a live collision.

           **Critical engineering rationale — do not promote to an
           engine event.** Battles fire on every shipped scenario;
           emitting a `battle-started` event would change every
           shipped replay's bytes and force a full gate-29
           re-baseline. Dev confirmed this in the Exchange #10
           reply. Keep it UI-derived against `battle-resolved`.

newly-visible-enemy
  source:  ui
  trigger: at playback's end-of-turn position, the UI scans for an
           enemy party visible to the ant player that was not
           visible at the start of the turn.
  payload: { partyId, tileId, faction }
  default: on
  notes:   `fog-revealed` events carry `coords` only. Detecting
           "enemy on a newly revealed tile" requires an
           ant-perspective fog-filtered party-position view. The
           only per-faction visibility projection in the engine
           today is spider-side (`getSpiderVisibleAntTrail`,
           `engine/types.ts:288/712`); there is no exported
           ant-player visible-enemy view. **Engine-truth
           confirmation needed** — see below.
```

---

## The contract (forward-dep)

These triggers are part of the auto-pause design intent but cannot
bind to the engine as it exists today. They join the contract when
their dependencies resolve. Listed for completeness so future
specs know they're reserved.

```
save-touchpoint
  status:  forward dependency on an unbuilt authored-save-point feature
  rationale:
    §7.13 (engine/scenario-save.ts) is a record/replay/restore
    primitive (recordingPlayer, replayPlayer, restoreScenario) with
    NO authored touchpoint / save-point marker concept. There is no
    "a save touchpoint was reached" signal to bind against. When the
    authored-save-point feature is specced (its own small exchange),
    this event joins the contract.
  l0-impact:
    L0 beat 7 ("A Moment to Save") describes the save as a beat in
    the tutorial. The beat is not blocked — beat 7 can land as
    scripted-cinematic prose with no auto-pause event behind it until
    the authored-save-point feature exists. The beat outline can
    note this when it next revises.

stalemate-approach
  status:  forward dependency on pacing memo §D
  rationale:
    Per playability rubric criterion 6 and pacing memo §D, when the
    stalemate-terminal is decided and built, the inactivity detector
    will surface an approach-warning. Predicate, threshold, and copy
    are OPEN in pacing §D. Joins the contract when §D resolves.
    Surface is the notification strip (per
    `docs/ui-main-screen-spec.md`); layout already accommodates it.
```

---

## Behavior on fire

When any v1-bindable event fires (i.e., playback reaches the
event's binding position):

1. Playback pauses. The HUD pod's speed control reflects paused
   state, per `docs/ui-main-screen-spec.md`.
2. A notification surfaces on the bottom-right notification strip
   with copy specific to the event (e.g., "Paused: spider sighted,"
   "Paused: party idle"). Copy is owned by the main-screen spec's
   notification-strip section.
3. The player resumes by clicking Play or a speed button — which
   resumes playback, not the sim. The sim is already resolved for
   the current turn; playback continues to the next event in the
   stream or to the next turn's outcome.

Three signals for one event (pause state, notification, HUD pod) is
intentional — pause cues are load-bearing per the main-screen spec.

**`combat-init` is special:** in addition to pause + notification,
it also opens the battle-mode panel (per
`docs/ui-battle-mode-spec.md`). The panel animates the combat from
the engine's `battle-resolved` event data, auto-dismisses to the
paused cube view, and the notification strip carries the combat
recap. The pause keyed off `battle-resolved` and the auto-pause
framing in the battle-mode spec are the same pause, not two.

---

## Per-scenario opt-in

Per pacing memo §A.1, auto-pause triggers are **opt-in per
scenario**. The contract defines the universe of triggers and their
defaults; each scenario can disable any subset. The L0 / L1 default
is everything in the v1-bindable set on (so new players see all the
cues); later scenarios may tune some off as the player learns to
read state without prompts.

Mechanism is scenario-data, not UI-spec. The contract here is what
the UI must support; which triggers fire in which scenarios is a
scenario-spec concern.

---

## Engine-truth confirmations needed

One confirmation before the v1-bindable set fully locks:

1. **Ant-perspective visible-enemy projection for
   `newly-visible-enemy`.** Confirm whether the client can compute
   "enemy party on a tile newly visible to the ant player" from
   already-exposed fog state, or whether a small new client-side
   visibility projection is required. The only existing per-faction
   visibility code is spider-side; ant-side parity may or may not
   exist. If a new projection is needed, it's a small client-side
   addition (not engine work, since the engine is headless), and
   this event becomes blocked on that addition rather than
   v1-bindable.

The two engine-backed signatures (`post-captured`,
`reinforcement-spawned`) are confirmed against source in the
Exchange #10 dev reply; no further verification needed.

---

## What's intentionally not in v1

- **Queen-damaged / queen-critical-HP triggers.** Pacing memo §D
  OPEN material; would belong here if added but is not part of the
  current set.
- **Player-issued manual pause.** Distinct from auto-pause; lives
  in the main-screen HUD-pod speed-control spec, not here.

---

## Cross-references

This contract is consumed by:

- `docs/ui-main-screen-spec.md` — notification strip auto-pause
  copy; HUD pod speed-control pause state. The strip surface is
  already specified; this contract names the events it surfaces.
- `docs/ui-battle-mode-spec.md` — `combat-init` (keyed off
  `battle-resolved` in the turn stream) fires the panel. The
  auto-pause-on-combat language in that spec resolves to this
  event.
- `docs/drafts/L0-beat-outline.md` — L0's "Auto-pause event set
  (engine-truth)" section, which is the source this contract is
  promoted from. The beat-outline section can be slimmed at next
  revision to point here. Note: beat 7's save-touchpoint event is
  now forward-dep; the beat itself is unaffected but the
  "auto-pause via engine-derived save-touchpoint" line in the L0
  beat outline's beat 7 description should be revised to reflect
  the demotion.
- `docs/design-memo-pacing-and-turn-cap.md` §A.1 — the
  real-time-with-pause framing this contract operationalizes.
- `docs/ui-shell-integration-spec.md` — the shell layer that binds
  these events to UI surfaces (HUD pod, notification strip, battle
  panel).

---

## Revision notes

Revision 2 (this version) corrects revision 1 against engine source
per Exchange #10 dev reply:

- `post-captured` signature corrected: removed nonexistent
  `prevOwner` field; added engine-actual `turn` and `tick` fields;
  noted that prior-owner info lives on `post-capture-started` or
  `post-capture-aborted` events.
- `reinforcement-spawned` signature corrected:
  `{partyId, spawnPostId, faction}` → engine-actual
  `{turn, tick, postId, arrivalPostId, newPartyIds}`. Removed
  nonexistent `faction` field; corrected the spawn-post field name
  and the trigger-vs-arrival distinction; corrected `partyId` to
  the array `newPartyIds`.
- Architectural model reframed: events read from
  `TurnOutcome.events[]` per completed turn, not via a live
  pub/sub bus. "Subscribe / after a movement tick" replaced with
  "playback reaches this event in the turn's stream." Pause pauses
  _playback_, not the sim.
- `combat-init` reframed: there is no observable pre-battle
  co-located state in the engine's output; the trigger keys off the
  `battle-resolved` event's playback position. The
  byte-identity-preserving "do not promote to an engine event"
  rationale is preserved (and confirmed by dev).
- `save-touchpoint` demoted from v1-bindable to forward-dep:
  §7.13's save primitive has no authored touchpoint marker; the
  event has nothing to bind to until the authored-save-point feature
  is specced.
- `newly-visible-enemy` engine-truth confirmation added: requires
  ant-perspective visibility projection that may not exist
  client-side.
- Structure split into v1-bindable-now vs forward-dep sections per
  dev's §4 suggestion, so the contract is honest about what's
  bindable today.
- Engine-truth confirmations reduced from two to one (only the
  ant-visibility item remains).
