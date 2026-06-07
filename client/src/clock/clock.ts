/**
 * Real-time clock layer (in-scenario playback core).
 *
 * The engine has no sub-turn stepping API: a turn resolves abilities →
 * movement → battles → end-of-turn internally and returns one
 * `TurnOutcome` with a flat, tick-ordered `events[]` (see
 * `docs/drafts/auto-pause-events.md` "How the engine surfaces events").
 * So the clock does NOT step the sim — it **animates a completed turn's
 * ordered event stream** (the `viewer/` replay-scrubber model). "Pause"
 * pauses *playback*, not the sim; this is byte-safe and needs no engine
 * work.
 *
 * This module is the pure, framework-free core: an immutable state plus
 * transitions (`play` / `pause` / `setSpeed` / `step` / `tick`). A thin
 * React hook drives `tick(dtMs)` from a rAF/interval loop, and the
 * in-scenario view renders from this state. No DOM, no timers here — so
 * the auto-pause behavior is fully unit-testable.
 *
 * Auto-pause (v1): pause when playback reaches an event whose `kind` is
 * in `autoPauseKinds`. The default set is the **event-keyed** subset of
 * the auto-pause contract — the two engine-backed events plus
 * `battle-resolved` (the `combat-init` key, per Exchange #10). The
 * **state-derived** triggers (`party-idle`, `newly-visible-enemy`) need
 * per-turn snapshot diffing / the still-pending ant-visibility
 * projection and are intentionally NOT wired here.
 */

import type { ReplayEvent } from '../../../engine/types.ts';

export type Speed = 0.5 | 1 | 2 | 4;

/** Speed-control steps (main-screen HUD pod, ruleset I3). */
export const SPEEDS: readonly Speed[] = [0.5, 1, 2, 4];

/**
 * Default wall-clock duration one event occupies at 1× speed. Bumped
 * from 600 ms to 2000 ms during L1 iteration so the play-by-play is
 * readable without scrubbing. The faster end of the speed slate (2× /
 * 4×) gets the prior pacing back for skim. Each clock instance can
 * override the default per-create — see `createClock`'s third arg.
 */
export const DEFAULT_MS_PER_EVENT = 2000;

/** @deprecated Kept as a re-export for the existing clock.test.ts call
 * sites; new code reads `clock.msPerEvent` off the state instead so a
 * per-clock override actually takes effect. */
export const MS_PER_EVENT = DEFAULT_MS_PER_EVENT;

/** Default auto-pause triggers: the event-keyed subset of the contract.
 * `scripted-beat` joins as the L1-iteration narrative hook; `unit-promoted`
 * joins so the player sees the item-gated terminal-class swap (#7);
 * `recruit-attempted-neutral` joins (Chunk 29) so the player can't miss
 * the success/failure read after explicitly clicking Try to Recruit
 * (PM playtest: "the button doesn't feel like it is getting clicked");
 * `jelly-applied` joins (Chunk 31) for the same reason — the human
 * now explicitly casts Royal Jelly and needs the same click-confirms
 * read; `battle-flee-attempted` joins (Chunk 32) — flee is a high-
 * stakes click (failure costs an unopposed round), so the player
 * needs to land on the outcome to read success/failure before
 * playback resumes. */
export const DEFAULT_AUTO_PAUSE_KINDS: ReadonlySet<ReplayEvent['kind']> = new Set<
  ReplayEvent['kind']
>([
  'post-captured',
  'reinforcement-spawned',
  'battle-resolved',
  'scripted-beat',
  'unit-promoted',
  'recruit-attempted-neutral',
  'jelly-applied',
  'battle-flee-attempted',
]);

export interface ClockState {
  readonly events: readonly ReplayEvent[];
  /** Events consumed so far — the playhead (0 … events.length). */
  readonly index: number;
  readonly playing: boolean;
  readonly speed: Speed;
  /** Wall time banked toward the next event (carries between ticks). */
  readonly accumMs: number;
  /** The auto-pause trigger playback stopped on, else null. */
  readonly pausedAt: ReplayEvent | null;
  readonly autoPauseKinds: ReadonlySet<ReplayEvent['kind']>;
  /**
   * Wall-clock duration per event at 1× speed. Defaults to
   * `DEFAULT_MS_PER_EVENT` (2000 ms); thread an override through
   * `createClock` so a future Slow / Normal / Fast preset selector
   * picks this up without touching the playback algorithm.
   */
  readonly msPerEvent: number;
}

export const createClock = (
  events: readonly ReplayEvent[],
  autoPauseKinds: ReadonlySet<ReplayEvent['kind']> = DEFAULT_AUTO_PAUSE_KINDS,
  msPerEvent: number = DEFAULT_MS_PER_EVENT,
): ClockState => ({
  events,
  index: 0,
  playing: false,
  speed: 1,
  accumMs: 0,
  pausedAt: null,
  autoPauseKinds,
  msPerEvent,
});

export const atEnd = (s: ClockState): boolean => s.index >= s.events.length;

/** The most recently played event (what the view should reflect), or
 * null before the first event has played. */
export const currentEvent = (s: ClockState): ReplayEvent | null =>
  s.index > 0 ? (s.events[s.index - 1] ?? null) : null;

export const play = (s: ClockState): ClockState =>
  atEnd(s) ? s : { ...s, playing: true, pausedAt: null };

export const pause = (s: ClockState): ClockState => ({ ...s, playing: false });

export const setSpeed = (s: ClockState, speed: Speed): ClockState => ({ ...s, speed });

/** The paused-only Step verb (ruleset I4): advance exactly one event,
 * regardless of banked time. Sets `pausedAt` if that event is a trigger.
 * No-op at end of stream. */
export const step = (s: ClockState): ClockState => {
  if (atEnd(s)) return s;
  const ev = s.events[s.index]!;
  return {
    ...s,
    index: s.index + 1,
    accumMs: 0,
    playing: false,
    pausedAt: s.autoPauseKinds.has(ev.kind) ? ev : null,
  };
};

/** Advance playback by `dtMs` of wall time (scaled by speed). Stops at
 * the first auto-pause trigger crossed (consuming it, then pausing), or
 * at end of stream. No-op when paused. */
export const tick = (s: ClockState, dtMs: number): ClockState => {
  if (!s.playing || atEnd(s) || dtMs <= 0) return s;
  let index = s.index;
  let accumMs = s.accumMs + dtMs * s.speed;
  let pausedAt: ReplayEvent | null = null;
  let playing = true;
  while (accumMs >= s.msPerEvent && index < s.events.length) {
    const ev = s.events[index]!;
    accumMs -= s.msPerEvent;
    index += 1;
    if (s.autoPauseKinds.has(ev.kind)) {
      pausedAt = ev;
      playing = false;
      accumMs = 0;
      break;
    }
  }
  if (index >= s.events.length) {
    playing = false;
    accumMs = 0;
  }
  return { ...s, index, accumMs, playing, pausedAt };
};
