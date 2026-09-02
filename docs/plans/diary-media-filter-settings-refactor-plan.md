# 咻蛋之家：日记媒体、筛选与设置体验修复规划（执行版）

> Status: Planned
> Scope: 仅在当前任务直接涉及本专项时查阅
> Default loading: No
> Source of truth: 当前源码及对应长期系统文档

> 文档日期：2026-08-29
> 当前源码基线：`codex/life-vlog-stabilization` / `178d251`
> 正式站：<https://life-vlog-site.pages.dev>
> 文档性质：根因审计后的实施任务书。本轮先写规划，不在本次审计中修改业务代码或部署。

## 1. 本轮目标

一次性解决五组互相关联的问题：

1. 日记图片缩略图出现长期空白。
2. VLOG 卡片除当前播放项外，封面大面积不可见。
3. 手机日记详情的收藏、编辑、分类、取消置顶和删除操作拥挤、错位且触控尺寸不足。
4. 管理员修改别人日记分类的弹窗缺少层级和上下文，移动端体验不符合现有设计系统。
5. 日记筛选 chips 的数据来源、状态语义和刷新契约不可靠；设置页的栏目由多个控制器动态拼装，顺序混乱且难以维护。

实施后应达到：媒体 URL 只有一个可信来源；普通 VLOG 卡片始终先显示静态 poster；筛选结果与数据一致；手机操作区在大字号下也不拥挤；设置导航由单一注册表驱动，在桌面使用侧栏、手机使用列表进入子页。

## 2. 审计方法与已确认事实

本次只读审计覆盖：

- 根目录 `AGENTS.md`、`design-system/life-vlog/MASTER.md`、`docs/MODULE_MAP.md`。
- 日记媒体解析、上传、列表渲染、懒加载、VLOG、手机详情、身份与分类、设置控制器和样式。
- Cloudflare D1 的只读聚合查询；`rows_written=0`。
- R2/Worker 媒体地址的只读 `HEAD` 检查。
- 正式站桌面和 `390×844` 手机视口的只读浏览器检查。
- 现有自动化测试覆盖范围。
- `ui-ux-pro-max` 的媒体错误恢复、筛选 chip 语义、移动端触控、危险操作分离、设置导航和模态焦点规则。

### 2.1 数据与网络证据

- D1 当前共有 222 篇日记。
- 分类分布为：`日常 158`、`食物 41`、`旅行 14`、`VLOG 6`、`卢浮宫 1`、`朋友 1`、`QA 1`。
- 当前筛选栏却硬编码了 `城市`（D1 中为 0），没有 `朋友` 与 `QA`。
- 26 条日记记录包含受影响的 Worker 媒体地址。
- 其中 47 个直接用于列表显示的唯一地址全部返回 `401`：24 个原图/封面地址、23 个缩略图地址。
- 这 26 条记录全部具有对应的 `r2:` canonical path，缺失 canonical path 的记录数为 0。
- 因此不需要数据库 migration，也不需要继续保留 Worker URL 兼容分支；前端应以 `r2:` path 为唯一可信来源，按当前 `PUBLIC_R2_URL` 解析公开地址。

### 2.2 VLOG 封面证据

- 正式站 VLOG 筛选返回 6 张卡片。
- 当前列表把普通 VLOG 也渲染成 `<video poster>`，而 `.feed-image` 初始 `opacity: 0`，只有收到 `loadeddata` 才添加 `is-loaded`。
- 实测第一条正在激活的视频 `readyState=4` 且可见；其余 5 条都有有效 poster，但 `readyState=0`、`opacity=0`，因此静态封面也被 CSS 隐藏。
- 这说明普通 VLOG 的“缩略图”不应依赖视频生命周期。列表应始终先渲染 poster 图片，只有 Live Photo 可在合适条件下切换为静音动态预览；普通视频只在详情页由用户点击播放。

### 2.3 图片错误处理证据

