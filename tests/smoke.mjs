import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, css, worker, schema, index, manifestText] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../redesign.css", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/src/worker.js", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/schema.d1.sql", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
]);
const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const deployScript = await readFile(new URL("../deploy-cloudflare-pages.ps1", import.meta.url), "utf8");
const secretViewerCss = await readFile(
  new URL("../secret-viewer.css", import.meta.url),
  "utf8"
);
const appLifecycle = await import(
  new URL("../modules/app-lifecycle.js", import.meta.url)
);
const pageHeaders = await readFile(new URL("../_headers", import.meta.url), "utf8");
const confirmDialogModule = await readFile(
  new URL("../modules/confirm-dialog.js", import.meta.url),
  "utf8"
);
const cachePolicyModule = await readFile(
  new URL("../modules/cache-policy.js", import.meta.url),
  "utf8"
);
const cachePolicy = await import(new URL("../modules/cache-policy.js", import.meta.url));
const diaryDomain = await import(new URL("../modules/diary-domain.js", import.meta.url));
const notificationDomain = await import(
  new URL("../modules/notification-domain.js", import.meta.url)
);
const secretDomain = await import(new URL("../modules/secret-domain.js", import.meta.url));
const diaryDomainModule = await readFile(
  new URL("../modules/diary-domain.js", import.meta.url),
  "utf8"
);
const notificationDomainModule = await readFile(
  new URL("../modules/notification-domain.js", import.meta.url),
  "utf8"
);
const secretDomainModule = await readFile(
  new URL("../modules/secret-domain.js", import.meta.url),
  "utf8"
);
const cloudflareClientModule = await readFile(
  new URL("../modules/cloudflare-client.js", import.meta.url),
  "utf8"
);
const repositoryModule = await readFile(
  new URL("../modules/data-repositories.js", import.meta.url),
  "utf8"
);
const wardrobeModule = await readFile(
  new URL("../modules/wardrobe.js", import.meta.url),
  "utf8"
);
const wardrobeCss = await readFile(new URL("../wardrobe.css", import.meta.url), "utf8");
const mediaCacheModule = await readFile(
  new URL("../modules/media-cache.js", import.meta.url),
  "utf8"
);
const mediaCache = await import(
  new URL("../modules/media-cache.js", import.meta.url)
);
const mediaMetadataModule = await readFile(
  new URL("../modules/media-metadata.js", import.meta.url),
  "utf8"
);
const mediaMetadata = await import(
  new URL("../modules/media-metadata.js", import.meta.url)
);
const uploadQueueModule = await readFile(
  new URL("../modules/upload-queue.js", import.meta.url),
  "utf8"
);
const imageServiceModule = await readFile(
  new URL("../modules/image-service.js", import.meta.url),
  "utf8"
);
const gamificationDomain = await import(
  new URL("../modules/gamification-domain.js", import.meta.url)
);
const gamificationArchiveModule = await readFile(
  new URL("../modules/gamification-archive.js", import.meta.url),
  "utf8"
);
const preferencesStoreModule = await import(
  new URL("../modules/preferences-store.js", import.meta.url)
);
const householdRepositoryModule = await import(
  new URL("../modules/household-repository.js", import.meta.url)
);
const uiFormatters = await import(
  new URL("../modules/ui-formatters.js", import.meta.url)
);
const offlineRecords = await import(
  new URL("../modules/offline-records.js", import.meta.url)
);
const expandedTrashMigration = await readFile(
  new URL("../cloudflare-worker/migrations/0006_expand_trash_item_types.sql", import.meta.url),
  "utf8"
);

