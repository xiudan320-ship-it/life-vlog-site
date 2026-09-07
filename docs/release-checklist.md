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
- 状态：guest gallery、fixture signed gallery、recipes、wishlist/shopping、weekend、wardrobe、thanks dialog、secret PIN、secret collection，以及 settings dialog。
- 主题/显示：light、dark、100%/115%/130% 动态字号和 reduced-motion。
- 合同：Axe critical/serious=0、一级键盘导航、登录/筛选、dialog Escape 与焦点恢复、路由标题焦点、44 CSS px 触控目标、sticky 不遮挡和无横向溢出；主入口只有一条固定 viewport，手机与短横屏可见文本输入/select/textarea 计算字号至少 16px，页面不依赖全局横向溢出遮罩或触摸拦截。
- 顶部分页：默认顺序为日记、VLOG、心愿、周末、衣柜；可选菜谱/留言/秘藏可启用、禁用、上下排序并在刷新后保持，日记不可关闭，最多启用 5 个入口，VLOG 和留言 dialog 不写入 `?page=`，心情不出现在一级导航；手机五项均完整显示，页面本身无横向溢出，入口和排序按钮至少 44×44px、相邻间距至少 8px。
- 日记筛选：搜索和 tag 在正常文档流中，计算样式不是 sticky/fixed，向下滚动后不会占据手机视口顶部；手机 tag 保持单行并仅在标签容器内横向滚动。
- 设置中心：桌面显示搜索、五组分类侧栏和对应详情；手机先显示分类目录，进入后显示单一分类详情并可返回目录；搜索“密码、通知、缓存”可定位真实设置项，关闭/子弹窗返回焦点正确。

`test:browser`/`c-performance-regression.mjs` 另外验证首页今日心情概览的四种数据状态、两席稳定形状、真实昵称、本人快捷添加、冷启动滚动和 gallery 返回恢复，以及成功态折叠空状态行和桌面/手机紧凑间距；同时验证今日心情按用户/自然日缓存先显示后后台同步、云端成功覆盖缓存、首屏素材不使用 lazy 加载；列表普通视频不触发视频网络加载、进入日记/VLOG 详情后静音自动播放且保留控件、失败可重试、gallery 同步读取秘藏表而不加载秘藏 route、30 轮快速路由 latest-wins、全局等级弹窗、心情日记 375/390/430/768/844×390/1440/2048/3750 视口的完整月历与 4～6 周布局、宽屏中央标题到快捷操作的连续流、右侧今日心情/本月心情上下堆叠且不遮挡中央列、文档宽度不溢出、360×480 透明圆肚罐体资源与实际 clip、0/1/8/31/62 数量与慢速批次、离屏等待与单次焦点动画、瓶体旁月份前后翻页、瓶体点击/键盘重播和中断、reduced-motion、月份切换/路由离开清理、mutation 单项动画、最多心情、趋势 SVG 实际尺寸/路径长度/点 bbox/计算字体/线宽/颜色、月底真实日期覆盖、44×44 命中区、单一键盘焦点、趋势图键盘提示、缓存错误重试、写后 canonical 重读、Picker/编辑/删除，以及既有周末/购物/回复交互。首屏 signed-in 请求预算包含今日心情的单日读取。所有 signed-in 场景均使用 `tests/fixtures/cloudflare-api-fixture.mjs` 的内存 fixture，不使用真实账户、密码、token 或真实业务数据。

### V3 留言与心情瓶专项

