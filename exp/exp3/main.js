// ============================================================
// 实验三 · 基于 WebGL 的纹理映射与光照渲染（在实验二基础上）
// 功能：
//   1. 摄像机漫游与环视（Fly 相机：WASD/方向键移动 + 鼠标拖动环视 + 滚轮缩放）
//   2. 三维对象单独展示、可切换：圆环体(镂垫)/立方体/球体，程序化棋盘格纹理，自动旋转
//   3. 地面参与光照，颜色可调（与光源颜色相乘混合）
//   4. 三种光源颜色/方向/衰减各异，可明显辨别：平行光(暖白)/点光源(红)/聚光灯(绿)
//   5. 投影阴影：物体沿平行光方向投影到地面，形成半透明阴影
// ============================================================

// ---------- 顶点着色器（光照）----------
var VSHADER_SOURCE =
  `#version 300 es
  precision mediump float;
  in vec3 a_Position;
  in vec3 a_Normal;
  in vec2 a_TexCoord;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  out vec3 v_WorldPos;
  out vec3 v_Normal;
  out vec2 v_TexCoord;
  void main() {
    gl_Position = u_MvpMatrix * vec4(a_Position, 1.0);
    v_WorldPos = (u_ModelMatrix * vec4(a_Position, 1.0)).xyz;
    v_Normal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);
    v_TexCoord = a_TexCoord;
  }`;

// ---------- 片元着色器：三种光源的逐片元 Blinn-Phong ----------
var FSHADER_SOURCE =
  `#version 300 es
  precision mediump float;
  in vec3 v_WorldPos;
  in vec3 v_Normal;
  in vec2 v_TexCoord;

  uniform vec3 u_CameraPos;
  uniform float u_Ambient;
  uniform vec3 u_DirLightDir, u_DirLightColor;
  uniform float u_DirLightOn;
  uniform vec3 u_PointLightPos, u_PointLightColor;
  uniform float u_PointLightOn;
  uniform vec3 u_SpotPos, u_SpotDir, u_SpotColor;
  uniform float u_SpotOn, u_SpotCutoff;
  uniform float u_MatSpecular, u_Shininess;
  uniform float u_UseTexture;
  uniform sampler2D u_Sampler;
  uniform vec3 u_ObjectColor;

  out vec4 fragColor;

  vec3 calcLight(vec3 L, vec3 lightColor, vec3 base, vec3 N, vec3 V) {
    vec3 H = normalize(L + V);
    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), u_Shininess);
    return diff * lightColor * base + spec * lightColor * u_MatSpecular;
  }

  void main() {
    vec3 N = normalize(v_Normal);
    vec3 V = normalize(u_CameraPos - v_WorldPos);
    vec3 base = u_UseTexture > 0.5 ? texture(u_Sampler, v_TexCoord).rgb : u_ObjectColor;

    vec3 color = u_Ambient * base;

    if (u_DirLightOn > 0.5) {
      vec3 L = normalize(-u_DirLightDir);
      color += calcLight(L, u_DirLightColor, base, N, V);
    }
    if (u_PointLightOn > 0.5) {
      vec3 L = normalize(u_PointLightPos - v_WorldPos);
      float d = length(u_PointLightPos - v_WorldPos);
      float att = 1.0 / (1.0 + 0.09 * d + 0.032 * d * d);
      color += calcLight(L, u_PointLightColor, base, N, V) * att;
    }
    if (u_SpotOn > 0.5) {
      vec3 L = normalize(u_SpotPos - v_WorldPos);
      float d = length(u_SpotPos - v_WorldPos);
      float att = 1.0 / (1.0 + 0.03 * d);        // 更弱的线性衰减，保证地面亮度
      vec3 toSurface = normalize(v_WorldPos - u_SpotPos);
      float cosTheta = dot(toSurface, normalize(u_SpotDir));
      float spot = step(u_SpotCutoff, cosTheta); // 硬边缘：截止角内=1，外=0
      color += calcLight(L, u_SpotColor, base, N, V) * att * spot;
    }

    fragColor = vec4(color, 1.0);
  }`;

// ---------- 阴影着色器（平面投影阴影，半透明黑）----------
var SHADOW_VS =
  `#version 300 es
  precision mediump float;
  in vec3 a_Position;
  uniform mat4 u_MvpMatrix;
  void main() {
    gl_Position = u_MvpMatrix * vec4(a_Position, 1.0);
  }`;
