/**
 * AI policy registry. The harness CLI looks up policies by name from
 * `PLAYER_AIS`. The `baseline` entry is the locked tuning reference
 * per the spec; the others are variants used only by the route-
 * diversity measurement (Phase 4 success criterion).
 */

import { baselineL10Player } from './baseline-l10.ts';
import { baselineL3Player } from './baseline-l3.ts';
import { baselineL4Player } from './baseline-l4.ts';
import { baselineL5Player } from './baseline-l5.ts';
import { baselineL6Player } from './baseline-l6.ts';
import { baselineL8Player } from './baseline-l8.ts';
import { baselineL9Player } from './baseline-l9.ts';
import { baselineTutorialPlayer } from './baseline-tutorial.ts';
import { baselineV2 } from './baseline-v2.ts';
import { baselinePlayer } from './baseline.ts';
import { divePlayer } from './dive.ts';
import { escortL2Player } from './escort-l2.ts';
import { flankPlayer } from './flank.ts';
import { jellyRushPlayer } from './jelly-rush.ts';
import { neutralPlayer } from './neutral.ts';
import { rushPlayer } from './rush.ts';
import { spiderL1V2 } from './spider-l1-v2.ts';
import { spiderL1 } from './spider-l1.ts';
import { spiderL10 } from './spider-l10.ts';
import { spiderL2 } from './spider-l2.ts';
import { spiderL3 } from './spider-l3.ts';
import { spiderL4 } from './spider-l4.ts';
import { spiderL5 } from './spider-l5.ts';
import { spiderL6 } from './spider-l6.ts';
import { spiderL8 } from './spider-l8.ts';
import { spiderL9 } from './spider-l9.ts';
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
 * scale without perturbing the locked L1 reference sweep. `baseline-l3`
 * (the L3 / Kitchen capture-post player) lives here for the same
 * reason: a scenario-specific player kept OUT of `PLAYER_AIS` so the
 * gate-29 diversity sweep stays byte-identical. `baseline-l4` (the L4 /
 * Hallway capture-post player), `baseline-l5` (the L5 / Bedroom
 * capture-post player), `baseline-l6` (the L6 / Stairs ERADICATE
 * hunter — a standalone hunt doctrine, NOT a capture-post chain-marcher)
 * and `baseline-l8` (the L8 / Attic RECRUIT-COUNT recruiter/racer — a
 * standalone recruit doctrine, also NOT a capture-post chain-marcher)
 * are registered here for the identical reason. `baseline-l9` (the L9 /
 * Basement capture-post chain-marcher → fuse-box, with the Sump-Pump as
 * a chain link whose capture drains the dynamic-hazard basin) is
 * registered here for the same load-bearing reason. `baseline-l10`
 * (the L10 / Garage capture-post finale — a multi-route chain-marcher:
 * five columns bound to four distinct Side-Door→Engine-Block routes via
 * the shared chain-march + the L4 `switchContest` opt-in + an L10-only
 * route-fork wrapper, NO shared default touched) is registered here for
 * the same load-bearing reason.
 */
export const SCENARIO_PLAYER_AIS: Readonly<Record<string, AIPolicy>> = {
  'escort-l2': escortL2Player,
  'baseline-tutorial': baselineTutorialPlayer,
  'baseline-l3': baselineL3Player,
  'baseline-l4': baselineL4Player,
  'baseline-l5': baselineL5Player,
  'baseline-l6': baselineL6Player,
  'baseline-l8': baselineL8Player,
  'baseline-l9': baselineL9Player,
  'baseline-l10': baselineL10Player,
  // Chunk 7a — opt-in L1 v2 policies that exercise post-Chunk-6 surface
  // (items, walls, opportunistic POSTs). Locked PLAYER_AIS / gate-29
  // diversity sweep is untouched; the playtest harness explicitly opts in.
  'baseline-v2': baselineV2,
};

/** L1-iteration Chunk 7a — opt-in spider variants. Same load-bearing
 * "OUT of PLAYER_AIS so gate-29 diversity is byte-identical" rule. */
export const SCENARIO_ENEMY_AIS: Readonly<Record<string, AIPolicy>> = {
  'spider-l1-v2': spiderL1V2,
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
  'spider-l3': spiderL3,
  'spider-l4': spiderL4,
  'spider-l5': spiderL5,
  'spider-l6': spiderL6,
  'spider-l8': spiderL8,
  'spider-l9': spiderL9,
  'spider-l10': spiderL10,
};

export {
  baselineL3Player,
  baselineL4Player,
  baselineL5Player,
  baselineL6Player,
  baselineL8Player,
  baselineL9Player,
  baselineL10Player,
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
  spiderL3,
  spiderL4,
  spiderL5,
  spiderL6,
  spiderL8,
  spiderL9,
  spiderL10,
  spiderTutorial,
  turtlePlayer,
};
export type { AIPolicy };
