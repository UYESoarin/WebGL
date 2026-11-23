// ============================================================
// 实验二 · 基于 WebGL 的摄像漫游与环视（天空盒 + 纹理立方体）
// 功能：
//   1. 三维场景：灰色地面 + 多个带图像纹理的立方体 + 天空盒
//   2. 摄像漫游 Fly：W/A/S/D/E/Q（前/后/左/右/上/下）+ 鼠标拖动环视 + 滚轮缩放
//      —— 另提供"菜单按钮"操作，与键盘等效
//   3. 摄像环视：鼠标拖动，左右巡视 + 上下仰俯（视角与鼠标方向一致）
//   4. 轨道相机 Orbit：按 O 切换，绕目标旋转
// 贴图来源：
//   · 天空盒 = ../resources/cubemap/*.png（立方体纹理，6 面无缝）
//   · 立方体 = ../resources/tex/wall.jpg（2D 图像纹理，与天空盒不同来源，避免混淆）
// ============================================================

// ---------- 天空盒着色器（立方体纹理）----------
var SKY_VS =
  `#version 300 es
  in vec3 a_Position;
  uniform mat4 u_MvpMatrix;
  out vec3 v_TexCoord;
  void main() {
    v_TexCoord = a_Position;              // 顶点坐标即采样方向
    gl_Position = u_MvpMatrix * vec4(a_Position, 1.0);
  }`;
var SKY_FS =
  `#version 300 es
  precision mediump float;
  uniform samplerCube u_CubeSampler;
  in vec3 v_TexCoord;
  out vec4 fragColor;
  void main() {
    fragColor = texture(u_CubeSampler, v_TexCoord);   // WebGL2：texture 采样立方体纹理
  }`;

// ---------- 物体着色器（2D 图像纹理）----------
var TEX_VS =
  `#version 300 es
  in vec3 a_Position;
  in vec2 a_TexCoord;
  uniform mat4 u_MvpMatrix;
  out vec2 v_TexCoord;
  void main() {
    gl_Position = u_MvpMatrix * vec4(a_Position, 1.0);
    v_TexCoord = a_TexCoord;
  }`;
var TEX_FS =
  `#version 300 es
  precision mediump float;
  uniform sampler2D u_Sampler;
  in vec2 v_TexCoord;
  out vec4 fragColor;
  void main() {
    fragColor = texture(u_Sampler, v_TexCoord);
  }`;

// ---------- 纯色着色器（地面灰色）----------
var COL_VS =
  `#version 300 es
  in vec3 a_Position;
  uniform mat4 u_MvpMatrix;
  void main() {
    gl_Position = u_MvpMatrix * vec4(a_Position, 1.0);
  }`;
var COL_FS =
  `#version 300 es
  precision mediump float;
  uniform vec4 u_Color;
  out vec4 fragColor;
  void main() {
    fragColor = u_Color;
  }`;

// ---------- 全局 ----------
var g_gl, g_canvas;
var g_skyProgram, g_texProgram, g_colProgram;
var g_skyCube = null;     // 单位立方体（天空盒，只存坐标）
var g_cube = null;        // 纹理立方体（坐标 + 纹理坐标）
var g_ground = null;      // 地面（只存坐标）
var g_skyTex = null;      // 天空盒立方体纹理
var g_wallTex = null;     // 立方体 2D 纹理

var g_projMatrix = new Matrix4();
var g_groundColor = [0.50, 0.50, 0.52, 1.0];   // 地面固定灰色

// ---------- 相机 ----------
var g_mode = 'fly';   // 'fly' 自由漫游 / 'orbit' 轨道
var g_eye = { x: 0, y: 2, z: 16 };
var g_yaw = 0, g_pitch = 0, g_fov = 45;
var g_target = { x: 0, y: 1, z: 0 }, g_radius = 22;
var g_keys = {};
var MOVE_SPEED = 8.0;
var PITCH_LIMIT = 89;

function main() {
  g_canvas = document.getElementById('webgl');
  resizeCanvas();
  window.onresize = resizeCanvas;

  g_gl = getWebGLContext(g_canvas);
  if (!g_gl) { console.log('获取 WebGL 上下文失败'); return; }

  g_skyProgram = createProgram(SKY_VS, SKY_FS);
  g_texProgram = createProgram(TEX_VS, TEX_FS);
  g_colProgram = createProgram(COL_VS, COL_FS);

  g_skyCube = initCubeGeometry();       // 天空盒用（坐标）
  g_cube = buildTexturedCube();         // 立方体用（坐标 + 纹理坐标）
  g_ground = initGroundGeometry();      // 地面（坐标）

  g_skyTex = initSkyTexture();          // 天空盒立方体纹理（cubemap png）
  g_wallTex = init2DTexture('../resources/tex/wall.jpg');   // 立方体 2D 纹理（墙）

  g_gl.enable(g_gl.DEPTH_TEST);
  g_gl.clearColor(0.0, 0.0, 0.0, 1.0);

  bindInput();
  bindMenu();
  tick();
}

