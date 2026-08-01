from pathlib import Path


def replace_function(src: str, name: str, replacement: str) -> str:
    token = f"  function {name}("
    start = src.index(token)
    brace = src.index("{", start)
    depth = 0
    quote = None
    escape = False
    i = brace
    while i < len(src):
        c = src[i]
        if quote:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == quote:
                quote = None
        else:
            if c in "'\"`": quote = c
            elif c == "{": depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return src[:start] + replacement.rstrip() + "\n" + src[i+1:]
        i += 1
    raise RuntimeError(f"Unclosed function {name}")

root = Path('.')
index = root / 'index.html'
game1 = root / 'game-1.js'
game3 = root / 'game-3.js'

html = index.read_text(encoding='utf-8')
if 'hd-procedural.css' not in html:
    html = html.replace('</head>', '  <link rel="stylesheet" href="hd-procedural.css?v=20260801-3d2" />\n</head>')
index.write_text(html, encoding='utf-8')

g1 = game1.read_text(encoding='utf-8')
g1 = g1.replace(
    'vec3 lit = uColor.rgb * (0.52 + diff * 0.58 + rim);',
    'vec3 viewDir=normalize(uCamera-vWorld); float spec=pow(max(dot(reflect(normalize(uLightDir),n),viewDir),0.0),18.0)*.16; float hemi=.08*(n.y*.5+.5); vec3 lit=uColor.rgb*(.48+diff*.62+rim+hemi)+vec3(spec);'
)
game1.write_text(g1, encoding='utf-8')

scenery = r'''  function drawSceneryDetails(){
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
'''

ptero = r'''  function drawPteroObstacle(x,z,o){
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
'''

trex = r'''  function drawTrexObstacle(x,z,o){
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
'''

tree = r'''  function drawTree(e){
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
'''

raptor = r'''  function drawRaptor(){
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
'''

g3=game3.read_text(encoding='utf-8')
for name,code in [('drawTree',tree),('drawPteroObstacle',ptero),('drawTrexObstacle',trex),('drawRaptor',raptor)]:
    g3=replace_function(g3,name,code)
if 'function drawSceneryDetails' not in g3:
    g3=g3.replace('  function drawTree(e){',scenery+'\n  function drawTree(e){',1)
g3=g3.replace('    drawGround();\n','    drawGround();\n    drawSceneryDetails();\n',1)
game3.write_text(g3,encoding='utf-8')
