import { normalizeCacheMb } from "./cache-policy.js";

import { configureCacheManagementUi } from "./cache-management-view.js";

export function createOfflineSettingsController({
  elements,
  constants,
  mediaCacheService,
  clearOfflineCache,
  getUserId,
  loadCacheCapacityMb,
  saveCacheCapacityMb,
  scheduleOfflineMediaCache,
  refreshCacheInfo,
  renderSettingsSummary,
  loadMediaCachePolicy,
  saveMediaCachePolicy,
  showMiniToast,
  dismissMiniToast,
  collectSecretOfflineMediaUrls,
  collectDiaryOfflineMediaUrls,
  cacheOfflineMedia,
  formatFileSize,
  openSettingsChildDialog,
  reopenSettingsAfterChildDialog,
  confirmAction,
}) {
  const els = elements;
  const {
    defaultDiaryCacheMb,
    defaultSecretCacheMb,
    minCacheMb,
    maxCacheMb,
    secretMediaCacheName,
    diaryMediaCacheName,
    secretItemsCacheKey,
    photoFeedCacheKey,
  } = constants;

  function changeCacheLimit() {
    ensureCacheManagementUi();
    if (!els.cacheLimitDialog || !els.cacheLimitInput) return;
    const secretInput = els.secretCacheLimitInput || document.querySelector("#secretCacheLimitInput");
    els.cacheLimitInput.value = String(loadCacheCapacityMb("diary"));
    if (secretInput) secretInput.value = String(loadCacheCapacityMb("secret"));
    if (els.cacheLimitStatus) {
      els.cacheLimitStatus.textContent = `日记 ${els.cacheLimitInput.value} MB · 秘藏 ${secretInput?.value || defaultSecretCacheMb} MB`;
    }
    openSettingsChildDialog(els.cacheLimitDialog, () => {
      requestAnimationFrame(() => {
        els.cacheLimitInput.focus();
        els.cacheLimitInput.select();
      });
    });
  }

  function saveCacheLimitFromDialog(event) {
    event.preventDefault();
    const diaryMb = saveCacheCapacityMb("diary", els.cacheLimitInput?.value);
    const secretMb = saveCacheCapacityMb("secret", (els.secretCacheLimitInput || document.querySelector("#secretCacheLimitInput"))?.value);
    scheduleOfflineMediaCache();
    renderSettingsSummary();
    void refreshCacheInfo();
    if (els.cacheLimitStatus) {
      els.cacheLimitStatus.textContent = `已保存：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
    }
    if (els.settingsCacheStatus) {
      els.settingsCacheStatus.textContent = `容量上限：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
    }
    window.setTimeout(() => {
      if (els.cacheLimitDialog?.open) els.cacheLimitDialog.close();
    }, 420);
  }

  function applyCacheLimitPreset(value) {
    if (!els.cacheLimitInput) return;
    const diaryMb = normalizeCacheMb(value, defaultDiaryCacheMb);
    const secretMb = normalizeCacheMb(diaryMb * 3, defaultSecretCacheMb);
    els.cacheLimitInput.value = String(diaryMb);
    const secretInput = els.secretCacheLimitInput || document.querySelector("#secretCacheLimitInput");
    if (secretInput) secretInput.value = String(secretMb);
    if (els.cacheLimitStatus) {
      els.cacheLimitStatus.textContent = `已选择：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
    }
  }

  function ensureCacheManagementUi() {
    configureCacheManagementUi({
      elements: {
        cacheLimitDialog: els.cacheLimitDialog,
        cacheLimitInput: els.cacheLimitInput,
        secretCacheLimitInput: els.secretCacheLimitInput,
        cacheLimitButton: els.cacheLimitButton,
        refreshCacheInfoButton: els.refreshCacheInfoButton,
        clearAppCacheButton: els.clearAppCacheButton,
        cacheLimitForm: els.cacheLimitForm,
        closeCacheLimitDialog: els.closeCacheLimitDialog,
        cancelCacheLimit: els.cancelCacheLimit,
        clearDiaryCacheButton: els.clearDiaryCacheButton,
        clearSecretCacheButton: els.clearSecretCacheButton,
      },
      minMb: minCacheMb,
      maxMb: maxCacheMb,
      loadPolicy: loadMediaCachePolicy,
      savePolicy: saveMediaCachePolicy,
      showToast: showMiniToast,
      downloadPool: downloadOfflinePool,
      clearPool: clearCachePool,
      openCapacity: changeCacheLimit,
      saveCapacity: saveCacheLimitFromDialog,
      applyPreset: applyCacheLimitPreset,
      refreshInfo: async () => {
        try {
          await refreshCacheInfo();
        } catch (error) {
          showMiniToast(`缓存占用读取失败：${error?.message || "请重试"}`, { kind: "error" });
        }
      },
      clearAll: clearAllOfflineContent,
      reopenSettings: reopenSettingsAfterChildDialog,
    });
  }

  async function clearAllOfflineContent() {
    const confirmed = confirmAction
      ? await confirmAction({
        eyebrow: "清除本机缓存",
        title: "清除全部离线内容？",
        message: "会删除这台设备上的日记、秘藏媒体缓存和离线索引；账号、个人设置、未发布草稿与上传队列会保留。",
        confirmLabel: "清除离线内容",
        cancelLabel: "取消",
        danger: true,
      })
      : true;
    if (!confirmed) return false;
    try {
      await clearOfflineCache();
      showMiniToast("缓存已清除，账号和设置已保留", { kind: "success" });
      return true;
    } catch (error) {
      if (els.settingsCacheStatus) els.settingsCacheStatus.textContent = "清除失败，请重试";
      showMiniToast(`清除缓存失败：${error?.message || "请重试"}`, { kind: "error" });
      return false;
    }
  }

  async function downloadOfflinePool(type) {
    if (!navigator.onLine) {
      showMiniToast("当前离线，无法补充缓存", { kind: "error" });
      return;
    }
    const isSecret = type === "secret";
    const urls = isSecret ? collectSecretOfflineMediaUrls() : collectDiaryOfflineMediaUrls();
    if (!urls.length) {
      showMiniToast(isSecret ? "请先打开秘藏并同步相册" : "请先打开日记并同步内容", { kind: "error" });
      return;
    }
    const button = document.querySelector(isSecret ? "#downloadSecretOfflineButton" : "#downloadDiaryOfflineButton");
    if (button) button.disabled = true;
    const toast = showMiniToast(`正在下载${isSecret ? "秘藏" : "日记"}离线包…`, {
      kind: "loading",
      persist: true,
      placement: "center",
    });
    try {
      await navigator.storage?.persist?.().catch(() => false);
      const result = await cacheOfflineMedia(getUserId() || "public", { explicit: true, type });
      dismissMiniToast(toast);
      const completion = result.complete
        ? `已完整缓存 ${result.cached} 个资源`
        : `已缓存 ${result.cached}/${result.requested} 个资源，已达到容量上限`;
      showMiniToast(`${completion} · ${formatFileSize(result.bytes)}`, {
        kind: "success",
        duration: 3200,
        placement: "center",
      });
    } catch (error) {
      dismissMiniToast(toast);
      showMiniToast(`离线包下载失败：${error.message}`, { kind: "error", duration: 3600, placement: "center" });
    } finally {
      dismissMiniToast(toast);
      if (button) button.disabled = false;
    }
  }

  async function clearCachePool(type) {
    const isSecret = type === "secret";
    const cacheName = isSecret ? secretMediaCacheName : diaryMediaCacheName;
    await mediaCacheService.deleteCache(cacheName);
    const prefix = isSecret ? `${secretItemsCacheKey}:` : `${photoFeedCacheKey}:`;
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || "";
      if (key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    await refreshCacheInfo();
    if (els.settingsCacheStatus) els.settingsCacheStatus.textContent = `${isSecret ? "秘藏" : "日记"}缓存已清除`;
  }

  return {
    changeCacheLimit,
    saveCacheLimitFromDialog,
    applyCacheLimitPreset,
    ensureCacheManagementUi,
    initialize: ensureCacheManagementUi,
    downloadOfflinePool,
    clearCachePool,
    clearAllOfflineContent,
  };
}
