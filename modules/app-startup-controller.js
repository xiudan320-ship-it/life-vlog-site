export function createAppStartupController({
  restoreCloudflareSessionBackup,
  initializeLocalSession,
  synchronizeRemoteSession,
  completeSplash,
  performanceMonitor,
  initializePerformance,
  reportError,
} = {}) {
  let startPromise = null;

  async function start({ activateInitialRoute, prepareBeforeSplash = false } = {}) {
    if (startPromise) return startPromise;
    startPromise = (async () => {
      performanceMonitor?.mark("app-bootstrap-start");
      let localReady = false;
      let initialRouteAttempted = false;
      async function activateRoute() {
        if (initialRouteAttempted) return;
        initialRouteAttempted = true;
        try {
          await activateInitialRoute?.();
        } catch (error) {
          performanceMonitor?.mark("initial-route-failed");
          reportError?.(error);
        }
      }

      try {
        await restoreCloudflareSessionBackup?.();
        await initializeLocalSession?.();
        localReady = true;
        performanceMonitor?.mark("cached-ui-ready");
        if (prepareBeforeSplash) await activateRoute();
      } catch (error) {
        performanceMonitor?.mark("app-bootstrap-failed");
        reportError?.(error);
      } finally {
        await completeSplash?.();
        performanceMonitor?.mark("splash-hidden");
      }
      if (!localReady) return false;
      await activateRoute();
      void initializePerformance?.();
      performanceMonitor?.mark("remote-sync-start");
      void Promise.resolve(synchronizeRemoteSession?.()).then(
        () => performanceMonitor?.mark("remote-sync-complete"),
        (error) => {
          performanceMonitor?.mark("remote-sync-failed");
          reportError?.(error);
        }
      );
      return true;
    })();
    return startPromise;
  }

  return { start };
}
