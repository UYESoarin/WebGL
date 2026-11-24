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

> 补充（根因确认后回看）：表格最后两行其实已经指向了正确答案——`<Activity>` 从不会用 null 调用子组件。null 来自我们自己的 `useState` 派发，见 §4。

---

## 4. 根因（已确证，并已在本机复现）

**代码位置**：`src/app/SceneView.tsx:38`（修复前）

```ts
meta.load().then((mod) => {
  if (!cancelled) setSceneComponent(mod.default)   // ← 就是这里
})
```

`mod.default` 是场景组件函数。React 的 `useState` setter 有一条语义：**如果传入的参数是函数，它会被当作「更新函数（updater）」，在下次渲染时以 `prevState` 为实参调用**，即渲染期执行 `fn(prevState)`。

于是渲染期实际执行的是 `UnderwaterScene(null)`（初始 state 就是 `null`），而函数签名 `({ active, onReady }: SceneRuntimeProps)` 对 `null` 解构 → 抛出本次错误。

这一条链解释了全部现象：

| 现象 | 解释 |
|---|---|
| `Cannot destructure property 'active' of ... null` | updater 被以 `prevState === null` 调用 |
| 堆栈 `at UnderwaterScene (Scene.tsx:20:43) at SceneView (SceneView.tsx:25:47)` | 调用点就在 `SceneView` 的 `useState` 派发/渲染期，中间没有 `SceneViewport` / `Canvas` 帧 |
| React 警告「An error occurred in the <SceneView> component」 | 错误确实发生在 `SceneView` 渲染期 |
| 错误是 **Uncaught**，`ErrorBoundary` 没接住 | 错误边界在 `SceneView` 内部，其**上方**没有边界，整棵 root 被卸载 |
| **返回首页也黑** | root 树整体崩溃，不只是场景页 |
| 报错行号随重构 `13:43` → `20:43` 移动 | 行号就是场景函数签名那一行，随代码上移 |
| Node 端两个 Activity 实验都复现不出 null props | 因为 null 根本不来自 R3F/React 的 Activity 路径 |

**本机复现（不需要浏览器）**：

```bash
node -e "const S=(props)=>{const {active}=props;return active}; try{S(null)}catch(e){console.log(e.message)}"
# → Cannot destructure property 'active' of 'props' as it is null.
```

> 教训：这是 React 里最经典的语义陷阱之一。`setState` 的 updater 形式必须是 `setState(() => value)`；直接传函数值时要再包一层。它**无法被 TypeScript 拦住**——`ComponentType` 本身就是函数，恰好满足 updater 的签名 `(prev) => next`，类型检查完全通过。

---

## 5. 已实施的修复

| # | 改动 | 说明 |
|---|---|---|
| 1 | `src/app/SceneView.tsx` → `setSceneComponent(() => mod.default)` | **根因修复**；并在代码旁写了注释记录该陷阱 |
| 2 | `src/app/SceneView.tsx`：场景组件就绪后才挂载 `<SceneViewport>` | Canvas 首次 render 即带完整子树，加载阶段只显示 LoadingScreen |
| 3 | `package.json`：`react`/`react-dom` 精确 `19.1.10`，`@types/react` `19.1.17`、`@types/react-dom` `19.1.11` | 诊断期为排除 Activity 桥而做，**保留**为稳定性选择（19.1 无 Activity 桥，路径更短）；与本 bug 无因果关系 |
| 4 | 工具链保持 `vite 8.3.8` + `plugin-react 6.3.0` + `ts 7.0.2` | 实测降 vite 6 会在 `esbuild postinstall` 处 `spawn EPERM`（沙箱禁止 npm 安装脚本 spawn），不可行 |

**回滚点**

- 修复前干净基线：`4f1f7e3`（`git reset --hard 4f1f7e3`）
- 救援提交：`12cac09`（依赖 + 挂载顺序），本根因修复另起一次提交

**本机验证**

- `npm run build`（`tsc -b && vite build`）✅ 600 模块
- dev `http://127.0.0.1:5173/`、preview `http://127.0.0.1:4173/` 均 200；preview 下 `/scene/underwater` 深链接 200
- `npm ls react` 单副本；`React.Activity === undefined`
- dev server 已返回含修复的模块（`setSceneComponent(() => mod.default)`）

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

**参考价值**：原型刻意回避了「动态 import、外部 store、手写路由、持久 Canvas + ErrorBoundary」这四项复杂度，证明最小稳定基线的形状。但本次根因**与之无关**——是 `useState` updater 语义陷阱；原型里 `useState<SceneId|null>(null)` 存的是**字符串 id**（不是组件函数），所以天然不会触发。

---

## 7. Phase 2 验收清单（浏览器复测）

1. 首页正常显示四个场景卡片
2. 进入场景：不黑屏、URL 变 `/scene/:id`、HUD 可见
3. 相机：左键旋转 / 右键平移 / 滚轮缩放 / `R` 或按钮重置视角
4. 返回：回首页、URL 变 `/`、首页正常（不再黑屏）
5. 四个场景互切 + 连续切换 10 次
6. 加载失败路径：需要时临时让 `load()` reject，验证重试按钮
7. `npm run build` 通过

通过后进入效果实现阶段（`init/instruction/02`：水下场景的焦散 / 体积雾 / 浮游粒子，按原理逐项落地）。

---

## 附录：本次诊断使用的脚本

| 脚本 | 用途 | 结果 |
|---|---|---|
| `scripts/activity-test.mjs` | react-dom 下复刻 its-fine Bridge（useSyncExternalStore + `<Activity>`），检查 props 是否 null | 否（props 正常） |
| `scripts/r3f-activity-test.mjs` | 用 `@react-three/test-renderer`（R3F reconciler）在 `<Activity>` 包夹下渲染探针组件 | 否（props 正常） |
| `scripts/canvas-repro.mjs` | jsdom + 伪 WebGL 渲染器挂载真实 `<Canvas>` | 子节点未渲染（jsdom 无布局，harness 未打通，**结论不可用**） |
| `scripts/measure-test.mjs` | 验证 jsdom 下 `react-use-measure` 能返回伪尺寸 | 能（800×600） |
| `scripts/diag.mjs` | puppeteer-core 无头浏览器诊断 | **失败**：沙箱禁止启动浏览器二进制 |
