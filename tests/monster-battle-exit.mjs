import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, enemies, copies, chapters, groups, equipmentTemplates, trials, pets, tasks] = await Promise.all(["item", "skill", "enemy", "copy", "chapter", "drop-groups", "equipment-templates", "trial", "pet", "task"].map(read));
const catalog = { items, skills, enemies, chapters, equipmentTemplates, trials, pets, tasks, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })) };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function until(condition) { for (let i = 0; i < 300; i++) { if (condition()) return; await new Promise(setImmediate); } throw new Error("fixture did not reach expected state"); }
function fixture({ save, setup, draw = () => 0 } = {}) {
  const state = createNewGame(catalog); state.player.name = "测试勇者";
  state.player.equipmentSets[0][0].attributes.push(...[1, 2, 3, 4].map((type) => ({ type, value: 10000000 })));
  setup?.(state);
  const writes = [], waits = [], events = [], statuses = [];
  const view = new Proxy({}, { get: (_, key) => (...args) => {
    if (key === "saveStatus") statuses.push(args);
    else events.push([key, ...args]);
    return Promise.resolve();
  } });
  const controller = createMonsterGameController({ catalog, view, random: draw,
    wait: (ms) => { const gate = deferred(); waits.push({ ms, ...gate }); return gate.promise; },
    store: { load: async () => structuredClone(state), save: async (value) => { writes.push(structuredClone(value)); await save?.(writes.length); } },
  });
  return { state, controller, writes, waits, events, statuses };
}
const start = (f) => f.controller.startCopy(1001, { hard: 1, waves: 1, repeat: true });
async function firstKill(f) {
  for (let i = 0; i < 100; i++) {
    await until(() => f.waits.some((entry) => entry.ms === 550 && !entry.released));
    const next = f.waits.find((entry) => entry.ms === 550 && !entry.released);
    next.released = true; next.resolve();
    await new Promise(setImmediate);
    const battle = f.events.filter(([name]) => name === "battleUpdate").at(-1)?.[1];
    if (battle?.enemies.some((enemy) => enemy.dead)) return battle;
  }
  throw new Error("battle did not reach a kill");
}
async function finishCombat(f) {
  for (let i = 0; i < 100; i++) {
    await until(() => f.waits.some((entry) => !entry.released));
    const next = f.waits.find((entry) => !entry.released); next.released = true; next.resolve();
    if (next.ms === 450) return;
    assert.equal(next.ms, 550);
  }
  throw new Error("battle did not end");
}

test("exiting an unfinished battle cancels its timer without settlement or another encounter", async () => {
  const f = fixture(); await f.controller.initialize(); const running = start(f);
  await until(() => f.waits.some((entry) => entry.ms === 550));
  f.controller.exitBattle(); await running;
  assert.equal(f.writes.length, 0); assert.equal(f.events.filter(([name]) => name === "result").length, 0);
  assert.equal(f.events.filter(([name]) => name === "battle").length, 1);
  assert.equal(f.events.filter(([name]) => name === "home").length, 1);
  f.waits[0].resolve(); await new Promise(setImmediate);
  assert.equal(f.events.filter(([name]) => name === "battleUpdate").length, 0);
});

test("exit during settlement waits for the existing save and keeps the settled reward", async () => {
  const gate = deferred(); const f = fixture({ save: () => gate.promise }); await f.controller.initialize(); const running = start(f);
  await finishCombat(f);
  await until(() => f.writes.length === 1); const settled = structuredClone(f.writes[0]);
  f.controller.exitBattle(); assert.equal(f.events.filter(([name]) => name === "home").length, 1);
  assert.equal(f.controller.save(), undefined); gate.resolve(); await running;
  assert.deepEqual(f.writes, [settled]); assert.ok(settled.gold > f.state.gold);
  assert.equal(f.events.filter(([name]) => name === "result").length, 0);
  assert.match(f.statuses.at(-1)[0], /已保存/);
});

test("exit during a failed save retains retry state and never restarts the battle", async () => {
  const gate = deferred(); let fail = true;
  const f = fixture({ save: () => fail ? gate.promise : undefined }); await f.controller.initialize(); const running = start(f);
  await finishCombat(f);
  await until(() => f.writes.length === 1); f.controller.exitBattle(); gate.reject(Object.assign(new Error("fixture"), { status: 401 })); await running;
  assert.equal(f.statuses.at(-1)[2], 401); fail = false; assert.equal(await f.controller.save(), true);
  assert.deepEqual(f.writes[1], f.writes[0]); assert.equal(f.events.filter(([name]) => name === "battle").length, 1);
});

