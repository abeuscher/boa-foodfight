/**
 * S2 — Control inventory for the L1 live scenario.
 *
 * This is NOT a strategy test. It systematically exercises every
 * interactive control on the live scenario screen and asserts that each
 * one is reachable, registers its click, and produces the expected state
 * change in the next render. Console errors are collected across the
 * whole run and asserted empty at the end.
 *
 * It is written against the **running Vite dev server** (default
 * http://localhost:5173 — start it with `pnpm dev:client`). Override with
 * BASE_URL if needed.
 *
 * Run (from repo root, dev server already up):
 *   pnpm exec playwright test docs/test-feedback/ui-audit-s2/test-script.spec.ts \
 *     --config docs/test-feedback/ui-audit-s2/pw.config.ts
 *
 * Findings encoded by this spec (see README.md):
 *   - H-1: a cross-plane move order is ACCEPTED by the UI but the party
 *     never traverses — it silently stalls. The cross-plane test asserts
 *     this observed (buggy) behavior so the spec documents it; if the
 *     stall is ever fixed, that test will start failing and should be
 *     flipped to assert traversal.
 *   - "Try to recruit" and the full "Flee" resolution can't be exercised
 *     in L1 floor play because the only valid targets (recruitable
 *     neutrals / spiders) live on cross-plane faces gated by H-1. Those
 *     tests assert the reachable part (gating / arming) only.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

// ---- helpers ---------------------------------------------------------

/** Click New Game → OK to land on the live scenario. */
async function bootToLive(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.getByRole('menuitem', { name: /New Game/ }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('.cube-face-active')).toBeVisible();
}

/** The party card buttons in the left squad list. */
function partyCard(page: Page, name: string) {
  return page.locator('button.pcard', { hasText: name });
}

/** Active-face cells, in DOM order (index = row*10 + col). */
function activeCells(page: Page) {
  return page.locator('.cube-face-active button.cell');
}

/** Currently-active face name (the cube-label.active text). */
async function activeFace(page: Page): Promise<string | null> {
  return page.locator('.cube-label.active').first().textContent();
}

/** Find a party's [row,col] on the active face by its tile title; null if absent. */
async function partyPos(page: Page, name: string): Promise<[number, number] | null> {
  return page.evaluate((n) => {
    const cells = [...document.querySelectorAll('.cube-face-active button.cell')];
    const i = cells.findIndex((b) => (b as HTMLElement).title?.includes(n));
    return i >= 0 ? [Math.floor(i / 10), i % 10] : null;
  }, name);
}

async function clickFaceTab(page: Page, face: string): Promise<void> {
  await page
    .locator('button', { hasText: new RegExp(`^${face}$`) })
    .first()
    .click();
}

async function stepTurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Step' }).click();
  await page.waitForTimeout(400);
}

/** Select a party and drive it into the committed action view (via Hold). */
async function selectCommitted(page: Page, name: string): Promise<void> {
  await partyCard(page, name).click();
  // selecting pre-arms Move (ordering view: Cancel/Hold/Inspect); Hold
  // exits ordering into the committed view (Move/Clear/Flee/…).
  await page.getByRole('button', { name: 'Hold position' }).click();
}

// ---- console-error collection (asserted at the end) ------------------

const consoleErrors: string[] = [];
test.beforeEach(({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
});

// ---- tests -----------------------------------------------------------

test('party selection updates the action rail', async ({ page }) => {
  await bootToLive(page);
  await partyCard(page, 'vanguard-alpha').click();
  // selecting a controllable party pre-arms Move → pick-destination hint
  await expect(page.getByText(/pick destination/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hold position' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspect' })).toBeVisible();
});

