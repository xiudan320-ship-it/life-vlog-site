# 手机端页面缩放锁定修复规划

> Status: Implemented
> Scope: 仅在当前任务直接涉及本专项时查阅
> Default loading: No
> Source of truth: 当前源码及对应长期系统文档

> 状态：已实现并部署（2026-08-31）
> 规划日期：2026-08-31  
> 优先级：P0  
> 证据：用户提供的 iPhone 截图中，整个应用外壳被放大并向右裁切。

## 1. 问题与根因

入口 `index.html` 当前使用：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

这个配置只定义初始比例，没有锁定浏览器页面比例，因此手机浏览器或已安装 PWA 仍可能通过双指捏合、双击或输入框聚焦改变整个页面的缩放级别。截图中的顶栏、导航、Hero 和概览同时变大且右侧被裁切，符合浏览器级页面缩放，而不是单一组件尺寸错误。

同时必须排除第二类问题：组件真实宽度超过布局 viewport。修复不能只增加 `overflow-x: hidden`，否则会把不可访问的内容直接裁掉。

## 2. 修复目标

1. 手机浏览器和 standalone PWA 中，应用外壳不能通过双指或双击改变页面级缩放。
2. 页面首次进入、刷新、路由切换、弹层打开关闭后始终保持 1:1 布局比例。
3. iPhone 聚焦输入框时不触发 Safari 自动放大。
4. 375px、390px、430px 和手机横屏不存在页面级横向滚动。
5. 保留日记/秘藏照片查看器内部的业务缩放、拖动和缩放按钮；只禁止浏览器放大整个页面。
6. 保留正常纵向滚动、横向导航条和确有用途的组件内部横向滚动。

## 3. 实现边界

### 3.1 视口契约

把主入口 viewport 改为单一明确契约：

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

- 直接替换旧配置，不保留第二个 viewport 标签或运行时兼容分支。
- 不用 JavaScript 反复重写 meta 标签。
- 不用 `preventDefault()` 全局拦截 `touchmove`、`gesturestart` 或滚轮事件。
- 不给 `html` / `body` 设置 `touch-action: none`，否则会破坏滚动、返回手势和已有媒体手势。
- 桌面浏览器的系统级缩放不属于本移动端缺陷范围。

### 3.2 双击与控件交互

- 普通按钮、链接、标签导航和表单操作继续使用既有点击语义；如需抑制双击放大，只在标准交互控件层使用现有或统一的 `touch-action: manipulation`。
- 不把 `touch-action: manipulation` 覆盖到照片查看器的手势画布；查看器继续由现有媒体控制器管理缩放和拖动。
- 不新增全局手势控制器。

### 3.3 iOS 输入框自动放大

检查所有手机端可聚焦的 `input`、`textarea`、`select`：

- 计算后的字号不得小于 `16px`。
- 不能用 `transform: scale()` 把 16px 表单控件视觉缩小。
- 需要紧凑外观时调整 padding、行高和容器，而不是降低输入文字字号。
- 验证登录、日记、评论、周末、心愿、菜谱、设置和心情编辑器。

### 3.4 横向溢出

在 375×812、390×844、430×932、844×390 以及 130%/xlarge 字号下逐页检查：

```js
document.scrollingElement.scrollWidth <= document.documentElement.clientWidth + 1
```

如果失败，定位具体越界元素并修正其宽度、`min-width`、gap、绝对定位或 `100vw` 与滚动条/安全区叠加问题。不得用以下方式掩盖：

- 全局 `overflow-x: hidden` / `clip` 代替修正子元素；
- 缩小整个页面；
- 裁掉导航、文本或操作按钮；
- 删除组件内部确有用途的横向滚动。

## 4. 可访问性取舍

禁止页面缩放会减少一种视觉放大方式，这是用户明确要求的产品行为。因此交付时必须保留以下补偿能力：

