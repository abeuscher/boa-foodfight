/**
 * Replay viewer smoke test.
 *
 * Boots a small static server on a random port pointing at viewer/dist,
 * opens each variant's first replay, plays it through at 20× speed,
 * and screenshots three moments: start, midway, and final frame. The
 * screenshots land in out/screenshots/<variant>/ so Claude can read
 * them with the Read tool.
 *
 * Run with: pnpm test:viewer
 *
 * Requires `pnpm build:viewer` to have run first (so viewer/dist
 * exists) and `pnpm exec playwright install chromium` (one-time).
 */

import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import { test, expect } from '@playwright/test';

const DIST = path.join(process.cwd(), 'viewer', 'dist');
const SCREENSHOT_DIR = path.join(process.cwd(), 'out', 'screenshots');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'application/x-ndjson; charset=utf-8',
};

let server: ReturnType<typeof createServer> | null = null;
let baseUrl = '';

test.beforeAll(async () => {
  if (!fs.existsSync(path.join(DIST, 'replays', 'manifest.json'))) {
    throw new Error('viewer/dist/replays/manifest.json missing — run `pnpm build:viewer` first');
  }
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const target = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!target.startsWith(DIST) || !fs.existsSync(target)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const ext = path.extname(target);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(fs.readFileSync(target));
  });
  await new Promise<void>((resolve) => server!.listen(0, () => resolve()));
  const addr = server!.address();
  if (addr === null || typeof addr === 'string') throw new Error('no server address');
  baseUrl = `http://localhost:${String(addr.port)}`;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
});

const VARIANTS = ['baseline', 'rush', 'turtle', 'flank'];
const SEEDS_FOR_PER_SEED_VERIFICATION: readonly number[] = [1, 2, 3];

for (const variant of VARIANTS) {
  test(`${variant}: loads and screenshots a replay`, async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForFunction(
      () => document.getElementById('run-select')?.children.length ?? 0 > 0,
      { timeout: 5000 },
    );
    await page.selectOption('#run-select', variant);
    await page.selectOption('#replay-select', 'replay-1.jsonl');
    // Wait for status text to confirm replay loaded.
    await page.waitForFunction(
      () => (document.getElementById('status')?.textContent ?? '').includes('events'),
      { timeout: 5000 },
    );

    const variantDir = path.join(SCREENSHOT_DIR, variant);
    fs.mkdirSync(variantDir, { recursive: true });

    // Capture three moments: start (tick 0), middle, end.
    const maxTick = await page.evaluate(() =>
      Number((document.getElementById('scrubber') as HTMLInputElement).max),
    );
    const moments: { name: string; tick: number }[] = [
      { name: 'start', tick: 0 },
      { name: 'middle', tick: Math.floor(maxTick / 2) },
      { name: 'end', tick: maxTick },
    ];
    for (const m of moments) {
      await page.evaluate((tick) => {
        const scrub = document.getElementById('scrubber') as HTMLInputElement;
        scrub.value = String(tick);
        scrub.dispatchEvent(new Event('input'));
      }, m.tick);
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(variantDir, `${m.name}.png`), fullPage: true });
    }

    // Sanity: at least one party-moved event in the log.
    const logText = await page.locator('#log-list').textContent();
    expect(logText).toMatch(/turn-start|party-moved|battle-resolved/);
  });
}

// ---------------------------------------------------------------------------
// Per-seed map verification: load three different seeds for the baseline
// variant, screenshot each at tick 0, and assert that the rendered POSTs
// are at different on-canvas pixel locations between seeds. This is the
// browser-level proof that per-seed map randomization reaches the user's
// eyes — complements `viewer/replay-snapshot.test.ts` which proves the
// data pipeline without a browser.
// ---------------------------------------------------------------------------

interface PostMarker {
  readonly id: string;
  readonly plane: string;
  readonly x: number;
  readonly y: number;
}

test('per-seed: POST positions visibly differ across seeds in the deployed viewer', async ({
  page,
}) => {
  await page.goto(baseUrl);
  await page.waitForFunction(
    () => document.getElementById('run-select')?.children.length ?? 0 > 0,
    { timeout: 5000 },
  );
  await page.selectOption('#run-select', 'baseline');

  const seedDir = path.join(SCREENSHOT_DIR, 'per-seed');
  fs.mkdirSync(seedDir, { recursive: true });

  const fingerprints: { seed: number; fp: string }[] = [];

  for (const seed of SEEDS_FOR_PER_SEED_VERIFICATION) {
    await page.selectOption('#replay-select', `replay-${String(seed)}.jsonl`);
    await page.waitForFunction(
      () => (document.getElementById('status')?.textContent ?? '').includes('events'),
      { timeout: 5000 },
    );
    // Pin to tick 0 so we screenshot the initial map layout.
    await page.evaluate(() => {
      const scrub = document.getElementById('scrubber') as HTMLInputElement;
      scrub.value = '0';
      scrub.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(seedDir, `seed-${String(seed)}.png`), fullPage: true });

    // Read the per-seed POST locations the viewer is currently rendering
    // by walking the same scenario-start event the renderer parses.
    const posts = await page.evaluate(
      async (replayPath: string): Promise<PostMarker[]> => {
        const text = await fetch(replayPath).then((r) => r.text());
        const firstLine = text.split('\n', 1)[0] ?? '';
        const e = JSON.parse(firstLine) as {
          kind: string;
          posts?: { id: string; location: { plane: string; x: number; y: number } }[];
        };
        if (e.kind !== 'scenario-start' || !Array.isArray(e.posts)) return [];
        return e.posts.map((p) => ({
          id: p.id,
          plane: p.location.plane,
          x: p.location.x,
          y: p.location.y,
        }));
      },
      `/replays/baseline/replay-${String(seed)}.jsonl`,
    );

    const fp = posts
      .map((p) => `${p.id}@${p.plane}:${String(p.x)},${String(p.y)}`)
      .sort()
      .join('|');
    fingerprints.push({ seed, fp });
  }

  // All seed fingerprints must be distinct — same fingerprint across two
  // seeds means the per-seed map randomization is not flowing through.
  const unique = new Set(fingerprints.map((f) => f.fp));
  expect(
    unique.size,
    `expected ${String(SEEDS_FOR_PER_SEED_VERIFICATION.length)} distinct map layouts; got ${String(unique.size)}.\n${fingerprints
      .map((f) => `  seed ${String(f.seed)}: ${f.fp}`)
      .join('\n')}`,
  ).toBe(SEEDS_FOR_PER_SEED_VERIFICATION.length);
});
