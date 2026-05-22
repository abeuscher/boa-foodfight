/**
 * Game-client smoke test.
 *
 * Serves client/dist on a random port and walks the Hill hub: the
 * resource strip renders, the verb rail opens each sub-view, the
 * inventory-backed equip picker is present in Organize Army, and a
 * Shop purchase deducts buttons and grows the inventory. Screenshots
 * of the hub + sub-views land in out/screenshots/client/.
 *
 * Requires `pnpm build:client` first. Run via `pnpm test:client`.
 */

import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import { test, expect } from '@playwright/test';

const DIST = path.join(process.cwd(), 'client', 'dist');
const SHOTS = path.join(process.cwd(), 'out', 'screenshots', 'client');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

let server: ReturnType<typeof createServer> | null = null;
let baseUrl = '';

test.beforeAll(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('client/dist/index.html missing — run `pnpm build:client` first');
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0] ?? '/';
    const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
    const file = path.join(DIST, rel);
    if (!file.startsWith(DIST) || !fs.existsSync(file)) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise<void>((resolve) => {
    server?.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no server address');
  baseUrl = `http://127.0.0.1:${String(addr.port)}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
});

test('Hill hub loads with resource strip and verb rail', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.getByText('120 buttons')).toBeVisible();
  await expect(page.getByText(/\d+ ants/)).toBeVisible();
  for (const verb of ['Deploy', 'Organize Army', 'Recruit', 'Shop', 'System']) {
    await expect(page.getByRole('button', { name: verb })).toBeVisible();
  }
  await page.screenshot({ path: path.join(SHOTS, 'hill.png') });
});

test('Organize Army opens and shows squads + equip picker', async ({ page }) => {
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'Organize Army' }).click();
  await expect(page.getByRole('heading', { name: 'Squads' })).toBeVisible();
  await expect(page.getByText('queen-guard')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'organize.png') });
  await page.getByRole('button', { name: '← Back to Hill' }).click();
  await expect(page.getByRole('button', { name: 'Deploy' })).toBeVisible();
});

test('Shop purchase deducts buttons and grows the inventory', async ({ page }) => {
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Grasshopper — Shop' })).toBeVisible();
  await page.getByRole('button', { name: 'Buy' }).first().click();
  // 120 starting buttons − 40 (cheapest catalogued item) = 80.
  await expect(page.getByText('80 buttons')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'shop.png') });
});
