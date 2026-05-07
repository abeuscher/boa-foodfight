/**
 * Tiny utilities shared by harness scripts. Kept minimal — anything
 * larger than a couple of helpers should live in its own module.
 */

import fs from 'node:fs';

/** Numeric extraction so `replay-2.jsonl` sorts before `replay-10.jsonl`. */
const seedFromName = (name: string): number => {
  const m = /^replay-(\d+)\.jsonl$/.exec(name);
  return m ? Number(m[1]) : 0;
};

/** Sort `replay-N.jsonl` filenames by N (numeric, not lexicographic). */
export const sortReplaysBySeed = (files: readonly string[]): readonly string[] =>
  [...files].sort((a, b) => seedFromName(a) - seedFromName(b));

export type ReplayOutcome = 'ant' | 'spider' | 'timeout';

/**
 * Determine the outcome of a replay JSONL file. Looks for the final
 * `scenario-end` event, returns its `winner` field. Falls back to
 * `'timeout'` when no `scenario-end` is present (the harness omits it
 * for max-turn timeouts).
 */
export const readReplayOutcome = (replayPath: string): ReplayOutcome => {
  const content = fs.readFileSync(replayPath, 'utf8');
  const lines = content.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line?.includes('"scenario-end"')) continue;
    try {
      const e = JSON.parse(line) as { kind?: string; winner?: string };
      if (e.kind === 'scenario-end' && (e.winner === 'ant' || e.winner === 'spider')) {
        return e.winner;
      }
    } catch {
      // ignore parse errors and keep walking backward
    }
  }
  return 'timeout';
};
