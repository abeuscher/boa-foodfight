import { useEffect, useMemo, useState } from 'react';

import { summarizeBattle } from '../scenario/battleSummary.ts';

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

/**
 * Wall-clock duration between battle actions. One step = one attack.
 *
 * Chunk 18 (PM-directed) — switched from per-round (900 ms / beat) to
 * per-action (500 ms / step). A round in the engine is "every alive
 * unit on each side acts once," so a 6-unit-vs-6-unit round was firing
 * up to 12 HP drops in one 900 ms beat — too fast to track. Per-action
 * pacing pairs each prose line in the feed with one HP-bar tic. 500 ms
 * is the starting figure for PM iteration; the design brief (Chunk 17)
 * notes that the takeover surface should compose against this beat,
 * so future presets (Slow / Normal / Fast) live here.
 */
const STEP_MS = 500;

const roleName = (templates: Props['templates'], id: UnitTemplateId): string =>
  templates.get(id)?.name ?? id;

/**
 * Combat panel (ui-battle-mode-spec) — play-by-play of one resolved
 * battle, driven entirely by the engine's self-contained `BattleResult`
 * (participant start-HP snapshots + per-round action stream + outcome).
 * Legibility-first: each **action** is one step; running HP is the
 * start snapshot minus cumulative damage through the played steps;
 * downed units grey out in place. Read-only — the engine resolves
 * combat, the panel presents it.
 *
 * The cinematic stage (room surface / lighting) is design-gated (cube
 * memo §D); this is the structural focus surface. The per-battle
 * MODIFIER STACK is surfaced from `result.modifierStack` (PR #60) at
 * the bottom of the panel.
 */
export function CombatPanel({
  result,
  templates,
  index,
  total,
  onContinue,
  onSkipAll,
}: Props): JSX.Element {
  // Flatten rounds → actions once. Each step animates one action so
  // the HP bar tic is paired 1:1 with the prose line in the feed.
  const allActions = useMemo(() => {
    const flat: {
      readonly roundIndex: number;
      readonly attackerId: UnitId;
      readonly defenderId: UnitId;
      readonly damage: number;
    }[] = [];
    for (let r = 0; r < result.rounds.length; r++) {
      for (const a of result.rounds[r]!.actions) {
        flat.push({
          roundIndex: r,
          attackerId: a.attackerId,
          defenderId: a.defenderId,
          damage: a.damage,
        });
      }
    }
    return flat;
  }, [result]);

  const totalRounds = result.rounds.length;
  const lastStep = allActions.length;
  const [step, setStep] = useState(0);
  const done = step >= lastStep;

  useEffect(() => {
    if (done) return undefined;
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => {
      clearTimeout(id);
    };
  }, [step, done]);

  // Running HP = start snapshot − cumulative damage through `step` actions.
  const damage = new Map<UnitId, number>();
  for (let i = 0; i < step; i++) {
    const a = allActions[i]!;
    damage.set(a.defenderId, (damage.get(a.defenderId) ?? 0) + a.damage);
  }
  const hpOf = (unitId: UnitId, start: number): number =>
    Math.max(0, start - (damage.get(unitId) ?? 0));

  // Damage flash + attacker glow for the single action just applied.
  const flashed = new Map<UnitId, number>();
  const attackers = new Set<UnitId>();
  if (step > 0) {
    const a = allActions[step - 1]!;
    flashed.set(a.defenderId, a.damage);
    attackers.add(a.attackerId);
  }
  // Current round display advances when the playhead crosses into the
  // next round's first action.
  const currentRound = step > 0 ? Math.min(allActions[step - 1]!.roundIndex + 1, totalRounds) : 1;

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

      {(() => {
        const summary = summarizeBattle(result);
        if (!summary.modifierStack) return null;
        return (
          <div className="cb-mods">
            <div className="cb-mods-head">Modifier stack · {summary.modifierStack.plane}</div>
            <div className="cb-mods-sides">
              {(['attacker', 'defender'] as const).map((side) => {
                const s = summary.modifierStack![side];
                const rows = [...s.attackRows, ...s.defenseRows];
                return (
                  <div key={side} className="cb-mods-side">
                    <div className="cb-mods-side-head">{side}</div>
                    {rows.length === 0 ? (
                      <p className="cb-mods-empty">No active modifiers.</p>
                    ) : (
                      <ul className="cb-mods-rows">
                        {rows.map((r, i) => (
                          <li key={i} className={`cb-mod cb-mod-${r.axis}`}>
                            <span className="cb-mod-label">{r.label}</span>
                            <span className="cb-mod-value">
                              {r.kind === 'mult'
                                ? `×${r.value.toFixed(2)}`
                                : `${r.value >= 0 ? '+' : ''}${String(r.value)}`}{' '}
                              <em>{r.axis}</em>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="cb-foot">
        <div className="cb-context">
          {done ? (
            <span>
              {lastStep === 0 ? 'Decided in the opening volley · ' : ''}
              Casualties — {String(result.attackerPartyId)}:{' '}
              {String(result.attackerCasualties.length)} · {String(result.defenderPartyId)}:{' '}
              {String(result.defenderCasualties.length)}
            </span>
          ) : (
            <span className="hint">
              Round {String(currentRound)} of {String(totalRounds)} · action{' '}
              {String(Math.min(step + 1, lastStep))} of {String(lastStep)}
            </span>
          )}
        </div>
        <div className="cb-controls">
          {!done && <button onClick={() => setStep(lastStep)}>Skip this combat</button>}
          {total > 1 && <button onClick={onSkipAll}>Skip all this turn</button>}
          <button className="cb-continue" disabled={!done} onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
