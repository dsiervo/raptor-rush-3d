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

  function drawSceneryDetails(){
    const blend=getDesertBlend();
    const jungle=1-blend;
    for(let side=-1;side<=1;side+=2){
      const x=side*12.5;
      const rock=mixColor([.20,.30,.24,1],[.57,.31,.15,1],blend);
      draw(meshes.cube,model([x,3.4,-104],[0,side*.12,side*.02],[3.4,3.5,4.4]),rock);
      draw(meshes.cube,model([x+side*1.6,6.2,-111],[0,-side*.10,0],[2.1,2.7,3.0]),mixColor(rock,[.72,.43,.22,1],.24));
      draw(meshes.cube,model([x-side*.8,1.2,-91],[0,side*.2,0],[2.9,1.2,3.2]),mixColor(rock,[.32,.42,.27,1],jungle*.25));
      if(jungle>.18){
        for(let i=0;i<4;i++){
          const a=i*.95+side;
          draw(meshes.sphere,model([x+Math.sin(a)*2.2,5.8+i*.35,-94-i*4],[0,a,0],[1.25,1.7,.72]),[.12+.08*i,.38+.035*i,.19,.78*jungle]);
        }
      }
    }
    gl.depthMask(false);
    draw(meshes.sphere,model([8.8,12.4,-128],[0,0,0],[3.0,3.0,.18]),[1.0,.78,.31,.12+.14*blend]);
    gl.depthMask(true);
  }

  function drawTree(e){
    const s=e.scale;
    draw(meshes.cylinder,model([e.x,1.35*s,e.z],[0,e.spin,0],[.40*s,1.45*s,.40*s]),COLORS.trunk);
    for(let i=0;i<3;i++) draw(meshes.cylinder,model([e.x,(.55+i*.72)*s,e.z],[0,e.spin+i*.5,0],[.46*s,.07*s,.46*s]),COLORS.woodLight);
    const crownY=3.05*s;
    draw(meshes.sphere,model([e.x,crownY,e.z],[0,0,0],[.58*s,.48*s,.58*s]),COLORS.leaf);
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2+e.spin;
      const radius=1.10*s;
      draw(meshes.sphere,model([e.x+Math.cos(a)*radius,crownY+Math.sin(i*.8)*.16*s,e.z+Math.sin(a)*radius],[.08,-a,a*.12],[1.15*s,.18*s,.46*s]),i%2?COLORS.leaf:COLORS.leaf2);
    }
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2-e.spin*.4;
      draw(meshes.sphere,model([e.x+Math.cos(a)*.62*s,2.45*s,e.z+Math.sin(a)*.62*s],[0,-a,0],[.68*s,.13*s,.28*s]),COLORS.grass);
    }
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
    const step=Math.sin(worldTime*5.2+o.spin), bob=Math.abs(step)*.07;
    const dark=[.25,.20,.12,1], base=[.48,.38,.22,1], light=[.68,.53,.30,1];
    draw(meshes.sphere,model([x,1.74+bob,z-.15],[0,0,0],[1.18,.94,1.62]),base);
    draw(meshes.sphere,model([x,1.92+bob,z+.70],[-.12,0,0],[.92,.82,1.05]),light);
    draw(meshes.cylinder,model([x,2.20+bob,z+1.20],[.42,0,0],[.58,.72,.58]),base);
    draw(meshes.sphere,model([x,2.72+bob,z+1.72],[-.08,0,0],[.86,.66,.90]),base);
    draw(meshes.sphere,model([x,2.62+bob,z+2.42],[.05,0,0],[.72,.38,.83]),light);
    draw(meshes.sphere,model([x,2.38+bob,z+2.37],[.18,0,0],[.66,.22,.78]),dark);
    const tail=[[0,1.72,-1.48,.65,.92],[0,1.68,-2.55,.48,.82],[0,1.62,-3.48,.32,.70],[0,1.56,-4.22,.19,.55]];
    tail.forEach((t,i)=>draw(meshes.cylinder,model([x+t[0],t[1]+bob,z+t[2]],[Math.PI/2+.04*i,0,0],[t[3],t[4],t[3]]),i%2?dark:base));
    for(const side of [-1,1]){
      const phase=side===-1?step:-step;
      draw(meshes.cylinder,model([x+side*.68,.92,z-.10+phase*.20],[phase*.26,0,side*.08],[.34,.72,.34]),light);
      draw(meshes.cylinder,model([x+side*.70,.31,z+.18-phase*.18],[-phase*.20,0,0],[.25,.55,.25]),base);
      draw(meshes.sphere,model([x+side*.70,.09,z+.56],[0,0,0],[.46,.16,.70]),dark);
      for(let c=-1;c<=1;c++) draw(meshes.cone,model([x+side*.70+c*.14,.08,z+1.02],[Math.PI/2,0,0],[.045,.20,.045]),COLORS.tooth);
      draw(meshes.cylinder,model([x+side*.70,2.02+bob,z+1.15],[.78,0,side*.32],[.10,.34,.10]),dark);
      draw(meshes.cylinder,model([x+side*.78,1.78+bob,z+1.42],[-.52,0,side*.25],[.075,.24,.075]),base);
      draw(meshes.sphere,model([x+side*.56,2.94+bob,z+2.24],[0,0,0],[.10,.12,.075]),COLORS.eye);
      draw(meshes.sphere,model([x+side*.60,2.95+bob,z+2.31],[0,0,0],[.045,.065,.035]),COLORS.pupil);
    }
    for(const side of [-1,1]) for(let i=0;i<5;i++) draw(meshes.cone,model([x+side*(.12+i*.10),2.43+bob,z+2.84-i*.05],[Math.PI/2,0,0],[.035,.13,.035]),COLORS.tooth);
    for(let i=0;i<7;i++) draw(meshes.cone,model([x,2.66-i*.10+bob,z+.95-i*.48],[0,0,Math.PI],[.08,.20-i*.012,.08]),dark);
  }


  function drawPteroObstacle(x,z,o){
    const flap=Math.sin(worldTime*8.4+o.spin);
    const lift=Math.abs(flap)*.22;
    const body=[.34,.28,.72], skin=[.34,.29,.20,1], light=[.62,.49,.31,1], membrane=[.55,.38,.23,.88];
    draw(meshes.sphere,model([x,1.72+lift,z],[0,0,0],body),skin);
    draw(meshes.cylinder,model([x,1.82+lift,z+.72],[Math.PI/2-.18,0,0],[.20,.52,.20]),light);
    draw(meshes.sphere,model([x,2.02+lift,z+1.17],[0,0,0],[.30,.28,.42]),skin);
    draw(meshes.cone,model([x,2.00+lift,z+1.82],[Math.PI/2,0,0],[.18,.72,.15]),[.92,.45,.12,1]);
    draw(meshes.cone,model([x,1.88+lift,z+1.72],[Math.PI/2+.10,0,Math.PI],[.12,.58,.10]),[.68,.27,.10,1]);
    draw(meshes.cone,model([x,2.40+lift,z+.98],[-Math.PI/2-.15,0,0],[.16,.58,.13]),[.82,.34,.10,1]);
    for(const side of [-1,1]){
      const wingAngle=side*(.14-flap*.30);
      const outerAngle=side*(.22-flap*.46);
      draw(meshes.cylinder,model([x+side*.83,1.88+lift,z],[0,0,Math.PI/2+wingAngle],[.10,.92,.10]),skin);
      draw(meshes.cylinder,model([x+side*2.15,1.94+lift+Math.abs(flap)*.18,z-.08],[0,0,Math.PI/2+outerAngle],[.075,1.10,.075]),light);
      draw(meshes.cube,model([x+side*.92,1.73+lift,z-.12],[0,0,wingAngle],[.93,.055,.64]),membrane);
      draw(meshes.cube,model([x+side*2.20,1.80+lift+Math.abs(flap)*.18,z-.20],[0,0,outerAngle],[1.15,.045,.50]),[.48,.32,.20,.82]);
      draw(meshes.cone,model([x+side*3.30,1.88+lift+Math.abs(flap)*.24,z-.25],[0,0,-side*Math.PI/2],[.07,.32,.07]),[.18,.14,.10,1]);
      draw(meshes.sphere,model([x+side*.22,2.12+lift,z+1.32],[0,0,0],[.065,.075,.055]),COLORS.eye);
      draw(meshes.sphere,model([x+side*.25,2.13+lift,z+1.38],[0,0,0],[.028,.045,.025]),COLORS.pupil);
    }
    draw(meshes.cylinder,model([x,1.58+lift,z-.78],[Math.PI/2,0,0],[.16,.48,.16]),skin);
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
    const slideAmt=player.sliding>0?Math.min(1,player.sliding*3):0;
    const bob=player.y>0?0:Math.sin(player.runPhase*2)*.045*(1-slideAmt);
    const root=model([player.x,.02+player.y+bob,2],[0,player.lean*.2,-player.lean],[.80,.80,.80]);
    const bodyY=.98-.32*slideAmt,pitch=-.10-.46*slideAmt;
    const run=Math.sin(player.runPhase),opposite=Math.sin(player.runPhase+Math.PI),sway=Math.sin(player.runPhase*.45)*.16;
    gl.depthMask(false);draw(meshes.sphere,model([0,.08,0],[0,0,0],[.95,.055,1.30],root),COLORS.shadow);gl.depthMask(true);
    draw(meshes.sphere,model([0,bodyY,0],[pitch,0,0],[.70,.70,1.20],root),COLORS.raptor);
    draw(meshes.sphere,model([0,bodyY-.18,-.30],[pitch,0,0],[.54,.49,.86],root),COLORS.raptorLight);
    draw(meshes.sphere,model([0,bodyY+.12,.18],[0,0,0],[.72,.39,.84],root),COLORS.raptorDark);
    [[0,.92,1.02,.43,1.05],[sway,.93,2.03,.33,.92],[sway*2.2,.95,2.92,.23,.78],[sway*3.5,.98,3.68,.13,.61]].forEach((t,i)=>draw(meshes.cylinder,model([t[0],t[1]-.30*slideAmt,t[2]],[Math.PI/2+sway*.2,0,-sway*.35],[t[3],t[4],t[3]],root),i%2?COLORS.raptor:COLORS.raptorDark));
    draw(meshes.cylinder,model([0,bodyY+.40,-.73],[.48+pitch,0,0],[.39,.56,.39],root),COLORS.raptor);
    draw(meshes.sphere,model([0,bodyY+.70,-1.18],[pitch*.45,0,0],[.57,.49,.78],root),COLORS.raptor);
    draw(meshes.sphere,model([0,bodyY+.62,-1.82],[.05+pitch*.3,0,0],[.45,.31,.64],root),COLORS.raptorLight);
    draw(meshes.sphere,model([0,bodyY+.47,-1.84],[.18,0,0],[.40,.17,.60],root),COLORS.raptorDark);
    draw(meshes.sphere,model([0,bodyY+.70,-1.90],[0,0,0],[.30,.11,.42],root),COLORS.raptor);
    for(const side of [-1,1]){
      draw(meshes.sphere,model([side*.39,bodyY+.88,-1.50],[0,0,0],[.125,.145,.115],root),COLORS.eye);
      draw(meshes.sphere,model([side*.44,bodyY+.89,-1.59],[0,0,0],[.055,.082,.045],root),COLORS.pupil);
      draw(meshes.sphere,model([side*.26,bodyY+.98,-1.40],[0,0,side*.18],[.28,.08,.24],root),COLORS.raptorDark);
      for(let i=0;i<4;i++) draw(meshes.cone,model([side*.25,bodyY+.49,-1.62-i*.16],[0,0,Math.PI],[.032,.095,.032],root),COLORS.tooth);
    }
    for(let i=0;i<5;i++){
      draw(meshes.sphere,model([0,bodyY+.57,-.42+i*.32],[0,0,0],[.45-i*.052,.085,.10],root),COLORS.raptorDark);
      draw(meshes.cone,model([0,bodyY+.72,-.50+i*.42],[0,0,Math.PI],[.055,.18,.055],root),COLORS.raptorDark);
    }
    for(const side of [-1,1]){
      const phase=side===-1?run:opposite,hipX=side*.49,hipY=bodyY-.35,hipZ=.15;
      const thigh=.20+phase*.63,kneeZ=hipZ+Math.sin(thigh)*.78,kneeY=hipY-Math.cos(thigh)*.62;
      draw(meshes.cylinder,model([hipX,(hipY+kneeY)/2,(hipZ+kneeZ)/2],[thigh,0,0],[.21,.43,.21],root),COLORS.raptor);
      const shin=-.18-phase*.48,ankleZ=kneeZ+Math.sin(shin)*.72,ankleY=Math.max(.18,kneeY-Math.cos(shin)*.62);
      draw(meshes.cylinder,model([hipX,(kneeY+ankleY)/2,(kneeZ+ankleZ)/2],[shin,0,0],[.145,.40,.145],root),COLORS.raptorLight);
      draw(meshes.sphere,model([hipX,ankleY,ankleZ-.18],[0,0,0],[.23,.12,.45],root),COLORS.raptorDark);
      for(let c=-1;c<=1;c++) draw(meshes.cone,model([hipX+c*.11,ankleY-.02,ankleZ-.53],[Math.PI/2,0,0],[.036,.18,.036],root),COLORS.tooth);
      draw(meshes.cone,model([hipX-side*.18,ankleY+.13,ankleZ-.28],[.42,0,side*.52],[.065,.25,.065],root),COLORS.tooth);
      const arm=opposite*.18*side;
      draw(meshes.cylinder,model([side*.53,bodyY+.27,-.73],[.75+arm,0,side*.2],[.095,.32,.095],root),COLORS.raptorLight);
      draw(meshes.cylinder,model([side*.60,bodyY+.02,-.96],[-.45-arm,0,side*.28],[.072,.24,.072],root),COLORS.raptorDark);
      draw(meshes.sphere,model([side*.69,bodyY+.17,-.86],[0,0,side*.30],[.10,.28,.34],root),COLORS.raptorDark);
      for(let c=0;c<2;c++) draw(meshes.cone,model([side*(.61+c*.06),bodyY-.14,-1.08-c*.03],[Math.PI/2,0,0],[.022,.095,.022],root),COLORS.tooth);
    }
    for(const side of [-1,1]) draw(meshes.sphere,model([side*.21,bodyY+.76,-2.18],[0,0,0],[.035,.028,.025],root),COLORS.pupil);
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
    drawSceneryDetails();
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
