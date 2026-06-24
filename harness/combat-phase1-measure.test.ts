/**
 * Unit tests for the Phase-1 measurement accumulators. Drives the pure
 * compute functions against synthetic ReplayEvent arrays so the per-
 * accumulator behavior is verified independently of the live scenario
 * sweep.
 */

import { describe, expect, it } from 'vitest';

import type { BattleResult, Faction, PartyId, ReplayEvent, UnitId } from '../engine/types.ts';

import {
  bucketHpLoss,
  computeCollisionDistribution,
  computeReattackCadence,
  computeRecoveryUtilization,
  computeSideHpLossFraction,
  computeUnitsLost,
} from './combat-phase1-measure.ts';

// ---------------------------------------------------------------------------
// Synthetic-event builders
// ---------------------------------------------------------------------------

const pid = (n: number): PartyId => `p${String(n)}` as PartyId;
const uid = (n: number): UnitId => `u${String(n)}` as UnitId;

interface BattleSpec {
  readonly attacker: PartyId;
  readonly defender: PartyId;
  readonly attackerHp: number;
  readonly defenderHp: number;
  /** Damage dealt to attacker side (summed across rounds). */
  readonly dmgToAttacker: number;
  /** Damage dealt to defender side (summed across rounds). */
  readonly dmgToDefender: number;
  readonly attackerCasualties?: number;
  readonly defenderCasualties?: number;
  readonly winner?: PartyId | 'draw';
}

let unitCounter = 0;

const makeBattleEvent = (turn: number, spec: BattleSpec): ReplayEvent => {
  const atkUnit = uid(++unitCounter);
  const defUnit = uid(++unitCounter);
  const result: BattleResult = {
    attackerPartyId: spec.attacker,
    defenderPartyId: spec.defender,
    winner: spec.winner ?? spec.attacker,
    rounds: [
      {
        index: 0,
        actions: [
          {
            attackerId: atkUnit,
            defenderId: defUnit,
            damage: spec.dmgToDefender,
            killed: (spec.defenderCasualties ?? 0) > 0,
          },
          {
            attackerId: defUnit,
            defenderId: atkUnit,
            damage: spec.dmgToAttacker,
            killed: (spec.attackerCasualties ?? 0) > 0,
          },
        ],
      },
    ],
    attackerCasualties: Array.from({ length: spec.attackerCasualties ?? 0 }, (_, i) =>
      uid(1000 + i + 10 * unitCounter),
    ),
    defenderCasualties: Array.from({ length: spec.defenderCasualties ?? 0 }, (_, i) =>
      uid(2000 + i + 10 * unitCounter),
    ),
    retreatTo: null,
    participants: [
      {
        unitId: atkUnit,
        templateId: 'ant-worker' as never,
        side: 'attacker',
        hp: spec.attackerHp,
        maxHp: spec.attackerHp,
        isLeader: true,
      },
      {
        unitId: defUnit,
        templateId: 'spider-skirmisher' as never,
        side: 'defender',
        hp: spec.defenderHp,
        maxHp: spec.defenderHp,
        isLeader: true,
      },
    ],
  };
  return { kind: 'battle-resolved', turn, tick: turn * 10, result };
};

// ---------------------------------------------------------------------------
// bucketHpLoss
// ---------------------------------------------------------------------------

describe('bucketHpLoss', () => {
  it('snaps fractions to the documented buckets', () => {
    expect(bucketHpLoss(0)).toBe('0-10');
    expect(bucketHpLoss(0.09)).toBe('0-10');
    expect(bucketHpLoss(0.1)).toBe('10-25');
    expect(bucketHpLoss(0.249)).toBe('10-25');
    expect(bucketHpLoss(0.25)).toBe('25-50');
    expect(bucketHpLoss(0.499)).toBe('25-50');
    expect(bucketHpLoss(0.5)).toBe('50-75');
    expect(bucketHpLoss(0.749)).toBe('50-75');
    expect(bucketHpLoss(0.75)).toBe('75-100');
    expect(bucketHpLoss(1)).toBe('75-100');
  });
});

// ---------------------------------------------------------------------------
// computeSideHpLossFraction — mirrors engine/battle's recentBattleOutcome math
// ---------------------------------------------------------------------------

