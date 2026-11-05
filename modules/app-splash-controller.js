const DEFAULT_EXIT_DURATION_MS = 220;
const DEFAULT_REVISIT_WINDOW_MS = 30 * 60 * 1000;
const SPLASH_STATE_KEY = "life-vlog-splash-state";

export function createAppSplashController({
  element = globalThis.document?.getElementById("appSplash"),
  documentTarget = globalThis.document,
  windowTarget = globalThis.window,
  wallNow = () => Date.now(),
  setTimeoutApi = globalThis.setTimeout,
  storage = globalThis.localStorage,
  version = "",
  revisitWindowMs = DEFAULT_REVISIT_WINDOW_MS,
  storageKey = SPLASH_STATE_KEY,
  exitDurationMs = DEFAULT_EXIT_DURATION_MS,
} = {}) {
  if (!element || element.hidden) {
    return {
      complete: () => Promise.resolve(false),
      getState: () => "hidden",
    };
  }

  let state = "visible";
  let completePromise = null;
  const resolvedVersion = version || documentTarget?.querySelector?.('meta[name="build-version"]')?.content || documentTarget?.querySelector?.('script[type="module"]')?.getAttribute("src") || "app";
  let skipAnimation = false;
  try {
    const previous = JSON.parse(storage?.getItem?.(storageKey) || "null");
    skipAnimation = previous?.version === resolvedVersion && wallNow() - Number(previous.completedAt) < revisitWindowMs;
  } catch {
    skipAnimation = false;
  }
  const blockedElements = [
    ...(documentTarget?.querySelectorAll?.("[data-app-splash-blocked]") || []),
  ];
  blockedElements.forEach((blockedElement) => {
    blockedElement.inert = true;
    blockedElement.setAttribute("inert", "");
  });
  documentTarget?.body?.setAttribute("aria-busy", "true");

  function prefersReducedMotion() {
    return Boolean(
      windowTarget?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    );
  }

  function complete() {
    if (completePromise) return completePromise;

    completePromise = new Promise((resolve) => {
      setTimeoutApi(() => {
        if (state !== "visible") {
          resolve(false);
          return;
        }

        state = "exiting";
        element.classList.add("is-exiting");
        const exitMs = prefersReducedMotion() || skipAnimation ? 0 : exitDurationMs;
        setTimeoutApi(() => {
          element.hidden = true;
          element.setAttribute("aria-hidden", "true");
          element.classList.remove("is-exiting");
          blockedElements.forEach((blockedElement) => {
            blockedElement.inert = false;
            blockedElement.removeAttribute("inert");
          });
          documentTarget?.body?.removeAttribute("aria-busy");
          try {
            storage?.setItem?.(storageKey, JSON.stringify({ version: resolvedVersion, completedAt: wallNow() }));
          } catch {
          }
          state = "hidden";
          resolve(true);
        }, exitMs);
      }, 0);
    });

    return completePromise;
  }

  return { complete, getState: () => state };
}
