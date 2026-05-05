/**
 * Auto-tuner: reverse-engineers spider stats so the locked baseline ant AI
 * wins in the spec's [65%, 80%] band against the spider L1 enemy.
 *
 *   pnpm tune [--target-min 0.65 --target-max 0.80 --max-iters 10]
 *
 * Strategy: 1D bisection on a single "difficulty" knob α ∈ [0, 1].
 * For each axis, value(α) = round(lo + α * (hi - lo)). α=0 places every
 * axis at its ant-favoring lo bound (expected ~100% wins); α=1 places
 * every axis at the current hi (expected ~0% wins under the baseline AI).
 * The harness is the objective function; we bisect α to land win rate
 * in [targetMin, targetMax].
 *
 * Why this beats coordinate descent: the cross-axis interactions (queen
 * armor + queen HP + queen attack jointly determine survivability) make
 * single-axis bisection conservative — each axis individually doesn't
 * cross the in-band threshold even at its lo extreme. Moving all axes
 * together captures the joint effect.
 *
 * Output:
 *   - mutates `data/level-1/units.json` to the final tuned values
 *   - writes `out/tune/report.json` with the iteration trace
 *   - prints a summary
 *
 * Constraints: only spider stats are touched. Locked: ai/baseline.ts,
 * the 5 spec-locked POSTs, ant roster, engine semantics.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { Summary } from './types.ts';

interface AxisSpec {
  readonly id: string;
  readonly templateId: string;
  readonly statKey: string;
  /** Inclusive integer lower bound. The "easier for ants" end. */
  readonly lo: number;
  /** Inclusive integer upper bound. The "harder for ants" end. */
  readonly hi: number;
}

interface TuneOptions {
  readonly targetMin: number;
  readonly targetMax: number;
  readonly maxIters: number;
  readonly seedRange: string;
  readonly maxTurns: number;
  readonly dryRun: boolean;
}

/**
 * Principal axes. Bounds bracket the regime observed in manual tuning:
 * the `hi` end gives ~0% ant wins, the `lo` end gives ~100%.
 */
const AXES: readonly AxisSpec[] = [
  { id: 'spider-queen.armor', templateId: 'spider-queen', statKey: 'armor', lo: 2, hi: 6 },
  { id: 'spider-elite.armor', templateId: 'spider-elite', statKey: 'armor', lo: 1, hi: 3 },
  { id: 'spider-queen.hp', templateId: 'spider-queen', statKey: 'hp', lo: 30, hi: 80 },
  { id: 'spider-elite.hp', templateId: 'spider-elite', statKey: 'hp', lo: 12, hi: 22 },
  { id: 'spider-queen.attack', templateId: 'spider-queen', statKey: 'attack', lo: 6, hi: 15 },
  { id: 'spider-elite.attack', templateId: 'spider-elite', statKey: 'attack', lo: 4, hi: 7 },
];

const DATA_DIR = path.join(process.cwd(), 'data', 'level-1');
const OUT_DIR = path.join(process.cwd(), 'out', 'tune');

const parseArgs = (argv: readonly string[]): TuneOptions => {
  let targetMin = 0.65;
  let targetMax = 0.8;
  let maxIters = 10;
  let seedRange = '1..100';
  let maxTurns = 100;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--target-min' && val !== undefined) {
      targetMin = Number(val);
      i += 1;
    } else if (flag === '--target-max' && val !== undefined) {
      targetMax = Number(val);
      i += 1;
    } else if (flag === '--max-iters' && val !== undefined) {
      maxIters = Number(val);
      i += 1;
    } else if (flag === '--seeds' && val !== undefined) {
      seedRange = val;
      i += 1;
    } else if (flag === '--max-turns' && val !== undefined) {
      maxTurns = Number(val);
      i += 1;
    } else if (flag === '--dry-run') {
      dryRun = true;
    }
  }
  return { targetMin, targetMax, maxIters, seedRange, maxTurns, dryRun };
};

