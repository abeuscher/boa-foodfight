/**
 * AI policy registry. The harness CLI looks up policies by name from
 * `PLAYER_AIS`. The `baseline` entry is the locked tuning reference
 * per the spec; the others are variants used only by the route-
 * diversity measurement (Phase 4 success criterion).
 */

import { baselinePlayer } from './baseline.ts';
import { flankPlayer } from './flank.ts';
import { rushPlayer } from './rush.ts';
import { spiderL1 } from './spider-l1.ts';
import { turtlePlayer } from './turtle.ts';
import type { AIPolicy } from './types.ts';

export const PLAYER_AIS: Readonly<Record<string, AIPolicy>> = {
  baseline: baselinePlayer,
  rush: rushPlayer,
  turtle: turtlePlayer,
  flank: flankPlayer,
};

export const ENEMY_AIS: Readonly<Record<string, AIPolicy>> = {
  'spider-l1': spiderL1,
};

export { baselinePlayer, flankPlayer, rushPlayer, spiderL1, turtlePlayer };
export type { AIPolicy };
