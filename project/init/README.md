# VIEW 项目策划包｜V2.1 两周冲刺与工程规范版

本包是 VIEW 实时场景渲染实践的开发总设计、学习指南和 Agent 执行依据。它不是源代码工程，也不代表四个场景已经实现。

## 阅读顺序
1. `plan.md`：唯一总体依据，定义范围、需求、架构、接口、两周计划、Three.js 技术选型、软件工程规范和验收。
2. `instruction/00-学习路线与开发约定.md`：了解学习与协作方式。
3. `instruction/01-工程骨架与公共视口.md`：开始搭建公共工程。
4. 按当前场景阅读 `instruction/02` 至 `instruction/05`。
5. `instruction/06-整合性能调试与验收.md`：集成、性能与验收。
6. `instruction/07-软件工程规范与Agent协作.md`：代码边界、资源所有权、任务卡与 Code Review。

## 当前项目约束
- 项目：VIEW（Visual Interactive Environment Worlds）
- 技术：React + TypeScript + Vite + Three.js + React Three Fiber，Drei 按需使用
- 周期：两周（10 个工作日）冲刺基线；如有额外时间再扩展 P1/P2
- 独立开发；AI Agent 作为开发协作工具，不改变个人课程交付责任
- 暂不引入后端、账户、数据库或云同步
- 四场景均需可进入和交互；复杂 Shader 深度按风险选择，不要求四场景同等商业品质

## 目录
```text
VIEW/
├── README.md
├── plan.md
├── instruction/
│   ├── 00-学习路线与开发约定.md
│   ├── 01-工程骨架与公共视口.md
│   ├── 02-水下场景算法与Shader.md
│   ├── 03-自然地貌植被与风动.md
│   ├── 04-未来城市与Bloom.md
│   ├── 05-黑洞太空与屏幕空间效果.md
│   ├── 06-整合性能调试与验收.md
│   └── 07-软件工程规范与Agent协作.md
├── docs/
│   ├── PROGRESS_TEMPLATE.md
│   └── TEST_REPORT_TEMPLATE.md
└── assets/
    ├── 四大场景概念视觉板.png
    └── 课程实验要求原图.png
```

## Agent 开工规则
先让主 Agent 阅读 `plan.md`、`instruction/00`、`instruction/01`，检查仓库并提交工程初始化计划；确认公共类型、场景注册契约和目录结构后，再分派各场景。禁止多个 Agent 同时修改公共接口或同一文件。

## 文档优先级
`plan.md` 是总体需求与验收的唯一依据；`instruction/` 解释具体实现；`docs/` 记录实际进度和测试。若文档之间冲突，暂停相关实现并向产品负责人/主 Agent 提出 RFC，不自行猜测。
