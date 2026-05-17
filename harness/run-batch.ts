/**
 * Self-play batch runner.
 *
 *   pnpm harness:run --seeds 1..100 [--max-turns 100] [--out <dir>]
 *
 * For each seed: loads Level 1, instantiates baseline player + spider L1
 * AIs, runs the scenario to a winner or the turn cap, writes a
 * `replay-<seed>.jsonl` to the output dir, and aggregates a
 * `summary.json` with the win-rate breakdown.
 *
 * This is the artifact Phase 4 critics consume.
 */

import fs from 'node:fs';
import path from 'node:path';

import { ENEMY_AIS, neutralPlayer, PLAYER_AIS, SCENARIO_PLAYER_AIS } from '../ai/index.ts';
import { createFileSink, createTickClock } from '../engine/replay.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import { runScenario } from '../engine/turn.ts';
import type { PostId } from '../engine/types.ts';

import type { PerSeed, Summary } from './types.ts';

const parseSeeds = (arg: string): readonly number[] => {
  if (arg.includes('..')) {
    const parts = arg.split('..');
    const lo = Number(parts[0]);
    const hi = Number(parts[1]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) {
      throw new Error(`invalid seed range '${arg}'`);
    }
    const out: number[] = [];
    for (let s = lo; s <= hi; s++) out.push(s);
    return out;
  }
  return arg.split(',').map((s) => {
    const n = Number(s);
    if (!Number.isFinite(n)) throw new Error(`invalid seed '${s}'`);
    return n;
  });
};

interface Args {
  readonly seeds: readonly number[];
  readonly outDir: string;
  readonly dataDir: string;
  readonly maxTurns: number;
  readonly playerName: string;
  readonly enemyName: string;
}

const parseArgs = (argv: readonly string[]): Args => {
  let seedsArg = '1..100';
  let outDir = path.join(process.cwd(), 'out', 'runs', String(Date.now()));
  let dataDir = path.join(process.cwd(), 'data', 'level-1');
  let maxTurns = 100;
  let playerName = 'baseline';
  let enemyName = 'spider-l1';
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--seeds' && val !== undefined) {
      seedsArg = val;
      i += 1;
    } else if (flag === '--out' && val !== undefined) {
      outDir = val;
      i += 1;
    } else if (flag === '--data' && val !== undefined) {
      dataDir = val;
      i += 1;
    } else if (flag === '--max-turns' && val !== undefined) {
      maxTurns = Number(val);
      i += 1;
    } else if (flag === '--player' && val !== undefined) {
      playerName = val;
      i += 1;
    } else if (flag === '--enemy' && val !== undefined) {
      enemyName = val;
      i += 1;
    }
  }
  return { seeds: parseSeeds(seedsArg), outDir, dataDir, maxTurns, playerName, enemyName };
};

