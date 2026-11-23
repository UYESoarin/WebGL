// ClickedPints.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  `#version 300 es
  in vec4 a_Position;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = 10.0;
  }`;

// Fragment shader program
var FSHADER_SOURCE =
  `#version 300 es
  precision mediump float;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }`;

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // 注册鼠标点击响应事件，匿名函数
  canvas.onmousedown = function(ev){ click(ev, gl, canvas, a_Position); };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_points = []; // 鼠标点击位置数组
function click(ev, gl, canvas, a_Position) {
  var x = ev.clientX; // 鼠标点击处的x坐标
  var y = ev.clientY; // 鼠标点击处的y坐标
  var rect = ev.target.getBoundingClientRect() ;
  // console.log(ev.target);
  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  // 坐标存储到g_points数组
  g_points.push(x); g_points.push(y);
  var len = g_points.length;
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
  for(var i = 0; i < len; i += 2) {
    // 将点的位置传给变量a_Position
    gl.vertexAttrib3f(a_Position, g_points[i], g_points[i+1], 0.0);
    // 绘制点
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
