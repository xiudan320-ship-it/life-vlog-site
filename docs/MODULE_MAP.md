# 功能模组索引

这份索引用来回答“某个功能坏了，应先看哪个模组”。`app.js` 只装配控制器、桥接共享状态并启动应用；业务修复和新功能不得写回 `app.js`。

## 快速定位

首页启动：`app-startup-controller.js` 编排本地准备和撤屏顺序，`app-runtime-startup.js` 区分首页与深链；`route-loader.js` 静态装配 gallery，其他路由仍懒加载，gallery 样式由根 `app.js` 导入。

日记下拉刷新：`modules/pull-refresh-controller.js` 管理手势、请求互斥和取消；`modules/pull-refresh-view.js` 管理提示与动画状态，由 `diary-feed-controller.js` 装配。手机日记页主内容区顶部可触发，媒体、按钮、输入和弹窗保留自己的交互。

发布工具：`deploy-cloudflare-pages.ps1` 负责 Git 来源检查和预览/正式发布装配；`scripts/verify-local-release.mjs` 管理本地预览服务及 Axe/fixture 验收；`tests/deployment-flow.ps1` 用模拟命令验证发布门禁和失败停止行为。操作步骤见 `release-checklist.md`。

| 现象或功能 | 首要模组 | 相关视图 / 领域模组 |
| --- | --- | --- |
| 应用启动、首屏加载态 | `modules/app-splash-controller.js` | `styles/app-splash.css`, `index.html` |
| 页面切换、返回行为 | `modules/app-navigation-controller.js` | `modules/app-event-bindings.js`, `modules/app-route-domain.js` |
| 顶部分页启用、排序、最多 5 个入口、VLOG mode 与用户/设备偏好 | `modules/primary-navigation-controller.js`, `modules/primary-navigation-domain.js` | `modules/primary-navigation-view.js`, `modules/preferences-store.js`, `modules/app-navigation-controller.js` |
| 首页生活小工具入口、排序与统一图标 | `modules/tool-dock-controller.js` | `index.html`, `styles/redesign-foundation.css`, `public/assets/tool-icons/*.svg` |
| 本周回顾 | `modules/family-activity-controller.js` | `modules/family-activity-view.js`, `modules/data-repositories.js` |
| 感谢留言板、颜色/发布/编辑/删除和统一 dialog | `modules/gratitude-controller.js` | `modules/gratitude-view.js`, `modules/app-event-bindings.js`, `modules/social-controller.js`, `modules/push-controller.js` |
| 登录、注册、邮箱与密码 | `modules/auth-controller.js`, `modules/auth-view.js` | `modules/app-session-controller.js`, `modules/settings-event-bindings.js` |
| 顶部等级 / 经验面板点击无响应 | `modules/gamification-controller.js` | `modules/app-event-bindings.js` |
| 账户资料、头像、家庭设置、缓存设置 | `modules/profile-preferences-controller.js`, `modules/family-settings-controller.js` | `modules/settings-event-bindings.js`, `modules/account-view.js`, `modules/primary-navigation-view.js` |
| 新版设置中心、分类导航、搜索与移动端目录/详情 | `modules/settings-shell-controller.js`, `modules/settings-shell-view.js`, `modules/settings-search-domain.js`, `modules/settings-section-registry.js` | `modules/routes/settings-route.js`, `modules/settings-view.js`, `styles/settings.css`, `modules/settings-event-bindings.js` |
| 日记列表、搜索、筛选、瀑布流 | `modules/diary-feed-controller.js` | `modules/diary-gallery-view.js`, `modules/diary-domain.js` |
| 首页今日心情概览、两席状态、原地快捷添加/详情、桌面本月心情日历和月历 CTA | `modules/today-mood-controller.js`, `modules/today-mood-cache.js` | `modules/today-mood-view.js`, `modules/mood-diary-domain.js`, `modules/mood-entry-overlay-controller.js`, `modules/mood-diary-repository.js` |
| 心情日记月历、月度汇总与历史 | `modules/mood-diary-controller.js`, `modules/mood-month-summary-domain.js`, `modules/mood-jar-physics.js` | `modules/mood-diary-domain.js`, `modules/mood-diary-view.js`, `modules/mood-month-summary-view.js`, `modules/mood-entry-overlay-controller.js`, `styles/mood-diary.css`；月度汇总包含 360×480 可重播圆肚玻璃瓶、罐体旁月份前后导航、确定性粒子物理和动态/稀疏趋势坐标，月份切换保留触发模块的视口锚点 |
| 发布 / 编辑日记、上传队列 | `modules/diary-composer-controller.js`, `modules/photo-detail-controller.js` | `modules/diary-upload-domain.js`, `modules/content-form-event-bindings.js` |
| VLOG 模式、视频声音、列表视觉中心自动播放、控件 | `modules/vlog-mode.js`, `modules/primary-navigation-controller.js`, `modules/photo-viewer-controller.js`, `modules/diary-feed-motion-coordinator.js` | `modules/app-runtime-vlog-mode.js`, `modules/diary-feed-motion-domain.js`, `modules/diary-video-layout.js`, `modules/media-event-bindings.js` |
| 图片 / 视频详情、缩放、前后切换、手势 | `modules/photo-viewer-controller.js`, `modules/photo-detail-controller.js` | `modules/media-event-bindings.js`, `modules/media-gesture-domain.js`, `modules/photo-dialog-view.js` |
| 周末计划、完成相册 | `modules/weekend-controller.js` | `modules/weekend-gallery.js`, `modules/weekend-plans-view.js`, `modules/content-form-event-bindings.js` |
| 心愿单 | `modules/wishlist-controller.js` | `modules/wishlist-view.js`, `modules/list-icons.js`, `modules/wishlist-hub-controller.js`, `modules/content-form-event-bindings.js` |
| 购物车 / 想买清单 | `modules/shopping-controller.js` | `modules/shopping-view.js`, `modules/list-icons.js`, `modules/shopping-domain.js`, `modules/shopping-interactions.js`, `modules/wishlist-hub-controller.js` |
| 秘藏相册加载、列表与详情编排 | `modules/secret-controller.js` | `modules/secret-gallery-view.js`, `modules/secret-domain.js` |
| 秘藏新建表单与预览 | `modules/secret-composer-controller.js` | `modules/secret-controller.js` |
| 秘藏相册编辑、图片批量操作与删除 | `modules/secret-album-actions-controller.js` | `modules/secret-controller.js`, `modules/photo-viewer-controller.js`, `modules/photo-dialog-view.js` |
| 日记、心愿和周末媒体详情编排 | `modules/photo-detail-controller.js` | `modules/photo-viewer-controller.js` |
| 日记编辑、图片替换和删除 | `modules/photo-editor-controller.js` | `modules/photo-detail-controller.js` |
| 手机日记详情、留言与返回手势 | `modules/mobile-diary-controller.js`, `modules/comment-thread-domain.js` | `modules/mobile-diary-view.js`, `styles/diary-comments.css`；留言以同级行渲染，回复关系只保留为语义元数据和目标文案 |
| 秘藏筛选、标签计数、照片排序 | `modules/secret-filter-domain.js` | `modules/secret-domain.js` |
| 秘藏文件夹、默认入口、右键菜单 | `modules/secret-folder-controller.js` | `modules/secret-gallery-view.js` |
| 秘藏密码与解锁 | `modules/secret-pin-controller.js` | `modules/secret-entry-preference-controller.js` |
| 评论、回复、家庭心愿/购物车通知 | `modules/social-controller.js`, `modules/comment-thread-domain.js`, `modules/notification-event-bindings.js` | `modules/notification-domain.js`, `modules/notification-view.js`；桌面详情与移动详情共用扁平留言模型，通知可跳转到心愿单/购物车 |
| 推送通知、晚间心情提醒与点击跳转 | `modules/push-controller.js` | `modules/media-event-bindings.js`, `cloudflare-worker/src/worker.js`；18:00 Asia/Tokyo 未记录当日心情时生成一次提醒 |
| 菜谱、纪念日、吃什么 | 对应的 `*-controller.js` | 对应的 `*-view.js`, `modules/content-form-event-bindings.js` |
| 衣柜记录、筛选、图片和穿着记录 | `modules/wardrobe-controller.js` | `modules/wardrobe-domain.js`, `modules/wardrobe-view.js`, `modules/data-repositories.js`, `wardrobe.css` |
| 离线缓存与容量、自动缓存设置反馈 | `modules/offline-cache-controller.js`, `modules/offline-settings-controller.js` | `modules/cache-policy.js`, `modules/cache-management-view.js`, `modules/app-feedback-view.js` |
| 云端数据访问、会话与服务器注销 | `modules/data-repositories.js`, `modules/household-repository.js`, `modules/cloudflare-client.js` | `modules/cloud-models.js`, `cloudflare-worker/src/http-response.js` |

