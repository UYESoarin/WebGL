# 水下场景：地基实现与深化方案

> 本文分两部分：**上半部分**记录当前已实现效果的原理、代码位置、参数含义与已知近似；**下半部分**是待你学习后决策的深化方案（S1–S4）。所有效果都可以在运行时用 `D` 键打开参数面板直接调。

---

## 1. 这一版交付了什么

Phase 2「地基版」：把水下场景从占位方块换成一条**可运行、可调参、可继续深化的效果管线**，全部资源程序化生成（无外部模型/贴图，首屏不增加网络请求）。

```
src/scenes/underwater/
├── config.ts                 相机 + 9 个可调参数（HUD 参数面板数据源）
├── Scene.tsx                 组装：光照 + 海床 + 岩块 + 光束 + 鱼群 + 颗粒
├── terrain.ts                海床几何：fBm 沙丘 + 边缘抬升（CPU 一次性生成）
├── shaders/
│   ├── noise.ts              GLSL 值噪声 / fBm 工具片段
│   └── caustics.ts           焦散 GLSL + MeshStandardMaterial 注入函数
└── components/
    ├── Seabed.tsx            海床 + 焦散
    ├── LightShafts.tsx       丁达尔光束
    ├── MarineSnow.tsx        悬浮颗粒
    └── FishSchool.tsx        鱼群（InstancedMesh，orbit/wave）
```

**怎么体验**：`npm run dev` → 首页点「水下景观」→ 按 `D` 打开参数面板。建议先按「水体浓度 → 焦散强度 → 光束强度 → 鱼群数量/模式」的顺序感受每个参数的作用。

---

## 2. 效果清单

| 效果 | 一句话原理 | 实现位置 | 参数 | 每帧成本 |
|---|---|---|---|---|
| 水体吸收/雾 | 光在水中按距离衰减，越远越接近水色 | `engine/useSceneEnvironment.ts` + `Scene.tsx` 的 `ENV` | `fogDensity` | O(fragment) 内建雾计算，几乎免费 |
| 焦散 | 水面波动聚光，在海床形成移动亮线网络 | `shaders/caustics.ts` + `Seabed.tsx` | `causticsIntensity/Scale/Speed` | 2 次噪声 × 2 层 ≈ 8 次 hash/像素（仅海床） |
| 丁达尔光束 | 悬浮颗粒散射光，形成可见光柱 | `components/LightShafts.tsx` | `beamIntensity` | 7 个半透明大平面 → 主要成本是 **overdraw** |
| 悬浮颗粒 | 水中悬浮物缓慢下沉、随流漂移 | `components/MarineSnow.tsx` | `particleCount` | CPU 每帧 600×3 次浮点 + 1 次 buffer upload |
| 鱼群 | 个体按路径运动，鱼头朝向速度方向 | `components/FishSchool.tsx` | `fishMode/fishCount/fishSpeed` | 48 次矩阵合成 + 1 次 instanceMatrix 上传（1 个 draw call） |
| 海床地形 | fBm 噪声叠加成沙丘，边缘抬升挡视线 | `terrain.ts` | 无（静态） | 16 万顶点一次性生成，渲染 1 个 draw call |

**设计原则**：每个效果独立成组件/模块，参数从 `config.ts` 单一来源流入，任何一项都能单独关闭（粒子/鱼群数量置 0、强度置 0）而不影响其余部分。

---

## 3. 逐个效果：原理 → 实现 → 调参 → 局限

### 3.1 水体吸收与雾（Beer–Lambert 近似）

**原理**：光穿过介质时强度按指数衰减 `T(d) = exp(−σd)`（Beer–Lambert）。水下还伴随**散射**：远处的颜色不是变黑，而是逐渐被水体色（青蓝）取代，对比度下降。

**实现**：`useSceneEnvironment` 里给 `scene.fog` 挂 `THREE.FogExp2`。three 的内建雾公式是：

```
fogFactor = 1 − exp(−(density · depth)²)
```

它和 `exp(−σd)` 形状相似但不完全等价（指数里是平方），属于**可调近似**。因此：
- 背景色 `WATER_DEEP = #031a2a` 取比雾色 `WATER_FOG = #072e44` **更深的一档**，制造「越远越亮、越亮越浑」的错觉；
- 雾色略偏青，模拟散射光把远处染成水色。

**调参**：`fogDensity` 0.005–0.12。0.02 清澈见底；0.05 典型浑浊；0.1 能见度不足 10 单位。

**局限 / 为什么还不是物理模型**：① 没有区分颜色通道（真实水对红光的吸收远强于蓝光），所以远处不会先「褪红再褪绿」；② 没有方向性散射（前向散射形成的光晕）；③ 雾作用于所有材质，包括发光体。这三条正是 S4 深化点。

