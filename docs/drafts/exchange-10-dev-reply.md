# Reply: Exchange #10 — UI shell integration layer + auto-pause companion

**Status:** RESOLVED — ratified into the doc set. The four reciprocal
amendments are folded into their target specs; the auto-pause companion
is promoted to `docs/auto-pause-events.md` as RECORDED (rev 2,
corrections applied); the §5 outcome is updated. (Note: the §6 text
below predates the §3c revision and says "five" amendments — the
ui-main-screen save-touchpoint amendment was withdrawn, so **four**
landed.)

**From / To / Re:** Dev → UX / Re: Exchange #10 (`ui-shell-integration-spec.md`

- `auto-pause-events.md` + five reciprocal amendments in
  `shell-amendments.md`).
  **Disposition:** Accepted — shell spec and the five amendments are
  concur-clean and may ratify now; the **auto-pause companion requires a
  correction pass before it locks** (two wrong event signatures, a
  framing mismatch, one demotion, one added confirmation). None of it is
  engine work.

## 1. Decision

The exchange proceeds. The shell integration spec's four rulings
(Escape behavior, chrome-band back-to-Hill, battle-panel chrome
hiding, save→notification-strip) and all five reciprocal amendments
are within the cube-memo §0 boundary, touch no engine surface, and
concur as written. The auto-pause companion is right in intent and in
its load-bearing byte-identity argument, but it must be revised against
engine truth before it becomes the contract dev binds the clock layer
to — corrections in §3 below.

## 2. Cost decomposition

- **Shell integration spec (4 rulings)** — _no code, concur._ Two of
  its three "engine-truth confirmations" are misaddressed (see §3);
  drop them. Doc-only.
- **Auto-pause companion** — _doc-revision only, no engine work_, but
  **blocked from lock** until the §3 corrections land. The two
  engine-backed events it binds are already emitted (verified), so once
  the signatures are fixed there is zero engine cost.
- **Five reciprocal amendments** (`ui-main-screen`, `ui-hill-hub`,
  `ui-briefing`, `ui-end-of-scenario`, `ui-battle-mode`) — _each an
  additive recording to an unbuilt spec; zero engine/build impact;
  concur._ §A.4 reciprocal-cross-ref precedent is the right pattern.
- **Real-time clock layer** (downstream consumer, _not_ in this
  exchange) — flagged because the §3 architectural note governs how it
  must be built.

## 3. Invariant impact

**Nothing in the bundle touches the frozen engine, gate-29, or the
balance curve.** Verified: both engine-backed events are already
emitted; `reinforcement-spawned` sits behind a guard that is false on
every shipped scenario (`engine/post-capture.ts:198–215`), which is why
§7.12 was byte-identical. The companion's instinct to keep
`combat-init` UI-derived — _not_ promote it to a `battle-started`
engine event — is correct and necessary: battles fire on every shipped
scenario, so emitting a new event there would rebaseline gate-29.
**Strong concur on that point.** The corrections below are
truth-alignment, not invariant risk.

### 3a. Corrected signature block (drop-in for the companion)

```
post-captured          (engine; ReplayEvent union, engine/types.ts; emitted in engine/post-capture.ts)
  payload: { turn, tick, postId: PostId, newOwner: Faction }   // Faction = 'ant' | 'spider' | 'neutral'
  NO prevOwner. If the UI needs the prior owner for copy, it comes from a
  DIFFERENT event — post-capture-started.fromOwner (when the 2-turn hold began),
  or post-capture-aborted.previousOwner.

reinforcement-spawned  (engine; engine/post-capture.ts:208)
  payload: { turn, tick, postId: PostId, arrivalPostId: PostId, newPartyIds: PartyId[] }
  postId       = the trigger POST whose capture completed
  arrivalPostId = where the party spawned (defaults to the trigger POST)
  newPartyIds  = spawned parties (array; currently single-element)
  NO `faction` field — derive from the spawned party if needed (L0 = ant).
```

The companion's claimed shapes (`{postId,newOwner,prevOwner}` and
`{partyId,spawnPostId,faction}`) are both wrong; replace with the
above.

### 3b. Reframe the "engine emits / UI subscribes / after a movement tick" model

The engine's only public driver is whole-turn (`runTurn`) /
whole-scenario (`runScenario`) — **there is no sub-turn stepping API.**
A turn resolves abilities → movement → battles → end-of-turn internally
and returns one `TurnOutcome` carrying a flat, tick-ordered `events[]`.
So:

- Events are **not a live bus** the UI subscribes to; the UI reads them
  from each completed turn's `events[]`.
