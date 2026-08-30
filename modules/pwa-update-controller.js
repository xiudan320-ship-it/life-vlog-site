export function createPwaUpdateController({
  documentTarget = globalThis.document,
  windowTarget = globalThis.window,
  showToast = () => {},
} = {}) {
  let updateSW = null;
  let banner = null;

  function ensureBanner() {
    if (banner) return banner;
    banner = documentTarget.createElement("aside");
    banner.className = "pwa-update-banner";
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = `<span>新版本已就绪</span><button type="button" data-pwa-update>立即更新</button><button type="button" data-pwa-dismiss>稍后</button>`;
    banner.querySelector("[data-pwa-update]").addEventListener("click", async () => {
      banner.hidden = true;
      await updateSW?.(true);
    });
    banner.querySelector("[data-pwa-dismiss]").addEventListener("click", () => { banner.hidden = true; });
    documentTarget.body.append(banner);
    return banner;
  }

  async function initialize() {
    if (!windowTarget.isSecureContext && windowTarget.location?.protocol !== "http:") return false;
    try {
      const pwa = await import("virtual:pwa-register");
      updateSW = pwa.registerSW({
        immediate: true,
        onNeedRefresh() { ensureBanner().hidden = false; },
        onOfflineReady() { showToast("离线内容已准备好", { kind: "success" }); },
      });
      return true;
    } catch {
      return false;
    }
  }

  return { initialize };
}