describe('computeSideHpLossFraction', () => {
  it('returns damage / pre-battle HP per side, bounded to [0,1]', () => {
    const ev = makeBattleEvent(1, {
      attacker: pid(1),
      defender: pid(2),
      attackerHp: 100,
      defenderHp: 80,
      dmgToAttacker: 30,
      dmgToDefender: 80,
    });
    if (ev.kind !== 'battle-resolved') throw new Error('test setup');
    const losses = computeSideHpLossFraction(ev.result);
    expect(losses.attacker).toBeCloseTo(0.3);
    expect(losses.defender).toBeCloseTo(1);
  });

  it('returns 0 for an empty side (defensive against divide-by-zero)', () => {
    const ev = makeBattleEvent(1, {
      attacker: pid(1),
      defender: pid(2),
      attackerHp: 0,
      defenderHp: 50,
      dmgToAttacker: 0,
      dmgToDefender: 10,
    });
    if (ev.kind !== 'battle-resolved') throw new Error('test setup');
    const losses = computeSideHpLossFraction(ev.result);
    expect(losses.attacker).toBe(0);
    expect(losses.defender).toBeCloseTo(0.2);
  });
});

// ---------------------------------------------------------------------------
// computeCollisionDistribution
// ---------------------------------------------------------------------------

describe('computeCollisionDistribution', () => {
  it('buckets HP-loss fractions by faction-side across all battles', () => {
    const faction = (id: PartyId): Faction | undefined => {
      const s = String(id);
      if (s === 'p1' || s === 'p3') return 'ant';
      if (s === 'p2' || s === 'p4') return 'spider';
      return undefined;
    };
    const events: ReplayEvent[] = [
      // Battle 1: ant attacker takes 5% loss; spider defender takes 80% loss
      makeBattleEvent(1, {
        attacker: pid(1),
        defender: pid(2),
        attackerHp: 100,
        defenderHp: 100,
        dmgToAttacker: 5,
        dmgToDefender: 80,
      }),
      // Battle 2: spider attacker takes 40% loss; ant defender takes 20% loss
      makeBattleEvent(2, {
        attacker: pid(4),
        defender: pid(3),
        attackerHp: 100,
        defenderHp: 100,
        dmgToAttacker: 40,
        dmgToDefender: 20,
      }),
    ];
    const dist = computeCollisionDistribution(events, faction);
    // Ant attacker once (0-10) + ant defender once (10-25)
    expect(dist.ant['0-10']).toBe(1);
    expect(dist.ant['10-25']).toBe(1);
    // Spider defender once (75-100) + spider attacker once (25-50)
    expect(dist.spider['75-100']).toBe(1);
    expect(dist.spider['25-50']).toBe(1);
  });

  it('ignores non-battle events and unknown-faction parties', () => {
    const faction = (): Faction | undefined => undefined;
    const events: ReplayEvent[] = [
      { kind: 'turn-start', turn: 1, tick: 1 },
      makeBattleEvent(2, {
        attacker: pid(1),
        defender: pid(2),
        attackerHp: 100,
        defenderHp: 100,
        dmgToAttacker: 50,
        dmgToDefender: 50,
      }),
    ];
    const dist = computeCollisionDistribution(events, faction);
    for (const b of ['0-10', '10-25', '25-50', '50-75', '75-100'] as const) {
      expect(dist.ant[b]).toBe(0);
      expect(dist.spider[b]).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// computeReattackCadence
// ---------------------------------------------------------------------------

describe('computeReattackCadence', () => {
  it('counts engaged pairs and re-attacking pairs with mean gap', () => {
    const events: ReplayEvent[] = [
      // p1 vs p2: turns 1, 5, 9 — gaps [4, 4], mean = 4
      makeBattleEvent(1, mkSpec(pid(1), pid(2))),
      makeBattleEvent(5, mkSpec(pid(1), pid(2))),
      makeBattleEvent(9, mkSpec(pid(1), pid(2))),
      // p3 vs p4: turn 3 — single battle (engaged, not re-attacking)
      makeBattleEvent(3, mkSpec(pid(3), pid(4))),
      // p5 vs p6: turns 2, 10 — gap [8]
      makeBattleEvent(2, mkSpec(pid(5), pid(6))),
      makeBattleEvent(10, mkSpec(pid(5), pid(6))),
    ];
    const cadence = computeReattackCadence(events);
    expect(cadence.pairsEngaged).toBe(3);
    expect(cadence.pairsReattacking).toBe(2);
    // Mean of pair-means: (4 + 8) / 2 = 6
    expect(cadence.meanGapTurns).toBeCloseTo(6);
  });

  it('treats (a,b) and (b,a) as the same pair (unordered)', () => {
    const events: ReplayEvent[] = [
      makeBattleEvent(1, mkSpec(pid(1), pid(2))),
      // Roles flipped — p2 attacks p1 — still the same pair
      makeBattleEvent(4, mkSpec(pid(2), pid(1))),
    ];
    const cadence = computeReattackCadence(events);
    expect(cadence.pairsEngaged).toBe(1);
    expect(cadence.pairsReattacking).toBe(1);
    expect(cadence.meanGapTurns).toBe(3);
  });

  it('returns 0 mean-gap when no pair re-attacks', () => {
    const events: ReplayEvent[] = [makeBattleEvent(1, mkSpec(pid(1), pid(2)))];
    const cadence = computeReattackCadence(events);
    expect(cadence.pairsEngaged).toBe(1);
    expect(cadence.pairsReattacking).toBe(0);
    expect(cadence.meanGapTurns).toBe(0);
  });
});

const mkSpec = (attacker: PartyId, defender: PartyId): BattleSpec => ({
  attacker,
  defender,
  attackerHp: 100,
  defenderHp: 100,
  dmgToAttacker: 10,
  dmgToDefender: 10,
});

// ---------------------------------------------------------------------------
// computeUnitsLost
// ---------------------------------------------------------------------------

describe('computeUnitsLost', () => {
  it('sums casualties per faction across battle events', () => {
    const faction = (id: PartyId): Faction | undefined => {
      const s = String(id);
      if (s === 'p1') return 'ant';
      if (s === 'p2') return 'spider';
      if (s === 'p3') return 'neutral';
      return undefined;
    };
    const events: ReplayEvent[] = [
      makeBattleEvent(1, {
        ...mkSpec(pid(1), pid(2)),
        attackerCasualties: 1, // ant
        defenderCasualties: 3, // spider
      }),
      makeBattleEvent(2, {
        ...mkSpec(pid(3), pid(2)),
        attackerCasualties: 2, // neutral
        defenderCasualties: 1, // spider
      }),
    ];
    const lost = computeUnitsLost(events, faction);
    expect(lost.ant).toBe(1);
    expect(lost.spider).toBe(4);
    expect(lost.neutral).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeRecoveryUtilization (C-1 surface area)
// ---------------------------------------------------------------------------

describe('computeRecoveryUtilization', () => {
  it('aggregates home-heal-applied and spider-break-off events', () => {
    const events: ReplayEvent[] = [
      { kind: 'home-heal-applied', turn: 1, tick: 1, partyId: pid(1), amount: 6 },
      { kind: 'home-heal-applied', turn: 2, tick: 2, partyId: pid(1), amount: 3 },
      {
        kind: 'spider-break-off',
        turn: 3,
        tick: 3,
        partyId: pid(2),
        hpLossFraction: 0.4,
        opponentId: pid(1),
      },
      {
        kind: 'spider-break-off',
        turn: 5,
        tick: 5,
        partyId: pid(2),
        hpLossFraction: 0.6,
        opponentId: pid(1),
      },
      { kind: 'turn-start', turn: 6, tick: 6 },
    ];
    const r = computeRecoveryUtilization(events);
    expect(r.homeHealEvents).toBe(2);
    expect(r.homeHealHpTotal).toBe(9);
    expect(r.breakOffEvents).toBe(2);
    expect(r.meanBreakOffLossFraction).toBeCloseTo(0.5);
  });

  it('returns 0 means when no break-offs fired', () => {
    const r = computeRecoveryUtilization([]);
    expect(r.homeHealEvents).toBe(0);
    expect(r.breakOffEvents).toBe(0);
    expect(r.meanBreakOffLossFraction).toBe(0);
  });
});
