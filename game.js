(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const $ = (id) => document.getElementById(id);
const ui = {
  loading: $('loading'), hud: $('hud'), score: $('score'), lives: $('lives'),
  goalLeft: $('goal-left'), goalFill: $('goal-fill'), tutorial: $('tutorial'),
  gesture: $('gesture'), damage: $('damage'), toast: $('toast'), home: $('home'),
  pause: $('pause'), over: $('over'), win: $('win'), finalDistance: $('final-distance'),
  bestDistance: $('best-distance'), winLives: $('win-lives')
};

const VERSION = '20260802-phase2';
const GOAL = 1800;
const MAX_LIVES = 5;
const MAX_Z = 100;
const CELL = 384;
const PLAYER_CELL = 213;
const LANES = [-1, 0, 1];
const PLAYER_CELLS = {
  run1:[0,0], run2:[1,0], run3:[2,0], run4:[0,1],
  turn_left:[1,1], turn_right:[2,1], jump:[0,2], slide:[1,2], hurt:[2,2]
};
const OBSTACLE_CELLS = {
  boulder:[0,0], log:[1,0], thorn:[2,0], cactus:[0,1], fossil:[1,1], trex:[2,1]
};
const PTERO_SEQUENCE = [0,1,2,1];
const obstacleDefs = {
  boulder:{action:'up', width:0.93, height:0.95},
  log:{action:'up', width:0.98, height:0.76},
  thorn:{action:'up', width:0.96, height:0.90},
  cactus:{action:'side', width:0.80, height:1.18},
  fossil:{action:'side', width:1.00, height:0.95},
  trex:{action:'side', width:1.22, height:1.33},
  ptero:{action:'down', width:1.42, height:1.05}
};
const tutorialSteps = [
  {action:'left', type:'trex'},
  {action:'right', type:'boulder'},
  {action:'up', type:'log'},
  {action:'down', type:'ptero'}
];

const images = {};
function loadImage(name, url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { images[name] = im; resolve(im); };
    im.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
    im.src = url;
  });
}
function loadAssets() {
  return Promise.all([
    loadImage('player', `assets/raptor-player.avif?v=20260801-phase1`),
    loadImage('obstacles', `assets/phase2-obstacles.avif?v=${VERSION}`),
    loadImage('ptero', `assets/phase2-ptero.avif?v=${VERSION}`),
    loadImage('jungle', `assets/phase2-jungle.avif?v=${VERSION}`),
    loadImage('desert', `assets/phase2-desert.avif?v=${VERSION}`)
  ]);
}

let savedBest = 0;
try { savedBest = Number(localStorage.getItem('raptorRushBest') || 0); } catch (_) {}
let state = 'loading';
let w = 0, h = 0, dpr = 1, last = performance.now(), time = 0;
let distance = 0, speed = 19, lives = MAX_LIVES, best = savedBest, shake = 0;
let player = {lane:0, x:0, y:0, vy:0, slide:0, hurt:0, invuln:0, turnTimer:0, turnDir:0};
let obstacles = [], spawnTimer = 2, tutorialIndex = 0, tutorialPaused = false;
let tutorialObstacle = null, tutorialDelay = .5, audio = null;
let visualDebug = {track:null, ptero:null, obstacles:[], background:null};

