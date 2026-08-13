export function normalizeCacheMb(value, fallback, { min = 20, max = 2000 } = {}) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function getCacheCapacityStorageKey(type, userId, prefixes) {
  const prefix = type === "secret" ? prefixes.secret : prefixes.diary;
  return `${prefix}:${userId || "guest"}`;
}

export function isClearlyUnmeteredConnection(navigatorLike = navigator) {
  const connection =
    navigatorLike.connection ||
    navigatorLike.mozConnection ||
    navigatorLike.webkitConnection;
  if (!connection || connection.saveData) return false;
  return connection.type === "wifi" || connection.type === "ethernet";
}
