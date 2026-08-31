# 今日心情概览与启动定位改造规划书

> 状态：已实现并部署（2026-08-31）
> 规划日期：2026-08-31
> 适用项目：咻蛋之家 / Life Vlog
> 实施优先级：P0
> 本文记录已完成的实现与验收约束；固定预览和生产发布门禁均已通过。

## 1. 目标

把首页“今日概览”从与当下操作关系较弱的累计统计，改造成进入应用后立即可见、可操作的“今日双人心情”。同时修正心情日历的成员形状和昵称展示，并停止首次打开应用时自动滚到第一篇日记。

完成后的核心体验：

1. 打开或刷新已登录的应用，默认停在“今日概览”的高度。
2. 今日概览直接显示两位固定成员今天的心情。
3. 当前用户今天还没记录时，可从自己的席位一键进入既有心情选择器。
4. 心情日历底部不再显示“家庭成员 1 / 家庭成员 2”，而显示两位成员各自的真实昵称。
5. 固定席位规则改为：成员 1 使用方形素材，成员 2 使用圆形素材。
6. 删除今日概览中的“日记记录、私人菜谱、待实现、成长等级”四张统计卡。

## 2. 范围解释

本规划将“日记记录、私人菜谱、待实现以及等级显示不需要了”解释为：

- 只删除首页 `#overview` 内对应的四张统计卡及其专属更新逻辑。
- 不删除日记、菜谱、心愿、成长等级本身的页面、数据、入口或业务能力。
- 保留今日概览下方现有的“发布日记、添加菜谱、写下心愿、安排周末”快捷操作。
- 顶部等级入口和等级详情仍存在，只是不再占用今日概览区域。

不在本轮范围内：

- 不修改 D1 schema、Worker 权限或 `mood_diaries` 每人每天一条的约束。
- 不新增第二套心情编辑表单。
- 不改变八种心情、正文、标签、编辑、删除和历史列表能力。
- 不引入新依赖，不在 `app.js` 中增加业务逻辑。

## 3. 已确认的当前实现

### 3.1 今日概览

`index.html` 的 `#overview` 当前包含四张统计卡：

- `#overviewPhotos`：日记记录。
- `#overviewRecipes`：私人菜谱。
- `#overviewWishes`：待实现。
- `#overviewLevelButton` / `#overviewLevel` / `#overviewProgress`：成长等级。

`modules/app-navigation-controller.js` 的 `renderOverview()` 同时读取日记、菜谱、心愿和经验值，并更新以上四块。菜谱、心愿、等级和日记加载流程仍会调用这个旧概览渲染函数。

### 3.2 心情成员席位

`modules/mood-diary-controller.js` 当前规则与新要求相反：

- 家庭创建者：圆形。
- 最早加入的另一位成员：方形。
- 单人状态：圆形。

`modules/routes/templates/mood-diary.html` 的底部图例是静态文字“家庭成员 1 / 家庭成员 2”，没有绑定昵称。

### 3.3 首次打开后的自动滚动

`modules/diary-gallery-view.js` 在首次渲染日记列表时主动调用第一张 `.photo-media` 的 `scrollIntoView()`，因此启动后会离开今日概览并跳到日记内容。

`modules/app-navigation-controller.js` 已经负责跨页面滚动记忆、返回恢复和标题焦点，因此新的启动定位应在导航层完成，不能在日记视图中再保留第二套自动滚动。

## 4. 最终产品规则

### 4.1 稳定成员席位

建立唯一的纯领域函数来解析两位可见成员，心情页面和今日概览必须共同使用，禁止各自复制一套排序规则。

固定规则：

| 席位 | 成员选择 | 素材形状 | 排序 |
| --- | --- | --- | --- |
| 成员 1 | 家庭创建者；没有家庭时为当前用户 | `square` 方形 | 第一位 |
| 成员 2 | 除创建者外 `joined_at` 最早的成员 | `circle` 圆形 | 第二位 |

补充约束：

- 如果只有一个用户，只显示成员 1，使用方形素材。
- 当前产品仍只展示前两位稳定成员；第三位及以后不进入心情日历和今日概览。
- 数据排序、日历同日排序、详情切换顺序都使用同一个席位索引。
- 形状是成员身份提示之一，但昵称和文本必须同时存在，不能只靠形状或颜色表达身份。
- 修改既有测试中“owner circle / member square”的旧断言，不保留兼容逻辑。

### 4.2 昵称规则

心情日历底部图例和今日概览中的每个席位，显示该席位对应用户的真实昵称：

