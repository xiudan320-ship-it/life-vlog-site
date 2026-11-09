import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getEquipmentSaleValue, getEquipmentSaleRefund, getItemSalePreview, sellBagItem, toggleBagEquipmentLock } from "../modules/monster/bag-item-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { canSmeltEquipment } from "../modules/monster/smelt-domain.js";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [items, skills, native] = await Promise.all([read("../public/monster/data/item.json"), read("../public/monster/data/skill.json"), read("./fixtures/monster/native-item-sale-fixtures.json")]);
const catalog = { items, skills };
function fixture() {
  const state = createNewGame(catalog);
  state.inventory.goods = [{ id: 5003, type: 1, quantity: 30 }, { id: 5063, type: 1, quantity: 12 }];
  state.inventory.equipment = [{ ...state.player.equipmentSets[0][0], equipped: false, strength: 5 }];
  return state;
}
const gear = { kind: "equipment", index: 0, id: 6001 };

test("5115 native sale/refund cases preserve score tiers, enchantment, stars and strength boundaries", () => {
  assert.equal(native.equipment.length + native.variants.length, 5115);
  for (const sample of [...native.equipment, ...native.variants]) {
    const item = { ...sample.input, enchantment: { level: sample.input.enchantLevel } };
    const label = JSON.stringify(sample.input);
    assert.equal(getEquipmentSaleValue(item, item), sample.expected.value, `value ${label}`);
    assert.equal(getEquipmentSaleRefund(item), sample.expected.refund, `refund ${label}`);
  }
});

test("goods sales use original useid currency and validate the quantity before spending", () => {
  const state = fixture(), before = structuredClone(state);
  const sold = sellBagItem({ state, target: { kind: "goods", id: 5003 }, quantity: 7, catalog });
  assert.equal(sold.state.gold, state.gold + 700);
  assert.equal(sold.state.inventory.goods[0].quantity, 23);
  const magic = sellBagItem({ state, target: { kind: "goods", id: 5063 }, quantity: 12, catalog });
  assert.equal(magic.state.gold, state.gold);
  assert.equal(magic.state.money, state.money + 60);
  assert.ok(!magic.state.inventory.goods.some((item) => item.id === 5063));
  for (const quantity of [0, -1, 31, 1.5, NaN]) assert.throws(() => sellBagItem({ state, target: { kind: "goods", id: 5003 }, quantity, catalog }), /数量无效/);
  const small = { ...state, inventory: { ...state.inventory, goods: [{ id: 5003, type: 1, quantity: 9 }] } };
  assert.throws(() => sellBagItem({ state: small, target: { kind: "goods", id: 5003 }, quantity: 2, catalog }), /数量无效/);
  assert.deepEqual(state, before);
});

test("equipment decomposition returns the native currency and correct material for each subtype", () => {
  const state = fixture();
  const normal = sellBagItem({ state, target: gear, catalog });
  assert.equal(normal.state.inventory.equipment.length, 0);
  assert.equal(normal.reward.gold, 203);
  assert.deepEqual(normal.reward.items, [{ id: 5003, type: 1, quantity: getEquipmentSaleRefund(state.inventory.equipment[0]) }]);
  const artifact = { ...state.inventory.equipment[0], quality: 6, godLevel: 3, strength: 18 };
  state.inventory.equipment = [artifact];
  const god = getItemSalePreview({ state, target: gear, catalog });
  assert.equal(god.gold, 0);
  assert.deepEqual(god.items.map(({ id }) => id), [5092, 5086]);
  assert.equal(god.items[0].quantity, 3);
  state.inventory.equipment = [{ ...artifact, id: 6802, subtype: 9, quality: 4, strength: 2 }];
  const special = getItemSalePreview({ state, target: { ...gear, id: 6802 }, catalog });
  assert.ok(special.gold > 0);
  assert.deepEqual(special.items, [{ id: 5056, type: 1, quantity: 4 }]);
  state.inventory.equipment = [{ ...artifact, id: 6913, subtype: 13, level: 30 }];
  const badge = getItemSalePreview({ state, target: { ...gear, id: 6913 }, catalog });
  assert.equal(badge.gold, 15000 + items.find((item) => item.id === 6913).price + 18000);
  assert.deepEqual(badge.items, []);
});

