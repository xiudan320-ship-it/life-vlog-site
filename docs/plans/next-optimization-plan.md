# 咻蛋之家下一阶段优化与质量加固规划

> Status: Planned
> Scope: 仅在当前任务直接涉及本专项时查阅
> Default loading: No
> Source of truth: 当前源码及对应长期系统文档

> 编写日期：2026-08-27  
> 规划基线：正式站 `https://life-vlog-site.pages.dev`，部署版本 `629038c9.life-vlog-site.pages.dev`  
> 代码审计基线：Luna 任务“执行性能与 PWA 完整升级”的当前工作树  
> 目标执行者：继续由同一个 Luna 任务执行，主任务负责审核、拆解和最终验收

## 1. 结论

当前版本已经解决开屏卡死，并完成 Vite、Workbox、路由业务分包、图片优化、PWA 更新提示和基础性能预算。下一阶段不建议继续重做视觉风格，也不建议迁移框架；最值得投入的是以下六件事：

1. 建立完全不依赖真实账号的登录态与异常态发布门禁，避免再次出现“匿名测试通过、已登录用户全挂”。
2. 让固定预览域名可以完成真实 API 的只读验收，补上当前 CORS 盲区。
3. 修复日记流动态视频重复请求，降低移动网络、电量与解码压力。
4. 将隐藏页面的 HTML 也按路由延迟挂载，继续缩小首屏 DOM、HTML 和入口装配代码。
5. 继续拆分核心 CSS，并用覆盖率与预算约束删除无效规则。
6. 增加本地健康诊断、键盘/读屏/焦点和大字号自动化检查。

推荐分三批发布：

- A 批：测试门禁、预览 CORS、诊断能力。
- B 批：视频生命周期、路由 DOM 和 `app.js` 收口、CSS 分包。
- C 批：无障碍与响应式最终加固、完整线上验收。

每一批都必须独立完成预览验证后再进入正式站，不能把三批未经验证的改动一次性推到生产。

## 2. 当前审计基线

### 2.1 已经达标的部分

- 正式站伪登录态桌面约 1.05 秒退出 Splash，手机约 1.06 秒。
- 两种尺寸均解除 `aria-busy`，没有未捕获 `pageerror`。
- 匿名手机冷加载约 31 个请求，浏览器可见传输约 191 KB。
- 入口 JavaScript gzip 为 125,089 bytes。
- Workbox 预缓存 12 项，业务 route chunk 未进入预缓存。
- 正常 reload 后仍由当前 Service Worker 控制，且没有 waiting worker。
- 手机禁用双指缩放、购物完成不跳转、周末圆圈完成、不显示“待完成”等既有契约已被测试覆盖。

### 2.2 仍然存在的明确问题

| 项目 | 当前证据 | 影响 | 优先级 |
| --- | --- | --- | --- |
| 登录态发布验证仍有盲区 | `tests/release-smoke.mjs` 仍保留 `RELEASE_TEST_USERNAME/PASSWORD` 分支；没有凭据时只验证公开壳 | 容易再次漏掉登录态启动、同步和路由问题 | P0 |
| 预览域名 API CORS 不通 | `codex-preview.life-vlog-site.pages.dev` 请求 Worker 时返回 `Access-Control-Allow-Origin: null` | 预览站无法完成真实远端只读验证 | P0 |
| 视频重复请求 | 同一个 `.mov` 在匿名首页 5 秒内出现 5 次资源请求 | 浪费移动流量、电量和解码资源 | P1 |
| 初始 HTML 过重 | `index.html` 78,823 bytes，包含 180 个按钮、22 个 dialog、47 个 section、486 个 id，且没有 template | 浏览器启动时解析大量尚未访问页面的 DOM | P1 |
| `app.js` 仍偏大 | 2,186 行、66 个静态导入 | 装配边界仍难审核，容易再出现跨路由依赖错误 | P1 |
| 核心 CSS 仍偏大 | 207,034 bytes，gzip 36,698 bytes | 首屏仍下载、解析大量非首屏样式 | P1 |
| 自动无障碍覆盖不足 | 已有零散 aria、触控和 reduced-motion 断言，但没有系统化扫描 | 复杂弹窗、键盘焦点和深浅色问题容易漏检 | P2 |
| 生产错误难回溯 | 有性能诊断，但缺少统一的启动/路由/API/SW 错误快照 | 用户只说“卡住”时仍需人工复现才能定位 | P2 |

