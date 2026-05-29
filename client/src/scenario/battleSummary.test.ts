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

  it('returns null modifierStack when the result has no modifier data', () => {
    const out = summarizeBattle(result);
    expect(out.modifierStack).toBeNull();
  });

  it('flattens an attached modifier stack, skipping no-op (×1) layers', () => {
    const withStack: BattleResult = {
      ...result,
      modifierStack: {
        plane: 'floor',
        postDefense: 2,
        attacker: {
          postureName: 'fight',
          postureAttack: 1,
          postureDefense: 1,
          strategyAttack: 1.25,
          strategyDefense: 1,
          jellyAttack: 1.5,
          jellyResilience: 1,
          queenProximityAttack: 1.5,
          queenProximityResilience: 1,
        },
        defender: {
          postureName: 'defend',
          postureAttack: 0.8,
          postureDefense: 1.5,
          strategyAttack: 1,
          strategyDefense: 1,
          jellyAttack: 1,
          jellyResilience: 1,
          queenProximityAttack: 1,
          queenProximityResilience: 1,
        },
      },
    };
    const out = summarizeBattle(withStack);
    expect(out.modifierStack).not.toBeNull();
    const stack = out.modifierStack!;
    expect(stack.plane).toBe('floor');
    // Attacker: strategyAttack 1.25 + jellyAttack 1.5 + queenProx 1.5 = 3 attack rows
    expect(stack.attacker.attackRows).toHaveLength(3);
    expect(stack.attacker.defenseRows).toHaveLength(0);
    // Defender: posture rows + POST defense flat
    const defRows = stack.defender.attackRows.concat(stack.defender.defenseRows);
    const labels = defRows.map((r) => r.label);
    expect(labels).toContain('Posture (defend)');
    expect(labels).toContain('POST defense');
    // POST defense applies to defender only and is additive.
    const post = stack.defender.defenseRows.find((r) => r.label === 'POST defense');
    expect(post?.kind).toBe('add');
    expect(post?.value).toBe(2);
    // Attacker does NOT receive POST defense.
    expect(stack.attacker.defenseRows.find((r) => r.label === 'POST defense')).toBeUndefined();
  });
});
