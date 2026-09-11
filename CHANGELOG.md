# 变更日志

本文件记录咻蛋之家所有重要修改。格式参考 Keep a Changelog；尚未发布的修改进入 `[Unreleased]`。

## [Unreleased]

暂无未发布修改。

## [2026-09-12] — 项目加固与生产发布

### Release

- 已从 `main` 提交 `8945fbbee878300123963d643c72d0cb189b5357` 发布到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，生产 deployment 为 `37c7589f`（`https://37c7589f.life-vlog-site.pages.dev`），固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`。Worker `life-vlog-r2-upload` 版本为 `cfa822fa-f472-4d3f-9c09-b5532dfba9e5`；入口为 `index-Dj4W9B4v.js`（SHA-256 `656c78d6acf5265cee9482e7445f9fbbb05d0b2a58b217e8e088b05b8edc526f`），样式为 `index-lkdtTyVd.css`（SHA-256 `0b8a252395adab07b41c46ea5d6d252d16f231dd3b9c42579af00c08c101c2da`），`sw.js` SHA-256 为 `c25960e705c46304fe5a33880c9da31c1399e4524ae3b436e146455d1d5db201`，Workbox 预缓存条目为 32；本地完整测试、preview 与 production 的 Worker CORS、Axe critical/serious 和确定性 release smoke 均通过。
- 发布前只读核查确认目标 D1 已存在 `user_profiles.secret_default_folder_id`，未执行远程 DDL；本次发布未创建额外云资源。

### Security

- 通用表写入现在严格区分 `insert` / `upsert`，固定冲突目标并保持归属不可变；最终 conflict update 也受写作用域守卫保护，canonical reread 不会回传竞态中出现的私有记录；未知筛选字段、空 `in` 和跨家庭/私有记录写入不会再误改或误删数据。Worker 异步异常统一返回安全的 500 JSON 与精确 CORS。

### Fixed

- 在线退出登录会撤销当前服务器 session，并在本地清理完成后准确反馈服务器撤销、网络失败和本地清理失败；重复点击及迟到请求不会恢复旧账号。
- 重复收藏现在经由 Worker 幂等 upsert，真实 repository/client/SQLite 链路只保留一条收藏和一条通知；登录或注册时 IndexedDB 备份失败不会再返回无事件的假失败，而会保持在线 session 一致并明确提示备份状态。
- 手机首页冷启动将原本每次都会加载的日记样式纳入首屏入口和预缓存，初始化本地会话时不再重复触发初始路由；gallery 首页路由先就绪再撤屏，其他深链继续保持非阻塞开屏，远端同步不阻塞首页。Service Worker 导航改为带 `no-store` 的网络优先并回退到安装时的应用壳，断网重载和断网深链仍可直接显示缓存首页。
- 家庭成员信息晚到时保留同账号仍有效的今日心情缓存，过滤离开的成员；切换账号或日期仍清空旧数据并重验。
- 修复心情日记页面和首页今日心情重复等待云端、同一日期并发重复请求的问题；新鲜缓存现在可直接进入页面，过期缓存后台同步，账号切换时旧请求不会污染当前状态。
- 心情提醒改为日本时间每天 18:00，仅提醒当天尚未记录的用户；按 cron 分流提醒和凌晨 03:20 备份，修复备份同时触发提醒的问题。
- 手机日记页下拉刷新扩展到主内容区，增加随手势旋转、松开刷新、成功/失败反馈及 reduced-motion 支持；修复取消/横滑/多指后指示器残留和重复刷新。

### Changed

- 客户端移除旧的 `onConflict` 请求字段，心情日记与收藏由 Worker 固定冲突契约处理；已打开的旧页面在更新后需要刷新。
- 发布流程改为 preview 上传、alias/Axe/release smoke 全部通过后才部署 Worker/CORS，再复用同一构建发布 production Pages；Wrangler 固定为 `4.131.0`。
- 衣柜按 domain/view/controller 拆分，保持原有 CSS、字段、筛选和图片流程；Worker 通用表逻辑也拆到独立配置、查询和 API 模块。
- 心情罐下方的成员统计改为每位成员独立占一行；精简发布日记表单，移除上传说明文字。
- 简化发布规则和入口：脚本强制检查干净且已推送的 `main`，复用完整测试的一次构建，自动运行本地预览验收并关闭服务，固定先预览后正式发布；上传前检查源码与完整构建未变，移除自定义预览分支及 dirty 上传标记。

### Removed

- 删除 `modules/cloudflare-client.js` 中无调用的旧 `storage.from().upload/remove` API，以及旧的 `modules/wardrobe.js` 兼容入口。

### Documentation

- 精简 `AGENTS.md` 的重复文档流程，统一由 `docs/README.md` 和 `docs/CHANGE_WORKFLOW.md` 负责路由与记录；发布历史和已完成移动端专项已归档至 `docs/history/`。
- `user_profiles.secret_default_folder_id` 已纳入当前 schema；发布前只读核查确认目标 D1 已有该列，未执行远程 DDL；结构差异仍需在发布前核查后按授权显式处理。
- 固定 `main` 为默认开发及正式发布来源，明确干净源码与远程同步检查、同一构建先预览验收再正式发布，以及临时分支/工作树收尾规则；纯文档更新不触发网站重部署。

## [2026-09-07] — 现有 UI 基准同步

### Documentation

- 明确取消蓝月 / P3R 改版方向，建立 `DESIGN.md` 作为现有 UI 的开发入口；保留当前浅色/深色绿色系风格、布局和黑猫原图及 Logo，按改动风险验收，不改变页面实现。

- 已推送并将 `4337cb8` 发布到正式站，生产 deployment 为 `bf7ae9ea`，Worker 版本为 `2bda3a30-a74c-4681-bb9b-662adf65e006`。发布前确认入口 JS、CSS、SW 与原正式站哈希一致；完整本地回归、本地及 preview/production 的 Axe 和确定性 fixture release smoke、线上 CORS 均通过，发布后 44 个构建文件与正式站逐一核对一致。

## [2026-09-07]

### Changed

- 发布桌面端日记流四列瀑布流到 Cloudflare Pages 正式站：桌面端改为四列瀑布流，保留 920px 以下和移动端现有两列/单列设置、卡片操作与无横向溢出约束；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `b6b217c8`，preview 与 production 均通过线上 CORS、Axe critical/serious 和确定性 fixture release smoke。
- 发布脚本的 Pages alias 就绪探测改用根入口的一次性 cache-busting 查询参数，随本次 preview/production 发布生效，避免边缘缓存旧入口导致误判发布失败。

## [2026-09-06]

### Changed

- 发布超宽桌面今日概览右侧心情栏调整与本地 Vite 预览登录 CORS 修复到 Cloudflare Pages 正式站：今日心情面板位于本月心情日历上方，两个面板共享右侧栏且不撑高中央内容流；正式站和固定 preview 均允许精确的本地开发端口 origin。正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，本次 deployment 为 `67b58c3a`，Worker 版本为 `f8bf0660-c73a-4f41-93a1-1ca0c7b2ccf2`，入口为 `index-CWMxKTEB.js`（SHA-256 `9143ca7e133b2638c6c17603c33d640b349ded0cf82c92208eeb570fac7d9bbb`），样式为 `index-yUlLRiav.css`（SHA-256 `138b0780362b4c1a26b37dcea8156465c882ce26c69edc4728b2734d90c2da5b`），`sw.js` SHA-256 为 `0b8b0926f1d3f63dc0563ff1c8aff634eeb8f13eca6d08dcf427d657cf8a2d83`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke，线上 HTML/CSS 已核对包含右侧栏规则。

### Fixed

- 发布超宽屏今日概览中央空白修复到 Cloudflare Pages 正式站：左右心情面板继续占用页面两侧栏，但改由标题后的零高度锚点独立定位，不再撑高中央内容流；快捷操作和后续日记内容现在紧接标题自然上移，并新增 2048px/3750px 防回归断言。正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `0e97fd9f`，Worker 版本为 `e2b8bd35-4e02-449e-9338-e0e9bb8ca0fd`，入口为 `index-BHYBSckO.js`（SHA-256 `a05cdb923264ebc3056065257e5729a699aa2393f03f43694f2640b9cdf724b0`），样式为 `index-v6wSNZnO.css`（SHA-256 `9b5f93649654dc0e4304542f9b9230a1b2382ff92788cffefb102f8c8eb0f8c5`），`sw.js` SHA-256 为 `e495a075899564ebc81f57e33fc9204d9c8c64d16459da9a6d50aa855920a735`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke，线上样式已核对包含超宽侧栏脱离中央流规则。

## [2026-09-05]

### Added

- 为家庭通知增加心愿、购物车商品和晚间心情提醒：成员首次新增心愿或购物车商品时通知其他家庭成员；每天东京时间 20:00 为尚未记录当日心情的成员创建一次站内提醒，并向已订阅设备发送 Push，通知点击可进入对应功能。

### Changed

- 发布宽屏今日概览三列侧栏布局修复到 Cloudflare Pages 正式站：今日双人心情框进入页面最左侧空白栏，本月心情日历进入页面最右侧空白栏，标题与快捷操作保持在中央内容列；普通桌面、手机端和短横屏布局保持不变。正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `14c27dea`，Worker 版本为 `2d0d2d96-731f-46d5-acf4-2e61e38306cf`，入口为 `index-DeirAxi3.js`（SHA-256 `0cd682f78dcefc0520ea27544a824e48b3cf4b0a10bd3670aca4fa31d3481065`），样式为 `index-Bc2Elofg.css`（SHA-256 `142b4b3135a3661c1dc0d27afc0dd5ccc562fb784caf6ece437a3d3edd367367`），`sw.js` SHA-256 为 `7635cd00bb98643840f97666cafbc57dbe64cb621b766cefda93adb7899d1889`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke，线上样式已核对包含宽屏侧栏规则。

- 发布桌面今日概览双面板左右锚定修复到 Cloudflare Pages 正式站；左侧双人心情面板与右侧本月心情日历已贴齐页面内容左右边缘，手机端和短横屏布局保持不变。正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `20907bce`，Worker 版本为 `553804f0-1258-4372-8c13-9e07d58a0a35`，入口为 `index-DuUqADBh.js`（SHA-256 `7b8facfc1ac69873f1fb7791abf2973f322b1d3af5d1092b1473d7755b72e5ad`），样式为 `index-BvYdj0PR.css`（SHA-256 `ddcc64f4e33ace675865d8c2a2f676d5d8d7f33f80fb05807b2fd79aa443f08e`），`sw.js` SHA-256 为 `9b65a00a5c2adc129fb3c6f59f24f46c9eae8a7af3d6869161279dec9d30f568`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。

- 发布桌面今日概览紧凑双人心情面板与本月心情日历缩略网格修复到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `3d738108`，Worker 版本为 `ff9e6c3d-92b6-44b7-a773-f890b0e7030f`，入口为 `index-N8PJp_d0.js`（SHA-256 `9d6a6488e5609ebe11757ea6a62ffe39111eec3e5ca2e1c058b53c2951a02096`），样式为 `index-DUrkK025.css`（SHA-256 `d95a60e673390159153528e13aa46b43223cf954d119a3a1bd87ceefd28496b9`），`sw.js` SHA-256 为 `19565d43836fa3047a78d67123fbd16cdf72f081cc82ee277ae44f33b276114c`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。

- 发布桌面今日概览窄左栏上下排列双人心情卡、加宽右侧本月心情日历，以及今日心情按用户/自然日缓存优先与后台同步修复到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `a09f2f6b`，Worker 版本为 `977cac93-2e32-4b38-951d-103b48da1ccd`，入口为 `index-DFqa2MKZ.js`（SHA-256 `1dcca6845dd8ee0796529a4fd8a2e3639d0fd8bfa19045c4124d66467fb3dc12`），样式为 `index-zpoFI0-H.css`（SHA-256 `84a2e26f3ee472600c3f673b24a6fd52d6537c35bbc9e7e059ba57954adfd1b6`），`sw.js` SHA-256 为 `f8d15466305809fbb5886be75be972d67e3e7e1e651d4a9180f4428d79c0333c`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke，线上资源已核对更新。

- 发布桌面今日概览左右外框等高对齐修复到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `cac2cf7c`，Worker 版本为 `27584fe0-bafd-4b0c-b05c-3aa963bce1d7`，入口为 `index-BXSX6g5z.js`（SHA-256 `89cd5a512d31ad394d82c8791468ddc4aaeb1884fe82bf9834c2b7acf58220be`），样式为 `index-BpteYBCl.css`（SHA-256 `61ab124251db0c08b5bfdca469d5a125345e0e9749b845f1a62a97ed9aae0361`），`sw.js` SHA-256 为 `c686829874ec4f19d644fa5d7988662a308522ff79c6b67cceabe12da01ae682`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke，正式资源已核对包含等高对齐规则。

- 发布桌面心情卡填充左右对齐面板修复到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `47ce8ab0`，Worker 版本为 `60f4ebcd-bcfc-4022-8f30-ae626ccb12ec`，入口为 `index-Cws5J7YD.js`（SHA-256 `5b8a87ac6a8c2ec15171367a73767e5679035b574195d73be5cd72e0b8a4d07b`），样式为 `index-BqnbwVQF.css`（SHA-256 `2d2a5965a651b412a9c27818d4b169f15038cfc84ec6be8684a407dcb97c053e`），`sw.js` SHA-256 为 `6f81dbe113a37e380506ad9e07615bd336ed5ff0d8fd0367fb52c4a365f9123d`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke，线上资源已核对包含桌面填充与短横屏回退规则。

- 发布新版设置中心恢复与缓存设置装配修复到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `f123ddd7`，Worker 版本为 `e0bd6723-e5cd-4aaf-b9de-a0055d12feb9`，入口为 `index-vvlJN4L3.js`（SHA-256 `6338930fd1b98730e0c8e312191090cd140840804e08657d747eb4cebbbbef2b`），样式为 `index-B5TqmHVV.css`（SHA-256 `3c9d620479979496f335808019b52da2a70fa25c61ea0a97c4cef051a0b23bcf`），`sw.js` SHA-256 为 `fcda7a434716379a039f9a4d669572bab4cdfab56823366195c03d46eaf6010f`，Workbox 预缓存条目为 44；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 发布家庭新增通知、20:00 心情提醒和桌面今日概览双面板到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `7bb8cafd`，Worker 版本为 `439082fc-aa0f-4104-987e-dfee58c4f2b7`，入口为 `index-knLnUjJl.js`（SHA-256 `d5a75a7ecc198b8d8b08ed14ab43170f9bc01359ec206a8f249c5b7c1430370e`），样式为 `index-aaA-yE7I.css`（SHA-256 `8c445aa971cfeb7fea782aa6839b4b48afae8d31ca6cea8c41b87713e1227ecb`），`sw.js` SHA-256 为 `c8cd1f1799e7fb512bac6cd3cda32c101d38fb3b8a643ddbc65d24daf5dc6d19`，Workbox 预缓存条目为 45；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 电脑端今日概览改为左侧双成员心情面板、右侧本月心情罐缩略图；保留手机端紧凑双席布局并隐藏额外缩略面板。

### Fixed

- 修复新增心愿/购物车商品没有通知其他家庭成员的问题，并增加晚间提醒的东京时区计算和按天幂等去重。
- 修复桌面今日概览左侧面板被右侧月度内容撑出大块空白、心情素材过大的问题，并将右侧月度预览改为日历式心情缩略展示。

- 修复首页每次打开都等待今日心情云端请求、对方心情素材使用懒加载导致首屏延迟的问题；现在优先展示按用户/自然日隔离的最近缓存，月度缓存可作为回退，并在后台同步云端 canonical 数据，暂时同步失败时保留可用的缓存结果。

- 修复新版设置中心恢复后缓存设置依赖未完整装配的问题，恢复设置弹窗打开、缓存容量摘要和自动缓存即时状态更新；同时清除重复的移动端日记 CSS 规则。

## [2026-09-04]

### Changed

- 发布设置页 Push 请求注入修复到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `f309acad`，Worker 版本为 `3acff541-92a2-435f-9443-023731e9b659`，入口为 `index-CM8v_eRU.js`（SHA-256 `7f71b211b469e05b9d6b4f65c98a4cfcd84d8c6e288a0d10b42c60524798387f`），样式为 `index-B5TqmHVV.css`（SHA-256 `3c9d620479979496f335808019b52da2a70fa25c61ea0a97c4cef051a0b23bcf`），`sw.js` SHA-256 为 `5dff96f978e533f47db4416383f859e0878653844991326a8523e9878d2fe370`，Workbox 预缓存条目为 45；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。

### Fixed

- 修复设置页“开启通知”未从 Cloudflare backend 注入请求函数的问题，避免点击后显示 `t is not a function`，并恢复推送公钥读取与设备订阅注册。

## [Unreleased]

### Added

- 新增 `comment-thread-domain.js` 扁平留言线程模型，移动日记详情与桌面照片详情共用同一套稳定排序、回复目标和孤儿/循环保护规则。
- 新增 `mood-jar-physics.js` 确定性心情瓶粒子求解器，覆盖瓶口出生、曲面瓶壁、椭圆瓶底、表情碰撞、摩擦、轻微回弹和休眠。
- 纳入用户提供的圆肚玻璃罐透明参考图：源文件保存在 `assets-source/mood-jar.png`，构建时生成 720×960 的 `mood-jar.webp`。
- 为心情罐增加贴近罐体的月份前后翻页控件，并与月历月份状态保持同步。
- 纳入 `files.zip` 提供的统一 120×120 青绿色/金色 SVG 图标集，替换生活小工具栏现有的内联 SVG 与旧位图图标；现有七个入口保持原有排序、文案和交互，图标资源随 Workbox 预缓存。

### Changed

- 发布移除家庭足迹功能到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，本次部署入口为 `index-DY_ZGYel.js`，样式为 `index-D7uLlt8v.css`，`sw.js` SHA-256 为 `abf82d336fab0fb623add63e0a3d61ed681788ec1f2aabdc04a81360144a8e38`，Workbox 预缓存条目为 45，Worker 版本为 `be0fcbae-8d50-4018-8792-9849fd3fd8a9`；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 发布本次圆肚玻璃罐替换到 Cloudflare Pages 正式站；源提交为 `e1bd56a`，正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，Worker 版本为 `ef7250bf-2c8f-423e-b9e2-2c8348e57a60`，入口为 `index-B3GpTHDP.js`，`sw.js` SHA-256 为 `32f0bdb2a986d90584fffc0c51239cfbdceef28d5585f89ac122a96c6c06e2d9`；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 发布生活小工具统一 SVG 图标替换到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，Worker 版本为 `84315072-813a-41fd-bc15-d07db64945fa`，入口为 `index-4DuDc_aD.js`，`sw.js` SHA-256 为 `54c620c733199e665d2c2b765f81eb847a460c0d8b3df871b6ca6cf19d1e6839`，Workbox 预缓存条目为 46；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 将心情瓶替换为用户提供的 `360×480`（3:4）圆肚玻璃罐构图；表情按确定性物理模拟慢速分批进入，整只瓶子改为可点击/键盘重播的原生按钮，单一 `requestAnimationFrame` 生命周期负责播放、取消、月份切换和离开路由清理。
- 将桌面照片详情与移动日记详情改为同级评论行；回复关系保留在共享模型和回复目标文案中，不再通过嵌套 DOM 或累计缩进挤压正文。
- 将移动日记详情专属布局覆盖到 `920px` 以内，兼容 `844×390` 短横屏；评论正文保持 `16px` 起步、长 URL 使用 `overflow-wrap:anywhere`，操作按钮保持至少 `44×44px`。
- 将趋势图改为手机/桌面动态坐标；少量月底记录按真实有记录日期等距展开，保留真实点、缺口说明和单一键盘命中路径。
- 收紧桌面与手机端今日概览到双席心情卡片的间距；成功态折叠空状态行，避免手机端保留无内容的垂直空白。
- 心情罐在数据完成渲染后重新读取当前布局，进入视口焦点带即可自动播放，不再要求额外点击；月份切换会保持当前月历/心情罐模块的视口位置，手动点击和 reduced-motion 行为保持不变。
- 顶部分页最多启用 5 个入口；手机端五项在导航行内完整显示，日记筛选标签改为单行横向触摸滚动，并收紧今日概览与时计流之间的间距。
- 将入口 JS gzip 预算从 120 KiB 调整为 121 KiB，以容纳设置弹窗顶层反馈逻辑；其余构建和资源门禁保持不变。
- 认证首页请求预算调整为 36 次，以覆盖工具栏统一 SVG 图标的静态资源请求；八个图标同时纳入构建产物和 Workbox 预缓存合同。
- 手机端生活小工具栏首屏改为三张完整等宽卡片，默认顺序为时间纪念册、本周回顾、留言；其余入口继续保留在横向触摸轨道中，桌面端仍保留七个入口，首屏不露出半张卡片。
- 本周回顾弹窗复用时间纪念册的外框、标题栏、关闭按钮、分区间距和卡片视觉；摘要与统计卡统一使用语义边框、8px 圆角和 surface 背景，移除破坏层级的反色大块。
- 将留言从独立 `thanks` 路由收回应用壳，工具栏、可选顶部分页、通知和 Push 跳转统一打开复用时间纪念册外框的留言 dialog；发布、颜色、编辑、删除和列表能力保持不变，关闭后恢复触发入口焦点。
- 发布留言统一 dialog 与心情罐等待态修复到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，生产 deployment 为 `86245caf`，Worker 版本为 `546766a2-7ea6-4971-968d-0625b507ed9a`，入口为 `index-CtGR0UKi.js`（SHA-256 `7d9c02d85fc89d8eaad6a5e084ef0c53268959564d96f8365ab4f1ba71a93b0a`），样式为 `index-B5TqmHVV.css`（SHA-256 `3c9d620479979496f335808019b52da2a70fa25c61ea0a97c4cef051a0b23bcf`），`sw.js` SHA-256 为 `9a4050ef88ed158fbe5b708c461077d63111122fe0ff431f60e904129c8cdcd0`，Workbox 预缓存条目为 45；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 发布手机端生活小工具栏调整到 Cloudflare Pages 正式站；正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，Worker 版本为 `87834079-d7d6-4593-91e1-103824e8b990`，入口为 `index-wITx31VG.js`（SHA-256 `63fe1da45dc0ec8238a3a440a37a3f0f102535c85571e229477b6899a0bca6df`），样式为 `index-D7uLlt8v.css`（SHA-256 `f383d0bd9aebf535c22cfcb5511fcd28cb2eb8fe15d65d7f3b902c16e9395ee9`），`sw.js` SHA-256 为 `42eee9d0d9e69478ea2dffb0be1fb29a01bceba21c8ceb5666c13c4001838a58`，Workbox 预缓存条目为 45；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 发布手机工具栏横向滚动修复及本周回顾/时间纪念册 UI 统一到 Cloudflare Pages 正式站；生产 deployment 为 `7ca3eee5`，正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，Worker 版本为 `0c4019e6-733b-48fa-8140-3a59805ddd31`，入口为 `index-DAAsSNbl.js`（SHA-256 `05b6b8b5858eba6aba618df9b2afa9cd45ee37dd8f4d1c718b229df6762e7524`），样式为 `index-D5XO_Jr_.css`（SHA-256 `d9bb7f1e1aae658c1089697c7b0bfb58fc3c3c464e87813740864c7ef78674c7`），`sw.js` SHA-256 为 `9d7df36b35d2638aacb8d9d2106e58ecddc910c86030c0e803acd2a1acce9506`，Workbox 预缓存条目为 45；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。
- 发布修正后的手机工具栏横向触摸轨道及周回顾/时间纪念册统一 UI 到 Cloudflare Pages 正式站；生产 deployment 为 `f174cd2a`，正式入口为 `https://life-vlog-site.pages.dev`，固定 preview 为 `https://codex-preview.life-vlog-site.pages.dev`，Worker 版本为 `b722b1ea-0e7c-4537-974a-ba501ce00281`，入口为 `index-CJmEqXrH.js`（SHA-256 `c69b288aa847e86db205c2f86612cc7012a7a6b0d7a41c6bf4a6412da010273d`），样式为 `index-CgtpDiib.css`（SHA-256 `ed1c8cf5ade43361564606d65ee7449f62d2a682277128e29ae3564e9663eec6`），`sw.js` SHA-256 为 `f2d7734c5718d3282acede9dd5c92467b42d90cbc93eaa861aed9f2e501c9d99`，Workbox 预缓存条目为 45；preview 与 production 均通过 CORS、Axe 和确定性 release smoke。

