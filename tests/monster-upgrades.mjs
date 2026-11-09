import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getUpgradeCost, getStrengthStoneCost, getEnchantmentValue, upgradeEquipment } from "../modules/monster/upgrade-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { collectEquipmentAttributes } from "../modules/monster/attribute-domain.js";
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [items, skills, fixture] = await Promise.all([read("../public/monster/data/item.json"), read("../public/monster/data/skill.json"), read("./fixtures/monster/native-smith-rules-fixtures.json")]);
const catalog = { items, skills };
test("1520 original equipment costs preserve normal/advanced stones, reforge and enchantment", () => {
  for (const sample of fixture.costs) {
    assert.equal(getStrengthStoneCost(sample, true), sample.stone, `normal ${sample.id} +${sample.strength}`);
    assert.equal(getStrengthStoneCost(sample, false), sample.advancedStone, `advanced ${sample.id} +${sample.strength}`);
    const reset = getUpgradeCost(sample, "reforge");
    assert.deepEqual([reset.goods[0].quantity, reset.gold], sample.reforge, `reforge ${sample.id}`);
    assert.equal(getUpgradeCost(sample, "enchantGold").gold, sample.enchantGold, `gold ${sample.id}`);
    assert.equal(getUpgradeCost(sample, "enchantMoney").money, sample.enchantMoney, `money ${sample.id}`);
  }
});
test("1344 native enchant values preserve all eight stats, seven tiers and float truncation", () => {
  for (const sample of fixture.enchant) {
    const [type, level, itemLevel] = sample.input;
    assert.equal(getEnchantmentValue({ type, level, itemLevel }), sample.expected, sample.input.join(","));
  }
});
test("upgrades spend once, preserve equipment traits and affect worn attributes", () => {
  let state = createNewGame(catalog);
  state.inventory.goods.push({ id: 5003, type: 1, quantity: 1000 }, { id: 5004, type: 1, quantity: 100 }); state.gold = 100000;
  const target = { source: "equipped", index: 0, id: 6001 };
  const original = structuredClone(state);
  let result = upgradeEquipment({ state, target, operation: "strength", catalog, draw: () => 0 });
  assert.ok(result.success); assert.equal(result.item.strength, 1);
  assert.ok(result.item.mainAttribute.value > state.player.equipmentSets[0][0].mainAttribute.value);
  assert.equal(result.state.inventory.goods.find((item) => item.id === 5003).quantity, 999);
  assert.deepEqual(state, original); state = result.state;
  result = upgradeEquipment({ state, target, operation: "reforge", catalog, draw: () => 0 });
  assert.deepEqual([result.item.scoreTier, result.item.scoreValue, result.item.strength], [1, 1, 1]);
  state = result.state;
  result = upgradeEquipment({ state, target, operation: "enchantGold", catalog, draw: () => 0 });
  assert.deepEqual(result.item.enchantment, { type: 1, level: 1, value: 25 });
  const plain = { ...result.item, enchantment: undefined };
  assert.equal(collectEquipmentAttributes([result.item])[0].value - collectEquipmentAttributes([plain])[0].value, 25);
  assert.throws(() => upgradeEquipment({ state: createNewGame(catalog), target, operation: "strength", catalog, draw() { throw new Error("must not draw"); } }), /材料不足/);
  assert.throws(() => upgradeEquipment({ state, target: { ...target, id: 6002 }, operation: "strength", catalog, draw: () => 0 }), /当前持有/);
});
