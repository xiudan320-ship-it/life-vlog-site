import {
  clonePrimaryNavigationConfig,
  getPrimaryNavigationItem,
  getPrimaryNavigationItems,
  movePrimaryNavigationItem,
  normalizePrimaryNavigationConfig,
  setPrimaryNavigationEnabled,
} from "./primary-navigation-domain.js";
import {
  renderPrimaryNavigation,
  renderPrimaryNavigationSettings,
  setPrimaryNavigationSettingsStatus,
  syncPrimaryNavigationState,
} from "./primary-navigation-view.js";

export function createPrimaryNavigationController({
  root,
  getSettingsRoot = () => null,
  preferenceStore,
  preferenceKey,
  getSession = () => null,
  getActivePage = () => "gallery",
  getActiveFilter = () => "全部",
  routeAction = () => false,
  modeActions = {},
} = {}) {
  let scope = "guest";
  let config = normalizePrimaryNavigationConfig(null);
  let settingsPanel = null;
  let navigationBound = false;

  function getSignedIn() {
    return Boolean(getSession?.());
  }

  function renderNavigation() {
    renderPrimaryNavigation(
      root,
      getPrimaryNavigationItems(config, { visibleOnly: true, signedIn: getSignedIn() })
    );
    syncActive();
  }

  function syncActive() {
    return syncPrimaryNavigationState(root, {
      activePage: getActivePage(),
      activeFilter: getActiveFilter(),
    });
  }

  function readConfig(nextScope) {
    const stored = preferenceStore?.readJson?.(preferenceKey, null, { scope: nextScope });
    return normalizePrimaryNavigationConfig(stored);
  }

  function saveConfig(message = "已保存") {
    const saved = preferenceStore?.writeJson?.(preferenceKey, config, { scope }) ?? false;
    renderNavigation();
    renderSettings();
    setPrimaryNavigationSettingsStatus(
      getSettingsRoot?.(),
      saved ? message : "已应用，但本机保存失败，请重试。"
    );
    return saved;
  }

  function applyForUser(userId = getSession?.()?.user?.id || "guest") {
    scope = String(userId || "guest").trim() || "guest";
    config = readConfig(scope);
    renderNavigation();
    renderSettings();
    return clonePrimaryNavigationConfig(config);
  }

  function handleNavigationClick(event) {
    const button = event.target?.closest?.("[data-primary-nav-id]");
    if (!button || !root?.contains?.(button)) return;
    const item = getPrimaryNavigationItem(button.dataset.primaryNavId);
    if (!item) return;
    const action = item.type === "mode" ? modeActions[item.mode] : routeAction;
    if (typeof action !== "function") return;
    Promise.resolve(action(item)).catch(() => {});
  }

  function handleSettingsChange(event) {
    const toggle = event.target?.closest?.("[data-primary-nav-toggle]");
    if (!toggle || !settingsPanel?.contains?.(toggle)) return;
    const id = toggle.dataset.primaryNavToggle;
    config = setPrimaryNavigationEnabled(config, id, toggle.checked);
    saveConfig("已保存顶部分页设置");
  }

  function handleSettingsClick(event) {
    const button = event.target?.closest?.("[data-primary-nav-move]");
    if (!button || !settingsPanel?.contains?.(button)) return;
    const [id, direction] = String(button.dataset.primaryNavMove || "").split(":");
    if (!id || !direction) return;
    config = movePrimaryNavigationItem(config, id, direction);
    saveConfig("已保存顶部分页顺序");
  }

  function bindSettingsPanel(panel) {
    if (!panel || panel === settingsPanel) return;
    settingsPanel = panel;
    settingsPanel.addEventListener("change", handleSettingsChange);
    settingsPanel.addEventListener("click", handleSettingsClick);
  }

  function renderSettings() {
    const settingsRoot = getSettingsRoot?.();
    const panel = settingsRoot?.querySelector?.("#settingsPrimaryNavigation");
    if (!panel) return;
    bindSettingsPanel(panel);
    renderPrimaryNavigationSettings(
      panel,
      getPrimaryNavigationItems(config, { settings: true }),
      config.enabled
    );
  }

  function bind() {
    if (!root || navigationBound) return;
    root.addEventListener("click", handleNavigationClick);
    navigationBound = true;
  }

  applyForUser();

  return {
    applyForUser,
    bind,
    getConfig: () => clonePrimaryNavigationConfig(config),
    render: renderNavigation,
    renderSettings,
    syncActive,
  };
}