function createProgram(vsSrc, fsSrc) {
  var gl = g_gl, program = gl.createProgram();
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.log('着色器编译失败: ' + gl.getShaderInfoLog(s));
    gl.attachShader(program, s);
  }
  sh(gl.VERTEX_SHADER, vsSrc); sh(gl.FRAGMENT_SHADER, fsSrc);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.log('程序链接失败: ' + gl.getProgramInfoLog(program));
  return program;
}

function makeBuffer(data) {
  var gl = g_gl, b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return b;
}

// ---------- 几何体 ----------
// 单位立方体（只存坐标，天空盒用）
function initCubeGeometry() {
  var v = new Float32Array([
     1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,
     1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,
     1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,
    -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,
    -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,
     1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1
  ]);
  var idx = new Uint8Array([
     0,1,2, 0,2,3,   4,5,6, 4,6,7,   8,9,10, 8,10,11,
    12,13,14, 12,14,15,  16,17,18, 16,18,19,  20,21,22, 20,22,23
  ]);
  var vb = makeBuffer(v);
  var ib = g_gl.createBuffer();
  g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, ib);
  g_gl.bufferData(g_gl.ELEMENT_ARRAY_BUFFER, idx, g_gl.STATIC_DRAW);
  return { vb: vb, ib: ib, n: idx.length };
}

// 纹理立方体（坐标 + 纹理坐标，24 顶点）
function buildTexturedCube() {
  var faces = [
    [[-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1]],   // 前 +z
    [[ 1,-1,-1],[-1,-1,-1],[-1, 1,-1],[ 1, 1,-1]],   // 后 -z
    [[ 1,-1, 1],[ 1,-1,-1],[ 1, 1,-1],[ 1, 1, 1]],   // 右 +x
    [[-1,-1,-1],[-1,-1, 1],[-1, 1, 1],[-1, 1,-1]],   // 左 -x
    [[-1, 1, 1],[ 1, 1, 1],[ 1, 1,-1],[-1, 1,-1]],   // 上 +y
    [[-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1],[-1,-1, 1]],   // 下 -y
  ];
  var uv = [[0,0],[1,0],[1,1],[0,1]];
  var pos = [], tex = [], idx = [];
  for (var f = 0; f < 6; f++) {
    for (var v = 0; v < 4; v++) {
      pos.push(faces[f][v][0], faces[f][v][1], faces[f][v][2]);
      tex.push(uv[v][0], uv[v][1]);
    }
    var b = f * 4;
    idx.push(b, b+1, b+2,  b, b+2, b+3);
  }
  var vb = makeBuffer(pos);
  var tb = makeBuffer(tex);
  var ib = g_gl.createBuffer();
  g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, ib);
  g_gl.bufferData(g_gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(idx), g_gl.STATIC_DRAW);
  return { vb: vb, tb: tb, ib: ib, n: idx.length };
}

// 地面（只存坐标）
function initGroundGeometry() {
  var S = 30;
  var pos = [-S, 0, -S,  S, 0, -S,  S, 0, S,  -S, 0, S];
  var idx = [0, 1, 2,  0, 2, 3];
  var vb = makeBuffer(pos);
  var ib = g_gl.createBuffer();
  g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, ib);
  g_gl.bufferData(g_gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(idx), g_gl.STATIC_DRAW);
  return { vb: vb, ib: ib, n: idx.length };
}

// ---------- 纹理加载 ----------
// 天空盒立方体纹理（cubemap png，6 面无缝）
function initSkyTexture() {
  var gl = g_gl;
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  var faces = [
    [gl.TEXTURE_CUBE_MAP_POSITIVE_X, 'positive_x.png'],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 'negative_x.png'],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 'positive_y.png'],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 'negative_y.png'],
    [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 'positive_z.png'],
    [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 'negative_z.png'],
  ];
  faces.forEach(function (f) {
    var img = new Image();
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
      // 立方体贴图不需要 Y 轴反转；显式置 0，避免其它纹理的状态泄漏导致天空盒上下颠倒
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(f[0], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };
    img.src = '../resources/cubemap/' + f[1];
  });
  return tex;
}

// 2D 纹理（立方体墙贴图，可平铺）
function init2DTexture(url) {
  var gl = g_gl;
  var tex = gl.createTexture();
  var img = new Image();
  img.onload = function () {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);   // 2D 纹理需要 y 轴反转
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  };
  img.src = url;
  return tex;
}

