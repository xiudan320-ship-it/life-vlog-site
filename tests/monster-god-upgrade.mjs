import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getGodUpgradeCost, rollNewGodAttribute, upgradeGod } from "../modules/monster/god-upgrade-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [items, skills, fixture] = await Promise.all([read("../public/monster/data/item.json"), read("../public/monster/data/skill.json"), read("./fixtures/monster/native-god-upgrade-costs.json")]);
const catalog = { items, skills };
const godItem = (level, star, count) => ({ level, godLevel: star, godUpgradeCount: count, godOffset: 100,
  attributes: [16, 17, 23, 24, 25].slice(0, star).map((type) => ({ type, value: 1 })) });

test("original bounded UI fragment determines all five material costs and magic stones", () => {
  for (const sample of fixture.cases) {
    if (sample.star - sample.count < 1 || sample.star - sample.count > 3) continue;
    const operation = sample.requestedUpgrade ? "upgrade" : "reset";
    if (operation === "upgrade" && sample.count >= 2 || operation === "reset" && sample.count === 0) continue;
    const cost = getGodUpgradeCost(godItem(sample.level, sample.star, sample.count), operation);
    assert.equal(cost.money, sample.money, JSON.stringify(sample));
    assert.deepEqual(cost.goods, sample.materials.filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, quantity })));
  }
});

test("native rejection draws avoid all current god attributes, including the last one", () => {
  for (const sample of fixture.randomCases) {
    let used = 0;
    const existing = sample.existing.map(([type, value]) => ({ type, value }));
    const result = rollNewGodAttribute(existing, () => sample.rolls[used++]);
    assert.deepEqual([result.type, result.value], sample.result);
    assert.equal(used, sample.rolls.length);
  }
});

test("upgrade and wash preserve base attributes, debit once, and enforce two upgrades", () => {
  let state = createNewGame(catalog);
  const beforeItem = state.player.equipmentSets[0][0];
  const god = { ...beforeItem, quality: 6, godLevel: 1, godOffset: 100,
    attributes: [{ type: 16, value: 22 }, { type: 16, value: 1 }] };
  state.player.equipmentSets[0][0] = god;
  state.money = 100000;
  state.inventory.goods.push(...[5092, 5004, 5040, 5052, 5044].map((id) => ({ id, type: 1, quantity: 10000 })));
  const target = { source: "equipped", index: 0, id: god.id };
  const before = structuredClone(state);
  assert.throws(() => upgradeGod({ state, target, catalog, operation: "reset", draw: () => 1 }), /升星后/);
  const cost = getGodUpgradeCost(god, "upgrade");
  let result = upgradeGod({ state, target, catalog, operation: "upgrade", draw: () => 1 });
  assert.equal(result.item.godLevel, 2); assert.equal(result.item.godUpgradeCount, 1); assert.equal(result.item.godOffset, 110);
  assert.deepEqual(result.item.attributes, [{ type: 16, value: 22 }, { type: 16, value: 1 }, { type: 17, value: 1 }]);
  assert.equal(result.state.money, state.money - cost.money);
  assert.equal(result.state.inventory.goods.find((item) => item.id === 5092).quantity, 10000 - cost.goods[0].quantity);
  assert.deepEqual(state, before); state = result.state;
  const initialRolls = [0, 1, 2]; let draws = 0;
  result = upgradeGod({ state, target, catalog, operation: "reset", draw: () => initialRolls[draws++] });
  assert.equal(draws, 3); assert.equal(result.item.godLevel, 2); assert.equal(result.item.godUpgradeCount, 1);
  assert.deepEqual(result.item.attributes, [{ type: 16, value: 22 }, { type: 16, value: 1 }, { type: 23, value: 1 }]);
  state = result.state;
  result = upgradeGod({ state, target, catalog, operation: "upgrade", draw: () => 1 });
  assert.equal(result.item.godLevel, 3); assert.equal(result.item.godUpgradeCount, 2); assert.equal(result.item.godOffset, 132);
  assert.throws(() => upgradeGod({ state: result.state, target, catalog, operation: "upgrade", draw: () => 0 }), /最多升星两次/);
});

test("invalid data, missing materials and stale targets reject before any random draw", () => {
  let state = createNewGame(catalog); const original = state.player.equipmentSets[0][0];
  const target = { source: "equipped", index: 0, id: original.id };
  const draw = () => { throw new Error("must not draw"); };
  state.player.equipmentSets[0][0] = { ...original, godLevel: 2, godOffset: 100, attributes: [] };
  assert.throws(() => upgradeGod({ state, target, catalog, operation: "upgrade", draw }), /数据不完整/);
  state.player.equipmentSets[0][0] = { ...original, godLevel: 1, godOffset: 100, attributes: [{ type: 16, value: 1 }] };
  state.money = 10000;
  assert.throws(() => upgradeGod({ state, target, catalog, operation: "upgrade", draw }), /材料不足/);
  assert.throws(() => upgradeGod({ state, target: { ...target, id: 1 }, catalog, operation: "upgrade", draw }), /请选择/);
});
