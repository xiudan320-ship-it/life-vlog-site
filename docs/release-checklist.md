# 发布清单

本文件只描述当前发布操作。历史 deployment、哈希和专项验收记录保存在 [`history/release-checklist-2026-09-11.md`](history/release-checklist-2026-09-11.md)，不作为当前系统事实。

未获得用户发布授权时，只运行本地门禁；不要调用本发布脚本、远程 D1 命令或 Cloudflare 资源创建命令。

## 1. 发布前条件

- 在 `main` 上完成提交并推送，工作区干净且 `HEAD` 与 `origin/main` 一致。
- 使用 Node `>=22.5.0`、仓库锁定的 pnpm 依赖；Worker 发布工具固定为 `wrangler@4.131.0`，从根目录用 `pnpm exec wrangler` 调用。
- 发布凭证只从 `CLOUDFLARE_API_TOKEN` 或脚本约定的本机 token 文件读取，不写入仓库、日志或文档。
- `user_profiles.secret_default_folder_id` 已纳入当前 schema；本项目不新增或自动应用 migration。若目标 D1 缺少该列，须在用户明确授权后按发布前结构核查结果单独执行显式 DDL，再发布依赖它的 Worker；每次核查或 DDL 结果写入 `CHANGELOG.md`。

## 2. 本地门禁

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run test:release-local
pnpm run test:deployment
```

`pnpm test` 覆盖语法、单元、静态/结构、资源优化、构建预算、CSS 和浏览器回归；`test:release-local` 使用确定性内存/API fixture 进行本地预览的 Axe 与 release smoke；`test:deployment` 只模拟发布脚本，不连接 Cloudflare。发布候选的构建指纹和源码检查必须在副作用前通过。

## 3. 固定发布顺序

运行入口：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy-cloudflare-pages.ps1 -Environment preview
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy-cloudflare-pages.ps1 -Environment production
```

生产模式严格按以下顺序执行：

1. 检查 `main`、远程同步、锁定依赖，运行完整本地测试和本地 release 验收。
2. 上传 Pages 到 `codex-preview`，等待固定 preview alias 暴露本次入口。
3. 对固定 preview 运行 Axe 和确定性 release smoke。
4. preview 上传、alias、Axe 或 smoke 任一失败，立即停止；此时不得部署 Worker 或 `main` Pages。
5. 再次检查源码和构建指纹未变化。
6. 部署 Worker：`pnpm exec wrangler deploy --config cloudflare-worker/wrangler.toml`，随后运行精确 Worker CORS 门禁。
7. Worker 或 CORS 失败，停止，不上传 `main` Pages；脚本不会自动回滚已部署的 Worker。
8. 复用同一构建上传 `main` Pages，等待正式 alias 就绪，再运行正式 CORS、Axe 和 release smoke。
9. 正式验收失败必须报错并保留现场；Pages 与 Worker 不是原子发布，按当次授权决定回滚。

`-Environment preview` 在第 4 步成功后直接结束，不执行 Worker 或正式 Pages 副作用。

## 4. 手动验收重点

使用确定性假 session 和假后端，在约 `390×844` 与 `1440×900` 检查：

- 登录、退出、刷新后认证状态正确；退出同时清理本地会话并请求服务器撤销，离线/失败时提示“本机已退出、服务器撤销未确认”，迟到响应不能恢复旧会话。
- 首页、日记、心情、衣柜、菜谱、心愿/购物、周末、秘藏、设置和通知入口可用；移动端无横向溢出，输入控件字号和触控命中区符合 `DESIGN.md`。
- 当前普通桌面概览为左侧窄栏上下排列今日心情、右侧本月心情；宽屏也将两个面板堆叠在页面最右侧栏，上方是今日心情、下方是本月心情，中央标题到快捷操作连续且侧栏不撑高中间内容。
- 通知、Push、本地缓存、断网重载和服务 Worker 更新在失败时有可读恢复路径。

发现问题时记录设备/浏览器、页面、步骤、预期、实际和截图；源码或产物修复后必须重新生成并验收新的候选构建。

## 5. 发布后记录

只在发布成功后把实际提交、Pages deployment、Worker 版本、入口/SW 哈希和门禁结果写入 `CHANGELOG.md` 的日期小节；不要把新的成功记录追加回本清单。纯文档修改不触发重部署。

规则、同步判断和测试日志要求分别见 [`docs/README.md`](README.md) 与 [`docs/CHANGE_WORKFLOW.md`](CHANGE_WORKFLOW.md)。