// ---------- 相机 ----------
function forwardDir() {
  var y = g_yaw * Math.PI / 180, p = g_pitch * Math.PI / 180;
  return { x: Math.sin(y) * Math.cos(p), y: Math.sin(p), z: -Math.cos(y) * Math.cos(p) };
}
function rightDir() {
  var y = g_yaw * Math.PI / 180;
  return { x: Math.cos(y), y: 0, z: Math.sin(y) };
}
function currentEye() {
  if (g_mode === 'orbit') {
    var y = g_yaw * Math.PI / 180, p = g_pitch * Math.PI / 180;
    return {
      x: g_target.x + g_radius * Math.cos(p) * Math.sin(y),
      y: g_target.y + g_radius * Math.sin(p),
      z: g_target.z + g_radius * Math.cos(p) * Math.cos(y),
    };
  }
  return g_eye;
}
function currentAt() {
  if (g_mode === 'orbit') return g_target;
  var f = forwardDir();
  return { x: g_eye.x + f.x, y: g_eye.y + f.y, z: g_eye.z + f.z };
}

function updateCamera(dt) {
  if (g_mode !== 'fly') return;
  var f = forwardDir(), r = rightDir();
  var d = MOVE_SPEED * dt;
  if (g_keys['w'] || g_keys['arrowup'])    { g_eye.x += f.x*d; g_eye.y += f.y*d; g_eye.z += f.z*d; }  // 前
  if (g_keys['s'] || g_keys['arrowdown'])  { g_eye.x -= f.x*d; g_eye.y -= f.y*d; g_eye.z -= f.z*d; }  // 后
  if (g_keys['d'] || g_keys['arrowright']) { g_eye.x += r.x*d; g_eye.z += r.z*d; }                    // 右
  if (g_keys['a'] || g_keys['arrowleft'])  { g_eye.x -= r.x*d; g_eye.z -= r.z*d; }                    // 左
  if (g_keys['e']) { g_eye.y += d; }   // 上
  if (g_keys['q']) { g_eye.y -= d; }   // 下
}

// ---------- 输入：键盘 + 鼠标 ----------
function bindInput() {
  var dragging = false;
  g_canvas.onmousedown = function (ev) { if (ev.button === 0) dragging = true; };
  window.addEventListener('mouseup', function () { dragging = false; });
  g_canvas.onmousemove = function (ev) {
    if (!dragging) return;
    var factor = 90 / g_canvas.height;
    g_yaw += ev.movementX * factor;      // 左右：鼠标右移 → 向右摇头（一致）
    g_pitch -= ev.movementY * factor;    // 上下：鼠标上移 → 抬头（与鼠标方向一致）
    clampPitch();
  };
  g_canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? 1 : -1;
    if (g_mode === 'orbit') g_radius = Math.max(5, Math.min(60, g_radius + delta * 1.5));
    else g_fov = Math.max(10, Math.min(75, g_fov + delta * 2));
  }, { passive: false });

  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    g_keys[k] = true;
    if (k === 'o') toggleMode();
    if (k === 'r') resetCamera();
    if (['arrowup','arrowdown','arrowleft','arrowright'].indexOf(k) >= 0) e.preventDefault();
  });
  document.addEventListener('keyup', function (e) { g_keys[(e.key || '').toLowerCase()] = false; });
  window.addEventListener('blur', function () { g_keys = {}; });
}
function clampPitch() {
  if (g_pitch > PITCH_LIMIT) g_pitch = PITCH_LIMIT;
  if (g_pitch < -PITCH_LIMIT) g_pitch = -PITCH_LIMIT;
}

// ---------- 输入：菜单 ----------
function bindMenu() {
  // 方向按钮：按住 = 按下对应键，松开 = 松开（与键盘等效，复用 g_keys）
  var btns = document.querySelectorAll('#panel button[data-key]');
  btns.forEach(function (btn) {
    var key = btn.getAttribute('data-key');
    btn.addEventListener('mousedown', function (e) { g_keys[key] = true; e.preventDefault(); });
    btn.addEventListener('mouseup', function () { g_keys[key] = false; });
    btn.addEventListener('mouseleave', function () { g_keys[key] = false; });
  });

  document.getElementById('btnMode').onclick = function () { toggleMode(); };
  document.getElementById('btnReset').onclick = function () { resetCamera(); };

  // 地面颜色选择：颜色选择器 → g_groundColor
  var groundPicker = document.getElementById('groundColorPicker');
  groundPicker.oninput = function () {
    g_groundColor = hexToRgba(groundPicker.value);
  };
}

function hexToRgba(hex) {
  var r = parseInt(hex.slice(1, 3), 16) / 255;
  var g = parseInt(hex.slice(3, 5), 16) / 255;
  var b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}

