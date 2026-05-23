import { useEffect, useState } from 'react';

import type { BattleResult, GameState, UnitId, UnitTemplateId } from '../../../engine/types.ts';

interface Props {
  readonly result: BattleResult;
  readonly templates: GameState['unitTemplates'];
  /** 1-based position + total for the "Combat n of m this turn" strip. */
  readonly index: number;
  readonly total: number;
  readonly onContinue: () => void;
  readonly onSkipAll: () => void;
}

/** Wall-clock duration of one combat round (one engine sub-step = one beat). */
const BEAT_MS = 900;

const roleName = (templates: Props['templates'], id: UnitTemplateId): string =>
  templates.get(id)?.name ?? id;

/**
 * Combat panel (ui-battle-mode-spec) — play-by-play of one resolved
 * battle, driven entirely by the engine's self-contained `BattleResult`
 * (participant start-HP snapshots + per-round action stream + outcome).
 * Legibility-first: each round is one beat; running HP is the start
 * snapshot minus cumulative damage; downed units grey out in place.
 * Read-only — the engine resolves combat, the panel presents it.
 *
 * The cinematic stage (room surface / lighting) is design-gated (cube
 * memo §D); this is the structural focus surface. The per-battle
 * MODIFIER STACK (terrain / POST / card / plane / combat-modifier the
 * spec's matchup-context calls for) is NOT carried on `battle-resolved`
 * — it's an input to combat math, not surfaced in the result — so it's
 * a flagged forward dep, not invented here.
 */
export function CombatPanel({
  result,
  templates,
  index,
  total,
  onContinue,
  onSkipAll,
}: Props): JSX.Element {
  const lastBeat = result.rounds.length;
  const [beat, setBeat] = useState(0);
  const done = beat >= lastBeat;

  useEffect(() => {
    if (done) return undefined;
    const id = setTimeout(() => setBeat((b) => b + 1), BEAT_MS);
    return () => {
      clearTimeout(id);
    };
  }, [beat, done]);

  // Running HP = start snapshot − cumulative damage through `beat` rounds.
  const damage = new Map<UnitId, number>();
  for (let r = 0; r < beat && r < lastBeat; r++) {
    for (const a of result.rounds[r]!.actions) {
      damage.set(a.defenderId, (damage.get(a.defenderId) ?? 0) + a.damage);
    }
  }
  const hpOf = (unitId: UnitId, start: number): number =>
    Math.max(0, start - (damage.get(unitId) ?? 0));

  // Damage flashes for the round just applied (beat-1).
  const flashed = new Map<UnitId, number>();
  const attackers = new Set<UnitId>();
  if (beat > 0 && beat <= lastBeat) {
    for (const a of result.rounds[beat - 1]!.actions) {
      flashed.set(a.defenderId, (flashed.get(a.defenderId) ?? 0) + a.damage);
      attackers.add(a.attackerId);
    }
  }

  const side = (which: 'attacker' | 'defender'): JSX.Element => (
    <div className={`cb-side cb-${which}`}>
      {result.participants
        .filter((p) => p.side === which)
        .map((p) => {
          const hp = hpOf(p.unitId, p.hp);
          const pct = p.maxHp > 0 ? Math.round((hp / p.maxHp) * 100) : 0;
          const flash = flashed.get(p.unitId);
          const classes = ['cb-unit'];
          if (hp <= 0) classes.push('down');
          if (attackers.has(p.unitId)) classes.push('acting');
          if (p.isLeader) classes.push('leader');
          return (
            <div key={p.unitId} className={classes.join(' ')}>
              <span className="cb-u-role">
                {p.isLeader ? '★ ' : ''}
                {roleName(templates, p.templateId)}
              </span>
              <span className="cb-hpbar">
                <span className="cb-hpfill" style={{ width: `${String(pct)}%` }} />
              </span>
              <span className="cb-u-hp">
                {String(hp)}/{String(p.maxHp)}
              </span>
              {flash ? <span className="cb-dmg">-{String(flash)}</span> : null}
            </div>
          );
        })}
    </div>
  );

  const winnerLabel =
    result.winner === 'draw'
      ? `${String(result.attackerPartyId)} and ${String(result.defenderPartyId)} disengaged`
      : `${String(result.winner)} prevailed`;

  return (
    <div className="combat">
      <div className="cb-strip">
        Combat {String(index)} of {String(total)} this turn · {String(result.attackerPartyId)} vs{' '}
        {String(result.defenderPartyId)}
      </div>

      <div className="cb-stage">
        {side('attacker')}
        <div className="cb-vs">{done ? winnerLabel : 'VS'}</div>
        {side('defender')}
      </div>

      <div className="cb-foot">
        <div className="cb-context">
          {done ? (
            <span>
              {lastBeat === 0 ? 'Decided in the opening volley · ' : ''}
              Casualties — {String(result.attackerPartyId)}:{' '}
              {String(result.attackerCasualties.length)} · {String(result.defenderPartyId)}:{' '}
              {String(result.defenderCasualties.length)}
            </span>
          ) : (
            <span className="hint">
              Round {String(Math.min(beat + 1, lastBeat))} of {String(lastBeat)} · per-battle
              modifier stack not engine-surfaced (forward dep)
            </span>
          )}
        </div>
        <div className="cb-controls">
          {!done && <button onClick={() => setBeat(lastBeat)}>Skip this combat</button>}
          {total > 1 && <button onClick={onSkipAll}>Skip all this turn</button>}
          <button className="cb-continue" disabled={!done} onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
