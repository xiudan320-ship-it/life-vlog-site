import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { addPortDrops } from "../modules/monster/port-drop-domain.js";
import { createOfflineRun, simulateOffline, MAX_OFFLINE_MS } from "../modules/monster/offline-domain.js";
import { refreshGamePlayer } from "../modules/monster/player-refresh-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { advanceSoloBattle } from "../modules/monster/battle-domain.js";
import { payCopyEntry, settleCopyVictory } from "../modules/monster/adventure-domain.js";
import { recordTaskBattle } from "../modules/monster/task-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, enemies, copies, chapters, groups, equipmentTemplates, trials, tasks] = await Promise.all(
  ["item", "skill", "pet", "enemy", "copy", "chapter", "drop-groups", "equipment-templates", "trial", "task"].map(read));
const catalog = { items, skills, pets, enemies, chapters, equipmentTemplates, trials, tasks, copies: addPortDrops(copies, groups) };
const startedAt = 1700000000000;
function setup(copyId = 1001) {
  const state = createNewGame(catalog);
  state.player.name = "挂机测试";
  state.player.level = 80;
  state.progress.chapterId = 21;
  state.progress.copies.push({ id: copyId, value: 1 });
  state.player.equipmentSets[0][0].attributes.push(...[1, 2, 3, 4].map((type) => ({ type, value: 10000000 })));
  return refreshGamePlayer(state, catalog);
}
function begin(state, copyId = 1001, overrides = {}) {
  return createOfflineRun({ state, catalog, copyId, hard: 1, waves: 1, startedAt, seed: 123456789, ...overrides });
}

test("offline requires an unlocked, previously cleared supported stage and available tickets", () => {
  const state = setup();
  assert.deepEqual(begin(state).offlineRun, { copyId: 1001, hard: 1, waves: 1, startedAt, seed: 123456789 });
  assert.throws(() => begin(state, 1002), /先通关/);
  assert.throws(() => begin(state, 3101), /地图或副本/);
  state.progress.copies.push({ id: 2001, value: 1 });
  assert.throws(() => begin(state, 2001), /卷轴不足/);
  assert.throws(() => begin(state, 1001, { seed: 0 }), /参数无效/);
  assert.throws(() => begin(state, 1001, { waves: 101 }), /参数无效/);
  assert.throws(() => begin(begin(state)), /先领取/);
});

test("server elapsed time caps at 20 hours and a seeded replay is deterministic", () => {
  const original = begin(setup());
  const before = structuredClone(original);
  const progress = [];
  const capped = simulateOffline({ state: original, catalog, serverNow: startedAt + MAX_OFFLINE_MS, onProgress: (value) => progress.push(value) });
  const later = simulateOffline({ state: original, catalog, serverNow: startedAt + MAX_OFFLINE_MS * 2 });
  assert.deepEqual(capped, later);
  assert.deepEqual(original, before);
  assert.equal(capped.summary.elapsedMs, MAX_OFFLINE_MS);
  assert.equal(capped.summary.reason, "cap");
  assert.ok(capped.summary.victories > 0 && capped.summary.kills >= capped.summary.victories);
  assert.ok(capped.summary.gold > 0 && capped.summary.experience > 0 && capped.summary.items.length > 0);
  assert.equal(capped.state.offlineRun, undefined);
  assert.strictEqual(validateMonsterSave(capped.state), capped.state);
  assert.ok(progress.length > 1 && progress.every((value, index) => value >= 0 && value <= 1 && (!index || value >= progress[index - 1])));
  assert.throws(() => simulateOffline({ state: original, catalog, serverNow: startedAt - 1 }), /服务器时间/);
});

test("one offline victory matches the foreground battle and settlement with the same draws", () => {
  const run = begin(setup());
  const copy = catalog.copies.find((entry) => entry.id === run.offlineRun.copyId);
  let value = run.offlineRun.seed;
  const draw = () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) & 0x7fffffff; };
  let foreground = refreshGamePlayer(run, catalog);
  const prepared = prepareCopyBattle({ copy, player: foreground.player, clearCount: 1, hard: 1, waves: 1, catalog, draw });
  foreground = payCopyEntry(foreground, copy);
  let battle = { ...prepared.battle, bonuses: foreground.player.bonuses };
  let turns = 0;
  while (![1, 3].includes(battle.outcome)) { battle = advanceSoloBattle(battle, { draw, skills: catalog.skills }).battle; turns++; }
  assert.equal(battle.outcome, 3);
  foreground = { ...foreground, player: { ...foreground.player, hp: battle.allies[0].hp, dead: battle.allies[0].dead } };
  foreground = recordTaskBattle({ state: foreground, copy, prepared, battle });
  const settled = settleCopyVictory({ state: foreground, copy, prepared, catalog, draw });
  foreground = refreshGamePlayer(settled.state, catalog);
  delete foreground.offlineRun;
  const offline = simulateOffline({ state: run, catalog, serverNow: startedAt + turns * 550 + 450 });
  assert.deepEqual(offline.state, foreground);
  assert.equal(offline.summary.victories, 1);
  assert.equal(offline.summary.gold, settled.reward.gold);
  assert.equal(offline.summary.experience, settled.reward.experience);
});

