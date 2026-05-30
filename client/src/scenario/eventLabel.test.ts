import { describe, expect, it } from 'vitest';

import type {
  Faction,
  PartyId,
  PostId,
  ReplayEvent,
  UnitId,
  UnitTemplateId,
} from '../../../engine/types.ts';

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

  it('formats in-plane party-moved with party id + coords + plane', () => {
    const out = eventLabel(
      ev({
        kind: 'party-moved',
        partyId: 'vanguard-alpha' as PartyId,
        from: { plane: 'floor', x: 3, y: 3 },
        to: { plane: 'floor', x: 3, y: 4 },
      }),
    );
    expect(out).toContain('vanguard-alpha');
    expect(out).toContain('(3, 3)');
    expect(out).toContain('(3, 4)');
    expect(out).toContain('floor');
  });

  it('flags cross-plane party-moved as a crossing (no longer reads as a teleport bug)', () => {
    const out = eventLabel(
      ev({
        kind: 'party-moved',
        partyId: 'pathfinders' as PartyId,
        from: { plane: 'floor', x: 3, y: 3 },
        to: { plane: 'ceiling', x: 3, y: 3 },
      }),
    );
    expect(out).toContain('pathfinders');
    expect(out).toContain('crossed');
    expect(out).toContain('floor');
    expect(out).toContain('ceiling');
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

  it('uses the beat title for scripted-beat pauses', () => {
    expect(
      pauseReasonLabel(
        ev({
          kind: 'scripted-beat',
          beatId: 'first-stirrings',
          title: 'The web tightens',
          message: 'A distant skitter.',
        }),
      ),
    ).toBe('The web tightens');
  });

  it('labels unit-promoted as a Promotion pause', () => {
    expect(
      pauseReasonLabel(
        ev({
          kind: 'unit-promoted',
          partyId: 'vanguard' as PartyId,
          unitId: 'u1' as UnitId,
          fromTemplate: 'ant-mage' as UnitTemplateId,
          toTemplate: 'ant-archmage' as UnitTemplateId,
        }),
      ),
    ).toBe('Promotion');
  });

  it('renders stat-earned with the signed delta and before/after values', () => {
    const out = eventLabel(
      ev({
        kind: 'stat-earned',
        partyId: 'vanguard' as PartyId,
        stat: 'aggression',
        delta: 1,
        before: 4,
        after: 5,
        reason: 'attack-initiated',
      }),
    );
    expect(out).toContain('aggression');
    expect(out).toContain('+1');
    expect(out).toContain('4');
    expect(out).toContain('5');
  });
});
