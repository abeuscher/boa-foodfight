/**
 * Metrics critic — deterministic numerical checks against a harness summary.
 *
 *   pnpm critic:metrics --in out/baseline-100 [--out critics/findings/metrics.json]
 *
 * Reads `summary.json` from a harness run directory and emits structured
 * findings. Pure script — no LLM.
 *
 * Rules checked:
 *   - win-rate-target: ant win rate must be in [0.65, 0.80]
 *   - decisive-outcomes: timeouts should be a small minority of runs
 *   - progress-stalemate: every run frozen at the same POST count
 */

import fs from 'node:fs';
import path from 'node:path';

import type { Summary } from '../harness/types.ts';

import { parseCriticArgs, summarizeFindings, writeFindings } from './io.ts';
import type { Finding } from './io.ts';

const TARGET_WIN_RATE_MIN = 0.65;
const TARGET_WIN_RATE_MAX = 0.8;
const TIMEOUT_RATIO_THRESHOLD = 0.2;

const main = (): void => {
  const args = parseCriticArgs(process.argv.slice(2), {
    inDir: 'out/baseline-100',
    outFile: 'critics/findings/metrics.json',
  });
  const summary = JSON.parse(
    fs.readFileSync(path.join(args.inDir, 'summary.json'), 'utf8'),
  ) as Summary;
  const findings: Finding[] = [];

  const winRate = summary.antWinRate;
  if (winRate < TARGET_WIN_RATE_MIN) {
    findings.push({
      rule: 'win-rate-target',
      severity: 'high',
      observation: `ant win rate ${(winRate * 100).toFixed(1)}% is below the ${(TARGET_WIN_RATE_MIN * 100).toFixed(0)}% floor`,
      suggested_action:
        'tune in this preferred order: enemy pattern (less defensive spider AI), initial circumstances (weaker web-guard composition or starting POST ownership), battlefield (terrain or POST placement), scenario goal (alternate win conditions)',
    });
  } else if (winRate > TARGET_WIN_RATE_MAX) {
    findings.push({
      rule: 'win-rate-target',
      severity: 'high',
      observation: `ant win rate ${(winRate * 100).toFixed(1)}% is above the ${(TARGET_WIN_RATE_MAX * 100).toFixed(0)}% ceiling`,
      suggested_action:
        'tune in this preferred order: enemy pattern (more aggressive spider AI), initial circumstances (stronger web defenders or scout pressure), battlefield (more obstacles between storm-drain and web), scenario goal',
    });
  }

  const timeoutRatio = summary.timeouts / summary.totalSeeds;
  if (timeoutRatio > TIMEOUT_RATIO_THRESHOLD) {
    findings.push({
      rule: 'decisive-outcomes',
      severity: timeoutRatio > 0.5 ? 'high' : 'medium',
      observation: `${(timeoutRatio * 100).toFixed(0)}% of runs timed out (${String(summary.timeouts)}/${String(summary.totalSeeds)})`,
      suggested_action:
        "most timeouts mean neither side can finish. Increase max-turns first to confirm; if timeouts persist, the issue is structural (e.g., one side cannot reach the other side's win condition)",
    });
  }

  const postCounts = summary.perSeed.reduce<Record<number, number>>((acc, r) => {
    acc[r.antPostsAtEnd] = (acc[r.antPostsAtEnd] ?? 0) + 1;
    return acc;
  }, {});
  const dominantPostCount = Object.entries(postCounts).reduce(
    (best, [k, v]) => (v > best.count ? { posts: Number(k), count: v } : best),
    { posts: 0, count: 0 },
  );
  if (dominantPostCount.count === summary.totalSeeds && dominantPostCount.posts < 5) {
    findings.push({
      rule: 'progress-stalemate',
      severity: 'high',
      observation: `every run ended with ants holding ${String(dominantPostCount.posts)}/5 POSTs — the final POST is unreachable or undefeatable`,
      suggested_action:
        'inspect which POST is never captured. If it is spider-web, the issue is the final assault: weaken the spider stronghold, or add a route ants can use to bring more force to bear',
    });
  }

  findings.push({
    rule: 'measurement',
    severity: 'low',
    observation: `${String(summary.totalSeeds)} seeds: ant=${String(summary.antWins)} spider=${String(summary.spiderWins)} timeout=${String(summary.timeouts)}; win rate ${(winRate * 100).toFixed(1)}%; ${summary.avgTurnsToVictory !== null ? `avg turns to victory ${summary.avgTurnsToVictory.toFixed(1)}` : 'no decisive outcomes'}`,
  });

  writeFindings(args.outFile, args.inDir, findings);
  summarizeFindings('metrics critic', args.outFile, findings);
  for (const f of findings) console.log(`  [${f.severity}] ${f.rule}: ${f.observation}`);
};

main();