说明：跨域图片和视频没有完整的 Resource Timing 传输字节，因此后续媒体优化以“请求数、资源激活数量、解码数量”为主要硬指标，不能只看浏览器显示的 transferSize。

## 3. 不可改变的产品与工程约束

以下规则优先于本规划中的一般建议：

1. 不使用真实测试账户，不要求账号凭据，不在自动化中修改真实业务数据。
2. 手机 viewport 保持 `maximum-scale=1.0`、`user-scalable=no`，不恢复双指缩放。
3. 不添加 migration、兼容层、旧实现 fallback 或双轨代码。
4. 不恢复旧 Service Worker、手工 query version、`CORE_ASSETS` 或旧发布目录。
5. `app.js` 只允许应用初始化、共享状态桥接和模块装配；新增业务逻辑继续放入 `modules/`。
6. 不迁移 React、Vue 等框架；继续使用当前原生 HTML/CSS/JavaScript + Vite。
7. 保持当前视觉语言，不做品牌重设计，不随意更换字体、配色、圆角或导航层级。
8. 保持购物车完成后不跳转、周末圆圈完成、不显示“待完成”、现有开屏视觉、心愿/周末桌面宽度。
9. 保留当前工作区全部既有未提交修改；禁止 reset、checkout 回退和清理用户文件。
10. 优先使用现有 Playwright、Vite、Workbox、web-vitals 和项目测试能力；只有自动无障碍扫描允许增加一个成熟的开发依赖。

## 4. 总体验收指标

### 4.1 可靠性硬门槛

- 匿名、合法伪登录态、过期伪登录态、损坏缓存、API 401、API 500、离线、慢响应八种启动状态均能在 2 秒内退出 Splash。
- 任一启动状态都不得残留 `body[aria-busy]`、`inert` 或不可操作的主界面。
- 启动失败必须显示明确原因和恢复动作；不得只在控制台报错。
- `/`、`/recipes`、`/wishlist`、`/weekend`、`/wardrobe`、`/secret` 和设置入口均有确定的深链接/加载测试。
- 自动化不读取或提交用户名、密码、邀请码、token。

### 4.2 性能目标

- 匿名手机首屏 5 秒内总请求：31 → 不高于 27。
- 同一动态视频首屏请求：5 → 不高于 1；未进入近视口时必须为 0。
- 初始 HTML：78,823 bytes → 不高于 55 KB。
- 核心 CSS：207,034 bytes → 不高于 170 KB，gzip 不高于 32 KB。
- 入口 JavaScript gzip 不得超过 128 KB，目标降到 115–120 KB。
- route chunk 继续按页面加载，不进入 Workbox 预缓存。
- CLS 保持低于 0.05；页面切换和异步媒体不得引入可见跳动。

### 4.3 结构目标

- `app.js` 从 2,186 行降到不高于 1,200 行。
- `app.js` 不得新增业务函数、直接业务 DOM 渲染或页面专属存储读写。
- 初始 `index.html` 只保留应用壳、日记首页和真正跨页面共享的 dialog。
- 页面模板、元素收集、控制器初始化和事件绑定都归属对应 route 模块，并且只执行一次。

### 4.4 UI/无障碍目标

- 关键页面自动扫描无 critical/serious 级别问题。
- 所有图标按钮有可访问名称和正确的 pressed/selected/expanded 状态。
- 路由切换后焦点进入页面标题；返回时恢复来源控件和滚动位置。
- 固定头部、底部栏、更新提示不得遮挡键盘焦点。
- 375、390、430、844×390、768 和 1440 宽度无横向溢出。
- 100%、115%、130% 字号以及 reduced-motion 下布局仍可操作。
- 深色和浅色主题分别验证文字、边框、焦点和状态对比度。

## 5. A 批：发布门禁与环境可靠性

### 阶段 A1：删除真实账号测试路径，建立确定性伪后端

#### 目标

让登录态业务回归完全不依赖真实账号、真实家庭数据或生产写入权限。

#### 代码操作

1. 从 `tests/release-smoke.mjs` 删除以下内容：
   - `RELEASE_TEST_USERNAME`
   - `RELEASE_TEST_PASSWORD`
   - 真实登录与真实增删改业务数据分支
   - 因缺少凭据而降级成“只测公开壳”的双模式结构
2. 新增 `tests/fixtures/cloudflare-api-fixture.mjs`：
   - 用内存 Map 保存 photos、recipes、wishes、shopping、weekend、secret、notifications 等最小数据。
   - 实现当前前端实际调用的 GET/POST/RPC/object 删除响应。
   - 支持按场景返回 401、500、超时、空数组和损坏字段。
   - 每个测试 context 独立初始化，测试结束自动销毁，不写生产数据。