- [x] 当前通知与今日概览：首次新增心愿/购物车商品只通知其他家庭成员；每天 20:00（Asia/Tokyo）未记录当日心情时生成一次站内通知并在已订阅设备发送 Push；通知点击可进入对应功能；1440px 普通桌面概览左侧为窄栏上下排列的双人心情面板、右侧为加宽的本月心情日历缩略图并保持上下对齐，宽屏则将两个面板分别放入页面最左和最右侧栏，手机端不增加额外纵向空白。
- [x] 超宽桌面右侧心情栏与本地 Vite 预览登录 CORS 修复已发布到正式站；今日心情位于本月心情上方，正式站、固定 preview 和独立 deployment `67b58c3a` 资源一致，Worker 版本为 `f8bf0660-c73a-4f41-93a1-1ca0c7b2ccf2`，入口为 `index-CWMxKTEB.js`（SHA-256 `9143ca7e133b2638c6c17603c33d640b349ded0cf82c92208eeb570fac7d9bbb`），样式为 `index-yUlLRiav.css`（SHA-256 `138b0780362b4c1a26b37dcea8156465c882ce26c69edc4728b2734d90c2da5b`），`sw.js` SHA-256 为 `0b8b0926f1d3f63dc0563ff1c8aff634eeb8f13eca6d08dcf427d657cf8a2d83`，Workbox 预缓存条目为 44；preview 与 production 均通过线上 CORS、Axe critical/serious 和确定性 fixture release smoke，未使用真实账户或凭证。
- [x] `tests/comment-thread-domain.mjs`：根留言、深层链、孤儿、循环 parent 和重复 id 均稳定输出，每条合法评论最多一行。
- [x] `tests/mood-jar-physics.mjs`：固定种子、瓶壁/瓶底约束、粒子接触、轨迹变化、最终稳定态和 0/1/8/31/62 数量均通过。
- [x] `tests/mood-diary-browser.mjs`：375/390/430/768/844×390/1440/2048/3750 视口通过瓶体 rAF 生命周期、replay/键盘、切月后可见模块锚点稳定、缓存月份重播、部分露出等待焦点带、离开清理、reduced-motion、宽屏中央标题到快捷操作的连续流、侧栏边界和溢出回归。
- [x] `tests/c-performance-regression.mjs`：320/375/390/430/844×390 深层留言保持平面同级 DOM、16px 正文、44px 操作区、表单正常文档流和无横向溢出；手机设置验证缓存容量摘要无 `undefined`、自动缓存开关即时反馈、提示位于打开的 dialog 内并在关闭后清理；手机工具栏验证首屏三张完整卡片、默认顺序、8px 间距、其余入口可横向滑动；同时验证本周回顾、时间纪念册和感谢留言 dialog 的外框/header/body/关闭按钮视觉契约与关闭后焦点恢复。
- [x] 视觉验收：已检查 8/31/62 枚素材从瓶口进入、发生真实接触后自然堆积；深层留言在浅色/深色、横屏和长 URL 下保持同一正文左边界；未以旋转后的外接 bbox 代替内腔判断。
- [x] 瓶体资源门禁：用户参考图经 `scripts/optimize-assets.mjs` 生成透明 `720×960` WebP，`tests/asset-budget.mjs` 校验 `mood-jar.webp` 不超过 120 KiB。
- [x] 工具图标资源门禁：7 个自包含 SVG 均复制到构建产物并进入 Workbox 预缓存；认证首页请求预算为 35 次，包含统一工具栏图标资源。
- [x] 本轮 preview 与 production 已完成发布；固定 preview 和正式地址均通过线上 CORS、Axe critical/serious 与确定性 fixture release smoke。验证场景未使用真实账户、密码或真实业务数据，部署凭证未进入仓库。
- [x] 工具图标替换已发布到正式站；入口为 `index-4DuDc_aD.js`，`sw.js` SHA-256 为 `54c620c733199e665d2c2b765f81eb847a460c0d8b3df871b6ca6cf19d1e6839`，Worker 版本为 `84315072-813a-41fd-bc15-d07db64945fa`，preview 与 production 线上门禁均通过。
- [x] 手机工具栏三入口调整已发布到正式站；入口为 `index-wITx31VG.js`，样式为 `index-D7uLlt8v.css`，`sw.js` SHA-256 为 `42eee9d0d9e69478ea2dffb0be1fb29a01bceba21c8ceb5666c13c4001838a58`，Worker 版本为 `87834079-d7d6-4593-91e1-103824e8b990`，Workbox 预缓存条目为 45，preview 与 production 线上门禁均通过。
- [x] 手机工具栏三张首屏卡片横向触摸轨道及本周回顾/时间纪念册统一 UI 已发布到正式站；入口为 `index-CJmEqXrH.js`，样式为 `index-CgtpDiib.css`，`sw.js` SHA-256 为 `f2d7734c5718d3282acede9dd5c92467b42d90cbc93eaa861aed9f2e501c9d99`，Worker 版本为 `b722b1ea-0e7c-4537-974a-ba501ce00281`，生产 deployment 为 `f174cd2a`，Workbox 预缓存条目为 45，preview 与 production 线上门禁均通过。
- [x] 留言统一 dialog 与心情罐等待态修复已发布到正式站；入口为 `index-CtGR0UKi.js`，样式为 `index-B5TqmHVV.css`，`sw.js` SHA-256 为 `9a4050ef88ed158fbe5b708c461077d63111122fe0ff431f60e904129c8cdcd0`，Worker 版本为 `546766a2-7ea6-4971-968d-0625b507ed9a`，生产 deployment 为 `86245caf`，Workbox 预缓存条目为 45，preview 与 production 线上门禁均通过。
- [x] 家庭新增通知、20:00 心情提醒和桌面今日概览双面板已发布到正式站；入口为 `index-knLnUjJl.js`，样式为 `index-aaA-yE7I.css`，`sw.js` SHA-256 为 `c8cd1f1799e7fb512bac6cd3cda32c101d38fb3b8a643ddbc65d24daf5dc6d19`，Worker 版本为 `439082fc-aa0f-4104-987e-dfee58c4f2b7`，生产 deployment 为 `7bb8cafd`，Workbox 预缓存条目为 45，preview 与 production 线上门禁均通过。
- [x] 桌面今日概览紧凑双人心情面板与本月心情日历缩略网格修复已发布到正式站；入口为 `index-N8PJp_d0.js`，样式为 `index-DUrkK025.css`，`sw.js` SHA-256 为 `19565d43836fa3047a78d67123fbd16cdf72f081cc82ee277ae44f33b276114c`，Worker 版本为 `ff9e6c3d-92b6-44b7-a773-f890b0e7030f`，生产 deployment 为 `3d738108`，Workbox 预缓存条目为 44，preview 与 production 线上门禁均通过。
- [x] 桌面今日概览窄左栏上下排列双人心情卡、加宽右侧本月心情日历和今日心情缓存优先同步已发布到正式站；入口为 `index-DFqa2MKZ.js`（SHA-256 `1dcca6845dd8ee0796529a4fd8a2e3639d0fd8bfa19045c4124d66467fb3dc12`），样式为 `index-zpoFI0-H.css`（SHA-256 `84a2e26f3ee472600c3f673b24a6fd52d6537c35bbc9e7e059ba57954adfd1b6`），`sw.js` SHA-256 为 `f8d15466305809fbb5886be75be972d67e3e7e1e651d4a9180f4428d79c0333c`，Worker 版本为 `977cac93-2e32-4b38-951d-103b48da1ccd`，生产 deployment 为 `a09f2f6b`，Workbox 预缓存条目为 44，preview 与 production 线上 CORS、Axe、确定性 release smoke 和资源更新核对均通过。
- [x] 桌面今日概览左右外框等高对齐修复已发布到正式站；入口为 `index-BXSX6g5z.js`（SHA-256 `89cd5a512d31ad394d82c8791468ddc4aaeb1884fe82bf9834c2b7acf58220be`），样式为 `index-BpteYBCl.css`（SHA-256 `61ab124251db0c08b5bfdca469d5a125345e0e9749b845f1a62a97ed9aae0361`），`sw.js` SHA-256 为 `c686829874ec4f19d644fa5d7988662a308522ff79c6b67cceabe12da01ae682`，Worker 版本为 `27584fe0-bafd-4b0c-b05c-3aa963bce1d7`，生产 deployment 为 `cac2cf7c`，Workbox 预缓存条目为 44，preview 与 production 线上 CORS、Axe、确定性 release smoke 和资源更新核对均通过。
- [x] 桌面两张心情卡填充左右对齐面板已发布到正式站；入口为 `index-Cws5J7YD.js`（SHA-256 `5b8a87ac6a8c2ec15171367a73767e5679035b574195d73be5cd72e0b8a4d07b`），样式为 `index-BqnbwVQF.css`（SHA-256 `2d2a5965a651b412a9c27818d4b169f15038cfc84ec6be8684a407dcb97c053e`），`sw.js` SHA-256 为 `6f81dbe113a37e380506ad9e07615bd336ed5ff0d8fd0367fb52c4a365f9123d`，Worker 版本为 `60f4ebcd-bcfc-4022-8f30-ae626ccb12ec`，生产 deployment 为 `47ce8ab0`，Workbox 预缓存条目为 44，preview 与 production 线上 CORS、Axe、确定性 release smoke 和桌面/短横屏资源规则核对均通过。
- [x] 桌面今日概览双面板左右锚定已发布到正式站；入口为 `index-DuUqADBh.js`（SHA-256 `7b8facfc1ac69873f1fb7791abf2973f322b1d3af5d1092b1473d7755b72e5ad`），样式为 `index-BvYdj0PR.css`（SHA-256 `ddcc64f4e33ace675865d8c2a2f676d5d8d7f33f80fb05807b2fd79aa443f08e`），`sw.js` SHA-256 为 `9b65a00a5c2adc129fb3c6f59f24f46c9eae8a7af3d6869161279dec9d30f568`，Worker 版本为 `553804f0-1258-4372-8c13-9e07d58a0a35`，生产 deployment 为 `20907bce`，Workbox 预缓存条目为 44，preview 与 production 线上 CORS、Axe、确定性 release smoke 和页面边缘对齐规则核对均通过。
- [x] 宽屏今日概览三列侧栏布局已发布到正式站；入口为 `index-DeirAxi3.js`（SHA-256 `0cd682f78dcefc0520ea27544a824e48b3cf4b0a10bd3670aca4fa31d3481065`），样式为 `index-Bc2Elofg.css`（SHA-256 `142b4b3135a3661c1dc0d27afc0dd5ccc562fb784caf6ece437a3d3edd367367`），`sw.js` SHA-256 为 `7635cd00bb98643840f97666cafbc57dbe64cb621b766cefda93adb7899d1889`，Worker 版本为 `2d0d2d96-731f-46d5-acf4-2e61e38306cf`，生产 deployment 为 `14c27dea`，Workbox 预缓存条目为 44，preview 与 production 线上 CORS、Axe、确定性 release smoke 和线上侧栏样式规则核对均通过。
- [x] 超宽屏今日概览中央空白修复已发布到正式站；入口为 `index-BHYBSckO.js`（SHA-256 `a05cdb923264ebc3056065257e5729a699aa2393f03f43694f2640b9cdf724b0`），样式为 `index-v6wSNZnO.css`（SHA-256 `9b5f93649654dc0e4304542f9b9230a1b2382ff92788cffefb102f8c8eb0f8c5`），`sw.js` SHA-256 为 `e495a075899564ebc81f57e33fc9204d9c8c64d16459da9a6d50aa855920a735`，Worker 版本为 `e2b8bd35-4e02-449e-9338-e0e9bb8ca0fd`，生产 deployment 为 `0e97fd9f`，Workbox 预缓存条目为 44，preview 与 production 线上 CORS、Axe、确定性 release smoke 和侧栏脱离中央流规则核对均通过。
- [x] 构建预算：`pnpm run build` 与资源预算通过；入口 JS gzip 为 `122955` bytes，低于当前 `123904` bytes（121 KiB）阈值。

