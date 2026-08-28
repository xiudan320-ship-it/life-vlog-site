import "../../styles/account-dialogs.css";
import { createFamilySettingsController } from "../family-settings-controller.js";
import { createOfflineSettingsController } from "../offline-settings-controller.js";
import { createDataSafetyController } from "../data-safety-controller.js";

export const requiresControllerOptions = true;

export function initialize({ controllers, controllerOptions }) {
  const options = controllerOptions.settings;
  if (!controllers.familySettings) controllers.familySettings = createFamilySettingsController(options.familySettings);
  if (!controllers.offlineSettings) controllers.offlineSettings = createOfflineSettingsController(options.offlineSettings);
  if (!controllers.dataSafety) controllers.dataSafety = createDataSafetyController(options.dataSafety);
}
export function bind() {}
export function activate() {}