- `renderFeedImage()` 无条件优先使用 `thumbnail_url`。
- URL 返回 401/404/网络失败时，`prepareFeedImages()` 的 error handler 仍调用 `markLoaded()`，没有错误状态、重试入口，也不会改用 canonical path 重新解析同一资源。
- 懒加载 observer 没有独立生命周期管理；列表重绘后旧 observer 不能显式断开。
- 首屏 eager 策略按“卡片编号”决定，合集中的多张图可能同时 eager，不按“首卡首图”控制请求预算。
- 现有测试只验证生成的 HTML 和视频生命周期，没有覆盖 401、坏缩略图、poster-only VLOG、重试或 observer 清理。

### 2.4 筛选证据

- 当前界面名为“日记分类”，代码只支持单一 `category`，并不存在日记多 Tag 数据模型。
- 因此用户口中的“Tag 筛选”实际是页面上的分类 chips；本轮应修复分类筛选，不在 `note` 中发明另一套 Tag 存储。
- chips 来自 `index.html` 硬编码，不随当前可见数据变化，也没有数量。
- 点击后只切换 CSS `active`，没有同步 `aria-pressed` 或 `aria-selected`。
- 正式站点击“旅行”时 chip 进入 active，但当前会话结果为 0；这与 D1 中确有 14 条旅行记录形成明显的不透明体验，界面没有解释“当前账户不可见”还是“筛选错误”。
- `galleryRenderSignature` 没有包含 `photo.category`。管理员修改分类后只改本地 `photo.category`，没有更新 `updated_at`，`renderGallery()` 可能因签名未变化而跳过重绘，导致旧筛选结果残留。
- 搜索文本只包含标题、正文、分类、日期和作者；若未来实现真实多 Tag，必须先建立正式字段和领域模型，不能继续塞进搜索字符串或备注元数据。本轮不做该扩展。

### 2.5 手机操作与分类弹窗证据

- 手机详情最多平铺 5 个操作：收藏、编辑/分类、取消置顶、删除。
- `.mobile-diary-actions button` 当前最小高度仅 38px，低于项目规定的 44px。
- 多操作横排在 375/390px、小屏横屏和 130% 字号下必然拥挤；危险操作与普通操作只有颜色差异，没有空间分离。
- 管理员分类弹窗由 `app-identity-controller.js` 运行时拼 HTML，使用裸 `<select>`；没有日记标题/作者上下文、当前分类摘要、变更预览或保存中状态。
- 弹窗桌面和手机共用 420px 对话框；没有按设计系统在手机转成底部 sheet。

### 2.6 设置页证据

- `index.html` 静态声明 4 个栏目；通知、缓存、数据安全、诊断、上传由 4 个以上控制器在运行时继续插入 DOM。
- 正式站最终出现 9 个一级栏目：常规、通知、工具栏、缓存、账户、家庭、数据安全、诊断、上传。
- 手机视口下导航容器可见宽度约 346px，内容宽度约 631px，只能横向滚动，没有分组或“还有更多”提示。
- `setActiveSettingsSection()` 把栏目白名单、ARIA、显示逻辑和各栏目副作用全部放在 `family-settings-controller.js`，职责明显越界。
- 动态栏目各自绑定 click；静态栏目由 `settings-event-bindings.js` 绑定。栏目顺序、加载和事件入口存在两套实现。
- tab 使用 roving `tabIndex`，但没有实现方向键切换。非当前 tab 为 `tabIndex=-1`，键盘用户无法按 Tab 访问其他栏目。
- “常规”同时混入身份资料、外观、安装、性能、缓存等 11 个操作；缓存又另有独立栏目，内容归属重复。
- 设置路由已经 lazy load，但主要 DOM 仍常驻 `index.html`，`settings-route.js` 只负责创建控制器，没有真正拥有设置视图。

## 3. 实施原则与明确非目标

### 必须遵守

