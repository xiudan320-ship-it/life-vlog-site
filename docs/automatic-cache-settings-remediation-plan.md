# 自动缓存设置失效修复规划

> 状态：已实施（2026-09-02）。本文记录“设置 → 存储与数据”页面的审计、修复边界与验收标准；代码已完成本地验证，未部署上线。

## 1. 用户反馈与可见现象

用户在“设置 → 存储与数据”页面遇到以下问题：

1. 点击“自动缓存”行后，页面仍显示“已关闭”，看起来完全没有响应。
2. “缓存容量上限”显示为“日记 undefined MB · 秘藏 undefined MB”。
3. 同一页面的缓存占用统计能够正常显示，例如“日记 11 项 / 100 MB · 秘藏 0 项 / 300 MB”，说明底层缓存服务、容量默认值和统计读取并非整体失效。

第 2、3 点形成了关键对照：容量数据在离线缓存控制器内部可正常读取，但设置摘要使用了另一条尚未接通的读取路径。

## 2. 审计结论

### 2.1 已确认的直接根因

这不是按钮被遮挡、被禁用或 CSS `pointer-events` 阻断。`#mediaCachePolicyButton` 是原生 `button`，样式层没有对它禁用点击。

问题来自设置摘要和离线缓存模块之间的运行时桥接遗漏：

- `modules/layout-settings-controller.js` 的 `renderSettingsSummary()` 同时负责渲染缓存容量和自动缓存状态，并通过 `loadCacheCapacityMb()`、`loadMediaCachePolicy()` 读取数据。
- `modules/app-runtime-shell-assembly.js` 使用 `defer("loadCacheCapacityMb")` 和 `defer("loadMediaCachePolicy")` 从 `core` 取这两个动作。
- 但 `modules/app-runtime-controller-assembly.js` 创建 shell runtime 时传入的 `core` 对象没有提供这两个动作。
- 因此两个 defer 调用返回 `undefined`：容量摘要直接拼出 `undefined MB`；自动缓存状态判断 `undefined === "wifi"` 永远为假，所以每次重绘都显示“已关闭”。

### 2.2 为什么用户感觉“按钮没法按”

`modules/cache-management-view.js` 中已经存在自动缓存按钮的点击监听。监听会在 `wifi` 与 `off` 之间切换并保存偏好，但保存后会触发设置摘要重绘。由于重绘仍从上述悬空桥接读取 `undefined`，视觉状态马上又被画成“已关闭”。

因此当前故障可能是“偏好已切换、界面却没有反映”，而不只是没有监听器。这种状态与视图不一致比单纯按钮失效风险更高：用户可能反复点击，实际偏好被来回切换，却无法知道最终状态。

### 2.3 结构性原因

缓存 UI 的职责目前分散在三处：

- `layout-settings-controller.js` 渲染缓存摘要；
- `offline-settings-controller.js` 管理容量弹窗、下载与清理；
- `cache-management-view.js` 修改 DOM 并安装部分事件监听。

这使一个缓存设置既依赖 shell 早期装配，又依赖 settings route 懒加载完成，产生了容易漏接的跨层桥接。只在 `core` 临时补两个函数虽然能消除当前表象，但会继续保留职责错位和下一次重构复发的条件。

## 3. 修复目标

### P0：恢复可信交互

- 自动缓存按钮每次点击只发生一次状态切换。
- 状态立即在同一行更新为“Wi-Fi · 最新 20 条”或“已关闭”。
- 成功反馈与最终持久化状态一致；不得出现 toast 说已开启但行内仍显示已关闭。
- 刷新页面、关闭后重新打开设置，状态与该用户在这台设备上的持久化值一致。

### P0：消除非法展示值

- 容量上限始终显示经过 `normalizeCacheMb()` 归一化后的有限整数。
- 默认显示日记 100 MB、秘藏 300 MB；用户保存自定义值后显示实际值。
- 任何路径都不得把 `undefined`、`null`、`NaN` 或空字符串拼进 UI。

### P1：收敛职责与生命周期

- 离线设置模块成为缓存设置状态、渲染和交互的唯一业务拥有者。
- `layout-settings-controller.js` 不再读取或解释缓存容量、缓存策略。
- settings route 初始化完成后显式初始化缓存设置 UI；重复打开设置不得重复绑定事件。
- 不引入兼容层、双数据源或临时 fallback；删除失效的旧桥接。

## 4. 目标设计

### 4.1 单一状态契约

离线缓存控制器继续保留已有领域接口：

- `loadCapacityMb(type, userId)` → 有限整数 MB；
- `saveCapacityMb(type, value, userId)` → 已归一化的有限整数 MB；
- `loadPolicy(userId)` → 严格为 `"wifi" | "off"`；
- `savePolicy(policy, userId)` → 保存后的 `"wifi" | "off"`。

视图层不自行读取 localStorage，也不猜默认值。所有容量和策略展示都从上述接口生成一个明确的 view model，例如：

