import assert from "node:assert/strict";
import {
  index,
  authController,
  authViewModule,
  appNavigationControllerModule,
  serviceWorker,
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
assert.match(serviceWorker, /modules\/auth-view\.js/);

console.log("UI contract checks passed.");
