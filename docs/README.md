# 项目文档入口

本文件是项目文档路由表，不是文档阅读清单。

> 核心原则：先定位再读取，先局部后全局；只有任务风险和实际改动需要时，才扩大上下文、测试和文档同步范围。

## 标准任务启动流程

普通任务默认按以下顺序执行：

1. 阅读根目录 `AGENTS.md` 和本文件。
2. 运行 `git status --short`，确认工作区现有修改。
3. 使用文件名、模块名、UI 文案、函数名或 `rg` 搜索定位相关源码。
4. 先读取直接相关源码，再根据任务路由决定是否补充文档上下文。
5. 确定范围后实施最小必要修改。
6. 运行与改动风险相称的验证。
7. 按同步判断决定是否更新 CHANGELOG 或长期文档。
8. 完成前运行 `git diff --check`。
9. 未确认相关性前，不批量读取整个 `docs/`。

## 默认不读取

以下内容不属于普通任务的默认上下文：

- `docs/plans/`
- `docs/history/`
- 完整 `CHANGELOG.md` 历史
- 完整 `TECHNICAL_OVERVIEW.md`
- 完整 `MODULE_MAP.md`
- `release-checklist.md`
- design system 全量内容
- 与当前任务无关的专项规划、审计、恢复和历史记录

只有当前任务确实需要这些信息时才读取。大型文档先搜索标题或关键词，再读取相关章节，不默认读取全文。

## 任务路由

| 当前任务 | 默认动作 | 额外文档 |
| --- | --- | --- |
| 小型 Bug、文案、局部样式 | 直接搜索并读取相关源码 | 通常不需要 |
| 普通业务功能 | 搜索对应模块和测试 | 必要时读取 `MODULE_MAP.md` 相关章节 |
| 新增、删除、移动模块 | 定位模块边界 | `MODULE_MAP.md` 相关章节 |
| 模块职责发生变化 | 确认现有职责 | `MODULE_MAP.md` 相关章节 |
| 架构变化 | 确认当前架构 | `TECHNICAL_OVERVIEW.md` 相关章节 |
| 数据流、状态边界变化 | 定位数据路径 | `TECHNICAL_OVERVIEW.md` 相关章节 |
| API / 长期接口契约变化 | 定位调用链 | `TECHNICAL_OVERVIEW.md`，必要时 `MODULE_MAP.md` |
| 数据库表、字段、索引变化 | 检查 schema 和调用方 | `TECHNICAL_OVERVIEW.md` 相关章节 |
| PWA、缓存、离线行为 | 定位 service worker / cache 逻辑 | `TECHNICAL_OVERVIEW.md` 相关章节 |
| 构建、运行时、部署变化 | 检查相关配置 | `TECHNICAL_OVERVIEW.md`；发布时再读 `release-checklist.md` |
| UI / UX / 响应式 / 无障碍 | 搜索对应页面和组件 | 只读取 design system 相关章节 |
| 发布任务 | 检查当前待发布变化 | `release-checklist.md` |
| 调查历史回归 | 先搜索代码和 CHANGELOG | 必要时进入 `plans/` 或 `history/` |
| 某个专项继续实施 | 确认专项名称 | 只读取对应 plan |
| 修改文档管理规则 | 定位规则来源 | `CHANGE_WORKFLOW.md` |

## 搜索范围

普通源码调查优先搜索：

- `modules/`
- `src/`
- `styles/`
- `tests/`
- `scripts/`
- `cloudflare-worker/`
- 与任务直接相关的根目录源码或配置

默认不要搜索：

- `node_modules/`
- `dist/`
- `.cloudflare-pages-dist/`
- 日志文件和构建产物
- `docs/plans/`
- `docs/history/`

只有任务明确涉及这些内容时才进入对应目录。调查文档时同样遵循“先搜索、后局部读取”。

## CHANGELOG 记录规则

普通任务不需要默认读取完整 CHANGELOG；需要查看当前未发布变化时，只读取 `[Unreleased]`。

### 必须记录

以下变化通常需要写入 `[Unreleased]`：

