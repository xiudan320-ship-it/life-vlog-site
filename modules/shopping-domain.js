const FILTERS = new Set(["open", "done"]);

export function normalizeShoppingFilter(value) {
  return FILTERS.has(value) ? value : "open";
}

export function getShoppingStats(items = []) {
  const open = items.filter((item) => !item.completed).length;
  return {
    all: items.length,
    open,
    done: items.length - open,
  };
}

export function filterShoppingItems(items = [], filter = "open") {
  const normalizedFilter = normalizeShoppingFilter(filter);
  if (normalizedFilter === "open") return items.filter((item) => !item.completed);
  if (normalizedFilter === "done") return items.filter((item) => item.completed);
  return [];
}

export function sortShoppingItems(items = []) {
  return [...items].sort((a, b) => {
    const orderDifference = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (orderDifference !== 0) return orderDifference;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

export function moveShoppingItem(items = [], itemId, targetId) {
  const ordered = sortShoppingItems(items);
  const sourceIndex = ordered.findIndex((item) => item.id === itemId);
  const targetIndex = ordered.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return ordered;

  const [moved] = ordered.splice(sourceIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  return ordered.map((item, index) => ({ ...item, sortOrder: index }));
}

export function withShoppingSortOrder(items = []) {
  return sortShoppingItems(items).map((item, index) => ({ ...item, sortOrder: index }));
}