1. 不保留 Worker 媒体 URL 的兼容层；有 `r2:` path 的云端媒体只从 path 解析 URL。
2. 不写 D1 migration，不批量改写用户数据；本轮通过统一读取契约解决问题。
3. 不向 `app.js`、`index.html` 继续堆业务逻辑。
4. 先完成媒体最小端到端修复，再做筛选、手机 UI 和设置重构。
5. 复用现有 `resolveStoredAssetUrl`、`list-icons`、dialog、toast、fixture、Playwright 和 axe 能力，不新增 UI 库。
6. 普通视频列表不自动播放；详情页保留用户点击播放。Live Photo 才允许静音循环预览，并尊重 save-data/reduced-motion。
7. 所有手机操作至少 44×44px，图标使用同一 SVG 体系，危险操作不只靠颜色表达。
8. 设置重构保持现有功能，不借机新增业务入口。

### 非目标

- 不在本轮新增日记多 Tag 数据表或把 Tag 编码进 `note`。
- 不改日记可见权限、家庭共享规则或管理员判定。
- 不重做日记瀑布流视觉语言、首页、心愿、周末或衣柜。
- 不删除现有离线缓存、备份、回收站、上传队列或性能诊断能力。
- 不要求真实测试账户写入；浏览器回归使用 deterministic fixture。线上只做只读检查。

## 4. 阶段 A：统一媒体 canonical URL（P0）

### 目标

让所有日记图片、缩略图、poster、Live Photo 和视频 URL 在进入视图前完成一次规范化，彻底停止消费失效 Worker URL。

### 主要文件

- `modules/asset-controller.js`
- `modules/diary-feed-controller.js`
- `modules/media-metadata.js`
- `modules/mobile-diary-view.js`
- `modules/photo-dialog-view.js`
- `modules/offline-cache-controller.js` 及其媒体收集调用方
- `tests/app-domain.mjs`
- `tests/diary-gallery-view.mjs`
- 新增职责明确的纯领域测试文件；仅在现有模块无法承载时新增 `modules/diary-media-domain.js`

### 实现要求

1. 定义唯一媒体读取契约：
   - 云端持久媒体有 `r2:` path 时，path 是 source of truth。
   - URL 由现有 public R2 base + 编码后的 key 派生。
   - 不再信任同一对象上的 Worker `*_url`。
   - fixture/demo 可通过明确的非持久媒体入口使用测试 URL，不能混入云端 path 解析。
2. `getPhotoImages()` 返回给所有视图前，统一解析：
   - `image_path → image_url`
   - `thumbnail_path → thumbnail_url`
   - `poster_path → poster_url`
   - `motion_path → motion_url`
   - `video_path → video_url`
3. 如果缩略图 path 为空，直接使用同一 canonical image/poster；这不是失败后的 URL fallback，而是媒体模型中“没有独立缩略图”的正式状态。
4. 手机详情、桌面详情、列表、离线资源收集和预加载必须消费同一规范化对象，禁止各自重新拼 URL。
5. 删除任何继续优先选择失效 Worker URL 的分支。

### 验收

- 26 条受影响记录在不修改 D1 的前提下全部解析为 public R2 地址。
- 浏览器网络面板中不再对 `life-vlog-r2-upload...` 发起日记图片、缩略图或 poster GET/HEAD。
- 原图、缩略图、poster、视频、Live Photo 和离线资源收集使用一致 URL。
- 单元测试覆盖 path 优先、无独立 thumbnail、中文/空格 key 编码和 fixture URL。

## 5. 阶段 B：重建列表媒体状态机（P0）

### 目标

让静态 poster 与视频播放完全解耦，并为真实加载失败提供可恢复反馈。

### 主要文件

- `modules/diary-gallery-view.js`
- `modules/diary-video-layout.js`
- `styles/redesign-foundation.css`
- `tests/diary-gallery-view.mjs`
- `tests/diary-video-layout.mjs`
- `tests/c-performance-regression.mjs`
- `tests/release-smoke.mjs`

### 实现要求

1. 普通 VLOG 卡片只渲染 poster `<img>` + `VIDEO` badge。
2. 点击卡片后，详情页才创建/激活有声 `<video controls>`；不得在 feed 请求普通 VLOG 视频。
3. Live Photo 卡片先显示 poster 图片；只有 observer 判定为当前主要可见项时，才替换或叠加一个静音、循环、playsinline 的动态层。
4. `is-loaded` 只表示媒体真的可显示：
   - 图片以 `decode()`/load 成功为准。
   - poster 图片独立成功即显示，不等待视频 `loadeddata`。
   - error 不得调用成功态 `markLoaded()`。
