/**
 * Phase B (B5) — world-loop runner.
 *
 *   pnpm world-loop [--campaign <id>] [--seed <n>] [--resume]
 *                   [--out <dir>] [--data <dir>]
 *
 * Drives a 2-scenario campaign that exercises the full Phase-B loop:
 *
 *   1. Start a new campaign (or `--resume` from the latest save).
 *   2. Run scenario 0 (L1) via the existing scenario runner.
 *   3. Extract WorldState (B2), apply level-ups (B3), auto-save (B6).
 *   4. Optionally recruit via the shop smoke-test if gold allows.
 *   5. Run scenario 1 (a STUB copy of L1, scenarioIndex=1) with the
 *      injected carried roster (B4).
 *   6. Extract + save again.
 *   7. Print a summary: roster size before/after, gold carried, total
 *      XP gained, units leveled, units promoted.
 *
 * The scenario engine is wrapped, never modified. Scenario 1 reuses the
 * L1 data dir as the milestone stub (a real L2 is a Phase-D deliverable).
 *
 * Determinism: every world op flows through the campaign `rngSeed` via
 * the existing seeded `createRng`. Re-running with `--resume` loads the
 * save and continues; the scenario seeds are derived deterministically
 * from the campaign seed + scenario index so a resumed run reproduces
 * the same outcomes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ENEMY_AIS, neutralPlayer, PLAYER_AIS } from '../ai/index.ts';
import { createFileSink, createTickClock } from '../engine/replay.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import { runScenario } from '../engine/turn.ts';
import type { Faction, GameState, PartyId, ReplayEvent } from '../engine/types.ts';
import { extractGold, extractWorldRoster } from '../engine/world-extract.ts';
import type { LeveledUnitSummary } from '../engine/world-inject.ts';
import { injectWorldRoster, scaffoldFromState } from '../engine/world-inject.ts';
import { applyRosterLevelUps } from '../engine/world-levelup.ts';
import { findLatestSave, loadWorldStateFile, saveWorldState } from '../engine/world-save.ts';
import { applyShopPurchase, MOUSE_MERC_COST, MOUSE_MERC_TEMPLATE } from '../engine/world-shop.ts';
import type { WorldRoster, WorldState } from '../engine/world-state.ts';

export interface Args {
  readonly campaignId: string;
  readonly seed: number;
  readonly resume: boolean;
  readonly outRoot: string;
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): Args => {
  let campaignId = 'campaign-1';
  let seed = 1;
  let resume = false;
  let outRoot = path.join(process.cwd(), 'out', 'world-loop');
  let dataDir = path.join(process.cwd(), 'data', 'level-1');
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--campaign' && val !== undefined) {
      campaignId = val;
      i += 1;
    } else if (flag === '--seed' && val !== undefined) {
      seed = Number(val);
      i += 1;
    } else if (flag === '--resume') {
      resume = true;
    } else if (flag === '--out' && val !== undefined) {
      outRoot = val;
      i += 1;
    } else if (flag === '--data' && val !== undefined) {
      dataDir = val;
      i += 1;
    }
  }
  return { campaignId, seed, resume, outRoot, dataDir };
};

/** Per-scenario seed derived deterministically from the campaign seed. */
const scenarioSeed = (campaignSeed: number, scenarioIndex: number): number =>
  createRng(campaignSeed)
    .fork(`scenario-${String(scenarioIndex)}`)
    .int(2_147_483_647);

interface ScenarioRunResult {
  readonly finalState: GameState;
  readonly winner: Faction | null;
  readonly turnsPlayed: number;
  /** L2-4 — the scenario's win-condition kind, surfaced for the
   * world-loop summary so the L1 (capture) → L2 (escort) arc is
   * legible at a glance. */
  readonly victoryKind: string;
}

