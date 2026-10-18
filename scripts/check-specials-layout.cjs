const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge' });
 try {
  for (const width of [360, 390, 768, 1024, 1366]) {
   const page = await browser.newPage({ viewport: { width, height: 1000 } });
   await page.clock.setFixedTime(new Date('2026-10-18T12:00:00+02:00'));
   await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
   const section = page.locator('.today-specials-card');
   await section.waitFor();
   assert.equal(await section.locator('h2').innerText(), 'Saterdag Aanbiedinge / Saturdays Specials');
   const check = async () => {
    const problems = await section.locator('li > :is(button, div)').evaluateAll(cards => cards.flatMap((card, index) => {
      const r=card.getBoundingClientRect();
      return [...card.children].filter(child=>{
        const c=child.getBoundingClientRect();
        return c.left<r.left || c.right>r.right+1 || c.top<r.top || c.bottom>r.bottom+1 || child.scrollWidth>child.clientWidth+1;
      }).map(child=>index+': '+child.tagName);
    }));
    assert.deepEqual(problems, [], 'Card overflow at '+width);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   };
   await check();
   await page.getByRole('button',{name:'EN',exact:true}).click();
   assert.equal(await section.locator('h2').innerText(), 'Saterdag Aanbiedinge / Saturdays Specials');
   // Stress the live card structure without changing any saved data.
   await section.locator('strong').first().evaluate(e=>e.textContent='Extra-long product name: pancake and freshly brewed coffee breakfast combo');
   await section.locator('.special-card-photo-placeholder').first().evaluate(e=>{
     const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
     const context=canvas.getContext('2d');context.fillStyle='#245c44';context.fillRect(0,0,48,48);
     const img=document.createElement('img');img.className='special-card-thumbnail';img.src=canvas.toDataURL();img.alt='';e.replaceWith(img);
   });
   await check();
   if(width===390 || width===1366) await section.screenshot({path:'.tmp-specials-layout-'+width+'.png'});
   console.log('PASS '+width+'px: exact heading in AF/EN; icons, photos, long product names and stall labels stay within their individual cards.');
   await page.close();
  }
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
