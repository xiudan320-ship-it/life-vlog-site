import assert from "node:assert/strict";
import test from "node:test";
import { createAppHealthMonitor } from "../modules/app-health-monitor.js";
import { classifyCloudflareError } from "../modules/cloudflare-client.js";

function createHarness() {
  const values = new Map();
  const listeners = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const navigatorTarget = {
    onLine: true,
    serviceWorker: { controller: {}, getRegistration: async () => ({ active: {}, waiting: null }) },
  };
  const windowTarget = {
    addEventListener: (type, listener) => listeners.set(type, listener),
  };
  let tick = 0;
  const monitor = createAppHealthMonitor({
    storage,
    navigatorTarget,
    windowTarget,
    buildVersion: "fixture-build",
    entry: "assets/index-fixture.js",
    now: () => `2026-08-27T00:00:${String(tick++).padStart(2, "0")}Z`,
  });
  return { monitor, navigatorTarget, storage, listeners };
}

test("health snapshot is bounded, useful, and excludes sensitive values", async () => {
  const { monitor, storage } = createHarness();
  monitor.install();
  monitor.setRoute("wishlist");
  monitor.setStartupStage("ready");
  monitor.setSync("ok", 200);
  for (let index = 0; index < 25; index += 1) {
    monitor.recordError(`error-${index}`, {
      name: "Error",
      message: "access_token=secret-token user@example.com diary body https://private.example/photo.jpg",
    });
  }
  monitor.recordApiError({ kind: "401", status: 401, message: "Bearer secret-token" });
  const snapshot = monitor.snapshot();
  const serialized = JSON.stringify(snapshot) + JSON.stringify(storage.getItem("life-vlog-health-history"));
  assert.equal(snapshot.buildVersion, "fixture-build");
  assert.equal(snapshot.entry, "assets/index-fixture.js");
  assert.equal(snapshot.route, "wishlist");
  assert.equal(snapshot.startupStage, "ready");
  assert.equal(snapshot.sync.status, "401");
  assert.equal(snapshot.sync.httpStatus, 401);
  assert.equal(snapshot.recentErrors.length, 20);
  assert.doesNotMatch(serialized, /secret-token|user@example\.com|private\.example|diary body/);
  monitor.clear();
  assert.equal(storage.getItem("life-vlog-health-history"), null);
});

test("health monitor restores only bounded, sanitized error history", () => {
  const values = new Map([[
    "life-vlog-health-history",
    JSON.stringify([{ kind: "api:401", name: "Error", at: "2026-08-27T00:00:00.000Z", token: "must-not-survive" }]),
  ]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const monitor = createAppHealthMonitor({ storage, navigatorTarget: { onLine: true }, now: () => "2026-08-27T01:00:00.000Z" });
  const snapshot = monitor.snapshot();
  assert.deepEqual(snapshot.recentErrors, [{ kind: "api:401", name: "Error", at: "2026-08-27T00:00:00.000Z" }]);
  assert.doesNotMatch(JSON.stringify(snapshot), /must-not-survive/);
});

test("Cloudflare errors are classified without depending on account data", () => {
  assert.equal(classifyCloudflareError({ status: 401 }), "401");
  assert.equal(classifyCloudflareError({ status: 403 }), "403");
  assert.equal(classifyCloudflareError({ status: 429 }), "429");
  assert.equal(classifyCloudflareError({ status: 503 }), "5xx");
  assert.equal(classifyCloudflareError({ name: "AbortError" }), "timeout");
  assert.equal(classifyCloudflareError(new TypeError("Failed to fetch")), "network");
});
