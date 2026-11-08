import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { equipBagItem, toggleEquippedSkill } from "../modules/monster/loadout-domain.js";
import { settleCopyDefeat, settleCopyVictory } from "../modules/monster/adventure-domain.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, enemies, copies, chapters, groups, equipmentTemplates] = await Promise.all(["item", "skill", "enemy", "copy", "chapter", "drop-groups", "equipment-templates"].map(read));
const catalog = { items, skills, enemies, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })), chapters, equipmentTemplates };
function fixture({ fail = false } = {}) {
  const seed = createNewGame(catalog); seed.player.name = "Fixture hero"; seed.player.level = 10; seed.progress.levelId = 6;
  const writes = []; const battles = []; const results = []; const notices = [];
  let controller;
  const view = { menu() {}, home() {}, saveStatus() {}, repeatStatus() {}, notice(message) { notices.push(message); },
    battle(battle) { battles.push(structuredClone(battle)); }, battleUpdate() {},
    result(outcome, reward) { results.push({ outcome, reward }); if (results.length === 3) controller.stopRepeat(); },
    loadError(message) { throw new Error(message); } };
  const store = { fail, async load() { return structuredClone(seed); }, async save(state) { if (this.fail) throw new Error("fixture offline"); writes.push(structuredClone(state)); } };
  controller = createMonsterGameController({ catalog, store, view, random: () => 324508639, wait: async () => {} });
  return { controller, store, writes, battles, results, notices };
}
test("map selection, native first-clear waves and continuous battles settle into cloud saves", async () => {
  const f = fixture(); await f.controller.initialize();
  await f.controller.startCopy(1003, { type: 1, hard: 1, waves: 3, repeat: true });
  assert.deepEqual(f.battles.map((battle) => battle.enemies.length), [1, 3, 3]);
  assert.ok(f.battles.every((battle) => battle.enemies.every((enemy) => enemy.id === 4003 && enemy.equippedSkillIds.includes(21))));
  assert.deepEqual(f.results.map((result) => result.outcome), [3, 3, 3]);
  assert.equal(f.writes.length, 3);
  assert.equal(f.writes.at(-1).progress.copies.find((row) => row.id === 1003).value, 3);
});
test("a failed cloud settlement stops repetition and blocks new rewards until saved", async () => {
  const f = fixture({ fail: true }); await f.controller.initialize();
  await f.controller.startCopy(1001, { hard: 1, waves: 1, repeat: true });
  assert.equal(f.results.length, 1); assert.equal(f.writes.length, 0);
  await f.controller.startCopy(1001, { hard: 1, waves: 1, repeat: false });
  assert.equal(f.battles.length, 1);
  assert.match(f.notices.at(-1), /重试保存/);
  f.store.fail = false; await f.controller.save();
  assert.equal(f.writes.at(-1).progress.copies.find((row) => row.id === 1001).value, 1);
  await f.controller.startCopy(1001, { hard: 1, waves: 1, repeat: false });
  assert.equal(f.writes.at(-1).progress.copies.find((row) => row.id === 1001).value, 2);
});
test("equipment swaps preserve instances and skills obey level and three-slot limits", () => {
  let state = createNewGame(catalog); state.player.level = 80;
  for (const id of [2, 3, 4]) state = toggleEquippedSkill(state, id, skills);
  assert.throws(() => toggleEquippedSkill(state, 5, skills), /3 个/);
  state = toggleEquippedSkill(state, 3, skills);
  assert.deepEqual(state.player.equippedSkillIds, [2, 4]);
  const item = { ...state.player.equipmentSets[0][0], id: 6002, equipped: false };
  state.inventory.equipment.push(item);
  const next = equipBagItem(state, 0);
  assert.equal(next.inventory.equipment[0].id, 6001);
  assert.equal(next.player.equipmentSets[0].find((entry) => entry.subtype === 1).id, 6002);
  assert.equal(state.inventory.equipment[0].id, 6002);
});

function defeatFixture(id = 1001) {
  const state = createNewGame(catalog);
  Object.assign(state.player, { name: "Defeat fixture", goldRate: 100, experienceRate: 100, dropRate: 100 });
  const copy = catalog.copies.find((row) => row.id === id);
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 1, hard: 1, waves: 3, catalog, draw: () => 324508639 });
  const battle = structuredClone(prepared.battle);
  battle.enemies[0].dead = true; battle.enemies[0].hp = 0;
  const draw = (() => { let first = true; return () => { if (first) { first = false; return 324508639; } return 16; }; })();
  return { state, copy, prepared, battle, catalog, draw };
}