3. 使用 Playwright `context.route()` 拦截 Worker 请求，不增加新的 mock 框架。
4. 新增启动状态矩阵：
   - guest
   - signed-in
   - expired-session
   - corrupt-session-json
   - authenticated-401
   - api-500
   - offline
   - slow-api
5. 登录态 fixture 必须覆盖：
   - 首页启动与账户 UI
   - recipes/weekend 深链接与缓存 scope
   - 心愿和购物完成/筛选
   - 周末圆圈完成
   - 设置弹窗与退出
   - 刷新后状态保持

#### 涉及文件

- `tests/release-smoke.mjs`
- `tests/browser-regression.mjs`
- `tests/fixtures/cloudflare-api-fixture.mjs`（新增）
- `package.json`
- `docs/release-checklist.md`

#### 验收

- 未设置任何凭据时，完整登录态桌面/手机回归仍执行，不得自动跳过。
- 测试期间 Worker 与 D1/R2 不产生任何真实写操作。
- 仓库中不再出现 `RELEASE_TEST_USERNAME`、`RELEASE_TEST_PASSWORD`。

### 阶段 A2：打通固定预览域名的精确 CORS

#### 目标

让稳定预览别名能够访问 Worker，支持发布前真实只读 API 验证。

#### 代码操作

1. 保持 Worker 使用精确 origin allow-list，禁止 `*` 与任意 `pages.dev` 通配。
2. `ALLOWED_ORIGINS` 至少包含：
   - `https://life-vlog-site.pages.dev`
   - `https://codex-preview.life-vlog-site.pages.dev`
3. 不把每次随机部署 URL 加入 allow-list；线上测试统一使用固定预览别名。
4. 对 OPTIONS、GET、POST 和错误响应统一输出正确 CORS 头。
5. 添加 Worker 单测：
   - 正式 origin 允许
   - 固定预览 origin 允许
   - 未知 origin 返回 `null` 或拒绝
   - `Vary: Origin` 始终存在
6. 更新 Worker 部署说明，并在前端预览部署前确认 Worker 配置已生效。

#### 涉及文件

- `cloudflare-worker/src/worker.js`
- `cloudflare-worker/wrangler.toml` 或现有环境变量配置文件
- `tests/worker-object-delete.mjs`，必要时拆出 `tests/worker-cors.mjs`
- `docs/release-checklist.md`

#### 验收

- 预览域名 OPTIONS 预检返回 204。
- `Access-Control-Allow-Origin` 精确等于预览 origin，不是 `*`、`null` 或生产 origin。
- 预览站公开数据和伪登录失败路径可在线验证。

### 阶段 A3：部署脚本增加“预览后再生产”的硬门禁

#### 目标

避免本地测试通过后直接覆盖正式站。

#### 代码操作

1. 调整 `deploy-cloudflare-pages.ps1`：
   - 安装锁定依赖
   - 执行完整本地测试和构建预算
   - 部署固定预览分支
   - 对预览别名执行在线公开、伪会话、深链接、CORS 和 PWA smoke
   - 只有全部通过才允许继续生产部署
   - 生产部署后再次执行只读 smoke
2. 部署输出记录：
   - 预览 URL
   - 正式 URL
   - 唯一部署 URL
   - 入口文件名
   - `sw.js` 哈希
   - Workbox 预缓存条目数
3. token 只从进程环境或用户指定绝对路径读取；不得复制、打印或提交。

#### 验收

- 预览 smoke 任一失败时脚本必须停止，生产部署不得发生。
- 正式部署后的入口和 SW 与本地最终构建哈希一致。

## 6. A 批：诊断与会话失效体验

### 阶段 A4：本地健康诊断快照

#### 目标

以后用户只需复制一段诊断信息，就能区分启动、路由、API、媒体或 SW 问题。

#### 代码操作

1. 新增 `modules/app-health-monitor.js`，只记录：
   - 构建版本和入口文件
   - 当前路由
   - 启动阶段标记
   - 最近的错误类型和时间
   - 网络 online/offline
   - Service Worker active/waiting/controller 状态
   - 最近一次远端同步结果与 HTTP 状态
2. 禁止记录：
   - access token
   - 用户名、邮箱、邀请码
   - 日记正文、图片 URL、家庭数据
