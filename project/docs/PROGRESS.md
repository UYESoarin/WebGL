# VIEW 开发进度

> 说明：任务 ID 对应 `init/plan.md` 的阶段划分与 `init/instruction/` 的工作指引。

| 日期 | 任务 ID | 计划 | 实际完成 | 状态 | 阻塞/风险 |
|---|---|---|---|---|---|
| 2026-11-24 | P1-00 | 工程初始化：React+TS+Vite+Three+R3F 骨架 | 脚手架、目录、核心类型、场景接口 | Done | 无 |
| 2026-11-24 | P1-01 | 首页骨架 | Navbar / Hero / SceneSelector / About / Footer | Done | 无 |
| 2026-11-24 | P1-02 | 共享 Canvas + 场景注册 | SceneViewport 唯一 Canvas + sceneRegistry 四场景 | Done | 无 |
| 2026-11-24 | P1-03 | 四个占位场景 | underwater/nature/city/space 占位几何 | Done | 无 |
| 2026-11-24 | P1-04 | 场景进入/退出状态流 | Zustand 状态机 + 动态 import + loading/error | Done | 无 |
| 2026-11-24 | P1-05 | 相机控制 | OrbitControls + resetCamera + R 键 + 右键平移 | Done | 无 |
| 2026-11-24 | P1-06 | URL 路由 + 运行时错误覆盖层 | `useSceneRouter`（pushState/popstate/深链接）+ `RuntimeErrorOverlay` | Done | 无 |
| 2026-11-24 | P1-07 | 黑屏事故定位与修复 | 根因：`setSceneComponent(mod.default)` 被 React 当作 updater 以 `null` 调用；改函数式写法 | Done | `b1318ab`，详见 `BLACK_SCREEN_REPORT.md` |
| 2026-11-24 | P1-08 | 访问告警清理 | `/favicon.ico` 404 → 新增 svg + 多尺寸 ico；`THREE.Clock` 警告记为上游项 | Done | 见 `docs/BACKLOG.md` B1/B2 |
| 2026-11-24 | P2-01 | 水下场景「地基」 | fBm 海床 + 焦散材质补丁 + 丁达尔光束 + 悬浮颗粒 + InstancedMesh 鱼群 + 9 项可调参数（`D` 面板） | Done | 深化 S1–S4 见 `docs/effects/underwater.md` |
| 2026-11-24 | P2-02 | 自然场景「地基」 | fBm+山脊地形 + 顶点色地表混合 + 天空穹顶 + 实例化树/草 + 高度加权风动 + 三套时间预设 + 5 参数 | Done | 深化 S1–S4 见 `docs/effects/nature.md` |
| 2026-11-24 | P2-03 | 城市场景「地基」 | 程序化街区布局 + 单 InstancedMesh 建筑 + 片元窗户 + 自发光道路 + 曲线交通 + 夜雨 + 4 参数 | Done | 深化 S1–S4 见 `docs/effects/city.md` |
| 2026-11-24 | P2-04 | 太空场景「地基」 | 三层星场 + 噪声星云 + 极坐标吸积盘 + 黑洞核心 + 4 参数 | Done | 深化 S1–S4 见 `docs/effects/space.md` |
| 2026-11-24 | P2-05 | 水下观感回调 | 焦散默认值下调（scale 0.5→0.32、intensity 0.9→0.8）；噪声 shader 上提为 `src/engine/shaders/noise.ts` 共享 | Done | 用户反馈「焦散密度偏高」 |

## 当前可运行状态
- 启动命令：`npm run dev`（开发）、`npm run build`（类型检查 + 构建）、`npm run preview`（生产包）
- 构建状态：通过（`tsc -b && vite build`，621 模块，主 chunk 1.14 MB / gzip 314 kB，有体积警告 → BACKLOG B3；四个场景各自分包 5.8–9.0 kB）
- 当前场景：四个占位场景（水下 / 自然 / 城市 / 太空）均可进入、返回、互切；URL 变为 `/scene/:id`，返回恢复 `/`
- 相机：左键旋转 / 中键或右键平移 / 滚轮缩放 / `R` 或按钮重置
- 参数面板：场景页按 `D` 或点「参数」打开，9 项参数实时生效（`SceneConfig.params` → zustand → 场景组件）
- 四个场景均为**程序化场景**（无外部资源依赖）：
  - 水下：海床/焦散/光束/颗粒/鱼群
  - 自然：地形/天空/树/草/风动（三套时间预设）
  - 城市：建筑/窗户/道路/交通/雨雾
  - 太空：星场/星云/吸积盘/黑洞
- 已知问题：① `THREE.Clock` deprecation 警告来自 `@react-three/fiber` 内部（上游，见 BACKLOG B1）；② UI/UX 与性能指示器待做（BACKLOG A）；③ 光束平面近似在侧视角可见薄片（见水下文档 S3）

## 下一工作日目标
- 等待用户对四个场景的视觉反馈，按反馈决定优先深化项（候选：水下 S1 Boids、城市 S1 Bloom、自然 S1 阴影、太空 S1 引力透镜）
- 若用户已备好资源（`docs/RESOURCES.md` R1/R8）：接模型化鱼群 / 海床生态道具
- 建立性能基线：进入场景后 5s 的平均 FPS、首帧耗时（BACKLOG C）
- UI/UX 统一优化（BACKLOG A，用户已明确后续再优化）
