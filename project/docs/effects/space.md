# 太空场景：星场、星云与吸积盘

> 代码入口：`src/scenes/space/Scene.tsx`；参数：`src/scenes/space/config.ts`。

## 1. 交付清单

```
src/scenes/space/
├── Scene.tsx                  场景组装
├── config.ts                  4 个可调参数 + 相机
└── components/
    ├── StarField.tsx          三层球壳星场
    ├── Nebula.tsx             两层噪声平面星云
    ├── AccretionDisk.tsx      圆环 + 极坐标着色
    └── BlackHoleCore.tsx      暗球（事件视界）+ 光子环
```

| 效果 | 做法 | 每帧成本 |
|---|---|---|
| 星空 | 3 层 Points（球壳采样），固定像素大小 | 3 draw call |
| 星云 | 2 个平面，fbm 噪声 + 加法混合 | 2 draw call |
| 吸积盘 | 圆环几何，片元极坐标着色 | 1 draw call |
| 黑洞 | 黑球 + 细环 | 2 draw call |

## 2. 原理

### 2.1 星场分层

- 位置在球壳上均匀采样：`u = rand*2-1; phi = rand*2π; s = sqrt(1-u²)` → 避免星点挤在平面上；
- 三层：半径 150（2600 颗，暗）/ 110（700 颗，亮）/ 80（140 颗，最亮）；
- `sizeAttenuation: false`：星星是「屏幕像素大小」，不随距离缩小，否则远处直接消失。

### 2.2 吸积盘：极坐标着色

圆环几何只有位置；把局部坐标转成极坐标就能直接写图形：

```
r     = length(vLocal.xz)
angle = atan(vLocal.z, vLocal.x)

rim      = smoothstep(内缘, 内缘+0.42, r) * (1 - smoothstep(外缘-1.6, 外缘, r))
swirl    = fbm(vec2(angle*2.4 - t*0.55, r*1.35 + t*0.12), 4)
bands    = 0.45 + 0.55*smoothstep(0.25, 0.85, swirl)     // 旋臂
doppler  = 0.62 + 0.38*cos(angle - 0.7)                  // 一侧更亮（视觉近似）
color    = mix(白热, 橙红, 1 - heat)
alpha    = rim * bands * doppler * intensity
```

关键点：
- **内缘更亮**：越靠近视界温度越高（视觉上更白）；
- **角向噪声**：`angle` 推进让纹理沿圆周流动，而不是整体旋转一张贴图；
- **多普勒差**：一半更亮制造「盘在转」的错觉，纯视觉近似。

### 2.3 黑洞中心必须黑

黑球用 `MeshBasicMaterial color #000`（不受光照影响，保证纯黑），发光全部放在环上。
如果把发光放在球面，会出现「发光球」而不是黑洞——这是这类场景最常见的错误。

## 3. 参数与调参顺序

| 参数 | 默认 | 范围 | 影响 |
|---|---|---|---|
| `diskSpeed` | 0.8 | 0–3 | 旋臂流动速度 |
| `diskIntensity` | 1 | 0–2.5 | 环带亮度 |
| `starDensity` | 1 | 0–2 | 星点数量（低画质再减少） |
| `nebulaIntensity` | 0.8 | 0–2 | 星云透明度 |

建议顺序：`diskIntensity` 定主体 → `diskSpeed` 定动态 → `starDensity` 定背景密度 → `nebulaIntensity` 补氛围。

## 4. 已知局限

1. **没有引力透镜**：星场不会被偏折。真正的屏幕空间扭曲需要先把场景渲染到纹理再采样（S1）。
2. **星云是平面**：从侧面看是薄片；拉远/固定视角下没问题。
3. **没有喷流/星尘**：视觉中心只有吸积盘。
4. **光子环是几何环**：不是光线追踪产生的「多重像」。

## 5. 深化方案

### S1 屏幕空间引力透镜（工作量：高，收益：视觉冲击最大）

实现路径：
1. 场景先渲染到 `WebGLRenderTarget`（或用 postprocessing 的 `EffectComposer` 自定义 pass）；
2. 片元里 `delta = uv - center; r = length(delta);`
3. `falloff = strength / (r*r + epsilon)`，用 `smoothstep` 限制在影响半径内；
4. `warpedUV = uv + normalize(delta) * falloff`，clamp 边界；
5. 用 `warpedUV` 采样上一步的颜色纹理。

注意：这是屏幕空间近似，不是广义相对论；参数要小步调，过大直接出现「甜甜圈」伪影。

### S2 喷流与星尘（工作量：中，收益：中）

- 喷流：沿黑洞极轴的两条锥体/曲线粒子带，加法混合；
- 星尘：`Points` 沿盘外侧缓慢漂移，颜色偏蓝；
- 验收：喷流方向与盘垂直、粒子不闪。

### S3 星云体积感（工作量：中，收益：中）

- 多层平面（3–5 层不同深度/旋转）+ 不同噪声频率；
- 或低分辨率体积纹理 ray-march（成本高，P2）。

## 6. 学习关键词

球壳采样 / Points 与 sizeAttenuation / 极坐标着色 / fbm 旋臂 / 加法混合 / 屏幕空间采样 / WebGLRenderTarget。

## 7. 验收清单

- [x] 黑洞中心保持暗，吸积盘形成明显环绕结构
- [x] 吸积盘有流动细节（旋臂随时间推进）
- [x] 星场有远近层次
- [x] 参数实时影响效果
- [ ] 引力透镜（深化 S1）