interface UnitsFile {
  readonly version: number;
  readonly templates: { id: string; baseStats: Record<string, number> }[];
}

const readUnits = (): UnitsFile =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'units.json'), 'utf8')) as UnitsFile;

const writeUnits = (units: UnitsFile): void => {
  fs.writeFileSync(path.join(DATA_DIR, 'units.json'), JSON.stringify(units, null, 2) + '\n');
};

const valueAt = (axis: AxisSpec, alpha: number): number => {
  const span = axis.hi - axis.lo;
  return Math.round(axis.lo + alpha * span);
};

/** Apply alpha to every axis in one write. */
const applyAlpha = (alpha: number): Record<string, number> => {
  const units = readUnits();
  const applied: Record<string, number> = {};
  for (const axis of AXES) {
    const tmpl = units.templates.find((t) => t.id === axis.templateId);
    if (!tmpl) throw new Error(`template ${axis.templateId} not in units.json`);
    const v = valueAt(axis, alpha);
    tmpl.baseStats[axis.statKey] = v;
    applied[axis.id] = v;
  }
  writeUnits(units);
  return applied;
};

const snapshotStats = (): Record<string, number> => {
  const units = readUnits();
  const snap: Record<string, number> = {};
  for (const axis of AXES) {
    const tmpl = units.templates.find((t) => t.id === axis.templateId);
    if (!tmpl) throw new Error(`template ${axis.templateId} not in units.json`);
    const v = tmpl.baseStats[axis.statKey];
    if (v === undefined) throw new Error(`stat ${axis.statKey} missing on ${axis.templateId}`);
    snap[axis.id] = v;
  }
  return snap;
};

const restoreStats = (snap: Record<string, number>): void => {
  const units = readUnits();
  for (const axis of AXES) {
    const tmpl = units.templates.find((t) => t.id === axis.templateId);
    if (!tmpl) throw new Error(`template ${axis.templateId} not in units.json`);
    const v = snap[axis.id];
    if (v === undefined) throw new Error(`snapshot missing ${axis.id}`);
    tmpl.baseStats[axis.statKey] = v;
  }
  writeUnits(units);
};

let evalCounter = 0;
const measure = (opts: TuneOptions): number => {
  evalCounter += 1;
  const evalDir = path.join(OUT_DIR, `eval-${String(evalCounter).padStart(3, '0')}`);
  fs.mkdirSync(evalDir, { recursive: true });
  execSync(
    `pnpm harness:run --seeds ${opts.seedRange} --max-turns ${String(opts.maxTurns)} --out ${evalDir}`,
    { stdio: 'pipe' },
  );
  const summary = JSON.parse(
    fs.readFileSync(path.join(evalDir, 'summary.json'), 'utf8'),
  ) as Summary;
  return summary.antWinRate;
};

const inBand = (rate: number, opts: TuneOptions): boolean =>
  rate >= opts.targetMin && rate <= opts.targetMax;

interface IterTrace {
  readonly alpha: number;
  readonly winRate: number;
  readonly applied: Record<string, number>;
}

interface TuneReport {
  readonly target: { min: number; max: number };
  readonly trace: readonly IterTrace[];
  readonly finalAlpha: number;
  readonly finalWinRate: number;
  readonly inBand: boolean;
  readonly totalEvals: number;
  readonly snapshot: Record<string, number>;
  readonly applied: Record<string, number>;
}

