# WebGL 2.0 参考手册

配套 `../examples - webgl2.0` 示例程序，按主题分章，可作为查表式参考。

---

## 一、技术栈

WebGL 应用由三种语言组成，缺一不可：

| 层次 | 技术 | 作用 |
|------|------|------|
| 页面结构 | HTML5 | 提供 `<canvas>` 画布与交互控件（按钮、滑动条、颜色选择器） |
| 交互逻辑 | JavaScript (ES6) | 调用 WebGL API、处理事件、驱动渲染循环 |
| GPU 编程 | GLSL ES 3.00 | 编写顶点着色器与片元着色器 |
| 图形库 | WebGL 2.0 | 可编程渲染管线（对应 OpenGL ES 3.0） |
| 数学工具 | cuon-matrix.js | 矩阵运算（平移/旋转/缩放/透视/视图） |

---

## 二、目录

| 文件 | 主题 |
|------|------|
| 01_html_css基础 | HTML/CSS 语法与页面骨架 |
| 02_javascript基础 | JS 语法、DOM、事件、动画循环 |
| 03_webgl入门与渲染管线 | 上下文、管线、坐标系统 |
| 04_着色器与GLSL | 着色器语言、attribute/uniform/out-in |
| 05_缓冲区与绘图 | VBO、drawArrays/drawElements、图元 |
| 06_图形变换与矩阵 | 平移/旋转/缩放、Matrix4、列主序 |
| 07_三维视图与相机 | MVP、透视/正交、lookAt、深度测试 |
| 08_纹理映射 | 纹理坐标、采样、Y 轴翻转 |
| 09_光照模型 | 环境光/漫反射/镜面、法线矩阵 |
| 10_动画与交互 | requestAnimationFrame、事件、键盘鼠标 |
| 11_高级技术 | FBO、混合、粒子、雾、拾取、阴影 |
| 12_WebGL1到WebGL2迁移 | 两代语法对照 |

---

## 三、运行机制与数据流

### 3.1 从加载到显示的调用链

```
① 浏览器自上而下解析 HTML
   <canvas id="webgl">     → 创建画布 DOM
   <script src="lib/...">  → 依次执行，定义 getWebGLContext / Matrix4 等
   <body onload="main()">  → 注册页面加载完成后的回调
② 页面加载完成 → 触发 onload → 调用 main()
③ main() 内：
   getElementById → getWebGLContext → initShaders → 建缓冲区上传顶点 → 绑定事件 → draw()
④ draw()：clearColor → clear → 设置 uniform/attribute → drawArrays
⑤ GPU：顶点着色器 → 图元装配 → 光栅化 → 片元着色器 → 颜色缓冲
⑥ 浏览器把颜色缓冲呈现到屏幕
```

### 3.2 三种语言的数据流

```
HTML（容器/声明）
   │ getElementById / 读控件值
   ▼
JavaScript（CPU：准备数据、调 gl.*、传参）
   │ 顶点数据走 缓冲区→attribute；全局参数走 uniform
   ▼
GLSL（GPU：顶点着色器 → 片元着色器）
   │ 图元装配 → 光栅化 → 逐片元
   ▼
颜色缓冲 → 屏幕
```

三条数据通道：

| 通道 | 载体 | 示例 |
|------|------|------|
| 顶点相关 | 缓冲区对象 → `attribute(in)` | `a_Position`、`a_Color` |
| 全局参数 | `gl.uniform*` → `uniform` | `u_ModelMatrix`、`u_FragColor` |
| 顶点→片元插值 | `out/in`（旧版 `varying`） | 顶点颜色渐变到片元 |

### 3.3 运行机制要点

1. **`<script>` 顺序执行**：工具库须在业务脚本之前引入，否则其中的函数尚未定义。
2. **`onload` 等待 DOM 就绪**：`main()` 操作 `<canvas>`，需在 DOM 加载后再执行。
3. **事件回调异步**：事件处理函数在用户操作时才被调用，交互程序 = 初始化一次 + 回调触发重绘。
4. **`requestAnimationFrame` 驱动动画**：下次重绘前调用渲染函数，后台自动暂停；循环 = 更新状态 → 清屏 → 重绘 → 请求下一帧。
5. **`gl` 是状态机**：多数调用在设置状态而非立即生效（如 `clearColor` 设值、`clear` 才生效；`bindBuffer` 设置"当前"缓冲区）。
6. **CPU 与 GPU 异步**：`drawArrays` 返回后 GPU 可能尚未完成，勿立即销毁仍被使用的缓冲数据。