### 3.2 焦散（Caustics）

**原理**：水面波峰曲率大，像无数动态透镜把平行光汇聚成焦线。严格做法是求水面高度场的 Hessian 行列式（`I ∝ 1/|det H|`），成本高。课程级近似（instruction/02 §4）：

1. 两层不同缩放/方向/速度的值噪声叠加成连续场 `n(x,z,t)`；
2. `pow(1 − |2n − 1|, k)` 提取噪声取值为 0.5 的**等值线**——视觉上就是交错的亮线网格，`k` 越大线越细；
3. 把亮线**加进材质的 `diffuseColor`**，让 PBR 光照、阴影、雾继续正常作用。

**实现**：`applyCaustics(material, uniforms)` 用 `material.onBeforeCompile` 往 `MeshStandardMaterial` 里注入：
- 顶点着色器：把世界坐标写成 `vCausticWorldPos`（焦散图案必须固定在**世界空间**，否则物体一动图案就跟着动）；
- 片元着色器：在 `#include <color_fragment>` 之后 `diffuseColor.rgb += uColor * caustics * uIntensity`。

为什么用注入而不是「再叠一张半透明面片」：面片只能贴在平面上，无法跟随起伏地形，也不会被物体遮挡；注入 diffuse 后焦散天然受法线/凹凸/雾影响，且不增加 draw call。

**时间累加**而不是 `elapsedTime * speed`：`uTime += delta * speed`，这样拖动速度滑块时图案不会瞬移。

**调参**：`causticsIntensity` 0–2（1 左右自然）；`causticsScale` 0.15–1.2（越大亮斑越密，0.4–0.6 接近真实尺度）；`causticsSpeed` 0.3–1.0。

**局限**：① 噪声等值线不是真实光路，图案没有「汇聚→发散」的物理节奏；② 不随水深/坡度变化强度（真实焦散在陡坡上会被拉长变暗）；③ 两层固定权重，缺少高频细节。→ S2。

### 3.3 丁达尔光束（体积光近似）

**原理**：真实体积光需要沿视线积分 `∫ σ_s · phase(θ) · L_in · exp(−σ_t t) dt`，每像素几十次采样。本阶段用 instruction/02 §3 的经典近似：**用倾斜的半透明平面代替光束体**，在片元里算软边和衰减。

**实现**：`LightShafts.tsx`，7 个 `PlaneGeometry(6, 30)`，`AdditiveBlending + depthWrite:false + DoubleSide`。片元着色器：

```glsl
float edge   = 1.0 - abs(vUv.x - 0.5) * 2.0;      // 到中心轴距离
float soft   = pow(clamp(edge, 0.0, 1.0), 2.4);   // 软边
float vfade  = smoothstep(0.0, 0.92, vUv.y);      // 近水面亮、深处淡
float n      = view_noise(vec2(vUv.x*6.0, vUv.y*1.8 - uTime*0.09));
float alpha  = soft * vfade * (0.62 + 0.38*n) * uIntensity * 0.30;
```

**调参**：`beamIntensity` 0–2。超过 1.5 时叠加区会过曝（加法的固有特性）。

**局限 / 会看到什么**：环绕相机时能看出「薄片」的侧边（平面法线几乎与视线垂直时突然消失），多束重叠处亮度叠加偏白。这些是平面近似的固有代价，S3 给出两条升级路线。透明排序问题已通过 `AdditiveBlending`（顺序无关）+ `renderOrder` 缓解，但重叠过曝仍存在。

### 3.4 悬浮颗粒（marine snow）

**原理**：水中悬浮有机碎屑缓慢下沉，被水流带着漂移；靠近镜头时可见，远处融入雾。

**实现**：`THREE.Points` + `PointsMaterial({ size: 0.055, sizeAttenuation: true })`。每帧 CPU 更新 600 个位置：`y -= step * (0.10 + 0.018*(i%5))`，水平用 `sin/cos(t + i·φ)` 漂移；沉到底部后在上方重生。`delta` 做了 `min(delta, 0.05)` 钳制——切回页签时浏览器给的大 `delta` 会造成粒子「瞬移」。

**调参**：`particleCount` 0–1600（低画质档自动减半）。60 fps 下 600 个点的 CPU 更新约 0.05 ms，可以忽略；**上万**才需要迁移到 GPU（顶点着色器里用 `mod(time)` 做循环位移）。

**局限**：粒子无大小差异（`PointsMaterial` 的 size 是全局的）、无近大远小的透明度衰减、无遮挡关系（`depthWrite:false`），穿过海床时不会消失。

### 3.5 鱼群（InstancedMesh + 确定性运动）

