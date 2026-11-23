# 07｜软件工程规范与 Agent 协作

> 本文与 `plan.md` 第 17–21 节配套。总体需求和接口冲突时，以 `plan.md` 为准。

## 学习目标
- 理解如何把 VIEW 拆成 UI、应用流程、公共 3D Engine、场景模块和资源层。
- 能判断何时抽象公共模块、何时保留场景局部实现。
- 能给 Agent 分配边界清晰、可验收的任务。

## 一、建议的依赖结构

```text
UI Components ──> App / Scene Controller ──> Scene Registry
                                              │
                                              ▼
                                     Scene Runtime Contract
                                              │
                      ┌───────────────────────┼──────────────────────┐
                      ▼                       ▼                      ▼
                 Underwater                Nature                  City/Space
                      │                       │                      │
                      └──────────────> Engine Public APIs <──────────┘
                                              │
                              Three.js / R3F / Drei / Loaders
```

依赖只向公共契约和基础设施汇聚。场景之间不互相 import；Engine 不依赖 React 页面或具体场景。

## 二、适度模块化判断

满足以下任意两项时，考虑抽为公共模块：重复出现、语义稳定、需要独立测试、存在明确生命周期、被多个场景使用。否则先留在场景内部。不要创建只有一个调用点、没有独立语义的 wrapper。

## 三、一个场景的推荐组织

```text
scenes/underwater/
├── index.ts             # 对外唯一出口
├── UnderwaterScene.tsx  # 场景组合根
├── config.ts            # 相机、默认质量、空间参数
├── params.ts            # 参数类型、默认值、schema
├── components/          # Terrain、FishSchool、Caustics 等
├── hooks/               # 场景专属生命周期/动画 hook
└── algorithms/          # Boids、空间分桶等纯逻辑
```

## 四、渲染性能编码习惯

- 在组件外或 `useMemo` 中创建稳定几何/材质；不要在每帧创建对象。
- 高频更新用 `useFrame` 修改 ref、instanceMatrix、BufferAttribute 或 Shader uniform。
- 只有低频、会影响 UI 的状态才进入 React/Zustand。
- InstancedMesh 适用于同几何/材质的重复对象，不自动解决骨骼动画。
- Points 适合轻量粒子；透明粒子仍可能产生 overdraw。
- 使用 LOD 前准备真实的多级模型；不要只为 API 使用而增加无意义层级。
- 先测量再优化，记录同设备、同视口、同画质下的数据。

## 五、资源所有权清单

| 资源 | 所有者 | 释放规则 |
|---|---|---|
| 场景独占 Geometry/Material | 场景 | 场景卸载时释放 |
| `useGLTF`/缓存共享资源 | 资源缓存层 | 按缓存策略统一管理，场景不得随意 dispose |
| 事件监听/订阅 | 注册它的组件或控制器 | cleanup 中注销 |
| 自建 RAF/计时器 | 创建者 | cleanup 中 cancel/clear |
| 后处理 Pass | 渲染管线/场景配置 | 禁用/卸载时按 owner 清理 |

不要通过遍历整个 scene 并无条件 dispose 所有资源来“清理内存”。

## 六、Agent 任务卡模板

```md
# Task: [TASK-ID] 标题
## 目标
## 对应需求 ID
## 前置依赖/已冻结接口
## 允许修改目录
## 禁止修改目录
## 输入与输出
## 验收步骤
## 必须运行的命令
## 交付报告
```

## 七、Agent 交付报告模板

```md
## 完成内容
## 对应需求/任务 ID
## 修改文件清单
## 关键设计与取舍
## 实际执行命令及结果
## 人工验收步骤/截图位置
## 遗留问题与风险
## 下一步建议
```

## 八、Code Review 检查表

- [ ] 是否违反依赖方向或产生循环依赖？
- [ ] 是否把场景特有逻辑错误抽到公共层？
- [ ] 是否存在 `any`、无意义断言或巨型组件？
- [ ] `useFrame` 是否触发 React 高频更新或每帧分配对象？
- [ ] 事件、订阅、控制器和 GPU 资源是否有明确 owner？
- [ ] 是否错误释放共享缓存资源？
- [ ] 加载失败、重复点击、卸载中异步回调是否安全？
- [ ] 是否运行 build/typecheck/test 并如实报告？
- [ ] 文档、资源许可和进度记录是否同步？

## 九、学习练习

1. 为一个场景写出依赖图，标注哪些模块可被其他场景复用。
2. 找出一个 `useFrame` 中的 React state 更新，将它改为 ref/uniform 更新。
3. 写一个纯函数测试（例如 Boids 的 separation steering），不依赖 React/Three.js 场景。
4. 模拟两个 Agent 同时需要修改公共类型，写一份简短 RFC 而不是直接覆盖。

完成标准：能解释模块边界、资源所有权、每帧更新路径和 Agent 任务边界。
