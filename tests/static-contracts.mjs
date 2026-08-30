import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRoute, serializeRoute } from "../modules/app-route-domain.js";
import { createTextScaleController } from "../modules/text-scale-controller.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFile(join(root, file), "utf8");
const [html, app, appRuntime, appRuntimeController, appRuntimeInfrastructure, appRuntimeRoute, appRuntimeStartup, routeContext, sw, index, startup, navigation, vite, headers, settingsTemplate, settingsView, accountDialogs, confirmDialog, confirmStyles, appEvents, settingsEvents] = await Promise.all([
  read("index.html"), read("app.js"), read("modules/app-runtime-assembly.js"), read("modules/app-runtime-controller-assembly.js"), read("modules/app-runtime-infrastructure.js"), read("modules/app-runtime-route-assembly.js"), read("modules/app-runtime-startup.js"), read("modules/app-route-context.js"), read("src/sw.js"), read("index.html"),
  read("modules/app-startup-controller.js"), read("modules/app-navigation-controller.js"),
  read("vite.config.js"), read("public/_headers"), read("modules/routes/templates/settings.html"), read("modules/settings-view.js"), read("styles/account-dialogs.css"), read("modules/confirm-dialog.js"), read("styles/confirm-dialog.css"), read("modules/app-event-bindings.js"), read("modules/settings-event-bindings.js"),
]);
const releaseSmoke = await read("tests/release-smoke.mjs");
const [mediaRuntime, photoDetailRuntime, accountAssembly, secretService, routeLoader, videoLayout, galleryView, motionCoordinator, motionDomain] = await Promise.all([
  read("modules/app-runtime-media-assembly.js"),
  read("modules/photo-detail-controller.js"),
  read("modules/app-runtime-account-assembly.js"),
  read("modules/secret-data-service.js"),
  read("modules/route-loader.js"),
  read("modules/diary-video-layout.js"),
  read("modules/diary-gallery-view.js"),
  read("modules/diary-feed-motion-coordinator.js"),
  read("modules/diary-feed-motion-domain.js"),
]);
const diaryFeedController = await read("modules/diary-feed-controller.js");
const vlogMode = await read("modules/vlog-mode.js");
const forbiddenUsernameEnv = ["RELEASE", "TEST", "USERNAME"].join("_");
const forbiddenPasswordEnv = ["RELEASE", "TEST", "PASSWORD"].join("_");

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "duplicate HTML id");
assert.match(html, /maximum-scale=1\.0, user-scalable=no, viewport-fit=cover/);
assert.doesNotMatch(html, /\?v=\d/);
assert.doesNotMatch(`${app}\n${appRuntime}\n${appRuntimeController}\n${appRuntimeInfrastructure}\n${appRuntimeRoute}\n${appRuntimeStartup}`, /\?v=\d/);
assert.equal(releaseSmoke.includes(forbiddenUsernameEnv), false);
assert.equal(releaseSmoke.includes(forbiddenPasswordEnv), false);
assert.equal(await access(join(root, "service-worker.js")).then(() => true, () => false), false);
assert.equal(await access(join(root, "manifest.webmanifest")).then(() => true, () => false), false);
assert.doesNotMatch(html, /[◐⚙♢⛶⌗⇩↻]/);
assert.doesNotMatch(html, />[♥♡📌＋⌕⌂]</);
assert.match(html, /class="list-icon ui-icon"/);
assert.doesNotMatch(sw, /CORE_ASSETS|CACHE_NAME/);
assert.match(sw, /precacheAndRoute\(self\.__WB_MANIFEST\)/);
assert.match(sw, /addEventListener\("push"/);
assert.match(sw, /notificationclick/);
assert.match(vite, /strategies: "injectManifest"/);
assert.match(vite, /registerType: "prompt"/);
assert.match(app, /styles\/confirm-dialog\.css/);
assert.match(confirmDialog, /renderListIcon\(danger \? "trash" : "alert"\)/);
assert.match(confirmStyles, /\.action-confirm-dialog/);
assert.doesNotMatch(accountDialogs, /\.wish-delete-dialog/);
assert.doesNotMatch(mediaRuntime, /import \{ createPhotoViewerController \} from/);
assert.match(mediaRuntime, /import\("\.\/photo-viewer-controller\.js"\)/);
assert.match(photoDetailRuntime, /photo-editor-controller/);
assert.match(photoDetailRuntime, /mobile-diary-controller/);
assert.match(accountAssembly, /secretDataService\.load/);
assert.doesNotMatch(accountAssembly, /callLoaded\(secretController/);
assert.match(secretService, /repository\.listItems/);
assert.match(secretService, /repository\.listFolders/);
assert.match(routeLoader, /isCurrent/);
assert.match(videoLayout, /autoplay/);
assert.match(videoLayout, /dataset\.state/);
assert.match(galleryView, /import\("\.\/diary-feed-motion-coordinator\.js"\)/);
assert.doesNotMatch(galleryView, /shouldAutoplayDiaryFeedMedia/);
assert.match(motionCoordinator, /IntersectionObserver/);
assert.match(motionCoordinator, /shouldLoopDiaryFeedMotion/);
assert.match(motionCoordinator, /video\.controls = false/);
assert.match(motionDomain, /DIARY_FEED_MOTION_LOOP_LIMIT_SECONDS/);
assert.match(diaryFeedController, /stopMotionFeedPreview/);
assert.match(diaryFeedController, /filterDiaryPhotos\(/);
assert.doesNotMatch(diaryFeedController, /filterVlogPhotos/);
assert.doesNotMatch(vlogMode, /filterVlogPhotos/);
assert.match(appRuntime, /startAppRuntime/);
assert.match(appRuntimeInfrastructure, /createAppServices/);
assert.match(appRuntimeRoute, /createRouteLoader/);
assert.match(appRuntimeRoute, /collectRouteElements/);
assert.match(appRuntimeStartup, /createAppStartupController/);
assert.match(appEvents, /els\.closeLevelDialog\?\.addEventListener\("click"/);
assert.match(appEvents, /els\.levelDialog\?\.addEventListener\("click"/);
assert.match(appEvents, /els\.vipBadge\?\.addEventListener\("click", openLevelDialog\)/);
assert.doesNotMatch(settingsEvents, /els\.closeLevelDialog|els\.levelDialog\?\.addEventListener|els\.vipBadge(?:\?\.|\.)addEventListener/);
assert.match(startup, /initializeLocalSession/);
assert.match(startup, /synchronizeRemoteSession/);
assert.match(navigation, /pushState/);
assert.match(navigation, /popstate/);
assert.match(appRuntimeController, /collectShellElements/);
assert.match(routeContext, /collectRouteElements/);
assert.match(settingsView, /data-text-scale="xlarge"/);
assert.match(settingsView, /id="installAppButton"/);
assert.match(settingsView, /data-performance-copy/);
assert.match(headers, /Cache-Control: no-cache, no-store, must-revalidate/);
assert.match(headers, /max-age=31536000, immutable/);
assert.doesNotMatch(await read("modules/weekend-plans-view.js"), /待完成/);
for (const route of ["gallery", "recipes", "wishlist", "weekend", "wardrobe", "thanks", "secret"]) {
  await access(join(root, "modules", "routes", `${route}-route.js`));
}

assert.equal(parseRoute({ href: "https://example.test/?page=wishlist&pushType=thanks" }).page, "wishlist");
assert.equal(parseRoute({ href: "https://example.test/?page=invalid" }).page, "gallery");
assert.equal(serializeRoute("weekend", "https://example.test/?pushPhoto=1#x"), "/?pushPhoto=1&page=weekend#x");
assert.equal(serializeRoute("gallery", "https://example.test/?page=weekend&pushType=thanks"), "/?pushType=thanks");

const storage = new Map();
const preferences = { readScoped: (key, scope, fallback) => storage.get(`${key}:${scope}`) ?? fallback, writeScoped: (key, scope, value) => storage.set(`${key}:${scope}`, value) };
const documentTarget = { documentElement: { setAttribute(name, value) { this[name] = value; } } };
const scale = createTextScaleController({ preferenceStore: preferences, documentTarget });
assert.equal(scale.set("xlarge", "guest"), "xlarge");
assert.equal(documentTarget.documentElement["data-text-scale"], "xlarge");
assert.equal(scale.normalize("invalid"), "standard");

console.log("Static contract checks passed.");
