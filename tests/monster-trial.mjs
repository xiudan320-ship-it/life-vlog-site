import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { beginTrial, advanceTrial, selectTrialRewards, claimTrialRewards } from "../modules/monster/trial-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [items, skills, enemies, copies, chapters, groups, equipmentTemplates, trials, pets] = await Promise.all(
  ["item", "skill", "enemy", "copy", "chapter", "drop-groups", "equipment-templates", "trial", "pet"].map((name) => read(`../public/monster/data/${name}.json`)));
const catalog = { items, skills, enemies, copies: copies.map((row) => ({ ...row, dropGroups: groups[row.id] })), chapters, equipmentTemplates, trials, pets };

test("90 native trial scores match progression, 500 cap, bonus and draw consumption", async () => {
  const fixture = await read("./fixtures/monster/native-trial-progress-fixtures.json");
  for (const { input, expected, drawCount } of fixture.cases) {
    let used = 0;
    const result = advanceTrial({ trial: { ...input, bestScores: {} }, scoreBonus: input.scoreBonus, draw: () => { used++; return input.roll; } });
    assert.deepEqual({ level: result.level, hard: result.hard, score: result.score }, expected);
    assert.equal(result.bestScores[input.hard], expected.score); assert.equal(used, drawCount);
  }
  const rolls = [1, 10];
  assert.equal(advanceTrial({ trial: { level: 2, hard: 1, score: 0, bestScores: { 1: 500 } }, draw: () => rolls.shift() }).score, 98);
});

test("330 native trial reward samples preserve eligibility, row difficulty, quantities and RNG", async () => {
  const fixture = await read("./fixtures/monster/native-trial-reward-fixtures.json");
  for (const { input, expected, drawCount } of fixture.cases) {
    let used = 0;
    assert.deepEqual(selectTrialRewards({ ...input, rows: trials, draw: () => { used++; return input.roll; } }), expected, JSON.stringify(input));
    assert.equal(used, drawCount, JSON.stringify(input));
  }
});

test("trial claims credit materials, separately scored mode-7 gear and pets exactly once", () => {
  let state = beginTrial(createNewGame(catalog), 3);
  state = { ...state, trial: { ...state.trial, score: 4000, level: 14, status: "ended", bestScores: { 3: 4000 } } };
  const original = structuredClone(state);
  const result = claimTrialRewards({ state, catalog, draw: () => 0 });
  assert.equal(result.trial.status, "claimed");
  assert.equal(result.inventory.pets.length, 2);
  assert.ok(result.inventory.pets.every((item) => item.id === 4026));
  assert.equal(result.inventory.equipment.length, 3);
  assert.ok(result.inventory.equipment.every((item) => item.godLevel === 1 && item.quality === 6 && item.scoreTier === 1 && item.scoreValue === 1));
  assert.ok(result.inventory.goods.some((item) => item.id === 5116 && item.quantity > 2));
  assert.throws(() => claimTrialRewards({ state: result, catalog, draw: () => { throw new Error("reroll"); } }), /没有待结算/);
  assert.deepEqual(state, original);
  assert.equal(validateMonsterSave(result), result);
  const next = beginTrial(result, 1);
  assert.deepEqual(next.trial.bestScores, { 3: 4000 });
  assert.deepEqual([next.trial.score, next.trial.level, next.trial.rewards.length], [0, 1, 0]);
  assert.throws(() => beginTrial(next, 2), /本轮试炼/);
  assert.throws(() => validateMonsterSave({ ...next, trial: { ...next.trial, level: -1 } }), /试炼存档/);
});

function fixture() {
  const seed = beginTrial(createNewGame(catalog), 2); seed.player.level = 80;
  seed.player.equipmentSets[0][0].attributes.push(...[1, 2, 3, 4].map((type) => ({ type, value: 10000000 })));
  const writes = [], battles = [], results = [], notices = [];
  const local = { ...catalog, enemies: catalog.enemies.map((row) => row.id >= 4801 && row.id <= 4805 ? { ...row, skillid1: 0, skillid2: 0 } : row) };
  const store = { fail: false, async load() { return structuredClone(writes.at(-1) || seed); }, async save(value) { if (this.fail) throw new Error("offline"); writes.push(structuredClone(value)); } };
  const view = { menu() {}, async home() {}, saveStatus() {}, repeatStatus() {}, notice(message) { notices.push(message); }, battle(value) { battles.push(structuredClone(value)); }, battleUpdate() {}, result(outcome, reward) { results.push({ outcome, reward }); }, trial() {}, loadError(message) { throw new Error(message); } };
  const make = () => createMonsterGameController({ catalog: local, store, view, random: () => 4, wait: async () => {} });
  return { store, writes, battles, results, notices, make, local };
}

test("trial continuation uses next-level enemies and rewards after a cloud reload", async () => {
  const f = fixture(); let controller = f.make(); await controller.initialize();
  await controller.startCopy(3101, { trialHard: 3, repeat: true });
  assert.deepEqual(f.results.map((row) => row.outcome), [3]);
  assert.deepEqual([f.writes.at(-1).trial.level, f.writes.at(-1).trial.hard, f.writes.at(-1).trial.score], [2, 2, 86]);
  const gold = f.writes.at(-1).gold;
  controller.destroy(); controller = f.make(); await controller.initialize();
  await controller.startCopy(3101, { trialHard: 1 });
  assert.equal(f.writes.at(-1).trial.level, 3);
  assert.equal(f.writes.at(-1).trial.score, 184);
  assert.ok(f.battles[1].enemies[0].maxHp > f.battles[0].enemies[0].maxHp);
  assert.ok(f.writes.at(-1).gold > gold);
  f.store.fail = true;
  await controller.claimTrial();
  assert.equal(f.writes.at(-1).trial.status, "ready");
  const length = f.writes.length;
  await controller.claimTrial(); await controller.startCopy(3101);
  assert.equal(f.writes.length, length); assert.equal(f.battles.length, 2);
  f.store.fail = false; await controller.save();
  const retained = structuredClone(f.writes.at(-1));
  assert.equal(retained.trial.status, "claimed");
  assert.ok(retained.inventory.goods.length > 0);
  await controller.claimTrial();
  assert.deepEqual(f.writes.at(-1), retained);
});

test("trial defeat keeps prior score and kill rewards; ended round cannot advance", async () => {
  const f = fixture(); const controller = f.make(); await controller.initialize();
  await controller.startCopy(3101, {});
  const prior = structuredClone(f.writes.at(-1));
  for (const row of f.local.enemies.filter((row) => row.id >= 4801 && row.id <= 4805)) Object.assign(row, { hp: 100000000, att: 100000000, def: 100000000, hit: 100000000 });
  await controller.startCopy(3101, {});
  assert.equal(f.results.at(-1).outcome, 1);
  assert.deepEqual([f.writes.at(-1).trial.status, f.writes.at(-1).trial.score, f.writes.at(-1).trial.level], ["ended", prior.trial.score, prior.trial.level]);
  assert.ok(f.writes.at(-1).gold >= prior.gold);
  await controller.startCopy(3101, {});
  assert.equal(f.battles.length, 2);
  await controller.claimTrial(); assert.equal(f.writes.at(-1).trial.status, "claimed");
});
