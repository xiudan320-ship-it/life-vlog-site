import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { addPetKills, getPetCare, recordPartyPetKills } from "../modules/monster/pet-care-domain.js";
import { collectPartyPetAttributes, feedPet, getPetSummary } from "../modules/monster/pet-domain.js";
import { calculatePlayerCoreAttributes, collectEquipmentAttributes, sumAttributes } from "../modules/monster/attribute-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { settleCopyDefeat, settleCopyVictory } from "../modules/monster/adventure-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";

const readData = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const readFixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/monster/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, enemies, copies, chapters, groups, equipmentTemplates, oracle, contributionOracle] = await Promise.all([
  ...["item", "skill", "pet", "enemy", "copy", "chapter", "drop-groups", "equipment-templates"].map(readData),
  ...["native-pet-loyalty-fixtures", "native-main-pet-contribution-fixtures"].map(readFixture),
]);
const catalog = { items, skills, pets, enemies, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })), chapters, equipmentTemplates };
const owned = (id, partyRole = 0, care) => ({ id, type: 3, level: 1, quality: pets.find((row) => row.id === id).quality,
  experience: 0, partyRole, ...(care ? { care } : {}) });
function stateWithPet(care) {
  const state = createNewGame(catalog);
  state.player.name = "Pet care fixture";
  state.player.level = 35;
  state.inventory.pets = [owned(4001, 1, care)];
  return state;
}
const target = { index: 0, id: 4001 };

test("all 372 native loyalty samples match threshold, floor and discarded overflow", () => {
  assert.equal(oracle.cases.length, 372);
  for (const sample of oracle.cases) {
    assert.deepEqual(addPetKills(sample.input), sample.expected, JSON.stringify(sample.input));
  }
  assert.deepEqual(addPetKills({ type: 1, killCount: 599, loyalty: 80, amount: 1 }), { type: 1, killCount: 0, loyalty: 79 });
  assert.deepEqual(addPetKills({ type: 1, killCount: 599, loyalty: 31, amount: 1201 }), { type: 1, killCount: 0, loyalty: 30 });
  assert.deepEqual(addPetKills({ type: 2, killCount: 1799, loyalty: 30, amount: 1 }), { type: 2, killCount: 0, loyalty: 30 });
});

test("kill credit updates only the selected instance, without mutating prior state", () => {
  const state = stateWithPet();
  state.inventory.pets = [owned(4001), owned(4001, 1, { loyalty: 81, killCount: 598 }), owned(4026)];
  const before = structuredClone(state);
  assert.deepEqual(getPetCare(state.inventory.pets[0]), { loyalty: 90, killCount: 0 });
  const result = recordPartyPetKills(state, 3);
  assert.deepEqual(result.inventory.pets[1].care, { loyalty: 80, killCount: 0 });
  assert.deepEqual(result.inventory.pets[0], before.inventory.pets[0]);
  assert.deepEqual(result.inventory.pets[2], before.inventory.pets[2]);
  assert.deepEqual(state, before);
  assert.strictEqual(recordPartyPetKills(state, 0), state);
  state.inventory.pets[1].partyRole = 0;
  assert.strictEqual(recordPartyPetKills(state, 600), state);
});

test("victory credits prepared enemy count; defeat including zero kills never changes care", () => {
  const state = stateWithPet({ loyalty: 80, killCount: 598 });
  Object.assign(state.player, { goldRate: 100, experienceRate: 100, dropRate: 100 });
  const copy = catalog.copies.find((row) => row.id === 1001);
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 1, hard: 1, waves: 3, catalog, draw: () => 324508639 });
  assert.equal(prepared.enemyCount, 3);
  const before = structuredClone(state);
  const victory = settleCopyVictory({ state, copy, prepared, catalog, draw: () => 324508639 });
  assert.deepEqual(victory.state.inventory.pets[0].care, { loyalty: 79, killCount: 0 });
  const battle = structuredClone(prepared.battle);
  battle.enemies[0].dead = true;
  const partial = settleCopyDefeat({ state, copy, prepared, battle, catalog, draw: () => 324508639 });
  assert.deepEqual(partial.state.inventory.pets[0].care, before.inventory.pets[0].care);
  battle.enemies[0].dead = false;
  const none = settleCopyDefeat({ state, copy, prepared, battle, catalog, draw() { throw new Error("zero kills must not draw"); } });
  assert.strictEqual(none.state, state);
  assert.deepEqual(state, before);
});

