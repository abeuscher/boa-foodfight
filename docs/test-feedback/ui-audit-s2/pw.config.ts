/**
 * Minimal Playwright config for the S2 control-inventory spec.
 *
 * Targets the running Vite dev server (start it first: `pnpm dev:client`).
 * Run from repo root:
 *   pnpm exec playwright test docs/test-feedback/ui-audit-s2/test-script.spec.ts \
 *     --config docs/test-feedback/ui-audit-s2/pw.config.ts
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'test-script.spec.ts',
  timeout: 30000,
  retries: 0,
  workers: 1, // shared turn-state; keep serial
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
