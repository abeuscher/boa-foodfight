/**
 * Round-by-round combat readout, surfaced under the in-scenario notif
 * strip when playback auto-pauses on a `battle-resolved` event. Reads
 * fields the engine already attaches to the event (rounds + start-of-
 * battle participants); the `summarizeBattle` helper folds them into
 * a render-ready shape with running HP.
 */

import type { BattleResult } from '../../../engine/types.ts';

import { summarizeBattle } from './battleSummary.ts';

interface Props {
  readonly result: BattleResult;
}

export function BattlePanel({ result }: Props): JSX.Element {
  const summary = summarizeBattle(result);
  const rounds = new Map<number, typeof summary.actions>();
  for (const a of summary.actions) {
    const bucket = rounds.get(a.roundIndex) ?? [];
    bucket.push(a);
    rounds.set(a.roundIndex, bucket);
  }
  const roundIndices = [...rounds.keys()].sort((a, b) => a - b);

  return (
    <div className="battle-panel" role="region" aria-label="Battle play-by-play">
      <div className="bp-head">
        <span>
          {summary.attackerPartyId} → {summary.defenderPartyId}
        </span>
        <span className="bp-winner">{summary.winnerLabel}</span>
        {summary.retreatedTo && (
          <span className="bp-retreat">Retreated to {summary.retreatedTo}</span>
        )}
      </div>
      {roundIndices.length === 0 ? (
        <p className="bp-empty">No rounds — battle resolved before melee.</p>
      ) : (
        <ol className="bp-rounds">
          {roundIndices.map((idx) => {
            const lines = rounds.get(idx) ?? [];
            return (
              <li key={idx} className="bp-round">
                <span className="bp-round-label">Round {idx + 1}</span>
                <ul className="bp-actions">
                  {lines.map((a, i) => (
                    <li key={i} className={`bp-action bp-${a.attackerSide}`}>
                      <span className="bp-attacker">{a.attackerLabel}</span>
                      <span className="bp-arrow">→</span>
                      <span className="bp-defender">{a.defenderLabel}</span>
                      <span className="bp-damage">−{a.damage}</span>
                      <span className="bp-hp">
                        ({a.defenderHpAfter}/{a.defenderMaxHp})
                      </span>
                      {a.killed && <span className="bp-killed">✕</span>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
      <div className="bp-roster">
        {(['attacker', 'defender'] as const).map((side) => (
          <ul key={side} className={`bp-side bp-side-${side}`}>
            <li className="bp-side-label">{side}</li>
            {summary.participants
              .filter((p) => p.side === side)
              .map((p) => (
                <li key={String(p.unitId)} className={`bp-unit ${p.endHp <= 0 ? 'dead' : ''}`}>
                  <span className="bp-unit-label">
                    {p.label}
                    {p.isLeader ? ' ★' : ''}
                  </span>
                  <span className="bp-unit-hp">
                    {p.startHp} → {p.endHp}/{p.maxHp}
                  </span>
                </li>
              ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
