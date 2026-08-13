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
