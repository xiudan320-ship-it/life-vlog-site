const TODAY_MOOD_CACHE_PREFIX = "life-vlog-mood-day:";
const MONTH_MOOD_CACHE_PREFIX = "life-vlog-mood-month:";
const CACHE_SAVED_AT_SUFFIX = ":saved-at";

export const MOOD_CACHE_TTL_MS = 30 * 1000;

function parseEntries(storage, key) {
  if (!storage || !key) return null;
  try {
    const parsed = JSON.parse(storage.getItem?.(key) || "null");
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeUserId(userId) {
  return String(userId || "").trim();
}

function normalizeDateKey(dateKey) {
  return String(dateKey || "").trim();
}

function savedAtKey(cacheKey) {
  return cacheKey ? `${cacheKey}${CACHE_SAVED_AT_SUFFIX}` : "";
}

function readSavedAt(storage, cacheKey) {
  const value = Number(storage?.getItem?.(savedAtKey(cacheKey)) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function writeSavedAt(storage, cacheKey) {
  if (!storage || !cacheKey) return;
  storage.setItem?.(savedAtKey(cacheKey), String(Date.now()));
}

function readFreshRecord(record, maxAgeMs, now = Date.now) {
  if (!record || !Array.isArray(record.entries)) return null;
  const age = Number(now?.()) - Number(record.savedAt);
  return Number.isFinite(maxAgeMs) && maxAgeMs >= 0 && Number.isFinite(age) && age >= 0 && age <= maxAgeMs
    ? record.entries
    : null;
}

export function createTodayMoodCache({ storage = globalThis.localStorage } = {}) {
  function dayKey(userId, dateKey) {
    const normalizedUserId = normalizeUserId(userId);
    const normalizedDateKey = normalizeDateKey(dateKey);
    return normalizedUserId && normalizedDateKey
      ? `${TODAY_MOOD_CACHE_PREFIX}${normalizedUserId}:${normalizedDateKey}`
      : "";
  }

  function monthKey(userId, dateKey) {
    const normalizedUserId = normalizeUserId(userId);
    const normalizedDateKey = normalizeDateKey(dateKey);
    const month = normalizedDateKey.slice(0, 7);
    return normalizedUserId && /^\d{4}-\d{2}$/u.test(month)
      ? `${MONTH_MOOD_CACHE_PREFIX}${normalizedUserId}:${month}`
      : "";
  }

  function readMonth(userId, dateKey) {
    return parseEntries(storage, monthKey(userId, dateKey));
  }

  function readRecord(userId, dateKey) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const cachedDay = parseEntries(storage, dayKey(userId, normalizedDateKey));
    if (cachedDay) {
      return {
        entries: cachedDay,
        savedAt: readSavedAt(storage, dayKey(userId, normalizedDateKey)),
      };
    }
    const cachedMonth = readMonth(userId, normalizedDateKey);
    if (!cachedMonth) return null;
    return {
      entries: cachedMonth.filter((entry) => String(entry?.diary_date || "").trim() === normalizedDateKey),
      savedAt: readSavedAt(storage, monthKey(userId, normalizedDateKey)),
    };
  }

  function read(userId, dateKey) {
    return readRecord(userId, dateKey)?.entries ?? null;
  }

  function readFresh(userId, dateKey, maxAgeMs = MOOD_CACHE_TTL_MS, now = Date.now) {
    return readFreshRecord(readRecord(userId, dateKey), maxAgeMs, now);
  }

  function readFreshMonth(userId, dateKey, maxAgeMs = MOOD_CACHE_TTL_MS, now = Date.now) {
    const key = monthKey(userId, dateKey);
    const entries = parseEntries(storage, key);
    return readFreshRecord(entries ? { entries, savedAt: readSavedAt(storage, key) } : null, maxAgeMs, now);
  }

  function write(userId, dateKey, entries) {
    const key = dayKey(userId, dateKey);
    if (!key || !Array.isArray(entries)) return false;
    try {
      storage?.setItem?.(key, JSON.stringify(entries));
      writeSavedAt(storage, key);
      return true;
    } catch {
      return false;
    }
  }

  function writeMonth(userId, dateKey, entries) {
    const key = monthKey(userId, dateKey);
    if (!key || !Array.isArray(entries)) return false;
    try {
      storage?.setItem?.(key, JSON.stringify(entries));
      writeSavedAt(storage, key);
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({ dayKey, monthKey, read, readFresh, readFreshMonth, readMonth, write, writeMonth });
}
