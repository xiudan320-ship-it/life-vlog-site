# 咻蛋之家

一个给家庭成员一起用的生活日记网页软件。前端部署在 Cloudflare Pages，登录、数据库、图片上传和私密内容都走 Cloudflare Worker + D1 + R2。

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
python -m http.server 8000 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:8000/index.html
```

## iPhone 主屏幕

这个项目是 PWA，可以用 Safari 打开 Cloudflare Pages 地址后选择“添加到主屏幕”。它看起来像 App，但仍然是网页壳；数据实时来自 Cloudflare。

## 发布前验收

每次发布前必须先完成本地回归和测试账户验收。完整清单见 [`docs/release-checklist.md`](docs/release-checklist.md)。

```powershell
pnpm test
powershell -NoProfile -ExecutionPolicy Bypass -File .\test-release.ps1
```

测试账号凭据保存在 `%LOCALAPPDATA%\LifeVlog\release-test-credential.xml`，密码由当前 Windows 用户的 DPAPI 加密；不要把凭据文件写入仓库，测试失败时不要发布。测试脚本会临时创建一条仅供收藏往返验证的测试日记，并在成功或失败后清理日记、收藏、评论和通知。
