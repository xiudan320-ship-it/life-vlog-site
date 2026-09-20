function isStandalone(windowTarget) {
  return Boolean(windowTarget.matchMedia?.("(display-mode: standalone)")?.matches || windowTarget.navigator?.standalone);
}
export function createPwaInstallController({
  button,
  hint,
  getElements = () => ({ button, hint }),
  windowTarget = globalThis.window,
  documentTarget = globalThis.document,
} = {}) {
  let deferredPrompt = null;
  let initialized = false;
  let boundButton = null;
  const isIos = /iPhone|iPad|iPod/i.test(windowTarget.navigator?.userAgent || "");

  function resolveElements() {
    return getElements?.() || {};
  }

  function bindButton(nextButton) {
    if (!nextButton || boundButton === nextButton) return;
    boundButton?.removeEventListener?.("click", install);
    boundButton = nextButton;
    boundButton.addEventListener("click", install);
  }

  function render() {
    const elements = resolveElements();
    const currentButton = elements.button;
    const currentHint = elements.hint;
    bindButton(currentButton);
    if (!currentButton || !currentHint) return;
    if (isStandalone(windowTarget)) {
      currentButton.hidden = true;
      currentHint.hidden = false;
      currentHint.textContent = "已安装到设备。";
      return;
    }
    if (deferredPrompt) {
      currentButton.hidden = false;
      currentHint.hidden = true;
      return;
    }
    currentButton.hidden = true;
    const showIos = isIos && !windowTarget.navigator?.standalone;
    currentHint.hidden = false;
    currentHint.textContent = showIos
      ? "Safari：点分享，再选择“添加到主屏幕”。"
      : "当前浏览器未提供安装入口，可使用浏览器菜单添加到主屏幕。";
  }

  async function install() {
    if (!deferredPrompt) {
      render();
      return false;
    }
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    try {
      await promptEvent.prompt();
      await Promise.resolve(promptEvent.userChoice).catch(() => null);
      return true;
    } catch {
      return false;
    } finally {
      render();
    }
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    windowTarget.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      render();
    });
    windowTarget.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      render();
    });
    documentTarget?.addEventListener?.("settings:mounted", render);
    render();
  }

  return { initialize, install, render };
}