## 3. 发布后只读检查

部署脚本会在本地回归通过后先部署 Worker 并执行精确 CORS 门，再发布 preview。preview 固定别名会使用 `tests/fixtures/cloudflare-api-fixture.mjs` 的确定性假后端执行公开壳、伪会话、深链接、错误矩阵和 PWA 烟雾测试；任何 preview/CORS 门失败都会停止，不会进入正式发布。发布完成后访问正式地址，确认返回状态为 200，并检查本次构建的入口文件名、入口哈希、`sw.js` 哈希和 Workbox 预缓存条目数已经记录且线上版本已更新。发布门禁止真实账户和真实凭证。

Worker CORS 只允许正式站 `https://life-vlog-site.pages.dev`、固定 preview 别名 `https://codex-preview.life-vlog-site.pages.dev`，以及 `localhost` / `127.0.0.1` 的 4173、4176、5173 固定本地端口；OPTIONS、成功响应、认证失败和 5xx 错误响应都必须携带对应的精确 origin 与 `Vary: Origin`，禁止 `*`、任意 `pages.dev` 通配、其他本地端口和随机部署域名加入 allow-list。

## 4. 手动验收清单

登录态回归统一使用确定性假 session 和假后端，分别在桌面端 `1440 x 900` 和手机端约 `390 x 844` 检查：