var SHADOW_FS =
  `#version 300 es
  precision mediump float;
  uniform vec4 u_ShadowColor;
  out vec4 fragColor;
  void main() {
    fragColor = u_ShadowColor;
  }`;

// ---------- 全局 ----------
var g_gl, g_canvas;
var g_u = {}, g_su = {};
var g_torus = null, g_cube = null, g_sphere = null, g_ground = null, g_tex = null;
var g_lightProgram, g_shadowProgram;
var g_projMatrix = new Matrix4();
var g_viewMatrix = new Matrix4();

// 相机（Fly）
var g_eye = { x: 0, y: 3, z: 11 };
var g_yaw = 0, g_pitch = -8, g_fov = 45;
var g_keys = {};
var MOVE_SPEED = 6.0, PITCH_LIMIT = 89;

var g_currentObject = 'torus';   // 'torus' | 'cube' | 'sphere'
var g_angle = 0;                 // 物体自动旋转角度

// 平行光（方向/强度/颜色可调）
var g_dirDir = [0.5, -1.0, 0.3];
var g_dirIntensity = 1.0;
var g_dirColor = [1.0, 0.90, 0.70];

// 点光源（位置/强度/颜色可调）
var g_pointPos = [3.0, 3.0, 3.0];
var g_pointIntensity = 1.0;
var g_pointColor = [1.0, 0.30, 0.25];

// 聚光灯（方向/强度/颜色可调，位置固定）
var g_spotPos = [0.0, 9.0, 0.0];
var g_spotDir = [0.0, -1.0, 0.0];
var g_spotIntensity = 1.0;
var g_spotColor = [0.25, 1.0, 0.45];
var g_spotCutoff = Math.cos(22 * Math.PI / 180);

// 材质
var g_ambient = 0.08, g_specular = 0.6, g_shininess = 32.0;
var g_dirOn = true, g_pointOn = true, g_spotOn = true, g_useTexture = true, g_shadowOn = true;
var g_groundColor = [0.45, 0.45, 0.48];
var GROUND_Y = -1.5;

function main() {
  g_canvas = document.getElementById('webgl');
  g_gl = getWebGLContext(g_canvas);
  if (!g_gl) { console.log('获取 WebGL 上下文失败'); return; }

  g_lightProgram = createProgram(VSHADER_SOURCE, FSHADER_SOURCE);
  g_shadowProgram = createProgram(SHADOW_VS, SHADOW_FS);
  g_gl.useProgram(g_lightProgram);

  ['u_MvpMatrix','u_ModelMatrix','u_NormalMatrix','u_CameraPos','u_Ambient',
   'u_DirLightDir','u_DirLightColor','u_DirLightOn',
   'u_PointLightPos','u_PointLightColor','u_PointLightOn',
   'u_SpotPos','u_SpotDir','u_SpotColor','u_SpotOn','u_SpotCutoff',
   'u_MatSpecular','u_Shininess','u_UseTexture','u_Sampler','u_ObjectColor'
  ].forEach(function(name) { g_u[name] = g_gl.getUniformLocation(g_lightProgram, name); });
  g_su.u_MvpMatrix = g_gl.getUniformLocation(g_shadowProgram, 'u_MvpMatrix');
  g_su.u_ShadowColor = g_gl.getUniformLocation(g_shadowProgram, 'u_ShadowColor');

  g_torus = buildTorus(1.3, 0.45, 48, 24);
  g_cube = buildCube();
  g_sphere = buildSphere(1.2, 40, 40);
  g_ground = buildGround();
  g_tex = createCheckerboardTexture(64);

  g_gl.enable(g_gl.DEPTH_TEST);
  g_gl.clearColor(0.02, 0.02, 0.03, 1.0);

  bindInput();
  bindUI();
  tick();
}

