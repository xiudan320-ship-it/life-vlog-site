import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { creditPetExperience } from "../modules/monster/pet-progression-domain.js";
import { creditBattleLoot } from "../modules/monster/settlement-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createCatalogEquipment } from "../modules/monster/item-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { settleCopyDefeat, settleCopyVictory } from "../modules/monster/adventure-domain.js";
import { claimTask } from "../modules/monster/task-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";

const readData = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const readFixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/monster/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, enemies, copies, chapters, groups, equipmentTemplates, tasks, petOracle, playerOracle] = await Promise.all([
  ...["item", "skill", "pet", "enemy", "copy", "chapter", "drop-groups", "equipment-templates", "task"].map(readData),
  ...["native-pet-experience-fixtures", "native-experience-credit-fixtures"].map(readFixture),
]);
const catalog = { items, skills, pets, enemies, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })), chapters, equipmentTemplates, tasks };
const owned = (id, partyRole = 0, experience = 0) => ({ id, type: 3, level: 1,
  quality: pets.find((row) => row.id === id).quality, experience, partyRole });
function stateWithPet() {
  const state = createNewGame(catalog);
  state.player.name = "Pet fixture";
  state.inventory.pets = [owned(4001, 1)];
  return state;
}

test("68 native Pet::addExp samples match boundaries, caps and remainders", () => {
  assert.equal(petOracle.cases.length, 68);
  for (const sample of petOracle.cases) {
    assert.deepEqual(creditPetExperience(sample.input), sample.expected, JSON.stringify(sample.input));
  }
});

test("native Player XP grants apply in sequence only to the selected owned pet", () => {
  assert.equal(playerOracle.length, 128);
  for (const sample of playerOracle) {
    const state = stateWithPet();
    Object.assign(state.player, sample.input);
    state.inventory.pets = [owned(4001), owned(4026), owned(4026, 1)];
    const before = structuredClone(state);
    const result = creditBattleLoot(state, { gold: 0, experience: sample.input.amount, items: [] });
    assert.deepEqual(result.effects.petGrants, sample.expected.petGrants, JSON.stringify(sample.input));
    const amount = sample.expected.petGrants.reduce((sum, grant) => sum + grant.active, 0);
    const expected = creditPetExperience({ level: 1, experience: 0, amount });
    assert.deepEqual({ level: result.state.inventory.pets[2].level, experience: result.state.inventory.pets[2].experience }, expected, JSON.stringify(sample.input));
    assert.equal(result.effects.petGrowth.amount, amount);
    assert.deepEqual(result.state.inventory.pets.slice(0, 2), before.inventory.pets.slice(0, 2));
    assert.deepEqual(state, before);
  }
  const noMain = stateWithPet(); noMain.inventory.pets[0].partyRole = 0;
  const result = creditBattleLoot(noMain, { gold: 0, experience: 100, items: [] });
  assert.deepEqual(result.state.inventory.pets, noMain.inventory.pets);
  assert.equal(result.effects.petGrowth, null);
});

test("task experience crosses a pet threshold without mutating the prior save", () => {
  const state = stateWithPet(); state.player.level = 35;
  state.inventory.pets[0].experience = 14980;
  const row = tasks.find((entry) => entry.id === 1);
  state.taskBoard = { points: 0, dailyRewardDay: null, entries: [{ id: row.id, type: row.type, target: row.target,
    need: row.needcount, count: row.needcount, claimed: 0 }] };
  const before = structuredClone(state);
  const result = claimTask({ state, id: row.id, catalog });
  assert.deepEqual([result.inventory.pets[0].level, result.inventory.pets[0].experience], [2, 15]);
  assert.equal(result.taskBoard.entries[0].claimed, 1);
  assert.deepEqual(state, before);
});

