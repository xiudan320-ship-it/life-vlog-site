import assert from "node:assert/strict";
import test from "node:test";
import { craftItem, getCraftRequirements } from "../modules/monster/craft-domain.js";

const catalog = {
  items: [
    { id: 1, name: "矿石", type: 1, subtype: 3 },
    { id: 2, name: "锭", type: 1, subtype: 3 },
    { id: 3, name: "剑", type: 2, subtype: 1, quality: 3, level: 8, maintype: 1, mainvalue: 100 },
    { id: 4, name: "旧徽章", type: 2, subtype: 9, quality: 3, level: 8 },
    { id: 5, name: "新徽章", type: 2, subtype: 9, quality: 4, level: 20 },
  ],
  make: [
    { itemid: 3, price: 12, matid1: 1, matnum1: 2 },
    { itemid: 5, price: 7, matid1: 4, matnum1: 1, matid2: 1, matnum2: 2 },
    { itemid: 2, price: 3, matid1: 1, matnum1: 2 },
  ],
  equipmentTemplates: { 3: { main: [1, 100], sub: [0, 0], baseAttributes: [[2, 10]] }, 5: { main: [0, 0], sub: [0, 0], baseAttributes: [[11, 1], [19, 5]] } },
};
const state = () => ({ gold: 100, money: 20, inventory: { goods: [{ id: 1, type: 1, quantity: 5 }], equipment: [] }, player: { equipmentSets: [[{ id: 4, type: 2, strength: 5, equipped: true }]] } });

test("不足的材料或货币不会消耗资源，也不会抽取评分", () => {
  for (const shortage of ["goods", "gold"]) {
    const input = state();
    if (shortage === "goods") input.inventory.goods[0].quantity = 1;
    else input.gold = 0;
    const before = structuredClone(input);
    assert.throws(() => craftItem({ state: input, itemId: 3, catalog, draw() { throw new Error("不应抽取"); } }), /不足/);
    assert.deepEqual(input, before);
  }
});

test("普通装备抽取评分、扣金币和材料并入背包，不改变原状态", () => {
  const input = state(), before = structuredClone(input), draws = [99, 99, 5];
  const result = craftItem({ state: input, itemId: 3, catalog, draw: () => draws.shift() });
  assert.deepEqual([result.item.scoreTier, result.item.scoreValue], [4, 100]);
  assert.deepEqual(result.item.attributes, [{ type: 2, value: 10 }]);
  assert.equal(result.item.equipped, false);
  assert.equal(result.state.gold, 88);
  assert.equal(result.state.money, 20);
  assert.equal(result.state.inventory.goods[0].quantity, 3);
  assert.deepEqual(result.state.inventory.equipment, [result.item]);
  assert.deepEqual(input, before);
});

test("徽章材料只消耗背包中恰好 +5 的未穿戴装备，使用魔石并保留固定属性", () => {
  const input = state();
  input.inventory.equipment = [4, 6, 5, 5].map((strength, index) => ({ id: 4, type: 2, subtype: 9, strength, equipped: index === 3 }));
  const before = structuredClone(input);
  const requirements = getCraftRequirements({ state: input, itemId: 5, catalog });
  assert.equal(requirements.materials[0].owned, 1);
  const result = craftItem({ state: input, itemId: 5, catalog, draw: () => 0 });
  assert.equal(result.state.gold, 100);
  assert.equal(result.state.money, 13);
  assert.deepEqual(result.item.attributes, [{ type: 11, value: 1 }, { type: 19, value: 5 }]);
  assert.deepEqual(result.item.mainAttribute, { type: 0, value: 0 });
  assert.deepEqual(result.state.inventory.equipment.map((item) => item.strength), [4, 6, 5, 0]);
  assert.deepEqual(result.state.player.equipmentSets, input.player.equipmentSets);
  assert.deepEqual(input, before);
  input.inventory.equipment = input.inventory.equipment.filter((item) => item.strength !== 5 || item.equipped);
  assert.throws(() => craftItem({ state: input, itemId: 5, catalog, draw() { throw new Error("不应抽取"); } }), /材料不足/);
});

test("材料类成品堆叠入背包，不抽装备评分", () => {
  const input = state(); input.inventory.goods.push({ id: 2, type: 1, quantity: 4 });
  const result = craftItem({ state: input, itemId: 2, catalog, draw() { throw new Error("不应抽取"); } });
  assert.equal(result.state.gold, 97);
  assert.equal(result.state.inventory.goods.find((entry) => entry.id === 2).quantity, 5);
  assert.equal(input.inventory.goods.find((entry) => entry.id === 2).quantity, 4);
});
