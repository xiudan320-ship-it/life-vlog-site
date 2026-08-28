# 咻蛋之家性能、PWA 与体验完整升级规划（Luna 执行版）

> 文档日期：2026-08-27
>
> 执行对象：Luna
>
> 项目目录：C:\Users\xiuda\Documents\照片
>
> 正式站：https://life-vlog-site.pages.dev
> 文档性质：下一轮完整实施任务书，不是建议清单。范围内项目全部完成、测试、预览验证、正式部署并线上复核后，才算交付。

## 1. 本轮目标

本轮不重新设计“咻蛋之家”的视觉语言，也不增加新的生活记录业务。目标是把现有产品从“功能完整的静态 PWA”升级为“启动快、按需加载、更新可靠、返回行为正确、可安装、可调字号、可在真实设备上诊断性能”的长期架构。

必须交付八项结果：

1. 开屏动画不再等待远程日记同步；缓存界面可用后立即进入应用，云端数据在后台刷新。
2. 首屏大图与图标全部按实际显示尺寸优化，消除 1.2MB 小 Logo 等明显资源浪费。
3. 引入 Vite 正式构建流程，删除手工查询串版本和手工复制发布体系。
4. 日记之外的主要页面按需加载 JS 与 CSS，显著减少首次请求和未使用样式。
5. 使用 vite-plugin-pwa 的 injectManifest 模式重建 Service Worker，保留推送与离线能力，改为用户确认更新。
6. 顶级页面写入 URL，浏览器前进、后退、刷新和深链接行为正确。
7. 在保持手机固定视口、不开放双指缩放的前提下，增加应用内字号设置。
8. 增加 PWA 安装入口和本机性能诊断，让真实设备上的启动、同步与 Web Vitals 可查看、可复制。

## 2. 当前基线与问题证据

以下数据来自 2026-08-27 的本地源码审计和正式站实测。Luna 开工后应重新测一次并保存结果，但不得忽略这份基线。

### 2.1 线上体验基线

| 场景 | 当前结果 | 判断 |
| --- | ---: | --- |
| 高速网络手机 FCP | 约 356ms | 良好 |
| 高速网络手机 LCP | 约 420ms | 良好 |
| 高速网络手机 CLS | 约 0.0008 | 很稳定 |
| 首次页面请求 | 约 169 个 | 过多 |
| 首次传输量 | 约 2.1MB | 偏大 |
| 首次 JS 请求 | 104 个 | 过多 |
| 首次 CSS 请求 | 20 个 | 过多 |
| 首次图片传输 | 约 1.55MB | 明显可优化 |
| 慢速 4G + 4 倍 CPU，开屏消失 | 约 7.6s | 体验问题 |
| 已受 Service Worker 控制的慢速重载，开屏消失 | 约 3.3s | 仍被数据同步阻塞 |

结论：快速网络下视觉稳定性已经很好，下一轮的主要问题不是再做视觉重构，而是启动依赖、冷加载形状、缓存更新和导航状态。

### 2.2 源码与资源基线

- app.js 有 57 个静态 import。
- modules 下有 100 个 JS 文件；app.js 加 modules 的原始体积约 950.8KiB。
- index.html 一次性引入 20 个 CSS 文件，原始体积约 449.8KiB。
- 首个访客页面的 CSS 覆盖率审计约为 10%，说明大量非当前页面样式被提前下载和解析。
- Service Worker 的 CORE_ASSETS 手工列出了几乎所有 JS、CSS 和多个图片资源，安装阶段会全部抓取。
- 当前脚本请求使用联网优先并带 no-cache，静态响应默认是 max-age=0；Service Worker 缓解了复访，但更新与缓存职责互相重叠。
- 顶级页面切换只修改内存状态，URL 不变；没有 pushState、popstate 或 history.scrollRestoration 管理。

### 2.3 重点图片

| 资源 | 当前大小 | 当前用途 | 本轮要求 |
| --- | ---: | --- | --- |
| assets/home-logo.jpg | 1212.9KiB | 顶栏约 40px Logo | 改成按显示尺寸输出，首选 WebP，单文件目标不超过 30KiB |
| assets/black-cat-logo-source.png | 999.2KiB | 设计源文件 | 不得进入 dist |
| assets/weekend-complete-stamp.png | 607.2KiB | 周末完成印章 | 输出透明 WebP，按实际尺寸提供 1x/2x |
| assets/app-icon-512.png | 361.3KiB | PWA 图标 | 重新压缩；另做真正的 maskable 图标 |
| assets/black-cat-cover.jpg | 178.3KiB | 首页封面 | WebP 响应式尺寸，保留宽高比 |
| assets/food-wheel-icon.png | 137.5KiB | 菜谱转盘 | 按实际显示尺寸压缩 |
| assets/anniversary-icon.jpg | 111.5KiB | 纪念日入口 | 按实际显示尺寸压缩 |

## 3. 不可违反的执行规则

