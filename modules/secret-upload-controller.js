import { createSecretUploadService } from "./secret-upload-service.js";
import { renderSecretUploadProgress } from "./secret-upload-view.js";

export function createSecretUploadController({ elements, setStatus, showToast }) {
  const panel = elements.secretPage?.querySelector("[data-secret-upload-progress]");
  let wasRunning = false;
  const service = createSecretUploadService({
    onChange(progress) {
      renderSecretUploadProgress(panel, progress);
      if (progress?.running && !wasRunning) {
        panel?.scrollIntoView({ block: "nearest", behavior: "instant" });
        panel?.focus({ preventScroll: true });
      }
      wasRunning = Boolean(progress?.running);
      const locked = Boolean(progress && (progress.running || !progress.complete));
      // The progress panel is outside these regions and remains operable.
      if (elements.secretForm) elements.secretForm.inert = locked;
      if (elements.secretGallery) elements.secretGallery.inert = locked;
      elements.secretForm?.setAttribute("aria-busy", String(Boolean(progress?.running)));
      if (!progress) return;
      if (progress.running) setStatus(`上传中：已保存 ${progress.saved}/${progress.total} 张。`);
      else {
        const message = progress.complete
          ? `上传完成，${progress.saved} 张图片已保存。`
          : `已保存 ${progress.saved}/${progress.total} 张，${progress.failed.length} 张失败${progress.pending ? `，${progress.pending} 张等待保存` : ""}。请在上传进度中重试。`;
        setStatus(message);
        showToast(progress.complete ? "相片已保存" : "上传未完成，请查看进度和失败原因", { kind: progress.complete ? "success" : "error" });
      }
    },
  });
  panel?.addEventListener("click", (event) => {
    if (event.target.closest("[data-secret-upload-retry]")) {
      panel.focus({ preventScroll: true });
      void service.retry();
    }
    if (event.target.closest("[data-secret-upload-clear]") && service.clear()) {
      elements.secretToggle?.focus({ preventScroll: true });
    }
  });
  globalThis.addEventListener?.("beforeunload", (event) => {
    const progress = service.snapshot();
    if (!progress || progress.complete) return;
    event.preventDefault();
    event.returnValue = "";
  });
  return service;
}
