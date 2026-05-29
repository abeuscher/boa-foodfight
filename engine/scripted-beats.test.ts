/**
 * L1-iteration #5 — scripted-beat trigger evaluator tests.
 *
 * Covers the surface that's distinct from the rest of the turn driver:
 *   1. No beats data ⇒ no events, state unchanged (gated-inert).
 *   2. Turn trigger fires when state.turn matches; absent before.
 *   3. postCaptured trigger fires when a matching post-captured event
 *      is in this turn's events; ignores other event kinds.
 *   4. Single-shot: a fired beat does not re-fire on subsequent calls
 *      even when the trigger still matches.
 *   5. Multiple beats matching the same call all fire.
 */

import { describe, expect, it } from 'vitest';

import type { BeatsFile } from './schemas/beats.ts';
import { resolveScriptedBeats } from './scripted-beats.ts';
import type { Faction, GameState, PostId, ReplayEvent } from './types.ts';

const tickClock = (): (() => number) => {
  let t = 0;
  return () => ++t;
};

const baseState = (turn: number, firedBeats?: ReadonlySet<string>): GameState =>
  ({
    turn,
    ...(firedBeats !== undefined ? { firedBeats } : {}),
  }) as unknown as GameState;

describe('resolveScriptedBeats', () => {
  it('is a no-op when beats is undefined', () => {
    const state = baseState(5);
    const out = resolveScriptedBeats(state, undefined, [], tickClock());
    expect(out.state).toBe(state);
    expect(out.events).toEqual([]);
  });

  it('is a no-op when beats.beats is empty', () => {
    const state = baseState(5);
    const out = resolveScriptedBeats(state, { version: 1, beats: [] }, [], tickClock());
    expect(out.state).toBe(state);
    expect(out.events).toEqual([]);
  });

  it('fires a turn-triggered beat on the matching turn', () => {
    const beats: BeatsFile = {
      version: 1,
      beats: [{ id: 'b1', trigger: { turn: 3 }, title: 'T', message: 'M' }],
    };
    const before = resolveScriptedBeats(baseState(2), beats, [], tickClock());
    expect(before.events).toEqual([]);

    const out = resolveScriptedBeats(baseState(3), beats, [], tickClock());
    expect(out.events).toHaveLength(1);
    const ev = out.events[0]!;
    expect(ev.kind).toBe('scripted-beat');
    if (ev.kind === 'scripted-beat') {
      expect(ev.beatId).toBe('b1');
      expect(ev.title).toBe('T');
      expect(ev.message).toBe('M');
      expect(ev.turn).toBe(3);
    }
    expect(out.state.firedBeats?.has('b1')).toBe(true);
  });

  it('fires a postCaptured beat when that post is captured this turn', () => {
    const beats: BeatsFile = {
      version: 1,
      beats: [{ id: 'b2', trigger: { postCaptured: 'wall-crack-1' }, title: 'X', message: 'Y' }],
    };
    const turnEvents: ReplayEvent[] = [
      {
        kind: 'post-captured',
        turn: 7,
        tick: 1,
        postId: 'wall-crack-1' as PostId,
        newOwner: 'ant' as Faction,
      },
    ];
    const out = resolveScriptedBeats(baseState(7), beats, turnEvents, tickClock());
    expect(out.events).toHaveLength(1);
    expect(out.events[0]!.kind).toBe('scripted-beat');
  });

  it('ignores postCaptured beat when the captured post id differs', () => {
    const beats: BeatsFile = {
      version: 1,
      beats: [{ id: 'b3', trigger: { postCaptured: 'wall-crack-1' }, title: 'X', message: 'Y' }],
    };
    const turnEvents: ReplayEvent[] = [
      {
        kind: 'post-captured',
        turn: 7,
        tick: 1,
        postId: 'soap-dish' as PostId,
        newOwner: 'ant' as Faction,
      },
    ];
    const state = baseState(7);
    const out = resolveScriptedBeats(state, beats, turnEvents, tickClock());
    expect(out.events).toEqual([]);
    expect(out.state).toBe(state);
  });

  it('does not re-fire a beat already in firedBeats', () => {
    const beats: BeatsFile = {
      version: 1,
      beats: [{ id: 'b4', trigger: { turn: 4 }, title: 'T', message: 'M' }],
    };
    const out = resolveScriptedBeats(baseState(4, new Set(['b4'])), beats, [], tickClock());
    expect(out.events).toEqual([]);
  });

  it('fires multiple matching beats in a single call', () => {
    const beats: BeatsFile = {
      version: 1,
      beats: [
        { id: 'b5', trigger: { turn: 2 }, title: 'A', message: 'a' },
        { id: 'b6', trigger: { postCaptured: 'soap-dish' }, title: 'B', message: 'b' },
      ],
    };
    const turnEvents: ReplayEvent[] = [
      {
        kind: 'post-captured',
        turn: 2,
        tick: 1,
        postId: 'soap-dish' as PostId,
        newOwner: 'ant' as Faction,
      },
    ];
    const out = resolveScriptedBeats(baseState(2), beats, turnEvents, tickClock());
    expect(out.events).toHaveLength(2);
    expect(out.state.firedBeats?.has('b5')).toBe(true);
    expect(out.state.firedBeats?.has('b6')).toBe(true);
  });
});