/**
 * Per-scenario wiring. The campaign is L1 (capture-the-web) followed
 * by a REAL L2 (the Pipe — escort Aunt Ant). S0 uses the level-1 data
 * dir + spider-l1; S1 uses level-2 + spider-l2 and preserves the
 * scenario-provided `escort-column` (Aunt Ant) through the carried-
 * roster inject.
 */
interface ScenarioConfig {
  readonly dataDir: string;
  readonly enemyAi: string;
  /** Ant party ids placed by THIS scenario's roster that must survive
   * the carried-roster inject verbatim (the L2 Aunt Ant party). */
  readonly preserveScenarioPartyIds: ReadonlySet<PartyId>;
}

const L2_ESCORT_PARTY = 'escort-column' as PartyId;

const scenarioConfig = (args: Args, scenarioIndex: number): ScenarioConfig => {
  if (scenarioIndex === 0) {
    return {
      dataDir: args.dataDir,
      enemyAi: 'spider-l1',
      preserveScenarioPartyIds: new Set(),
    };
  }
  // S1 = real L2 (the Pipe). Resolve data/level-2 relative to the
  // configured L1 data dir so a custom --data root still finds L2.
  return {
    dataDir: path.join(path.dirname(args.dataDir), 'level-2'),
    enemyAi: 'spider-l2',
    preserveScenarioPartyIds: new Set([L2_ESCORT_PARTY]),
  };
};

/**
 * Run one scenario. `injectRoster` (when provided) replaces the static
 * ant parties with the carried campaign roster before the run; the
 * scenario's `preserveScenarioPartyIds` (the L2 Aunt Ant party) are
 * kept verbatim from scenario data so the campaign roster and the
 * scenario-provided escortee compose.
 */
const runOneScenario = (
  args: Args,
  scenarioIndex: number,
  injectRoster: WorldRoster | undefined,
): ScenarioRunResult => {
  const cfg = scenarioConfig(args, scenarioIndex);
  const seed = scenarioSeed(args.seed, scenarioIndex);
  const loaded = loadScenario(cfg.dataDir, seed);
  let state = loaded.state;
  const victoryKind = state.victoryCondition?.kind ?? 'capture-post';
  // Phase-B follow-up: leveled units placed by the inject pass. Empty
  // for the static (non-injected) scenario 0 and for any campaign
  // roster with no level-2+ unit — the summary event is then skipped
  // entirely so non-campaign / pre-leveling replays stay clean.
  let leveledUnits: readonly LeveledUnitSummary[] = [];
  if (injectRoster) {
    const scaffold = scaffoldFromState(state);
    const injected = injectWorldRoster(state, injectRoster, scaffold, {
      preserveScenarioPartyIds: cfg.preserveScenarioPartyIds,
    });
    state = injected.state;
    leveledUnits = injected.report.leveledUnits;
  }
  const player = PLAYER_AIS.baseline;
  const enemy = ENEMY_AIS[cfg.enemyAi];
  if (!player || !enemy) throw new Error('world-loop: missing baseline/spider AI');

  const replayDir = path.join(args.outRoot, args.campaignId);
  fs.mkdirSync(replayDir, { recursive: true });
  const clock = createTickClock();
  const sink = createFileSink(
    path.join(replayDir, `replay-scenario-${String(scenarioIndex)}.jsonl`),
  );
  const outcome = runScenario(state, loaded.data, createRng(seed), clock.next, {
    maxTurns: 100,
    policies: [player, enemy, neutralPlayer],
    neutralSpawnEvents: loaded.neutralSpawnEvents,
    itemSpawnEvents: loaded.itemSpawnEvents,
  });
  // Phase-B follow-up: emit a one-time `roster-levels-summary` right
  // after `scenario-start` (same turn 0) so the viewer / critics can
  // attribute the campaign power swing to leveling. Skipped entirely
  // when no unit is leveled (keeps non-campaign replays byte-identical
  // to the pre-folding stream). The event is world-loop telemetry the
  // engine never reads back, so it reuses the scenario-start tick to
  // sit immediately after it in stream order without perturbing the
  // engine's tick sequence.
  for (const ev of outcome.events) {
    sink.emit(ev);
    if (ev.kind === 'scenario-start' && leveledUnits.length > 0) {
      const summary: ReplayEvent = {
        kind: 'roster-levels-summary',
        turn: 0,
        tick: ev.tick,
        units: leveledUnits.map((u) => ({
          unitId: u.unitId,
          level: u.level,
          levelBonus: u.levelBonus,
        })),
      };
      sink.emit(summary);
    }
  }
  sink.close();
  return {
    finalState: outcome.finalState,
    winner: outcome.finalState.winner,
    turnsPlayed: outcome.turnsPlayed,
    victoryKind,
  };
};

