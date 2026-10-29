'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
async function main(){
 const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/v0.1/qa');fs.mkdirSync(out,{recursive:true});
 const launchOptions={headless:true};
 if(process.env.CEBENCH_CHROMIUM_PATH)launchOptions.executablePath=process.env.CEBENCH_CHROMIUM_PATH;
 const browser=await chromium.launch(launchOptions);
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'outputs/v0.1/CEBench-Live-v0.1.html')).href);
 await page.waitForFunction(()=>!!window.cebenchReport);
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),null);
 const broken=await page.evaluate(()=>Array.from(document.querySelectorAll('a[href^="#"]')).map(a=>a.getAttribute('href')).filter(h=>!document.getElementById(h.slice(1))));assert.deepEqual(broken,[]);
 await page.screenshot({path:path.join(out,'desktop-overview.png')});
 const inputs=page.locator('.score-table input');
 for(let i=0;i<await inputs.count();i++){if(await inputs.nth(i).isEnabled())await inputs.nth(i).fill('80');}
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),80);
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().eligible),false);
 await page.locator('.gate-field select').first().selectOption('fail');
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().status),'门槛失败');
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),80);
 await page.locator('#calculator').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(out,'desktop-calculator.png')});
 await inputs.nth(3).fill('');assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),null);
 await inputs.nth(3).fill('101');assert.match(await page.locator('#score-app [role="alert"]').textContent(),/0–100/);
 await inputs.nth(3).fill('80');await page.locator('#calc-profile').selectOption('live');
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),null);
 await page.getByRole('button',{name:'新建空白评价'}).click();
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),null);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'保存评价JSON'}).click();const dl=await downloadPromise;const downloaded=path.join(out,'round-trip-record.json');await dl.saveAs(downloaded);
 await page.locator('input[type=file]').setInputFiles(downloaded);
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),null);
 await page.locator('input[type=file]').setInputFiles(path.join(root,'data/raw-metric-template.json'));
 await page.waitForFunction(()=>cebenchReport.getRecord().calculation_source==='raw_metric_observations');
 assert.equal(await page.evaluate(()=>cebenchReport.getRecord().calculation_source),'raw_metric_observations');
 assert.equal(await page.evaluate(()=>cebenchReport.getResult().score),null);
 await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schema_version":"999"}')});
 await page.waitForFunction(()=>document.querySelector('#score-app [role="alert"]').textContent.includes('schema'));
 assert.match(await page.locator('#score-app [role="alert"]').textContent(),/schema/);
 await page.getByRole('button',{name:'新建空白评价'}).click();
 const widthChecks=[];
 for(const width of [390,320]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>window.scrollTo(0,0));
  widthChecks.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
  await page.screenshot({path:path.join(out,'mobile-'+width+'.png')});
 }
 for(const c of widthChecks) assert.ok(c.scroll<=c.width+1,JSON.stringify(c));
 assert.deepEqual(errors,[]);
 const result={page_errors:errors,broken_internal_links:broken,viewport_checks:widthChecks,calculator_cases:['blank is unmeasured','core weighted 80','severe failure retains diagnostic score','missing required dimension blocks total','out of range rejected','live requires missing time dimension','JSON save/import round trip','unsupported schema rejected'],claim:'UI and arithmetic verification only; not medical validity or browser interoperability certification'};
 fs.writeFileSync(path.join(out,'qa-results.json'),JSON.stringify(result,null,2));
 await browser.close();console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e);process.exit(1)});
