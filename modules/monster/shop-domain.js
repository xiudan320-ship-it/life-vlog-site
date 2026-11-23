import { addBagItem, changeGold } from "./inventory-domain.js";

// Only goods with a use in the current port are offered. The second original
// shop category and items for unimplemented systems remain closed.
const availableItems = new Set([
  5083, 5084, 5085, 5003, 5004, 5009, 5040, 5002, 5052, 5066,
  5070, 5042, 5072, 5067, 5073, 5051, 5105,
]);
const goldLimit = 2000000000;
const stackLimit = 0x7fffffff;

/** The index identifies a particular original bundle, including duplicate IDs. */
export function getShopOffers({ state, catalog }) {
  return catalog.shop.flatMap((offer, index) => {
    if (offer.type !== 1 || !availableItems.has(offer.itemid)) return [];
    const item = catalog.items.find((row) => row.id === offer.itemid);
    if (!item || item.type !== 1 || !Number.isSafeInteger(offer.itemnum) || offer.itemnum < 1
      || !Number.isSafeInteger(offer.itemprice) || offer.itemprice < 1) throw new RangeError("商店商品数据无效");
    const goldOffer = [5083, 5084, 5085].includes(item.id);
    if (goldOffer && (!Number.isSafeInteger(item.price) || item.price < 1)) throw new RangeError("金币商品数据无效");
    const owned = goldOffer ? state.gold : state.inventory.goods.find((entry) => entry.id === item.id)?.quantity || 0;
    const quantity = goldOffer ? Math.max(0, Math.min(item.price, goldLimit - state.gold)) : offer.itemnum;
    const fits = Number.isSafeInteger(owned) && owned >= 0 && (goldOffer ? quantity > 0 : owned <= stackLimit - quantity);
    return [{ index, item, price: offer.itemprice, quantity, owned, goldOffer, fits, affordable: state.money >= offer.itemprice && fits }];
  });
}

/** Spend and credit are returned together so they can be saved in one revision. */
export function purchaseShopOffer({ state, catalog, index }) {
  const offer = getShopOffers({ state, catalog }).find((entry) => entry.index === index);
  if (!offer) throw new RangeError("商品不可购买");
  if (state.money < offer.price) throw new RangeError("魔石不足");
  if (!offer.fits) throw new RangeError(offer.goldOffer ? "金币已达到上限" : "材料数量已达到上限");
  const next = { ...state, money: state.money - offer.price };
  if (offer.goldOffer) next.gold = changeGold({ gold: state.gold, delta: offer.quantity }).gold;
  else next.inventory = addBagItem({ inventory: state.inventory, item: { id: offer.item.id, type: 1, quantity: offer.quantity } });
  return { state: next, offer };
}
