const STORAGE_KEY = "life-vlog-health-history";
const MAX_ERRORS = 20;

function safeStorage(storage, operation, ...args) {
  try { return storage?.[operation]?.(...args); } catch { return null; }
}

export function createAppHealthMonitor({
  storage = globalThis.localStorage,
  navigatorTarget = globalThis.navigator,
  windowTarget = globalThis.window,
  buildVersion = "development",
  entry = "unknown",
  now = () => new Date().toISOString(),
} = {}) {
  const state = { route: "gallery", startupStage: "created", sync: { status: "idle", httpStatus: null, at: null }, errors: [], registration: null };
  function readHistory() {
    try { const value = JSON.parse(safeStorage(storage, "getItem", STORAGE_KEY) || "[]"); return Array.isArray(value) ? value.slice(-MAX_ERRORS) : []; } catch { return []; }
  }
  state.errors = readHistory().filter((entry) => entry && typeof entry === "object").map((entry) => ({
    kind: String(entry.kind || "unknown").slice(0, 32),
    name: String(entry.name || "Error").slice(0, 48),
    at: String(entry.at || now()).slice(0, 40),
  })).slice(-MAX_ERRORS);
  function recordError(kind = "unknown", error = null) {
    const entry = { kind: String(kind).slice(0, 32), name: String(error?.name || "Error").slice(0, 48), at: now() };
    state.errors = [...state.errors, entry].slice(-MAX_ERRORS);
    safeStorage(storage, "setItem", STORAGE_KEY, JSON.stringify([...readHistory(), entry].slice(-MAX_ERRORS)));
    return entry;
  }
  function setStartupStage(stage) { state.startupStage = String(stage).slice(0, 48); }
  function setRoute(route) { state.route = String(route).slice(0, 32); }
  function setSync(status, httpStatus = null) { state.sync = { status: String(status).slice(0, 24), httpStatus: Number.isFinite(httpStatus) ? httpStatus : null, at: now() }; }
  function recordApiError(error) {
    const category = String(error?.kind || "network").slice(0, 24);
    recordError(`api:${category}`, error);
    setSync(category, error?.status);
  }
  function snapshot() {
    return {
      buildVersion,
      entry,
      route: state.route,
      startupStage: state.startupStage,
      network: navigatorTarget.onLine === false ? "offline" : "online",
      serviceWorker: { controller: Boolean(navigatorTarget.serviceWorker?.controller), active: Boolean(state.registration?.active), waiting: Boolean(state.registration?.waiting) },
      sync: { ...state.sync },
      recentErrors: [...state.errors].slice(-MAX_ERRORS),
    };
  }
  function install() {
    navigatorTarget.serviceWorker?.getRegistration?.().then((registration) => { state.registration = registration; }).catch(() => {});
    navigatorTarget.serviceWorker?.addEventListener?.("controllerchange", () => {
      state.registration = state.registration || null;
    });
    windowTarget.addEventListener?.("error", (event) => recordError("window", event.error));
    windowTarget.addEventListener?.("unhandledrejection", (event) => recordError("promise", event.reason));
    setStartupStage("monitoring");
  }
  function clear() { state.errors = []; safeStorage(storage, "removeItem", STORAGE_KEY); }
  return { clear, install, recordApiError, recordError, setRoute, setStartupStage, setSync, snapshot };
}
