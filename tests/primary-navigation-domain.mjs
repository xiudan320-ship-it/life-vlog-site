import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIMARY_NAVIGATION_DEFAULT_IDS,
  PRIMARY_NAVIGATION_REGISTRY,
  createDefaultPrimaryNavigationConfig,
  getPrimaryNavigationItems,
  movePrimaryNavigationItem,
  normalizePrimaryNavigationConfig,
  setPrimaryNavigationEnabled,
} from "../modules/primary-navigation-domain.js";

test("primary navigation keeps the five-item default and excludes private extras", () => {
  const config = createDefaultPrimaryNavigationConfig();
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
});

test("normalization removes invalid duplicates and always restores gallery", () => {
  const config = normalizePrimaryNavigationConfig({
    order: ["wishlist", "wishlist", "unknown", "gallery"],
    enabled: ["recipes", "recipes", "unknown"],
  });
  assert.deepEqual(config.order, ["wishlist", "gallery", "vlog", "weekend", "wardrobe", "recipes", "thanks", "secret"]);
  assert.deepEqual(config.enabled, ["gallery", "recipes"]);
});

test("enabled entries can be moved without crossing hidden entries", () => {
  let config = setPrimaryNavigationEnabled(createDefaultPrimaryNavigationConfig(), "recipes", true);
  config = movePrimaryNavigationItem(config, "recipes", "up");
  assert.deepEqual(
    getPrimaryNavigationItems(config, { visibleOnly: true, signedIn: true }).map(({ id }) => id),
    ["gallery", "vlog", "wishlist", "weekend", "recipes", "wardrobe"]
  );
  config = setPrimaryNavigationEnabled(config, "recipes", false);
  assert.equal(config.enabled.includes("recipes"), false);
  assert.equal(config.enabled.includes("gallery"), true);
});
