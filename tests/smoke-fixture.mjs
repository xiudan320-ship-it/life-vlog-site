import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export const redesignStyleUrls = [
  "redesign-foundation.css",
  "redesign-components.css",
  "content-forms.css",
  "mobile-diary.css",
  "account-dialogs.css",
  "secret-gallery.css",
  "diary-reader.css",
  "secret-filters.css",
  "diary-comments.css",
  "feature-inspector.css",
  "wishlist-compact.css",
  "shopping.css",
  "media-upload.css",
];
export const [app, redesignStyles, styles, worker, schema, index, manifestText] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  Promise.all(redesignStyleUrls.map((file) => readFile(new URL(`../styles/${file}`, import.meta.url), "utf8"))),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/src/worker.js", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/schema.d1.sql", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"),
]);
export const css = redesignStyles.join("\n");
export const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
export const diaryDetailCss = await readFile(new URL("../diary-detail.css", import.meta.url), "utf8");
export const weekendBoardCss = await readFile(new URL("../weekend-board.css", import.meta.url), "utf8");
export const weekendGalleryModule = await readFile(
  new URL("../modules/weekend-gallery.js", import.meta.url),
  "utf8"
);
export const wishlistViewModule = await readFile(
  new URL("../modules/wishlist-view.js", import.meta.url),
  "utf8"
);
export const shoppingViewModule = await readFile(new URL("../modules/shopping-view.js", import.meta.url), "utf8");
export const shoppingController = await import(new URL("../modules/shopping-controller.js", import.meta.url));
export const shoppingControllerModule = await readFile(new URL("../modules/shopping-controller.js", import.meta.url), "utf8");
export const shoppingDomainModule = await readFile(new URL("../modules/shopping-domain.js", import.meta.url), "utf8");
export const shoppingInteractionsModule = await readFile(new URL("../modules/shopping-interactions.js", import.meta.url), "utf8");
export const wishlistHubController = await import(new URL("../modules/wishlist-hub-controller.js", import.meta.url));
export const diaryUploadDomainModule = await readFile(
  new URL("../modules/diary-upload-domain.js", import.meta.url),
  "utf8"
);
export const notificationViewModule = await readFile(
  new URL("../modules/notification-view.js", import.meta.url),
  "utf8"
);
export const diaryGalleryViewModule = await readFile(
  new URL("../modules/diary-gallery-view.js", import.meta.url),
  "utf8"
);
export const mobileDiaryViewModule = await readFile(
  new URL("../modules/mobile-diary-view.js", import.meta.url),
  "utf8"
);
export const mobilePageShellCss = await readFile(
  new URL("../styles/mobile-page-shell.css", import.meta.url),
  "utf8"
);
export const mediaGestureDomainModule = await readFile(
  new URL("../modules/media-gesture-domain.js", import.meta.url),
  "utf8"
);
export const secretGalleryViewModule = await readFile(
  new URL("../modules/secret-gallery-view.js", import.meta.url),
  "utf8"
);
export const accountViewModule = await readFile(
  new URL("../modules/account-view.js", import.meta.url),
  "utf8"
);
export const photoDialogViewModule = await readFile(
  new URL("../modules/photo-dialog-view.js", import.meta.url),
  "utf8"
);
export const familyActivityViewModule = await readFile(
  new URL("../modules/family-activity-view.js", import.meta.url),
  "utf8"
);
export const cacheManagementViewModule = await readFile(
  new URL("../modules/cache-management-view.js", import.meta.url),
  "utf8"
);
export const gamificationViewModule = await readFile(
  new URL("../modules/gamification-view.js", import.meta.url),
  "utf8"
);
export const accountSyncDomain = await import(new URL("../modules/account-sync-domain.js", import.meta.url));
export const appElements = await import(new URL("../modules/app-elements.js", import.meta.url));
export const foodWheelController = await import(new URL("../modules/food-wheel-controller.js", import.meta.url));
export const pushController = await import(new URL("../modules/push-controller.js", import.meta.url));
export const anniversaryController = await import(new URL("../modules/anniversary-controller.js", import.meta.url));
export const gratitudeController = await import(new URL("../modules/gratitude-controller.js", import.meta.url));
export const recipeController = await import(new URL("../modules/recipe-controller.js", import.meta.url));
export const recipeControllerModule = await readFile(new URL("../modules/recipe-controller.js", import.meta.url), "utf8");
export const anniversaryControllerModule = await readFile(new URL("../modules/anniversary-controller.js", import.meta.url), "utf8");
export const gratitudeControllerModule = await readFile(new URL("../modules/gratitude-controller.js", import.meta.url), "utf8");
export const pushControllerModule = await readFile(new URL("../modules/push-controller.js", import.meta.url), "utf8");
export const wishlistController = await import(new URL("../modules/wishlist-controller.js", import.meta.url));
export const wishlistControllerModule = await readFile(new URL("../modules/wishlist-controller.js", import.meta.url), "utf8");
export const weekendController = await import(new URL("../modules/weekend-controller.js", import.meta.url));
export const weekendControllerModule = await readFile(new URL("../modules/weekend-controller.js", import.meta.url), "utf8");
export const authController = await import(new URL("../modules/auth-controller.js", import.meta.url));
export const offlineCacheController = await import(new URL("../modules/offline-cache-controller.js", import.meta.url));
export const offlineCacheControllerModule = await readFile(new URL("../modules/offline-cache-controller.js", import.meta.url), "utf8");
export const offlineSettingsController = await import(new URL("../modules/offline-settings-controller.js", import.meta.url));
export const offlineSettingsControllerModule = await readFile(new URL("../modules/offline-settings-controller.js", import.meta.url), "utf8");
export const dataSafetyController = await import(new URL("../modules/data-safety-controller.js", import.meta.url));
export const dataSafetyControllerModule = await readFile(new URL("../modules/data-safety-controller.js", import.meta.url), "utf8");
export const accountSyncController = await import(new URL("../modules/account-sync-controller.js", import.meta.url));
export const accountSyncControllerModule = await readFile(new URL("../modules/account-sync-controller.js", import.meta.url), "utf8");
export const trashController = await import(new URL("../modules/trash-controller.js", import.meta.url));
export const trashControllerModule = await readFile(new URL("../modules/trash-controller.js", import.meta.url), "utf8");
export const diaryFeedController = await import(new URL("../modules/diary-feed-controller.js", import.meta.url));
export const diaryFeedControllerModule = await readFile(new URL("../modules/diary-feed-controller.js", import.meta.url), "utf8");
export const socialController = await import(new URL("../modules/social-controller.js", import.meta.url));
export const socialControllerModule = await readFile(new URL("../modules/social-controller.js", import.meta.url), "utf8");
export const familySettingsController = await import(new URL("../modules/family-settings-controller.js", import.meta.url));
export const familySettingsControllerModule = await readFile(new URL("../modules/family-settings-controller.js", import.meta.url), "utf8");
export const familyActivityController = await import(new URL("../modules/family-activity-controller.js", import.meta.url));
export const familyActivityControllerModule = await readFile(new URL("../modules/family-activity-controller.js", import.meta.url), "utf8");
export const toolDockController = await import(new URL("../modules/tool-dock-controller.js", import.meta.url));
export const toolDockControllerModule = await readFile(new URL("../modules/tool-dock-controller.js", import.meta.url), "utf8");
export const layoutSettingsController = await import(new URL("../modules/layout-settings-controller.js", import.meta.url));
export const layoutSettingsControllerModule = await readFile(new URL("../modules/layout-settings-controller.js", import.meta.url), "utf8");
export const appEventBindings = await import(new URL("../modules/app-event-bindings.js", import.meta.url));
export const appEventBindingsModule = await readFile(new URL("../modules/app-event-bindings.js", import.meta.url), "utf8");
export const contentFormEventBindingsModule = await readFile(
  new URL("../modules/content-form-event-bindings.js", import.meta.url),
  "utf8"
);
export const mediaEventBindingsModule = await readFile(
  new URL("../modules/media-event-bindings.js", import.meta.url),
  "utf8"
);
export const settingsEventBindingsModule = await readFile(
  new URL("../modules/settings-event-bindings.js", import.meta.url),
  "utf8"
);
export const appNavigationControllerModule = await readFile(
  new URL("../modules/app-navigation-controller.js", import.meta.url),
  "utf8"
);
export const appIdentityControllerModule = await readFile(
  new URL("../modules/app-identity-controller.js", import.meta.url),
  "utf8"
);
export const appSessionControllerModule = await readFile(
  new URL("../modules/app-session-controller.js", import.meta.url),
  "utf8"
);
export const householdBrandingControllerModule = await readFile(
  new URL("../modules/household-branding-controller.js", import.meta.url),
  "utf8"
);
export const diaryMetadataModule = await readFile(
  new URL("../modules/diary-metadata.js", import.meta.url),
  "utf8"
);
export const assetController = await import(new URL("../modules/asset-controller.js", import.meta.url));
export const assetControllerModule = await readFile(new URL("../modules/asset-controller.js", import.meta.url), "utf8");
export const diaryComposerController = await import(new URL("../modules/diary-composer-controller.js", import.meta.url));
export const diaryComposerControllerModule = await readFile(new URL("../modules/diary-composer-controller.js", import.meta.url), "utf8");
export const gamificationController = await import(new URL("../modules/gamification-controller.js", import.meta.url));
export const gamificationControllerModule = await readFile(new URL("../modules/gamification-controller.js", import.meta.url), "utf8");
export const profilePreferencesController = await import(new URL("../modules/profile-preferences-controller.js", import.meta.url));
export const profilePreferencesControllerModule = await readFile(new URL("../modules/profile-preferences-controller.js", import.meta.url), "utf8");
export const secretController = await import(new URL("../modules/secret-controller.js", import.meta.url));
export const secretControllerModule = await readFile(new URL("../modules/secret-controller.js", import.meta.url), "utf8");
export const secretComposerControllerModule = await readFile(
  new URL("../modules/secret-composer-controller.js", import.meta.url),
  "utf8"
);
export const secretAlbumActionsControllerModule = await readFile(
  new URL("../modules/secret-album-actions-controller.js", import.meta.url),
  "utf8"
);
export const secretFolderControllerModule = await readFile(
  new URL("../modules/secret-folder-controller.js", import.meta.url),
  "utf8"
);
export const secretFilterDomainModule = await readFile(
  new URL("../modules/secret-filter-domain.js", import.meta.url),
  "utf8"
);
export const secretPinController = await import(new URL("../modules/secret-pin-controller.js", import.meta.url));
export const secretPinControllerModule = await readFile(new URL("../modules/secret-pin-controller.js", import.meta.url), "utf8");
export const photoViewerController = await import(new URL("../modules/photo-viewer-controller.js", import.meta.url));
export const photoViewerControllerModule = await readFile(new URL("../modules/photo-viewer-controller.js", import.meta.url), "utf8");
export const photoDetailController = await import(new URL("../modules/photo-detail-controller.js", import.meta.url));
export const photoDetailControllerModule = await readFile(new URL("../modules/photo-detail-controller.js", import.meta.url), "utf8");
export const photoEditorControllerModule = await readFile(
  new URL("../modules/photo-editor-controller.js", import.meta.url),
  "utf8"
);
export const mobileDiaryControllerModule = await readFile(
  new URL("../modules/mobile-diary-controller.js", import.meta.url),
  "utf8"
);
export const applicationSource = [
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
  contentFormEventBindingsModule,
  mediaEventBindingsModule,
  settingsEventBindingsModule,
  appNavigationControllerModule,
  appIdentityControllerModule,
  appSessionControllerModule,
  householdBrandingControllerModule,
  diaryMetadataModule,
  assetControllerModule,
  diaryComposerControllerModule,
  gamificationControllerModule,
  profilePreferencesControllerModule,
  photoViewerControllerModule,
  photoDetailControllerModule,
  photoEditorControllerModule,
  mobileDiaryControllerModule,
  secretControllerModule,
  secretComposerControllerModule,
  secretAlbumActionsControllerModule,
  secretFolderControllerModule,
  secretFilterDomainModule,
  secretPinControllerModule,
].join("\n");
assert.doesNotMatch(applicationSource, /dataset\.state\./);
export const deployScript = await readFile(new URL("../deploy-cloudflare-pages.ps1", import.meta.url), "utf8");
export const releaseTestScript = await readFile(new URL("../test-release.ps1", import.meta.url), "utf8");
export const secretViewerCss = await readFile(
  new URL("../secret-viewer.css", import.meta.url),
  "utf8"
);
export const appLifecycle = await import(
  new URL("../modules/app-lifecycle.js", import.meta.url)
);
export const pageHeaders = await readFile(new URL("../_headers", import.meta.url), "utf8");
export const confirmDialogModule = await readFile(
  new URL("../modules/confirm-dialog.js", import.meta.url),
  "utf8"
);
export const cachePolicyModule = await readFile(
  new URL("../modules/cache-policy.js", import.meta.url),
  "utf8"
);
export const cachePolicy = await import(new URL("../modules/cache-policy.js", import.meta.url));
export const diaryDomain = await import(new URL("../modules/diary-domain.js", import.meta.url));
export const notificationDomain = await import(
  new URL("../modules/notification-domain.js", import.meta.url)
);
export const photoFavoritesDomain = await import(
  new URL("../modules/photo-favorites.js", import.meta.url)
);
export const wishlistView = await import(
  new URL("../modules/wishlist-view.js", import.meta.url)
);
export const diaryUploadDomain = await import(new URL("../modules/diary-upload-domain.js", import.meta.url));
export const foodWheelView = await import(new URL("../modules/food-wheel-view.js", import.meta.url));
export const recipeView = await import(new URL("../modules/recipe-view.js", import.meta.url));
export const anniversaryView = await import(new URL("../modules/anniversary-view.js", import.meta.url));
export const weekendPlansView = await import(new URL("../modules/weekend-plans-view.js", import.meta.url));
export const gratitudeView = await import(new URL("../modules/gratitude-view.js", import.meta.url));
export const notificationView = await import(new URL("../modules/notification-view.js", import.meta.url));
export const vipCenter = await import(new URL("../modules/vip-center.js", import.meta.url));
export const diaryGalleryView = await import(new URL("../modules/diary-gallery-view.js", import.meta.url));
export const mobileDiaryView = await import(new URL("../modules/mobile-diary-view.js", import.meta.url));
export const mediaGestureDomain = await import(new URL("../modules/media-gesture-domain.js", import.meta.url));
export const secretGalleryView = await import(new URL("../modules/secret-gallery-view.js", import.meta.url));
export const accountView = await import(new URL("../modules/account-view.js", import.meta.url));
export const photoDialogView = await import(new URL("../modules/photo-dialog-view.js", import.meta.url));
export const familyActivityView = await import(new URL("../modules/family-activity-view.js", import.meta.url));
export const gamificationView = await import(new URL("../modules/gamification-view.js", import.meta.url));
export const secretDomain = await import(new URL("../modules/secret-domain.js", import.meta.url));
export const diaryDomainModule = await readFile(
  new URL("../modules/diary-domain.js", import.meta.url),
  "utf8"
);
export const notificationDomainModule = await readFile(
  new URL("../modules/notification-domain.js", import.meta.url),
  "utf8"
);
export const secretDomainModule = await readFile(
  new URL("../modules/secret-domain.js", import.meta.url),
  "utf8"
);
export const cloudflareClientModule = await readFile(
  new URL("../modules/cloudflare-client.js", import.meta.url),
  "utf8"
);
export const repositoryModule = await readFile(
  new URL("../modules/data-repositories.js", import.meta.url),
  "utf8"
);
export const wardrobeModule = await readFile(
  new URL("../modules/wardrobe.js", import.meta.url),
  "utf8"
);
export const wardrobeCss = await readFile(new URL("../wardrobe.css", import.meta.url), "utf8");
export const mediaCacheModule = await readFile(
  new URL("../modules/media-cache.js", import.meta.url),
  "utf8"
);
export const vlogModeModule = await readFile(
  new URL("../modules/vlog-mode.js", import.meta.url),
  "utf8"
);
export const diaryVideoLayoutModule = await readFile(
  new URL("../modules/diary-video-layout.js", import.meta.url),
  "utf8"
);
export const mediaCache = await import(
  new URL("../modules/media-cache.js", import.meta.url)
);
export const mediaMetadataModule = await readFile(
  new URL("../modules/media-metadata.js", import.meta.url),
  "utf8"
);
export const adminStorageModule = await readFile(
  new URL("../modules/admin-storage.js", import.meta.url),
  "utf8"
);
export const mediaMetadata = await import(
  new URL("../modules/media-metadata.js", import.meta.url)
);
export const uploadQueueModule = await readFile(
  new URL("../modules/upload-queue.js", import.meta.url),
  "utf8"
);
export const imageServiceModule = await readFile(
  new URL("../modules/image-service.js", import.meta.url),
  "utf8"
);
export const gamificationDomain = await import(
  new URL("../modules/gamification-domain.js", import.meta.url)
);
export const gamificationArchiveModule = await readFile(
  new URL("../modules/gamification-archive.js", import.meta.url),
  "utf8"
);
export const preferencesStoreModule = await import(
  new URL("../modules/preferences-store.js", import.meta.url)
);
export const householdRepositoryModule = await import(
  new URL("../modules/household-repository.js", import.meta.url)
);
export const uiFormatters = await import(
  new URL("../modules/ui-formatters.js", import.meta.url)
);
export const offlineRecords = await import(
  new URL("../modules/offline-records.js", import.meta.url)
);
export const expandedTrashMigration = await readFile(
  new URL("../cloudflare-worker/migrations/0006_expand_trash_item_types.sql", import.meta.url),
  "utf8"
);

