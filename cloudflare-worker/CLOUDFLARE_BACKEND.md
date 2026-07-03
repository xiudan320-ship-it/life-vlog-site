# Cloudflare Backend

当前后端只使用 Cloudflare：

- Worker 负责 API、登录、注册、限流和 R2 上传删除。
- D1 保存账号、家庭共享、日记、评论、收藏、菜谱、心愿、周末计划、纪念日、留言、通知和秘藏。
- R2 保存所有图片。

常用命令：

```powershell
$env:CLOUDFLARE_API_TOKEN=(Get-Content -Raw ..\cloudfileToken.txt).Trim()
pnpm dlx wrangler@latest d1 execute life-vlog-db --file ./schema.d1.sql --remote
pnpm dlx wrangler@latest deploy
```

如果新增表或字段，只需要更新 `schema.d1.sql` 并重新执行上面的 D1 命令。