**原理与顺序**（instruction/02 §1.4）：先用 10 条验证朝向 → 加正弦扰动 → 再上 Boids。本版完成前两步的「工业化版本」：**orbit / wave 两种确定性运动 + InstancedMesh 绘制管线**，目的是先把「CPU 算位置 → 写 `instanceMatrix`」这条后续 Boids 可直接复用的管线打通。

**实现要点**：

- 所有鱼共享一份几何 + 材质，`InstancedMesh` 绘制 → **1 个 draw call**（48 条鱼与 480 条鱼的 draw call 相同）；
- `positionAt(seed, t, ...)` 是**纯函数**：同一时刻可算出任意鱼的位置。朝向用「前方 0.08s 的位置 − 当前位置」求速度方向，再 `quaternion.setFromUnitVectors(FORWARD, dir)`——避免为每种运动模式单独推导解析导数；
- `instanceMatrix.setUsage(DynamicDrawUsage)` + 每帧 `needsUpdate = true`；
- 种子由序号哈希生成（`seedFor`），同一 `count` 下分布稳定，不会每帧抖动。

**调参**：`fishMode`（Orbit/Wave 质感差异明显：Orbit 是绕中心的环，Wave 是横向扫过）；`fishCount` 0–160；`fishSpeed` 0.1–3。

**局限**：没有「群体」行为——每条鱼独立运动，不存在邻域交互。这正是 S1 的主题。

### 3.6 海床地形

**原理**：fBm（分形布朗运动）= 多个倍频的值噪声叠加，得到「大起伏里套小起伏」的自然感。

**实现**：`terrain.ts` 一次性生成 `PlaneGeometry(110, 110, 128, 128)`（约 1.6 万顶点），逐顶点算：

```
y = base(−3.4) + fBm(x·0.035, z·0.035, 4)·振幅 + 细沙波纹 + 边缘抬升 + 中心海沟
```

**边缘抬升**：半径超过 52% 后按平方曲线升到 9 单位高，形成「地形围墙」，相机无论如何旋转都看不到平面边界。**中心海沟**：`−0.6·exp(−r²/320)`，让镜头正前方有低洼层次。最后 `computeVertexNormals()` 得到正确法线（这是焦散和光照正确的前提）。

**局限**：静态、无 LOD、无碰撞。若要「地形可交互/可变形」，需迁到顶点着色器位移 + 高度图采样（S2 附带项）。

---

## 4. 参数总表

| 参数 | 默认 | 建议区间 | 影响 | 调参顺序 |
|---|---:|---|---|---|
| `fishMode` | orbit | orbit / wave | 鱼群运动形态 | ④ |
| `fishCount` | 48 | 0–160 | 实例数（draw call 不变） | ④ |
| `fishSpeed` | 1 | 0.1–3 | 整体时间缩放 | ④ |
| `fogDensity` | 0.045 | 0.005–0.12 | 能见度/浑浊度（先调它定基调） | ① |
| `causticsIntensity` | 0.9 | 0–2 | 焦散亮度 | ② |
| `causticsScale` | 0.5 | 0.15–1.2 | 焦散密度 | ② |
| `causticsSpeed` | 0.55 | 0–2 | 焦散流动速度 | ② |
| `beamIntensity` | 1 | 0–2 | 光束亮度 | ③ |
| `particleCount` | 600 | 0–1600 | 悬浮颗粒数量 | ⑤ |

> 参数实现遵循「参数只管数值，效果组件只管消费」：`config.ts` 是唯一 schema 来源，`Scene.tsx` 用带默认值的 `num()` 读取，缺省/损坏时不会崩。

---

## 5. 深化方案（S1–S4，供决策）

> 每项都写了：目标、算法、要学的知识、工作量、性能预算、是否需要外部资源、验收标准。按「性价比 × 学习价值」推荐顺序：**S1 > S2 > S3 > S4**。

### S1｜Boids 鱼群三规则（推荐先做）

- **目标**：鱼群出现真正的群体行为：受惊散开、整体转向、绕障碍回旋；三种模式（School/Orbit/Wave）可切换且差异可辨。
- **算法**：每条鱼只看半径 `R` 内的邻居，计算三个 steering 向量并加权：
  - Separation：`Σ (p_i − p_j)/|p_i − p_j|²`（越近斥力越大）
  - Alignment：`avg(v_neighbors) − v_i`
  - Cohesion：`avg(p_neighbors) − p_i`
  - 合成 `a = w_s·S + w_a·A + w_c·C (+ w_b·边界回避)`，再积分 `v += a·dt`，限制 `|v| ≤ v_max`、`|a| ≤ a_max`。
