import { addBagItem, spendGoods } from "./inventory-domain.js";
import { createCatalogEquipment, rollEquipmentScore } from "./item-domain.js";

/** Resolve a recipe against the original item catalog and current bag. */
export function getCraftRequirements({ state, itemId, catalog }) {
  const recipe = catalog.make.find((entry) => entry.itemid === itemId);
  const product = catalog.items.find((entry) => entry.id === itemId);
  if (!recipe || !product || ![1, 2].includes(product.type)) throw new RangeError("找不到可打造的物品");
  if (product.type === 2 && !catalog.equipmentTemplates[itemId]) throw new RangeError("缺少装备模板");
  const totals = new Map();
  for (let index = 1; index <= 6; index++) {
    const id = recipe[`matid${index}`];
    if (!id) continue;
    const row = catalog.items.find((entry) => entry.id === id);
    const quantity = recipe[`matnum${index}`];
    if (!row || ![1, 2].includes(row.type) || !Number.isSafeInteger(quantity) || quantity < 1) throw new RangeError(`打造材料无效：${id}`);
    totals.set(id, { row, quantity: (totals.get(id)?.quantity || 0) + quantity });
  }
  const materials = [...totals.values()].map(({ row, quantity }) => ({
    id: row.id, type: row.type, quantity,
    owned: row.type === 1 ? state.inventory.goods.find((entry) => entry.id === row.id)?.quantity || 0
      : state.inventory.equipment.filter((entry) => entry.id === row.id && entry.strength === 5 && !entry.equipped).length,
  }));
  const currency = product.subtype === 9 && product.type === 2 ? "money" : "gold";
  return { recipe, product, materials, currency, price: recipe.price, affordable: state[currency] >= recipe.price && materials.every((entry) => entry.owned >= entry.quantity) };
}

/** Spend only bag materials, then make one item; inputs remain unchanged. */
export function craftItem({ state, itemId, catalog, draw }) {
  const requirements = getCraftRequirements({ state, itemId, catalog });
  const { product, materials, currency, price } = requirements;
  if (state[currency] < price) throw new RangeError(currency === "gold" ? "金币不足" : "魔石不足");
  if (materials.some((entry) => entry.owned < entry.quantity)) throw new RangeError("打造材料不足");
  let inventory = spendGoods(state.inventory, materials.filter((entry) => entry.type === 1));
  const remaining = new Map(materials.filter((entry) => entry.type === 2).map((entry) => [entry.id, entry.quantity]));
  inventory = { ...inventory, equipment: inventory.equipment.filter((entry) => {
    const count = remaining.get(entry.id) || 0;
    if (count && entry.strength === 5 && !entry.equipped) { remaining.set(entry.id, count - 1); return false; }
    return true;
  }) };
  const item = product.type === 1 ? { id: itemId, type: 1, quantity: 1 }
    : createCatalogEquipment({ row: product, template: catalog.equipmentTemplates[itemId], ...rollEquipmentScore(draw) });
  inventory = addBagItem({ inventory, item });
  return { state: { ...state, inventory, [currency]: state[currency] - price }, item };
}
