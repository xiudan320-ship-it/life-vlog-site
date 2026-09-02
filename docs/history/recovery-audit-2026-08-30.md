# Git 工作区恢复审计（2026-08-30）

> Status: Historical
> Scope: 仅在调查该次恢复、追踪回归来源或用户明确要求时查阅
> Default loading: No
> Source of truth: 当前源码及对应长期系统文档

## 审计范围

本记录保存主工作树、`5c0d` detached worktree、`26785dc` 保存点和
`codex/life-vlog-stabilization`（`508ae2a`）在整合前的 Git 证据。脏工作树内容
已先物化为命名安全提交，再进入整合分支；没有使用 `reset --hard`、`checkout --`、
`clean` 或删除用户文件。

## 保存点

| 来源 | 分支 / 引用 | 保存提交 | 父提交 | 保存内容 |
| --- | --- | --- | --- | --- |
| 主工作树 | `codex/recovery-main-dirty` | `c4eafe7` | `a2c2fe9` | 34 个文件，`2544 insertions / 179 deletions` |
| `5c0d` worktree | `codex/recovery-5c0d-dirty` | `6f058dd` | `26785dc` | 34 个文件，`2542 insertions / 177 deletions` |
| 5c0d 独有已提交修复 | `codex/recovery-26785dc` | `26785dc` | `a2c2fe9` | 等级面板全局事件与回归测试 |
| stabilization | `codex/life-vlog-stabilization` | `508ae2a` | `afd75bc` | 11 个提交，性能/PWA/路由/媒体/UI/文档体系 |

主工作树和 `5c0d` 保存树的语义差异在以下 8 个文件，已作为独立输入保留：

```text
app.js
docs/MODULE_MAP.md
modules/app-event-bindings.js
modules/settings-event-bindings.js
service-worker.js
tests/browser-regression.mjs
tests/release-smoke.mjs
tests/static-contracts.mjs
```

其中 `26785dc` 将等级面板关闭、遮罩点击和 VIP 徽章入口统一放回全局事件绑定，
并移除设置模块中的重复绑定；主保存点中的同名绑定未被假定为等价，后续按最终
架构重新核验。

## 接管时状态证据

以下命令在整合前执行，输出中的空 `status --short` 表示保存提交已经保护了原脏
工作树；内容证据由保存提交与其父提交的完整 Git diff 保留。

```text
主工作树：
branch: codex/recovery-integration
HEAD: c4eafe7a24e07d360d0490e4c1383270d916965f
git status --short: （空）
git diff a2c2fe9 c4eafe7 --stat: 34 files, 2544 insertions(+), 179 deletions(-)

5c0d worktree：
branch: codex/recovery-5c0d-dirty
HEAD: 6f058dd8fb7697dab0e12869ad324fb72966ba9e
git status --short: （空）
git diff 26785dc 6f058dd --stat: 34 files, 2542 insertions(+), 177 deletions(-)

stabilization：
branch: codex/life-vlog-stabilization
HEAD: 508ae2a4f571df0913cc8898fc77195b0d27f741
base: a2c2fe9e5501ad3bf849095e7018cc214026a6c8
git diff a2c2fe9 508ae2a --stat: 216 files, 21461 insertions(+), 6683 deletions(-)
commits: b07a1e7, 2b9d084, 178d251, 5a0eb33, 830ef17, 7eda21b,
         907dec5, 161ec06, a77ef33, afd75bc, 508ae2a
```

## Worktree 证据

整合开始前 `git worktree list --porcelain` 为：

```text
worktree C:/Users/xiuda/Documents/照片
HEAD c4eafe7a24e07d360d0490e4c1383270d916965f
branch refs/heads/codex/recovery-integration

worktree C:/Users/xiuda/.codex/worktrees/5c0d/照片
HEAD 6f058dd8fb7697dab0e12869ad324fb72966ba9e
branch refs/heads/codex/recovery-5c0d-dirty
```

`codex/life-vlog-stabilization` 未占用第三个 worktree，其树状态通过上述引用和
`git diff a2c2fe9 508ae2a` 保留。整合完成后会再次记录两个实际 worktree 的
状态；本文件只记录整合前证据，不替代最终测试报告。

## 最终验收

验收针对 `codex/recovery-integration` 的完整整合树执行；本节之后只追加本审计
记录，不改变已验证的应用代码、测试或构建输入。结果如下：

- `pnpm test`：通过。包含 68 个单元测试、静态/UI/结构/CSS 检查、确定性资源优化、Vite + Workbox 构建、构建/资源预算、CSS 覆盖率以及桌面和移动浏览器回归。
- `pnpm run test:a11y`：通过。使用本地 `vite preview` 和确定性 fixture，Axe critical/serious 扫描通过。
- `pnpm run test:release`：通过。设置 `RELEASE_BASE_URL=http://127.0.0.1:4176`，确定性 fixture 发布 smoke 通过。
- `pnpm run test:build`：通过。入口 HTML、JavaScript、CSS、Workbox 预缓存和生成资源均在预算内。
- `git diff --check`：通过。
- 未执行部署、远程写入、强制推送或真实账户验收；5c0d worktree 的内容由 `6f058dd` 保存，未删除用户文件。
