# 自然场景：地形、植被与风动

> 面向学习：先读「原理」列，再看「实现要点」里对应的代码；参数面板里每个滑块都能实时验证公式。
> 代码入口：`src/scenes/nature/Scene.tsx`；参数：`src/scenes/nature/config.ts`。

## 1. 交付清单

```
src/scenes/nature/
├── Scene.tsx                  场景组装 + 时间预设（清晨/正午/黄昏）
├── config.ts                  5 个可调参数 + 相机
├── terrain.ts                 高度场 h(x,z) / 坡度 / 顶点色 / 几何生成
└── components/
    ├── SkyDome.tsx            渐变穹顶 + 太阳晕
    ├── Trees.tsx              实例化树干/树冠 + 高度加权风动
    └── GrassField.tsx         实例化交叉草叶 + 高度加权风动
```

| 效果 | 做法 | 每帧成本 |
|---|---|---|
| 地形 | CPU 生成 170² 网格（≈ 29k 顶点），一次构建 | 0（静态） |
| 地表混合 | 顶点色：高度/坡度 smoothstep 混合草/岩/雪/沙 | 0（烘焙在顶点里） |
| 天空 | 球体 + 垂直渐变 + `pow(dot(dir,sunDir))` 光晕 | 1 draw call |
| 树 | 树干/树冠各 1 个 InstancedMesh（≈ 190 实例） | 2 draw call |
| 草 | 4200 株交叉草叶 = 1 个 InstancedMesh | 1 draw call |
| 风动 | 顶点着色器位移，无 CPU 逐株更新 | 顶点阶段 |
| 大气 | FogExp2 | 片元阶段 |

## 2. 原理

### 2.1 高度场

```
h(x,z) = fbm(x,z) * meadow           // 起伏丘陵
       + mountainMask(r) * (5 + ridge(x,z) * 27)   // 边缘山体
       - 5.2 * (1 - smoothstep(3.5, 13, |z - riverCenter(x)|))  // 河谷下切
```

- `fbm`：5 层值噪声，振幅减半、频率 ×2.03；
- `ridge = 1 - |2n-1|`：噪声取绝对值再翻转，得到尖山脊而不是圆包；
- `mountainMask = smoothstep(34, 78, r)`：中心平、边缘高，形成「盆地看山」的构图；
- 河谷沿 `riverCenter(x) = sin(0.032x)*8 + sin(0.011x)*5` 蛇形下切，给画面一条视觉通道。

### 2.2 顶点色混合（不用贴图的材质分层）

```
grass  = lerp(低处绿, 高处黄绿, hNorm)
color  = grass
color  = lerp(color, 岩石灰, smoothstep(0.32, 0.62, slope))    // 陡坡露岩
color  = lerp(color, 雪白, smoothstep(0.62, 0.86, hNorm) * (1 - 坡度项))
color  = lerp(color, 沙色, 河谷接近度)
```

`slope = |∇h| / 2.2`（有限差分）。这等价于 instruction/03 §1.2 的「高度 + 坡度」规则，只是把结果烘到顶点色，零采样成本。

### 2.3 风动（顶点 Shader）

```
w      = smoothstep(0, 0.95, 叶片高度)          // 根部 0，叶尖 1
phase  = dot(instancePos.xz, windDir) - t * windSpeed * 1.6
sway   = sin(phase) * 0.62 + sin(phase * 1.7 + 1.3) * 0.38   // 双频，避免整齐划一
offset = sway * w * windStrength * 幅度
```

三个要点：
1. **高度加权**：`smoothstep` 让整棵树不是刚体摆动；
2. **位置相位**：`dot(instancePos.xz, windDir)` 产生「风从一侧扫过去」的空间波，不是所有树同时摆；
3. **双频叠加**：单一正弦看着像节拍器，加一个 1.7 倍频的非整数倍频立刻自然。

草与树冠用同一套公式但幅度/频率不同（草 0.22、树冠 0.16），保持协调又不雷同。

## 3. 参数与调参顺序

| 参数 | 默认 | 范围 | 影响 |
|---|---|---|---|
| `timePreset` | noon | 清晨/正午/黄昏 | 天空色、太阳方向、光强、雾色 |
| `windStrength` | 1 | 0–2 | 摆幅（0 = 完全静止） |
| `windSpeed` | 1 | 0–3 | 摆动快慢 |
| `vegetationDensity` | 0.85 | 0–1.5 | 树与草数量（低画质档草再减半） |
| `fogDensity` | 0.0075 | 0–0.03 | 远景山体淡化程度 |

建议顺序：先 `timePreset` 定基调 → `fogDensity` 定层次 → `windStrength/windSpeed` 定动感 → 最后 `vegetationDensity` 补密度。

## 4. 已知局限

1. **无阴影**：树/山没有投影，立体感靠光照方向与雾；开启阴影需要给 Canvas 开 `shadows` 并控制 shadow map 分辨率（见深化 S1）。
2. **无水面**：河谷是干河床。加水面需要 Fresnel + 法线扰动（深化 S2）。
3. **无 LOD**：远景山体与树都是同一精度；数量不大时影响有限。
4. **草是纯色几何**：没有贴图/法线，近看偏塑料感（可换 alpha 裁剪贴图，见深化 S4）。

## 5. 深化方案

### S1 阴影与 AO（工作量：中，收益：高）

- 给 `<Canvas shadows>` 打开，`directionalLight shadow-mapSize=[1024,1024]`、`shadow-camera` 收紧到视线附近；
- 树/地形 `castShadow/receiveShadow`；草的阴影用「假阴影贴片」或直接不投；
- 验收：阴影不抖动（`shadow-bias` 调参）、帧率下降 < 10%。

### S2 水面（工作量：中，收益：高）

- 河床已有高度差，可直接放水面网格；
- Fresnel：`F = pow(1 - dot(viewDir, normal), 5)`，掠射角反射更强；
- 两层法线贴图滚动 + `MeshPhysicalMaterial` 的 `clearcoat` 或自定义 shader；
- 验收：近看有波纹、远看有反光带、参数可调。

### S3 地形升级（工作量：中高，收益：中）

- 域扭曲（domain warping）：`h = fbm(p + fbm(p))`，山形更自然；
- 分块 LOD：按相机距离切换网格密度（三档即可）；
- 验收：远景不闪、近景细节增加。

### S4 风场与植被细节（工作量：低–中，收益：中）

- 用低频噪声生成「阵风」：把 `windStrength` 乘以一个随时间缓慢变化的噪声；
- 草加 alpha 裁剪贴图，近景更像草而不是几何片；
- 验收：阵风有强弱节奏、草叶边缘不硬。

## 6. 学习关键词

fBm / ridged noise / smoothstep 混合 / 顶点色 / InstancedMesh / 顶点位移风动 / 相位差 / Fresnel / LOD。

## 7. 验收清单

- [x] 地形有山体、谷地与可辨识层次
- [x] 植被分布遵循坡度/海拔/河谷规则，成片而非均匀撒点
- [x] 风动根部稳定、顶部摆动明显
- [x] 草与树相位不同步
- [x] 雾色与天空协调，远景有层次
- [x] 植被使用实例化，draw call 数不随数量线性增长
- [ ] 阴影 / 水面 / LOD（深化项）
