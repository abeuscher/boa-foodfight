import { describe, expect, it } from 'vitest';

import type { BattleResult, PartyId, UnitId, UnitTemplateId } from '../../../engine/types.ts';

import { summarizeBattle } from './battleSummary.ts';

const result: BattleResult = {
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

describe('summarizeBattle', () => {
  it('expands per-action lines with running HP and template-based labels', () => {
    const out = summarizeBattle(result);
    expect(out.actions).toHaveLength(2);
    expect(out.actions[0]).toMatchObject({
      attackerLabel: 'Spider elite',
      defenderLabel: 'Ant footman',
      damage: 3,
      defenderHpAfter: 3,
      defenderMaxHp: 6,
      killed: false,
    });
    expect(out.actions[1]).toMatchObject({
      attackerLabel: 'Ant footman',
      defenderLabel: 'Spider elite',
      damage: 8,
      defenderHpAfter: 0,
      killed: true,
    });
  });

  it('produces per-side participant endHp reflecting all actions', () => {
    const out = summarizeBattle(result);
    const spider = out.participants.find((p) => p.unitId === ('u1-spider-elite' as UnitId));
    const ant = out.participants.find((p) => p.unitId === ('u2-ant-footman' as UnitId));
    expect(spider?.endHp).toBe(0);
    expect(ant?.endHp).toBe(3);
    expect(spider?.isLeader).toBe(true);
  });

  it('labels the winner side from the partyId', () => {
    const out = summarizeBattle(result);
    expect(out.winnerLabel).toContain('vanguard');
    expect(out.winnerLabel).toContain('defender');
  });
});
