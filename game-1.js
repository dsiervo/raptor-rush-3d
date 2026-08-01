  'use strict';

  const canvas = document.getElementById('game');
  const gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: false,
    depth: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: false
  });

  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $('hud'), score: $('score'), amber: $('amber'), combo: $('combo'),
    speedBars: [...document.querySelectorAll('#speed-meter span')],
    lives: $('lives'), lifeHearts: [...document.querySelectorAll('#lives span')],
    goalDistance: $('goal-distance'), goalFill: $('goal-fill'), damage: $('damage-flash'),
    tutorial: $('tutorial-overlay'), tutorialTitle: $('tutorial-title'),
    tutorialGesture: $('tutorial-gesture'), tutorialCard: document.querySelector('.tutorial-card'),
    start: $('start-screen'), pause: $('pause-screen'), over: $('gameover-screen'), win: $('victory-screen'),
    startBtn: $('start-btn'), pauseBtn: $('pause-btn'), resumeBtn: $('resume-btn'),
    restartPauseBtn: $('restart-pause-btn'), restartBtn: $('restart-btn'), homeBtn: $('home-btn'),
    victoryRestartBtn: $('victory-restart-btn'), victoryHomeBtn: $('victory-home-btn'),
    finalScore: $('final-score'), finalAmber: $('final-amber'), bestScore: $('best-score'),
    victoryScore: $('victory-score'), victoryAmber: $('victory-amber'), victoryLives: $('victory-lives'),
    resultTitle: $('result-title'), error: $('webgl-error')
  };

  if (!gl) {
    ui.error.classList.add('visible');
    return;
  }

  // ---------- tiny matrix library (column-major) ----------
  const M4 = {
    identity() {
      return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    },
    multiply(a, b) {
      const out = new Float32Array(16);
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
          out[c * 4 + r] =
            a[0 * 4 + r] * b[c * 4 + 0] +
            a[1 * 4 + r] * b[c * 4 + 1] +
            a[2 * 4 + r] * b[c * 4 + 2] +
            a[3 * 4 + r] * b[c * 4 + 3];
        }
      }
      return out;
    },
    translation(x, y, z) {
      const m = M4.identity(); m[12] = x; m[13] = y; m[14] = z; return m;
    },
    scaling(x, y, z) {
      const m = M4.identity(); m[0] = x; m[5] = y; m[10] = z; return m;
    },
    rotationX(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
    },
    rotationY(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
    },
    rotationZ(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
    },
    compose(pos = [0,0,0], rot = [0,0,0], scale = [1,1,1], parent = null) {
      let m = parent ? new Float32Array(parent) : M4.identity();
      m = M4.multiply(m, M4.translation(pos[0], pos[1], pos[2]));
      if (rot[1]) m = M4.multiply(m, M4.rotationY(rot[1]));
      if (rot[0]) m = M4.multiply(m, M4.rotationX(rot[0]));
      if (rot[2]) m = M4.multiply(m, M4.rotationZ(rot[2]));
      return M4.multiply(m, M4.scaling(scale[0], scale[1], scale[2]));
    },
    perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      const out = new Float32Array(16);
      out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf;
      out[11] = -1; out[14] = 2 * far * near * nf;
      return out;
    },
    lookAt(eye, center, up) {
      let zx = eye[0]-center[0], zy = eye[1]-center[1], zz = eye[2]-center[2];
      let len = Math.hypot(zx,zy,zz) || 1; zx/=len; zy/=len; zz/=len;
      let xx = up[1]*zz-up[2]*zy, xy = up[2]*zx-up[0]*zz, xz = up[0]*zy-up[1]*zx;
      len = Math.hypot(xx,xy,xz) || 1; xx/=len; xy/=len; xz/=len;
      const yx = zy*xz-zz*xy, yy = zz*xx-zx*xz, yz = zx*xy-zy*xx;
      return new Float32Array([
        xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0,
        -(xx*eye[0]+xy*eye[1]+xz*eye[2]),
        -(yx*eye[0]+yy*eye[1]+yz*eye[2]),
        -(zx*eye[0]+zy*eye[1]+zz*eye[2]), 1
      ]);
    }
  };

  const COLORS = {
    road: [0.28,0.25,0.18,1], roadAlt: [0.34,0.30,0.21,1],
    soil: [0.22,0.35,0.19,1], grass: [0.23,0.48,0.27,1], grassDark: [0.12,0.34,0.22,1],
    trunk: [0.27,0.16,0.08,1], leaf: [0.16,0.48,0.27,1], leaf2:[0.31,0.62,0.27,1],
    raptor: [0.38,0.60,0.25,1], raptorLight: [0.62,0.72,0.34,1], raptorDark:[0.14,0.30,0.16,1],
    eye:[0.98,0.78,0.19,1], pupil:[0.02,0.03,0.02,1], tooth:[0.96,0.94,0.78,1],
    stone:[0.35,0.38,0.34,1], stoneLight:[0.49,0.52,0.47,1],
    wood:[0.34,0.19,0.09,1], woodLight:[0.51,0.30,0.12,1],
    amber:[1.0,0.55,0.08,1], amberGlow:[1.0,0.62,0.12,.18],
    shadow:[0.01,0.02,0.02,.28], white:[1,1,1,1], red:[0.9,0.18,0.08,1],
    sand:[0.66,0.48,0.25,1], sandLight:[0.83,0.66,0.36,1], desertSoil:[0.52,0.34,0.18,1],
    cactus:[0.20,0.46,0.25,1], cactusLight:[0.34,0.61,0.31,1], bone:[0.88,0.82,0.64,1],
    trex:[0.43,0.29,0.16,1], trexLight:[0.62,0.42,0.21,1], trexDark:[0.20,0.12,0.07,1],
    ptero:[0.36,0.26,0.18,1], pteroLight:[0.67,0.47,0.27,1], thorn:[0.25,0.38,0.15,1], mud:[0.16,0.10,0.06,1],
    skyJungle:[0.47,0.76,0.66,1], skyDesert:[0.93,0.68,0.39,1]
  };

  // ---------- shaders ----------
  const vertexShaderSource = `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uViewProj;
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main(){
      vec4 world = uModel * vec4(aPosition,1.0);
      vWorld = world.xyz;
      vNormal = normalize(mat3(uModel) * aNormal);
      gl_Position = uViewProj * world;
    }`;
  const fragmentShaderSource = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vWorld;
    uniform vec4 uColor;
    uniform vec3 uLightDir;
    uniform vec3 uCamera;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform vec3 uFogColor;
    void main(){
      vec3 n = normalize(vNormal);
      float diff = max(dot(n, normalize(-uLightDir)), 0.0);
      float rim = pow(1.0 - max(dot(n, normalize(uCamera-vWorld)), 0.0), 2.0) * .16;
      vec3 viewDir=normalize(uCamera-vWorld); float spec=pow(max(dot(reflect(normalize(uLightDir),n),viewDir),0.0),18.0)*.16; float hemi=.08*(n.y*.5+.5); vec3 lit=uColor.rgb*(.48+diff*.62+rim+hemi)+vec3(spec);
      float d = distance(uCamera, vWorld);
      float fog = smoothstep(uFogNear,uFogFar,d);
      gl_FragColor = vec4(mix(lit,uFogColor,fog),uColor.a);
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.bindAttribLocation(program,0,'aPosition');
  gl.bindAttribLocation(program,1,'aNormal');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const U = {
    model: gl.getUniformLocation(program,'uModel'), viewProj: gl.getUniformLocation(program,'uViewProj'),
    color: gl.getUniformLocation(program,'uColor'), light: gl.getUniformLocation(program,'uLightDir'),
    camera: gl.getUniformLocation(program,'uCamera'), fogNear: gl.getUniformLocation(program,'uFogNear'),
    fogFar: gl.getUniformLocation(program,'uFogFar'), fogColor: gl.getUniformLocation(program,'uFogColor')
  };

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(.47,.76,.66,1);
  gl.uniform3f(U.light,-.55,-1,.45);
  gl.uniform1f(U.fogNear,35);
  gl.uniform1f(U.fogFar,125);
  gl.uniform3f(U.fogColor,.47,.76,.66);

  // ---------- primitive meshes ----------
  function createMesh(positions, normals, indices) {
    const data = new Float32Array(positions.length * 2);
    for (let i=0;i<positions.length/3;i++) {
      data[i*6]=positions[i*3]; data[i*6+1]=positions[i*3+1]; data[i*6+2]=positions[i*3+2];
      data[i*6+3]=normals[i*3]; data[i*6+4]=normals[i*3+1]; data[i*6+5]=normals[i*3+2];
    }
    const vbo=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vbo); gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    const ibo=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    return {vbo,ibo,count:indices.length};
  }

  function cubeMesh() {
    const p=[],n=[],idx=[];
    const faces=[
      [[-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1],[0,0,1]],
      [[ 1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],[0,0,-1]],
      [[-1, 1, 1],[1, 1, 1],[1,1,-1],[-1,1,-1],[0,1,0]],
      [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[0,-1,0]],
      [[ 1,-1, 1],[1,-1,-1],[1,1,-1],[1,1,1],[1,0,0]],
      [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,0,0]]
    ];
    faces.forEach((f,fi)=>{ const base=fi*4; for(let i=0;i<4;i++){p.push(...f[i]); n.push(...f[4]);} idx.push(base,base+1,base+2,base,base+2,base+3); });
    return createMesh(p,n,idx);
  }
  function sphereMesh(lat=10,lon=14) {
    const p=[],n=[],idx=[];
    for(let y=0;y<=lat;y++){
      const v=y/lat, phi=v*Math.PI;
      for(let x=0;x<=lon;x++){
        const u=x/lon, theta=u*Math.PI*2;
        const sx=Math.sin(phi)*Math.cos(theta), sy=Math.cos(phi), sz=Math.sin(phi)*Math.sin(theta);
        p.push(sx,sy,sz); n.push(sx,sy,sz);
      }
    }
    for(let y=0;y<lat;y++) for(let x=0;x<lon;x++){
      const a=y*(lon+1)+x,b=a+lon+1;
      idx.push(a,b,a+1,b,b+1,a+1);
    }
    return createMesh(p,n,idx);
  }
  function cylinderMesh(segments=14, top=.78) {
    const p=[],n=[],idx=[];
    for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const nx=c, nz=s;
      p.push(c,-1,s, c*top,1,s*top); n.push(nx,0,nz,nx,0,nz);
    }
    for(let i=0;i<segments;i++){ const a=i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); }
    const bottomCenter=p.length/3; p.push(0,-1,0); n.push(0,-1,0);
    const topCenter=p.length/3; p.push(0,1,0); n.push(0,1,0);
    for(let i=0;i<segments;i++){ const a=i*2,b=((i+1)%segments)*2; idx.push(bottomCenter,b,a); idx.push(topCenter,a+1,b+1); }
    return createMesh(p,n,idx);
  }
  const meshes={cube:cubeMesh(),sphere:sphereMesh(),cylinder:cylinderMesh(),cone:cylinderMesh(14,.08)};
