// DrawRectangle.js (c) 2012 matsuda
// 说明: 本示例使用的是 Canvas 2D 上下文 (getContext('2d')), 并非 WebGL,
//       因此不涉及 WebGL 1.0 -> 2.0 的迁移。
function main() {
  // 获取 <canvas> 元素
  const canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  }
  // 获取绘制二维图形的绘图上下文 (Canvas 2D, 与 WebGL 无关)
  const ctx = canvas.getContext('2d');
  // 绘制蓝色矩形
  ctx.fillStyle = 'rgba(0, 0, 255, 1.0)'; // 设置填充颜色为蓝色
  ctx.fillRect(120, 10, 150, 150); // 用设置的颜色填充矩形
}

