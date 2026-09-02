# 消息通知关闭、日记筛选滚动与可配置顶部导航修复规划

> 状态：已完成本地代码、测试与构建验收；未执行线上部署。
>
> 规划日期：2026-08-31（Asia/Tokyo）

## 1. 本轮目标

本轮后续实现需要同时解决三个互相关联但职责不同的问题：

1. 设置 → 通知与工具 → 消息通知中的“关闭这台设备”按钮点击没有反应。
2. 日记列表的搜索栏和分类 tag 不应固定在顶部；向下阅读日记时应随页面正常滚走，把手机视口留给内容。
3. 顶部主分页不应按固定列数预留空格；分页宽度应根据实际启用项自适应，并允许用户在设置中选择和调整显示的分页。

规划阶段本身不授权修改代码、执行部署或改变线上数据；本次后续实现由用户明确授权，仅修改本地源代码、测试和技术文档，不执行 preview/production 部署，也不改变线上数据。

实施完成记录（2026-09-01）：已按本规划落地 Push 懒加载绑定与本地优先关闭、日记筛选普通文档流、可配置自适应顶部分页、现有偏好作用域持久化、领域/视图/控制器拆分和确定性 fixture 验收。

## 2. 已确认的现状与根因

### 2.1 “关闭这台设备”按钮未绑定到点击事件

相关链路：

- `modules/settings-view.js` 在设置路由加载后才生成 `#settingsNotifications`、`#enablePushNotifications` 和 `#disablePushNotifications`。
- `modules/push-controller.js` 的 `ensureSettingsPage()` 会查找上述 DOM，并为两个按钮绑定 `enable` / `disable`。
- 当前唯一的 `ensurePushSettingsPage()` 调用位于 `modules/app-session-controller.js` 的本地 session 初始化阶段。
- 设置页是懒加载路由；session 初始化时，设置模板通常还没有挂载，`ensureSettingsPage()` 因找不到 `#settingsNotifications` 直接返回。
- 之后 `modules/routes/settings-route.js` 虽然执行 `renderSettingsShell()` 创建了按钮，但没有再次调用 `ensurePushSettingsPage()`。
- 进入“通知与工具”时会执行 `refreshPushSettings()`，因此按钮可以被正确显示为“关闭这台设备”，但它没有 click listener，表现就是点击完全无反应。

这是确定性的生命周期错误，不是按钮样式、iOS 权限状态或用户操作方式造成的。

另外还有一个需要一并收口的失败边界：当前 `disable()` 先请求 `/api/push/unsubscribe`，远端请求失败时会直接进入 `catch`，导致本地 `subscription.unsubscribe()` 没有执行。即使事件绑定修好，弱网或离线时仍可能表现为“无法关闭本机通知”。“关闭这台设备”的本机语义不应被云端清理失败阻断。

当前测试没有覆盖 Web Push 设置按钮的懒加载绑定、本地 unsubscribe 或远端失败路径。

### 2.2 正式站仍在固定搜索栏与分类 tag

正式站当前入口引用 `assets/index-CY7beiuz.css`。实际发布 CSS 中存在：

```css
.filters {
  position: sticky;
  top: 71px;
  z-index: 12;
  /* 其余声明省略 */
}
```

因此手机向下滚动时，搜索栏与 tag 行会持续占据视口，这与用户观察一致。

当前源码中的 `styles/redesign-foundation.css` 已看不到 `position: sticky`，但仍残留：

- 桌面 `.filters { top: calc(84px + env(safe-area-inset-top)); }`
- 手机 `.filters { top: calc(136px + env(safe-area-inset-top)); }`

这说明源码、构建产物与正式站之间存在版本漂移；不能只在新 CSS 末尾加覆盖规则，也不能直接修改 `dist/`。后续实现必须从规范源码删除 sticky 语义和无效 top 偏移，重新构建并发布带新 hash 的资源，再在线确认计算样式为普通文档流。

用户要求的是完全不固定，因此不采用“缩小 sticky 高度”“滚动后折叠”或“只固定 tag”之类替代交互。搜索框与所有分类 tag 都应随日记列表正常滚走。

### 2.3 顶部分页固定六列，实际项目数不足

