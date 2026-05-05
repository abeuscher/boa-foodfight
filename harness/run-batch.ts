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

import { baselinePlayer } from '../ai/baseline.ts';
import { spiderL1 } from '../ai/spider-l1.ts';
import { createFileSink, createTickClock } from '../engine/replay.ts';
import { createRng } from '../engine/rng.ts';
import { loadScenario } from '../engine/state.ts';
import { runScenario } from '../engine/turn.ts';
import type { Faction, PostId } from '../engine/types.ts';

interface PerSeed {
  readonly seed: number;
  readonly winner: Faction | null;
  readonly turns: number;
  readonly antPostsAtEnd: number;
  readonly events: number;
}

interface Summary {
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
}

const parseArgs = (argv: readonly string[]): Args => {
  let seedsArg = '1..100';
  let outDir = path.join(process.cwd(), 'out', 'runs', String(Date.now()));
  let dataDir = path.join(process.cwd(), 'data', 'level-1');
  let maxTurns = 100;
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
    }
  }
  return { seeds: parseSeeds(seedsArg), outDir, dataDir, maxTurns };
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
  fs.mkdirSync(args.outDir, { recursive: true });

  const perSeed: PerSeed[] = [];
  let antWins = 0;
  let spiderWins = 0;
  let timeouts = 0;
  let totalVictoryTurns = 0;
  let totalTimeoutTurns = 0;
  let totalEvents = 0;

  const startedAt = Date.now();
  for (const seed of args.seeds) {
    const { state, data } = loadScenario(args.dataDir, seed);
    const clock = createTickClock();
    const sink = createFileSink(path.join(args.outDir, `replay-${String(seed)}.jsonl`));
    const outcome = runScenario(state, data, createRng(seed), clock.next, {
      maxTurns: args.maxTurns,
      policies: [baselinePlayer, spiderL1],
    });
    for (const event of outcome.events) sink.emit(event);
    sink.close();

    const winner = outcome.finalState.winner;
    let antPosts = 0;
    for (const id of POST_IDS) {
      const post = outcome.finalState.posts.get(id);
      if (post?.owner === 'ant') antPosts += 1;
    }
    perSeed.push({
      seed,
      winner,
      turns: outcome.turnsPlayed,
      antPostsAtEnd: antPosts,
      events: outcome.events.length,
    });
    totalEvents += outcome.events.length;
    if (winner === 'ant') {
      antWins += 1;
      totalVictoryTurns += outcome.turnsPlayed;
    } else if (winner === 'spider') {
      spiderWins += 1;
      totalVictoryTurns += outcome.turnsPlayed;
    } else {
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
    antWinRate: antWins / args.seeds.length,
    avgTurnsToVictory: decided > 0 ? totalVictoryTurns / decided : null,
    avgTurnsAtTimeout: timeouts > 0 ? totalTimeoutTurns / timeouts : null,
    avgEventsPerRun: totalEvents / args.seeds.length,
    perSeed,
  };
  fs.writeFileSync(path.join(args.outDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(
    `Wrote ${String(args.seeds.length)} replays to ${args.outDir} in ${String(elapsedMs)} ms`,
  );
  console.log(
    `Outcomes: ant=${String(antWins)} spider=${String(spiderWins)} timeout=${String(timeouts)}`,
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
