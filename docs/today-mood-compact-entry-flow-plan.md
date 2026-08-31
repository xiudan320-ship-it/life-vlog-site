# 今日心情单行概览与原地详情流程规划

> 状态：本地实现与核心门禁通过，待生产发布
> 规划日期：2026-08-31
> 优先级：P0
> 实施方式：Luna Max 独立工作树实现；完成后由新的 Sol Medium 工作树审计并整合；父线程完成最终门禁与生产发布。

## 1. 用户目标

本轮只优化已上线的今日心情入口，不改变心情数据、八种心情、家庭席位、编辑删除权限或日历功能。

完成后应满足：

1. 手机端今日概览中的两位成员始终显示在同一行，不再形成两张高卡片或占据两行。
2. 心情图标显著缩小，但整个成员席位仍有舒适的触控区域。
3. 顶部主导航删除“心情”分页；心情日历只从今日概览的“查看心情日历”进入。
4. 点击已记录的今日心情，在当前 gallery / 今日概览上下文直接打开既有心情详情。
5. 关闭详情后仍停在今日概览原滚动位置，不跳转到心情主页面。
6. 当前用户未记录时，点击自己的席位也在当前页面打开既有 Picker / 编辑器，不先切换心情页面。
7. 只有“查看心情日历”按钮可以执行 `switchPage("mood")`。

## 2. 当前实现与问题

### 2.1 手机概览过高

`styles/redesign-foundation.css` 当前让每个 `.today-mood-seat` 最小高度达到 250px，手机覆盖仍为 230px；素材宽度桌面最高 160px、手机 112px。两席虽然使用两列 grid，但每席内部为纵向布局，视觉上占用接近两行内容高度。

### 2.2 顶部存在重复入口

`index.html` 的 `.main-nav` 仍包含 `#moodNav`，`app-event-bindings.js`、`app-navigation-controller.js` 和静态测试也保留对应绑定与状态。今日概览已经具备“查看心情日历”入口，因此顶部入口重复且挤占手机导航。

### 2.3 详情依赖先切路由

`today-mood-controller.js` 的 `openSeat()` 当前先调用 `switchPage("mood")`，等待心情路由激活后再派发 `open-today`。因此即便用户只是查看一条今日心情，底层页面也已经切成心情主页面；关闭 overlay 后自然留在心情页，而不是回到今日概览。

现有 overlay 结构又位于 `mood-diary-page` 内部，不能简单在隐藏父级中打开。修复必须把“心情条目 overlay”变成可被 gallery 和 mood route 共用的独立能力。

## 3. 最终交互契约

### 3.1 手机单行布局

在 `max-width: 700px` 下：

- `.today-mood-grid` 保持两列、单行：`repeat(2, minmax(0, 1fr))`。
- 每个席位改为紧凑横向排列：左侧素材，右侧昵称与心情文案。
- 心情素材建议视觉尺寸 48–56px，不得超过 64px；方形/圆形规则不变。
- 整个席位最小高度不低于 72px，整体仍是一个可点击按钮，触控区域大于 44×44px。
- 两席之间至少 8px 间距；席位内部图文间距 8–10px。
- 昵称与心情各自单行省略，完整昵称继续通过 `title` / 可访问名称提供。
- 已记录席位的次要文案可以缩为“查看详情”；本人空席保留“添加心情”；对方空席保留“未记录”。
- 375px、390px、430px 和 844×390 下不得换成上下两行，也不得产生页面横向滚动。
- 130% / xlarge 字号下仍保持两席单行；允许省略次要文案或文本 ellipsis，不缩小正文到不可读字号。
- loading skeleton 与 error 状态使用同一最终高度，避免 CLS。

桌面与平板可保留现有较宽松布局；不得因手机紧凑规则把桌面素材一并缩成小图标。

### 3.2 顶部入口删除

直接删除：

- `index.html` 的 `#moodNav`。
- `app-event-bindings.js` 的 `moodNav` click 绑定。
- `app-navigation-controller.js` 的顶部 mood active / `aria-current` 同步项。
- 只服务该按钮的 element 映射、CSS 和测试断言。

保留：

- `mood` 路由注册、深链接解析和浏览器返回能力。
- 今日概览的 `#overviewMoodCalendar`。
- 其他内部需要返回心情日历的操作。

移除顶部按钮不等于删除心情页面；`?page=mood` 深链接仍应工作。

### 3.3 入口行为矩阵

| 操作 | 页面是否切换 | 打开的内容 | 关闭后的结果 |
| --- | --- | --- | --- |
| 点击本人已记录席位 | 否 | 本人今日详情，可继续既有编辑/删除 | gallery 保持可见，恢复原滚动与席位焦点 |
| 点击对方已记录席位 | 否 | 对方今日详情，只读权限不变 | gallery 保持可见，恢复原滚动与席位焦点 |
| 点击本人未记录席位 | 否 | 既有八种心情 Picker → 编辑器 | 保存/取消后仍在概览，并刷新当天状态 |
| 点击对方未记录席位 | 否 | 不打开任何内容 | 普通信息卡，不伪装成按钮 |
| 点击“查看心情日历” | 是 | `switchPage("mood")` | 正常进入心情日历 |