```js
{
  diaryCapacityMb: 100,
  secretCapacityMb: 300,
  policy: "off",
  policyLabel: "已关闭",
  policyHelp: "只通过下面按钮手动下载"
}
```

不得保留旧字段别名或为 `undefined` 增加显示层 fallback；如果调用链没有提供领域接口，测试应直接失败。

### 4.2 单一 UI 拥有者

在 `offline-settings-controller.js` 中增加或收敛以下职责：

- `renderSummary()`：读取容量与策略，生成 view model，并交给 view 渲染；
- `toggleAutoCache()`：读取当前策略、计算下一状态、持久化、重绘并反馈；
- `initialize()`：幂等地绑定缓存设置事件，并执行首次渲染。

`cache-management-view.js` 只做 DOM 渲染和原生事件绑定所需的视图操作，不直接拥有策略决策。若继续保留 `configureCacheManagementUi()`，需把其中的业务切换逻辑移交 controller，名称也应反映其真实职责。

`layout-settings-controller.renderSettingsSummary()` 继续负责外观、昵称、家庭等通用设置摘要，但删除缓存容量、缓存策略和 `ensureCacheManagementUi()` 的职责及依赖。

### 4.3 明确初始化顺序

settings route 的预期闭环：

1. 挂载设置模板并收集元素；
2. 创建 family、offline settings、data safety 控制器；
3. 绑定 settings route 事件；
4. 显式调用 offline settings `initialize()`；
5. 打开设置 dialog 前完成首次摘要渲染；
6. 每次进入“存储与数据”时仅刷新统计与当前摘要，不重复安装监听。

初始化不得依赖“某个账户同步流程碰巧调用了全局 `renderSettingsSummary()`”。

### 4.4 交互与无障碍

“自动缓存”继续使用原生 `button`，整行均可点击，保持现有最小触控面积。补充：

- 用 `aria-pressed="true|false"` 暴露开关状态；
- 状态切换后保持焦点在原按钮，不跳转、不关闭设置；
- 视觉 pressed/focus 状态不改变布局尺寸；
- 行内状态是主要反馈，toast 只做辅助反馈且不抢焦点；
- 键盘 Enter/Space 与指针点击行为一致；
- 若未来保存变为异步，只在进行中使用真实 `disabled` 和忙碌提示，结束后在 `finally` 恢复。

本轮不新增新的“自动缓存模式”或设置弹窗，仍只支持现有的 `Wi-Fi` 与 `关闭` 两态。

## 5. 实施步骤

### 阶段 A：先建立失败回归

1. 新增离线设置 controller/view 的确定性单元 fixture。
2. 复现当前首开设置时容量为 `undefined` 的情况。
3. 复现点击自动缓存后持久化值与行内状态不一致的情况。
4. 断言同一 UI 初始化两次时一次点击仍只切换一次，防止重复监听。

### 阶段 B：收归缓存设置职责

1. 将容量与策略摘要渲染从 `layout-settings-controller.js` 移到离线设置 controller/view。
2. 将自动缓存切换决策从 `cache-management-view.js` 移到 controller。
3. 使用单一 view model 更新 `#settingsCacheLimitValue` 与 `#mediaCachePolicyButton`。
4. 设置 `aria-pressed`，保持行内标题、状态与帮助文案结构稳定。

### 阶段 C：修正 route 生命周期

1. 在 settings route 控制器创建、元素收集和事件绑定完成后执行幂等初始化。
2. 移除 shell/layout 对缓存状态的悬空 defer 依赖。
3. 移除不再需要的 `ensureCacheManagementUi` 跨层桥接及无效装配参数。
4. 保留现有用户/设备作用域 storage key，不迁移、不复制旧值。

### 阶段 D：状态刷新闭环

1. 切换策略后使用 `savePolicy()` 的返回值作为本次重绘事实。
2. 容量保存后使用 `saveCapacityMb()` 返回值更新行内摘要，再刷新缓存统计。
3. 账户切换或重新打开设置时，以当前 user id 重新读取状态。
4. 清除离线内容不得重置自动缓存策略或容量偏好，除非产品另行明确要求。

### 阶段 E：文档同步

代码实施时必须同步：

- `CHANGELOG.md` 的 `[Unreleased] → Fixed`；
- 若模块职责按本规划移动，更新 `docs/MODULE_MAP.md`；
- 若运行时装配/缓存数据流发生变化，更新 `docs/TECHNICAL_OVERVIEW.md`；
- 如果形成新的全局设置开关规范，再更新设计系统；仅修复既有模式时不扩写全局规范。

## 6. 测试矩阵

所有测试使用确定性内存 fixture，不使用真实账号、token 或线上业务数据。

### 6.1 单元/模块测试

