# 技术文档与变更记录流程

本文件只定义仓库已经发生修改后的记录、验证和交付规则。任务开始应该读取什么，由 `docs/README.md` 的任务路由决定；本文件不属于普通任务固定预读内容。

## 1. 基本原则

修改仓库时：

1. 保留开始任务前已经存在且不属于当前任务的工作区修改。
2. 修改范围保持与任务目的直接相关，不为“顺便整理”扩大无关改动。
3. 测试范围与实际风险相称。
4. 只有实际系统事实变化时才同步长期文档。
5. 只有值得被未来开发者或用户追踪的变化才记录 CHANGELOG。
6. 交付前运行 `git diff --check`。

## 2. 文档同步判断

| 实际变化 | 需要同步 |
| --- | --- |
| 用户功能新增、删除或明显变化 | `CHANGELOG.md` |
| 用户可见缺陷修复 | `CHANGELOG.md` |
| 新增、删除、移动模块 | `MODULE_MAP.md`，有重要影响时加 CHANGELOG |
| 模块职责发生实质变化 | `MODULE_MAP.md`，有重要影响时加 CHANGELOG |
| 架构变化 | `TECHNICAL_OVERVIEW.md` + CHANGELOG |
| 数据流或状态契约变化 | `TECHNICAL_OVERVIEW.md` + CHANGELOG |
| API 长期契约变化 | `TECHNICAL_OVERVIEW.md`，必要时 `MODULE_MAP.md` + CHANGELOG |
| 数据库 schema 变化 | schema、`TECHNICAL_OVERVIEW.md` + CHANGELOG |
| PWA、缓存或离线行为变化 | `TECHNICAL_OVERVIEW.md` + CHANGELOG |
| 构建或部署行为变化 | `TECHNICAL_OVERVIEW.md`、`release-checklist.md` + CHANGELOG |
| 全局 UI / UX 规范变化 | design system + CHANGELOG |
| 单页面局部视觉修复 | 通常只需 CHANGELOG；无行为的小调整可以不记 |
| 发布门禁变化 | `release-checklist.md` |
| 拼写、格式、注释 | 默认无需同步长期文档和 CHANGELOG |
| 无行为变化的小型内部整理或测试描述 | 通常无需同步长期文档和 CHANGELOG |

## 3. CHANGELOG 写法

使用以下分类：

- `Added`：新增功能、模块、页面或能力。
- `Changed`：已有行为、架构、UI、配置或依赖变化。
- `Fixed`：用户可见故障或明确缺陷修复。
- `Removed`：删除功能、旧实现、兼容层或过时文件。
- `Security`：权限、认证、敏感数据和安全边界。
- `Documentation`：重要文档体系或说明变化。

每条记录说明“发生了什么”和“影响哪里”，不要只写文件名，也不要复制聊天过程。未部署的内容写在 `[Unreleased]`；正式部署后，将对应条目移动到带日期的版本小节，并记录部署范围或关键提交。

## 4. 测试范围

测试按照修改风险选择，不机械运行所有测试：

### 测试日志规则

测试输出遵循结果优先原则：

- 测试成功时只保留命令、通过状态和必要摘要，不继续读取完整 stdout。
- 测试失败时保留失败测试名称、错误信息和足够定位问题的 stack trace。
- 错误信息不足以定位问题时，再扩大日志范围或读取完整的相关输出。
- 浏览器测试、构建和 release 测试产生的大量成功日志，默认不继续带入上下文。

### Level 1：低风险

文案、Markdown、注释、极小局部样式和无行为内部整理，执行直接相关的静态检查、必要的局部测试及 `git diff --check`。

### Level 2：普通功能

普通 Bug、页面交互、业务逻辑、单模块功能和普通组件修改，执行对应单元/模块测试、相关静态检查；涉及浏览器行为时执行对应浏览器回归及 `git diff --check`。

### Level 3：高风险

架构、数据流、数据库、认证权限、PWA、缓存、service worker、构建、部署和关键运行时装配，执行相关单元、静态、集成或浏览器回归，必要时执行 build 和发布门禁，再运行 `git diff --check`。

## 5. 提交与交付

分支与部署顺序以根目录 `AGENTS.md` 第 12 条为准，发布执行 `release-checklist.md` 第 0 节及后续验收门。默认使用 `main`，临时工作先整合，已授权发布按本地验收、提交推送、预览验收、正式发布验收顺序执行。纯文档同步不要求网站重部署。

一次提交只包含一个完整目的。推荐前缀：

- `feat:` 新功能
- `fix:` 缺陷修复
- `refactor:` 不改变用户行为的结构调整
- `docs:` 纯文档
- `test:` 测试体系
- `build:` 构建或发布

需要 CHANGELOG 或长期文档同步时，提交应同时包含对应修改；不需要时不要为了形式创建空记录。交付说明报告实际运行过的验证，不把未执行的测试写成已通过。

## 6. 交付检查

- [ ] 如有用户、系统或重要工程影响，CHANGELOG 已记录；否则确认无需更新。
- [ ] 模块职责变化已同步 `MODULE_MAP.md`。
- [ ] 架构、数据流或运维事实变化已同步 `TECHNICAL_OVERVIEW.md`。
- [ ] UI 规范变化已同步 design system。
- [ ] 测试和发布命令与文档一致。
- [ ] 文档没有密钥、token、真实密码或私人业务内容。
- [ ] `git diff --check` 通过。