1. 当前登录用户使用 `getSessionDisplayName()` / `getAuthorName(currentUserId)`。
2. 另一位成员使用家庭成员资料中的 `username`，继续通过现有 `getAuthorName(userId)` 统一解析。
3. 资料同步尚未完成时显示固定宽度骨架或 `…`，不得重新显示“家庭成员 1 / 家庭成员 2”。
4. 昵称更新后应重新渲染两个位置，不需要刷新页面。
5. 长昵称单行省略，但完整昵称放入 `title` 或可访问名称中。

### 4.3 今日概览信息结构

删除四张旧统计卡后，`#overview` 改为一张“今日心情”主卡。推荐结构：

```text
今日概览                                      查看心情日历
今天 · 8 月 31 日

┌──────────────────┐  ┌──────────────────┐
│  方形心情图       │  │  圆形心情图       │
│  成员 1 昵称      │  │  成员 2 昵称      │
│  开心 / 还没记录  │  │  平静 / 今日未记录│
│  添加今日心情     │  │                  │
└──────────────────┘  └──────────────────┘

发布日记  添加菜谱  写下心愿  安排周末
```

手机端可以保持两列，但在 375px、130% 字号或长昵称下不得挤压；空间不足时改为上下两张，不允许横向滚动。桌面端仍限制在现有首页内容宽度内，不扩大为全屏仪表盘。

### 4.4 每个席位的状态

#### 已记录

- 显示该成员对应形状的今日心情图、心情名称和昵称。
- 点击当前用户的已记录席位：进入心情页面并打开今日详情，可继续编辑或删除。
- 点击另一位成员的已记录席位：进入心情页面并打开对方的今日详情。
- 可访问名称示例：`小秀今天的心情：开心，查看详情`。

#### 当前用户未记录

- 显示当前用户昵称、对应形状的安静占位状态和明确按钮“添加今日心情”。
- 点击后切换到心情页面，等待懒加载路由完成，再调用现有 `open-today` 流程打开八种心情 Picker。
- 不在首页复制 Picker 或编辑器。
- 可访问名称示例：`小秀今天还没有记录心情，添加今日心情`。

#### 另一位成员未记录

- 显示昵称和“今天还没记录”。
- 不提供代替对方记录的按钮，也不把整张卡做成无效按钮。
- 保持普通信息卡语义，避免出现看似可点但没有动作的状态。

#### 加载中

- 为两张席位卡预留最终高度，显示静态骨架，避免心情返回后导致首页跳动。
- 骨架不进入无障碍树；区域使用单一 `aria-live="polite"` 状态文本说明“正在加载今日心情”。

#### 加载失败 / 离线

- 保留昵称和席位，不清空整个今日概览。
- 显示“今日心情暂时无法同步”和一个 44×44px 以上的“重试”按钮。
- 不伪造空状态，不把网络失败错误显示成“还没记录”。

### 4.5 快捷添加与路由交接

首页快捷添加必须复用心情路由的现有流程：

1. 用户点击自己的“添加今日心情”。
2. `switchPage("mood")` 加载并激活心情路由。
3. `mood-diary-route.activate()` 返回并等待 `controllers.moodDiary.activate()` 的 Promise，而不是 `void` 丢弃。
4. 路由完成当月数据加载后，执行 `dispatch({ type: "open-today" })`。
5. 如果今天已有本人记录，打开详情；没有记录才打开 Picker。
6. 关闭弹层后仍停留在心情页面，不自动跳回首页。

保存、编辑或删除今日记录后，心情控制器通过注入的 `onMutation` 回调通知今日概览刷新；不使用全局 DOM 自定义事件，也不轮询。

### 4.6 启动定位

新的默认启动行为只应用于“已登录用户的 gallery 冷启动”：

- 页面首次打开、PWA 冷启动或普通刷新，且 URL 没有指定其他页面、日记详情或通知目标时，定位到 `#overview`。
- 定位使用 `behavior: "auto"` / `"instant"`，不在启动阶段播放长距离平滑滚动。
- `#overview` 设置合适的 `scroll-margin-top`，避开固定顶部栏；键盘焦点不被强制移动。
- 删除 `diary-gallery-view.js` 首次渲染第一张日记的 `scrollIntoView()`。
- 从菜谱、心愿、心情等页面返回 gallery 时，继续恢复用户离开前保存的滚动位置，不强制回今日概览。
- gallery 内刷新筛选、分页、保存/删除日记时不重新定位。
- 未登录时 `#overview` 不显示，继续停留在顶部登录区域。
- 明确深链接、通知跳转和打开指定日记的流程优先于默认启动定位。

实现上由 `app-navigation-controller.js` 持有一次性的 `initialGalleryLandingPending`，在 session 和概览容器可见后通过现有页面过渡调度器完成一次定位；日记视图不再决定页面级滚动。

## 5. 建议模块与职责

### 5.1 新增模块

#### `modules/today-mood-controller.js`

