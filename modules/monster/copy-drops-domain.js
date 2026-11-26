const ordinaryGroups = ["percent300", "percent100", "percent10", "percent2", "percent1"];
const ids = (value) => typeof value === "string" ? JSON.parse(value) || [] : value || [];

/** List the shared settlement pool without drawing randomness or promising rates. */
export function getCopyDropCatalog(copy, catalog) {
  const groups = copy.dropGroups || copy;
  const found = new Map();
  function add(id, condition) {
    const row = catalog.items.find((item) => item.id === id);
    if (!row) return;
    if (!found.has(id)) found.set(id, { id, row, conditions: [] });
    const conditions = found.get(id).conditions;
    if (!conditions.includes(condition)) conditions.push(condition);
  }
  if ([1, 2].includes(copy.type)) add(5003, "概率掉落");
  for (const key of ordinaryGroups) for (const id of ids(groups[key])) {
    if (id === 5100 && ["percent300", "percent100", "percent10"].includes(key)) continue;
    add(id, "概率掉落");
  }
  if (copy.clearRewardWing) add(copy.clearRewardWing, "未持有时通关固定获得");
  for (const id of ids(groups.paragondrop10)) add(id, "巅峰难度");
  if (copy.type === 5) {
    for (const id of ids(copy.specialdrop)) add(id, "通关奖励");
    if ((copy.id - 5000) > 0 && (copy.id - 5000) % 3 === 0) add(5086, "通关奖励");
  }
  return [...found.values()];
}