1. 完整阅读根目录 AGENTS.md、docs/MODULE_MAP.md、docs/release-checklist.md、docs/ui-optimization-plan.md、design-system/life-vlog/MASTER.md 和 ui-ux-pro-max 的 SKILL.md。
2. 发生冲突时，优先级为：用户本轮明确要求 > 当前 AGENTS.md > 本规划书 > 旧设计系统文档。旧设计系统中“浏览器缩放必须开放”和“必须使用测试账户”的内容已经过时，不得据此改回。
3. 手机 viewport 保持现状：width=device-width、initial-scale=1.0、maximum-scale=1.0、user-scalable=no、viewport-fit=cover。不得开放双指缩放。
4. 不要求测试账户。登录态逻辑用现有自动化 fixture、mock 或当前可用会话验证；不得向用户索要或在仓库写入测试账号、密码、Token。
5. 开工先执行 git status --short。当前工作区已有大量未提交修改，全部视为用户工作；不得覆盖、重置或顺手清理。
6. 不保留旧构建、旧 Service Worker、旧查询串版本号或双实现。新流程通过后直接删除旧流程。
7. 不写 migration、兼容层或 fallback 架构。这里的“删除旧流程”不等于删除用户数据。
8. app.js 只负责应用初始化、共享状态桥接和模块装配。新增启动、路由、PWA、字号、安装和性能诊断逻辑必须放进 modules 下职责清楚的模块。
9. 先复用项目已有的 preference store、导航控制器、Splash 控制器、发布脚本和测试框架，再新增最少依赖。
10. ui-ux-pro-max 只作为顾问参考，不能覆盖用户要求和本文件边界。交付前必须检查加载反馈、44px 触控区、深浅主题、减少动态效果、安全区、文本重排和返回行为。
11. 保持以下既有行为不回退：
    - 购物车点击“完成”后停留在购物清单，不跳转页面。
    - 周末未完成状态不显示“待完成”胶囊，使用现有圆圈完成交互。
    - 心愿和周末的桌面内容宽度保持当前体系，不得再次意外缩窄。
    - 开屏动画的视觉设计保留，只改变何时结束。
    - 日记现有 PAGE_SIZE、IntersectionObserver、图片 lazy loading 和缓存渲染继续使用，不重写成另一套列表系统。

## 4. 范围与非目标

### 4.1 必须完成

- 启动解阻塞和页面级同步状态。
- 图片处理流程与资产体积测试。
- Vite 构建、资源哈希、构建输出和部署脚本改造。
- 顶级页面及大型设置功能按需加载。
- 页面专属 CSS 按需加载，清理重复/失去职责的共享 CSS。
- 新 Service Worker、离线壳层、更新提示、缓存头。
- 顶级页面 URL、前进后退、刷新恢复、深链接。
- 字号设置：标准、较大、特大。
- PWA 安装设置项、安装完成状态、独立 maskable 图标。
- 本机性能诊断与自动化性能预算。
- 完整测试、预览验证、正式部署与线上复核。

### 4.2 明确不做

- 不重新设计配色、卡片、首页封面、周末海报或心愿布局。
- 不引入 React、Vue、Svelte 等 UI 框架。
- 不增加服务端性能采集表，不把性能数据上传云端。
- 不把所有业务模块改写成新架构；只拆首次加载和路由边界所必需的模块。
- 不实现通用列表虚拟化，现有日记增量加载已经满足需求。
- 不增加更多开屏动画、滚动动画或 GSAP。
- 不开放双指缩放。
- 不借本轮改动数据库结构或用户数据模型。

## 5. 最终架构

### 5.1 启动时序

目标时序：

~~~text
HTML 与关键 CSS 可见
  → 恢复本地 session 备份
  → 渲染应用壳层、账户状态和缓存日记
  → 结束开屏动画，解除 inert，应用可操作
  → 后台请求云端日记与账户数据
  → 数据成功：无跳页地更新当前视图
  → 数据失败：保留缓存内容并显示非阻塞状态
~~~

开屏结束条件只能依赖“本地可交互”，不能再依赖 actions.loadPhotos() 成功或结束。

### 5.2 构建与加载

~~~text
index.html
  → app.js（核心入口）
      → 核心壳层、日记、认证、导航
      → routes/wishlist-route.js（首次进入心愿时加载）
      → routes/weekend-route.js（首次进入周末时加载）
      → routes/wardrobe-route.js（首次进入衣柜时加载）
      → routes/secret-route.js（通过密码门后加载）
      → routes/settings-route.js（首次打开设置时加载）
~~~

- app.js 继续作为入口，但必须减少静态 import。
- 每个 route 模块负责一次性 initialize 和重复 activate；初始化必须幂等。
- route 模块接收 app context，不允许反向 import app.js。
- 页面 CSS 从对应 route 入口 import；未打开页面不得出现在首屏 CSS 中。
- 默认日记页和 Splash 所需样式保留为核心资源。

### 5.3 PWA 与缓存

采用 Vite + vite-plugin-pwa + Workbox injectManifest：

- Workbox 负责构建期注入带哈希的预缓存清单。
- 自定义 Service Worker 继续负责 push 和 notificationclick。
- 只预缓存 index.html、核心入口、核心 CSS、Splash 小图标和最小离线壳层。
- 动态路由 chunk、页面 CSS 和普通同源图片首次访问后进入运行时缓存。
- R2 日记/秘密媒体继续由现有容量管理模块写入专用缓存；Service Worker 只读取，不重复写入。
- 新 Worker 安装后等待；只有用户点击“立即更新”才发送 SKIP_WAITING 并刷新。

### 5.4 URL 与历史

顶级页面使用查询参数，不改变 Cloudflare 静态托管路径：

