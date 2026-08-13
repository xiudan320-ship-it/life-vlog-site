export function normalizeMediaUrl(url, baseUrl = globalThis.location?.href || "") {
  const value = String(url || "").trim();
  if (!value || value.startsWith("blob:") || value.startsWith("data:")) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

export async function getCachedResponseBytes(response) {
  if (!response) return 0;
  const headerBytes = Number(response.headers.get("content-length")) || 0;
  if (headerBytes) return headerBytes;
  const blob = await response.clone().blob().catch(() => null);
  return blob?.size || 512 * 1024;
}

export function createMediaCacheService({
  appCachePrefix,
  diaryCacheName,
  secretCacheName,
  legacyCacheName,
  cacheStorage = globalThis.caches,
  fetchApi = globalThis.fetch,
  RequestApi = globalThis.Request,
  navigatorApi = globalThis.navigator,
}) {
  const mediaCacheNames = [legacyCacheName, diaryCacheName, secretCacheName];
  const fillChains = new Map();
  const emptyBreakdown = () => ({
    appBytes: 0,
    diaryBytes: 0,
    secretBytes: 0,
    appEntries: 0,
    diaryEntries: 0,
    secretEntries: 0,
  });

  function isManagedCache(name) {
    return (
      String(name || "").startsWith(appCachePrefix) ||
      mediaCacheNames.includes(name)
    );
  }

  async function fetchMedia(url) {
    try {
      return await fetchApi(url, { mode: "cors", cache: "reload" });
    } catch {
      return fetchApi(url, { mode: "no-cors", cache: "reload" });
    }
  }

  async function fillWithinCapacityNow(
    cacheName,
    urls,
    maxBytes,
    maxDownloads = 4
  ) {
    if (!cacheStorage) {
      return {
        cached: 0,
        downloaded: 0,
        bytes: 0,
        requested: urls.length,
        complete: false,
      };
    }
    const cache = await cacheStorage.open(cacheName);
    const existingRequests = await cache.keys();
    const existingByUrl = new Map(
      existingRequests.map((request) => [request.url, request])
    );
    const keep = new Set();
    let usedBytes = 0;
    let downloads = 0;

    for (const url of urls) {
      if (usedBytes >= maxBytes) break;
      let response = await cache.match(url);
      if (!response) {
        if (downloads >= maxDownloads) continue;
        try {
          response = await fetchMedia(url);
          downloads += 1;
        } catch {
          continue;
        }
      }
      if (!response || (!response.ok && response.type !== "opaque")) continue;
      const bytes = await getCachedResponseBytes(response);
      if (usedBytes + bytes > maxBytes) continue;
      if (!existingByUrl.has(url)) {
        await cache.put(
          new RequestApi(url, { mode: "no-cors" }),
          response.clone()
        );
      }
      keep.add(url);
      usedBytes += bytes;
    }

    await Promise.all(
      existingRequests
        .filter((request) => !keep.has(request.url))
        .map((request) => cache.delete(request))
    );
    return {
      cached: keep.size,
      downloaded: downloads,
      bytes: usedBytes,
      requested: urls.length,
      complete: keep.size >= urls.length,
    };
  }

  function fillWithinCapacity(cacheName, urls, maxBytes, maxDownloads = 4) {
    const previous = fillChains.get(cacheName) || Promise.resolve();
    const task = previous
      .catch(() => {})
      .then(() => fillWithinCapacityNow(cacheName, urls, maxBytes, maxDownloads));
    fillChains.set(cacheName, task);
    return task.finally(() => {
      if (fillChains.get(cacheName) === task) fillChains.delete(cacheName);
    });
  }

  async function getBreakdown() {
    if (!cacheStorage) return emptyBreakdown();
    const result = emptyBreakdown();
    const names = await cacheStorage.keys();
    for (const name of names.filter(isManagedCache)) {
      const cache = await cacheStorage.open(name);
      const requests = await cache.keys();
      const type =
        name === diaryCacheName
          ? "diary"
          : name === secretCacheName || name === legacyCacheName
            ? "secret"
            : "app";
      result[`${type}Entries`] += requests.length;
      for (const request of requests) {
        const response = await cache.match(request);
        if (!response) continue;
        result[`${type}Bytes`] += await getCachedResponseBytes(response);
      }
    }
    return result;
  }

  async function getStats(localBytes = 0) {
    const [breakdown, storageEstimate] = await Promise.all([
      getBreakdown().catch(emptyBreakdown),
      navigatorApi?.storage?.estimate?.().catch(() => null) ||
        Promise.resolve(null),
    ]);
    const cacheBytes =
      breakdown.appBytes + breakdown.diaryBytes + breakdown.secretBytes;
    return {
      localBytes,
      cacheBytes,
      appShellBytes: breakdown.appBytes,
      diaryBytes: breakdown.diaryBytes,
      secretBytes: breakdown.secretBytes,
      appEntries: breakdown.appEntries,
      diaryEntries: breakdown.diaryEntries,
      secretEntries: breakdown.secretEntries,
      cacheEntries:
        breakdown.appEntries +
        breakdown.diaryEntries +
        breakdown.secretEntries,
      totalBytes: localBytes + cacheBytes,
      browserUsageBytes: Number(storageEstimate?.usage) || 0,
      browserQuotaBytes: Number(storageEstimate?.quota) || 0,
    };
  }

  async function getHitCount(urls) {
    const unique = [...new Set(urls)];
    if (!cacheStorage) return { cached: 0, total: unique.length };
    let cached = 0;
    for (const url of unique) {
      if (await cacheStorage.match(url, { ignoreVary: true })) cached += 1;
    }
    return { cached, total: unique.length };
  }

  async function deleteCache(cacheName) {
    if (cacheStorage) await cacheStorage.delete(cacheName);
  }

  async function deleteManagedCaches() {
    if (!cacheStorage) return;
    const names = await cacheStorage.keys();
    await Promise.all(
      names.filter(isManagedCache).map((name) => cacheStorage.delete(name))
    );
  }

  return {
    deleteCache,
    deleteManagedCaches,
    fillWithinCapacity,
    getBreakdown,
    getHitCount,
    getStats,
  };
}