- 无已保存容量：显示 100 MB / 300 MB。
- 已保存合法容量：显示保存值。
- 存储中为非法值：领域归一化后返回默认/边界值，UI 不出现非法文本。
- policy 为 `off`：显示“已关闭”，`aria-pressed=false`。
- policy 为 `wifi`：显示“Wi-Fi · 最新 20 条”，`aria-pressed=true`。
- 从 off 点击一次变 wifi；从 wifi 点击一次变 off。
- 重复 initialize 两次后点击一次，只调用一次 `savePolicy()`。
- 保存容量后策略不变；清除缓存内容后策略与容量偏好不变。

### 6.2 浏览器回归

在现有 Playwright 伪会话与 Cloudflare API fixture 中增加存储设置场景：

1. 首次打开设置，进入“存储与数据”。
2. 断言页面不包含 `/undefined|NaN|null/`。
3. 点击自动缓存，断言 localStorage、行内状态与 `aria-pressed` 同步。
4. 关闭并重开设置，断言状态保持。
5. 刷新页面后重开，断言状态保持。
6. 连续快速点击两次，最终回到原状态且没有重复监听导致的额外切换。
7. 检查无 page error、未处理 promise rejection 和重复 toast。

视口至少覆盖：390×844 手机、844×390 短横屏、768×1024 平板、1440×900 桌面。键盘测试覆盖 Tab 聚焦以及 Enter/Space 切换；Axe 扫描不得新增阻塞项。

### 6.3 建议命令

实施完成后至少运行：

```text
pnpm run check
pnpm run test:unit
pnpm run test:static
pnpm run test:browser
pnpm run test:a11y
pnpm run build
pnpm run test:build
```

若修改了缓存/PWA 路径，再补跑 `pnpm run test:release`，并按发布清单验证生产构建；没有通过全部相关门禁不得上线。

## 7. 验收标准

- [x] 页面首次打开不出现 `undefined MB`、`NaN`、空状态或短暂错误覆盖最终状态。
- [x] 自动缓存整行可用鼠标、触摸、Enter 和 Space 操作。
- [x] 一次操作只切换一次，行内状态、toast、`aria-pressed` 与持久化值完全一致。
- [x] 关闭设置、重新打开和页面刷新后状态正确恢复。
- [x] 容量弹窗保存后摘要立即更新，且两个容量都为有限整数。
- [x] 手机、横屏、平板、桌面均无截断、横向溢出或点击区域缩小。
- [x] 重复初始化不重复监听；无控制台错误和未处理异常。
- [x] `layout-settings-controller.js` 不再拥有缓存策略/容量的业务读取。
- [x] 无兼容层、旧字段别名、双写或显示层 fallback。
- [x] 相关测试、文档、变更日志和构建门禁全部通过后才允许部署。

## 8. 非目标

本轮不做以下扩展：

- 不新增“蜂窝网络自动缓存”“充电时缓存”等策略。
- 不改变当前日记 100 MB、秘藏 300 MB 的默认容量。
- 不改变 Wi-Fi 自动缓存最新 20 条日记的业务规则。
- 不迁移或清除用户现有缓存、容量偏好和策略偏好。
- 不重做整个设置页视觉设计。
- 不在本规划范围内重做其他功能代码或部署上线。

## 9. 执行交接摘要

执行者应先以失败测试证明两件事：缓存摘要读取了未注入的 shell 动作，以及策略保存后的重绘永远把状态判为关闭。随后把缓存摘要、策略切换和初始化生命周期统一收归离线设置模块，删除 layout settings 中的缓存职责。不要只在 runtime `core` 上补两个函数结束任务；那只能修当前表象，无法消除职责分散和懒加载时序复发风险。

## 10. 实施记录（2026-09-02）

- 状态：已实施并完成本地门禁验证；未部署。
- 根因：`layout-settings-controller` 通过 shell `defer` 读取未注入的容量/策略动作，导致摘要拼接 `undefined MB`，策略重绘永远回到“已关闭”。设置路由懒加载及重复绑定也放大了状态与视觉不一致。
- 实施：缓存摘要、`off|wifi` 切换、容量弹窗、下载/清理事件和幂等初始化统一进入 `offline-settings-controller`；`cache-management-view` 仅负责 DOM 渲染/事件转发；删除 layout 与 shell 的缓存桥接；settings route 在通用事件绑定后显式初始化缓存设置，并在关闭移动设置时清理 section 状态。
- 回归：新增 `tests/offline-settings-controller.mjs` 先证明未实现时失败，再覆盖有限容量、策略文案、`aria-pressed`、持久化和重复初始化；`tests/browser-regression.mjs` 覆盖 390×844、844×390、768×1024、1440×900、刷新/重开、键盘和快速点击。
- 已通过：`pnpm run check`、`pnpm run test:unit`（116 tests）、`pnpm run test:static`、`pnpm run test:structure`、`pnpm run build`、`pnpm run test:build`、`pnpm run test:coverage`、`pnpm run test:browser`、`pnpm run test:a11y`，以及本地确定性 fixture 的 `pnpm run test:release`。
