# Change Request: Tutorial Overlay — in-scenario coaching system

From / To / Status: UX → Dev (Gameplay/Engine) / Proposal — awaiting
cost/feasibility read
Blocking: Non-blocking, batched. No engine work is expected; this asks
dev to confirm two client-capability assumptions and ratify the spec.

**Exchange number:** #12 (committed `change-request-protocol.md` §5 log
holds #1–#11; #10 = UI shell + auto-pause, #11 = Organize Army + Shop).

## Solving for

A first level the player **plays** rather than watches, and a
**reusable way to introduce things** as the game grows. The engine is
a deterministic turn sim (player issues orders → time advances → world
resolves), so the standing risk is a passive "watch-the-PC-play-itself"
tutorial. We need: (a) the player holding real agency within a few
steps, and (b) a system — not a one-off L0 script — for introducing a
control, an action, a strategy element, or a world-loop piece, since
features will keep landing and UI flow will keep shifting. This is the
in-scenario half of the tutorial-design surface
`playability-critic-rubric.md` criterion 7 is gated on.

## Proposed change

Ratify `docs/ui-tutorial-overlay-spec.md` (drafted at
`docs/drafts/ui-tutorial-overlay-spec.md`). It defines a four-type
**step grammar** — acknowledge-modal, highlight-and-explain (control),
point-and-do action-gate (action), free-play nudge (strategy /
world-loop / unstick) — a per-step pause model that rides pacing §A.1,
and an "active-not-passive" sequencing rule (first gate = a real order;
back half = play-with-nudges). L0 is included as a **re-authorable
worked example**, not a fixed contract.

**What is NOT changing:** no engine work requested. The Briefing view
(`ui-briefing-spec.md`) keeps the goal statement; it is not redrawn.
Antonio's actual lines are content (writer agent), not specced here.
Visual emphasis treatment (arrow vs spotlight-mask) is §D-deferred.
The tutorial-step data schema is a forward-dep, authored when the
overlay is built.

## Why

Dev's next frontier is the in-scenario surfaces, and this is the last
missing in-scenario per-view piece — the rest of the family (main
screen, battle mode, briefing, end-of-scenario, shell, auto-pause) is
RECORDED. The overlay consumes already-emitted turn-stream events plus
client UI state and produces nothing the sim path sees, so it should be
byte-safe by construction. Speccing it as a system (not an L0 script)
means new features slot in as new step instances rather than tutorial
rewrites.

## Our cost guess (please correct)

- **Engine: zero.** The overlay reads `TurnOutcome.events[]` (the same
  signals `auto-pause-events.md` names) and client UI state; it emits
  no new engine events. No gate-29 / balance-curve surface touched. If
  any of that is wrong, that's the thing we can't see — flag it.
- **The real ask is two client-capability confirmations** (client-
  runtime, since the engine is headless — so "can the client do this,"
  not "can the engine"):
  1. **Action-observability for gates.** Can the client detect the
     player actions a point-and-do gate advances on — **order
     confirmed** (the `ui-main-screen-spec.md` order-lifecycle
     Confirm), **speed/pause changed** (HUD pod), **sub-view opened**,
     **face selected/rotated**? We assumed yes (client UI events).
  2. **Stall detection.** Is "no player action for N seconds of live
     play" computable client-side (same family as the auto-pause idle
     signals)?
- Correct anything we misrecorded about the order-lifecycle Confirm or
  which turn-stream signals are observable to the client.

## What we want back

Decision (ratify the spec into `docs/`), the two client-capability
confirmations above, and correction on any observable-signal /
order-lifecycle detail we got wrong. Decision-record destination:
`roadmap-tier-1.md` §7 (next free subsection, §7.16).
