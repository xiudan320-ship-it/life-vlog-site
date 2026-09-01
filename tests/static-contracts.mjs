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
const [primaryNavigationDomain, primaryNavigationView, primaryNavigationController, pushController] = await Promise.all([
  read("modules/primary-navigation-domain.js"),
  read("modules/primary-navigation-view.js"),
  read("modules/primary-navigation-controller.js"),
  read("modules/push-controller.js"),
]);
const [notificationEvents, notificationView, foundation, components] = await Promise.all([
  read("modules/notification-event-bindings.js"),
  read("modules/notification-view.js"),
  read("styles/redesign-foundation.css"),
  read("styles/redesign-components.css"),
]);
const forbiddenUsernameEnv = ["RELEASE", "TEST", "USERNAME"].join("_");
const forbiddenPasswordEnv = ["RELEASE", "TEST", "PASSWORD"].join("_");

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "duplicate HTML id");
const viewportTags = [...html.matchAll(/<meta\s+name=["']viewport["'][^>]*>/gi)];
assert.equal(viewportTags.length, 1, "main entry must contain exactly one viewport meta tag");
assert.match(html, /content="width=device-width, initial-scale=1\.0, minimum-scale=1\.0, maximum-scale=1\.0, user-scalable=no, viewport-fit=cover"/);
assert.doesNotMatch(html, /id="moodNav"/);
assert.match(html, /id="todayMoodGrid"/);
assert.match(html, /id="overviewMoodCalendar"/);
assert.doesNotMatch(html, /overviewPhotos|overviewRecipes|overviewWishes|overviewLevelButton|overviewProgress/);
assert.doesNotMatch(html, /\?v=\d/);
assert.doesNotMatch(`${app}\n${appRuntime}\n${appRuntimeController}\n${appRuntimeInfrastructure}\n${appRuntimeRoute}\n${appRuntimeStartup}`, /\?v=\d/);
assert.match(primaryNavigationDomain, /PRIMARY_NAVIGATION_REGISTRY/);
assert.match(primaryNavigationView, /data-primary-nav-id/);
assert.match(primaryNavigationController, /readJson/);
assert.match(pushController, /subscription\.unsubscribe\(\)/);
assert.match(pushController, /本机已关闭，云端记录清理失败/);
assert.doesNotMatch(`${appRuntimeRoute}\n${appEvents}\n${diaryFeedController}\n${vlogMode}`, /galleryNav|vlogNav|wishlistNav|weekendNav|wardrobeNav|thanksNav|secretNav/);
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
assert.doesNotMatch(galleryView, /scrollIntoView/);
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
assert.match(appEvents, /bindNotificationEvents/);
assert.match(notificationEvents, /notificationButton\.addEventListener\("click"/);
assert.match(notificationEvents, /notificationDialog\?\.addEventListener\("close"/);
assert.doesNotMatch(`${appEvents}\n${notificationEvents}`, /touchmove|gesturestart/);
assert.doesNotMatch(settingsEvents, /els\.closeLevelDialog|els\.levelDialog\?\.addEventListener|els\.vipBadge(?:\?\.|\.)addEventListener/);
assert.doesNotMatch(settingsEvents, /notificationButton|notificationDialog|openNotificationsPanel/);
assert.match(notificationView, /data-notification-state="loading"/);
assert.match(notificationView, /data-notification-state="error"/);
assert.match(notificationView, /data-notification-state="empty"/);
assert.doesNotMatch(foundation, /html,\s*body\s*\{[^}]*overflow-x\s*:\s*(?:hidden|clip)/);
assert.doesNotMatch(components, /html,\s*body\s*\{[^}]*overflow-x\s*:\s*(?:hidden|clip)/);
assert.match(foundation, /font-size: max\(16px, 1rem\) !important/);
assert.match(diaryFeedController, /const pullRefreshTarget = els\.gallery/);
assert.doesNotMatch(diaryFeedController, /document\.addEventListener\("touchmove"/);
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
const moodRoute = await read("modules/routes/mood-diary-route.js");
const moodTemplate = await read("modules/routes/templates/mood-diary.html");
const todayMoodController = await read("modules/today-mood-controller.js");
const moodOverlayController = await read("modules/mood-entry-overlay-controller.js");
const moodSummaryDomain = await read("modules/mood-month-summary-domain.js");
const moodSummaryView = await read("modules/mood-month-summary-view.js");
const moodDiaryController = await read("modules/mood-diary-controller.js");
const [commentThreadDomain, moodJarPhysics, mobileDiaryView, socialController] = await Promise.all([
  read("modules/comment-thread-domain.js"),
  read("modules/mood-jar-physics.js"),
  read("modules/mobile-diary-view.js"),
  read("modules/social-controller.js"),
]);
await access(join(root, "modules", "routes", "mood-diary-route.js"));
assert.match(moodRoute, /return controllers\.moodDiary\?\.activate\?\.\(\)/);
assert.equal([...`${html}\n${moodTemplate}`.matchAll(/id="moodOverlay"/g)].length, 1, "there must be exactly one mood overlay");
assert.doesNotMatch(appEvents, /moodNav/);
assert.doesNotMatch(navigation, /elements\.moodNav/);
assert.equal([...todayMoodController.matchAll(/switchPage\("mood"\)/g)].length, 1, "only the calendar CTA may navigate to mood");
assert.match(todayMoodController, /overlayController\?\.open/);
assert.match(moodOverlayController, /moodEntryOverlay: true/);
assert.match(moodTemplate, /class="mood-visually-hidden"[^>]*data-page-heading="mood"/);
assert.doesNotMatch(moodTemplate, /class="kicker"/);
assert.equal([...moodTemplate.matchAll(/id="moodListOpen"/g)].length, 1);
assert.match(moodTemplate, /id="moodJarItems"/);
assert.match(moodTemplate, /id="moodTrendChart"/);
assert.match(moodTemplate, /id="moodTrendPointControls"/);
assert.match(moodSummaryDomain, /export function buildMoodMonthSummary/);
assert.doesNotMatch(moodSummaryDomain, /Math\.random/gi, "jar layout must not use random positions");
assert.match(commentThreadDomain, /export function flattenCommentThread/);
assert.match(moodJarPhysics, /export const MOOD_JAR_GEOMETRY/);
assert.match(moodJarPhysics, /export function createMoodJarSimulation/);
assert.match(moodJarPhysics, /constraintIterations/);
assert.doesNotMatch(`${moodSummaryDomain}\n${moodSummaryView}`, /buildMoodJarAnimationPlan/);
assert.match(moodSummaryView, /requestAnimationFrame/);
assert.doesNotMatch(moodSummaryView, /\.animate\(|getAnimations/);
assert.match(`${mobileDiaryView}\n${socialController}`, /flattenCommentThread/);
assert.doesNotMatch(`${mobileDiaryView}\n${socialController}`, /photo-comment-thread/);
assert.match(moodSummaryView, /prefers-reduced-motion/);
assert.match(moodSummaryView, /data-mood-trend-point/);
assert.match(moodSummaryView, /mood-trend-point-control/);
assert.match(moodDiaryController, /reason: "mutation"/);
assert.match(moodDiaryController, /loadMonth\(state\.currentMonthKey, \{ force: true/);
assert.match(await read("modules/app-runtime-route-assembly.js"), /refreshContext/);
assert.doesNotMatch(`${moodDiaryController}\n${moodOverlayController}`, /location\.reload/);

assert.equal(parseRoute({ href: "https://example.test/?page=wishlist&pushType=thanks" }).page, "wishlist");
assert.equal(parseRoute({ href: "https://example.test/?page=invalid" }).page, "gallery");
assert.equal(parseRoute({ href: "https://example.test/?page=mood" }).page, "mood");
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
