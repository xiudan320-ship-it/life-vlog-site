import { spendGoods } from "./inventory-domain.js";
import { replaceOwnedEquipment } from "./upgrade-domain.js";

const multipliers = [1, 1.4, 1.6, 2, 2.5, 3].map(Math.fround);

export function getOwnedSpecial(state, target) {
  const entries = target.source === "bag" ? state.inventory.equipment
    : target.source === "equipped" ? state.player.equipmentSets[state.player.equipmentSetIndex] : null;
  const item = entries?.[target.index];
  if (!item || item.id !== target.id || item.type !== 2 || item.subtype !== 9) throw new RangeError("请选择当前持有的徽章");
  return item;
}

/** The special-upgrade screen looks up a Make record using quality and next level. */
export function getSpecialUpgradeCost(item, catalog) {
  if (!Number.isInteger(item.strength) || item.strength < 0 || item.strength >= 5) throw new RangeError("徽章已达到升级上限 +5");
  const recipeId = 7000 + item.quality * 10 + item.strength + 1;
  const recipe = catalog.make.find((entry) => entry.itemid === recipeId);
  if (!recipe) throw new RangeError("缺少徽章升级配方");
  const goods = [];
  for (let index = 1; index <= 6; index++) {
    const id = recipe[`matid${index}`];
    if (id) goods.push({ id, quantity: recipe[`matnum${index}`] });
  }
  return { recipeId, gold: recipe.price, goods };
}

/** The native badge branch scales template tags; type 20 remains unchanged. */
export function calculateSpecialAttributes({ item, player, catalog }) {
  const row = catalog.items.find((entry) => entry.id === item.id);
  const template = catalog.equipmentTemplates[item.id];
  const factor = multipliers[item.strength];
  if (!row || !template || factor === undefined) throw new RangeError("徽章属性数据无效");
  return template.baseAttributes.map(([type, value]) => {
    if (type === 20) return { type, value };
    let scaled = Math.fround(Math.fround(value) * factor);
    if (row.specialgrow) scaled = Math.fround(scaled * Math.fround(player.level + Math.trunc(player.paragon / 10)));
    return { type, value: Math.trunc(scaled) };
  });
}

export function upgradeSpecial({ state, target, catalog }) {
  const before = getOwnedSpecial(state, target);
  const cost = getSpecialUpgradeCost(before, catalog);
  if (state.gold < cost.gold) throw new RangeError("金币不足");
  const inventory = spendGoods(state.inventory, cost.goods);
  const item = { ...before, strength: before.strength + 1 };
  item.attributes = calculateSpecialAttributes({ item, player: state.player, catalog });
  return { state: replaceOwnedEquipment({ ...state, inventory, gold: state.gold - cost.gold }, target, item), item };
}