## 跨路由数据边界

- `modules/secret-data-service.js` 是秘藏账户同步的数据边界：它只读取/映射 `secret_items`、`secret_folders`，合并并发读取，并更新共享 canonical state；它不依赖秘藏页面 controller，也不负责 DOM 渲染。
- `modules/secret-controller.js` 只在 `secret` route 激活后消费共享秘藏 state、读取本地缓存并渲染页面。未访问秘藏时，账户同步不会预加载秘藏 UI chunk。
- `modules/lazy-controller.js` 保持未加载 controller 调用即抛错的契约。跨路由后台流程只能使用显式 `isLoaded`/`callLoaded` 守卫；页面渲染由当前 route 的 `activate` 负责。
- `modules/route-loader.js` 与 `modules/app-navigation-controller.js` 共同维护 latest-wins 路由事务。过期的 chunk/activate 结果不得提交页面显隐、URL、焦点、滚动或 busy 状态。
- `modules/primary-navigation-domain.js` 是顶部分页注册表和配置规范化的唯一事实来源；`primary-navigation-controller.js` 通过现有 `preferences-store.js` 按用户/设备作用域读写，`primary-navigation-view.js` 只渲染当前可见入口和设置列表。VLOG 由 mode action 接入，不能被序列化成 `?page=vlog`。
- `modules/push-controller.js` 的设置绑定只在 `settings-route.js` 完成 DOM 渲染后执行；关闭设备通知时本机 `unsubscribe()` 与 Worker 端点清理是分离失败边界，本机状态优先。
- `modules/offline-settings-controller.js` 是设置页缓存 UI 的唯一业务拥有者：按当前用户读取有限整数容量和 `off|wifi` 策略，生成 view model，绑定策略/容量/下载/清理事件，并在 `settings-route.js` 完成模板收集和通用设置事件后幂等初始化；`cache-management-view.js` 只渲染 DOM 和转发原生事件，`offline-cache-controller.js` 只提供缓存数据与调度动作。
- `modules/diary-video-layout.js` 管理详情媒体生命周期：普通视频进入日记/VLOG 详情后静音自动播放并保留原生控件，Live Photo 使用静音循环预览；加载、失败、重试、切图和关闭都会清理状态与监听。
- `modules/mood-month-summary-domain.js` 从当前月份和稳定两席派生总数、最多心情、三档趋势、缺口桥接段、确定性罐体素材元数据及真实日期趋势坐标；`modules/mood-jar-physics.js` 负责共享 `360×480` 几何、确定性出生计划、固定步长粒子碰撞、瓶壁/椭圆底约束、休眠和最终布局；`modules/mood-month-summary-view.js` 负责透明圆肚瓶资源层、内腔裁切、原生按钮重播、罐体旁月份控件、数据/视口动效状态机、隐藏路由激活后的布局复查、焦点带触发、单一 rAF 到 transform 的映射、原生 SVG 趋势图、提示、明细和动效降级。`mood-diary-controller.js` 负责请求、缓存、latest-wins、上下文迟到重读、写后 canonical 对齐以及月份 action 的触发模块视口锚点恢复，不监听滚动或操作动画 DOM；月份前后控件复用同一 controller action。
- `modules/comment-thread-domain.js` 是评论树到扁平行的唯一转换边界：保留 root/depth/reply target 语义，稳定处理孤儿、循环和重复 id；`mobile-diary-view.js` 与 `social-controller.js` 只消费该模型并渲染同级 `.photo-comment`。

