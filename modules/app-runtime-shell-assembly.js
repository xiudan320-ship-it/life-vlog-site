import { createAppFeedbackView } from "./app-feedback-view.js";
import { createAppIdentityController } from "./app-identity-controller.js";
import { createTextScaleController } from "./text-scale-controller.js";
import { createPerformanceDiagnosticsView } from "./performance-diagnostics-view.js";
import { createDiaryMetadata } from "./diary-metadata.js";
import { createHouseholdBrandingController } from "./household-branding-controller.js";
import { createDiaryFeedController } from "./diary-feed-controller.js";
import { createSocialController } from "./social-controller.js";
import { createFamilyActivityController } from "./family-activity-controller.js";
import { createToolDockController } from "./tool-dock-controller.js";
import { createLayoutSettingsController } from "./layout-settings-controller.js";
import { createSecretEntryPreferenceController } from "./secret-entry-preference-controller.js";
import { createRuntimeStateView } from "./app-runtime-state.js";

const view = (state, names) => createRuntimeStateView(state, names);

/**
 * Assemble controllers that own the persistent shell: feedback, identity,
 * diary feed, social activity, settings presentation, and
 * secret-entry preferences. Feature-page controllers stay in the feature
 * assembly and route/session wiring stays in the route assembly.
 */
export function createShellControllerAssembly({
  elements,
  state,
  services,
  config,
  core,
  pages,
  performanceMonitor,
  healthMonitor,
}) {
  const {
    diaryRepository,
    notificationRepository,
    householdRepository,
    photoFavorites,
    assetController,
  } = services;
  const {
    familySettingsController,
    offlineSettingsController,
    dataSafetyController,
    wishlistHubController,
    callLoaded,
  } = pages;
  const defer = (name) => (...args) => core[name]?.(...args);

  const appFeedbackView = createAppFeedbackView({
    elements,
    escapeHtml: core.escapeHtml,
    getActivePage: () => state.activePage,
  });
  const {
    dismissMiniToast,
    isMobileViewport,
    setGlobalStatus,
    setHint,
    setSecretStatus,
    setStatus,
    showMiniToast,
    updateDiaryBackTopButton,
    updateNetworkStatus,
  } = appFeedbackView;
  const performanceDiagnosticsView = createPerformanceDiagnosticsView({
    monitor: performanceMonitor,
      getRoot: () => elements.settingsStorage,
    showToast: showMiniToast,
    health: healthMonitor,
  });

  const textScaleController = createTextScaleController({
    preferenceStore: services.preferenceStore,
    getScope: () => state.session?.user?.id || "guest",
  });

  const diaryMetadata = createDiaryMetadata({
    elements,
    generatedTitlePrefixes: config.generatedTitlePrefixes,
    slugify: core.slugify,
  });
  const {
    getDisplayTitle,
    getFinalTitle,
    getPhotoLabel,
    getUploadFileNameBase,
  } = diaryMetadata;

  let renderGallery = () => undefined;
  let renderSettingsSummary = () => undefined;
  let socialController = null;
  const loadNotificationsFromSocial = (...args) => socialController?.loadNotifications?.(...args);
  const renderNotificationsFromSocial = (...args) => socialController?.renderNotifications?.(...args);

  const identityController = createAppIdentityController({
    elements,
    state: view(state, [
      "session",
      "cloudDb",
      "familyInfo",
      "familyMemberMap",
      "familyLevelProfiles",
      "accountProfile",
      "mobileDiaryPhoto",
      "mobileDiaryPage",
    ]),
    avatarCacheKey: config.avatarCacheKey,
    photoCategories: config.photoCategories,
    getDisplayTitle,
    getProfileAvatarUrl: defer("getProfileAvatarUrl"),
    renderSettingsSummary: (...args) => renderSettingsSummary(...args),
    renderExperience: defer("renderExperience"),
    renderGallery: (...args) => renderGallery(...args),
    renderOverview: core.renderOverview,
    renderMobileDiaryPage: defer("renderMobileDiaryPage"),
    showToast: showMiniToast,
  });
  const {
    adminUpdatePhotoCategory,
    canManageItem,
    getAuthorName,
    getSessionBoundEmail,
    getSessionDisplayName,
    getSessionLoginName,
    isAdminAccount,
    loadCachedAvatarUrl,
    renderAccountAvatar,
    renderAvatarMarkup,
    saveCachedAvatarUrl,
    updateSessionDisplayName,
  } = identityController;

  const householdBrandingController = createHouseholdBrandingController({
    elements,
    state: view(state, ["session", "familyInfo", "accountProfile"]),
    preferenceStore: services.preferenceStore,
    keys: {
      homeName: config.homeNameKey,
      familyTagline: config.familyTaglineKey,
    },
    defaults: {
      homeName: config.homeName,
      familyTagline: config.defaultFamilyTagline,
    },
    renderSettingsSummary: (...args) => renderSettingsSummary(...args),
    setHint,
  });
  const {
    applyFamilyTagline,
    applyHomeName,
    loadFamilyTagline,
    loadHomeName,
    normalizeFamilyTagline,
    normalizeHomeName,
    saveConfig,
  } = householdBrandingController;

  elements.dateInput.valueAsDate = new Date();
  if (elements.weekendDateInput) elements.weekendDateInput.value = config.getNextWeekendDate();

  const isFavoritePhoto = (photoOrId) => photoFavorites.has(photoOrId);
  const diaryFeedController = createDiaryFeedController({
    elements,
    state: view(state, [
      "cloudDb",
      "photos",
      "session",
      "photoFlagsCloudAvailable",
      "pendingNewPhotos",
      "dismissedFeedRefreshIds",
      "showingCachedFeed",
      "photoCommentPreviewMap",
      "photosLoadPromise",
      "visiblePhotoCount",
      "weekendPlans",
      "activePage",
      "notifications",
      "feedRefreshCheckInFlight",
      "activeFilter",
      "filteredPhotoCount",
      "galleryRenderSignature",
      "galleryMasonryTimer",
      "mobileDiaryPhoto",
      "galleryMasonryObserver",
      "diarySearchQuery",
      "mobileDiaryPage",
      "feedObserver",
      "feedLoading",
      "cloudSyncAvailable",
    ]),
    constants: {
      todayPostsSeenKey: config.todayPostsSeenKey,
      photoCommentPreviewLimit: config.photoCommentPreviewLimit,
      pageSize: config.pageSize,
    },
    demoPhotos: config.demoPhotos,
    diaryRepository,
    notificationRepository: {
      markDiaryRead: (...args) => notificationRepository.markDiaryRead(...args),
    },
    photoFavorites,
    isFavoritePhoto,
    renderCachedPhotoFeed: defer("renderCachedPhotoFeed"),
    savePhotoFeedCache: defer("savePhotoFeedCache"),
    setGlobalStatus,
    updateCloudSyncStatus: defer("updateCloudSyncStatus"),
    syncPrimaryNavigation: core.syncPrimaryNavigation,
    loadNotifications: loadNotificationsFromSocial,
    renderNotifications: renderNotificationsFromSocial,
    switchPage: core.switchPage,
    getLocalDateKey: core.getLocalDateKey,
    getPhotoLabel,
    getAuthorName,
    renderAvatarMarkup,
    isAdminAccount,
    isMobileViewport,
    getPhotoOwnerId: core.getPhotoOwnerId,
    getDisplayTitle,
    openPhoto: defer("openPhoto"),
    deletePhoto: defer("deletePhoto"),
    openEditPhoto: defer("openEditPhoto"),
    adminUpdatePhotoCategory,
    renderMobileDiaryPage: defer("renderMobileDiaryPage"),
    isMissingCloudSchema: core.isMissingCloudSchema,
    resolveStoredAssetUrl: assetController.resolveStoredAssetUrl,
    getR2PublicAssetUrl: assetController.getR2PublicAssetUrl,
    r2PublicUrl: config.r2PublicUrl,
    r2UploadEndpoint: config.r2UploadEndpoint,
  });
  const diaryFeedActions = diaryFeedController;
  renderGallery = diaryFeedActions.renderGallery;

  socialController = createSocialController({
    elements,
    state: view(state, [
      "lastAppBadgeCount",
      "familyMemberMap",
      "familyLevelProfiles",
      "cloudDb",
      "session",
      "notifications",
      "notificationsLoadPromise",
      "photos",
      "activeDialogPhoto",
      "photoComments",
      "commentReplyToId",
      "activePage",
    ]),
    notificationRepository,
    diaryRepository,
    getProfileAvatarUrl: defer("getProfileAvatarUrl"),
    loadCachedAvatarUrl,
    isMissingCloudSchema: core.isMissingCloudSchema,
    savePhotoFeedCache: defer("savePhotoFeedCache"),
    renderGallery: (...args) => renderGallery(...args),
    switchPage: core.switchPage,
    openThanksDialog: defer("openThanksDialog"),
    openWishlistDestination: (moduleName) => wishlistHubController.show(moduleName),
    openPhoto: defer("openPhoto"),
    showMiniToast,
    renderMobileDiaryComments: defer("renderMobileDiaryComments"),
    getAuthorName,
    renderAvatarMarkup,
    loadPhotoCommentPreviews: diaryFeedActions.loadPhotoCommentPreviews,
    awardExperience: defer("awardExperience"),
  });
  const {
    syncAppIconBadge,
    getNotificationText,
    getNotificationActorName,
    getNotificationActorAvatar,
    loadNotifications,
    renderNotifications,
    openNotification,
    openNotificationsPanel,
    markUnreadNotificationsRead,
    loadPhotoComments,
    renderPhotoComments,
    startCommentReply,
    cancelCommentReply,
    savePhotoComment,
    deletePhotoComment,
  } = socialController;

  const familyActivityController = createFamilyActivityController({
    elements,
    state: view(state, ["photos", "recipes", "wishes", "weekendPlans", "gratitudeNotes", "session", "cloudDb"]),
    diaryRepository,
    getPhotoLabel,
    getSortedPhotos: diaryFeedActions.getSortedPhotos,
    getAuthorName,
    openPhoto: defer("openPhoto"),
  });
  const { loadWeeklyReview, openWeeklyReview } = familyActivityController;

  const toolDockController = createToolDockController({
    elements,
    state: view(state, ["session", "toolDockDragState", "suppressToolDockClick"]),
    preferenceStore: services.preferenceStore,
    constants: {
      toolDockOrderKey: config.toolDockOrderKey,
      toolDockDefaultOrder: config.toolDockDefaultOrder,
      toolDockMobileDefaultOrder: config.toolDockMobileDefaultOrder,
      toolDockLabels: config.toolDockLabels,
    },
    getSessionDisplayName,
    renderAvatarMarkup,
  });
  const {
    getToolDockOrderStorageKey,
    normalizeToolDockOrder,
    loadToolDockOrder,
    writeToolDockOrder,
    saveToolDockOrder,
    applyToolDockOrder,
    renderSettingsToolOrderPanel,
    renderSettingsAccountOverview,
    ensureToolDockSortControls,
    startToolDockPointer,
    beginToolDockTouchSort,
    beginToolDockDrag,
    moveToolDockPointer,
    finishToolDockPointer,
    handleToolDockClick,
    moveToolDockItem,
    exitToolDockTouchSort,
  } = toolDockController;

  const layoutSettingsController = createLayoutSettingsController({
    elements,
    state: view(state, ["session", "accountProfile", "cloudDb", "familyInfo"]),
    preferenceStore: services.preferenceStore,
    constants: {
      mobileFeedLayoutKey: config.mobileFeedLayoutKey,
      mobileSecretLayoutKey: config.mobileSecretLayoutKey,
      mobileDialogBreakpoint: config.mobileDialogBreakpoint,
      defaultFamilyTagline: config.defaultFamilyTagline,
    },
    scheduleGalleryMasonryLayout: diaryFeedActions.scheduleGalleryMasonryLayout,
    openSettingsChildDialog: defer("openSettingsChildDialog"),
    reopenSettingsAfterChildDialog: defer("reopenSettingsAfterChildDialog"),
    loadFamilyTagline,
    normalizeFamilyTagline,
    applyFamilyTagline,
    ensureCacheManagementUi: (...args) => callLoaded(offlineSettingsController, "ensureCacheManagementUi", ...args),
    ensureDataSafetyUi: (...args) => callLoaded(dataSafetyController, "ensureDataSafetyUi", ...args),
    ensureStabilitySettingsUi: (...args) => callLoaded(dataSafetyController, "ensureStabilitySettingsUi", ...args),
    renderSettingsAccountOverview,
    loadHomeName,
    getSessionDisplayName,
    getSessionBoundEmail,
    loadCacheCapacityMb: defer("loadCacheCapacityMb"),
    loadMediaCachePolicy: defer("loadMediaCachePolicy"),
  });
  const {
    getMobileFeedLayoutKey,
    loadMobileFeedLayout,
    applyMobileFeedLayout,
    setMobileFeedLayout,
    getMobileSecretLayoutKey,
    loadMobileSecretLayout,
    ensureSecretLayoutToggle,
    applyMobileSecretLayout,
    setMobileSecretLayout,
    updateSecretToolbarTop,
    syncMobileComposerPlacement,
    ensureFamilySignatureUi,
  } = layoutSettingsController;
  renderSettingsSummary = layoutSettingsController.renderSettingsSummary;

  const secretEntryPreferenceController = createSecretEntryPreferenceController({
    state: view(state, ["session", "secretDefaultFolderId"]),
    repository: householdRepository,
    allFolderId: config.secretAllFolderId,
    favoritesFolderId: config.secretFavoritesFolderId,
    renderFolderControls: defer("renderSecretFolderControls"),
    setGlobalStatus,
  });
  const {
    getDefaultFolderId: getSecretDefaultFolderId,
    setDefaultFolderId: setSecretDefaultFolderId,
  } = secretEntryPreferenceController;

  const actions = Object.freeze({
    ...appFeedbackView,
    ...diaryMetadata,
    ...identityController,
    ...householdBrandingController,
    ...diaryFeedController,
    isFavoritePhoto,
    ...socialController,
    ...familyActivityController,
    ...toolDockController,
    ...layoutSettingsController,
    ...secretEntryPreferenceController,
    getSecretDefaultFolderId,
    setSecretDefaultFolderId,
    textScaleController,
  });

  return Object.freeze({
    appFeedbackView,
    performanceDiagnosticsView,
    textScaleController,
    diaryMetadata,
    identityController,
    householdBrandingController,
    diaryFeedController,
    socialController,
    familyActivityController,
    toolDockController,
    layoutSettingsController,
    secretEntryPreferenceController,
    actions,
  });
}
