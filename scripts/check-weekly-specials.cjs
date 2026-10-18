const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const cases = [
      ['2026-10-14T12:00:00+02:00', true],
      ['2026-10-17T03:00:00+02:00', true],
      ['2026-10-17T09:29:50+02:00', true, false],
      ['2026-10-17T09:30:00+02:00', false],
      ['2026-10-17T23:59:50+02:00', false, true],
      ['2026-10-18T00:00:00+02:00', true],
    ];
    for (const [date, visible, afterBoundary] of cases) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles' });
      const page = await context.newPage();
      await page.clock.install({ time: new Date(date) });
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
      await page.locator('.map-viewport svg').waitFor();
      assert.equal(await page.locator('.today-specials-card').count(), visible ? 1 : 0, date);
      if (visible) assert.equal(await page.locator('.today-specials-heading > span').count(), 0);
      if (afterBoundary !== undefined) {
        await page.clock.runFor(10_000);
        assert.equal(await page.locator('.today-specials-card').count(), afterBoundary ? 1 : 0, date + ' after boundary');
      }
      await context.close();
    }
    console.log('PASS: weekly mobile specials, early Saturday, exact 09:30 cutoff, automatic Sunday rollover and South African timing for overseas visitors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
