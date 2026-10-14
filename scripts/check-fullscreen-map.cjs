const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const width of [360, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true });
      const page = await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
      await page.locator('[data-stall-key]').first().waitFor();
      await page.getByRole('button',{name:'EN',exact:true}).click();
      await page.getByRole('button',{name:'Zoom in',exact:true}).click();
      await page.getByRole('button',{name:'Full-screen map',exact:true}).click();
      const map=page.locator('.map-explorer');
      assert(await map.evaluate(e=>{const r=e.getBoundingClientRect();return r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight}));
      assert.equal(await page.locator('.map-viewport svg').getAttribute('viewBox'),'0 0 1044 1507');
      assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
      await page.locator('#category-filter').selectOption('coffee');
      await page.locator('.category-highlight-marker').first().waitFor();
      await page.getByRole('button',{name:'Zoom in',exact:true}).click();
      assert.notEqual(await page.locator('.map-viewport svg').getAttribute('viewBox'),'0 0 1044 1507');
      await page.getByRole('button',{name:'Show the full map',exact:true}).click();
      await page.locator('[data-stall-key]').first().tap();
      await page.waitForFunction(()=>document.querySelector('dialog').open);
      await page.locator('.stall-details-toolbar button').click();
      assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
      assert(await map.evaluate(e=>e.classList.contains('is-expanded')));
      await page.screenshot({path:'.tmp-full-map-'+width+'.png'});
      await page.setViewportSize({width:844,height:390});
      assert(await page.locator('.map-card').evaluate(e=>e.getBoundingClientRect().height>200));
      assert(await page.getByRole('button',{name:'Close full screen',exact:true}).isVisible());
      await page.getByRole('button',{name:'Close full screen',exact:true}).click();
      assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
      assert.equal(await page.locator('.side-panel').evaluate(e=>e.inert),false);
      await page.setViewportSize({width,height:844});
      await page.getByRole('button',{name:'Full-screen map',exact:true}).click();
      await page.keyboard.press('Escape');
      assert.equal(await map.evaluate(e=>e.classList.contains('is-expanded')),false);
      assert.deepEqual(errors,[]);
      console.log('PASS '+width+'px: full viewport, reset-on-open, zoom, category, stall popup, retained scroll lock, landscape, close and Escape.');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
