import assert from "node:assert/strict";
import {
  redesignStyleUrls,
  app,
  redesignStyles,
  styles,
  worker,
  schema,
  index,
  manifestText,
  css,
  serviceWorker,
  diaryDetailCss,
  weekendBoardCss,
  weekendGalleryModule,
  wishlistViewModule,
  wishlistDomainModule,
  wishlistInteractionsModule,
  shoppingViewModule,
  shoppingDomainModule,
  shoppingInteractionsModule,
  shoppingController,
  shoppingControllerModule,
  wishlistHubController,
  diaryUploadDomainModule,
  notificationViewModule,
  diaryGalleryViewModule,
  mobileDiaryViewModule,
  mediaGestureDomainModule,
  secretGalleryViewModule,
  accountViewModule,
  photoDialogViewModule,
  familyActivityViewModule,
  cacheManagementViewModule,
  gamificationViewModule,
  accountSyncDomain,
  appElements,
  foodWheelController,
  pushController,
  anniversaryController,
  gratitudeController,
  recipeController,
  recipeControllerModule,
  anniversaryControllerModule,
  gratitudeControllerModule,
  pushControllerModule,
  wishlistController,
  wishlistControllerModule,
  weekendController,
  weekendControllerModule,
  authController,
  offlineCacheController,
  offlineCacheControllerModule,
  offlineSettingsController,
  offlineSettingsControllerModule,
  dataSafetyController,
  dataSafetyControllerModule,
  accountSyncController,
  accountSyncControllerModule,
  trashController,
  trashControllerModule,
  diaryFeedController,
  diaryFeedControllerModule,
  socialController,
  socialControllerModule,
  familySettingsController,
  familySettingsControllerModule,
  familyActivityController,
  familyActivityControllerModule,
  toolDockController,
  toolDockControllerModule,
  layoutSettingsController,
  layoutSettingsControllerModule,
  appEventBindings,
  appEventBindingsModule,
  contentFormEventBindingsModule,
  mediaEventBindingsModule,
  settingsEventBindingsModule,
  appNavigationControllerModule,
  appIdentityControllerModule,
  appSessionControllerModule,
  householdBrandingControllerModule,
  diaryMetadataModule,
  assetController,
  assetControllerModule,
  diaryComposerController,
  diaryComposerControllerModule,
  gamificationController,
  gamificationControllerModule,
  profilePreferencesController,
  profilePreferencesControllerModule,
  secretController,
  secretControllerModule,
  secretComposerControllerModule,
  secretAlbumActionsControllerModule,
  secretFolderControllerModule,
  secretFilterDomainModule,
  secretPinController,
  secretPinControllerModule,
  photoViewerController,
  photoViewerControllerModule,
  photoDetailController,
  photoDetailControllerModule,
  photoEditorControllerModule,
  mobileDiaryControllerModule,
  applicationSource,
  deployScript,
  releaseTestScript,
  secretViewerCss,
  appLifecycle,
  pageHeaders,
  confirmDialogModule,
  cachePolicyModule,
  cachePolicy,
  diaryDomain,
  notificationDomain,
  photoFavoritesDomain,
  wishlistView,
  wishlistDomain,
  diaryUploadDomain,
  foodWheelView,
  recipeView,
  anniversaryView,
  weekendPlansView,
  gratitudeView,
  notificationView,
  vipCenter,
  diaryGalleryView,
  mobileDiaryView,
  mobilePageShellCss,
  mediaGestureDomain,
  secretGalleryView,
  accountView,
  photoDialogView,
  familyActivityView,
  gamificationView,
  secretDomain,
  diaryDomainModule,
  notificationDomainModule,
  secretDomainModule,
  cloudflareClientModule,
  repositoryModule,
  wardrobeModule,
  wardrobeCss,
  mediaCacheModule,
  vlogModeModule,
  diaryVideoLayoutModule,
  mediaCache,
  mediaMetadataModule,
  adminStorageModule,
  mediaMetadata,
  uploadQueueModule,
  imageServiceModule,
  gamificationDomain,
  gamificationArchiveModule,
  preferencesStoreModule,
  householdRepositoryModule,
  uiFormatters,
  offlineRecords,
  expandedTrashMigration,
} from "./smoke-fixture.mjs";

