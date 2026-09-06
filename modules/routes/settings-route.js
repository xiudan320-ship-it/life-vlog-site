import "../../styles/account-dialogs.css";
import "../../styles/settings.css";
import { createFamilySettingsController } from "../family-settings-controller.js";
import { createOfflineSettingsController } from "../offline-settings-controller.js";
import { createDataSafetyController } from "../data-safety-controller.js";
import { createSettingsShellController } from "../settings-shell-controller.js";
import { renderSettingsSections } from "../settings-view.js";
import { renderSettingsShell } from "../settings-shell-view.js";
import template from "./templates/settings.html?raw";
import { mountRouteTemplate } from "./mount-route-template.js";

export const requiresControllerOptions = true;

export function mount(context) { mountRouteTemplate({ ...context, page: "settings", html: template }); }

export function initialize({ controllers, controllerOptions, elements, collect, actions }) {
  renderSettingsShell(elements.settingsDialog);
  renderSettingsSections(elements.settingsDialog);
  collect?.("settings");
  actions?.ensurePushSettingsPage?.();
  actions?.renderPrimaryNavigationSettings?.();
  const options = controllerOptions.settings;
  if (!controllers.familySettings) controllers.familySettings = createFamilySettingsController(options.familySettings);
  if (!controllers.offlineSettings) controllers.offlineSettings = createOfflineSettingsController(options.offlineSettings);
  if (!controllers.dataSafety) controllers.dataSafety = createDataSafetyController(options.dataSafety);
  if (!controllers.settingsShell) controllers.settingsShell = createSettingsShellController(options.settingsShell);
  controllers.settingsShell.initialize();
  actions?.performanceDiagnostics?.render?.();
}
export async function bind({ bindRouteEvents, controllers }) {
  await bindRouteEvents?.("settings");
  return controllers?.offlineSettings?.initialize?.();
}
export function activate() {}
