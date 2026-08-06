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


literal("const VERSION='20260806-readability3';", "const VERSION='20260806-readability4';", 'version')
literal(
    "const PTERO_BLEND_SPEED=5.4,PTERO_CELL_W=384,PTERO_CELL_H=256,PTERO_SEQUENCE=[0,1,2,1];",
    "const PTERO_FLAP_SPEED=7.2;",
    'Pteranodon constants',
)

regex(
    r"function loadAssets\(\)\{.*?\}",
    "function loadAssets(){return Promise.all([loadImage('atlas',`assets/game-atlas.avif?v=20260801-mega2`),loadImage('player',`assets/raptor-player.avif?v=20260801-phase1`)])}",
    'asset loader',
)

regex(
    r"function drawPteroSheetFrame\(.*?\nfunction drawShadow",
    """function drawPteranodonVector(x,y,targetWidth,phase,opts={}){const flap=Math.sin(phase),mix=(flap+1)/2,w=targetWidth,h=w*.56,wingY=-h*(.2+flap*.25),wingTipY=-h*(.28+flap*.42),alpha=opts.alpha??1;ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.rotate(Math.sin(phase*.45)*.022);const wingGradient=ctx.createLinearGradient(0,-h*.6,0,h*.2);wingGradient.addColorStop(0,'#d69b63');wingGradient.addColorStop(1,'#7d482f');ctx.fillStyle=wingGradient;ctx.strokeStyle='#3b241b';ctx.lineWidth=Math.max(1.5,w*.012);for(const dir of[-1,1]){ctx.beginPath();ctx.moveTo(dir*w*.04,-h*.08);ctx.quadraticCurveTo(dir*w*.23,wingY,dir*w*.5,wingTipY);ctx.quadraticCurveTo(dir*w*.39,h*.06,dir*w*.16,h*.14);ctx.quadraticCurveTo(dir*w*.09,h*.06,dir*w*.04,-h*.08);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='rgba(255,218,168,.58)';ctx.lineWidth=Math.max(1,w*.006);ctx.beginPath();ctx.moveTo(dir*w*.08,-h*.04);ctx.lineTo(dir*w*.44,wingTipY*.9);ctx.moveTo(dir*w*.12,h*.05);ctx.lineTo(dir*w*.36,wingTipY*.45);ctx.stroke();ctx.strokeStyle='#3b241b';ctx.lineWidth=Math.max(1.5,w*.012)}const bodyGradient=ctx.createLinearGradient(-w*.16,-h*.1,w*.22,h*.14);bodyGradient.addColorStop(0,'#b87845');bodyGradient.addColorStop(.6,'#6f402b');bodyGradient.addColorStop(1,'#3d281f');ctx.fillStyle=bodyGradient;ctx.beginPath();ctx.ellipse(0,0,w*.16,h*.19,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#875036';ctx.beginPath();ctx.moveTo(-w*.12,h*.03);ctx.lineTo(-w*.37,h*.15);ctx.lineTo(-w*.16,-h*.03);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#9c613d';ctx.beginPath();ctx.ellipse(w*.16,-h*.08,w*.095,h*.105,-.15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#d7a45f';ctx.beginPath();ctx.moveTo(w*.22,-h*.1);ctx.lineTo(w*.43,-h*.055);ctx.lineTo(w*.22,-h*.015);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#8d5135';ctx.beginPath();ctx.moveTo(w*.13,-h*.16);ctx.lineTo(w*.02,-h*.34);ctx.lineTo(w*.2,-h*.17);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f1d873';ctx.beginPath();ctx.arc(w*.19,-h*.105,Math.max(1.8,w*.012),0,Math.PI*2);ctx.fill();ctx.fillStyle='#17110e';ctx.beginPath();ctx.arc(w*.195,-h*.105,Math.max(1,w*.005),0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4d2b21';ctx.lineWidth=Math.max(1.5,w*.01);ctx.beginPath();ctx.moveTo(-w*.02,h*.12);ctx.lineTo(-w*.03,h*.28);ctx.moveTo(w*.055,h*.11);ctx.lineTo(w*.08,h*.27);ctx.stroke();ctx.restore();return{rect:{x:x-w*.52,y:y-h*.67,width:w*1.04,height:h*.98},mix:+mix.toFixed(3)}}
function drawShadow""",
    'vector Pteranodon renderer',
)

