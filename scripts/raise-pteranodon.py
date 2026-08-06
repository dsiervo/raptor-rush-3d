from pathlib import Path

for filename in ['game.js', 'index.html']:
    path = Path(filename)
    text = path.read_text(encoding='utf-8')
    if filename == 'game.js':
        old = "const VERSION='20260806-readability2';"
        if text.count(old) != 1:
            raise RuntimeError(f'{filename}: version match failed')
        text = text.replace(old, "const VERSION='20260806-readability3';", 1)
        old = "lift=115+p.laneWidth*1.15"
        if text.count(old) != 1:
            raise RuntimeError(f'{filename}: Pteranodon lift match failed')
        text = text.replace(old, "lift=135+p.laneWidth*1.18", 1)
    else:
        if '20260806-readability2' not in text:
            raise RuntimeError('index cache version not found')
        text = text.replace('20260806-readability2', '20260806-readability3')
    path.write_text(text, encoding='utf-8')

for filename in ['qa/gameplay-readability-test.js', 'qa/phase2-test.js']:
    path = Path(filename)
    text = path.read_text(encoding='utf-8')
    old = 'bottomClearance >= 190'
    if text.count(old) != 1:
        raise RuntimeError(f'{filename}: clearance assertion match failed: {text.count(old)}')
    path.write_text(text.replace(old, 'bottomClearance >= 200', 1), encoding='utf-8')

print('Raised Pteranodon flight path and updated cache/test thresholds')
