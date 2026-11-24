# VIEW 待办与已知问题

> 用途：集中记录「不影响功能正确性、但需要排期处理」的事项。规则：**任何一条被处理时，都要在 `docs/PROGRESS.md` 里有对应记录**；修 bug 不允许改这里来"消失"，只能标记 Done 并写明提交。

---

## A. UI / UX 优化（用户已明确要求，排期后置）

### A1. 主页面
- [ ] 字体：统一引入至少 1 套西文 + 1 套中文无衬线字体（当前用系统栈），标题与正文建立明确字号阶梯
- [ ] Hero 区：增加轻量动态元素（如缓慢漂浮的粒子/渐变光斑，纯 CSS 即可），避免大面积纯色
- [ ] 场景卡片：hover/active 反馈细化（抬升、光晕、边框高亮、缩略图轻微缩放），四场景色板统一为 design token
- [ ] 布局与留白：统一间距刻度（4/8/12/16/24/32/48），限制正文最大宽度，移动端栅格重排
- [ ] 文案：每张卡片补充一句"这个场景演示什么原理"，为后续讲解页做铺垫

### A2. 场景页 HUD
- [ ] HUD 视觉重做：半透明玻璃面板、分组、图标；当前为纯文字按钮
- [x] 场景参数面板（`SceneConfig.params` → zustand → HUD `D` 键面板）✅ 已接入（样式仍可优化，见 BACKLOG A2）
- [ ] 帧率 / drawcall / 三角形数 的实时性能指示器（`debugEnabled` 已预留）
- [ ] 加载体验：骨架屏 + 阶段提示（当前只有 spinner）
- [ ] 快捷键说明的弹出层（当前常驻在角落）

### A3. 交互反馈
- [ ] 页面/场景切换过渡（淡入淡出、遮罩擦除），需与状态机的 `entering`/`disposing` 两个状态配套启用
- [ ] 按钮的 disabled / loading 态
- [ ] 移动端触摸手势说明与适配

---

## B. 已知警告与技术债

### B1. `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`（⚠️ 上游，暂不处理）
- **来源**：`@react-three/fiber@9.8.2` 内部 `node_modules/@react-three/fiber/dist/events-e51d7528.esm.js:1207` → `clock: new THREE.Clock()`；three r187 起 `Clock` 标记为 deprecated 并建议改用 `Timer`。**不是我们的代码**。
- **影响**：仅一条启动期 console 警告，不影响渲染与性能。
- **处理原则**：不做 `console.warn` 过滤（本项目约定「不吞异常/警告」，避免掩盖真问题）。等待 fiber 上游改用 `THREE.Timer` 后升级即可。
- **备选（不推荐）**：把 `three` 降到 `0.186.x` 可消除该警告，但会牺牲 r187 的渲染改进，且升级时又会回来。

### B2. `/favicon.ico` 404（✅ 已修）
- 已在 `public/` 提供 `favicon.svg` + 多尺寸 `favicon.ico`（16/24/32/48/64，Pillow 生成），并在 `index.html` 声明 `<link rel="icon">`。
- 结论：这属于**资源级 404，不是应用错误**；之前直接访问 `/scene/:id` 时看到的"报错"就是它。

### B3. 主 chunk 体积（1.13 MB / gzip 312 kB）
- 现状：`three` + `fiber` + `drei` 全在主 chunk，构建有 >500 kB 警告。
- 计划：`manualChunks`/`codeSplitting` 把 `three` 与 `react` 拆成独立 vendor chunk（首屏只加载壳），并在场景页 `import()` 时预取。

### B4. React 版本锁定
- `react`/`react-dom` 精确锁定 `19.1.10`（`@types/react` 19.1.17）。原因见 `BLACK_SCREEN_REPORT.md`：诊断期用于排除 R3F 的 `<Activity>` 桥（React ≥19.2 才启用）。
- 该桥与本项目已修复的黑屏 bug **无因果关系**；若后续需要升级到 19.3，可自由升级，只需回归四个场景 + 相机 + 返回。

### B5. dev 工具链与参考原型不同
- 本项目：`vite 8.3.8` / `@vitejs/plugin-react 6.3.0` / `typescript 7.0.2`；参考原型：`vite ^6` / `plugin-react ^4` / `ts ~5.7`。
- 原因：vite 6 依赖的 `esbuild` 需要 postinstall 脚本，而本机沙箱禁止 npm 安装脚本 `spawn`（`EPERM`），装不上。**不要为此改回 vite 6**。

---

## C. 部署与工程
- [ ] SPA 深链接：`/scene/:id` 依赖服务器 fallback 到 `index.html`。`vite preview` 与 dev server 已内置；若部署到静态托管（GitHub Pages / nginx），需配置 `try_files $uri /index.html`。
- [ ] 增加 `docs/TEST_REPORT.md`（`init/docs/TEST_REPORT_TEMPLATE.md` 结构）并在每次验收时填写。
- [ ] 增加性能基线：进入场景后 5s 的平均 FPS、首帧耗时、显存占用。
- [ ] CI：`npm run typecheck` + `npm run build`（当前只有本机脚本）。

---

## D. 效果实现（主线，优先于 A）

见 `init/instruction/02~05`。当前阶段：Phase 2 水下场景。
