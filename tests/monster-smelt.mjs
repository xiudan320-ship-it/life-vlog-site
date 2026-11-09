import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getSmeltPreview, smeltItems } from "../modules/monster/smelt-domain.js";
import { rollGemEquipment } from "../modules/monster/gem-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { equipBagItem } from "../modules/monster/loadout-domain.js";
import { collectEquipmentAttributes } from "../modules/monster/attribute-domain.js";
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [items, skills, equipmentTemplates, fixture] = await Promise.all([read("../public/monster/data/item.json"), read("../public/monster/data/skill.json"), read("../public/monster/data/equipment-templates.json"), read("./fixtures/monster/native-smelt-rules-fixtures.json")]);
const catalog = { items, skills, equipmentTemplates };

test("144 native minimum-quality gem generations preserve results and draw consumption", () => {
  for (const sample of fixture.gems) {
    let used = 0;
    const actual = rollGemEquipment({ ...sample.input, draw: () => sample.rolls[used++] });
    assert.deepEqual(actual, sample.expected, JSON.stringify(sample.input));
    assert.equal(used, sample.rolls.length);
  }
});

test("144 native equipment smelt scores preserve quality floors and success probabilities", () => {
  for (const sample of fixture.equipment) {
    const { count, strength, star, enchant, tier, bonus } = sample.input;
    const state = createNewGame(catalog); state.player.level = 80; state.player.smeltBonus = bonus;
    state.inventory.equipment = Array.from({ length: count }, () => ({ id: 6045, type: 2, subtype: 1, equipped: false, godLevel: star, level: 80, strength, scoreTier: tier, enchantment: { level: enchant } }));
    const actual = getSmeltPreview({ state, mode: "equipment", selection: Array.from({ length: count }, (_, i) => i), catalog });
    assert.deepEqual({ score: actual.score, minimumQuality: actual.minimumQuality, rate: actual.rate }, sample.expected);
    assert.equal(actual.gold, 1205000);
  }
});

test("36 native material smelt outcomes preserve total score, price, quantity and one draw", () => {
  for (const sample of fixture.goods) {
    const { id, quantity, roll } = sample.input;
    const state = createNewGame(catalog); state.gold = 10000000;
    state.inventory.goods.push({ id, type: 1, quantity: quantity + 10 });
    const selection = [{ id, quantity }];
    const preview = getSmeltPreview({ state, mode: "goods", selection, catalog });
    let used = 0;
    const result = smeltItems({ state, mode: "goods", selection, catalog, draw: () => { used++; return roll; } });
    assert.equal(preview.score, sample.expected.score);
    assert.equal(state.gold - result.state.gold, sample.expected.gold);
    assert.equal(result.items[0]?.quantity || 0, sample.expected.quantity);
    assert.equal(result.state.inventory.goods.find((item) => item.id === id).quantity, 10);
    assert.equal(used, sample.drawCount);
  }
});

test("smelt failures consume only selected bag items; invalid or unaffordable choices consume nothing", () => {
  const state = createNewGame(catalog); state.gold = 1000000;
  state.inventory.equipment.push({ ...state.player.equipmentSets[0][0], equipped: false, quality: 6, godLevel: 1, godOffset: 0 });
  const original = structuredClone(state);
  const result = smeltItems({ state, mode: "equipment", selection: [0], catalog, draw: () => 100 });
  assert.equal(result.success, false); assert.equal(result.state.inventory.equipment.length, 0);
  assert.equal(result.state.player.equipmentSets[0].length, 8);
  assert.equal(result.state.gold, state.gold - 20000);
  assert.deepEqual(state, original);
  state.inventory.equipment[0].locked = true;
  assert.throws(() => smeltItems({ state, mode: "equipment", selection: [0], catalog, draw() { throw new Error("draw"); } }), /未锁定/);
  state.inventory.equipment[0].locked = false; state.gold = 0;
  assert.throws(() => smeltItems({ state, mode: "equipment", selection: [0], catalog, draw() { throw new Error("draw"); } }), /金币不足/);
});

test("smelted subtype-13 badges equip by level, stack stats and replace only the same subtype", () => {
  const state = createNewGame(catalog); state.player.level = 30;
  const gem = { id: 6913, type: 2, subtype: 13, level: 30, paragonGrowth: 800, equipped: false, attributes: [{ type: 1, value: 50 }] };
  state.inventory.equipment.push(gem, { ...gem, id: 6911, subtype: 11 });
  let equipped = equipBagItem(state, 0, catalog); equipped = equipBagItem(equipped, 0, catalog);
  assert.equal(equipped.player.equipmentSets[0].filter((item) => item.subtype >= 11).length, 2);
  assert.equal(collectEquipmentAttributes(equipped.player.equipmentSets[0]).find((entry) => entry.type === 1).value - collectEquipmentAttributes(state.player.equipmentSets[0]).find((entry) => entry.type === 1).value, 100);
  equipped.inventory.equipment.push({ ...gem, attributes: [{ type: 1, value: 80 }] });
  const replaced = equipBagItem(equipped, 0, catalog);
  assert.equal(replaced.inventory.equipment[0].id, 6913);
  assert.equal(replaced.inventory.equipment[0].equipped, false);
  assert.equal(replaced.player.equipmentSets[0].filter((item) => item.subtype === 13).length, 1);
});