- 日记：/（规范地址；序列化时删除 page 参数）
- 心愿：/?page=wishlist
- 周末：/?page=weekend
- 衣柜：/?page=wardrobe
- 其他已有顶级页面沿用内部页面名。

页面参数必须与 pushPhoto、pushType 等现有参数共存。页面切换只增删 page，不得清空其他合法参数。

### 5.5 偏好与诊断

- 字号复用 modules/preferences-store.js，按 userId 或 guest 分区保存。
- 性能记录只保存在当前设备 localStorage，最多保留最近 20 次启动；不记录用户名、日记内容、完整 URL、Token、邀请码或媒体地址。
- 设置页提供“性能诊断”摘要和“复制诊断信息”，不增加后台数据库。

## 6. 实施阶段

每个阶段必须先完成代码和自动化验证，再进入下一阶段。可以在同一任务内连续执行，但不得跳过阶段门槛。

### 阶段 0：冻结基线和增加可量化门槛

#### 工作

1. 运行并记录：
   - git status --short
   - pnpm test
   - git diff --check
   - 正式站快速网络手机/桌面指标
   - 慢速 4G + 4 倍 CPU 的 DOMContentLoaded、Splash hidden、请求数、传输量和长任务
2. 保存一份机器可读基线到 tests/performance-baseline.json，只包含指标，不包含 Cookie、Header、账号或页面内容。
3. 新增 tests/build-budget.mjs，读取最终 dist 并验证构建产物预算。
4. 现有测试如果硬编码旧 query version 或旧 CORE_ASSETS，应在对应阶段删除，不得为了通过测试保留旧架构。

#### 阶段门槛

- 现有测试结果已记录。
- 新预算测试先能以“基线模式”输出当前数据，切换 Vite 后再改为强制预算。
- 无用户文件被覆盖。

### 阶段 1：解除开屏对远程同步的阻塞

#### 主要文件

- 新增 modules/app-startup-controller.js
- 修改 modules/app-session-controller.js
- 修改 modules/app-splash-controller.js
- 修改 modules/app-feedback-view.js 或现有全局状态视图
- 修改 app.js，仅做装配
- 扩展 tests/static-contracts.mjs、tests/browser-regression.mjs

#### 实现要求

1. 将 app-session-controller.initialize() 拆成职责清楚的两个步骤：
   - initializeLocalSession()：建立 client、注册认证监听、读取本地 session、更新账户 UI、渲染缓存日记。
   - synchronizeRemoteSession()：加载远程日记、通知、上传队列和其他后台同步。
2. app-startup-controller 负责顺序：
   - await restoreCloudflareSessionBackup()
   - await initializeLocalSession()
   - await appSplashController.complete()
   - void synchronizeRemoteSession()
3. 不得继续出现 finally(() => appSessionController.initialize()).finally(() => appSplashController.complete()) 这种把 Splash 串在完整同步后的调用。
4. 后台同步期间：
   - 日记内容区域设置 aria-busy=true。
   - 有缓存时继续显示缓存，不覆盖成空白骨架。
   - 无缓存时使用稳定占位或短状态文字，不闪烁 Spinner。
   - 成功后原地刷新，不切页、不抢焦点、不滚动页首。
   - 失败时保留缓存并显示“暂时离线，正在显示上次内容”一类非阻塞信息。
5. Splash 现有最短可见时间 520ms 和退出 220ms 可保留；减少动态效果时仍立即进入最终状态。
6. Splash complete 保持幂等；无论同步成功、失败、离线或认证失效，都不能永久盖住应用。
7. push 目的地必须等目标路由和必要数据可用后再打开，但不得因此阻塞 Splash。

#### 自动化验收

- 模拟 loadPhotos 永不结束，Splash 仍在本地初始化后结束。
- 模拟 loadPhotos 抛错，缓存日记仍可见，页面可操作。
- 模拟无缓存，出现稳定加载状态且具有正确 aria-busy。
- 同步完成后不改变 activePage、scrollY 和当前焦点。
- reduced-motion 下 Splash 无额外等待。

#### 性能目标

- 已缓存启动：Splash hidden 目标不超过 1.0s。
- 未做 Vite 分包前的慢速冷启动：至少从约 7.6s 降到接近当前 DOMContentLoaded，目标不超过 5.0s。

### 阶段 2：建立图片资产流水线

#### 依赖和文件

- 新增开发依赖 sharp。
- 新增 scripts/optimize-assets.mjs。
- 新增 assets-source/，只保存必要的高分辨率设计源图。
- 输出优化后的 WebP/PNG 到 assets/generated/。
- 新增 tests/asset-budget.mjs。

#### 实现要求

1. optimize-assets 脚本必须是确定性的，重复运行不产生无意义差异。
2. 普通内容图片统一使用 WebP，不维护 JPEG/PNG 双套运行时 fallback。
3. PWA、favicon 和 Apple Touch Icon 继续使用规范要求的 PNG。
4. 至少生成：
   - home-logo：96px 和 192px。
   - black-cat-cover：适合手机和桌面的两个宽度，保留比例。
   - weekend-complete-stamp：透明 1x/2x。
   - food-wheel-icon、anniversary-icon：按真实 CSS 尺寸输出 1x/2x。
   - app-icon：32、180、192、512。
   - maskable-512：主体完全落在安全区，不与 any 图标共用一张伪 maskable 图片。
