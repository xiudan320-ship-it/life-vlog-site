import {
  getCacheCapacityStorageKey,
  isClearlyUnmeteredConnection,
  normalizeCacheMb,
} from "./cache-policy.js";
import { normalizeMediaUrl } from "./media-cache.js";
import {
  getStorageUsageBytes,
  sanitizeCommentRecord,
  sanitizeDiaryRecord,
  sanitizeSecretRecord,
} from "./offline-records.js";

export function createOfflineCacheController({
  elements,
  preferenceStore,
  mediaCacheService,
  keys,
  cacheNames,
  limits,
  getSession,
  getPhotos,
  setPhotos,
  getSortedPhotos,
  getPhotoImages,
  getPhotoCommentPreviews,
  setPhotoCommentPreviews,
  setShowingCachedFeed,
  setVisiblePhotoCount,
  getActivePage,
  renderGallery,
  setGlobalStatus,
  getSecretItems,
  setSecretItems,
  setSecretCloudAvailable,
  renderSecretGallery,
  setSecretStatus,
  normalizeSecretImages,
  getDefaultSecretSortOrder,
  getProfileAvatarUrl,
  getAccountProfile,
  getFamilyMembers,
  getFamilyLevelProfiles,
  renderSettingsSummary,
  formatFileSize,
}) {
  let cacheTimer = 0;

  function getPhotoFeedStorageKey(userId = getSession()?.user?.id || "public") {
    return `${keys.photoFeed}:${userId || "public"}`;
  }

  function clampCapacity(value, fallback) {
    return normalizeCacheMb(value, fallback, { min: limits.minMb, max: limits.maxMb });
  }

  function getCapacityStorageKey(type, userId = getSession()?.user?.id || "guest") {
    return getCacheCapacityStorageKey(type, userId, {
      diary: keys.diaryCapacity,
      secret: keys.secretCapacity,
    });
  }

  function loadCapacityMb(type, userId = getSession()?.user?.id || "guest") {
    const fallback = type === "secret" ? limits.defaultSecretMb : limits.defaultDiaryMb;
    return clampCapacity(localStorage.getItem(getCapacityStorageKey(type, userId)), fallback);
  }

  function saveCapacityMb(type, value, userId = getSession()?.user?.id || "guest") {
    const fallback = type === "secret" ? limits.defaultSecretMb : limits.defaultDiaryMb;
    const capacity = clampCapacity(value, fallback);
    localStorage.setItem(getCapacityStorageKey(type, userId), String(capacity));
    return capacity;
  }

  function getPhotoCacheImages(photo) {
    const images = getPhotoImages(photo);
    if (images.length) {
      return images
        .flatMap((image) => [image.thumbnail_url, image.image_url, image.poster_url])
        .filter(Boolean);
    }
    return [photo?.image_url].filter(Boolean);
  }

  function getSecretItemCacheImages(item) {
    return [
      item?.coverImage || item?.cover_image || "",
      ...normalizeSecretImages(item?.images).flatMap((image) => [image.thumbnail_url, image.image_url]),
    ].filter(Boolean);
  }

  function normalizeCacheUrl(url) {
    return normalizeMediaUrl(url, window.location.href);
  }

  function collectDiaryUrls(itemLimit = Number.POSITIVE_INFINITY) {
    const urls = [];
    getSortedPhotos(getPhotos())
      .slice(0, itemLimit)
      .forEach((photo) => urls.push(...getPhotoCacheImages(photo)));
    urls.push(getProfileAvatarUrl(getAccountProfile()));
    getFamilyMembers().forEach((member) => urls.push(getProfileAvatarUrl(member)));
    getFamilyLevelProfiles().forEach((profile) => urls.push(getProfileAvatarUrl(profile)));
    return [...new Set(urls.map(normalizeCacheUrl).filter(Boolean))];
  }

  function collectSecretUrls() {
    const urls = [];
    getSecretItems().forEach((item) => urls.push(...getSecretItemCacheImages(item)));
    return [...new Set(urls.map(normalizeCacheUrl).filter(Boolean))];
  }

  function getPolicyKey(userId = getSession()?.user?.id || "guest") {
    return preferenceStore.scopedKey(keys.policy, userId || "guest");
  }

  function loadPolicy(userId = getSession()?.user?.id || "guest") {
    return preferenceStore.readEnum(keys.policy, ["off", "wifi"], "wifi", {
      scope: userId || "guest",
    });
  }

  function savePolicy(policy, userId = getSession()?.user?.id || "guest") {
    const next = policy === "off" ? "off" : "wifi";
    preferenceStore.write(getPolicyKey(userId), next);
    renderSettingsSummary();
    return next;
  }

  function isUnmetered() {
    return isClearlyUnmeteredConnection(navigator);
  }

  function shouldAutoCache(userId = getSession()?.user?.id || "guest") {
    return navigator.onLine && loadPolicy(userId) === "wifi" && isUnmetered();
  }

  function schedule(userId = getSession()?.user?.id || "public") {
    if (!("caches" in window) || !shouldAutoCache(userId)) return;
    window.clearTimeout(cacheTimer);
    cacheTimer = window.setTimeout(() => {
      cacheMedia(userId, { explicit: false }).catch((error) => {
        console.warn("Offline media cache failed:", error);
      });
    }, 900);
  }

  async function cacheMedia(userId = getSession()?.user?.id || "public", options = {}) {
    if (!("caches" in window)) return;
    const explicit = Boolean(options.explicit);
    const type = options.type || "all";
    if (!explicit && !shouldAutoCache(userId)) return;
    const tasks = [];
    if (type === "all" || type === "diary") {
      const diaryItemLimit = explicit ? Number.POSITIVE_INFINITY : limits.autoDiaryItems;
      tasks.push(
        mediaCacheService.fillWithinCapacity(
          cacheNames.diary,
          collectDiaryUrls(diaryItemLimit),
          loadCapacityMb("diary", userId) * 1024 * 1024,
          explicit ? 40 : Number.POSITIVE_INFINITY
        )
      );
    }
    if (type === "all" || type === "secret") {
      tasks.push(
        mediaCacheService.fillWithinCapacity(
          cacheNames.secret,
          collectSecretUrls(),
          loadCapacityMb("secret", userId) * 1024 * 1024,
          explicit ? Number.POSITIVE_INFINITY : 4
        )
      );
    }
    const results = await Promise.all(tasks);
    await caches.delete(cacheNames.legacy);
    await refreshInfo();
    return results.reduce(
      (summary, result) => ({
        cached: summary.cached + result.cached,
        downloaded: summary.downloaded + result.downloaded,
        bytes: summary.bytes + result.bytes,
        requested: summary.requested + result.requested,
        complete: summary.complete && result.complete,
      }),
      { cached: 0, downloaded: 0, bytes: 0, requested: 0, complete: true }
    );
  }

  function savePhotoFeed(userId = getSession()?.user?.id || "public") {
    const photos = getPhotos();
    if (!photos.length) return;
    const cachedPhotos = getSortedPhotos(photos).slice(0, limits.metadataItems);
    const cachedIds = new Set(cachedPhotos.map((photo) => photo.id).filter(Boolean));
    const comments = [];
    cachedIds.forEach((photoId) => {
      (getPhotoCommentPreviews().get(photoId) || [])
        .slice(0, limits.commentPreviews)
        .forEach((comment) => comments.push(sanitizeCommentRecord(comment)));
    });
    try {
      localStorage.setItem(
        getPhotoFeedStorageKey(userId),
        JSON.stringify({
          savedAt: new Date().toISOString(),
          photos: cachedPhotos.map(sanitizeDiaryRecord),
          comments,
        })
      );
      schedule(userId);
    } catch {
    }
  }

  function renderCachedPhotoFeed(userId = getSession()?.user?.id || "public") {
    if (getActivePage() !== "gallery") return false;
    try {
      const raw = localStorage.getItem(getPhotoFeedStorageKey(userId));
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (!Array.isArray(cached.photos) || !cached.photos.length) return false;
      setPhotos(cached.photos.map((photo) => ({ ...photo, __cached: true })));
      const previewMap = new Map();
      (Array.isArray(cached.comments) ? cached.comments : []).forEach((comment) => {
        if (!comment.photo_id) return;
        const list = previewMap.get(comment.photo_id) || [];
        if (list.length >= limits.commentPreviews) return;
        list.push(comment);
        previewMap.set(comment.photo_id, list);
      });
      setPhotoCommentPreviews(previewMap);
      setShowingCachedFeed(true);
      setVisiblePhotoCount(
        Math.max(limits.pageSize, Math.min(limits.metadataItems, cached.photos.length))
      );
      renderGallery();
      setGlobalStatus("先显示上次缓存，正在同步最新内容…");
      return true;
    } catch {
      return false;
    }
  }

  function getSecretStorageKey(userId = getSession()?.user?.id || "guest") {
    return `${keys.secretItems}:${userId || "guest"}`;
  }

  function saveSecretItems(userId = getSession()?.user?.id || "guest") {
    const items = getSecretItems();
    if (!items.length) return;
    try {
      localStorage.setItem(
        getSecretStorageKey(userId),
        JSON.stringify({
          savedAt: new Date().toISOString(),
          items: items.slice(0, limits.metadataItems).map((item) =>
            sanitizeSecretRecord(item, {
              images: normalizeSecretImages(item.images),
              defaultSortOrder: getDefaultSecretSortOrder(item.createdAt),
            })
          ),
        })
      );
      schedule(userId);
    } catch {
    }
  }

  function renderCachedSecretItems(userId = getSession()?.user?.id || "guest") {
    try {
      const raw = localStorage.getItem(getSecretStorageKey(userId));
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (!Array.isArray(cached.items) || !cached.items.length) return false;
      setSecretItems(cached.items.map((item) => ({ ...item, __cached: true })));
      setSecretCloudAvailable(true);
      renderSecretGallery();
      setSecretStatus("先显示上次缓存，正在同步秘藏...");
      return true;
    } catch {
      return false;
    }
  }

  async function getStats() {
    return mediaCacheService.getStats(getStorageUsageBytes(localStorage));
  }

  function renderStats(stats) {
    if (!elements.settingsCacheValue) return;
    elements.settingsCacheValue.textContent = `${formatFileSize(stats.totalBytes)} 本地离线缓存`;
    const cacheHelp = elements.settingsCacheValue.nextElementSibling;
    if (cacheHelp) {
      cacheHelp.textContent = `日记 ${stats.diaryEntries} 项 / ${loadCapacityMb("diary")} MB · 秘藏 ${stats.secretEntries} 项 / ${loadCapacityMb("secret")} MB`;
    }
    if (elements.settingsCacheStatus) {
      elements.settingsCacheStatus.textContent = `日记 ${formatFileSize(stats.diaryBytes)} · 秘藏 ${formatFileSize(stats.secretBytes)} · 应用外壳 ${formatFileSize(stats.appShellBytes)} · 文字索引 ${formatFileSize(stats.localBytes)}`;
      const clearHelp = elements.settingsCacheStatus.nextElementSibling;
      if (clearHelp) clearHelp.textContent = "清除以上离线内容，账号和个人设置仍保留";
    }
  }

  async function refreshInfo() {
    if (elements.settingsCacheValue) elements.settingsCacheValue.textContent = "计算中...";
    renderStats(await getStats());
  }

  async function clear() {
    if (elements.settingsCacheStatus) elements.settingsCacheStatus.textContent = "正在清除...";
    const keysToRemove = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || "";
      if (key.startsWith(`${keys.photoFeed}:`) || key.startsWith(`${keys.secretItems}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    await mediaCacheService.deleteManagedCaches();
    await refreshInfo();
    if (elements.settingsCacheStatus) elements.settingsCacheStatus.textContent = "缓存已清除，账号和设置已保留";
  }

  return {
    cacheMedia,
    clear,
    collectDiaryUrls,
    collectSecretUrls,
    getCapacityStorageKey,
    getPhotoFeedStorageKey,
    getPolicyKey,
    getSecretStorageKey,
    getStats,
    isUnmetered,
    loadCapacityMb,
    loadPolicy,
    refreshInfo,
    renderCachedPhotoFeed,
    renderCachedSecretItems,
    renderStats,
    saveCapacityMb,
    savePhotoFeed,
    savePolicy,
    saveSecretItems,
    schedule,
    shouldAutoCache,
  };
}
