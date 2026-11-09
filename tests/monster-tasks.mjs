import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { selectLevelTasks, createTaskBoard, recordTaskBattle, claimTask, claimDailyReward, gameDay } from "../modules/monster/task-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [tasks, items, skills] = await Promise.all(["task", "item", "skill"].map((name) => read(`../public/monster/data/${name}.json`)));
const catalog = { tasks, items, skills };

test("27 native task resets preserve level window, ten unique tasks and rejection draws", async () => {
  const fixture = await read("./fixtures/monster/native-task-board-fixtures.json");
  for (const sample of fixture.cases) {
    let used = 0;
    const selected = selectLevelTasks({ level: sample.input.level, rows: tasks, draw: () => sample.rolls[used++] });
    assert.deepEqual(selected, sample.selected);
    assert.equal(used, sample.rolls.length);
  }
});

test("840 native daily victory counters preserve the five-level boundary, war types and claimed flags", async () => {
  const fixture = await read("./fixtures/monster/native-daily-counter-fixtures.json");
  for (const { input, expected } of fixture.cases) {
    const state = { player: { level: input.level }, taskBoard: { entries: [11, 12, 13].map((type) => ({ id: 9900 + type, type, count: 0, need: 10000, claimed: input.claimed })) } };
    const result = recordTaskBattle({ state, copy: { id: 99, type: input.copyType, level: input.copyLevel },
      prepared: { encounterCopy: input.encounter ? { id: 500 } : null },
      battle: { outcome: 3, enemies: Array.from({ length: input.enemyCount }, () => ({ dead: true })) } });
    const increments = result.taskBoard.entries.filter((entry) => entry.count).map((entry) => [entry.type, entry.count]);
    assert.deepEqual(increments, expected, JSON.stringify(input));
  }
});

test("material hand-in pays original rewards once and consumes the exact requested quantity", () => {
  const state = createTaskBoard({ state: createNewGame(catalog), catalog, draw: () => 0 });
  assert.deepEqual(state.taskBoard.entries.filter((entry) => entry.type <= 3).map((entry) => entry.id), [64, 72]);
  const row = tasks.find((row) => row.id === 64);
  assert.throws(() => claimTask({ state, id: 64, catalog }), /尚未完成/);
  state.inventory.goods.push({ id: row.target, type: 1, quantity: row.needcount + 2 });
  const original = structuredClone(state);
  const result = claimTask({ state, id: 64, catalog });
  assert.equal(result.money, state.money + row.awardmoney);
  assert.equal(result.taskBoard.points, row.awardspecial);
  assert.equal(result.inventory.goods[0].quantity, 2);
  assert.equal(result.taskBoard.entries.find((entry) => entry.id === 64).claimed, 1);
  assert.throws(() => claimTask({ state: result, id: 64, catalog }), /已经领取/);
  assert.equal(validateMonsterSave(result), result);
  assert.deepEqual(state, original);
});

test("daily claims refresh the board once per game day while retaining points and the prior save", () => {
  const state = createTaskBoard({ state: createNewGame(catalog), catalog, draw: () => 0 });
  state.taskBoard.points = 13;
  const day = gameDay(Date.parse("2030-02-02T16:00:00Z")); assert.equal(day, "2030-02-03");
  const result = claimDailyReward({ state, catalog, draw: () => 0, day });
  assert.equal(result.money, 20); assert.equal(result.inventory.goods.find((item) => item.id === 5009).quantity, 5);
  assert.equal(result.taskBoard.points, 13);
  assert.throws(() => claimDailyReward({ state: result, catalog, draw: () => 0, day }), /已领取/);
  assert.throws(() => claimDailyReward({ state: result, catalog, draw: () => 0, day: "2030-02-02" }), /已领取/);
  const tomorrow = claimDailyReward({ state: result, catalog, draw: () => 0, day: "2030-02-04" });
  assert.equal(tomorrow.inventory.goods.find((item) => item.id === 5009).quantity, 10);
});

test("battle task credit retains completed kills on defeat and requires victory for instance clears", () => {
  let state = createTaskBoard({ state: createNewGame(catalog), catalog, draw: () => 0 });
  const fixture = { copy: { id: 1001, type: 1, level: 1 }, prepared: {}, battle: { outcome: 1, enemies: [{ dead: true }, { dead: false }] } };
  state = recordTaskBattle({ state, ...fixture });
  assert.equal(state.taskBoard.entries.find((entry) => entry.type === 11).count, 1);
  assert.equal(state.taskBoard.entries.find((entry) => entry.type === 12).count, 0);
  fixture.copy = { id: 2001, type: 2, level: 1 }; fixture.battle.outcome = 3;
  state = recordTaskBattle({ state, ...fixture });
  assert.equal(state.taskBoard.entries.find((entry) => entry.type === 12).count, 1);
});
