import assert from "node:assert/strict";
import test from "node:test";
import { createAppStartupController } from "../modules/app-startup-controller.js";

test("startup completes the splash once and reports a local-session failure", async () => {
  let completeCount = 0;
  let reportCount = 0;
  const marks = [];
  const controller = createAppStartupController({
    restoreCloudflareSessionBackup: async () => {},
    initializeLocalSession: async () => {
      throw new Error("corrupt local session");
    },
    synchronizeRemoteSession: async () => {
      throw new Error("must not sync after local failure");
    },
    completeSplash: async () => {
      completeCount += 1;
    },
    reportError: () => {
      reportCount += 1;
    },
    performanceMonitor: { mark: (name) => marks.push(name) },
  });

  assert.equal(await controller.start(), false);
  assert.equal(await controller.start(), false);
  assert.equal(completeCount, 1);
  assert.equal(reportCount, 1);
  assert.ok(marks.includes("app-bootstrap-failed"));
  assert.ok(marks.includes("splash-hidden"));
  assert.ok(!marks.includes("remote-sync-start"));
});

test("startup activates the initial route before remote synchronization", async () => {
  const events = [];
  const controller = createAppStartupController({
    restoreCloudflareSessionBackup: async () => events.push("backup"),
    initializeLocalSession: async () => events.push("local"),
    synchronizeRemoteSession: async () => events.push("remote"),
    completeSplash: async () => events.push("splash"),
    initializePerformance: async () => events.push("performance"),
    performanceMonitor: { mark: (name) => events.push(name) },
  });

  assert.equal(await controller.start({
    activateInitialRoute: async () => events.push("route"),
  }), true);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.ok(events.indexOf("route") > events.indexOf("splash"));
  assert.ok(events.indexOf("route") < events.indexOf("remote"));
});
