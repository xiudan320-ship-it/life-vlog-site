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
import { getPetPassiveAttributes, getPetPassiveThreshold, preparePetBattle, applyPetPassiveAttributes } from "../modules/monster/pet-battle-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, enemies, copies, chapters, groups, equipmentTemplates, oracle, playerOracle, passiveOracle] = await Promise.all([
  ...["item", "skill", "pet", "enemy", "copy", "chapter", "drop-groups", "equipment-templates"].map(read),
  ...["native-side-pet-contribution-fixtures", "native-experience-credit-fixtures", "native-pet-passives-fixtures"].map(async (name) => JSON.parse(await readFile(new URL(`./fixtures/monster/${name}.json`, import.meta.url), "utf8"))),
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

test("pet passive factories, chances and original main/side selection match native ARM samples", () => {
  assert.equal(passiveOracle.factories.length, 26);
  assert.equal(passiveOracle.chances.length, 72);
  assert.equal(passiveOracle.selections.length, 192);
  for (const item of passiveOracle.factories) {
    assert.deepEqual(getPetPassiveAttributes(pets.find((row) => row.id === item.id)).map(({ type, value }) => ({ type, value })), item.attributes);
  }
  for (const item of passiveOracle.chances) assert.equal(getPetPassiveThreshold(item), item.chance, JSON.stringify(item));
  for (const item of passiveOracle.selections) {
    const state = seed();
    state.player.petProcBonus = item.bonus;
    state.inventory.pets = [{ ...owned(item.id, item.role, { loyalty: item.loyalty, killCount: 0 }), quality: item.quality }];
    const prepared = { battle: { allies: [{ ...state.player, bonuses: {} }] } };
    let used = 0;
    const result = preparePetBattle({ prepared, state, catalog, draw: () => item.rolls[used++] });
    assert.equal(used, item.used, JSON.stringify(item));
    assert.deepEqual(result.petPassives.map(({ type, value }) => ({ type, value })), item.attributes, JSON.stringify(item));
  }
  assert.equal(passiveOracle.effects.length, 26);
  for (const item of passiveOracle.effects) {
    const player = { dropRate: 100, experienceRate: 100, goldRate: 100, procBonus: 100, buffResistance: 100, hurtBonus: 100, critResistance: 100,
      flatCrit: 100, bonuses: { hurtIncrease: 100, hurtDecrease: 100, crit: 100, critHurt: 100, hit: 100, dodge: 100 } };
    const result = applyPetPassiveAttributes(player, [item]);
    const values = { 9: result.dropRate, 10: result.experienceRate, 16: result.bonuses.hurtIncrease, 17: result.bonuses.hurtDecrease,
      19: result.goldRate, 21: result.procBonus, 23: result.bonuses.crit, 24: result.bonuses.critHurt,
      25: result.bonuses.hit, 26: result.bonuses.dodge, 27: result.buffResistance, 33: result.hurtBonus, 40: result.critResistance };
    assert.deepEqual(values, item.after, JSON.stringify(item));
  }
});

test("pet passives roll main first, preserve duplicates and modify only the current battle", () => {
  const state = seed();
  state.inventory.pets = [owned(4022, 2), owned(4013, 1), owned(4022, 2), owned(4013)];
  const before = structuredClone(state);
  const prepared = { battle: { allies: [{ ...state.player, goldRate: 100, dropRate: 100, experienceRate: 100,
    hurtBonus: 0, bonuses: { critHurt: 0 } }] } };
  const result = preparePetBattle({ prepared, state, catalog, draw: () => 0 });
  assert.deepEqual(result.petPassives.map(({ index, type }) => [index, type]), [[1, 33], [1, 24], [0, 9], [0, 10], [2, 9], [2, 10]]);
  assert.equal(result.battle.allies[0].hurtBonus, 5);
  assert.equal(result.battle.bonuses.critHurt, 20);
  assert.equal(result.battle.allies[0].dropRate, 110);
  assert.equal(result.battle.allies[0].experienceRate, 120);
  assert.deepEqual(state, before);
  assert.equal(prepared.battle.allies[0].experienceRate, 100);
  assert.deepEqual(preparePetBattle({ prepared, state: { ...state, player: { ...state.player, level: 34 } }, catalog, draw() { throw new Error("locked pets cannot roll"); } }).petPassives, []);
  assert.throws(() => preparePetBattle({ prepared, state, catalog, draw: () => undefined }), /随机数/);
});

test("pet reward effects apply on victory and partial defeat without entering the saved player", () => {
  const state = seed();
  Object.assign(state.player, { goldRate: 100, experienceRate: 100, dropRate: 100 });
  const copy = catalog.copies.find((row) => row.id === 1001);
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 1, hard: 1, waves: 3, catalog, draw: () => 324508639 });
  const active = { ...prepared, petPassives: [{ type: 9, value: 50 }, { type: 10, value: 100 }, { type: 19, value: 100 }] };
  const battle = structuredClone(prepared.battle); battle.enemies[0].dead = true;
  for (const partial of [false, true]) {
    const settle = (candidate) => partial ? settleCopyDefeat({ state, copy, prepared: candidate, battle, catalog, draw: () => 324508639 })
      : settleCopyVictory({ state, copy, prepared: candidate, catalog, draw: () => 324508639 });
    const normal = settle(prepared), boosted = settle(active);
    assert.ok(boosted.reward.gold > normal.reward.gold);
    assert.ok(boosted.reward.experience > normal.reward.experience);
    assert.ok(boosted.reward.dropRate > normal.reward.dropRate);
    assert.equal(boosted.state.player.goldRate, state.player.goldRate);
    assert.equal(boosted.state.player.experienceRate, state.player.experienceRate);
  }
  const stats = applyPetPassiveAttributes({ bonuses: {} }, [{ type: 23, value: 5 }, { type: 27, value: 5 }, { type: 40, value: 5 }]);
  assert.deepEqual([stats.bonuses.crit, stats.flatCrit, stats.buffResistance, stats.critResistance], [5, 5, 5, 5]);
});

test("foreground pet passives settle once and failed saves retry without rerolling", async () => {
  const state = seed();
  state.inventory.pets = [owned(4022, 1), owned(4024, 2)];
  state.player.equipmentSets[0][0].attributes.push(...[1, 2, 3, 4].map((type) => ({ type, value: 10000000 })));
  let fail = true, draws = 0;
  const writes = [], battles = [];
  const view = new Proxy({}, { get: (_, name) => (...args) => { if (name === "battle") battles.push(structuredClone(args[0])); } });
  const controller = createMonsterGameController({ catalog, view, wait: async () => {},
    random: () => { draws++; return 0; },
    store: { async load() { return structuredClone(state); }, async save(value) { writes.push(structuredClone(value)); if (fail) throw new Error("fixture"); } } });
  await controller.initialize();
  await controller.startCopy(1001, { hard: 1, waves: 1, repeat: false });
  assert.equal(battles.length, 1);
  assert.deepEqual(battles[0].petPassives.map(({ type }) => type), [9, 10, 9, 19]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].player.dropRate, 100);
  assert.equal(writes[0].player.experienceRate, 100);
  assert.equal(writes[0].player.goldRate, 100);
  const beforeRetry = draws;
  fail = false; assert.equal(await controller.save(), true);
  assert.equal(draws, beforeRetry);
  assert.deepEqual(writes[1], writes[0]);
});