- 项目已有的大号 / xlarge 字号设置正常工作，130% 字号无截断和横向溢出。
- 正文和表单基础字号保持可读，表单至少 16px。
- 系统屏幕阅读器、键盘焦点、选择复制和系统辅助功能不被触摸事件拦截。
- 照片内容仍可在应用自己的查看器中放大。
- 不删除 Axe 的其他严重/关键规则；现有 `meta-viewport` 例外需要在测试中留下明确注释，说明这是经确认的产品契约。

## 5. 预计修改文件

| 文件 | 修改 |
| --- | --- |
| `index.html` | 更新唯一 viewport meta。 |
| `styles/redesign-foundation.css` 及实际命中的表单样式文件 | 保证手机表单计算字号至少 16px；仅在普通交互控件需要时设置 `touch-action: manipulation`。 |
| `tests/static-contracts.mjs` | 精确断言 viewport 包含 `minimum-scale=1.0`、`maximum-scale=1.0`、`user-scalable=no`、`viewport-fit=cover`，并且只有一个 viewport。 |
| `tests/browser-regression.mjs` | 增加页面比例、表单字号、各路由横向溢出和路由/弹层返回后的布局回归。 |
| `tests/axe-regression.mjs` | 保留并解释经产品确认的 `meta-viewport` 例外；继续阻断其他 critical/serious 问题。 |
| `docs/TECHNICAL_OVERVIEW.md` | 记录移动端固定页面比例、表单字号和媒体查看器缩放边界。 |
| `docs/release-checklist.md` | 加入真机 Safari/PWA 手势、输入聚焦、横屏和内部图片缩放验收。 |
| `CHANGELOG.md` | 在 `[Unreleased]` 记录用户可见修复。 |

如果排查发现具体越界组件，可修改对应 CSS 和测试；禁止为了这个缺陷重构无关页面。

## 6. 自动化验收

### 6.1 静态契约

- HTML 只有一个 `name="viewport"`。
- viewport 内容完整且没有互相冲突的比例值。
- 不出现全局 `touch-action: none` 或全局手势 `preventDefault()`。

### 6.2 浏览器回归

- 首屏、登录后 gallery、日记详情、心情、菜谱、心愿、周末、衣柜、设置均无页面级横向溢出。
- 打开/关闭 dialog、切换路由、旋转为横屏后仍保持布局 viewport 宽度。
- 所有手机表单控件的计算字号至少 16px。
- 普通页面纵向滚动和导航仍可用。
- 照片查看器仍能通过既有按钮和内部手势改变图片缩放，关闭后页面布局比例不变。
- light/dark、reduced-motion、130%/xlarge 字号均通过。

### 6.3 真机验收

自动化无法完整模拟 iOS Safari 和 standalone PWA 的所有页面缩放行为，发布前必须使用真机执行：

1. Safari 打开生产候选页，双指放大/缩小页面无效。
2. 快速双击 Hero、正文、卡片和导航不会放大页面或偏移布局。
3. 添加到主屏幕后重复以上操作。
4. 逐一聚焦登录框、搜索框、评论框和编辑器，页面不自动放大。
5. 横竖屏切换后页面回到正确宽度，无右侧空白或裁切。
6. 打开照片查看器，图片自身仍可缩放；关闭后应用外壳仍为 1:1。

## 7. 必跑门禁

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run test:a11y
pnpm run test:release
pnpm run test:build
git diff --check
```

使用项目的 bundled Node.js 运行时和确定性内存 fixture；不使用真实账号、token 或线上业务数据。

## 8. 完成定义

- 用户截图中的整页放大和右侧裁切无法再复现。
- 主入口只有一个固定比例 viewport 契约。
- 所有手机表单聚焦不触发自动放大。
- 所有主要路由在目标尺寸和大字号下无页面横向溢出。
- 普通滚动、返回手势、弹层和路由未被全局触摸拦截破坏。
- 照片查看器内部缩放仍正常。
- 自动化门禁和真机 Safari/PWA 验收全部通过后才能发布。
