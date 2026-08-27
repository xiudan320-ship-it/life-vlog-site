const DEFAULT_MIN_VISIBLE_MS = 520;
const DEFAULT_EXIT_DURATION_MS = 220;

export function createAppSplashController({
  element = globalThis.document?.getElementById("appSplash"),
  documentTarget = globalThis.document,
  windowTarget = globalThis.window,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  setTimeoutApi = globalThis.setTimeout,
  minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
  exitDurationMs = DEFAULT_EXIT_DURATION_MS,
} = {}) {
  if (!element || element.hidden) {
    return {
      complete: () => Promise.resolve(false),
      getState: () => "hidden",
    };
  }

  let state = "visible";
  let startedAt = now();
  let completePromise = null;
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
      const waitMs = prefersReducedMotion()
        ? 0
        : Math.max(0, minVisibleMs - (now() - startedAt));
      setTimeoutApi(() => {
        if (state !== "visible") {
          resolve(false);
          return;
        }

        state = "exiting";
        element.classList.add("is-exiting");
        const exitMs = prefersReducedMotion() ? 0 : exitDurationMs;
        setTimeoutApi(() => {
          element.hidden = true;
          element.setAttribute("aria-hidden", "true");
          element.classList.remove("is-exiting");
          blockedElements.forEach((blockedElement) => {
            blockedElement.inert = false;
            blockedElement.removeAttribute("inert");
          });
          documentTarget?.body?.removeAttribute("aria-busy");
          state = "hidden";
          resolve(true);
        }, exitMs);
      }, waitMs);
    });

    return completePromise;
  }

  return { complete, getState: () => state };
}
