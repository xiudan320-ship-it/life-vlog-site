export function createAppFeedbackView({
  elements,
  escapeHtml,
  getActivePage,
  mobileBreakpoint = 920,
  documentTarget = globalThis.document,
  windowTarget = globalThis.window,
} = {}) {
  function isMobileViewport() {
    return windowTarget.innerWidth <= mobileBreakpoint;
  }

  function dismissMiniToast(toast) {
    if (!toast) return;
    toast.classList.remove("visible");
    windowTarget.setTimeout(() => toast.remove(), 180);
  }

  function showMiniToast(
    message,
    { kind = "info", duration = 2200, persist = false, placement = "corner" } = {}
  ) {
    const centered = placement === "center";
    const hostId = centered ? "miniToastHostCenter" : "miniToastHost";
    let host = documentTarget.querySelector(`#${hostId}`);
    if (!host) {
      host = documentTarget.createElement("div");
      host.id = hostId;
      host.className = centered ? "mini-toast-host mini-toast-host-center" : "mini-toast-host";
      documentTarget.body.appendChild(host);
    }
    const toast = documentTarget.createElement("div");
    toast.className = `mini-toast mini-toast-${kind}`;
    toast.innerHTML = `
      <span class="mini-toast-icon" aria-hidden="true"></span>
      <span class="mini-toast-text">${escapeHtml(message || "")}</span>
    `;
    host.appendChild(toast);
    windowTarget.requestAnimationFrame(() => toast.classList.add("visible"));
    if (persist) return toast;
    windowTarget.setTimeout(() => dismissMiniToast(toast), duration);
    return toast;
  }

  function updateNetworkStatus() {
    let badge = documentTarget.querySelector("#offlineStatusBadge");
    if (!globalThis.navigator?.onLine) {
      if (!badge) {
        badge = documentTarget.createElement("div");
        badge.id = "offlineStatusBadge";
        badge.className = "offline-status-badge";
        badge.textContent = "离线模式 · 正在显示本地缓存";
        documentTarget.body.appendChild(badge);
      }
      badge.hidden = false;
      return;
    }
    if (badge) badge.hidden = true;
  }

  function updateDiaryBackTopButton() {
    let button = documentTarget.querySelector("#diaryBackTop");
    const shouldShow =
      !isMobileViewport() && getActivePage() === "gallery" && windowTarget.scrollY > 720;
    if (!button && shouldShow) {
      button = documentTarget.createElement("button");
      button.id = "diaryBackTop";
      button.className = "diary-back-top";
      button.type = "button";
      button.textContent = "↑";
      button.setAttribute("aria-label", "回到日记顶部");
      button.title = "回到顶部";
      button.addEventListener("click", () =>
        windowTarget.scrollTo({ top: 0, behavior: "smooth" })
      );
      documentTarget.body.appendChild(button);
    }
    if (button) button.hidden = !shouldShow;
  }

  function setHint(message) {
    elements.authHint.textContent = message;
  }

  function setGlobalStatus(message) {
    if (!elements.globalStatus) return;
    elements.globalStatus.textContent = message || "";
    elements.globalStatus.hidden = !message;
  }

  function setSecretStatus(message) {
    if (elements.secretStatus) elements.secretStatus.textContent = message;
  }

  function setStatus(message) {
    elements.uploadStatus.textContent = message;
  }

  return {
    dismissMiniToast,
    isMobileViewport,
    setGlobalStatus,
    setHint,
    setSecretStatus,
    setStatus,
    showMiniToast,
    updateDiaryBackTopButton,
    updateNetworkStatus,
  };
}