function createProgram(vs, fs) {
  var gl = g_gl, p = gl.createProgram();
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.log(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  sh(gl.VERTEX_SHADER, vs); sh(gl.FRAGMENT_SHADER, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.log(gl.getProgramInfoLog(p));
  return p;
}

// ---------- UI ----------
function bindUI() {
  document.getElementById('objTorus').onclick = function() { g_currentObject = 'torus'; };
  document.getElementById('objCube').onclick = function() { g_currentObject = 'cube'; };
  document.getElementById('objSphere').onclick = function() { g_currentObject = 'sphere'; };

  document.getElementById('groundColor').oninput = function() {
    var c = hexToRgb(this.value);
    g_groundColor = c;
  };
  document.getElementById('ambient').oninput = function() { g_ambient = parseFloat(this.value); };
  document.getElementById('specular').oninput = function() { g_specular = parseFloat(this.value); };
  document.getElementById('shininess').oninput = function() { g_shininess = parseFloat(this.value); };
  document.getElementById('useTex').onchange = function() { g_useTexture = this.checked; };
  document.getElementById('shadowOn').onchange = function() { g_shadowOn = this.checked; };

  // 平行光：方向 / 强度 / 颜色
  document.getElementById('dirOn').onchange = function() { g_dirOn = this.checked; };
  document.getElementById('dirDX').oninput = function() { g_dirDir[0] = parseFloat(this.value); };
  document.getElementById('dirDY').oninput = function() { g_dirDir[1] = parseFloat(this.value); };
  document.getElementById('dirDZ').oninput = function() { g_dirDir[2] = parseFloat(this.value); };
  document.getElementById('dirIntensity').oninput = function() { g_dirIntensity = parseFloat(this.value); };
  document.getElementById('dirColor').oninput = function() { g_dirColor = hexToRgb(this.value); };

  // 点光源：位置 / 强度 / 颜色
  document.getElementById('pointOn').onchange = function() { g_pointOn = this.checked; };
  document.getElementById('lx').oninput = function() { g_pointPos[0] = parseFloat(this.value); };
  document.getElementById('ly').oninput = function() { g_pointPos[1] = parseFloat(this.value); };
  document.getElementById('lz').oninput = function() { g_pointPos[2] = parseFloat(this.value); };
  document.getElementById('pointIntensity').oninput = function() { g_pointIntensity = parseFloat(this.value); };
  document.getElementById('lightColor').oninput = function() { g_pointColor = hexToRgb(this.value); };

  // 聚光灯：方向 / 强度 / 颜色
  document.getElementById('spotOn').onchange = function() { g_spotOn = this.checked; };
  document.getElementById('spotDX').oninput = function() { g_spotDir[0] = parseFloat(this.value); };
  document.getElementById('spotDY').oninput = function() { g_spotDir[1] = parseFloat(this.value); };
  document.getElementById('spotDZ').oninput = function() { g_spotDir[2] = parseFloat(this.value); };
  document.getElementById('spotIntensity').oninput = function() { g_spotIntensity = parseFloat(this.value); };
  document.getElementById('spotColor').oninput = function() { g_spotColor = hexToRgb(this.value); };
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255];
}

// ---------- 相机 ----------
function forwardDir() {
  var y = g_yaw * Math.PI / 180, p = g_pitch * Math.PI / 180;
  return { x: Math.sin(y)*Math.cos(p), y: Math.sin(p), z: -Math.cos(y)*Math.cos(p) };
}
function rightDir() {
  var y = g_yaw * Math.PI / 180;
  return { x: Math.cos(y), y: 0, z: Math.sin(y) };
}
function updateCamera(dt) {
  var f = forwardDir(), r = rightDir(), d = MOVE_SPEED * dt;
  if (g_keys['w'] || g_keys['arrowup'])    { g_eye.x += f.x*d; g_eye.y += f.y*d; g_eye.z += f.z*d; }
  if (g_keys['s'] || g_keys['arrowdown'])  { g_eye.x -= f.x*d; g_eye.y -= f.y*d; g_eye.z -= f.z*d; }
  if (g_keys['d'] || g_keys['arrowright']) { g_eye.x += r.x*d; g_eye.z += r.z*d; }
  if (g_keys['a'] || g_keys['arrowleft'])  { g_eye.x -= r.x*d; g_eye.z -= r.z*d; }
  if (g_keys['e']) { g_eye.y += d; }
  if (g_keys['q']) { g_eye.y -= d; }
}
function bindInput() {
  var dragging = false;
  g_canvas.onmousedown = function (ev) { if (ev.button === 0) dragging = true; };
  window.addEventListener('mouseup', function () { dragging = false; });
  g_canvas.onmousemove = function (ev) {
    if (!dragging) return;
    var factor = 90 / g_canvas.height;
    g_yaw += ev.movementX * factor;
    g_pitch -= ev.movementY * factor;
    if (g_pitch > PITCH_LIMIT) g_pitch = PITCH_LIMIT;
    if (g_pitch < -PITCH_LIMIT) g_pitch = -PITCH_LIMIT;
  };
  g_canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    g_fov = Math.max(10, Math.min(75, g_fov + (e.deltaY > 0 ? 2 : -2)));
  }, { passive: false });
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    g_keys[k] = true;
    if (k === 'r') { g_eye = { x:0, y:3, z:11 }; g_yaw = 0; g_pitch = -8; g_fov = 45; }
    if (['arrowup','arrowdown','arrowleft','arrowright'].indexOf(k) >= 0) e.preventDefault();
  });
  document.addEventListener('keyup', function (e) { g_keys[(e.key || '').toLowerCase()] = false; });
  window.addEventListener('blur', function () { g_keys = {}; });
}

