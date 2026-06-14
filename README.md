# 星星生活相册

一个可部署到 GitHub Pages 的生活照片 / vlog 图片网页软件。前端免费托管在 GitHub Pages，登录、数据库和图片存储使用 Supabase 免费额度。

界面是粉色星球风格：圆润照片卡片、星星分类标签、手机端瀑布流和可爱的上传面板。

## 后端选择

推荐使用 Supabase：

- Auth：邮箱登录。
- Database：保存标题、日期、分类、文字记录。
- Storage：保存照片文件。
- Free plan：适合早期个人生活相册。

## 创建 Supabase 后端

1. 注册并创建 Supabase 项目。
2. 打开 `SQL Editor`。
3. 复制 `supabase-schema.sql` 的内容并运行。
4. 打开 `Authentication > URL Configuration`。
5. 把 GitHub Pages 地址加入 `Site URL` 和 `Redirect URLs`。
6. 在 `Project Settings > API` 复制：
   - Project URL
   - anon public key

## 本地预览

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:8000/index.html
```

打开页面后，点右上角星星按钮，填入 Supabase 的 Project URL 和 anon public key。

## 部署到 GitHub Pages

1. 新建 GitHub 仓库。
2. 上传这些文件。
3. 在仓库设置里打开 `Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`。

## 免费额度提醒

照片会在浏览器中压缩到最长边 1800px、JPEG 质量 0.86，再上传到 Supabase Storage。这样更省空间，也更适合手机访问。

## 启用账户云同步

已有项目升级时，在 Supabase Dashboard 的 `SQL Editor` 中运行一次
`supabase-cloud-sync.sql`。

该脚本会创建：

- `user_profiles`：VIP 档位、累计充值、经验、每日登录日期、主题、主页名称与转盘候选
- `recipes`：菜谱、封面、调味料、食材与步骤
- `wishes`：心愿类型、图片、计划日期、优先级与完成状态
- `weekend_plans`：周末计划、日期、地点与完成状态
- `anniversaries`：宠物年龄、相伴天数与纪念日
- `photo_favorites`：每个账户自己的照片收藏
- `photos.is_featured / is_pinned`：七日精选与置顶状态

登录后的首次加载会自动把旧浏览器中的本地菜谱、心愿、VIP、经验、纪念日、
周末计划、收藏和转盘候选迁移到云端。本地存储只保留为缓存，不作为登录账户的
最终数据来源。
