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
  const player={ lane:1, x:0, y:0, vy:0, sliding:0, runPhase:0, lean:0 };
  let state='home';
  let elapsed=0, distance=0, amberCount=0, speed=20, spawnTimer=1.7, collectStreak=0;
  let lastTime=performance.now(), shake=0, worldTime=0, hintTimer=0;
  let obstacles=[], ambers=[], particles=[];
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

  function resetGame(){
    player.lane=1; player.x=0; player.y=0; player.vy=0; player.sliding=0; player.runPhase=0; player.lean=0;
    elapsed=0; distance=0; amberCount=0; speed=20; spawnTimer=1.35; collectStreak=0; shake=0;
    obstacles=[]; ambers=[]; particles=[];
    env.forEach((e,i)=>e.z=-5-i*5.4);
    ui.score.textContent='0 m'; ui.amber.textContent='0'; updateSpeedBars();
  }

  function setState(next){
    state=next;
    ui.start.classList.toggle('visible',next==='home');
    ui.pause.classList.toggle('visible',next==='paused');
    ui.over.classList.toggle('visible',next==='over');
    ui.hud.classList.toggle('hidden',next!=='running');
    ui.swipeHint.classList.toggle('hidden',next!=='running'||hintTimer<=0);
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
    initAudio(); resetGame(); hintTimer=4; setState('running'); tone(220,.08,'square',.035,160);
  }
  function pauseGame(){ if(state==='running'){ setState('paused'); tone(160,.08,'sine',.025,-40); } }
  function resumeGame(){ if(state==='paused'){ lastTime=performance.now(); setState('running'); tone(220,.08,'sine',.03,90); } }
  function gameOver(){
    if(state!=='running') return;
    state='over';
    const meters=Math.floor(distance);
    best=Math.max(best,meters); try { localStorage.setItem('raptor-rush-best',String(best)); } catch (_) { }
    ui.finalScore.textContent=`${meters} m`; ui.finalAmber.textContent=String(amberCount); ui.bestScore.textContent=`${best} m`;
    ui.resultTitle.textContent=meters>700?'¡Raptor legendario!':meters>350?'¡Gran escapada!':meters>120?'¡Casi lo logras!':'¡Sigue corriendo!';
    setState('over'); tone(120,.45,'sawtooth',.055,-70); vibrate([70,40,120]);
  }
  function goHome(){ resetGame(); setState('home'); }

  function moveLane(dir){
    if(state!=='running') return;
    const old=player.lane; player.lane=Math.max(0,Math.min(2,player.lane+dir));
    if(old!==player.lane){ player.lean=-dir*.38; tone(210,.045,'sine',.018,dir*35); }
  }
  function jump(){
    if(state!=='running'||player.y>.04||player.sliding>0) return;
    player.vy=8.7; tone(285,.11,'square',.028,130); vibrate(12);
  }
  function slide(){
    if(state!=='running'||player.y>.16) return;
    player.sliding=.78; tone(105,.09,'sawtooth',.025,-30); vibrate(8);
  }

  function spawnPattern(){
    const difficulty=Math.min(1,elapsed/65);
    const r=Math.random();
    const lane=Math.floor(Math.random()*3);
    const addObstacle=(type,l,z=-68)=>obstacles.push({type,lane:l,z,passed:false,spin:Math.random()*6.28});
    const addAmberLine=(l,zStart=-75,count=6,step=3,y=1)=>{
      for(let i=0;i<count;i++) ambers.push({lane:l,z:zStart-i*step,y:y+(i%2)*.12,spin:Math.random()*6.28,taken:false});
    };

    if(r<.23){ addObstacle('rock',lane); addAmberLine((lane+1+Math.floor(Math.random()*2))%3,-74,5); }
    else if(r<.43){ addObstacle('gate',lane); addAmberLine(lane,-76,4,3,.58); }
    else if(r<.61){
      const safe=Math.floor(Math.random()*3);
      for(let l=0;l<3;l++) if(l!==safe) addObstacle('boulder',l,-70);
      addAmberLine(safe,-76,6);
    }
    else if(r<.78){
      const l1=lane,l2=(lane+1+Math.floor(Math.random()*2))%3;
      addObstacle('log',l1,-68); addObstacle(difficulty>.45?'gate':'rock',l2,-83);
      addAmberLine(3-l1-l2,-74,7,3);
    }
    else if(r<.9 && difficulty>.25){
      addObstacle('gate',lane,-68); addObstacle('rock',lane,-85);
      addAmberLine((lane+1)%3,-73,8,2.8);
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

  function checkCollisions(){
    const px=player.x, pz=2;
    for(const o of obstacles){
      if(o.passed) continue;
      const ox=lanes[o.lane];
      if(Math.abs(o.z-pz)<1.25 && Math.abs(ox-px)<1.05){
        let safe=false;
        if((o.type==='rock'||o.type==='log') && player.y>1.0) safe=true;
        if(o.type==='gate' && player.sliding>0.12) safe=true;
        if(!safe){
          shake=.55; addParticles(px,.8+player.y,pz,COLORS.red,18,5); gameOver(); return;
        }
      }
      if(o.z>4.5 && !o.passed){ o.passed=true; }
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
    elapsed+=dt; worldTime+=dt; speed=Math.min(39,20+elapsed*.21); distance+=speed*dt*.72;
    player.runPhase+=dt*(8+speed*.13);
    player.x+=(lanes[player.lane]-player.x)*Math.min(1,dt*11);
    player.lean*=Math.pow(.02,dt);
    if(player.y>0||player.vy>0){ player.vy-=21*dt; player.y+=player.vy*dt; if(player.y<0){player.y=0;player.vy=0;tone(95,.04,'sine',.018,-20);} }
    if(player.sliding>0) player.sliding=Math.max(0,player.sliding-dt);
    if(hintTimer>0){ hintTimer-=dt; if(hintTimer<=0) ui.swipeHint.classList.add('hidden'); }

    spawnTimer-=dt;
    if(spawnTimer<=0){ spawnPattern(); spawnTimer=Math.max(.82,1.75-elapsed*.009)+Math.random()*.32; }

    for(const o of obstacles) o.z+=speed*dt;
    for(const a of ambers){ a.z+=speed*dt; a.spin+=dt*3.7; }
    obstacles=obstacles.filter(o=>o.z<10);
    ambers=ambers.filter(a=>a.z<10&&!a.taken);

    for(const e of env){ e.z+=speed*dt*.92; if(e.z>14){ e.z-=151; e.x=(Math.random()<.5?-1:1)*(5.6+Math.random()*5.2); e.scale=.65+Math.random()*1.3; e.type=Math.random()>.28?'tree':'rock'; } }
    for(const p of particles){ p.life-=dt;p.vy-=7*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt; }
    particles=particles.filter(p=>p.life>0);
    if(shake>0) shake=Math.max(0,shake-dt*2.2);

    checkCollisions();
    ui.score.textContent=`${Math.floor(distance)} m`;
    if(Math.floor(elapsed*2)%2===0) updateSpeedBars();
    if(collectStreak>0 && ambers.every(a=>Math.abs(a.z-2)>5)) collectStreak=Math.max(0,collectStreak-dt*1.1);
  }

  function updateSpeedBars(){
    const level=Math.min(5,Math.max(1,Math.ceil((speed-18)/4.3)));
    ui.speedBars.forEach((b,i)=>b.classList.toggle('active',i<level));
  }

