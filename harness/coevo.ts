/**
 * Coevolution-loop orchestrator CLI.
 *
 * Subcommands:
 *
 *   pnpm coevo snapshot <round>
 *     Save current state of all mutable files into
 *     out/coevo/round-<N>/snapshot/.
 *
 *   pnpm coevo apply <round> <envelope.json> [<envelope2.json>]
 *     Apply one or two designer envelopes (firepower or strategy).
 *     Validates schema, routes to the right applier, prints decisions.
 *
 *   pnpm coevo restore <round>
 *     Restore mutable files from out/coevo/round-<N>/snapshot/.
 *     Used after a failed gate.
 *
 *   pnpm coevo gate <round>
 *     Run typecheck + tests + diversity. Compute ant baseline win
 *     rate (against current spider AI) and the variant win rates.
 *     Print whether the balance gate (band [55,65]) passes. Write
 *     out/coevo/round-<N>/gate.json. Exit code 0 iff gate passes.
 *
 *   pnpm coevo report <round>
 *     Bundle round summary: applied/rejected proposals, gate
 *     verdict, links to replays. Writes
 *     out/coevo/round-<N>/report.json.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { applyFirepowerEnvelope, applyStrategyEnvelope } from './coevo-apply.ts';
import { type DesignerEnvelope, designerEnvelopeSchema } from './coevo-types.ts';

const REPO_ROOT = process.cwd();

const MUTABLE_DATA_FILES = [
  'data/level-1/units.json',
  'data/level-1/abilities.json',
  'data/level-1/roster-ants.json',
  'data/level-1/roster-spiders.json',
];

const MUTABLE_AI_DIR = 'ai';
// Files snapshot/restore should NOT cover. Empty set: the orchestrator
// must be able to roll back any file designers or their scratch may
// touch. Files locked from designer proposals are enforced separately
// in coevo-apply.ts (STRATEGY_LOCKED_PATHS).
const SNAPSHOT_AI_SKIP = new Set<string>();

const BALANCE_BAND_MIN = 0.55;
const BALANCE_BAND_MAX = 0.65;

const repoPath = (rel: string): string => path.join(REPO_ROOT, rel);

const ensureDir = (rel: string): void => {
  fs.mkdirSync(repoPath(rel), { recursive: true });
};

const roundDir = (round: number): string => `out/coevo/round-${String(round)}`;

// ---------------------------------------------------------------------------
// snapshot / restore
// ---------------------------------------------------------------------------

const snapshotMutableAi = (snapshotDir: string): void => {
  const aiSnapshotDir = path.join(snapshotDir, 'ai');
  fs.mkdirSync(repoPath(aiSnapshotDir), { recursive: true });
  for (const f of fs.readdirSync(repoPath(MUTABLE_AI_DIR))) {
    if (SNAPSHOT_AI_SKIP.has(f)) continue;
    if (f.endsWith('.test.ts')) continue;
    if (!f.endsWith('.ts')) continue;
    fs.copyFileSync(repoPath(path.join(MUTABLE_AI_DIR, f)), repoPath(path.join(aiSnapshotDir, f)));
  }
};

const snapshot = (round: number): void => {
  const dir = roundDir(round);
  const snapshotPath = path.join(dir, 'snapshot');
  ensureDir(path.join(snapshotPath, 'data', 'level-1'));
  for (const f of MUTABLE_DATA_FILES) {
    fs.copyFileSync(repoPath(f), repoPath(path.join(snapshotPath, f)));
  }
  snapshotMutableAi(snapshotPath);
  console.log(`snapshot: round ${String(round)} -> ${snapshotPath}`);
};

const restore = (round: number): void => {
  const dir = roundDir(round);
  const snapshotPath = path.join(dir, 'snapshot');
  for (const f of MUTABLE_DATA_FILES) {
    fs.copyFileSync(repoPath(path.join(snapshotPath, f)), repoPath(f));
  }
  // Restore AI: delete current non-locked .ts files in ai/, then copy from snapshot.
  for (const f of fs.readdirSync(repoPath(MUTABLE_AI_DIR))) {
    if (SNAPSHOT_AI_SKIP.has(f)) continue;
    if (f.endsWith('.test.ts')) continue;
    if (!f.endsWith('.ts')) continue;
    fs.unlinkSync(repoPath(path.join(MUTABLE_AI_DIR, f)));
  }
  const aiSnapshotDir = path.join(snapshotPath, 'ai');
  if (fs.existsSync(repoPath(aiSnapshotDir))) {
    for (const f of fs.readdirSync(repoPath(aiSnapshotDir))) {
      fs.copyFileSync(
        repoPath(path.join(aiSnapshotDir, f)),
        repoPath(path.join(MUTABLE_AI_DIR, f)),
      );
    }
  }
  console.log(`restore: round ${String(round)} restored from ${snapshotPath}`);
};

// ---------------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------------

const loadEnvelope = (filePath: string): DesignerEnvelope => {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  return designerEnvelopeSchema.parse(raw);
};

const apply = (round: number, envelopePaths: readonly string[]): void => {
  const dir = roundDir(round);
  ensureDir(dir);
  const decisions: {
    designer: string;
    applied: number;
    rejected: number;
    detail: unknown;
  }[] = [];
  for (const p of envelopePaths) {
    const envelope = loadEnvelope(p);
    const role = envelope.designer;
    let result;
    if (role.endsWith('-firepower')) {
      result = applyFirepowerEnvelope(envelope);
    } else {
      result = applyStrategyEnvelope(envelope);
    }
    const summary = {
      designer: role,
      applied: result.applied.length,
      rejected: result.rejected.length,
      detail: {
        applied: result.applied.map((d) => ({ kind: d.proposal.kind, reason: d.reason })),
        rejected: result.rejected.map((d) => ({ kind: d.proposal.kind, reason: d.reason })),
      },
    };
    decisions.push(summary);
    console.log(
      `apply ${role}: ${String(summary.applied)} applied / ${String(summary.rejected)} rejected`,
    );
    for (const d of result.rejected) {
      console.log(`  rejected ${d.proposal.kind}: ${d.reason}`);
    }
  }
  fs.writeFileSync(
    repoPath(path.join(dir, 'apply.json')),
    `${JSON.stringify(decisions, null, 2)}\n`,
    'utf8',
  );
};

// ---------------------------------------------------------------------------
// gate
// ---------------------------------------------------------------------------

interface DiversitySummary {
  totalSeeds: number;
  antWins: number;
  spiderWins: number;
  timeouts: number;
  antWinRate: number;
  avgTurnsToVictory: number;
  avgEventsPerRun: number;
}

const runStep = (label: string, cmd: string): { ok: boolean; output: string } => {
  console.log(`gate: ${label}...`);
  try {
    const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, output: out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${err.stdout ?? ''}\n${err.stderr ?? ''}\n${err.message}` };
  }
};

const gate = (round: number): void => {
  const dir = roundDir(round);
  ensureDir(dir);

  const tc = runStep('typecheck', 'pnpm typecheck');
  if (!tc.ok) {
    fs.writeFileSync(
      repoPath(path.join(dir, 'gate.json')),
      `${JSON.stringify({ pass: false, stage: 'typecheck', output: tc.output }, null, 2)}\n`,
      'utf8',
    );
    console.log('gate: FAIL (typecheck)');
    process.exit(1);
  }

  const tests = runStep('tests', 'pnpm test');
  if (!tests.ok) {
    fs.writeFileSync(
      repoPath(path.join(dir, 'gate.json')),
      `${JSON.stringify({ pass: false, stage: 'tests', output: tests.output }, null, 2)}\n`,
      'utf8',
    );
    console.log('gate: FAIL (tests)');
    process.exit(1);
  }

  const diversity = runStep('diversity', 'pnpm diversity');
  if (!diversity.ok) {
    fs.writeFileSync(
      repoPath(path.join(dir, 'gate.json')),
      `${JSON.stringify({ pass: false, stage: 'diversity', output: diversity.output }, null, 2)}\n`,
      'utf8',
    );
    console.log('gate: FAIL (diversity script)');
    process.exit(1);
  }

  // Read per-variant summaries.
  const variants: { variant: string; summary: DiversitySummary }[] = [];
  for (const variant of ['baseline', 'rush', 'turtle', 'flank', 'jelly-rush', 'dive']) {
    const summary = JSON.parse(
      fs.readFileSync(repoPath(`out/diversity/${variant}/summary.json`), 'utf8'),
    ) as DiversitySummary;
    variants.push({ variant, summary });
  }
  // Snapshot the diversity output into the round dir for posterity.
  fs.cpSync(repoPath('out/diversity'), repoPath(path.join(dir, 'diversity')), { recursive: true });

  const baseline = variants.find((v) => v.variant === 'baseline');
  if (!baseline) throw new Error('no baseline variant in diversity');
  const baselineWinRate = baseline.summary.antWinRate;
  const inBand = baselineWinRate >= BALANCE_BAND_MIN && baselineWinRate <= BALANCE_BAND_MAX;

  // Diversity gate: ≥3 variants over 40%.
  const passingVariants = variants.filter((v) => v.summary.antWinRate >= 0.4).length;
  const diversityOk = passingVariants >= 3;

  // Run the (cheap, programmatic) interest critic so the orchestrator
  // gets a watchability signal alongside win-rate. Critic exits
  // non-zero only on hard error; ignore its exit code.
  const interestRun = runStep('interest critic', 'pnpm critic:interest');
  let interest: { overall?: { composite: number }; summaries?: unknown } = {};
  try {
    interest = JSON.parse(
      fs.readFileSync(repoPath('out/critic-interest/report.json'), 'utf8'),
    ) as typeof interest;
  } catch {
    // First-run race or harness blip; leave empty.
  }
  void interestRun;

  const verdict = {
    pass: inBand && diversityOk,
    band: { min: BALANCE_BAND_MIN, max: BALANCE_BAND_MAX },
    baselineWinRate,
    inBand,
    diversityOk,
    variants: variants.map((v) => ({ variant: v.variant, winRate: v.summary.antWinRate })),
    interest,
  };
  fs.writeFileSync(
    repoPath(path.join(dir, 'gate.json')),
    `${JSON.stringify(verdict, null, 2)}\n`,
    'utf8',
  );
  console.log(
    `gate: baseline ${(baselineWinRate * 100).toFixed(1)}% inBand=${String(inBand)} diversity=${String(diversityOk)} interest=${String(interest.overall?.composite ?? '?')} -> ${verdict.pass ? 'PASS' : 'FAIL'}`,
  );
  for (const v of variants) {
    console.log(`  ${v.variant}: ${(v.summary.antWinRate * 100).toFixed(1)}%`);
  }
  process.exit(verdict.pass ? 0 : 1);
};

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

const report = (round: number): void => {
  const dir = roundDir(round);
  const applyJson = JSON.parse(
    fs.readFileSync(repoPath(path.join(dir, 'apply.json')), 'utf8'),
  ) as unknown;
  const gateJson = JSON.parse(
    fs.readFileSync(repoPath(path.join(dir, 'gate.json')), 'utf8'),
  ) as unknown;
  const reportObj = { round, apply: applyJson, gate: gateJson };
  fs.writeFileSync(
    repoPath(path.join(dir, 'report.json')),
    `${JSON.stringify(reportObj, null, 2)}\n`,
    'utf8',
  );
  console.log(`report: written to ${path.join(dir, 'report.json')}`);
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const main = (): void => {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case 'snapshot': {
      const round = Number(args[0]);
      if (!Number.isInteger(round)) throw new Error('snapshot: round number required');
      snapshot(round);
      return;
    }
    case 'apply': {
      const round = Number(args[0]);
      if (!Number.isInteger(round)) throw new Error('apply: round number required');
      apply(round, args.slice(1));
      return;
    }
    case 'restore': {
      const round = Number(args[0]);
      if (!Number.isInteger(round)) throw new Error('restore: round number required');
      restore(round);
      return;
    }
    case 'gate': {
      const round = Number(args[0]);
      if (!Number.isInteger(round)) throw new Error('gate: round number required');
      gate(round);
      return;
    }
    case 'report': {
      const round = Number(args[0]);
      if (!Number.isInteger(round)) throw new Error('report: round number required');
      report(round);
      return;
    }
    default:
      console.error('usage: coevo <snapshot|apply|restore|gate|report> <round> [args...]');
      process.exit(2);
  }
};

main();
