from pathlib import Path
import re

GAME = Path('game.js')
INDEX = Path('index.html')
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


literal("const VERSION='20260802-phase2d';", "const VERSION='20260806-readability1';", 'version')
literal("const PTERO_FRAMES=['ptero0','ptero1','ptero_glide','ptero1'];", "const PTERO_BLEND_SPEED=4.6;", 'pteranodon frame constant')

regex(
    r"const obstacleDefs=\{.*?\n\};\nconst tutorialSteps=",
    """const obstacleDefs={
  boulder:{action:'up',sprite:'boulder',width:.92,heightScale:1},
  log:{action:'up',sprite:'log',width:.98,heightScale:1},
  thorn:{action:'up',sprite:'thorn',width:.96,heightScale:1},
  cactus:{action:'side',sprite:'cactus',width:.74,heightScale:2.35},
  fossil:{action:'up',sprite:'fossil',width:.96,heightScale:1},
  trex:{action:'side',sprite:'trex',width:1.32,heightScale:2.12},
  ptero:{action:'down',width:1.08,heightScale:1}
};
const tutorialSteps=""",
    'obstacle definitions',
)

regex(
    r"function drawLegacy\(.*?\nfunction drawFlightAsset",
    """function drawLegacy(name,x,y,targetWidth,opts={}){const r=SPRITES[name],im=images.atlas,dw=targetWidth,baseDh=CELL_H*(targetWidth/CELL_W),dh=baseDh*(opts.scaleY??1);ctx.save();ctx.translate(x,y);if(opts.rotate)ctx.rotate(opts.rotate);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;if(opts.shadow)ctx.filter='drop-shadow(0 8px 8px rgba(0,0,0,.4))';const anchorY=opts.anchorY??.95;ctx.drawImage(im,r[0]*ATLAS_SCALE,r[1]*ATLAS_SCALE,r[2]*ATLAS_SCALE,r[3]*ATLAS_SCALE,-dw/2,-dh*anchorY,dw,dh);ctx.restore();ctx.filter='none';ctx.globalAlpha=1;return{x:x-dw/2,y:y-dh*anchorY,width:dw,height:dh,source:name}}
function drawFlightAsset""",
    'legacy sprite renderer',
)

