/**
 * Tiny utilities shared by harness scripts. Kept minimal — anything
 * larger than a couple of helpers should live in its own module.
 */

/** Numeric extraction so `replay-2.jsonl` sorts before `replay-10.jsonl`. */
const seedFromName = (name: string): number => {
  const m = /^replay-(\d+)\.jsonl$/.exec(name);
  return m ? Number(m[1]) : 0;
};

/** Sort `replay-N.jsonl` filenames by N (numeric, not lexicographic). */
export const sortReplaysBySeed = (files: readonly string[]): readonly string[] =>
  [...files].sort((a, b) => seedFromName(a) - seedFromName(b));
