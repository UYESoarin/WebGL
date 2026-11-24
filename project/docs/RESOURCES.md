# 资源获取与导入清单（用户执行）

> 分工约定：**资源获取、导入、许可登记由你执行**；我负责给出「要什么、放哪里、接到哪行代码、什么规格不会拖慢项目」。所有资源入库前必须在 `docs/ASSET_CREDITS.md` 登记来源与许可（这是 `init/` 里定下的硬约束）。
>
 > **当前四个场景的地基都不需要任何外部资源**——全部程序化生成（自然/城市/太空同样如此）。下表是「深化到下一阶段时才需要」的可选项，你可以按兴趣与时间逐项采购。

---

## 0. 通用规则（先看这个）

| 规则 | 说明 |
|---|---|
| 放置目录 | 模型 `public/assets/models/`，贴图 `public/assets/textures/`，环境 `public/assets/hdr/`，音频 `public/assets/audio/`，字体 `public/assets/fonts/` |
| 为什么放 `public/` | 走静态资源 URL（如 `/assets/textures/caustic.png`），Vite 不参与打包哈希；适合「运行时可替换」的资产。**需要 tree-shake/哈希的**代码内资源才 import。 |
| 体积上限 | 单张贴图 ≤ 2K（2048²）且 ≤ 1.5 MB；单个 GLB ≤ 2 MB、≤ 20k 三角形；HDR ≤ 2K |
| 格式 | 颜色贴图 PNG/WebP；法线/粗糙度/金属度 PNG；模型 GLB（不要 FBX/OBJ）；HDR 用 `.hdr` |
| 命名 | 全小写 + 连字符，如 `caustic-tile-01.png`；不用中文、空格 |
| 许可 | 只收 CC0 / CC-BY（需署名）/ 明确允许商用的站点素材；**拿不准就不收** |
| 登记 | 每个文件在 `docs/ASSET_CREDITS.md` 增加一行：资源 / 路径 / 来源 URL / 许可 / 作者 |

---

## 1. 资源清单

### R1. 低模鱼 GLB（替换锥体占位）—— 优先级：中，S1 后需要

| 项 | 内容 |
|---|---|
| 用途 | 让鱼群从「灰色锥体」变成可辨识的鱼；单条鱼 ≤ 500 三角形，鱼头朝向 **+Z**（与现有坐标约定一致） |
| 规格 | GLB；≤ 300 KB/条；带一张 512 的 baseColor 最好；不需要骨骼动画（S1 用整体朝向即可） |
| 来源建议 | Kenney「Fish Pack」（CC0）、Quaternius 水生动物包（CC0）、Sketchfab 筛 CC0/CC-BY |
| 放哪里 | `public/assets/models/fish.glb` |
| 接入点 | `src/scenes/underwater/components/FishSchool.tsx` 第 ~110 行 `new THREE.ConeGeometry(...)` → 改为 `useGLTF('/assets/models/fish.glb').scene` 克隆；朝向仍保持 +Z（若模型是 +X，在 geometry 上 `rotateY(-π/2)` 修正） |
| 不导入的替代 | 继续用锥体 + 加一个「尾鳍薄片」子几何，视觉也能过关 |

### R2. 焦散贴图 ×2（S2 深化用）—— 优先级：中

| 项 | 内容 |
|---|---|
| 用途 | 替代程序噪声，获得真实焦散的汇聚-发散节奏 |
| 规格 | **可无缝平铺**（tileable）；1024² 或 2048²；灰度或蓝白；2 张不同图案（或 1 张 + 代码里旋转第二次采样） |
| 来源建议 | ambientCG「Caustics」类（CC0）、Poly Haven 纹理（CC0）、Pixabay（Pixabay 许可） |
| 放哪里 | `public/assets/textures/caustic-01.png`、`caustic-02.png` |
| 接入点 | `src/scenes/underwater/shaders/caustics.ts`：加 `uniform sampler2D uCausticMap`，把 `view_causticLayer()` 里的 `view_noise(q)` 换成 `texture2D(uCausticMap, fract(q)).r`；采样两次（不同 UV 偏移/旋转）相乘 |
| 不导入的替代 | 保持现有程序噪声（已经是可接受效果，只是缺少物理节奏） |

### R3. 可平铺噪声纹理 —— 优先级：低（可选）

| 项 | 内容 |
|---|---|
| 用途 | 光束边缘扰动、水面法线、雾的细节；shader 内程序噪声已够用，纹理可换更高频细节 |
| 规格 | 无缝平铺、512²–1024²、单通道灰度 |
| 来源建议 | ambientCG「Noise」类（CC0） |
| 放哪里 | `public/assets/textures/noise-tile.png` |
| 接入点 | `src/scenes/underwater/shaders/noise.ts` 的 `view_noise()` 调用处（或新增 `texture2D` 版本函数） |

### R4. 环境 HDR —— 优先级：低（S4 再说）

