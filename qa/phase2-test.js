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
  assert.deepEqual(assets.pteroSheet, { width: 1152, height: 256 });

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
    window.__RAPTOR_GAME__.forceObstacle('boulder', -1, 12);
    window.__RAPTOR_GAME__.forceObstacle('log', 0, 12);
    window.__RAPTOR_GAME__.forceObstacle('thorn', 1, 12);
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => window.__RAPTOR_GAME__.pause());
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
    window.__RAPTOR_GAME__.start();
    window.__RAPTOR_GAME__.skipTutorial();
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

  // Validate smooth Pteranodon blending over a full approach.
  await page.evaluate(() => {
    window.__RAPTOR_GAME__.clear();
    window.__RAPTOR_GAME__.forceObstacle('ptero', 0, 38);
  });
  const pteroMixes = [];
  let ptero;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(55);
    ptero = await page.evaluate(() => window.__RAPTOR_GAME__.visual.ptero);
    assert(ptero, 'Pteranodon was not rendered while approaching the player');
    assert.equal(ptero.frame, 'sheet-crossfade');
    assert.equal(ptero.source, 'pteroSheet');
    assert.equal(ptero.frames.length, 2);
    assert(Math.abs(ptero.alphaTotal - 1) < .001, `Pteranodon opacity gap: ${ptero.alphaTotal}`);
    pteroMixes.push(ptero.mix);
  }
  assert(new Set(pteroMixes.map(v => v.toFixed(2))).size >= 5, 'Pteranodon blend did not animate');

  // Measure close-range clearance separately and freeze before collision.
  await page.evaluate(() => {
    window.__RAPTOR_GAME__.start();
    window.__RAPTOR_GAME__.skipTutorial();
    window.__RAPTOR_GAME__.clear();
    window.__RAPTOR_GAME__.forceObstacle('ptero', 0, 10);
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => window.__RAPTOR_GAME__.pause());
  ptero = await page.evaluate(() => window.__RAPTOR_GAME__.visual.ptero);
  assert(ptero, 'close Pteranodon was not rendered');
  assert(ptero.bottomClearance >= 200, `Pteranodon appears too close to the ground: ${JSON.stringify(ptero)}`);

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
      mode: ptero.frame,
      source: ptero.source,
      frames: ptero.frames,
      minimumBottomClearance: ptero.bottomClearance,
      distinctBlendValues: new Set(pteroMixes.map(v => v.toFixed(2))).size,
      alphaTotal: ptero.alphaTotal,
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
