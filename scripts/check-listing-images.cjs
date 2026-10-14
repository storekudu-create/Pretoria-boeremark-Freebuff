const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const width of [390, 1366]) {
      // Disposable storage only. Never attach to a user browser/profile.
      const context = await browser.newContext({ viewport: { width, height: 900 }, storageState: { cookies: [], origins: [] } });
      await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      await page.clock.setFixedTime(new Date('2026-10-14T12:00:00+02:00'));
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
      assert.equal(await page.evaluate(()=>localStorage.length),0);
      const imageData = await page.evaluate(() => {
        const canvas=document.createElement('canvas'); canvas.width=1800; canvas.height=1200;
        const c=canvas.getContext('2d');c.fillStyle='#245c44';c.fillRect(0,0,1800,1200);c.fillStyle='#ffd400';c.font='bold 130px sans-serif';c.fillText('TEST IMAGE',240,600);
        return canvas.toDataURL('image/png').split(',')[1];
      });
      const payload={name:'test.png',mimeType:'image/png',buffer:Buffer.from(imageData,'base64')};
      await page.getByRole('button',{name:'EN',exact:true}).click();
      await page.getByRole('button',{name:'Administration',exact:true}).click();
      const key=await page.locator('#admin-stall option').evaluateAll(options=>options.find(o=>/^Stall 225(?:\s|$)/.test(o.textContent)).value);
      await page.locator('#admin-stall').selectOption(key);
      await page.locator('#business-name').fill('Image upload test');
      await page.locator('#stall-logo').setInputFiles(payload);
      await page.locator('.admin-image-preview.logo').waitFor();
      assert.equal(await page.locator('.admin-image-preview.logo').evaluate(e=>e.naturalWidth),400);
      await page.locator('#stall-special-image').setInputFiles(payload);
      await page.locator('.admin-image-preview.photo').waitFor();
      assert.equal(await page.locator('.admin-image-preview.photo').evaluate(e=>e.naturalWidth),1000);
      await page.locator('#stall-logo').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});
      await page.getByRole('alert').filter({hasText:'valid JPG'}).waitFor();
      assert.equal(await page.locator('.admin-image-preview.logo').count(),1);
      await page.getByRole('button',{name:'Save listing',exact:true}).click();
      await page.reload();
      await page.getByRole('button',{name:'EN',exact:true}).click();
      await page.getByRole('button',{name:'Administration',exact:true}).click();
      await page.locator('#admin-stall').selectOption(key);
      assert.equal(await page.locator('.admin-image-preview').count(),2);
      await page.getByRole('button',{name:'Public map',exact:true}).click();

      await page.locator('#stall-search').fill('Image upload test');
      await page.getByRole('button',{name:'Search',exact:true}).click();
      const details=width<900?page.locator('dialog'):page.locator('.side-panel .selection-card');
      await details.locator('.stall-logo-image').waitFor();
      assert.equal(await details.locator('.stall-logo-image').evaluate(e=>e.naturalWidth),400);
      assert.equal(await details.locator('.special-photo img').evaluate(e=>e.naturalWidth),1000);
      if(width<900){await page.screenshot({path:'.tmp-image-popup.png'});await page.locator('.stall-details-toolbar button').click()}
      await page.getByRole('button',{name:'Administration',exact:true}).click();
      await page.locator('#admin-stall').selectOption(key);
      await page.locator('.listing-image-field').first().getByRole('button',{name:'Remove image'}).click();
      await page.locator('.listing-image-field').nth(1).getByRole('button',{name:'Remove image'}).click();
      await page.getByRole('button',{name:'Save listing',exact:true}).click();
      await page.locator('#admin-stall').selectOption({index:1});
      await page.locator('#admin-stall').selectOption(key);
      assert.equal(await page.locator('.admin-image-preview').count(),0);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log('PASS '+width+'px: logo/photo upload, resizing, invalid file rejection, persistence, public details, removal; disposable storage discarded.');
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