### Fixed

- 修复心情瓶口沿、圆肩、鼓腹、双线底座、高光层和内腔安全区与旧 `320×360` 工程化轮廓不一致的问题；补齐 0/1/8/31/62 条记录、慢动画、replay、reduced-motion、焦点和路由生命周期回归。
- 修复深层回复累计嵌套造成的正文一字一行、横向溢出和表单远离评论列表问题；新增 320/375/390/430/844×390 长文本、触控尺寸和表单顺序回归。
- 修复心情瓶预设槽位与逐元素 WAAPI 轨迹不产生真实接触的问题；现在后落表情会通过粒子碰撞改变既有粒子的运动，最终布局由同一求解器稳定收束，减少动态效果时直接采用该最终态。
- 修复心情日记路由隐藏激活期间缓存“罐体不可见”状态，导致页面显示后首次动画不自动启动的问题。
- 移除旧 SVG 瓶体图层，改用带透明通道的用户参考 WebP；同步将物理内腔、裁切区和响应式舞台调整到圆肚瓶的实际轮廓，避免表情穿过瓶口或底座。
- 修复移动端趋势 SVG 被压缩后文字、点、线难以辨认以及月底数据挤在最右侧的问题；补充 375/390/430、844×390、768 和 1440 视口的真实 bbox、字体、覆盖范围和溢出断言。
- 修复心情罐月份翻页因月历 4～6 周高度变化造成页面上下跳动、缓存月份跳过重播以及罐体刚露出视口就提前落完的问题；现在切月保留可见模块锚点，缓存/云端月份切换都会重新进入待播放状态，至少半瓶进入视口且罐体中心处于焦点带后才启动动画。
- 修复存储设置的缓存容量读取桥接缺失导致上限显示为 `undefined`，并让自动缓存切换即时更新开关状态与 `aria-pressed`。
- 修复设置弹窗内的自动缓存、离线下载等提示被原生 dialog 顶层遮挡的问题；提示现在挂载到当前最上层 dialog，dialog 关闭时同步清理，不会在退出后滞留在背后。
- 简化心情罐重播提示为“点击瓶子，重新下落本月心情”，保留原生按钮的重播与键盘操作语义。
- 修复手机工具栏误隐藏其余入口且错误禁止横向滑动的问题；现在首屏显示三张完整卡片，仍可左右滑动查看全部工具，并限制滚动只发生在工具栏内部。
- 修复本周回顾与时间纪念册 dialog 外框、标题栏、摘要/统计卡的边框、圆角、背景和间距不一致的问题。
- 修复留言入口需要切换独立页面、留言页面视觉与应用壳不一致以及关闭后焦点不稳定的问题。
- 修复心情罐在进入视口焦点区前的等待态提前保留动画渲染提示；现在只有真正开始 rAF 播放时才启用 `will-change`。

