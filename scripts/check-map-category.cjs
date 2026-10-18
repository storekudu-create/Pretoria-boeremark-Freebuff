const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge'});try{
for(const width of [360,390]){
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');
 await page.locator('[data-stall-key]').first().waitFor();
 const categories=await page.locator('#category-filter option').evaluateAll(es=>es.map(e=>e.value).filter(v=>v!=='all'));
 for(const category of categories){
  await page.locator('.zoom-controls button').first().click();
  await page.locator('#category-filter').selectOption(category);
  await page.waitForFunction(()=>document.querySelector('.category-highlight-layer'));
  const data=await page.evaluate(()=>{
   const svg=document.querySelector('.map-viewport svg');const layer=document.querySelector('.category-highlight-layer');
   const keys=[...document.querySelectorAll('.is-category-match')].map(e=>e.dataset.stallKey).sort();
   const markers=[...layer.children];
   return {keys,markers:markers.map(e=>e.dataset.highlightKey).sort(),last:svg.lastElementChild===layer,view:svg.getAttribute('viewBox'),toolbar:document.querySelector('.map-category-toolbar').getBoundingClientRect().top,visible:markers.every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}),aligned:markers.every(e=>{const a=e.querySelector('.category-highlight-fill').getBoundingClientRect();const target=[...document.querySelectorAll('[data-stall-key]')].find(t=>t.dataset.stallKey===e.dataset.highlightKey);const b=target.querySelector('rect').getBoundingClientRect();return Math.abs(a.x-b.x)<1&&Math.abs(a.y-b.y)<1&&Math.abs(a.width-b.width)<1}),animation:getComputedStyle(markers[0]).animationName,stroke:getComputedStyle(markers[0].querySelector('.category-highlight-fill')).strokeWidth};
  });
  assert(data.keys.length>0);assert.deepEqual(data.markers,data.keys);assert(data.last);assert.equal(data.view,'0 0 1044 1507');assert(data.visible,category+' has offscreen highlights');assert(data.aligned,category+' misaligned');assert.equal(data.animation,'category-blue-pulse');assert.equal(data.stroke,'3px');
 }
 await page.locator('#category-filter').selectOption('coffee');
 const marker=page.locator('.category-highlight-marker').first();
 const opacity1=await marker.evaluate(e=>getComputedStyle(e).opacity);
 await page.waitForTimeout(350);
 const opacity2=await marker.evaluate(e=>getComputedStyle(e).opacity);
 assert.notEqual(opacity1,opacity2,'Overlay must visibly pulse over time');

 const key=await marker.getAttribute('data-highlight-key');
 await page.locator('[data-stall-key="'+key+'"]').tap();
 await page.waitForFunction(()=>document.querySelector('dialog').open);
 await page.locator('.stall-details-toolbar button').click();
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await marker.evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await marker.evaluate(e=>getComputedStyle(e).opacity),'1');
 await page.locator('#category-filter').selectOption('all');
 await page.waitForFunction(()=>!document.querySelector('.category-highlight-marker'));
 assert.deepEqual(errors,[]);
 await page.close();console.log('PASS '+width+'px: all 11 categories, exact target keys, every overlay on-screen and aligned, topmost layer, real opacity animation, zoom reset, touch selection, clear filter, reduced motion.');
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