regex(
    r"function drawWorld\(\)\{.*?\nfunction playerImage",
    """function drawSideCue(x,y,laneWidth,alpha=.2){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#ff7a3d';ctx.beginPath();ctx.ellipse(x,y-3,laneWidth*.48,Math.max(4,laneWidth*.075),0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,236,171,.85)';ctx.lineWidth=Math.max(1.5,laneWidth*.018);for(const dir of[-1,1]){const cx=x+dir*laneWidth*.26;ctx.beginPath();ctx.moveTo(cx-dir*laneWidth*.08,y-8);ctx.lineTo(cx,y-3);ctx.lineTo(cx-dir*laneWidth*.08,y+2);ctx.stroke()}ctx.restore()}
function drawWorld(){visualDebug.obstacles=[];visualDebug.ptero=null;for(const o of[...obstacles].sort((a,b)=>b.z-a.z)){const p=perspective(o.z),x=w/2+o.lane*p.laneX,def=obstacleDefs[o.type],hitAlpha=o.hit?.45:1;if(o.type==='ptero'){const target=p.laneWidth*def.width,lift=130+p.laneWidth*1.18,bob=Math.sin(time*5.5+o.phase)*Math.max(1.5,p.laneWidth*.025),cy=p.y-lift+bob,wingPhase=time*PTERO_BLEND_SPEED+o.phase,mix=(Math.sin(wingPhase)+1)/2;drawShadow(x,p.y+2,p.laneWidth*.36,.12);const rect0=drawFlightAsset('ptero0',x,cy,target,{anchorY:.5,shadow:true,alpha:hitAlpha*(1-mix)}),rect1=drawFlightAsset('ptero1',x,cy,target,{anchorY:.5,shadow:true,alpha:hitAlpha*mix}),rect={x:rect0.x,y:rect0.y,width:rect0.width,height:rect0.height};visualDebug.ptero={frame:'smooth-blend',sources:['ptero0','ptero1'],mix:+mix.toFixed(3),alphaTotal:+((1-mix)+mix).toFixed(3),groundY:+p.y.toFixed(1),centerY:+cy.toFixed(1),bottomY:+(rect.y+rect.height).toFixed(1),bottomClearance:+(p.y-(rect.y+rect.height)).toFixed(1),rect,laneWidth:+p.laneWidth.toFixed(1),lane:o.lane};visualDebug.obstacles.push({type:o.type,action:def.action,lane:o.lane,rect,laneWidth:+p.laneWidth.toFixed(1),ratio:+(rect.width/p.laneWidth).toFixed(2),visualHeight:+rect.height.toFixed(1),source:'ptero0+ptero1'});continue}let target=p.laneWidth*def.width,drawX=x,drawY=p.y,rotation=0,source=def.sprite;if(def.action==='side')drawSideCue(x,p.y,p.laneWidth,o.hit?.08:.22);if(o.type==='trex'){const gait=time*5.2+o.phase,step=Math.sin(gait);drawX+=step*p.laneWidth*.035;drawY-=Math.abs(Math.cos(gait))*p.laneWidth*.025;rotation=step*.018;target*=1+Math.cos(gait*2)*.018;source='trex'}drawShadow(x,p.y+1,p.laneWidth*(o.type==='trex'?.76:.58),o.type==='trex'?.3:.18);const rect=drawLegacy(source,drawX,drawY,target,{anchorY:.95,shadow:true,alpha:hitAlpha,scaleY:def.heightScale??1,rotate:rotation});visualDebug.obstacles.push({type:o.type,action:def.action,lane:o.lane,rect,laneWidth:+p.laneWidth.toFixed(1),ratio:+(rect.width/p.laneWidth).toFixed(2),visualHeight:+rect.height.toFixed(1),source,animation:o.type==='trex'?'procedural-single-source':'static'})}}
function playerImage""",
    'world renderer',
)

regex(
    r"function drawPlayer\(\)\{.*?\nfunction draw\(\)",
    """function drawPlayer(){if(player.invuln>0&&Math.floor(player.invuln*12)%2===0){visualDebug.player=null;return}const vs=Math.min(w/390,h/844),near=trackAt(1),baseX=w/2+player.x*near.laneCenter,baseY=h*.925-player.y*h*.18;let sc=vs*.99;if(player.y>.05)sc*=1.02;if(player.slide>0)sc*=.98;const rf=Math.floor(time*11)%4,bob=player.y>0||player.slide>0||player.hurt>0||player.turnTimer>0?0:[0,-3,1,-2][rf]*vs,[col,row]=PLAYER_CELLS[playerImage()],dw=PLAYER_CELL*sc,dh=PLAYER_CELL*sc,rect={x:baseX-dw/2,y:baseY+bob-dh*.97,width:dw,height:dh};ctx.save();ctx.translate(baseX,baseY+bob);ctx.filter='drop-shadow(0 9px 9px rgba(0,0,0,.42))';ctx.drawImage(images.player,col*PLAYER_CELL,row*PLAYER_CELL,PLAYER_CELL,PLAYER_CELL,-dw/2,-dh*.97,dw,dh);ctx.restore();ctx.filter='none';visualDebug.player={rect,baseY:+baseY.toFixed(1),jumpY:+player.y.toFixed(3),frame:playerImage()}}
function draw()""",
    'player renderer',
)

literal(
    "window.__RAPTOR_GAME__={",
    "window.__RAPTOR_GAME__={get rules(){return Object.fromEntries(Object.entries(obstacleDefs).map(([type,d])=>[type,{action:d.action,width:d.width,heightScale:d.heightScale??1}]))},",
    'debug rules hook',
)

GAME.write_text(s, encoding='utf-8')

html = INDEX.read_text(encoding='utf-8')
html2, count = re.subn(r"game\.js\?v=[^\"']+", "game.js?v=20260806-readability1", html, count=1)
if count != 1:
    raise RuntimeError(f'index cache version: expected one match, found {count}')
INDEX.write_text(html2, encoding='utf-8')

print('Applied gameplay readability audit patch')
