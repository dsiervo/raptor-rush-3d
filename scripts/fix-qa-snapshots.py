from pathlib import Path

replacement = "await page.evaluate(() => { window.__RAPTOR_GAME__.pause(); document.getElementById('pause').classList.remove('visible'); });"
expected = {
    Path('qa/gameplay-readability-test.js'): 3,
    Path('qa/phase2-test.js'): 1,
}

for path, wanted in expected.items():
    text = path.read_text(encoding='utf-8')
    old = "await page.evaluate(() => window.__RAPTOR_GAME__.pause());"
    found = text.count(old)
    if found != wanted:
        raise RuntimeError(f'{path}: expected {wanted} pause captures, found {found}')
    path.write_text(text.replace(old, replacement), encoding='utf-8')

print('Updated QA screenshots to freeze gameplay without displaying the pause overlay')
