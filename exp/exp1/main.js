// ============================================================
// 实验一 · 基于 WebGL 的交互式图形绘制
// 功能：绘制可变换的多边形（三角形/正方形/五角星），
//       支持键盘、鼠标、按钮、滑动条、颜色选择器交互，
//       交互参数从 CPU 端发送到 GPU 端（uniform / attribute）。
// ============================================================

// ---------- 顶点着色器 ----------
// a_Position：顶点位置（attribute，来自缓冲区）
// u_ModelMatrix：模型变换矩阵（uniform，CPU 合成后传入）
var VSHADER_SOURCE =
  `#version 300 es
  in vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  void main() {
    gl_Position = u_ModelMatrix * a_Position;   // 变换：平移+旋转+缩放
    gl_PointSize = 10.0;                         // 点的大小（画点时用）
  }`;

// ---------- 片元着色器 ----------
// u_FragColor：颜色（uniform，CPU 传入）
var FSHADER_SOURCE =
  `#version 300 es
  precision mediump float;
  uniform vec4 u_FragColor;
  out vec4 fragColor;
  void main() {
    fragColor = u_FragColor;
  }`;

// ---------- 全局状态（CPU 端维护，再发给 GPU）----------
var g_tx = 0.0, g_ty = 0.0;          // 平移量
var g_angle = 0.0;                   // 旋转角度（度）
var g_scale = 1.0;                   // 缩放因子
var g_color = [1.0, 0.53, 0.0, 1.0]; // 主图形颜色（RGBA，0~1）
var g_shape = 'square';              // 当前图形类型

var g_points = [];                   // 鼠标点击的点位置 [[x,y], ...]
var g_pointColors = [];              // 对应点的颜色 [[r,g,b,a], ...]

var g_gl, g_canvas;
var g_a_Position, g_u_ModelMatrix, g_u_FragColor;
var g_shapeInfo = null;              // { vertices, n, mode }

function main() {
  g_canvas = document.getElementById('webgl');
  g_gl = getWebGLContext(g_canvas);          // 获取 WebGL 上下文（优先 webgl2）
  if (!g_gl) { console.log('获取 WebGL 上下文失败'); return; }

  if (!initShaders(g_gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('初始化着色器失败'); return;
  }

  // 获取 attribute / uniform 的存储位置
  g_a_Position = g_gl.getAttribLocation(g_gl.program, 'a_Position');
  g_u_ModelMatrix = g_gl.getUniformLocation(g_gl.program, 'u_ModelMatrix');
  g_u_FragColor = g_gl.getUniformLocation(g_gl.program, 'u_FragColor');
  if (g_a_Position < 0 || !g_u_ModelMatrix || !g_u_FragColor) {
    console.log('获取存储位置失败'); return;
  }

  setShape('square');   // 初始化默认图形

  g_gl.clearColor(0.0, 0.0, 0.0, 1.0);   // 黑色背景

  bindUI();   // 绑定所有交互控件
  draw();     // 首次绘制
}

// ---------- 绑定 UI 控件 ----------
function bindUI() {
  // 滑动条：实时变换
  document.getElementById('tx').oninput = function() {
    g_tx = parseFloat(this.value); draw();
  };
  document.getElementById('ty').oninput = function() {
    g_ty = parseFloat(this.value); draw();
  };
  document.getElementById('angle').oninput = function() {
    g_angle = parseFloat(this.value); draw();
  };
  document.getElementById('scale').oninput = function() {
    g_scale = parseFloat(this.value); draw();
  };
  document.getElementById('color').oninput = function() {
    g_color = hexToRgba(this.value); draw();
  };

  // 按钮：切换图形
  document.getElementById('btnTriangle').onclick = function() { setShape('triangle'); };
  document.getElementById('btnSquare').onclick   = function() { setShape('square'); };
  document.getElementById('btnStar').onclick     = function() { setShape('star'); };

  // 按钮：清空点击的点
  document.getElementById('btnClear').onclick = function() {
    g_points = []; g_pointColors = []; draw();
  };

  // 按钮：重置所有状态
  document.getElementById('btnReset').onclick = function() {
    g_tx = 0; g_ty = 0; g_angle = 0; g_scale = 1;
    g_color = [1.0, 0.53, 0.0, 1.0];
    g_points = []; g_pointColors = [];
    syncSliders();
    draw();
  };

  // 键盘交互
  document.onkeydown = function(ev) {
    if (ev.key === 'ArrowLeft')  g_tx -= 0.05;
    if (ev.key === 'ArrowRight') g_tx += 0.05;
    if (ev.key === 'ArrowUp')    g_scale += 0.05;
    if (ev.key === 'ArrowDown')  g_scale -= 0.05;
    if (ev.key === 'r' || ev.key === 'R') {
      g_color = [Math.random(), Math.random(), Math.random(), 1.0];
      document.getElementById('color').value = rgbaToHex(g_color);
    }
    syncSliders();
    draw();
  };

  // 鼠标点击：在点击位置画一个点
  g_canvas.onmousedown = function(ev) { click(ev); };
}

// ---------- 鼠标点击回调 ----------
function click(ev) {
  // 客户区坐标 → canvas 坐标 → WebGL 坐标 [-1, 1]
  var x = ev.clientX, y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - g_canvas.width / 2) / (g_canvas.width / 2);
  y = (g_canvas.height / 2 - (y - rect.top)) / (g_canvas.height / 2);

  g_points.push([x, y]);

  // 按象限给颜色（复刻 ColoredPoints 的思路）
  if (x >= 0 && y >= 0)       g_pointColors.push([1.0, 0.0, 0.0, 1.0]);   // 第一象限：红
  else if (x < 0 && y < 0)    g_pointColors.push([0.0, 1.0, 0.0, 1.0]);   // 第三象限：绿
  else                        g_pointColors.push([1.0, 1.0, 1.0, 1.0]);   // 其他：白

  draw();
}