- 管理今日自然日、当前 session、两席成员、今日记录、加载状态和请求 revision。
- 调用 repository 的 `listDay()`，只读取当天数据，不为首页读取整月历史。
- 编排重试、进入心情页面、打开当天详情/Picker，以及保存后刷新。
- 不直接生成 HTML。

#### `modules/today-mood-view.js`

- 渲染两席的加载、已记录、本人未记录、他人未记录和失败状态。
- 生成真实按钮或普通信息卡，保持语义清楚。
- 显示昵称、方/圆素材、心情文本和可访问名称。
- 不发网络请求，不决定成员权限。

#### `tests/today-mood-controller.mjs`

- 使用确定性 session、家庭成员和内存 repository fixture 覆盖当天读取、最新请求胜出、错误态和路由交接。

### 5.2 修改现有模块

| 文件 | 修改内容 |
| --- | --- |
| `index.html` | 删除四张旧统计卡；加入今日心情主卡、两席容器、状态区和“查看心情日历”入口；保留现有快捷操作。 |
| `modules/mood-diary-domain.js` | 增加唯一的两席解析函数；成员 1 方形、成员 2 圆形；供日历和首页共同使用。 |
| `modules/mood-diary-controller.js` | 使用领域席位函数；接受 `onMutation`；保存、编辑、删除成功后通知今日概览。 |
| `modules/mood-diary-repository.js` | 增加按单个自然日读取的 `listDay(dateKey)`；复用现有 row normalization 和 family read 权限。 |
| `modules/mood-diary-view.js` | 动态渲染底部昵称图例；不再依赖模板内静态“家庭成员 1 / 2”。 |
| `modules/routes/templates/mood-diary.html` | 将静态图例替换为可渲染容器。 |
| `modules/routes/mood-diary-route.js` | `activate()` 返回 controller Promise，保证首页快捷入口可以等待路由准备完成。 |
| `modules/app-navigation-controller.js` | 删除旧统计概览逻辑；接管一次性冷启动定位；保留随机回忆和跨路由滚动恢复。 |
| `modules/diary-gallery-view.js` | 删除首次渲染时滚到第一张日记的行为。 |
| `modules/app-event-bindings.js` | 删除概览等级按钮绑定；保留四个既有快捷操作。今日心情卡动作由懒加载 controller 自己绑定。 |
| `modules/app-runtime-route-assembly.js` | 装配今日心情 controller/view/repository，注入 identity、session、family、switchPage 和懒加载心情 controller。 |
| `modules/app-session-controller.js` | session / 家庭资料同步后显式激活或刷新今日心情，不再调用旧统计概览。 |
| `modules/diary-feed-controller.js`、`recipe-controller.js`、`wishlist-controller.js`、`gamification-controller.js` | 删除只为四张旧统计卡服务的 `renderOverview()` 调用和注入，禁止留下空兼容函数。 |
| `styles/redesign-foundation.css`、`styles/redesign-components.css` | 删除旧 overview-grid / progress 专属规则；增加今日心情卡、双席响应式、骨架、错误态和 `scroll-margin-top`。 |
| `tests/mood-diary-domain.mjs`、`tests/mood-diary-controller.mjs` | 将旧 owner-circle 断言改为成员 1-square / 成员 2-circle，并覆盖单人方形。 |
| `tests/browser-regression.mjs`、`tests/mood-diary-browser.mjs` | 增加启动定位、真实昵称、今日心情、快捷添加和返回滚动恢复回归。 |

实施前应再次以实际依赖图核对文件；如果某个旧注入只用于概览统计，应直接删除，不保留空函数或 fallback。

## 6. 数据流

```text
session + familyMembers + identity
                │
                ▼
      resolveMoodParticipants()
      成员1=square / 成员2=circle
                │
                ├──────────────► 心情月历与底部昵称图例
                │
todayKey ──► repository.listDay(todayKey)
                │
                ▼
       today-mood-controller
                │
                ▼
        今日概览双席 view
                │
        点击本人空席/记录
                ▼
 switchPage("mood") → await route.activate()
                │
                ▼
      moodDiary.dispatch(open-today)
```

不新增后端接口。`listDay()` 继续使用现有 `/api/table/mood_diaries` family scope 查询，只把日期条件收窄到当天。

## 7. UI/UX 约束

本规划采用 `ui-ux-pro-max` 的以下已验证规则：