3. 监听 `error` 和 `unhandledrejection`，最多保留最近 20 条，使用固定容量覆盖旧记录。
4. 扩展现有 `performance-diagnostics-view.js`：
   - “复制诊断信息”输出脱敏 JSON
   - “清除诊断记录”仅清健康记录，不清账号和缓存
5. API 错误统一分类：401、403、429、5xx、network、timeout，UI 提示必须包含恢复动作。
6. 明确区分：
   - 401：登录已失效，提示重新登录
   - offline/network：保留本地会话和缓存，不错误退出账号
   - 5xx：保留当前内容，提供重试

#### 涉及文件

- `modules/app-health-monitor.js`（新增）
- `modules/performance-monitor.js`
- `modules/performance-diagnostics-view.js`
- `modules/cloudflare-client.js`
- `modules/app-session-controller.js`
- `app.js`（仅装配）

#### 验收

- 人为触发启动异常后 Splash 仍退出，页面显示恢复动作，诊断中出现对应阶段。
- 断网不会被误判为账号失效。
- 诊断文本中搜索 token、用户名、邮箱和用户内容均无结果。

## 7. B 批：媒体网络与电量优化

### 阶段 B1：日记流动态视频单实例激活

#### 目标

消除同一 `.mov` 首屏多次请求，同时保持当前 VLOG/Live Photo 体验。

#### 代码操作

1. 列表初始只渲染 poster，不立刻给所有 `<video>` 设置 `src`。
2. 将视频地址放入 `data-motion-src`，使用现有 IntersectionObserver 体系激活。
3. 同一时刻只允许一个日记流视频处于 active 状态：
   - 进入近视口后设置 `src` 并 `load()`。
   - 离开视口后 pause，移除 `src` 并 `load()` 释放解码器。
   - 快速滚动时取消上一项待激活任务。
4. 列表视频使用 `preload="none"`；详情页继续按当前需要使用 metadata。
5. `navigator.connection.saveData === true` 时禁用列表自动播放，只显示 poster 和 LIVE/VIDEO 标记。
6. 保持：
   - VLOG 详情有声音和控件
   - 手机端点击后显示控件
   - 列表默认静音
   - reduced-motion 下不自动制造额外动效

#### 涉及文件

- `modules/diary-gallery-view.js`
- `modules/diary-feed-controller.js`
- `modules/diary-video-layout.js`
- `modules/vlog-mode.js`
- `tests/browser-regression.mjs`

#### 验收

- 首页 5 秒内同一 `.mov` 请求不高于 1。
- 未进入近视口的视频请求为 0。
- 快速滚动 20 次后最多一个列表视频处于播放/加载状态。
- 首页总请求不高于 27。
- 视频详情、Live Photo、VLOG 声音与控件回归通过。

## 8. B 批：路由 DOM 延迟挂载与装配收口

### 阶段 B2：隐藏页面 HTML 按路由加载

#### 目标

当前只拆了业务 JavaScript 和 CSS，但所有页面 DOM 仍在 `index.html`。本阶段把 HTML 也真正按路由加载。

#### 实现原则

- 使用 Vite 已有的 `?raw` HTML 导入能力，不增加前端框架或模板库。
- 每个 route 执行顺序固定为：`mount → collectElements → initialize → bind → activate`。
- mount、initialize、bind 都必须幂等，只执行一次；activate 可重复执行。
- 共享 dialog 只有在确实会被多个一级页面打开时才留在应用壳。

#### 代码操作

1. 为页面建立模板文件：
   - `modules/routes/templates/recipes.html`
   - `modules/routes/templates/wishlist.html`
   - `modules/routes/templates/weekend.html`
   - `modules/routes/templates/wardrobe.html`
   - `modules/routes/templates/thanks.html`
   - `modules/routes/templates/secret.html`
   - 设置相关页面/弹窗模板
2. 从 `index.html` 删除对应隐藏页面和页面专属 dialog，只保留空 route outlet。
3. 将 `collectAppElements()` 拆成：
   - `collectShellElements()`
   - 各 route 自己的 `collect*Elements(root)`
4. `route-loader.js` 缓存 route Promise、已挂载状态和已绑定状态；并发点击同一路由只能产生一次 import 和一次 bind。
5. 深链接进入时先完成本地 session，再挂载目标模板，最后显示页面。
6. route 加载失败时：
   - 保持原页面可用
   - 显示“页面加载失败，重试”
   - 重试使用同一明确状态机，不复制旧 DOM 作为 fallback
