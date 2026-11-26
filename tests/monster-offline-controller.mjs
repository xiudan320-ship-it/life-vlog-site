import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { MAX_OFFLINE_MS } from "../modules/monster/offline-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, enemies, copies, chapters, groups, equipmentTemplates, trials, pets, tasks, make] = await Promise.all(
  ["item", "skill", "enemy", "copy", "chapter", "drop-groups", "equipment-templates", "trial", "pet", "task", "make"].map(read),
);
const catalog = { items, skills, enemies, chapters, equipmentTemplates, trials, pets, tasks, make,
  copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })) };
const startTime = Date.parse("2030-01-01T00:00:00.000Z");
const clone = (value) => structuredClone(value);
const error = (status) => Object.assign(new Error(`fixture ${status}`), { status });
const tick = () => new Promise(setImmediate);
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await tick(); }
  throw new Error("fixture did not reach expected state");
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function settled(state) {
  const { offlineRun, ...rest } = state;
  return { state: { ...rest, gold: rest.gold + 200 }, summary: { elapsedMs: 5000, simulatedMs: 5000,
    victories: 1, kills: 2, gold: 200, experience: 5, items: [], reason: "claimed" } };
}
function fixture({ setup, calculateOffline, initialTime = startTime } = {}) {
  const initial = createNewGame(catalog);
  initial.player.name = "测试勇者";
  initial.progress.copies.push({ id: 1001, value: 1 });
  setup?.(initial);
  const data = { saved: clone(initial), now: initialTime, timeError: null, saveError: null, writes: [], events: [], calculations: [] };
  const store = {
    load: async () => clone(data.saved),
    getServerTime: async () => { if (data.timeGate) await data.timeGate; if (data.timeError) throw data.timeError; return data.now; },
    save: async (value) => {
      data.writes.push(clone(value));
      if (data.saveError) throw data.saveError;
      data.saved = clone(value);
    },
  };
  function controller() {
    const view = new Proxy({}, { get: (_, key) => (...args) => {
      data.events.push([key, ...args.map((arg) => typeof arg === "object" && arg !== null ? clone(arg) : arg)]);
      return Promise.resolve();
    } });
    return createMonsterGameController({ catalog, store, view, random: () => 12345,
      now: () => startTime + 999 * MAX_OFFLINE_MS, wait: async () => {},
      calculateOffline: async (options) => {
        data.calculations.push({ state: clone(options.state), serverNow: options.serverNow, signal: options.signal });
        return calculateOffline ? calculateOffline(options) : settled(options.state);
      } });
  }
  return { data, controller };
}
const panels = (f) => f.data.events.filter(([type]) => type === "offline").map(([, , , panel]) => panel);
const notices = (f) => f.data.events.filter(([type]) => type === "notice").map(([, message]) => message);
const statuses = (f) => f.data.events.filter(([type]) => type === "saveStatus");
const start = (controller) => controller.startOffline(1001, { hard: 1, waves: 2 });

// The device clock deliberately differs from the trusted time provided by the store.
test("start and reentry use server time, retain the saved run, and cap elapsed time", async () => {
  const f = fixture(); const first = f.controller(); await first.initialize(); await start(first);
  assert.deepEqual(f.data.saved.offlineRun, { copyId: 1001, hard: 1, waves: 2, startedAt: startTime, seed: 12345 });
  assert.equal(panels(f).at(-1).phase, "running"); assert.equal(panels(f).at(-1).elapsedMs, 0);
  first.destroy(); f.data.now = startTime + 90_000;
  const reentered = f.controller(); await reentered.initialize(); reentered.continue();
  await until(() => panels(f).at(-1).elapsedMs === 90_000);
  f.data.now = startTime + MAX_OFFLINE_MS + 10_000; reentered.continue();
  await until(() => panels(f).at(-1).elapsedMs === MAX_OFFLINE_MS);
  assert.equal(f.data.writes.length, 1);
  reentered.destroy();
});

test("calculation failure keeps the run and allows a single successful retry", async () => {
  let calls = 0;
  const f = fixture({ calculateOffline: ({ state, onProgress }) => {
    calls++; onProgress(0.5); if (calls === 1) throw new Error("calculation failed"); return settled(state);
  } });
  const controller = f.controller(); await controller.initialize(); await start(controller); f.data.now += 5000;
  const original = clone(f.data.saved); await controller.claimOffline();
  assert.deepEqual(f.data.saved, original); assert.equal(f.data.writes.length, 1);
  assert.equal(panels(f).at(-1).phase, "running"); assert.equal(panels(f).at(-1).elapsedMs, 5000);
  assert.match(notices(f).at(-1), /calculation failed/);
  await controller.claimOffline();
  assert.equal(calls, 2); assert.equal(f.data.writes.length, 2);
  assert.equal(f.data.saved.gold, original.gold + 200); assert.equal(f.data.saved.offlineRun, undefined);
  assert.deepEqual(f.data.calculations.map((entry) => entry.serverNow), [startTime + 5000, startTime + 5000]);
  assert.deepEqual(f.data.events.filter(([type]) => type === "offlineProgress").map(([, value]) => value), [0.5, 0.5]);
  assert.equal(panels(f).at(-1).phase, "result"); assert.equal(panels(f).at(-1).receipt.saved, true);
  await controller.claimOffline(); assert.equal(calls, 2); controller.destroy();
});

