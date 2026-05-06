/**
 * Playwright config for the replay viewer smoke test.
 *
 * The test boots the static viewer (viewer/dist) via a tiny built-in
 * web server, opens each variant's first replay in headless Chromium,
 * plays it through, and saves screenshots to out/screenshots/. Used
 * for visual regression and so Claude can read screenshots back via
 * the Read tool.
 *
 * Prerequisites (run once):
 *   pnpm exec playwright install chromium
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'viewer.spec.ts',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1300, height: 900 },
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
