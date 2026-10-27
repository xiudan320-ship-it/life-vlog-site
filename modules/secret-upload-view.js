import { escapeHtml } from "./ui-formatters.js";

export function renderSecretUploadProgress(panel, progress) {
  if (!panel) return;
  panel.hidden = !progress;
  if (!progress) {
    panel.innerHTML = "";
    delete panel.dataset.state;
    return;
  }
  const { title, total, saved, pending, processed, failed, running, complete, error, detail } = progress;
  const percent = total ? Math.floor(saved / total * 100) : 0;
  const summary = running
    ? `正在上传 · 已处理 ${processed}/${total} 张`
    : complete ? `上传完成 · ${saved} 张已保存` : `上传未完成 · ${saved}/${total} 张已保存`;
  // Keep the activity indicator, live region and focused controls mounted across
  // file/status updates so animation and keyboard interaction stay continuous.
  if (!panel.querySelector("[data-secret-upload-summary]")) {
    panel.innerHTML = `
      <div class="secret-upload-heading">
        <span class="secret-upload-indicator" data-secret-upload-indicator aria-hidden="true"></span>
        <div class="secret-upload-title"><small data-secret-upload-title></small><strong data-secret-upload-summary></strong></div>
        <span class="secret-upload-percent" data-secret-upload-percent></span>
      </div>
      <div class="secret-upload-meter"><progress aria-label="秘藏相册保存进度"></progress><span class="secret-upload-scan" aria-hidden="true"></span></div>
      <p class="secret-upload-counts" data-secret-upload-counts></p>
      <p data-secret-upload-detail role="status" aria-live="polite" aria-atomic="true"></p>
      <p class="secret-upload-error" data-secret-upload-error role="alert" hidden></p>
      <details data-secret-upload-failures hidden><summary></summary><ul tabindex="0" aria-label="失败图片及原因"></ul></details>
      <small data-secret-upload-hint>每 10 张自动保存。请保持此页面打开；重试只处理未完成的图片。</small>
      <div class="secret-upload-actions">
        <button class="primary" type="button" data-secret-upload-retry hidden>重试未完成项</button>
        <button type="button" data-secret-upload-clear hidden></button>
      </div>`;
  }
  panel.dataset.state = running ? "running" : complete ? "complete" : "error";
  const query = (selector) => panel.querySelector(selector);
  query("[data-secret-upload-title]").textContent = title || "秘藏上传";
  query("[data-secret-upload-summary]").textContent = summary;
  query("[data-secret-upload-indicator]").textContent = running ? "" : complete ? "✓" : "!";
  query("[data-secret-upload-percent]").textContent = `${percent}% 已保存`;
  const meter = query("progress");
  meter.max = total;
  meter.value = saved;
  meter.setAttribute("aria-valuetext", `${saved}/${total} 张已保存`);
  query("[data-secret-upload-counts]").textContent = `${saved} 张已保存 · ${pending} 张等待保存 · ${failed.length} 张失败`;
  query("[data-secret-upload-detail]").textContent = detail || (complete ? "全部图片已保存，可以继续浏览相册。" : "已完成的图片会保留，可重试未完成项。");
  const errorMessage = query("[data-secret-upload-error]");
  errorMessage.hidden = !error;
  errorMessage.textContent = error || "";
  const failures = query("[data-secret-upload-failures]");
  failures.hidden = !failed.length;
  failures.querySelector("summary").textContent = `查看 ${failed.length} 张失败图片及原因`;
  const failureKey = JSON.stringify(failed);
  if (failures.dataset.entries !== failureKey) {
    failures.dataset.entries = failureKey;
    failures.querySelector("ul").innerHTML = failed.map((entry) => `<li><strong>${escapeHtml(entry.label)}</strong>：${escapeHtml(entry.error)}</li>`).join("");
  }
  query("[data-secret-upload-hint]").hidden = complete;
  query("[data-secret-upload-retry]").hidden = running || complete;
  query("[data-secret-upload-clear]").hidden = running || Boolean(pending);
  query("[data-secret-upload-clear]").textContent = complete ? "收起" : "结束本次上传";
}
