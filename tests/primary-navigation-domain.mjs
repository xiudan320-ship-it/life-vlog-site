import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIMARY_NAVIGATION_DEFAULT_IDS,
  PRIMARY_NAVIGATION_MAX_ENABLED,
  PRIMARY_NAVIGATION_REGISTRY,
  createDefaultPrimaryNavigationConfig,
  getPrimaryNavigationItems,
  movePrimaryNavigationItem,
  normalizePrimaryNavigationConfig,
  setPrimaryNavigationEnabled,
} from "../modules/primary-navigation-domain.js";

test("primary navigation keeps the five-item default and excludes private extras", () => {
  const config = createDefaultPrimaryNavigationConfig();
  assert.equal(PRIMARY_NAVIGATION_MAX_ENABLED, 5);
  assert.deepEqual(config.enabled, [...PRIMARY_NAVIGATION_DEFAULT_IDS]);
  assert.deepEqual(
    getPrimaryNavigationItems(config, { visibleOnly: true, signedIn: true }).map(({ id }) => id),
    [...PRIMARY_NAVIGATION_DEFAULT_IDS]
  );
  assert.deepEqual(
    getPrimaryNavigationItems(config, { visibleOnly: true, signedIn: false }).map(({ id }) => id),
    ["gallery", "wishlist", "weekend", "wardrobe"]
  );
  assert.equal(PRIMARY_NAVIGATION_REGISTRY.find(({ id }) => id === "vlog")?.type, "mode");
  assert.equal(PRIMARY_NAVIGATION_REGISTRY.find(({ id }) => id === "thanks")?.type, "dialog");
});

test("normalization removes invalid duplicates and always restores gallery", () => {
  const config = normalizePrimaryNavigationConfig({
    order: ["wishlist", "wishlist", "unknown", "gallery"],
    enabled: ["recipes", "recipes", "unknown"],
  });
  assert.deepEqual(config.order, ["wishlist", "gallery", "vlog", "weekend", "wardrobe", "recipes", "thanks", "secret"]);
  assert.deepEqual(config.enabled, ["gallery", "recipes"]);

  const capped = normalizePrimaryNavigationConfig({
    enabled: ["gallery", "vlog", "wishlist", "weekend", "wardrobe", "secret"],
  });
  assert.deepEqual(capped.enabled, ["gallery", "vlog", "wishlist", "weekend", "wardrobe"]);
});

test("enabled entries can be moved without crossing hidden entries", () => {
  let config = setPrimaryNavigationEnabled(createDefaultPrimaryNavigationConfig(), "recipes", true);
  assert.deepEqual(config.enabled, [...PRIMARY_NAVIGATION_DEFAULT_IDS], "a sixth entry must not be enabled");
  config = setPrimaryNavigationEnabled(config, "wardrobe", false);
  config = setPrimaryNavigationEnabled(config, "recipes", true);
  config = movePrimaryNavigationItem(config, "recipes", "up");
  assert.deepEqual(
    getPrimaryNavigationItems(config, { visibleOnly: true, signedIn: true }).map(({ id }) => id),
    ["gallery", "vlog", "wishlist", "recipes", "weekend"]
  );
  config = setPrimaryNavigationEnabled(config, "recipes", false);
  assert.equal(config.enabled.includes("recipes"), false);
  assert.equal(config.enabled.includes("gallery"), true);
});
