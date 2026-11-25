import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { recordAchievements, recordBattleAchievements, titleStatus, equipTitle } from "../modules/monster/achievement-domain.js";
import { refreshGamePlayer } from "../modules/monster/player-refresh-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, achievements, chapters, equipmentTemplates] = await Promise.all(["item", "skill", "achievement", "chapter", "equipment-templates"].map(read));
const catalog = { items, skills, achievements, chapters, equipmentTemplates, pets: [] };

test("milestones pay once and a newly unlocked title changes actual player attributes", () => {
  const initial = createNewGame({ items, skills }); initial.player.level = 10;
  const leveled = recordAchievements({ state: initial, catalog });
  assert.equal(leveled.money, initial.money + 5); assert.equal(leveled.achievementProgress.points, 5);
  const killed = recordAchievements({ state: leveled, catalog, increments: { 9: 1000 } });
  assert.equal(killed.money, initial.money + 10); assert.deepEqual(killed.achievementProgress.completed, [1, 18]);
  const title = achievements.find((row) => row.id === 101);
  assert.equal(titleStatus(title, killed, catalog).unlocked, true);
  const repeated = recordAchievements({ state: killed, catalog });
  assert.equal(repeated.money, killed.money); assert.equal(repeated.achievementProgress.points, 10);
  const before = refreshGamePlayer(killed, catalog);
  const equipped = refreshGamePlayer(equipTitle({ state: killed, catalog, id: 101 }), catalog);
  assert.equal(equipped.player.attack, before.player.attack + 20);
  assert.equal(equipped.player.maxHp, before.player.maxHp + 20);
  const removed = refreshGamePlayer(equipTitle({ state: equipped, catalog, id: 101 }), catalog);
  assert.equal(removed.player.attack, before.player.attack);
  assert.throws(() => equipTitle({ state: initial, catalog, id: 101 }), /尚未解锁/);
  validateMonsterSave(equipped);
  assert.throws(() => validateMonsterSave({ ...equipped, achievementProgress: { ...equipped.achievementProgress, completed: [1, 1] } }), /成就存档/);
});

test("battle counts preserve partial kills and only award victory progress on victory", () => {
  const state = createNewGame({ items, skills });
  const copy = { id: 2001, type: 2 };
  const prepared = { enemyCount: 3, encounterCopy: null };
  const lost = recordBattleAchievements({ state, catalog, copy, prepared, defeated: 2, victory: false });
  assert.equal(lost.achievementProgress.counters[9], 2);
  assert.equal(lost.achievementProgress.counters[12], undefined);
  const won = recordBattleAchievements({ state: lost, catalog, copy, prepared, defeated: 3, victory: true });
  assert.equal(won.achievementProgress.counters[9], 5);
  assert.equal(won.achievementProgress.counters[12], 1);
});

test("premium titles have a stated in-game points path; unsupported titles remain locked", () => {
  const state = createNewGame({ items, skills });
  const vip = achievements.find((row) => row.id === 114), oldEvent = achievements.find((row) => row.id === 120);
  state.achievementProgress = { counters: {}, completed: [], points: 100, titleId: 0 };
  assert.deepEqual(titleStatus(vip, state, catalog), { unlocked: true, detail: "移植版：成就积分 100 / 100" });
  assert.equal(titleStatus(oldEvent, state, catalog).unlocked, false);
});
