const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  // Temporary browser only: never attach to a user browser or persistent profile.
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const width of [390, 1366]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, storageState: { cookies: [], origins: [] } });
      // Prevent any server-side mutation; saveListings writes only to this context's localStorage.
      await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
      assert.equal(await page.evaluate(() => localStorage.length), 0, 'Refuse to test against existing data');
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await page.getByRole('button', { name: 'Administration', exact: true }).click();
      const field = page.locator('#stall-products');
      const selectedKey = await page.locator('#admin-stall').inputValue();
      await field.fill('First product');
      await field.press('End');
      await field.press('Enter');
      assert.equal(await field.inputValue(), 'First product\n');
      await field.pressSequentially('Second product');
      await field.press('Enter');
      await field.press('Enter');
      await field.pressSequentially('  Third product  ');
      await field.press('Enter');
      assert.equal(await field.inputValue(), 'First product\nSecond product\n\n  Third product  \n');
      await page.getByRole('button', { name: 'Save listing', exact: true }).click();
      const expected = 'First product\nSecond product\nThird product';
      await page.waitForFunction(value => document.querySelector('#stall-products').value === value, expected);
      await page.locator('#admin-stall').selectOption({ index: 1 });
      await page.locator('#admin-stall').selectOption(selectedKey);
      assert.equal(await field.inputValue(), expected);
      await page.reload();
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await page.getByRole('button', { name: 'Administration', exact: true }).click();
      await page.locator('#admin-stall').selectOption(selectedKey);
      assert.equal(await field.inputValue(), expected);
      await page.getByRole('button', { name: 'Public map', exact: true }).click();
      await page.locator('#stall-search').fill('Second product');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      const details = width < 900 ? page.locator('dialog') : page.locator('.side-panel .selection-card');
      await details.waitFor({ state: 'visible' });
      assert.deepEqual(await details.locator('.product-list li').allTextContents(), ['First product', 'Second product', 'Third product']);
      assert.deepEqual(errors, []);
      await context.close(); // Discards all temporary test storage.
      console.log('PASS ' + width + 'px: Enter, multiword products, blank lines, save cleanup, stall switching, reload and public details; isolated context discarded.');
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
