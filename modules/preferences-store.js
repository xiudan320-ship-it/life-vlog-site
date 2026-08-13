function safeStorage(storage) {
  return storage && typeof storage.getItem === "function" ? storage : null;
}

export function createPreferenceStore({ storage = globalThis.localStorage } = {}) {
  const target = safeStorage(storage);

  function scopedKey(baseKey, scope = "guest") {
    const normalizedScope = String(scope || "guest").trim() || "guest";
    return `${baseKey}:${normalizedScope}`;
  }

  function read(key, fallback = "") {
    try {
      const value = target?.getItem(key);
      return value === null || value === undefined ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      target?.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  }

  function readScoped(baseKey, scope, fallback = "", { legacyKey = "" } = {}) {
    const value = read(scopedKey(baseKey, scope), "");
    if (value !== "") return value;
    return legacyKey ? read(legacyKey, fallback) : fallback;
  }

  function writeScoped(baseKey, scope, value) {
    return write(scopedKey(baseKey, scope), value);
  }

  function readEnum(key, allowed, fallback, options = {}) {
    const value = options.scope
      ? readScoped(key, options.scope, fallback, options)
      : read(key, fallback);
    return allowed.includes(value) ? value : fallback;
  }

  function readJson(key, fallback, options = {}) {
    const raw = options.scope
      ? readScoped(key, options.scope, "", options)
      : read(key, "");
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value, options = {}) {
    const serialized = JSON.stringify(value);
    return options.scope
      ? writeScoped(key, options.scope, serialized)
      : write(key, serialized);
  }

  return {
    read,
    readEnum,
    readJson,
    readScoped,
    scopedKey,
    write,
    writeJson,
    writeScoped,
  };
}
