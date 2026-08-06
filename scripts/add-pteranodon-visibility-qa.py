from pathlib import Path

path = Path('qa/gameplay-readability-test.js')
text = path.read_text(encoding='utf-8')
old = "  await page.screenshot({ path: 'qa/readability-pteranodon.png' });"
new = """  await page.evaluate(rect => {
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
  assert(pteroVisibility.totalDifference >= 50000, `Pteranodon visual contrast is too weak: ${JSON.stringify(pteroVisibility)}`);"""
if text.count(old) != 1:
    raise RuntimeError(f'expected one Pteranodon screenshot marker, found {text.count(old)}')
text = text.replace(old, new, 1)
old_report = "      alphaTotal: 1\n"
new_report = "      alphaTotal: 1,\n      visibleChangedPixels: pteroVisibility.changedPixels,\n      visibleTotalDifference: pteroVisibility.totalDifference\n"
if text.count(old_report) != 1:
    raise RuntimeError(f'expected one Pteranodon report marker, found {text.count(old_report)}')
text = text.replace(old_report, new_report, 1)
path.write_text(text, encoding='utf-8')
print('Added pixel-level Pteranodon visibility regression test')
