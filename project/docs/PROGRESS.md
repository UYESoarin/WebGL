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

## 当前可运行状态
- 启动命令：`npm run dev`（开发）、`npm run build`（类型检查 + 构建）
- 构建状态：待验证（首次 `npm install` 后运行 `npm run build`）
- 当前场景：四个占位场景（水下 / 自然 / 城市 / 太空）均可进入、返回、互切
- 已知问题：待首次构建后确认 TS 类型细节（OrbitControls mouseButtons 枚举、bufferAttribute args 等）

## 下一工作日目标
- 进入 Phase 2：优先实现「水下」场景（Boids 鱼群、雾化、光束、焦散），按 `init/instruction/02` 指引
- 完善性能基线测量与场景间切换的显存/对象回收
