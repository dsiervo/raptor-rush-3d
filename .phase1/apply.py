from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


path = Path("game.js")
source = path.read_text()

source = replace_once(
    source,
    "};\nconst images={};",
    "};\nconst PLAYER_SPRITES={\n"
    " run1:[0,0,213,213],run2:[213,0,213,213],run3:[426,0,213,213],\n"
    " run4:[0,213,213,213],turn_left:[213,213,213,213],turn_right:[426,213,213,213],\n"
    " jump:[0,426,213,213],slide:[213,426,213,213],hurt:[426,426,213,213]\n"
    "};\nconst images={};",
    "player sprite map",
)
source = replace_once(
    source,
    "function loadAssets(){return loadImage('atlas','assets/game-atlas.avif?v=20260801-mega2')}",
    "function loadAssets(){return Promise.all([loadImage('atlas','assets/game-atlas.avif?v=20260801-mega2'),loadImage('player','assets/raptor-player.avif?v=20260801-phase1')])}",
    "asset loader",
)
old_player = "player={lane:0,x:0,y:0,vy:0,slide:0,hurt:0,invuln:0}"
new_player = "player={lane:0,x:0,y:0,vy:0,slide:0,hurt:0,invuln:0,turnTimer:0,turnDir:0}"
if source.count(old_player) != 2:
    raise SystemExit(f"player state: expected 2 matches, found {source.count(old_player)}")
source = source.replace(old_player, new_player)
source = replace_once(
    source,
    "function move(dir){if(!['running','tutorial'].includes(state))return false;const old=player.lane;player.lane=Math.max(-1,Math.min(1,player.lane+dir));if(old!==player.lane){tone(210,.045,'sine',.015,dir*35);return true}return false}",
    "function move(dir){if(!['running','tutorial'].includes(state))return false;const old=player.lane;player.lane=Math.max(-1,Math.min(1,player.lane+dir));if(old!==player.lane){player.turnDir=dir;player.turnTimer=.28;tone(210,.045,'sine',.015,dir*35);return true}return false}",
    "turn state",
)
source = replace_once(
    source,
    "player.slide=Math.max(0,player.slide-dt);player.invuln=Math.max(0,player.invuln-dt);player.hurt=Math.max(0,player.hurt-dt);shake*=Math.pow(.02,dt);",
    "player.slide=Math.max(0,player.slide-dt);player.invuln=Math.max(0,player.invuln-dt);player.hurt=Math.max(0,player.hurt-dt);player.turnTimer=Math.max(0,player.turnTimer-dt);shake*=Math.pow(.02,dt);",
    "turn timer update",
)
source = replace_once(
    source,
    "function obstacleImage(o){",
    "function playerSprite(name,x,y,scale,opts={}){const r=PLAYER_SPRITES[name],im=images.player;if(!r||!im)return;const dw=r[2]*scale,dh=r[3]*scale;ctx.save();ctx.translate(x,y);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;if(opts.shadow)ctx.filter='drop-shadow(0 9px 9px rgba(0,0,0,.42))';ctx.drawImage(im,r[0],r[1],r[2],r[3],-dw/2,-dh,dw,dh);ctx.restore();ctx.filter='none';ctx.globalAlpha=1}\nfunction obstacleImage(o){",
    "player renderer",
)
source = replace_once(
    source,
    "function playerImage(){if(player.hurt>0)return 'raptor_hurt';if(player.slide>0)return 'raptor_slide';if(player.y>.05)return 'raptor_jump';return Math.floor(time*7)%2?'raptor_run1':'raptor_run2'}\nfunction drawPlayer(){if(player.invuln>0&&Math.floor(player.invuln*12)%2===0)return;const baseX=w/2+player.x*w*.22,baseY=h*.92-player.y*h*.22;const sc=Math.min(w/390,h/844)*.64;const bob=player.y>0||player.slide>0?0:Math.sin(time*14)*3;sprite(playerImage(),baseX,baseY+bob,sc,{shadow:true});}",
    "function playerImage(){if(player.hurt>0)return 'hurt';if(player.slide>0)return 'slide';if(player.y>.05)return 'jump';if(player.turnTimer>0)return player.turnDir<0?'turn_left':'turn_right';return `run${Math.floor(time*11)%4+1}`}\nfunction drawPlayer(){if(player.invuln>0&&Math.floor(player.invuln*12)%2===0)return;const viewportScale=Math.min(w/390,h/844);const baseX=w/2+player.x*w*.22,baseY=h*.92-player.y*h*.22;let sc=viewportScale*.99;if(player.y>.05)sc*=1.03;if(player.slide>0)sc*=.98;const runFrame=Math.floor(time*11)%4;const bob=player.y>0||player.slide>0||player.hurt>0||player.turnTimer>0?0:[0,-3,1,-2][runFrame]*viewportScale;playerSprite(playerImage(),baseX,baseY+bob,sc,{shadow:true});}",
    "player animation",
)
source = replace_once(
    source,
    "sliding:player.slide>0,tutorialIndex,",
    "sliding:player.slide>0,playerFrame:playerImage(),turnTimer:+player.turnTimer.toFixed(2),turnDir:player.turnDir,tutorialIndex,",
    "debug frame state",
)
source = replace_once(
    source,
    "forceGoal(){distance=GOAL-1},clear(){obstacles=[];spawnTimer=99},",
    "forceGoal(){distance=GOAL-1},skipTutorial(){tutorialIndex=tutorialSteps.length;tutorialObstacle=null;obstacles=[];spawnTimer=99;hideTutorial();if(state==='tutorial')state='running'},clear(){obstacles=[];spawnTimer=99},",
    "debug tutorial control",
)
path.write_text(source)

index = Path("index.html")
html = index.read_text()
html = replace_once(
    html,
    "game.js?v=20260801-assets1",
    "game.js?v=20260801-phase1",
    "index cache version",
)
index.write_text(html)