test("feeding one or a batch consumes exactly one soul per loyalty and leaves the source immutable", () => {
  const state = stateWithPet({ loyalty: 90, killCount: 599 });
  state.inventory.goods.push({ id: 5105, type: 1, quantity: 10 });
  state.inventory.pets.push(owned(4001));
  const before = structuredClone(state);
  const one = feedPet({ state, catalog, target, quantity: 1 });
  assert.deepEqual(one.inventory.pets[0].care, { loyalty: 91, killCount: 599 });
  assert.equal(one.inventory.goods.find((row) => row.id === 5105).quantity, 9);
  assert.deepEqual(one.inventory.pets[1], before.inventory.pets[1]);
  const full = feedPet({ state, catalog, target, quantity: 10 });
  assert.deepEqual(full.inventory.pets[0].care, { loyalty: 100, killCount: 599 });
  assert.equal(full.inventory.goods.find((row) => row.id === 5105), undefined);
  assert.deepEqual(state, before);
  const other = feedPet({ state, catalog, target: { index: 1, id: 4001 }, quantity: 1 });
  assert.deepEqual(other.inventory.pets[1].care, { loyalty: 91, killCount: 0 });
  assert.deepEqual(other.inventory.pets[0], before.inventory.pets[0]);
});

test("feeding rejects missing materials, stale selection, full loyalty and invalid quantities atomically", () => {
  const state = stateWithPet({ loyalty: 99, killCount: 2 });
  const before = structuredClone(state);
  assert.throws(() => feedPet({ state, catalog, target, quantity: 1 }), /材料不足/);
  for (const quantity of [0, -1, 0.5, 2, Infinity, NaN]) assert.throws(() => feedPet({ state, catalog, target, quantity }), RangeError);
  assert.throws(() => feedPet({ state, catalog, target: { index: 0, id: 4026 }, quantity: 1 }), RangeError);
  assert.deepEqual(state, before);
  state.inventory.pets[0].care.loyalty = 100;
  assert.throws(() => feedPet({ state, catalog, target, quantity: 1 }), RangeError);
});

test("80 to 79 loyalty matches both native float stages and changes refreshed player contribution", () => {
  const state = stateWithPet({ loyalty: 80, killCount: 599 });
  state.inventory.pets[0].level = 10;
  const after = recordPartyPetKills(state, 1);
  const equipment = state.player.equipmentSets[state.player.equipmentSetIndex];
  for (const current of [state, after]) {
    const loyalty = getPetCare(current.inventory.pets[0]).loyalty;
    const expected = contributionOracle.cases.find(({ input }) => input.petId === 4001 && input.playerLevel === 35
      && input.petLevel === 10 && input.loyalty === loyalty && input.quality === 1 && input.star === 0 && input.growth === 0);
    assert.ok(expected);
    const summary = getPetSummary({ state: current, catalog, target });
    assert.deepEqual(summary.core, expected.petCore);
    assert.deepEqual(summary.contribution, expected.contribution);
    assert.deepEqual(collectPartyPetAttributes({ state: current, catalog }), expected.contribution);
  }
  const refresh = (current) => calculatePlayerCoreAttributes({ level: current.player.level, paragon: current.player.paragon,
    attributes: sumAttributes([...collectEquipmentAttributes(equipment), ...collectPartyPetAttributes({ state: current, catalog })]) });
  const before = refresh(state), lowered = refresh(after);
  assert.equal(before.attack - lowered.attack, 610 - 298);
  assert.equal(before.defense - lowered.defense, 200 - 98);
  assert.deepEqual(refresh(state), before);
});

test("save validation checks loyalty and kill count boundaries", () => {
  const state = stateWithPet({ loyalty: 30, killCount: 599 });
  assert.strictEqual(validateMonsterSave(state), state);
  for (const care of [{ loyalty: 29, killCount: 0 }, { loyalty: 101, killCount: 0 }, { loyalty: 90, killCount: -1 },
    { loyalty: 90, killCount: 1800 }, { loyalty: 90.5, killCount: 0 }, { loyalty: 90, killCount: 0.5 }, null]) {
    const invalid = structuredClone(state); invalid.inventory.pets[0].care = care;
    assert.throws(() => validateMonsterSave(invalid), /忠诚/, JSON.stringify(care));
  }
});

