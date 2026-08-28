function isStandalone(windowTarget) {
  return Boolean(windowTarget.matchMedia?.("(display-mode: standalone)")?.matches || windowTarget.navigator?.standalone);
}
export function createPwaInstallController({
  button,
  hint,
  windowTarget = globalThis.window,
  documentTarget = globalThis.document,
} = {}) {
  let deferredPrompt = null;
  const isIos = /iPhone|iPad|iPod/i.test(windowTarget.navigator?.userAgent || "");

  function render() {
    if (!button || !hint) return;
    if (isStandalone(windowTarget)) {
      button.hidden = true;
      hint.hidden = false;
      hint.textContent = "已安装到设备。";
      return;
    }
    if (deferredPrompt) {
      button.hidden = false;
      hint.hidden = true;
      return;
    }
    button.hidden = true;
    const showIos = isIos && !windowTarget.navigator?.standalone;
    hint.hidden = !showIos;
    if (showIos) hint.textContent = "Safari：点分享，再选择“添加到主屏幕”。";
  }

  async function install() {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    render();
  }

  function initialize() {
    windowTarget.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      render();
    });
    windowTarget.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      render();
    });
    button?.addEventListener("click", install);
    render();
  }

  return { initialize, install, render };
}