5. index.html 中品牌 Logo 增加明确 width、height、decoding=async。首屏关键图不得错误设置 lazy；非首屏图片继续 lazy。
6. 封面使用 srcset 和 sizes；所有可见图片预留宽高，保持 CLS。
7. Vite 构建时只有被引用的生成资源进入 dist；assets-source 和 black-cat-logo-source.png 不得进入部署产物。
8. 删除被替代的旧运行时图片，不保留两套路径。

#### 资产预算

- home-logo 单个候选不超过 30KiB。
- weekend 印章 2x 不超过 100KiB。
- 普通 UI 小图标每个不超过 60KiB。
- 首页封面最大候选不超过 250KiB。
- PWA 512 图标不超过 250KiB。
- 首屏同源图片传输目标不超过 500KiB。

#### 视觉验收

- 390×844、1440×900 和高 DPR 截图与当前视觉无可感知退化。
- 圆角、透明边缘、暗色背景和完成印章无白边。
- Logo、封面与图标无拉伸。

### 阶段 3：一次性切换到 Vite 和按需加载

#### 依赖

- 新增开发依赖 vite、vite-plugin-pwa。
- 不引入 UI 框架。
- 锁文件必须提交；不得使用未锁定的 CDN 运行时脚本。

#### 构建文件

- 新增 vite.config.js。
- package.json 增加 dev、build、preview、test:build、assets:optimize。
- public 下放置必须保持固定名字的 _headers、图标和其他 PWA 静态文件。
- dist 成为唯一发布目录。
- 删除 .cloudflare-pages-dist 手工组装流程。

#### 核心改造

1. index.html：
   - 删除全部 ?v=日期 查询串。
   - 删除 20 个页面级 stylesheet 链接。
   - 只保留 Vite 入口和必要静态元信息。
2. app.js：
   - import 核心 CSS。
   - 静态装配默认日记、账户、导航、Splash 和共享基础设施。
   - 不静态 import 心愿、周末、衣柜、秘密相册和大型设置功能的实现模块。
3. 新增 modules/route-loader.js 与 modules/routes/：
   - gallery-route.js
   - wishlist-route.js
   - weekend-route.js
   - wardrobe-route.js
   - secret-route.js
   - settings-route.js
4. 每个 route 文件：
   - import 自己的控制器、视图和 CSS。
   - 暴露 initialize(context) 和 activate(context)。
   - initialize 只执行一次，activate 可重复。
5. app-navigation-controller.switchPage() 改为异步路由激活：
   - 加载前保存滚动位置。
   - 当前导航项显示非布局抖动的 busy 状态。
   - await routeLoader.load(page) 后再显示目标 DOM。
   - 恢复滚动和标题焦点。
   - import 失败时留在当前页，显示可重试错误，不写 fallback 页面实现。
6. CSS 拆分：
   - 核心：Splash、顶部导航、基础 token、默认日记壳层、账户登录。
   - 心愿：wishlist.css、shopping.css 及对应 redesign 片段。
   - 周末：weekend-board.css。
   - 衣柜：wardrobe.css。
   - 秘密相册：secret-gallery.css、secret-filters.css、secret-viewer.css。
   - 日记详情与评论只在首次打开详情时加载。
   - 设置/账户弹窗样式首次打开设置时加载。
7. redesign-foundation.css 与 redesign-components.css 中被迁出的规则必须删除。禁止共享文件和 route CSS 同时定义同一组件。
8. 不盲目使用 manualChunks 把所有代码重新合成一个 vendor 包。先让动态 import 形成自然边界，只对重复依赖或明显碎片做最少配置。
9. route chunk 的输出名保留 route 模块名，使 Workbox 可以明确排除非核心页面；构建测试必须读取最终预缓存清单验证，而不是只相信 glob 配置。
10. 页面切换的点击、键盘、触摸目标保持至少 44×44px；加载状态不得改变按钮边界。

#### 构建验收

- pnpm build 成功并只生成 dist。
- dist/index.html 引用带内容哈希的资源。
- dist 和源码中不再出现 app.js?v=、css?v= 或手写缓存日期版本。
- 首屏不再请求心愿、周末、衣柜和秘密相册的页面 chunk/CSS。
- 首次进入每个页面只加载一次对应 chunk；再次进入使用浏览器缓存。
- app.js 仍只承担装配，不把 route 业务复制回入口。

#### 性能预算

- 首屏静态请求目标不超过 40 个；其中 JS 不超过 25 个、CSS 不超过 6 个。
- 首屏总传输目标不超过 900KiB。
- 首屏 JS 压缩传输目标不超过 220KiB。
- 首屏 CSS 压缩传输目标不超过 70KiB。
- 任一首屏 JS chunk 压缩后不超过 170KiB。
- 慢速 4G + 4 倍 CPU 的应用可交互/Splash hidden 目标为 2–3s。

预算无法达成时必须给出构建产物证据并继续拆分，不能直接调高阈值。

### 阶段 4：重建 Service Worker、缓存头和更新体验

#### 主要文件

- 新增 src/sw.js 或职责等价的独立 Service Worker 源文件。
- 新增 modules/pwa-update-controller.js。
- 修改 vite.config.js。
- 修改 public/_headers。
- 修改 modules/push-controller.js，移除旧手工注册职责。
- 删除根目录旧 service-worker.js 和旧 CACHE_NAME/CORE_ASSETS 清单。

