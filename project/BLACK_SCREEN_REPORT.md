# VIEW 黑屏问题诊断报告（BLACK_SCREEN_REPORT）

> 阶段：Phase 1 — 仅诊断，**未修改任何项目源码**
> 日期：2026-11-24
> 结论先行：**这不是"黑屏效果没做出来"，而是运行时异常**——R3F 的 Three.js 根渲染器以 `props === null` 调用了场景函数组件，整棵 React 树随之崩溃，因此进入场景页全黑、返回后首页也黑。构建、模块加载、网络请求全部正常。

---

## 0. 环境与仓库状态

| 项 | 值 |
|---|---|
| 工作目录 | `D:\WebGL\project` |
| Node / npm | v26.13.0 / 11.20.0（pnpm 未安装） |
| 分支 / 基线提交 | `master` / `4f1f7e3 WebGL 项目初始化` |
| Git 状态 | 上一次干净提交之后：`init/`、`src/`、`package.json` 等全部为未跟踪（`??`）；旧目录 `VIEW_场景实时渲染实践_设计与说明/` 为已删除未提交（`D`） |
| dev server | `http://127.0.0.1:5173`，后台 job `bash-7a83738165834e81`（运行中） |
| 构建 | `npm run build`（`tsc -b && vite build`）✅ 通过，1.19s |

> 说明：本会话沙箱（workspace-write）**禁止启动任何浏览器二进制**（Chrome/Edge 直接 spawn 报 `EPERM`/`UNKNOWN -4094`，经 `cmd.exe` 包装报 `The network path was not found.`）。因此浏览器 Console 证据取自你提供的两张截图，其余验证用 Node 端复现与 HTTP 探测完成。

---

## 1. 复现与真实错误（证据）

### 1.1 浏览器 Console 第一条错误（逐字摘录，来自用户截图）

第一次（重构前）：

```
Uncaught TypeError: Cannot destructure property 'active' of 'object null' as it is null.
    at UnderwaterScene (Scene.tsx:13:43)
    at SceneView (SceneView.tsx:25:47)
```

第二次（把 `<color>/<fog>` 改为 `useSceneEnvironment` 重构后）：

```
Uncaught TypeError: Cannot destructure property 'active' of 'object null' as it is null.
    at UnderwaterScene (Scene.tsx:20:43)
    at SceneView (SceneView.tsx:25:47)
```

伴随 React 默认警告：

```
An error occurred in the <SceneView> component.
Consider adding an error boundary to your tree to customize error handling behavior.
```

**关键判读**：行号从 `13:43` 变成 `20:43`，正好跟着函数签名行一起移动 —— 这不是 HMR/浏览器缓存的陈旧堆栈，而是每次都会发生的真实崩溃。

### 1.2 定位到具体字符

`src/scenes/underwater/Scene.tsx:20`：

```
20 | export default function UnderwaterScene({ active, onReady }: SceneRuntimeProps) {
```

第 20 行第 43 列正好是 `{ active, ... }` 里 `active` 的起始位置。V8 报 `of 'object null'` 说明 `typeof props === 'object'` 且 `props === null`：**React（R3F 根渲染器）以 `null` 作为参数调用了 `UnderwaterScene`**，而 React 的公开契约是函数组件永远收到对象形式的 props。

### 1.3 终端 / 构建 / 网络

- 终端：`npm run build` 通过，无 TS 报错；dev server 无编译错误。
- 网络：逐条探测 dev server 模块，**全部 200**，不存在失败请求：

  | 请求 | 状态 |
  |---|---|
  | `/` | 200 |
  | `/src/main.tsx` | 200 |
  | `/src/app/App.tsx` | 200 |
  | `/src/app/SceneView.tsx` | 200 |
  | `/src/engine/SceneViewport.tsx` | 200 |
  | `/src/scenes/underwater/index.ts` | 200 |
  | `/src/scenes/underwater/Scene.tsx` | 200 |

  且 `SceneView` 对 `meta.load()` 有 `.catch(failScene)`：若动态 import 失败，会进入 `ErrorScreen` 而不是抛未捕获异常。**所以这不是资源/模块加载失败，是渲染期异常。**

---

## 2. 代码与配置审查结果

