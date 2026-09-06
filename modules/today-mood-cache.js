const TODAY_MOOD_CACHE_PREFIX = "life-vlog-mood-day:";
const MONTH_MOOD_CACHE_PREFIX = "life-vlog-mood-month:";

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

  function read(userId, dateKey) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    const cachedDay = parseEntries(storage, dayKey(userId, normalizedDateKey));
    if (cachedDay) return cachedDay;
    const cachedMonth = readMonth(userId, normalizedDateKey);
    return cachedMonth
      ? cachedMonth.filter((entry) => String(entry?.diary_date || "").trim() === normalizedDateKey)
      : null;
  }

  function write(userId, dateKey, entries) {
    const key = dayKey(userId, dateKey);
    if (!key || !Array.isArray(entries)) return false;
    try {
      storage?.setItem?.(key, JSON.stringify(entries));
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
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({ dayKey, monthKey, read, readMonth, write, writeMonth });
}
