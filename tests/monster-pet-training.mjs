import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { calculatePetTraining, getPetStarValue, PET_STAR_THRESHOLDS, previewPetTraining, trainPet } from "../modules/monster/pet-training-domain.js";
import { getPetSummary } from "../modules/monster/pet-domain.js";
import { getPetPassiveThreshold, preparePetBattle } from "../modules/monster/pet-battle-domain.js";
import { refreshGamePlayer } from "../modules/monster/player-refresh-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, equipmentTemplates, oracle] = await Promise.all([
  ...["item", "skill", "pet", "equipment-templates"].map(read),
  readFile(new URL("./fixtures/monster/native-pet-training-fixtures.json", import.meta.url), "utf8").then(JSON.parse),
]);
const catalog = { items, skills, pets, equipmentTemplates };
const owned = (id, partyRole = 0, training) => ({ id, type: 3, level: 1, quality: pets.find((row) => row.id === id).quality,
  experience: 0, partyRole, ...(training ? { training } : {}) });
const asPet = ({ quality, stars, starExperience, growth }) => ({ quality, training: { stars, starExperience, growth } });
function seed() {
  const state = createNewGame(catalog); state.player.name = "培养测试"; state.player.level = 35; state.money = 1000;
  state.inventory.pets = [owned(4013), owned(4013, 1), owned(4001), owned(4013, 2), owned(4014)];
  return refreshGamePlayer(state, catalog);
}

test("native ARM fusion and devour samples preserve thresholds, carry, growth and quality", () => {
  assert.deepEqual(PET_STAR_THRESHOLDS, oracle.starThresholds);
  assert.equal(oracle.fusion.length, 80);
  assert.equal(oracle.devour.length, 225);
  assert.equal(oracle.chances.length, 90);
  for (const sample of oracle.chances) assert.equal(getPetPassiveThreshold(sample), sample.chance, JSON.stringify(sample));
  for (const [mode, cases] of [["fuse", oracle.fusion], ["devour", oracle.devour]]) {
    for (const sample of cases) {
      const result = calculatePetTraining({ mode, target: asPet(sample.target), donor: asPet(sample.donor) });
      assert.equal(result.amount, sample.amount, JSON.stringify(sample));
      assert.deepEqual({ quality: result.quality, ...result.training }, sample.expected, JSON.stringify(sample));
    }
  }
  assert.equal(getPetStarValue(asPet({ quality: 4, stars: 4, starExperience: 0, growth: 0 })), 14);
});

test("fusion consumes exactly the selected unassigned duplicate and updates assigned attributes", () => {
  const state = seed(), before = structuredClone(state);
  const target = { index: 1, id: 4013 }, donor = { index: 0, id: 4013 };
  const preview = previewPetTraining({ state, catalog, target, donor, mode: "fuse" });
  assert.equal(preview.cost, 300);
  assert.deepEqual(preview.result.training, { stars: 1, starExperience: 0, growth: 0 });
  const fused = trainPet({ state, catalog, target, donor, mode: "fuse" });
  assert.equal(fused.targetIndex, 0);
  assert.equal(fused.state.money, 700);
  assert.equal(fused.state.inventory.pets.length, 4);
  assert.equal(fused.state.inventory.pets[0].partyRole, 1);
  assert.deepEqual(fused.state.inventory.pets[1], before.inventory.pets[2]);
  const refreshed = refreshGamePlayer(fused.state, catalog);
  assert.ok(refreshed.player.attack > state.player.attack);
  assert.equal(getPetSummary({ state: refreshed, catalog, target: { index: 0, id: 4013 } }).stars, 1);
  const prepared = { battle: { allies: [{ ...refreshed.player }] } };
  const battle = preparePetBattle({ prepared, state: refreshed, catalog, draw: () => 30 });
  assert.ok(battle.petPassives.some((entry) => entry.index === 0), "one star raises the original threshold above 30");
  assert.deepEqual(state, before);
  assert.strictEqual(validateMonsterSave(refreshed), refreshed);
});

test("devour promotes growth 100 to quality 5 and unlocks the third battle passive", () => {
  const state = seed();
  state.inventory.pets[1].training = { stars: 0, starExperience: 0, growth: 99 };
  const target = { index: 1, id: 4013 }, donor = { index: 2, id: 4001 };
  const preview = previewPetTraining({ state, catalog, target, donor, mode: "devour" });
  assert.equal(preview.cost, 90); assert.equal(preview.result.amount, 3);
  const trained = trainPet({ state, catalog, target, donor, mode: "devour" });
  assert.equal(trained.state.money, 910);
  assert.equal(trained.state.inventory.pets[1].quality, 5);
  assert.equal(trained.state.inventory.pets[1].training.growth, 100);
  const refreshed = refreshGamePlayer(trained.state, catalog);
  const prepared = { battle: { allies: [{ ...refreshed.player }] } };
  const battle = preparePetBattle({ prepared, state: refreshed, catalog, draw: () => 0 });
  assert.equal(battle.petPassives.filter((entry) => entry.index === 1).length, 3);
  assert.strictEqual(validateMonsterSave(refreshed), refreshed);
});