test("exit between repeated battles preserves the saved result and cancels the next encounter", async () => {
  const f = fixture(); await f.controller.initialize(); const running = start(f);
  await finishCombat(f);
  await until(() => f.waits.some((entry) => entry.ms === 1800)); f.controller.exitBattle(); await running;
  assert.equal(f.writes.length, 1); assert.equal(f.events.filter(([name]) => name === "result").length, 1);
  assert.equal(f.events.filter(([name]) => name === "battle").length, 1);
});


test("account change during an in-flight save prevents stale callbacks from changing the new session", async () => {
  const gate = deferred(); const f = fixture({ save: () => gate.promise }); await f.controller.initialize(); const running = start(f);
  await finishCombat(f); await until(() => f.writes.length === 1);
  f.controller.exitBattle(); f.controller.destroy();
  const statusCount = f.statuses.length, homeCount = f.events.filter(([name]) => name === "home").length;
  gate.reject(Object.assign(new Error("account changed"), { status: 401 })); await running;
  assert.equal(f.statuses.length, statusCount);
  assert.equal(f.events.filter(([name]) => name === "home").length, homeCount);
  assert.equal(f.events.filter(([name]) => name === "result").length, 0);
});

test("exiting after a kill saves partial loot once without clear rewards or pet loyalty loss", async () => {
  const f = fixture({ setup(state) {
    state.progress.copies.push({ id: 1001, value: 1 });
    state.taskBoard = { points: 0, dailyRewardDay: null, entries: [{ id: 1, type: 1, target: 1001, need: 10, count: 0, claimed: 0 }] };
    state.inventory.pets.push({ id: 4001, type: 3, level: 1, quality: 1, experience: 0, partyRole: 1, care: { loyalty: 80, killCount: 599 } });
  } });
  await f.controller.initialize();
  const running = f.controller.startCopy(1001, { hard: 1, waves: 3, repeat: true });
  const battle = await firstKill(f); assert.equal(battle.enemies.filter((enemy) => enemy.dead).length, 1);
  f.controller.exitBattle(); f.controller.exitBattle(); await running;
  assert.equal(f.writes.length, 1);
  assert.ok(f.writes[0].gold > f.state.gold);
  assert.deepEqual(f.writes[0].progress, f.state.progress);
  assert.equal(f.writes[0].money, f.state.money);
  assert.deepEqual(f.writes[0].inventory.pets[0].care, f.state.inventory.pets[0].care);
  assert.equal(f.writes[0].taskBoard.entries[0].count, 1);
  assert.equal(f.events.filter(([name]) => name === "result").length, 0);
  assert.equal(f.events.filter(([name]) => name === "battle").length, 1);
});

test("a failed partial-loot save blocks further battles and retries the same credit once", async () => {
  const gate = deferred(); let fail = true;
  const f = fixture({ setup: (state) => state.progress.copies.push({ id: 1001, value: 1 }), save: () => fail ? gate.promise : undefined });
  await f.controller.initialize(); const running = f.controller.startCopy(1001, { hard: 1, waves: 3, repeat: true });
  await firstKill(f); f.controller.exitBattle(); await until(() => f.writes.length === 1);
  await f.controller.startCopy(1001, { hard: 1, waves: 3, repeat: true });
  gate.reject(Object.assign(new Error("offline"), { status: 503 })); await running;
  await new Promise(setImmediate);
  assert.equal(f.statuses.at(-1)[2], 503);
  assert.equal(f.events.some(([name, message]) => name === "notice" && message.includes("已保存")), false);
  await f.controller.startCopy(1001, { hard: 1, waves: 3, repeat: true });
  assert.equal(f.events.filter(([name]) => name === "battle").length, 1);
  fail = false; assert.equal(await f.controller.save(), true); assert.deepEqual(f.writes[1], f.writes[0]);
});

