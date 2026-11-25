import { addBagItem, spendGoods } from "./inventory-domain.js";
import { createCatalogEquipment } from "./item-domain.js";
import { calculateSpecialAttributes } from "./special-upgrade-domain.js";
import { achievementProgress, titleStatus } from "./achievement-domain.js";

// The original exchange table also has random equipment and a rename service;
// these are not offered until those original operations are restored.
const unavailableGoods = new Set([5012, 5101, 5103, 5116]);
const limit = 0x7fffffff;

export function getPointShopOffers({ state, catalog }) {
  const points = state.taskBoard?.points || 0;
  const progress = achievementProgress(state);
  return catalog.exchange.flatMap((entry) => {
    if (![1, 2, 6, 7].includes(entry.type) || !entry.itemid) return [];
    const product = entry.type === 6 ? catalog.achievements.find((row) => row.type === 2 && row.id === entry.itemid)
      : entry.type === 7 ? catalog.pets.find((row) => row.id === entry.itemid)
        : catalog.items.find((row) => row.id === entry.itemid && row.type === entry.type);
    if (!product) throw new RangeError(`积分兑换商品缺失：${entry.itemid}`);
    const material = entry.needitem ? catalog.items.find((item) => item.id === entry.needitem) : null;
    if (entry.needitem && !material) throw new RangeError(`积分兑换材料缺失：${entry.needitem}`);
    const owned = entry.type === 1 ? state.inventory.goods.find((item) => item.id === entry.itemid)?.quantity || 0
      : entry.type === 2 ? state.inventory.equipment.filter((item) => item.id === entry.itemid).length + state.player.equipmentSets.flat().filter((item) => item.id === entry.itemid).length
        : entry.type === 7 ? state.inventory.pets.filter((pet) => pet.id === entry.itemid).length : 0;
    const materialOwned = material ? state.inventory.goods.find((item) => item.id === material.id)?.quantity || 0 : 0;
    const unlocked = entry.type === 6 && titleStatus(product, state, catalog).unlocked;
    let reason = "";
    if (unavailableGoods.has(entry.itemid) && entry.type === 1) reason = "该物品的使用功能尚未开放";
    else if (unlocked) reason = "称号已解锁";
    else if (state.player.level < entry.needlevel) reason = `需要角色 ${entry.needlevel} 级`;
    else if (progress.points < entry.achievepoint) reason = `需要成就积分 ${entry.achievepoint}`;
    else if (material && materialOwned < entry.needitemnum) reason = `${material.name}不足`;
    else if (entry.type === 1 && owned + entry.num > limit) reason = "背包数量已达上限";
    else if (points < entry.point) reason = "任务积分不足";
    return [{ ...entry, product, material, materialOwned, owned, reason }];
  });
}

export function purchasePointOffer({ state, catalog, id }) {
  const offer = getPointShopOffers({ state, catalog }).find((entry) => entry.id === id);
  if (!offer) throw new RangeError("兑换商品不存在");
  if (offer.reason) throw new RangeError(offer.reason);
  let inventory = offer.material ? spendGoods(state.inventory, [{ id: offer.material.id, quantity: offer.needitemnum }]) : state.inventory;
  let progress = state.achievementProgress;
  if (offer.type === 1) inventory = addBagItem({ inventory, item: { id: offer.itemid, type: 1, quantity: offer.num } });
  if (offer.type === 2) {
    const item = createCatalogEquipment({ row: offer.product, template: catalog.equipmentTemplates[offer.itemid] });
    if (item.subtype === 9) item.attributes = calculateSpecialAttributes({ item, player: state.player, catalog });
    inventory = addBagItem({ inventory, item });
  }
  if (offer.type === 7) {
    const row = offer.product;
    inventory = { ...inventory, pets: [...inventory.pets, { id: row.id, type: 3, level: row.level, quality: row.quality, experience: 0 }] };
  }
  if (offer.type === 6) {
    const previous = achievementProgress(state);
    progress = { ...previous, purchasedTitles: [...(previous.purchasedTitles || []), offer.itemid] };
  }
  return { state: { ...state, inventory, ...(progress ? { achievementProgress: progress } : {}), taskBoard: { ...state.taskBoard, points: state.taskBoard.points - offer.point } }, offer };
}