`index.html` 的 `.main-nav` 当前包含五个按钮：

- 日记
- VLOG
- 心愿
- 周末
- 衣柜

其中 VLOG 在未登录时还会隐藏。

但 `styles/redesign-foundation.css` 和手机覆盖都使用：

```css
grid-template-columns: repeat(6, minmax(0, 1fr));
```

网格始终创建六列，DOM 只有五个可见项时必然留下一个空格；未登录隐藏 VLOG 后空位更多。正式站 `index-CY7beiuz.css` 也仍包含固定 `repeat(6, ...)`。

此外，当前一级导航事件和激活状态依赖 `galleryNav`、`wishlistNav`、`weekendNav`、`wardrobeNav` 等固定 ID：

- `modules/app-event-bindings.js` 分别绑定每个按钮。
- `modules/app-navigation-controller.js` 维护固定的 `[page, element]` 数组。
- `modules/diary-feed-controller.js` 和 `modules/vlog-mode.js` 直接操作日记/VLOG 按钮。

这套固定 DOM 结构不能直接支持用户在设置里增加、移除和排序分页；只改 CSS 可以去掉空位，但无法完成配置功能。

## 3. 产品与交互决策

### 3.1 日记搜索与 tag

- `#galleryFilters` 使用普通文档流，不再设置 `position: sticky/fixed`、`top` 或高层级 z-index。
- 搜索框、清空按钮和分类 tag 的功能、当前筛选状态及搜索建议保持不变。
- 搜索和筛选后仍在当前日记页更新结果，不新增路由或浮层。
- 手机端下滑后，顶部只保留应用自身的主导航；搜索与 tag 不占据持续阅读空间。
- 不使用 `overflow: hidden` 掩盖问题，也不通过负 margin 把控件移出视口。

### 3.2 顶部主分页默认值和候选项

默认启用项保持现有登录态体验：

1. 日记
2. VLOG
3. 心愿
4. 周末
5. 衣柜

允许用户在设置中额外启用：

- 菜谱
- 留言
- 秘藏

约束：

- “日记”是主入口，固定启用但允许排序，不能被完全删除。
- VLOG 是日记模式而不是独立路由，注册表必须明确标记为 mode action，不能伪造 `?page=vlog`。
- “心情”不进入可选分页，继续遵守此前的明确产品规则：默认从今日概览的“查看心情日历”进入，`?page=mood` 深链接仍有效。
- 设置本身通过头像菜单打开，不加入主分页。
- 配置按当前用户、当前设备保存到现有 `preferences-store`；本轮不增加云端表、跨设备同步或数据库结构。

### 3.3 自适应布局

顶部导航不再使用固定列数。推荐采用自适应 flex/横向滚动模式：

- 容器宽度足够时，每个已启用分页平均或按内容弹性占满可用宽度，不生成空白轨道。
- 手机空间不足时，每项保持至少 64px 可读宽度和至少 44px 高度，导航容器自身横向滚动。
- 不能为了塞下更多分页把字号压到 12px 以下或把触控目标压小。
- 不能让整个页面产生横向滚动；只有 `.main-nav` 可以在分页过多时局部横向滚动。
- 当前激活分页滚动进入可视范围，使用 `scrollIntoView({ block: "nearest", inline: "nearest" })`，但不得改变页面纵向滚动位置。
- 键盘 Tab 顺序必须与用户设置后的视觉顺序一致；当前页使用 `aria-current="page"`，VLOG 使用正确的 pressed/active 语义。

`ui-ux-pro-max` 的相关检查结论：固定导航不能遮挡内容；相邻触控项保留至少 8px 间距；移动端触控区域至少 44px；分页过多时使用局部 `overflow: auto`，不能全局裁剪内容。

## 4. 推荐模块设计

### 4.1 新增 `modules/primary-navigation-domain.js`

只承载纯规则：

- 顶部分页注册表：`id`、显示名、类型（route/mode）、目标 route、是否需要登录、默认启用状态。
- 合法 ID 校验、去重、默认项补齐。
- 保证 `gallery` 始终存在。
- 用户排序和启用集合的规范化。
- 不读取 DOM、localStorage 或网络。

