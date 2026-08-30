import assert from "node:assert/strict";
import test from "node:test";
import {
  SETTINGS_SECTION_REGISTRY,
  getSettingsSection,
  getSettingsSectionIds,
  isSettingsSection,
} from "../modules/settings-section-registry.js";

test("settings registry is the single ordered set of five top-level groups", () => {
  const ids = getSettingsSectionIds();
  assert.deepEqual(ids, [
    "settingsAppearance",
    "settingsAccount",
    "settingsFamily",
    "settingsTools",
    "settingsStorage",
  ]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(SETTINGS_SECTION_REGISTRY.length, 5);
  for (const section of SETTINGS_SECTION_REGISTRY) {
    assert.ok(section.label);
    assert.ok(section.title);
    assert.ok(section.icon);
  }
});

test("settings registry rejects stale section ids without creating a second group", () => {
  assert.equal(isSettingsSection("settingsGeneral"), false);
  assert.equal(isSettingsSection("settingsNotifications"), false);
  assert.equal(getSettingsSection("settingsGeneral").id, "settingsAppearance");
});