| 项 | 内容 |
|---|---|
| 用途 | 天体反射/氛围光；水下用「水下 HDR」或「阴天天空」压暗后可模拟水面透光 |
| 规格 | 2K `.hdr`，≤ 3 MB |
| 来源建议 | Poly Haven（CC0） |
| 放哪里 | `public/assets/hdr/underwater.hdr` |
| 接入点 | 新增组件里用 drei `<Environment files="/assets/hdr/underwater.hdr" />`（注意：会增加一次网络请求，首屏要加 loading 态） |

### R5. 海底岩石 / 珊瑚模型 —— 优先级：低

| 项 | 内容 |
|---|---|
| 用途 | 替换 `Scene.tsx` 里 `BOULDERS` 的 icosahedron 占位 |
| 规格 | GLB ≤ 1 MB；2–3 种即可 |
| 放哪里 | `public/assets/models/rock-01.glb` 等 |
| 接入点 | `src/scenes/underwater/Scene.tsx` 的 `BOULDERS.map(...)` 换成 `useGLTF` 实例化 |

### R6. 中文字体（UI 优化阶段，BACKLOG A1）—— 优先级：中

| 项 | 内容 |
|---|---|
| 用途 | 首页/HUD 的标题与正文统一字形 |
| 规格 | 优先 WOFF2；中文字体全量 3–8 MB，建议用「按需子集化」或选思源黑体可变字体子集 |
| 来源建议 | 思源黑体（SIL OFL）、霞鹜文楷（SIL OFL）、Inter/Manrope（OFL） |
| 放哪里 | `public/assets/fonts/`，在 `src/styles/global.css` 用 `@font-face` 声明 |
| 注意 | 字体是「首屏最大单文件」，必须做子集化，否则 LCP 会明显变差 |

### R7. 音效 —— 优先级：低（可选）

| 项 | 内容 |
|---|---|
| 用途 | 水下闷响环境音 + 气泡声；增加沉浸感 |
| 规格 | OGG/MP3；循环素材 ≤ 1 MB |
| 来源建议 | freesound（逐个看许可）、Pixabay 音效 |
| 放哪里 | `public/assets/audio/` |
| 注意 | 浏览器自动播放限制：必须等用户首次交互（点击「进入场景」）后再 `audio.play()` |

---

### R8. 海床生态模型（岩石 / 珊瑚 / 海草）—— 优先级：中高（对应你反馈的「缺模型占位、色彩单调」）

| 项 | 内容 |
|---|---|
| 用途 | 替换 `Scene.tsx` 里 `BOULDERS` 的 icosahedron 占位；在海床散布珊瑚与海草丛，补足生态感与色彩层次 |
| 规格 | GLB；单件 ≤ 8k 三角、≤ 1 MB；2–3 种岩石 + 2 种珊瑚 + 1 种海草即可；**同一材质最好**（便于合批与实例化） |
| 来源建议 | Quaternius（CC0 水生/岩石包）、Kenney（CC0）、Poly Haven（CC0 模型）；Sketchfab 只筛 CC0 |
| 放哪里 | `public/assets/models/seabed/{rock-01,rock-02,coral-01,coral-02,kelp-01}.glb` |
| 接入点 | 新建 `src/scenes/underwater/components/SeabedProps.tsx`：`useGLTF` 取 scnene → drei `<Instances>` 或手写 `InstancedMesh`；散布位置复用 `src/scenes/underwater/terrain.ts` 的 `sampleHeight/sampleSlope`（陡坡不生成珊瑚） |
| 不导入的替代 | 纯程序化：岩石用 2–3 种变形 icosahedron，珊瑚用「递归分叉圆柱」，海草用交叉面片 + 风动（与自然场景 GrassField 同一套技术） |

### R9. 地表细节贴图（自然场景）—— 优先级：中

| 项 | 内容 |
|---|---|
| 用途 | 当前地形只有顶点色，中近景缺细节；贴图可补草叶、碎石、沙粒的纹理与法线 |
| 规格 | 可无缝平铺；1024² 或 2048²；PNG（颜色 + 法线各一套）：grass / rock / sand |
| 来源建议 | ambientCG（CC0）、Poly Haven（CC0） |
| 放哪里 | `public/assets/textures/terrain-{grass,rock,sand}.png` |
| 接入点 | `src/scenes/nature/terrain.ts` 已输出顶点色；材质上新增 `onBeforeCompile`，按坡度/高度用 `texture2D` 混合三套贴图（三平面映射可避免拉伸） |

### R10. 天空 HDR（自然场景）—— 优先级：低（S1 阴影之后再考虑）

| 项 | 内容 |
|---|---|
| 用途 | 替换 `SkyDome` 的渐变，获得真实云层与大气散射 |
| 规格 | 2K `.hdr` ≤ 3 MB；最理想是三套（清晨/正午/黄昏）与 `timePreset` 对应 |
| 来源建议 | Poly Haven（CC0） |
| 放哪里 | `public/assets/hdr/{dawn,noon,dusk}.hdr` |
| 接入点 | `src/scenes/nature/Scene.tsx` 用 drei `<Environment files=... background />`；保留 `SkyDome` 作为低画质档 fallback（HDR 会增加一次网络请求与显存占用） |