- 登录、退出、刷新和回到前台后会话仍然正常。
- 首页今日心情：登录冷启动在无显式深链时落到概览；375/390/430 与 844×390 的两席同排、标题到心情卡片间不保留空状态行、素材不超过 64px、触控不小于 44px，130% 字号无横向溢出；普通桌面端两席上下排列且左右面板上下对齐，宽屏端今日心情与本月心情面板上下堆叠在页面右侧栏；今日心情先显示按用户/自然日缓存并后台同步，首屏素材使用 eager 加载；本人空席和双方详情原地打开唯一共享 overlay，关闭恢复 URL/滚动/焦点，对方空席不可编辑；只有“查看心情日历”切换 mood 路由。
- 日记：打开/关闭、长文滚动、多图切换、图片预览、评论、回复、收藏、编辑和删除。
- 生活小工具栏：桌面端 7 个入口的图标均正常加载统一 SVG 资源；手机端首屏显示 3 个完整卡片，默认顺序为时间纪念册、本周回顾、留言，继续左右滑动可查看其余入口，时间纪念册、本周回顾和留言的 dialog/card 外框、标题栏、关闭按钮、边框、圆角、背景和间距统一；留言可从工具栏、顶部分页、通知和 Push 进入，关闭后焦点回到触发入口，不出现首屏半张卡片、横向页面溢出、家庭足迹残留、空白、旧图或布局跳动。
- 心情日记：`?page=mood` 深链接、当前月/跨月 4～6 周完整月历、今天与未来日期边界、360×480 透明圆肚玻璃心情罐（最多 62 枚）、每位成员最多心情、罐体旁月份前后翻页且与月历同步、切月不改变当前可见模块位置、缓存月份同样重新播放、至少半瓶可见且中心进入焦点带后自动慢速播放、整瓶点击/键盘慢速重播、播放中取消重启、月份切换和路由离开清理、三档趋势与按日明细、月底稀疏日期展开、共享八种心情 Picker、可留空正文、标签、自己的新建/编辑/删除、查看另一位成员、写后 canonical 重读、缓存错误重试、历史分页、Back 关闭、深浅色、趋势点键盘提示、reduced-motion、130% 字号和 375/390/430/768/844×390/1440 宽度无溢出；确认页面只有一套 overlay，16 张心情素材及圆肚瓶资源均无棋盘格、白边或裁切。
- 菜谱：新建、封面上传/粘贴、编辑、删除和详情图片显示。
- 心愿：新建、图片上传、编辑、完成反馈、删除和完成/未完成筛选。
- 购物车：手机端紧凑卡片、图片放大、完成/编辑/删除按钮保持可触控，刷新后状态仍然存在。
- 秘藏：密码进入、文件夹/相册、上传、Tag 添加删除、收藏、移动、排序、图片预览和桌面端单张删除（保留最后一张保护）。
- 等级面板：点击顶部等级徽章或经验区域后立即打开面板，云端家庭排行加载完成后再刷新内容。
- 通知：铃铛在未加载设置路由时也可点击；dialog 先开窗再加载，慢网显示 loading，空结果显示 empty，读取失败显示 error 与重试；重复点击只复用一个请求，加载中关闭后不自动重开，关闭恢复铃铛焦点；新日记、评论和回复提示打开后会消失，自己发布的内容不提醒自己；家庭成员新增心愿/购物车商品会提醒其他成员，20:00 未记录心情会出现晚间提醒，点击通知进入对应页面。
- 设置 → 通知与工具：懒加载进入设置后“关闭这台设备”可点击；操作期间按钮显示 busy/disabled；本机 Push 订阅先关闭，即使 Worker 清理失败也明确反馈本机已关闭并允许后续重试，重复点击不会并发执行。
- 手机 viewport：在 375×812、390×844、430×932 和 844×390 检查页面仍可纵向滚动、无横向溢出，文本控件聚焦不放大页面；日记/秘藏媒体查看器仍可局部缩放、拖拽，系统返回手势可用。
- 离线与缓存：断网时能打开已缓存内容，恢复网络后不会重复上传或重复请求。
- 桌面今日概览：1440px 普通桌面左侧窄栏上下排列紧凑双人心情卡，右侧加宽本月心情日历缩略网格在同一布局行内并上下对齐；宽屏把两个面板分别放入页面最左和最右侧栏，侧栏不参与中央流的行高，标题后 12–24px 内衔接快捷操作且明显早于侧栏底部，中央内容不被覆盖，document width 不超过 viewport，心情素材不超过 64px，左侧不因右侧高度产生空白；手机端右侧日历隐藏且原有两席保持紧凑。
- 深色/浅色模式、头像、昵称、家庭成员名称和长列表滚动没有错位或溢出。

发现问题时记录：设备/浏览器、页面、操作步骤、预期结果、实际结果和截图。修复后重新从第 1 步开始验收。

## 5. 凭证规则

- 不把密码、Worker token、邀请码、邮箱密钥提交到 Git。
- 发布前检查 `git diff`，确认没有凭证、临时截图和本地配置文件。
