import { createAppSplashController } from "./app-splash-controller.js";
import { createAppStartupController } from "./app-startup-controller.js";
import { parseRoute } from "./app-route-domain.js";
import { createPwaInstallController } from "./pwa-install-controller.js";
import { createPwaUpdateController } from "./pwa-update-controller.js";

/**
 * Start the already-assembled application shell. Splash, PWA lifecycle, and
 * startup sequencing live here so the controller graph stays independent of
 * browser boot policy.
 */
export function startAppRuntime(runtime) {
  const {
    elements,
    appSessionController,
    healthMonitor,
    performanceMonitor,
    performanceDiagnosticsView,
    restoreCloudflareSessionBackup,
    registerAppShellWorker,
    updateDiarySearchUi,
    renderFoodWheel,
    initializeFeedObserver,
    initializePullToRefresh,
    applyMobileFeedLayout,
    applyMobileSecretLayout,
    syncMobileComposerPlacement,
    switchPage,
    setGlobalStatus,
    showMiniToast,
  } = runtime;
  const appSplashController = createAppSplashController({
    documentTarget: document,
    windowTarget: window,
  });
  const pwaInstallController = createPwaInstallController({
    button: elements.installAppButton,
    hint: elements.installAppHint,
  });
  const pwaUpdateController = createPwaUpdateController({
    showToast: (...args) => showMiniToast?.(...args),
  });

  registerAppShellWorker();
  updateDiarySearchUi();
  renderFoodWheel();
  initializeFeedObserver();
  initializePullToRefresh();
  applyMobileFeedLayout();
  applyMobileSecretLayout();
  syncMobileComposerPlacement();

  const startupController = createAppStartupController({
    restoreCloudflareSessionBackup,
    initializeLocalSession: () => appSessionController.initializeLocalSession(),
    synchronizeRemoteSession: () => appSessionController.synchronizeRemoteSession(),
    completeSplash: () => appSplashController.complete(),
    performanceMonitor,
    initializePerformance: () => {
      healthMonitor.setStartupStage("performance");
      return performanceMonitor.initialize();
    },
    reportError: (error) => {
      healthMonitor.recordError("startup", error);
      healthMonitor.setStartupStage("failed");
      setGlobalStatus(`应用启动失败：${error?.message || "请刷新后重试"}`);
      showMiniToast("应用启动失败，请刷新重试", { kind: "error" });
    },
  });
  performanceDiagnosticsView.render();
  pwaInstallController.initialize();
  void pwaUpdateController.initialize();
  const initialRoute = parseRoute(window.location);
  void startupController.start({
    activateInitialRoute: () => switchPage(initialRoute.page, { historyMode: "replace", focusHeading: false }),
  });
}
