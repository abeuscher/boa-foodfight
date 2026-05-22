import { describe, expect, it } from 'vitest';

import type { Faction, PostId, ReplayEvent } from '../../../engine/types.ts';

import { eventLabel, pauseReasonLabel } from './eventLabel.ts';

const ev = (e: Partial<ReplayEvent> & { kind: ReplayEvent['kind'] }): ReplayEvent =>
  ({ turn: 1, tick: 0, ...e }) as ReplayEvent;

describe('eventLabel', () => {
  it('reads payload fields where useful', () => {
    expect(
      eventLabel(
        ev({ kind: 'post-captured', postId: 'sink' as PostId, newOwner: 'ant' as Faction }),
      ),
    ).toBe('sink captured by the ants');
    expect(eventLabel(ev({ kind: 'turn-start', turn: 7 }))).toBe('Turn 7 begins');
  });

  it('falls back to a humanized kind for unmapped events', () => {
    expect(eventLabel(ev({ kind: 'phase-changed' }))).toBe('phase changed');
  });
});

describe('pauseReasonLabel', () => {
  it('names the auto-pause trigger', () => {
    expect(pauseReasonLabel(ev({ kind: 'post-captured' }))).toBe('POST captured');
    expect(pauseReasonLabel(ev({ kind: 'battle-resolved' }))).toBe('Combat');
  });
});
