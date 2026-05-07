/**
 * Build script for the static (Netlify-deployable) viewer.
 *
 *   pnpm build:viewer [--seeds 1..10] [--max-turns 100] [--out viewer/dist]
 *
 * Produces:
 *   viewer/dist/index.html      - copied from viewer/index.html
 *   viewer/dist/main.js         - copied from viewer/main.js
 *   viewer/dist/style.css       - copied from viewer/style.css
 *   viewer/dist/replays/<run>/replay-<seed>.jsonl
 *   viewer/dist/replays/manifest.json
 *
 * The manifest lists every run + its replays + a human-friendly label,
 * so the static viewer can populate its dropdowns without any API.
 *
 * For each variant in `ai/index.ts::PLAYER_AIS`, the build runs the
 * harness over a small seed range (default 1..10) and bundles the
 * resulting replay JSONLs.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { readReplayOutcome, sortReplaysBySeed } from '../harness/replay-utils.ts';
import type { ReplayOutcome } from '../harness/replay-utils.ts';

interface Args {
  readonly seedRange: string;
  readonly maxTurns: number;
  readonly outDir: string;
}

const parseArgs = (argv: readonly string[]): Args => {
  const a: { seedRange: string; maxTurns: number; outDir: string } = {
    seedRange: '1..10',
    maxTurns: 100,
    outDir: path.join(process.cwd(), 'viewer', 'dist'),
  };
  const flags: Record<string, (v: string) => void> = {
    '--seeds': (v) => (a.seedRange = v),
    '--max-turns': (v) => (a.maxTurns = Number(v)),
    '--out': (v) => (a.outDir = v),
  };
  for (let i = 0; i < argv.length - 1; i++) {
    const handler = flags[argv[i] ?? ''];
    if (handler) {
      handler(argv[i + 1] ?? '');
      i += 1;
    }
  }
  return a;
};

interface Summary {
  readonly antWinRate: number;
  readonly antWins: number;
  readonly spiderWins: number;
  readonly timeouts: number;
  readonly avgTurnsToVictory: number | null;
}

interface ManifestReplay {
  readonly name: string;
  readonly outcome: ReplayOutcome;
}

interface ManifestRun {
  readonly name: string;
  readonly label: string;
  readonly winRate: number;
  readonly antWins: number;
  readonly spiderWins: number;
  readonly timeouts: number;
  readonly avgTurnsToVictory: number | null;
  readonly replays: readonly ManifestReplay[];
}

const VARIANT_LABELS: Readonly<Record<string, string>> = {
  baseline: 'baseline (locked reference, soap-dish staging)',
  rush: 'rush (skip staging, b-line for the web)',
  turtle: 'turtle (vanguards capture floor; mages wait for queen ult)',
  flank: 'flank (corner-flank routes; jelly pre-buff turn 0)',
  'jelly-rush': 'jelly-rush (queen-guard supplies field parties with jelly each turn)',
  dive: 'dive (pathfinders mid-board ceiling entry at 5,5)',
};

const VARIANTS = Object.keys(VARIANT_LABELS);

const VIEWER_SRC = path.join(process.cwd(), 'viewer');
const STATIC_FILES = ['index.html', 'main.js', 'style.css'];

const ensureDir = (dir: string): void => {
  fs.mkdirSync(dir, { recursive: true });
};

const copyStaticFiles = (outDir: string): void => {
  for (const f of STATIC_FILES) {
    fs.copyFileSync(path.join(VIEWER_SRC, f), path.join(outDir, f));
  }
};

const runHarness = (
  variant: string,
  seedRange: string,
  maxTurns: number,
  runOutDir: string,
): void => {
  ensureDir(runOutDir);
  // Use stdio: 'pipe' to keep output quiet; harness prints a summary
  // line we don't need here.
  execSync(
    `pnpm harness:run --seeds ${seedRange} --max-turns ${String(maxTurns)} --player ${variant} --out ${runOutDir}`,
    { stdio: 'pipe' },
  );
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  console.log(`build:viewer → ${args.outDir}`);

  // Clean + recreate output directory.
  if (fs.existsSync(args.outDir)) {
    fs.rmSync(args.outDir, { recursive: true });
  }
  ensureDir(args.outDir);
  ensureDir(path.join(args.outDir, 'replays'));

  // Copy static assets.
  copyStaticFiles(args.outDir);
  console.log(`  copied static (${STATIC_FILES.join(', ')})`);

  // Run harness for each variant; copy replays into dist.
  const runs: ManifestRun[] = [];
  for (const variant of VARIANTS) {
    const runDir = path.join(args.outDir, 'replays', variant);
    ensureDir(runDir);
    console.log(`  running harness for ${variant} (seeds ${args.seedRange})...`);
    runHarness(variant, args.seedRange, args.maxTurns, runDir);

    const summaryPath = path.join(runDir, 'summary.json');
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as Summary;
    const replayNames = sortReplaysBySeed(
      fs.readdirSync(runDir).filter((f) => f.startsWith('replay-') && f.endsWith('.jsonl')),
    );
    const replays: ManifestReplay[] = replayNames.map((name) => ({
      name,
      outcome: readReplayOutcome(path.join(runDir, name)),
    }));
    runs.push({
      name: variant,
      label: `${VARIANT_LABELS[variant] ?? variant} — ${(summary.antWinRate * 100).toFixed(0)}% wins`,
      winRate: summary.antWinRate,
      antWins: summary.antWins,
      spiderWins: summary.spiderWins,
      timeouts: summary.timeouts,
      avgTurnsToVictory: summary.avgTurnsToVictory,
      replays,
    });
  }

  // Write manifest.
  const manifest = {
    builtAt: new Date().toISOString(),
    seedRange: args.seedRange,
    maxTurns: args.maxTurns,
    runs,
  };
  fs.writeFileSync(
    path.join(args.outDir, 'replays', 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`  wrote manifest with ${String(runs.length)} runs`);
  for (const r of runs) {
    console.log(
      `    ${r.name.padEnd(10)} ${(r.winRate * 100).toFixed(0).padStart(3)}% wins, ${String(r.replays.length).padStart(2)} replays`,
    );
  }

  const totalSize = STATIC_FILES.reduce(
    (acc, f) => acc + fs.statSync(path.join(args.outDir, f)).size,
    0,
  );
  console.log(`done (static ${(totalSize / 1024).toFixed(1)} KB + replays)`);
};

main();