### Removed

- 移除家庭足迹动态/往年回顾入口、弹窗、专属样式、运行时装配和图标资源；工具栏恢复为七个实际工具入口。
- 移除留言独立路由模板、路由注册和页面显隐逻辑；留言不再通过 `?page=thanks` 渲染页面。

### Documentation

- 完成移动端留言线程与心情瓶物理下落 V3 规划及实现记录：取消深层回复累计横移，落地全宽扁平行模型、留言表单布局、确定性粒子碰撞、单一 rAF 生命周期和 reduced-motion 最终态。
- 增加心情瓶与趋势图 V2 规划：以参考图重建纵向手绘瓶体，规定约 2 秒缓慢分批落入、整瓶点击/键盘重播、reduced-motion 降级，以及手机高画布和稀疏日期展开趋势布局。

## [2026-09-01]

### Added

- 新增 `comment-thread-domain.js` 扁平留言线程模型，移动日记详情与桌面照片详情共用同一套稳定排序、回复目标和孤儿/循环保护规则。
- 新增 `mood-jar-physics.js` 确定性心情瓶粒子求解器，覆盖瓶口出生、曲面瓶壁、椭圆瓶底、表情碰撞、摩擦、轻微回弹和休眠。
- 为心情日记增加当前月份汇总：完整紧凑月历、最多心情、最多 62 条素材的玻璃心情罐、双成员三档趋势图、点选/键盘提示和按日明细。
- 新增路由无关的心情条目 overlay view/controller，首页概览与心情日历共用同一套 Picker、编辑、详情、权限、保存、删除、焦点和浏览器返回逻辑。
- 新增顶部分页 Domain/View/Controller：默认显示日记、VLOG、心愿、周末、衣柜，并允许在“外观与使用”中启用菜谱、留言、秘藏及调整顺序。

