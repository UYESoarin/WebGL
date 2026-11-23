# 01 · HTML 与 CSS

HTML 描述页面结构，CSS 控制样式。WebGL 程序中的 HTML 主要提供 `<canvas>` 与交互控件。

## 页面骨架

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>标题</title>
  <style> /* CSS 样式 */ </style>
</head>
<body onload="main()">          <!-- 页面加载完成后调用 main() -->
  <canvas id="webgl" width="500" height="500"></canvas>
  <div class="panel"> ...控件... </div>

  <script src="lib/cuon-utils.js"></script>   <!-- 工具库，先于业务脚本 -->
  <script src="main.js"></script>
</body>
</html>
```

## 常用标签

| 标签 | 用途 |
|------|------|
| `<canvas id width height>` | 画布，WebGL 绘制区域 |
| `<script src="...">` | 引入外部脚本 |
| `<button>` | 按钮 |
| `<input type="range">` | 滑动条 |
| `<input type="color">` | 颜色选择器 |
| `<input type="checkbox">` | 复选框 |
| `<div>` / `<span>` | 布局容器 |

## CSS 要点

```css
#webgl { border: 1px solid #555; background: #000; }  /* id 选择器 */
.panel { display: flex; gap: 12px; align-items: center; }  /* 弹性布局 */
```

常用：`display:flex` + `gap` 横向排布控件；`margin`/`padding` 控制间距。

## 脚本加载顺序

`<script>` 自上而下执行。操作 `<canvas>` 的脚本必须位于 `<canvas>` 之后，或使用 `<body onload="main()">` 等待 DOM 就绪后再执行。
