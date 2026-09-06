import assert from "node:assert/strict";
import test from "node:test";
import {
  SETTINGS_ITEM_REGISTRY,
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
    assert.ok(section.icon);
    assert.equal("kicker" in section, false);
    assert.equal("title" in section, false);
  }
});
test("settings registry rejects stale section ids without creating a second group", () => {
  assert.equal(isSettingsSection("settingsGeneral"), false);
  assert.equal(isSettingsSection("settingsNotifications"), false);
  assert.equal(getSettingsSection("settingsGeneral").id, "settingsAppearance");
});

test("settings item registry points every searchable item at one real section", () => {
  const sectionIds = new Set(getSettingsSectionIds());
  const itemIds = SETTINGS_ITEM_REGISTRY.map(({ id }) => id);
  assert.equal(new Set(itemIds).size, itemIds.length);
  for (const item of SETTINGS_ITEM_REGISTRY) {
    assert.ok(sectionIds.has(item.sectionId));
    assert.ok(item.label);
    assert.ok(item.description);
    assert.ok(item.keywords.length);
  }
});
