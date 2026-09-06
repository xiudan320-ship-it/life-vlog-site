const sectionRegistry = [
  { id: "settingsAppearance", label: "外观与使用", icon: "settings" },
  { id: "settingsAccount", label: "账户与安全", icon: "heart" },
  { id: "settingsFamily", label: "家庭与共享", icon: "home" },
  { id: "settingsTools", label: "通知与工具", icon: "bell" },
  { id: "settingsStorage", label: "存储与数据", icon: "download" },
];

const itemRegistry = [
  { id: "renameHomeButton", sectionId: "settingsAppearance", label: "主页名称", description: "修改家庭主页显示名称", keywords: ["主页", "名称", "标题", "改名"] },
  { id: "settingsFeedLayoutButton", sectionId: "settingsAppearance", label: "手机列表布局", description: "切换日记列表单列或双列", keywords: ["手机", "列表", "布局", "单列", "双列"] },
  { id: "settingsTextScale", sectionId: "settingsAppearance", label: "文字大小", description: "调整应用内文字显示大小", keywords: ["字体", "文字", "字号", "大小"] },
  { id: "settingsInstallApp", sectionId: "settingsAppearance", label: "安装应用", description: "将咻蛋之家添加到主屏幕", keywords: ["安装", "主屏幕", "应用"] },
  { id: "settingsPrimaryNavigation", sectionId: "settingsAppearance", label: "顶部分页", description: "选择和调整首页入口顺序", keywords: ["导航", "分页", "入口", "排序"] },
  { id: "renameProfileButton", sectionId: "settingsAccount", label: "昵称", description: "修改家庭账户中显示的昵称", keywords: ["昵称", "名字", "账户"] },
  { id: "changeAvatarButton", sectionId: "settingsAccount", label: "头像", description: "更换家庭成员头像", keywords: ["头像", "照片", "图片"] },
  { id: "changePasswordButton", sectionId: "settingsAccount", label: "修改密码", description: "更新账户登录密码", keywords: ["密码", "登录", "安全"] },
  { id: "recoveryKeyButton", sectionId: "settingsAccount", label: "恢复密钥", description: "备份忘记密码时使用的恢复密钥", keywords: ["恢复", "密钥", "忘记密码", "备份"] },
  { id: "changeSecretPinButton", sectionId: "settingsAccount", label: "秘藏密码", description: "修改进入秘藏的数字密码", keywords: ["秘藏", "密码", "PIN", "数字"] },
  { id: "bindEmailButton", sectionId: "settingsAccount", label: "绑定邮箱", description: "绑定邮箱用于找回账户", keywords: ["邮箱", "绑定", "找回"] },
  { id: "settingsFamilyPanel", sectionId: "settingsFamily", label: "家庭成员与邀请", description: "管理家庭成员、邀请和邀请码", keywords: ["家庭", "成员", "邀请", "邀请码", "共享"] },
  { id: "familyTaglineButton", sectionId: "settingsFamily", label: "家庭签名", description: "修改家庭主页上的共享签名", keywords: ["家庭", "签名", "主页"] },
  { id: "familyAccountButton", sectionId: "settingsFamily", label: "管理家庭", description: "创建家庭、邀请成员或处理邀请", keywords: ["家庭账户", "管理", "创建", "成员"] },
  { id: "settingsNotifications", sectionId: "settingsTools", label: "消息通知", description: "管理这台设备的 Web Push 通知", keywords: ["通知", "推送", "提醒", "Web Push"] },
  { id: "settingsToolOrderList", sectionId: "settingsTools", label: "工具排序", description: "调整首页工具入口的顺序", keywords: ["工具", "排序", "首页", "顺序"] },
  { id: "refreshCacheInfoButton", sectionId: "settingsStorage", label: "缓存占用", description: "查看本机日记和秘藏缓存占用", keywords: ["缓存", "占用", "空间", "本地"] },
  { id: "cacheLimitButton", sectionId: "settingsStorage", label: "缓存容量上限", description: "设置日记和秘藏图片缓存上限", keywords: ["缓存", "容量", "上限", "MB"] },
  { id: "mediaCachePolicyButton", sectionId: "settingsStorage", label: "自动缓存", description: "设置是否仅在 Wi-Fi 下自动缓存", keywords: ["缓存", "自动", "Wi-Fi", "离线"] },
  { id: "downloadDiaryOfflineButton", sectionId: "settingsStorage", label: "下载日记离线包", description: "手动缓存当前日记文字和图片", keywords: ["日记", "下载", "离线", "缓存"] },
  { id: "downloadSecretOfflineButton", sectionId: "settingsStorage", label: "下载秘藏离线包", description: "手动缓存秘藏相册和图片", keywords: ["秘藏", "下载", "离线", "缓存"] },
  { id: "settingsSafety", sectionId: "settingsStorage", label: "备份与回收站", description: "管理家庭备份和最近删除内容", keywords: ["备份", "回收站", "恢复", "删除"] },
  { id: "settingsUploads", sectionId: "settingsStorage", label: "上传任务中心", description: "查看和重试等待上传的日记", keywords: ["上传", "任务", "重试", "队列"] },
  { id: "settingsDiagnostics", sectionId: "settingsStorage", label: "离线与运行诊断", description: "检查应用、网络和本机缓存状态", keywords: ["诊断", "离线", "运行", "网络"] },
  { id: "settingsPerformance", sectionId: "settingsStorage", label: "性能诊断", description: "查看和清理本机性能记录", keywords: ["性能", "卡顿", "诊断"] },
];

export const SETTINGS_SECTION_REGISTRY = Object.freeze(
  sectionRegistry.map((section) => Object.freeze(section))
);

export const SETTINGS_ITEM_REGISTRY = Object.freeze(
  itemRegistry.map((item) => Object.freeze({ ...item, keywords: Object.freeze([...item.keywords]) }))
);

export function getSettingsSection(sectionId) {
  return SETTINGS_SECTION_REGISTRY.find(({ id }) => id === sectionId) || SETTINGS_SECTION_REGISTRY[0];
}
export function isSettingsSection(sectionId) {
  return SETTINGS_SECTION_REGISTRY.some(({ id }) => id === sectionId);
}

export function getSettingsSectionIds() {
  return SETTINGS_SECTION_REGISTRY.map(({ id }) => id);
}

export function getSettingsItem(itemId) {
  return SETTINGS_ITEM_REGISTRY.find(({ id }) => id === itemId) || null;
}

export function getSettingsItemsForSection(sectionId) {
  return SETTINGS_ITEM_REGISTRY.filter((item) => item.sectionId === sectionId);
}
