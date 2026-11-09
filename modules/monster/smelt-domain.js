import { addBagItem, spendGoods } from "./inventory-domain.js";
import { createCatalogEquipment } from "./item-domain.js";
import { rollGemEquipment } from "./gem-domain.js";

const float = Math.fround;

export function canSmeltEquipment(item, player) {
  return item.type === 2 && !item.equipped && !item.locked && item.godLevel > 0 && item.level > player.level - 15;
}

export function getSmeltPreview({ state, mode, selection, catalog }) {
  if (mode === "equipment") {
    const indexes = [...new Set(selection)];
    if (indexes.length !== selection.length || !indexes.length || indexes.some((index) => !Number.isSafeInteger(index) || index < 0)) throw new RangeError("请选择背包中的神器装备");
    const items = indexes.map((index) => state.inventory.equipment[index]);
    if (items.some((item) => !item || !canSmeltEquipment(item, state.player))) throw new RangeError("只能熔炼未穿戴、未锁定且相近等级的神器");
    const score = items.reduce((sum, item) => sum + item.godLevel * 2 + item.strength + (item.enchantment?.level || 0) + item.scoreTier, 0);
    const rate = Math.min(100, Math.trunc(float(float(indexes.length * 20) * float(float(float(state.player.smeltBonus || 0) / float(100)) + float(1)))));
    return { mode, score, rate, minimumQuality: Math.min(4, Math.trunc(score / 30) + 2), gold: state.player.level * 15000 + state.player.paragon * 5000, indexes };
  }
  if (mode !== "goods" || !selection.length) throw new RangeError("请选择可熔炼的材料");
  const ids = new Set(); let score = 0;
  for (const item of selection) {
    const row = catalog.items.find((row) => row.id === item.id);
    if (ids.has(item.id) || !row || row.type !== 1 || row.quality <= 4 || !row.smelt || !Number.isSafeInteger(item.quantity) || item.quantity < 10 || item.quantity % 10) throw new RangeError("熔炼材料需以 10 个为一组选择");
    if ((state.inventory.goods.find((good) => good.id === item.id)?.quantity || 0) < item.quantity) throw new RangeError("熔炼材料不足");
    ids.add(item.id); score += item.quantity * (row.quality - 4);
  }
  // The original material-confirm action explicitly sets its bonus to 25.
  const divisor = Math.trunc(float(float(float(1) - float(float(25) / float(100))) * float(100)));
  const guaranteed = Math.trunc(score / divisor);
  const remainder = score - guaranteed * divisor;
  return { mode, score, gold: score * 3000 + 50000, guaranteed, rate: Math.min(100, Math.trunc(float(float(remainder) * float(1.25)))), goods: selection.map((item) => ({ ...item })) };
}

export function smeltItems({ state, mode, selection, catalog, draw }) {
  const preview = getSmeltPreview({ state, mode, selection, catalog });
  if (state.gold < preview.gold) throw new RangeError("熔炼金币不足");
  let inventory, items = [], success;
  if (mode === "equipment") {
    inventory = { ...state.inventory, equipment: state.inventory.equipment.filter((_, index) => !preview.indexes.includes(index)) };
    success = draw() % 101 <= preview.rate;
    if (success) {
      draw(); // Native action consumes an additional presentation roll before construction.
      const gem = rollGemEquipment({ level: state.player.level, paragon: state.player.paragon, minimumQuality: preview.minimumQuality, draw });
      const row = catalog.items.find((row) => row.id === 6913);
      items.push({ ...createCatalogEquipment({ row, template: catalog.equipmentTemplates[row.id] }),
        level: gem.level, quality: gem.quality, paragonGrowth: gem.paragonGrowth,
        attributes: gem.baseAttributes.map(([type, value]) => ({ type, value })) });
    }
  } else {
    inventory = spendGoods(state.inventory, preview.goods);
    const quantity = preview.guaranteed + Number(draw() % 101 <= preview.rate);
    success = quantity > 0;
    if (quantity) items.push({ id: 5104, type: 1, quantity });
  }
  for (const item of items) inventory = addBagItem({ inventory, item });
  return { state: { ...state, gold: state.gold - preview.gold, inventory }, success, items };
}