const POST_IDS: readonly PostId[] = [
  'storm-drain' as PostId,
  'soap-dish' as PostId,
  'towel-rack' as PostId,
  'wall-crack' as PostId,
  'spider-web' as PostId,
];

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  // Resolve `--player` from the L1 diversity map first, then the
  // scenario-specific map (escort-l2, baseline-tutorial). This lets the
  // stripped tutorial L1 be measured at scale (`--player
  // baseline-tutorial --data data/level-1-tutorial`) without adding it
  // to `PLAYER_AIS` (which `harness/diversity.ts` sweeps — keeping the
  // gate-29 reference run byte-identical).
  const player = PLAYER_AIS[args.playerName] ?? SCENARIO_PLAYER_AIS[args.playerName];
  const enemy = ENEMY_AIS[args.enemyName];
  if (!player) {
    console.error(
      `unknown --player '${args.playerName}'. Available: ${[
        ...Object.keys(PLAYER_AIS),
        ...Object.keys(SCENARIO_PLAYER_AIS),
      ].join(', ')}`,
    );
    process.exit(1);
  }
  if (!enemy) {
    console.error(
      `unknown --enemy '${args.enemyName}'. Available: ${Object.keys(ENEMY_AIS).join(', ')}`,
    );
    process.exit(1);
  }
  fs.mkdirSync(args.outDir, { recursive: true });

  const perSeed: PerSeed[] = [];
  let antWins = 0;
  let spiderWins = 0;
  let timeouts = 0;
  // Round 19 — count games resolved at max-turn via score
  // (mechanics memo §1.6). These are reported as ant/spider wins
  // (not timeouts), but tracked separately so we can see how often
  // the score path fires and which faction it favors.
  let scoreResolvedWins = 0;
  let scoreResolvedAntWins = 0;
  let scoreResolvedSpiderWins = 0;
  let totalVictoryTurns = 0;
  let totalTimeoutTurns = 0;
  let totalEvents = 0;

  const startedAt = Date.now();
  for (const seed of args.seeds) {
    const { state, data, neutralSpawnEvents, itemSpawnEvents } = loadScenario(args.dataDir, seed);
    const clock = createTickClock();
    const sink = createFileSink(path.join(args.outDir, `replay-${String(seed)}.jsonl`));
    const outcome = runScenario(state, data, createRng(seed), clock.next, {
      maxTurns: args.maxTurns,
      // Round 8: neutral policy runs after ant/spider so its orders
      // see the latest decided state. Determinism is preserved by the
      // per-policy rng fork inside `runScenario`.
      policies: [player, enemy, neutralPlayer],
      neutralSpawnEvents,
      itemSpawnEvents,
    });
    for (const event of outcome.events) sink.emit(event);
    sink.close();

    const winner = outcome.finalState.winner;
    let antPosts = 0;
    for (const id of POST_IDS) {
      const post = outcome.finalState.posts.get(id);
      if (post?.owner === 'ant') antPosts += 1;
    }
    // Round 19 — detect score-resolved wins by walking the events for
    // a `scenario-end` carrying `scoreBreakdown`. (Decisive wins emit
    // the same event without the field.) This lets the harness count
    // them as faction wins per the new spec while still tracking the
    // path for telemetry.
    let scoreResolved = false;
    for (const ev of outcome.events) {
      if (ev.kind === 'scenario-end' && ev.scoreBreakdown !== undefined) {
        scoreResolved = true;
        break;
      }
    }
    perSeed.push({
      seed,
      winner,
      turns: outcome.turnsPlayed,
      antPostsAtEnd: antPosts,
      events: outcome.events.length,
      scoreResolved,
    });
    totalEvents += outcome.events.length;
    if (winner === 'ant') {
      antWins += 1;
      // Score-resolved games end at max-turn, so their `turnsPlayed`
      // == maxTurns. Including them in the avg-turns-to-victory
      // metric accurately reflects "how long ant wins took on
      // average" — many of those wins came at the buzzer.
      totalVictoryTurns += outcome.turnsPlayed;
      if (scoreResolved) {
        scoreResolvedAntWins += 1;
        scoreResolvedWins += 1;
        totalTimeoutTurns += outcome.turnsPlayed;
      }
    } else if (winner === 'spider') {
      spiderWins += 1;
      totalVictoryTurns += outcome.turnsPlayed;
      if (scoreResolved) {
        scoreResolvedSpiderWins += 1;
        scoreResolvedWins += 1;
        totalTimeoutTurns += outcome.turnsPlayed;
      }
    } else {
      // With round-19 score-resolution, a null winner shouldn't
      // happen — the engine awards the timeout via score. Kept for
      // safety: a zero-policies harness call could in theory hit
      // this branch.
      timeouts += 1;
      totalTimeoutTurns += outcome.turnsPlayed;
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const decided = antWins + spiderWins;
  const summary: Summary = {
    totalSeeds: args.seeds.length,
    antWins,
    spiderWins,
    timeouts,
    scoreResolvedWins,
    scoreResolvedAntWins,
    scoreResolvedSpiderWins,
    antWinRate: antWins / args.seeds.length,
    avgTurnsToVictory: decided > 0 ? totalVictoryTurns / decided : null,
    avgTurnsAtTimeout:
      timeouts + scoreResolvedWins > 0 ? totalTimeoutTurns / (timeouts + scoreResolvedWins) : null,
    avgEventsPerRun: totalEvents / args.seeds.length,
    perSeed,
  };
  fs.writeFileSync(path.join(args.outDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(
    `Wrote ${String(args.seeds.length)} replays (player=${args.playerName}, enemy=${args.enemyName}) to ${args.outDir} in ${String(elapsedMs)} ms`,
  );
  console.log(
    `Outcomes: ant=${String(antWins)} spider=${String(spiderWins)} timeout=${String(timeouts)}`,
  );
  console.log(
    `Score-resolved wins: ${String(scoreResolvedWins)} (ant=${String(scoreResolvedAntWins)} spider=${String(scoreResolvedSpiderWins)})`,
  );
  console.log(`Ant win rate: ${(summary.antWinRate * 100).toFixed(1)}% (target 65–80%)`);
  if (summary.avgTurnsToVictory !== null) {
    console.log(`Avg turns to victory: ${summary.avgTurnsToVictory.toFixed(1)}`);
  }
  if (summary.avgTurnsAtTimeout !== null) {
    console.log(`Avg turns at timeout: ${summary.avgTurnsAtTimeout.toFixed(1)}`);
  }
  console.log(`Avg events/run: ${summary.avgEventsPerRun.toFixed(0)}`);
};

main();
