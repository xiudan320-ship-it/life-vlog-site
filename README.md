# 咻蛋之家

一个给家庭成员一起用的生活日记网页软件。前端部署在 GitHub Pages，登录、数据库、图片上传和私密内容都走 Cloudflare Worker + D1 + R2。

线上地址：

```text
https://xiudan320-ship-it.github.io/life-vlog-site/
```

## 后端

- Cloudflare Worker：统一 API、登录、上传、限流。
- Cloudflare D1：账号、日记、评论、收藏、菜谱、心愿、周末计划、纪念日、感谢留言、通知和秘藏。
- Cloudflare R2：日记、心愿、菜谱封面、头像、秘藏图片。
- GitHub Pages：只托管静态前端。

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

这个项目是 PWA，可以用 Safari 打开 GitHub Pages 地址后选择“添加到主屏幕”。它看起来像 App，但仍然是网页壳；数据实时来自 Cloudflare。
