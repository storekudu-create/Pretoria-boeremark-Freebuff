const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge'});try{for(const width of [390,1366]){
 const context=await browser.newContext({viewport:{width,height:900},storageState:{cookies:[],origins:[]}});
 await context.route('**/*',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-18T12:00:00+02:00'));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4174');assert.equal(await page.evaluate(()=>localStorage.length),0);
 await page.getByRole('button',{name:'EN',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Full-screen map',exact:true}).isVisible(),width<901);
 if(width<901){await page.getByRole('button',{name:'Full-screen map',exact:true}).click();await page.setViewportSize({width:1366,height:900});await page.waitForFunction(()=>!document.querySelector('.map-explorer').classList.contains('is-expanded'));assert.equal(await page.evaluate(()=>document.body.style.overflow),'');await page.setViewportSize({width,height:900});}
 await page.getByRole('button',{name:'Administration',exact:true}).click();
 const key=await page.locator('#admin-stall').inputValue();
 await page.locator('#business-name').fill('Advertising regression stall');
 for(const name of ['Free listing','Featured','Saturday Special','Premium'])await page.getByRole('checkbox',{name,exact:true}).check();
 await page.locator('#featured-until').fill('2026-12-31');await page.locator('#stall-special').fill('Special test offer');
 await page.getByRole('button',{name:'Save listing',exact:true}).click();
 await page.getByRole('button',{name:'Public map',exact:true}).click();
 for(const id of ['premium','featured','saturday','free']){
  const section=page.locator('.advertising-'+id);await section.waitFor();
  const more=section.getByRole('button',{name:/Show all/});if(await more.count())await more.click();
  assert.equal(await section.locator('[data-ad-stall-key="'+key+'"]').count(),1,id+' must contain opted-in stall');
 }
 await page.locator('.advertising-premium [data-ad-stall-key="'+key+'"]').click();
 if(width<901){await page.waitForFunction(()=>document.querySelector('dialog').open);assert(await page.locator('dialog .premium-pill').isVisible());await page.locator('.stall-details-toolbar button').click();}
 assert.equal(await page.locator('.is-selected-highlight').getAttribute('data-highlight-key'),key);
 await page.getByRole('button',{name:'Administration',exact:true}).click();
 await page.locator('#featured-until').fill('2020-01-01');await page.getByRole('button',{name:'Save listing',exact:true}).click();await page.getByRole('button',{name:'Public map',exact:true}).click();
 const featured=page.locator('.advertising-featured');const more=featured.getByRole('button',{name:/Show all/});if(await more.count())await more.click();assert.equal(await featured.locator('[data-ad-stall-key="'+key+'"]').count(),0,'Expired featured must not appear');
 await page.getByRole('button',{name:'Administration',exact:true}).click();
 for(const name of ['Free listing','Featured','Saturday Special','Premium'])await page.getByRole('checkbox',{name,exact:true}).uncheck();
 await page.getByRole('button',{name:'Save listing',exact:true}).click();await page.getByRole('button',{name:'Public map',exact:true}).click();
 for(const more of await page.locator('.advertising-show-more').all())await more.click();
 assert.equal(await page.locator('[data-ad-stall-key="'+key+'"]').count(),0,'Opted-out stall must be removed');
 await page.clock.setFixedTime(new Date('2026-10-17T10:00:00+02:00'));await page.reload();await page.locator('.advertising-premium').waitFor();assert.equal(await page.locator('.advertising-saturday').count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await context.close();console.log('PASS '+width+'px: four admin-driven ad sections, show-all, selection, expiry, opt-out, Saturday cutoff, desktop full-screen hidden, phone full-screen retained and resize exits; disposable storage discarded.');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