test("partial defeat credits only defeated-enemy XP, and no kills never grow the pet", () => {
  const state = stateWithPet();
  Object.assign(state.player, { goldRate: 100, experienceRate: 100, dropRate: 100 });
  state.inventory.pets[0].experience = 14990;
  const copy = catalog.copies.find((row) => row.id === 1001);
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 1, hard: 1, waves: 3, catalog, draw: () => 324508639 });
  const battle = structuredClone(prepared.battle);
  battle.enemies[0].dead = true;
  const before = structuredClone(state);
  const result = settleCopyDefeat({ state, copy, prepared, battle, catalog, draw: () => 324508639 });
  assert.equal(result.reward.experience, 15);
  assert.deepEqual([result.state.inventory.pets[0].level, result.state.inventory.pets[0].experience], [2, 5]);
  assert.deepEqual(result.reward.petGrowth, { index: 0, id: 4001, amount: 15, previousLevel: 1, level: 2, experience: 5 });
  assert.deepEqual(state, before);
  const victory = settleCopyVictory({ state, copy, prepared, catalog, draw: () => 324508639 });
  assert.equal(victory.reward.experience, 46);
  // Player level-up recursively grants the 26-point remainder to the pet again.
  assert.deepEqual(victory.reward.petGrowth, { index: 0, id: 4001, amount: 72, previousLevel: 1, level: 2, experience: 62 });
  assert.deepEqual(state, before);
  battle.enemies[0].dead = false;
  const none = settleCopyDefeat({ state, copy, prepared, battle, catalog, draw() { throw new Error("zero kills should not draw"); } });
  assert.strictEqual(none.state, state);
  assert.equal(none.reward.experience, 0);
  assert.equal(none.reward.petGrowth, undefined);
});

test("save validation accepts the level-60 cap and rejects invalid pet experience", () => {
  const state = stateWithPet();
  state.inventory.pets[0].level = 60; state.inventory.pets[0].experience = 52215000;
  assert.equal(validateMonsterSave(state), state);
  for (const [level, experience] of [[1, 15000], [60, 52215001], [61, 0], [1, -1], [1, 0.5]]) {
    const invalid = structuredClone(state);
    Object.assign(invalid.inventory.pets[0], { level, experience });
    assert.throws(() => validateMonsterSave(invalid), /主宠存档/, `${level}/${experience}`);
  }
});

test("equipped toy bonus, refreshed growth and save retry credit a task once", async () => {
  const seed = stateWithPet(); seed.player.level = 35; seed.inventory.pets[0].experience = 14980;
  const row = tasks.find((entry) => entry.id === 1);
  seed.taskBoard = { points: 0, dailyRewardDay: null, entries: [{ id: row.id, type: row.type, target: row.target,
    need: row.needcount, count: row.needcount, claimed: 0 }] };
  const toy = createCatalogEquipment({ row: items.find((item) => item.id === 6860), template: equipmentTemplates[6860] });
  seed.player.equipmentSets[0].push({ ...toy, equipped: true });
  let remote = structuredClone(seed), fail = true, writes = 0, before, pending;
  const notices = [];
  const view = new Proxy({}, { get: (_, key) => {
    if (key === "selectCopy") return (state) => { before = structuredClone(state); };
    if (key === "tasks") return (state) => { pending = structuredClone(state); };
    if (key === "notice") return (message) => notices.push(message);
    return () => Promise.resolve();
  } });
  const store = { load: async () => structuredClone(remote), save: async (state) => {
    writes++; if (fail) throw Object.assign(new Error("offline"), { status: 503 }); remote = structuredClone(state);
  } };
  const controller = createMonsterGameController({ catalog, store, view, random: () => 0, wait: async () => {} });
  await controller.initialize(); controller.selectCopy(1);
  assert.equal(before.player.petExperienceBonus, 4);
  await controller.claimTask(1);
  assert.equal(writes, 1);
  assert.deepEqual([pending.inventory.pets[0].level, pending.inventory.pets[0].experience], [2, 16]);
  assert.ok(pending.player.attack > before.player.attack);
  assert.equal(remote.inventory.pets[0].experience, 14980);
  await controller.claimTask(1);
  assert.equal(writes, 1); assert.match(notices.at(-1), /重试保存/);
  fail = false; assert.equal(await controller.save(), true);
  assert.equal(writes, 2);
  assert.deepEqual(remote.inventory.pets[0], pending.inventory.pets[0]);
  assert.equal(validateMonsterSave(remote), remote);
  controller.destroy();
});
