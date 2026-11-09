import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { rollEnchantment, strengthThreshold, upgradeEquipment } from "../modules/monster/upgrade-domain.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/monster/native-smith-random-fixtures.json", import.meta.url), "utf8"));

test("native enchant levels and types match every roll and quality", () => {
  for (const [mode, quality, subtype, levelRoll, typeRoll, level, type, value, drawCount] of fixture.enchant) {
    const draws = [levelRoll, typeRoll]; let count = 0;
    const actual = rollEnchantment({ mode, itemLevel: 40, draw: () => draws[count++] });
    assert.deepEqual(actual, { level, type, value }, `${mode} quality ${quality} subtype ${subtype} rolls ${levelRoll},${typeRoll}`);
    assert.equal(count, drawCount);
  }
});

test("native enchant type ignores equipment subtype for every random value", () => {
  for (const [subtype, roll, type] of fixture.types) {
    const draws = [0, roll]; let count = 0;
    const actual = rollEnchantment({ mode: "gold", itemLevel: 40, draw: () => draws[count++] });
    assert.equal(actual.type, type, `subtype ${subtype} roll ${roll}`);
    assert.equal(count, 2);
  }
});

test("native strengthening threshold and boundary outcomes match with one draw", () => {
  const catalog = { items: [{ id: 3, mainvalue: 100, paragon: 0 }] };
  for (const [level, strength, boost, roll, threshold, success, drawCount] of fixture.strength) {
    const item = { id: 3, type: 2, subtype: 1, quality: 3, level, strength, scoreTier: 1, scoreValue: 1, mainAttribute: { type: 1, value: 1 } };
    const state = { gold: 0, money: 0, inventory: { goods: [{ id: 5003, quantity: 1000000 }, { id: 5086, quantity: 1000000 }], equipment: [item] } };
    const label = `level ${level} strength ${strength} boost ${boost} roll ${roll}`;
    assert.equal(strengthThreshold(item, boost), threshold, label);
    let count = 0;
    const result = upgradeEquipment({ state, target: { source: "bag", index: 0, id: 3 }, operation: "strength", boost, catalog, draw: () => { count++; return roll; } });
    assert.equal(result.success, success, label);
    assert.equal(count, drawCount, label);
  }
});
