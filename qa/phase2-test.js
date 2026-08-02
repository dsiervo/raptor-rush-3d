const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__RAPTOR_GAME__?.state === 'home');

  const assets = await page.evaluate(() => window.__RAPTOR_GAME__.assets);
  assert(assets.jungle.width >= 1600 && assets.jungle.height >= 900, `jungle background too small: ${JSON.stringify(assets.jungle)}`);
  assert(assets.desert.width >= 1600 && assets.desert.height >= 900, `desert background too small: ${JSON.stringify(assets.desert)}`);
  assert.deepEqual(assets.obstacles, { width: 1152, height: 768 });
  assert.deepEqual(assets.ptero, { width: 1152, height: 384 });

  await page.evaluate(() => { window.__RAPTOR_GAME__.start(); window.__RAPTOR_GAME__.skipTutorial(); });
  await page.waitForTimeout(150);
  let visual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  assert(visual.track.bottomWidth >= 380, `track too narrow: ${visual.track.bottomWidth}`);
  const centers = visual.track.laneCenters;
  assert(Math.abs((centers[1]-centers[0])-(centers[2]-centers[1])) < 1, `unequal lane spacing: ${centers}`);
  assert(visual.track.laneWidth >= 120, `lane too narrow: ${visual.track.laneWidth}`);
  assert(visual.background.naturalWidth >= 1600, 'background is not high resolution');

  await page.evaluate(() => {
    window.__RAPTOR_GAME__.clear();
    window.__RAPTOR_GAME__.forceObstacle('boulder', -1, 10);
    window.__RAPTOR_GAME__.forceObstacle('log', 0, 10);
    window.__RAPTOR_GAME__.forceObstacle('thorn', 1, 10);
  });
  await page.waitForTimeout(120);
  visual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  assert.equal(visual.obstacles.length, 3);
  for (const o of visual.obstacles) {
    assert(o.ratio <= 1.02, `${o.type} too wide for lane: ${o.ratio}`);
    assert(o.rect.x >= -2 && o.rect.x + o.rect.width <= 392, `${o.type} outside screen: ${JSON.stringify(o.rect)}`);
  }

  await page.evaluate(() => { window.__RAPTOR_GAME__.clear(); window.__RAPTOR_GAME__.forceObstacle('ptero', 0, 10); });
  const pteroFrames = new Set();
  for (let i=0; i<7; i++) {
    await page.waitForTimeout(95);
    const p = await page.evaluate(() => window.__RAPTOR_GAME__.visual.ptero);
    assert(p, 'pteranodon was not rendered');
    pteroFrames.add(p.frame);
    assert(p.altitude >= 130, `pteranodon too low: ${p.altitude}`);
    assert(p.centerY < p.groundY - 120, `pteranodon appears on ground: ${JSON.stringify(p)}`);
  }
  assert(pteroFrames.size >= 3, `pteranodon animation insufficient: ${[...pteroFrames]}`);

  await page.screenshot({ path: 'qa/phase2-mobile.png', fullPage: true });
  assert.equal(errors.length, 0, errors.join('\n'));
  const report = {
    viewport: '390x844',
    assets,
    track: visual.track,
    pteroFrames: [...pteroFrames],
    pteroAltitude: visual.ptero.altitude,
    errors: 0
  };
  require('fs').writeFileSync('qa/phase2-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