- The clock layer **animates a completed turn's ordered event stream**
  (the existing `viewer/` replay-scrubber model). "Pause" pauses
  _playback_, not the sim. Byte-safe; no engine work.
- **`combat-init` specifically:** there is no observable pre-battle
  co-located state in `runTurn`'s output — the battle is already
  resolved by the time the outcome exists. Replace "after a movement
  tick, before battle resolves" with "**at the `battle-resolved`
  event's playback position**" (optionally synthesizing a collision
  pre-roll from the preceding `party-moved` events). The
  pause-and-panel-open still coincide; they just key off
  `battle-resolved` in the stream, not a live collision.

### 3c. Demote `save-touchpoint` to a forward dependency

`engine/scenario-save.ts` (§7.13) is a record/replay/restore primitive
(`recordingPlayer`, `replayPlayer`, `restoreScenario`) with **no
authored touchpoint / save-point marker**. There is no "a save
touchpoint was reached" signal to bind. Reclassify `save-touchpoint`
from on-by-default v1 to a forward dependency on an unbuilt
authored-save-point feature — the same status the companion already
gives the stalemate-approach trigger. When that feature is specced it
routes as its own small exchange and the event joins the contract then.

### 3d. Add a visibility confirmation for `newly-visible-enemy`

`fog-revealed` carries `coords` only. Detecting "an enemy party on a
newly revealed tile" needs an **ant-perspective fog-filtered
party-position view**. The only per-faction visibility projection in
the engine today is spider-side (`getSpiderVisibleAntTrail`,
`engine/types.ts:288/712`); there is no exported ant-player
visible-enemy view. This is probably client-computable from
already-exposed fog state, but it must be confirmed, not assumed — add
it to the companion's "engine-truth confirmations."

## 4. Counter-proposal (intent unchanged)

No counter to intent — a stable UI-binding contract plus cross-view
shell coherence is the right goal. One structural suggestion for the
revised companion: split the event set explicitly into **v1-bindable
now** (`post-captured`, `reinforcement-spawned` [corrected],
`party-idle`, `combat-init` [reframed], `newly-visible-enemy` [pending
3d]) vs **forward-dep** (`save-touchpoint`, stalemate-approach). Keeps
the contract honest about what dev can bind against today.

## 5. Confirms needed back

**From design (companion revision):**

1. Adopt the §3a corrected signature block verbatim.
2. Adopt the §3b reframing (completed-turn animation; pause = playback;
   `combat-init` keys off `battle-resolved`).
3. Demote `save-touchpoint` to forward-dep (§3c).
4. Add the `newly-visible-enemy` ant-visibility confirmation (§3d).

**From dev (answered here):**

5. Shell spec "engine-truth confirmations": **Escape key-event hook**
   and **mode-transition timing (200–400ms / framerate / asset
   loading)** are **not engine concerns** — the engine is a headless
   deterministic turn sim with no input handling and no render loop.
   Both are client-runtime concerns the client owns; drop them from the
   engine-confirm list. **Resource-strip contents** is the one real
   engine-truth item, and it's answerable now: gold ← `WorldState.gold`,
   jelly ← `Party.jellyDoses`, ant-count derivable from the
   roster/parties. I'll hand over the canonical element list on request.

## 6. Decision record

For `change-request-protocol.md` §5 (Exchange #10) and the
corresponding roadmap §7 subsection (next available — design/PM assigns
the number):

> **Exchange #10 — UI shell integration layer + auto-pause companion.**
> Resolved. `ui-shell-integration-spec.md` and the five reciprocal
> amendments (`ui-main-screen`, `ui-hill-hub`, `ui-briefing`,
> `ui-end-of-scenario`, `ui-battle-mode`) land RECORDED — no engine
> impact, byte-safe. `auto-pause-events.md` lands RECORDED **after a
> dev-verification correction pass**: two engine-backed signatures
> corrected against source (`post-captured` has no `prevOwner`;
> `reinforcement-spawned` is `{postId, arrivalPostId, newPartyIds}`),
> the binding model reframed from live-subscription to
> completed-turn-event-stream animation (no sub-turn engine API; clock
> layer pauses playback, not sim), `save-touchpoint` demoted to a
> forward dependency (§7.13 has no authored save-point marker), and a
> `newly-visible-enemy` ant-visibility confirmation added. No gate-29 /
> balance-curve impact; no engine work.

## 7. Protocol notes

Minor calibration: the exchange CR routed three "engine-truth
confirmations" to dev, two of which (Escape hook, transition timing)
are client-runtime concerns, not engine surfaces. Worth a one-line note
in the protocol that input handling and render/animation timing are
client-owned and don't take an engine confirmation — the engine is a
headless deterministic turn simulator.
