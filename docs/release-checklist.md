# 发布前验收

每次发布前都要完成本地回归，发布后检查正式地址的资源和页面行为。任意本地检查失败都不要发布。

## 1. 本地检查

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run test:a11y
pnpm run test:release
pnpm run test:build
git diff --check
```

`test:a11y` 默认访问 `http://127.0.0.1:4176`，执行前先在终端 A 保持本地预览运行：

```powershell
pnpm exec vite preview --host 127.0.0.1 --port 4176
```

然后在终端 B 执行无障碍和发布 smoke；两者都使用确定性 fixture：

```powershell
$env:A11Y_BASE_URL = "http://127.0.0.1:4176"
pnpm run test:a11y
$env:RELEASE_BASE_URL = "http://127.0.0.1:4176"
pnpm run test:release
```

发布门必须同时通过完整功能测试、Axe critical/serious 扫描、确定性 fixture 发布 smoke 和差异检查；`pnpm test` 只覆盖功能/结构/构建/基础浏览器回归，不代替 `test:a11y` 或在线发布门。

## 2. C 批专项矩阵

`test:a11y` 使用最小覆盖矩阵而不是笛卡尔积：

- 视口：375、390、430、768、1440，以及 844 x 390 横屏。
- 状态：guest gallery、fixture signed gallery、recipes、wishlist/shopping、weekend、wardrobe、thanks、secret PIN、secret collection，以及 settings dialog。
- 主题/显示：light、dark、100%/115%/130% 动态字号和 reduced-motion。
- 合同：Axe critical/serious=0、一级键盘导航、登录/筛选、dialog Escape 与焦点恢复、路由标题焦点、44 CSS px 触控目标、sticky 不遮挡和无横向溢出；主入口只有一条固定 viewport，手机与短横屏可见文本输入/select/textarea 计算字号至少 16px，页面不依赖全局横向溢出遮罩或触摸拦截。
- 顶部分页：默认顺序为日记、VLOG、心愿、周末、衣柜；可选菜谱/留言/秘藏可启用、禁用、上下排序并在刷新后保持，日记不可关闭，VLOG 不写入 `?page=`，心情不出现在一级导航；导航过多时只有导航行横向滚动，页面本身无横向溢出，入口和排序按钮至少 44×44px、相邻间距至少 8px。
- 日记筛选：搜索和 tag 在正常文档流中，计算样式不是 sticky/fixed，向下滚动后不会占据手机视口顶部。

`test:browser`/`c-performance-regression.mjs` 另外验证首页今日心情概览的四种数据状态、两席稳定形状、真实昵称、本人快捷添加、冷启动滚动和 gallery 返回恢复；同时验证列表普通视频不触发视频网络加载、进入日记/VLOG 详情后静音自动播放且保留控件、失败可重试、gallery 同步读取秘藏表而不加载秘藏 route、30 轮快速路由 latest-wins、全局等级弹窗、心情日记 375/390/430/768/844×390/1440 视口的完整月历与 4～6 周布局、360×480 透明圆肚罐体资源与实际 clip、0/1/8/31/62 数量与慢速批次、离屏等待与单次视口动画、瓶体点击/键盘重播和中断、reduced-motion、月份切换/路由离开清理、mutation 单项动画、最多心情、趋势 SVG 实际尺寸/路径长度/点 bbox/计算字体/线宽/颜色、月底真实日期覆盖、44×44 命中区、单一键盘焦点、趋势图键盘提示、缓存错误重试、写后 canonical 重读、Picker/编辑/删除，以及既有周末/购物/回复交互。首屏 signed-in 请求预算包含今日心情的单日读取。所有 signed-in 场景均使用 `tests/fixtures/cloudflare-api-fixture.mjs` 的内存 fixture，不使用真实账户或真实业务数据。

### V3 留言与心情瓶专项

- [x] `tests/comment-thread-domain.mjs`：根留言、深层链、孤儿、循环 parent 和重复 id 均稳定输出，每条合法评论最多一行。
- [x] `tests/mood-jar-physics.mjs`：固定种子、瓶壁/瓶底约束、粒子接触、轨迹变化、最终稳定态和 0/1/8/31/62 数量均通过。
- [x] `tests/mood-diary-browser.mjs`：375/390/430/768/844×390/1440 视口通过瓶体 rAF 生命周期、replay/键盘、切月/离开清理、reduced-motion、趋势和溢出回归。
- [x] `tests/c-performance-regression.mjs`：320/375/390/430/844×390 深层留言保持平面同级 DOM、16px 正文、44px 操作区、表单正常文档流和无横向溢出。
- [x] 视觉验收：已检查 8/31/62 枚素材从瓶口进入、发生真实接触后自然堆积；深层留言在浅色/深色、横屏和长 URL 下保持同一正文左边界；未以旋转后的外接 bbox 代替内腔判断。
- [x] 瓶体资源门禁：用户参考图经 `scripts/optimize-assets.mjs` 生成透明 `720×960` WebP，`tests/asset-budget.mjs` 校验 `mood-jar.webp` 不超过 120 KiB。
- [x] 本轮 preview 与 production 已完成发布；固定 preview 和正式地址均通过线上 CORS、Axe critical/serious 与确定性 fixture release smoke。验证场景未使用真实账户、密码或真实业务数据，部署凭证未进入仓库。
- [x] 构建预算：`pnpm run build` 与资源预算通过；入口 JS gzip 为 `122878` bytes，低于当前 `122880` bytes（120 KiB）阈值。