#### 依赖

使用 vite-plugin-pwa 的 injectManifest。按实际 import 明确安装 workbox-precaching、workbox-routing、workbox-strategies、workbox-expiration、workbox-core 等直接依赖；不得依赖 pnpm 不保证暴露的间接依赖。

#### 缓存策略

| 资源 | 策略 | 限制 |
| --- | --- | --- |
| index.html / 导航 | NetworkFirst + 预缓存离线壳层 | 网络失败返回预缓存 index |
| 哈希 JS/CSS | CacheFirst | 文件名变更即新版本 |
| 同源 UI 图片 | CacheFirst + Expiration | 限制条目数和最长时间 |
| manifest / 固定 PWA 图标 | StaleWhileRevalidate 或预缓存最小集合 | 不重复缓存大源图 |
| API 请求 | NetworkOnly | 不把账户/API 响应写入普通 Cache Storage |
| R2 日记/秘密媒体 | 先查现有专用媒体缓存，否则网络 | Service Worker 不新增条目 |

#### 更新体验

1. 注册方式使用 virtual:pwa-register。
2. registerType 使用 prompt，不使用 autoUpdate。
3. onNeedRefresh 显示不阻塞页面的更新条：
   - 文案：“新版本已就绪”。
   - 主操作：“立即更新”。
   - 次操作：“稍后”。
4. 只有点击“立即更新”才调用 updateSW()，由 Worker 响应 SKIP_WAITING。
5. onOfflineReady 只显示一次简短提示，不弹模态框。
6. 更新提示有 aria-live、键盘操作和 44px 点击区；reduced-motion 不依赖动画表达状态。
7. 保留现有 push 和 notificationclick 行为，并验证已打开窗口与新窗口两条路径。

#### _headers