| 检查项 | 结论 | 证据 |
|---|---|---|
| React 入口 `src/main.tsx` | 正常（无 StrictMode，`createRoot(...).render(<App/>)`） | 已逐行核对 |
| 路由 `src/app/useSceneRouter.ts` | 正常（挂载深链接 / store→pushState / popstate 反向驱动） | 已逐行核对 |
| Canvas 尺寸 | 合理：`.scene-view{position:fixed;inset:0}` → `.scene-canvas{position:absolute;inset:0}`；`SceneViewport` 内 `<Canvas className="scene-canvas">` | `src/styles/global.css`、`SceneViewport.tsx` |
| 共享 Canvas | 唯一，仅 `SceneViewport` 内出现一次 `<Canvas>` | 全仓搜索确认 |
| WebGL 初始化 | `gl={{antialias:true,powerPreference:'high-performance'}}`、`dpr={[1,2]}`，无法从本环境观测 `onCreated` 是否触发 | 需浏览器复测 |
| R3F / Three 版本兼容 | peer 全部满足：fiber 9.8.2 需 `react>=19 <19.4`、`three>=0.156`；drei 10.7.9 需 `fiber^9`、`three>=0.159`；实际 react 19.3.1 / three 0.187.0 | `package-lock.json` |
| 重复 React 实例 | 无。`npm ls` 只有一份 `react@19.3.1` / `react-dom@19.3.1`（drei 内嵌 `zustand@4.5.7` 仅 tunnel-rat 用） | `npm ls react react-dom` |
| 动态 import | 正常：`scenes/*/index.ts` 为 `export { default } from './Scene'`；`SceneView` 用 `useState<ComponentType<SceneRuntimeProps>\|null>` + `useEffect` + `.then(mod => setSceneComponent(mod.default))` | 已核对 + 编译产物核对 |
| 场景组件内部 | 正确：`useSceneEnvironment(ENV)` 用 `useThree(s=>s.scene)` 设 background/fog；`useFrame` 有 `if(!active||!bubblesRef.current)return`；单一 `<group>` 根节点；几何/材质/灯光均标准 | `src/scenes/underwater/Scene.tsx` 全文 |
| 相机控制 | 正确：`<Canvas camera={VIEWPORT_CAMERA}>` 用模块常量避免响应式重置；`CameraController` 在 `useEffect` 设 `camera.position` + `controls.target`；drei `OrbitControls` + `useFrame` 逐帧 `update()` | `SceneViewport.tsx`、`CameraController.tsx` |
| 全项目是否有人直接调用场景组件 | **没有**。不存在 `UnderwaterScene()` 这类直接调用 | 全仓检索 |
| 构建 | 通过 | `npm run build` ✅ |

### 已确认修复过的相邻问题（不是本次黑屏根因）

`<color attach="background">` / `<fog attach="fog">` 原先嵌在外层 `<group>` 内，R3F 的 `attach` 会把属性写到 `group.background` / `group.fog` 而不是 `scene`（已从 fiber 源码 `resolve()` + `attach()` 证实）。该项只影响「背景色与雾不生效」，**不会产生异常、也不会让几何体消失**，已在重构中改成 `useSceneEnvironment`。保留此结论是为了避免重复踩坑：任何 `attach` 类属性都必须位于会 attach 到 `scene` 的层级。

---

## 3. 已排除的假设

| 假设 | 排除证据 |
|---|---|
| 场景源码/JSX 写错 | 四个场景 + 引擎 + app 层逐行核对；dev server 编译产物核对；无直接调用组件代码 |
| 重复 React 副本（版本不一致） | `npm ls` 仅一份 react/react-dom |
| 动态 import 失败 | 模块 HTTP 200；失败会走 `failScene` → `ErrorScreen`，不会未捕获崩溃 |
| 构建期问题 | `tsc -b && vite build` 通过 |
| HMR 陈旧 / 浏览器缓存 | 两次报错行号随源码重构移动（`13:43` → `20:43`） |
| 相机 `position` 造成响应式重置 | `<Canvas camera>` 用模块常量，不含 `position` |
| `<Activity>` 桥在 **react-dom 渲染器**下传 null props | Node 端 jsdom 实验：`<Activity mode="hidden">` + 子组件，所有阶段 props 均为普通对象，从未 null |
| `<Activity>` 桥在 **R3F test-renderer** 下传 null props | 用 `@react-three/test-renderer` 渲染 `<Activity mode="hidden"><Probe active/></Activity>`，props 从未 null |

