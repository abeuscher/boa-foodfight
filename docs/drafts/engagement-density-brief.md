# Engagement-density brief — quantifying "long periods without encountering problems"

**From / To / Status:** Dev → PM / Draft for discussion.
**Stance:** Captured from PM Phase-C playthrough feedback (post-Chunks
35-37). PM noted: "the game is not yet engaging; long periods are
spent moving around space without encountering problems. We may need
to create more obstacles or add some extra terrain or path-related
challenge." Acknowledged as a real issue that needs to be quantified
before it can be solved — this brief frames the metric and lays out
three solve directions with their tradeoffs.

---

## 1. Why "more obstacles" isn't the answer by itself

The PM's instinct — add more friction — is correct directionally, but
the lever isn't obvious. We already ship:

- **8-10 mid-POSTs per scenario** (Chunk 1 density bump from 3-5),
  averaging ~1.3 POSTs per plane.
- **2-5 obstacles per plane** with a clustering bias (engine/map-gen.ts
  Phase 3). Already ~18-30 obstacles board-wide.
- **Hazard fields** (`engine/hazard-field.ts`) — exist but L1 doesn't
  use them.
- **Neutral parties** (cockroach, mouse, stinkbug) — recruitable but
  passive; they don't threaten the player.

Adding more of the same furniture won't move the needle if the
problem isn't furniture-density. The actual symptom is **time between
decision points**: turns where the player issues `move` and hits
`play`, and the next pause arrives 5-10 turns later via a battle,
capture, or end-state. Between those moments, the player is a
spectator to their own plan.

## 2. Proposed metric: "decision interval"

Before choosing a solve, lock a metric so we can A/B subsequent
chunks against it:

> **Decision interval** = mean number of auto-played turns between
> moments where the player is required to make a non-trivial choice.

"Non-trivial choice" = battle resolution, capturable POST in range,
recruit prompt, jelly target available, flee opportunity, hazard
proximity, formation/leader edit (Chunk 41), or any scripted beat.

A rough hand-count of L1 from the PM's playthrough suggests **decision
interval ≈ 6-8 turns** at present. Anecdotally, an engaging mid-pace
tactics game lands at **2-4 turns**.

Two ways to measure once the metric is locked:

1. **Harness instrumentation** — emit a `decision-tick` event in the
   engine each turn that any of the trigger conditions hits; the
   harness already aggregates events to JSON, so a per-variant
   `meanDecisionInterval` falls out for free.
2. **PM dial test** — three short playthroughs (5 minutes each) with
   PM logging where attention drifted; cross-check against the
   instrumented numbers.

The metric lets us land each engagement chunk and see whether it
actually moved the dial, not just whether it sounded plausible.

## 3. Three solve directions (ranked by my recommendation)

### A. Hostile neutrals + roaming hazard pulses (recommended)

Make the empty stretches stop being empty. Two pieces:

- **Hostile neutrals** — cockroach / stinkbug parties currently sit
  inert until recruited. Promote them to a `neutral-hostile` posture
  that walks toward the nearest ant party each turn (1 tile, no
  cross-plane). On contact: small battle. The player can still
  recruit them via the existing ability before the fight resolves.
- **Hazard pulses** — add 1-2 hazard zones per plane (small radius,
  low DPS — say 3 HP/turn). Zones drift toward the active ant
  parties every N turns, forcing routing or attrition. Re-uses the
  existing hazard-field engine code.

**Why I recommend this:** lowest engine risk (both mechanics already
shipped, just unused at L1 density), highest variety per turn (player
sees a fresh threat every few moves), and it doesn't break the
existing "march to the ceiling" arc the level was designed around.

**Tradeoffs:** if tuned too aggressive, this turns L1 from a march
into a brawl — the strategic shape changes. Mitigate with conservative
starting numbers + the decision-interval metric for tuning.

### B. Gated waypoints (medium recommendation)

Make the win condition path require _intermediate captures_ the way
the audit notes hinted at:

- Spider-web @ ceiling becomes capturable only after ant holds _N_
  mid-POSTs (say 2). Now the march has explicit waypoints.
- Each captured POST might trigger a spider counter-move (spawn a
  spider scout near the captured POST, or re-route a spider party
  to retake). The empty stretches become "race to capture before
  spider reaches."

**Why this is appealing:** clarifies the strategic shape — the player
knows what they need to do at every moment. Closes the audit M-3
gap of "what's the next thing I should care about" without adding
more visible UI.

**Tradeoffs:** requires engine work (POST-prerequisite system, spider
AI response logic). Higher implementation cost than (A). Also changes
the difficulty curve substantially — every L beyond L1 would need to
be re-balanced against the gated arc.

### C. Time pressure (lowest recommendation)

Add a "scenario tempo" mechanic:

- **Spider reinforcements every T turns** — small spider party spawns
  at the spider-web; player feels the pressure of waiting too long.
- **OR Spider-web matures** — every T turns, spider-web defense
  rating goes up; player is incentivized to attack early even if
  under-staffed.

**Why this is last:** time pressure is a real engagement tool but
it tends to feel imposed rather than emergent. Players read it as
"the game is rushing me" rather than "the level is dangerous." For
a tactics game, geographic friction (A) and structural goals (B)
usually feel better than clock pressure.

**Tradeoffs:** simple to implement; high risk of feeling cheap or
punishing on a first playthrough.

## 4. What I'm asking you to decide

1. **Lock the metric** — accept "decision interval" + the harness
   instrumentation route (or propose a different metric).
2. **Pick a direction** (A / B / C, or a hybrid) so the next
   engagement-focused chunk has a concrete target.
3. **Target band** for the metric — I suggested 2-4 turns; if your
   instinct says 3-5 or 1-3, lock the band so we know when we've
   landed.

Once those three are locked, I'd propose:

- **Chunk E-1** — instrument `decision-tick`; baseline the current
  L1 decision interval; commit the harness output as the before-
  picture.
- **Chunk E-2** — ship whichever solve direction you pick at
  conservative numbers.
- **Chunk E-3** — re-measure; tune.

Three chunks, three retests; engagement issue closed or refined
based on data, not vibes.

---

_Reference: PM playthrough Phase-C feedback (this session), PM Phase-B
playthrough notes §1-5 (`docs/drafts/phase-b-playthrough-notes.md`),
S1/S2 UI audit (`docs/test-feedback/ui-audit-s{1,2}`)._
