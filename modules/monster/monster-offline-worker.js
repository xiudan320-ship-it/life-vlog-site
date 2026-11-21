import { simulateOffline } from "./offline-domain.js";

self.onmessage = (event) => {
  try {
    const result = simulateOffline({ ...event.data, onProgress: (progress) => self.postMessage({ type: "progress", progress }) });
    self.postMessage({ type: "done", result });
  } catch (error) {
    self.postMessage({ type: "error", message: error.message || "离线收益计算失败" });
  }
};
