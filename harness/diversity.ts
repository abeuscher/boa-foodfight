/**
 * Route-diversity measurement. Runs the harness with each player AI in
 * `PLAYER_AIS` against the same enemy + scenario, then reports a
 * comparison table.
 *
 *   pnpm diversity [--seeds 1..100] [--max-turns 100] [--out out/diversity]
 *
 * Spec success criterion: "≥3 meaningfully different strategic
 * approaches should produce wins (≥40% win rate per variant)."
 *
 * Output: `out/diversity/summary.json` with per-AI win rates and a
 * console table; exits 0 if ≥3 variants reach the 40% threshold.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { PLAYER_AIS } from '../ai/index.ts';

import type { Summary } from './types.ts';

interface Args {
  readonly seedRange: string;
  readonly maxTurns: number;
  readonly outDir: string;
}

const parseArgs = (argv: readonly string[]): Args => {
  let seedRange = '1..100';
  let maxTurns = 100;
  let outDir = path.join(process.cwd(), 'out', 'diversity');
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--seeds' && val !== undefined) {
      seedRange = val;
      i += 1;
    } else if (flag === '--max-turns' && val !== undefined) {
      maxTurns = Number(val);
      i += 1;
    } else if (flag === '--out' && val !== undefined) {
      outDir = val;
      i += 1;
    }
  }
  return { seedRange, maxTurns, outDir };
};

const ROUTE_DIVERSITY_THRESHOLD = 0.4;
const ROUTE_DIVERSITY_MIN_VARIANTS = 3;

interface VariantResult {
  readonly name: string;
  readonly winRate: number;
  readonly antWins: number;
  readonly spiderWins: number;
  readonly timeouts: number;
  readonly avgTurnsToVictory: number | null;
  readonly avgEventsPerRun: number;
}

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });

  const variants = Object.keys(PLAYER_AIS);
  const results: VariantResult[] = [];

  for (const name of variants) {
    const variantDir = path.join(args.outDir, name);
    fs.mkdirSync(variantDir, { recursive: true });
    console.log(`measuring ${name}...`);
    execSync(
      `pnpm harness:run --seeds ${args.seedRange} --max-turns ${String(args.maxTurns)} --player ${name} --out ${variantDir}`,
      { stdio: 'pipe' },
    );
    const summary = JSON.parse(
      fs.readFileSync(path.join(variantDir, 'summary.json'), 'utf8'),
    ) as Summary;
    results.push({
      name,
      winRate: summary.antWinRate,
      antWins: summary.antWins,
      spiderWins: summary.spiderWins,
      timeouts: summary.timeouts,
      avgTurnsToVictory: summary.avgTurnsToVictory,
      avgEventsPerRun: summary.avgEventsPerRun,
    });
  }

  const passingVariants = results.filter((r) => r.winRate >= ROUTE_DIVERSITY_THRESHOLD);
  const passes = passingVariants.length >= ROUTE_DIVERSITY_MIN_VARIANTS;

  fs.writeFileSync(
    path.join(args.outDir, 'summary.json'),
    JSON.stringify(
      {
        threshold: ROUTE_DIVERSITY_THRESHOLD,
        minVariants: ROUTE_DIVERSITY_MIN_VARIANTS,
        passingCount: passingVariants.length,
        passes,
        results,
      },
      null,
      2,
    ),
  );

  // Console table.
  console.log('');
  console.log('player        win%   ant  spi  to    avg-turns-to-vic  avg-events  passes-40%');
  console.log('-'.repeat(85));
  for (const r of results) {
    const winPct = (r.winRate * 100).toFixed(1).padStart(5);
    const ant = String(r.antWins).padStart(3);
    const spi = String(r.spiderWins).padStart(3);
    const to = String(r.timeouts).padStart(3);
    const turns =
      r.avgTurnsToVictory !== null ? r.avgTurnsToVictory.toFixed(1).padStart(7) : '   n/a ';
    const events = r.avgEventsPerRun.toFixed(0).padStart(6);
    const pass = r.winRate >= ROUTE_DIVERSITY_THRESHOLD ? 'YES' : ' no';
    console.log(
      `${r.name.padEnd(13)} ${winPct}%  ${ant}  ${spi}  ${to}  ${turns}            ${events}      ${pass}`,
    );
  }
  console.log('');
  console.log(
    `route diversity: ${String(passingVariants.length)}/${String(variants.length)} variants ≥ ${(ROUTE_DIVERSITY_THRESHOLD * 100).toFixed(0)}% (need ≥${String(ROUTE_DIVERSITY_MIN_VARIANTS)})`,
  );
  console.log(passes ? 'PASS' : 'FAIL');
  process.exit(passes ? 0 : 1);
};

main();
