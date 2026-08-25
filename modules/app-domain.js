export function toDateInputValue(value, now = () => new Date()) {
  if (!value) return now().toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return now().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function normalizeHomeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20);
}

export function normalizeFamilyTagline(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

export function normalizeNickname(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

export function usernameToEmail(username) {
  const normalized = String(username || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\-\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) return "";

  const ascii = normalized
    .replace(/[\u4e00-\u9fa5]/g, (char) => `u${char.codePointAt(0).toString(16)}`)
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 48);

  return `${ascii || "user"}@life-vlog.local`;
}

export function getPhotoOwnerId(photo) {
  return String(photo?.user_id || photo?.userId || photo?.owner_id || "").trim();
}

export function isMissingCloudSchema(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export function normalizeUuid(value) {
  const candidate = String(value || "");
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)) {
    return candidate;
  }
  return crypto.randomUUID();
}

export function getOffsetLocalDateKey(offsetDays = 0, now = () => new Date()) {
  const date = now();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getLocalDateKey() {
  return getOffsetLocalDateKey(0);
}

export function normalizeLoginDateKey(value) {
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function isYesterdayLoginDate(value) {
  return normalizeLoginDateKey(value) === getOffsetLocalDateKey(-1);
}

export function getRedirectUrl(productionUrl, windowTarget = window) {
  if (["localhost", "127.0.0.1"].includes(windowTarget.location.hostname)) {
    return productionUrl;
  }
  return new URL("./", windowTarget.location.href).toString();
}
