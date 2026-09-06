export function configureCacheManagementUi({
  elements,
  minMb,
  maxMb,
  setActiveSection,
  loadPolicy,
  savePolicy,
  showToast,
  downloadPool,
  clearPool,
  documentRef = document,
}) {
  const {
    cacheLimitDialog,
    cacheLimitInput,
    cacheLimitButton,
    settingsDialog,
    refreshCacheInfoButton,
    clearAppCacheButton,
    cacheLimitForm,
  } = elements;
  if (!cacheLimitDialog || !cacheLimitInput || !cacheLimitButton) return;
  const cacheGroup = documentRef.querySelector("#settingsStorage");
  if (!cacheGroup) return;
  cacheLimitButton.querySelector("span").textContent = "缓存容量上限";
  const summary = cacheLimitButton.querySelector("small");
  if (summary) summary.textContent = "日记和秘藏分别按容量自动淘汰旧图片";

  const policyButton = documentRef.querySelector("#mediaCachePolicyButton");
  const updatePolicyUi = (policy) => {
    if (!policyButton) return;
    const wifiOnly = policy === "wifi";
    const policyValue = policyButton.querySelector("em");
    const policyHelp = policyButton.querySelector("small");
    if (policyValue) policyValue.textContent = wifiOnly ? "Wi-Fi · 最新 20 条" : "已关闭";
    if (policyHelp) {
      policyHelp.textContent = wifiOnly
        ? "自动保留最新日记；蜂窝网络和无法识别的网络不会下载"
        : "只通过下面按钮手动下载";
    }
    policyButton.setAttribute("aria-pressed", String(wifiOnly));
  };
  if (policyButton && policyButton.dataset.cacheUiBound !== "true") {
    policyButton.dataset.cacheUiBound = "true";
    policyButton.addEventListener("click", () => {
      const next = loadPolicy() === "wifi" ? "off" : "wifi";
      savePolicy(next);
      updatePolicyUi(next);
      showToast(next === "wifi" ? "仅在明确识别为 Wi-Fi 时自动缓存" : "已关闭自动缓存", { kind: "success" });
    });
  }

  const diaryDownload = documentRef.querySelector("#downloadDiaryOfflineButton");
  const secretDownload = documentRef.querySelector("#downloadSecretOfflineButton");
  if (diaryDownload && diaryDownload.dataset.cacheUiBound !== "true") {
    diaryDownload.dataset.cacheUiBound = "true";
    diaryDownload.addEventListener("click", () => downloadPool("diary"));
  }
  if (secretDownload && secretDownload.dataset.cacheUiBound !== "true") {
    secretDownload.dataset.cacheUiBound = "true";
    secretDownload.addEventListener("click", () => downloadPool("secret"));
  }

  const heading = cacheLimitForm?.querySelector("h2");
  const intro = heading?.nextElementSibling;
  if (heading) heading.textContent = "本地缓存容量";
  if (intro) intro.textContent = "分别设置日记和秘藏图片在本机可占用的空间。达到上限后自动淘汰较旧图片，不影响云端原图。";
  const diaryLabel = cacheLimitInput.closest("label");
  if (diaryLabel?.querySelector("span")) diaryLabel.querySelector("span").textContent = "日记图片（MB）";
  cacheLimitInput.min = String(minMb);
  cacheLimitInput.max = String(maxMb);
  cacheLimitInput.step = "10";

  const secretInput = documentRef.querySelector("#secretCacheLimitInput");
  if (secretInput) {
    secretInput.min = String(minMb);
    secretInput.max = String(maxMb);
    secretInput.step = "10";
  }
  const presets = cacheLimitForm?.querySelectorAll("[data-cache-limit-preset]") || [];
  const presetValues = [50, 100, 200, 500];
  presets.forEach((button, index) => {
    const value = presetValues[index] || 100;
    button.dataset.cacheLimitPreset = String(value);
    button.textContent = `${value} / ${value * 3} MB`;
  });
  const hint = cacheLimitForm?.querySelector(".cache-limit-hint");
  if (hint) hint.textContent = "前一个数字是日记容量，后一个是秘藏容量。Wi-Fi 下自动保留最新 20 条日记；手动离线包会缓存到容量上限。";

  [documentRef.querySelector("#clearDiaryCacheButton"), documentRef.querySelector("#clearSecretCacheButton")]
    .filter(Boolean)
    .forEach((button) => {
      if (button.dataset.cacheUiBound === "true") return;
      button.dataset.cacheUiBound = "true";
      button.addEventListener("click", () => clearPool(button.id === "clearSecretCacheButton" ? "secret" : "diary"));
    });
}