const rosterSize = (roster: WorldRoster): number => roster.units.length;

const totalXp = (roster: WorldRoster): number => roster.units.reduce((acc, u) => acc + u.xp, 0);

const promotedCount = (roster: WorldRoster): number =>
  roster.units.filter((u) => u.promoted).length;

/** Build a post-scenario `WorldState` (extract → level-up → wrap). */
const buildPostScenarioState = (
  args: Args,
  scenarioIndex: number,
  result: ScenarioRunResult,
): { state: WorldState; unitsLeveled: number; totalLevelsGained: number } => {
  const roster = extractWorldRoster({
    finalState: result.finalState,
    winner: result.winner,
  });
  const leveled = applyRosterLevelUps(roster, result.finalState.unitTemplates);
  return {
    state: {
      campaignId: args.campaignId,
      scenarioIndex,
      roster: leveled.roster,
      gold: extractGold(result.finalState),
      cardsOwned: [],
      rngSeed: args.seed,
      savedAt: new Date().toISOString(),
    },
    unitsLeveled: leveled.unitsLeveled,
    totalLevelsGained: leveled.totalLevelsGained,
  };
};

export interface WorldLoopSummary {
  readonly campaignId: string;
  readonly seed: number;
  readonly resumed: boolean;
  readonly scenario0: { winner: Faction | null; turnsPlayed: number; victoryKind: string };
  readonly scenario1: { winner: Faction | null; turnsPlayed: number; victoryKind: string };
  readonly rosterBefore: number;
  readonly rosterAfter: number;
  readonly goldBefore: number;
  readonly goldAfter: number;
  readonly xpBefore: number;
  readonly xpAfter: number;
  readonly unitsLeveledThisBoundary: number;
  readonly levelsGainedThisBoundary: number;
  readonly promotedBefore: number;
  readonly promotedAfter: number;
  readonly shopApplied: boolean;
  readonly savesDir: string;
  readonly postS0: WorldState;
  readonly postS1: WorldState;
}

/**
 * Run the full Phase-B 2-scenario world loop. Pure orchestration over
 * the wrapped scenario engine; returns a structured summary (the CLI
 * and the integration test both consume this — no logic duplication).
 */
