import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { equipBagItem, toggleEquippedSkill } from "../modules/monster/loadout-domain.js";
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
