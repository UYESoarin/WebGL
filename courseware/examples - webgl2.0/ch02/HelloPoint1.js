// HelloPoint1.js (c) 2012 matsuda
// 顶点着色器
var VSHADER_SOURCE = 
  `#version 300 es
  void main() {
    gl_Position = vec4(0.0, 0.0, 0.0, 1.0); // 设置顶点坐标
    gl_PointSize = 10.0;                    // 设置顶点尺寸
  }`;
// 片元着色器
var FSHADER_SOURCE =
  `#version 300 es
  precision mediump float;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0); // 设置颜色
  }`;
function main() {
  // 获取 <canvas> 元素
  var canvas = document.getElementById('webgl');
  // 获取WebGL绘图上下文，webgl2
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  // 初始化着色器
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  // 设置清空<canvas>的背景色
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // 清空 <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
  // 绘制一个点
  gl.drawArrays(gl.POINTS, 0, 1);
}

