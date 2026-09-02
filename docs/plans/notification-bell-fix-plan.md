# 顶部通知铃铛无响应修复规划

> 状态：已实现并部署（2026-08-31）
> 规划日期：2026-08-31  
> 优先级：P0

## 1. 已确认根因

顶部 `#notificationButton` 属于所有已登录页面都可见的全局应用外壳，但它的点击、关闭和点击遮罩关闭监听目前写在 `modules/settings-event-bindings.js`。

`modules/app-event-bindings.js` 只有进入 `settings` 路由时才懒加载并执行 `bindSettingsEvents()`。因此用户尚未打开设置页时，顶部铃铛没有任何 click listener，点击必然无反应。

第二层体验问题位于 `modules/social-controller.js`：`openNotificationsPanel()` 先 `await loadNotifications()`，请求完成后才调用 `showModal()`。慢网、离线或接口挂起时，用户点击后没有即时界面反馈，看起来仍像按钮失效。

## 2. 修复目标

1. 用户登录后，无论当前在哪个路由、是否访问过设置页，第一次点击通知铃铛都立即打开通知窗口。
2. 窗口先打开并显示缓存内容或加载状态，网络请求不能阻塞窗口出现。
3. 慢网、离线和读取失败时窗口仍可关闭、重试，不出现静默无响应。
4. 重复切页或多次初始化不能重复绑定事件、重复打开窗口或并发读取同一批通知。
5. 通知项目点击、标记已读、跳转日记/感谢页、遮罩关闭和关闭按钮保持正常。

## 3. 实现方案

### 3.1 修正事件所有权

- 从 `settings-event-bindings.js` 删除以下全局通知监听：
  - `notificationButton` 点击；
  - `closeNotificationDialog` 点击；
  - `notificationDialog` 遮罩点击。
- 在应用外壳初始化时一次性绑定这些监听。优先建立职责明确的 `modules/notification-event-bindings.js`，由 `app-event-bindings.js` 在初始化阶段立即调用。
- 新模块只负责 DOM 事件到 `controllers.social` 的转发，不读取数据、不渲染 HTML、不复制通知业务逻辑。
- 不保留设置路由中的兼容绑定，也不使用 optional fallback 掩盖缺失控制器。

### 3.2 窗口即时打开

调整 `openNotificationsPanel()` 的顺序：

1. 若 dialog 尚未打开，立即 `showModal()`。
2. 立即渲染已有缓存；无缓存时显示“正在加载通知…”。
3. 启动或复用现有 `notificationsLoadPromise`。
4. 请求成功后在仍存在的窗口中刷新列表；请求失败则显示可理解的错误和“重试”动作。
5. 用户在请求期间关闭窗口时，请求可以完成并更新缓存，但不得重新打开窗口或抢焦点。
6. 只有成功取得列表后才计算本次未读项并执行既有标记已读逻辑。

不得通过 toast 代替窗口，也不得为了即时打开而伪造“暂无通知”。加载、真正为空和失败必须是三种不同状态。

### 3.3 并发与异常

- 继续复用现有 `state.notificationsLoadPromise`，连续点击只复用一次读取。
- `showModal()` 前检查 `dialog.open`，避免重复调用抛出异常。
- 所有异步入口捕获并渲染失败状态，不能产生未处理 Promise rejection。
- 登出时维持现有清空通知状态和隐藏按钮行为；重新登录后无需访问设置即可使用。

## 4. 预计修改文件

| 文件 | 修改 |
| --- | --- |
| `modules/notification-event-bindings.js` | 新增全局铃铛、关闭按钮和遮罩事件绑定。 |
| `modules/app-event-bindings.js` | 初始化时立即调用通知事件绑定。 |
| `modules/settings-event-bindings.js` | 删除错误归属的通知监听及无用 social 依赖。 |
| `modules/social-controller.js` | 先开窗再加载；区分 loading / empty / error；保留 Promise 去重。 |
| `modules/notification-view.js` | 如现有 view 无法表达 loading/error/retry，仅增加最小状态渲染接口。 |
| `tests/browser-regression.mjs` | 增加未访问设置页的首次点击、慢请求即时打开、关闭竞态和失败/重试回归。 |
| `tests/release-smoke.mjs` | 加入全局通知铃铛关键路径。 |
| `tests/static-contracts.mjs` | 防止通知绑定再次回到 settings-only 懒加载模块。 |
| `docs/MODULE_MAP.md` | 记录全局通知事件归属。 |
| `docs/TECHNICAL_OVERVIEW.md` | 记录通知窗口即时反馈与异步加载契约。 |
| `docs/release-checklist.md` | 加入首次点击、慢网、离线、关闭和跳转验收。 |
| `CHANGELOG.md` | 在 `[Unreleased]` 记录用户可见修复。 |

## 5. 确定性测试矩阵

全部使用内存 fixture，不访问真实账户：

1. 登录后停留 gallery，完全不进入 settings；第一次点击铃铛，dialog 在一个 animation frame 内打开。
2. 通知接口延迟 1500ms；dialog 立即显示 loading，之后显示列表。
3. 接口返回空数组；显示真正的空状态，不残留 loading。
4. 接口失败或离线；显示失败状态和重试，dialog 可关闭。
5. 加载中点击关闭；请求完成后 dialog 不重新打开，焦点回到铃铛。
6. 快速连续点击；只有一次 API 请求，不抛 `showModal()` 异常。
7. 先访问 settings 再点击铃铛；仍只触发一次打开，不存在重复监听。
8. 未读通知加载成功后正确标记、徽标更新；通知项目仍能打开对应日记或感谢页。
9. 375×812、390×844、844×390、dark/light、reduced-motion 和大字号下窗口不溢出。
10. 键盘 Enter/Space 可打开，Escape/关闭按钮可关闭，关闭后焦点回到铃铛。

## 6. 必跑门禁

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run test:a11y
pnpm run test:release
pnpm run test:build
git diff --check
```

## 7. 完成定义

- 不访问设置页也能在第一次点击时立即看到通知窗口。
- 网络读取不会阻塞窗口出现，loading / empty / error 明确区分。
- 快速点击、慢网、离线、加载中关闭均无异常或意外重开。
- 通知事件不再由 settings-only 懒加载模块持有。
- 通知详情跳转、标记已读、徽标、关闭与焦点恢复全部通过。
- 文档、自动化门禁和移动端验收完成后才允许发布。