### Changed

- 发布扁平留言线程、物理心情瓶、点击重播和大趋势图到 Cloudflare Pages 正式站；发布源提交为 `1111843`，部署为 `65a3031e`，正式入口为 `index-C-vliAPx.js`、样式为 `index-6mKDF3Q3.css`，`sw.js` SHA-256 为 `da6f307d16d32e938a687b36bb8341755ade28bdd75db19a70a421e8717589b6`，Worker 版本为 `b80353dd-3f69-4537-9aae-0f7a21988b25`；固定预览与生产均通过 CORS、Axe 和确定性 release smoke。
- 将心情瓶升级为 `360×440` 纵向暖色玻璃构图；表情按确定性物理模拟慢速分批进入，整只瓶子改为可点击/键盘重播的原生按钮，单一 `requestAnimationFrame` 生命周期负责播放、取消、月份切换和离开路由清理。
- 将桌面照片详情与移动日记详情改为同级评论行；回复关系保留在共享模型和回复目标文案中，不再通过嵌套 DOM 或累计缩进挤压正文。
- 将移动日记详情专属布局覆盖到 `920px` 以内，兼容 `844×390` 短横屏；评论正文保持 `16px` 起步、长 URL 使用 `overflow-wrap:anywhere`，操作按钮保持至少 `44×44px`。
- 将趋势图改为手机/桌面动态坐标；少量月底记录按真实有记录日期等距展开，保留真实点、缺口说明和单一键盘命中路径。
- 发布心情罐与趋势图可视化修复到 Cloudflare Pages 正式站；发布源提交为 `b86d514`，部署为 `6d0f907e`，正式入口为 `index-CYFeHqJC.js`、样式为 `index-oC3oxzWP.css`，`sw.js` SHA-256 为 `0227da8e2f997a9229885354efce42212401403a6e99bb94e30197ba3e0752a3`，Worker 版本为 `c972f1cc-43dc-42b1-8e13-24970e80b619`；固定预览与生产均通过 CORS、Axe 和确定性 release smoke。
- 发布心情月度汇总到 Cloudflare Pages 正式站；发布源提交为 `2fba96d`，部署为 `be4b9723`，正式入口为 `index-BP_J7OYU.js`、样式为 `index-Cp1L515_.css`，`sw.js` SHA-256 为 `94e63d027cfcc3fa5521863b26c4517c0b52c1b275e84940bd2c13ce172a9cb1`，Worker 版本为 `227d7193-15df-41b8-8409-4434dd5ad4d7`；固定预览与生产均通过 CORS、Axe 和确定性 release smoke。
- 将“全部日记”移到月度汇总底部；月历页面移除可见标题块，保留语义标题，并补齐 4～6 周、未来日期禁用、深浅色、130% 字号和 reduced-motion 适配。
- 心情保存、编辑和删除改为即时更新后强制重读当前月份；账户家庭上下文晚到时重新建立双席位，首页概览与月度日历刷新保持独立。
- 发布通知本机关闭、日记筛选正常滚动、可配置自适应顶部分页及今日心情紧凑交互到 Cloudflare Pages 正式站；发布源提交为 `4e6b5a2`，正式入口为 `index-Drc65K6j.js`，`sw.js` SHA-256 为 `20f057f279a7d4a7f4f52e3c9e728aba5a4e8145b6f95d0b24c71857e12a73cd`，Worker 版本为 `f4d74f33-3190-4256-b589-b80ee68cea72`，固定预览与生产均通过 CORS、Axe 和确定性 release smoke。
- 手机与短横屏的今日心情两席改为单行紧凑横向卡片，心情素材限制为 56px、席位保持至少 44px 触控面积，并在 130% 字号下继续省略次要文字而不横向溢出。
- 顶部主导航移除“心情”按钮；`?page=mood` 深链接继续有效，只有今日概览的“查看心情日历”会切换到心情路由。
- 顶部主导航改为按启用项渲染的自适应 flex；手机端只有导航容器局部横向滚动，保持 44px 触控高度和 8px 间距，分页偏好按用户/设备作用域保存。
- 日记搜索与分类 tag 回到普通文档流，不再通过 sticky/fixed 或 top 偏移持续占用阅读视口；VLOG 继续作为 gallery mode，不创建独立路由。
- 共享心情 overlay 改为首次打开时才加载，保持 gallery 冷启动请求预算，不为未使用的入口预取条目模块。
- 今日心情的 controller、仓储与共享域模块合并为单个懒加载 chunk，避免共享模块额外增加 gallery 首屏请求。

