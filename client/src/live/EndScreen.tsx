import { useEffect, useState } from 'react';

import type { EndStats } from './endStats.ts';
import type { ScenarioReward } from './reward.ts';
import { FactionEmblem } from './unitIcons.tsx';

interface Props {
  readonly stats: EndStats;
  /** Buttons awarded (victory only); null on defeat. */
  readonly reward: ScenarioReward | null;
  readonly continueLabel: string;
  readonly onContinue: () => void;
}

const REVEAL_MS = 350;

/**
 * End-of-scenario takeover (ui-end-of-scenario-spec): outcome label +
 * resolution path + a sequentially-revealed engine-surfaced debrief, with
 * a single Continue. The themed graphic half is design-gated (cube memo
 * §D) — a structural placeholder stands in. Continue is inactive until
 * the stats finish revealing; clicking the panel skips to the end.
 */
export function EndScreen({ stats, reward, continueLabel, onContinue }: Props): JSX.Element {
  const lines: { label: string; value: string }[] = [
    { label: 'POSTs held', value: String(stats.postsHeld) },
    { label: 'Spiders felled', value: String(stats.antKills) },
    { label: 'Ants lost', value: String(stats.spiderKills) },
    { label: 'Parties lost', value: String(stats.partiesLost) },
    { label: 'Turns elapsed', value: String(stats.turnsElapsed) },
  ];
  if (stats.score) {
    lines.push({
      label: 'Score (ant / spider)',
      value: `${String(stats.score.ant)} / ${String(stats.score.spider)}`,
    });
  }
  if (reward) {
    lines.push({
      label: 'Buttons earned',
      value: `+${String(reward.total)} (100 +${String(reward.speedBonus)} speed +${String(reward.intactBonus)} intact)`,
    });
  }

  const [revealed, setRevealed] = useState(0);
  const done = revealed >= lines.length;

  useEffect(() => {
    if (done) return undefined;
    const id = setTimeout(() => setRevealed((r) => r + 1), REVEAL_MS);
    return () => {
      clearTimeout(id);
    };
  }, [revealed, done]);

  const win = stats.outcome === 'Victory';

  return (
    <div className="endscreen">
      <div className={`end-graphic ${win ? 'win' : 'loss'}`} aria-hidden>
        {/* Chunk 40 — Lucide Bug stands in for the deferred scene art.
         * Tint comes from `.end-emblem-${winner}` (amber for ant,
         * dark-red for spider). The "Scene art deferred" caption stays
         * — the emblem is illustrative, not the final hero graphic. */}
        <FactionEmblem winner={win ? 'ant' : 'spider'} />
        <span className="end-note">Scene art deferred (cube memo §D)</span>
      </div>
      <div
        className="end-stats"
        onClick={() => {
          if (!done) setRevealed(lines.length);
        }}
      >
        <div className="end-scn">L1 — The Bathroom</div>
        <div className={`end-label ${win ? 'win' : 'loss'}`}>{stats.outcome}</div>
        <div className="end-res">{stats.resolution}</div>
        <ul className="end-list">
          {lines.map((l, i) => (
            <li key={l.label} className={i < revealed ? 'shown' : 'hidden'}>
              <span className="el-label">{l.label}</span>
              <span className="el-value">{l.value}</span>
            </li>
          ))}
        </ul>
        <button className="end-continue" disabled={!done} onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
