import assert from "node:assert/strict";
import test from "node:test";
import { createOfflineSettingsController } from "../modules/offline-settings-controller.js";

class FakeElement {
  constructor({ id = "", children = {}, matches = {} } = {}) {
    this.id = id;
    this.children = children;
    this.matches = matches;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = "";
    this.innerHTML = "";
    this.value = "";
    this.min = "";
    this.max = "";
    this.step = "";
    this.hidden = false;
    this.disabled = false;
    this.open = false;
    this.parentElement = null;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    const payload = { target: this, currentTarget: this, preventDefault() {}, ...event };
    for (const listener of this.listeners.get(type) || []) listener(payload);
  }

  querySelector(selector) {
    return this.children[selector] || this.matches[selector] || null;
  }

  querySelectorAll(selector) {
    const value = this.children[selector] || this.matches[selector] || [];
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  closest() {
    return this.parentElement;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  focus() {}

  select() {}

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
    this.dispatch("close");
  }
}

function createFixture({ policy = "off", diaryCapacityMb = 100, secretCapacityMb = 300 } = {}) {
  const span = new FakeElement();
  const small = new FakeElement();
  const cacheLimitButton = new FakeElement({ children: { span, small } });
  const policyLabel = new FakeElement();
  const policyValue = new FakeElement();
  const policyHelp = new FakeElement();
  const policyButton = new FakeElement({
    children: { span: policyLabel, em: policyValue, small: policyHelp },
  });
  const settingsStorage = new FakeElement();
  const cacheLimitDialog = new FakeElement();
  const cacheLimitInput = new FakeElement();
  const secretCacheLimitInput = new FakeElement();
  const settingsCacheLimitValue = new FakeElement();
  const cacheLimitStatus = new FakeElement();
  const cacheLimitForm = new FakeElement({
    children: {
      h2: new FakeElement(),
      ".cache-limit-hint": new FakeElement(),
      "[data-cache-limit-preset]": [],
    },
  });
  const refreshCacheInfoButton = new FakeElement();
  const clearAppCacheButton = new FakeElement();
  const elements = {
    settingsStorage,
    cacheLimitDialog,
    cacheLimitInput,
    secretCacheLimitInput,
    settingsCacheLimitValue,
    cacheLimitButton,
    mediaCachePolicyButton: policyButton,
    cacheLimitStatus,
    cacheLimitForm,
    refreshCacheInfoButton,
    clearAppCacheButton,
  };
  const documentTarget = {
    defaultView: { matchMedia: () => ({ matches: false }) },
    querySelector(selector) {
      return {
        "#settingsStorage": settingsStorage,
        "#secretCacheLimitInput": secretCacheLimitInput,
        "#mediaCachePolicyButton": policyButton,
        "#downloadDiaryOfflineButton": null,
        "#downloadSecretOfflineButton": null,
        "#clearDiaryCacheButton": null,
        "#clearSecretCacheButton": null,
      }[selector] || null;
    },
  };
  const savedPolicies = [];
  const fixture = {
    controller: createOfflineSettingsController({
      elements,
      documentRef: documentTarget,
      windowRef: { requestAnimationFrame: (callback) => callback(), setTimeout, clearTimeout },
      constants: {
        defaultDiaryCacheMb: 100,
        defaultSecretCacheMb: 300,
        minCacheMb: 20,
        maxCacheMb: 2000,
        secretMediaCacheName: "secret-media",
        diaryMediaCacheName: "diary-media",
        secretItemsCacheKey: "secret-items",
        photoFeedCacheKey: "photo-feed",
      },
      mediaCacheService: {
        deleteCache: async () => {},
        deleteManagedCaches: async () => {},
      },
      clearOfflineCache: async () => {},
      getUserId: () => "fixture-user",
      loadCacheCapacityMb: (type) => type === "secret" ? secretCapacityMb : diaryCapacityMb,
      saveCacheCapacityMb: (type, value) => Number(value),
      scheduleOfflineMediaCache: () => {},
      refreshCacheInfo: async () => {},
      loadMediaCachePolicy: () => policy,
      saveMediaCachePolicy: (next) => {
        policy = next;
        savedPolicies.push(next);
        return next;
      },
      showMiniToast: () => {},
      dismissMiniToast: () => {},
      collectSecretOfflineMediaUrls: () => [],
      collectDiaryOfflineMediaUrls: () => [],
      cacheOfflineMedia: async () => ({ complete: true, cached: 0, requested: 0, bytes: 0 }),
      formatFileSize: (bytes) => `${bytes} B`,
      openSettingsChildDialog: () => {},
      reopenSettingsAfterChildDialog: () => {},
    }),
    elements,
    policyButton,
    policyValue,
    policyHelp,
    savedPolicies,
  };
  return fixture;
}

test("offline settings render finite capacity and persisted policy state", () => {
  const fixture = createFixture();
  const viewModel = fixture.controller.initialize();

  assert.deepEqual(viewModel, {
    diaryCapacityMb: 100,
    secretCapacityMb: 300,
    policy: "off",
    policyLabel: "已关闭",
    policyHelp: "只通过下面按钮手动下载",
  });
  assert.equal(fixture.elements.settingsCacheLimitValue?.textContent, "日记 100 MB · 秘藏 300 MB");
  assert.equal(fixture.policyButton.getAttribute("aria-pressed"), "false");
  assert.equal(fixture.policyValue.textContent, "已关闭");
  assert.equal(fixture.policyHelp.textContent, "只通过下面按钮手动下载");

  fixture.controller.initialize();
  fixture.policyButton.dispatch("click");
  assert.deepEqual(fixture.savedPolicies, ["wifi"]);
  assert.equal(fixture.policyButton.getAttribute("aria-pressed"), "true");
  assert.equal(fixture.policyValue.textContent, "Wi-Fi · 最新 20 条");
});

test("offline settings save capacity without resetting policy", async () => {
  const fixture = createFixture({ policy: "wifi" });
  fixture.controller.initialize();
  fixture.elements.cacheLimitInput.value = "240";
  fixture.elements.secretCacheLimitInput.value = "600";

  await fixture.controller.saveCacheLimitFromDialog({ preventDefault() {} });

  assert.equal(fixture.elements.settingsCacheLimitValue.textContent, "日记 240 MB · 秘藏 600 MB");
  assert.equal(fixture.policyButton.getAttribute("aria-pressed"), "true");
  assert.equal(fixture.policyValue.textContent, "Wi-Fi · 最新 20 条");
});