test("failed result save blocks another settlement and retries the identical state", async () => {
  const f = fixture(); const controller = f.controller(); await controller.initialize(); await start(controller);
  f.data.now += 5000; f.data.saveError = error(503); await controller.claimOffline();
  assert.equal(f.data.calculations.length, 1); assert.equal(panels(f).at(-1).receipt.status, 503);
  assert.equal(panels(f).at(-1).receipt.saved, false); assert.equal(f.data.saved.offlineRun.copyId, 1001);
  await controller.claimOffline(); assert.equal(f.data.calculations.length, 1);
  assert.match(notices(f).at(-1), /请先重试保存/);
  const failedWrite = clone(f.data.writes.at(-1)); f.data.saveError = null;
  assert.equal(await controller.save(), true); assert.deepEqual(f.data.writes.at(-1), failedWrite);
  assert.equal(f.data.saved.gold, failedWrite.gold); assert.equal(f.data.saved.offlineRun, undefined);
  await controller.claimOffline(); assert.equal(f.data.calculations.length, 1); controller.destroy();
});

test("failed start save retains the same run for retry and blocks claiming until saved", async () => {
  const f = fixture(); const controller = f.controller(); await controller.initialize();
  f.data.saveError = error(503); await start(controller);
  assert.equal(panels(f).at(-1).receipt.status, 503); assert.equal(panels(f).at(-1).receipt.saved, false);
  const failedWrite = clone(f.data.writes[0]); await controller.claimOffline();
  assert.equal(f.data.calculations.length, 0); assert.match(notices(f).at(-1), /请先重试保存/);
  f.data.saveError = null; assert.equal(await controller.save(), true);
  assert.deepEqual(f.data.writes[1], failedWrite); assert.deepEqual(f.data.saved.offlineRun, failedWrite.offlineRun);
  controller.destroy();
});

test("an existing offline run blocks battle, crafting and task rewards without changing state", async () => {
  const f = fixture({ setup(state) {
    state.player.level = 5;
    state.inventory.goods.push(...[5038, 5046, 5048].map((id) => ({ id, type: 1, quantity: 100 })));
    state.taskBoard = { points: 0, dailyRewardDay: null, entries: [
      { id: 1, type: 1, target: 1006, need: 10, count: 10, claimed: 0 },
    ] };
  } });
  const controller = f.controller(); await controller.initialize(); await start(controller);
  const before = clone(f.data.saved), priorWrites = f.data.writes.length;
  const attempts = [
    () => controller.startCopy(1001, { hard: 1, waves: 1, repeat: false }),
    () => controller.challengeCopy(1001, { hard: 1, waves: 1, repeat: false }),
    () => controller.craft(6002),
    () => controller.claimTask(1),
    () => controller.claimDailyReward(),
  ];
  for (const attempt of attempts) {
    const noticeCount = notices(f).length;
    await attempt();
    assert.equal(notices(f).length, noticeCount + 1);
    assert.match(notices(f).at(-1), /请先领取离线挂机收益/);
    assert.equal(f.data.writes.length, priorWrites);
    assert.deepEqual(f.data.saved, before);
  }
  assert.equal(f.data.events.filter(([type]) => type === "battle").length, 0);
  await controller.claimOffline();
  assert.deepEqual(f.data.calculations[0].state, before, "blocked actions must not mutate the in-memory state");
  controller.destroy();
});

for (const code of [401, 409]) {
  test(`server time ${code} prevents start and settlement without writes`, async () => {
    const f = fixture(); const controller = f.controller(); await controller.initialize();
    f.data.timeError = error(code); await start(controller);
    assert.equal(f.data.writes.length, 0); assert.equal(statuses(f).at(-1)[3], code);
    f.data.timeError = null; await start(controller); const saved = clone(f.data.saved);
    f.data.timeError = error(code); await controller.claimOffline();
    assert.equal(f.data.calculations.length, 0); assert.deepEqual(f.data.saved, saved);
    assert.equal(f.data.writes.length, 1); assert.equal(panels(f).at(-1).receipt.status, code);
    assert.equal(statuses(f).at(-1)[3], code); controller.destroy();
  });
  test(`result save ${code} preserves the already calculated result for recovery`, async () => {
    const f = fixture(); const controller = f.controller(); await controller.initialize(); await start(controller);
    f.data.saveError = error(code); await controller.claimOffline();
    assert.equal(f.data.calculations.length, 1); assert.equal(panels(f).at(-1).receipt.status, code);
    assert.equal(controller.getSaveErrorStatus(), code); assert.equal(f.data.saved.offlineRun.copyId, 1001);
    await controller.claimOffline(); assert.equal(f.data.calculations.length, 1); controller.destroy();
  });
}

test("destroy aborts calculation and discards late progress and settlement", async () => {
  const gate = deferred(); let options;
  const f = fixture({ calculateOffline: (input) => { options = input; return gate.promise; } });
  const controller = f.controller(); await controller.initialize(); await start(controller);
  const claiming = controller.claimOffline(); await until(() => Boolean(options));
  assert.equal(panels(f).at(-1).phase, "calculating");
  await controller.claimOffline(); assert.equal(f.data.calculations.length, 1);
  controller.destroy(); assert.equal(options.signal.aborted, true);
  const eventCount = f.data.events.length; options.onProgress(0.9); gate.resolve(settled(options.state)); await claiming;
  assert.equal(f.data.events.length, eventCount); assert.equal(f.data.writes.length, 1);
  assert.equal(f.data.saved.offlineRun.copyId, 1001);
});

test("destroy while reading server time ignores a late start response", async () => {
  const gate = deferred(); const f = fixture(); const controller = f.controller(); await controller.initialize();
  f.data.timeGate = gate.promise;
  const starting = start(controller); controller.destroy(); const eventCount = f.data.events.length;
  gate.resolve(); await starting;
  assert.equal(f.data.events.length, eventCount); assert.equal(f.data.writes.length, 0);
  assert.equal(f.data.saved.offlineRun, undefined);
});