// ---------- 渲染循环 ----------
var g_last = 0;
function tick(now) {
  var dt = (g_last > 0) ? Math.min(now - g_last, 100) / 1000 : 0;
  g_last = now;
  g_angle = (g_angle + 45 * dt) % 360;   // 物体自动旋转（45 度/秒）
  updateCamera(dt);
  draw();
  requestAnimationFrame(tick);
}

function draw() {
  var gl = g_gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var f = forwardDir();
  g_viewMatrix.setLookAt(g_eye.x, g_eye.y, g_eye.z, g_eye.x+f.x, g_eye.y+f.y, g_eye.z+f.z, 0, 1, 0);
  g_projMatrix.setPerspective(g_fov, g_canvas.width / g_canvas.height, 0.1, 200);

  // 物体模型矩阵：绕 Y 自动旋转 + 固定倾斜
  var modelMatrix = new Matrix4();
  modelMatrix.setTranslate(0, 0, 0);
  modelMatrix.rotate(g_angle, 0, 1, 0);
  modelMatrix.rotate(18, 1, 0, 0);

  // 当前物体
  var obj = (g_currentObject === 'cube') ? g_cube : (g_currentObject === 'sphere') ? g_sphere : g_torus;

  // 1) 地面（光照，颜色可调）
  drawGround();

  // 2) 投影阴影（半透明）
  if (g_shadowOn) drawShadow(obj, modelMatrix);

  // 3) 物体（光照 + 纹理）
  drawObject(obj, modelMatrix);
}

// 设置光照 uniform（地面和物体共用）
function setLightUniforms(eye) {
  var gl = g_gl;
  gl.uniform3f(g_u.u_CameraPos, eye.x, eye.y, eye.z);
  gl.uniform1f(g_u.u_Ambient, g_ambient);
  gl.uniform3f(g_u.u_DirLightDir, g_dirDir[0], g_dirDir[1], g_dirDir[2]);
  gl.uniform3f(g_u.u_DirLightColor, g_dirColor[0]*g_dirIntensity, g_dirColor[1]*g_dirIntensity, g_dirColor[2]*g_dirIntensity);
  gl.uniform1f(g_u.u_DirLightOn, g_dirOn ? 1.0 : 0.0);
  gl.uniform3f(g_u.u_PointLightPos, g_pointPos[0], g_pointPos[1], g_pointPos[2]);
  gl.uniform3f(g_u.u_PointLightColor, g_pointColor[0]*g_pointIntensity, g_pointColor[1]*g_pointIntensity, g_pointColor[2]*g_pointIntensity);
  gl.uniform1f(g_u.u_PointLightOn, g_pointOn ? 1.0 : 0.0);
  gl.uniform3f(g_u.u_SpotPos, g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  gl.uniform3f(g_u.u_SpotDir, g_spotDir[0], g_spotDir[1], g_spotDir[2]);
  gl.uniform3f(g_u.u_SpotColor, g_spotColor[0]*g_spotIntensity, g_spotColor[1]*g_spotIntensity, g_spotColor[2]*g_spotIntensity);
  gl.uniform1f(g_u.u_SpotOn, g_spotOn ? 1.0 : 0.0);
  gl.uniform1f(g_u.u_SpotCutoff, g_spotCutoff);
  gl.uniform1f(g_u.u_MatSpecular, g_specular);
  gl.uniform1f(g_u.u_Shininess, g_shininess);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_tex);
  gl.uniform1i(g_u.u_Sampler, 0);
}