assert.match(index, /id="secretViewerToolbar"/);
assert.match(index, /id="dialogExpandImage"/);
assert.match(index, /styles\/redesign-foundation\.css\?v=20260826-036/);
assert.match(index, /styles\/redesign-components\.css\?v=20260826-002/);
assert.match(index, /styles\/media-upload\.css\?v=20260825-035/);
assert.match(index, /styles\.css\?v=20260826-027/);
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
assert.match(mobileDiaryControllerModule, /startDiaryMotionVideo\(vlogVideo, null, \{ audible: true, controlsOnTap: true \}\)/);
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
const initializeCloudflareIndex = appSessionControllerModule.indexOf("async function initialize()");
const authListenerIndex = appSessionControllerModule.indexOf("state.cloudDb.auth.onAuthStateChange", initializeCloudflareIndex);
const initialPhotoLoadIndex = appSessionControllerModule.indexOf("await actions.loadPhotos()", initializeCloudflareIndex);
assert.ok(initializeCloudflareIndex >= 0, "Session initialization is missing");
assert.ok(authListenerIndex > initializeCloudflareIndex, "Auth listener is missing from session initialization");
assert.ok(authListenerIndex < initialPhotoLoadIndex, "Auth listener must be registered before initial photo loading");
assert.match(serviceWorker, /life-vlog-site-20260826-016-pwa/);
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
assert.match(appIdentityControllerModule, /getProfileAvatarUrl\(state\.accountProfile\)/);
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
assert.match(serviceWorker, /weekend-board\.css\?v=20260826-042/);
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
assert.match(css, /Life Vlog lists: shared wishlist \/ buy-list shell/);
assert.match(
  appNavigationControllerModule,
  /state\.activePage === "gallery" && requestedPage !== "gallery"[\s\S]*?actions\.setUploadExpanded\(false\)/
);
assert.match(applicationSource, /onOpen:[\s\S]*?renderGallery\(\);[\s\S]*?setUploadExpanded\(false\)/);
assert.match(applicationSource, /els\.galleryNav\.addEventListener[\s\S]*?setUploadExpanded\(false\)/);
assert.match(weekendBoardCss, /\.weekend-album-dialog/);
assert.match(weekendBoardCss, /\.weekend-album-grid/);
assert.match(weekendBoardCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(weekendBoardCss, /content: "查看全部"/);
assert.doesNotMatch(css, /\.weekend-/, "weekend styles must stay isolated in weekend-board.css");
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
assert.match(weekendBoardCss, /Desktop weekend cards follow the poster-like reference/);
assert.match(weekendBoardCss, /\.weekend-complete-mark/);
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
assert.match(
  appNavigationControllerModule,
  /requestedPage === "secret" && !skipSecretGate && !actions\.isSecretUnlocked\(\)/
);
assert.match(css, /Secret archive PIN/);
assert.match(css, /Mobile secret PIN sheet/);
assert.match(index, /id="wishDialogFeedback"/);
assert.match(applicationSource, /wish-detail-dialog/);
assert.match(wishlistViewModule, /data-view-wish-detail/);
assert.match(css, /\.wish-card\.completed[\s\S]*?opacity: 1/);
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
assert.match(applicationSource, /from "\.\/modules\/secret-domain\.js\?v=20260826-005"/);
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
assert.match(serviceWorker, /modules\/app-domain\.js/);
assert.match(serviceWorker, /modules\/app-feedback-view\.js/);
assert.match(serviceWorker, /modules\/app-identity-controller\.js/);
assert.match(serviceWorker, /modules\/app-navigation-controller\.js/);
assert.match(serviceWorker, /modules\/app-session-controller\.js/);
assert.match(serviceWorker, /modules\/diary-metadata\.js/);
assert.match(serviceWorker, /modules\/household-branding-controller\.js/);
assert.match(serviceWorker, /modules\/secret-entry-preference-controller\.js/);
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
assert.match(applicationSource, /from "\.\/(?:modules\/)?vip-center\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?diary-gallery-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?mobile-diary-view\.js(?:\?[^\"]+)?"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?media-gesture-domain\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?secret-gallery-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?account-view\.js"/);
assert.match(applicationSource, /from "\.\/(?:modules\/)?photo-dialog-view\.js(?:\?[^\"]+)?"/);
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
assert.match(serviceWorker, /life-vlog-site-20260826-016-pwa/);
assert.match(serviceWorker, /styles\.css\?v=20260826-027/);
assert.match(serviceWorker, /styles\/redesign-foundation\.css\?v=20260826-036/);
assert.match(serviceWorker, /styles\/redesign-components\.css\?v=20260826-002/);
assert.match(serviceWorker, /styles\/media-upload\.css\?v=20260825-035/);
assert.match(css, /mobile-diary-media > \.mobile-diary-media-badge[\s\S]*?bottom: auto[\s\S]*?width: max-content/);
assert.match(index, /id="photoInput"[^>]*accept="image\/\*,video\/\*/);
assert.match(index, /app\.js\?v=20260826-007/);
assert.match(index, /mobile-page-shell\.css\?v=20260826-002/);
assert.match(serviceWorker, /styles\/mobile-page-shell\.css\?v=20260826-002/);
assert.match(index, /styles\/wishlist\.css\?v=20260826-002/);
assert.match(index, /styles\/shopping\.css\?v=20260826-004/);
assert.match(index, /id="wishlistModuleTabs"/);
assert.match(index, /data-wishlist-module="shopping"/);
assert.match(index, /id="shoppingImageInput"[^>]*accept="image\/\*"/);
assert.doesNotMatch(index, /data-shopping-filter="all"/);
assert.match(index, /data-shopping-filter="open"/);
assert.match(index, /data-shopping-filter="done"/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS shopping_items/);
assert.match(worker, /shopping_items:\s*\{/);
assert.match(schema, /shopping_items[\s\S]*sort_order INTEGER NOT NULL DEFAULT 0/);
assert.match(worker, /shopping_items[\s\S]*sort_order/);
assert.match(serviceWorker, /modules\/shopping-controller\.js/);
assert.match(serviceWorker, /modules\/shopping-view\.js/);
assert.match(serviceWorker, /modules\/shopping-domain\.js/);
assert.match(serviceWorker, /modules\/shopping-interactions\.js/);
assert.match(serviceWorker, /modules\/list-icons\.js/);
assert.match(serviceWorker, /modules\/wishlist-domain\.js/);
assert.match(serviceWorker, /modules\/wishlist-interactions\.js/);
assert.match(shoppingControllerModule, /repository\.upsert\("shopping_items"/);
assert.match(shoppingControllerModule, /确定要删除这个商品吗/);
assert.match(shoppingControllerModule, /repository\.remove\("shopping_items", \{ id \}, \{ select: "id" \}\)/);
assert.doesNotMatch(shoppingControllerModule, /repository\.remove\("shopping_items", \{ id \}, \{ owned: true/);
assert.match(shoppingControllerModule, /cleanupStoredImagePaths/);
assert.match(shoppingControllerModule, /shopping-image-dialog/);
assert.match(shoppingViewModule, /data-shopping-image/);
assert.match(shoppingViewModule, /shopping-card-placeholder/);
assert.match(shoppingViewModule, /shopping-card-image-button/);
assert.doesNotMatch(shoppingViewModule, /🛍|🛒/);
assert.doesNotMatch(wishlistViewModule, /♡/);
assert.match(css, /shopping-card\s*\{[\s\S]*?background: var\(--lv-surface\)/);
assert.match(css, /shopping-image-dialog::backdrop/);
assert.match(css, /shopping-image-dialog:not\(\[open\]\)/);
assert.match(shoppingViewModule, /data-shopping-menu/);
assert.match(shoppingViewModule, /data-toggle-shopping/);
assert.match(shoppingInteractionsModule, /LONG_PRESS_DELAY/);
assert.match(shoppingDomainModule, /new Set\(\["open", "done"\]\)/);
assert.match(shoppingViewModule, /shopping-detail-status/);
assert.match(wishlistDomainModule, /reorderWishlistItems/);
assert.match(wishlistInteractionsModule, /LONG_PRESS_DELAY/);
assert.match(wishlistControllerModule, /createWishlistInteractions/);
assert.equal(typeof shoppingController.createShoppingController, "function");
assert.equal(typeof wishlistHubController.createWishlistHubController, "function");
assert.match(photoDialogViewModule, /data-secret-dialog-delete/);
assert.match(secretAlbumActionsControllerModule, /async function deleteSecretDialogImage\(\)/);
assert.match(secretControllerModule, /deleteSecretDialogImage/);
assert.match(photoViewerControllerModule, /onDelete: \(\) => void deleteSecretDialogImage\(\)/);
assert.match(css, /secret-dialog-delete/);
assert.match(gamificationControllerModule, /els\.levelDialog\.showModal\(\);[\s\S]*?loadFamilyLevelProfiles/);
assert.match(serviceWorker, /modules\/vlog-mode\.js/);
assert.match(serviceWorker, /modules\/weekend-gallery\.js/);
assert.match(weekendGalleryModule, /weekend-album-lightbox-closed/);
assert.match(photoViewerControllerModule, /classList\.contains\("weekend-image-dialog"\)/);
assert.match(appNavigationControllerModule, /mobile-diary-shell/);
assert.match(appNavigationControllerModule, /state\.activeFilter !== "VLOG"/);
assert.match(mobilePageShellCss, /body:not\(\.mobile-diary-shell\)[\s\S]*?\.hero/);
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
assert.match(css, /mobile-diary-image-button > \.live-photo-badge[\s\S]*?bottom:\s*auto/);
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
assert.match(secretDomainModule, /export const SECRET_ALBUM_IMAGE_LIMIT = 500/);
assert.doesNotMatch(applicationSource, /const SECRET_ALBUM_IMAGE_LIMIT\s*=\s*80/);
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
assert.match(mediaMetadataModule, /export function getStoredPhotoMediaPaths/);
assert.match(photoEditorControllerModule, /import \{ composeDiaryStoredNote, getStoredPhotoMediaPaths \} from "\.\/media-metadata\.js"/);
assert.match(mediaMetadataModule, /motion_path/);
assert.match(uploadQueueModule, /export function createUploadQueue/);
assert.match(imageServiceModule, /export function createImageService/);
assert.match(imageServiceModule, /options\.fileName/);

console.log("Static contract checks passed.");