5. 新增明确错误 tile：保留卡片尺寸、显示 SVG 图片图标、文字“缩略图加载失败”和“重试”按钮；使用 `role=status` 或合适 live region，不用破图图标。
6. 重试只重新请求同一 canonical URL，可附一次非持久 cache-busting 参数；不得切回 Worker URL。
7. observer 生命周期与 gallery root 绑定，重绘时 disconnect；不要留下旧 observer。
8. 请求预算：
   - 首卡首图可 eager/high。
   - 其余图片 lazy/low。
   - 合集不可因为卡片排在前四位而把 9 张图全部 eager。
   - 同时只允许一个 Live Photo 动态层激活。
9. 保留 `aspect-ratio` 和真实 width/height，错误态也不得造成 CLS。

### 验收

- VLOG 6 张卡片在视频一个都未加载时仍全部显示 poster。
- feed 中普通 VLOG 视频网络请求数为 0。
- Live Photo 同时播放数不超过 1；离开视口释放 src。
- 401、404、离线、超时分别进入可恢复错误态；重试成功后恢复图片。
- 390×844、844×390、1440×900 下 CLS < 0.05，无空白巨型媒体块。

## 6. 阶段 C：修复分类筛选领域逻辑（P0）

### 目标

把当前 chips 明确为“单分类筛选”，由真实可见数据生成，并保证分类变更后结果立即正确。

### 主要文件

- `modules/diary-domain.js`
- `modules/diary-feed-controller.js`
- `modules/diary-gallery-view.js` 或新增小型 `modules/diary-filter-view.js`
- `modules/media-event-bindings.js`
- `modules/app-identity-controller.js`
- `index.html`（只删除硬编码 chips、保留挂载点）
- `tests/app-domain.mjs`
- `tests/browser-regression.mjs`
- `tests/release-smoke.mjs`

### 实现要求

1. 在 `diary-domain.js` 建立纯函数：
   - 统计当前可见日记的分类与数量。
   - 过滤 `VLOG` 与普通日记。
   - 应用全部、七日精选、收藏、单分类与搜索组合。
2. 普通分类 chips 从当前账户可见的日记数据动态生成；不显示 0 条的普通分类。
3. 系统筛选“全部 / 七日精选 / 我的收藏”固定在前；普通分类按产品定义顺序或稳定 locale 排序。
4. chip 文案显示数量，例如“旅行 14”；数量变化使用完整短语更新，不抢焦点。
5. 每个 chip 使用原生 button，并同步 `aria-pressed`；active、pressed 和实际结果必须一致。
6. 当前筛选在数据刷新后不存在时，规范回“全部”，同时给出轻量说明。
7. 将 `category` 纳入 `galleryRenderSignature`；分类 RPC 成功后更新 category 和必要的本地 revision，再重绘。
8. 管理员把当前筛选中的日记改到其他分类后，该卡片立即离开当前结果；改到当前分类的行为通过下一次数据同步或显式返回数据正确呈现。
9. 搜索与分类是 AND 关系，清空搜索不能清空分类；切换分类不能清空搜索。
10. URL 可保存现有页面 route，但本轮不新增多 Tag query 语法。

### 验收

- fixture 中旅行、日常、食物的计数和过滤结果准确。
- D1 中没有数据的“城市”不出现；存在的“朋友”能出现（前提是当前账户可见）。
- 点击 chip 后 active、`aria-pressed`、卡片分类和空状态一致。
- 分类修改后不出现旧卡残留。
- 过滤、搜索、收藏和 VLOG 来回切换 30 轮无异常、无重复监听。

## 7. 阶段 D：重做手机日记操作区与分类选择器（P1）

### 目标

降低手机详情操作密度，保留高频操作，安全收纳低频与危险操作。

### 交互方案

手机详情采用“收藏 + 一个上下文主操作 + 更多”结构：

