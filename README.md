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

## 安装到 iPhone 主屏幕

这个项目已配置为 PWA，可以像 App 一样添加到 iOS 主屏幕，不需要上架 App Store。

1. 用 iPhone 的 Safari 打开 GitHub Pages 网址。
2. 点底部分享按钮。
3. 选择“添加到主屏幕”。
4. 名字保留“咻蛋之家”，点“添加”。

第一次从主屏幕打开时可能需要重新登录一次；之后会像独立 App 一样打开。
前端外壳会缓存到本机，照片、评论和数据库内容仍通过 Supabase 云端同步。

## 免费额度提醒

照片会在浏览器中压缩到最长边 1800px、JPEG 质量 0.86，再上传到 Supabase Storage。这样更省空间，也更适合手机访问。

## 启用账户云同步

已有项目升级时，在 Supabase Dashboard 的 `SQL Editor` 中运行一次
`supabase-cloud-sync.sql`。

只升级 2026-06-19 的头像、评论回复和互动通知时，可以只运行
`supabase-interactions-patch.sql`，不必重新复制整份同步脚本。

该脚本会创建：

- `user_profiles`：VIP 档位、累计充值、经验、每日登录日期、主题、主页名称与转盘候选
- `recipes`：菜谱、封面、调味料、食材与步骤
- `wishes`：心愿类型、图片、计划日期、优先级、完成状态与完成感想
- `weekend_plans`：周末计划、日期、地点与完成状态
- `anniversaries`：宠物年龄、相伴天数与纪念日
- `photo_favorites`：每个账户自己的照片收藏
- `photos.is_featured / is_pinned`：七日精选与置顶状态
- `password_recovery_credentials`：加密恢复密钥、失败次数和临时锁定状态
- `families / family_members`：家庭组、成员与作者身份
- `gratitude_notes`：感谢留言板的文字、颜色和作者
- `photo_comments`：照片下的家庭留言
- `notifications`：收藏、评论与回复的未读通知

登录后的首次加载会自动把旧浏览器中的本地菜谱、心愿、VIP、经验、纪念日、
周末计划、收藏和转盘候选迁移到云端。本地存储只保留为缓存，不作为登录账户的
最终数据来源。

用户名账户使用内部占位邮箱，因此忘记密码通过恢复密钥完成。用户登录后应先在
账户菜单中设置至少 12 位的恢复密钥。连续输入错误 5 次会锁定 15 分钟。

## 家庭共享

先由其中一个账户在右上角头像菜单打开“家庭账户”，创建家庭组，再输入另一位
用户的登录用户名发送邀请。对方登录后在“家庭账户”里接受邀请。加入后双方可以看到彼此的照片、菜谱、心愿、周末计划、
纪念日和感谢留言。家庭成员可以共同编辑生活类记录；照片原图、置顶和精选仍由
原作者管理。照片收藏、密码、VIP、经验和主题偏好保持为个人数据。
