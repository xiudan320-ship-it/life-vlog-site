import assert from "node:assert/strict";
import test from "node:test";
import { createAdminStorageController, formatBytes } from "../modules/admin-storage.js";

function createElement() {
  return {
    hidden: false,
    textContent: "",
    attributes: new Map(),
    listeners: new Map(),
    setAttribute(name, value) { this.attributes.set(name, String(value)); },
    addEventListener(name, handler) { this.listeners.set(name, handler); },
    removeEventListener(name, handler) {
      if (this.listeners.get(name) === handler) this.listeners.delete(name);
    },
  };
}

function createView() {
  return {
    root: createElement(),
    used: createElement(),
    month: createElement(),
    status: createElement(),
    retry: createElement(),
  };
}

test("admin storage stays lazy and ordinary accounts never request usage", async () => {
  const view = createView();
  let requestCount = 0;
  const controller = createAdminStorageController({
    getElements: () => view,
    getAccountKey: () => "member-1",
    isAdmin: () => false,
    request: async () => { requestCount += 1; },
  });

  await controller.refresh();
  assert.equal(requestCount, 0);
  assert.equal(view.root.hidden, true);
  assert.equal(view.used.textContent, "—");
});

test("admin storage requests only after the settings view is mounted and deduplicates reads", async () => {
  let view = { root: null };
  let accountId = "admin-1";
  let requestCount = 0;
  const controller = createAdminStorageController({
    getElements: () => view,
    getAccountKey: () => accountId,
    isAdmin: () => true,
    request: async () => {
      requestCount += 1;
      return { data: { used_bytes: 2048, month_uploaded_bytes: 4096, capacity_label: "1 GB", object_count: 2, generated_at: "刚刚" } };
    },
  });

  await controller.refresh();
  assert.equal(requestCount, 0);
  view = createView();
  const first = controller.refresh();
  const second = controller.refresh();
  await Promise.all([first, second]);
  assert.equal(requestCount, 1);
  assert.equal(view.used.textContent, "2.0 KB / 1 GB");
  assert.equal(view.month.textContent, "本月上传 4.0 KB");
  assert.match(view.status.textContent, /2 个对象/);
  assert.equal(view.root.hidden, false);
  assert.equal(view.retry.listeners.has("click"), true);
  assert.equal(formatBytes(1024 * 1024), "1.00 MB");
  assert.equal(accountId, "admin-1");
});

test("late usage responses cannot write into a new account view", async () => {
  const view = createView();
  let accountId = "admin-1";
  let resolveRequest;
  const request = () => new Promise((resolve) => { resolveRequest = resolve; });
  const controller = createAdminStorageController({
    getElements: () => view,
    getAccountKey: () => accountId,
    isAdmin: () => true,
    request,
  });

  const pending = controller.refresh();
  accountId = "admin-2";
  controller.reset();
  resolveRequest({ data: { used_bytes: 999999, month_uploaded_bytes: 999999, capacity_label: "1 GB", object_count: 99 } });
  await pending;
  assert.equal(view.root.hidden, true);
  assert.equal(view.used.textContent, "—");
  assert.equal(view.month.textContent, "本月上传 —");
});

test("current request failures expose a retryable state", async () => {
  const view = createView();
  const controller = createAdminStorageController({
    getElements: () => view,
    getAccountKey: () => "admin-1",
    isAdmin: () => true,
    request: async () => { throw new Error("fixture network error"); },
    logger: { warn() {} },
  });

  await controller.refresh();
  assert.equal(view.used.textContent, "读取失败");
  assert.equal(view.month.textContent, "本月上传读取失败");
  assert.equal(view.status.textContent, "读取失败，请稍后重试。");
});
