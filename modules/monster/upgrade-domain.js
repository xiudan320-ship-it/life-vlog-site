import { calculateEquipmentMainAttribute } from "./equipment-domain.js";
import { rollEquipmentScore } from "./item-domain.js";
import { spendGoods } from "./inventory-domain.js";

const float = Math.fround;
const chances = [100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 16, 13, 8, 6, 4, 10, 6, 2];
const enchantWeights = { gold: [25, 23, 20, 20, 8, 4], money: [27, 30, 20, 13, 10] };
const enchantFactors = [0.45, 0.53, 0.6, 0.72, 0.84, 1, 1.18].map(float);
const enchantBases = [25.500000000000004, 11.56, 25.500000000000004, 18.53, 5.61, 6.970000000000001, 19.720000000000002, 12.750000000000002];

export function getStrengthStoneCost(item, normal) {
  const next = item.strength + 1;
  const base = Math.trunc(next ** 3 / (50 - Math.trunc(item.level / 3) + next)) + Math.trunc(item.level / 8);
  let result = normal ? base : Math.trunc(base / 4) + 3 * (next - 16) ** 2 - 5;
  if (item.level > 70) result = Math.trunc(float(float(result) * float(1.3)));
  return Math.max(1, result);
}

function goldPrice(item) {
  const factor = float(float(float(item.quality) / float(2)) + float(1));
  return Math.trunc(float(float(float(float(item.level * item.level) * factor) * float(8)) + float(80 * item.level)));
}

export function getUpgradeCost(item, operation, boost = false) {
  let gold = 0, money = 0, goods = [];
  if (operation === "strength") {
    if (item.strength >= 18) throw new RangeError("强化达到上限 +18");
    const advanced = item.strength >= 15;
    let stone = getStrengthStoneCost(item, !advanced);
    let extra = getStrengthStoneCost(item, true);
    if (item.paragonGrowth > 500 && item.level >= 80) { stone = Math.trunc(stone * 1.5); extra = Math.trunc(stone * 1.5); }
    goods = [{ id: advanced ? 5086 : 5003, quantity: stone }];
    if (advanced && boost) goods.push({ id: 5003, quantity: extra });
  } else if (operation === "reforge") {
    let stone = Math.trunc(item.level / 10) + 1;
    gold = Math.trunc(float(float(float(goldPrice(item)) / float(4)) * float(3)));
    if (item.level > 70) { stone = Math.trunc(float(float(stone) * float(1.3))); gold = Math.trunc(float(float(gold) * float(1.3))); }
    goods = [{ id: 5004, quantity: stone }];
  } else if (operation === "enchantGold" || operation === "enchantMoney") {
    if (operation === "enchantGold") gold = goldPrice(item);
    else money = Math.trunc(item.level / 10) * 2 + item.quality + 2;
    if (item.level > 70) { gold = Math.trunc(float(float(gold) * float(1.3))); money = Math.trunc(float(float(money) * float(1.3))); }
    if (item.paragonGrowth > 500) { gold = Math.trunc(gold * 1.4); money = Math.trunc(money * 1.4); }
  } else throw new RangeError("未知装备培养操作");
  return { gold, money, goods };
}

export function strengthThreshold(item, boost) {
  const chance = float(float(chances[item.strength] - float(float(Math.trunc(item.level / 10)) * float(0.005))) + float(item.strength >= 15 && boost ? 2 : 0));
  return float(chance * float(10));
}

export function getEnchantmentValue({ type, level, itemLevel }) {
  const base = Math.trunc((itemLevel + 1) * enchantBases[type - 1]);
  return Math.trunc(float(float(float(base) * enchantFactors[level - 1]) * float(1.1)));
}

export function rollEnchantment({ mode, itemLevel, draw }) {
  const roll = draw() % 100 + 1;
  let sum = 0, level = mode === "gold" ? 1 : 3;
  for (const [index, weight] of enchantWeights[mode].entries()) { sum += weight; if (roll <= sum) { level += index; break; } }
  const type = draw() % 8 + 1;
  return { type, level, value: getEnchantmentValue({ type, level, itemLevel }) };
}

export function getOwnedEquipment(state, target) {
  const items = target.source === "bag" ? state.inventory.equipment : target.source === "equipped" ? state.player.equipmentSets[state.player.equipmentSetIndex] : null;
  const item = items?.[target.index];
  if (!item || item.id !== target.id || item.type !== 2 || item.subtype > 8) throw new RangeError("请选择当前持有的普通装备");
  return item;
}

export function replaceOwnedEquipment(state, target, item) {
  if (target.source === "bag") return { ...state, inventory: { ...state.inventory, equipment: state.inventory.equipment.map((entry, index) => index === target.index ? item : entry) } };
  return { ...state, player: { ...state.player, equipmentSets: state.player.equipmentSets.map((set, setIndex) => setIndex === state.player.equipmentSetIndex ? set.map((entry, index) => index === target.index ? item : entry) : set) } };
}

export function upgradeEquipment({ state, target, operation, boost = false, catalog, draw }) {
  const before = getOwnedEquipment(state, target);
  const cost = getUpgradeCost(before, operation, boost);
  if (state.gold < cost.gold || state.money < cost.money) throw new RangeError("金币或魔石不足");
  const inventory = spendGoods(state.inventory, cost.goods);
  let item = { ...before }, success = true;
  if (operation === "strength") { success = draw() % 1001 <= strengthThreshold(item, boost); if (success) item.strength++; }
  else if (operation === "reforge") Object.assign(item, rollEquipmentScore(draw));
  else item.enchantment = rollEnchantment({ mode: operation === "enchantGold" ? "gold" : "money", itemLevel: item.level, draw });
  const row = catalog.items.find((row) => row.id === item.id);
  item.mainAttribute = { ...item.mainAttribute, value: calculateEquipmentMainAttribute({ ...item, mainValue: row.mainvalue, paragonEquipment: Boolean(row.paragon) }) };
  return { state: replaceOwnedEquipment({ ...state, inventory, gold: state.gold - cost.gold, money: state.money - cost.money }, target, item), success, item };
}
