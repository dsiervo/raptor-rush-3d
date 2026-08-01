from pathlib import Path
import re

VERSION = '20260801-3d3'

loader = Path('game.js')
text = loader.read_text(encoding='utf-8')
text = re.sub(r"const version = '[^']+';", f"const version = '{VERSION}';", text)
loader.write_text(text, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
html = re.sub(r'game\.js\?v=[^"\']+', f'game.js?v={VERSION}', html)
html = re.sub(r'hd-procedural\.css\?v=[^"\']+', f'hd-procedural.css?v={VERSION}', html)
index.write_text(html, encoding='utf-8')