任何席位点击都不得修改 URL 为 `?page=mood`、不得隐藏 gallery，也不得先切路由后伪装返回。

## 4. 推荐架构

### 4.1 抽取共享条目 overlay

把当前 `mood-diary-controller.js` 中与月历/历史无关的 Picker、Editor、Detail、保存、删除、脏表单确认、焦点和 overlay history 逻辑抽成独立模块，供首页和心情页面复用。

建议职责：

#### `modules/mood-entry-overlay-controller.js`

- 管理 picker / editor / detail 三种 overlay 状态。
- 接收当前日期、两席 entries、preferredUserId、currentUserId 和 participants。
- 使用既有 `mood-diary-repository.js` 完成 upsert/update/remove。
- 保留本人可编辑删除、对方只读、标签、错误回滚和脏表单确认。
- 管理 overlay history、Escape/backdrop/关闭按钮、焦点循环与触发器焦点恢复。
- 通过 `onMutation` 把成功保存/编辑/删除通知 today controller 和已加载的 mood calendar controller。
- 不负责 `switchPage`，不决定 gallery / mood 页面显隐。

#### `modules/mood-entry-overlay-view.js`

- 持有现有 picker/editor/detail 的 DOM 渲染和事件委托。
- 只渲染 overlay，不渲染月历或历史列表。
- overlay host 必须是应用外壳级节点，不得继续嵌套在隐藏的 `#moodPage` 中。

#### 全局 overlay 模板

- 把 `#moodOverlay` 及其 picker/editor/detail 子树从 `modules/routes/templates/mood-diary.html` 移到全局可用的独立模板或应用外壳节点。
- 允许在第一次点击今日席位或第一次进入心情路由时懒加载 overlay 模块与样式。
- 禁止复制第二套详情、Picker 或编辑表单。
- 禁止把 overlay 临时 append 到 body 后再塞回隐藏 route，避免焦点、样式和生命周期漂移。

### 4.2 月历控制器职责

`mood-diary-controller.js` 继续只负责：

- 当前月、月份读取与缓存。
- 日历网格与历史列表。
- 席位排序与选择日期。
- 把选中的日期和 entries 交给共享 overlay controller。
- overlay mutation 后更新月历/历史 canonical state。

删除已抽取的重复 overlay 状态和事件，不保留旧实现或兼容层。

### 4.3 首页控制器职责

`today-mood-controller.js`：

- `openSeat()` 不再调用 `switchPage("mood")`。
- 已记录席位直接懒加载共享 overlay，并传入 today entries 与 preferred user。
- 本人空席直接打开共享 Picker。
- overlay 关闭时不调用导航，只恢复触发席位焦点和之前的 scrollY。
- 保存/编辑/删除成功后调用既有 `refresh()`；请求仍保持 latest-wins。
- `openCalendar()` 是此模块中唯一允许调用 `switchPage("mood")` 的路径。

## 5. 返回、历史与滚动

- 打开 overlay 前记录当前触发元素与 scrollY，但不创建页面路由记录。
- overlay 可以写入自身的轻量 history state，使手机系统返回键优先关闭 overlay；不得改变 `page` query。
- 关闭按钮、遮罩、Escape 和系统返回得到同一结果。
- overlay 关闭后：
  - `state.activePage` 仍是 `gallery`；
  - `#overview` 仍可见；
  - URL 不含新加入的 `page=mood`；
  - scrollY 与打开前误差不超过 2px；
  - 焦点回到原席位按钮。
- 编辑中关闭仍执行现有脏表单确认；取消确认时 overlay 保持打开。
- 从心情日历内部打开详情时，关闭后仍回到心情日历原位置，不能统一跳 gallery。

## 6. 数据同步边界

- 首页已有 `listDay()` 数据足够打开当天详情，不应为了展示详情再次读取整月。
- 保存/编辑/删除仍使用同一个 repository 和权限边界。
- overlay mutation 后：
  - today controller 刷新单日；
  - mood calendar controller 若已加载，更新或失效其月份快照；
  - 若未加载，不为同步而预加载完整心情路由。
- 不新增数据库字段、Worker API、migration、轮询或全局 DOM 自定义事件。

## 7. 预计修改文件