## 3. 发布后只读检查

部署脚本会在本地回归通过后先部署 Worker 并执行精确 CORS 门，再发布 preview。preview 固定别名会使用 `tests/fixtures/cloudflare-api-fixture.mjs` 的确定性假后端执行公开壳、伪会话、深链接、错误矩阵和 PWA 烟雾测试；任何 preview/CORS 门失败都会停止，不会进入正式发布。发布完成后访问正式地址，确认返回状态为 200，并检查本次构建的入口文件名、入口哈希、`sw.js` 哈希和 Workbox 预缓存条目数已经记录且线上版本已更新。发布门禁止真实账户和真实凭证。

Worker CORS 只允许 `https://life-vlog-site.pages.dev` 与固定 preview 别名 `https://codex-preview.life-vlog-site.pages.dev`；OPTIONS、成功响应、认证失败和 5xx 错误响应都必须携带对应的精确 origin 与 `Vary: Origin`，禁止 `*`、任意 `pages.dev` 通配和随机部署域名加入 allow-list。

## 4. 手动验收清单

登录态回归统一使用确定性假 session 和假后端，分别在桌面端 `1440 x 900` 和手机端约 `390 x 844` 检查：

- 登录、退出、刷新和回到前台后会话仍然正常。
- 首页今日心情：登录冷启动在无显式深链时落到概览；375/390/430 与 844×390 的两席同排、素材不超过 64px、触控不小于 44px，130% 字号无横向溢出；本人空席和双方详情原地打开唯一共享 overlay，关闭恢复 URL/滚动/焦点，对方空席不可编辑；只有“查看心情日历”切换 mood 路由。
- 日记：打开/关闭、长文滚动、多图切换、图片预览、评论、回复、收藏、编辑和删除。
- 心情日记：`?page=mood` 深链接、当前月/跨月 4～6 周完整月历、今天与未来日期边界、360×480 透明圆肚玻璃心情罐（最多 62 枚）、每位成员最多心情、整瓶点击/键盘慢速重播、播放中取消重启、月份切换和路由离开清理、三档趋势与按日明细、月底稀疏日期展开、共享八种心情 Picker、可留空正文、标签、自己的新建/编辑/删除、查看另一位成员、写后 canonical 重读、缓存错误重试、历史分页、Back 关闭、深浅色、趋势点键盘提示、reduced-motion、130% 字号和 375/390/430/768/844×390/1440 宽度无溢出；确认页面只有一套 overlay，16 张心情素材及圆肚瓶资源均无棋盘格、白边或裁切。
- 菜谱：新建、封面上传/粘贴、编辑、删除和详情图片显示。
- 心愿：新建、图片上传、编辑、完成反馈、删除和完成/未完成筛选。
- 购物车：手机端紧凑卡片、图片放大、完成/编辑/删除按钮保持可触控，刷新后状态仍然存在。
- 秘藏：密码进入、文件夹/相册、上传、Tag 添加删除、收藏、移动、排序、图片预览和桌面端单张删除（保留最后一张保护）。
- 等级面板：点击顶部等级徽章或经验区域后立即打开面板，云端家庭排行加载完成后再刷新内容。
- 通知：铃铛在未加载设置路由时也可点击；dialog 先开窗再加载，慢网显示 loading，空结果显示 empty，读取失败显示 error 与重试；重复点击只复用一个请求，加载中关闭后不自动重开，关闭恢复铃铛焦点；新日记、评论和回复提示打开后会消失，自己发布的内容不提醒自己。
- 设置 → 通知与工具：懒加载进入设置后“关闭这台设备”可点击；操作期间按钮显示 busy/disabled；本机 Push 订阅先关闭，即使 Worker 清理失败也明确反馈本机已关闭并允许后续重试，重复点击不会并发执行。
- 手机 viewport：在 375×812、390×844、430×932 和 844×390 检查页面仍可纵向滚动、无横向溢出，文本控件聚焦不放大页面；日记/秘藏媒体查看器仍可局部缩放、拖拽，系统返回手势可用。
- 离线与缓存：断网时能打开已缓存内容，恢复网络后不会重复上传或重复请求。
- 深色/浅色模式、头像、昵称、家庭成员名称和长列表滚动没有错位或溢出。

发现问题时记录：设备/浏览器、页面、操作步骤、预期结果、实际结果和截图。修复后重新从第 1 步开始验收。

## 5. 凭证规则

- 不把密码、Worker token、邀请码、邮箱密钥提交到 Git。
- 发布前检查 `git diff`，确认没有凭证、临时截图和本地配置文件。