候选注册表应成为设置面板、顶部渲染和事件派发的单一事实来源，避免三处各维护一份页面清单。

### 4.2 新增 `modules/primary-navigation-view.js`

负责：

- 根据规范化配置生成 `.main-nav` 按钮。
- 使用 `data-primary-nav-id`、`data-primary-route` 或 `data-primary-mode` 表达行为，不继续扩展固定元素 ID。
- 生成设置中的“顶部分页”选择与排序界面。
- 更新 active、`aria-current`、`aria-pressed`、禁用态和排序按钮状态。
- 不直接切换页面或写入偏好。

### 4.3 新增 `modules/primary-navigation-controller.js`

负责：

- 通过 `preferences-store` 读取/写入用户作用域配置，例如 `life-vlog-primary-navigation:<userId>`。
- 应用启动且 splash 尚未释放时渲染默认/用户导航，避免可见布局跳动。
- 对 `.main-nav` 使用一次事件委托：route 项调用 `switchPage(page)`，VLOG 项调用既有 VLOG mode 动作。
- 设置面板增删/排序后立即保存、重绘并同步当前 active 状态。
- 当当前页面对应的分页被用户隐藏时，不强制切页；页面仍可通过工具入口或深链接访问，导航只是不显示该入口。
- 用户退出或切换账号时重新应用对应作用域配置。

### 4.4 收敛现有固定绑定

后续实现应删除过时的固定导航绑定，不保留双实现或兼容层：

- `index.html` 的 `.main-nav` 只保留可渲染容器，不再手写固定六格按钮。
- `app-event-bindings.js` 不再逐个绑定 `galleryNav`、`wishlistNav` 等。
- `app-navigation-controller.js` 将 active 同步委托给 primary navigation controller/view。
- `diary-feed-controller.js` 不再直接操作固定日记/VLOG按钮。
- `vlog-mode.js` 通过注入动作与导航状态桥接，不直接查找 `#vlogNav`。
- DOM 收集器、静态契约和浏览器测试改用 data attribute，不继续要求旧 ID。

这不是为了兼容旧 DOM 新增一层包装，而是直接删除无法支持配置功能的固定实现。

### 4.5 设置页入口

在“外观与使用”中增加“顶部分页”设置卡，原因是它属于界面与导航偏好，不属于通知工具：

- 每个候选项提供明确的显示开关。
- 已启用项提供上移/下移按钮，复用现有工具坞设置的可访问排序模式。
- 不使用拖拽作为唯一排序方式；按钮和键盘必须可完成全部操作。
- 保存后立即更新顶部导航，并用行内状态或短 toast 告知“已保存”。
- 所有开关和排序按钮至少 44×44px，焦点样式在明暗主题下清晰可见。

## 5. “关闭这台设备”修复方案

### 5.1 正确绑定时机

在 `modules/routes/settings-route.js` 完成 `renderSettingsShell()` 之后，调用已有 `actions.ensurePushSettingsPage()`。这样 DOM 已存在，且 route loader 的 initialize 只执行一次，绑定仍保持单实例。

session 初始化阶段的过早调用应删除；不保留“早调用一次、路由再调用一次”的双路径。

### 5.2 关闭流程

`push-controller.disable()` 应明确区分本机关闭和云端端点清理：

1. 点击后立刻设置 busy 状态，禁用按钮并显示“正在关闭…”，防止重复提交。
2. 读取当前 subscription 与 endpoint。
3. 执行本地 `subscription.unsubscribe()`，确保这台设备先停止接收推送。
4. 清除本机 app badge。
5. 有 endpoint 时请求 Worker 删除对应订阅记录。
6. 再次读取 subscription 并刷新 UI；成功状态以本地实际 subscription 是否存在为准。
7. 若本地已关闭但云端清理失败，明确显示“本机已关闭，云端记录清理失败，可联网后重试”，不能仍显示成毫无反应。
8. 用 `finally` 恢复按钮可操作状态；异常不得形成未处理 Promise rejection。

如果浏览器返回“没有 subscription”，该操作按幂等成功处理，直接显示“这台设备的通知已关闭”。

## 6. 样式改造范围

### `styles/redesign-foundation.css`