test("short claims never fabricate rewards or clear progress", () => {
  const state = begin(setup());
  const result = simulateOffline({ state, catalog, serverNow: startedAt + 300 });
  assert.equal(result.summary.victories, 0);
  assert.equal(result.summary.kills, 0);
  assert.equal(result.summary.gold, 0);
  assert.deepEqual(result.state.progress, state.progress);
  assert.equal(result.state.offlineRun, undefined);
});

test("instance runs stop when the paid tickets run out", () => {
  const state = setup(2001);
  state.inventory.goods.push({ id: 5009, type: 1, quantity: 2 });
  const run = begin(state, 2001);
  const result = simulateOffline({ state: run, catalog, serverNow: startedAt + 3600000 });
  assert.equal(result.summary.reason, "tickets");
  assert.equal(result.summary.victories, 2);
  assert.equal(result.state.inventory.goods.find((item) => item.id === 5009), undefined);
  assert.equal(result.state.progress.copies.find((row) => row.id === 2001).value, 3);
});

test("a defeat stops the run and keeps the already defeated enemy rewards", () => {
  const state = setup();
  state.player.equipmentSets[0][0].attributes = [{ type: 1, value: 10000 }, { type: 4, value: 10000 }];
  const refreshed = refreshGamePlayer(state, catalog);
  const tough = { ...catalog.enemies.find((row) => row.id === 4001), id: 900001, name: "测试强敌",
    hp: 100000000, att: 10000000, def: 10000000, hit: 10000000, spo: 0, skillid1: 0, skillid2: 0 };
  const local = { ...catalog, enemies: [...catalog.enemies, tough], copies: catalog.copies.map((copy) => copy.id === 1001 ? { ...copy, enemyid2: tough.id } : copy) };
  const run = createOfflineRun({ state: refreshed, catalog: local, copyId: 1001, hard: 1, waves: 1, startedAt, seed: 123456789 });
  const result = simulateOffline({ state: run, catalog: local, serverNow: startedAt + 3600000 });
  assert.equal(result.summary.reason, "defeat");
  assert.equal(result.summary.victories, 0);
  assert.equal(result.summary.kills, 1);
  assert.ok(result.summary.gold > 0 && result.summary.experience > 0);
  assert.deepEqual(result.state.progress, run.progress);
});

test("offline settlement stops before a full cloud save exceeds the request limit", () => {
  const state = setup(2015);
  state.inventory.goods.push({ id: 5009, type: 1, quantity: 100000 });
  const gear = { ...state.player.equipmentSets[0][0], equipped: false, fixturePadding: "x".repeat(400) };
  const size = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
  const room = 1024 * 1024 - 4096 - size(state) - 1600;
  state.inventory.equipment = Array.from({ length: Math.floor(room / (size(gear) + 1)) }, () => ({ ...gear }));
  const run = begin(state, 2015);
  const result = simulateOffline({ state: run, catalog, serverNow: startedAt + MAX_OFFLINE_MS });
  assert.equal(result.summary.reason, "storage");
  assert.ok(result.summary.victories > 0);
  assert.ok(size(result.state) < 1024 * 1024 - 4096);
  assert.strictEqual(validateMonsterSave(result.state), result.state);
});

test("offline save fields are validated without altering accounts that have no run", () => {
  const state = setup();
  assert.strictEqual(validateMonsterSave(state), state);
  const run = begin(state);
  assert.strictEqual(validateMonsterSave(run), run);
  for (const offlineRun of [null, { ...run.offlineRun, copyId: 0 }, { ...run.offlineRun, hard: 7 },
    { ...run.offlineRun, waves: 101 }, { ...run.offlineRun, seed: 0 }, { ...run.offlineRun, startedAt: -1 }]) {
    assert.throws(() => validateMonsterSave({ ...state, offlineRun }), /离线挂机/);
  }
});
