# Cloudflare Backend

当前后端只使用 Cloudflare：

- Worker 负责 API、登录、注册、限流和 R2 上传删除。
- D1 保存账号、家庭共享、日记、评论、收藏、菜谱、心愿、周末计划、纪念日、留言、通知和秘藏。
- R2 保存所有图片，以及 Live Photo 的配对视频。

发布命令：

```powershell
..\deploy-cloudflare-pages.ps1 -Environment production
```

发布脚本只在当前部署进程内读取 `C:\Users\xiuda\Documents\照片\cloudfileToken.txt`，不会把 token 写入工作区或输出到日志。不要在其他 shell、脚本或文档中复制 token。

数据库结构变更不属于这个前端发布命令的范围；本批不修改数据库、迁移或后端业务逻辑。