### Fixed

- 精简 V3 留言线程入口实现，修复合并后生产入口 gzip 超出 120 KiB 构建预算的问题，不改变留言排序和回复关系。
- 修复心情瓶口沿、圆肩、鼓腹、双线底座、高光层和内腔安全区与旧 `320×360` 工程化轮廓不一致的问题；补齐 0/1/8/31/62 条记录、慢动画、replay、reduced-motion、焦点和路由生命周期回归。
- 修复深层回复累计嵌套造成的正文一字一行、横向溢出和表单远离评论列表问题；新增 320/375/390/430/844×390 长文本、触控尺寸和表单顺序回归。
- 修复心情瓶预设槽位与逐元素 WAAPI 轨迹不产生真实接触的问题；现在后落表情会通过粒子碰撞改变既有粒子的运动，最终布局由同一求解器稳定收束，减少动态效果时直接采用该最终态。
- 修复移动端趋势 SVG 被压缩后文字、点、线难以辨认以及月底数据挤在最右侧的问题；补充 375/390/430、844×390、768 和 1440 视口的真实 bbox、字体、覆盖范围和溢出断言。
- 修复心情月度汇总的玻璃罐 SVG 几何与内腔裁切，将表情定位到真实最终槽位；动画改为数据就绪与 35% 视口进入双条件触发，路由离开会清理观察器和动画，新增/编辑/删除只处理受影响素材。
- 修复趋势 SVG 在移动端被 `hidden` 属性和无尺寸布局隐藏的问题；补齐固定宽高、SVG 属性颜色 fallback、真实缺口虚线桥、44×44 点位命中区及 reduced-motion 最终态。
- 修复缓存月份首次进入时被误判为编辑动画的问题；当月素材按稳定顺序错峰落入，重新进入路由可重新建立一次性动画状态，趋势缺口桥使用独立弱化线型。
- 修复直接深链进入心情日记时家庭成员请求晚于月度请求造成的成员记录丢失；同步失败时保留已写入结果并显示可重试状态，不误报写入失败。
- 修复家庭席位形状或昵称变化但月度记录未变化时趋势图缓存未失效、图例和点形状可能仍显示旧成员信息的问题。
- 今日概览的已记录席位和本人空席改为在 gallery 原地打开共享 overlay；关闭后恢复原 URL、滚动位置与触发席位焦点，对方空席保持只读信息卡。
- 修复设置页懒加载后“关闭这台设备”没有事件的问题；关闭流程先取消本机 Push subscription，再清除 badge 和清理 Worker 记录，远端失败时仍明确显示本机已关闭。
- 修复 Push 操作结束后“关闭这台设备”按钮可能保留禁用状态的问题，并补充忙碌态复位回归断言。