function drawGround() {
  var gl = g_gl;
  gl.useProgram(g_lightProgram);
  setLightUniforms(g_eye);
  gl.uniform1f(g_u.u_UseTexture, 0.0);
  gl.uniform3f(g_u.u_ObjectColor, g_groundColor[0], g_groundColor[1], g_groundColor[2]);

  var model = new Matrix4();
  model.setTranslate(0, GROUND_Y, 0);
  var normalMatrix = new Matrix4().setInverseOf(model); normalMatrix.transpose();
  var mvp = new Matrix4().set(g_projMatrix).multiply(g_viewMatrix).multiply(model);
  gl.uniformMatrix4fv(g_u.u_MvpMatrix, false, mvp.elements);
  gl.uniformMatrix4fv(g_u.u_ModelMatrix, false, model.elements);
  gl.uniformMatrix4fv(g_u.u_NormalMatrix, false, normalMatrix.elements);

  bindAttrib(g_ground, gl.getAttribLocation(g_lightProgram, 'a_Position'),
             gl.getAttribLocation(g_lightProgram, 'a_Normal'),
             gl.getAttribLocation(g_lightProgram, 'a_TexCoord'));
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_ground.indexBuffer);
  gl.drawElements(gl.TRIANGLES, g_ground.numIndices, gl.UNSIGNED_SHORT, 0);
}

function drawObject(obj, modelMatrix) {
  var gl = g_gl;
  gl.useProgram(g_lightProgram);
  setLightUniforms(g_eye);
  gl.uniform1f(g_u.u_UseTexture, g_useTexture ? 1.0 : 0.0);
  gl.uniform3f(g_u.u_ObjectColor, 0.9, 0.6, 0.3);

  var normalMatrix = new Matrix4().setInverseOf(modelMatrix); normalMatrix.transpose();
  var mvp = new Matrix4().set(g_projMatrix).multiply(g_viewMatrix).multiply(modelMatrix);
  gl.uniformMatrix4fv(g_u.u_MvpMatrix, false, mvp.elements);
  gl.uniformMatrix4fv(g_u.u_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(g_u.u_NormalMatrix, false, normalMatrix.elements);

  bindAttrib(obj, gl.getAttribLocation(g_lightProgram, 'a_Position'),
             gl.getAttribLocation(g_lightProgram, 'a_Normal'),
             gl.getAttribLocation(g_lightProgram, 'a_TexCoord'));
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
  gl.drawElements(gl.TRIANGLES, obj.numIndices, gl.UNSIGNED_SHORT, 0);
}

// 投影阴影：沿平行光方向把物体投影到地面
function drawShadow(obj, modelMatrix) {
  var gl = g_gl;
  gl.useProgram(g_shadowProgram);

  var shadowM = makeShadowMatrix(g_dirDir, GROUND_Y + 0.02);  // 略高于地面避免 z-fighting
  var mvp = new Matrix4().set(g_projMatrix).multiply(g_viewMatrix).multiply(shadowM).multiply(modelMatrix);
  gl.uniformMatrix4fv(g_su.u_MvpMatrix, false, mvp.elements);
  gl.uniform4f(g_su.u_ShadowColor, 0.0, 0.0, 0.0, 0.4);   // 半透明黑

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);   // 阴影不写深度，避免遮挡物体

  var aPos = gl.getAttribLocation(g_shadowProgram, 'a_Position');
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.position);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
  gl.drawElements(gl.TRIANGLES, obj.numIndices, gl.UNSIGNED_SHORT, 0);

  gl.disable(gl.BLEND);
  gl.depthMask(true);
}

// 平行光投影到 y=groundY 平面的阴影矩阵
function makeShadowMatrix(lightDir, groundY) {
  var dx = lightDir[0], dy = lightDir[1], dz = lightDir[2];
  if (Math.abs(dy) < 0.05) dy = (dy < 0 ? -0.05 : 0.05);  // 防止光方向接近水平导致投影退化
  var kx = dx / dy, kz = dz / dy;
  var m = new Matrix4();
  var e = m.elements;
  e[0]=1;    e[1]=0;    e[2]=0;    e[3]=0;
  e[4]=-kx;  e[5]=0;    e[6]=-kz;  e[7]=0;
  e[8]=0;    e[9]=0;    e[10]=1;   e[11]=0;
  e[12]=kx*groundY; e[13]=groundY; e[14]=kz*groundY; e[15]=1;
  return m;
}