- 所有人：收藏。
- 自己的日记：编辑。
- 管理员查看别人日记：分类。
- 其他操作进入“更多”菜单：取消置顶、删除等。
- 删除放在菜单末尾，使用危险色、垃圾桶 SVG、分隔线和二次确认。
- 桌面可保留展开操作，但同样使用统一 action model，避免视图分别判断权限。

### 主要文件

- `modules/mobile-diary-view.js`
- `modules/mobile-diary-controller.js`
- `modules/diary-gallery-view.js`
- `modules/app-identity-controller.js`
- `modules/list-icons.js`
- `styles/mobile-diary.css`
- `styles/account-dialogs.css`
- 视复杂度新增 `modules/diary-action-domain.js` 和 `modules/diary-category-dialog.js`

### 实现要求

1. 权限到动作的映射放纯领域函数，输入 owner/admin/pinned/favorite，输出动作列表；视图只渲染。
2. 所有手机 action 高度至少 44px，间距至少 8px；标准/较大/特大字号均不裁断。
3. “更多”使用现有 SVG 图标和明确 `aria-expanded`/`aria-controls`。
4. 手机更多菜单使用 bottom sheet；桌面使用紧凑 anchored dialog 或普通小 dialog。
5. 菜单打开、关闭、执行后恢复触发按钮焦点；Esc、backdrop、返回手势均可关闭。
6. 危险操作和普通操作空间分离，删除仍走现有确认与回收站逻辑。
7. 收藏使用 `aria-pressed`，异步期间 disabled + loading 文案，完成后原地更新，不关闭详情。

### 分类选择器

1. 显示日记标题、作者、当前分类，避免管理员改错对象。
2. 使用 radio list/chip list 选择已有分类，不使用孤立原生 select。
3. 当前分类预选；未变化时“保存”禁用。
4. 手机 bottom sheet，桌面 compact dialog。
5. 保存期间禁止重复提交；成功后关闭并 toast；失败保留选择并显示内联错误。
6. 分类选项来自同一个分类 domain/config，不再在 identity controller 复制数组。

### 验收

- 375、390、430px 和 844×390 下无横向溢出。
- 130% 字号下操作区仍最多 3 个一级按钮，文字不裁断。
- 收藏连续点击、编辑、分类、取消置顶、删除权限均正确。
- 删除不能误触，确认取消后焦点恢复。
- axe 无 serious/critical；键盘与屏幕阅读器名称/状态正确。

## 8. 阶段 E：重构设置页信息架构（P1）

### 目标

删除“静态 4 页 + 运行时再插 5 页”的双实现，让导航、顺序、标题、权限、渲染和副作用都由一个注册表管理。

### 建议一级分组

1. **外观与使用**：主页名称、列表布局、文字大小、安装应用。
2. **账户与安全**：昵称、头像、邮箱、密码、恢复密钥、秘藏 PIN。
3. **家庭与共享**：家庭签名、成员、邀请、会员信息。
4. **通知与工具**：通知开关、工具栏排序。
5. **存储与数据**：缓存与离线、云备份、回收站、上传任务、诊断与脱敏性能信息。

“诊断”“上传”不再占用一级导航；作为“存储与数据”内的清晰二级卡片。缓存占用/上限/清除只出现一次。

### 响应式结构

- 桌面：固定侧栏 + 内容面板，侧栏 5 项，不横向滚动。
- 手机：设置首页为 5 个分组列表；点击进入单个子页，顶部有返回和标题。不要把 9 个 tab 压进横向滚动条。
- 返回子页时恢复设置首页滚动；关闭设置恢复头像按钮焦点。

### 主要文件

- 新增 `modules/settings-section-registry.js`
- 新增或扩展 `modules/settings-view.js`
- `modules/routes/settings-route.js`
- 新增 `modules/routes/templates/settings.html`
- `modules/family-settings-controller.js`
- `modules/offline-settings-controller.js`
- `modules/data-safety-controller.js`
- `modules/push-controller.js`
- `modules/tool-dock-controller.js`
- `modules/settings-event-bindings.js`
- `index.html`
- `styles/account-dialogs.css`
- `tests/ui-contracts.mjs`
- `tests/browser-regression.mjs`
- `tests/axe-regression.mjs`

