// HelloCanvas.js (c) 2012 matsuda
function main() {
  // 获取 <canvas> 元素
  var canvas = document.getElementById('webgl');
  // 获取WebGL绘图上下文 (getWebGLContext -> WebGLUtils.setupWebGL -> create3DContext)
  // cuon-utils.js / webgl-utils.js 已升级为请求 webgl2 上下文
  var gl = getWebGLContext(canvas);
  // 等价写法: const gl = canvas.getContext('webgl2');
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  // 设置清空<canvas>的背景色
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // 清空 <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

