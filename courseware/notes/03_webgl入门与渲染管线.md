# 03 · WebGL 入门与渲染管线

WebGL 是浏览器中的 3D 绘图标准，底层基于 OpenGL ES，经 `<canvas>` 运行，用着色器在 GPU 上绘制。本文档基于 WebGL 2.0（对应 OpenGL ES 3.0，GLSL ES 3.00）。

## 渲染管线

```
CPU(JS)                                 GPU
获取 canvas → 获取上下文 gl → 编译着色器 → 准备顶点数据 → drawArrays
                                              │
               顶点着色器 → 图元装配 → 光栅化 → 片元着色器 → 颜色缓冲 → 屏幕
```

每步对应的函数：

| 步骤 | 函数 |
|------|------|
| 获取上下文 | `getWebGLContext(canvas)` 或 `canvas.getContext('webgl2')` |
| 初始化着色器 | `initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)` |
| 设置背景色 | `gl.clearColor(r, g, b, a)`（分量 0~1） |
| 清屏 | `gl.clear(gl.COLOR_BUFFER_BIT)` |
| 绘制 | `gl.drawArrays(mode, first, count)` |

## 获取上下文

```js
let gl = canvas.getContext('webgl2');     // WebGL2RenderingContext
// 或使用封装（自动尝试 webgl2 → webgl）：
let gl = getWebGLContext(canvas);
if (!gl) { console.log('WebGL 不可用'); return; }
```

`gl` 对象是所有 GPU 操作的入口，后续全部经 `gl.xxx()` 调用。

## initShaders 内部流程

`initShaders` 封装了着色器编译链接的七步：`createShader` → `shaderSource` → `compileShader` → `createProgram` → `attachShader` → `linkProgram` → `useProgram`。

## 最短程序（清屏）

```js
function main() {
  let canvas = document.getElementById('webgl');
  let gl = getWebGLContext(canvas);
  gl.clearColor(0.0, 0.4, 0.7, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
```

## 坐标系统

WebGL 采用右手坐标系：x 向右、y 向上、z 朝屏幕外；裁剪空间范围 [-1, 1]，原点在画布中心。与 Canvas 2D（原点左上角、y 向下）相反。

## clearColor 与 clear 的顺序

`clearColor` 只设置"清屏用什么颜色"的状态，`clear` 才真正执行清屏；顺序不能对调。
