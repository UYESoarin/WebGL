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

## 当前可运行状态
- 启动命令：`npm run dev`（开发）、`npm run build`（类型检查 + 构建）、`npm run preview`（生产包）
- 构建状态：通过（`tsc -b && vite build`，600 模块，主 chunk 1.13 MB / gzip 312 kB，有体积警告 → BACKLOG B3）
- 当前场景：四个占位场景（水下 / 自然 / 城市 / 太空）均可进入、返回、互切；URL 变为 `/scene/:id`，返回恢复 `/`
- 相机：左键旋转 / 中键或右键平移 / 滚轮缩放 / `R` 或按钮重置
- 已知问题：① `THREE.Clock` deprecation 警告来自 `@react-three/fiber` 内部（上游，见 BACKLOG B1）；② UI/UX 与性能指示器待做（BACKLOG A）

## 下一工作日目标
- 进入 Phase 2：优先实现「水下」场景，按 `init/instruction/02` 逐项落地原理（焦散 / 体积雾 / 浮游粒子 / 光束），替换现有占位几何
- 每个效果都要有：原理说明（公式/近似）、可调参数、性能预算与降级开关
- 完善性能基线测量与场景间切换的显存/对象回收
