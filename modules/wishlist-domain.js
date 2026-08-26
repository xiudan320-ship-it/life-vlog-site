const FILTERS = new Set(["open", "done"]);

export function normalizeWishlistFilter(value) {
  return FILTERS.has(value) ? value : "open";
}

export function getWishlistStats(wishes = []) {
  const open = wishes.filter((wish) => !wish.done).length;
  return { all: wishes.length, open, done: wishes.length - open };
}

export function filterWishlistItems(wishes = [], filter = "open") {
  const normalized = normalizeWishlistFilter(filter);
  return wishes.filter((wish) => normalized === "done" ? wish.done : !wish.done);
}

function getPriorityRank(priority) {
  if (priority === "一定要做") return 3;
  if (priority === "想尽快") return 2;
  return 1;
}

function compareByPriority(a, b) {
  const priorityDifference = getPriorityRank(b.priority) - getPriorityRank(a.priority);
  if (priorityDifference) return priorityDifference;
  const dateA = a.date ? new Date(`${a.date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  const dateB = b.date ? new Date(`${b.date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  if (dateA !== dateB) return dateA - dateB;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

export function sortWishlistItems(wishes = []) {
  return [...wishes].sort((a, b) => {
    const aOrder = Number(a.sortOrder);
    const bOrder = Number(b.sortOrder);
    if (Number.isFinite(aOrder) && Number.isFinite(bOrder) && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return compareByPriority(a, b);
  });
}

export function reorderWishlistItems(wishes = [], visibleIds = []) {
  const byId = new Map(wishes.map((wish) => [wish.id, wish]));
  const visible = visibleIds.map((id) => byId.get(id)).filter(Boolean);
  const visibleSet = new Set(visible.map((wish) => wish.id));
  const ordered = sortWishlistItems(wishes);
  const slots = ordered
    .map((wish, index) => ({ wish, index }))
    .filter(({ wish }) => visibleSet.has(wish.id))
    .map(({ index }) => index);
  if (!visible.length || visible.length !== slots.length) return ordered;
  const merged = [...ordered];
  slots.forEach((slot, index) => { merged[slot] = visible[index]; });
  return merged.map((wish, index) => ({ ...wish, sortOrder: index }));
}
