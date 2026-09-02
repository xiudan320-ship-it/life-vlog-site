function findElement(elements, key, documentRef, selector) {
  return elements?.[key] || documentRef?.querySelector?.(selector) || null;
}

export function renderCacheManagementUi({
  elements,
  viewModel,
  minMb,
  maxMb,
  documentRef = document,
}) {
  const cacheGroup = findElement(elements, "settingsStorage", documentRef, "#settingsStorage");
  const cacheLimitDialog = findElement(elements, "cacheLimitDialog", documentRef, "#cacheLimitDialog");
  const cacheLimitInput = findElement(elements, "cacheLimitInput", documentRef, "#cacheLimitInput");
  const cacheLimitButton = findElement(elements, "cacheLimitButton", documentRef, "#cacheLimitButton");
  if (!cacheGroup || !cacheLimitDialog || !cacheLimitInput || !cacheLimitButton || !viewModel) return false;

  const cacheLimitLabel = cacheLimitButton.querySelector("span");
  const cacheLimitHelp = cacheLimitButton.querySelector("small");
  if (cacheLimitLabel) cacheLimitLabel.textContent = "缓存容量上限";
  if (cacheLimitHelp) cacheLimitHelp.textContent = "日记和秘藏分别按容量自动淘汰旧图片";

  const cacheLimitValue = findElement(
    elements,
    "settingsCacheLimitValue",
    documentRef,
    "#settingsCacheLimitValue"
  );
  if (cacheLimitValue) {
    cacheLimitValue.textContent = `日记 ${viewModel.diaryCapacityMb} MB · 秘藏 ${viewModel.secretCapacityMb} MB`;
  }

  const policyButton = findElement(
    elements,
    "mediaCachePolicyButton",
    documentRef,
    "#mediaCachePolicyButton"
  );
  if (policyButton) {
    const policyLabel = policyButton.querySelector("span");
    const policyValue = policyButton.querySelector("em");
    const policyHelp = policyButton.querySelector("small");
    if (policyLabel) policyLabel.textContent = "自动缓存";
    if (policyValue) policyValue.textContent = viewModel.policyLabel;
    if (policyHelp) policyHelp.textContent = viewModel.policyHelp;
    policyButton.setAttribute("aria-pressed", String(viewModel.policy === "wifi"));
  }

  const cacheLimitForm = findElement(elements, "cacheLimitForm", documentRef, "#cacheLimitForm");
  const heading = cacheLimitForm?.querySelector("h2");
  const intro = heading?.nextElementSibling;
  if (heading) heading.textContent = "本地缓存容量";
  if (intro) intro.textContent = "分别设置日记和秘藏图片在本机可占用的空间。达到上限后自动淘汰较旧图片，不影响云端原图。";

  const diaryLabel = cacheLimitInput.closest("label");
  const diaryLabelText = diaryLabel?.querySelector("span");
  if (diaryLabelText) diaryLabelText.textContent = "日记图片（MB）";
  cacheLimitInput.min = String(minMb);
  cacheLimitInput.max = String(maxMb);
  cacheLimitInput.step = "10";

  const secretInput = findElement(
    elements,
    "secretCacheLimitInput",
    documentRef,
    "#secretCacheLimitInput"
  );
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
  return true;
}

export function bindCacheManagementUi({
  elements,
  onTogglePolicy,
  onRefreshInfo,
  onChangeCacheLimit,
  onCloseCacheLimit,
  onSaveCacheLimit,
  onApplyCacheLimitPreset,
  onDownloadPool,
  onClearPool,
  onClearAppCache,
  reopenSettingsAfterChildDialog,
  documentRef = document,
}) {
  const cacheGroup = findElement(elements, "settingsStorage", documentRef, "#settingsStorage");
  if (!cacheGroup || cacheGroup.dataset.cacheUiBound === "true") return false;
  cacheGroup.dataset.cacheUiBound = "true";

  const policyButton = findElement(
    elements,
    "mediaCachePolicyButton",
    documentRef,
    "#mediaCachePolicyButton"
  );
  policyButton?.addEventListener("click", () => onTogglePolicy?.());

  const refreshCacheInfoButton = findElement(
    elements,
    "refreshCacheInfoButton",
    documentRef,
    "#refreshCacheInfoButton"
  );
  refreshCacheInfoButton?.addEventListener("click", () => void onRefreshInfo?.());

  const cacheLimitButton = findElement(elements, "cacheLimitButton", documentRef, "#cacheLimitButton");
  cacheLimitButton?.addEventListener("click", () => onChangeCacheLimit?.());

  const cacheLimitDialog = findElement(elements, "cacheLimitDialog", documentRef, "#cacheLimitDialog");
  const closeCacheLimit = () => {
    if (onCloseCacheLimit) return onCloseCacheLimit();
    return cacheLimitDialog?.close?.();
  };
  findElement(elements, "closeCacheLimitDialog", documentRef, "#closeCacheLimitDialog")
    ?.addEventListener("click", closeCacheLimit);
  findElement(elements, "cancelCacheLimit", documentRef, "#cancelCacheLimit")
    ?.addEventListener("click", closeCacheLimit);
  cacheLimitDialog?.addEventListener("click", (event) => {
    if (event.target === cacheLimitDialog) closeCacheLimit();
  });
  cacheLimitDialog?.addEventListener("close", () => reopenSettingsAfterChildDialog?.());

  const cacheLimitForm = findElement(elements, "cacheLimitForm", documentRef, "#cacheLimitForm");
  cacheLimitForm?.addEventListener("submit", (event) => onSaveCacheLimit?.(event));
  cacheLimitForm?.querySelectorAll("[data-cache-limit-preset]").forEach((button) => {
    button.addEventListener("click", () => onApplyCacheLimitPreset?.(button.dataset.cacheLimitPreset));
  });

  findElement(elements, "clearAppCacheButton", documentRef, "#clearAppCacheButton")
    ?.addEventListener("click", () => void onClearAppCache?.());

  const diaryDownload = findElement(
    elements,
    "downloadDiaryOfflineButton",
    documentRef,
    "#downloadDiaryOfflineButton"
  );
  const secretDownload = findElement(
    elements,
    "downloadSecretOfflineButton",
    documentRef,
    "#downloadSecretOfflineButton"
  );
  diaryDownload?.addEventListener("click", () => void onDownloadPool?.("diary"));
  secretDownload?.addEventListener("click", () => void onDownloadPool?.("secret"));

  const diaryClear = findElement(elements, "clearDiaryCacheButton", documentRef, "#clearDiaryCacheButton");
  const secretClear = findElement(elements, "clearSecretCacheButton", documentRef, "#clearSecretCacheButton");
  diaryClear?.addEventListener("click", () => void onClearPool?.("diary"));
  secretClear?.addEventListener("click", () => void onClearPool?.("secret"));
  return true;
}