assert.match(index, /id="secretViewerToolbar"/);
assert.match(index, /id="dialogExpandImage"/);
assert.match(index, /redesign\.css\?v=20260813-001/);
assert.match(index, /secret-viewer\.css\?v=20260809-230/);
assert.match(index, /secret-create-folder-label">新建文件夹/);
assert.match(app, /function fitSecretViewerImage\(\)/);
assert.match(app, /photo-comment-author-badge/);
assert.match(app, /共 \$\{photoComments\.length\} 条评论/);
assert.match(app, /const AVATAR_CACHE_KEY = "life-vlog-avatar-cache"/);
assert.match(app, /accountProfile\.avatarUrl \|\| familyAvatar \|\| loadCachedAvatarUrl/);
assert.match(app, /function renderExperienceRulesPanel\(experience\)/);
assert.match(app, /profileUpdates\.login_streak = loginStreak/);
assert.match(app, /const cachedAvatarUrl = loadCachedAvatarUrl\(member\.user_id\)/);
assert.match(app, /function isSecretImageViewerOpen\(\)/);
assert.match(app, /classList\.add\("no-comments-dialog", "secret-image-dialog"\)/);
assert.doesNotMatch(app, /classList\.add\("no-comments-dialog", "secret-image-dialog", "secret-image-fullscreen"\)/);
assert.match(app, /else if \(event\.target === els\.dialogImage\) \{\s*toggleDialogImageFullscreen\(\)/);
assert.match(app, /activeSecretDialogItem && !isSecretImageViewerOpen\(\)/);
assert.match(app, /isMobileViewport\(\) \? \(image\.thumbnail_url \|\| image\.image_url\) : image\.image_url/);
assert.match(app, /function zoomImageViewerAt\(nextScale, clientX, clientY\)/);
assert.match(app, /clampNumber\(Number\(zoom\.scale\) \|\| 1, 1, 6\)/);
assert.match(app, /secretViewerReturnFocus = options\.triggerElement \|\| document\.activeElement/);
assert.match(app, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/);
assert.match(app, /secretPhotoLongPressTimer = window\.setTimeout\(\(\) => \{/);
assert.match(app, /event\.pointerType === "mouse" && event\.button !== 0/);
assert.match(app, /Math\.hypot\(event\.clientX - longPressStart\.x, event\.clientY - longPressStart\.y\) > 10/);
assert.match(app, /activeSecretDialogItem && isMobileViewport\(\)/);
assert.match(css, /\.secret-album-view\.selection-active \.secret-album-toolbar \{[\s\S]*?position: fixed;[\s\S]*?top: 50%;[\s\S]*?right: 20px;/);
assert.match(css, /#photoDialog\.secret-image-dialog\.secret-image-fullscreen \.media-counter \{[\s\S]*?left: 50% !important;[\s\S]*?translateX\(-50%\)/);
assert.match(secretViewerCss, /object-fit: contain !important/);
assert.match(secretViewerCss, /secret-image-dialog:not\(\.secret-image-fullscreen\)/);
assert.match(secretViewerCss, /dialog-media::after \{\s*content: none/);
assert.match(app, /els\.dialogExpandImage\?\.addEventListener\("click"/);
assert.match(app, /if \(!isFittableImageDialogOpen\(\) \|\| !els\.dialogImage\?\.naturalWidth/);
assert.match(secretViewerCss, /\.secret-dialog-current-tags \{\s*display: block !important/);
assert.match(secretViewerCss, /grid-template: minmax\(300px, 62dvh\)/);
assert.match(secretViewerCss, /position: relative !important;[\s\S]*?max-height: none !important;[\s\S]*?overflow: auto !important/);
assert.match(
  secretViewerCss,
  /secret-image-dialog:not\(\.secret-image-fullscreen\) #dialogImage[\s\S]*?object-fit: contain !important/
);
assert.match(
  secretViewerCss,
  /secret-image-dialog:not\(\.secret-image-fullscreen\) #dialogImage[\s\S]*?width: auto !important;[\s\S]*?max-width: 100% !important;[\s\S]*?height: auto !important;[\s\S]*?max-height: 100% !important;/
);
assert.match(app, /style\.setProperty\(\s*"width",[\s\S]*?"important"/);
assert.match(app, /class="secret-folder-dialog-error" role="alert" hidden/);
assert.match(app, /请先写一个收藏夹名称/);
assert.match(css, /Compact, explicit creation actions in the mobile secret library/);
assert.match(secretViewerCss, /touch-action: none/);
assert.match(secretViewerCss, /width: 100dvw !important/);
assert.match(serviceWorker, /secret-viewer\.css\?v=20260809-230/);
assert.match(serviceWorker, /weekend-board\.css\?v=20260809-238/);
assert.match(serviceWorker, /assets\/weekend-complete-stamp\.png/);
assert.match(serviceWorker, /diary-detail\.css\?v=20260809-232/);
assert.match(deployScript, /weekend-board\.css/);
assert.match(deployScript, /diary-detail\.css/);

assert.match(app, /createTrashItem\("photo"/);
assert.match(app, /createTrashItem\(\s*"secret"/);
assert.doesNotMatch(app, /<strong>加密自动备份<\/strong>/);
assert.match(app, /placement: "center"/);
assert.match(css, /\.mini-toast-host-center[\s\S]*?top: 50% !important/);
assert.match(css, /body\.mobile-diary-page-open \.topbar/);
assert.match(worker, /Only image files are allowed/);
assert.match(worker, /configuredOrigins\.includes/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS trash_items/);
assert.match(app, /thumbnail_url/);
assert.match(app, /settings-account-overview/);
assert.match(css, /#settingsTools \.settings-tool-card/);
assert.match(worker, /createDailyBackup/);
assert.match(worker, /cleanupExpiredTrash/);
const scheduledBlock = worker.slice(worker.indexOf("async scheduled"), worker.indexOf("},\n};", worker.indexOf("async scheduled")));
assert.doesNotMatch(scheduledBlock, /createDailyBackup/);
assert.match(worker, /AES-GCM/);
assert.match(worker, /handleBackupDownload/);
assert.match(worker, /handleBackupRun/);
assert.match(app, /backfillLegacyThumbnails/);
assert.match(css, /body\.mobile-diary-page-open \.topbar \.main-nav/);
assert.match(serviceWorker, /!isSameOrigin && isImageRequest/);
assert.match(serviceWorker, /caches\.match\(request, \{ ignoreVary: true \}\)/);
assert.match(app, /shouldAutoCacheMedia/);
assert.match(app, /AUTO_DIARY_CACHE_ITEM_LIMIT = 20/);
assert.match(app, /collectDiaryOfflineMediaUrls\(diaryItemLimit\)/);
assert.match(app, /explicit \? 40 : Number\.POSITIVE_INFINITY/);
assert.match(app, /Wi-Fi 下自动保留最新 20 条日记/);
assert.match(app, /familyMemberMap\.forEach\(\(member\) => urls\.push\(member\?\.avatar_url/);
assert.match(app, /downloadOfflinePool/);
assert.match(app, /Number\.POSITIVE_INFINITY/);
assert.match(mediaCacheModule, /await getCachedResponseBytes\(response\)/);
assert.match(worker, /secret_folders/);
assert.match(worker, /admin_update_photo_category/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS secret_folders/);
assert.match(schema, /folder_id TEXT REFERENCES secret_folders/);
assert.match(app, /initializePullToRefresh/);
assert.match(app, /adminUpdatePhotoCategory/);
assert.match(app, /openLevelGuidePage/);
assert.match(app, /level-workspace/);
assert.match(app, /requestSecretFolderName/);
assert.match(app, /openSecretAlbumFolderDialog/);
assert.match(app, /moveSecretAlbumToFolder/);
assert.doesNotMatch(app, /function createDefaultAnniversaries/);
assert.match(app, /const userId = session\?\.user\?\.id \|\| "guest"/);
assert.match(app, /anniversaries = cloudMapped;/);
assert.match(app, /wish-card-details/);
assert.match(css, /Mobile wishlist: diary-like media cards/);
assert.match(app, /activeSecretFolderId = "unfiled"/);
assert.match(css, /\.secret-album-folder-dialog/);
assert.match(css, /transition: transform 200ms cubic-bezier\(\.2,\.76,\.18,1\)/);
assert.match(app, /data-mobile-diary-favorite/);
assert.match(app, /handleRecipeCoverPaste/);
assert.match(app, /getClipboardImageUrl/);
assert.match(app, /getFamilyTimelineEntries/);
assert.match(app, /familyTimelineDialog/);
assert.match(app, /activeUploadTasks/);
assert.match(app, /createTrashItem\(\s*"recipe"/);
assert.match(app, /createTrashItem\(\s*"wish"/);
assert.match(app, /createTrashItem\(\s*"weekend"/);
assert.match(app, /createTrashItem\(\s*"anniversary"/);
assert.match(app, /createTrashItem\("gratitude"/);
assert.match(index, /id="removeUploadPreview"/);
assert.doesNotMatch(index, /id="recipeCoverUrlInput"/);
assert.match(app, /choosePhotoCategory/);
assert.match(app, /openAchievementDetail/);
assert.match(gamificationArchiveModule, /const extraBadgeSpecs = \[/);
const extraBadgeBlock = gamificationArchiveModule.slice(
  gamificationArchiveModule.indexOf("const extraBadgeSpecs = ["),
  gamificationArchiveModule.indexOf("badges.push(...extraBadgeSpecs")
);
assert.equal((extraBadgeBlock.match(/^\s+\["/gm) || []).length, 50);
assert.match(index, /id="diarySearchSuggestions"/);
assert.match(index, /id="secretSearchSuggestions"/);
assert.match(index, /id="secretFolderList"/);
assert.match(app, /enableWebPush/);
assert.match(app, /aggregateInteractionNotifications\(notifications\)\s*\.slice\(0, 15\)/);
assert.match(index, /id="weeklyReviewDialog"/);
assert.match(index, /data-tool-id="weekly"/);
assert.match(app, /loadWeeklyReview/);
assert.match(app, /if \(photosLoadPromise\) return photosLoadPromise/);
assert.match(css, /content-visibility:\s*auto/);
assert.match(index, /id="photoLinkInput"/);
assert.match(index, /id="recipeCoverLinkInput"/);
assert.match(index, /id="wishImageLinkInput"/);
assert.match(index, /id="weekendImageLinkInput"/);
assert.match(index, /id="secretImageLinkInput"/);
assert.match(app, /copyUrlToR2\(linkUrl/);
assert.match(worker, /fetchAllowedImage/);
assert.match(worker, /contentType\.startsWith\("image\/"\)/);
assert.match(app, /composeWeekendStoredNote/);
assert.match(app, /openWeekendImageGallery/);
assert.match(index, /id="weekendImageInput"/);
assert.match(index, /id="weekendCompletionDialog"/);
assert.match(index, /id="weekendCompletionInput"[^>]+multiple/);
assert.match(app, /function openWeekendCompletionDialog/);
assert.match(app, /folder: "weekend-recap"/);
assert.match(css, /Desktop weekend cards follow the poster-like reference/);
assert.match(css, /\.weekend-complete-mark/);
assert.match(app, /ensurePushSettingsPage/);
assert.match(app, /syncExistingPushSubscription/);
assert.match(app, /PUSH_SUBSCRIPTION_SYNC_INTERVAL/);
assert.match(worker, /buildPushPayload/);
assert.match(worker, /update push_subscriptions set last_seen_at/);
assert.match(worker, /handlePushSubscribe/);
assert.match(worker, /push_ready/);
assert.match(worker, /pbkdf2-sha256/);
assert.match(worker, /verifyPassword/);
assert.match(worker, /verification\.needsUpgrade/);
assert.match(
  expandedTrashMigration,
  /'photo',\s*'secret',\s*'recipe',\s*'wish',\s*'weekend',\s*'anniversary',\s*'gratitude'/
);
assert.match(index, /id="weekendReminderNotice"/);
assert.match(app, /getUpcomingWeekendPlans/);
assert.match(app, /String\(photo\.user_id \|\| ""\) !== String\(session\.user\.id\)/);
assert.match(app, /img\.feed-image, img\.secret-progressive-image/);
assert.match(css, /\.secret-album-photo\.media-loaded::before/);
assert.match(index, /id="secretPinDialog"/);
assert.match(app, /SECRET_UNLOCK_MAX_MS = 15 \* 60 \* 1000/);
assert.match(app, /function openSecretFolderContextMenu/);
assert.match(app, /function openSecretAlbumContextMenu/);
assert.match(app, /let secretDefaultFolderId = "unfiled"/);
assert.match(app, /secret_default_folder_id/);
assert.match(app, /data-admin-unpin-index/);
assert.match(app, /updateAdminUnpin/);
assert.match(worker, /secret_default_folder_id/);
assert.match(worker, /adminUnpinRequest/);
assert.match(app, /async function hashSecretPin/);
assert.match(app, /requestedPage === "secret" && !skipSecretGate && !isSecretUnlocked\(\)/);
assert.match(css, /Secret archive PIN/);
assert.match(css, /Mobile secret PIN sheet/);
assert.match(index, /id="wishDialogFeedback"/);
assert.match(app, /wish-detail-dialog/);
assert.match(app, /data-view-wish-detail/);
assert.match(css, /Completed wishes: readable feedback/);
assert.match(worker, /move_family_item_to_trash/);
assert.match(worker, /RECYCLABLE_FAMILY_ITEMS/);
assert.match(worker, /list_trash_items/);
assert.match(worker, /restore_trash_item/);
assert.match(worker, /permanently_delete_trash_item/);
assert.match(worker, /function normalizeRestoredPhotoComments\(/);
assert.match(worker, /insert into photo_comments/);
assert.match(app, /const deleteResult = await householdRepository\.remove\("wishes", \{ id \}\)/);
assert.match(app, /数据库没有删除任何记录，请稍后重试/);
assert.match(worker, /existingPhotoIds = new Set/);
assert.match(worker, /activityRows = table === "photos" && action === "upsert"/);
assert.match(css, /Desktop diary detail: keep the image large while comments stay visible beside it/);
assert.match(css, /grid-template-columns: minmax\(0, 1fr\) var\(--diary-sidebar-width\)/);
assert.match(css, /\.photo-comments \{[\s\S]*?position: absolute/);
assert.match(app, /move_family_item_to_trash/);
assert.match(app, /rpc\("list_trash_items"/);
assert.match(app, /rpc\("restore_trash_item"/);
assert.match(app, /rpc\("permanently_delete_trash_item"/);
assert.match(app, /async function snapshotPhotoCommentsForTrash\(/);
assert.match(app, /const trashPayload = \{ \.\.\.photo, comments \}/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS push_subscriptions/);
assert.match(serviceWorker, /addEventListener\("push"/);
assert.match(serviceWorker, /notificationclick/);
assert.doesNotMatch(serviceWorker, /Promise\.allSettled\(\s*CORE_ASSETS/);
assert.match(serviceWorker, /event\.waitUntil\(network\.then/);
assert.match(pageHeaders, /X-Frame-Options:\s*DENY/);
assert.match(pageHeaders, /X-Content-Type-Options:\s*nosniff/);
assert.match(app, /from "\.\/modules\/confirm-dialog\.js"/);
assert.match(app, /from "\.\/modules\/cache-policy\.js"/);
assert.match(app, /from "\.\/modules\/diary-domain\.js"/);
assert.match(app, /from "\.\/modules\/notification-domain\.js"/);
assert.match(app, /from "\.\/modules\/secret-domain\.js\?v=20260810-004"/);
assert.match(app, /from "\.\/modules\/cloudflare-client\.js\?v=20260811-010"/);
assert.match(worker, /SESSION_REFRESH_WINDOW_MS = 30 \* 86400 \* 1000/);
assert.match(worker, /update sessions set expires_at=\? where id=\?/);
assert.match(worker, /SESSION_DAYS = 3650/);
assert.match(worker, /delete from sessions where user_id=\? and token_hash<>\?/);
assert.match(worker, /delete from sessions where user_id=\?/);
assert.match(cloudflareClientModule, /SESSION_ROLLING_DAYS = 3650/);
assert.match(cloudflareClientModule, /delete activeSession\.offline_only/);
assert.match(app, /from "\.\/modules\/data-repositories\.js\?v=20260814-005"/);
assert.match(app, /from "\.\/modules\/media-cache\.js"/);
assert.match(app, /from "\.\/modules\/media-metadata\.js"/);
assert.match(app, /from "\.\/modules\/upload-queue\.js"/);
assert.match(app, /from "\.\/modules\/image-service\.js"/);
assert.match(app, /from "\.\/modules\/gamification-domain\.js\?v=20260810-003"/);
assert.match(app, /from "\.\/modules\/gamification-archive\.js"/);
assert.match(app, /from "\.\/modules\/preferences-store\.js"/);
assert.match(app, /from "\.\/modules\/household-repository\.js"/);
assert.match(app, /from "\.\/modules\/ui-formatters\.js"/);
assert.match(app, /from "\.\/modules\/app-lifecycle\.js"/);
assert.match(app, /from "\.\/modules\/offline-records\.js"/);
assert.doesNotMatch(app, /notificationPollTimer|lastForegroundSyncAt|syncAfterReturningToApp/);
["photos", "secret_items", "photo_comments", "notifications"].forEach((table) => {
  assert.doesNotMatch(app, new RegExp(`\\.from\\("${table}"\\)`));
});
assert.doesNotMatch(app, /cloudDb\s*\.from\(/);
assert.doesNotMatch(app, /\b(?:window\.)?confirm\s*\(/);
assert.match(confirmDialogModule, /export function confirmAction/);
assert.match(cachePolicyModule, /export function isClearlyUnmeteredConnection/);
assert.match(serviceWorker, /modules\/confirm-dialog\.js/);
assert.match(serviceWorker, /modules\/diary-domain\.js/);
assert.match(serviceWorker, /modules\/notification-domain\.js/);
assert.match(serviceWorker, /modules\/secret-domain\.js/);
assert.match(serviceWorker, /life-vlog-site-20260814-005-pwa/);
assert.match(serviceWorker, /redesign\.css\?v=20260813-001/);
assert.match(index, /app\.js\?v=20260814-005/);
assert.match(
  pageHeaders,
  /img-src[^\n]*https:\/\/life-vlog-r2-upload\.xiudan320-life\.workers\.dev/,
);
assert.match(css, /photo-comment-author-line/);
assert.match(index, /id="diaryViewerToolbar"/);
assert.match(app, /function updateDiaryViewerToolbar/);
assert.match(app, /function downloadCurrentDiaryImage/);
[
  "app-lifecycle",
  "cloudflare-client",
  "data-repositories",
  "media-cache",
  "media-metadata",
  "offline-records",
  "upload-queue",
  "image-service",
  "gamification-domain",
  "gamification-archive",
  "preferences-store",
  "household-repository",
  "ui-formatters",
  "wardrobe",
].forEach((moduleName) => {
  assert.match(serviceWorker, new RegExp(`modules/${moduleName}\\.js`));
});
assert.match(diaryDomainModule, /export function sortDiaryEntries/);
assert.match(notificationDomainModule, /export function aggregateInteractionNotifications/);
assert.match(secretDomainModule, /export function normalizeSecretPhotoTags/);
assert.match(cloudflareClientModule, /export function createCloudflareBackend/);
assert.match(repositoryModule, /export function createDiaryRepository/);
assert.match(repositoryModule, /export function createSecretRepository/);
assert.match(repositoryModule, /export function createNotificationRepository/);
assert.match(repositoryModule, /export function createWardrobeRepository/);
assert.match(wardrobeModule, /export function createWardrobeController/);
assert.match(wardrobeCss, /\.wardrobe-grid/);
assert.match(index, /id="wardrobeNav"/);
assert.match(index, /id="wardrobeRoot"/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS wardrobe_locations/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS wardrobe_items/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS wardrobe_wear_logs/);
assert.match(worker, /wardrobe_items: \{/);
assert.match(mediaMetadataModule, /export function composeDiaryStoredNote/);
assert.match(uploadQueueModule, /export function createUploadQueue/);
assert.match(imageServiceModule, /export function createImageService/);
assert.equal(cachePolicy.normalizeCacheMb("5", 100), 20);
assert.equal(cachePolicy.normalizeCacheMb("5000", 100), 2000);
assert.equal(
  cachePolicy.getCacheCapacityStorageKey("secret", "user-1", {
    diary: "diary",
    secret: "secret",
  }),
  "secret:user-1"
);
assert.equal(cachePolicy.isClearlyUnmeteredConnection({ connection: { type: "wifi" } }), true);
assert.equal(cachePolicy.isClearlyUnmeteredConnection({ connection: { effectiveType: "4g" } }), false);
assert.equal(uiFormatters.escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#039;");
const weekendMetadata = mediaMetadata.parseWeekendStoredNote(
  mediaMetadata.composeWeekendStoredNote(
    "带上相机。",
    [{ image_url: "https://example.com/plan.jpg", image_path: "r2:plan.jpg" }],
    "天气很好，也终于吃到了想吃的店。",
    [{ image_url: "https://example.com/recap.jpg", image_path: "r2:recap.jpg" }],
    "2026-08-09T12:00:00.000Z"
  )
);
assert.equal(weekendMetadata.note, "带上相机。");
assert.equal(weekendMetadata.images.length, 1);
assert.equal(weekendMetadata.completionNote, "天气很好，也终于吃到了想吃的店。");
assert.equal(weekendMetadata.completionImages.length, 1);
assert.equal(weekendMetadata.completedAt, "2026-08-09T12:00:00.000Z");
assert.equal(uiFormatters.slugify("Hello World"), "hello-world");
assert.equal(uiFormatters.slugify(""), "photo");
assert.equal(uiFormatters.formatDate("not-a-date"), "\u672a\u8bb0\u5f55\u65e5\u671f");
assert.equal(uiFormatters.formatDateTime("not-a-date"), "\u672a\u77e5\u65f6\u95f4");
assert.deepEqual(
  offlineRecords.sanitizeDiaryRecord({
    id: "photo-1",
    category: "",
    is_public: 1,
    is_featured: 0,
  }),
  {
    id: "photo-1",
    user_id: undefined,
    title: "",
    note: "",
    category: "\u65e5\u5e38",
    taken_at: "",
    created_at: "",
    image_path: "",
    image_url: "",
    width: null,
    height: null,
    is_public: true,
    is_featured: false,
    is_pinned: false,
  }
);
assert.deepEqual(
  offlineRecords.sanitizeSecretRecord(
    { id: "secret-1", createdAt: "2026-07-31" },
    { images: [{ image_url: "one.jpg" }], defaultSortOrder: 123 }
  ),
  {
    id: "secret-1",
    userId: "",
    title: "",
    category: "\u672a\u5206\u7c7b",
    note: "",
    coverImage: "",
    coverPath: "",
    images: [{ image_url: "one.jpg" }],
    linkedPhotoId: "",
    sortOrder: 123,
    createdAt: "2026-07-31",
    updatedAt: "",
  }
);
const usageStorageValues = new Map([
  ["life-vlog-one", "abc"],
  ["other", "ignored"],
]);
const usageStorage = {
  get length() {
    return usageStorageValues.size;
  },
  key: (index) => [...usageStorageValues.keys()][index] || null,
  getItem: (key) => usageStorageValues.get(key) || null,
};
assert.equal(
  offlineRecords.getStorageUsageBytes(usageStorage),
  new Blob(["life-vlog-one", "abc"]).size
);

let lifecycleNow = 1_000;
let lifecycleVisibility = "visible";
let lifecycleForegroundRuns = 0;
let lifecyclePollRuns = 0;
let lifecycleIntervalsStarted = 0;
let lifecycleIntervalsCleared = 0;
const lifecycleDocument = new EventTarget();
const lifecycleWindow = new EventTarget();
Object.defineProperty(lifecycleDocument, "visibilityState", {
  get: () => lifecycleVisibility,
});
const lifecycleController = appLifecycle.createAppLifecycleController({
  documentTarget: lifecycleDocument,
  windowTarget: lifecycleWindow,
  now: () => lifecycleNow,
  foregroundThrottleMs: 10_000,
  onForeground: async () => {
    lifecycleForegroundRuns += 1;
  },
  onPoll: async () => {
    lifecyclePollRuns += 1;
  },
  setIntervalApi: () => {
    lifecycleIntervalsStarted += 1;
    return lifecycleIntervalsStarted;
  },
  clearIntervalApi: () => {
    lifecycleIntervalsCleared += 1;
  },
});
lifecycleController.start();
assert.equal(lifecycleController.getState().polling, true);
await lifecycleController.requestForeground();
await lifecycleController.requestForeground();
assert.equal(lifecycleForegroundRuns, 1);
lifecycleNow += 11_000;
await lifecycleController.requestForeground();
assert.equal(lifecycleForegroundRuns, 2);
lifecycleVisibility = "hidden";
lifecycleDocument.dispatchEvent(new Event("visibilitychange"));
assert.equal(lifecycleController.getState().polling, false);
await lifecycleController.requestPoll();
assert.equal(lifecyclePollRuns, 0);
lifecycleVisibility = "visible";
lifecycleNow += 11_000;
lifecycleDocument.dispatchEvent(new Event("visibilitychange"));
await Promise.resolve();
await Promise.resolve();
assert.equal(lifecycleController.getState().polling, true);
assert.equal(lifecycleForegroundRuns, 3);
lifecycleController.stop();
assert.equal(lifecycleController.getState().started, false);
assert.ok(lifecycleIntervalsStarted >= 2);
assert.ok(lifecycleIntervalsCleared >= 2);

let scheduledFrameCallback = null;
let frameRuns = 0;
let latestFrameValue = 0;
const frameScheduler = appLifecycle.createFrameScheduler(
  (value) => {
    frameRuns += 1;
    latestFrameValue = value;
  },
  {
    requestFrame: (callback) => {
      scheduledFrameCallback = callback;
      return 1;
    },
    cancelFrame: () => {
      scheduledFrameCallback = null;
    },
  }
);
frameScheduler(1);
frameScheduler(2);
frameScheduler(3);
assert.equal(frameScheduler.pending(), true);
assert.equal(frameRuns, 0);
scheduledFrameCallback();
assert.equal(frameRuns, 1);
assert.equal(latestFrameValue, 3);
assert.equal(frameScheduler.pending(), false);

let activeMediaFetches = 0;
let maxActiveMediaFetches = 0;
const fakeMediaResponse = {
  ok: true,
  type: "basic",
  headers: { get: () => "1" },
  clone() {
    return this;
  },
};
const fakeMediaCache = {
  keys: async () => [],
  match: async () => null,
  put: async () => {},
  delete: async () => true,
};
const serializedMediaCache = mediaCache.createMediaCacheService({
  appCachePrefix: "app-",
  diaryCacheName: "diary",
  secretCacheName: "secret",
  legacyCacheName: "legacy",
  cacheStorage: {
    open: async () => fakeMediaCache,
    keys: async () => [],
  },
  fetchApi: async () => {
    activeMediaFetches += 1;
    maxActiveMediaFetches = Math.max(maxActiveMediaFetches, activeMediaFetches);
    await new Promise((resolve) => setTimeout(resolve, 5));
    activeMediaFetches -= 1;
    return fakeMediaResponse;
  },
  RequestApi: class {
    constructor(url) {
      this.url = url;
    }
  },
  navigatorApi: {},
});
await Promise.all([
  serializedMediaCache.fillWithinCapacity("diary", ["one.jpg"], 100, 1),
  serializedMediaCache.fillWithinCapacity("diary", ["two.jpg"], 100, 1),
]);
assert.equal(maxActiveMediaFetches, 1);

const rollingEntries = new Map([
  ["https://example.com/old-1.jpg", {
    ok: true,
    type: "basic",
    headers: { get: () => "40" },
    clone() { return this; },
  }],
  ["https://example.com/old-2.jpg", {
    ok: true,
    type: "basic",
    headers: { get: () => "40" },
    clone() { return this; },
  }],
]);
const rollingCache = {
  keys: async () => [...rollingEntries.keys()].map((url) => ({ url })),
  match: async (request) => rollingEntries.get(typeof request === "string" ? request : request.url) || null,
  put: async (request, response) => rollingEntries.set(request.url, response),
  delete: async (request) => rollingEntries.delete(typeof request === "string" ? request : request.url),
};
const rollingMediaCache = mediaCache.createMediaCacheService({
  appCachePrefix: "app-",
  diaryCacheName: "diary",
  secretCacheName: "secret",
  legacyCacheName: "legacy",
  cacheStorage: {
    open: async () => rollingCache,
    keys: async () => ["diary"],
  },
  fetchApi: async () => ({
    ok: true,
    type: "basic",
    headers: { get: () => "40" },
    clone() { return this; },
  }),
  RequestApi: class {
    constructor(url) {
      this.url = url;
    }
  },
  navigatorApi: {},
});
await rollingMediaCache.fillWithinCapacity(
  "diary",
  ["https://example.com/new.jpg", "https://example.com/old-2.jpg"],
  80,
  1
);
assert.equal(rollingEntries.has("https://example.com/new.jpg"), true);
assert.equal(rollingEntries.has("https://example.com/old-2.jpg"), true);
assert.equal(rollingEntries.has("https://example.com/old-1.jpg"), false);

const memoryStorage = new Map();
const preferenceStore = preferencesStoreModule.createPreferenceStore({
  storage: {
    getItem: (key) => memoryStorage.has(key) ? memoryStorage.get(key) : null,
    setItem: (key, value) => memoryStorage.set(key, value),
  },
});
preferenceStore.writeScoped("theme", "user-1", "dark");
assert.equal(preferenceStore.readScoped("theme", "user-1", "light"), "dark");
assert.equal(
  preferenceStore.readEnum("layout", ["single", "double"], "double", { scope: "user-1" }),
  "double"
);
preferenceStore.writeJson("tools", ["food", "secret"], { scope: "user-1" });
assert.deepEqual(
  preferenceStore.readJson("tools", [], { scope: "user-1" }),
  ["food", "secret"]
);
assert.equal(gamificationDomain.getVipExpMultiplier(0), 1);
assert.equal(gamificationDomain.getVipExpMultiplier(5), 1.5);
assert.equal(gamificationDomain.getDailyLoginReward(1, 0), 25);
assert.ok(gamificationDomain.getDailyLoginReward(7, 0) > 25);

function createFakeDatabase() {
  const calls = [];
  const result = { data: [{ id: "row-1" }], error: null };
  function query(tableName) {
    const chain = {
      delete() {
        calls.push(["delete", tableName]);
        return chain;
      },
      eq(column, value) {
        calls.push(["eq", column, value]);
        return chain;
      },
      in(column, value) {
        calls.push(["in", column, value]);
        return chain;
      },
      insert(payload) {
        calls.push(["insert", tableName, payload]);
        return chain;
      },
      limit(value) {
        calls.push(["limit", value]);
        return chain;
      },
      maybeSingle() {
        calls.push(["maybeSingle"]);
        return chain;
      },
      order(column, options) {
        calls.push(["order", column, options]);
        return chain;
      },
      select(columns) {
        calls.push(["select", tableName, columns]);
        return chain;
      },
      single() {
        calls.push(["single"]);
        return chain;
      },
      update(payload) {
        calls.push(["update", tableName, payload]);
        return chain;
      },
      upsert(payload, options) {
        calls.push(["upsert", tableName, payload, options]);
        return chain;
      },
      then(resolve) {
        resolve(result);
      },
    };
    return chain;
  }
  return {
    calls,
    from(tableName) {
      calls.push(["from", tableName]);
      return query(tableName);
    },
    rpc(name, args) {
      calls.push(["rpc", name, args]);
      return Promise.resolve(result);
    },
  };
}

const fakeDatabase = createFakeDatabase();
const householdRepository = householdRepositoryModule.createHouseholdRepository({
  getDatabase: () => fakeDatabase,
  getSession: () => ({ user: { id: "user-1" } }),
});
await householdRepository.list("recipes", {
  filters: { user_id: "user-1" },
  order: [{ column: "created_at", ascending: false }],
  limit: 10,
});
assert.deepEqual(fakeDatabase.calls.slice(0, 4), [
  ["from", "recipes"],
  ["select", "recipes", "*"],
  ["eq", "user_id", "user-1"],
  ["order", "created_at", { ascending: false }],
]);
await householdRepository.updateOwned(
  "gratitude_notes",
  { body: "谢谢" },
  { id: "note-1" }
);
assert.ok(
  fakeDatabase.calls.some(
    (call) => call[0] === "eq" && call[1] === "user_id" && call[2] === "user-1"
  )
);
await assert.rejects(
  () => householdRepository.list("unknown_table"),
  /不允许访问数据表/
);

const sortedDiaryIds = diaryDomain
  .sortDiaryEntries([
    { id: "normal-new", created_at: "2026-07-30T10:00:00Z" },
    { id: "featured", is_featured: true, created_at: "2026-07-20T10:00:00Z" },
    { id: "pinned", is_pinned: true, created_at: "2026-07-10T10:00:00Z" },
    { id: "normal-old", created_at: "2026-07-01T10:00:00Z" },
  ])
  .map((entry) => entry.id);
assert.deepEqual(sortedDiaryIds, ["pinned", "featured", "normal-new", "normal-old"]);
assert.deepEqual(
  diaryDomain
    .filterDiaryEntries(
      [
        { id: "match", text: "东京 深夜 拉面" },
        { id: "partial", text: "东京 散步" },
      ],
      "东京 拉面",
      (entry) => entry.text
    )
    .map((entry) => entry.id),
  ["match"]
);
assert.equal(
  diaryDomain.isDiaryWithinDays(
    { created_at: "2026-07-25T23:00:00Z" },
    7,
    new Date("2026-07-31T12:00:00+09:00")
  ),
  true
);
assert.equal(
  diaryDomain.isDiaryWithinDays(
    { created_at: "2026-07-24T23:00:00Z" },
    7,
    new Date("2026-07-31T12:00:00+09:00")
  ),
  false
);

const taggedSecretImage = secretDomain.addSecretImageTag(
  { image_url: "one.jpg", tags: [secretDomain.DEFAULT_SECRET_PHOTO_TAG] },
  "旅行"
);
assert.deepEqual(taggedSecretImage.tags, ["旅行"]);
assert.deepEqual(secretDomain.addSecretImageTag(taggedSecretImage, "夜景").tags, [
  "旅行",
  "夜景",
]);
assert.deepEqual(
  secretDomain.removeSecretImageTag(
    secretDomain.removeSecretImageTag(
      secretDomain.addSecretImageTag(taggedSecretImage, "夜景"),
      "旅行"
    ),
    "夜景"
  ).tags,
  [secretDomain.DEFAULT_SECRET_PHOTO_TAG]
);
assert.deepEqual(
  secretDomain.normalizeSecretPhotoTags({
    tag: secretDomain.DEFAULT_SECRET_PHOTO_TAG,
    tags: ["旅行"],
  }),
  ["旅行"]
);
assert.equal(
  secretDomain.normalizeSecretImages([
    {
      image_url: "one.jpg",
      tags: ["旅行", secretDomain.FAVORITE_SECRET_PHOTO_TAG],
    },
  ])[0].favorite,
  true
);
const secretEntries = [
  { index: 0, image: { uploadedAt: "2026-07-02T00:00:00Z" } },
  { index: 1, image: { uploadedAt: "2026-07-01T00:00:00Z" } },
];
assert.deepEqual(
  secretDomain.sortSecretDisplayEntries(secretEntries, true).map((entry) => entry.index),
  [1, 0]
);
assert.deepEqual(
  secretDomain.sortSecretDisplayEntries(secretEntries, false).map((entry) => entry.index),
  [0, 1]
);
assert.equal(secretDomain.isSecretNumericTag("01"), true);
assert.equal(secretDomain.isSecretNumericTag(" 002 "), true);
assert.equal(secretDomain.isSecretNumericTag("A02"), false);
assert.equal(
  secretDomain.getSecretImageNumericOrder({ tags: ["旅行", "09", "02"] }),
  9
);
const numberedSecretEntries = [
  { index: 0, image: { tags: ["01"] } },
  { index: 1, image: { tags: ["12"] } },
  { index: 2, image: { tags: ["02"] } },
  { index: 3, image: { tags: [secretDomain.DEFAULT_SECRET_PHOTO_TAG] } },
];
assert.deepEqual(
secretDomain.sortSecretDisplayEntries(numberedSecretEntries, false).map((entry) => entry.index),
  [0, 2, 1, 3]
);
assert.deepEqual(
  secretDomain.sortSecretDisplayEntries(numberedSecretEntries, true).map((entry) => entry.index),
  [0, 2, 1, 3]
);

const aggregatedNotifications = notificationDomain.aggregateInteractionNotifications([
  {
    id: "n1",
    actor_id: "user-2",
    type: "reply",
    photo_id: "photo-1",
    created_at: "2026-07-31T10:00:00Z",
    is_read: true,
  },
  {
    id: "n2",
    actor_id: "user-2",
    type: "reply",
    photo_id: "photo-1",
    created_at: "2026-07-31T10:05:00Z",
    is_read: false,
  },
  {
    id: "n3",
    actor_id: "user-2",
    type: "reply",
    photo_id: "photo-1",
    created_at: "2026-07-31T10:30:00Z",
    is_read: false,
  },
]);
assert.equal(aggregatedNotifications.length, 2);
assert.equal(aggregatedNotifications[0].aggregateCount, 2);
assert.equal(aggregatedNotifications[0].is_read, false);
assert.equal(
  notificationDomain.buildNotificationText(
    { type: "reply", aggregateCount: 3 },
    "蛋"
  ),
  "蛋 回复了你 3 次"
);
assert.doesNotThrow(() => JSON.parse(manifestText));

console.log("Smoke checks passed.");