test("reward calculation errors still leave battle, release controls, and report the lost partial credit", async () => {
  let fail = false;
  const f = fixture({ setup: (state) => state.progress.copies.push({ id: 1001, value: 1 }), draw: () => { if (fail) throw new Error("fixture calculation"); return 0; } });
  await f.controller.initialize(); const running = f.controller.startCopy(1001, { hard: 1, waves: 3, repeat: true });
  await firstKill(f); fail = true;
  assert.doesNotThrow(() => f.controller.exitBattle()); await running; await new Promise(setImmediate);
  assert.equal(f.writes.length, 0);
  assert.equal(f.events.filter(([name]) => name === "home").length, 1);
  assert.deepEqual(f.events.filter(([name]) => name === "exitPending").map(([, value]) => value), [true, false]);
  assert.match(f.events.find(([name]) => name === "notice")[1], /收益计算失败/);
});

test("exit while an instance ticket is saving preserves that single entry charge", async () => {
  const gate = deferred();
  const f = fixture({ setup(state) { state.player.level = 10; state.inventory.goods.push({ id: 5009, type: 1, quantity: 2 }); }, save: () => gate.promise });
  await f.controller.initialize(); const running = f.controller.startCopy(2001, { hard: 1, waves: 1, repeat: true });
  await until(() => f.writes.length === 1); f.controller.exitBattle();
  assert.equal(f.events.filter(([name]) => name === "home").length, 1);
  assert.equal(f.writes[0].inventory.goods.find((item) => item.id === 5009).quantity, 1);
  gate.resolve(); await running;
  assert.equal(f.writes.length, 1); assert.equal(f.events.filter(([name]) => name === "result").length, 0);
});

test("exit after an instance kill credits partial loot after the saved ticket without another charge", async () => {
  const f = fixture({ setup(state) { state.player.level = 10; state.inventory.goods.push({ id: 5009, type: 1, quantity: 2 }); } });
  await f.controller.initialize(); const running = f.controller.startCopy(2001, { hard: 1, waves: 1, repeat: true });
  const battle = await firstKill(f); assert.ok(battle.enemies.some((enemy) => !enemy.dead));
  f.controller.exitBattle(); await running;
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].inventory.goods.find((item) => item.id === 5009).quantity, 1);
  assert.ok(f.writes[1].gold > f.writes[0].gold);
  assert.deepEqual(f.writes[1].progress, f.writes[0].progress);
});

test("partial exit in a repeated run preserves the prior victory and settles the new kills once", async () => {
  const f = fixture({ setup: (state) => state.progress.copies.push({ id: 1001, value: 1 }) });
  await f.controller.initialize(); const running = f.controller.startCopy(1001, { hard: 1, waves: 3, repeat: true });
  await finishCombat(f); await until(() => f.waits.some((entry) => entry.ms === 1800));
  assert.equal(f.writes.length, 1); const prior = structuredClone(f.writes[0]);
  f.waits.find((entry) => entry.ms === 1800).resolve();
  await until(() => f.events.filter(([name]) => name === "battle").length === 2);
  const previousUpdates = f.events.filter(([name]) => name === "battleUpdate").length;
  const battle = await firstKill(f);
  assert.ok(f.events.filter(([name]) => name === "battleUpdate").length > previousUpdates);
  assert.ok(battle.enemies.some((enemy) => !enemy.dead));
  f.controller.exitBattle(); await running;
  assert.equal(f.writes.length, 2); assert.ok(f.writes[1].gold > prior.gold);
  assert.deepEqual(f.writes[1].progress, prior.progress);
  assert.equal(f.events.filter(([name]) => name === "result").length, 1);
});

test("partial exit from a trial preserves the current level and score without a clear", async () => {
  const f = fixture({ setup(state) {
    state.player.level = 80;
    state.trial = { hard: 1, level: 2, score: 86, status: "ready", bestScores: { 1: 86 }, rewards: [] };
  } });
  await f.controller.initialize();
  const running = f.controller.startCopy(3101, { hard: 1, waves: 1, repeat: false, trialHard: 1 });
  const battle = await firstKill(f); assert.ok(battle.enemies.some((enemy) => !enemy.dead));
  f.controller.exitBattle(); await running;
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.writes[0].trial, f.state.trial);
  assert.deepEqual(f.writes[0].progress, f.state.progress);
  assert.equal(f.events.filter(([name]) => name === "result").length, 0);
});