### Documentation

- 完成移动端留言线程与心情瓶物理下落 V3 规划及实现记录：取消深层回复累计横移，落地全宽扁平行模型、留言表单布局、确定性粒子碰撞、单一 rAF 生命周期和 reduced-motion 最终态。
- 增加心情瓶与趋势图 V2 规划：以参考图重建纵向手绘瓶体，规定约 2 秒缓慢分批落入、整瓶点击/键盘重播、reduced-motion 降级，以及手机高画布和稀疏日期展开趋势布局。
- 增加心情月度可视化修复规划：明确罐体 SVG 错位、表情坐标未落地、动画在屏幕外提前播放和趋势图仅有 DOM 无可视输出的问题，并规定视口触发状态机、真实几何测试、移动 WebKit 验收及发布门禁。
- 完成心情月度汇总的模块图、技术总览、设计特例、发布清单和专项方案记录，并补记正式发布门禁结果。
- 完成消息通知本机关闭、日记搜索/tag 取消固定及可配置自适应顶部分页规划；同步模块图、技术总览、设计系统和发布清单。
- 完成今日心情手机单行概览与原地详情规划，并同步模块图、技术总览、设计系统和发布验收清单。
- 固定 Axe 确定性 fixture 的深色主题偏好在应用启动前写入，避免异步账户同步在扫描中途切换主题而产生颜色误报。