- 新增或删除用户功能；
- 用户可见 Bug 修复；
- 用户可见 UI / UX 行为变化；
- API 或长期接口契约变化；
- 数据结构或数据库变化；
- 模块职责发生重要变化；
- 架构或数据流变化；
- 缓存、PWA、离线行为变化；
- 构建、部署、运行方式变化；
- 安全或权限边界变化；
- 重要依赖变化；
- 明显影响维护、运行或交付的重要工程调整。

### 默认不记录

以下修改通常不需要 CHANGELOG：

- 拼写修正；
- Markdown 排版；
- 注释修改；
- 代码格式化；
- 不改变行为的局部变量重命名；
- 不改变职责的小型内部整理；
- 单纯调整测试描述；
- 临时调试内容；
- 不影响当前系统事实的文档润色。

如果看不出用户、系统或维护者为什么需要知道这项变化，则通常不需要写 CHANGELOG。

历史 CHANGELOG 只有在调查回归、追踪行为引入或迁移、用户明确要求查询历史，或 `[Unreleased]` 无法解释当前行为时才搜索。优先使用 `rg "关键词" CHANGELOG.md` 定位，再读取命中附近内容。

## 专项规划文档

普通 Bug 和普通功能默认不要创建 plan。只有跨多个独立模块、涉及明显架构或数据迁移、高风险 PWA/缓存/部署、需要多个阶段或跨会话、存在多个方案决策，或需要复杂验收矩阵时，才考虑在 `plans/` 创建专项规划。

如果任务可以通过“定位 → 修改 → 测试 → 交付”在一次工作中清晰完成，则默认不创建 plan。

## 文档职责

| 文档 | 负责回答 |
| --- | --- |
| `AGENTS.md` | 绝对不能违反的项目级规则 |
| 本文件 | 这次任务应该读取什么、同步什么 |
| `TECHNICAL_OVERVIEW.md` | 当前架构、运行时、数据流和系统契约 |
| `MODULE_MAP.md` | 功能、页面、职责和源码模块映射 |
| `CHANGELOG.md` | 值得追踪的重要变化及用户影响 |
| `CHANGE_WORKFLOW.md` | 已决定修改后如何记录、测试和交付 |
| `release-checklist.md` | 发布前后验收门禁 |
| `design-system/` | 全局 UI、视觉和交互规范 |
| `plans/` | 复杂专项的计划和设计决策，默认不读 |
| `history/` | 已结束的恢复、审计和历史记录，默认不读 |

## 修改后的文档同步原则

修改代码时，根据实际影响同步对应文档，不机械更新全部文档：

| 实际变化 | 通常需要检查或更新 |
| --- | --- |
| 用户功能新增、删除或明显变化 | `CHANGELOG.md` |
| 用户可见缺陷修复 | `CHANGELOG.md` |
| 新增、删除、移动模块 | `MODULE_MAP.md`；有重要影响时加 CHANGELOG |
| 模块职责发生实质变化 | `MODULE_MAP.md`；有重要影响时加 CHANGELOG |
| 架构、数据流或状态契约变化 | `TECHNICAL_OVERVIEW.md` + CHANGELOG |
| API、数据库或长期接口契约变化 | `TECHNICAL_OVERVIEW.md`，必要时 `MODULE_MAP.md` + CHANGELOG |
| PWA、缓存或离线行为变化 | `TECHNICAL_OVERVIEW.md` + CHANGELOG |
| 构建、部署或运行方式变化 | `TECHNICAL_OVERVIEW.md`、`release-checklist.md` + CHANGELOG |
| 全局 UI / UX 规范变化 | design system + CHANGELOG |
| 单页面局部视觉修复 | 通常只需 CHANGELOG；无行为的小调整可以不记 |
| 发布门禁变化 | `release-checklist.md` |
| 拼写、格式、注释、格式化或无行为小整理 | 默认无需同步长期文档和 CHANGELOG |

最终是否需要更新某个文档，默认按本表和 `AGENTS.md` 判断；存在歧义或涉及文档、测试、发布、交付流程时，再查 `CHANGE_WORKFLOW.md`。

## 当前事实与历史记录

当前系统状态以源码、配置和对应长期系统文档为准。`plans/` 与 `history/` 只记录专项背景、决策、审计或恢复证据，不代表当前实现；发生冲突时先确认源码和实际运行行为，再按任务路由检查相关章节。

当长期文档过期时，应在当前修改中同步修正；不要为了让实现符合旧 plan 而修改正确的当前代码。
