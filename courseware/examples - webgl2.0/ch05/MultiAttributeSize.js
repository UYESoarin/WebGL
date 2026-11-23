// MultiAttributeSize.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  `#version 300 es
  in vec4 a_Position;
  in float a_PointSize;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = a_PointSize;
  }
`;

// Fragment shader program
var FSHADER_SOURCE =
  `#version 300 es
  precision mediump float;
  out vec4 outColor;
  void main() {
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

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

  // Set the vertex information
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw three points
  gl.drawArrays(gl.POINTS, 0, n);
}

function initVertexBuffers(gl) {
  var vertices = new Float32Array([
    0.0, 0.5,   -0.5, -0.5,   0.5, -0.5
  ]);
  var n = 3;
  var sizes = new Float32Array([
    10.0, 20.0, 30.0  // Point sizes
  ]);
  // 创建缓冲区对象
  var vertexBuffer = gl.createBuffer();  
  var sizeBuffer = gl.createBuffer();
  if (!vertexBuffer || !sizeBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  // 顶点坐标数据写入缓冲区并开启
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  // 顶点尺寸数据写入对应缓冲区对象并开启
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
  var a_PointSize = gl.getAttribLocation(gl.program, 'a_PointSize');
  if(a_PointSize < 0) {
    console.log('Failed to get the storage location of a_PointSize');
    return -1;
  }
  gl.vertexAttribPointer(a_PointSize, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_PointSize);
  // 解绑当前绑定的缓冲区对象
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return n;
}