> 注意最后两条：两个实验都**没能复现**，但它们都没有覆盖「真实浏览器 + 真实 `<Canvas>` + 真实 WebGL 上下文」这条路径，所以**还不能据此否定 Activity 假设**。

---

## 4. 可能根因（按可能性排序）

### H1（中高）React 19.3.1 的 `<Activity>` 与 R3F 自带 reconciler 的交互

- R3F **9.8.1 起**，`<Canvas>` 用 `useBridge()` 把子节点包进 its-fine 2.1.1 的 `<Activity mode="hidden"→"visible">` 桥；**该桥只在 React ≥ 19.2 才启用**，19.0/19.1 会退化成 `React.Fragment`。
- R3F 9.8.1 CHANGELOG 原文：*"Update its-fine to 2.1.1 and bridge ancestor Activity visibility into the Canvas scene on **React 19.2 and later** … fall back to their previous behavior on React 19.0 and 19.1."*
- 我们的组合正好落在「新路径」上：`react@19.3.1` + `fiber@9.8.2` + `its-fine@2.1.1`。
- React 的 hidden Activity 走「prerender / offscreen」渲染路径，而 R3F 用的是**自定义 reconciler**：React 只对 DOM renderer 承诺完整语义，跨 renderer 组合存在已知空白区（上游 issue [#3939](https://github.com/pmndrs/react-three-fiber/issues/3939)、PR [#3943](https://github.com/pmndrs/react-three-fiber/pull/3943) 都在修 Activity 相关崩溃）。
- **判别实验（不改业务代码）**：`react`/`react-dom` 降到 `19.1.10`（`React.Activity` 不存在 → 桥退化为 Fragment）。若错误消失即证实。

### H2（中）极新的 dev 工具链（Vite 8.3.8 + plugin-react 6.3.0 + TS 7.0.2）

- 参考原型（你提供的压缩包）用的是 `vite ^6.0.7` + `@vitejs/plugin-react ^4.3.4` + `typescript ~5.7.2`，而本仓库是 `vite 8.3.8` + `plugin-react 6.3.0` + `typescript 7.0.2`。
- dev 模式下 react-refresh 会给组件包一层注册/重渲染逻辑；与 R3F 自定义 reconciler 组合在极新版本上未必经过充分验证。
- **判别实验（0 改动）**：`npm run build && npm run preview`，在**生产包**（无 HMR / 无 Fast Refresh）下复现一次。若 preview 正常 → 问题在 dev 层；若同样崩溃 → 问题在运行时层。

### H3（低）Canvas root 生命周期 / 上下文丢失

- 现象里的「返回后首页也黑」符合 WebGL 上下文被销毁或 React 树整体崩溃的特征；上游 #3939 描述过「hidden Activity 会销毁 Canvas root，之后 render() 无效」。
- 但这更解释「黑」，不解释「null props」，所以列在 H1/H2 之后。

---

## 5. 最小修复方案（Phase 2，一次只动一处，每步留 commit）

> 原则：先加证据，再改代码；每次只改一个变量；不吞异常、不用黑背景遮错。

**Step 0 — 建立可回滚基线（0 改动）**
```bash
git add -A && git commit -m "checkpoint: phase1 诊断基线（黑屏未修）"
```
回滚点：`git reset --hard 4f1f7e3`（本次会话之前最后一次干净提交）。

**Step 1 — 二分 dev-only vs runtime（0 代码改动）**
```bash
npm run build && npm run preview
```
在 preview 里复现一次，记录是否仍报 `Cannot destructure property 'active'`。

**Step 2 — 若 preview 也崩：降 React（一条命令级改动）**
```bash
npm i react@19.1.10 react-dom@19.1.10 --cache ./.npm-cache
npm i -D @types/react@19.1.17 @types/react-dom@19.1.11 --cache ./.npm-cache
npm run build && npm run preview
```
判定：错误消失 → H1 成立；仍崩溃 → 继续 Step 3。

**Step 3 — 若 preview 正常（dev-only）：换 dev 工具链**
- 先 `vite.config.ts` 里 `react({ fastRefresh: false })` 验证一次；
- 确认后改 `@vitejs/plugin-react-swc`，或把 `vite` 降到 `^6` / `plugin-react` 降到 `^4`（与参考原型对齐）。

**Step 4 — 稳定后先只画一个 Box（保留同一 Canvas）**
`SceneViewport` 内临时直出 `<mesh><boxGeometry/><meshStandardMaterial/></mesh>` + 环境光 + 背景色，验证：进入、显示、Orbit 相机、返回、再次进入。

**Step 5 — 恢复四个场景的基础几何体**（仍不引入任何 Shader / 后处理 / 外部模型）。
**Step 6 — 加载失败提示 + 重试入口**（临时让 `load()` reject 验证一次，然后恢复）。
**Step 7 — 连续切换 10 次 + `npm run build` + 记录 TEST_REPORT。**

---

## 6. 与参考原型（SPECTRA）的差异对照

| 项 | 参考原型（可跑通） | 当前 VIEW |
|---|---|---|
| react / fiber / drei | `^19.0.0` / `^9.1.2` / `^10.0.7` | `19.3.1` / `9.8.2` / `10.7.9` |
| vite / plugin-react / ts | `^6.0.7` / `^4.3.4` / `~5.7.2` | `8.3.8` / `6.3.0` / `7.0.2` |
| Canvas | 每个场景一个 `<Canvas key={active}>`（进入即全新挂载） | **单个持久 Canvas**，只换子组件 |
| Suspense | `<Canvas>` 内部包 `<Suspense fallback={<Html…>}>` | 无（靠 `status==='loading'` 覆盖层） |
| 场景加载 | 全部静态 import | **动态 import** |
| 状态 | `App` 内 `useState` | **zustand + 手写路由** |
| 错误处理 | 无 ErrorBoundary（崩了就是白/黑） | ErrorBoundary + ErrorScreen + 运行时覆盖层 |
| 相机 | `<Canvas camera={{position,fov}}>` 内联对象 + `OrbitControls makeDefault` | 模块常量相机 + 自建 `CameraController` |

**参考价值**：原型刻意回避了「动态 import、外部 store、手写路由、持久 Canvas + ErrorBoundary」这四项复杂度。它证明**最小稳定基线**的形状；我们引入的四项里，至少「动态 import + 持久 Canvas」是本次崩溃的可疑源头（场景组件是异步出现的新元素类型，由 R3F root 二次 `render()` 挂载）。

---

## 7. 需要你确认的事项（Phase 2 前）

1. **是否允许 `npm run preview` 复现**（0 代码改动，只是换运行方式）？
2. **是否允许降级 `react`/`react-dom` 到 19.1.10**（若 Step 2 判定为 H1）？
3. **是否允许把 `vite 8` / `plugin-react 6` 对齐到参考原型的 `vite 6` / `plugin-react 4`**（若 Step 3 判定为 dev-only）？
4. **诊断期新增物**：`scripts/*.mjs`（6 个诊断脚本）、devDependencies（`jsdom`、`@react-three/test-renderer`、`puppeteer-core`）、`.tmp-ref/`（你给的参考代码解压副本）。这些**都不是产品代码**，你同意后我会在 Step 0 之前清理/或保留并 gitignore。

---

## 附录：本次诊断使用的脚本

| 脚本 | 用途 | 结果 |
|---|---|---|
| `scripts/activity-test.mjs` | react-dom 下复刻 its-fine Bridge（useSyncExternalStore + `<Activity>`），检查 props 是否 null | 否（props 正常） |
| `scripts/r3f-activity-test.mjs` | 用 `@react-three/test-renderer`（R3F reconciler）在 `<Activity>` 包夹下渲染探针组件 | 否（props 正常） |
| `scripts/canvas-repro.mjs` | jsdom + 伪 WebGL 渲染器挂载真实 `<Canvas>` | 子节点未渲染（jsdom 无布局，harness 未打通，**结论不可用**） |
| `scripts/measure-test.mjs` | 验证 jsdom 下 `react-use-measure` 能返回伪尺寸 | 能（800×600） |
| `scripts/diag.mjs` | puppeteer-core 无头浏览器诊断 | **失败**：沙箱禁止启动浏览器二进制 |
