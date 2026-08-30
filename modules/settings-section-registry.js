export const SETTINGS_SECTION_REGISTRY = Object.freeze([
  Object.freeze({ id: "settingsAppearance", label: "外观与使用", kicker: "Appearance", title: "外观与使用", icon: "settings" }),
  Object.freeze({ id: "settingsAccount", label: "账户与安全", kicker: "Account & Security", title: "账户与安全", icon: "heart" }),
  Object.freeze({ id: "settingsFamily", label: "家庭与共享", kicker: "Family & Sharing", title: "家庭与共享", icon: "home" }),
  Object.freeze({ id: "settingsTools", label: "通知与工具", kicker: "Notifications & Tools", title: "通知与工具", icon: "bell" }),
  Object.freeze({ id: "settingsStorage", label: "存储与数据", kicker: "Storage & Data", title: "存储与数据", icon: "download" }),
]);

export function getSettingsSection(sectionId) {
  return SETTINGS_SECTION_REGISTRY.find(({ id }) => id === sectionId) || SETTINGS_SECTION_REGISTRY[0];
}

export function isSettingsSection(sectionId) {
  return SETTINGS_SECTION_REGISTRY.some(({ id }) => id === sectionId);
}

export function getSettingsSectionIds() {
  return SETTINGS_SECTION_REGISTRY.map(({ id }) => id);
}
