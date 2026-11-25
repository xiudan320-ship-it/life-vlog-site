import { getItemSalePreview, sellBagItem } from "./bag-item-domain.js";

export function getDecomposableEquipment(state) {
  return state.inventory.equipment.flatMap((item, index) =>
    !item.locked && !item.equipped && [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14].includes(item.subtype)
      ? [{ index, id: item.id }] : []);
}

/** Validate all selections before applying any removals or rewards. */
export function previewBatchDecomposition({ state, targets, catalog }) {
  if (!Array.isArray(targets) || !targets.length) throw new RangeError("请选择要分解的装备");
  const seen = new Set();
  const reward = { gold: 0, money: 0, items: [] };
  for (const target of targets) {
    if (seen.has(target.index)) throw new RangeError("不能重复选择同一件装备");
    seen.add(target.index);
    const value = getItemSalePreview({ state, catalog, target: { ...target, kind: "equipment" } });
    reward.gold += value.gold;
    reward.money += value.money;
    for (const item of value.items) {
      const existing = reward.items.find((entry) => entry.id === item.id && entry.type === item.type);
      if (existing) existing.quantity += item.quantity;
      else reward.items.push({ ...item });
    }
  }
  if (!Number.isSafeInteger(reward.gold) || reward.gold < 0) throw new RangeError("分解金币数量超出范围");
  for (const item of reward.items) {
    const held = state.inventory.goods.find((entry) => entry.id === item.id)?.quantity || 0;
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 0 || held + item.quantity > 0x7fffffff) {
      throw new RangeError("分解返还材料超过持有上限，请减少选择");
    }
  }
  return reward;
}

export function decomposeEquipmentBatch({ state, targets, catalog }) {
  const reward = previewBatchDecomposition({ state, targets, catalog });
  let next = state;
  for (const target of [...targets].sort((left, right) => right.index - left.index)) {
    next = sellBagItem({ state: next, catalog, target: { ...target, kind: "equipment" } }).state;
  }
  reward.gold = next.gold - state.gold;
  reward.money = next.money - state.money;
  return { state: next, reward, count: targets.length };
}
