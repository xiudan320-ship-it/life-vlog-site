const tiers = ["", "普通", "标准", "优秀", "极品"];

export function describeEquipmentScore(item) {
  if (!Number.isInteger(item.scoreTier) || item.scoreTier < 1 || item.scoreTier > 4 || !Number.isInteger(item.scoreValue)) return "无评分";
  return `${tiers[item.scoreTier]} · ${item.scoreValue}/100`;
}

/** Retain bag indexes so actions always affect the displayed instance. */
export function sortBagEquipment(items, mode) {
  const entries = items.map((item, index) => ({ item, index }));
  if (mode === "score") entries.sort((left, right) =>
    (right.item.scoreTier || 0) - (left.item.scoreTier || 0)
    || (right.item.scoreValue || 0) - (left.item.scoreValue || 0)
    || right.index - left.index);
  else entries.sort((left, right) => (right.item.acquisitionOrder || 0) - (left.item.acquisitionOrder || 0) || right.index - left.index);
  return entries;
}
