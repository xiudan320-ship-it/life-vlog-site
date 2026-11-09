import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { equipBagItem, toggleEquippedSkill } from "../modules/monster/loadout-domain.js";
import { MAX_EQUIPMENT_STRENGTH, calculateEquipmentMainAttribute, withEquipmentStrength } from "../modules/monster/equipment-domain.js";
import { createCatalogEquipment } from "../modules/monster/item-domain.js";
import { getUpgradeCost, strengthThreshold, upgradeEquipment } from "../modules/monster/upgrade-domain.js";
import { getEquipmentSaleRefund } from "../modules/monster/bag-item-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, equipmentTemplates, pets] = await Promise.all(["item", "skill", "equipment-templates", "pet"].map(read));
const nativeAttributes = JSON.parse(await readFile(new URL("./fixtures/monster/native-equipment-attribute-fixtures.json", import.meta.url), "utf8"));
const catalog = { items, skills, equipmentTemplates, pets };
const row = (id) => items.find((item) => item.id === id);
function gear(id, strength, extras = {}) {
  const base = { ...createCatalogEquipment({ row: row(id), template: equipmentTemplates[id], scoreTier: 4, scoreValue: 100 }), ...extras };
  return withEquipmentStrength(base, strength, row(id));
}
function fixture(oldStrength, newStrength, subtype = 1) {
  const state = createNewGame(catalog); state.player.name = "Strength fixture"; state.player.level = 10;
  const ids = subtype === 1 ? [6001, 6002] : [6101, 6102];
  const old = gear(ids[0], oldStrength, { equipped: true, scoreTier: 3, scoreValue: 31,
    quality: 6, godLevel: 2, godOffset: 11, enchantment: { type: 3, level: 2, value: 42 }, locked: false });
  const incoming = gear(ids[1], newStrength, { equipped: false, scoreTier: 4, scoreValue: 83,
    quality: 6, godLevel: 1, godOffset: 7, enchantment: { type: 1, level: 4, value: 64 }, locked: true });
  state.player.equipmentSets[0] = state.player.equipmentSets[0].map((item) => item.subtype === subtype ? old : item);
  state.inventory.equipment = [incoming];
  return { state, old, incoming };
}
function withoutStrength(item) {
  const { strength, equipped, mainAttribute, ...other } = item;
  return { ...other, mainAttributeType: mainAttribute.type };
}
function assertMain(item) {
  assert.equal(item.mainAttribute.value, calculateEquipmentMainAttribute({ ...item, mainValue: row(item.id).mainvalue,
    paragonEquipment: Boolean(row(item.id).paragon) }));
}

test("original equipment main attributes through +18 retain native results", () => {
  for (const sample of nativeAttributes) {
    assert.deepEqual(calculateEquipmentMainAttribute(sample.input), sample.expected, JSON.stringify(sample.input));
  }
  assert.throws(() => calculateEquipmentMainAttribute({ scoreTier: 4, scoreValue: 100, mainValue: 21, strength: 31 }), /strength/);
});

test("both strengthened items exchange only the levels needed to equip the higher one", () => {
  const { state, old, incoming } = fixture(20, 7);
  const before = structuredClone(state);
  const result = equipBagItem(state, 0, catalog);
  const worn = result.player.equipmentSets[0].find((item) => item.subtype === 1);
  const bagged = result.inventory.equipment[0];
  assert.deepEqual([worn.id, worn.strength, worn.equipped], [6002, 20, true]);
  assert.deepEqual([bagged.id, bagged.strength, bagged.equipped], [6001, 7, false]);
  assert.equal(worn.strength + bagged.strength, old.strength + incoming.strength);
  assert.deepEqual(withoutStrength(worn), withoutStrength(incoming));
  assert.deepEqual(withoutStrength(bagged), withoutStrength(old));
  assertMain(worn); assertMain(bagged);
  assert.deepEqual(state, before);
});

test("stronger incoming equipment keeps both levels, and repeated swaps conserve strength", () => {
  const { state } = fixture(4, 21);
  const first = equipBagItem(state, 0, catalog);
  assert.deepEqual([first.player.equipmentSets[0].find((item) => item.subtype === 1).strength, first.inventory.equipment[0].strength], [21, 4]);
  const second = equipBagItem(first, 0, catalog);
  assert.deepEqual([second.player.equipmentSets[0].find((item) => item.subtype === 1).id, second.player.equipmentSets[0].find((item) => item.subtype === 1).strength,
    second.inventory.equipment[0].id, second.inventory.equipment[0].strength], [6001, 21, 6002, 4]);
  const third = equipBagItem(second, 0, catalog);
  assert.deepEqual([third.player.equipmentSets[0].find((item) => item.subtype === 1).strength, third.inventory.equipment[0].strength], [21, 4]);
  assertMain(third.player.equipmentSets[0].find((item) => item.subtype === 1)); assertMain(third.inventory.equipment[0]);
});

