/**
 * AI policy registry. The harness CLI looks up policies by name from
 * `PLAYER_AIS`. The `baseline` entry is the locked tuning reference
 * per the spec; the others are variants used only by the route-
 * diversity measurement (Phase 4 success criterion).
 */

import { baselineTutorialPlayer } from './baseline-tutorial.ts';
import { baselinePlayer } from './baseline.ts';
import { divePlayer } from './dive.ts';
import { escortL2Player } from './escort-l2.ts';
import { flankPlayer } from './flank.ts';
import { jellyRushPlayer } from './jelly-rush.ts';
import { neutralPlayer } from './neutral.ts';
import { rushPlayer } from './rush.ts';
import { spiderL1 } from './spider-l1.ts';
import { spiderL2 } from './spider-l2.ts';
import { spiderTutorial } from './spider-tutorial.ts';
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
 * S0 campaign L1 plays the stripped `baseline-tutorial`; S1 (L2 / the
 * Pipe) plays `escort-l2`. Keeping these OUT of `PLAYER_AIS` is
 * load-bearing: `harness/diversity.ts` sweeps `Object.keys(PLAYER_AIS)`,
 * so adding a scenario player there would change the gate-29 diversity
 * output. `run-batch.ts` resolves a `--player` from `PLAYER_AIS` first,
 * then falls back to this map, so the stripped L1 is measurable at
 * scale without perturbing the locked L1 reference sweep.
 */
export const SCENARIO_PLAYER_AIS: Readonly<Record<string, AIPolicy>> = {
  'escort-l2': escortL2Player,
  'baseline-tutorial': baselineTutorialPlayer,
};

/**
 * Enemy AIs. `spider-l1` is the fixed gate-29 / diversity opponent
 * (run-batch's default `--enemy`); the others are scenario-specific and
 * only used when `--enemy` is passed explicitly, so adding keys here
 * does not affect the locked L1 reference run.
 */
export const ENEMY_AIS: Readonly<Record<string, AIPolicy>> = {
  'spider-l1': spiderL1,
  'spider-l2': spiderL2,
  'spider-tutorial': spiderTutorial,
};

export {
  baselinePlayer,
  baselineTutorialPlayer,
  divePlayer,
  escortL2Player,
  flankPlayer,
  jellyRushPlayer,
  neutralPlayer,
  rushPlayer,
  spiderL1,
  spiderL2,
  spiderTutorial,
  turtlePlayer,
};
export type { AIPolicy };
