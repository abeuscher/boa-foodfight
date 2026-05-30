/**
 * Tests for the right-rail activity feed expander.
 *   1. Non-battle events expand to one line via eventLabel.
 *   2. battle-resolved expands to header + per-action + tally lines.
 *   3. Keys are unique per line so React diff doesn't thrash.
 *   4. Per-action text carries attacker → defender labels + damage + HP +
 *      kill marker.
 *   5. Empty input → empty output.
 */

import { describe, expect, it } from 'vitest';

import { expandEventsForFeed } from './feedLines.ts';

import type {
  BattleResult,
  Faction,
  PartyId,
  PostId,
  ReplayEvent,
  UnitId,
  UnitTemplateId,
} from '../../../engine/types.ts';

const battle: BattleResult = {
  attackerPartyId: 'raiders' as PartyId,
  defenderPartyId: 'vanguard' as PartyId,
  winner: 'vanguard' as PartyId,
  rounds: [
    {
      index: 0,
      actions: [
        {
          attackerId: 'u1-spider-elite' as UnitId,
          defenderId: 'u2-ant-footman' as UnitId,
          damage: 3,
          killed: false,
        },
        {
          attackerId: 'u2-ant-footman' as UnitId,
          defenderId: 'u1-spider-elite' as UnitId,
          damage: 8,
          killed: true,
        },
      ],
    },
  ],
  attackerCasualties: ['u1-spider-elite' as UnitId],
  defenderCasualties: [],
  retreatTo: null,
  participants: [
    {
      unitId: 'u1-spider-elite' as UnitId,
      templateId: 'spider-elite' as UnitTemplateId,
      side: 'attacker',
      hp: 8,
      maxHp: 8,
      isLeader: true,
    },
    {
      unitId: 'u2-ant-footman' as UnitId,
      templateId: 'ant-footman' as UnitTemplateId,
      side: 'defender',
      hp: 6,
      maxHp: 6,
      isLeader: false,
    },
  ],
};

describe('expandEventsForFeed', () => {
  it('returns an empty list for an empty event stream', () => {
    expect(expandEventsForFeed([])).toEqual([]);
  });

  it('expands a non-battle event to a single line of kind `event`', () => {
    const ev: ReplayEvent = { kind: 'turn-start', turn: 5, tick: 12 };
    const out = expandEventsForFeed([ev]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('event');
    expect(out[0]!.text).toContain('Turn 5');
  });

  it('expands battle-resolved into header + per-action + tally in prose', () => {
    const ev: ReplayEvent = { kind: 'battle-resolved', turn: 3, tick: 42, result: battle };
    const out = expandEventsForFeed([ev]);
    // 1 header + 2 actions + 1 tally = 4 lines.
    expect(out).toHaveLength(4);

    // Header reads "Combat: raiders attack vanguard."
    expect(out[0]!.kind).toBe('battle-header');
    expect(out[0]!.text).toContain('raiders');
    expect(out[0]!.text).toContain('vanguard');

    // Non-killing action: "Round 1: Spider elite attacks Ant footman for 3 damage (3/6 HP)."
    expect(out[1]!.kind).toBe('battle-action');
    expect(out[1]!.text).toContain('Round 1');
    expect(out[1]!.text).toContain('Spider elite');
    expect(out[1]!.text).toContain('attacks');
    expect(out[1]!.text).toContain('Ant footman');
    expect(out[1]!.text).toContain('3 damage');
    expect(out[1]!.text).toContain('3/6 HP');

    // Killing action: "Round 1: Ant footman attacks Spider elite for 8 damage. Spider elite is killed."
    expect(out[2]!.kind).toBe('battle-action');
    expect(out[2]!.text).toContain('Ant footman');
    expect(out[2]!.text).toContain('attacks');
    expect(out[2]!.text).toContain('Spider elite');
    expect(out[2]!.text).toContain('8 damage');
    expect(out[2]!.text).toContain('is killed');

    // Tally
    expect(out[3]!.kind).toBe('battle-tally');
    expect(out[3]!.text).toContain('Combat ends');
  });

  it('produces unique keys across lines (stable per tick)', () => {
    const ev: ReplayEvent = { kind: 'battle-resolved', turn: 3, tick: 42, result: battle };
    const out = expandEventsForFeed([ev]);
    const keys = new Set(out.map((l) => l.key));
    expect(keys.size).toBe(out.length);
  });

  it('interleaves multiple events in order', () => {
    const events: ReplayEvent[] = [
      { kind: 'turn-start', turn: 3, tick: 40 },
      { kind: 'battle-resolved', turn: 3, tick: 41, result: battle },
      {
        kind: 'post-captured',
        turn: 3,
        tick: 42,
        postId: 'soap-dish-1' as PostId,
        newOwner: 'ant' as Faction,
      },
    ];
    const out = expandEventsForFeed(events);
    // turn-start (1) + battle (header + 2 actions + tally = 4) + post-captured (1) = 6
    expect(out).toHaveLength(6);
    expect(out[0]!.kind).toBe('event');
    expect(out[1]!.kind).toBe('battle-header');
    expect(out[5]!.kind).toBe('event');
  });
});
