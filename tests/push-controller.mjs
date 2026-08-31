import assert from "node:assert/strict";
import test from "node:test";
import { createPushController } from "../modules/push-controller.js";

class FakeElement {
  constructor() {
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  querySelector(selector) {
    return this.children?.[selector] || null;
  }
}

function installGlobals(values) {
  const names = Object.keys(values);
  const previous = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  names.forEach((name) => Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: values[name],
  }));
  return () => names.forEach((name) => {
    const descriptor = previous.get(name);
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

test("push settings bind after lazy render and close locally before remote cleanup", async () => {
  const state = new FakeElement();
  const detail = new FakeElement();
  const enable = new FakeElement();
  const disable = new FakeElement();
  const status = new FakeElement();
  const group = new FakeElement();
  group.children = {
    "#enablePushNotifications": enable,
    "#disablePushNotifications": disable,
  };
  const documentTarget = {
    elements: new Map(),
    querySelector(selector) {
      return this.elements.get(selector) || null;
    },
  };
  let subscription = {
    endpoint: "https://push.example/fixture-endpoint",
    toJSON: () => ({ endpoint: "https://push.example/fixture-endpoint" }),
    unsubscribe: async () => {
      unsubscribeCalls += 1;
      subscription = null;
      return true;
    },
  };
  let unsubscribeCalls = 0;
  let releaseRemote;
  let remoteStarted;
  const remoteGate = new Promise((resolve) => { releaseRemote = resolve; });
  const remoteStartedGate = new Promise((resolve) => { remoteStarted = resolve; });
  const requestCalls = [];
  const clearBadge = [];
  const serviceWorker = {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: async () => subscription,
      },
    }),
  };
  const navigatorTarget = {
    serviceWorker,
    userAgent: "Fixture Browser",
    clearAppBadge: async () => clearBadge.push(true),
  };
  const windowTarget = {
    PushManager: class PushManager {},
    Notification: { permission: "granted" },
    matchMedia: () => ({ matches: false }),
    navigator: navigatorTarget,
    protocol: "http:",
  };
  const notification = windowTarget.Notification;
  const restore = installGlobals({
    document: documentTarget,
    navigator: navigatorTarget,
    window: windowTarget,
    Notification: notification,
    localStorage: { getItem: () => null, setItem: () => {} },
  });

  try {
    const controller = createPushController({
      elements: {},
      request: async (path, options) => {
        requestCalls.push([path, options]);
        if (path === "/api/push/unsubscribe") {
          remoteStarted();
          await remoteGate;
          throw new Error("offline fixture");
        }
        return { data: { publicKey: "" } };
      },
      getSession: () => ({ user: { id: "fixture-user" } }),
      getDatabase: () => null,
      getPhotos: () => [],
      prependPhoto: () => {},
      loadNotifications: async () => {},
      openNotificationsPanel: async () => {},
      setActiveSettingsSection: () => {},
      switchPage: () => {},
      openPhoto: () => {},
      showToast: () => {},
    });

    controller.ensureSettingsPage();
    assert.equal(group.dataset.pushUiBound, undefined, "early binding should not mark missing settings DOM");

    documentTarget.elements.set("#settingsNotifications", group);
    documentTarget.elements.set("#pushNotificationState", state);
    documentTarget.elements.set("#pushNotificationDetail", detail);
    documentTarget.elements.set("#enablePushNotifications", enable);
    documentTarget.elements.set("#disablePushNotifications", disable);
    documentTarget.elements.set("#pushNotificationStatus", status);
    controller.ensureSettingsPage();
    controller.ensureSettingsPage();
    assert.equal(group.dataset.pushUiBound, "true");
    assert.equal(enable.listeners.get("click")?.length, 1);
    assert.equal(disable.listeners.get("click")?.length, 1);

    const first = controller.disable();
    const second = controller.disable();
    assert.equal(disable.disabled, true, "close action should be busy immediately");
    await remoteStartedGate;
    assert.equal(unsubscribeCalls, 1, "repeated close actions must share one operation");
    assert.equal(requestCalls.length, 1);
    assert.equal(requestCalls[0][0], "/api/push/unsubscribe");
    assert.equal(requestCalls[0][1].body, JSON.stringify({ endpoint: "https://push.example/fixture-endpoint" }));
    releaseRemote();
    await Promise.all([first, second]);
    assert.equal(status.textContent, "本机已关闭，云端记录清理失败，可联网后重试。");
    assert.equal(clearBadge.length, 1);
    assert.equal(disable.hidden, true, "local subscription state should drive the final UI");
    assert.equal(enable.disabled, false, "busy state should be released after cleanup");
    assert.equal(disable.disabled, false, "close action should not remain disabled after cleanup");
    assert.equal(disable.getAttribute("aria-busy"), null);

    await controller.disable();
    assert.equal(status.textContent, "这台设备的通知已关闭。", "missing subscription should be idempotent");
    assert.equal(requestCalls.length, 1, "idempotent local close should not retry without an endpoint");
  } finally {
    restore();
  }
});
