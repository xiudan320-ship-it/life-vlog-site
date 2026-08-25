const REFERENCE_QUERIES = [
  "select avatar_url, avatar_path from user_profiles",
  "select image_url, image_path, note from photos",
  "select cover_image from recipes",
  "select note from wishes",
  "select image_url, image_path from shopping_items",
  "select note from weekend_plans",
  "select images from wardrobe_items",
  "select cover_image, cover_path, images from secret_items",
  "select payload from trash_items",
];

const SYSTEM_PREFIXES = ["system-backups/"];
const RECENT_UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

function decodeStoredText(value) {
  let text = String(value ?? "");
  for (let index = 0; index < 2; index += 1) {
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch {
      break;
    }
  }
  return text;
}

function normalizeKey(value) {
  const key = String(value || "").replace(/^r2:/, "").replace(/^\/+/, "");
  if (!key || key.includes("..")) return "";
  return key;
}

function collectKeysFromValue(value, publicBaseUrl, keys) {
  const text = decodeStoredText(value);
  for (const match of text.matchAll(/r2:([^"'\\\s,}\]]+)/g)) {
    const key = normalizeKey(match[1]);
    if (key) keys.add(key);
  }

  if (!publicBaseUrl) return;
  let offset = 0;
  while (offset < text.length) {
    const start = text.indexOf(publicBaseUrl, offset);
    if (start === -1) break;
    const keyStart = start + publicBaseUrl.length;
    const remainder = text.slice(keyStart);
    const end = remainder.search(/["'\\\s,}\]]/);
    const key = normalizeKey(end === -1 ? remainder : remainder.slice(0, end));
    if (key) keys.add(key);
    offset = keyStart + Math.max(1, end === -1 ? remainder.length : end);
  }
}

async function collectReferencedKeys(env) {
  const keys = new Set();
  const configuredPublicUrl = String(env.PUBLIC_R2_URL || "").replace(/\/+$/, "");
  const publicBaseUrl = configuredPublicUrl ? `${configuredPublicUrl}/` : "";
  for (const query of REFERENCE_QUERIES) {
    const result = await env.DB.prepare(query).all();
    for (const row of result.results || []) {
      for (const value of Object.values(row)) {
        collectKeysFromValue(value, publicBaseUrl, keys);
      }
    }
  }
  return keys;
}

function isProtectedSystemObject(key) {
  return SYSTEM_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export async function auditR2Objects(env, now = Date.now()) {
  const referencedKeys = await collectReferencedKeys(env);
  const orphaned = [];
  const recentUnreferenced = [];
  let usedBytes = 0;
  let objectCount = 0;
  let referencedBytes = 0;
  let protectedBytes = 0;
  let cursor;

  do {
    const listed = await env.R2_BUCKET.list({ limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const object of listed.objects || []) {
      const size = Math.max(0, Number(object.size) || 0);
      const uploadedAt = new Date(object.uploaded).getTime();
      const item = {
        key: object.key,
        size_bytes: size,
        uploaded_at: Number.isFinite(uploadedAt) ? new Date(uploadedAt).toISOString() : null,
      };
      objectCount += 1;
      usedBytes += size;
      if (referencedKeys.has(object.key)) {
        referencedBytes += size;
      } else if (isProtectedSystemObject(object.key)) {
        protectedBytes += size;
      } else if (Number.isFinite(uploadedAt) && now - uploadedAt < RECENT_UPLOAD_WINDOW_MS) {
        recentUnreferenced.push(item);
      } else {
        orphaned.push(item);
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  const bySizeDescending = (left, right) => right.size_bytes - left.size_bytes;
  orphaned.sort(bySizeDescending);
  recentUnreferenced.sort(bySizeDescending);
  return {
    scanned_at: new Date(now).toISOString(),
    safety_window_hours: RECENT_UPLOAD_WINDOW_MS / (60 * 60 * 1000),
    object_count: objectCount,
    used_bytes: usedBytes,
    referenced_object_count: referencedKeys.size,
    referenced_bytes: referencedBytes,
    protected_bytes: protectedBytes,
    orphaned_count: orphaned.length,
    orphaned_bytes: orphaned.reduce((total, item) => total + item.size_bytes, 0),
    orphaned,
    recent_unreferenced_count: recentUnreferenced.length,
    recent_unreferenced_bytes: recentUnreferenced.reduce((total, item) => total + item.size_bytes, 0),
    recent_unreferenced: recentUnreferenced,
  };
}
