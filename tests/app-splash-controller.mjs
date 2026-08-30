import assert from "node:assert/strict";
import test from "node:test";
import { createAppSplashController } from "../modules/app-splash-controller.js";

function createHarness({ stored = null, wallNow = 10_000 } = {}) {
  const timers = [];
  const storage = {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; },
  };
  const element = {
    hidden: false,
    classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); } },
    setAttribute(name, value) { this[name] = value; },
  };
  const blocked = {
    inert: false,
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { if (name !== "inert") delete this[name]; },
  };
  const body = {
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
  };
  const documentTarget = {
    body,
    querySelector: () => null,
    querySelectorAll: () => [blocked],
  };
  const controller = createAppSplashController({
    element,
    documentTarget,
    windowTarget: { matchMedia: () => ({ matches: false }) },
    now: () => 0,
    wallNow: () => wallNow,
    setTimeoutApi: (callback, delay) => { timers.push({ callback, delay }); },
    storage,
    version: "entry-test-v1",
    minVisibleMs: 520,
    exitDurationMs: 220,
  });
  return { controller, element, blocked, body, timers, getStored: () => stored };
}

async function flushTimers(harness) {
  while (harness.timers.length) {
    harness.timers.shift().callback();
    await Promise.resolve();
  }
}

test("splash keeps the first visit minimum and always releases app blocking", async () => {
  const harness = createHarness();
  const completion = harness.controller.complete();
  const firstTimer = harness.timers.shift();
  assert.equal(firstTimer.delay, 520);
  firstTimer.callback();
  await flushTimers(harness);
  assert.equal(await completion, true);
  assert.equal(harness.element.hidden, true);
  assert.equal(harness.body["aria-busy"], undefined);
  assert.equal(harness.blocked.inert, false);
  assert.match(harness.getStored(), /entry-test-v1/);
});

test("same-version short revisits skip the artificial splash delay", async () => {
  const harness = createHarness({ stored: JSON.stringify({ version: "entry-test-v1", completedAt: 9_500 }) });
  const completion = harness.controller.complete();
  const firstTimer = harness.timers.shift();
  assert.equal(firstTimer.delay, 0);
  firstTimer.callback();
  await flushTimers(harness);
  assert.equal(await completion, true);
  assert.equal(harness.element.hidden, true);
  assert.equal(harness.timers.length, 0);
});

test("corrupt splash preference data does not block completion", async () => {
  const harness = createHarness({ stored: "{" });
  const completion = harness.controller.complete();
  await flushTimers(harness);
  assert.equal(await completion, true);
  assert.equal(harness.element.hidden, true);
  assert.equal(harness.body["aria-busy"], undefined);
});
