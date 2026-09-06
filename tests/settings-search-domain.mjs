import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettingsQuery, querySettings } from "../modules/settings-search-domain.js";

test("settings search normalizes whitespace and case without network state", () => {
  assert.equal(normalizeSettingsQuery("  Wi-Fi  "), "wi-fi");
  assert.deepEqual(querySettings("  密码 ").map(({ id }) => id), [
    "changePasswordButton",
    "changeSecretPinButton",
    "recoveryKeyButton",
  ]);
});

test("settings search matches labels, descriptions, and synonyms in stable order", () => {
  assert.deepEqual(querySettings("缓存").map(({ id }) => id), [
    "refreshCacheInfoButton",
    "cacheLimitButton",
    "mediaCachePolicyButton",
    "downloadDiaryOfflineButton",
    "downloadSecretOfflineButton",
    "settingsDiagnostics",
  ]);
  assert.equal(querySettings("push")[0].id, "settingsNotifications");
  assert.deepEqual(querySettings("不存在的设置"), []);
});

