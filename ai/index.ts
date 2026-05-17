/**
 * AI policy registry. The harness CLI looks up policies by name from
 * `PLAYER_AIS`. The `baseline` entry is the locked tuning reference
 * per the spec; the others are variants used only by the route-
 * diversity measurement (Phase 4 success criterion).
 */

import { baselinePlayer } from './baseline.ts';
import { divePlayer } from './dive.ts';
import { escortL2Player } from './escort-l2.ts';
import { flankPlayer } from './flank.ts';
import { jellyRushPlayer } from './jelly-rush.ts';
import { neutralPlayer } from './neutral.ts';
import { rushPlayer } from './rush.ts';
import { spiderL1 } from './spider-l1.ts';
import { spiderL2 } from './spider-l2.ts';
import { turtlePlayer } from './turtle.ts';
import type { AIPolicy } from './types.ts';

/**
 * Variant player AIs swept by the route-diversity / coevo gate (all
 * L1-shaped). `escortL2Player` is intentionally NOT here: it is a
 * scenario-specific player (L2 only), so keeping it out of this map
 * leaves the L1 gate's diversity sweep byte-identical.
 */
export const PLAYER_AIS: Readonly<Record<string, AIPolicy>> = {
  baseline: baselinePlayer,
  rush: rushPlayer,
  turtle: turtlePlayer,
  flank: flankPlayer,
  'jelly-rush': jellyRushPlayer,
  dive: divePlayer,
};

/**
 * Scenario-specific player AIs the world-loop selects by scenario index
 * (separate from the L1 diversity sweep so the coevo gate is unaffected).
 * S1 (L2 / the Pipe) plays `escort-l2`.
 */
export const SCENARIO_PLAYER_AIS: Readonly<Record<string, AIPolicy>> = {
  'escort-l2': escortL2Player,
};

export const ENEMY_AIS: Readonly<Record<string, AIPolicy>> = {
  'spider-l1': spiderL1,
  'spider-l2': spiderL2,
};

export {
  baselinePlayer,
  divePlayer,
  escortL2Player,
  flankPlayer,
  jellyRushPlayer,
  neutralPlayer,
  rushPlayer,
  spiderL1,
  spiderL2,
  turtlePlayer,
};
export type { AIPolicy };