- **性能**：O(N²) 在 N≤100 时可接受（100²=1 万次距离判断/帧）；N 再大必须**空间哈希分桶**（格子边长 = 邻域半径，只查 3×3 格）。文档需记录两者耗时对比。
- **要学的知识**：向量运算、邻域搜索、空间哈希、积分器稳定性（dt 过大发散）、实例矩阵与朝向。
- **工作量**：中（新增 `boids.ts` 纯逻辑 + 改造 `FishSchool` 消费速度向量）。
- **外部资源**：不需要（仍用锥体；换真鱼模型见 `docs/RESOURCES.md`）。
- **验收**：①三种模式肉眼可分；②鱼头始终朝向速度方向；③60fps 下 N=100 稳定；④有「震惊点」测试（在鱼群中心放置一个吸引/排斥点，群体散开后重聚）。

### S2｜焦散升级（贴图化 + 物理修正）

- **目标**：亮斑有真实焦散的「汇聚-发散」节奏；坡度、水深会影响强度。
- **算法**：①用 2 张可平铺焦散纹理（或 1 张 + 旋转第二次采样）替代程序噪声；②沿世界坐标 UV 滚动并做二次旋转；③按法线 `N.y` 调制强度（陡坡变弱）、按深度 `smoothstep` 衰减；④可选：多频叠加。
- **要学的知识**：可平铺纹理、UV 滚动/旋转矩阵、采样成本、mipmap 与各向异性过滤。
- **工作量**：小（替换 `CAUSTICS_GLSL` 的采样 + 1 个法线 varying）。
- **外部资源**：**需要** 2 张焦散贴图（获取方式见 `docs/RESOURCES.md` R2；也可先用程序生成的低频噪声过渡）。
- **验收**：①图案无接缝；②不同坡度亮度不同；③与水面高度/深度联动；④切换贴图只需改配置。

### S3｜光束升级（两条路线任选）

- **路线 A（低成本，推荐）**：多层 billboard——每束光 3–5 个同心平面 + 每层独立噪声相位；边缘用 `1 − smoothstep` 双层衰减；加入「相机朝向权重」让薄片侧视时淡出。
- **路线 B（高成本，效果最好）**：后处理 god rays（屏幕空间径向模糊：从光源屏幕位置向外采样 32–64 次），或用体积雾 raymarch（16–32 步，需要降分辨率渲染）。
- **要学的知识**：透明排序、billboard、屏幕空间光轴、体积步进、降采样与升采样。
- **工作量**：A 小；B 中偏大（需要引入后处理管线，城市场景的 Bloom 也复用同一管线，建议两场景一起做）。
- **外部资源**：不需要。
- **验收**：①任意视角看不到平面边缘；②光束强度随深度衰减；③开启后帧率下降 <15%（B 路线 <25%）。

### S4｜水体体积感（后处理 + 水面）

- **目标**：从「雾」升级为真正的「水下光学」：颜色按通道吸收、面光源散射光晕、抬头能看到水面波纹与 Snell's window。
- **算法**：①后处理 pass：`finalColor = mix(waterColor_channel, finalColor, exp(−σ_channel·depth))`，用深度纹理求光程；②屏幕空间散射：以光源屏幕位置为核做模糊叠加；③水面：法线噪声 + 菲涅尔 + 折射/全反射阈值；④气泡系统（CPU 粒子 + 上升）。
- **要学的知识**：深度纹理、后处理管线（EffectComposer / R3F postprocessing）、菲涅尔公式、折射近似、双 pass 成本。
- **工作量**：大（建议放在四个场景收尾、性能基线建立之后）。
- **外部资源**：可选 HDR 环境；水面法线贴图可选。
- **验收**：①红色物体在远处先变暗再变青；②后处理关闭时画面仍成立（降级）；③性能预算内。

---

## 6. 学习关键词

Boids / steering behavior / 邻域搜索 / 空间哈希 / InstancedMesh / instanceMatrix / 朝向四元数（setFromUnitVectors）/ Beer–Lambert / FogExp2 / 值噪声 / fBm / 等值线（ridge）/ 透明混合（Additive)/depthWrite / 软边（smoothstep）/ 体积散射近似 / draw call / overdraw / GPU 粒子。

## 7. 验收清单（当前地基）

- [x] 水下场景有前中远景层次（海床沙丘 + 岩块 + 边缘围墙）
- [x] 焦散随世界坐标流动、参数可调、无闪烁
- [x] 光束有软边与噪声扰动，强度可调
- [x] 悬浮颗粒数量受控，低画质自动减半
- [x] 鱼群用 InstancedMesh 绘制（1 个 draw call），朝向正确，两种模式可切换
- [x] 9 个参数可在 HUD 面板实时调节（`D` 键）
- [x] `npm run build` 通过
- [ ] 三种鱼群模式（School/Orbit/Wave）差异可辨 → S1
- [ ] 焦散纹理化 → S2
- [ ] 任意视角看不到光束平面边缘 → S3