## [2026-08-31]

### Added

- 增加 P0“心情日记”模块：原生月历、八种固定心情、家庭两席稳定排序、选择/详情/编辑/删除/历史流程、用户隔离的当月缓存，以及独立 Domain、Repository、View、Controller 和懒加载 Route。
- 增加首页“今日心情”双席概览：按东京自然日读取当天记录，展示真实昵称、动态心情素材、本人快捷添加、错误重试和进入月历/详情的操作。
- 增加今日心情 View/Controller、单日 Repository 查询以及确定性空态、错误态、竞态、快速添加和冷启动浏览器 fixture 覆盖。
- 增加 `mood_diaries` D1 schema、家庭读取/本人写入权限、自然日与输入长度校验、月份半开区间查询、D1 导出/备份登记和确定性 Domain/Controller/Worker/Playwright fixture 测试。
- 增加八种心情的圆形/方形两套 512×512 透明 PNG 正式素材，并增加文件集合、尺寸、Alpha、安全区和体积的自动发布门禁。

### Changed

- 发布今日心情概览、成员昵称/形状规则、冷启动定位、手机页面缩放锁定和全局通知窗口修复到 Cloudflare Pages 正式站；正式入口为 `index-R17uygvh.js`，Worker 版本为 `529ed395-c4d8-412f-b23f-6943e75e935b`，固定预览与生产均通过 CORS、Axe 和确定性 release smoke。
- 发布今日心情单行概览与原地共享 overlay 收敛版到 Cloudflare Pages 正式站；入口为 `index-DUEnIUYJ.js`（SHA-256 `cf6e3a101352268a41fcd542699c8f3b5b6cab8beb1adfc0059a57b7106752c1`），`sw.js` SHA-256 为 `dedb8ea76d1956f395c2ed94d3961626ab5feb20889428bdc33d9326e5470b75`，Worker 版本为 `bc4ab33c-85e2-4831-bd26-895ba5ea4359`；固定预览与生产均通过 CORS、Axe 和确定性 release smoke。
- 将主工作树、5c0d worktree 和稳定分支的有效改动整合到同一套模块化 Vite/Workbox 架构；保留确定性 fixture 发布门和不使用真实测试账户的规则。
- 结构门只检查版本库中的旧发布目录；保留本机被 `.gitignore` 排除的历史构建产物，不将其当作源码或发布输入。
- 通过 `pnpm-workspace.yaml` 固化 `esbuild` 与 `sharp` 的受信任安装构建脚本，避免锁定安装后生成构建不完整；发布 smoke 同时覆盖等级面板全局事件。
- 顶部导航加入“心情”路由，移动端 viewport 固定页面比例并保留动态字号与媒体查看器内部缩放；`cloudflare-client.js` 增加 `gte`/`lt`/offset 查询能力，统一页面模块的月份与历史读取边界。
- Vite 构建改用已锁定的 Terser 压缩 JavaScript，保持新增今日概览后入口仍满足 120 KiB gzip 预算。
- 构建预算门禁兼容 Terser 压缩后的 Workbox 预缓存调用形态，继续校验最终清单内容和路由 chunk 排除规则。
- 心情日记弹层补充首焦点、焦点循环、关闭后焦点回收和离开编辑确认；标签移除控件满足触控尺寸，保存/删除失败保留输入并提供错误反馈。
- 心情日历改用原生日期按钮与完整可读标签，移除不完整的 `gridcell` 角色层级，修复新增页面的 Axe ARIA 阻塞项。
- 首页首屏改为今日心情双席概览；家庭席位统一为 owner 方形、最早加入的另一位成员圆形，月历图例改用真实昵称，并将首屏落点、滚动恢复和心情路由交接收归导航/心情控制器。
- 心情保存、删除和昵称更新后会刷新首页今日概览；首页不再注入旧的照片、菜谱、心愿和等级统计卡。
- CSS 覆盖率巡检加入心情日记懒加载路由，确保模块样式在真实页面采样中可见。
- 心情日记浏览器 fixture 增加横屏尺寸回归，覆盖小屏、横屏和桌面三种布局边界。
- 今日概览滚动恢复 fixture 使用显式确定性占位高度，避免短内容页面让目标滚动位置被浏览器截断。
- C 性能与 release smoke 回归在媒体重试前等待确定性 fixture 的远端同步和首屏分页完成，避免 IntersectionObserver 与重试交互竞态；视频边界回归显式滚动目标卡片进入视口，并计入今日心情单日读取请求。