### R11. 城市夜间环境 HDR —— 优先级：低

| 项 | 内容 |
|---|---|
| 用途 | 抬高整体环境光、给湿地面高光提供反射来源 |
| 规格 | 2K `.hdr` ≤ 3 MB（夜景城市类） |
| 来源建议 | Poly Haven「City Night」类（CC0） |
| 放哪里 | `public/assets/hdr/city-night.hdr` |
| 接入点 | `src/scenes/city/Scene.tsx` 加 `<Environment files>`；**注意优先级：先做 S1 Bloom，收益比 HDR 高得多** |

### R12. 车辆模型（城市场景）—— 优先级：低

| 项 | 内容 |
|---|---|
| 用途 | 把 `Traffic.tsx` 的 Box 车身换成可辨识的低模车 |
| 规格 | GLB ≤ 200 KB/辆、≤ 2k 三角；车头朝 **+Z**；1–2 种即可（实例化复用） |
| 来源建议 | Quaternius / Kenney（CC0） |
| 放哪里 | `public/assets/models/car-01.glb` |
| 接入点 | `src/scenes/city/components/Traffic.tsx` 中 bodyMesh 的 geometry 换成 `useGLTF` 的克隆；灯条可保留 |

### R13. 星云贴图（太空场景）—— 优先级：低（可选）

| 项 | 内容 |
|---|---|
| 用途 | 当前星云是 fbm 平面；贴图可带来更真实的絮状结构与色彩 |
| 规格 | 2048² PNG（或 2–3 张 1024² 叠层）；注意来源许可（NASA 图像多为公有领域） |
| 来源建议 | NASA Image Library（公有领域）、ESO（CC-BY） |
| 放哪里 | `public/assets/textures/nebula-01.png` |
| 接入点 | `src/scenes/space/components/Nebula.tsx` 片元里 `fbm()` 换成 `texture2D` 双 UV 视差采样 |

---

## 1.5 模型 vs 程序化：怎么选（回答「海床要不要导入模型」）

先给结论：**推荐「程序化地形 + 实例化模型道具」的混合方案**，而不是整块海床模型。

| 维度 | 程序化地形（现状） | 导入海床/地形模型 |
|---|---|---|
| 下载体积 | 0（只有代码） | 一个海床 GLB 通常 5–30 MB + 4–8 张 2K 贴图 |
| 显存/面数 | 29k–40k 顶点，1 draw call | 50k–300k 三角 + 多材质（多 draw call） |
| 控制力 | 参数直接改高度/河谷/边缘山体 | 改形状要回建模软件 |
| 细节观感 | 中近景偏「平滑」，缺碎石/珊瑚等物件 | 细节丰富，但远看与程序化差距不大 |
| 扩展性 | 换尺寸/风格只改参数 | 换风格要换模型 |
| 性能风险 | 低（可控） | 中高（需要 LOD、贴图流式、合批） |

**判断口诀**：
- **大尺度、连续、要可调** → 程序化（地形、河谷、天际线布局、星场）；
- **小尺度、重复、近景** → 模型 + 实例化（珊瑚、海草、鱼、车、树）；
- 两者都能做时，**优先程序化**：零下载、零许可风险、参数可控。

所以海床的正确升级路径是：地形保持程序化（继续调 `terrain.ts` 的振幅/沟壑/边缘抬升），把预算花在 R8 的「实例化生态道具」上；这既能解决「色彩单调」，又不会引入大文件与 LOD 复杂度。

---

## 2. 导入操作步骤（以 R2 焦散贴图为例）

1. 下载 → 按命名规则改名为 `caustic-01.png`；
2. 放入 `public/assets/textures/`；
3. 在 `docs/ASSET_CREDITS.md` 追加一行（来源 URL + 许可 + 作者）；
4. 在 `docs/effects/underwater.md` 的 S2 章节标记「资源已就绪」；
5. 告诉我「R2 已就绪」，我在 `caustics.ts` 里接上采样并做视觉/性能对比；
6. 若更换贴图：只改 `Scene.tsx` 里传给 `Seabed` 的贴图路径，不动 shader。

> 校验清单：`npm run build` 通过 + 进入水下场景后 F12 Network 里能看到该资源 200 + 帧率无明显下降（用 BACKLOG 里待做的性能指示器或浏览器 FPS 面板观察）。

---

## 3. 资源与性能红线

- 桌面集成显卡目标 **≥ 55 fps**（1080p、dpr≤1.5）；任何单项资源让帧率掉超过 15% 就要重新评估；
- 首屏（首页）不得引入任何 3D 资源——首页只有壳与缩略图；
- 场景资源按场景 `import()` 分包加载，进入场景前显示加载进度（已有 LoadingScreen，后续接真实进度）。