test("defeat retains killed map enemies' gold, experience and items without clearing the copy", () => {
  const input = defeatFixture();
  const before = structuredClone(input.state);
  const result = settleCopyDefeat(input);
  assert.equal(result.reward.defeatedCount, 1);
  assert.equal(result.reward.gold, 117);
  assert.equal(result.reward.experience, 15);
  assert.ok(result.reward.items.length > 0);
  assert.equal(result.state.gold, before.gold + 117);
  assert.equal(result.state.player.experience, before.player.experience + 15);
  assert.deepEqual(result.state.progress, before.progress);
  assert.equal(result.state.money, before.money);
  assert.ok(result.state.inventory.goods.length > before.inventory.goods.length);
  assert.deepEqual(input.state, before);
});

test("no kills grants no reward or random draws; a dead abyss boss grants no milestone or clear", () => {
  const zero = defeatFixture(); zero.battle.enemies[0].dead = false;
  const none = settleCopyDefeat({ ...zero, draw() { throw new Error("must not draw for zero kills"); } });
  assert.strictEqual(none.state, zero.state);
  assert.equal(none.reward.gold, 0); assert.equal(none.reward.experience, 0);
  const abyss = defeatFixture(5003);
  abyss.prepared.groups = {};
  const result = settleCopyDefeat(abyss);
  assert.deepEqual(result.reward.items, []);
  assert.ok(settleCopyVictory({ ...abyss, draw: () => 324508639 }).reward.items.some((item) => item.id === 5086));
  assert.deepEqual(result.state.progress, abyss.state.progress);
  assert.equal(result.reward.honor, 0);
});

test("partial instance rewards are proportional and do not count as a completed instance", () => {
  const input = defeatFixture(2001);
  const full = settleCopyVictory({ ...input, draw: () => 324508639 });
  const result = settleCopyDefeat(input);
  assert.equal(result.reward.gold, Math.trunc(full.reward.gold / input.prepared.enemyCount));
  assert.equal(result.reward.experience, Math.trunc(full.reward.experience / input.prepared.enemyCount));
  assert.deepEqual(result.state.progress, input.state.progress);
});

test("previous wins and partial automatic-run loot survive defeat, failed save and one retry", async () => {
  const seed = createNewGame(catalog); seed.player.name = "Auto fixture";
  const doomed = { ...catalog.enemies.find((row) => row.id === 4001), id: 900001, hp: 1000000, att: 1000000, def: 100000, hit: 1000000, spo: 0, skillid1: 0, skillid2: 0 };
  const custom = { ...catalog, enemies: [...catalog.enemies, doomed], copies: catalog.copies.map((row) => row.id === 1002 ? { ...row, enemyid1: 4001, enemyid2: doomed.id } : row) };
  const writes = [], results = [];
  const store = { fail: false, async load() { return structuredClone(writes.at(-1) || seed); }, async save(state) { if (this.fail) throw new Error("offline"); writes.push(structuredClone(state)); } };
  const view = { menu() {}, async home() {}, saveStatus() {}, repeatStatus() {}, notice() {}, battle() {}, battleUpdate() {}, result(outcome, reward) { results.push({ outcome, reward }); }, loadError(error) { throw new Error(error); } };
  const controller = createMonsterGameController({ catalog: custom, store, view, random: () => 324508639, wait: async () => {} });
  await controller.initialize();
  await controller.startCopy(1001, { hard: 1, waves: 1, repeat: false });
  const prior = structuredClone(writes.at(-1));
  store.fail = true;
  await controller.startCopy(1002, { hard: 1, waves: 1, repeat: true });
  assert.deepEqual(results.map((row) => row.outcome), [3, 1]);
  assert.equal(results[1].reward.defeatedCount, 1);
  assert.ok(results[1].reward.gold > 0);
  assert.equal(writes.length, 1);
  store.fail = false; await controller.save();
  const restored = await store.load();
  assert.equal(restored.gold, prior.gold + results[1].reward.gold);
  assert.equal(restored.progress.copies.find((row) => row.id === 1001).value, 1);
  assert.ok(!restored.progress.copies.some((row) => row.id === 1002));
  assert.equal(restored.progress.levelId, prior.progress.levelId);
});