- /service-worker.js：Cache-Control: no-cache, no-store, must-revalidate。
- /index.html 和 /：Cache-Control: no-cache。
- /assets/*：Cache-Control: public, max-age=31536000, immutable。
- 如果 Vite 输出 JS/CSS 不在 /assets/，对对应哈希目录设置相同长缓存。
- 保留当前 CSP、X-Frame-Options、Referrer-Policy、Permissions-Policy 等安全头。
- CSP 只能为真实新增资源做最小调整；不得加入 unsafe-eval 或泛化第三方域名。

#### 验收

- 首次离线安装只缓存最小壳层，不再安装 100 个模块。
- 打开过心愿后离线可再次进入心愿；从未打开的非核心页面离线时给出清晰提示。
- 部署新版本后，旧页面不中途自动刷新。
- 点击“稍后”可继续使用旧版本；点击“立即更新”只刷新一次并进入新版本。
- push 通知、通知点击、应用角标不回退。
- Cache Storage 中旧 Workbox 预缓存会正常清理，日记/秘密专用媒体缓存不被误删。

### 阶段 5：URL、深链接和返回行为

#### 主要文件

- modules/app-navigation-controller.js
- modules/route-loader.js
- modules/app-event-bindings.js
- modules/mobile-diary-controller.js
- modules/push-controller.js
- 新增 modules/app-route-domain.js（只放纯 URL 解析/序列化）

#### 实现要求

1. app-route-domain 提供纯函数：
   - parseRoute(location)
   - serializeRoute(page, currentUrl)
   - normalizePage(value)
2. 用户点击顶级导航：
   - 页面确实变化时 history.pushState。
   - 重复点击当前页不新增历史。
3. popstate：
   - 调用 switchPage(page, { historyMode: "none" })。
   - 不再 push 新记录。
   - 使用已有分页面滚动位置恢复。
4. 设置 history.scrollRestoration = "manual"。
5. 初始加载：
   - 读取 page。
   - 非法值用 replaceState 规范为 gallery。
   - 私密页面仍先经过 PIN 门；取消 PIN 时回到上一合法 URL，不把锁定页暴露为已打开。
6. pushPhoto、pushType 等通知参数：
   - 保留并与 page 共存。
   - 目标打开成功后只删除已消费参数，不清空 page。
7. 手机日记详情当前调用 history.back() 的逻辑必须与顶级历史协调：
   - 如果详情来自应用内部，返回来源页和原滚动位置。
   - 如果详情是直接深链接进入，关闭详情后回到该详情所属顶级页，不退出站点。
8. route 加载失败时 URL 回滚到实际仍显示的页面。

#### 验收

- 依次点击日记→心愿→周末，按两次返回依次回到心愿、日记。
- 前进后恢复页面。
- 刷新 /?page=weekend 仍打开周末。
- 复制 /?page=wishlist 到新上下文能打开心愿。
- 页面返回时滚动位置合理恢复。
- 非法 page 不报错、不留下空页面。
- 秘密页面 PIN 取消、通知深链接、日记详情返回均有自动化测试。

### 阶段 6：应用内字号设置

#### 主要文件

- 新增 modules/text-scale-controller.js。
- 修改 modules/preferences-store.js 的调用方，不复制存储实现。
- 修改设置视图和 settings-event-bindings.js。
- 修改核心 CSS token 与确有必要的组件字号。

#### 产品行为

设置页增加“文字大小”三段选择：

- 标准：100%
- 较大：115%
- 特大：130%

默认标准。访客按 guest 保存；登录用户按 userId 保存。登录状态变化后应用对应分区值，不把 guest 值自动迁移到账号。

#### 实现要求

1. 在 documentElement 设置 data-text-scale=standard|large|xlarge。
2. 使用统一 CSS 自定义属性控制根字号或字体 token；不得在 JS 中遍历元素写 style.fontSize。
3. 将用户需要阅读的正文、表单、导航、状态、卡片标题和元数据改为 rem 或可随 token 缩放的值。
4. 纯装饰图形、边框和固定图标尺寸不随字号无限放大。
5. 容器采用内容驱动高度，禁止通过 overflow:hidden 截断重要文字。
6. 130% 下允许合理换行；不为了保持单行重新缩小文字。
7. 触控区域始终至少 44px，不因标准字号较小而缩小。
8. 设置变化立即预览，不刷新页面，不影响当前滚动位置。
9. viewport 固定策略保持不变。

#### 验收矩阵

- 375×812、390×844、844×390、1440×900。
- 标准/较大/特大。
- 浅色/深色。
- 登录表单、顶部导航、日记卡片、心愿、购物、周末、衣柜、设置弹窗、更新提示。
- 无横向溢出、按钮文字不裁断、焦点不被固定头部遮住。

### 阶段 7：PWA 安装入口与图标

#### 主要文件

- 新增 modules/pwa-install-controller.js。
- 修改设置页视图和事件绑定。
- 修改 Vite PWA manifest 配置。
- 使用阶段 2 生成的 any 与 maskable 图标。

#### 行为

1. 应用已在 standalone 模式运行：安装卡隐藏或显示“已安装”，不能继续弹安装提示。
2. Chromium 支持 beforeinstallprompt：
   - 事件到达前按钮隐藏。
   - 事件到达后显示“安装到主屏幕”。
   - 仅用户点击后调用 prompt()。
   - 使用一次后清空保存的事件。
3. appinstalled 后立即更新设置状态。
4. iOS Safari 不伪造一键安装：
   - 显示简短的“分享 → 添加到主屏幕”说明。
   - 只在确认是 iOS 浏览器且非 standalone 时显示。
5. 其他不支持安装的环境不显示无效按钮。
6. 不在首页自动弹窗，不在每次启动重复打扰。

#### Manifest

- 保留 name、short_name、id、start_url、scope、standalone、portrait 和主题颜色。
- any 与 maskable 使用独立图标条目。
- maskable 主体落在规范安全区内。
- 可增加一张手机截图用于支持它的安装界面，但必须来自真实应用截图且不包含隐私内容。

#### 验收

- Android/桌面 Chromium 的安装按钮只在可安装时出现。
- 接受、取消、已安装三种路径正确。
- iOS 指引只在正确平台出现。
- Lighthouse/PWA manifest 检查无图标和作用域错误。

### 阶段 8：本机性能诊断与持续预算

#### 依赖和文件

- 新增运行时依赖 web-vitals。
- 新增 modules/performance-monitor.js。
- 新增 modules/performance-diagnostics-view.js。
- 修改设置页。
- 扩展 tests/build-budget.mjs 和 browser-regression。

#### 采集内容

- Web Vitals：LCP、CLS、INP、FCP、TTFB。
- 自定义 mark/measure：
  - app-bootstrap-start
  - cached-ui-ready
  - splash-hidden
  - remote-sync-start
  - remote-sync-complete 或 remote-sync-failed
  - first-route-load:页面名
- 环境摘要：
  - 手机/桌面分类
  - standalone/browser
  - reduced-motion
  - online/offline
  - effectiveType（浏览器提供时）
  - 当前构建资源哈希或部署标识

#### 隐私与生命周期

1. 仅保存在当前设备，最多 20 次会话。
2. 不发送到 Cloudflare Worker 或第三方。
3. 不保存完整 URL 查询、用户 ID、账号、日记标题、媒体 URL、错误堆栈中的敏感数据。
4. 只在应用可交互后动态 import web-vitals，不阻塞首屏。
5. 每个指标监听器每次页面加载只注册一次。
6. 设置页提供：
   - 最近一次启动摘要。
   - 最近 20 次中位数。
   - 复制脱敏 JSON。
   - 清除本机性能记录。

#### 预算自动化

build-budget 与 Playwright 性能检查至少断言：

- dist 无超过预算的首屏图片。
- index 只包含允许的核心 CSS/JS。
- 首屏未加载 route chunk。
- 快速本地环境 CLS < 0.05。
- 无超过 200ms 的新增应用初始化长任务；如测试环境噪声导致偶发，应记录明细并使用稳定重复策略，不得直接删除门槛。
- Splash hidden 发生在 remote-sync-complete 之前。

## 7. 文件变更清单

以下为期望边界，实际可根据现有职责微调，但不得把逻辑塞回 app.js。

### 新增

- vite.config.js
- scripts/optimize-assets.mjs
- modules/app-startup-controller.js
- modules/route-loader.js
- modules/app-route-domain.js
- modules/routes/gallery-route.js
- modules/routes/wishlist-route.js
- modules/routes/weekend-route.js
- modules/routes/wardrobe-route.js
- modules/routes/secret-route.js
- modules/routes/settings-route.js
- modules/pwa-update-controller.js
- modules/pwa-install-controller.js
- modules/text-scale-controller.js
- modules/performance-monitor.js
- modules/performance-diagnostics-view.js
- src/sw.js
- public/_headers
- assets-source/
- assets/generated/
- tests/asset-budget.mjs
- tests/build-budget.mjs
- tests/performance-baseline.json

### 重点修改

- app.js
- index.html
- package.json 和 pnpm-lock.yaml
- modules/app-session-controller.js
- modules/app-splash-controller.js
- modules/app-navigation-controller.js
- modules/app-event-bindings.js
- modules/settings-event-bindings.js
- modules/push-controller.js
- modules/preferences-store.js 的装配调用
- 各页面控制器/视图的初始化入口
- styles.css
- styles/redesign-foundation.css
- styles/redesign-components.css
- 各页面 CSS
- deploy-cloudflare-pages.ps1
- docs/MODULE_MAP.md
- docs/release-checklist.md
- README.md
- 现有 tests 下相关契约与浏览器回归

### 删除

- 根目录旧 service-worker.js。
- 旧 manifest.webmanifest（如果由 vite-plugin-pwa 生成）。
- .cloudflare-pages-dist 手工复制发布流程及其忽略项。
- index.html 和源码中的手工 ?v=日期。
- 旧 CACHE_NAME、CORE_ASSETS 和脚本 no-cache 双重版本机制。
- 被优化资源替代的旧大图运行时文件。
- 已迁入 route CSS 的重复共享样式。

## 8. 测试策略

### 8.1 单元测试

- app-route-domain 的解析、序列化、非法值和参数保留。
- text-scale-controller 的标准值、分区存储和非法值归一。
- app-startup-controller 在同步成功、失败、挂起时的阶段顺序。
- route-loader 的单次初始化、重复激活、失败重试。
- 性能记录脱敏、最多 20 条、清除行为。

### 8.2 静态与结构测试

- app.js 不包含新增业务实现。
- 无旧 query version。
- 无旧 CORE_ASSETS。
- 源码无测试账号、Token 或隐私数据。
- viewport 固定策略保持。
- 图片 width/height、alt、loading、decoding 符合用途。
- CSS 组件只有一个责任来源。
- 构建后哈希资源存在，_headers 位于 dist。

### 8.3 浏览器回归

至少覆盖：

- 375×812、390×844、844×390、1440×900。
- 浅色、深色、reduced-motion。
- 首次启动、缓存启动、离线启动。
- 日记→心愿→周末→衣柜和浏览器前进/后退。
- 滚动位置恢复、标题焦点、aria-current。
- 路由 chunk 首次加载和复访缓存。
- 后台日记同步不阻塞 Splash。
- 购物车连续勾选不跳转。
- 周末完成圆圈与无“待完成”UI。
- 三档字号。
- PWA 更新提示与安装入口的可用/不可用状态。
- push notificationclick 既有行为。

### 8.4 PWA 专项

- 清空站点数据后的首次安装。
- 首次离线壳层。
- 打开过和未打开过的动态页面离线行为。
- Worker waiting、稍后、立即更新。
- 更新后只 reload 一次。
- 旧预缓存清除但媒体专用缓存保留。
- manifest、any icon、maskable icon、start_url、scope。

### 8.5 必须执行的命令

~~~powershell
pnpm install
pnpm run assets:optimize
pnpm run build
pnpm test
pnpm run test:build
git diff --check
~~~

部署前还必须执行仓库更新后的 release test。任何测试失败都要修复根因，不得跳过、注释或放宽断言来换取通过。

## 9. 人工验收矩阵

| 环境 | 核心检查 |
| --- | --- |
| 390×844 Android/Chromium | 冷启动、缓存启动、安装按钮、更新提示、字号、返回键 |
| 375×812 iOS/Safari 模拟 | 固定视口、安全区、安装说明、字号 130%、无横向溢出 |
| 844×390 横屏 | 顶栏、页面切换、更新条、设置弹窗不遮挡 |
| 1440×900 桌面 | 日记/VLOG 宽度不回退，心愿/周末不缩窄，浏览器前进后退 |
| 浅色/深色 | 更新条、同步状态、安装卡、性能诊断对比度 |
| reduced-motion | Splash 和页面状态直接到最终状态，无必要动画 |
| 离线 | 核心壳层、已访问动态页面、未访问页面错误提示 |
| 慢速 4G + 4× CPU | Splash hidden、请求数、传输量、长任务、后台同步 |

人工截图不得包含真实密码、邀请码、Token、私密日记或秘密相册内容。无需测试账户。

## 10. 部署流程

### 10.1 改造发布脚本

deploy-cloudflare-pages.ps1 必须：

1. 检查 pnpm 与 Node。
2. 运行完整测试。
3. 运行 pnpm build。
4. 验证 dist/index.html、dist/service-worker.js、dist/_headers 和哈希 assets 存在。
5. 直接部署 dist，不再创建或复制 .cloudflare-pages-dist。
6. 不读取或输出 Token 内容。

### 10.2 预览门槛

1. 先将 dist 部署到非生产分支预览。
2. 对预览 URL 运行 release smoke。
3. 用手机和桌面视口完成核心矩阵。
4. 检查响应头：
   - HTML no-cache。
   - service-worker.js no-store/no-cache。
   - 哈希 assets immutable。
5. 清站点数据后验证首次访问；再复访验证缓存。

### 10.3 正式发布

预览全部通过后才部署 production。发布后：

- 正式站 HTTP 200。
- HTML 引用新哈希。
- Service Worker 是新实现且没有 CORE_ASSETS。
- 更新提示流程可复现。
- 正式站核心页面可切换、返回、刷新。
- 记录正式 URL、唯一预览 URL、部署时间和性能结果。

### 10.4 回滚

如果生产出现白屏、登录不可用、路由无法返回、Service Worker 循环刷新或离线壳层损坏，立即重新部署上一个已验证的 Cloudflare Pages 构建。回滚是重新发布完整旧构建，不在新代码中保留兼容分支。

## 11. 风险与处理

| 风险 | 处理 |
| --- | --- |
| 动态 import 后事件未绑定 | route initialize 幂等，首次激活有测试，重复进入不重复监听 |
| CSS 拆分导致页面闪烁 | await route import 后再显示目标页；不要提前取消当前页 |
| URL 与现有 push 参数冲突 | 纯 route domain 只修改 page，消费参数逐项删除 |
| Service Worker 把新旧 chunk 混用 | 全部构建资源内容哈希；更新由 waiting worker + 用户确认切换 |
| 预缓存仍包含全部 route | 对生成 manifest 做测试，核心 glob 明确排除 route chunk |
| 字号 130% 破坏固定卡片 | 内容驱动高度、允许换行、去掉承载正文区域的固定高度 |
| 图片压缩出现白边/模糊 | 高 DPR 截图、透明背景检查、1x/2x 输出 |
| 性能监测反而拖慢首屏 | 应用可交互后动态 import web-vitals；只注册一次 |
| 私密内容进入诊断记录 | 只记录枚举和数值；测试复制 JSON 不含 URL、用户或内容 |
| 旧媒体缓存被 Workbox 删除 | 旧专用缓存名称列入保留测试，Workbox 只管理自己的前缀 |

## 12. 完成定义

只有同时满足以下条件，Luna 才可以回复“全部完成”：

- 八项目标全部实现，没有把任何一项改成“以后再做”。
- app.js 没有新增业务逻辑。
- 旧查询串版本、旧 Service Worker、旧手工部署目录已删除。
- Vite 构建和动态 route/CSS 拆分真实生效，不只是安装依赖。
- 开屏结束不依赖远程 loadPhotos。
- 图片预算、构建预算和请求预算通过。
- URL、返回、前进、刷新、深链接与滚动恢复通过。
- 三档字号在目标矩阵中无裁断和横向溢出。
- 安装入口、maskable 图标、更新提示、离线壳层通过。
- 本机性能诊断可查看、复制、清除，且不上传数据。
- 购物车、周末圆圈、心愿/周末桌面宽度和现有开屏视觉没有回退。
- pnpm test、pnpm run test:build、release test、git diff --check 全部通过。
- 已完成预览验证、正式部署和正式站复核。
- 没有使用或写入测试账户与敏感信息。
- README、MODULE_MAP 和 release-checklist 已同步为新构建和发布方式。

## 13. Luna 最终回报模板

~~~text
已完成：
- 启动解阻塞：
- 图片优化：
- Vite / 路由 / CSS 分包：
- Service Worker / 更新：
- URL / 返回：
- 字号：
- PWA 安装：
- 本机性能诊断：

性能对比：
- 慢速冷启动 Splash hidden：优化前 / 优化后
- 缓存启动 Splash hidden：优化前 / 优化后
- 首屏请求：优化前 / 优化后
- 首屏传输：优化前 / 优化后
- JS 请求与传输：优化前 / 优化后
- CSS 请求与传输：优化前 / 优化后
- 图片传输：优化前 / 优化后
- LCP / CLS / INP：

验证：
- pnpm test：
- pnpm run test:build：
- release test：
- git diff --check：
- 手机 / 桌面 / 横屏 / 深浅色 / reduced-motion：
- 离线 / 更新 / 安装：
- 购物车与周末回归：

部署：
- 正式站：https://life-vlog-site.pages.dev
- 本次预览：
- 部署时间：
- Worker 更新方式：

未完成：
- 必须为“无”。若仍有项目，不得部署并声称完成。

注意事项：
- 仅列真实遗留风险；没有则写“无”。
~~~

## 14. 实施参考

- Vite 动态 import 会形成独立构建 chunk：https://vite.dev/guide/features
- Vite 静态资源与内容哈希：https://vite.dev/guide/assets.html
- vite-plugin-pwa injectManifest：https://vite-pwa-org.netlify.app/guide/inject-manifest
- vite-plugin-pwa 更新提示：https://vite-pwa-org.netlify.app/guide/prompt-for-update
- Cloudflare Pages 自定义缓存头：https://developers.cloudflare.com/pages/configuration/headers/
- MDN PWA 安装提示：https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
- Web App Manifest 与 maskable 安全区：https://web.dev/learn/pwa/web-app-manifest
- Google web-vitals：https://github.com/GoogleChrome/web-vitals

本规划吸收了 ui-ux-pro-max 的三项顾问结论：长等待使用稳定且可访问的加载反馈；顶级页面应支持深链接和可预测返回；固定视口下必须通过可重排文字、内容驱动高度和应用内字号设置保证可读性。
