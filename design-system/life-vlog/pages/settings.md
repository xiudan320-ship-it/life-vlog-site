# 设置中心页面特例

设置中心沿用 `MASTER.md` 的安静深色 Life Archive 语言，但作为应用内模态中心拥有独立的信息架构。桌面端使用左侧分类目录与右侧内容区；手机端一次只显示分类目录或分类详情，避免把五组长内容压缩在同一滚动页面。

## 页面结构

- `settings-dialog` 是唯一的模态根，使用原生 `showModal()` / `close()`，关闭按钮始终位于可见标题栏。
- `settings-shell` 由标题栏、搜索区、移动详情标题和内容布局组成；设置壳的打开/关闭、分类、搜索、返回和焦点由 `settings-shell-controller.js` 负责。
- 桌面目录由 `settings-shell-view.js` 从 `settings-section-registry.js` 渲染五类：外观与使用、账户与安全、家庭与共享、通知与工具、存储与数据。
- 移动端默认显示目录；进入分类后隐藏目录、显示详情和返回按钮。系统 Escape/back 的顺序是关闭子弹窗、回到设置目录、关闭设置中心。
- 设置项必须指向真实 DOM 节点和真实 controller 动作。`settings-search-domain.js` 只做同步本地匹配，不读取网络、用户内容或演示数据。

## 视觉与密度

- 弹窗桌面最大宽度约 940px，侧栏约 264px；内容区独立滚动，标题和关闭按钮不随内容消失。
- 颜色使用现有语义 token；选中、成功和主要动作使用 lime，危险操作使用 coral，不能把状态只交给颜色表达。
- 目录入口、设置行和卡片使用清晰层级：目录按钮是一级入口，卡片承载同类动作，设置行负责名称、当前值/说明和进入提示。
- 普通设置行保持约 64–68px 高；移动端不通过缩小文字制造密度，正文/控件继续遵守全局 16px 输入字号契约。
- 危险缓存操作放在默认折叠的 disclosure 中；状态、加载、空态、错误和恢复动作留在对应区块内。

## 交互与无障碍

- 桌面目录使用 `tablist` / `tab` / `tabpanel` 语义，支持方向键、Home、End 和可见 `:focus-visible`。
- 手机目录/详情不是 tablist；返回按钮带可读名称，进入详情后标题明确当前分类。
- 搜索框有 label，结果数量通过 `aria-live="polite"` 播报；结果使用普通结果区域与原生 button，不声明未实现的 listbox/option 复合控件；结果点击后同时切换分类、滚动目标和移动焦点。
- 每个图标按钮有 accessible name，所有可点击行/按钮至少 44×44 CSS px，并与相邻操作保持可触控间距。
- 打开设置时记录来源焦点；关闭设置、取消子弹窗或完成子弹窗返回后恢复到合理的来源/分类焦点，不把焦点留在已隐藏节点。
- `prefers-reduced-motion: reduce` 下取消壳的过渡和搜索目标脉冲，搜索定位使用非平滑滚动，不影响状态更新或内容可达性；不可用的安装入口聚焦可见设置行容器。

## 实现边界

视图模板在 `modules/settings-view.js`，壳/目录/结果在 `modules/settings-shell-view.js`，壳生命周期在 `modules/settings-shell-controller.js`，注册表与搜索纯逻辑在 `modules/settings-section-registry.js` / `modules/settings-search-domain.js`。账户、家庭、Push、工具排序、缓存和数据安全仍由各自 controller 拥有；`settings-event-bindings.js` 只负责通用设置动作的接入。

## 验收清单

- [ ] 桌面 1024/1440 与手机 375/390/430、844×390 无横向溢出。
- [ ] 手机目录和详情只显示一层，返回、Escape 和关闭按钮始终可见。
- [ ] 搜索“密码、通知、缓存”能定位真实设置项，清除后恢复分类目录。
- [ ] 子弹窗打开/关闭后返回原分类并恢复焦点。
- [ ] 深浅主题、130% 字号、键盘、reduced-motion、Axe critical/serious 通过。

