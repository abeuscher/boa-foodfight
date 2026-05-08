/**
 * Shared types for harness output. The batch runner writes these to
 * `summary.json`; critics read them.
 */

import type { Faction } from '../engine/types.ts';

export interface PerSeed {
  readonly seed: number;
  readonly winner: Faction | null;
  readonly turns: number;
  readonly antPostsAtEnd: number;
  readonly events: number;
  /**
   * Round 19 — true iff this scenario reached `maxTurns` and was
   * resolved into a winner via the score-based timeout victory
   * (mechanics memo §1.6). False for decisive wins (queen kill,
   * spider-web capture, field-force wipe).
   */
  readonly scoreResolved: boolean;
}

export interface Summary {
  readonly totalSeeds: number;
  readonly antWins: number;
  readonly spiderWins: number;
  readonly timeouts: number;
  /**
   * Round 19 — count of seeds where the engine awarded the win at
   * `maxTurns` via score. These are also counted in `antWins` /
   * `spiderWins` (per the new "timeouts get a winner" rule); the
   * separate counter lets postmortem distinguish "won by playing"
   * from "won by score at the buzzer."
   */
  readonly scoreResolvedWins: number;
  readonly scoreResolvedAntWins: number;
  readonly scoreResolvedSpiderWins: number;
  readonly antWinRate: number;
  readonly avgTurnsToVictory: number | null;
  readonly avgTurnsAtTimeout: number | null;
  readonly avgEventsPerRun: number;
  readonly perSeed: readonly PerSeed[];
}
