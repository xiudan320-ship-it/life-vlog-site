import { addBagItem, changeGold, spendGoods } from "./inventory-domain.js";
import { getExtendedStrengthRule } from "./strength-balance-domain.js";

const float = Math.fround;
// GameData::getEquipSellStrenghPrice uses the original integer chance table.
const strengthChances = [100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 16, 13, 8, 6, 4, 10, 6, 2, 1, 1];

export function getEquipmentSaleValue(item, row) {
  if (item.subtype > 10 && item.subtype < 16) return item.level * 500 + row.price + item.quality * 3000;
  if (item.quality === 6 && item.godLevel > 0 && ![9, 10].includes(item.subtype)) return item.godLevel;
  const base = float((item.enchantment?.level || 0) * 3.5 + Math.trunc(item.scoreTier / 2));
  const factor = float(float(float(float(base * base) * base) / float(base + 500)) + float(1));
  return Math.trunc(float(float(row.price) * factor));
}

export function getEquipmentSaleRefund(item) {
  if (item.subtype === 9) return item.quality;
  if (item.strength > 18) {
    const rule = getExtendedStrengthRule(item.strength - 1);
    return Math.floor(rule.stones * 1001 / (rule.threshold + 1) / 4);
  }
  if (item.strength <= 3) return 0;
  const next = item.strength + 1;
  const base = Math.trunc(next ** 3 / (50 - Math.trunc(item.level / 3) + next)) + Math.trunc(item.level / 8);
  const chance = float(strengthChances[item.strength - 1] - float(float(Math.trunc(item.level / 10)) * float(0.005)));
  const multiplier = Math.trunc(float(float(100) / chance));
  return item.strength <= 15 ? Math.trunc(Math.imul(base, multiplier) / 2)
    : Math.trunc(Math.imul(Math.trunc(base / 10) + 3 * (next - 16) ** 2 - 5, multiplier) / 4) + item.level;
}

export function getBagItem({ state, target, catalog }) {
  let item;
  if (target?.kind === "goods") item = state.inventory.goods.find((entry) => entry.id === target.id);
  else if (target?.kind === "equipment" && Number.isSafeInteger(target.index) && target.index >= 0) item = state.inventory.equipment[target.index];
  const row = item && catalog.items.find((entry) => entry.id === item.id);
  if (!item || item.id !== target.id || !row || item.equipped || (target.kind === "goods" ? item.type !== 1 : item.type !== 2 || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14].includes(item.subtype))) throw new RangeError("请选择当前背包持有的物品");
  return { item, row };
}

export function getItemSalePreview({ state, target, catalog, quantity = 1 }) {
  const { item, row } = getBagItem({ state, target, catalog });
  if (!Number.isSafeInteger(quantity) || quantity < 1 || (item.type === 1 ? quantity > item.quantity || item.quantity <= 9 && quantity !== 1 : quantity !== 1)) throw new RangeError("出售数量无效");
  const reward = { gold: 0, money: 0, items: [] };
  if (item.type === 1) {
    reward[row.useid === 6 ? "money" : "gold"] = Math.imul(row.price, quantity);
  } else {
    if (item.locked) throw new RangeError("装备锁定中，请先解锁");
    const value = getEquipmentSaleValue(item, row);
    if (item.subtype <= 8 && item.quality === 6 && item.godLevel > 0) reward.items.push({ id: 5092, type: 1, quantity: value });
    else reward.gold = value;
    if (item.subtype <= 9) {
      const refund = getEquipmentSaleRefund(item);
      if (refund > 0) reward.items.push({ id: item.subtype === 9 ? 5056 : item.strength > 15 ? 5086 : 5003, type: 1, quantity: refund });
    }
  }
  return reward;
}

export function sellBagItem({ state, target, catalog, quantity = 1 }) {
  const reward = getItemSalePreview({ state, target, catalog, quantity });
  let inventory = target.kind === "goods" ? spendGoods(state.inventory, [{ id: target.id, quantity }])
    : { ...state.inventory, equipment: state.inventory.equipment.filter((_, index) => index !== target.index) };
  for (const item of reward.items) inventory = addBagItem({ inventory, item });
  return { state: { ...state, inventory, gold: changeGold({ gold: state.gold, delta: reward.gold }).gold, money: (state.money + reward.money) | 0 }, reward };
}

export function toggleBagEquipmentLock({ state, target, catalog }) {
  const { item } = getBagItem({ state, target, catalog });
  if (item.type !== 2) throw new RangeError("仅装备可以锁定");
  return { ...state, inventory: { ...state.inventory, equipment: state.inventory.equipment.map((entry, index) => index === target.index ? { ...entry, locked: !entry.locked } : entry) } };
}
