  function draw(mesh, model, color) {
    gl.uniformMatrix4fv(U.model,false,model);
    gl.uniform4fv(U.color,color);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ibo);
    gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
  }
  const model = (p,r,s,parent) => M4.compose(p,r,s,parent);

  // ---------- game state ----------
  const lanes=[-2.45,0,2.45];
  const GOAL_DISTANCE=1800;
  const MAX_LIVES=5;
  const TUTORIAL_STEPS=[
    {action:'left',label:'Desliza a la izquierda',type:'trex'},
    {action:'right',label:'Desliza a la derecha',type:'boulder'},
    {action:'up',label:'Desliza hacia arriba',type:'log'},
    {action:'down',label:'Desliza hacia abajo',type:'ptero'}
  ];
  const player={ lane:1, x:0, y:0, vy:0, sliding:0, runPhase:0, lean:0, invulnerable:0 };
  let state='home';
  let elapsed=0, distance=0, amberCount=0, speed=20, spawnTimer=1.7, collectStreak=0, lives=MAX_LIVES;
  let lastTime=performance.now(), shake=0, worldTime=0;
  let obstacles=[], ambers=[], particles=[];
  let tutorialIndex=0, tutorialPaused=false, tutorialObstacle=null, tutorialNextDelay=.55, tutorialDone=false;
  let audioCtx=null;
  let best=0;
  try { best=Number(localStorage.getItem('raptor-rush-best')||0); } catch (_) { best=0; }

  const env=[];
  function seeded(i){ const x=Math.sin(i*937.1+14.23)*43758.5453; return x-Math.floor(x); }
  for(let i=0;i<28;i++){
    const side=i%2===0?-1:1;
    env.push({
      z:-5-i*5.4,
      x:side*(5.7+seeded(i)*4.8),
      scale:.65+seeded(i+30)*1.25,
      type: seeded(i+60)>.28?'tree':'rock',
      spin:seeded(i+90)*6.28
    });
  }

  const clamp01=(v)=>Math.max(0,Math.min(1,v));
  const mixColor=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  function getDesertBlend(){ return clamp01((distance-GOAL_DISTANCE*.60)/(GOAL_DISTANCE*.32)); }

  function updateLives(){
    ui.lifeHearts.forEach((heart,i)=>heart.classList.toggle('lost',i>=lives));
    ui.lives.setAttribute('aria-label',`${lives} ${lives===1?'vida':'vidas'}`);
  }

  function updateGoalUI(){
    const progress=clamp01(distance/GOAL_DISTANCE);
    ui.goalFill.style.width=`${(progress*100).toFixed(1)}%`;
    ui.goalDistance.textContent=progress>=1?'¡LLEGASTE!':`${Math.max(0,Math.ceil(GOAL_DISTANCE-distance))} m`;
  }

  function hideTutorial(){
    tutorialPaused=false;
    ui.tutorial.classList.remove('visible');
    ui.tutorial.setAttribute('aria-hidden','true');
  }

  function resetGame(){
    player.lane=1; player.x=0; player.y=0; player.vy=0; player.sliding=0; player.runPhase=0; player.lean=0; player.invulnerable=0;
    elapsed=0; distance=0; amberCount=0; speed=20; spawnTimer=999; collectStreak=0; shake=0; lives=MAX_LIVES;
    tutorialIndex=0; tutorialPaused=false; tutorialObstacle=null; tutorialNextDelay=.55; tutorialDone=false;
    obstacles=[]; ambers=[]; particles=[];
    env.forEach((e,i)=>{e.z=-5-i*5.4;e.type=seeded(i+60)>.28?'tree':'rock';});
    ui.score.textContent='0 m'; ui.amber.textContent='0';
    updateLives(); updateGoalUI(); updateSpeedBars(); hideTutorial();
  }

  function setState(next){
    state=next;
    ui.start.classList.toggle('visible',next==='home');
    ui.pause.classList.toggle('visible',next==='paused');
    ui.over.classList.toggle('visible',next==='over');
    ui.win.classList.toggle('visible',next==='won');
    ui.hud.classList.toggle('hidden',next!=='running');
    if(next!=='running') hideTutorial();
  }

  function initAudio(){
    if(!audioCtx){
      try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ }
    }
    if(audioCtx?.state==='suspended') audioCtx.resume();
  }
  function tone(freq,duration=.1,type='sine',volume=.05,slide=0){
    if(!audioCtx) return;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,audioCtx.currentTime);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),audioCtx.currentTime+duration);
    g.gain.setValueAtTime(volume,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+duration);
  }
  function vibrate(pattern){ if(navigator.vibrate) navigator.vibrate(pattern); }

  function startGame(){
    initAudio(); resetGame(); setState('running'); tone(220,.08,'square',.035,160);
  }
  function pauseGame(){ if(state==='running'&&!tutorialPaused){ setState('paused'); tone(160,.08,'sine',.025,-40); } }
  function resumeGame(){ if(state==='paused'){ lastTime=performance.now(); setState('running'); tone(220,.08,'sine',.03,90); } }
  function finishRun(next){
    const meters=Math.floor(distance);
    best=Math.max(best,meters); try { localStorage.setItem('raptor-rush-best',String(best)); } catch (_) { }
    ui.finalScore.textContent=`${meters} m`; ui.finalAmber.textContent=String(amberCount); ui.bestScore.textContent=`${best} m`;
    setState(next);
  }
  function gameOver(){
    if(state!=='running') return;
    ui.resultTitle.textContent=distance>1200?'¡Estuviste muy cerca!':distance>650?'¡Gran escapada!':distance>250?'¡Buen avance!':'¡Sigue corriendo!';
    finishRun('over'); tone(120,.45,'sawtooth',.055,-70); vibrate([70,40,120]);
  }
  function winGame(){
    if(state!=='running') return;
    distance=GOAL_DISTANCE; updateGoalUI();
    ui.victoryScore.textContent=`${GOAL_DISTANCE} m`; ui.victoryAmber.textContent=String(amberCount); ui.victoryLives.textContent=String(lives);
    finishRun('won'); showCombo('¡DESIERTO!'); tone(392,.18,'square',.04,180); setTimeout(()=>tone(523,.25,'sine',.045,210),120); vibrate([40,30,40,30,110]);
  }
  function goHome(){ resetGame(); setState('home'); }

  function moveLane(dir){
    if(state!=='running') return false;
    const old=player.lane; player.lane=Math.max(0,Math.min(2,player.lane+dir));
    if(old!==player.lane){ player.lean=-dir*.38; tone(210,.045,'sine',.018,dir*35); return true; }
    return false;
  }
  function jump(){
    if(state!=='running'||player.y>.04||player.sliding>0) return false;
    player.vy=8.7; tone(285,.11,'square',.028,130); vibrate(12); return true;
  }
  function slide(){
    if(state!=='running'||player.y>.16) return false;
    player.sliding=.86; tone(105,.09,'sawtooth',.025,-30); vibrate(8); return true;
  }
  function applyAction(action){
    if(action==='left') return moveLane(-1);
    if(action==='right') return moveLane(1);
    if(action==='up') return jump();
    if(action==='down') return slide();
    return false;
  }

  function showTutorial(step){
    tutorialPaused=true;
    ui.tutorialTitle.textContent=step.label;
    ui.tutorialGesture.dataset.direction=step.action;
    ui.tutorial.classList.add('visible');
    ui.tutorial.setAttribute('aria-hidden','false');
    tone(330,.1,'sine',.025,70);
  }

  function wrongTutorialMove(){
    ui.tutorialCard.classList.remove('wrong'); void ui.tutorialCard.offsetWidth; ui.tutorialCard.classList.add('wrong');
    tone(110,.08,'square',.025,-20); vibrate(18);
  }

  function handlePlayerAction(action){
    if(state!=='running') return;
    if(tutorialPaused){
      const step=TUTORIAL_STEPS[tutorialIndex];
      if(!step||step.action!==action){ wrongTutorialMove(); return; }
      hideTutorial();
      applyAction(action);
      tutorialIndex++;
      tutorialObstacle=null;
      tutorialNextDelay=1.45;
      if(tutorialIndex>=TUTORIAL_STEPS.length){
        tutorialDone=true; spawnTimer=1.3; showCombo('¡LISTO PARA CORRER!');
      }
      return;
    }
    applyAction(action);
  }

  function spawnTutorialStep(){
    const step=TUTORIAL_STEPS[tutorialIndex];
    if(!step) return;
    tutorialObstacle={type:step.type,lane:player.lane,z:-52,passed:false,spin:Math.random()*6.28,tutorial:true};
    obstacles.push(tutorialObstacle);
  }

  function spawnPattern(){
    const difficulty=Math.min(1,elapsed/70);
    const desert=getDesertBlend();
    const r=Math.random();
    const lane=Math.floor(Math.random()*3);
    const addObstacle=(type,l,z=-68)=>obstacles.push({type,lane:l,z,passed:false,spin:Math.random()*6.28});
    const addAmberLine=(l,zStart=-75,count=6,step=3,y=1)=>{
      for(let i=0;i<count;i++) ambers.push({lane:l,z:zStart-i*step,y:y+(i%2)*.12,spin:Math.random()*6.28,taken:false});
    };
    const otherLane=(blocked)=>(blocked+1+Math.floor(Math.random()*2))%3;

    if(desert>.52){
      if(r<.18){ addObstacle('cactus',lane); addAmberLine(otherLane(lane),-74,6); }
      else if(r<.35){ addObstacle('bone',lane); addAmberLine(lane,-75,5,3,1.18); }
      else if(r<.52){ const safe=Math.floor(Math.random()*3); for(let l=0;l<3;l++) if(l!==safe) addObstacle('cactus',l,-70); addAmberLine(safe,-76,7); }
      else if(r<.66){ addObstacle('ptero',lane); addAmberLine(lane,-76,5,3,.52); }
      else if(r<.82){ const l2=otherLane(lane),safe=3-lane-l2; addObstacle('boulder',lane); addObstacle('bone',l2,-84); addAmberLine(safe,-76,5); }
      else { addAmberLine(lane,-67,10,2.8,1.05); }
      return;
    }

    if(r<.13 && difficulty>.08){ addObstacle('trex',lane); addAmberLine(otherLane(lane),-76,7); }
    else if(r<.26 && difficulty>.12){ addObstacle('ptero',lane); addAmberLine(lane,-76,5,3,.52); }
    else if(r<.39){ addObstacle('thorn',lane); addAmberLine(lane,-76,5,3,1.15); }
    else if(r<.52){ addObstacle(Math.random()>.45?'log':'rock',lane); addAmberLine(otherLane(lane),-74,5); }
    else if(r<.67){ addObstacle('gate',lane); addAmberLine(lane,-76,4,3,.58); }
    else if(r<.80){
      const safe=Math.floor(Math.random()*3);
      for(let l=0;l<3;l++) if(l!==safe) addObstacle('boulder',l,-70);
      addAmberLine(safe,-76,6);
    }
    else if(r<.92 && difficulty>.28){
      const l2=otherLane(lane), safe=3-lane-l2;
      addObstacle('mud',lane,-68); addObstacle(difficulty>.55?'trex':'rock',l2,-84); addAmberLine(safe,-75,7,3);
    }
    else { addAmberLine(lane,-67,10,2.8,1.05); }
  }

  function addParticles(x,y,z,color,count=8,force=2.8){
    for(let i=0;i<count;i++) particles.push({
      x,y,z, vx:(Math.random()-.5)*force, vy:Math.random()*force+.8, vz:(Math.random()-.5)*force,
      life:.45+Math.random()*.35, max:.8, color
    });
  }

  function showCombo(text){
    ui.combo.textContent=text; ui.combo.classList.remove('show'); void ui.combo.offsetWidth; ui.combo.classList.add('show');
  }

  function takeDamage(obstacle){
    if(player.invulnerable>0) return;
    obstacle.passed=true;
    lives=Math.max(0,lives-1); player.invulnerable=1.65; shake=.75; speed=Math.max(18,speed-3.5);
    updateLives(); ui.lives.classList.remove('hit'); void ui.lives.offsetWidth; ui.lives.classList.add('hit');
    ui.damage.classList.remove('show'); void ui.damage.offsetWidth; ui.damage.classList.add('show');
    addParticles(player.x,.8+player.y,2,COLORS.red,22,5.5);
    tone(88,.24,'sawtooth',.06,-42); vibrate([55,35,90]);
    if(lives<=0){ gameOver(); return; }
    showCombo(`♥ ${lives} VIDAS`);
  }

  function checkCollisions(){
    const px=player.x, pz=2;
    for(const o of obstacles){
      if(o.passed) continue;
      const ox=lanes[o.lane];
      if(Math.abs(o.z-pz)<1.3 && Math.abs(ox-px)<1.05){
        let safe=false;
        if(['rock','log','thorn','bone'].includes(o.type) && player.y>.72) safe=true;
        if(['gate','ptero'].includes(o.type) && player.sliding>.05) safe=true;
        if(!safe){
          if(player.invulnerable>0) o.passed=true;
          else takeDamage(o);
        }
      }
      if(o.z>4.5 && !o.passed) o.passed=true;
    }

    for(const a of ambers){
      if(a.taken) continue;
      const ax=lanes[a.lane], ay=a.y;
      if(Math.abs(a.z-pz)<1.15 && Math.abs(ax-px)<.95 && Math.abs(ay-(.9+player.y))<1.05){
        a.taken=true; amberCount++; collectStreak++;
        ui.amber.textContent=String(amberCount);
        addParticles(ax,ay,a.z,COLORS.amber,7,2.2);
        tone(430+Math.min(collectStreak,6)*45,.07,'sine',.032,110);
        if(collectStreak===5) showCombo('RACHA ×5');
        if(collectStreak>5 && collectStreak%5===0) showCombo(`RACHA ×${collectStreak}`);
      }
    }
  }

  function update(dt){
    if(state!=='running') return;
    if(tutorialPaused){ worldTime+=dt*.18; player.runPhase+=dt*.4; return; }

    elapsed+=dt; worldTime+=dt; speed=Math.min(40,20+elapsed*.20); distance+=speed*dt*.72;
    player.runPhase+=dt*(8+speed*.13);
    player.x+=(lanes[player.lane]-player.x)*Math.min(1,dt*11);
    player.lean*=Math.pow(.02,dt);
    if(player.invulnerable>0) player.invulnerable=Math.max(0,player.invulnerable-dt);
    if(player.y>0||player.vy>0){ player.vy-=21*dt; player.y+=player.vy*dt; if(player.y<0){player.y=0;player.vy=0;tone(95,.04,'sine',.018,-20);} }
    if(player.sliding>0) player.sliding=Math.max(0,player.sliding-dt);

    if(!tutorialDone){
      if(!tutorialObstacle){ tutorialNextDelay-=dt; if(tutorialNextDelay<=0) spawnTutorialStep(); }
    } else {
      spawnTimer-=dt;
      if(spawnTimer<=0){ spawnPattern(); spawnTimer=Math.max(.80,1.72-elapsed*.0085)+Math.random()*.32; }
    }

    for(const o of obstacles){
      o.z+=speed*dt;
      if(o===tutorialObstacle&&!tutorialPaused&&o.z>-11.5) showTutorial(TUTORIAL_STEPS[tutorialIndex]);
    }
    for(const a of ambers){ a.z+=speed*dt; a.spin+=dt*3.7; }
    obstacles=obstacles.filter(o=>o.z<10);
    ambers=ambers.filter(a=>a.z<10&&!a.taken);

    const desert=getDesertBlend();
    for(const e of env){
      e.z+=speed*dt*.92;
      if(e.z>14){
        e.z-=151; e.x=(Math.random()<.5?-1:1)*(5.6+Math.random()*5.2); e.scale=.65+Math.random()*1.3;
        e.type=desert>.52?(Math.random()>.34?'cactus':'rock'):(Math.random()>.28?'tree':'rock');
      }
    }
    for(const p of particles){ p.life-=dt;p.vy-=7*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt; }
    particles=particles.filter(p=>p.life>0);
    if(shake>0) shake=Math.max(0,shake-dt*2.2);

    checkCollisions();
    if(state!=='running') return;
    ui.score.textContent=`${Math.floor(distance)} m`; updateGoalUI();
    if(Math.floor(elapsed*2)%2===0) updateSpeedBars();
    if(collectStreak>0 && ambers.every(a=>Math.abs(a.z-2)>5)) collectStreak=Math.max(0,collectStreak-dt*1.1);
    if(distance>=GOAL_DISTANCE) winGame();
  }

  function updateSpeedBars(){
    const level=Math.min(5,Math.max(1,Math.ceil((speed-18)/4.3)));
    ui.speedBars.forEach((b,i)=>b.classList.toggle('active',i<level));
  }

