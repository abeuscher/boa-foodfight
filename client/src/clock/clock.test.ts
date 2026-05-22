import { describe, expect, it } from 'vitest';

import type { ReplayEvent } from '../../../engine/types.ts';

import {
  MS_PER_EVENT,
  atEnd,
  createClock,
  currentEvent,
  play,
  setSpeed,
  step,
  tick,
} from './clock.ts';

// The clock only reads `.kind` (and array position); minimal cast events
// keep the discriminated-union payloads out of the test.
const ev = (kind: ReplayEvent['kind'], tick = 0): ReplayEvent =>
  ({ kind, turn: 1, tick }) as unknown as ReplayEvent;

// turn-start / party-moved are non-triggers; post-captured /
// reinforcement-spawned / battle-resolved are the default auto-pause set.
const stream: readonly ReplayEvent[] = [
  ev('turn-start', 0),
  ev('party-moved', 1),
  ev('post-captured', 2), // trigger #1 (index 2 → consumed at index 3)
  ev('party-moved', 3),
  ev('battle-resolved', 4), // trigger #2 (combat-init key)
  ev('reinforcement-spawned', 5), // trigger #3
];

describe('clock core', () => {
  it('starts paused at the head', () => {
    const c = createClock(stream);
    expect(c.index).toBe(0);
    expect(c.playing).toBe(false);
    expect(c.speed).toBe(1);
    expect(c.pausedAt).toBeNull();
    expect(currentEvent(c)).toBeNull();
  });

  it('tick is a no-op while paused', () => {
    const c = createClock(stream);
    expect(tick(c, 10_000)).toEqual(c);
  });

  it('plays through non-trigger events and auto-pauses on the first trigger', () => {
    // 3 events of headroom would reach index 3, but the 3rd consumed
    // event is post-captured → pause there.
    const c = tick(play(createClock(stream)), MS_PER_EVENT * 5);
    expect(c.index).toBe(3); // turn-start, party-moved, post-captured consumed
    expect(c.playing).toBe(false);
    expect(c.pausedAt?.kind).toBe('post-captured');
    expect(currentEvent(c)?.kind).toBe('post-captured');
  });

  it('resumes past the trigger it stopped on', () => {
    let c = tick(play(createClock(stream)), MS_PER_EVENT * 5); // paused at post-captured (idx 3)
    c = tick(play(c), MS_PER_EVENT * 5); // next trigger is battle-resolved (idx 5)
    expect(c.index).toBe(5);
    expect(c.pausedAt?.kind).toBe('battle-resolved');
  });

  it('treats battle-resolved and reinforcement-spawned as auto-pause triggers', () => {
    const only = createClock([ev('party-moved'), ev('reinforcement-spawned')]);
    const c = tick(play(only), MS_PER_EVENT * 5);
    expect(c.index).toBe(2);
    expect(c.pausedAt?.kind).toBe('reinforcement-spawned');
  });

  it('does not pause on non-trigger kinds, and stops at end of stream', () => {
    const benign = createClock([ev('turn-start'), ev('party-moved'), ev('party-moved')]);
    const c = tick(play(benign), MS_PER_EVENT * 10);
    expect(atEnd(c)).toBe(true);
    expect(c.playing).toBe(false);
    expect(c.pausedAt).toBeNull();
  });

  it('speed scales how many events a tick consumes', () => {
    const benign = createClock([ev('turn-start'), ev('party-moved'), ev('party-moved')]);
    const slow = tick(play(benign), MS_PER_EVENT); // 1× → 1 event
    expect(slow.index).toBe(1);
    const fast = tick(setSpeed(play(benign), 4), MS_PER_EVENT); // 4× → 4 events (clamps at end=3)
    expect(fast.index).toBe(3);
  });

  it('step advances exactly one event, paused, flagging a trigger', () => {
    let c = createClock(stream);
    c = step(c); // turn-start
    expect(c.index).toBe(1);
    expect(c.playing).toBe(false);
    expect(c.pausedAt).toBeNull();
    c = step(step(c)); // party-moved, then post-captured (trigger)
    expect(c.index).toBe(3);
    expect(c.pausedAt?.kind).toBe('post-captured');
  });

  it('play is a no-op at end of stream', () => {
    const ended = tick(play(createClock([ev('party-moved')])), MS_PER_EVENT);
    expect(atEnd(ended)).toBe(true);
    expect(play(ended).playing).toBe(false);
  });

  it('does not mutate the input state', () => {
    const c = play(createClock(stream));
    const snapshot = JSON.stringify(c);
    tick(c, MS_PER_EVENT * 3);
    step(c);
    setSpeed(c, 2);
    expect(JSON.stringify(c)).toBe(snapshot);
  });
});