function controllerFixture(seed) {
  let remote = structuredClone(seed);
  const attempts = [], saved = [], notices = [], petViews = [], results = [], battles = [], selections = [];
  const store = {
    fail: true,
    async load() { return structuredClone(remote); },
    async save(state) {
      attempts.push(structuredClone(state));
      if (this.fail) throw Object.assign(new Error("offline"), { status: 503 });
      remote = structuredClone(state);
      saved.push(structuredClone(state));
    },
  };
  const view = {
    async menu() {}, async home() {}, saveStatus() {}, repeatStatus() {}, updateHome() {}, battleUpdate() {},
    notice(message) { notices.push(message); },
    pets(state, _catalog, options) { petViews.push({ state: structuredClone(state), options }); },
    selectCopy(state) { selections.push(structuredClone(state)); },
    async battle(battle) { battles.push(structuredClone(battle)); },
    async result(outcome, reward, state) { results.push({ outcome, reward: structuredClone(reward), state: structuredClone(state) }); },
    loadError(message) { throw new Error(message); },
  };
  const controller = createMonsterGameController({ catalog, store, view, random: () => 324508639, wait: async () => {} });
  return { controller, store, attempts, saved, notices, petViews, results, battles, selections, remote: () => structuredClone(remote) };
}

test("failed feeding keeps one pending transaction and retry preserves the other same-ID pet", async () => {
  const seed = stateWithPet({ loyalty: 79, killCount: 599 });
  seed.inventory.pets.push(owned(4001, 0, { loyalty: 70, killCount: 12 }));
  seed.inventory.goods.push({ id: 5105, type: 1, quantity: 3 });
  const f = controllerFixture(seed);
  await f.controller.initialize();
  await f.controller.feedPet(target, 1);
  assert.equal(f.attempts.length, 1);
  assert.equal(f.petViews.at(-1).options.saved, false);
  assert.equal(f.petViews.at(-1).options.status, 503);
  const pending = f.petViews.at(-1).state;
  assert.deepEqual(pending.inventory.pets[0].care, { loyalty: 80, killCount: 599 });
  assert.equal(pending.inventory.goods.find((item) => item.id === 5105).quantity, 2);
  assert.deepEqual(pending.inventory.pets[1], seed.inventory.pets[1]);
  assert.deepEqual(f.remote().inventory.pets, seed.inventory.pets);
  await f.controller.feedPet(target, 1);
  assert.equal(f.attempts.length, 1);
  assert.match(f.notices.at(-1), /重试保存/);
  f.store.fail = false;
  assert.equal(await f.controller.save(), true);
  assert.equal(f.attempts.length, 2);
  assert.equal(f.saved.length, 1);
  assert.deepEqual(f.remote(), pending);
  assert.equal(f.remote().inventory.goods.find((item) => item.id === 5105).quantity, 2);
  assert.deepEqual(f.remote().inventory.pets[1], seed.inventory.pets[1]);
  f.controller.destroy();
});

test("victory refreshes loyalty contribution before a failed save and retries without another battle", async () => {
  const seed = stateWithPet({ loyalty: 80, killCount: 599 });
  seed.inventory.pets[0].level = 10;
  const f = controllerFixture(seed);
  await f.controller.initialize();
  f.controller.selectCopy(1);
  const initial = f.selections.at(-1);
  await f.controller.startCopy(1001, { type: 1, hard: 1, waves: 1, repeat: false });
  assert.equal(f.battles.length, 1);
  assert.equal(f.results.length, 1);
  assert.equal(f.results[0].outcome, 3);
  const pending = f.results[0].state;
  assert.deepEqual(f.results[0].reward.petCare, { previous: 80, loyalty: 79 });
  assert.deepEqual(pending.inventory.pets[0].care, { loyalty: 79, killCount: 0 });
  assert.equal(initial.player.attack - pending.player.attack, 610 - 298);
  assert.equal(initial.player.defense - pending.player.defense, 200 - 98);
  assert.equal(f.attempts.length, 1);
  assert.deepEqual(f.remote().inventory.pets[0].care, { loyalty: 80, killCount: 599 });
  await f.controller.startCopy(1001, { type: 1, hard: 1, waves: 1, repeat: false });
  assert.equal(f.battles.length, 1);
  assert.equal(f.attempts.length, 1);
  assert.match(f.notices.at(-1), /重试保存/);
  f.store.fail = false;
  assert.equal(await f.controller.save(), true);
  assert.equal(f.attempts.length, 2);
  assert.equal(f.saved.length, 1);
  assert.deepEqual(f.remote(), pending);
  assert.deepEqual(f.remote().inventory.pets[0].care, { loyalty: 79, killCount: 0 });
  f.controller.destroy();
});