const main = (): void => {
  const opts = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const snapshot = snapshotStats();
  console.log(
    `tune: target win rate ${(opts.targetMin * 100).toFixed(0)}-${(opts.targetMax * 100).toFixed(0)}% over ${String(opts.maxIters)} eval budget`,
  );

  const trace: IterTrace[] = [];
  const probe = (alpha: number): IterTrace => {
    const applied = applyAlpha(alpha);
    const rate = measure(opts);
    const t: IterTrace = { alpha, winRate: rate, applied };
    trace.push(t);
    console.log(`  alpha=${alpha.toFixed(3)} win rate ${(rate * 100).toFixed(1)}%`);
    return t;
  };

  // Bracket: alpha=0 (easiest for ants) and alpha=1 (current/hardest).
  console.log('\nbracket:');
  const easy = probe(0);
  if (inBand(easy.winRate, opts)) {
    console.log('alpha=0 already in band — minimal config sufficient');
    finalize(opts, snapshot, trace, 0, easy.winRate);
    return;
  }
  if (easy.winRate < opts.targetMin) {
    console.log(
      `even alpha=0 gives ${(easy.winRate * 100).toFixed(1)}% < ${(opts.targetMin * 100).toFixed(0)}%; widen axis lo bounds or fix engine first`,
    );
    finalize(opts, snapshot, trace, 0, easy.winRate);
    process.exit(1);
  }

  const hard = probe(1);
  if (inBand(hard.winRate, opts)) {
    console.log('alpha=1 (original) already in band — no tuning needed');
    finalize(opts, snapshot, trace, 1, hard.winRate);
    return;
  }
  if (hard.winRate > opts.targetMax) {
    console.log(
      `alpha=1 gives ${(hard.winRate * 100).toFixed(1)}% > ${(opts.targetMax * 100).toFixed(0)}%; widen axis hi bounds`,
    );
    finalize(opts, snapshot, trace, 1, hard.winRate);
    process.exit(1);
  }

  // Bisect on alpha. Monotone assumption: rate is non-increasing in alpha.
  let aLo = 0;
  let aHi = 1;
  let bestAlpha = 0;
  let bestRate = easy.winRate;
  let bestDist = inBand(easy.winRate, opts)
    ? 0
    : Math.abs(easy.winRate - (opts.targetMin + opts.targetMax) / 2);

  console.log('\nbisecting alpha:');
  for (let i = 0; i < opts.maxIters - 2; i++) {
    if (aHi - aLo < 1e-3) break;
    const mid = (aLo + aHi) / 2;
    const t = probe(mid);
    const dist = inBand(t.winRate, opts)
      ? 0
      : Math.abs(t.winRate - (opts.targetMin + opts.targetMax) / 2);
    if (dist < bestDist) {
      bestDist = dist;
      bestAlpha = mid;
      bestRate = t.winRate;
    }
    if (inBand(t.winRate, opts)) {
      bestAlpha = mid;
      bestRate = t.winRate;
      break;
    }
    if (t.winRate > opts.targetMax) {
      aLo = mid;
    } else {
      aHi = mid;
    }
  }

  finalize(opts, snapshot, trace, bestAlpha, bestRate);
};

const finalize = (
  opts: TuneOptions,
  snapshot: Record<string, number>,
  trace: readonly IterTrace[],
  alpha: number,
  rate: number,
): void => {
  const applied = applyAlpha(alpha);
  const report: TuneReport = {
    target: { min: opts.targetMin, max: opts.targetMax },
    trace,
    finalAlpha: alpha,
    finalWinRate: rate,
    inBand: inBand(rate, opts),
    totalEvals: evalCounter,
    snapshot,
    applied,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n--- tune report ---');
  for (const axis of AXES) {
    const before = snapshot[axis.id];
    const after = applied[axis.id];
    const tag = before === after ? ' (unchanged)' : '';
    console.log(`  ${axis.id}: ${String(before)} -> ${String(after)}${tag}`);
  }
  console.log(`alpha: ${alpha.toFixed(3)}`);
  console.log(
    `final win rate: ${(rate * 100).toFixed(1)}% — ${report.inBand ? 'IN BAND' : 'OUT OF BAND'}`,
  );
  console.log(`total harness evals: ${String(evalCounter)}`);

  if (opts.dryRun) {
    console.log('--dry-run: restoring original stats');
    restoreStats(snapshot);
  }

  process.exit(report.inBand ? 0 : 1);
};

main();
