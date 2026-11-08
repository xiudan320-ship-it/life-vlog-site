import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { rollEquipmentScore, rollGodEquipment, createCatalogEquipment } from "../modules/monster/item-domain.js";
import { rollGemEquipment } from "../modules/monster/gem-domain.js";
import { rollParagonEquipment } from "../modules/monster/paragon-equipment-domain.js";
import { collectEquipmentAttributes } from "../modules/monster/attribute-domain.js";
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const items = await read("../public/monster/data/item.json");
const fixture = await read("./fixtures/monster/native-item-construction-fixtures.json");
test("all 355 equipment records preserve native score and main stats in 3195 cases", () => {
  for (const item of fixture.cases) {
    let used = 0;
    const score = rollEquipmentScore(() => { used += 1; return item.roll; });
    const row = items.find((row) => row.id === item.id);
    const result = createCatalogEquipment({ row, template: item.base, ...score });
    const { attributes, ...expected } = item.expected;
    assert.ok(Array.isArray(attributes));
    assert.deepEqual({ ...score, main: [result.mainAttribute.type, result.mainAttribute.value], sub: [result.secondaryAttribute.type, result.secondaryAttribute.value] }, expected, `item ${item.id} roll ${item.roll}`);
    assert.equal(used, item.drawCount);
  }
});

const collected = await read("./fixtures/monster/native-dropped-equipment-collection.json");
test("608 actual native equipment collections preserve raw and special attributes", () => {
  const sort = (values) => [...values].sort((a, b) => a[0] - b[0]);
  for (const item of collected.cases) {
    const row = items.find((row) => row.id === item.id);
    const template = fixture.cases.find((entry) => entry.id === row.id).base;
    const score = rollEquipmentScore(() => item.roll);
    const result = createCatalogEquipment({ row, template, ...score });
    const attributes = collectEquipmentAttributes([result, { mainAttribute: { type: 1, value: 40 }, secondaryAttribute: { type: 3, value: 40 } }]);
    assert.deepEqual(sort(attributes.map(({ type, value }) => [type, value])), sort(item.attributes), `item ${item.id}`);
  }
});

const gems = await read("./fixtures/monster/native-gem-equipment-fixtures.json");
test("all four original gem types preserve 256 generation cases and RNG consumption", () => {
  for (const item of gems.cases) {
    let used = 0;
    assert.deepEqual(rollGemEquipment({ ...item.input, draw: () => item.rolls[used++] }), item.expected);
    assert.equal(used, item.rolls.length);
  }
});
const godFixture = await read("./fixtures/monster/native-god-equipment-fixtures.json");
test("God equipment stars and unique attributes match 224 original native rolls", () => {
  for (const item of godFixture.cases) {
    let used = 0;
    assert.deepEqual(rollGodEquipment({ ...item.input, draw: () => item.rolls[used++] }), item.expected);
    assert.equal(used, item.rolls.length);
  }
});

const paragonFixture = await read("./fixtures/monster/native-paragon-equipment-fixtures.json");
test("all paragon equipment preserves 384 native complete generation sequences", () => {
  for (const item of paragonFixture.cases) {
    let used = 0;
    const draw = () => item.rolls[used++];
    const row = items.find((row) => row.id === item.input.id);
    const template = fixture.cases.find((entry) => entry.id === row.id).base;
    const score = rollEquipmentScore(draw);
    const god = rollGodEquipment({ mode: 6, mainValue: row.mainvalue, draw });
    const paragon = rollParagonEquipment({ level: row.level, paragon: item.input.paragon, fixedAttributes: template.attributes, draw });
    const result = createCatalogEquipment({ row, template, ...score, god, paragon });
    assert.deepEqual({ quality: god.quality, ...score, godLevel: god.godLevel, godOffset: god.godOffset, paragonGrowth: paragon.paragonGrowth, main: [result.mainAttribute.type, result.mainAttribute.value], attributes: template.attributes, baseAttributes: paragon.attributes, godAttributes: god.attributes }, item.expected);
    assert.equal(used, item.rolls.length);
  }
});
