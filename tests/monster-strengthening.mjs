import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { getUpgradeCost } from "../modules/monster/upgrade-domain.js";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [items, skills] = await Promise.all([read("../public/monster/data/item.json"), read("../public/monster/data/skill.json")]);
const catalog = { items, skills, pets: [] };
const target = { source: "equipped", index: 0, id: 6001 };
const item = (state) => state.player.equipmentSets[0][0];
const stones = (state) => state.inventory.goods.find((good) => good.id === 5003)?.quantity || 0;
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function fixture({ level = 0, quantity = 1000, draw = 0, save } = {}) {
  const state = createNewGame(catalog);
  item(state).strength = level;
  state.inventory.goods.push({ id: 5003, type: 1, quantity });
  const writes = [], updates = [], notices = [];
  let upgradeCalls = 0, draws = 0;
  const view = new Proxy({}, { get: (_, key) => {
    if (key === "upgrade") return () => { upgradeCalls++; };
    if (key === "updateUpgrade") return (...args) => updates.push(structuredClone({ state: args[0], receipt: args[3], session: args[4] }));
    if (key === "notice") return (message) => notices.push(message);
    return () => Promise.resolve();
  } });
  const controller = createMonsterGameController({ catalog, view,
    random: () => { draws++; return draw; }, wait: async () => {},
    store: { load: async () => structuredClone(state), save: async (value) => {
      const snapshot = structuredClone(value); writes.push(snapshot);
      if (save) await save(snapshot, writes.length);
    } },
  });
  return { state, controller, writes, updates, notices, get upgradeCalls() { return upgradeCalls; }, get draws() { return draws; } };
}

test("single upgrade updates the existing view instead of rebuilding it", async () => {
  const f = fixture(); await f.controller.initialize();
  f.controller.upgrade(target);
  await f.controller.performUpgrade(target, "strength", false);
  assert.equal(f.upgradeCalls, 1);
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1);
  assert.equal(item(f.writes[0]).strength, 1);
  assert.equal(item(f.updates.at(-1).state).strength, 1);
  assert.equal(f.updates.at(-1).receipt.saved, true);
  assert.match(f.updates.at(-1).receipt.message, /强化成功/);
});

test("continuous strengthening saves each attempt before reaching its target", async () => {
  const f = fixture(); await f.controller.initialize();
  await f.controller.strengthenUntil(target, 3, false);
  assert.deepEqual(f.writes.map((state) => item(state).strength), [1, 2, 3]);
  assert.equal(f.draws, 3);
  assert.deepEqual(f.updates.filter((update) => update.session.running).map((update) => update.session.attempts), [0, 1, 2, 3]);
  assert.equal(f.updates.at(-1).session.running, false);
  assert.match(f.updates.at(-1).receipt.message, /已强化到 \+3/);
});

test("the next attempt waits for the preceding save to finish", async () => {
  const gate = deferred();
  const f = fixture({ save: (_snapshot, index) => index === 1 ? gate.promise : undefined });
  await f.controller.initialize();
  const running = f.controller.strengthenUntil(target, 2, false);
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1);
  gate.resolve(); await running;
  assert.deepEqual(f.writes.map((state) => item(state).strength), [1, 2]);
  assert.equal(f.draws, 2);
});

test("failed strengthening spends materials without lowering level and stops on shortage", async () => {
  const f = fixture({ level: 5, quantity: 3, draw: 1000 });
  assert.equal(getUpgradeCost(item(f.state), "strength").goods[0].quantity, 3);
  await f.controller.initialize(); await f.controller.strengthenUntil(target, 6, false);
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1);
  assert.equal(item(f.writes[0]).strength, 5); assert.equal(stones(f.writes[0]), 0);
  assert.match(f.updates.find((update) => update.receipt)?.receipt.message, /强化失败，保留 \+5/);
  assert.equal(f.updates.at(-1).session.running, false);
  assert.match(f.updates.at(-1).receipt.message, /材料不足/);
});

test("failed save stops the batch and retry saves the same state without another draw", async () => {
  let fail = true;
  const f = fixture({ save: async () => { if (fail) throw Object.assign(new Error("fixture failure"), { status: 503 }); } });
  await f.controller.initialize(); await f.controller.strengthenUntil(target, 3, false);
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1);
  assert.deepEqual([f.updates.at(-1).receipt.saved, f.updates.at(-1).receipt.status], [false, 503]);
  await f.controller.performUpgrade(target, "strength", false);
  assert.equal(f.writes.length, 1); assert.match(f.notices.at(-1), /重试保存/);
  fail = false; assert.equal(await f.controller.save(), true);
  assert.equal(f.draws, 1); assert.equal(f.writes.length, 2);
  assert.deepEqual(f.writes[1], f.writes[0]);
});

test("stop waits for the in-flight save then ends after that one attempt", async () => {
  const gate = deferred(); const f = fixture({ save: () => gate.promise });
  await f.controller.initialize();
  const running = f.controller.strengthenUntil(target, 3, false);
  assert.equal(f.writes.length, 1); f.controller.stopStrengthening();
  gate.resolve(); await running;
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1);
  assert.equal(item(f.writes[0]).strength, 1);
  assert.equal(f.updates.at(-1).session.running, false);
  assert.match(f.updates.at(-1).receipt.message, /已停止连续强化/);
});

test("destroy invalidates an in-flight batch and prevents later view updates", async () => {
  const gate = deferred(); const f = fixture({ save: () => gate.promise });
  await f.controller.initialize();
  const running = f.controller.strengthenUntil(target, 3, false);
  const count = f.updates.length; f.controller.destroy(); gate.resolve(); await running;
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1); assert.equal(f.updates.length, count);
});

test("duplicate clicks cannot overlap and invalid targets never draw or save", async () => {
  const gate = deferred(); const f = fixture({ save: () => gate.promise });
  await f.controller.initialize();
  for (const level of [0, 31, 1.5]) await f.controller.strengthenUntil(target, level, false);
  await f.controller.strengthenUntil({ ...target, id: 9999 }, 1, false);
  assert.equal(f.writes.length, 0); assert.equal(f.draws, 0);
  assert.equal(f.notices.length, 4);
  const running = f.controller.strengthenUntil(target, 2, false);
  await f.controller.strengthenUntil(target, 2, false);
  await f.controller.performUpgrade(target, "strength", false);
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1);
  f.controller.stopStrengthening(); gate.resolve(); await running;
  assert.equal(f.writes.length, 1); assert.equal(f.draws, 1);
});
