# 04 · 着色器与 GLSL ES

着色器是运行在 GPU 上的小程序，用 GLSL ES 编写。一个程序至少包含一个顶点着色器和一个片元着色器。

| 着色器 | 作用 | 执行频率 |
|--------|------|----------|
| 顶点着色器 | 计算顶点位置与属性 | 每顶点一次 |
| 片元着色器 | 计算片元（≈像素）颜色 | 每片元一次 |

## 基本语法（GLSL ES 3.00）

```glsl
#version 300 es                  // 必须为首行
precision mediump float;         // 声明 float 精度

void main() {
  // ...
}
```

内置变量：

| 变量 | 所属 | 含义 |
|------|------|------|
| `gl_Position` | 顶点着色器 | 顶点最终位置（vec4，必须赋值） |
| `gl_PointSize` | 顶点着色器 | 点大小（float） |
| `out vec4 xxx` | 片元着色器 | 输出颜色（WebGL2 替代旧版 `gl_FragColor`） |

数据类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `float` / `int` | 标量 | `1.0`（须带小数点）/ `1` |
| `vec2/vec3/vec4` | 向量 | `vec4(1.0, 0.0, 0.0, 1.0)` |
| `mat4` | 4×4 矩阵 | 变换矩阵 |
| `sampler2D` / `samplerCube` | 纹理采样器 | 2D / 立方体贴图 |

`vec4` 分量为齐次坐标 `(x,y,z,w)`（顶点位置 w 常为 1.0）或颜色 `(r,g,b,a)`；访问用 `.x/.y/.z/.w`。

## 三种变量（CPU↔GPU 数据通道）

| 关键字（WebGL2） | 来源 | 用途 | 使用位置 |
|------------------|------|------|----------|
| `in`（旧 `attribute`） | CPU | 每顶点不同数据（位置、颜色、法线） | 顶点着色器 |
| `uniform` | CPU | 全局相同数据（矩阵、颜色） | 顶点/片元 |
| `out/in`（旧 `varying`） | 顶点着色器 | 顶点→片元插值 | 顶点出、片元入 |

JS 传值三步：声明变量 → `gl.getAttribLocation` / `gl.getUniformLocation` 取地址 → `gl.vertexAttrib*` / `gl.uniform*` 传数据。

常用 uniform 传值：

| 函数 | 用途 |
|------|------|
| `gl.uniform1f/3f/4f(loc, ...)` | 传 float 向量 |
| `gl.uniformMatrix4fv(loc, transpose, array)` | 传 4×4 矩阵（transpose 须为 false） |
| `gl.vertexAttrib3f(loc, x, y, z)` | 传常量给 attribute |

## 顶点→片元传递（插值）

顶点着色器用 `out` 输出，片元着色器用同名 `in` 接收，中间自动插值（渐变色原理）。

```glsl
// 顶点着色器
in vec4 a_Position; in vec4 a_Color; out vec4 v_Color;
void main() { gl_Position = a_Position; v_Color = a_Color; }
// 片元着色器
in vec4 v_Color; out vec4 fragColor;
void main() { fragColor = v_Color; }
```

## 常用内置函数

`max`、`min`、`dot`（点积）、`cross`（叉积）、`normalize`、`pow`、`texture`（采样，WebGL2 替代 `texture2D`）。
