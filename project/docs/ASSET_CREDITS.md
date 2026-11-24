# 资源所有权与来源记录（ASSET CREDITS）

本文件记录 VIEW 项目所用全部资源的来源、许可与所有权，作为「不引入无主资源」约束的执行依据。

## 当前阶段（Phase 1）资源清单

| 资源 | 路径 | 来源 | 许可 | 所有权 |
|---|---|---|---|---|
| 场景缩略图：水下 | `public/assets/images/scenes/underwater.svg` | 本项目程序化绘制（占位） | 自有 | 自有 |
| 场景缩略图：自然 | `public/assets/images/scenes/nature.svg` | 本项目程序化绘制（占位） | 自有 | 自有 |
| 场景缩略图：城市 | `public/assets/images/scenes/city.svg` | 本项目程序化绘制（占位） | 自有 | 自有 |
| 场景缩略图：太空 | `public/assets/images/scenes/space.svg` | 本项目程序化绘制（占位） | 自有 | 自有 |

> 以上 SVG 均为占位缩略图，后续按各场景实现进度替换为真实渲染截图或独立设计图。

## Phase 2 水下场景：程序化资源（无外部文件）

| 资源 | 实现位置 | 来源 | 许可 | 所有权 |
|---|---|---|---|---|
| 海床地形几何（fBm 沙丘 + 边缘抬升） | `src/scenes/underwater/terrain.ts` | 本项目代码生成 | 自有 | 自有 |
| 焦散图案（GLSL 值噪声 ridged 变换） | `src/scenes/underwater/shaders/caustics.ts` | 本项目代码生成 | 自有 | 自有 |
| 丁达尔光束（软边 + 噪声扰动） | `src/scenes/underwater/components/LightShafts.tsx` | 本项目代码生成 | 自有 | 自有 |
| 悬浮颗粒（marine snow） | `src/scenes/underwater/components/MarineSnow.tsx` | 本项目代码生成 | 自有 | 自有 |
| 鱼群（锥体 + InstancedMesh） | `src/scenes/underwater/components/FishSchool.tsx` | 本项目代码生成 | 自有 | 自有 |

> 该阶段刻意不使用任何外部模型/贴图：一是规避许可与体积问题，二是先把「原理正确」的管线跑通。可选外部资源清单见 `docs/RESOURCES.md`。

## Phase 2 其余三场景：程序化资源（无外部文件）

| 资源 | 实现位置 | 来源 | 许可 | 所有权 |
|---|---|---|---|---|
| 自然地形几何（fBm + ridged 山脊 + 河谷下切 + 顶点色） | `src/scenes/nature/terrain.ts` | 本项目代码生成 | 自有 | 自有 |
| 天空穹顶（渐变 + 太阳晕） | `src/scenes/nature/components/SkyDome.tsx` | 本项目代码生成 | 自有 | 自有 |
| 树干/树冠（实例化 + 高度加权风动） | `src/scenes/nature/components/Trees.tsx` | 本项目代码生成 | 自有 | 自有 |
| 草叶（交叉面片实例化 + 风动） | `src/scenes/nature/components/GrassField.tsx` | 本项目代码生成 | 自有 | 自有 |
| 城市街区布局（固定种子） | `src/scenes/city/layout.ts` | 本项目代码生成 | 自有 | 自有 |
| 建筑 + 窗户图案（片元程序化） | `src/scenes/city/components/Buildings.tsx` | 本项目代码生成 | 自有 | 自有 |
| 道路与车道线（自发光片元） | `src/scenes/city/components/Roads.tsx` | 本项目代码生成 | 自有 | 自有 |
| 交通（曲线 + 实例化车体/灯条） | `src/scenes/city/components/Traffic.tsx` | 本项目代码生成 | 自有 | 自有 |
| 夜雨粒子 | `src/scenes/city/components/Rain.tsx` | 本项目代码生成 | 自有 | 自有 |
| 星场（三层球壳 Points） | `src/scenes/space/components/StarField.tsx` | 本项目代码生成 | 自有 | 自有 |
| 星云（fBm 片元 + 加法混合） | `src/scenes/space/components/Nebula.tsx` | 本项目代码生成 | 自有 | 自有 |
| 吸积盘（圆环 + 极坐标着色） | `src/scenes/space/components/AccretionDisk.tsx` | 本项目代码生成 | 自有 | 自有 |
| 黑洞核心与光子环 | `src/scenes/space/components/BlackHoleCore.tsx` | 本项目代码生成 | 自有 | 自有 |
| 共享噪声函数（GLSL） | `src/engine/shaders/noise.ts` | 本项目代码生成 | 自有 | 自有 |

> 与水下阶段相同的约定：先程序化跑通管线，外部资源按 `docs/RESOURCES.md` 的清单由用户采购后登记再接入。

## 参考素材（不参与运行时构建）

| 资源 | 路径 | 用途 | 说明 |
|---|---|---|---|
| 参考图 1/2 | `init/`（策划包内 2 张 PNG） | 仅设计参考 | 不打包、不提交运行时资源，仅用于视觉方向参考 |

## 原则

1. 任何外部模型、贴图、HDR、音频、字体，入库前必须在本文件登记来源与许可。
2. 优先使用程序化生成（Shader / 噪声 / 参数化几何）以规避版权与体积问题。
3. 未经登记的资源不得进入 `src/` 或 `public/`。
