const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge'});try{for(const width of [390,1366]){
 const p=await b.newPage({viewport:{width,height:900},hasTouch:width<900});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await p.locator('[data-stall-key]').first().waitFor();
 await p.locator('#category-filter').selectOption('coffee');
 const check=async()=>{const yellow=p.locator('.is-selected-highlight');assert.equal(await yellow.count(),1);assert.equal(await yellow.locator('.category-highlight-fill').evaluate(e=>getComputedStyle(e).stroke),'rgb(255, 212, 0)');assert.equal(await yellow.evaluate(e=>getComputedStyle(e).animationName),'selected-border-glow');assert(await yellow.evaluate(e=>e.parentElement.lastElementChild===e));return await yellow.getAttribute('data-highlight-key')};
 await p.locator('.result-item').first().click();
 if(width<900){await p.waitForFunction(()=>document.querySelector('dialog').open);await p.locator('.stall-details-toolbar button').click()}
 const first=await check();
 assert.equal(await p.locator('[data-stall-key].is-selected').getAttribute('data-stall-key'),first);
 const glow=p.locator('.is-selected-highlight');const before=await glow.evaluate(e=>getComputedStyle(e).filter);await p.waitForTimeout(350);assert.notEqual(await glow.evaluate(e=>getComputedStyle(e).filter),before);
 assert(await p.locator('.category-highlight-marker:not(.is-selected-highlight)').count()>0);
 await p.locator('.result-item').nth(1).click();if(width<900){await p.waitForFunction(()=>document.querySelector('dialog').open);await p.locator('.stall-details-toolbar button').click()}
 const second=await check();assert.notEqual(first,second);
 await p.locator('[data-stall-key="'+first+'"]').click();if(width<900){await p.waitForFunction(()=>document.querySelector('dialog').open);await p.locator('.stall-details-toolbar button').click()}
 assert.equal(await check(),first);
 await p.locator('#category-filter').selectOption('all');assert.equal(await check(),first);assert.equal(await p.locator('.category-highlight-marker').count(),0);
 console.log('PASS '+width+'px: list and map share yellow animated topmost border, selecting another replaces it, other category matches stay blue, clearing category retains selection.');await p.close();
}}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
