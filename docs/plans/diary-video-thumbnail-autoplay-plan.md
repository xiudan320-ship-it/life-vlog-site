# 咻蛋之家：日记视频缩略图标识与视觉中心自动播放规划

> Status: Planned
> Scope: 仅在当前任务直接涉及本专项时查阅
> Default loading: No
> Source of truth: 当前源码及对应长期系统文档

> 日期：2026-08-30
> 执行分支：`codex/life-vlog-stabilization`
> 当前基线：`a77ef33`，并保留工作树内现有全部未提交修改
> 执行方式：由 Luna Max 在现有“牛马”任务中实现、测试并部署

## 1. 用户目标

同时修复桌面端和手机端日记/VLOG 列表：

1. 视频缩略图右上角始终显示明确的 `VIDEO` 标识；Live Photo 显示 `LIVE`。
2. 普通视频缩略图恢复静音自动播放。
3. 整个列表任意时刻只允许一个动态缩略图播放，并且必须是最接近当前视口视觉中心的候选。
4. 时长不超过 8 秒的视频允许循环；超过 8 秒的视频只播放一次，不循环。
5. 离开视觉中心、切换筛选/页面、打开详情、页面进入后台时立即停止动态预览并释放资源。
6. 点击缩略图仍进入详情；列表预览不得抢占点击、手势、声音或详情播放器控制权。

## 2. 已确认的问题所在

### 2.1 普通视频被代码主动排除出动态预览

`modules/diary-gallery-view.js` 的 `renderFeedImage()` 只有媒体类型为 `live` 时才写入 `data-motion-src`。普通 `video` 虽然拥有 `video_url`，列表 DOM 只得到 poster 图片，因此动态预览观察器根本看不到它。

现有测试还明确断言普通视频不得包含 `data-motion-src`，所以这不是偶发故障，而是上一轮静态海报策略留下的行为。

### 2.2 当前动态预览只适配 Live Photo

`activateMotionImage()` 创建的视频固定：

- `muted = true`
- `playsInline = true`
- `loop = true`

它没有读取视频 duration，也没有普通视频与 Live Photo 的播放策略区分，因此无法实现 8 秒阈值。

### 2.3 当前候选不是“视觉中心”

`hydrateMotionFeedVideos()` 当前按 `IntersectionObserver.intersectionRatio` 最大值选择候选。面积最大的卡片不一定最接近屏幕视觉中心，瀑布流、多图卡片和手机长屏下尤其容易选错。

### 2.4 VIDEO 标识的样式资源此前不在日记路由

徽标结构已经存在，但样式曾放在非日记路由的样式包中，导致正式日记页看不到。当前工作树已经有一组未提交修改，把共享徽标样式移到日记实际加载的基础样式中，并让拼图里的每个动态媒体拥有自己的标识。执行时必须保留并完成这组改动，不能回退或重复实现。

### 2.5 当前来源去重会阻止重新进入中心后的合理恢复

`requestedSources` 以 URL 永久记忆本次已经请求过的媒体。预览离开中心并释放后，同一缩略图无法再次激活。新的生命周期应按元素保存播放进度和完成状态，而不是用 URL 永久封锁。

## 3. 交互规格

### 3.1 徽标

- 普通视频：右上角静态 `VIDEO` 徽标。
- Live Photo：右上角静态 `LIVE` 徽标。
- 徽标属于状态说明，不可点击，不使用 emoji，不遮挡卡片点击。
- 使用现有语义颜色与 SVG/纯 CSS 点标，深浅色均保证可辨识；文字保持单行。
- 单图卡片和拼图中的动态媒体都显示各自徽标。
- 图片加载失败时徽标仍保留，让用户知道原媒体类型。

### 3.2 自动播放候选

候选必须同时满足：

- poster 已成功加载；
- 动态资源 URL 有效；
- 元素与视口相交；
- 页面当前可见；
- 不处于 `prefers-reduced-motion: reduce`；
- 未开启 `navigator.connection.saveData`；
- 当前仍在日记/VLOG 列表，而非详情或其他页面。

候选评分使用元素中心点与视口中心点的二维距离；距离最小者获胜。IntersectionObserver 只负责维护候选集合，最终选择必须在 `requestAnimationFrame` 中根据最新几何位置计算。

为了避免中心线附近两个卡片频繁抢占：

- 当前播放项仍属于中心候选区时保留它；
- 新候选只有明显更接近中心时才切换，加入小幅迟滞阈值；
- scroll/resize/布局变化统一合并到单个 rAF，不逐事件创建播放器。

### 3.3 播放生命周期

- 所有列表预览强制静音、`playsinline`、无 controls、无音轨交互、`pointer-events: none`。
- 同一时刻最多一个 `.feed-motion-preview` 正在播放。
- 激活时在 poster 上方创建 video；首帧可用前继续显示 poster，避免黑屏闪烁。
- 离开中心时暂停并移除 video，但保留该元素的合理播放状态。
- 切换到另一个候选时先完整释放旧实例，再创建新实例。
- 页面 `visibilitychange=hidden`、路由离开、重新渲染、打开详情时停止并清理。
- `play()` 被浏览器拒绝时安静退回 poster，不显示永久 loading，也不影响详情播放。

