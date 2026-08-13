export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  if (!value) return "\u672a\u8bb0\u5f55\u65e5\u671f";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u672a\u8bb0\u5f55\u65e5\u671f";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "\u672a\u77e5\u65f6\u95f4";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u672a\u77e5\u65f6\u95f4";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCommentTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u672a\u77e5\u65f6\u95f4";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getInitial(value, fallback = "U") {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed[0].toUpperCase() : fallback;
}

export function slugify(value, fallback = "photo") {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}
