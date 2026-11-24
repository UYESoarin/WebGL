# 未来城市：建筑、霓虹、交通与雨雾

> 代码入口：`src/scenes/city/Scene.tsx`；布局：`src/scenes/city/layout.ts`；参数：`src/scenes/city/config.ts`。

## 1. 交付清单

```
src/scenes/city/
├── Scene.tsx              场景组装（灯光/雾/子组件）
├── config.ts              4 个可调参数 + 相机
├── layout.ts              程序化街区布局（固定种子）
└── components/
    ├── Buildings.tsx      单个 InstancedMesh + 窗户片元生成
    ├── Roads.tsx          地面 + 主干道自发光车道线
    ├── Traffic.tsx        CatmullRom 曲线交通 + 实例化车身/灯条
    └── Rain.tsx           Points 夜雨
```

| 效果 | 做法 | 每帧成本 |
|---|---|---|
| 建筑群 | 1 个 InstancedMesh（≈ 90 栋），共享 1×1×1 盒 | 1 draw call |
| 窗户 | 片元补丁：UV 分格 + hash 点亮 + 冷暖色 | 片元阶段 |
| 地面/道路 | 2 个平面，车道线走自发光项 + 流动脉冲 | 2 draw call |
| 交通 | 车身 1 个 + 灯条 1 个 InstancedMesh，逐帧写矩阵 | 2 draw call |
| 夜雨 | Points（最多 2400） | 1 draw call |
| 氛围 | FogExp2 + 弱环境光 | 片元阶段 |

## 2. 原理

### 2.1 布局：先道路后建筑

`createCityLayout()` 的规则（instruction/04 §1）：
1. 沿 Z 轴一条主干道（宽 14），两侧街区依次排布，街区之间留横向街道；
2. 每栋楼尺寸随机（宽 4–8.5、深 4–8.5），**越靠近中心越高**：`h = 7 + rand*14 + central² * 24`；
3. 街区后排再放一排矮楼，制造前后层次；
4. 固定种子 → 每次进入完全一致，便于对比调参。

### 2.2 窗户：为什么用片元生成而不是贴图

贴图方案的问题：楼高不同 → 同一张立面图会被拉伸，窗户大小不一致。
片元方案：`uv` 每个面都是 0..1，先乘 `grid = (5+hash, 7+hash*7)` 得到窗格坐标：

```
cell   = fract(uv * grid)                    // 窗格内坐标
win    = 窗洞矩形（cell 在 0.16–0.84 / 0.2–0.8 内）
lit    = step(0.52, hash(cellId + buildingSeed))   // 约 48% 亮
color  = mix(冷青, 暖橙, hash)                     // 冷暖混合
emissive += win * lit * color * neonIntensity
```

这样窗户数量随楼高自动变化（网格密度由 `grid` 决定，UV 不变），且无需任何贴图文件。

### 2.3 交通：曲线 + 弧长参数

```
p = curve.getPointAt(t)        // 弧长参数，速度恒定（getPoint 是参数空间，会忽快忽慢）
dir = curve.getTangentAt(t)
t = (t + speed * dt * 0.055) % 1
```

朝向用 `Quaternion.setFromUnitVectors(forward, tangent)`，避免欧拉角跳变。

### 2.4 湿地与雨

- 地面 `roughness 0.24 / metalness 0.55`：高光更「湿」，但**没有真实反射**（无 envMap，不追求镜面）；
- 雨：Points 向下 + 横向漂移，越界回卷到顶部；`sizeAttenuation` 让近处雨滴更大；
- 雾：夜城必须有雾，否则远近楼一个颜色，失去纵深。

## 3. 参数与调参顺序

| 参数 | 默认 | 范围 | 影响 |
|---|---|---|---|
| `neonIntensity` | 1.2 | 0–2.5 | 窗户 + 车道线自发光倍率 |
| `trafficSpeed` | 1 | 0–3 | 车流速度 |
| `rainAmount` | 0.45 | 0–1 | 雨滴数量（低画质再减半） |
| `fogDensity` | 0.013 | 0.002–0.04 | 远景层次 |

建议顺序：`fogDensity` 定纵深 → `neonIntensity` 定视觉重心 → `rainAmount` 定天气情绪 → `trafficSpeed` 定动势。

## 4. 已知局限

1. **没有 Bloom**：目前只有 emissive，霓虹「发光扩散」感不足。这是最值得补的一项（S1）。
2. **没有真实反射**：湿地面只有高光，没有楼影倒映（需要反射探针或屏幕空间反射）。
3. **建筑无 LOD**：远景与近景同样精度；当前数量不大（≈90 栋）影响有限。
4. **雨是粒子**：没有屏幕水滴与雨丝拉长效果。

## 5. 深化方案

### S1 Bloom（工作量：中，收益：最高）

1. 安装 `@react-three/postprocessing`（注意 peer 与 react 19.1 兼容）；
2. `<EffectComposer><Bloom luminanceThreshold={0.55} intensity={0.9} mipmapBlur /></EffectComposer>`；
3. 低画质档不挂 EffectComposer；
4. 验收：楼体轮廓不被吞、霓虹有扩散、帧率下降 < 15%。

### S2 湿地面反射（工作量：中高，收益：高）

- 方案 A：drei `<MeshReflectorMaterial>`（单面反射，成本可控）；
- 方案 B：屏幕空间反射后处理（成本高，P2）；
- 验收：车灯/霓虹有倒影、反射不过曝。

### S3 建筑模块化与广告牌（工作量：中，收益：中）

- 3–5 种「楼型」几何组合（退台、天线、裙楼）；
- 广告牌：平面 + 自发光铭牌（可后续换 Canvas 文字贴图）；
- 验收：天际线不再全是方块。

### S4 体积雾/光柱（工作量：中，收益：中）

- 低分辨率半透明平面或体积雾后处理；
- 注意透明排序与 overdraw（instruction/04 §5）。

## 6. 学习关键词

InstancedMesh / 片元程序化图案 / hash 随机 / CatmullRom 曲线 / 弧长参数 / emissive 与 Bloom 的区别 / 湿材质 roughness。

## 7. 验收清单

- [x] 建筑有主次与远近层次（中心更高、后排更矮）
- [x] 窗户自发光分冷暖、随机点亮
- [x] 车道线自发光且带流动
- [x] 交通沿曲线运动、方向正确
- [x] 雨量参数影响粒子数
- [x] 低画质档减少雨量与车辆
- [ ] Bloom（深化 S1）
