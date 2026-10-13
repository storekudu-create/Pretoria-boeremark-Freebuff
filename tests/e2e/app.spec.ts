import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const ACCESS = process.env.E2E_ACCESS_PASSWORD || 'demo-access';
const ADMIN = process.env.E2E_ADMIN_PASSWORD || 'demo-admin';

async function unlock(page: Page): Promise<void> {
  await page.goto('/');
  const pw = page.locator('#pw');
  if (await pw.isVisible({ timeout: 5000 }).catch(() => false)) {
    await pw.fill(ACCESS);
    await page.click('#btn');
  }
  await expect(page.locator('.app')).toBeVisible({ timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('viewer gate unlocks and app shell renders', async ({ page }, testInfo) => {
  await expect(page.locator('#pw')).toBeVisible();
  await expect(page.locator('body')).toContainText('Not affiliated');
  await pw_fill(page);
  await expect(page.locator('.app')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.brand')).toBeVisible();
  await expect(page.locator('.disclaimer')).toContainText('Not affiliated');
  await expect(page.locator('svg.map-svg')).toBeVisible();
  await expect(page.locator('svg.map-svg g[role="button"]').first()).toBeVisible();
  await page.screenshot({ path: `artifacts/shots/${testInfo.project.name}-home.png`, fullPage: true });
});

async function pw_fill(page: Page): Promise<void> {
  await page.locator('#pw').fill(ACCESS);
  await page.click('#btn');
}

test('universal search returns results and opens a stall profile', async ({ page }, testInfo) => {
  await unlock(page);
  const search = page.getByPlaceholder(/stalletjie|business/i).first();
  await search.fill('biltong');
  await expect(page.locator('.result-item').first()).toBeVisible({ timeout: 10000 });
  const count = await page.locator('.result-item').count();
  expect(count).toBeGreaterThan(0);
  await page.screenshot({ path: `artifacts/shots/${testInfo.project.name}-search.png`, fullPage: true });
  await page.locator('.result-item .result-main').first().click();
  const profile = page.locator('.profile');
  await expect(profile).toBeVisible();
  await expect(profile.locator('.product-list, .profile-muted').first()).toBeVisible();
  await page.screenshot({ path: `artifacts/shots/${testInfo.project.name}-profile.png`, fullPage: false });
});

test('map stall selection opens profile and locate works', async ({ page }) => {
  await unlock(page);
  const stall = page.locator('svg.map-svg g[role="button"]').first();
  const label = await stall.getAttribute('aria-label');
  expect(label).toMatch(/Stall \d+/);
  await stall.click();
  await expect(page.locator('.profile')).toBeVisible();
  await page.locator('.profile .icon-btn').click();
  await expect(page.locator('.profile')).toHaveCount(0);
});

test('specials and categories sections render', async ({ page }, testInfo) => {
  await unlock(page);
  await expect(page.locator('.special-list .special-item').first()).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Aanbiedinge|Specials/i }).click();
  await expect(page.locator('.special-list').first()).toBeVisible();
  await page.screenshot({ path: `artifacts/shots/${testInfo.project.name}-specials.png`, fullPage: true });
  await page.getByRole('button', { name: /Kategorie|Categories/i }).click();
  await expect(page.locator('.cat-grid').first()).toBeVisible();
  const cards = await page.locator('.cat-card').count();
  expect(cards).toBeGreaterThanOrEqual(10);
});

test('language toggle switches to Afrikaans', async ({ page }) => {
  await unlock(page);
  await page.getByRole('button', { name: 'AF', exact: true }).click();
  await expect(page.locator('.brand')).toHaveText(/Privaat Markkaart/);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('.brand')).toHaveText(/Private Market Map/);
});

test('admin dashboard login and analytics', async ({ page }, testInfo) => {
  await unlock(page);
  await page.getByRole('button', { name: /Admin/i }).click();
  await expect(page.locator('.admin-login')).toBeVisible({ timeout: 10000 });
  await page.locator('#admin-pw').fill(ADMIN);
  await page.locator('.admin-login button[type="submit"]').click();
  await expect(page.locator('.admin-tabs')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.admin-table').first()).toBeVisible();
  await page.getByRole('tab', { name: /Analytics/i }).click();
  await expect(page.locator('.stat-grid').first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `artifacts/shots/${testInfo.project.name}-admin.png`, fullPage: true });
});

test('offline mode falls back to cached data', async ({ page }, testInfo) => {
  await unlock(page);
  await expect(page.locator('.special-list').first()).toBeVisible({ timeout: 10000 });
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator('.app')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.banner--offline')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `artifacts/shots/${testInfo.project.name}-offline.png`, fullPage: false });
  await page.context().setOffline(false);
});
