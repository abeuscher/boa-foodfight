/**
 * Playwright config for the game-client smoke test.
 *
 * Boots the built client (client/dist) on a tiny static server, drives
 * the Hill hub and its sub-views in headless Chromium, and saves
 * screenshots to out/screenshots/client/ (so they can be read back).
 *
 * Prerequisites:
 *   pnpm build:client                 (so client/dist exists)
 *   pnpm exec playwright install chromium   (one-time)
 * Run with: pnpm test:client
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'client.spec.ts',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1100, height: 900 },
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