7. Workbox glob 继续排除 route JS、route CSS 和 route 模板产物。

#### 验收

- 初始 HTML 不高于 55 KB。
- 首页 DOM 中不存在 recipes/wishlist/weekend/wardrobe/secret/settings 页面专属控件。
- 每个页面首次进入才出现对应 DOM 和 chunk；再次进入不重复创建节点或绑定事件。
- 所有深链接、浏览器返回、滚动恢复和焦点移动通过。
- 离线时已访问过的 route 可重新进入；未缓存 route 显示明确离线说明。

### 阶段 B3：让 `app.js` 回到纯装配角色

#### 目标

在不引入通用 DI 容器的前提下，降低入口文件的审核成本。

#### 代码操作

1. 将稳定常量移到 `modules/app-config.js`：页面尺寸、存储 key、限制值、固定端点等。
2. 将共享可变状态初始化和受控 accessor 移到 `modules/app-state.js`。
3. 将路由 controller options 的现有大块装配移到 `modules/app-route-context.js`。
4. 将仓储、缓存、上传和后端客户端装配移到 `modules/app-services.js`。
5. `app.js` 最终只保留：
   - 创建 config/state/services
   - 创建共享 controller
   - 创建 route loader/context
   - 绑定应用壳事件
   - 启动 PWA、性能、session 和初始 route
6. 不创建通用 service locator、反射式容器或多层配置系统。
7. 结构测试新增硬规则：
   - `app.js` 不高于 1,200 行
   - 禁止新增 `render*` 业务实现
   - 禁止直接写业务 localStorage key
   - 页面 controller 只能在 route 模块中静态导入

#### 验收

- `app.js` 满足行数和职责规则。
- gallery 启动不加载 recipes、wishlist、weekend、wardrobe、secret、settings controller。
- 入口 JavaScript gzip 不超过 128 KB，目标 115–120 KB。

## 9. B 批：核心 CSS 精简

### 阶段 B4：基于覆盖率移动样式，不做盲删

#### 目标

将非首屏样式移入已有 route chunk，减少核心 CSS 的下载和解析。

#### 代码操作

1. 用 Chromium CSS Coverage 分别采集：
   - 匿名 gallery 桌面/手机
   - 登录态 gallery
   - 每个一级 route
   - 深色、浅色、130% 字号
2. 依据实际使用范围移动样式：
   - 设置/管理检查器样式进入 settings route
   - 页面专属表单样式进入对应 route
   - diary reader/comments 保持 gallery route
   - 真正跨页面的 token、按钮、dialog 基础样式保留核心
3. 合并重复 media query、重复状态选择器和重复颜色声明。
4. 保持现有设计 token；禁止为压体积引入新的压缩 DSL 或 CSS-in-JS。
5. 扩展 `tests/css-health.mjs` 和 `tests/build-budget.mjs`：
   - 核心 CSS raw ≤170 KB
   - gzip ≤32 KB
   - route CSS 不得被重新并入核心
   - 不允许重复 selector 数量反弹

#### 验收

- 所有页面首次加载样式完整，无 FOUC。
- 核心 CSS 达到预算。
- 深浅色、桌面、手机、横屏截图对比无结构性变化。

## 10. C 批：无障碍与移动体验加固

### 阶段 C1：系统化自动扫描与交互检查

#### 目标

把当前零散检查扩展成覆盖关键页面和状态的稳定门禁。

#### 代码操作

1. 增加并锁定 `@axe-core/playwright` 作为开发依赖；不进入生产包。
2. 使用伪后端 fixture 扫描：
   - guest gallery/login
   - signed-in gallery
   - recipes
   - wishlist/shopping
   - weekend
   - wardrobe
   - secret PIN 与相册
   - settings
   - 主要 dialog 打开状态
3. 补充 Axe 不覆盖的手工断言：
   - 路由变化后标题获得焦点
   - dialog 关闭后焦点回到触发按钮
   - Escape 可关闭非强制 dialog
   - sticky header/banner 不遮挡 focus
   - 所有拖拽/滑动行为有按钮替代
   - 关键触控目标不小于 44×44 CSS px
4. 在 375、390、430、844×390、768、1440 下执行。
5. 分别执行 light、dark、reduced-motion、100/115/130% 字号。
6. 明确记录项目例外：手机缩放由用户要求禁用，不将 viewport zoom 规则作为失败项。

#### 验收

