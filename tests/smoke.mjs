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
assert.match(index, /redesign\.css\?v=20260823-020/);
assert.match(index, /styles\.css\?v=20260823-025/);
assert.match(index, /id="adminStorageMeter"/);
assert.match(index, /R2 对象存储/);
assert.match(index, /id="adminStorageMonth"/);
assert.doesNotMatch(index, /D1 数据库/);
assert.match(index, /id="dialogVideo"[^>]*autoplay[^>]*muted[^>]*loop/);
assert.match(index, /secret-viewer\.css\?v=20260814-231/);
assert.match(index, /secret-create-folder-label">新建文件夹/);
assert.match(app, /function fitSecretViewerImage\(\)/);
assert.match(diaryVideoLayoutModule, /export function startDiaryMotionVideo\(video, container\)/);
assert.match(mobileDiaryViewModule, /mobile-diary-motion/);
assert.match(diaryGalleryViewModule, /videoPreviewStyle[\s\S]*object-fit:contain;background:#080b09/);
assert.match(app, /dialogImage\.style\.display = hasMotion/);
assert.match(app, /dialogVideo\.style\.display = hasMotion/);
assert.match(app, /dialogVideo\.controls = !isMobileViewport\(\)/);
assert.doesNotMatch(index, /id="dialogVideo"[^>]*controls/);
assert.match(index, /option value="pet">宠物生日</);
assert.equal(anniversaryView.getAnniversaryTypeLabel("pet"), "宠物生日");
assert.match(app, /life-vlog-diary-image-cache/);
assert.match(serviceWorker, /life-vlog-diary-image-cache/);
assert.match(mediaCacheModule, /startsWith\("video\/"\)/);
assert.match(app, /Live Photo 上传失败：[\s\S]*throw error/);
assert.match(app, /普通视频上传失败：[\s\S]*throw error/);
assert.match(index, /id="photoInput"[^>]*accept="image\/\*/);
assert.match(index, /id="photoMotionInput"[^>]*accept="video\/\*/);
assert.match(imageServiceModule, /export async function createVideoPosterFile\(file\)/);
assert.match(app, /LIVE_PHOTO_MOTION_NOT_PROVIDED_BY_BROWSER/);
assert.match(diaryGalleryViewModule, /export function shouldAutoplayDiaryFeedMedia/);
assert.match(diaryGalleryViewModule, /if \(mobile\) return photoIndex < 5/);
assert.match(mobileDiaryViewModule, /export function buildMobileDiaryPageMarkup/);
assert.match(app, /els\.dialog\.className = "no-comments-dialog mobile-diary-image-viewer"/);
assert.doesNotMatch(app, /isDiaryLiveMedia\(thumb\) \? '<span class="live-photo-badge">LIVE<\/span>'/);
assert.match(diaryGalleryViewModule, /multi-motion-dot/);
assert.match(app, /await verifyPhotoFlagSchema\(\)/);
assert.match(app, /refreshAdminStorage/);
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
assert.match(app, /category: vlogMode\.isActive\(\) \? "VLOG"/);
const initializeCloudflareIndex = app.indexOf("async function initializeCloudflare()");
const authListenerIndex = app.indexOf("cloudDb.auth.onAuthStateChange", initializeCloudflareIndex);
const initialPhotoLoadIndex = app.indexOf("await loadPhotos()", initializeCloudflareIndex);
assert.ok(initializeCloudflareIndex >= 0, "Cloudflare initialization is missing");
assert.ok(authListenerIndex > initializeCloudflareIndex, "Auth listener is missing from initialization");
assert.ok(authListenerIndex < initialPhotoLoadIndex, "Auth listener must be registered before initial photo loading");
assert.match(serviceWorker, /life-vlog-site-20260823-025-pwa/);
assert.match(serviceWorker, /modules\/admin-storage\.js/);
assert.match(diaryDetailCss, /#photoDialog #dialogImage\[hidden\][\s\S]*?display: none !important/);
assert.match(app, /const p=!galleryRenderSignature[\s\S]*?initialRender: p/);
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
assert.match(app, /type: "video"/);
assert.match(app, /video_url: video.url/);
assert.match(diaryUploadDomainModule, /unpairedEntries\.slice\(0, remainingMotionFiles\.length\)/);
assert.match(worker, /fileType\.startsWith\("video\/"\)/);
assert.match(worker, /upsertRows\(env, table, sanitizedRows, config\.columns, conflict\)/);
assert.match(mobileDiaryViewModule, /photo-comment-author-badge/);
assert.match(mobileDiaryViewModule, /共 \$\{comments\.length\} 条评论/);
assert.match(app, /const AVATAR_CACHE_KEY = "life-vlog-avatar-cache"/);
assert.match(app, /function getProfileAvatarUrl\(profile = \{\}\)/);
assert.match(app, /getProfileAvatarUrl\(member\)/);
assert.match(app, /getProfileAvatarUrl\(accountProfile\)/);
assert.match(app, /function renderExperienceRulesPanel\(experience\)/);
assert.match(app, /profileUpdates\.login_streak = loginStreak/);
assert.match(app, /loadCachedAvatarUrl\(member\.user_id\)/);
assert.match(worker, /actor_avatar_path/);
assert.match(worker, /user_profiles\.avatar_path/);
assert.match(app, /data-settings-signup-invite/);
assert.match(app, /\/api\/admin\/signup-invite/);
assert.match(worker, /async function handleSignupInviteRead\(/);
assert.match(worker, /Only the family owner can read the signup invite/);
assert.match(worker, /url\.pathname === "\/api\/admin\/signup-invite"/);
assert.match(css, /\.settings-family-invite-code/);
assert.match(app, /function isSecretImageViewerOpen\(\)/);
assert.match(app, /classList\.add\("no-comments-dialog", "secret-image-dialog"\)/);
assert.doesNotMatch(app, /classList\.add\("no-comments-dialog", "secret-image-dialog", "secret-image-fullscreen"\)/);
assert.match(app, /else if \(event\.target === els\.dialogImage\) \{\s*toggleDialogImageFullscreen\(\)/);
assert.match(app, /activeSecretDialogItem && !isSecretImageViewerOpen\(\)/);
assert.match(secretGalleryViewModule, /mobile \? \(image\.thumbnail_url \|\| image\.image_url\) : image\.image_url/);
assert.match(app, /function zoomImageViewerAt\(nextScale, clientX, clientY\)/);
assert.match(app, /clampNumber\(Number\(zoom\.scale\) \|\| 1, 1, 6\)/);
assert.match(mediaGestureDomainModule, /export function clampNumber/);
assert.match(app, /secretViewerReturnFocus = options\.triggerElement \|\| document\.activeElement/);
assert.match(app, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/);
assert.match(secretGalleryViewModule, /timer = window\.setTimeout\(\(\) => \{/);
assert.match(secretGalleryViewModule, /event\.pointerType === "mouse" && event\.button !== 0/);
assert.match(secretGalleryViewModule, /Math\.hypot\(event\.clientX - start\.x, event\.clientY - start\.y\) > 10/);
assert.match(app, /activeSecretDialogItem && isMobileViewport\(\)/);
assert.doesNotMatch(app, /if \(isSecretImageViewerOpen\(\)\) \{\s*toggleDialogImageFullscreen\(\)/);
assert.match(css, /\.secret-album-view\.selection-active \.secret-album-toolbar \{[\s\S]*?position: fixed;[\s\S]*?top: 50%;[\s\S]*?right: 20px;/);
assert.match(css, /#photoDialog\.secret-image-dialog\.secret-image-fullscreen \.media-counter \{[\s\S]*?left: 50% !important;[\s\S]*?translateX\(-50%\)/);
assert.match(
  secretViewerCss,
  /secret-image-dialog\.secret-image-fullscreen \.media-counter \{[\s\S]*?position: fixed !important;[\s\S]*?right: auto !important;[\s\S]*?left: 50% !important;[\s\S]*?translateX\(-50%\)/
);
assert.match(secretViewerCss, /object-fit: contain !important/);
assert.match(secretViewerCss, /secret-image-dialog:not\(\.secret-image-fullscreen\)/);
assert.match(secretViewerCss, /dialog-media::after \{\s*content: none/);
assert.match(app, /els\.dialogExpandImage\?\.addEventListener\("click"/);
assert.match(app, /if \(!isFittableImageDialogOpen\(\)\) return/);
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
assert.match(app, /class="secret-folder-dialog-error" role="alert" hidden/);
assert.match(app, /请先写一个收藏夹名称/);
assert.match(css, /Compact, explicit creation actions in the mobile secret library/);
assert.match(secretViewerCss, /touch-action: none/);
assert.match(secretViewerCss, /width: 100dvw !important/);
assert.match(serviceWorker, /secret-viewer\.css\?v=20260814-231/);
assert.match(serviceWorker, /weekend-board\.css\?v=20260823-241/);
assert.match(serviceWorker, /assets\/weekend-complete-stamp\.png/);
assert.match(serviceWorker, /diary-detail\.css\?v=20260823-019/);
assert.match(deployScript, /weekend-board\.css/);
assert.match(deployScript, /diary-detail\.css/);

assert.match(app, /createTrashItem\("photo"/);
assert.match(app, /createTrashItem\(\s*"secret"/);
assert.doesNotMatch(app, /<strong>加密自动备份<\/strong>/);
assert.match(app, /placement: "center"/);
assert.match(css, /\.mini-toast-host-center[\s\S]*?top: 50% !important/);
assert.match(css, /body\.mobile-diary-page-open \.topbar/);
assert.match(worker, /Only image files or video files are allowed/);
assert.match(pageHeaders, /media-src 'self' blob:/);
assert.match(worker, /configuredOrigins\.includes/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS trash_items/);
assert.match(app, /thumbnail_url/);
assert.match(app, /settings-account-overview/);
assert.match(css, /#settingsTools \.settings-tool-card/);
assert.match(worker, /createDailyBackup/);
assert.match(worker, /cleanupExpiredTrash/);
const scheduledBlock = worker.slice(worker.indexOf("async scheduled"), worker.indexOf("},\n};", worker.indexOf("async scheduled")));
assert.match(scheduledBlock, /createDailyBackup/);
assert.match(worker, /BACKUP_RETENTION_DAYS = 7/);
assert.match(app, /每日云端备份/);
assert.match(app, /backups\.slice\(0, 7\)/);
assert.match(app, /data-create-backup/);
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
assert.match(cacheManagementViewModule, /Wi-Fi 下自动保留最新 20 条日记/);
assert.match(app, /familyMemberMap\.forEach\(\(member\) => urls\.push\(getProfileAvatarUrl\(member\)/);
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
assert.match(gamificationViewModule, /level-workspace/);
assert.match(app, /requestSecretFolderName/);
assert.match(app, /openSecretAlbumFolderDialog/);
assert.match(app, /moveSecretAlbumToFolder/);
assert.doesNotMatch(app, /function createDefaultAnniversaries/);
assert.match(app, /const userId = session\?\.user\?\.id \|\| "guest"/);
assert.match(app, /anniversaries = cloudMapped;/);
assert.match(wishlistViewModule, /wish-card-details/);
assert.match(css, /Wishlist: compact shopping-cart rows/);
assert.match(app, /activePage === "gallery" && requestedPage !== "gallery"\) setUploadExpanded\(false\)/);
assert.match(app, /onOpen:[\s\S]*?renderGallery\(\);[\s\S]*?setUploadExpanded\(false\)/);
assert.match(app, /els\.galleryNav\.addEventListener[\s\S]*?setUploadExpanded\(false\)/);
assert.match(weekendBoardCss, /\.weekend-album-dialog/);
assert.match(weekendBoardCss, /\.weekend-album-grid/);
assert.match(weekendBoardCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(weekendBoardCss, /content: "查看全部"/);
assert.match(weekendGalleryModule, /dialog\.showModal\(\)/);
assert.match(weekendGalleryModule, /dataset\.weekendAlbumImage/);
assert.match(weekendGalleryModule, /dialog\.close\(\);[\s\S]*openGallery\(plan, index, kind\)/);
assert.match(app, /activeSecretFolderId = SECRET_ALL_FOLDER_ID/);
assert.match(app, /SECRET_FAVORITES_FOLDER_ID/);
assert.match(app, /function renderSecretFavoritesView\(\)/);
assert.match(app, /function deleteSecretFolder\(folder\)/);
assert.match(css, /\.secret-album-folder-dialog/);
assert.match(css, /transition: transform 200ms cubic-bezier\(\.2,\.76,\.18,1\)/);
assert.match(mobileDiaryViewModule, /data-mobile-diary-favorite/);
assert.match(mobileDiaryViewModule, /export function createMobileDiaryPage/);
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
assert.match(notificationViewModule, /aggregateInteractionNotifications\(notifications\)\s*\.slice\(0, 15\)/);
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
assert.match(diaryGalleryViewModule, /img\.feed-image, video\.feed-image, img\.secret-progressive-image/);
assert.match(css, /\.secret-album-photo\.media-loaded::before/);
assert.match(index, /id="secretPinDialog"/);
assert.match(app, /SECRET_UNLOCK_MAX_MS = 15 \* 60 \* 1000/);
assert.match(app, /function openSecretFolderContextMenu/);
assert.match(app, /function openSecretAlbumContextMenu/);
assert.match(app, /let secretDefaultFolderId = ""/);
assert.match(app, /secret_default_folder_id/);
assert.match(diaryGalleryViewModule, /data-admin-unpin-index/);
assert.match(app, /updateAdminUnpin/);
assert.match(worker, /secret_default_folder_id/);
assert.match(worker, /adminUnpinRequest/);
assert.match(app, /async function hashSecretPin/);
assert.match(app, /requestedPage === "secret" && !skipSecretGate && !isSecretUnlocked\(\)/);
assert.match(css, /Secret archive PIN/);
assert.match(css, /Mobile secret PIN sheet/);
assert.match(index, /id="wishDialogFeedback"/);
assert.match(app, /wish-detail-dialog/);
assert.match(wishlistViewModule, /data-view-wish-detail/);
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
assert.match(app, /from "\.\/modules\/data-repositories\.js\?v=20260814-008"/);
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
assert.match(app, /from "\.\/modules\/photo-favorites\.js"/);
assert.match(app, /from "\.\/modules\/wishlist-view\.js"/);
assert.match(app, /from "\.\/modules\/diary-upload-domain\.js"/);
assert.match(app, /from "\.\/modules\/food-wheel-view\.js"/);
assert.match(app, /from "\.\/modules\/recipe-view\.js"/);
assert.match(app, /from "\.\/modules\/anniversary-view\.js"/);
assert.match(app, /from "\.\/modules\/weekend-plans-view\.js"/);
assert.match(app, /from "\.\/modules\/gratitude-view\.js"/);
assert.match(app, /from "\.\/modules\/notification-view\.js"/);
assert.match(app, /from "\.\/modules\/vip-center\.js"/);
assert.match(app, /from "\.\/modules\/diary-gallery-view\.js"/);
assert.match(app, /from "\.\/modules\/mobile-diary-view\.js"/);
assert.match(app, /from "\.\/modules\/media-gesture-domain\.js"/);
assert.match(app, /from "\.\/modules\/secret-gallery-view\.js"/);
assert.match(app, /from "\.\/modules\/account-view\.js"/);
assert.match(app, /from "\.\/modules\/photo-dialog-view\.js"/);
assert.match(app, /from "\.\/modules\/family-activity-view\.js"/);
assert.match(app, /from "\.\/modules\/cache-management-view\.js"/);
assert.match(app, /from "\.\/modules\/gamification-view\.js"/);
assert.match(app, /from "\.\/modules\/account-sync-domain\.js"/);
assert.match(serviceWorker, /life-vlog-site-20260823-025-pwa/);
assert.match(serviceWorker, /styles\.css\?v=20260823-025/);
assert.match(serviceWorker, /redesign\.css\?v=20260823-020/);
assert.match(index, /id="photoInput"[^>]*accept="image\/\*,video\/\*/);
assert.match(index, /app\.js\?v=20260823-025/);
assert.match(serviceWorker, /modules\/vlog-mode\.js/);
assert.match(serviceWorker, /modules\/weekend-gallery\.js/);
assert.match(deployScript, /test-release\.ps1/);
assert.match(deployScript, /VerificationBaseUrl/);
assert.match(deployScript, /-BaseUrl \$VerificationBaseUrl/);
assert.match(releaseTestScript, /Import-Clixml/);
assert.match(releaseTestScript, /release-test-credential\.xml/);
assert.doesNotMatch(releaseTestScript, /RELEASE_TEST_DISPLAY_NAME/);
assert.match(serviceWorker, /modules\/diary-video-layout\.js/);
assert.match(app, /startDiaryMotionVideo\(els\.dialogVideo, els\.dialogMedia\)/);
assert.match(diaryVideoLayoutModule, /video\.onloadedmetadata = \(\) => fitVideoToContainer/);
assert.match(diaryDetailCss, /#dialogVideo:not\(\[hidden\]\)[\s\S]*?object-fit: contain !important/);
assert.match(
  pageHeaders,
  /img-src[^\n]*https:\/\/life-vlog-r2-upload\.xiudan320-life\.workers\.dev/,
);
assert.match(css, /photo-comment-author-line/);
assert.match(css, /mobile-diary-media :is\(img,video\)/);
assert.match(css, /mobile-diary-image-button > \.live-photo-badge[\s\S]*?bottom:auto/);
assert.match(index, /id="diaryViewerToolbar"/);
assert.match(photoDialogViewModule, /export function updateDiaryViewerToolbar/);
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
