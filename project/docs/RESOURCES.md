# 资源获取与导入清单（用户执行）

> 分工约定：**资源获取、导入、许可登记由你执行**；我负责给出「要什么、放哪里、接到哪行代码、什么规格不会拖慢项目」。所有资源入库前必须在 `docs/ASSET_CREDITS.md` 登记来源与许可（这是 `init/` 里定下的硬约束）。
>
> **当前水下地基不需要任何外部资源**——全部程序化生成。下表是「深化到下一阶段时才需要」的可选项，你可以按兴趣与时间逐项采购。

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
