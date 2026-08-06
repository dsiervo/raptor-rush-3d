from pathlib import Path
import re

GAME = Path('game.js')
INDEX = Path('index.html')
READABILITY_TEST = Path('qa/gameplay-readability-test.js')
PHASE2_TEST = Path('qa/phase2-test.js')

s = GAME.read_text(encoding='utf-8')


def literal(old: str, new: str, label: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    s = s.replace(old, new, 1)


def regex(pattern: str, replacement: str, label: str) -> None:
    global s
    s2, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    s = s2


literal("const VERSION='20260806-readability1';", "const VERSION='20260806-readability2';", 'version')
literal(
    "const PTERO_BLEND_SPEED=4.6;",
    "const PTERO_BLEND_SPEED=5.4,PTERO_CELL_W=384,PTERO_CELL_H=256,PTERO_SEQUENCE=[0,1,2,1];",
    'Pteranodon constants',
)
literal(
    "trex:{action:'side',sprite:'trex',width:1.32,heightScale:2.12},",
    "trex:{action:'side',sprite:'trex',width:1.38,heightScale:2.45},",
    'T-rex scale',
)
literal(
    "ptero:{action:'down',width:1.08,heightScale:1}",
    "ptero:{action:'down',width:1.62,heightScale:1}",
    'Pteranodon scale',
)

regex(
    r"function loadAssets\(\)\{return Promise\.all\(\[.*?\]\)\}",
    "function loadAssets(){if(!window.__PTERO_SHEET_DATA__)return Promise.reject(new Error('Pteranodon sheet data missing'));return Promise.all([loadImage('atlas',`assets/game-atlas.avif?v=20260801-mega2`),loadImage('player',`assets/raptor-player.avif?v=20260801-phase1`),loadImage('pteroSheet',window.__PTERO_SHEET_DATA__)])}",
    'asset loader',
)

regex(
    r"function drawFlightAsset\(.*?\nfunction drawShadow",
    """function drawFlightAsset(name,x,y,targetWidth,opts={}){const im=images[name],dw=targetWidth,dh=targetWidth*(im.height/im.width);ctx.save();ctx.translate(x,y);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;if(opts.shadow)ctx.filter='drop-shadow(0 8px 8px rgba(0,0,0,.36))';const anchorY=opts.anchorY??.52;ctx.drawImage(im,-dw/2,-dh*anchorY,dw,dh);ctx.restore();ctx.filter='none';ctx.globalAlpha=1;return{x:x-dw/2,y:y-dh*anchorY,width:dw,height:dh}}
function drawPteroSheetFrame(frame,x,y,targetWidth,opts={}){const im=images.pteroSheet,dw=targetWidth,dh=targetWidth*(PTERO_CELL_H/PTERO_CELL_W);ctx.save();ctx.translate(x,y);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;if(opts.shadow)ctx.filter='drop-shadow(0 8px 8px rgba(0,0,0,.42))';const anchorY=opts.anchorY??.5;ctx.drawImage(im,frame*PTERO_CELL_W,0,PTERO_CELL_W,PTERO_CELL_H,-dw/2,-dh*anchorY,dw,dh);ctx.restore();ctx.filter='none';ctx.globalAlpha=1;return{x:x-dw/2,y:y-dh*anchorY,width:dw,height:dh,source:'pteroSheet',frame}}
function drawShadow""",
    'Pteranodon sheet renderer',
)

regex(
    r"if\(o\.type==='ptero'\)\{.*?continue\}",
    """if(o.type==='ptero'){const target=p.laneWidth*def.width,lift=115+p.laneWidth*1.15,bob=Math.sin(time*5.5+o.phase)*Math.max(1.5,p.laneWidth*.025),cy=p.y-lift+bob,cycle=(time*PTERO_BLEND_SPEED+o.phase)%PTERO_SEQUENCE.length,step=Math.floor(cycle),frac=cycle-step,mix=frac*frac*(3-2*frac),frameA=PTERO_SEQUENCE[step],frameB=PTERO_SEQUENCE[(step+1)%PTERO_SEQUENCE.length];drawShadow(x,p.y+2,p.laneWidth*.42,.14);const rectA=drawPteroSheetFrame(frameA,x,cy,target,{anchorY:.5,shadow:true,alpha:hitAlpha*(1-mix)}),rectB=drawPteroSheetFrame(frameB,x,cy,target,{anchorY:.5,shadow:true,alpha:hitAlpha*mix}),rect={x:rectA.x,y:rectA.y,width:rectA.width,height:rectA.height};visualDebug.ptero={frame:'sheet-crossfade',source:'pteroSheet',frames:[frameA,frameB],mix:+mix.toFixed(3),alphaTotal:1,groundY:+p.y.toFixed(1),centerY:+cy.toFixed(1),bottomY:+(rect.y+rect.height).toFixed(1),bottomClearance:+(p.y-(rect.y+rect.height)).toFixed(1),rect,laneWidth:+p.laneWidth.toFixed(1),lane:o.lane};visualDebug.obstacles.push({type:o.type,action:def.action,lane:o.lane,rect,laneWidth:+p.laneWidth.toFixed(1),ratio:+(rect.width/p.laneWidth).toFixed(2),visualHeight:+rect.height.toFixed(1),source:'pteroSheet'});continue}""",
    'Pteranodon world renderer',
)

GAME.write_text(s, encoding='utf-8')

html = INDEX.read_text(encoding='utf-8')
replacement = """<script src="assets/ptero-sheet-part-0.js?v=20260806-readability2"></script>
<script src="assets/ptero-sheet-part-1.js?v=20260806-readability2"></script>
<script src="assets/ptero-sheet-part-2.js?v=20260806-readability2"></script>
<script src="assets/ptero-sheet-part-3.js?v=20260806-readability2"></script>
<script src="game.js?v=20260806-readability2"></script>"""
html2, count = re.subn(r'<script src="game\.js\?v=[^"]+"></script>', replacement, html, count=1)
if count != 1:
    raise RuntimeError(f'index scripts: expected one match, found {count}')
INDEX.write_text(html2, encoding='utf-8')

# Update the comprehensive audit for the normalized sheet and larger T-rex.
text = READABILITY_TEST.read_text(encoding='utf-8')
text = text.replace("  assert.deepEqual(assets.ptero0, { width: 512, height: 384 });\n  assert.deepEqual(assets.ptero1, { width: 512, height: 384 });", "  assert.deepEqual(assets.pteroSheet, { width: 1152, height: 256 });")
text = text.replace("playerHeight * 1.12", "playerHeight * 1.25")
text = text.replace("assert.equal(nearPtero.frame, 'smooth-blend');\n  assert.deepEqual(nearPtero.sources, ['ptero0', 'ptero1']);", "assert.equal(nearPtero.frame, 'sheet-crossfade');\n  assert.equal(nearPtero.source, 'pteroSheet');\n  assert.equal(nearPtero.frames.length, 2);")
text = text.replace("nearPtero.bottomClearance >= 210", "nearPtero.bottomClearance >= 190")
text = text.replace("assert.equal(p.frame, 'smooth-blend');\n    assert.deepEqual(p.sources, ['ptero0', 'ptero1']);", "assert.equal(p.frame, 'sheet-crossfade');\n    assert.equal(p.source, 'pteroSheet');\n    assert.equal(p.frames.length, 2);")
READABILITY_TEST.write_text(text, encoding='utf-8')

# Keep the legacy Phase 2 test aligned with the new visible sheet.
text = PHASE2_TEST.read_text(encoding='utf-8')
text = text.replace("  assert.deepEqual(assets.ptero0, { width: 512, height: 384 });\n  assert.deepEqual(assets.ptero1, { width: 512, height: 384 });", "  assert.deepEqual(assets.pteroSheet, { width: 1152, height: 256 });")
text = text.replace("assert.equal(ptero.frame, 'smooth-blend');\n    assert.deepEqual(ptero.sources, ['ptero0', 'ptero1']);", "assert.equal(ptero.frame, 'sheet-crossfade');\n    assert.equal(ptero.source, 'pteroSheet');\n    assert.equal(ptero.frames.length, 2);")
text = text.replace("ptero.bottomClearance >= 210", "ptero.bottomClearance >= 190")
text = text.replace("      sources: ptero.sources,", "      source: ptero.source,\n      frames: ptero.frames,")
PHASE2_TEST.write_text(text, encoding='utf-8')

print('Integrated normalized visible Pteranodon sheet and enlarged T-rex')