export const runWorldLoop = (args: Args): WorldLoopSummary => {
  const latest = args.resume ? findLatestSave(args.campaignId, args.outRoot) : undefined;
  const scenario0Result = runOneScenario(args, 0, undefined);
  let postS0: WorldState;
  let resumed = false;
  if (latest) {
    postS0 = loadWorldStateFile(latest.file);
    resumed = true;
  } else {
    postS0 = buildPostScenarioState(args, 0, scenario0Result).state;
    saveWorldState(postS0, args.outRoot);
  }

  const rosterBefore = rosterSize(postS0.roster);
  const goldBefore = postS0.gold;
  const xpBefore = totalXp(postS0.roster);
  const promotedBefore = promotedCount(postS0.roster);

  // Shop smoke-test: recruit one mercenary if the campaign can afford it.
  const shop = applyShopPurchase(postS0, {
    kind: 'recruit',
    templateId: MOUSE_MERC_TEMPLATE,
    cost: MOUSE_MERC_COST,
  });

  // Scenario 1 — real L2 (the Pipe, escort Aunt Ant) with the carried
  // roster injected. The L2-provided escort-column (Aunt Ant + her
  // L2 guards) is preserved verbatim; every other ant party is
  // scaffold-rebuilt from the carried L1 roster, so the campaign
  // veterans guard a fresh Aunt Ant through the pipe.
  const scenario1Result = runOneScenario(args, 1, shop.state.roster);
  const built1 = buildPostScenarioState(args, 1, scenario1Result);
  saveWorldState(built1.state, args.outRoot);

  return {
    campaignId: args.campaignId,
    seed: args.seed,
    resumed,
    scenario0: {
      winner: scenario0Result.winner,
      turnsPlayed: scenario0Result.turnsPlayed,
      victoryKind: scenario0Result.victoryKind,
    },
    scenario1: {
      winner: scenario1Result.winner,
      turnsPlayed: scenario1Result.turnsPlayed,
      victoryKind: scenario1Result.victoryKind,
    },
    rosterBefore,
    rosterAfter: rosterSize(built1.state.roster),
    goldBefore,
    goldAfter: built1.state.gold,
    xpBefore,
    xpAfter: totalXp(built1.state.roster),
    unitsLeveledThisBoundary: built1.unitsLeveled,
    levelsGainedThisBoundary: built1.totalLevelsGained,
    promotedBefore,
    promotedAfter: promotedCount(built1.state.roster),
    shopApplied: shop.applied,
    savesDir: path.join(args.outRoot, args.campaignId),
    postS0,
    postS1: built1.state,
  };
};

const printSummary = (s: WorldLoopSummary): void => {
  console.log('');
  console.log('==================== WORLD-LOOP SUMMARY ====================');
  console.log(`Campaign:        ${s.campaignId}${s.resumed ? ' (resumed)' : ''}`);
  console.log(`Campaign seed:   ${String(s.seed)}`);
  console.log(
    `Scenario 0 (L1): win-condition=${s.scenario0.victoryKind} winner=${String(
      s.scenario0.winner,
    )} turns=${String(s.scenario0.turnsPlayed)}`,
  );
  console.log(
    `Scenario 1 (L2): win-condition=${s.scenario1.victoryKind} winner=${String(
      s.scenario1.winner,
    )} turns=${String(s.scenario1.turnsPlayed)}`,
  );
  console.log(
    `Roster size:     ${String(s.rosterBefore)} (post-S0) -> ${String(s.rosterAfter)} (post-S1)`,
  );
  console.log(
    `Gold carried:    ${String(s.goldBefore)} (post-S0) -> ${String(s.goldAfter)} (post-S1)`,
  );
  console.log(
    `Total XP:        ${String(s.xpBefore)} -> ${String(s.xpAfter)} (+${String(
      s.xpAfter - s.xpBefore,
    )})`,
  );
  console.log(
    `Units leveled:   ${String(s.unitsLeveledThisBoundary)} (this boundary), +${String(
      s.levelsGainedThisBoundary,
    )} levels total`,
  );
  console.log(
    `Units promoted:  ${String(s.promotedBefore)} (post-S0) -> ${String(
      s.promotedAfter,
    )} (post-S1)`,
  );
  console.log(`Shop recruit:    ${s.shopApplied ? 'applied' : 'skipped (insufficient gold)'}`);
  console.log(`Saves written:   ${s.savesDir}`);
  console.log('============================================================');
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  const summary = runWorldLoop(args);
  printSummary(summary);
};

// Only run as a CLI when invoked directly (not when imported by the
// integration test, which calls `runWorldLoop` itself).
const invokedPath = process.argv[1];
if (invokedPath !== undefined && fileURLToPath(import.meta.url) === path.resolve(invokedPath)) {
  main();
}
