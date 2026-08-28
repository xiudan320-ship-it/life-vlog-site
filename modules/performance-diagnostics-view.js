export function createPerformanceDiagnosticsView({
  monitor,
  root,
  showToast = () => {},
  health = null,
} = {}) {
  function render() {
    if (!root) return;
    const latest = monitor.latest();
    const history = monitor.history();
    root.querySelector("[data-performance-summary]").textContent = latest
      ? `最近一次：${latest.measures["splash-hidden"] || "—"} ms 到开屏结束 · ${history.length} 次记录`
      : "还没有本机性能记录。打开应用后会自动记录。";
  }
  async function copy() {
    const payload = JSON.stringify({ latest: monitor.latest(), sessions: monitor.history().length, health: health?.snapshot?.() || null }, null, 2);
    await globalThis.navigator?.clipboard?.writeText?.(payload);
    showToast("已复制脱敏诊断信息", { kind: "success" });
  }
  function clear() { monitor.clear(); health?.clear?.(); render(); showToast("已清除本机诊断记录"); }
  root?.querySelector("[data-performance-copy]")?.addEventListener("click", copy);
  root?.querySelector("[data-performance-clear]")?.addEventListener("click", clear);
  return { render };
}