regex(
    r"if\(o\.type==='ptero'\)\{.*?continue\}",
    """if(o.type==='ptero'){const target=p.laneWidth*def.width,lift=135+p.laneWidth*1.18,bob=Math.sin(time*5.5+o.phase)*Math.max(1.5,p.laneWidth*.025),cy=p.y-lift+bob,phase=time*PTERO_FLAP_SPEED+o.phase;drawShadow(x,p.y+2,p.laneWidth*.42,.14);const rendered=drawPteranodonVector(x,cy,target,phase,{alpha:hitAlpha}),rect=rendered.rect;visualDebug.ptero={frame:'procedural-flight',source:'vector-pteranodon',frames:['continuous-wing-cycle'],mix:rendered.mix,alphaTotal:1,groundY:+p.y.toFixed(1),centerY:+cy.toFixed(1),bottomY:+(rect.y+rect.height).toFixed(1),bottomClearance:+(p.y-(rect.y+rect.height)).toFixed(1),rect,laneWidth:+p.laneWidth.toFixed(1),lane:o.lane};visualDebug.obstacles.push({type:o.type,action:def.action,lane:o.lane,rect,laneWidth:+p.laneWidth.toFixed(1),ratio:+(rect.width/p.laneWidth).toFixed(2),visualHeight:+rect.height.toFixed(1),source:'vector-pteranodon'});continue}""",
    'Pteranodon world renderer',
)

GAME.write_text(s, encoding='utf-8')

html = INDEX.read_text(encoding='utf-8')
html = re.sub(r'<script src="assets/ptero-sheet-part-[0-3]\.js\?v=[^"]+"></script>\n?', '', html)
html2, count = re.subn(r'game\.js\?v=[^"\']+', 'game.js?v=20260806-readability4', html, count=1)
if count != 1:
    raise RuntimeError(f'index game version: expected one match, found {count}')
INDEX.write_text(html2, encoding='utf-8')

for asset in Path('assets').glob('ptero-sheet-part-*.js'):
    asset.unlink()

text = READABILITY_TEST.read_text(encoding='utf-8')
text = text.replace("  assert.deepEqual(assets.pteroSheet, { width: 1152, height: 256 });\n", '')
text = text.replace("assert.equal(nearPtero.frame, 'sheet-crossfade');\n  assert.equal(nearPtero.source, 'pteroSheet');\n  assert.equal(nearPtero.frames.length, 2);", "assert.equal(nearPtero.frame, 'procedural-flight');\n  assert.equal(nearPtero.source, 'vector-pteranodon');\n  assert.deepEqual(nearPtero.frames, ['continuous-wing-cycle']);")
text = text.replace("assert.equal(p.frame, 'sheet-crossfade');\n    assert.equal(p.source, 'pteroSheet');\n    assert.equal(p.frames.length, 2);", "assert.equal(p.frame, 'procedural-flight');\n    assert.equal(p.source, 'vector-pteranodon');\n    assert.deepEqual(p.frames, ['continuous-wing-cycle']);")
READABILITY_TEST.write_text(text, encoding='utf-8')

text = PHASE2_TEST.read_text(encoding='utf-8')
text = text.replace("  assert.deepEqual(assets.pteroSheet, { width: 1152, height: 256 });\n", '')
text = text.replace("assert.equal(ptero.frame, 'sheet-crossfade');\n    assert.equal(ptero.source, 'pteroSheet');\n    assert.equal(ptero.frames.length, 2);", "assert.equal(ptero.frame, 'procedural-flight');\n    assert.equal(ptero.source, 'vector-pteranodon');\n    assert.deepEqual(ptero.frames, ['continuous-wing-cycle']);")
PHASE2_TEST.write_text(text, encoding='utf-8')

print('Replaced image-based Pteranodon with continuous vector animation')
