export function createAppLifecycleController({
  documentTarget = globalThis.document,
  windowTarget = globalThis.window,
  onForeground,
  onPoll,
  pollIntervalMs = 60_000,
  foregroundThrottleMs = 10_000,
  now = () => Date.now(),
  setIntervalApi = globalThis.setInterval,
  clearIntervalApi = globalThis.clearInterval,
} = {}) {
  let started = false;
  let pollTimer = null;
  let lastForegroundAt = 0;
  let foregroundPromise = null;
  let pollPromise = null;

  const isVisible = () => documentTarget?.visibilityState !== "hidden";

  function runTask(current, callback, clear) {
    if (current || typeof callback !== "function") return current;
    const task = Promise.resolve()
      .then(callback)
      .finally(clear);
    return task;
  }

  function requestForeground({ force = false } = {}) {
    if (!started || !isVisible()) return Promise.resolve(false);
    const timestamp = now();
    if (
      !force &&
      lastForegroundAt > 0 &&
      timestamp - lastForegroundAt < foregroundThrottleMs
    ) {
      return foregroundPromise || Promise.resolve(false);
    }
    lastForegroundAt = timestamp;
    foregroundPromise = runTask(
      foregroundPromise,
      onForeground,
      () => {
        foregroundPromise = null;
      }
    );
    return foregroundPromise;
  }

  function requestPoll() {
    if (!started || !isVisible()) return Promise.resolve(false);
    pollPromise = runTask(
      pollPromise,
      onPoll,
      () => {
        pollPromise = null;
      }
    );
    return pollPromise;
  }

  function stopPolling() {
    if (pollTimer == null) return;
    clearIntervalApi(pollTimer);
    pollTimer = null;
  }

  function startPolling() {
    stopPolling();
    if (!started || !isVisible() || typeof onPoll !== "function") return;
    pollTimer = setIntervalApi(() => {
      void requestPoll();
    }, pollIntervalMs);
  }

  function handleVisibilityChange() {
    if (isVisible()) {
      startPolling();
      void requestForeground();
    } else {
      stopPolling();
    }
  }

  function handleFocus() {
    void requestForeground();
  }

  function start() {
    if (started) return;
    started = true;
    documentTarget?.addEventListener?.("visibilitychange", handleVisibilityChange);
    windowTarget?.addEventListener?.("focus", handleFocus);
    startPolling();
  }

  function stop() {
    if (!started) return;
    started = false;
    stopPolling();
    documentTarget?.removeEventListener?.("visibilitychange", handleVisibilityChange);
    windowTarget?.removeEventListener?.("focus", handleFocus);
  }

  return {
    requestForeground,
    requestPoll,
    start,
    stop,
    getState: () => ({
      started,
      polling: pollTimer != null,
      foregroundInFlight: Boolean(foregroundPromise),
      pollInFlight: Boolean(pollPromise),
      lastForegroundAt,
    }),
  };
}

export function createFrameScheduler(
  callback,
  {
    requestFrame = globalThis.requestAnimationFrame,
    cancelFrame = globalThis.cancelAnimationFrame,
  } = {}
) {
  let frameId = null;
  let latestArgs = [];

  function schedule(...args) {
    latestArgs = args;
    if (frameId != null) return;
    frameId = requestFrame(() => {
      frameId = null;
      callback(...latestArgs);
    });
  }

  schedule.cancel = () => {
    if (frameId == null) return;
    cancelFrame?.(frameId);
    frameId = null;
  };
  schedule.pending = () => frameId != null;
  return schedule;
}