### 3.4 8 秒规则

读取 `loadedmetadata` 后按真实 `duration` 决策：

- `duration <= 8.0`：`loop=true`，仅在它保持视觉中心期间循环。
- `duration > 8.0`：`loop=false`；离开中心前暂停，重新回到中心时可从暂停位置继续；播放到 `ended` 后本次列表挂载周期不自动重播，显示 poster 或稳定末帧。
- duration 无效、Infinity 或 metadata 失败：按长视频处理，即不循环。
- 切换筛选或列表重新挂载后，新的页面生命周期可以重新播放一次。

### 3.5 Live Photo

Live Photo 继续复用同一个视觉中心调度器，禁止另建第二套观察器。

- 仍然静音。
- 可继续循环，但只允许视觉中心的一个实例播放。
- 与普通视频竞争同一个全局播放槽位。

## 4. 实现结构

### 4.1 领域层

新增或提取纯函数到独立模块，例如 `modules/diary-feed-motion-domain.js`：

- 判断媒体是否具备动态预览资源；
- 根据 duration 返回 `loop` 策略；
- 根据候选矩形和 viewport 计算中心距离；
- 带迟滞地选择下一个候选；
- 判断 reduced-motion/save-data/page-hidden 等禁用条件。

不要把这些规则继续堆进 `app.js`，也不要保留普通视频静态策略与新策略两套并行实现。

### 4.2 视图层

`modules/diary-gallery-view.js`：

- poster 仍以 `<img>` 作为稳定底图；
- 普通视频和 Live Photo 都输出统一的动态预览数据属性；
- 数据属性明确媒体类型、preview URL 和 poster URL；
- 徽标由媒体类型统一生成；
- 失败重试状态与徽标互不覆盖。

### 4.3 控制与生命周期

将当前 motion observer 重构为一个可销毁的 feed preview coordinator：

- 一个 IntersectionObserver；
- 一个 rAF 调度；
- 一个 active 实例；
- 每个元素独立的播放进度/ended 状态；
- scroll、resize、visibilitychange 与路由销毁清理；
- 不以 URL 作为唯一身份，避免同源媒体互相误伤。

如果逻辑明显超出视图职责，控制器必须放在 `modules/` 独立文件中，`diary-gallery-view.js` 只负责 DOM 创建与最薄的装配。

### 4.4 CSS

- 继续使用当前工作树已移动到 `styles/redesign-foundation.css` 的共享徽标样式，不回退到 wishlist 专属 CSS。
- video overlay 完全覆盖其所在媒体格，不改变宽高和瀑布流布局，不造成 CLS。
- 徽标层级高于动态视频但低于错误恢复和必要操作控件。
- 375px、390px、430px、横屏和桌面均保持右上角安全间距。

## 5. 必须补充的测试

### 5.1 单元测试

- 普通 video 输出动态预览 URL，但初始 DOM 仍是 poster `<img>`。
- image 不输出动态预览属性。
- video 与 live 都输出正确徽标。
- `7.99s`、`8.0s` 循环；`8.01s`、无效 duration 不循环。
- 中心距离算法在桌面双列、手机单列和拼图中选择正确候选。
- 迟滞规则不会在相近候选间抖动。

### 5.2 浏览器回归

- 桌面、390×844、844×390：任意时刻活动视频数量 `<= 1`。
- 滚动后活动项确实是距离视口中心最近的合格候选。
- 从日记切到 VLOG、再切到周末时无残留播放实例、无 pageerror。
- 短视频循环；长视频 `loop=false` 且 ended 后不自动重开。
- 离屏停止，返回中心按规则恢复。
- reduced-motion 与 save-data 下没有自动创建 video，但 VIDEO/LIVE 徽标仍显示。
- 页面进入后台后所有预览暂停/释放。
- 点击动态预览仍打开正确详情，详情播放器可由用户正常控制声音。
- 单图和拼图视频徽标均位于各自右上角，且不产生水平溢出。

### 5.3 门禁

必须通过：

- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm run test:a11y`
- `pnpm run test:build`
- `git diff --check`

## 6. 发布顺序

1. 先在现有工作树完成实现，保留所有已有未提交修改。
2. 本地桌面/手机/横屏、深浅色、reduced-motion 回归。
3. 部署 Cloudflare Pages preview 并运行 release smoke。
4. 预览验收通过后部署 production。
5. 正式站再次验证入口哈希、SW 更新、VIDEO/LIVE 徽标和中心自动播放。

## 7. 完成定义

只有同时满足以下条件才能报告完成：

- 双端视频缩略图右上角都有正确标识；
- 普通视频与 Live Photo 均进入统一中心播放调度；
- 当前视觉中心只有一个动态预览播放；
- 8 秒阈值行为经过自动化测试证明；
- reduced-motion/save-data/后台/路由切换正确停播；
- 没有恢复有声自动播放、卡死、空白缩略图或多视频并发；
- preview 与 production 均已部署并复核；
- 最终报告列出提交、测试、不可变部署 URL 与真实遗留风险。
