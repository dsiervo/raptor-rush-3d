const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__RAPTOR_GAME__?.state === 'home');
  await page.evaluate(() => {
    window.__RAPTOR_GAME__.start();
    window.__RAPTOR_GAME__.skipTutorial();
  });

  const frames = new Set();
  for (let index = 0; index < 10; index += 1) {
    await page.waitForTimeout(105);
    frames.add(await page.evaluate(() => window.__RAPTOR_GAME__.stats.playerFrame));
  }
  assert(frames.size >= 3, `Run cycle showed only: ${[...frames]}`);
  assert([...frames].every(frame => /^run[1-4]$/.test(frame)));

  await page.evaluate(() => window.__RAPTOR_GAME__.left());
  await page.waitForTimeout(45);
  assert.equal(await page.evaluate(() => window.__RAPTOR_GAME__.stats.playerFrame), 'turn_left');

  await page.waitForTimeout(320);
  await page.evaluate(() => window.__RAPTOR_GAME__.right());
  await page.waitForTimeout(45);
  assert.equal(await page.evaluate(() => window.__RAPTOR_GAME__.stats.playerFrame), 'turn_right');

  await page.waitForTimeout(320);
  await page.evaluate(() => window.__RAPTOR_GAME__.jump());
  await page.waitForTimeout(90);
  assert.equal(await page.evaluate(() => window.__RAPTOR_GAME__.stats.playerFrame), 'jump');

  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__RAPTOR_GAME__.slide());
  await page.waitForTimeout(45);
  assert.equal(await page.evaluate(() => window.__RAPTOR_GAME__.stats.playerFrame), 'slide');

  await page.waitForTimeout(950);
  await page.evaluate(() => window.__RAPTOR_GAME__.forceDamage());
  await page.waitForTimeout(45);
  assert.equal(await page.evaluate(() => window.__RAPTOR_GAME__.stats.playerFrame), 'hurt');

  assert.equal(errors.length, 0, errors.join('\n'));
  await page.screenshot({ path: '/tmp/phase1-mobile.png' });
  await browser.close();
  console.log(JSON.stringify({
    frames: [...frames],
    viewport: '390x844',
    left: 'ok',
    right: 'ok',
    jump: 'ok',
    slide: 'ok',
    hurt: 'ok',
    errors: 0,
  }));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
