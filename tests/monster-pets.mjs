import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { calculatePetCore, calculateMainPetContribution, getPetSummary, assignMainPet, collectMainPetAttributes } from "../modules/monster/pet-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { calculatePlayerCoreAttributes, collectEquipmentAttributes, sumAttributes } from "../modules/monster/attribute-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [items, skills, pets, factories, contributions] = await Promise.all([read("../public/monster/data/item.json"), read("../public/monster/data/skill.json"), read("../public/monster/data/pet.json"), read("./fixtures/monster/native-pet-rules-fixtures.json"), read("./fixtures/monster/native-main-pet-contribution-fixtures.json")]);
const catalog = { items, skills, pets };
const coreKeys = ["attack", "defense", "maxHp", "hit", "dodge", "crit", "critHurt", "resistance"];
function fixture() {
  const state = createNewGame(catalog); state.player.level = 35;
  state.inventory.pets = [4001, 4026, 4026].map((id) => ({ id, type: 3, level: 1, quality: pets.find((row) => row.id === id).quality, experience: 0 }));
  return state;
}

test("26 original pet factories preserve initial stats and fixed loyalty/star/growth defaults", () => {
  assert.equal(factories.factories.length, 26);
  for (const sample of factories.factories) {
    const row = pets.find((row) => row.id === sample.id);
    assert.deepEqual(calculatePetCore({ row }), Object.fromEntries(coreKeys.map((key) => [key, sample.values[key]])), String(sample.id));
    assert.deepEqual([sample.values.loyalty, sample.values.stars, sample.values.growth], [90, 0, 0]);
  }
});

test("353 native main-pet cases retain the level gate, loyalty thresholds and two float truncations", () => {
  assert.equal(contributions.cases.length, 353);
  for (const sample of contributions.cases) {
    const input = { row: pets.find((row) => row.id === sample.input.petId), playerLevel: sample.input.playerLevel, level: sample.input.petLevel, quality: sample.input.quality, loyalty: sample.input.loyalty, stars: sample.input.star, growth: sample.input.growth };
    assert.deepEqual(calculateMainPetContribution(input), sample.contribution, JSON.stringify(sample.input));
    if (sample.petCore) assert.deepEqual(calculatePetCore(input), sample.petCore, JSON.stringify(sample.input));
  }
});

test("main-pet assignment distinguishes duplicate owned pets, replaces and removes without changing ownership", () => {
  const state = fixture(), before = structuredClone(state);
  const first = assignMainPet({ state, catalog, target: { index: 1, id: 4026 }, enabled: true });
  const replaced = assignMainPet({ state: first, catalog, target: { index: 2, id: 4026 }, enabled: true });
  assert.deepEqual(replaced.inventory.pets.map((pet) => pet.main), [false, false, true]);
  assert.equal(replaced.inventory.pets.length, 3);
  assert.equal(getPetSummary({ state: replaced, catalog, target: { index: 2, id: 4026 } }).selected, true);
  const removed = assignMainPet({ state: replaced, catalog, target: { index: 2, id: 4026 }, enabled: false });
  assert.deepEqual(collectMainPetAttributes({ state: removed, catalog }), []);
  assert.deepEqual(state, before);
  assert.throws(() => assignMainPet({ state, catalog, target: { index: 1, id: 4001 }, enabled: true }), /当前持有/);
  assert.throws(() => assignMainPet({ state: { ...state, player: { ...state.player, level: 34 } }, catalog, target: { index: 0, id: 4001 }, enabled: true }), /35/);
});

test("pet tags combine with equipment, affect all eight player stats once and preserve current HP", async () => {
  const seed = fixture(), snapshots = [];
  const view = new Proxy({}, { get: () => () => Promise.resolve() });
  let remote = seed;
  const make = () => createMonsterGameController({ catalog, view, store: { load: async () => structuredClone(remote), save: async (state) => { remote = structuredClone(state); snapshots.push(remote); } } });
  let controller = make(); await controller.initialize();
  const equipment = [...seed.player.equipmentSets[0], ...seed.inventory.wings.filter((item) => item.id === seed.player.wingId)];
  const expectedBase = calculatePlayerCoreAttributes({ level: 35, paragon: seed.player.paragon, attributes: collectEquipmentAttributes(equipment) });
  await controller.setMainPet({ index: 1, id: 4026 }, true);
  const contribution = collectMainPetAttributes({ state: remote, catalog });
  const expected = calculatePlayerCoreAttributes({ level: 35, paragon: seed.player.paragon, attributes: sumAttributes([...collectEquipmentAttributes(equipment), ...contribution]) });
  for (const key of coreKeys) assert.equal(remote.player[key], expected[key]);
  assert.equal(remote.player.attack - expectedBase.attack, 81);
  assert.equal(remote.player.hp, seed.player.hp);
  const saved = structuredClone(remote); controller.destroy(); controller = make(); await controller.initialize(); await controller.save();
  assert.deepEqual(remote, saved);
  await controller.setMainPet({ index: 1, id: 4026 }, false);
  for (const key of coreKeys) assert.equal(remote.player[key], expectedBase[key]);
  assert.equal(remote.inventory.pets.length, seed.inventory.pets.length);
});

test("failed main-pet writes preserve the pending selection and block further mutations until retry", async () => {
  let remote = fixture(), fail = true, writes = 0;
  const receipts = [], notices = [];
  const view = new Proxy({}, { get: (_, key) => key === "notice" ? (text) => notices.push(text) : (...args) => { if (key === "pets") receipts.push(args.at(-1)); return Promise.resolve(); } });
  const controller = createMonsterGameController({ catalog, view, store: { load: async () => structuredClone(remote), save: async (state) => { writes++; if (fail) throw Object.assign(new Error("fixture fail"), { status: 503 }); remote = structuredClone(state); } } });
  await controller.initialize(); await controller.setMainPet({ index: 0, id: 4001 }, true);
  assert.equal(remote.inventory.pets.some((pet) => pet.main), false);
  assert.deepEqual([receipts.at(-1).saved, receipts.at(-1).status], [false, 503]);
  await controller.setMainPet({ index: 1, id: 4026 }, true); assert.equal(writes, 1); assert.match(notices.at(-1), /重试保存/);
  fail = false; assert.equal(await controller.save(), true);
  assert.equal(remote.inventory.pets[0].main, true); assert.equal(writes, 2);
  assert.equal(validateMonsterSave(remote), remote);
  const invalid = structuredClone(remote); invalid.inventory.pets[1].main = true;
  assert.throws(() => validateMonsterSave(invalid), /主宠存档/);
});