function tone(freq, dur=.08, type='sine', vol=.025, slide=0) {
  if (!audio) return;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), audio.currentTime + dur);
  g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + dur);
  o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
}
function initAudio() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch (_) {}
}
function resize() {
  dpr = Math.min(2, devicePixelRatio || 1);
  w = innerWidth; h = innerHeight;
  const rw = Math.round(w*dpr), rh = Math.round(h*dpr);
  if (canvas.width !== rw || canvas.height !== rh) {
    canvas.width = rw; canvas.height = rh;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
}
function setState(next) {
  state = next;
  ui.home.classList.toggle('visible', next === 'home');
  ui.pause.classList.toggle('visible', next === 'paused');
  ui.over.classList.toggle('visible', next === 'over');
  ui.win.classList.toggle('visible', next === 'won');
  ui.hud.classList.toggle('hidden', !['running','tutorial'].includes(next));
  if (next !== 'tutorial') hideTutorial();
}
function reset() {
  distance = 0; speed = 19; lives = MAX_LIVES; shake = 0; time = 0;
  player = {lane:0, x:0, y:0, vy:0, slide:0, hurt:0, invuln:0, turnTimer:0, turnDir:0};
  obstacles = []; spawnTimer = 999; tutorialIndex = 0; tutorialPaused = false;
  tutorialObstacle = null; tutorialDelay = .45; updateHud();
}
function start() { initAudio(); reset(); setState('running'); tone(220,.1,'square',.03,130); }
function pause() { if (state === 'running') setState('paused'); }
function resume() { if (state === 'paused') { last = performance.now(); setState('running'); } }
function home() { reset(); setState('home'); }
function finish(next) {
  best = Math.max(best, Math.floor(distance));
  try { localStorage.setItem('raptorRushBest', best); } catch (_) {}
  ui.finalDistance.textContent = `${Math.floor(distance)} m`;
  ui.bestDistance.textContent = `${best} m`;
  setState(next);
}
function gameOver() { finish('over'); tone(105,.35,'sawtooth',.05,-55); }
function win() { distance = GOAL; updateHud(); ui.winLives.textContent = lives; finish('won'); tone(440,.16,'square',.04,180); showToast('¡DESIERTO!'); }
function updateHud() {
  ui.score.textContent = `${Math.floor(distance)} m`;
  ui.goalLeft.textContent = `${Math.max(0, Math.ceil(GOAL-distance))} m`;
  ui.goalFill.style.width = `${Math.min(100, distance/GOAL*100)}%`;
  [...ui.lives.children].forEach((e,i) => e.classList.toggle('lost', i >= lives));
}
function showToast(t) { ui.toast.textContent=t; ui.toast.classList.remove('show'); void ui.toast.offsetWidth; ui.toast.classList.add('show'); }
function showTutorial(action) {
  tutorialPaused = true; state = 'tutorial'; ui.gesture.dataset.direction = action;
  ui.tutorial.classList.add('visible'); ui.tutorial.setAttribute('aria-hidden','false'); tone(330,.1,'sine',.025,80);
}
function hideTutorial() { tutorialPaused=false; ui.tutorial.classList.remove('visible'); ui.tutorial.setAttribute('aria-hidden','true'); }
function move(dir) {
  if (!['running','tutorial'].includes(state)) return false;
  const old = player.lane;
  player.lane = Math.max(-1, Math.min(1, player.lane + dir));
  if (old !== player.lane) { player.turnDir=dir; player.turnTimer=.28; tone(210,.045,'sine',.015,dir*35); return true; }
  return false;
}
function jump() {
  if (!['running','tutorial'].includes(state) || player.y>.03 || player.slide>0) return false;
  player.vy=8.5; tone(280,.1,'square',.025,120); return true;
}
function slide() {
  if (!['running','tutorial'].includes(state) || player.y>.1) return false;
  player.slide=.9; tone(105,.09,'sawtooth',.02,-25); return true;
}
function apply(action) { return action==='left'?move(-1):action==='right'?move(1):action==='up'?jump():slide(); }
function act(action) {
  if (state === 'tutorial') {
    const step = tutorialSteps[tutorialIndex];
    if (!step || step.action !== action) { tone(100,.06,'square',.025,-20); return; }
    hideTutorial(); state='running'; apply(action);
    if (tutorialObstacle) obstacles=obstacles.filter(o=>o!==tutorialObstacle);
    tutorialIndex++; tutorialObstacle=null; tutorialDelay=1.25;
    if (tutorialIndex >= tutorialSteps.length) { spawnTimer=1.2; showToast('¡LISTO!'); }
    return;
  }
  if (state === 'running') apply(action);
}
function spawnTutorial() {
  const step=tutorialSteps[tutorialIndex]; if (!step) return;
  tutorialObstacle={type:step.type,lane:player.lane,z:68,tutorial:true,hit:false,phase:Math.random()*6};
  obstacles.push(tutorialObstacle);
}
function spawnPattern() {
  const desert=distance>1100;
  const pool=desert?['cactus','boulder','fossil','ptero','trex']:['boulder','log','thorn','ptero','trex'];
  const type=pool[Math.floor(Math.random()*pool.length)], lane=LANES[Math.floor(Math.random()*3)];
  obstacles.push({type,lane,z:MAX_Z+8,hit:false,phase:Math.random()*6});
  if (Math.random()<.24 && !['trex','fossil','ptero'].includes(type)) {
    const lane2=LANES.filter(x=>x!==lane)[Math.floor(Math.random()*2)];
    obstacles.push({type:Math.random()<.5?'boulder':'thorn',lane:lane2,z:MAX_Z+22,hit:false,phase:Math.random()*6});
  }
}

function trackAt(p) {
  const q=Math.pow(Math.max(0,Math.min(1,p)),1.2);
  const half=w*(.072+(.485-.072)*q);
  return {half, laneCenter:half*2/3, laneWidth:half*2/3};
}
function perspective(z) {
  const p=1-Math.max(0,Math.min(1,z/MAX_Z));
  const t=trackAt(p);
  return {
    p,
    y:h*.315+Math.pow(p,1.43)*h*.625,
    half:t.half,
    laneX:t.laneCenter,
    laneWidth:t.laneWidth,
    scale:.10+Math.pow(p,1.55)*.91
  };
}
function safeAgainst(o) {
  const def=obstacleDefs[o.type];
  if (def.action==='side') return player.lane!==o.lane;
  if (player.lane!==o.lane) return true;
  if (def.action==='up') return player.y>.52;
  if (def.action==='down') return player.slide>.08;
  return false;
}
function hit(o) {
  if (player.invuln>0 || o.hit) return;
  o.hit=true; lives--; player.invuln=1.5; player.hurt=.65; shake=13; speed=Math.max(16,speed-3);
  ui.damage.classList.remove('show'); void ui.damage.offsetWidth; ui.damage.classList.add('show');
  tone(85,.22,'sawtooth',.055,-40); updateHud(); showToast(lives>0?`♥ ${lives}`:'SIN VIDAS');
  if (lives<=0) gameOver();
}
function update(dt) {
  if (!['running','tutorial'].includes(state)) return;
  time+=dt; player.x+=(player.lane-player.x)*Math.min(1,dt*10);
  if (player.y>0 || player.vy>0) { player.vy-=20*dt; player.y=Math.max(0,player.y+player.vy*dt); if (player.y===0&&player.vy<0) player.vy=0; }
  player.slide=Math.max(0,player.slide-dt); player.invuln=Math.max(0,player.invuln-dt);
  player.hurt=Math.max(0,player.hurt-dt); player.turnTimer=Math.max(0,player.turnTimer-dt); shake*=Math.pow(.02,dt);
  if (state==='tutorial') return;
  distance+=speed*dt; speed=Math.min(31,19+distance/180); updateHud();
  if (distance>=GOAL) { win(); return; }
  if (tutorialIndex<tutorialSteps.length) { tutorialDelay-=dt; if (!tutorialObstacle&&tutorialDelay<=0) spawnTutorial(); }
  else { spawnTimer-=dt; if (spawnTimer<=0) { spawnPattern(); spawnTimer=Math.max(.95,2.2-distance/1800*.7); } }
  for (const o of obstacles) {
    o.z-=speed*dt*1.65; o.phase+=dt*4;
    if (o.tutorial&&o===tutorialObstacle&&o.z<34&&!tutorialPaused) showTutorial(tutorialSteps[tutorialIndex].action);
    if (!o.hit&&o.z<5&&o.z>-4&&!safeAgainst(o)) hit(o);
  }
  obstacles=obstacles.filter(o=>o.z>-12);
}

function drawCover(im, offsetX=0, alpha=1) {
  const imageRatio=im.width/im.height, targetRatio=w/h;
  let sx=0, sy=0, sw=im.width, sh=im.height;
  if (imageRatio>targetRatio) { sw=im.height*targetRatio; sx=(im.width-sw)/2+offsetX; sx=Math.max(0,Math.min(im.width-sw,sx)); }
  else { sh=im.width/targetRatio; sy=(im.height-sh)/2; }
  ctx.globalAlpha=alpha; ctx.drawImage(im,sx,sy,sw,sh,0,0,w,h); ctx.globalAlpha=1;
  return {sourceWidth:sw,sourceHeight:sh,naturalWidth:im.width,naturalHeight:im.height};
}
function drawBackground() {
  const blend=Math.max(0,Math.min(1,(distance-900)/700));
  const parallax=player.x*w*.018;
  const bg=drawCover(images.jungle,parallax,1);
  if (blend>0) drawCover(images.desert,parallax,blend);
  const vignette=ctx.createRadialGradient(w/2,h*.48,w*.18,w/2,h*.55,w*.82);
  vignette.addColorStop(0,'rgba(0,0,0,0)'); vignette.addColorStop(1,'rgba(0,8,7,.30)');
  ctx.fillStyle=vignette; ctx.fillRect(0,0,w,h);
  visualDebug.background={...bg,blend:+blend.toFixed(2)};
}
function trackPoint(p, normalizedX) {
  const m=trackAt(p);
  const y=h*.315+Math.pow(p,1.43)*h*.625;
  return {x:w/2+m.half*normalizedX,y};
}
function drawTrack() {
  const center=w/2, horizon=h*.315, bottom=h*.985;
  const topHalf=trackAt(0).half, bottomHalf=trackAt(1).half;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(center-topHalf,horizon); ctx.lineTo(center+topHalf,horizon);
  ctx.lineTo(center+bottomHalf,bottom); ctx.lineTo(center-bottomHalf,bottom); ctx.closePath();
  const blend=Math.max(0,Math.min(1,(distance-900)/700));
  const grad=ctx.createLinearGradient(0,horizon,0,bottom);
  grad.addColorStop(0,blend>.5?'rgba(183,126,61,.64)':'rgba(91,65,37,.62)');
  grad.addColorStop(1,blend>.5?'rgba(235,179,88,.94)':'rgba(119,79,40,.94)');
  ctx.fillStyle=grad; ctx.fill(); ctx.clip();
  for (let i=0;i<28;i++) {
    const p=(i/28+distance*.016)%1, p2=Math.min(1,p+.016);
    const y1=trackPoint(p,0).y, y2=trackPoint(p2,0).y;
    ctx.fillStyle=i%2?'rgba(255,255,255,.032)':'rgba(42,23,10,.055)';
    ctx.fillRect(0,y1,w,Math.max(1,y2-y1));
  }
  ctx.restore();
  for (const boundary of [-1/3,1/3]) {
    ctx.save(); ctx.strokeStyle='rgba(255,236,169,.68)'; ctx.lineWidth=Math.max(1.5,w*.005);
    ctx.setLineDash([Math.max(8,h*.025),Math.max(8,h*.022)]); ctx.lineDashOffset=(distance*1.6)%40;
    ctx.beginPath();
    for (let i=0;i<=32;i++) { const p=i/32, pt=trackPoint(p,boundary); i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y); }
    ctx.stroke(); ctx.restore();
  }
  for (const edge of [-1,1]) {
    ctx.strokeStyle='rgba(210,255,125,.48)'; ctx.lineWidth=Math.max(2,w*.007); ctx.beginPath();
    for (let i=0;i<=32;i++) { const p=i/32, pt=trackPoint(p,edge); i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y); }
    ctx.stroke();
  }
  visualDebug.track={horizonY:horizon,bottomY:bottom,topWidth:topHalf*2,bottomWidth:bottomHalf*2,laneWidth:bottomHalf*2/3,laneCenters:[center-bottomHalf*2/3,center,center+bottomHalf*2/3]};
}
function drawCell(im, col, row, x, y, scale, opts={}) {
  const dw=CELL*scale, dh=CELL*scale;
  ctx.save(); ctx.translate(x,y); if (opts.alpha!==undefined) ctx.globalAlpha=opts.alpha;
  if (opts.shadow) ctx.filter='drop-shadow(0 8px 8px rgba(0,0,0,.38))';
  const anchorY=opts.anchorY ?? .95;
  ctx.drawImage(im,col*CELL,row*CELL,CELL,CELL,-dw/2,-dh*anchorY,dw,dh);
  ctx.restore(); ctx.filter='none'; ctx.globalAlpha=1;
  return {x:x-dw/2,y:y-dh*anchorY,width:dw,height:dh};
}
function drawGroundShadow(x,y,width,alpha=.22) {
  ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle='#06100d'; ctx.beginPath();
  ctx.ellipse(x,y,width/2,Math.max(3,width*.075),0,0,Math.PI*2); ctx.fill(); ctx.restore();
}
function drawWorld() {
  visualDebug.obstacles=[]; visualDebug.ptero=null;
  const sorted=[...obstacles].sort((a,b)=>b.z-a.z);
  for (const o of sorted) {
    const p=perspective(o.z), x=w/2+o.lane*p.laneX, def=obstacleDefs[o.type];
    const laneScale=p.laneWidth/CELL;
    if (o.type==='ptero') {
      const sequenceIndex=PTERO_SEQUENCE[Math.floor((time*7+o.phase)%PTERO_SEQUENCE.length)];
      const scale=laneScale*def.width;
      const flightLift=44+p.laneWidth*.98;
      const wingBob=Math.sin(time*8+o.phase)*Math.max(2,p.laneWidth*.055);
      const cy=p.y-flightLift+wingBob;
      drawGroundShadow(x,p.y+2,p.laneWidth*.56,.20);
      const rect=drawCell(images.ptero,sequenceIndex,0,x,cy,scale,{anchorY:.52,shadow:true,alpha:o.hit?.45:1});
      const data={frame:sequenceIndex,groundY:+p.y.toFixed(1),centerY:+cy.toFixed(1),altitude:+(p.y-cy).toFixed(1),rect,laneWidth:+p.laneWidth.toFixed(1),lane:o.lane};
      visualDebug.ptero=data; visualDebug.obstacles.push({type:o.type,lane:o.lane,rect,laneWidth:data.laneWidth});
      continue;
    }
    const [col,row]=OBSTACLE_CELLS[o.type];
    const scale=laneScale*def.width;
    drawGroundShadow(x,p.y+1,p.laneWidth*.58,o.type==='trex'?.27:.18);
    const rect=drawCell(images.obstacles,col,row,x,p.y,scale,{anchorY:.95,shadow:true,alpha:o.hit?.45:1});
    visualDebug.obstacles.push({type:o.type,lane:o.lane,rect,laneWidth:+p.laneWidth.toFixed(1),ratio:+(rect.width/p.laneWidth).toFixed(2)});
  }
}
function playerImage() {
  if (player.hurt>0) return 'hurt'; if (player.slide>0) return 'slide'; if (player.y>.05) return 'jump';
  if (player.turnTimer>0) return player.turnDir<0?'turn_left':'turn_right';
  return `run${Math.floor(time*11)%4+1}`;
}
function drawPlayerCell(col,row,x,y,scale) {
  const dw=PLAYER_CELL*scale, dh=PLAYER_CELL*scale;
  ctx.save(); ctx.translate(x,y); ctx.filter='drop-shadow(0 9px 9px rgba(0,0,0,.42))';
  ctx.drawImage(images.player,col*PLAYER_CELL,row*PLAYER_CELL,PLAYER_CELL,PLAYER_CELL,-dw/2,-dh*.97,dw,dh);
  ctx.restore(); ctx.filter='none';
}
function drawPlayer() {
  if (player.invuln>0&&Math.floor(player.invuln*12)%2===0) return;
  const viewportScale=Math.min(w/390,h/844), near=trackAt(1);
  const baseX=w/2+player.x*near.laneCenter, baseY=h*.925-player.y*h*.22;
  let sc=viewportScale*.99; if (player.y>.05) sc*=1.03; if (player.slide>0) sc*=.98;
  const runFrame=Math.floor(time*11)%4;
  const bob=player.y>0||player.slide>0||player.hurt>0||player.turnTimer>0?0:[0,-3,1,-2][runFrame]*viewportScale;
  const [col,row]=PLAYER_CELLS[playerImage()];
  drawPlayerCell(col,row,baseX,baseY+bob,sc);
}
function draw() {
  resize(); ctx.save(); if (shake) ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake*.55);
  drawBackground(); drawTrack(); drawWorld(); drawPlayer(); ctx.restore();
}
function frame(now) { const dt=Math.min(.033,(now-last)/1000||0); last=now; update(dt); draw(); requestAnimationFrame(frame); }