test("training a side pet keeps its role and updates its contribution after an earlier material is removed", () => {
  const state = seed();
  const trained = trainPet({ state, catalog, target: { index: 3, id: 4013 }, donor: { index: 0, id: 4013 }, mode: "fuse" });
  assert.equal(trained.targetIndex, 2);
  assert.equal(trained.state.inventory.pets[2].partyRole, 2);
  const refreshed = refreshGamePlayer(trained.state, catalog);
  assert.ok(refreshed.player.attack > state.player.attack);
  assert.equal(getPetSummary({ state: refreshed, catalog, target: { index: 2, id: 4013 } }).stars, 1);
  assert.equal(refreshed.inventory.pets[0].partyRole, 1);
});

test("training rejects assigned, wrong-kind, stale, capped and unaffordable materials", () => {
  const state = seed(), before = structuredClone(state);
  const target = { index: 1, id: 4013 }, donor = { index: 0, id: 4013 };
  const attempt = (overrides = {}) => trainPet({ state, catalog, target, donor, mode: "fuse", ...overrides });
  assert.throws(() => attempt({ donor: target }), /不能消耗/);
  assert.throws(() => attempt({ donor: { index: 3, id: 4013 } }), /不能作为材料/);
  assert.throws(() => attempt({ donor: { index: 4, id: 4014 } }), /同种/);
  assert.throws(() => attempt({ donor: { index: 0, id: 4001 } }), /重新选择/);
  assert.throws(() => attempt({ state: { ...state, money: 299 } }), /魔石不足/);
  assert.throws(() => attempt({ state: { ...state, player: { ...state.player, level: 34 } } }), /35 级/);
  const capped = structuredClone(state); capped.inventory.pets[1].training = { stars: 4, starExperience: 0, growth: 0 };
  assert.throws(() => attempt({ state: capped }), /4 星/);
  const poorQuality = structuredClone(state); poorQuality.inventory.pets[1].quality = 3;
  assert.throws(() => attempt({ state: poorQuality }), /品质不能高于/);
  assert.throws(() => attempt({ state: poorQuality, donor: { index: 2, id: 4001 }, mode: "devour" }), /品质 4/);
  assert.deepEqual(state, before);
});

test("failed training save retries the exact consumption and does not run a second operation", async () => {
  const state = seed(); let fail = true;
  const writes = [], notices = [], receipts = [];
  const view = new Proxy({}, { get: (_, name) => (...args) => { if (name === "notice") notices.push(args[0]); if (name === "pets") receipts.push(args[2]); } });
  const controller = createMonsterGameController({ catalog, view,
    store: { async load() { return structuredClone(state); }, async save(value) { writes.push(structuredClone(value)); if (fail) throw new Error("fixture"); } } });
  await controller.initialize();
  await controller.trainPet({ index: 1, id: 4013 }, { index: 0, id: 4013 }, "fuse");
  assert.equal(writes.length, 1); assert.equal(receipts.at(-1).saved, false);
  assert.equal(writes[0].money, 700); assert.equal(writes[0].inventory.pets.length, 4);
  await controller.trainPet({ index: 0, id: 4013 }, { index: 3, id: 4014 }, "devour");
  assert.equal(writes.length, 1); assert.match(notices.at(-1), /重试保存/);
  fail = false; assert.equal(await controller.save(), true);
  assert.deepEqual(writes[1], writes[0]);
});

test("an active offline run blocks training without consuming pets or currency", async () => {
  const state = seed(); state.offlineRun = { copyId: 1001, hard: 1, waves: 1, startedAt: 1, seed: 1 };
  let writes = 0; const notices = [];
  const view = new Proxy({}, { get: (_, name) => (...args) => { if (name === "notice") notices.push(args[0]); } });
  const controller = createMonsterGameController({ catalog, view,
    store: { async load() { return structuredClone(state); }, async save() { writes++; } } });
  await controller.initialize();
  await controller.trainPet({ index: 1, id: 4013 }, { index: 0, id: 4013 }, "fuse");
  assert.equal(writes, 0); assert.match(notices.at(-1), /离线挂机/);
});