- 关键场景 Axe critical/serious 为 0。
- 键盘可完成一级导航、登录、筛选、打开/关闭 dialog、完成/取消完成。
- 焦点不被顶部栏、底部安全区、PWA 更新条遮挡。
- 130% 字号无截断、重叠和横向滚动。

## 11. 测试矩阵

| 维度 | 必测值 |
| --- | --- |
| 会话 | guest、signed-in fixture、expired、corrupt、401 |
| 网络 | online、offline、slow、500、timeout |
| 视口 | 375×812、390×844、430×932、844×390、768×1024、1440×900 |
| 主题 | light、dark |
| 动效 | normal、reduced-motion |
| 字号 | 100%、115%、130% |
| 路由 | gallery、recipes、wishlist、weekend、wardrobe、thanks、secret、settings |
| PWA | 首次安装、已控制 reload、waiting update、确认更新、稍后更新、离线 reload |
| 媒体 | 图片、多图、Live Photo、VLOG、poster、save-data |

## 12. 发布顺序

### A 批发布

1. 完成 A1–A4。
2. 运行完整本地测试。
3. 部署 Worker CORS。
4. 部署固定预览分支并运行在线 smoke。
5. 正式部署并复核 session 状态矩阵与 SW。

### B 批发布

1. 完成 B1–B4。
2. 记录优化前后：HTML、核心 JS/CSS、请求数、视频请求数、DOM 节点数。
3. 完成双构建哈希和 Workbox 清单检查。
4. 预览全路由回归后再发布正式站。

### C 批发布

1. 完成 Axe、键盘、焦点、主题、字号和视口矩阵。
2. 不修改视觉方向，只修复有证据的问题。
3. 预览通过后发布正式站，并完成最终截图/指标归档。

## 13. 每批必须运行的命令

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run test:build
pnpm run test:release
git diff --check
git status --short
```

另外必须完成：

- 两次独立生产构建并比较入口 JS、CSS 和 `sw.js` 哈希。
- 解析最终 `sw.js` 中 Workbox manifest，而不是读取配置推测。
- 使用真实 Chromium 统计请求，不使用源码文件数量代替网络请求数。
- 桌面、手机、横屏、reduced-motion、离线和 PWA reload。
- 预览与正式域名分别执行在线 smoke。

## 14. Definition of Done

只有同时满足以下条件，Luna 才可以报告全部完成：

- 不依赖真实测试账户的完整登录态 fixture 已成为默认发布测试。
- 固定预览域名 CORS 可用，未知 origin 仍被拒绝。
- 部署流程必须先预览验收再生产。
- 同一首屏 `.mov` 请求不高于 1，总请求不高于 27。
- 初始 HTML、核心 CSS、入口 JS 和 `app.js` 达到预算。
- 页面模板按 route 延迟挂载，页面 controller 不回到静态入口。
- app.js 只剩初始化、状态桥接和模块装配。
- Axe、键盘、焦点、主题、字号和视口矩阵通过。
- Splash 在全部故障场景下都能退出并给出恢复动作。
- PWA 更新、离线 reload、深链接和浏览器返回通过。
- 购物完成不跳转、周末圆圈完成、不显示“待完成”、手机禁缩放等功能契约保持不变。
- 正式站完成在线复核，并给出本次唯一部署 URL。
- 最终报告列出真实剩余风险；任何预算或测试未达到时不得声称完成。

## 15. 不纳入本轮的项目

- 不迁移前端框架。
- 不重做数据库表结构。
- 不加入远程用户行为分析或第三方监控 SDK。
- 不重新设计首页视觉、导航、配色或品牌。
- 不实现新的社交、聊天、推荐或 AI 功能。
- 不为未来可能需求建立通用插件系统或配置平台。
- 不以清除浏览器数据、删除 PWA 或要求用户重新安装作为修复方案。

## 16. Luna 最终回报模板

1. 完成的阶段与关键文件。
2. 删除的旧实现和未新增的兼容层。
3. 测试结果：单元、静态、结构、浏览器、Axe、release、PWA。
4. 指标前后对比：
   - HTML bytes
   - entry JS raw/gzip
   - core CSS raw/gzip
   - 冷加载请求数
   - 首屏视频请求数
   - Splash 时间
   - CLS
5. 预览 URL、正式 URL、唯一部署 URL。
6. Service Worker 更新与离线验证结果。
7. 预览 CORS 验证结果。
8. 未使用真实测试账户和凭据的确认。
9. 真实遗留风险；没有则明确写“无未完成的必做项”。
