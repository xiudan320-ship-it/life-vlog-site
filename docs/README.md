# 项目文档入口

新对话、新开发者或自动化程序接手项目时，按以下顺序阅读：

1. [`../AGENTS.md`](../AGENTS.md)：不可违反的实现与交付规则。
2. [`TECHNICAL_OVERVIEW.md`](TECHNICAL_OVERVIEW.md)：系统架构、运行时、数据、媒体、PWA、测试和部署总览。
3. [`MODULE_MAP.md`](MODULE_MAP.md)：根据功能或故障快速定位模块。
4. [`../CHANGELOG.md`](../CHANGELOG.md)：已经交付和正在开发的变更记录。
5. [`CHANGE_WORKFLOW.md`](CHANGE_WORKFLOW.md)：每次修改必须怎样同步文档。
6. [`release-checklist.md`](release-checklist.md)：发布前后门禁。
7. [`../design-system/life-vlog/MASTER.md`](../design-system/life-vlog/MASTER.md)：全局 UI 设计规范。

专项规划书记录某一轮任务的原因、范围和验收标准，不等同于当前系统事实。任务完成后，应以技术总览、模块图和变更日志为准；专项规划保留作决策背景。

## 文档职责

| 文档 | 记录什么 | 什么时候更新 |
| --- | --- | --- |
| `TECHNICAL_OVERVIEW.md` | 当前整体架构和长期契约 | 架构、数据流、构建、部署、PWA 或关键依赖变化时 |
| `MODULE_MAP.md` | 功能到源码模块的映射 | 新增、删除、移动模块或职责变化时 |
| `CHANGELOG.md` | 每一次仓库修改及用户影响 | 每个非纯文档提交都必须更新 |
| `CHANGE_WORKFLOW.md` | 记录和交付规则 | 文档流程本身变化时 |
| `release-checklist.md` | 可执行发布门禁 | 测试、部署或线上验收方式变化时 |
| `design-system/` | 视觉、交互和页面特例 | UI 语言、组件规范或页面特例变化时 |

最后核验日期：2026-08-30。