- 删除 `.filters` 的 sticky/fixed 语义和所有 `top`/z-index 偏移。
- 保留正常的段落间距、搜索框布局和 tag 换行。
- `.main-nav` 改为基于实际子项的 flex 或等效自适应布局，不再出现 `repeat(6, ...)`。

### `styles/redesign-components.css`

- 删除手机 `.filters` 的 `top: calc(136px + ...)` 残留。
- 手机导航保持 44px 最小触控高度、8px 左右间距和局部横向滚动。
- 375/390/430px 和短横屏下，顶部按钮不得被裁切或制造页面横向溢出。

### `styles/settings.css`

- 增加顶部分页设置卡、开关和排序控件样式。
- 延续现有 settings 视觉语言、颜色 token 和移动端分类页布局。

## 7. 预计修改文件

| 文件 | 规划中的修改 |
| --- | --- |
| `modules/push-controller.js` | 收敛本机关闭、远端清理、busy/error 状态 |
| `modules/routes/settings-route.js` | 在设置 DOM 完成后绑定 Push UI |
| `modules/app-session-controller.js` | 删除设置 DOM 创建前的过早绑定 |
| `modules/primary-navigation-domain.js` | 新增分页注册表与配置纯规则 |
| `modules/primary-navigation-view.js` | 新增顶部导航与设置面板渲染 |
| `modules/primary-navigation-controller.js` | 新增偏好、事件、排序和 active 编排 |
| `modules/app-runtime-*-assembly.js` | 注入导航 controller 所需依赖与动作 |
| `modules/app-event-bindings.js` | 删除固定 ID 导航监听，接入委托入口 |
| `modules/app-navigation-controller.js` | 将导航状态同步交给新 controller |
| `modules/diary-feed-controller.js` | 删除固定日记/VLOG按钮状态写入 |
| `modules/vlog-mode.js` | 去除对 `#vlogNav` 的直接依赖 |
| `modules/settings-view.js` | 增加“顶部分页”设置容器 |
| `index.html` | 主导航改为空容器/最小壳，不写固定按钮 |
| `styles/redesign-foundation.css` | 移除 sticky 筛选和六列导航 |
| `styles/redesign-components.css` | 手机筛选/导航响应式收敛 |
| `styles/settings.css` | 分页设置控件样式 |
| `tests/*` | 增加 Push、导航偏好、布局及回归覆盖 |
| `CHANGELOG.md`、`docs/*`、`design-system/*` | 实现时同步当前事实与发布记录 |

最终文件可以因审计结果小幅调整，但不得把新增业务逻辑堆回 `app.js`。

## 8. 实施顺序

### 阶段 A：最小修复闭环

1. 把 Push 设置事件绑定移到设置模板渲染之后。
2. 修复本地 unsubscribe 不被远端失败阻断的问题。
3. 移除 `.filters` 的 sticky 与无效 top 偏移。
4. 把主导航从固定六列改成按现有五项自适应，先消除空格。
5. 跑对应最小测试，确认三个用户可见问题已经关闭。

### 阶段 B：可配置分页

1. 建立分页注册表和配置纯规则。
2. 实现用户作用域偏好读写。
3. 将顶部 DOM、点击和 active 状态迁移到统一 controller/view。
4. 在设置中增加显示开关与按钮排序。
5. 删除旧固定 ID 绑定和过时 CSS。

### 阶段 C：回归、文档与发布

1. 完成确定性测试矩阵。
2. 更新模块图、技术总览、设计系统与 CHANGELOG。
3. 构建并核对生成 CSS 不再包含 `.filters{position:sticky...}` 或固定 `repeat(6,...)`。
4. 发布新 hash 资源。
5. 在线验证正式站计算样式、Push 关闭和用户分页偏好。

## 9. 自动化测试规划

### 9.1 Push 单元/控制器测试

- 设置 DOM 尚未挂载时不会错误标记为已绑定。
- 设置 route 初始化后，开启和关闭按钮各只有一个 listener。
- 当前 subscription 存在时点击关闭：本地 unsubscribe 调用一次，Worker 收到 endpoint 一次。
- Worker 删除失败时，本地 unsubscribe 仍执行，UI 明确区分本机成功和云端清理失败。
- 没有 subscription 时关闭操作幂等成功。
- 连续点击不会发起并发关闭；按钮 busy/disabled 状态最终恢复。

