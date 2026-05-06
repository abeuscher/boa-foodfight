/**
 * Headless PNG renderer that mirrors what the deployed viewer draws at
 * tick 0. Critically, this runs the SAME REDUCER LOGIC as
 * viewer/main.js — so it's a faithful test of what the browser shows.
 *
 *   pnpm tsx viewer/render-png.ts <replay.jsonl> [<replay2.jsonl> ...]
 *
 * Writes PNGs to out/screenshots/render-png/. Lets us verify visually
 * without a browser, since this sandbox can't download Chromium.
 */

import fs from 'node:fs';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';

import type { ScenarioStartEvent } from './replay-types.ts';

interface PostMarker {
  id: string;
  plane: string;
  x: number;
  y: number;
  owner: string;
}

interface ReducedState {
  initialPosts: PostMarker[] | null;
  obstacles: { plane: string; x: number; y: number }[];
}

/**
 * Mirror of viewer/main.js's reduceWithInitial, but only the parts that
 * affect map rendering (initialPosts + obstacles). Keep this in sync
 * with the browser reducer or the PNG renderer drifts.
 */
const reduceMapAtTick = (
  events: { tick: number; kind: string }[],
  targetTick: number,
): ReducedState => {
  let initialPosts: PostMarker[] | null = null;
  let obstacles: { plane: string; x: number; y: number }[] = [];
  for (const e of events) {
    if (e.kind === 'scenario-start') {
      const ss = e as unknown as ScenarioStartEvent;
      if (ss.posts !== undefined) {
        initialPosts = ss.posts.map((p) => ({
          id: p.id,
          plane: p.location.plane,
          x: p.location.x,
          y: p.location.y,
          owner: p.owner,
        }));
      }
      if (ss.obstacles !== undefined) {
        obstacles = ss.obstacles.map((o) => ({ plane: o.plane, x: o.x, y: o.y }));
      }
      continue;
    }
    if (e.tick > targetTick) break;
  }
  return { initialPosts, obstacles };
};

const GRID = 10;
const CELL = 32;
const PLANE_W = GRID * CELL;
const PLANE_GAP = 24;
const HEADER_H = 28;

// Same layout as viewer/main.js
const PLANE_GRID: readonly (readonly string[])[] = [
  ['west-wall', 'north-wall', 'east-wall'],
  ['floor', 'ceiling', 'south-wall'],
];
const PLANES = PLANE_GRID.flat();

const COLOR_BG = '#0e0e10';
const COLOR_GRID = '#3a3a3f';
const COLOR_LABEL = '#9ca3af';
const COLOR_OBSTACLE = '#3a2a18';
const COLOR_OBSTACLE_OUTLINE = '#5a3f22';
const COLOR_OWNER: Record<string, string> = {
  ant: '#22c55e',
  spider: '#ef4444',
  neutral: '#94a3b8',
};

const planeOrigin = (plane: string): { ox: number; oy: number } => {
  for (let r = 0; r < PLANE_GRID.length; r++) {
    const row = PLANE_GRID[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === plane) {
        return {
          ox: c * (PLANE_W + PLANE_GAP),
          oy: HEADER_H + r * (PLANE_W + HEADER_H + PLANE_GAP),
        };
      }
    }
  }
  return { ox: 0, oy: HEADER_H };
};

const shortPostName = (id: string): string => {
  const labels: Record<string, string> = {
    'storm-drain': 'SD',
    'soap-dish': 'SOAP',
    'towel-rack': 'TWL',
    'wall-crack': 'WC',
    'spider-web': 'WEB',
  };
  if (labels[id]) return labels[id];
  const m = /^([a-z-]+)-(\d+)$/.exec(id);
  if (m?.[1] && labels[m[1]]) return `${labels[m[1]]}${m[2]}`;
  return id.slice(0, 4);
};

const renderReplay = (replayPath: string, outPath: string): void => {
  // Read the full event stream and run the same reducer the viewer
  // uses, at tick 0 (the initial frame). This is what guarantees the
  // PNG matches the browser's first-render output.
  const lines = fs
    .readFileSync(replayPath, 'utf8')
    .split('\n')
    .filter((l) => l.length > 0);
  const events = lines.map((l) => JSON.parse(l) as { tick: number; kind: string });
  const { initialPosts, obstacles } = reduceMapAtTick(events, 0);
  if (!initialPosts) {
    throw new Error(
      `replay ${replayPath} produced no initialPosts at tick 0 — viewer would fall back to SPEC_POSTS`,
    );
  }
  const posts = initialPosts;

  const cols = PLANE_GRID[0]!.length;
  const rows = PLANE_GRID.length;
  const W = cols * (PLANE_W + PLANE_GAP) + 16;
  const H = rows * (PLANE_W + HEADER_H + PLANE_GAP) + HEADER_H + 16;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, H);

  // Title with replay path so per-seed PNGs are self-labelling.
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(path.basename(replayPath, '.jsonl'), 8, 18);

  for (const plane of PLANES) {
    const { ox, oy } = planeOrigin(plane);
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = '12px sans-serif';
    ctx.fillText(plane, ox + 4, oy - 8);
    // Grid
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * CELL + 0.5, oy + 0.5);
      ctx.lineTo(ox + i * CELL + 0.5, oy + GRID * CELL + 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + 0.5, oy + i * CELL + 0.5);
      ctx.lineTo(ox + GRID * CELL + 0.5, oy + i * CELL + 0.5);
      ctx.stroke();
    }
    // Obstacles
    for (const o of obstacles) {
      if (o.plane !== plane) continue;
      const x = ox + o.x * CELL;
      const y = oy + o.y * CELL;
      ctx.fillStyle = COLOR_OBSTACLE;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = COLOR_OBSTACLE_OUTLINE;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    }
    // POSTs (flat shape from the viewer's reducer: {id, plane, x, y, owner}).
    for (const p of posts) {
      if (p.plane !== plane) continue;
      const cx = ox + p.x * CELL + CELL / 2;
      const cy = oy + p.y * CELL + CELL / 2;
      ctx.fillStyle = COLOR_OWNER[p.owner] ?? '#888';
      ctx.fillRect(cx - 12, cy - 12, 24, 24);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 12, cy - 12, 24, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(shortPostName(p.id), cx, cy + 3);
      ctx.textAlign = 'start';
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  console.log(`rendered ${replayPath} -> ${outPath} (${String(buf.length)} bytes)`);
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: tsx viewer/render-png.ts <replay.jsonl> [<replay2.jsonl> ...]');
  process.exit(2);
}
const outDir = path.join(process.cwd(), 'out', 'screenshots', 'render-png');
for (const a of args) {
  const base = path
    .relative(path.join(process.cwd(), 'viewer', 'dist', 'replays'), a)
    .replace(/[\\/]/g, '-')
    .replace(/\.jsonl$/, '.png');
  renderReplay(a, path.join(outDir, base));
}
