/** Run potentially many offline turns away from the UI thread. */
export function runOffline({ state, catalog, serverNow, onProgress = () => {}, signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("计算已取消", "AbortError")); return; }
    const worker = new Worker(new URL("./monster-offline-worker.js", import.meta.url), { type: "module" });
    const finish = () => { signal?.removeEventListener("abort", cancel); worker.terminate(); };
    const cancel = () => { finish(); reject(new DOMException("计算已取消", "AbortError")); };
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") onProgress(data.progress);
      else if (data.type === "done") { finish(); resolve(data.result); }
      else if (data.type === "error") { finish(); reject(new Error(data.message)); }
    };
    worker.onerror = () => { finish(); reject(new Error("离线收益计算失败，请重试。")); };
    try { worker.postMessage({ state, catalog, serverNow }); }
    catch (error) { finish(); reject(error); }
  });
}