function bindAttrib(obj, aPos, aNor, aTex) {
  var gl = g_gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.position);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.normal);
  gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aNor);
  gl.bindBuffer(gl.ARRAY_BUFFER, obj.texCoord);
  gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTex);
}

// ---------- 几何体 ----------
function buildCube() {
  var faces = [
    { n: [0,0,1],  c: [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
    { n: [0,0,-1], c: [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
    { n: [1,0,0],  c: [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
    { n: [-1,0,0], c: [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
    { n: [0,1,0],  c: [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
    { n: [0,-1,0], c: [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] },
  ];
  var uv = [[0,0],[1,0],[1,1],[0,1]];
  var positions = [], normals = [], texCoords = [], indices = [];
  for (var f = 0; f < 6; f++) {
    for (var v = 0; v < 4; v++) {
      positions.push(faces[f].c[v][0], faces[f].c[v][1], faces[f].c[v][2]);
      normals.push(faces[f].n[0], faces[f].n[1], faces[f].n[2]);
      texCoords.push(uv[v][0], uv[v][1]);
    }
    var b = f * 4;
    indices.push(b, b+1, b+2,  b, b+2, b+3);
  }
  return makeMesh(positions, normals, texCoords, indices);
}

function buildTorus(R, r, rings, sides) {
  var positions = [], normals = [], texCoords = [], indices = [];
  for (var i = 0; i <= rings; i++) {
    var theta = i * 2 * Math.PI / rings;
    var ct = Math.cos(theta), st = Math.sin(theta);
    for (var j = 0; j <= sides; j++) {
      var phi = j * 2 * Math.PI / sides;
      var cp = Math.cos(phi), sp = Math.sin(phi);
      var nx = cp * ct, ny = sp, nz = cp * st;
      positions.push(R*ct + r*nx, r*ny, R*st + r*nz);
      normals.push(nx, ny, nz);
      texCoords.push(i / rings, j / sides);
    }
  }
  for (var i = 0; i < rings; i++) {
    for (var j = 0; j < sides; j++) {
      var a = i * (sides + 1) + j;
      var b = a + sides + 1;
      indices.push(a, b, a+1,  b, b+1, a+1);
    }
  }
  return makeMesh(positions, normals, texCoords, indices);
}

function buildSphere(radius, latBands, lonBands) {
  var positions = [], normals = [], texCoords = [], indices = [];
  for (var lat = 0; lat <= latBands; lat++) {
    var theta = lat * Math.PI / latBands;
    var sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (var lon = 0; lon <= lonBands; lon++) {
      var phi = lon * 2 * Math.PI / lonBands;
      var sinP = Math.sin(phi), cosP = Math.cos(phi);
      var nx = sinT * cosP, ny = cosT, nz = sinT * sinP;
      positions.push(radius * nx, radius * ny, radius * nz);
      normals.push(nx, ny, nz);
      texCoords.push(lon / lonBands, lat / latBands);
    }
  }
  for (var lat = 0; lat < latBands; lat++) {
    for (var lon = 0; lon < lonBands; lon++) {
      var a = lat * (lonBands + 1) + lon;
      var b = a + lonBands + 1;
      indices.push(a, b, a+1,  b, b+1, a+1);
    }
  }
  return makeMesh(positions, normals, texCoords, indices);
}

function buildGround() {
  var S = 30;
  var positions = [-S,0,-S,  S,0,-S,  S,0,S,  -S,0,S];
  var normals = [0,1,0, 0,1,0, 0,1,0, 0,1,0];
  var texCoords = [0,0, 1,0, 1,1, 0,1];
  var indices = [0,1,2, 0,2,3];
  return makeMesh(positions, normals, texCoords, indices);
}

function makeMesh(positions, normals, texCoords, indices) {
  var gl = g_gl;
  function mk(data) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return b;
  }
  var ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return { position: mk(positions), normal: mk(normals), texCoord: mk(texCoords), indexBuffer: ib, numIndices: indices.length };
}

function createCheckerboardTexture(size) {
  var gl = g_gl;
  var data = new Uint8Array(size * size * 4);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var c = ((x >> 3) + (y >> 3)) % 2 === 0 ? 220 : 70;
      var idx = (y * size + x) * 4;
      data[idx] = c; data[idx+1] = c; data[idx+2] = c; data[idx+3] = 255;
    }
  }
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return tex;
}