### 实现要求

1. registry 是栏目 ID、标签、图标、顺序、父分组、权限和激活回调的唯一来源。
2. 控制器不再 append nav/button/section；只向 registry 提供内容 renderer 或动作。
3. `family-settings-controller.js` 只保留家庭业务，不再管理所有设置 tab。
4. `settings-event-bindings.js` 使用事件委托绑定一个导航入口，不按静态/动态分两套监听。
5. 设置 shell 和一级内容移到 settings route template；从 `index.html` 删除常驻设置主体。
6. 子 dialog 可继续复用，但由 settings controller 统一管理打开、返回、焦点恢复，删除各控制器重复 close/reopen 协议。
7. 桌面侧栏若使用 tab pattern，必须实现 ArrowUp/ArrowDown/Home/End；手机列表使用普通 button/link 语义，不伪装 tab。
8. 每个设置项采用统一 row：SVG 图标、标题、当前值/说明、chevron 或 switch；不使用 emoji。
9. 开关使用 checkbox/switch 语义；进入子页的 row 不伪装成开关。
10. 深浅色、边框、active、focus、disabled 全部使用设计 token。

### 验收

- DOM 中只有 5 个一级设置入口，顺序固定且由 registry 测试锁定。
- 不再出现控制器运行时创建一级导航的代码。
- 手机无横向设置导航；390px 下设置首页和任一子页无横向溢出。
- 桌面键盘可切换全部栏目；手机返回路径稳定。
- 所有旧功能仍可到达：通知、工具栏、账号、家庭、缓存、离线、备份、回收站、上传、诊断。
- 关闭 child dialog 或设置后焦点回到正确触发器。

## 9. 自动化测试计划

### 单元/领域测试

- canonical path 解析和 URL 编码。
- 日记 media normalization 的 image/thumbnail/poster/video/live 五类字段。
- 分类统计、排序、系统筛选、搜索组合。
- category 进入 render signature。
- 权限到手机 action 的映射。
- settings registry 的唯一 ID、顺序、父分组和权限。

### 浏览器回归

1. **媒体**
   - thumbnail URL 返回 401：显示错误 tile，不永久 shimmer。
   - 点击重试后 200：图片出现，状态清除。
   - 6 个 VLOG 均显示 poster，feed 视频请求为 0。
   - Live Photo 至多一个活跃，离开视口释放。
2. **筛选**
   - 动态分类和计数来自 fixture。
   - 每个 chip 的 pressed/active/结果一致。
   - 搜索 + 分类组合。
   - 管理员改分类后旧筛选卡立即消失。
3. **手机操作**
   - owner、admin-other、普通成员三种权限矩阵。
   - 收藏不离开详情；删除确认；更多菜单焦点恢复。
4. **设置**
   - 桌面 5 分组侧栏。
   - 手机设置首页→子页→返回。
   - 所有旧功能入口可达。
   - 键盘方向键和焦点恢复。

### 视口与模式矩阵

| 环境 | 必查内容 |
| --- | --- |
| 375×812 | 日记 action、分类 sheet、设置首页/子页、错误 tile |
| 390×844 | VLOG poster、筛选 chips、设置返回与安全区 |
| 430×932 | 大手机换行与操作密度 |
| 844×390 | 横屏 media、sheet 高度、设置内容无遮挡 |
| 768×1024 | 平板设置布局断点 |
| 1440×900 | 瀑布流、分类 dialog、设置侧栏 |
| 深色/浅色 | 正文 4.5:1、控件/边界 3:1、错误/危险状态 |
| 标准/较大/特大 | chips、action、设置 row 不裁断 |
| reduced-motion/save-data | 无 feed 自动视频，状态不依赖动画 |

