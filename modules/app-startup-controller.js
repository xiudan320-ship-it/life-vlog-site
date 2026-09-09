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

  async function start({ activateInitialRoute, prepareBeforeSplash = true } = {}) {
    if (startPromise) return startPromise;
    startPromise = (async () => {
      performanceMonitor?.mark("app-bootstrap-start");
      let localReady = false;
      try {
        await restoreCloudflareSessionBackup?.();
        await initializeLocalSession?.();
        localReady = true;
        performanceMonitor?.mark("cached-ui-ready");
      } catch (error) {
        performanceMonitor?.mark("app-bootstrap-failed");
        reportError?.(error);
      }

      async function activateRoute() {
        try {
          await activateInitialRoute?.();
        } catch (error) {
          performanceMonitor?.mark("initial-route-failed");
          reportError?.(error);
        }
      }

      if (localReady && prepareBeforeSplash) await activateRoute();

      await completeSplash?.();
      performanceMonitor?.mark("splash-hidden");
      if (!localReady) return false;
      if (!prepareBeforeSplash) await activateRoute();
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
