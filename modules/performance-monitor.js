const STORAGE_KEY = "life-vlog-performance-history";
const MAX_RECORDS = 20;

export function createPerformanceMonitor({
  storage = globalThis.localStorage,
  navigatorTarget = globalThis.navigator,
  windowTarget = globalThis.window,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  const current = { vitals: {}, marks: {}, measures: {} };
  let initialized = false;

  function readHistory() {
    try {
      const value = JSON.parse(storage?.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.slice(-MAX_RECORDS) : [];
    } catch { return []; }
  }

  function saveHistory(value) {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(value.slice(-MAX_RECORDS))); } catch {}
  }

  function mark(name) {
    const value = Math.round(now());
    current.marks[name] = value;
    globalThis.performance?.mark?.(name);
    return value;
  }

  function measure(name, start, end = undefined) {
    const value = Math.round((current.marks[end || start] || now()) - (current.marks[start] || 0));
    current.measures[name] = value;
    try { globalThis.performance?.measure?.(name, start, end); } catch {}
    return value;
  }

  function environment() {
    const connection = navigatorTarget.connection || navigatorTarget.mozConnection || navigatorTarget.webkitConnection;
    return {
      device: /Mobi|Android|iPhone|iPad/i.test(navigatorTarget.userAgent || "") ? "mobile" : "desktop",
      display: windowTarget.matchMedia?.("(display-mode: standalone)")?.matches ? "standalone" : "browser",
      reducedMotion: Boolean(windowTarget.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches),
      online: navigatorTarget.onLine !== false,
      effectiveType: connection?.effectiveType || "unknown",
    };
  }

  function record() {
    const recordValue = { at: new Date().toISOString(), environment: environment(), vitals: { ...current.vitals }, marks: { ...current.marks }, measures: { ...current.measures } };
    saveHistory([...readHistory(), recordValue]);
    return recordValue;
  }

  async function initialize() {
    if (initialized) return;
    initialized = true;
    try {
      const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");
      for (const [name, listener] of Object.entries({ CLS: onCLS, FCP: onFCP, INP: onINP, LCP: onLCP, TTFB: onTTFB })) {
        listener((metric) => { current.vitals[name] = Math.round(metric.value * 100) / 100; });
      }
    } catch {}
    windowTarget.setTimeout(() => record(), 4000);
  }

  function latest() { return readHistory().at(-1) || null; }
  function history() { return readHistory(); }
  function clear() { try { storage?.removeItem(STORAGE_KEY); } catch {} }

  return { clear, history, initialize, latest, mark, measure, record };
}
