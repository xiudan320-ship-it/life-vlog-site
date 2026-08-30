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
- 合同：Axe critical/serious=0、一级键盘导航、登录/筛选、dialog Escape 与焦点恢复、路由标题焦点、44 CSS px 触控目标、sticky 不遮挡和无横向溢出。

`test:browser`/`c-performance-regression.mjs` 另外验证列表普通视频不触发视频网络加载、进入日记/VLOG 详情后静音自动播放且保留控件、失败可重试、gallery 同步读取秘藏表而不加载秘藏 route、30 轮快速路由 latest-wins、全局等级弹窗、心情日记双端月历/Picker/编辑/删除，以及既有周末/购物/回复交互。所有 signed-in 场景均使用 `tests/fixtures/cloudflare-api-fixture.mjs` 的内存 fixture，不使用真实账户或真实业务数据。

## 3. 发布后只读检查

部署脚本会在本地回归通过后先部署 Worker 并执行精确 CORS 门，再发布 preview。preview 固定别名会使用 `tests/fixtures/cloudflare-api-fixture.mjs` 的确定性假后端执行公开壳、伪会话、深链接、错误矩阵和 PWA 烟雾测试；任何 preview/CORS 门失败都会停止，不会进入正式发布。发布完成后访问正式地址，确认返回状态为 200，并检查本次构建的入口文件名、入口哈希、`sw.js` 哈希和 Workbox 预缓存条目数已经记录且线上版本已更新。发布门禁止真实账户和真实凭证。

Worker CORS 只允许 `https://life-vlog-site.pages.dev` 与固定 preview 别名 `https://codex-preview.life-vlog-site.pages.dev`；OPTIONS、成功响应、认证失败和 5xx 错误响应都必须携带对应的精确 origin 与 `Vary: Origin`，禁止 `*`、任意 `pages.dev` 通配和随机部署域名加入 allow-list。

## 4. 手动验收清单

登录态回归统一使用确定性假 session 和假后端，分别在桌面端 `1440 x 900` 和手机端约 `390 x 844` 检查：

- 登录、退出、刷新和回到前台后会话仍然正常。
- 日记：打开/关闭、长文滚动、多图切换、图片预览、评论、回复、收藏、编辑和删除。
- 心情日记：顶部“心情”入口、当前月/跨月月历、今天与未来日期边界、八种心情 Picker、可留空正文、标签、自己的新建/编辑/删除、查看另一位成员、历史分页、深浅色、键盘 Escape、焦点和 375/390/1440 宽度无溢出；心情素材缺失时应显示文字错误态，不得使用 Emoji 或截图裁切替代。
- 菜谱：新建、封面上传/粘贴、编辑、删除和详情图片显示。
- 心愿：新建、图片上传、编辑、完成反馈、删除和完成/未完成筛选。
- 购物车：手机端紧凑卡片、图片放大、完成/编辑/删除按钮保持可触控，刷新后状态仍然存在。
- 秘藏：密码进入、文件夹/相册、上传、Tag 添加删除、收藏、移动、排序、图片预览和桌面端单张删除（保留最后一张保护）。
- 等级面板：点击顶部等级徽章或经验区域后立即打开面板，云端家庭排行加载完成后再刷新内容。
- 通知：新日记、评论和回复提示；打开后提示会消失；自己发布的内容不提醒自己。
- 离线与缓存：断网时能打开已缓存内容，恢复网络后不会重复上传或重复请求。
- 深色/浅色模式、头像、昵称、家庭成员名称和长列表滚动没有错位或溢出。

发现问题时记录：设备/浏览器、页面、操作步骤、预期结果、实际结果和截图。修复后重新从第 1 步开始验收。

## 5. 凭证规则

- 不把密码、Worker token、邀请码、邮箱密钥提交到 Git。
- 发布前检查 `git diff`，确认没有凭证、临时截图和本地配置文件。
