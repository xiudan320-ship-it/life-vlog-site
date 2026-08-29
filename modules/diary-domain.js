export function normalizeDiarySearchText(value) {
  return String(value || "").trim().toLowerCase();
}

export function sortDiaryEntries(entries = []) {
  return [...entries].sort((a, b) => {
    const pinned = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
    if (pinned) return pinned;
    const featured = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    if (featured) return featured;
    return (
      new Date(b.taken_at || b.created_at || 0) -
      new Date(a.taken_at || a.created_at || 0)
    );
  });
}

export function filterDiaryEntries(entries, query, getSearchText) {
  const normalized = normalizeDiarySearchText(query);
  if (!normalized) return entries;
  const terms = normalized.split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    const haystack = normalizeDiarySearchText(getSearchText(entry));
    return terms.every((term) => haystack.includes(term));
  });
}

export function isDiaryWithinDays(entry, days = 7, now = new Date()) {
  const value = entry?.taken_at || entry?.created_at;
  if (!value) return false;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const difference = Math.floor((today - target) / 86400000);
  return difference >= 0 && difference < days;
}

const CATEGORY_ORDER = ["日常", "旅行", "食物", "卢浮宫", "朋友", "QA", "城市"];

function sortDiaryCategories(left, right) {
  const leftIndex = CATEGORY_ORDER.indexOf(left);
  const rightIndex = CATEGORY_ORDER.indexOf(right);
  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  }
  return left.localeCompare(right, "zh-Hans-CN");
}

export function getDiaryCategoryCounts(entries = [], { excludeCategory = "VLOG" } = {}) {
  const counts = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const category = String(entry?.category || "").trim();
    if (!category || category === excludeCategory) continue;
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => sortDiaryCategories(left.category, right.category));
}

export function getDiaryFilterOptions(
  entries = [],
  { isFavorite = () => false, isWithinSevenDays = (entry) => isDiaryWithinDays(entry, 7) } = {},
) {
  const visibleDiary = (Array.isArray(entries) ? entries : []).filter((entry) => entry?.category !== "VLOG");
  const options = [
    { value: "全部", label: "全部", count: visibleDiary.length },
    {
      value: "featured7",
      label: "七日精选",
      count: visibleDiary.filter((entry) => Boolean(entry?.is_featured) && isWithinSevenDays(entry)).length,
    },
    { value: "favorites", label: "我的收藏", count: visibleDiary.filter((entry) => isFavorite(entry)).length },
  ];
  return options.concat(
    getDiaryCategoryCounts(visibleDiary).map(({ category, count }) => ({
      value: category,
      label: category,
      count,
    })),
  );
}

export function filterDiaryPhotos(
  entries = [],
  { filter = "全部", query = "", isFavorite = () => false, isWithinSevenDays = (entry) => isDiaryWithinDays(entry, 7), getSearchText = (entry) => entry?.title || "" } = {},
) {
  const source = Array.isArray(entries) ? entries : [];
  let filtered = filter === "VLOG"
    ? source.filter((entry) => entry?.category === "VLOG")
    : source.filter((entry) => entry?.category !== "VLOG");
  if (filter === "featured7") filtered = filtered.filter((entry) => Boolean(entry?.is_featured) && isWithinSevenDays(entry));
  else if (filter === "favorites") filtered = filtered.filter((entry) => isFavorite(entry));
  else if (filter !== "全部" && filter !== "VLOG") filtered = filtered.filter((entry) => entry?.category === filter);
  return filterDiaryEntries(filtered, query, getSearchText);
}
