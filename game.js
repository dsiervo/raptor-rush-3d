(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
const $=id=>document.getElementById(id);
const ui={loading:$('loading'),hud:$('hud'),score:$('score'),lives:$('lives'),goalLeft:$('goal-left'),goalFill:$('goal-fill'),tutorial:$('tutorial'),gesture:$('gesture'),damage:$('damage'),toast:$('toast'),home:$('home'),pause:$('pause'),over:$('over'),win:$('win'),finalDistance:$('final-distance'),bestDistance:$('best-distance'),winLives:$('win-lives')};
const ATLAS_SCALE=.35;
const SPRITES={
 raptor_hero:[0,0,448,336],raptor_run1:[448,0,448,336],raptor_run2:[896,0,448,336],raptor_jump:[1344,0,448,336],
 raptor_slide:[0,336,448,336],raptor_hurt:[448,336,448,336],ptero_flap_up:[896,336,448,336],ptero_flap_mid:[1344,336,448,336],
 ptero_glide:[0,672,448,336],trex_hero:[448,672,448,336],trex_roar:[896,672,448,336],boulder:[1344,672,448,336],
 log:[0,1008,448,336],thorn:[448,1008,448,336],cactus:[896,1008,448,336],fossil:[1344,1008,448,336]
};
const PLAYER_SPRITES={
 run1:[0,0,213,213],run2:[213,0,213,213],run3:[426,0,213,213],
 run4:[0,213,213,213],turn_left:[213,213,213,213],turn_right:[426,213,213,213],
 jump:[0,426,213,213],slide:[213,426,213,213],hurt:[426,426,213,213]
};
const images={};
function loadImage(name,url){return new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>{images[name]=im;resolve()};im.onerror=reject;im.src=url})}
function loadAssets(){return Promise.all([loadImage('atlas','assets/game-atlas.avif?v=20260801-mega2'),loadImage('player','assets/raptor-player.avif?v=20260801-phase1')])}
const GOAL=1800,MAX_LIVES=5,MAX_Z=100,LANES=[-1,0,1];
const tutorialSteps=[{action:'left',type:'trex'},{action:'right',type:'boulder'},{action:'up',type:'log'},{action:'down',type:'ptero'}];
let savedBest=0;try{savedBest=Number(localStorage.getItem('raptorRushBest')||0)}catch(_){}
let state='loading',w=0,h=0,dpr=1,last=performance.now(),time=0,distance=0,speed=19,lives=5,best=savedBest,shake=0;
let player={lane:0,x:0,y:0,vy:0,slide:0,hurt:0,invuln:0,turnTimer:0,turnDir:0};
let obstacles=[],particles=[],spawnTimer=2,tutorialIndex=0,tutorialPaused=false,tutorialObstacle=null,tutorialDelay=.5;
let audio=null;
function tone(freq,dur=.08,type='sine',vol=.025,slide=0){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),audio.currentTime+dur);g.gain.value=vol;g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}
function initAudio(){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}catch(_){}}
function resize(){dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;const rw=Math.round(w*dpr),rh=Math.round(h*dpr);if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}}
function setState(next){state=next;ui.home.classList.toggle('visible',next==='home');ui.pause.classList.toggle('visible',next==='paused');ui.over.classList.toggle('visible',next==='over');ui.win.classList.toggle('visible',next==='won');ui.hud.classList.toggle('hidden',!['running','tutorial'].includes(next));if(next!=='tutorial')hideTutorial()}
function reset(){distance=0;speed=19;lives=MAX_LIVES;shake=0;time=0;player={lane:0,x:0,y:0,vy:0,slide:0,hurt:0,invuln:0,turnTimer:0,turnDir:0};obstacles=[];particles=[];spawnTimer=999;tutorialIndex=0;tutorialPaused=false;tutorialObstacle=null;tutorialDelay=.45;updateHud()}
function start(){initAudio();reset();setState('running');tone(220,.1,'square',.03,130)}
function pause(){if(state==='running')setState('paused')}
function resume(){if(state==='paused'){last=performance.now();setState('running')}}
function home(){reset();setState('home')}
function finish(next){best=Math.max(best,Math.floor(distance));try{localStorage.setItem('raptorRushBest',best)}catch(_){};ui.finalDistance.textContent=Math.floor(distance)+' m';ui.bestDistance.textContent=best+' m';setState(next)}
function gameOver(){finish('over');tone(105,.35,'sawtooth',.05,-55)}
function win(){distance=GOAL;updateHud();ui.winLives.textContent=lives;finish('won');tone(440,.16,'square',.04,180);showToast('¡DESIERTO!')}
function updateHud(){ui.score.textContent=Math.floor(distance)+' m';ui.goalLeft.textContent=Math.max(0,Math.ceil(GOAL-distance))+' m';ui.goalFill.style.width=Math.min(100,distance/GOAL*100)+'%';[...ui.lives.children].forEach((e,i)=>e.classList.toggle('lost',i>=lives))}
function showToast(t){ui.toast.textContent=t;ui.toast.classList.remove('show');void ui.toast.offsetWidth;ui.toast.classList.add('show')}
function showTutorial(action){tutorialPaused=true;state='tutorial';ui.gesture.dataset.direction=action;ui.tutorial.classList.add('visible');ui.tutorial.setAttribute('aria-hidden','false');tone(330,.1,'sine',.025,80)}
function hideTutorial(){tutorialPaused=false;ui.tutorial.classList.remove('visible');ui.tutorial.setAttribute('aria-hidden','true')}
function move(dir){if(!['running','tutorial'].includes(state))return false;const old=player.lane;player.lane=Math.max(-1,Math.min(1,player.lane+dir));if(old!==player.lane){player.turnDir=dir;player.turnTimer=.28;tone(210,.045,'sine',.015,dir*35);return true}return false}
function jump(){if(!['running','tutorial'].includes(state)||player.y>.03||player.slide>0)return false;player.vy=8.5;tone(280,.1,'square',.025,120);return true}
function slide(){if(!['running','tutorial'].includes(state)||player.y>.1)return false;player.slide=.9;tone(105,.09,'sawtooth',.02,-25);return true}
function apply(action){return action==='left'?move(-1):action==='right'?move(1):action==='up'?jump():slide()}
function act(action){if(state==='tutorial'){const step=tutorialSteps[tutorialIndex];if(!step||step.action!==action){tone(100,.06,'square',.025,-20);return}hideTutorial();state='running';apply(action);if(tutorialObstacle)obstacles=obstacles.filter(o=>o!==tutorialObstacle);tutorialIndex++;tutorialObstacle=null;tutorialDelay=1.25;if(tutorialIndex>=tutorialSteps.length){spawnTimer=1.2;showToast('¡LISTO!')}return}if(state==='running')apply(action)}
function spawnTutorial(){const step=tutorialSteps[tutorialIndex];if(!step)return;tutorialObstacle={type:step.type,lane:player.lane,z:68,tutorial:true,hit:false,phase:Math.random()*6};obstacles.push(tutorialObstacle)}
const obstacleDefs={
 boulder:{action:'up',img:'boulder',scale:1.05},log:{action:'up',img:'log',scale:1.12},thorn:{action:'up',img:'thorn',scale:1.05},cactus:{action:'side',img:'cactus',scale:1.02},fossil:{action:'side',img:'fossil',scale:1.32},trex:{action:'side',frames:['trex_hero','trex_hero','trex_roar'],scale:1.18},ptero:{action:'down',frames:['ptero_glide','ptero_flap_up','ptero_flap_mid'],scale:1.05}
};
function spawnPattern(){const desert=distance>1100;let pool=desert?['cactus','boulder','fossil','ptero','trex']:['boulder','log','thorn','ptero','trex'];let type=pool[Math.floor(Math.random()*pool.length)],lane=LANES[Math.floor(Math.random()*3)];obstacles.push({type,lane,z:MAX_Z+8,hit:false,phase:Math.random()*6});if(Math.random()<.28&&type!=='trex'&&type!=='fossil'){let lane2=LANES.filter(x=>x!==lane)[Math.floor(Math.random()*2)];obstacles.push({type:Math.random()<.5?'boulder':'thorn',lane:lane2,z:MAX_Z+20,hit:false,phase:Math.random()*6})}}
function perspective(z){const p=1-Math.max(0,Math.min(1,z/MAX_Z));return {p,scale:.12+Math.pow(p,1.65)*1.12,y:h*.36+Math.pow(p,1.45)*h*.55,xFactor:35+Math.pow(p,1.4)*w*.27}}
function safeAgainst(o){const def=obstacleDefs[o.type];if(def.action==='side')return player.lane!==o.lane;if(player.lane!==o.lane)return true;if(def.action==='up')return player.y>.52;if(def.action==='down')return player.slide>.08;return false}
function hit(o){if(player.invuln>0||o.hit)return;o.hit=true;lives--;player.invuln=1.5;player.hurt=.65;shake=13;speed=Math.max(16,speed-3);ui.damage.classList.remove('show');void ui.damage.offsetWidth;ui.damage.classList.add('show');tone(85,.22,'sawtooth',.055,-40);updateHud();showToast(lives>0?`♥ ${lives}`:'SIN VIDAS');if(lives<=0)gameOver()}
function update(dt){if(!['running','tutorial'].includes(state))return;time+=dt;player.x+=(player.lane-player.x)*Math.min(1,dt*10);if(player.y>0||player.vy>0){player.vy-=20*dt;player.y=Math.max(0,player.y+player.vy*dt);if(player.y===0&&player.vy<0)player.vy=0}player.slide=Math.max(0,player.slide-dt);player.invuln=Math.max(0,player.invuln-dt);player.hurt=Math.max(0,player.hurt-dt);player.turnTimer=Math.max(0,player.turnTimer-dt);shake*=Math.pow(.02,dt);
 if(state==='tutorial')return;
 distance+=speed*dt;speed=Math.min(31,19+distance/180);updateHud();if(distance>=GOAL){win();return}
 if(tutorialIndex<tutorialSteps.length){tutorialDelay-=dt;if(!tutorialObstacle&&tutorialDelay<=0)spawnTutorial()}else{spawnTimer-=dt;if(spawnTimer<=0){spawnPattern();spawnTimer=Math.max(.9,2.15-distance/1800*.7)}}
 for(const o of obstacles){o.z-=speed*dt*1.65;o.phase+=dt*4;if(o.tutorial&&o===tutorialObstacle&&o.z<34&&!tutorialPaused)showTutorial(tutorialSteps[tutorialIndex].action);if(!o.hit&&o.z<5&&o.z>-4&&!safeAgainst(o))hit(o)}
 obstacles=obstacles.filter(o=>o.z>-12);
}
function coverBg(srcY,alpha=1){const im=images.atlas,iw=960*ATLAS_SCALE,ih=540*ATLAS_SCALE,tar=w/h;let sw,sh,sx,sy;if(iw/ih>tar){sh=ih;sw=sh*tar;sx=(iw-sw)/2;sy=srcY*ATLAS_SCALE}else{sw=iw;sh=sw/tar;sx=0;sy=srcY*ATLAS_SCALE+(ih-sh)/2}ctx.globalAlpha=alpha;ctx.drawImage(im,sx,sy,sw,sh,0,0,w,h);ctx.globalAlpha=1}
function drawBackground(){const blend=Math.max(0,Math.min(1,(distance-900)/700));coverBg(1344,1);if(blend>0)coverBg(1884,blend);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,20,18,.02)');g.addColorStop(.58,'rgba(0,12,10,.04)');g.addColorStop(1,'rgba(0,6,6,.52)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
function drawTrack(){const horizon=h*.36,bottom=h*1.03,center=w/2;ctx.save();ctx.beginPath();ctx.moveTo(center-w*.045,horizon);ctx.lineTo(center+w*.045,horizon);ctx.lineTo(center+w*.53,bottom);ctx.lineTo(center-w*.53,bottom);ctx.closePath();const grad=ctx.createLinearGradient(0,horizon,0,bottom);const blend=Math.max(0,Math.min(1,(distance-900)/700));grad.addColorStop(0,blend>.5?'rgba(224,173,92,.34)':'rgba(109,82,45,.32)');grad.addColorStop(1,blend>.5?'rgba(231,174,83,.78)':'rgba(83,57,30,.78)');ctx.fillStyle=grad;ctx.fill();ctx.clip();for(let i=0;i<18;i++){const t=((i/18+distance*.018)%1);const y=horizon+Math.pow(t,1.55)*(bottom-horizon);const y2=horizon+Math.pow(Math.min(1,t+.022),1.55)*(bottom-horizon);ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.045)';ctx.fillRect(0,y,w,Math.max(2,y2-y))}for(const lane of [-.33,.33]){ctx.strokeStyle='rgba(255,238,170,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(center+lane*w*.13,horizon);ctx.lineTo(center+lane*w*1.25,bottom);ctx.stroke()}ctx.restore()}
function sprite(name,x,y,scale,opts={}){const r=SPRITES[name],im=images.atlas;if(!r||!im)return;let dw=r[2]*scale,dh=r[3]*scale;ctx.save();ctx.translate(x,y);if(opts.flip)ctx.scale(-1,1);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;if(opts.shadow)ctx.filter='drop-shadow(0 10px 10px rgba(0,0,0,.45))';ctx.drawImage(im,r[0]*ATLAS_SCALE,r[1]*ATLAS_SCALE,r[2]*ATLAS_SCALE,r[3]*ATLAS_SCALE,-dw/2,-dh,dw,dh);ctx.restore();ctx.filter='none';ctx.globalAlpha=1}
function playerSprite(name,x,y,scale,opts={}){const r=PLAYER_SPRITES[name],im=images.player;if(!r||!im)return;const dw=r[2]*scale,dh=r[3]*scale;ctx.save();ctx.translate(x,y);if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;if(opts.shadow)ctx.filter='drop-shadow(0 9px 9px rgba(0,0,0,.42))';ctx.drawImage(im,r[0],r[1],r[2],r[3],-dw/2,-dh,dw,dh);ctx.restore();ctx.filter='none';ctx.globalAlpha=1}
function obstacleImage(o){const d=obstacleDefs[o.type];if(d.frames){const idx=Math.floor((time*4+o.phase)%d.frames.length);return d.frames[idx]}return d.img}
function drawWorld(){const sorted=[...obstacles].sort((a,b)=>b.z-a.z);for(const o of sorted){const p=perspective(o.z);const x=w/2+o.lane*p.xFactor;const def=obstacleDefs[o.type];let bob=o.type==='ptero'?Math.sin(time*5+o.phase)*8*p.scale:0;let y=p.y+bob;let sc=p.scale*def.scale*(w<500?.72:.84);if(o.type==='ptero')y-=70*p.scale;if(o.type==='fossil')sc*=1.05;sprite(obstacleImage(o),x,y,sc,{shadow:true,alpha:o.hit?.45:1})}}
function playerImage(){if(player.hurt>0)return 'hurt';if(player.slide>0)return 'slide';if(player.y>.05)return 'jump';if(player.turnTimer>0)return player.turnDir<0?'turn_left':'turn_right';return `run${Math.floor(time*11)%4+1}`}
function drawPlayer(){if(player.invuln>0&&Math.floor(player.invuln*12)%2===0)return;const viewportScale=Math.min(w/390,h/844);const baseX=w/2+player.x*w*.22,baseY=h*.92-player.y*h*.22;let sc=viewportScale*.99;if(player.y>.05)sc*=1.03;if(player.slide>0)sc*=.98;const runFrame=Math.floor(time*11)%4;const bob=player.y>0||player.slide>0||player.hurt>0||player.turnTimer>0?0:[0,-3,1,-2][runFrame]*viewportScale;playerSprite(playerImage(),baseX,baseY+bob,sc,{shadow:true});}
function draw(){resize();ctx.save();if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake*.55)}drawBackground();drawTrack();drawWorld();drawPlayer();ctx.restore()}
function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(frame)}
let pointer=null;canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch(_){}});canvas.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,ax=Math.abs(dx),ay=Math.abs(dy);pointer=null;if(state==='home'){start();return}if(Math.max(ax,ay)<24){act('up');return}act(ax>ay?(dx>0?'right':'left'):(dy>0?'down':'up'))});canvas.addEventListener('pointercancel',()=>pointer=null);canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key==='a')act('left');else if(e.key==='ArrowRight'||e.key==='d')act('right');else if(e.key==='ArrowUp'||e.key==='w'||e.key===' ')act('up');else if(e.key==='ArrowDown'||e.key==='s')act('down');else if(e.key==='p'||e.key==='Escape')state==='paused'?resume():pause()});
$('start-btn').onclick=start;$('pause-btn').onclick=pause;$('resume-btn').onclick=resume;$('restart-pause').onclick=start;$('restart-btn').onclick=start;$('home-btn').onclick=home;$('win-restart').onclick=start;$('win-home').onclick=home;addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')pause()});
window.__RAPTOR_GAME__={get state(){return state},get stats(){return{distance:Math.floor(distance),lives,lane:player.lane,y:+player.y.toFixed(2),sliding:player.slide>0,playerFrame:playerImage(),turnTimer:+player.turnTimer.toFixed(2),turnDir:player.turnDir,tutorialIndex,obstacles:obstacles.map(o=>({type:o.type,lane:o.lane,z:+o.z.toFixed(1)}))}},start,left:()=>act('left'),right:()=>act('right'),jump:()=>act('up'),slide:()=>act('down'),pause,resume,home,forceDamage(){hit({hit:false})},forceGoal(){distance=GOAL-1},skipTutorial(){tutorialIndex=tutorialSteps.length;tutorialObstacle=null;obstacles=[];spawnTimer=99;hideTutorial();if(state==='tutorial')state='running'},clear(){obstacles=[];spawnTimer=99},forceObstacle(type='boulder'){obstacles.push({type,lane:player.lane,z:4,hit:false,phase:0})}};
resize();loadAssets().then(()=>{ui.loading.classList.remove('visible');setState('home');requestAnimationFrame(frame)}).catch(err=>{console.error(err);ui.loading.querySelector('strong').textContent='ERROR AL CARGAR ASSETS'});
})();
