// Usage: node scripts/capture-water.mjs [local site URL] [output directory]
// Append --spector to also export an inspectable WebGL frame.
// Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to reuse an existing Chromium.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const url=process.argv[2] ?? 'http://127.0.0.1:5173';
const output=process.argv[3] ?? join(tmpdir(),'yeahayat-water-frames');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args:['--enable-unsafe-swiftshader']
});

try {
  if (process.argv.includes('--spector')) {
    const page=await browser.newPage({viewport:{width:960,height:640}});
    // Insert the inspector after <head> exists but before Vite mounts WebGL.
    // Only this isolated test page receives the inspection bundle.
    await page.route('**/__water-inspection/spector.js',route=>
      route.fulfill({path:createRequire(import.meta.url).resolve('spectorjs'),contentType:'text/javascript'}));
    await page.route(new URL('/',url).href,async route=>{
      const response=await route.fetch();
      const body=(await response.text()).replace('<head>','<head><script src="/__water-inspection/spector.js"></script><script>window.waterInspector=new SPECTOR.Spector();window.waterInspector.spyCanvases()</script>');
      await route.fulfill({response,body});
    });
    await page.goto(url);
    await page.locator('.water-art canvas').waitFor();
    await page.waitForFunction(()=>Boolean(window.waterInspector));
    await page.waitForTimeout(400);
    await page.evaluate(()=>{
      window.waterInspector.onCapture.add(capture=>{window.waterFrame=capture;});
      window.waterInspector.captureCanvas(document.querySelector('.water-art canvas'));
    });
    await page.mouse.move(240,300);
    await page.waitForFunction(()=>window.waterFrame?.commands?.length>0);
    const captured=await page.evaluate(()=>JSON.stringify(window.waterFrame));
    await writeFile(join(output,'water-webgl.json'),captured);
    await page.close();
  }
  for (const [width,height] of [[1280,760],[390,844]]) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const cdp=await page.context().newCDPSession(page);
    async function frame(name) {
      const {data}=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:90});
      await writeFile(join(output,width+'-'+name+'.jpg'),Buffer.from(data,'base64'));
    }
    async function scrollHero(progress) {
      await page.locator('.water-track').evaluate((el,p)=>{
        scrollTo({top:el.offsetTop+p*(el.offsetHeight-el.querySelector('.water-frame').clientHeight),behavior:'instant'});
      },progress);
      await page.clock.runFor(600);
    }
    await page.goto(url);
    await page.locator('.water-art canvas').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.clock.install({time:new Date('2026-01-01T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
    await page.clock.runFor(120);
    await frame('01-word');
    await scrollHero(.82);
    await page.evaluate(()=>window.addEventListener('water-splash',()=>document.documentElement.dataset.testImpact='1',{once:true}));
    for(const [x,y] of (width>700?[[.28,.48],[.17,.50],[.16,.42],[.31,.46]]:[[.45,.27],[.29,.27],[.62,.27],[.36,.29]])) {
      await page.mouse.click(width*x,height*y);
      if(await page.evaluate(()=>document.documentElement.dataset.testImpact==='1'))break;
    }
    assert(await page.evaluate(()=>document.documentElement.dataset.testImpact==='1'),'H was not hit');
    await page.clock.runFor(105);
    await frame('02-H-impact');
    await scrollHero(.98);
    await frame('03-handoff');
    await page.clock.resume();
    const book=page.locator('.archive-entry:not([hidden]) .water-book');
    await book.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.water-book')?.dataset.bookModel==='folio');
    await book.click();
    await page.waitForTimeout(2150);
    await frame('04-open-folio');
    await page.locator('.sun-levels button').first().click();
    for(const i of [0,1])await page.locator('.sun-socket').nth(i).click();
    await page.locator('.sun-board[data-solved=true]').waitFor();
    await page.locator('#contact-horizon').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-innerHeight*.45,behavior:'instant'}));
    await page.waitForTimeout(600);
    await frame('05-lake');
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(width+'px verified');
  }
} finally { await browser.close(); }