test("locks protect decomposition and existing smelting; stale/equipped targets cannot be sold", () => {
  const state = fixture(), locked = toggleBagEquipmentLock({ state, target: gear, catalog });
  assert.equal(state.inventory.equipment[0].locked, undefined);
  assert.equal(locked.inventory.equipment[0].locked, true);
  assert.throws(() => sellBagItem({ state: locked, target: gear, catalog }), /锁定中/);
  assert.equal(canSmeltEquipment({ ...locked.inventory.equipment[0], godLevel: 1 }, state.player), false);
  const unlocked = toggleBagEquipmentLock({ state: locked, target: gear, catalog });
  assert.equal(unlocked.inventory.equipment[0].locked, false);
  assert.throws(() => sellBagItem({ state, target: { ...gear, index: -1 }, catalog }), /当前背包/);
  assert.throws(() => sellBagItem({ state, target: { ...gear, id: 6002 }, catalog }), /当前背包/);
  const worn = { ...state, inventory: { ...state.inventory, equipment: [{ ...state.inventory.equipment[0], equipped: true }] } };
  assert.throws(() => sellBagItem({ state: worn, target: gear, catalog }), /当前背包/);
  assert.equal(sellBagItem({ state: { ...state, gold: 1999999999 }, target: gear, catalog }).state.gold, 2000000000);
});

test("failed sale/lock saves block later mutations; retry persists the existing result once", async () => {
  let remote = fixture(), fail = true, writes = 0;
  const displays = [], notices = [];
  const view = new Proxy({}, { get: (_, key) => key === "notice" ? (text) => notices.push(text) : (...args) => { displays.push([key, ...args]); return Promise.resolve(); } });
  const controller = createMonsterGameController({ catalog, store: { load: async () => remote, save: async (state) => { writes++; if (fail) throw new Error("fixture save failure"); remote = structuredClone(state); } }, view, random: () => 0, wait: async () => {} });
  await controller.initialize();
  await controller.sellItem({ kind: "goods", id: 5003 }, 7);
  assert.equal(writes, 1);
  assert.equal(remote.inventory.goods[0].quantity, 30);
  assert.equal(displays.findLast(([key]) => key === "bag")[4].saved, false);
  await controller.sellItem({ kind: "goods", id: 5003 }, 7);
  await controller.toggleItemLock(gear);
  assert.equal(writes, 1); assert.ok(notices.some((text) => /重试保存/.test(text)));
  fail = false; assert.equal(await controller.save(), true);
  assert.equal(writes, 2); assert.equal(remote.gold, 1700); assert.equal(remote.inventory.goods[0].quantity, 23);
  fail = true; await controller.toggleItemLock(gear); assert.equal(remote.inventory.equipment[0].locked, undefined);
  await controller.sellItem(gear, 1); assert.equal(writes, 3);
  fail = false; await controller.save(); assert.equal(remote.inventory.equipment[0].locked, true);
  await controller.sellItem(gear, 1); assert.equal(writes, 4);
  assert.equal(remote.inventory.equipment.length, 1);
});

test("authentication and version conflicts retain their recovery status in the bag receipt", async () => {
  for (const status of [401, 409]) {
    const receipts = [];
    const view = new Proxy({}, { get: (_, key) => (...args) => { if (["bag", "bagItem"].includes(key)) receipts.push(args.at(-1)); return Promise.resolve(); } });
    const controller = createMonsterGameController({ catalog, store: { load: async () => fixture(), save: async () => { throw Object.assign(new Error("fixture recovery"), { status }); } }, view });
    await controller.initialize(); await controller.sellItem({ kind: "goods", id: 5003 }, 1);
    assert.deepEqual([receipts[0].saved, receipts[0].status], [false, status]);
  }
});
