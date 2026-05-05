/**
 * Shared CLI/IO helpers for critics. Critics that write findings to JSON
 * use these so the per-critic scripts stay focused on rule logic.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface Finding {
  readonly rule: string;
  readonly severity: 'high' | 'medium' | 'low';
  readonly observation: string;
  readonly suggested_action?: string;
}

export interface CriticArgs {
  readonly inDir: string;
  readonly outFile: string;
}

export const parseCriticArgs = (argv: readonly string[], defaults: CriticArgs): CriticArgs => {
  let inDir = defaults.inDir;
  let outFile = defaults.outFile;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--in' && val !== undefined) {
      inDir = val;
      i += 1;
    } else if (flag === '--out' && val !== undefined) {
      outFile = val;
      i += 1;
    }
  }
  return { inDir, outFile };
};

export const writeFindings = (
  outFile: string,
  source: string,
  findings: readonly Finding[],
): void => {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ source, findings }, null, 2));
};

export const summarizeFindings = (
  label: string,
  outFile: string,
  findings: readonly Finding[],
): void => {
  const high = findings.filter((f) => f.severity === 'high').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;
  console.log(
    `${label}: ${String(findings.length)} findings (high=${String(high)} med=${String(medium)} low=${String(low)})`,
  );
  console.log(`  written to ${outFile}`);
};
