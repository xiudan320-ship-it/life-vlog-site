# UI 设计入口

后续开发沿用当前已实现的 UI，不启动蓝月 / P3R 主题改版，不增加主题模式或主题切换配置。

## 当前风格

- 保留现有浅色与深色外观、绿色主强调色、内容优先的照片与日记布局。
- 沿用现有导航、卡片、弹窗、圆角、间距、响应式规则和交互反馈；局部需求局部修改，不借机重做整站。
- 实际样式以 `styles/redesign-foundation.css` 及相关组件样式的最终层叠结果为准，不用旧文档中的示例值覆盖正确实现。
- 保留当前桌面四列日记瀑布流、移动端布局及今日心情侧栏，不因文档整理改变页面行为。

## 资产保护

绿底黑猫原图不替换、不重绘、不改色；如需装饰，只放在图片外部。保护源图、两个封面尺寸版本和现有 Logo：

- `assets-source/black-cat-cover.jpg`
- `assets/generated/black-cat-cover-1280.webp`
- `assets/generated/black-cat-cover-640.webp`
- `assets-source/black-cat-logo-source.png`
- `assets-source/black-cat-logo.png`
- `assets/generated/black-cat-logo-112.webp`
- `assets-source/home-logo.jpg`
- `assets/generated/home-logo-192.webp`
- `assets/generated/home-logo-96.webp`

## 按需阅读与验收

- 全局规则：[MASTER.md](design-system/life-vlog/MASTER.md)。
- 页面改动只读取 `design-system/life-vlog/pages/` 中对应页面规范。
- UI 改动检查浅色/深色状态、加载/空/错误状态、键盘焦点与弹窗关闭恢复、触控区域、减少动态效果，以及受影响宽度下的遮挡和横向溢出。
- 检查移动端 375、390、430px，平板 768px，桌面 1024、1440px；影响超宽侧栏时补充超宽检查。只改文档时检查链接、规范一致性和 diff，无需重跑整站视觉验收。
- 测试范围遵循 [文档路由](docs/README.md) 和 [变更流程](docs/CHANGE_WORKFLOW.md)，发布遵循 [发布清单](docs/release-checklist.md)。测试使用确定性内存 fixture。