function toggleMode() {
  g_mode = (g_mode === 'fly') ? 'orbit' : 'fly';
  document.getElementById('modeLabel').innerText =
    g_mode === 'fly' ? '相机：自由漫游 Fly' : '相机：轨道 Orbit';
}
function resetCamera() {
  g_eye = { x: 0, y: 2, z: 16 };
  g_yaw = 0; g_pitch = 0; g_fov = 45; g_radius = 22;
  g_mode = 'fly';
  document.getElementById('modeLabel').innerText = '相机：自由漫游 Fly';
}

// ---------- 渲染循环 ----------
var g_last = 0;
function tick(now) {
  var dt = (g_last > 0) ? Math.min(now - g_last, 100) / 1000 : 0;
  g_last = now;
  updateCamera(dt);
  draw();
  requestAnimationFrame(tick);
}

function draw() {
  var gl = g_gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var eye = currentEye(), at = currentAt();
  var view = new Matrix4();
  view.setLookAt(eye.x, eye.y, eye.z, at.x, at.y, at.z, 0, 1, 0);
  g_projMatrix.setPerspective(g_fov, g_canvas.width / g_canvas.height, 0.1, 500);

  drawSkybox(view);   // 先画天空盒（背景）
  drawGround(view);   // 再画灰色地面
  drawCubes(view);    // 最后画带纹理的立方体
}

function drawSkybox(view) {
  var gl = g_gl;
  gl.useProgram(g_skyProgram);

  // 去掉视图矩阵平移分量（elements[12..14]），天空盒只随相机旋转、不随相机平移 → 无限远
  var skyView = new Matrix4().set(view);
  skyView.elements[12] = 0; skyView.elements[13] = 0; skyView.elements[14] = 0;
  var mvp = new Matrix4().set(g_projMatrix).multiply(skyView);
  mvp.scale(100, 100, 100);

  gl.uniformMatrix4fv(gl.getUniformLocation(g_skyProgram, 'u_MvpMatrix'), false, mvp.elements);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, g_skyTex);
  gl.uniform1i(gl.getUniformLocation(g_skyProgram, 'u_CubeSampler'), 0);

  var aPos = gl.getAttribLocation(g_skyProgram, 'a_Position');
  gl.bindBuffer(gl.ARRAY_BUFFER, g_skyCube.vb);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_skyCube.ib);
  gl.drawElements(gl.TRIANGLES, g_skyCube.n, gl.UNSIGNED_BYTE, 0);
}

function drawGround(view) {
  var gl = g_gl;
  gl.useProgram(g_colProgram);
  var uMvp = gl.getUniformLocation(g_colProgram, 'u_MvpMatrix');
  var uColor = gl.getUniformLocation(g_colProgram, 'u_Color');
  var aPos = gl.getAttribLocation(g_colProgram, 'a_Position');

  var model = new Matrix4();   // 地面原样（在 y=0 平面）
  var mvp = new Matrix4().set(g_projMatrix).multiply(view).multiply(model);
  gl.uniformMatrix4fv(uMvp, false, mvp.elements);
  gl.uniform4f(uColor, g_groundColor[0], g_groundColor[1], g_groundColor[2], g_groundColor[3]);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_ground.vb);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_ground.ib);
  gl.drawElements(gl.TRIANGLES, g_ground.n, gl.UNSIGNED_BYTE, 0);
}

function drawCubes(view) {
  var gl = g_gl;
  gl.useProgram(g_texProgram);
  var uMvp = gl.getUniformLocation(g_texProgram, 'u_MvpMatrix');
  var uSampler = gl.getUniformLocation(g_texProgram, 'u_Sampler');
  var aPos = gl.getAttribLocation(g_texProgram, 'a_Position');
  var aTex = gl.getAttribLocation(g_texProgram, 'a_TexCoord');

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_wallTex);
  gl.uniform1i(uSampler, 0);

  var houses = [
    [ 0, 0.8,  0, 1.6], [ 5, 0.5,  0, 1.0], [-5, 0.5,  0, 1.0],
    [ 0, 0.5, -6, 1.0], [ 5, 0.5, -6, 1.0], [-5, 0.5, -6, 1.0],
    [ 0, 1.5, -12, 3.0], [ 4, 0.5, -12, 1.0], [-4, 0.5, -12, 1.0],
  ];
  for (var i = 0; i < houses.length; i++) {
    var h = houses[i];
    var model = new Matrix4();
    model.setTranslate(h[0], h[1], h[2]);
    model.scale(h[3], h[3], h[3]);
    var mvp = new Matrix4().set(g_projMatrix).multiply(view).multiply(model);
    gl.uniformMatrix4fv(uMvp, false, mvp.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_cube.vb);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cube.tb);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aTex);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_cube.ib);
    gl.drawElements(gl.TRIANGLES, g_cube.n, gl.UNSIGNED_BYTE, 0);
  }
}

function resizeCanvas() {
  g_canvas.width = window.innerWidth;
  g_canvas.height = window.innerHeight;
}
