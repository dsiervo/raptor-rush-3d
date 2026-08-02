const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__RAPTOR_GAME__?.state === 'home');

  const assets = await page.evaluate(() => window.__RAPTOR_GAME__.assets);
  assert(assets.atlas?.width > 0 && assets.atlas?.height > 0, 'obstacle atlas did not load');
  assert(assets.player?.width > 0 && assets.player?.height > 0, 'player atlas did not load');
  assert.deepEqual(assets.ptero0, { width: 512, height: 384 });
  assert.deepEqual(assets.ptero1, { width: 512, height: 384 });

  await page.evaluate(() => {
    window.__RAPTOR_GAME__.start();
    window.__RAPTOR_GAME__.skipTutorial();
  });
  await page.waitForTimeout(180);

  let visual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  assert.equal(visual.background.procedural, true, 'background is not resolution-independent');
  assert(visual.background.backingWidth >= 780, `canvas backing width too low: ${visual.background.backingWidth}`);
  assert(visual.background.backingHeight >= 1688, `canvas backing height too low: ${visual.background.backingHeight}`);
  assert(visual.track.bottomWidth >= 380, `track too narrow: ${visual.track.bottomWidth}`);
  assert(visual.track.laneWidth >= 120, `lane too narrow: ${visual.track.laneWidth}`);
  const centers = visual.track.laneCenters;
  assert(Math.abs((centers[1] - centers[0]) - (centers[2] - centers[1])) < 1, `unequal lane spacing: ${centers}`);

  const firstDashOffset = visual.track.dashOffset;
  await page.waitForTimeout(120);
  visual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  const secondDashOffset = visual.track.dashOffset;
  assert.equal(visual.track.dashDirection, 'toward-player', 'lane markers are not configured to move toward the player');
  assert(firstDashOffset < 0 && secondDashOffset < 0, `lane dash offsets must be negative: ${firstDashOffset}, ${secondDashOffset}`);
  assert(secondDashOffset < firstDashOffset, `lane markers moved toward the horizon: ${firstDashOffset} -> ${secondDashOffset}`);

  await page.evaluate(() => {
    window.__RAPTOR_GAME__.clear();
    window.__RAPTOR_GAME__.forceObstacle('boulder', -1, 10);
    window.__RAPTOR_GAME__.forceObstacle('log', 0, 10);
    window.__RAPTOR_GAME__.forceObstacle('thorn', 1, 10);
  });
  await page.waitForTimeout(140);
  visual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  assert.equal(visual.obstacles.length, 3, `expected 3 obstacles, got ${visual.obstacles.length}`);
  const obstacleRatios = [];
  for (const obstacle of visual.obstacles) {
    assert(obstacle.ratio <= 1.02, `${obstacle.type} too wide for its lane: ${obstacle.ratio}`);
    assert(obstacle.rect.x >= -2, `${obstacle.type} begins outside viewport: ${JSON.stringify(obstacle.rect)}`);
    assert(obstacle.rect.x + obstacle.rect.width <= 392, `${obstacle.type} ends outside viewport: ${JSON.stringify(obstacle.rect)}`);
    obstacleRatios.push({ type: obstacle.type, ratio: obstacle.ratio });
  }

  await page.evaluate(() => {
    window.__RAPTOR_GAME__.clear();
    window.__RAPTOR_GAME__.jump();
  });
  let maxJumpY = 0;
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(18);
    const y = await page.evaluate(() => window.__RAPTOR_GAME__.stats.y);
    maxJumpY = Math.max(maxJumpY, y);
  }
  assert(maxJumpY >= 0.55, `jump is too low to clear obstacles: ${maxJumpY}`);
  assert(maxJumpY <= 0.9, `jump still looks unrealistically high: ${maxJumpY}`);
  const jumpPixels = maxJumpY * 844 * 0.18;
  assert(jumpPixels <= 140, `rendered jump displacement is too high: ${jumpPixels}`);
  await page.waitForFunction(() => window.__RAPTOR_GAME__.stats.y === 0, null, { timeout: 2000 });

  await page.evaluate(() => {
    window.__RAPTOR_GAME__.clear();
    window.__RAPTOR_GAME__.forceObstacle('ptero', 0, 18);
  });
  const pteroFrames = new Set();
  let ptero;
  let minClearance = Infinity;
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(60);
    ptero = await page.evaluate(() => window.__RAPTOR_GAME__.visual.ptero);
    assert(ptero, 'pteranodon was not rendered while approaching the player');
    pteroFrames.add(ptero.frame);
    minClearance = Math.min(minClearance, ptero.clearance);
    assert(ptero.clearance >= 145, `pteranodon appears too close to the ground: ${JSON.stringify(ptero)}`);
    assert(ptero.rect.y + ptero.rect.height <= ptero.groundY - 145, `pteranodon sprite reaches the ground plane: ${JSON.stringify(ptero)}`);
  }
  assert(pteroFrames.size >= 3, `pteranodon animation showed only: ${[...pteroFrames]}`);
  assert(![...pteroFrames].some(frame => frame === 'ptero_up' || frame === 'ptero_mid'), `old vertical pteranodon frames remain: ${[...pteroFrames]}`);

  await page.screenshot({ path: 'qa/phase2-mobile.png' });
  assert.equal(errors.length, 0, errors.join('\n'));

  const finalVisual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  const report = {
    viewport: '390x844@2x',
    assets,
    background: finalVisual.background,
    track: {
      ...finalVisual.track,
      testedOffsets: [firstDashOffset, secondDashOffset]
    },
    obstacleRatios,
    jump: {
      maxY: +maxJumpY.toFixed(2),
      displacementPx: +jumpPixels.toFixed(1)
    },
    pteranodon: {
      frames: [...pteroFrames],
      minimumClearance: minClearance,
      groundY: ptero.groundY,
      centerY: ptero.centerY
    },
    errors: 0
  };
  fs.writeFileSync('qa/phase2-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
