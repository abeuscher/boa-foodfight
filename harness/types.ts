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
}

export interface Summary {
  readonly totalSeeds: number;
  readonly antWins: number;
  readonly spiderWins: number;
  readonly timeouts: number;
  readonly antWinRate: number;
  readonly avgTurnsToVictory: number | null;
  readonly avgTurnsAtTimeout: number | null;
  readonly avgEventsPerRun: number;
  readonly perSeed: readonly PerSeed[];
}
