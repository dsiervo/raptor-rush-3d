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
  assert(assets.atlas?.width > 0, 'obstacle atlas failed to load');
  assert(assets.player?.width > 0, 'player atlas failed to load');
  assert.deepEqual(assets.pteroSheet, { width: 1152, height: 256 });

  const rules = await page.evaluate(() => window.__RAPTOR_GAME__.rules);
  assert.equal(rules.trex.action, 'side');
  assert.equal(rules.cactus.action, 'side');
  assert.equal(rules.ptero.action, 'down');
  assert.equal(rules.fossil.action, 'up', 'low fossil pile should be jumpable, not a side-only blocker');
  for (const type of ['boulder', 'log', 'thorn', 'fossil']) assert.equal(rules[type].action, 'up');

  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear();
  });
  await page.waitForTimeout(150);

  // Measure the real jump arc.
  await page.evaluate(() => window.__RAPTOR_GAME__.jump());
  let maxJumpY = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(25);
    const y = await page.evaluate(() => window.__RAPTOR_GAME__.stats.y);
    maxJumpY = Math.max(maxJumpY, y);
  }
  assert(maxJumpY <= .78, `jump is still too high: ${maxJumpY}`);

  // Inspect jumpable obstacles, then freeze before collision for clean evidence.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear();
    g.forceObstacle('boulder', -1, 12);
    g.forceObstacle('log', 0, 12);
    g.forceObstacle('thorn', 1, 12);
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => window.__RAPTOR_GAME__.pause());
  let visual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  assert.equal(visual.obstacles.length, 3);
  for (const obstacle of visual.obstacles) {
    assert(obstacle.rect.x >= -3, `${obstacle.type} starts outside viewport`);
    assert(obstacle.rect.x + obstacle.rect.width <= 393, `${obstacle.type} ends outside viewport`);
    assert(obstacle.ratio <= 1.03, `${obstacle.type} is too wide for its lane`);
  }
  await page.screenshot({ path: 'qa/readability-jump-obstacles.png' });

  // Tall side hazards must look unjumpable at close range.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear();
    g.forceObstacle('cactus', -1, 10);
    g.forceObstacle('trex', 0, 10);
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => window.__RAPTOR_GAME__.pause());
  visual = await page.evaluate(() => window.__RAPTOR_GAME__.visual);
  const playerHeight = visual.player.rect.height;
  const cactus = visual.obstacles.find(o => o.type === 'cactus');
  const trex = visual.obstacles.find(o => o.type === 'trex');
  assert(cactus && trex, 'side hazards were not rendered');
  assert(cactus.action === 'side' && trex.action === 'side');
  assert(cactus.visualHeight >= 145, `cactus still looks jumpable: ${cactus.visualHeight}px`);
  assert(trex.visualHeight >= playerHeight * 1.25, `T-rex is not visibly larger than the raptor: ${trex.visualHeight} vs ${playerHeight}`);
  assert.equal(trex.source, 'trex', 'T-rex switched to a different character asset');
  assert.equal(trex.animation, 'procedural-single-source');
  await page.screenshot({ path: 'qa/readability-side-hazards.png' });

  // Observe the same T-rex source for a longer approach without letting it leave the world.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear(); g.forceObstacle('trex', 0, 30);
  });
  const trexSources = new Set();
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(55);
    const current = await page.evaluate(() => window.__RAPTOR_GAME__.visual.obstacles.find(o => o.type === 'trex'));
    assert(current, 'T-rex disappeared during approach');
    trexSources.add(current.source);
  }
  assert.deepEqual([...trexSources], ['trex'], `T-rex used inconsistent sources: ${[...trexSources]}`);

  // A jump must not bypass a side-only T-rex.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear(); g.jump();
  });
  await page.waitForFunction(() => window.__RAPTOR_GAME__.stats.y > .52);
  const livesBeforeTrexJump = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  await page.evaluate(() => window.__RAPTOR_GAME__.forceObstacle('trex', 0, 4));
  await page.waitForTimeout(130);
  const livesAfterTrexJump = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  assert.equal(livesAfterTrexJump, livesBeforeTrexJump - 1, 'jumping incorrectly avoided the T-rex');

  // Moving sideways must avoid it.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear(); g.right();
  });
  await page.waitForTimeout(180);
  const livesBeforeDodge = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  await page.evaluate(() => window.__RAPTOR_GAME__.forceObstacle('trex', 0, 4));
  await page.waitForTimeout(130);
  const livesAfterDodge = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  assert.equal(livesAfterDodge, livesBeforeDodge, 'sideways dodge did not avoid the T-rex');

  // The fossil now matches its low silhouette and can be jumped.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear(); g.jump();
  });
  await page.waitForFunction(() => window.__RAPTOR_GAME__.stats.y > .52);
  const livesBeforeFossil = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  await page.evaluate(() => window.__RAPTOR_GAME__.forceObstacle('fossil', 0, 4));
  await page.waitForTimeout(130);
  const livesAfterFossil = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  assert.equal(livesAfterFossil, livesBeforeFossil, 'jumping did not clear the fossil pile');

  // Freeze a close Pteranodon to measure its visible clearance above the ground.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear(); g.forceObstacle('ptero', 0, 10);
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => window.__RAPTOR_GAME__.pause());
  const nearPtero = await page.evaluate(() => window.__RAPTOR_GAME__.visual.ptero);
  assert(nearPtero, 'close Pteranodon was not rendered');
  assert(nearPtero.bottomClearance >= 200, `Pteranodon is still too close to the ground: ${nearPtero.bottomClearance}px`);
  assert.equal(nearPtero.frame, 'sheet-crossfade');
  assert.equal(nearPtero.source, 'pteroSheet');
  assert.equal(nearPtero.frames.length, 2);
  assert(Math.abs(nearPtero.alphaTotal - 1) < .001, `Pteranodon opacity gap: ${nearPtero.alphaTotal}`);
  await page.evaluate(rect => {
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d');
    const scale = canvas.width / innerWidth;
    const x = Math.max(0, Math.floor(rect.x * scale));
    const y = Math.max(0, Math.floor(rect.y * scale));
    const width = Math.min(canvas.width - x, Math.max(1, Math.ceil(rect.width * scale)));
    const height = Math.min(canvas.height - y, Math.max(1, Math.ceil(rect.height * scale)));
    window.__PTERO_TEST_REGION__ = { x, y, width, height, pixels: Array.from(context.getImageData(x, y, width, height).data) };
  }, nearPtero.rect);
  await page.screenshot({ path: 'qa/readability-pteranodon.png' });
  await page.evaluate(() => window.__RAPTOR_GAME__.clear());
  await page.waitForTimeout(50);
  const pteroVisibility = await page.evaluate(() => {
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d');
    const before = window.__PTERO_TEST_REGION__;
    const after = context.getImageData(before.x, before.y, before.width, before.height).data;
    let changedPixels = 0;
    let totalDifference = 0;
    for (let i = 0; i < after.length; i += 4) {
      const pixelDifference = Math.abs(after[i] - before.pixels[i]) + Math.abs(after[i + 1] - before.pixels[i + 1]) + Math.abs(after[i + 2] - before.pixels[i + 2]);
      totalDifference += pixelDifference;
      if (pixelDifference > 45) changedPixels++;
    }
    return { changedPixels, totalDifference };
  });
  assert(pteroVisibility.changedPixels >= 500, `Pteranodon is not visibly rendered: ${JSON.stringify(pteroVisibility)}`);
  assert(pteroVisibility.totalDifference >= 50000, `Pteranodon visual contrast is too weak: ${JSON.stringify(pteroVisibility)}`);

  // Sample a longer flight path to ensure continuous animation and no flashing/disappearance.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear(); g.forceObstacle('ptero', 0, 38);
  });
  const pteroMixes = [];
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(55);
    const p = await page.evaluate(() => window.__RAPTOR_GAME__.visual.ptero);
    assert(p, 'Pteranodon disappeared during its approach');
    assert.equal(p.frame, 'sheet-crossfade');
    assert.equal(p.source, 'pteroSheet');
    assert.equal(p.frames.length, 2);
    assert(Math.abs(p.alphaTotal - 1) < .001, `Pteranodon opacity gap: ${p.alphaTotal}`);
    pteroMixes.push(p.mix);
  }
  assert(new Set(pteroMixes.map(v => v.toFixed(2))).size >= 5, 'Pteranodon wing blend is not animated');

  // Standing must collide; sliding must pass underneath.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear();
  });
  const livesBeforePtero = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  await page.evaluate(() => window.__RAPTOR_GAME__.forceObstacle('ptero', 0, 4));
  await page.waitForTimeout(130);
  const livesAfterPtero = await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives);
  assert.equal(livesAfterPtero, livesBeforePtero - 1, 'standing incorrectly passed under the Pteranodon');

  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.start(); g.skipTutorial(); g.clear(); g.slide(); g.forceObstacle('ptero', 0, 4);
  });
  await page.waitForTimeout(130);
  assert.equal(await page.evaluate(() => window.__RAPTOR_GAME__.stats.lives), 5, 'sliding did not avoid the Pteranodon');

  // Victory path still works after the visual changes.
  await page.evaluate(() => {
    const g = window.__RAPTOR_GAME__;
    g.clear(); g.forceGoal();
  });
  await page.waitForFunction(() => window.__RAPTOR_GAME__.state === 'won');

  assert.equal(errors.length, 0, errors.join('\n'));
  const report = {
    viewport: '390x844@2x',
    assets,
    rules,
    jump: { maxY: +maxJumpY.toFixed(3) },
    sideHazards: {
      cactusHeight: cactus.visualHeight,
      trexHeight: trex.visualHeight,
      playerHeight: +playerHeight.toFixed(1),
      trexSources: [...trexSources]
    },
    pteranodon: {
      nearBottomClearance: nearPtero.bottomClearance,
      samples: pteroMixes.length,
      distinctBlendValues: new Set(pteroMixes.map(v => v.toFixed(2))).size,
      alphaTotal: 1,
      visibleChangedPixels: pteroVisibility.changedPixels,
      visibleTotalDifference: pteroVisibility.totalDifference
    },
    collisionSemantics: {
      trexCannotBeJumped: true,
      trexCanBeDodgedSideways: true,
      fossilCanBeJumped: true,
      pteranodonRequiresSlide: true
    },
    victory: true,
    errors: 0
  };
  fs.writeFileSync('qa/gameplay-readability-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