- 空状态必须同时给出解释和可执行动作；因此本人空席显示“添加今日心情”，而不是空白卡。
- 触控控件至少 44×44px，邻近操作间距至少 8px。
- 状态不能只由方形/圆形或颜色表达，必须有昵称和心情文字。
- 异步内容预留尺寸，避免概览加载完成时产生 CLS。
- 固定顶部栏存在时使用 `scroll-margin-top` / `scroll-padding-top`，避免定位目标和键盘焦点被遮挡。
- 深浅色均使用现有语义 token，不新增散落硬编码色值。
- reduced-motion 下不播放平滑启动滚动或骨架位移动画。
- 心情 PNG 是内容图，但旁边已有完整昵称与心情文字时可使用空 `alt`，避免屏幕阅读器重复朗读。

## 8. 测试与验收

### 8.1 单元测试

- 创建者稳定为成员 1 / 方形。
- 最早加入的非创建者稳定为成员 2 / 圆形。
- 单人状态为成员 1 / 方形。
- 第三位成员不会进入两席结果。
- `listDay()` 只查询目标日期，拒绝非法日期。
- session 切换、连续刷新和过期响应不会串用户或覆盖最新状态。
- 网络错误与真实空数据进入不同状态。
- 本人空席可打开新增流程；他人空席没有写入动作。
- 保存、编辑、删除今天记录会触发一次概览更新。

### 8.2 浏览器回归

使用确定性内存 fixture，不使用真实账号：

1. 已登录冷启动后，`#overview` 顶部位于固定导航下方的可见区域，第一张日记没有被自动滚入视口。
2. 成员 1 昵称旁显示方形素材，成员 2 昵称旁显示圆形素材。
3. 心情页面底部显示两个真实昵称，不出现“家庭成员 1 / 家庭成员 2”。
4. 两人都已记录、仅本人已记录、仅对方已记录、两人都未记录四种组合正确。
5. 本人未记录时点击一次进入心情 Picker；保存后返回首页可见新心情。
6. 已记录席位打开正确成员的当天详情。
7. 从其他路由返回 gallery 恢复原滚动位置，不强制回概览。
8. 深链接、通知和指定日记打开不受启动定位覆盖。
9. 375×812、390×844、844×390 横屏、768 和 1440×900 无横向溢出。
10. light / dark、100% / 130% 字号和 reduced-motion 均通过。
11. 键盘 Tab 顺序、焦点可见、按钮可访问名称和 Axe critical/serious 均通过。

### 8.3 必跑命令

```powershell
pnpm install --frozen-lockfile
pnpm test

# 先启动 preview，再执行
pnpm run test:a11y
pnpm run test:release
pnpm run test:build
git diff --check
```

## 9. 文档同步要求

实现时必须同步：

- `CHANGELOG.md`：记录概览替换、席位形状变更、昵称图例和启动定位。
- `docs/MODULE_MAP.md`：加入今日心情 controller/view 定位，并更新概览与滚动职责。
- `docs/TECHNICAL_OVERVIEW.md`：记录首页当天读取数据流、跨路由打开流程和启动定位契约。
- `docs/release-checklist.md`：加入今日概览双席、空状态快捷添加和冷启动定位验收。
- `design-system/life-vlog/`：如果最终组件规则成为首页长期规范，更新对应 gallery/home 页面 override；不要把未实现设计提前写成系统事实。

## 10. 实施顺序

1. 先修改并测试纯领域席位函数，确立成员 1 方形、成员 2 圆形的唯一事实来源。
2. 为 repository 增加 `listDay()`，用 fixture 验证只读当天数据。
3. 新建 today mood controller/view，先用静态 fixture 跑通首页双席的五种状态。
4. 替换 `index.html` 旧统计卡，删除旧事件、旧渲染调用和过时 CSS。
5. 打通首页到懒加载心情路由的 Promise 交接，复用 `open-today`。
6. 保存/编辑/删除后接入 `onMutation` 刷新。
7. 删除日记首次自动滚动，在导航控制器加入一次性冷启动概览定位。
8. 补齐响应式、主题、字号、reduced-motion 和无障碍状态。
9. 更新长期文档并执行完整本地发布门禁。
10. 先部署固定 preview，全部线上门通过后再决定是否发布 production。

## 11. 完成定义

以下条件全部满足才算完成：

- 今日概览不再出现日记数量、菜谱数量、未完成心愿数量和成长等级卡。
- 首页能在一次读取中正确展示两位稳定成员今天的心情。
- 成员 1 始终方形，成员 2 始终圆形；单人用户为方形。
- 日历底部和首页均显示真实昵称，不显示通用成员编号。
- 本人未记录时能一键进入既有 Picker，并且没有第二套编辑实现。
- 冷启动默认看到今日概览，返回页面时仍保留滚动记忆，深链接不被覆盖。
- 加载、空、失败、离线、已记录状态语义明确且无布局跳动。
- 旧统计逻辑、旧事件和旧 CSS 已直接删除，没有兼容层或空 fallback。
- 自动化测试、Axe、构建预算、确定性 release smoke 和 `git diff --check` 全部通过。

