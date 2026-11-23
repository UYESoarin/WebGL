# 12 · WebGL 1.0 → 2.0 迁移

示例库 `examples - webgl2.0` 已按 WebGL 2.0 改写，本表用于对照旧代码。

## 上下文

| WebGL 1.0 | WebGL 2.0 |
|-----------|-----------|
| `canvas.getContext("webgl")` | `canvas.getContext("webgl2")` |
| `WebGLRenderingContext` | `WebGL2RenderingContext` |

## 着色器语法

| WebGL 1.0（GLSL ES 1.00） | WebGL 2.0（GLSL ES 3.00） |
|---------------------------|---------------------------|
| 无版本声明 | `#version 300 es` 首行 |
| `attribute` | `in`（顶点） |
| `varying` | `out`（顶点）/ `in`（片元） |
| `gl_FragColor` | 自定义 `out vec4 xxx;` |
| `texture2D(...)` | `texture(...)` |
| `textureCube(...)` | `texture(samplerCube, ...)` |
| `#extension ...` | 删除 |

### 迁移示例

片元着色器：

```glsl
// 1.0
varying vec4 v_Color;
void main() { gl_FragColor = v_Color; }

// 2.0
#version 300 es
precision mediump float;
in vec4 v_Color;
out vec4 fragColor;
void main() { fragColor = v_Color; }
```

## JS API 去扩展化

| WebGL 1.0（扩展后缀） | WebGL 2.0 |
|----------------------|-----------|
| `createVertexArrayOES()` | `createVertexArray()` |
| `drawArraysInstancedANGLE()` | `drawArraysInstanced()` |
| `drawElementsInstancedANGLE()` | `drawElementsInstanced()` |
| `vertexAttribDivisorANGLE()` | `vertexAttribDivisor()` |
| `drawBuffersWEBGL()` | `drawBuffers()` |

## 纹理内部格式

| WebGL 1.0 | WebGL 2.0 |
|-----------|-----------|
| `DEPTH_COMPONENT` | `DEPTH_COMPONENT24` |
| `DEPTH_STENCIL` | `DEPTH24_STENCIL8` |
| `RGBA` + `FLOAT` | `RGBA32F` |
| `RGBA` + `HALF_FLOAT_OES` | `RGBA16F` |
| `SRGB_ALPHA_EXT` | `SRGB8_ALPHA8` |

## 迁移口诀

1. 首行加 `#version 300 es`。
2. `attribute → in`、`varying → out/in`。
3. `gl_FragColor` 换成自定义 `out vec4`。
4. `texture2D/textureCube → texture`。
5. JS 去掉扩展后缀。
