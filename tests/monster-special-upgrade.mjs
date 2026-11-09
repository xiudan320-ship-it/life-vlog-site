import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { calculateSpecialAttributes, getSpecialUpgradeCost, upgradeSpecial } from "../modules/monster/special-upgrade-domain.js";
import { craftItem } from "../modules/monster/craft-domain.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/monster/native-special-upgrade-fixtures.json", import.meta.url), "utf8"));

test("native badge attributes and quality-based recipe selection match", () => {
  for (const sample of fixture.cases) {
    const item = { id: sample.id, type: 2, subtype: 9, quality: sample.quality, strength: sample.strength };
    const catalog = {
      items: [{ id: item.id, specialgrow: sample.specialgrow }],
      equipmentTemplates: { [item.id]: { baseAttributes: sample.baseAttributes } },
      make: [{ itemid: sample.recipeId, price: 1 }],
    };
    const attributes = calculateSpecialAttributes({ item, player: { level: sample.level, paragon: sample.paragon }, catalog });
    assert.deepEqual(attributes.map(({ type, value }) => [type, value]), sample.attributes, `${sample.id} +${sample.strength} level ${sample.level} paragon ${sample.paragon}`);
    if (sample.strength < 5) assert.equal(getSpecialUpgradeCost(item, catalog).recipeId, sample.recipeId);
    else assert.throws(() => getSpecialUpgradeCost(item, catalog), /上限/);
  }
});

test("badge upgrade consumes its recipe and preserves the original bag state", () => {
  const item = { id: 6814, type: 2, subtype: 9, quality: 6, strength: 0, attributes: [{ type: 17, value: 2 }, { type: 20, value: 1 }] };
  const catalog = { items: [{ id: 6814, specialgrow: 0 }], equipmentTemplates: { 6814: { baseAttributes: [[17, 2], [20, 1]] } }, make: [{ itemid: 7061, price: 1875000, matid1: 5058, matnum1: 10, matid2: 5042, matnum2: 10, matid3: 5065, matnum3: 10 }] };
  const state = { gold: 2000000, player: { level: 10, paragon: 0, equipmentSetIndex: 0, equipmentSets: [[]] }, inventory: { goods: [5058, 5042, 5065].map((id) => ({ id, type: 1, quantity: 11 })), equipment: [item] } };
  const target = { source: "bag", index: 0, id: 6814 }, original = structuredClone(state);
  const result = upgradeSpecial({ state, target, catalog });
  assert.equal(result.item.strength, 1);
  assert.deepEqual(result.item.attributes, [{ type: 17, value: 2 }, { type: 20, value: 1 }]);
  assert.equal(result.state.gold, 125000);
  assert.deepEqual(result.state.inventory.goods.map((good) => good.quantity), [1, 1, 1]);
  assert.deepEqual(state, original);
  const missing = structuredClone(state); missing.inventory.goods[0].quantity = 9;
  assert.throws(() => upgradeSpecial({ state: missing, target, catalog }), /材料不足/);
  assert.equal(missing.gold, 2000000);
});

test("equipped badge remains equipped and cannot be confused with another target", () => {
  const item = { id: 6801, type: 2, subtype: 9, quality: 3, strength: 0, equipped: true };
  const catalog = { items: [{ id: 6801, specialgrow: 0 }], equipmentTemplates: { 6801: { baseAttributes: [[11, 1]] } }, make: [{ itemid: 7031, price: 2, matid1: 1, matnum1: 1 }] };
  const state = { gold: 3, player: { level: 1, paragon: 0, equipmentSetIndex: 0, equipmentSets: [[item]] }, inventory: { goods: [{ id: 1, type: 1, quantity: 1 }], equipment: [] } };
  const target = { source: "equipped", index: 0, id: 6801 };
  const result = upgradeSpecial({ state, target, catalog });
  assert.equal(result.state.player.equipmentSets[0][0].strength, 1);
  assert.equal(result.state.player.equipmentSets[0][0].equipped, true);
  assert.equal(state.player.equipmentSets[0][0].strength, 0);
  assert.throws(() => upgradeSpecial({ state, target: { ...target, id: 999 }, catalog }), /当前持有/);
});

test("five upgrades produce an eligible +5 badge for a crafting recipe", () => {
  const item = { id: 6801, type: 2, subtype: 9, quality: 3, strength: 0 };
  const catalog = {
    items: [{ id: 1, type: 1 }, { id: 2, type: 1, subtype: 3 }, { id: 6801, type: 2, subtype: 9, specialgrow: 0 }],
    equipmentTemplates: { 6801: { baseAttributes: [[11, 1]] } },
    make: [...Array.from({ length: 5 }, (_, i) => ({ itemid: 7031 + i, price: 1, matid1: 1, matnum1: 1 })), { itemid: 2, price: 1, matid1: 6801, matnum1: 1 }],
  };
  let state = { gold: 6, money: 0, player: { level: 1, paragon: 0, equipmentSetIndex: 0, equipmentSets: [[]] }, inventory: { goods: [{ id: 1, type: 1, quantity: 5 }], equipment: [item] } };
  for (let i = 0; i < 5; i++) state = upgradeSpecial({ state, target: { source: "bag", index: 0, id: 6801 }, catalog }).state;
  assert.equal(state.inventory.equipment[0].strength, 5);
  const result = craftItem({ state, itemId: 2, catalog, draw() { throw new Error("不应抽取"); } });
  assert.equal(result.state.inventory.equipment.length, 0);
  assert.equal(result.state.inventory.goods.find((good) => good.id === 2).quantity, 1);
});