| 文件 | 修改 |
| --- | --- |
| `index.html` | 删除 `#moodNav`；提供全局 overlay host 或挂载点。 |
| `modules/app-event-bindings.js` | 删除顶部 mood 绑定。 |
| `modules/app-navigation-controller.js` | 删除顶部 mood 选中态同步，保留 mood route。 |
| `modules/app-elements.js` / 路由 collect | 删除 stale moodNav 映射，接入共享 overlay 元素。 |
| `modules/today-mood-controller.js` | 席位原地打开共享 overlay；仅 calendar CTA 切路由。 |
| `modules/today-mood-view.js` | 保持正确的按钮/信息卡语义及紧凑文案。 |
| `modules/mood-entry-overlay-controller.js` | 新增共享 overlay 领域编排。 |
| `modules/mood-entry-overlay-view.js` | 新增共享 picker/editor/detail view。 |
| `modules/mood-diary-controller.js` | 保留月历/历史并委托共享 overlay，删除重复逻辑。 |
| `modules/mood-diary-view.js` | 保留月历/历史 view，移出条目 overlay 渲染。 |
| `modules/routes/templates/mood-diary.html` | 移除嵌套 overlay。 |
| `modules/routes/mood-diary-route.js` / runtime assembly | 为两种入口装配同一个懒加载 overlay。 |
| `styles/redesign-foundation.css`、`styles/redesign-components.css` | 手机双席单行紧凑布局、骨架与状态；删除 stale 顶部入口样式。 |
| `styles/mood-diary.css` | 共享 overlay 样式作用域与 route 页面样式分离。 |
| 单元/浏览器/release/a11y 测试 | 覆盖原地详情、唯一路由入口、滚动焦点和单行指标。 |

具体拆分可根据实际依赖图微调，但必须保持“一套 overlay、两个调用方、只有 calendar CTA 导航”的契约。

## 8. 自动化验收

### 8.1 静态与结构

- `index.html` 不存在 `id="moodNav"`。
- `app-event-bindings.js` 不绑定 `moodNav`。
- mood route 仍注册且 `?page=mood` 可直达。
- Picker/editor/detail 只有一套模板和一套持久化控制器。
- `today-mood-controller.js` 的 seat 路径不调用 `switchPage("mood")`；只有 `openCalendar()` 调用。

### 8.2 手机布局

在 375×812、390×844、430×932、844×390：

- 两个席位的 `getBoundingClientRect().top` 误差不超过 2px。
- 今日心情 grid 不换行，页面无横向溢出。
- 每个素材宽高不超过 64px。
- 每个席位触控框宽高均至少 44px。
- 两席区域总高度建议不超过 112px；loading/error 不超过最终布局高度。
- light/dark、130%/xlarge 字号、reduced-motion 通过。

### 8.3 原地详情流程

1. gallery 今日概览点击本人已记录席位：overlay 打开，`activePage === "gallery"`，URL 不变，mood page 未显示。
2. 关闭详情：overlay 关闭，gallery/overview 可见，scrollY 误差 ≤2px，焦点回到本人席位。
3. 点击对方已记录席位：显示对方详情且没有编辑删除权限；关闭同样返回概览。
4. 点击本人空席：原地打开 Picker，选择、保存后不切页且席位更新。
5. 编辑/删除本人当天记录后不切页，概览刷新。
6. 加载失败保留原上下文并可重试。
7. 点击“查看心情日历”：唯一一次切换到 mood route，日历正常显示。
8. 从 mood 日历打开/关闭详情：仍返回 mood 日历，不跳 gallery。
9. 浏览器返回键优先关闭 overlay，不破坏 gallery/mood 的页面历史。

### 8.4 必跑门禁

```powershell
pnpm install --frozen-lockfile
pnpm test

# 固定 preview 启动后
pnpm run test:a11y
pnpm run test:release
pnpm run test:build
git diff --check
```

全部使用确定性内存 fixture，不使用真实账户、token 或业务数据。

## 9. 文档同步

实现必须同步：

- `CHANGELOG.md` `[Unreleased]`。
- `docs/MODULE_MAP.md`：共享 overlay、today controller 与 mood calendar controller 职责。
- `docs/TECHNICAL_OVERVIEW.md`：路由无关 overlay、单日/月份同步和 history 契约。
- `docs/release-checklist.md`：手机单行、唯一入口、关闭返回上下文验收。
- `design-system/life-vlog/pages/mood-diary.md` 或相应 gallery override：记录长期紧凑双席和 overlay 返回规则。

## 10. 子线程交付顺序

1. Luna Max 从当前 main 建立独立 worktree，按本规划实现、测试并提交；禁止部署。
2. Luna 完成后父线程自动收到完成事件。
3. 父线程新建 `gpt-5.6-sol`、`medium` 审计 worktree，从当前 main 开始，读取 Luna commit 并负责：
   - 代码审查；
   - 合并 / cherry-pick Luna commit；
   - 解决冲突；
   - 修正审计发现；
   - 运行完整本地门禁；
   - 提交审计后的整合结果；
   - 禁止部署。
4. Sol 完成后父线程再次自动收到完成事件，复核工作树、运行最终发布门禁并部署固定 preview/production。

## 11. 完成定义

- 手机今日心情两席为一行紧凑布局，图标不超过 64px且没有横向溢出。
- 顶部主导航不再出现“心情”。
- 只有“查看心情日历”会切换 mood route。
- 今日席位详情、Picker、编辑和删除均在概览原地完成，关闭后恢复滚动与焦点。
- 日历页继续复用同一套 overlay，现有功能无回退。
- 没有隐藏路由 hack、重复详情/编辑实现、兼容层或全局事件总线。
- Luna 实现提交、Sol Medium 审计整合提交、父线程最终门禁与线上回归全部通过。
