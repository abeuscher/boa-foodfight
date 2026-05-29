/**
 * Pure helper that turns one `battle-resolved` event's `BattleResult`
 * into the row-by-row data the in-scenario battle panel renders.
 *
 * The engine already attaches start-of-battle `participants` (HP snapshots)
 * and a round-ordered action list with per-hit damage; the panel just
 * needs running HP per unit so a reader can scrub a battle in their head.
 * No engine round-trip, no template lookups — everything is on the event.
 */

import type { BattleResult, UnitId } from '../../../engine/types.ts';

export interface BattleActionLine {
  readonly roundIndex: number;
  readonly attackerLabel: string;
  readonly defenderLabel: string;
  readonly attackerSide: 'attacker' | 'defender';
  readonly damage: number;
  readonly killed: boolean;
  /** Defender HP AFTER this action (clamped to 0). */
  readonly defenderHpAfter: number;
  readonly defenderMaxHp: number;
}

export interface BattleParticipantSummary {
  readonly unitId: UnitId;
  readonly label: string;
  readonly side: 'attacker' | 'defender';
  readonly isLeader: boolean;
  readonly startHp: number;
  readonly endHp: number;
  readonly maxHp: number;
}

export interface BattleSummary {
  readonly attackerPartyId: string;
  readonly defenderPartyId: string;
  readonly winnerLabel: string;
  readonly retreatedTo: string | null;
  readonly actions: readonly BattleActionLine[];
  readonly participants: readonly BattleParticipantSummary[];
}

/** Display name from a templateId — `spider-elite` → `Spider elite`. */
const labelFromTemplate = (templateId: string): string => {
  const spaced = templateId.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export const summarizeBattle = (result: BattleResult): BattleSummary => {
  const byUnit = new Map<
    UnitId,
    {
      readonly templateId: string;
      readonly side: 'attacker' | 'defender';
      readonly isLeader: boolean;
      readonly startHp: number;
      hp: number;
      readonly maxHp: number;
    }
  >();
  for (const p of result.participants) {
    byUnit.set(p.unitId, {
      templateId: p.templateId,
      side: p.side,
      isLeader: p.isLeader,
      startHp: p.hp,
      hp: p.hp,
      maxHp: p.maxHp,
    });
  }

  const actions: BattleActionLine[] = [];
  for (const round of result.rounds) {
    for (const a of round.actions) {
      const attacker = byUnit.get(a.attackerId);
      const defender = byUnit.get(a.defenderId);
      const attackerLabel = attacker
        ? labelFromTemplate(attacker.templateId)
        : String(a.attackerId);
      const defenderLabel = defender
        ? labelFromTemplate(defender.templateId)
        : String(a.defenderId);
      if (defender) defender.hp = Math.max(0, defender.hp - a.damage);
      actions.push({
        roundIndex: round.index,
        attackerLabel,
        defenderLabel,
        attackerSide: attacker?.side ?? 'attacker',
        damage: a.damage,
        killed: a.killed,
        defenderHpAfter: defender?.hp ?? 0,
        defenderMaxHp: defender?.maxHp ?? 0,
      });
    }
  }

  const participants: BattleParticipantSummary[] = result.participants.map((p) => {
    const tracked = byUnit.get(p.unitId);
    return {
      unitId: p.unitId,
      label: labelFromTemplate(p.templateId),
      side: p.side,
      isLeader: p.isLeader,
      startHp: p.hp,
      endHp: tracked?.hp ?? p.hp,
      maxHp: p.maxHp,
    };
  });

  const winnerLabel =
    result.winner === 'draw'
      ? 'Draw'
      : result.winner === result.attackerPartyId
        ? `${String(result.attackerPartyId)} (attacker) won`
        : `${String(result.defenderPartyId)} (defender) won`;
  const retreatedTo =
    result.retreatTo === null
      ? null
      : `${result.retreatTo.plane} (${String(result.retreatTo.x)}, ${String(result.retreatTo.y)})`;

  return {
    attackerPartyId: String(result.attackerPartyId),
    defenderPartyId: String(result.defenderPartyId),
    winnerLabel,
    retreatedTo,
    actions,
    participants,
  };
};
