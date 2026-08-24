import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, css, styles, worker, schema, index, manifestText] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../redesign.css", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/src/worker.js", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/schema.d1.sql", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
]);
const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const diaryDetailCss = await readFile(new URL("../diary-detail.css", import.meta.url), "utf8");
const weekendBoardCss = await readFile(new URL("../weekend-board.css", import.meta.url), "utf8");
const weekendGalleryModule = await readFile(
  new URL("../modules/weekend-gallery.js", import.meta.url),
  "utf8"
);
const wishlistViewModule = await readFile(
  new URL("../modules/wishlist-view.js", import.meta.url),
  "utf8"
);
const diaryUploadDomainModule = await readFile(
  new URL("../modules/diary-upload-domain.js", import.meta.url),
  "utf8"
);
const notificationViewModule = await readFile(
  new URL("../modules/notification-view.js", import.meta.url),
  "utf8"
);
const diaryGalleryViewModule = await readFile(
  new URL("../modules/diary-gallery-view.js", import.meta.url),
  "utf8"
);
const mobileDiaryViewModule = await readFile(
  new URL("../modules/mobile-diary-view.js", import.meta.url),
  "utf8"
);
const mediaGestureDomainModule = await readFile(
  new URL("../modules/media-gesture-domain.js", import.meta.url),
  "utf8"
);
const secretGalleryViewModule = await readFile(
  new URL("../modules/secret-gallery-view.js", import.meta.url),
  "utf8"
);
const accountViewModule = await readFile(
  new URL("../modules/account-view.js", import.meta.url),
  "utf8"
);
const photoDialogViewModule = await readFile(
  new URL("../modules/photo-dialog-view.js", import.meta.url),
  "utf8"
);
const familyActivityViewModule = await readFile(
  new URL("../modules/family-activity-view.js", import.meta.url),
  "utf8"
);
const cacheManagementViewModule = await readFile(
  new URL("../modules/cache-management-view.js", import.meta.url),
  "utf8"
);
const gamificationViewModule = await readFile(
  new URL("../modules/gamification-view.js", import.meta.url),
  "utf8"
);
const accountSyncDomain = await import(new URL("../modules/account-sync-domain.js", import.meta.url));
const appElements = await import(new URL("../modules/app-elements.js", import.meta.url));
const foodWheelController = await import(new URL("../modules/food-wheel-controller.js", import.meta.url));
const pushController = await import(new URL("../modules/push-controller.js", import.meta.url));
const anniversaryController = await import(new URL("../modules/anniversary-controller.js", import.meta.url));
const gratitudeController = await import(new URL("../modules/gratitude-controller.js", import.meta.url));
const recipeController = await import(new URL("../modules/recipe-controller.js", import.meta.url));
const recipeControllerModule = await readFile(new URL("../modules/recipe-controller.js", import.meta.url), "utf8");
const anniversaryControllerModule = await readFile(new URL("../modules/anniversary-controller.js", import.meta.url), "utf8");
const gratitudeControllerModule = await readFile(new URL("../modules/gratitude-controller.js", import.meta.url), "utf8");
const pushControllerModule = await readFile(new URL("../modules/push-controller.js", import.meta.url), "utf8");
const wishlistController = await import(new URL("../modules/wishlist-controller.js", import.meta.url));
const wishlistControllerModule = await readFile(new URL("../modules/wishlist-controller.js", import.meta.url), "utf8");
const weekendController = await import(new URL("../modules/weekend-controller.js", import.meta.url));
const weekendControllerModule = await readFile(new URL("../modules/weekend-controller.js", import.meta.url), "utf8");
const authController = await import(new URL("../modules/auth-controller.js", import.meta.url));
const offlineCacheController = await import(new URL("../modules/offline-cache-controller.js", import.meta.url));
const offlineCacheControllerModule = await readFile(new URL("../modules/offline-cache-controller.js", import.meta.url), "utf8");
const offlineSettingsController = await import(new URL("../modules/offline-settings-controller.js", import.meta.url));
const offlineSettingsControllerModule = await readFile(new URL("../modules/offline-settings-controller.js", import.meta.url), "utf8");
const dataSafetyController = await import(new URL("../modules/data-safety-controller.js", import.meta.url));
const dataSafetyControllerModule = await readFile(new URL("../modules/data-safety-controller.js", import.meta.url), "utf8");
const accountSyncController = await import(new URL("../modules/account-sync-controller.js", import.meta.url));
const accountSyncControllerModule = await readFile(new URL("../modules/account-sync-controller.js", import.meta.url), "utf8");
const trashController = await import(new URL("../modules/trash-controller.js", import.meta.url));
const trashControllerModule = await readFile(new URL("../modules/trash-controller.js", import.meta.url), "utf8");
const diaryFeedController = await import(new URL("../modules/diary-feed-controller.js", import.meta.url));
const diaryFeedControllerModule = await readFile(new URL("../modules/diary-feed-controller.js", import.meta.url), "utf8");
const socialController = await import(new URL("../modules/social-controller.js", import.meta.url));
const socialControllerModule = await readFile(new URL("../modules/social-controller.js", import.meta.url), "utf8");
const familySettingsController = await import(new URL("../modules/family-settings-controller.js", import.meta.url));
const familySettingsControllerModule = await readFile(new URL("../modules/family-settings-controller.js", import.meta.url), "utf8");
const familyActivityController = await import(new URL("../modules/family-activity-controller.js", import.meta.url));
const familyActivityControllerModule = await readFile(new URL("../modules/family-activity-controller.js", import.meta.url), "utf8");
const toolDockController = await import(new URL("../modules/tool-dock-controller.js", import.meta.url));
const toolDockControllerModule = await readFile(new URL("../modules/tool-dock-controller.js", import.meta.url), "utf8");
const layoutSettingsController = await import(new URL("../modules/layout-settings-controller.js", import.meta.url));
const layoutSettingsControllerModule = await readFile(new URL("../modules/layout-settings-controller.js", import.meta.url), "utf8");
const appEventBindings = await import(new URL("../modules/app-event-bindings.js", import.meta.url));
const appEventBindingsModule = await readFile(new URL("../modules/app-event-bindings.js", import.meta.url), "utf8");
const assetController = await import(new URL("../modules/asset-controller.js", import.meta.url));
const assetControllerModule = await readFile(new URL("../modules/asset-controller.js", import.meta.url), "utf8");
const diaryComposerController = await import(new URL("../modules/diary-composer-controller.js", import.meta.url));
const diaryComposerControllerModule = await readFile(new URL("../modules/diary-composer-controller.js", import.meta.url), "utf8");
const gamificationController = await import(new URL("../modules/gamification-controller.js", import.meta.url));
const gamificationControllerModule = await readFile(new URL("../modules/gamification-controller.js", import.meta.url), "utf8");
const profilePreferencesController = await import(new URL("../modules/profile-preferences-controller.js", import.meta.url));
const profilePreferencesControllerModule = await readFile(new URL("../modules/profile-preferences-controller.js", import.meta.url), "utf8");
const secretController = await import(new URL("../modules/secret-controller.js", import.meta.url));
const secretControllerModule = await readFile(new URL("../modules/secret-controller.js", import.meta.url), "utf8");
const secretPinController = await import(new URL("../modules/secret-pin-controller.js", import.meta.url));
const secretPinControllerModule = await readFile(new URL("../modules/secret-pin-controller.js", import.meta.url), "utf8");
const photoViewerController = await import(new URL("../modules/photo-viewer-controller.js", import.meta.url));
const photoViewerControllerModule = await readFile(new URL("../modules/photo-viewer-controller.js", import.meta.url), "utf8");
const photoDetailController = await import(new URL("../modules/photo-detail-controller.js", import.meta.url));
const photoDetailControllerModule = await readFile(new URL("../modules/photo-detail-controller.js", import.meta.url), "utf8");
const applicationSource = [
  app,
  offlineSettingsControllerModule,
  dataSafetyControllerModule,
  accountSyncControllerModule,
  trashControllerModule,
  diaryFeedControllerModule,
  socialControllerModule,
  familySettingsControllerModule,
  familyActivityControllerModule,
  toolDockControllerModule,
  layoutSettingsControllerModule,
  appEventBindingsModule,
  assetControllerModule,
  diaryComposerControllerModule,
  gamificationControllerModule,
  profilePreferencesControllerModule,
  photoViewerControllerModule,
  photoDetailControllerModule,
  secretControllerModule,
  secretPinControllerModule,
].join("\n");
assert.doesNotMatch(applicationSource, /dataset\.state\./);
const deployScript = await readFile(new URL("../deploy-cloudflare-pages.ps1", import.meta.url), "utf8");
const releaseTestScript = await readFile(new URL("../test-release.ps1", import.meta.url), "utf8");
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
const photoFavoritesDomain = await import(
  new URL("../modules/photo-favorites.js", import.meta.url)
);
const wishlistView = await import(
  new URL("../modules/wishlist-view.js", import.meta.url)
);
const diaryUploadDomain = await import(new URL("../modules/diary-upload-domain.js", import.meta.url));
const foodWheelView = await import(new URL("../modules/food-wheel-view.js", import.meta.url));
const recipeView = await import(new URL("../modules/recipe-view.js", import.meta.url));
const anniversaryView = await import(new URL("../modules/anniversary-view.js", import.meta.url));
const weekendPlansView = await import(new URL("../modules/weekend-plans-view.js", import.meta.url));
const gratitudeView = await import(new URL("../modules/gratitude-view.js", import.meta.url));
const notificationView = await import(new URL("../modules/notification-view.js", import.meta.url));
const vipCenter = await import(new URL("../modules/vip-center.js", import.meta.url));
const diaryGalleryView = await import(new URL("../modules/diary-gallery-view.js", import.meta.url));
const mobileDiaryView = await import(new URL("../modules/mobile-diary-view.js", import.meta.url));
const mediaGestureDomain = await import(new URL("../modules/media-gesture-domain.js", import.meta.url));
const secretGalleryView = await import(new URL("../modules/secret-gallery-view.js", import.meta.url));
const accountView = await import(new URL("../modules/account-view.js", import.meta.url));
const photoDialogView = await import(new URL("../modules/photo-dialog-view.js", import.meta.url));
const familyActivityView = await import(new URL("../modules/family-activity-view.js", import.meta.url));
const gamificationView = await import(new URL("../modules/gamification-view.js", import.meta.url));
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
const vlogModeModule = await readFile(
  new URL("../modules/vlog-mode.js", import.meta.url),
  "utf8"
);
const diaryVideoLayoutModule = await readFile(
  new URL("../modules/diary-video-layout.js", import.meta.url),
  "utf8"
);
const mediaCache = await import(
  new URL("../modules/media-cache.js", import.meta.url)
);
const mediaMetadataModule = await readFile(
  new URL("../modules/media-metadata.js", import.meta.url),
  "utf8"
);
const adminStorageModule = await readFile(
  new URL("../modules/admin-storage.js", import.meta.url),
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
assert.match(index, /redesign\.css\?v=20260824-027/);
assert.match(index, /styles\.css\?v=20260824-026/);
assert.match(index, /id="adminStorageMeter"/);
assert.match(index, /R2 对象存储/);
assert.match(index, /id="adminStorageMonth"/);
assert.doesNotMatch(index, /D1 数据库/);
assert.match(index, /id="dialogVideo"[^>]*playsinline[^>]*preload="metadata"/);
assert.doesNotMatch(index, /id="dialogVideo"[^>]*(?:autoplay|muted|loop)/);
assert.match(index, /secret-viewer\.css\?v=20260814-231/);
assert.match(index, /secret-create-folder-label">新建文件夹/);
assert.match(applicationSource, /function fitSecretViewerImage\(\)/);
assert.match(diaryVideoLayoutModule, /export function startDiaryMotionVideo\(video, container, \{ audible = false, controlsOnTap = false \} = \{\}\)/);
assert.match(diaryVideoLayoutModule, /video\.muted = !audible/);
assert.match(diaryVideoLayoutModule, /video\.autoplay = true/);
assert.match(photoDetailControllerModule, /startDiaryMotionVideo\(vlogVideo, null, \{ audible: true, controlsOnTap: true \}\)/);
assert.match(mobileDiaryViewModule, /mobile-diary-motion/);
assert.match(diaryGalleryViewModule, /videoPreviewStyle[\s\S]*object-fit:contain;background:#080b09/);
assert.match(applicationSource, /dialogImage\.style\.display = hasMotion/);
assert.match(applicationSource, /dialogVideo\.style\.display = hasMotion/);
assert.match(applicationSource, /dialogVideo\.controls = mediaType === "video" \|\| !isMobileViewport\(\)/);
assert.doesNotMatch(index, /id="dialogVideo"[^>]*controls/);
assert.match(index, /id="photoVideoPreview"[^>]*controls/);
assert.doesNotMatch(index, /id="photoVideoPreview"[^>]*muted/);
assert.match(index, /option value="pet">宠物生日</);
assert.equal(anniversaryView.getAnniversaryTypeLabel("pet"), "宠物生日");
assert.match(applicationSource, /life-vlog-diary-image-cache/);
assert.match(serviceWorker, /life-vlog-diary-image-cache/);
assert.match(mediaCacheModule, /startsWith\("video\/"\)/);
assert.match(applicationSource, /Live Photo 上传失败：[\s\S]*throw error/);
assert.match(applicationSource, /普通视频上传失败：[\s\S]*throw error/);
assert.match(index, /id="photoInput"[^>]*accept="image\/\*/);
assert.match(index, /id="photoMotionInput"[^>]*accept="video\/\*/);
assert.match(imageServiceModule, /export async function createVideoPosterFile\(file\)/);
assert.match(applicationSource, /LIVE_PHOTO_MOTION_NOT_PROVIDED_BY_BROWSER/);
assert.match(diaryGalleryViewModule, /export function shouldAutoplayDiaryFeedMedia/);
assert.match(diaryGalleryViewModule, /if \(mobile\) return photoIndex < 5/);
assert.match(mobileDiaryViewModule, /export function buildMobileDiaryPageMarkup/);
assert.match(applicationSource, /els\.dialog\.className = "no-comments-dialog mobile-diary-image-viewer"/);
assert.doesNotMatch(applicationSource, /isDiaryLiveMedia\(thumb\) \? '<span class="live-photo-badge">LIVE<\/span>'/);
assert.match(diaryGalleryViewModule, /multi-motion-dot/);
assert.match(applicationSource, /await verifyPhotoFlagSchema\(\)/);
assert.match(applicationSource, /refreshAdminStorage/);
assert.match(worker, /handleAdminR2Usage/);
assert.match(worker, /new Request\([\s\S]*?headers: request\.headers[\s\S]*?env,[\s\S]*?user,[\s\S]*?table/);
assert.match(worker, /R2_BUCKET\.list/);
assert.match(worker, /month_uploaded_bytes: monthUploadedBytes/);
assert.match(adminStorageModule, /data\.month_uploaded_bytes/);
assert.match(worker, /capacity_label: "不限"/);
assert.match(vlogModeModule, /export function validateVlogUpload/);
assert.match(vlogModeModule, /export function filterVlogPhotos/);
assert.match(index, /id="vlogNav"/);
assert.match(index, /id="recipesToolOpen"[^>]*data-tool-id="recipes"/);
assert.doesNotMatch(index, /id="recipesNav"/);
assert.match(index, /href="https:\/\/dash\.cloudflare\.com\/"/);
assert.match(applicationSource, /category: vlogMode\.isActive\(\) \? "VLOG"/);
const initializeCloudflareIndex = app.indexOf("async function initializeCloudflare()");
const authListenerIndex = app.indexOf("cloudDb.auth.onAuthStateChange", initializeCloudflareIndex);
const initialPhotoLoadIndex = app.indexOf("await loadPhotos()", initializeCloudflareIndex);
assert.ok(initializeCloudflareIndex >= 0, "Cloudflare initialization is missing");
assert.ok(authListenerIndex > initializeCloudflareIndex, "Auth listener is missing from initialization");
assert.ok(authListenerIndex < initialPhotoLoadIndex, "Auth listener must be registered before initial photo loading");
assert.match(serviceWorker, /life-vlog-site-20260824-030-pwa/);
assert.match(serviceWorker, /modules\/admin-storage\.js/);
assert.match(diaryDetailCss, /#photoDialog #dialogImage\[hidden\][\s\S]*?display: none !important/);
assert.match(applicationSource, /const p=!state\.galleryRenderSignature[\s\S]*?initialRender: p/);
assert.match(diaryGalleryViewModule, /if \(initialRender\) requestAnimationFrame[\s\S]*?scrollIntoView\(\)/);
assert.match(styles, /\.gallery \.photo-media[\s\S]*?scroll-margin-top: 76px/);
assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.gallery \.photo-media[\s\S]*?scroll-margin-top: calc\(136px \+ env\(safe-area-inset-top\)\)/);
assert.match(styles, /\.multi-motion-dot[\s\S]*?background: var\(--accent\)/);
assert.match(styles, /mobile-diary-image-viewer\.no-comments-dialog[\s\S]*?\.media-counter[\s\S]*?left: 50% !important/);
assert.match(styles, /mobile-diary-image-viewer\.no-comments-dialog > article[\s\S]*?display: none !important/);
assert.match(styles, /body \.photo-card \.photo-status-badges[\s\S]*?left: 12px !important/);
assert.match(styles, /#photoDialog\.mobile-page-dialog > article[\s\S]*?display: none !important/);
assert.match(styles, /body\.mobile-dialog-open #photoDialog\.diary-detail-dialog \.dialog-media[\s\S]*?position: fixed !important/);
assert.match(diaryGalleryViewModule, /connection\.saveData \|\| connection\.type === "cellular"/);
assert.match(mediaMetadataModule, /export function getDiaryMediaType\(media = \{\}\)/);
assert.match(applicationSource, /type: "video"/);
assert.match(applicationSource, /video_url: video.url/);
assert.match(diaryUploadDomainModule, /unpairedEntries\.slice\(0, remainingMotionFiles\.length\)/);
assert.match(worker, /fileType\.startsWith\("video\/"\)/);
assert.match(worker, /upsertRows\(env, table, sanitizedRows, config\.columns, conflict\)/);
assert.match(mobileDiaryViewModule, /photo-comment-author-badge/);
assert.match(mobileDiaryViewModule, /共 \$\{comments\.length\} 条评论/);
assert.match(applicationSource, /const AVATAR_CACHE_KEY = "life-vlog-avatar-cache"/);
assert.match(applicationSource, /function getProfileAvatarUrl\(profile = \{\}\)/);
assert.match(applicationSource, /getProfileAvatarUrl\(member\)/);
assert.match(applicationSource, /getProfileAvatarUrl\(accountProfile\)/);
assert.match(applicationSource, /function renderExperienceRulesPanel\(experience\)/);
assert.match(applicationSource, /profileUpdates\.login_streak = loginStreak/);
assert.match(applicationSource, /loadCachedAvatarUrl\(member\.user_id\)/);
assert.match(worker, /actor_avatar_path/);
assert.match(worker, /user_profiles\.avatar_path/);
assert.match(applicationSource, /data-settings-signup-invite/);
assert.match(applicationSource, /\/api\/admin\/signup-invite/);
assert.match(worker, /async function handleSignupInviteRead\(/);
assert.match(worker, /Only the family owner can read the signup invite/);
assert.match(worker, /url\.pathname === "\/api\/admin\/signup-invite"/);
assert.match(css, /\.settings-family-invite-code/);
assert.match(applicationSource, /function isSecretImageViewerOpen\(\)/);
assert.match(applicationSource, /classList\.add\("no-comments-dialog", "secret-image-dialog"\)/);
assert.doesNotMatch(applicationSource, /classList\.add\("no-comments-dialog", "secret-image-dialog", "secret-image-fullscreen"\)/);
assert.match(applicationSource, /else if \(event\.target === els\.dialogImage\) \{\s*toggleDialogImageFullscreen\(\)/);
assert.match(applicationSource, /activeSecretDialogItem && !isSecretImageViewerOpen\(\)/);
assert.match(secretGalleryViewModule, /mobile \? \(image\.thumbnail_url \|\| image\.image_url\) : image\.image_url/);
assert.match(applicationSource, /function zoomImageViewerAt\(nextScale, clientX, clientY\)/);
assert.match(secretControllerModule, /return \{[\s\S]*toggleDiaryImageFullscreen/);
assert.match(applicationSource, /clampNumber\(Number\(zoom\.scale\) \|\| 1, 1, 6\)/);
assert.match(mediaGestureDomainModule, /export function clampNumber/);
assert.match(applicationSource, /secretViewerReturnFocus = options\.triggerElement \|\| document\.activeElement/);
assert.match(applicationSource, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/);
assert.match(secretGalleryViewModule, /timer = window\.setTimeout\(\(\) => \{/);
assert.match(secretGalleryViewModule, /event\.pointerType === "mouse" && event\.button !== 0/);
assert.match(secretGalleryViewModule, /Math\.hypot\(event\.clientX - start\.x, event\.clientY - start\.y\) > 10/);
assert.match(applicationSource, /activeSecretDialogItem && isMobileViewport\(\)/);
assert.doesNotMatch(applicationSource, /if \(isSecretImageViewerOpen\(\)\) \{\s*toggleDialogImageFullscreen\(\)/);
assert.match(css, /\.secret-album-view\.selection-active \.secret-album-toolbar \{[\s\S]*?position: fixed;[\s\S]*?top: 50%;[\s\S]*?right: 20px;/);
assert.match(css, /#photoDialog\.secret-image-dialog\.secret-image-fullscreen \.media-counter \{[\s\S]*?left: 50% !important;[\s\S]*?translateX\(-50%\)/);
assert.match(
  secretViewerCss,
  /secret-image-dialog\.secret-image-fullscreen \.media-counter \{[\s\S]*?position: fixed !important;[\s\S]*?right: auto !important;[\s\S]*?left: 50% !important;[\s\S]*?translateX\(-50%\)/
);
assert.match(secretViewerCss, /object-fit: contain !important/);
assert.match(secretViewerCss, /secret-image-dialog:not\(\.secret-image-fullscreen\)/);
assert.match(secretViewerCss, /dialog-media::after \{\s*content: none/);
assert.match(applicationSource, /els\.dialogExpandImage\?\.addEventListener\("click"/);
assert.match(applicationSource, /if \(!isFittableImageDialogOpen\(\)\) return/);
assert.match(photoDialogViewModule, /if \(!image\?\.naturalWidth \|\| !container\) return false/);
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
assert.match(photoDialogViewModule, /style\.setProperty\("width",[\s\S]*?"important"/);
assert.match(applicationSource, /class="secret-folder-dialog-error" role="alert" hidden/);
assert.match(applicationSource, /请先写一个收藏夹名称/);
assert.match(css, /Compact, explicit creation actions in the mobile secret library/);
assert.match(secretViewerCss, /touch-action: none/);
assert.match(secretViewerCss, /width: 100dvw !important/);
assert.match(serviceWorker, /secret-viewer\.css\?v=20260814-231/);
assert.match(serviceWorker, /weekend-board\.css\?v=20260823-241/);
assert.match(serviceWorker, /assets\/weekend-complete-stamp\.png/);
assert.match(serviceWorker, /diary-detail\.css\?v=20260823-019/);
assert.match(deployScript, /weekend-board\.css/);
assert.match(deployScript, /diary-detail\.css/);

assert.match(applicationSource, /createTrashItem\("photo"/);
assert.match(applicationSource, /createTrashItem\(\s*"secret"/);
assert.doesNotMatch(applicationSource, /<strong>加密自动备份<\/strong>/);
assert.match(applicationSource, /placement: "center"/);
assert.match(css, /\.mini-toast-host-center[\s\S]*?top: 50% !important/);
assert.match(css, /body\.mobile-diary-page-open \.topbar/);
assert.match(worker, /Only image files or video files are allowed/);
assert.match(pageHeaders, /media-src 'self' blob:/);
assert.match(worker, /configuredOrigins\.includes/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS trash_items/);
assert.match(applicationSource, /thumbnail_url/);
assert.match(applicationSource, /settings-account-overview/);
assert.match(css, /#settingsTools \.settings-tool-card/);
assert.match(worker, /createDailyBackup/);
assert.match(worker, /cleanupExpiredTrash/);
const scheduledBlock = worker.slice(worker.indexOf("async scheduled"), worker.indexOf("},\n};", worker.indexOf("async scheduled")));
assert.match(scheduledBlock, /createDailyBackup/);
assert.match(worker, /BACKUP_RETENTION_DAYS = 7/);
assert.match(applicationSource, /每日云端备份/);
assert.match(applicationSource, /backups\.slice\(0, 7\)/);
assert.match(applicationSource, /data-create-backup/);
assert.match(worker, /AES-GCM/);
assert.match(worker, /handleBackupDownload/);
assert.match(worker, /handleBackupRun/);
assert.match(applicationSource, /backfillLegacyThumbnails/);
assert.match(css, /body\.mobile-diary-page-open \.topbar \.main-nav/);
assert.match(serviceWorker, /!isSameOrigin && isImageRequest/);
assert.match(serviceWorker, /caches\.match\(request, \{ ignoreVary: true \}\)/);
assert.match(applicationSource, /shouldAutoCacheMedia/);
assert.match(applicationSource, /AUTO_DIARY_CACHE_ITEM_LIMIT = 20/);
assert.match(offlineCacheControllerModule, /collectDiaryUrls\(diaryItemLimit\)/);
assert.match(offlineCacheControllerModule, /explicit \? 40 : Number\.POSITIVE_INFINITY/);
assert.match(cacheManagementViewModule, /Wi-Fi 下自动保留最新 20 条日记/);
assert.match(offlineCacheControllerModule, /getFamilyMembers\(\)\.forEach\(\(member\) => urls\.push\(getProfileAvatarUrl\(member\)/);
assert.match(applicationSource, /downloadOfflinePool/);
assert.match(offlineCacheControllerModule, /Number\.POSITIVE_INFINITY/);
assert.match(mediaCacheModule, /await getCachedResponseBytes\(response\)/);
assert.match(worker, /secret_folders/);
assert.match(worker, /admin_update_photo_category/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS secret_folders/);
assert.match(schema, /folder_id TEXT REFERENCES secret_folders/);
assert.match(applicationSource, /initializePullToRefresh/);
assert.match(applicationSource, /adminUpdatePhotoCategory/);
assert.match(applicationSource, /openLevelGuidePage/);
assert.match(gamificationViewModule, /level-workspace/);
assert.match(applicationSource, /requestSecretFolderName/);
assert.match(applicationSource, /openSecretAlbumFolderDialog/);
assert.match(applicationSource, /moveSecretAlbumToFolder/);
assert.doesNotMatch(applicationSource, /function createDefaultAnniversaries/);
assert.equal(typeof anniversaryController.createAnniversaryController, "function");
assert.match(wishlistViewModule, /wish-card-details/);
assert.match(css, /Wishlist: compact shopping-cart rows/);
assert.match(applicationSource, /activePage === "gallery" && requestedPage !== "gallery"\) setUploadExpanded\(false\)/);
assert.match(applicationSource, /onOpen:[\s\S]*?renderGallery\(\);[\s\S]*?setUploadExpanded\(false\)/);
assert.match(applicationSource, /els\.galleryNav\.addEventListener[\s\S]*?setUploadExpanded\(false\)/);
assert.match(weekendBoardCss, /\.weekend-album-dialog/);
assert.match(weekendBoardCss, /\.weekend-album-grid/);
assert.match(weekendBoardCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(weekendBoardCss, /content: "查看全部"/);
assert.match(weekendGalleryModule, /dialog\.showModal\(\)/);
assert.match(weekendGalleryModule, /dataset\.weekendAlbumImage/);
assert.match(weekendGalleryModule, /dialog\.close\(\);[\s\S]*openGallery\(plan, index, kind\)/);
assert.match(applicationSource, /activeSecretFolderId = SECRET_ALL_FOLDER_ID/);
assert.match(applicationSource, /SECRET_FAVORITES_FOLDER_ID/);
assert.match(applicationSource, /function renderSecretFavoritesView\(\)/);
assert.match(applicationSource, /function deleteSecretFolder\(folder\)/);
assert.match(css, /\.secret-album-folder-dialog/);
assert.match(css, /transition: transform 200ms cubic-bezier\(\.2,\.76,\.18,1\)/);
assert.match(mobileDiaryViewModule, /data-mobile-diary-favorite/);
assert.match(mobileDiaryViewModule, /export function createMobileDiaryPage/);
assert.match(applicationSource, /handleRecipeCoverPaste/);
assert.match(applicationSource, /getClipboardImageUrl/);
assert.match(applicationSource, /getFamilyTimelineEntries/);
assert.match(applicationSource, /familyTimelineDialog/);
assert.match(applicationSource, /activeUploadTasks/);
assert.match(recipeControllerModule, /createTrashItem\(\s*"recipe"/);
assert.match(wishlistControllerModule, /createTrashItem\(\s*"wish"/);
assert.match(weekendControllerModule, /createTrashItem\(\s*"weekend"/);
assert.match(anniversaryControllerModule, /createTrashItem\(\s*"anniversary"/);
assert.match(gratitudeControllerModule, /createTrashItem\("gratitude"/);
assert.match(index, /id="removeUploadPreview"/);
assert.doesNotMatch(index, /id="recipeCoverUrlInput"/);
assert.match(applicationSource, /choosePhotoCategory/);
assert.match(applicationSource, /openAchievementDetail/);
assert.match(gamificationArchiveModule, /const extraBadgeSpecs = \[/);
const extraBadgeBlock = gamificationArchiveModule.slice(
  gamificationArchiveModule.indexOf("const extraBadgeSpecs = ["),
  gamificationArchiveModule.indexOf("badges.push(...extraBadgeSpecs")
);
assert.equal((extraBadgeBlock.match(/^\s+\["/gm) || []).length, 50);
assert.match(index, /id="diarySearchSuggestions"/);
assert.match(index, /id="secretSearchSuggestions"/);
assert.match(index, /id="secretFolderList"/);
assert.match(applicationSource, /enableWebPush/);
assert.match(notificationViewModule, /aggregateInteractionNotifications\(notifications\)\s*\.slice\(0, 15\)/);
assert.match(index, /id="weeklyReviewDialog"/);
assert.match(index, /data-tool-id="weekly"/);
assert.match(applicationSource, /loadWeeklyReview/);
assert.match(applicationSource, /if \(state\.photosLoadPromise\) return state\.photosLoadPromise/);
assert.match(css, /content-visibility:\s*auto/);
assert.match(index, /id="photoLinkInput"/);
assert.match(index, /id="recipeCoverLinkInput"/);
assert.match(index, /id="wishImageLinkInput"/);
assert.match(index, /id="weekendImageLinkInput"/);
assert.match(index, /id="secretImageLinkInput"/);
assert.match(wishlistControllerModule, /copyUrlToR2\(\s*linkUrl/);
assert.match(worker, /fetchAllowedImage/);
assert.match(worker, /contentType\.startsWith\("image\/"\)/);
assert.match(mediaMetadataModule, /composeWeekendStoredNote/);
assert.match(applicationSource, /openWeekendImageGallery/);
assert.match(index, /id="weekendImageInput"/);
assert.match(index, /id="weekendCompletionDialog"/);
assert.match(index, /id="weekendCompletionInput"[^>]+multiple/);
assert.equal(typeof weekendController.createWeekendController, "function");
assert.match(weekendControllerModule, /folder: "weekend-recap"/);
assert.match(css, /Desktop weekend cards follow the poster-like reference/);
assert.match(css, /\.weekend-complete-mark/);
assert.match(applicationSource, /ensurePushSettingsPage/);
assert.match(applicationSource, /syncExistingPushSubscription/);
assert.match(pushControllerModule, /SUBSCRIPTION_SYNC_INTERVAL/);
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
assert.match(applicationSource, /getUpcomingWeekendPlans/);
assert.match(applicationSource, /String\(photo\.user_id \|\| ""\) !== String\(state\.session\.user\.id\)/);
assert.match(diaryGalleryViewModule, /img\.feed-image, video\.feed-image, img\.secret-progressive-image/);
assert.match(css, /\.secret-album-photo\.media-loaded::before/);
assert.match(index, /id="secretPinDialog"/);
assert.match(applicationSource, /SECRET_UNLOCK_MAX_MS = 15 \* 60 \* 1000/);
assert.match(applicationSource, /function openSecretFolderContextMenu/);
assert.match(applicationSource, /function openSecretAlbumContextMenu/);
assert.match(applicationSource, /let secretDefaultFolderId = ""/);
assert.match(applicationSource, /secret_default_folder_id/);
assert.match(diaryGalleryViewModule, /data-admin-unpin-index/);
assert.match(applicationSource, /updateAdminUnpin/);
assert.match(worker, /secret_default_folder_id/);
assert.match(worker, /adminUnpinRequest/);
assert.match(secretPinControllerModule, /async function hashPin/);
assert.match(applicationSource, /requestedPage === "secret" && !skipSecretGate && !isSecretUnlocked\(\)/);
assert.match(css, /Secret archive PIN/);
assert.match(css, /Mobile secret PIN sheet/);
assert.match(index, /id="wishDialogFeedback"/);
assert.match(applicationSource, /wish-detail-dialog/);
assert.match(wishlistViewModule, /data-view-wish-detail/);
assert.match(css, /Completed wishes: readable feedback/);
assert.match(worker, /move_family_item_to_trash/);
assert.match(worker, /RECYCLABLE_FAMILY_ITEMS/);
assert.match(worker, /list_trash_items/);
assert.match(worker, /restore_trash_item/);
assert.match(worker, /permanently_delete_trash_item/);
assert.match(worker, /function normalizeRestoredPhotoComments\(/);
assert.match(worker, /insert into photo_comments/);
assert.match(wishlistControllerModule, /const deleteResult = await repository\.remove\("wishes", \{ id \}\)/);
assert.match(wishlistControllerModule, /数据库没有删除任何记录，请稍后重试/);
assert.match(worker, /existingPhotoIds = new Set/);
assert.match(worker, /activityRows = table === "photos" && action === "upsert"/);
assert.match(css, /Desktop diary detail: keep the image large while comments stay visible beside it/);
assert.match(css, /grid-template-columns: minmax\(0, 1fr\) var\(--diary-sidebar-width\)/);
assert.match(css, /\.photo-comments \{[\s\S]*?position: absolute/);
assert.match(wishlistControllerModule, /move_family_item_to_trash/);
assert.match(applicationSource, /rpc\("list_trash_items"/);
assert.match(applicationSource, /rpc\("restore_trash_item"/);
assert.match(applicationSource, /rpc\("permanently_delete_trash_item"/);
assert.match(applicationSource, /async function snapshotPhotoCommentsForTrash\(/);
assert.match(applicationSource, /const trashPayload = \{ \.\.\.photo, comments \}/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS push_subscriptions/);
assert.match(serviceWorker, /addEventListener\("push"/);
assert.match(serviceWorker, /notificationclick/);
assert.doesNotMatch(serviceWorker, /Promise\.allSettled\(\s*CORE_ASSETS/);
assert.match(serviceWorker, /event\.waitUntil\(network\.then/);
assert.match(pageHeaders, /X-Frame-Options:\s*DENY/);
assert.match(pageHeaders, /X-Content-Type-Options:\s*nosniff/);
assert.match(applicationSource, /from "\.\/modules\/confirm-dialog\.js"/);
assert.match(applicationSource, /from "\.\/modules\/offline-cache-controller\.js"/);
assert.match(offlineCacheControllerModule, /from "\.\/cache-policy\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?diary-domain\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?notification-domain\.js"/);
assert.match(applicationSource, /from "\.\/modules\/secret-domain\.js\?v=20260810-004"/);
assert.match(applicationSource, /from "\.\/modules\/cloudflare-client\.js\?v=20260811-010"/);
assert.match(worker, /SESSION_REFRESH_WINDOW_MS = 30 \* 86400 \* 1000/);
assert.match(worker, /update sessions set expires_at=\? where id=\?/);
assert.match(worker, /SESSION_DAYS = 3650/);
assert.match(worker, /delete from sessions where user_id=\? and token_hash<>\?/);
assert.match(worker, /delete from sessions where user_id=\?/);
assert.match(cloudflareClientModule, /SESSION_ROLLING_DAYS = 3650/);
assert.match(cloudflareClientModule, /delete activeSession\.offline_only/);
assert.match(applicationSource, /from "\.\/modules\/data-repositories\.js\?v=20260814-008"/);
assert.match(applicationSource, /from "\.\/modules\/media-cache\.js"/);
assert.match(applicationSource, /from "\.\/modules\/media-metadata\.js"/);
assert.match(applicationSource, /from "\.\/modules\/upload-queue\.js"/);
assert.match(applicationSource, /from "\.\/modules\/image-service\.js"/);
assert.match(gamificationControllerModule, /from "\.\/gamification-domain\.js\?v=20260810-003"/);
assert.match(gamificationControllerModule, /from "\.\/gamification-archive\.js"/);
assert.match(applicationSource, /from "\.\/modules\/preferences-store\.js"/);
assert.match(applicationSource, /from "\.\/modules\/household-repository\.js"/);
assert.match(applicationSource, /from "\.\/modules\/ui-formatters\.js"/);
assert.match(applicationSource, /from "\.\/modules\/app-lifecycle\.js"/);
assert.match(offlineCacheControllerModule, /from "\.\/offline-records\.js"/);
assert.doesNotMatch(applicationSource, /notificationPollTimer|lastForegroundSyncAt|syncAfterReturningToApp/);
["photos", "secret_items", "photo_comments", "notifications"].forEach((table) => {
  assert.doesNotMatch(applicationSource, new RegExp(`\\.from\\("${table}"\\)`));
});
assert.doesNotMatch(applicationSource, /cloudDb\s*\.from\(/);
assert.doesNotMatch(applicationSource, /\b(?:window\.)?confirm\s*\(/);
assert.match(confirmDialogModule, /export function confirmAction/);
assert.match(cachePolicyModule, /export function isClearlyUnmeteredConnection/);
assert.match(serviceWorker, /modules\/confirm-dialog\.js/);
assert.match(serviceWorker, /modules\/diary-domain\.js/);
assert.match(serviceWorker, /modules\/diary-upload-domain\.js/);
assert.match(serviceWorker, /modules\/diary-gallery-view\.js/);
assert.match(serviceWorker, /modules\/mobile-diary-view\.js/);
assert.match(serviceWorker, /modules\/media-gesture-domain\.js/);
assert.match(serviceWorker, /modules\/secret-gallery-view\.js/);
assert.match(serviceWorker, /modules\/account-view\.js/);
assert.match(serviceWorker, /modules\/photo-dialog-view\.js/);
assert.match(serviceWorker, /modules\/family-activity-view\.js/);
assert.match(serviceWorker, /modules\/cache-management-view\.js/);
assert.match(serviceWorker, /modules\/gamification-view\.js/);
assert.match(serviceWorker, /modules\/account-sync-domain\.js/);
assert.match(serviceWorker, /modules\/offline-cache-controller\.js/);
assert.match(serviceWorker, /modules\/app-elements\.js/);
assert.match(serviceWorker, /modules\/auth-controller\.js/);
assert.match(serviceWorker, /modules\/food-wheel-controller\.js/);
assert.match(serviceWorker, /modules\/push-controller\.js/);
assert.match(serviceWorker, /modules\/anniversary-controller\.js/);
assert.match(serviceWorker, /modules\/gratitude-controller\.js/);
assert.match(serviceWorker, /modules\/recipe-controller\.js/);
assert.match(serviceWorker, /modules\/food-wheel-view\.js/);
assert.match(serviceWorker, /modules\/gratitude-view\.js/);
assert.match(serviceWorker, /modules\/notification-domain\.js/);
assert.match(serviceWorker, /modules\/notification-view\.js/);
assert.match(serviceWorker, /modules\/photo-favorites\.js/);
assert.match(serviceWorker, /modules\/recipe-view\.js/);
assert.match(serviceWorker, /modules\/secret-domain\.js/);
assert.match(serviceWorker, /modules\/anniversary-view\.js/);
assert.match(serviceWorker, /modules\/vip-center\.js/);
assert.match(serviceWorker, /modules\/weekend-plans-view\.js/);
assert.match(serviceWorker, /modules\/wishlist-view\.js/);
assert.match(serviceWorker, /modules\/wishlist-controller\.js/);
assert.match(serviceWorker, /modules\/weekend-controller\.js/);
assert.match(applicationSource, /from "\.\/modules\/photo-favorites\.js"/);
assert.match(wishlistControllerModule, /from "\.\/wishlist-view\.js"/);
assert.match(diaryComposerControllerModule, /from "\.\/diary-upload-domain\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?food-wheel-view\.js"/);
assert.match(applicationSource, /from "\.\/modules\/recipe-controller\.js"/);
assert.match(applicationSource, /from "\.\/anniversary-controller\.js"|from "\.\/modules\/anniversary-controller\.js"/);
assert.match(applicationSource, /from "\.\/modules\/weekend-controller\.js(?:\?[^\"]+)?"/);
assert.match(applicationSource, /from "\.\/modules\/gratitude-controller\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?notification-view\.js"/);
assert.match(applicationSource, /from "\.\/modules\/vip-center\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?diary-gallery-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?mobile-diary-view\.js(?:\?[^\"]+)?"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?media-gesture-domain\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?secret-gallery-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?account-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?photo-dialog-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?family-activity-view\.js"/);
assert.match(applicationSource, /from "\.\/modules\/cache-management-view\.js"/);
assert.match(gamificationControllerModule, /from "\.\/gamification-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?account-sync-domain\.js"/);
assert.match(applicationSource, /from "\.\/modules\/app-elements\.js"/);
assert.equal(typeof appElements.collectAppElements, "function");
assert.equal(typeof foodWheelController.createFoodWheelController, "function");
assert.equal(typeof pushController.createPushController, "function");
assert.equal(typeof anniversaryController.createAnniversaryController, "function");
assert.equal(typeof gratitudeController.createGratitudeController, "function");
assert.equal(typeof recipeController.createRecipeController, "function");
assert.equal(typeof wishlistController.createWishlistController, "function");
assert.equal(typeof weekendController.createWeekendController, "function");
assert.equal(typeof authController.createAuthController, "function");
assert.equal(typeof offlineCacheController.createOfflineCacheController, "function");
assert.match(serviceWorker, /life-vlog-site-20260824-030-pwa/);
assert.match(serviceWorker, /styles\.css\?v=20260824-026/);
assert.match(serviceWorker, /redesign\.css\?v=20260824-027/);
assert.match(index, /id="photoInput"[^>]*accept="image\/\*,video\/\*/);
assert.match(index, /app\.js\?v=20260824-030/);
assert.match(serviceWorker, /modules\/vlog-mode\.js/);
assert.match(serviceWorker, /modules\/weekend-gallery\.js/);
assert.match(weekendGalleryModule, /weekend-album-lightbox-closed/);
assert.match(photoViewerControllerModule, /classList\.contains\("weekend-image-dialog"\)/);
assert.match(deployScript, /test-release\.ps1/);
assert.match(deployScript, /VerificationBaseUrl/);
assert.match(deployScript, /-BaseUrl \$VerificationBaseUrl/);
assert.match(releaseTestScript, /Import-Clixml/);
assert.match(releaseTestScript, /release-test-credential\.xml/);
assert.doesNotMatch(releaseTestScript, /RELEASE_TEST_DISPLAY_NAME/);
assert.match(serviceWorker, /modules\/diary-video-layout\.js/);
assert.match(
  applicationSource,
  /startDiaryMotionVideo\(els\.dialogVideo, els\.dialogMedia, \{[\s\S]*?audible: mediaType === "video",[\s\S]*?controlsOnTap: mediaType === "video" && isMobileViewport\(\)/,
);
assert.match(diaryVideoLayoutModule, /video\.onloadedmetadata = \(\) => fitVideoToContainer/);
assert.match(diaryDetailCss, /#dialogVideo:not\(\[hidden\]\)[\s\S]*?object-fit: contain !important/);
assert.match(
  pageHeaders,
  /img-src[^\n]*https:\/\/life-vlog-r2-upload\.xiudan320-life\.workers\.dev/,
);
assert.match(css, /photo-comment-author-line/);
assert.match(css, /mobile-diary-media :is\(img,video\)/);
assert.match(css, /mobile-diary-image-button > \.live-photo-badge[\s\S]*?bottom:auto/);
assert.match(css, /composer:not\(\.expanded\):not\(\[hidden\]\)[\s\S]*?display: contents/);
assert.match(css, /#uploadStatus:not\(:empty\)[\s\S]*?grid-column: 1 \/ -1[\s\S]*?grid-row: 2/);
assert.match(index, /id="diaryViewerToolbar"/);
assert.match(photoDialogViewModule, /export function updateDiaryViewerToolbar/);
assert.match(applicationSource, /function downloadCurrentDiaryImage/);
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
assert.match(worker, /const MAX_UPLOAD_BYTES = 100 \* 1024 \* 1024/);
assert.match(mediaMetadataModule, /export function composeDiaryStoredNote/);
assert.match(mediaMetadataModule, /motion_path/);
assert.match(uploadQueueModule, /export function createUploadQueue/);
assert.match(imageServiceModule, /export function createImageService/);
assert.match(imageServiceModule, /options\.fileName/);
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

const uploadStill = { name: "IMG_0001.HEIC", type: "image/heic", size: 10, lastModified: 1 };
const uploadMotion = { name: "IMG_0001.MOV", type: "video/quicktime", size: 20, lastModified: 2 };
const uploadVideo = { name: "weekend.mp4", type: "video/mp4", size: 30, lastModified: 3 };
const uploadUnsupported = { name: "notes.txt", type: "text/plain", size: 4, lastModified: 4 };
const uploadPairing = diaryUploadDomain.pairDiaryUploadFiles([
  uploadStill,
  uploadMotion,
  uploadVideo,
  uploadUnsupported,
]);
assert.equal(uploadPairing.entries.length, 1);
assert.equal(uploadPairing.entries[0].motionFile, uploadMotion);
assert.deepEqual(uploadPairing.videoFiles, [uploadVideo]);
assert.deepEqual(uploadPairing.unsupportedFiles, [uploadUnsupported]);
assert.equal(diaryUploadDomain.getDiaryUploadEntryCount(uploadPairing), 2);
assert.equal(diaryUploadDomain.getDiaryUploadFileExtension(uploadMotion), "mov");
assert.equal(diaryUploadDomain.isDiaryUploadStillFile(uploadStill), true);
assert.equal(diaryUploadDomain.isDiaryUploadMotionFile(uploadVideo), true);
const previewItems = diaryUploadDomain.getDiaryUploadPreviewItems(
  [uploadStill, uploadMotion, uploadVideo],
  ["https://example.com/photo.jpg"]
);
assert.deepEqual(previewItems.items.map((item) => item.kind), ["live", "video", "link"]);
const uploadPayload = diaryUploadDomain.createDiaryUploadPayload({
  id: "upload-1",
  createdAt: "2026-08-23T00:00:00.000Z",
  title: "周末",
  userId: "user-1",
  files: [uploadStill, uploadMotion],
});
assert.equal(uploadPayload.files[0].kind, "live");
assert.equal(uploadPayload.files[0].motionFile, uploadMotion);
assert.equal(uploadPayload.id, "upload-1");
assert.deepEqual(foodWheelView.normalizeFoodOptions([" 拉面 ", "拉面", "寿司"]), ["拉面", "寿司"]);
assert.deepEqual(
  foodWheelView.buildFoodWheelOptions(["拉面"], [{ name: "寿司" }, { name: "拉面" }]),
  ["拉面", "寿司"]
);
assert.match(recipeView.renderRecipeList(["<盐>"], "空"), /&lt;盐&gt;/);
assert.match(recipeView.renderRecipeCover({ name: "汤", coverImage: "" }), /recipe-cover placeholder/);
const togetherMetrics = anniversaryView.getAnniversaryMetrics(
  { type: "together", date: "2026-08-20" },
  new Date(2026, 7, 23)
);
assert.equal(togetherMetrics.value, 3);
assert.equal(togetherMetrics.unit, "天");
assert.deepEqual(
  weekendPlansView.sortWeekendPlans([
    { id: "done", done: true, date: "2026-08-20" },
    { id: "later", done: false, date: "2026-08-25" },
    { id: "first", done: false, date: "2026-08-24" },
  ]).map((plan) => plan.id),
  ["first", "later", "done"]
);
assert.equal(gratitudeView.normalizeGratitudeColor("#bad", new Set(["#good"])), "#2f6b3b");
assert.equal(notificationView.getUnreadNotificationCount([{ is_read: false }, { is_read: true }]), 1);
assert.equal(vipCenter.getVipLevelByRecharge(68).level, 3);
assert.equal(vipCenter.getVipLevel(5).limit, 18);
assert.equal(vipCenter.formatMoney(29.4), "¥29");
assert.deepEqual(
  diaryGalleryView.getDiaryGalleryEmptyState({
    filter: "favorites",
    signedIn: true,
    favoriteStatus: "loading",
  }),
  { message: "正在同步收藏…", loading: true }
);
assert.equal(diaryGalleryView.getPhotoAspectRatio({ width: 2000, height: 1000 }), "1.550");
assert.equal(
  diaryGalleryView.shouldAutoplayDiaryFeedMedia(4, { mobile: true, connection: null }),
  true
);
assert.equal(
  diaryGalleryView.shouldAutoplayDiaryFeedMedia(5, { mobile: true, connection: null }),
  false
);
assert.equal(
  diaryGalleryView.shouldAutoplayDiaryFeedMedia(0, {
    mobile: false,
    connection: { saveData: true },
  }),
  false
);
assert.match(
  diaryGalleryView.renderPhotoMedia(
    [{ image_url: "one.jpg" }, { image_url: "two.jpg" }],
    "相册",
    0,
    { mobile: false }
  ),
  /media-count[\s\S]*2 张/
);
const mobileCommentMarkup = mobileDiaryView.renderMobileDiaryCommentTree({
  comments: [{ id: "c1", user_id: "owner", body: "<你好>", created_at: "2026-08-23T00:00:00Z" }],
  photoOwnerId: "owner",
  currentUserId: "owner",
  getAuthorName: () => "作者",
  renderAvatar: () => "<i></i>",
});
assert.match(mobileCommentMarkup, /photo-comment-author-badge/);
assert.match(mobileCommentMarkup, /&lt;你好&gt;/);
assert.match(mobileCommentMarkup, /data-mobile-diary-delete-comment="c1"/);
assert.match(
  mobileDiaryView.buildMobileDiaryPageMarkup({
    photo: { id: "p1", user_id: "owner", title: "标题", note: "正文", created_at: "2026-08-23T00:00:00Z" },
    images: [{ image_url: "one.jpg" }],
    signedIn: true,
    currentUserId: "owner",
    canComment: true,
    favorite: true,
    getDisplayTitle: (photo) => photo.title,
    getPlainNote: (photo) => photo.note,
    getAuthorName: () => "作者",
    renderAvatar: () => "<i></i>",
  }),
  /data-mobile-diary-favorite[\s\S]*data-mobile-diary-comment-form/
);
const mobileVlogMarkup = mobileDiaryView.buildMobileDiaryPageMarkup({
  photo: { id: "v1", user_id: "owner", title: "有声 VLOG", category: "VLOG", created_at: "2026-08-24T00:00:00Z" },
  images: [{ type: "video", image_url: "poster.jpg", video_url: "vlog.mp4" }],
  getDisplayTitle: (photo) => photo.title,
  getPlainNote: () => "",
  getAuthorName: () => "作者",
  renderAvatar: () => "<i></i>",
});
assert.match(mobileVlogMarkup, /class="mobile-diary-video"[\s\S]*playsinline/);
assert.doesNotMatch(mobileVlogMarkup, /class="mobile-diary-video"[^>]*(?:autoplay|muted|loop|controls)/);
assert.doesNotMatch(mobileVlogMarkup, /live-photo-badge/);
const mobileLivePhotoMarkup = mobileDiaryView.buildMobileDiaryPageMarkup({
  photo: { id: "l1", user_id: "owner", title: "Live Photo", created_at: "2026-08-24T00:00:00Z" },
  images: [{ type: "live", image_url: "still.jpg", motion_url: "motion.mov" }],
  getDisplayTitle: (photo) => photo.title,
  getPlainNote: () => "",
  getAuthorName: () => "作者",
  renderAvatar: () => "<i></i>",
});
assert.match(mobileLivePhotoMarkup, /class="mobile-diary-motion"[^>]*autoplay muted loop/);
assert.match(mobileLivePhotoMarkup, /live-photo-badge/);
assert.equal(mediaMetadata.isDiaryLiveMedia({ type: "video", video_url: "vlog.mp4" }), false);
assert.equal(mediaMetadata.isDiaryLiveMedia({ type: "live", motion_url: "motion.mov" }), true);
assert.equal(mediaGestureDomain.clampNumber(8, 1, 6), 6);
assert.equal(
  mediaGestureDomain.getTouchDistance([
    { clientX: 0, clientY: 0 },
    { clientX: 3, clientY: 4 },
  ]),
  5
);
assert.deepEqual(
  mediaGestureDomain.getTouchCenter([
    { clientX: 0, clientY: 2 },
    { clientX: 4, clientY: 6 },
  ]),
  { x: 2, y: 4 }
);
assert.equal(mediaGestureDomain.getMobileBackEdge(2, { mobile: true, viewportWidth: 400 }), "left");
assert.equal(mediaGestureDomain.getMobileBackEdge(398, { mobile: true, viewportWidth: 400 }), "right");
assert.equal(mediaGestureDomain.getMobileBackEdge(200, { mobile: true, viewportWidth: 400 }), "");
const originalDateNow = Date.now;
Date.now = () => 1000;
assert.equal(
  mediaGestureDomain.isEdgeBackSwipe(
    { edge: "left", x: 0, y: 10, time: 100 },
    { clientX: 100, clientY: 20 }
  ),
  true
);
Date.now = originalDateNow;
assert.match(
  secretGalleryView.buildSecretFolderListMarkup({
    folders: [{ id: "all", name: "全部相册", count: 2, virtual: true, isAll: true }],
    activeFolderId: "all",
  }),
  /is-all[\s\S]*全部相册[\s\S]*2 个相册/
);
assert.match(
  secretGalleryView.buildSecretFavoritesMarkup([
    { item: { id: "a1", title: "旅行" }, image: { image_url: "photo.jpg", tags: ["夜景"] } },
  ]),
  /FAVORITES[\s\S]*旅行 · 夜景/
);
assert.match(
  secretGalleryView.buildSecretCollectionMarkup({
    activeFolderName: "旅行",
    activeFolder: { id: "f1" },
    visible: [{ id: "a1", title: "东京", images: [{ image_url: "photo.jpg" }] }],
  }),
  /旅行[\s\S]*1 个相册，1 件展品[\s\S]*data-secret-folder-rename[\s\S]*东京/
);
assert.match(
  secretGalleryView.buildSecretAlbumMarkup({
    item: { id: "a1", title: "东京" },
    images: [{ image_url: "photo.jpg", tags: ["夜景"] }],
    displayEntries: [{ image: { image_url: "photo.jpg", tags: ["夜景"] }, index: 0 }],
    selectionMode: true,
    selectedIndexes: new Set([0]),
    mobile: true,
  }),
  /已选 1 张[\s\S]*data-secret-set-cover[\s\S]*夜景/
);
assert.match(accountViewModule, /export function buildSettingsFamilyMarkup/);
assert.match(
  accountView.buildSettingsAccountOverviewMarkup({
    signedIn: true,
    displayName: "测试账号",
    username: "tester",
    avatarMarkup: "<i></i>",
  }),
  /测试账号[\s\S]*@tester[\s\S]*Cloudflare/
);
assert.match(
  accountView.buildSettingsFamilyMarkup({
    signedIn: true,
    familyInfo: { name: "测试家庭", isOwner: true },
    members: [{ user_id: "u1", username: "成员", role: "owner" }],
    currentUserId: "u1",
    invitations: [],
    renderAvatar: () => "<i></i>",
  }),
  /测试家庭[\s\S]*成员（我）[\s\S]*data-settings-signup-invite/
);
assert.match(
  photoDialogView.renderSecretDialogControls({ favorite: true, tags: ["夜景"] }),
  /已收藏[\s\S]*data-secret-dialog-remove-tag="夜景"/
);
assert.match(familyActivityViewModule, /export function buildWeeklyReviewMarkup/);
assert.match(
  familyActivityView.buildWeeklyReviewMarkup({
    summary: "本周很好",
    photoCount: 2,
    interactionCount: 3,
    completedWishCount: 1,
    weekendCount: 1,
    activity: [{ type: "日记", title: "散步", userId: "u1", date: "2026-08-23T00:00:00Z", photoId: "p1" }],
    getAuthorName: () => "成员",
  }),
  /本周很好[\s\S]*2[\s\S]*3[\s\S]*data-weekly-photo="p1"[\s\S]*散步/
);
assert.match(gamificationViewModule, /export function buildLevelWorkspaceMarkup/);
assert.equal(
  gamificationView.getAchievementConditionText({
    unlocked: false,
    detail: "发布 5 篇日记",
    current: 2,
    target: 5,
  }),
  "达成条件：发布 5 篇日记。当前 2 / 5，还差 3。"
);
assert.match(
  gamificationView.buildLevelWorkspaceMarkup({
    sections: [{ id: "ranking", label: "家庭排行", icon: "榜" }],
    activeSection: "ranking",
    content: "排行内容",
  }),
  /level-workspace[\s\S]*active[\s\S]*家庭排行[\s\S]*排行内容/
);
assert.equal(
  accountSyncDomain.resolvePreferredDisplayName({
    loginName: "login",
    sessionDisplayName: "昵称",
    profileDisplayName: "login",
  }),
  "昵称"
);
assert.deepEqual(
  accountSyncDomain.mergeLoginState({
    cloudDate: "2026-08-20",
    cloudStreak: 2,
    localDate: "2026-08-21",
    localStreak: 5,
    today: "2026-08-23",
  }),
  { lastLoginDate: "2026-08-21", loginStreak: 5 }
);

const favoriteWrites = [];
const favoriteStore = photoFavoritesDomain.createPhotoFavoritesStore({
  repository: {
    async listFavorites() {
      return { data: [{ photo_id: "photo-1" }, { photo_id: " photo-2 " }, { photo_id: "" }], error: null };
    },
    async setFavorite(photoId, favorite) {
      favoriteWrites.push([photoId, favorite]);
      return photoId === "broken" ? { error: new Error("offline") } : { error: null };
    },
  },
  logger: { warn() {} },
});
favoriteStore.reset("loading");
assert.equal(favoriteStore.status, "loading");
await favoriteStore.synchronize();
assert.deepEqual(favoriteStore.sortedIds(), ["photo-1", "photo-2"]);
assert.equal(favoriteStore.cloudAvailable, true);
assert.equal(favoriteStore.has({ id: "photo-1" }), true);
assert.deepEqual(await favoriteStore.toggle("photo-1"), { favorite: false, error: null });
assert.equal(favoriteStore.has("photo-1"), false);
assert.deepEqual(await favoriteStore.toggle("photo-3"), { favorite: true, error: null });
assert.equal(favoriteStore.has("photo-3"), true);
const failedFavorite = await favoriteStore.toggle("broken");
assert.equal(failedFavorite.error.message, "offline");
assert.equal(favoriteStore.status, "error");
assert.equal(favoriteStore.cloudAvailable, false);
assert.deepEqual(favoriteWrites, [
  ["photo-1", false],
  ["photo-3", true],
  ["broken", true],
]);
const wishlistState = wishlistView.buildWishlistView([
  { id: "normal", done: false, priority: "普通", date: "2026-08-24", createdAt: "2026-08-20" },
  { id: "soon", done: false, priority: "想尽快", date: "2026-08-25", createdAt: "2026-08-21" },
  { id: "must", done: false, priority: "一定要做", date: "2026-09-01", createdAt: "2026-08-22" },
  { id: "done", done: true, priority: "普通", createdAt: "2026-08-23" },
]);
assert.equal(wishlistState.openCount, 3);
assert.equal(wishlistState.doneCount, 1);
assert.deepEqual(wishlistState.visibleWishes.map((wish) => wish.id), ["must", "soon", "normal"]);
assert.equal(wishlistView.buildWishlistView([], "done").emptyMessage, "已完成里还没有记录。完成心愿后会放到这里。");
assert.match(wishlistView.formatWishDate("2026-08-23"), /2026/);
assert.doesNotThrow(() => JSON.parse(manifestText));

console.log("Smoke checks passed.");
