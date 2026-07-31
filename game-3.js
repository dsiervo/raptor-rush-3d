// ---------- world drawing ----------
  function drawGround(){
    const blend=getDesertBlend();
    const shift=(distance*1.39)%8;
    const road=mixColor(COLORS.road,COLORS.sand,blend);
    const roadAlt=mixColor(COLORS.roadAlt,COLORS.sandLight,blend);
    const shoulder=mixColor(COLORS.soil,COLORS.desertSoil,blend);
    const side=mixColor(COLORS.grassDark,COLORS.sand,blend);
    const edge=mixColor(COLORS.grass,COLORS.sandLight,blend);
    draw(meshes.cube,model([0,-.38,-58],[0,0,0],[4.35,.3,69]),shoulder);
    draw(meshes.cube,model([-10,-.55,-58],[0,0,0],[6,.45,70]),side);
    draw(meshes.cube,model([10,-.55,-58],[0,0,0],[6,.45,70]),side);
    for(let i=0;i<18;i++){
      const z=-124+i*8+shift;
      const c=i%2?road:roadAlt;
      draw(meshes.cube,model([0,-.09,z],[0,0,0],[4.0,.12,3.9]),c);
      draw(meshes.cube,model([-4.05,.0,z],[0,0,0],[.11,.12,3.75]),edge);
      draw(meshes.cube,model([4.05,.0,z],[0,0,0],[.11,.12,3.75]),edge);
      if(i%2===0){
        const marker=mixColor([.72,.65,.39,.45],[.95,.78,.42,.55],blend);
        draw(meshes.cube,model([-1.23,.04,z],[0,0,0],[.04,.035,.65]),marker);
        draw(meshes.cube,model([1.23,.04,z],[0,0,0],[.04,.035,.65]),marker);
      }
    }
    if(blend<.72){
      const fade=1-blend/.72;
      const temple=[.24+.12*blend,.35+.08*blend,.27-.06*blend,Math.max(.15,fade)];
      const z=-118;
      draw(meshes.cube,model([-7,4.5,z],[0,0,.05],[1.4,4.6,1.6]),temple);
      draw(meshes.cube,model([7,4.5,z],[0,0,-.05],[1.4,4.6,1.6]),temple);
      draw(meshes.cube,model([0,8.1,z],[0,0,0],[8.5,1.1,1.5]),temple);
    }
    if(blend>.16){
      const reveal=clamp01((blend-.16)/.54);
      const mesa=mixColor(COLORS.desertSoil,COLORS.sandLight,.35);
      draw(meshes.cube,model([-8,2.2,-121],[0,.18,0],[4.2,2.1,2.4]),[mesa[0],mesa[1],mesa[2],reveal]);
      draw(meshes.cube,model([8,3.1,-128],[0,-.14,0],[4.8,3.0,2.8]),[mesa[0],mesa[1],mesa[2],reveal]);
      draw(meshes.cube,model([0,.4,-116],[0,0,0],[3.7,.42,2.4]),[COLORS.sandLight[0],COLORS.sandLight[1],COLORS.sandLight[2],reveal]);
    }
  }

  function drawTree(e){
    const s=e.scale;
    draw(meshes.cylinder,model([e.x,1.15*s,e.z],[0,e.spin,0],[.42*s,1.25*s,.42*s]),COLORS.trunk);
    draw(meshes.sphere,model([e.x,3.0*s,e.z],[0,0,0],[1.38*s,1.55*s,1.38*s]),COLORS.leaf);
    draw(meshes.sphere,model([e.x-.55*s,2.72*s,e.z+.15*s],[0,0,0],[.95*s,1.1*s,.95*s]),COLORS.leaf2);
    draw(meshes.sphere,model([e.x+.62*s,2.85*s,e.z-.1*s],[0,0,0],[.9*s,1.2*s,.9*s]),COLORS.leaf2);
  }
  function drawEnvRock(e){
    draw(meshes.sphere,model([e.x,.45*e.scale,e.z],[0,e.spin,.08],[1.2*e.scale,.62*e.scale,.92*e.scale]),COLORS.stone);
    if(e.scale>.9) draw(meshes.sphere,model([e.x+.7*e.scale,.22*e.scale,e.z+.25],[0,-e.spin,0],[.55*e.scale,.35*e.scale,.48*e.scale]),COLORS.stoneLight);
  }

  function drawCactus(e){
    const s=e.scale;
    draw(meshes.cylinder,model([e.x,1.35*s,e.z],[0,e.spin,0],[.34*s,1.35*s,.34*s]),COLORS.cactus);
    draw(meshes.sphere,model([e.x,2.72*s,e.z],[0,0,0],[.34*s,.42*s,.34*s]),COLORS.cactusLight);
    for(const side of [-1,1]){
      draw(meshes.cylinder,model([e.x+side*.52*s,1.55*s,e.z],[0,0,Math.PI/2],[.20*s,.50*s,.20*s]),COLORS.cactus);
      draw(meshes.cylinder,model([e.x+side*.94*s,1.88*s,e.z],[0,0,0],[.18*s,.42*s,.18*s]),COLORS.cactusLight);
    }
  }

  function drawTrexObstacle(x,z,o){
    const bob=Math.sin(worldTime*4+o.spin)*.07;
    draw(meshes.sphere,model([x,1.62+bob,z],[0,0,0],[1.10,.82,1.48]),COLORS.trex);
    draw(meshes.sphere,model([x,2.30+bob,z+1.18],[-.08,0,0],[.78,.62,.92]),COLORS.trexLight);
    draw(meshes.sphere,model([x,2.12+bob,z+1.86],[.08,0,0],[.62,.36,.82]),COLORS.trexDark);
    draw(meshes.cylinder,model([x,1.55+bob,z-1.55],[Math.PI/2,0,0],[.44,1.20,.44]),COLORS.trexDark);
    draw(meshes.cylinder,model([x,1.44+bob,z-2.66],[Math.PI/2,0,0],[.27,.82,.27]),COLORS.trex);
    for(const side of [-1,1]){
      draw(meshes.cylinder,model([x+side*.62,.62,z+.10],[0,0,side*.12],[.26,.70,.26]),COLORS.trexLight);
      draw(meshes.sphere,model([x+side*.62,.10,z+.36],[0,0,0],[.40,.14,.62]),COLORS.trexDark);
      draw(meshes.cylinder,model([x+side*.72,1.85+bob,z+.82],[.85,0,side*.28],[.10,.36,.10]),COLORS.trexDark);
      draw(meshes.sphere,model([x+side*.46,2.53+bob,z+1.68],[0,0,0],[.10,.12,.08]),COLORS.eye);
    }
    for(let i=-1;i<=1;i++) draw(meshes.cone,model([x+i*.22,1.92+bob,z+2.38],[Math.PI/2,0,0],[.045,.16,.045]),COLORS.tooth);
  }

  function drawPteroObstacle(x,z,o){
    const flap=Math.sin(worldTime*8+o.spin)*.42;
    draw(meshes.sphere,model([x,1.62,z],[0,0,0],[.34,.30,.78]),COLORS.pteroLight);
    draw(meshes.cone,model([x,1.68,z+1.05],[Math.PI/2,0,0],[.18,.62,.18]),COLORS.ptero);
    for(const side of [-1,1]){
      draw(meshes.cube,model([x+side*1.12,1.74+Math.abs(flap)*.25,z],[0,0,side*(.22+flap)],[1.15,.08,.62]),COLORS.ptero);
      draw(meshes.cube,model([x+side*2.05,1.80+Math.abs(flap)*.35,z-.12],[0,0,side*(.34+flap*.8)],[.80,.055,.42]),COLORS.pteroLight);
    }
  }

  function drawObstacle(o){
    const x=lanes[o.lane],z=o.z;
    if(o.type==='rock'){
      draw(meshes.sphere,model([x,.48,z],[.12,o.spin,.05],[1.0,.62,.82]),COLORS.stone);
      draw(meshes.sphere,model([x-.23,.74,z-.11],[0,-o.spin,0],[.48,.32,.4]),COLORS.stoneLight);
    } else if(o.type==='log'){
      draw(meshes.cylinder,model([x,.48,z],[Math.PI/2,0,Math.PI/2],[.58,1.28,.58]),COLORS.wood);
      draw(meshes.cylinder,model([x-1.25,.48,z],[0,0,0],[.62,.10,.62]),COLORS.woodLight);
      draw(meshes.cylinder,model([x+1.25,.48,z],[0,0,0],[.62,.10,.62]),COLORS.woodLight);
    } else if(o.type==='gate'){
      draw(meshes.cube,model([x-1.0,1.08,z],[0,0,0],[.18,1.08,.28]),COLORS.wood);
      draw(meshes.cube,model([x+1.0,1.08,z],[0,0,0],[.18,1.08,.28]),COLORS.wood);
      draw(meshes.cube,model([x,1.86,z],[0,0,.02],[1.18,.24,.34]),COLORS.woodLight);
      draw(meshes.cube,model([x,2.23,z],[0,0,-.02],[.78,.12,.27]),COLORS.wood);
    } else if(o.type==='trex'){
      drawTrexObstacle(x,z,o);
    } else if(o.type==='ptero'){
      drawPteroObstacle(x,z,o);
    } else if(o.type==='thorn'){
      draw(meshes.sphere,model([x,.46,z],[0,o.spin,0],[1.12,.58,.88]),COLORS.thorn);
      for(let i=0;i<7;i++){
        const a=i/7*Math.PI*2;
        draw(meshes.cone,model([x+Math.cos(a)*.72,.62,z+Math.sin(a)*.55],[0,0,-a],[.07,.38,.07]),COLORS.tooth);
      }
    } else if(o.type==='cactus'){
      const e={x,z,scale:1.05,spin:o.spin}; drawCactus(e);
    } else if(o.type==='bone'){
      draw(meshes.cylinder,model([x,.38,z],[Math.PI/2,0,Math.PI/2],[.24,1.28,.24]),COLORS.bone);
      for(const side of [-1,1]){
        draw(meshes.sphere,model([x+side*1.24,.38,z],[0,0,0],[.34,.30,.30]),COLORS.bone);
        draw(meshes.sphere,model([x+side*1.42,.54,z],[0,0,0],[.22,.24,.22]),COLORS.bone);
      }
    } else if(o.type==='mud'){
      draw(meshes.sphere,model([x,.02,z],[0,o.spin,0],[1.35,.05,1.35]),COLORS.mud);
      draw(meshes.sphere,model([x+.28,.05,z-.18],[0,-o.spin,0],[.55,.035,.48]),[.28,.17,.08,1]);
    } else {
      draw(meshes.sphere,model([x,.95,z],[.1,o.spin,.08],[1.05,1.15,.95]),COLORS.stone);
      draw(meshes.sphere,model([x-.25,1.55,z-.08],[0,-o.spin,0],[.65,.65,.61]),COLORS.stoneLight);
      draw(meshes.sphere,model([x+.45,.54,z+.15],[0,o.spin*.7,0],[.52,.46,.48]),COLORS.stone);
    }
  }

  function drawAmber(a){
    const x=lanes[a.lane], y=a.y+Math.sin(worldTime*4+a.spin)*.09;
    gl.depthMask(false);
    draw(meshes.sphere,model([x,y,a.z],[0,a.spin,0],[.52,.67,.28]),COLORS.amberGlow);
    gl.depthMask(true);
    draw(meshes.sphere,model([x,y,a.z],[0,a.spin,.25],[.25,.37,.16]),COLORS.amber);
  }

  function drawRaptor(){
    if(player.invulnerable>0&&Math.floor(player.invulnerable*12)%2===0) return;
    const slideAmt=player.sliding>0 ? Math.min(1,player.sliding*3) : 0;
    const bob=player.y>0?0:Math.sin(player.runPhase*2)*.045*(1-slideAmt);
    const root=model([player.x,.02+player.y+bob,2],[0,player.lean*.2,-player.lean],[.80,.80,.80]);
    const bodyY=.98-.32*slideAmt;
    const bodyPitch=-.1-.46*slideAmt;
    const run=Math.sin(player.runPhase), runOpp=Math.sin(player.runPhase+Math.PI);
    const tailSway=Math.sin(player.runPhase*.45)*.16;

    gl.depthMask(false);
    draw(meshes.sphere,model([0,.08,0],[0,0,0],[.92,.055,1.25],root),COLORS.shadow);
    gl.depthMask(true);

    draw(meshes.sphere,model([0,bodyY,0],[bodyPitch,0,0],[.68,.68,1.18],root),COLORS.raptor);
    draw(meshes.sphere,model([0,bodyY-.16,-.27],[bodyPitch,0,0],[.52,.48,.83],root),COLORS.raptorLight);
    draw(meshes.sphere,model([0,bodyY+.08,.15],[0,0,0],[.7,.38,.82],root),COLORS.raptorDark);

    // Tail, segmented and animated.
    const tailParts=[
      [0,.92,1.02,.42,.40,1.05],
      [tailSway,.93,2.03,.32,.31,.92],
      [tailSway*2.2,.95,2.92,.23,.22,.78],
      [tailSway*3.5,.98,3.68,.13,.13,.61]
    ];
    tailParts.forEach((t,i)=>{
      draw(meshes.cylinder,model([t[0],t[1]-.30*slideAmt,t[2]],[Math.PI/2+tailSway*.2,0,-tailSway*.35],[t[3],t[5],t[4]],root),i%2?COLORS.raptor:COLORS.raptorDark);
    });

    // Neck and head.
    draw(meshes.cylinder,model([0,bodyY+.38,-.72],[.48+bodyPitch,0,0],[.38,.55,.38],root),COLORS.raptor);
    draw(meshes.sphere,model([0,bodyY+.68,-1.18],[bodyPitch*.45,0,0],[.55,.48,.76],root),COLORS.raptor);
    draw(meshes.sphere,model([0,bodyY+.59,-1.83],[.06+bodyPitch*.3,0,0],[.43,.30,.62],root),COLORS.raptorLight);
    draw(meshes.sphere,model([0,bodyY+.47,-1.82],[.16+Math.sin(player.runPhase*.5)*.03,0,0],[.39,.17,.58],root),COLORS.raptorDark);

    // Eyes and pupils.
    for(const side of [-1,1]){
      draw(meshes.sphere,model([side*.38,bodyY+.86,-1.50],[0,0,0],[.12,.14,.11],root),COLORS.eye);
      draw(meshes.sphere,model([side*.43,bodyY+.87,-1.58],[0,0,0],[.055,.08,.045],root),COLORS.pupil);
    }
    // Teeth.
    for(const side of [-1,1]) for(let i=0;i<3;i++){
      draw(meshes.cone,model([side*.25,bodyY+.48,-1.63-i*.18],[0,0,Math.PI],[.035,.10,.035],root),COLORS.tooth);
    }

    // Back stripes.
    for(let i=0;i<4;i++){
      draw(meshes.sphere,model([0,bodyY+.55,-.35+i*.33],[0,0,0],[.44-i*.055,.09,.10],root),COLORS.raptorDark);
    }

    // Legs.
    for(const side of [-1,1]){
      const phase=side===-1?run:runOpp;
      const hipX=side*.48, hipY=bodyY-.35, hipZ=.15;
      const thighRot=.20+phase*.63;
      const kneeZ=hipZ+Math.sin(thighRot)*.78;
      const kneeY=hipY-Math.cos(thighRot)*.62;
      draw(meshes.cylinder,model([hipX,(hipY+kneeY)/2,(hipZ+kneeZ)/2],[thighRot,0,0],[.20,.42,.20],root),COLORS.raptor);
      const shinRot=-.18-phase*.48;
      const ankleZ=kneeZ+Math.sin(shinRot)*.72;
      const ankleY=Math.max(.18,kneeY-Math.cos(shinRot)*.62);
      draw(meshes.cylinder,model([hipX,(kneeY+ankleY)/2,(kneeZ+ankleZ)/2],[shinRot,0,0],[.14,.39,.14],root),COLORS.raptorLight);
      draw(meshes.sphere,model([hipX,ankleY,ankleZ-.18],[0,0,0],[.22,.12,.44],root),COLORS.raptorDark);
      for(let c=-1;c<=1;c++) draw(meshes.cone,model([hipX+c*.11,ankleY-.02,ankleZ-.53],[Math.PI/2,0,0],[.035,.17,.035],root),COLORS.tooth);
    }

    // Arms.
    for(const side of [-1,1]){
      const arm=runOpp*.18*side;
      draw(meshes.cylinder,model([side*.52,bodyY+.26,-.73],[.75+arm,0,side*.2],[.09,.31,.09],root),COLORS.raptorLight);
      draw(meshes.cylinder,model([side*.59,bodyY+.02,-.95],[-.45-arm,0,side*.28],[.07,.23,.07],root),COLORS.raptorDark);
      for(let c=0;c<2;c++) draw(meshes.cone,model([side*(.60+c*.06),bodyY-.14,-1.07-c*.03],[Math.PI/2,0,0],[.022,.09,.022],root),COLORS.tooth);
    }
  }

  function drawParticles(){
    for(const p of particles){
      const c=[p.color[0],p.color[1],p.color[2],Math.max(0,p.life/p.max)];
      draw(meshes.sphere,model([p.x,p.y,p.z],[0,0,0],[.06,.06,.06]),c);
    }
  }

  function render(){
    resize();
    const blend=getDesertBlend();
    const sky=mixColor(COLORS.skyJungle,COLORS.skyDesert,blend);
    gl.clearColor(sky[0],sky[1],sky[2],1);
    gl.uniform3f(U.fogColor,sky[0],sky[1],sky[2]);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const aspect=canvas.width/canvas.height;
    const jx=shake?(Math.random()-.5)*shake:.0, jy=shake?(Math.random()-.5)*shake*.5:0;
    const camX=player.x*.18+jx;
    const eye=[camX,5.15+jy,10.8];
    const target=[player.x*.08,.9,-12];
    const vp=M4.multiply(M4.perspective(54*Math.PI/180,aspect,.1,160),M4.lookAt(eye,target,[0,1,0]));
    gl.uniformMatrix4fv(U.viewProj,false,vp); gl.uniform3fv(U.camera,eye);

    drawGround();
    const sorted=[...env].sort((a,b)=>a.z-b.z);
    for(const e of sorted){
      if(e.type==='tree') drawTree(e);
      else if(e.type==='cactus') drawCactus(e);
      else drawEnvRock(e);
    }
    for(const o of obstacles) drawObstacle(o);
    for(const a of ambers) drawAmber(a);
    drawRaptor();
    drawParticles();
  }

  function resize(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(1,Math.floor(innerWidth*dpr)), h=Math.max(1,Math.floor(innerHeight*dpr));
    if(canvas.width!==w||canvas.height!==h){ canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h); }
  }

  function frame(now){
    const dt=Math.min(.034,(now-lastTime)/1000||0); lastTime=now;
    if(state==='home') { worldTime+=dt; player.runPhase+=dt*2.1; }
    update(dt); render(); requestAnimationFrame(frame);
  }

  // ---------- controls ----------
  let pointerStart=null;
  canvas.addEventListener('pointerdown',(e)=>{
    pointerStart={x:e.clientX,y:e.clientY,t:performance.now()};
    try{canvas.setPointerCapture(e.pointerId);}catch(_){ }
  },{passive:true});
  canvas.addEventListener('pointerup',(e)=>{
    if(!pointerStart) return;
    const dx=e.clientX-pointerStart.x, dy=e.clientY-pointerStart.y;
    const ax=Math.abs(dx), ay=Math.abs(dy); pointerStart=null;
    if(state==='home'){ startGame(); return; }
    if(state!=='running') return;
    let action;
    if(Math.max(ax,ay)<26) action='up';
    else if(ax>ay) action=dx>0?'right':'left';
    else action=dy<0?'up':'down';
    handlePlayerAction(action);
  },{passive:true});
  canvas.addEventListener('pointercancel',()=>pointerStart=null);
  canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

  window.addEventListener('keydown',(e)=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Escape','p','P'].includes(e.key)) e.preventDefault();
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') handlePlayerAction('left');
    else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') handlePlayerAction('right');
    else if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'||e.key===' ') handlePlayerAction('up');
    else if(e.key==='ArrowDown'||e.key==='s'||e.key==='S') handlePlayerAction('down');
    else if(e.key==='Escape'||e.key==='p'||e.key==='P') state==='running'?pauseGame():resumeGame();
    else if(e.key==='Enter'&&state==='home') startGame();
  });

  ui.startBtn.addEventListener('click',startGame);
  ui.pauseBtn.addEventListener('click',pauseGame);
  ui.resumeBtn.addEventListener('click',resumeGame);
  ui.restartPauseBtn.addEventListener('click',startGame);
  ui.restartBtn.addEventListener('click',startGame);
  ui.homeBtn.addEventListener('click',goHome);
  ui.victoryRestartBtn.addEventListener('click',startGame);
  ui.victoryHomeBtn.addEventListener('click',goHome);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&state==='running') pauseGame(); });
  window.addEventListener('resize',resize);

  // Test hooks used by automated browser QA.
  window.__RAPTOR_GAME__={
    get state(){return state;},
    get stats(){return {distance:Math.floor(distance),amber:amberCount,speed:Number(speed.toFixed(2)),lane:player.lane,y:Number(player.y.toFixed(2)),sliding:player.sliding>0,lives,tutorial:tutorialPaused?TUTORIAL_STEPS[tutorialIndex]?.action:(tutorialDone?'done':tutorialIndex),desert:Number(getDesertBlend().toFixed(2)),obstacles:obstacles.length};},
    start:startGame,pause:pauseGame,resume:resumeGame,home:goHome,
    left:()=>handlePlayerAction('left'),right:()=>handlePlayerAction('right'),jump:()=>handlePlayerAction('up'),slide:()=>handlePlayerAction('down'),
    land(){player.y=0;player.vy=0;},
    skipTutorial(){tutorialDone=true;tutorialPaused=false;tutorialIndex=TUTORIAL_STEPS.length;tutorialObstacle=null;obstacles=[];spawnTimer=99;hideTutorial();},
    clearHazards(){obstacles=[];ambers=[];spawnTimer=99;},
    forceAmber(){ambers.push({lane:player.lane,z:1.35,y:.9+player.y,spin:0,taken:false});},
    forceObstacle(type='rock'){obstacles.push({type,lane:player.lane,z:1.35,passed:false,spin:0});},
    damage(){player.invulnerable=0;takeDamage({passed:false});},
    setDistance(value){distance=Math.max(0,Number(value)||0);updateGoalUI();},
    win(){distance=GOAL_DISTANCE;winGame();}
  };

  resetGame(); setState('home'); resize(); requestAnimationFrame(frame);