### 必须运行

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run test:a11y
pnpm run test:build
git diff --check
```

部署预览后，再对预览和正式域名分别运行 `pnpm run test:release`。

## 10. 数据安全与发布流程

1. 开工前 `git status --short`，保留用户现有修改。
2. D1 只做上线前/后的只读计数和 canonical path 完整性检查；`rows_written` 必须为 0。
3. 不打印 token、完整媒体 URL、日记正文或账户信息。
4. 阶段 A+B+C 完成并通过后先部署 preview，真实检查媒体和筛选；P0 未通过不得继续 UI 大改。
5. 阶段 D+E 完成后跑完整矩阵，再部署新的 preview。
6. preview 满足全部门槛后才部署 production。
7. 部署后核对：
   - 页面入口与本地构建 hash 一致。
   - 日记媒体请求不再访问 Worker 资源地址。
   - VLOG 卡片 poster 全可见且 feed 无普通视频请求。
   - 受影响媒体不再出现 401。
   - 分类 chips 与当前可见数据一致。
   - 设置移动端无横向 tab 条。
8. Service Worker 更新走现有用户确认流程；不得要求用户清站点数据。

## 11. 交付顺序与暂停点

建议拆为两个可独立发布批次：

### 批次 1：功能恢复（必须先完成）

- 阶段 A canonical media URL。
- 阶段 B poster 与错误状态机。
- 阶段 C 分类筛选。
- 完整测试、preview、production、线上复核。

### 批次 2：体验重构

- 阶段 D 手机操作与分类选择器。
- 阶段 E 设置页信息架构。
- 完整可访问性/响应式矩阵、preview、production、线上复核。

批次 1 解决“内容看不到”和“筛选失效”，优先级高于视觉重构。若执行额度不足，应在批次 1 正式发布并验证后暂停，不能留下只在本地修好的 P0。

## 12. 完成定义（Definition of Done）

只有同时满足以下条件才可宣布完成：

- 日记与 VLOG 卡片不再出现无解释的纯色空白媒体块。
- D1 中 26 条受影响记录无需改库即可从 canonical path 正常显示。
- feed 不请求普通 VLOG 视频，6 个 VLOG poster 全部可见。
- 媒体失败有明确状态与可操作重试，不永久 shimmer。
- 分类筛选动态、计数准确、ARIA 状态正确；分类修改不会留下旧结果。
- 手机操作区满足 44px、危险操作分离、大字号与横屏不溢出。
- 分类选择器有上下文、保存状态、失败保留和焦点恢复。
- 设置只有一个 registry 和 5 个一级分组；手机不再横向滚动 9 个栏目。
- 所有原有设置功能仍可访问，无重复入口或重复事件绑定。
- `app.js` 未增加业务逻辑，过时双实现已删除，没有 migration 或 fallback。
- 完整测试、axe、构建预算、preview/production release smoke、`git diff --check` 全部通过。
- 已部署正式站并在线复核，最终报告提供 preview、production、不可变部署 URL、提交和真实遗留风险。

## 13. 执行者最终回报模板

```text
批次 1：
- canonical media：
- VLOG poster / 媒体错误状态：
- 分类筛选：

批次 2：
- 手机日记操作区：
- 分类选择器：
- 设置重构：

数据审计：
- 受影响记录数：
- canonical path 完整性：
- 上线前后 D1 行数：
- rows_written：0

验证：
- pnpm test：
- pnpm run test:a11y：
- pnpm run test:build：
- preview/production release：
- 375/390/430/横屏/平板/桌面：
- 深浅色/三档字号/reduced-motion/save-data：

部署：
- Preview：
- Production：https://life-vlog-site.pages.dev
- Immutable：
- Source commit：

遗留风险：
- 只能填写真实存在的风险；没有则写“无”。
```

## 14. UI/UX 顾问结论如何影响本规划

- 媒体错误必须有可恢复路径，不能只显示空白或永久 loading。
- 普通视频采用 click-to-play；列表缩略图不应依赖自动播放视频。
- filter chip 必须使用原生 button、可访问名称、pressed/selected 状态和可见 focus。
- 手机操作最小 44px，危险操作必须确认并与普通操作空间分离。
- 设置属于二级导航：桌面侧栏、手机列表进入子页，比 9 个横向 tab 更符合可发现性和大字号适配。
- 深浅色、焦点、safe area、375px、横屏、130% 字号和 reduced-motion 是发布门，不是交付后的可选检查。
