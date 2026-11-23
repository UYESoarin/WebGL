# 02 · JavaScript 基础

JavaScript 是 WebGL 程序的"胶水"：准备数据、调用 API、处理交互。

## 变量与类型

```js
let count = 3;                 // 数字
const name = "WebGL";          // 字符串（常量）
let isReady = true;            // 布尔
let vertices = new Float32Array([0.0, 0.5, -0.5, -0.5]);  // 类型化数组（WebGL 传数据必须用）
```

WebGL 向 GPU 传数据须用类型化数组（`Float32Array`、`Uint8Array` 等）。

## 函数与对象

```js
function add(a, b) { return a + b; }        // 具名函数
const handler = function() { ... };          // 匿名函数（常作事件回调）
const handler2 = () => { ... };              // 箭头函数

let obj = { x: 0, y: 0, name: "cube" };      // 对象
let m = new Matrix4();                        // 用 new 创建实例
```

## 控制流

```js
if (x >= 0 && y >= 0) { ... } else { ... }   // 条件（&& 与，|| 或）
for (let i = 0; i < n; i++) { ... }           // 循环
```

## DOM 操作

```js
let canvas = document.getElementById('webgl');  // 按 id 取元素
let v = document.getElementById('range').value; // 读控件值（字符串）
let num = parseFloat(v);                        // 转数字
```

## 事件

```js
element.addEventListener('click', function(ev) { ... });   // 通用
canvas.onmousedown = function(ev) { ... };                 // 简写
document.onkeydown = function(ev) { ev.key; };             // 键盘（ev.key 为 'ArrowLeft' 等）
```

鼠标事件常用属性：`ev.clientX/clientY`（客户区坐标）、`ev.target`、`ev.movementX/movementY`（位移量）。

客户区坐标 → WebGL 坐标 [-1,1] 换算：

```js
let rect = ev.target.getBoundingClientRect();
let x = ((ev.clientX - rect.left) - canvas.width/2)  / (canvas.width/2);
let y = (canvas.height/2 - (ev.clientY - rect.top)) / (canvas.height/2);
```

## 动画循环

```js
function tick() {
  draw();                        // 画一帧
  requestAnimationFrame(tick);   // 请求下一帧
}
tick();
```

`requestAnimationFrame` 在下次重绘前调用回调（约 60 次/秒），后台自动暂停，比 `setInterval` 更优。

## 调试

`console.log` / `console.error` 输出到浏览器 F12 控制台；着色器编译错误也在此显示。
