# 咻蛋之家

一个给家庭成员一起用的生活日记网页软件。前端部署在 Cloudflare Pages，登录、数据库、图片上传和私密内容都走 Cloudflare Worker + D1 + R2。

项目技术总览和维护入口见 [`docs/README.md`](docs/README.md)。新对话或其他程序接手前应先阅读该索引、[`docs/TECHNICAL_OVERVIEW.md`](docs/TECHNICAL_OVERVIEW.md) 与 [`CHANGELOG.md`](CHANGELOG.md)。

线上地址：

```text
https://life-vlog-site.pages.dev/
```

## 后端

- Cloudflare Worker：统一 API、登录、上传、限流。
- Cloudflare D1：账号、日记、评论、收藏、菜谱、心愿、周末计划、纪念日、感谢留言、通知和秘藏。
- Cloudflare R2：日记、心愿、菜谱封面、头像、秘藏图片。
- Cloudflare Pages：托管静态前端。

## 部署 Cloudflare

```powershell
cd cloudflare-worker
wrangler d1 execute life-vlog-db --file ./schema.d1.sql --remote
wrangler deploy
```

需要的绑定在 `cloudflare-worker/wrangler.toml`：

- `DB` -> `life-vlog-db`
- `R2_BUCKET` -> `life-vlog-photos`
- `PUBLIC_R2_URL` -> R2 公共读取地址

## 本地预览

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

使用终端输出的 Vite 本地地址。需要验证生产构建时：

```powershell
pnpm build
pnpm preview
```

## iPhone 主屏幕

这个项目是 PWA，可以用 Safari 打开 Cloudflare Pages 地址后选择“添加到主屏幕”。它看起来像 App，但仍然是网页壳；数据实时来自 Cloudflare。

## 发布前验收

每次发布前必须先完成本地回归，部署脚本通过后会上传 Cloudflare Pages。完整清单见 [`docs/release-checklist.md`](docs/release-checklist.md)。

```powershell
pnpm test
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy-cloudflare-pages.ps1
```

发布完成后检查正式地址的页面状态、核心资源版本和本次改动对应的页面行为。

## 变更记录

每次修改代码、样式、配置、数据库结构、依赖、测试或部署逻辑，都必须同步更新 [`CHANGELOG.md`](CHANGELOG.md)。完整规则见 [`docs/CHANGE_WORKFLOW.md`](docs/CHANGE_WORKFLOW.md)。