test("transfer is scoped to its slot and excludes badges and skill switches", () => {
  const { state } = fixture(12, 1, 2);
  const weapon = structuredClone(state.player.equipmentSets[0].find((item) => item.subtype === 1));
  const helmet = equipBagItem(state, 0, catalog);
  assert.equal(helmet.player.equipmentSets[0].find((item) => item.subtype === 2).strength, 12);
  assert.deepEqual(helmet.player.equipmentSets[0].find((item) => item.subtype === 1), weapon);
  const changedSkill = toggleEquippedSkill(helmet, 2, skills);
  assert.deepEqual(changedSkill.inventory.equipment, helmet.inventory.equipment);
  assert.deepEqual(changedSkill.player.equipmentSets, helmet.player.equipmentSets);
  const badge = (id, strength, equipped) => ({ ...createCatalogEquipment({ row: row(id), template: equipmentTemplates[id] }), strength, equipped });
  const badgeState = { ...state, player: { ...state.player, equipmentSets: [[...state.player.equipmentSets[0], badge(6860, 5, true)], [], []] },
    inventory: { ...state.inventory, equipment: [badge(6861, 1, false)] } };
  const result = equipBagItem(badgeState, 0, catalog);
  assert.deepEqual([result.player.equipmentSets[0].find((item) => item.subtype === 9).strength, result.inventory.equipment[0].strength], [1, 5]);
});

test("extended strength costs rise and probabilities fall; failure spends without downgrade", () => {
  let previousStone = 0, previousExtra = 0, previousThreshold = Infinity;
  for (let level = 18; level < 30; level++) {
    const { state } = fixture(0, level);
    state.inventory.goods = [{ id: 5086, type: 1, quantity: 10000 }, { id: 5003, type: 1, quantity: 10000 }];
    const target = { source: "bag", index: 0, id: 6002 };
    const item = state.inventory.equipment[0];
    const cost = getUpgradeCost(item, "strength", true);
    const stone = cost.goods.find((good) => good.id === 5086).quantity;
    const extra = cost.goods.find((good) => good.id === 5003).quantity;
    const threshold = strengthThreshold(item, false);
    assert.ok(stone > previousStone && extra > previousExtra && threshold < previousThreshold, `+${level + 1}`);
    assert.equal(strengthThreshold(item, true), threshold + 5);
    const failed = upgradeEquipment({ state, target, operation: "strength", boost: true, catalog, draw: () => 1000 });
    assert.equal(failed.success, false); assert.equal(failed.item.strength, level);
    assert.equal(failed.state.inventory.goods.find((good) => good.id === 5086).quantity, 10000 - stone);
    assert.equal(failed.state.inventory.goods.find((good) => good.id === 5003).quantity, 10000 - extra);
    assertMain(failed.item);
    previousStone = stone; previousExtra = extra; previousThreshold = threshold;
  }
});

test("extended rolls include threshold, stop at +30 and have finite refunds", () => {
  const { state } = fixture(0, 29);
  state.inventory.goods = [{ id: 5086, type: 1, quantity: 10000 }];
  const target = { source: "bag", index: 0, id: 6002 };
  const atThreshold = strengthThreshold(state.inventory.equipment[0], false);
  const success = upgradeEquipment({ state, target, operation: "strength", catalog, draw: () => atThreshold });
  assert.equal(success.success, true); assert.equal(success.item.strength, 30); assert.equal(MAX_EQUIPMENT_STRENGTH, 30);
  assertMain(success.item);
  assert.throws(() => getUpgradeCost(success.item, "strength"), /上限/);
  assert.throws(() => upgradeEquipment({ state: success.state, target, operation: "strength", catalog, draw() { throw new Error("must not draw"); } }), /上限/);
  for (let level = 19; level <= 30; level++) {
    const refund = getEquipmentSaleRefund({ ...success.item, strength: level });
    assert.ok(Number.isSafeInteger(refund) && refund > 0, `+${level}: ${refund}`);
  }
  assert.equal(validateMonsterSave(success.state), success.state);
  const invalid = structuredClone(success.state); invalid.inventory.equipment[0].strength = 31;
  assert.throws(() => validateMonsterSave(invalid), /装备强化/);
});

test("failed cloud save blocks a second swap and retry persists exactly one transfer", async () => {
  const { state: seed } = fixture(20, 7);
  let remote = structuredClone(seed), fail = true, writes = 0, pending;
  const view = new Proxy({}, { get: (_, key) => key === "bag" ? (state) => { pending = structuredClone(state); } : () => Promise.resolve() });
  const store = { load: async () => structuredClone(remote), save: async (state) => {
    writes++; if (fail) throw Object.assign(new Error("offline"), { status: 503 }); remote = structuredClone(state);
  } };
  const controller = createMonsterGameController({ catalog, store, view, random: () => 0, wait: async () => {} });
  await controller.initialize(); await controller.equip(0);
  assert.equal(writes, 1); assert.equal(remote.inventory.equipment[0].id, 6002);
  assert.deepEqual([pending.player.equipmentSets[0].find((item) => item.subtype === 1).strength, pending.inventory.equipment[0].strength], [20, 7]);
  await controller.equip(0); assert.equal(writes, 1);
  fail = false; assert.equal(await controller.save(), true); assert.equal(writes, 2);
  assert.deepEqual(remote.inventory.equipment, pending.inventory.equipment);
  assert.deepEqual(remote.player.equipmentSets, pending.player.equipmentSets);
  assert.equal(validateMonsterSave(remote), remote);
  controller.destroy();
});
