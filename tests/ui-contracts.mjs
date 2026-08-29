import assert from "node:assert/strict";
import {
  index,
  authController,
  authViewModule,
  appNavigationControllerModule,
  settingsTemplate,
  settingsSectionRegistry,
  mobileDiaryViewModule,
  appIdentityControllerModule,
} from "./smoke-fixture.mjs";

assert.equal(typeof authController.createAuthController, "function");
assert.match(authViewModule, /export function createAuthView/);
assert.match(authViewModule, /aria-pressed/);
assert.match(authViewModule, /aria-invalid/);
assert.match(authViewModule, /new-password/);
assert.match(index, /id="authModeToggle"/);
assert.match(index, /id="passwordToggle"/);
assert.match(index, /id="inviteCodeField"[^>]*hidden/);
assert.match(index, /id="galleryNav"[^>]*aria-current="page"/);
assert.match(appNavigationControllerModule, /aria-current/);
assert.match(appNavigationControllerModule, /scrollTo\(\{ top: boundedPosition, behavior: "instant" \}\)/);
assert.match(
  appNavigationControllerModule,
  /previousPage === "gallery" && requestedPage !== "gallery"[\s\S]*?actions\.setUploadExpanded\(false\)/
);
assert.doesNotMatch(index, /id="settingsDialog"/);
assert.match(settingsTemplate, /id="settingsDialog"/);
assert.match(settingsTemplate, /data-settings-nav/);
assert.match(settingsTemplate, /data-settings-content/);
assert.deepEqual(
  settingsSectionRegistry.getSettingsSectionIds(),
  ["settingsAppearance", "settingsAccount", "settingsFamily", "settingsTools", "settingsStorage"],
);
assert.match(index, /data-app-splash-blocked/);
assert.match(mobileDiaryViewModule, /data-mobile-diary-more/);
assert.match(mobileDiaryViewModule, /aria-expanded/);
assert.match(mobileDiaryViewModule, /textarea[^>]+data-mobile-diary-comment-input/);
assert.match(appIdentityControllerModule, /createDiaryCategoryDialog/);
assert.doesNotMatch(appIdentityControllerModule, /<select|createElement\("select"/);

console.log("UI contract checks passed.");