let pointer=null;
canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch(_){}});
canvas.addEventListener('pointerup',e=>{
  if (!pointer) return; const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,ax=Math.abs(dx),ay=Math.abs(dy); pointer=null;
  if (state==='home') {start();return;} if (Math.max(ax,ay)<24) {act('up');return;}
  act(ax>ay?(dx>0?'right':'left'):(dy>0?'down':'up'));
});
canvas.addEventListener('pointercancel',()=>pointer=null);
canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
addEventListener('keydown',e=>{
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  if (e.key==='ArrowLeft'||e.key==='a') act('left'); else if (e.key==='ArrowRight'||e.key==='d') act('right');
  else if (e.key==='ArrowUp'||e.key==='w'||e.key===' ') act('up'); else if (e.key==='ArrowDown'||e.key==='s') act('down');
  else if (e.key==='p'||e.key==='Escape') state==='paused'?resume():pause();
});
$('start-btn').onclick=start; $('pause-btn').onclick=pause; $('resume-btn').onclick=resume;
$('restart-pause').onclick=start; $('restart-btn').onclick=start; $('home-btn').onclick=home;
$('win-restart').onclick=start; $('win-home').onclick=home;
addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')pause()});

window.__RAPTOR_GAME__={
  get state(){return state;},
  get stats(){return{distance:Math.floor(distance),lives,lane:player.lane,y:+player.y.toFixed(2),sliding:player.slide>0,playerFrame:playerImage(),tutorialIndex,obstacles:obstacles.map(o=>({type:o.type,lane:o.lane,z:+o.z.toFixed(1)}))}},
  get visual(){return JSON.parse(JSON.stringify(visualDebug));},
  get assets(){return Object.fromEntries(Object.entries(images).map(([k,v])=>[k,{width:v.naturalWidth,height:v.naturalHeight}]));},
  start,left:()=>act('left'),right:()=>act('right'),jump:()=>act('up'),slide:()=>act('down'),pause,resume,home,
  forceDamage(){hit({hit:false})}, forceGoal(){distance=GOAL-1},
  skipTutorial(){tutorialIndex=tutorialSteps.length;tutorialObstacle=null;obstacles=[];spawnTimer=99;hideTutorial();if(state==='tutorial')state='running'},
  clear(){obstacles=[];spawnTimer=99;},
  forceObstacle(type='boulder',lane=0,z=18){obstacles.push({type,lane,z,hit:false,phase:0});}
};

resize();
loadAssets().then(()=>{ui.loading.classList.remove('visible');setState('home');requestAnimationFrame(frame);})
.catch(err=>{console.error(err);ui.loading.querySelector('strong').textContent='ERROR AL CARGAR ASSETS';});
})();
