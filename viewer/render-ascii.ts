/**
 * ASCII map renderer for a replay's scenario-start event. Useful when
 * the sandbox has no browser to verify viewer output visually.
 *
 *   pnpm tsx viewer/render-ascii.ts <replay.jsonl> [<replay2.jsonl> ...]
 *
 * For each replay, prints:
 *   - the 6-plane grid laid out as compact ASCII (S = storm-drain,
 *     W = spider-web, 1/2/3... = mid-POSTs by suffix, # = obstacle,
 *     . = open tile, ? = base map quirk)
 *   - the POST id legend so you can see what's where
 *
 * Side-by-side outputs make per-seed differences obvious at a glance.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { ScenarioStartEvent } from './replay-types.ts';

const PLANES = ['floor', 'ceiling', 'north-wall', 'south-wall', 'east-wall', 'west-wall'] as const;
const GRID = 10;

const readScenarioStart = (replayPath: string): ScenarioStartEvent => {
  const firstLine = fs.readFileSync(replayPath, 'utf8').split('\n', 1)[0];
  if (!firstLine) throw new Error(`empty replay: ${replayPath}`);
  return JSON.parse(firstLine) as ScenarioStartEvent;
};

const postGlyph = (id: string): string => {
  if (id === 'storm-drain') return 'S';
  if (id === 'spider-web') return 'W';
  // Suffixed types: pick first letter of type + suffix digit
  const m = /^([a-z-]+)-(\d+)$/.exec(id);
  if (!m) return '?';
  const [, type, n] = m;
  if (!type || !n) return '?';
  const head =
    type === 'soap-dish' ? 'P' : type === 'towel-rack' ? 'T' : type === 'wall-crack' ? 'C' : '?';
  return `${head}${n}`;
};

const renderPlane = (
  plane: string,
  posts: NonNullable<ScenarioStartEvent['posts']>,
  obstacles: NonNullable<ScenarioStartEvent['obstacles']>,
): string => {
  const grid: string[][] = [];
  for (let y = 0; y < GRID; y++) {
    grid.push(new Array<string>(GRID).fill(' . '));
  }
  for (const o of obstacles) {
    if (o.plane !== plane) continue;
    if (o.x < 0 || o.x >= GRID || o.y < 0 || o.y >= GRID) continue;
    grid[o.y]![o.x] = ' # ';
  }
  for (const p of posts) {
    if (p.location.plane !== plane) continue;
    const g = postGlyph(p.id);
    grid[p.location.y]![p.location.x] =
      g.length === 1 ? ` ${g} ` : g.length === 2 ? ` ${g}` : g.slice(0, 3);
  }
  const header = `  ${plane}\n`;
  const colHdr =
    '   ' +
    Array.from({ length: GRID }, (_, x) => String(x).padStart(2, ' ') + ' ').join('') +
    '\n';
  const body = grid.map((row, y) => `${String(y).padStart(2, ' ')} ${row.join('')}`).join('\n');
  return header + colHdr + body + '\n';
};

const renderReplay = (replayPath: string): string => {
  const e = readScenarioStart(replayPath);
  const posts = e.posts ?? [];
  const obstacles = e.obstacles ?? [];
  let out = `\n=== ${path.relative(process.cwd(), replayPath)} ===\n`;
  out += `posts: ${String(posts.length)} | obstacles: ${String(obstacles.length)}\n`;
  for (const p of posts) {
    out += `  ${postGlyph(p.id).padEnd(3)} ${p.id} @ ${p.location.plane}(${String(p.location.x)},${String(p.location.y)}) ${p.owner}\n`;
  }
  out += '\n';
  for (const plane of PLANES) {
    out += renderPlane(plane, posts, obstacles);
  }
  return out;
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    'usage: tsx viewer/render-ascii.ts <replay.jsonl> [<replay2.jsonl> ...]\n' +
      'Run `pnpm build:viewer` first so viewer/dist/replays/<variant>/ exists.',
  );
  process.exit(2);
}
for (const a of args) console.log(renderReplay(a));