### 9.2 导航 Domain 测试

- 非法、重复和未知分页 ID 被删除。
- 日记入口始终补回且只出现一次。
- 默认顺序稳定。
- 启用/隐藏/排序后序列正确。
- VLOG 保持 mode 类型，不被序列化为 route。
- 不同用户的偏好互不串用，损坏 JSON 回到当前默认值。

### 9.3 浏览器回归

在 375×812、390×844、430×932、844×390、768×1024 和桌面执行：

- 顶部导航没有空白格；每个可见项宽度由实际数量决定。
- 增加菜谱/留言/秘藏后立即出现，移除后立即消失，刷新后保持配置。
- 排序后的视觉顺序、Tab 顺序和设置列表顺序一致。
- 分页过多时只有导航自身横向滚动，`documentElement.scrollWidth === clientWidth`。
- 每个导航和设置操作触控区域至少 44px；相邻操作间距至少 8px。
- 点击 route 项正常切页并更新 `aria-current`；点击 VLOG 不创建 `?page=vlog`。
- 当前页入口被隐藏后页面不崩溃，仍可通过现有入口或深链接访问。
- 搜索栏与 tag 的 `getComputedStyle(...).position` 为 `static` 或 `relative`，页面下滑后其 bottom 小于视口 top，证明已随内容滚走。
- 日记滚动区域显著增加，搜索/tag 不覆盖卡片、焦点或返回顶部按钮。
- 设置页懒加载后点击“关闭这台设备”确实调用 unsubscribe，并更新为“未开启/已关闭”。

### 9.4 可访问性与主题

- Axe critical/serious 为零。
- 标准/较大/特大字号下导航不截断关键状态；必要时局部滚动。
- 明暗主题下选中、焦点、禁用和错误状态可辨认。
- 键盘可完成分页进入、设置开关与上移/下移。
- reduced-motion 下不依赖动画表达保存或选中结果。

## 10. 发布验收

发布前必须确认：

- `git diff --check`、静态契约、单元测试、生产构建、浏览器回归、Axe 和 release smoke 通过。
- 使用确定性内存 fixture，不使用真实账号、密码、token 或业务数据做自动化测试。
- 生成的主 CSS 中不存在固定 `.filters` sticky 规则。
- 生成的 `.main-nav` 不再使用固定六列。
- 正式站 HTML 引用新的 hash CSS/JS，而不是继续使用 `index-CY7beiuz.css`。
- iOS 主屏幕 Web App 和至少一个现代桌面浏览器实测关闭通知。
- 设置分页偏好刷新后仍在，切换账号不会互相污染。
- 线上页面无横向溢出，搜索和 tag 会正常滚离视口。

## 11. 不在本轮实现范围

- 不新增数据库表、D1 migration 或兼容层。
- 不把顶部分页配置同步到家庭成员或其他设备。
- 不改变日记搜索、tag 匹配和筛选业务规则。
- 不重新设计全部顶部栏、品牌区或通知弹窗。
- 不恢复默认“心情”顶部入口。
- 不直接修改 `dist/`、Service Worker 缓存清单或线上压缩 CSS。
- 不在本次规划阶段修改任何功能代码或部署。

## 12. 完成定义

只有同时满足以下条件，后续实现任务才能标记完成：

1. “关闭这台设备”在设置页首次懒加载后可点击，并真正取消本机 subscription。
2. 远端清理失败不会阻止本机关闭，且用户看到明确结果。
3. 搜索栏和全部 tag 随页面滚走，不再挤占日记阅读视口。
4. 顶部导航没有空白轨道，宽度随实际启用项自适应。
5. 用户可在设置中启用、隐藏和排序允许的顶部分页，刷新后保持。
6. 日记固定存在，VLOG 仍是 mode，心情仍从概览日历 CTA 进入。
7. 手机、横屏、大字号、键盘、明暗主题和无障碍门禁通过。
8. 代码、测试、长期文档和生产 hash 记录一致。

