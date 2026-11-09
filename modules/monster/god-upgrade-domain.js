import { calculateEquipmentMainAttribute } from "./equipment-domain.js";
import { spendGoods } from "./inventory-domain.js";
import { getOwnedEquipment, replaceOwnedEquipment } from "./upgrade-domain.js";

// GameEquipment::getGodAttrNotHave; the original draws again on duplicates.
const godTypes = [16, 17, 23, 24, 25, 26, 27, 19, 9, 10];
const godValues = [1, 1, 1, 5, 1, 1, 2, 5, 2, 5];
const float = Math.fround;

function godState(item) {
  const count = item.godUpgradeCount ?? 0;
  if (!Number.isSafeInteger(item.level) || item.level < 1
    || !Number.isSafeInteger(item.godLevel) || item.godLevel < 1 || item.godLevel > 5
    || !Number.isSafeInteger(count) || count < 0 || count > 2 || item.godLevel - count < 1 || item.godLevel - count > 3
    || !Number.isSafeInteger(item.godOffset) || item.godOffset < 0
    || !Array.isArray(item.attributes) || item.attributes.length < item.godLevel) {
    throw new RangeError("神器词条数据不完整，请保留当前存档");
  }
  const attributes = item.attributes.slice(-item.godLevel);
  if (new Set(attributes.map((attribute) => attribute?.type)).size !== item.godLevel
    || attributes.some((attribute) => !attribute || !godTypes.includes(attribute.type) || !Number.isSafeInteger(attribute.value))) {
    throw new RangeError("神器词条数据不完整，请保留当前存档");
  }
  return { count, attributes };
}

export function getGodUpgradeCost(item, operation) {
  const { count } = godState(item);
  if (operation !== "upgrade" && operation !== "reset") throw new RangeError("未知神器操作");
  if (operation === "upgrade" && (count >= 2 || item.godLevel >= 5)) throw new RangeError("神器最多升星两次");
  if (operation === "reset" && count === 0) throw new RangeError("升星后才可洗最后一条神器属性");
  const upgrading = operation === "upgrade";
  const amount = upgrading
    ? (Math.trunc(item.level / 4) + 15 * (item.godLevel + 1)) * (count + 1)
    : Math.trunc((Math.trunc(item.level / 4) + 15 * (item.godLevel - 1)) / 2) * count;
  const money = upgrading ? item.level + 20 * item.godLevel : Math.trunc((item.level + 20 * item.godLevel) / 3);
  const goods = [[5092, Math.trunc(amount / 2)], [5004, amount * 2], [5040, amount],
    [5052, Math.trunc(amount * 2 / 3)], [5044, Math.trunc(amount / 7)]]
    .filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, quantity }));
  return { gold: 0, money, goods };
}

export function rollNewGodAttribute(existing, draw) {
  let index;
  do { index = draw() % godTypes.length; } while (existing.some((attribute) => attribute.type === godTypes[index]));
  return { type: godTypes[index], value: godValues[index] };
}

export function upgradeGod({ state, target, catalog, draw, operation }) {
  const before = getOwnedEquipment(state, target);
  const { count, attributes } = godState(before);
  const cost = getGodUpgradeCost(before, operation);
  if (state.money < cost.money) throw new RangeError("魔石不足");
  const inventory = spendGoods(state.inventory, cost.goods);
  const row = catalog.items.find((entry) => entry.id === before.id);
  if (!row) throw new RangeError("缺少装备目录");
  const next = rollNewGodAttribute(attributes, draw);
  const item = { ...before, attributes: [...before.attributes] };
  if (operation === "upgrade") {
    item.godLevel += 1;
    item.godUpgradeCount = count + 1;
    item.attributes.push(next);
    item.godOffset = Math.trunc(float(float(before.godOffset) * float(float(float(item.godUpgradeCount) * float(0.1)) + float(1))));
    item.mainAttribute = { ...item.mainAttribute, value: calculateEquipmentMainAttribute({ ...item, mainValue: row.mainvalue, paragonEquipment: Boolean(row.paragon) }) };
  } else {
    item.godUpgradeCount = count;
    item.attributes[item.attributes.length - 1] = next;
  }
  return { state: replaceOwnedEquipment({ ...state, inventory, money: state.money - cost.money }, target, item), item, success: true };
}
