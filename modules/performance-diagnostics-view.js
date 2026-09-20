export function createPerformanceDiagnosticsView({
  monitor,
  root,
  getRoot = () => root,
  showToast = () => {},
  health = null,
} = {}) {
  function render() {
    const target = getRoot();
    if (!target) return;
    bind(target);
    const latest = monitor.latest();
    const history = monitor.history();
    const summary = target.querySelector("[data-performance-summary]");
    if (!summary) return;
    summary.textContent = latest
      ? `最近一次：${latest.measures["splash-hidden"] || "—"} ms 到开屏结束 · ${history.length} 次记录`
      : "还没有本机性能记录。打开应用后会自动记录。";
  }
  async function copy() {
    const payload = JSON.stringify({ latest: monitor.latest(), sessions: monitor.history().length, health: health?.snapshot?.() || null }, null, 2);
    const writeText = globalThis.navigator?.clipboard?.writeText;
    if (typeof writeText !== "function") {
      showToast("当前浏览器不支持复制，请手动选择诊断内容", { kind: "error" });
      return false;
    }
    try {
      await writeText.call(globalThis.navigator.clipboard, payload);
      showToast("已复制脱敏诊断信息", { kind: "success" });
      return true;
    } catch {
      showToast("无法复制诊断信息，请检查剪贴板权限后重试", { kind: "error" });
      return false;
    }
  }
  function clear() { monitor.clear(); health?.clear?.(); render(); showToast("已清除本机诊断记录"); }
  function bind(target = getRoot()) {
    if (!target || target.dataset.performanceUiBound === "true") return;
    target.dataset.performanceUiBound = "true";
    target.querySelector("[data-performance-copy]")?.addEventListener("click", copy);
    target.querySelector("[data-performance-clear]")?.addEventListener("click", clear);
  }
  return { render, bind };
}
