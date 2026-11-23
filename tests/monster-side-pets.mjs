import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { assignMainPet, assignSidePet, calculatePetCore, calculateSidePetContribution, collectPartyPetAttributes } from "../modules/monster/pet-domain.js";
import { recordPartyPetKills } from "../modules/monster/pet-care-domain.js";
import { creditPetExperience } from "../modules/monster/pet-progression-domain.js";
import { creditBattleLoot } from "../modules/monster/settlement-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { settleCopyVictory, settleCopyDefeat } from "../modules/monster/adventure-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, enemies, copies, chapters, groups, equipmentTemplates, oracle, playerOracle] = await Promise.all([
  ...["item", "skill", "pet", "enemy", "copy", "chapter", "drop-groups", "equipment-templates"].map(read),
  ...["native-side-pet-contribution-fixtures", "native-experience-credit-fixtures"].map(async (name) => JSON.parse(await readFile(new URL(`./fixtures/monster/${name}.json`, import.meta.url), "utf8"))),
]);
const catalog = { items, skills, pets, enemies, chapters, equipmentTemplates, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })) };
const owned = (id, partyRole = 0, care) => ({ id, type: 3, level: 1, quality: pets.find((row) => row.id === id).quality,
  experience: 0, partyRole, ...(care ? { care } : {}) });
function seed() {
  const state = createNewGame(catalog); state.player.name = "副宠测试"; state.player.level = 35;
  state.inventory.pets = [owned(4001, 1), owned(4001), owned(4002), owned(4003), owned(4004), owned(4005)];
  return state;
}
const target = (state, index) => ({ index, id: state.inventory.pets[index].id });

test("82 native ARM side-pet cases match each contribution and float32 rounding", () => {
  assert.equal(oracle.cases.length, 82);
  for (const sample of oracle.cases) {
    const actual = sample.pets.flatMap((pet, index) => {
      const input = { row: pets.find((row) => row.id === pet.id), playerLevel: 35, level: pet.level,
        quality: pet.quality, loyalty: pet.loyalty, stars: pet.star, growth: pet.growth };
      assert.deepEqual(calculatePetCore(input), sample.petCores[index]);
      assert.deepEqual(calculateSidePetContribution({ ...input, playerLevel: 34 }), []);
      return calculateSidePetContribution(input);
    });
    assert.deepEqual(actual, sample.contributions, JSON.stringify(sample.pets));
  }
});

test("four side slots preserve individual duplicates, main assignment and historical loyalty counters", () => {
  const state = seed(), before = structuredClone(state);
  let result = state;
  for (let index = 1; index <= 4; index++) result = assignSidePet({ state: result, catalog, target: target(result, index), enabled: true });
  assert.deepEqual(result.inventory.pets.map((pet) => pet.partyRole), [1, 2, 2, 2, 2, 0]);
  assert.throws(() => assignSidePet({ state: result, catalog, target: target(result, 5), enabled: true }), /位置已满/);
  assert.throws(() => assignSidePet({ state, catalog, target: { index: 1, id: 4002 }, enabled: true }), /当前持有/);
  result.inventory.pets[1].care = { loyalty: 80, killCount: 1799 };
  result = assignMainPet({ state: result, catalog, target: target(result, 1), enabled: true });
  assert.deepEqual(result.inventory.pets.map((pet) => pet.partyRole), [0, 1, 2, 2, 2, 0]);
  assert.strictEqual(validateMonsterSave(result), result);
  assert.deepEqual(result.inventory.pets[1].care, { loyalty: 80, killCount: 1799 });
  const victory = recordPartyPetKills(result, 1);
  assert.deepEqual(victory.inventory.pets[1].care, { loyalty: 79, killCount: 0 });
  assert.deepEqual(victory.inventory.pets[2].care, { loyalty: 90, killCount: 1 });
  assert.deepEqual(state, before);
  assert.throws(() => assignSidePet({ state: { ...state, player: { ...state.player, level: 34 } }, catalog, target: target(state, 1), enabled: true }), /35/);
  const invalid = structuredClone(result); invalid.inventory.pets[0].partyRole = 2; invalid.inventory.pets[5].partyRole = 2;
  assert.throws(() => validateMonsterSave(invalid), /宠物存档/);
  assert.ok(collectPartyPetAttributes({ state: result, catalog }).length === 32);
  assert.deepEqual(collectPartyPetAttributes({ state: { ...result, player: { ...result.player, level: 34 } }, catalog }), []);
});

