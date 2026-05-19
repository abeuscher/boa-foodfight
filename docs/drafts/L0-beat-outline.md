# L0 — Beat Outline (working draft, v4)

**Intended location:** `docs/drafts/L0-beat-outline.md`
**Status:** Working draft, downstream of recorded §7.11.
**Owner:** UX track.
**Revision:** v4 — staleness cleanup pass after §7.11 records.
§7.12 and §7.13 are landed (Exchange #8 commit `53a7252`,
Exchange #9 commit `a248cfc`); beats 5 and 7 update from
"hard dependency" / "if it slips" framing to past tense. Beat
structure unchanged.

**Inputs:** L0 manual v2 (vocabulary), L0 ruleset v4 (the 29
rules), the Oblivion-opening reference (narrative-beats-that-land-
teaching structure), the Mario-manual reference (positive
register).

---

## Architectural principles

**1. Story before lesson.** Each beat exists for a narrative
reason. The mechanic taught is whatever the situation makes the
player need.

**2. Safety is staged, not difficulty.** The colony's strength is
behind every teaching moment. First combat is winnable. The
dead-soldier moment is scripted as a story beat. Real difficulty
starts at L1.

**3. Pacing is by beat, not by checklist.** Introductions land
when the narrative needs them.

## Scripted-cinematic vs. player-driven — contract distinction

**Scripted-cinematic moments** happen _to_ the player. The
dead-soldier beat. The reinforcement arriving. The briefing.

**Player-driven moments** happen _because of_ the player.
Capturing a POST. Recruiting a neutral. Reaching the entrance.

Each beat below is tagged.

---

## Engine dependencies — landed

Both engine prerequisites for L0 are complete:

- **§7.12 Reinforcement-at-POST** — Exchange #8, commit `53a7252`.
  Backs beat 5 (the lost squad spawning at the captured POST).
  Byte-identity proven.
- **§7.13 Mid-scenario save** — Exchange #9, commit `a248cfc`.
  Option B (input-stream replay). Backs beat 7 (the save
  touchpoint before the final battle).

L0's nine beats can land structurally as written; no remaining
engine work blocks the outline.

---

## The beats

Nine beats. Each beat has:

- **The moment:** what happens in the world
- **The opening:** how the beat starts
- **Primary rule(s):** what this beat is built to teach
- **Secondary rules touched:** what the player encounters in
  passing, learned by doing rather than introduction
- **Contract tag:** scripted-cinematic, player-driven, or mixed

---

### Beat 1 — The Briefing

**The moment.** A briefing screen opens before play begins.
Antonio explains the predicament: summer is ending, the colony
needs a winter home, the winter house's entrance is held by
spiders, he has been sent to take it. The briefing carries an
objectives list:

**Primary objective:**

- _Take the winter-house entrance from the spiders._

**Failure condition:**

- _Antonio must survive. Should he fall and the summer hill also
  be lost, the colony cannot recover._

A Start button takes the player to the yard.

**The opening.** Direct entry. No fade from black, no logo
flourish.

**Primary rules:** the narrative kernel, G12 (the lose condition,
surfaced in the objectives list rather than demonstrated).

**Secondary rules touched:** none yet.

**Contract tag:** scripted-cinematic.

**End-of-beat hook:** the player clicks Start.

---

### Beat 2 — The Yard

**The moment.** Antonio stands at the summer hill. The HUD pod
visible at the bottom. Antonio's squad in the left rail. The game
is paused. The player has a moment to look around.

**The opening.** Direct cut from beat 1's Start. No fade.

**Primary rules:** I1 (real-time-with-pause, default paused), I9
(three-column layout introduces itself by being there).

**Secondary rules touched:** I2 (pause/play visible), I13 (leader
star), G2 (Antonio's squad as a single party on a tile).

**Contract tag:** mixed.

**End-of-beat hook:** the player gives Antonio his first order
when ready.

---

### Beat 3 — First Steps

**The moment.** The player gives Antonio his first order. The
squad moves off the summer hill. The game unpauses for the first
time.

**The opening.** Continuous from beat 2.

**Primary rules:** I6 (two-click command), I2 (pause/play in
practice), I3 (speed control), I1 (real-time becomes real time).

**Secondary rules touched:** destination marker (I6 detail), left
rail "moving toward..." line (I9 detail), auto-pause on idle (I5;
UI-derived).

**Contract tag:** player-driven.

**End-of-beat hook:** squad arrives, goes idle, auto-pause fires.

---

### Beat 4 — The First Spider

**The moment.** A spider party comes into view. Auto-pause fires
on newly-visible enemy. The player engages; combat begins on
collision.

**The opening.** UI-derived auto-pause from the spider tile
becoming fog-revealed. Right rail hover detail shows what the
spider party is.

**Primary rules:** G6 (combat on collision), G7 (combat is
performative), G8 (HP, downed, _and_ the dead-soldier teaching
moment — Antonio survives, one soldier in his squad dies), I11
(the combat panel).

**Secondary rules touched:** I5 (auto-pause on combat init;
UI-derived), I12 (combat modifiers visible), G9 (footmen,
archers, mages all engage — type exposure), I13 (leader marker).

**Contract tag:** mixed.

**Skip-to-summary:** **disabled in this combat.** The
dead-soldier moment is the lesson; skipping defeats it.

**End-of-beat hook:** combat resolves. Soldier down for good. The
right rail or a brief overlay acknowledges the loss gently.

---

### Beat 5 — The Lost Squad

**The moment.** Past the first spider, an intermediate POST comes
into view. The player approaches and captures it; the lost ant
squad spawns at the captured POST and joins.

**The opening.** Continuous from beat 4. POST visible; right rail
hover detail makes its importance clear; player sends Antonio.
Sole occupancy begins, capture pip appears.

**Primary rules:** G3 (POSTs and owners), G4 (2-turn capture
rule), I10 (capture pip), G14 (reinforcement-at-POST — backed by
§7.12 / Exchange #8 / commit `53a7252`), I15 (reinforcement-
arrival UX).

**Secondary rules touched:** I5 (auto-pause on capture completion
via engine-backed `post-captured`; auto-pause on reinforcement
spawn via engine-backed `reinforcement-spawned`), I9 (left rail
grows), G2 (player commands multiple parties).

**Contract tag:** mixed. Capture is driven; reinforcement arrival
is scripted-cinematic.

**End-of-beat hook:** the lost squad's leader speaks briefly.
Both parties in the player's roster.

---

### Beat 6 — The Neutral in the Path

**The moment.** A neutral creature wanders across the path
between the intermediate POST and the winter-house entrance.
Auto-pause fires. The player is told they can recruit it.

**The opening.** Continuous from beat 5. UI-derived auto-pause
from fog-revealed. Right rail says explicitly _neutral_.

**Primary rules:** G10 (neutrals exist, not enemies by default),
G11 (the recruit verb), I14 (recruit verb's UI).

**Secondary rules touched:** I6 extended; left rail grows if
recruit succeeds.

**Contract tag:** player-driven. Tutorial tells the player the
option exists; the choice is theirs.

**If the player walks past:** no harm. The verb has been
introduced; the player has learned it exists.

**End-of-beat hook:** player continues toward the entrance with
either two or three parties.

---

### Beat 7 — A Moment to Save

**The moment.** Before the final approach, the game saves. The
player is told the game has saved (or, depending on §7.13's
authored-point implementation, invited to save manually).

**The opening.** Continuous from beat 6. As the entrance comes
into clear view, the game pauses and an overlay introduces the
save.

**Primary rules:** the save system, as surfaced by §7.13
(Exchange #9, commit `a248cfc`, Option B input-stream replay).

**Secondary rules touched:** the briefing's failure condition
becomes meaningful — the player understands the next encounter is
where the failure condition could trigger, and they have a save
to fall back on.

**Contract tag:** scripted-cinematic.

**Rationale.** The save is inserted before the final battle so
the player doesn't pay a tax on failure. Beat 8 is the only
balance-measured beat in L0; without a save, a loss there means
replaying the entire tutorial. With a save, a loss means trying
beat 8 again. Preserves skill-building-not-difficulty even at
L0's one measured point.

**End-of-beat hook:** save confirmed. The player resumes,
approaching the entrance.

---

### Beat 8 — The Entrance

**The moment.** The winter-house entrance is held by more spiders
than Antonio met before. The player commits to the final approach
with multiple parties (and possibly a recruited ally).

**The opening.** Continuous from beat 7. Entrance visible at
distance, spider flag clear. The player coordinates the assault.

**Primary rules:** G5 (the win condition, made concrete). This
beat is the _test of what's already been taught_.

**Secondary rules touched:** all of combat (G6, G7, G8) at larger
scale; modifiers (I12) may surface more visibly.

**Skip-to-summary:** **introduced here.** Player has watched a
full combat in beat 4; the skip control is now available.

**Contract tag:** player-driven.

**Design target — the balance-measured point.** This is the only
beat in L0 that gets a balance number. Level PA tunes this
encounter to **90% ant win rate**, measured by the existing
harness running full L0 × 100 seeds against the baseline player
AI. By construction, since beats 1–7 are scripted-safe, this
equals beat 8's win rate by itself.

Re-anchors to beginner tier when the forward player-AI-skill-tier
CR lands.

**End-of-beat hook:** spiders defeated or driven off. One of the
player's parties is on the entrance tile, alone. Capture pip
begins.

---

### Beat 9 — The Door Opens

**The moment.** Capture completes. The entrance flag turns
ant-friendly. The level ends in victory. A closing moment
acknowledges what has been accomplished.

**The opening.** Continuous from beat 8. Capture pip ticks down,
flag changes, auto-pause fires (engine-backed `post-captured`).

**Primary rules:** G5 (victory by holding the entrance POST).

**Secondary rules touched:** resolution screen.

**Contract tag:** scripted-cinematic. The transition to the world
loop and then to L1 follows.

---

## Auto-pause event set (engine-truth)

L0 uses six auto-pause triggers, split between engine-backed
events the UI subscribes to and UI-derived triggers the UI
computes from observable state.

**Engine-backed:**

- POST capture completion → `post-captured` event
- Reinforcement spawn → `reinforcement-spawned` event (from §7.12)

**UI-derived:**

- Newly-visible enemy → UI checks whether a `fog-revealed` tile
  contains an enemy party
- Party becomes idle → UI tracks whether a party's orders are
  empty
- Combat init → UI detects opposing parties co-located after a
  movement tick
- Save touchpoint → UI/replay-layer marker, defined by §7.13

A note on combat-init specifically: adding a `battle-started`
engine event would seem trivial but battles happen in every
shipped scenario. Emitting a new event in that stream would
change every shipped replay's bytes and would force a full
re-baseline of the win-rate metric anchor. The UI can compute
combat-init from positions; the engine doesn't need to emit a new
event for it.

---

## Rules-to-beats coverage check

Every rule in the L0 ruleset appears in at least one beat,
primary or secondary.

**Game rules:** G1→2, G2→3/5/6, G3→5p, G4→5p/9, G5→1/8s/9p,
G6→4p, G7→4p, G8→4p, G9→4s, G10→6p, G11→6p, G12→1/7,
G13→1, G14→5p.

**Interface rules:** I1→2/3, I2→3p, I3→3s, I4→not explicitly
taught, I5→3/4/5/6/7/9, I6→3p, I7→not taught, I8→not taught,
I9→2/5, I10→5p, I11→4p, I12→4/8, I13→2, I14→6p, I15→5p.

No gaps.

---

## Length and balance targets

**Human play (target):** ~15 minutes from briefing Start to L1
handoff at default speed. Later playtest target, validated
against the real-time UI when both exist.

**Engine turns:** authored by Level PA to whatever makes the
nine-beat arc land. Turn length is a function of authored
geometry and pacing, not an engine constraint.

**Final-battle balance target:** 90% ant win rate, measured by
the existing harness running full L0 × 100 seeds against baseline
player AI. By construction of scripted-safe beats 1–7, equals
beat 8's win rate. Re-anchors to beginner tier when the
player-AI-skill-tier CR lands.

**Other beats:** not balance-measured. Authored for clarity.

---

## Open items remaining

1. **Briefing voice/speaker.** Queen as portrait/speaker, or
   Antonio addressing the player directly? Narrative call.
2. **Dead-soldier scripting (beat 4).** Scripted or
   probabilistic-with-floor? Likely scripted.
3. **Recruit verb UI (beat 6).** Resolves at UX-surface-spec
   time.
4. **Entrance defender composition (beat 8).** Level PA's call,
   tuned to the 90% win-rate target.

---

## What feeds out of this outline

- **Tutorial design doc.** Beat-by-beat copy.
- **Level PA handoff.** Yard geometry, POST placement, party
  composition, the beat-8 tuning loop.
- **UX-surface spec for L0.** Interface affordances per beat,
  including the UI-derived auto-pause triggers.
- **Briefing view spec amendment.** Briefing convention
  generalized beyond L0.
- **Playability rubric criterion 7 amendment** — direct route
  (see `amendment-playability-rubric-c7.md`).

Look-and-feel is deferred per established discipline.