### Fixed

- 审计修正今日心情概览中对方未记录席位的无障碍名称，避免错误提示可代替对方添加；异步装配今日概览控制器时若会话已就绪会立即读取当天数据，消除首次同步竞态。
- 修复手机端页面级缩放契约缺失、部分文本控件聚焦放大和全局横向溢出遮罩问题；固定唯一 viewport，移动端/短横屏文本控件计算字号至少 16px，并将下拉刷新触摸拦截收窄到日记列表区域，保留页面滚动、系统返回和媒体查看器局部手势。
- 修复通知铃铛仅在设置路由加载后才绑定、等待网络完成才打开 dialog、慢网关闭后竞态重开和读取失败无重试的问题；现在由应用外壳一次绑定，先开窗显示 loading/cache，区分 empty/error/retry，复用并发请求并恢复关闭焦点。
- 修复周末计划完成回顾添加照片或图片链接时懒加载路由未注入文件名 slug 化函数，导致回顾保存失败；现在会生成安全上传文件名并正常保存。
- 将全局等级面板的关闭、遮罩和 VIP 徽章事件统一绑定到应用外壳，避免设置路由未加载时入口失效或加载设置后重复绑定。
- 进入日记或 VLOG 详情后，普通视频改为静音自动播放并保留原生控件；自动播放受阻或媒体失败时仍显示可理解的恢复状态。
- 强制 `mood_diaries` upsert 只能按 `(user_id, diary_date)` 冲突，避免客户端传入其他冲突键改变每天一条的约束。
- 心情日记 API 在省略可选正文/标签时显式使用空默认值，保持 D1 `NOT NULL DEFAULT` 约束下的空正文能力。
- 心情标签输入在保存或粘贴后按中英文逗号拆分，保持 Enter/逗号完成标签的交互契约一致。
- 提升心情弹层层级，避免横屏短视口下固定顶部栏遮挡关闭控件。
- 未登录时隐藏心情历史入口，避免进入无数据列表状态并保持访客页面不发起请求。
- 浏览器返回键取消脏编辑时恢复心情弹层历史状态，避免弹层被意外关闭或历史栈失去返回点。

### Documentation

- 建立长期技术文档体系：文档索引、技术总览、强制变更记录流程和根目录变更日志。
- 修正 README 的本地开发方式，并把文档维护纳入项目代理规则。
- 保存本次 Git 恢复的保存点、分支拓扑、差异范围和验收证据，见 `docs/history/recovery-audit-2026-08-30.md`。
- 更新模块图、技术总览、发布验收和设计系统页面覆盖；记录心情日记 P0 资源门禁。经用户明确授权，以其提供的唯一参考图提取并加工 16 个 `public/assets/mood-diary/*-{circle,square}.png` 独立透明素材，发布 URL 保持 `/assets/mood-diary/*`，未保留棋盘格背景，也未使用系统 Emoji 替代。
- 新增今日心情概览与启动定位改造规划，明确成员 1 方形、成员 2 圆形、真实昵称图例、本人空状态快捷添加、旧统计卡删除和冷启动滚动边界。
- 新增手机端页面缩放锁定修复规划，明确固定 viewport、iOS 输入聚焦、横向溢出与照片查看器内部缩放的边界及真机验收。
- 新增顶部通知铃铛无响应修复规划，记录 settings-only 事件绑定和先等待网络再开窗的双重根因，以及全局绑定、即时反馈和慢网回归要求。
- 记录手机 viewport、通知 loading/empty/error/retry、焦点恢复和确定性 fixture 回归契约，更新模块图、技术总览、设计系统与发布验收清单。
- 同步今日心情概览的模块边界、单日数据流、发布验收清单和心情日记页面特例；专项规划状态更新为生产发布完成，线上 CORS、Axe 与确定性 release smoke 均通过。

## [2026-08-30]

### Added

- 统一日记普通视频与 Live Photo 的列表动态预览：只播放最接近视口中心的一个静音实例，短视频可循环，8 秒以上视频不循环（`afd75bc`）。
- 为日记筛选增加“宠物”分类，并补充相关数据与浏览器回归。

### Fixed

- 修复桌面和手机端日记/VLOG 缩略图的 `VIDEO` / `LIVE` 徽标加载与定位。
- 修复部分日记详情媒体工具栏元素缺失时的空引用问题。

## [2026-08-29]

### Changed

- 重构日记媒体 URL、分类筛选、手机操作区、管理员分类面板和设置页五组信息架构（`5a0eb33`）。
- 手机设置改为分类首页进入子页面，并完善工具页导航（`7eda21b`, `907dec5`）。
- 手机日记操作改为收藏、主操作和更多菜单，危险操作独立展示（`a77ef33`）。

### Fixed

- 修复媒体失败后重复重试、分类筛选双实现和设置横竖屏语义同步（`830ef17`）。
- 允许管理员按权限删除家庭成员日记，同时保持回收站和媒体清理边界（`161ec06`）。

## [2026-08-28]

### Fixed

- 修复视频日记、秘藏同步误报和快速页面切换竞态（`b07a1e7`）。
- 修复懒加载详情查看器未准备完成时打开媒体的问题（`2b9d084`）。
- 修复周末页面在导航过程中读取非规范状态的问题（`178d251`）。

## [2026-08-27]

### Added

- 增加应用启动开屏动画（`a2c2fe9`）。

### Changed

- 周末完成交互经过多轮调整，最终使用右上角文字操作并保持现有完成状态视觉。

## 更早历史

2026-08-27 以前的详细修改可通过 `git log --date=short --oneline` 查询；从本文件建立后，后续每次仓库修改都必须同步记录。
