import { bindCacheManagementUi, renderCacheManagementUi } from "./cache-management-view.js";
import { normalizeCacheMb } from "./cache-policy.js";

const CACHE_POLICIES = Object.freeze(["off", "wifi"]);

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
  documentRef = globalThis.document,
  windowRef = globalThis.window || globalThis,
  navigatorRef = globalThis.navigator,
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
  let initialized = false;

  function getElement(key, selector) {
    return els?.[key] || documentRef?.querySelector?.(selector) || null;
  }

  function getUserScope() {
    return getUserId?.() || "guest";
  }

  function readPolicy(userId) {
    const policy = loadMediaCachePolicy(userId);
    if (!CACHE_POLICIES.includes(policy)) {
      throw new Error(`缓存策略无效：${String(policy)}`);
    }
    return policy;
  }

  function readCapacity(type, userId) {
    const capacity = loadCacheCapacityMb(type, userId);
    if (!Number.isInteger(capacity) || !Number.isFinite(capacity)) {
      throw new Error(`缓存容量无效：${type}`);
    }
    return capacity;
  }

  function buildViewModel({
    userId = getUserScope(),
    diaryCapacityMb = readCapacity("diary", userId),
    secretCapacityMb = readCapacity("secret", userId),
    policy = readPolicy(userId),
  } = {}) {
    if (!Number.isInteger(diaryCapacityMb) || !Number.isFinite(diaryCapacityMb)) {
      throw new Error("日记缓存容量必须是有限整数");
    }
    if (!Number.isInteger(secretCapacityMb) || !Number.isFinite(secretCapacityMb)) {
      throw new Error("秘藏缓存容量必须是有限整数");
    }
    if (!CACHE_POLICIES.includes(policy)) {
      throw new Error(`缓存策略无效：${String(policy)}`);
    }
    const wifiOnly = policy === "wifi";
    return {
      diaryCapacityMb,
      secretCapacityMb,
      policy,
      policyLabel: wifiOnly ? "Wi-Fi · 最新 20 条" : "已关闭",
      policyHelp: wifiOnly
        ? "自动保留最新日记；蜂窝网络和无法识别的网络不会下载"
        : "只通过下面按钮手动下载",
    };
  }

  function renderSummary(userId = getUserScope(), overrides = {}) {
    const viewModel = buildViewModel({ userId, ...overrides });
    renderCacheManagementUi({
      elements: els,
      viewModel,
      minMb: minCacheMb,
      maxMb: maxCacheMb,
      documentRef,
    });
    return viewModel;
  }

  function toggleAutoCache() {
    const userId = getUserScope();
    const current = readPolicy(userId);
    const next = current === "wifi" ? "off" : "wifi";
    const persisted = saveMediaCachePolicy(next, userId);
    if (!CACHE_POLICIES.includes(persisted)) {
      throw new Error(`缓存策略保存结果无效：${String(persisted)}`);
    }
    renderSummary(userId, { policy: persisted });
    showMiniToast(
      persisted === "wifi" ? "仅在明确识别为 Wi-Fi 时自动缓存" : "已关闭自动缓存",
      { kind: "success" }
    );
    return persisted;
  }

  function initialize() {
    const cacheGroup = getElement("settingsStorage", "#settingsStorage");
    if (!cacheGroup) return null;
    if (initialized) return renderSummary();

    bindCacheManagementUi({
      elements: els,
      onTogglePolicy: toggleAutoCache,
      onRefreshInfo: refreshCacheInfo,
      onChangeCacheLimit: changeCacheLimit,
      onCloseCacheLimit: () => getElement("cacheLimitDialog", "#cacheLimitDialog")?.close?.(),
      onSaveCacheLimit: saveCacheLimitFromDialog,
      onApplyCacheLimitPreset: applyCacheLimitPreset,
      onDownloadPool: downloadOfflinePool,
      onClearPool: clearCachePool,
      onClearAppCache: clearOfflineCache,
      reopenSettingsAfterChildDialog,
      documentRef,
    });
    initialized = true;
    return renderSummary();
  }

  function changeCacheLimit() {
    const cacheLimitDialog = getElement("cacheLimitDialog", "#cacheLimitDialog");
    const cacheLimitInput = getElement("cacheLimitInput", "#cacheLimitInput");
    if (!cacheLimitDialog || !cacheLimitInput) return;
    const userId = getUserScope();
    const secretInput = getElement("secretCacheLimitInput", "#secretCacheLimitInput");
    const diaryMb = readCapacity("diary", userId);
    const secretMb = readCapacity("secret", userId);
    cacheLimitInput.value = String(diaryMb);
    if (secretInput) secretInput.value = String(secretMb);
    const status = getElement("cacheLimitStatus", "#cacheLimitStatus");
    if (status) status.textContent = `日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
    openSettingsChildDialog(cacheLimitDialog, () => {
      const focus = () => {
        cacheLimitInput.focus?.();
        cacheLimitInput.select?.();
      };
      if (typeof windowRef?.requestAnimationFrame === "function") windowRef.requestAnimationFrame(focus);
      else focus();
    });
  }

  function saveCacheLimitFromDialog(event) {
    event?.preventDefault?.();
    const userId = getUserScope();
    const cacheLimitInput = getElement("cacheLimitInput", "#cacheLimitInput");
    const secretInput = getElement("secretCacheLimitInput", "#secretCacheLimitInput");
    const diaryMb = saveCacheCapacityMb("diary", cacheLimitInput?.value, userId);
    const secretMb = saveCacheCapacityMb("secret", secretInput?.value, userId);
    renderSummary(userId, { diaryCapacityMb: diaryMb, secretCapacityMb: secretMb });
    scheduleOfflineMediaCache(userId);
    void refreshCacheInfo();
    const cacheLimitStatus = getElement("cacheLimitStatus", "#cacheLimitStatus");
    if (cacheLimitStatus) cacheLimitStatus.textContent = `已保存：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
    const settingsCacheStatus = getElement("settingsCacheStatus", "#settingsCacheStatus");
    if (settingsCacheStatus) settingsCacheStatus.textContent = `容量上限：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
    const close = () => {
      const dialog = getElement("cacheLimitDialog", "#cacheLimitDialog");
      if (dialog?.open) dialog.close();
    };
    if (typeof windowRef?.setTimeout === "function") windowRef.setTimeout(close, 420);
    else close();
  }

  function applyCacheLimitPreset(value) {
    const cacheLimitInput = getElement("cacheLimitInput", "#cacheLimitInput");
    if (!cacheLimitInput) return;
    const diaryMb = normalizeCacheMb(value, defaultDiaryCacheMb, { min: minCacheMb, max: maxCacheMb });
    const secretMb = normalizeCacheMb(diaryMb * 3, defaultSecretCacheMb, { min: minCacheMb, max: maxCacheMb });
    cacheLimitInput.value = String(diaryMb);
    const secretInput = getElement("secretCacheLimitInput", "#secretCacheLimitInput");
    if (secretInput) secretInput.value = String(secretMb);
    const cacheLimitStatus = getElement("cacheLimitStatus", "#cacheLimitStatus");
    if (cacheLimitStatus) cacheLimitStatus.textContent = `已选择：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
  }

  async function downloadOfflinePool(type) {
    if (!navigatorRef?.onLine) {
      showMiniToast("当前离线，无法补充缓存", { kind: "error" });
      return;
    }
    const isSecret = type === "secret";
    const urls = isSecret ? collectSecretOfflineMediaUrls() : collectDiaryOfflineMediaUrls();
    if (!urls.length) {
      showMiniToast(isSecret ? "请先打开秘藏并同步相册" : "请先打开日记并同步内容", { kind: "error" });
      return;
    }
    const button = getElement(
      isSecret ? "downloadSecretOfflineButton" : "downloadDiaryOfflineButton",
      isSecret ? "#downloadSecretOfflineButton" : "#downloadDiaryOfflineButton"
    );
    if (button) button.disabled = true;
    const toast = showMiniToast(`正在下载${isSecret ? "秘藏" : "日记"}离线包…`, {
      kind: "loading",
      persist: true,
      placement: "center",
    });
    try {
      await navigatorRef.storage?.persist?.().catch(() => false);
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
    const status = getElement("settingsCacheStatus", "#settingsCacheStatus");
    if (status) status.textContent = `${isSecret ? "秘藏" : "日记"}缓存已清除`;
  }

  return {
    applyCacheLimitPreset,
    changeCacheLimit,
    clearCachePool,
    clearAppCache: clearOfflineCache,
    downloadOfflinePool,
    buildViewModel,
    initialize,
    renderSummary,
    saveCacheLimitFromDialog,
    toggleAutoCache,
  };
}