// ---------- 切换图形类型（重建顶点缓冲）----------
function setShape(type) {
  g_shape = type;
  var vertices, n, mode;

  if (type === 'triangle') {
    // 三角形：3 个顶点，TRIANGLES
    vertices = new Float32Array([
       0.0,  0.5,
      -0.5, -0.5,
       0.5, -0.5
    ]);
    n = 3; mode = g_gl.TRIANGLES;

  } else if (type === 'star') {
    // 五角星：中心 + 10 个边界点 + 1 个闭合点，TRIANGLE_FAN
    vertices = createStarVertices(0.5, 0.2);
    n = 12; mode = g_gl.TRIANGLE_FAN;

  } else {   // square（默认）
    // 正方形：中心 + 4 个角 + 1 个闭合点，TRIANGLE_FAN
    vertices = new Float32Array([
       0.0,  0.0,
      -0.4, -0.4,
       0.4, -0.4,
       0.4,  0.4,
      -0.4,  0.4,
      -0.4, -0.4   // 闭合点（补上最后一个扇区，避免缺口）
    ]);
    n = 6; mode = g_gl.TRIANGLE_FAN;
  }

  // 写入 VBO（五步）
  var vertexBuffer = g_gl.createBuffer();
  g_gl.bindBuffer(g_gl.ARRAY_BUFFER, vertexBuffer);
  g_gl.bufferData(g_gl.ARRAY_BUFFER, vertices, g_gl.STATIC_DRAW);
  g_gl.vertexAttribPointer(g_a_Position, 2, g_gl.FLOAT, false, 0, 0);
  g_gl.enableVertexAttribArray(g_a_Position);

  g_shapeInfo = { vertices: vertices, n: n, mode: mode };
  draw();
}

// 生成五角星顶点（中心在原点，TRIANGLE_FAN 使用）
// 外顶点和内顶点交替排列；最后补一个与首个外顶点重合的点，
// 否则 TRIANGLE_FAN 不会闭合，最后一个扇区会缺一块（出现缺口）。
function createStarVertices(outerR, innerR) {
  var v = [0.0, 0.0];   // 中心点
  for (var i = 0; i < 5; i++) {
    // 外顶点角度（第一个在正上方 90°）
    var outerA = (i * 72 + 90) * Math.PI / 180;
    // 内顶点角度（偏移 36°）
    var innerA = (i * 72 + 36 + 90) * Math.PI / 180;
    v.push(outerR * Math.cos(outerA), outerR * Math.sin(outerA));
    v.push(innerR * Math.cos(innerA), innerR * Math.sin(innerA));
  }
  // 补上首个外顶点，闭合扇形
  var a0 = 90 * Math.PI / 180;
  v.push(outerR * Math.cos(a0), outerR * Math.sin(a0));
  return new Float32Array(v);
}

// ---------- 渲染 ----------
function draw() {
  var gl = g_gl;
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 1. 绘制主图形（应用变换矩阵，使用缓冲区）
  if (g_shapeInfo) {
    gl.enableVertexAttribArray(g_a_Position);   // 用缓冲区里的顶点数据

    var m = new Matrix4();
    m.setTranslate(g_tx, g_ty, 0);      // 平移（外层）
    m.rotate(g_angle, 0, 0, 1);          // 旋转
    m.scale(g_scale, g_scale, 1);        // 缩放（内层，先作用到顶点）

    gl.uniformMatrix4fv(g_u_ModelMatrix, false, m.elements);   // CPU → GPU
    gl.uniform4f(g_u_FragColor, g_color[0], g_color[1], g_color[2], g_color[3]);
    gl.drawArrays(g_shapeInfo.mode, 0, g_shapeInfo.n);
  }

  // 2. 绘制鼠标点击的点（使用常量顶点，逐个传，单位矩阵不做变换）
  gl.disableVertexAttribArray(g_a_Position);   // 关闭缓冲区，改用 vertexAttrib3f 常量
  var identity = new Matrix4();   // 默认就是单位阵
  for (var i = 0; i < g_points.length; i++) {
    var p = g_points[i], c = g_pointColors[i];
    gl.uniformMatrix4fv(g_u_ModelMatrix, false, identity.elements);
    gl.uniform4f(g_u_FragColor, c[0], c[1], c[2], c[3]);
    gl.vertexAttrib3f(g_a_Position, p[0], p[1], 0.0);   // 逐个传点位置
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

// ---------- 工具函数 ----------
function syncSliders() {
  document.getElementById('tx').value = g_tx;
  document.getElementById('ty').value = g_ty;
  document.getElementById('angle').value = g_angle;
  document.getElementById('scale').value = g_scale;
}

// "#ff8800" → [1.0, 0.53, 0.0, 1.0]
function hexToRgba(hex) {
  var r = parseInt(hex.slice(1, 3), 16) / 255;
  var g = parseInt(hex.slice(3, 5), 16) / 255;
  var b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}

// [1.0, 0.53, 0.0, 1.0] → "#ff8800"
function rgbaToHex(rgba) {
  var to2 = function(v) {
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return '#' + to2(rgba[0]) + to2(rgba[1]) + to2(rgba[2]);
}