test("native role transitions preserve kill counters and apply the new threshold on the next victory", () => {
  assert.equal(oracle.transitions.length, 4);
  for (const sample of oracle.transitions) {
    const state = seed();
    state.inventory.pets = [owned(4001, sample.oldType, { loyalty: 80, killCount: sample.before.killCount })];
    const next = sample.newType === 1
      ? assignMainPet({ state, catalog, target: target(state, 0), enabled: true })
      : assignSidePet({ state, catalog, target: target(state, 0), enabled: true });
    assert.deepEqual({ type: next.inventory.pets[0].partyRole, ...next.inventory.pets[0].care }, sample.before);
    const fought = recordPartyPetKills(next, sample.amount);
    assert.deepEqual({ type: fought.inventory.pets[0].partyRole, ...fought.inventory.pets[0].care }, sample.after);
    assert.strictEqual(validateMonsterSave(next), next);
  }
});

test("side pets receive every original 30% XP event independently, even without a main pet", () => {
  for (const sample of playerOracle) {
    const state = seed(); Object.assign(state.player, sample.input);
    state.inventory.pets = [owned(4001, 1), owned(4001, 2), owned(4002, 2), owned(4002)];
    const before = structuredClone(state);
    const result = creditBattleLoot(state, { gold: 0, experience: sample.input.amount, items: [] });
    assert.deepEqual(result.effects.petGrants, sample.expected.petGrants);
    let expected = { level: 1, experience: 0 };
    for (const grant of sample.expected.petGrants) expected = creditPetExperience({ ...expected, amount: grant.assist });
    for (const index of [1, 2]) assert.deepEqual({ level: result.state.inventory.pets[index].level, experience: result.state.inventory.pets[index].experience }, expected);
    assert.deepEqual(result.state.inventory.pets[3], before.inventory.pets[3]);
    assert.deepEqual(state, before);
  }
  const noMain = seed(); noMain.inventory.pets = [owned(4001, 2)];
  const result = creditBattleLoot(noMain, { gold: 0, experience: 100, items: [] });
  assert.equal(result.effects.petGrowth, null);
  assert.equal(result.state.inventory.pets[0].experience, 30);
});

test("victory counts side loyalty, while partial defeat credits only retained XP", () => {
  const state = seed();
  state.inventory.pets = [owned(4001, 1, { loyalty: 80, killCount: 599 }), owned(4001, 2, { loyalty: 80, killCount: 1799 }), owned(4002)];
  Object.assign(state.player, { goldRate: 100, experienceRate: 100, dropRate: 100 });
  const copy = catalog.copies.find((row) => row.id === 1001);
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 1, hard: 1, waves: 3, catalog, draw: () => 324508639 });
  const before = structuredClone(state);
  const won = settleCopyVictory({ state, copy, prepared, catalog, draw: () => 324508639 });
  assert.deepEqual(won.state.inventory.pets[1].care, { loyalty: 79, killCount: 0 });
  assert.equal(won.reward.sidePetCare[0].index, 1);
  assert.equal(won.reward.experience, 9);
  assert.equal(won.reward.sidePetGrowth[0].amount, 2);
  const battle = structuredClone(prepared.battle); battle.enemies[0].dead = true;
  const lost = settleCopyDefeat({ state, copy, prepared, battle, catalog, draw: () => 324508639 });
  assert.equal(lost.reward.experience, 3);
  assert.equal(lost.state.inventory.pets[1].experience, 0);
  assert.deepEqual(lost.state.inventory.pets[1].care, before.inventory.pets[1].care);
  assert.deepEqual(state, before);
});

test("an active offline run blocks side-pet changes before any save", async () => {
  const state = seed();
  state.offlineRun = { copyId: 1001, hard: 1, waves: 1, startedAt: 1, seed: 1 };
  let writes = 0;
  const notices = [];
  const view = { menu() {}, notice(message) { notices.push(message); }, loadError(message) { throw new Error(message); } };
  const controller = createMonsterGameController({ catalog, view,
    store: { async load() { return structuredClone(state); }, async save() { writes++; } } });
  await controller.initialize();
  await controller.setSidePet(target(state, 1), true);
  assert.equal(writes, 0);
  assert.match(notices.at(-1), /离线挂机/);
});