## 样式快速定位

| 范围 | 样式文件 |
| --- | --- |
| 应用启动开屏、首屏加载态 | `styles/app-splash.css` |
| 顶部分页与日记筛选 | `styles/redesign-foundation.css`, `styles/redesign-components.css`, `styles.css` |
| 设计变量、页面骨架、通用布局 | `styles/redesign-foundation.css` |
| 通用卡片、按钮、弹窗组件 | `styles/redesign-components.css` |
| 发布与编辑表单 | `styles/content-forms.css`, `styles/media-upload.css` |
| 手机日记、阅读器与留言 | `styles/mobile-diary.css`, `styles/diary-reader.css`, `styles/diary-comments.css` |
| 账户与设置弹窗 | `styles/account-dialogs.css` |
| 秘藏相册与筛选 | `styles/secret-gallery.css`, `styles/secret-filters.css` |
| 心愿单 | `styles/wishlist.css` |
| 心情日记 | `styles/mood-diary.css` |
| 购物车 / 想买清单 | `styles/shopping.css` |
| 功能检查和管理界面 | `styles/feature-inspector.css` |

## 事件入口边界

- `app-event-bindings.js`：应用外壳、一级导航控制器入口、工具坞、快捷入口、全局通知事件和控制器装配；不逐个绑定固定导航 ID。
- `app-runtime-assembly.js`：启动入口；只调用共享 runtime 的明确启动边界。
- `app-runtime-controller-assembly.js`：组合共享状态、基础设施、shell、账户、媒体和功能控制器；不持有服务实现、路由选项或启动/PWA 策略。
- `app-runtime-infrastructure.js`：创建后端、仓储、缓存、上传队列、资产服务以及健康/性能监控的基础设施图。
- `app-runtime-state.js`：共享 runtime 状态访问器和受限状态视图。
- `app-runtime-route-assembly.js`：页面控制器注册、路由 controller options、导航/session 和事件绑定。
- `app-runtime-startup.js`：开屏、启动顺序和 PWA install/update 生命周期。
- `app-runtime-feature-assembly.js`：功能控制器及其领域动作分组。
- `app-runtime-feature-bindings.js`：整理功能控制器提供给 shell、媒体和启动边界的跨模块动作桥接。
- `app-runtime-media-assembly.js`：日记、心愿、周末和秘藏媒体查看/详情控制器装配。
- `app-runtime-shell-assembly.js`：外壳、日记流、社交、家庭时间线、工具坞和布局控制器装配。
- `app-runtime-account-assembly.js`：session/lifecycle、账户同步、资料偏好、等级和秘藏 PIN 控制器装配。
- `app-runtime-vlog-mode.js`：VLOG 筛选模式的开关和视图联动。
- `primary-navigation-domain.js` / `primary-navigation-view.js` / `primary-navigation-controller.js`：维护顶部分页注册表、用户/设备配置、可见入口、设置开关/排序和 active/ARIA 状态。
- `settings-shell-controller.js` / `settings-shell-view.js` / `settings-search-domain.js`：维护新版设置中心的打开/关闭、桌面分类 tab、移动端目录与详情切换、搜索定位和焦点恢复；设置项的业务动作仍由各自 controller 提供。
- `notification-event-bindings.js`：应用外壳的通知铃铛、关闭/遮罩和关闭后焦点回收事件；绑定只执行一次，不依赖设置路由。
- `app-feedback-view.js`：统一即时提示、网络状态和回顶按钮；原生 dialog 打开时把提示 host 放入当前 dialog，并在关闭事件中清理，后续页面提示会自动恢复到 body。
- `content-form-event-bindings.js`：菜谱、心愿、周末、秘藏等内容表单事件；留言 dialog 的表单、颜色和关闭事件由 `app-event-bindings.js` 在应用壳初始化时绑定。
- `settings-event-bindings.js`：设置页账户、家庭、缓存、安全和网络状态事件；全局等级弹窗与通知事件不在设置路由绑定。
- `media-event-bindings.js`：日记 / VLOG / 秘藏查看器、编辑器、搜索筛选和媒体手势事件；搜索与 tag 结果仍在 gallery 当前页面内更新。
- `modules/routes/mood-diary-route.js`：心情日记路由的懒加载、模板挂载和 controller 生命周期；心情日记自己的点击/表单事件由 `mood-diary-view.js` 委托给 `mood-diary-controller.js`，不回流到 `app.js`。
- `modules/today-mood-controller.js`：首页今日概览的东京自然日查询、两席过滤、独立的桌面本月心情日历查询、缓存优先的后台同步和 loading/error/empty 状态；月度请求不阻塞当天状态，席位只调用共享 overlay，只有日历 CTA 调用 `switchPage("mood")`。
- `modules/today-mood-cache.js`：按用户和自然日读写首页今日心情缓存，并复用已有月度缓存预热当前日期；只提供本地加速，不替代云端 canonical 响应。
- `modules/today-mood-view.js`：只负责首页今日概览 DOM，包括真实昵称、席位形状、首屏立即加载的心情素材、空态/错误态和桌面本月日历缩略网格；首页点击入口由 `today-mood-controller.js` 在懒加载完成后绑定。
- `modules/mood-entry-overlay-controller.js` / `mood-entry-overlay-view.js`：全局唯一的 Picker、编辑和详情边界；管理本人写权限、保存/删除、脏表单、history、滚动和焦点恢复，不依赖 gallery 或 mood 路由 DOM。
- `modules/mood-diary-shared.js`：心情枚举、素材元数据、日期/标签标准化、两席解析和排序等首屏与懒加载路由共用的纯规则；不包含月历计算或 DOM。
- `modules/app-navigation-controller.js`：只在首次成功的登录态 gallery 激活且没有显式深链参数时将首屏落到今日概览；后续路由进入、返回和滚动恢复不再由 gallery 视图注入滚动副作用。留言不进入该页面状态机，而由应用壳统一 dialog 打开。

## 修复顺序

1. 先按上表找到控制器或领域模组，确认数据和状态是否正确。
2. 数据正确但显示异常，再检查对应 `*-view.js` 或 CSS。
3. 点击完全无反应，再检查对应 `*-event-bindings.js`。
4. 只有初始化、共享状态桥接或控制器注入出错时才检查 `app.js`。
