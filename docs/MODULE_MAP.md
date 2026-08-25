# 功能模组索引

这份索引用来回答“某个功能坏了，应先看哪个模组”。`app.js` 只装配控制器、桥接共享状态并启动应用；业务修复和新功能不得写回 `app.js`。

## 快速定位

| 现象或功能 | 首要模组 | 相关视图 / 领域模组 |
| --- | --- | --- |
| 页面切换、顶部导航、返回行为 | `modules/app-navigation-controller.js` | `modules/app-event-bindings.js` |
| 登录、注册、邮箱与密码 | `modules/auth-controller.js` | `modules/app-session-controller.js`, `modules/settings-event-bindings.js` |
| 账户资料、头像、家庭设置、缓存设置 | `modules/profile-preferences-controller.js`, `modules/family-settings-controller.js` | `modules/settings-event-bindings.js`, `modules/account-view.js` |
| 日记列表、搜索、筛选、瀑布流 | `modules/diary-feed-controller.js` | `modules/diary-gallery-view.js`, `modules/diary-domain.js` |
| 发布 / 编辑日记、上传队列 | `modules/diary-composer-controller.js`, `modules/photo-detail-controller.js` | `modules/diary-upload-domain.js`, `modules/content-form-event-bindings.js` |
| VLOG 模式、视频声音、自动播放、控件 | `modules/vlog-mode.js`, `modules/photo-viewer-controller.js` | `modules/diary-video-layout.js`, `modules/media-event-bindings.js` |
| 图片 / 视频详情、缩放、前后切换、手势 | `modules/photo-viewer-controller.js`, `modules/photo-detail-controller.js` | `modules/media-event-bindings.js`, `modules/media-gesture-domain.js`, `modules/photo-dialog-view.js` |
| 周末计划、完成相册 | `modules/weekend-controller.js` | `modules/weekend-gallery.js`, `modules/weekend-plans-view.js`, `modules/content-form-event-bindings.js` |
| 心愿单 | `modules/wishlist-controller.js` | `modules/wishlist-view.js`, `modules/wishlist-hub-controller.js`, `modules/content-form-event-bindings.js` |
| 购物车 / 想买清单 | `modules/shopping-controller.js` | `modules/shopping-view.js`, `modules/wishlist-hub-controller.js` |
| 秘藏相册加载、保存、相册详情 | `modules/secret-controller.js` | `modules/secret-gallery-view.js`, `modules/secret-domain.js` |
| 秘藏筛选、标签计数、照片排序 | `modules/secret-filter-domain.js` | `modules/secret-domain.js` |
| 秘藏文件夹、默认入口、右键菜单 | `modules/secret-folder-controller.js` | `modules/secret-gallery-view.js` |
| 秘藏密码与解锁 | `modules/secret-pin-controller.js` | `modules/secret-entry-preference-controller.js` |
| 评论、回复、通知 | `modules/social-controller.js` | `modules/notification-domain.js`, `modules/notification-view.js` |
| 推送通知与点击跳转 | `modules/push-controller.js` | `modules/media-event-bindings.js` |
| 菜谱、留言、纪念日、吃什么 | 对应的 `*-controller.js` | 对应的 `*-view.js`, `modules/content-form-event-bindings.js` |
| 离线缓存与容量 | `modules/offline-cache-controller.js`, `modules/offline-settings-controller.js` | `modules/cache-policy.js`, `modules/cache-management-view.js` |
| 云端数据访问 | `modules/data-repositories.js`, `modules/household-repository.js` | `modules/cloudflare-client.js`, `modules/cloud-models.js` |

## 事件入口边界

- `app-event-bindings.js`：应用外壳、一级导航、工具坞、快捷入口和控制器装配。
- `content-form-event-bindings.js`：菜谱、心愿、周末、留言、秘藏等内容表单事件。
- `settings-event-bindings.js`：账户、家庭、缓存、安全、等级和网络状态事件。
- `media-event-bindings.js`：日记 / VLOG / 秘藏查看器、编辑器、搜索筛选和媒体手势事件。

## 修复顺序

1. 先按上表找到控制器或领域模组，确认数据和状态是否正确。
2. 数据正确但显示异常，再检查对应 `*-view.js` 或 CSS。
3. 点击完全无反应，再检查对应 `*-event-bindings.js`。
4. 只有初始化、共享状态桥接或控制器注入出错时才检查 `app.js`。