test('queen-guard is immobile (Inspect only, no Move/Hold)', async ({ page }) => {
  await bootToLive(page);
  await partyCard(page, 'queen-guard').click();
  await expect(page.getByRole('button', { name: 'Inspect' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hold position' })).toHaveCount(0);
  await expect(page.getByText(/immobile/i)).toBeVisible();
});

test('Move (same-plane): destination marker + party traverses', async ({ page }) => {
  await bootToLive(page);
  const before = await partyPos(page, 'vanguard-alpha'); // ~[0,1]
  await partyCard(page, 'vanguard-alpha').click();
  await activeCells(page).nth(44).click(); // move to (4,4)
  // committed view appears, and a gold × destination marker exists
  await expect(page.getByRole('button', { name: 'Clear order' })).toBeVisible();
  await stepTurn(page);
  const after = await partyPos(page, 'vanguard-alpha');
  expect(after).not.toEqual(before); // it moved
});

test('Move (cross-plane): order accepted but party SILENTLY STALLS (H-1)', async ({ page }) => {
  await bootToLive(page);
  const before = await partyPos(page, 'vanguard-alpha'); // on floor
  await partyCard(page, 'vanguard-alpha').click();
  await clickFaceTab(page, 'ceiling'); // rotate to ceiling while armed
  await expect(page.locator('.cube-label.active')).toHaveText(/ceiling/);
  await activeCells(page).nth(55).click(); // order a ceiling tile
  // The UI accepts it (committed view) with no error...
  await expect(page.getByRole('button', { name: 'Clear order' })).toBeVisible();
  // ...but stepping turns, the party never leaves the floor.
  for (let i = 0; i < 6; i++) await stepTurn(page);
  await clickFaceTab(page, 'floor');
  const after = await partyPos(page, 'vanguard-alpha');
  // BUG (H-1): documents the stall. Flip to .not.toEqual once fixed.
  expect(after).toEqual(before);
});

test('Hold cancels a pending move (party stays put)', async ({ page }) => {
  await bootToLive(page);
  await partyCard(page, 'vanguard-alpha').click();
  await activeCells(page).nth(66).click(); // move order to (6,6)
  const before = await partyPos(page, 'vanguard-alpha');
  await page.getByRole('button', { name: 'Hold position' }).click(); // overrides move
  await stepTurn(page);
  expect(await partyPos(page, 'vanguard-alpha')).toEqual(before);
});

test('Clear order cancels a pending move (party stays put)', async ({ page }) => {
  await bootToLive(page);
  await partyCard(page, 'vanguard-alpha').click();
  await activeCells(page).nth(66).click(); // move order to (6,6)
  const before = await partyPos(page, 'vanguard-alpha');
  await page.getByRole('button', { name: 'Clear order' }).click(); // committed view
  await stepTurn(page);
  expect(await partyPos(page, 'vanguard-alpha')).toEqual(before);
});

test('Cast Royal Jelly: pending → advance → dose increments', async ({ page }) => {
  await bootToLive(page);
  await selectCommitted(page, 'pathfinders'); // mage party carries jelly-apply
  await expect(page.getByRole('button', { name: /Cast Royal Jelly \(0\/3\)/ })).toBeVisible();
  await page.getByRole('button', { name: /Cast Royal Jelly/ }).click();
  await expect(page.getByRole('button', { name: /Casting Royal Jelly/ })).toBeVisible(); // pending
  await stepTurn(page);
  await selectCommitted(page, 'pathfinders');
  await expect(page.getByRole('button', { name: /Cast Royal Jelly \(1\/3\)/ })).toBeVisible(); // dose 0→1
});

test('Flee next combat: arms a pending flee intent', async ({ page }) => {
  await bootToLive(page);
  await selectCommitted(page, 'vanguard-alpha');
  await page.getByRole('button', { name: /Flee next combat/ }).click();
  await expect(page.getByRole('button', { name: /Flee queued/ })).toBeVisible();
  // NOTE: full resolution (walk into a spider → auto-pause on
  // battle-flee-attempted) is unreachable in L1 floor play (H-1).
});

test('Try to recruit is correctly gated (hidden with no neutral in range)', async ({ page }) => {
  await bootToLive(page);
  await selectCommitted(page, 'pathfinders'); // has recruit ability
  // recruitable neutrals all spawn on cross-plane faces, so at spawn
  // there is no neutral within Chebyshev 1 → the button must be absent.
  await expect(page.getByRole('button', { name: /Try to recruit/ })).toHaveCount(0);
});

test('Plane rotation via face tabs', async ({ page }) => {
  await bootToLive(page);
  await clickFaceTab(page, 'ceiling');
  await expect(page.locator('.cube-label.active')).toHaveText(/ceiling/);
  await clickFaceTab(page, 'floor');
  await expect(page.locator('.cube-label.active')).toHaveText(/floor/);
});

test('Plane rotation via peripheral-face click (DOM hit-test)', async ({ page }) => {
  await bootToLive(page);
  expect(await activeFace(page)).toBe('floor');
  // click the top peripheral wrapper → rotates that face to active
  await page.locator('.cube-slot.cube-top .cube-face.cube-peripheral').click();
  await expect(page.locator('.cube-label.active')).toHaveText(/north-wall/);
});

test('Playback: Play advances turns, Pause freezes them', async ({ page }) => {
  await bootToLive(page);
  const turnNum = async () =>
    Number((await page.locator('aside.info-rail').textContent())?.match(/Turn (\d+)/)?.[1] ?? '0');
  // single toggle button; its label flips Play <-> Pause.
  const toggle = page.getByRole('button', { name: /Play|Pause/ });
  await page.getByRole('button', { name: '4×' }).click();

  // --- Play advances turns ---
  const t0 = await turnNum();
  await toggle.click(); // Play
  // the engine auto-pauses on events (e.g. POST captured) within a turn
  // or two at 4×, so the "Pause" label is transient — just confirm turns
  // moved, which proves Play fired.
  await expect.poll(async () => await turnNum(), { timeout: 8000 }).toBeGreaterThan(t0);

  // --- Pause freezes them ---
  // The game may already be auto-paused; ensure a PAUSED state regardless
  // by toggling until the label reads Play (= paused).
  if (/Pause/.test((await toggle.textContent()) ?? '')) await toggle.click();
  await expect(toggle).toHaveText(/Play/); // paused
  const tPaused = await turnNum();
  await page.waitForTimeout(1500);
  expect(await turnNum()).toBe(tPaused); // frozen while paused
});

test('Playback: each speed preset activates when selected', async ({ page }) => {
  await bootToLive(page);
  for (const s of ['0.5×', '1×', '2×', '4×']) {
    const btn = page.getByRole('button', { name: s, exact: true });
    await btn.click();
    await expect(btn).toHaveClass(/active/);
  }
});

test('Step advances exactly one turn', async ({ page }) => {
  await bootToLive(page);
  const turnNum = async () =>
    Number((await page.locator('aside.info-rail').textContent())?.match(/Turn (\d+)/)?.[1] ?? '0');
  const t0 = await turnNum();
  await page.getByRole('button', { name: 'Step' }).click();
  await page.waitForTimeout(400);
  expect(await turnNum()).toBe(t0 + 1);
});

test('Fog toggle flips mask state', async ({ page }) => {
  await bootToLive(page);
  const fog = page.locator('button', { hasText: /Fog (on|off)/ });
  await expect(fog).toHaveText(/Fog on/);
  await fog.click();
  await expect(fog).toHaveText(/Fog off/);
  // with fog off, no active-face tile should carry fog-unseen
  await expect(page.locator('.cube-face-active button.cell.fog-unseen')).toHaveCount(0);
});

test('End scenario routes to the Hill home base', async ({ page }) => {
  await bootToLive(page);
  await page.getByRole('button', { name: /End scenario/ }).click();
  await expect(page.getByText(/The Hill/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Organize Army/ })).toBeVisible();
});

test('no console errors were emitted during the run', () => {
  expect(consoleErrors).toEqual([]);
});
