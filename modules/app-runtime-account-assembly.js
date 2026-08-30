import { createAppLifecycleController } from "./app-lifecycle.js";
import { createGamificationController } from "./gamification-controller.js";
import { createAccountSyncController } from "./account-sync-controller.js";
import { createProfilePreferencesController } from "./profile-preferences-controller.js";
import { createSecretPinController } from "./secret-pin-controller.js";
import { createRuntimeStateView } from "./app-runtime-state.js";

const view = (state, names) => createRuntimeStateView(state, names);

/**
 * Assemble account/session-adjacent controllers. This owns foreground
 * refresh, gamification, account synchronization, profile preferences, and
 * the secret PIN boundary; it does not build services or route controllers.
 */
export function createAccountControllerAssembly({
  elements,
  state,
  services,
  config,
  core,
  pages,
  shell,
  performanceMonitor,
  healthMonitor,
}) {
  const {
    householdRepository,
    photoFavorites,
    assetController,
    cloudflareBackend,
    secretDataService,
  } = services;
  const {
    familySettingsController,
    recipeController,
    wishlistController,
    shoppingController,
    weekendController,
    callLoaded,
  } = pages;
  const defer = (name) => (...args) => core[name]?.(...args);

  const appLifecycleController = createAppLifecycleController({
    documentTarget: document,
    windowTarget: window,
    foregroundThrottleMs: 10_000,
    pollIntervalMs: 30_000,
    onForeground: async () => {
      if (!state.session) return;
      await Promise.allSettled([
        core.loadNotifications?.(),
        core.checkForNewPhotos?.(),
        core.processDiaryUploadQueue?.(),
        core.syncExistingPushSubscription?.(),
      ]);
    },
    onPoll: async () => {
      if (!state.session) return;
      await Promise.allSettled([
        core.loadNotifications?.(),
        core.checkForNewPhotos?.(),
      ]);
    },
  });

  const gamificationController = createGamificationController({
    elements,
    state: view(state, [
      "session",
      "accountProfile",
      "activeVipLevel",
      "cloudSyncAvailable",
      "cloudDb",
      "familyInfo",
      "familyMemberMap",
      "familyMembers",
      "familyLevelProfiles",
    ]),
    householdRepository,
    keys: {
      vipRecharge: config.vipRechargeKey,
      experience: config.experienceKey,
      todayExperience: config.todayExperienceKey,
    },
    vipUsers: config.vipUsers,
    getSessionDisplayName: shell.actions.getSessionDisplayName,
    getSessionLoginName: shell.actions.getSessionLoginName,
    getProfileAvatarUrl: core.getProfileAvatarUrl,
    loadCachedAvatarUrl: shell.actions.loadCachedAvatarUrl,
    saveCachedAvatarUrl: shell.actions.saveCachedAvatarUrl,
    getArchiveData: () => ({
      photos: state.photos,
      recipes: state.recipes,
      wishes: state.wishes,
      weekendPlans: state.weekendPlans,
      secretItems: state.secretItems,
      comments: [...state.photoCommentPreviewMap.values()].flat(),
      gratitudeNotes: state.gratitudeNotes,
      favoriteCount: photoFavorites.size,
    }),
    getLocalDateKey: core.getLocalDateKey,
    getOffsetLocalDateKey: core.getOffsetLocalDateKey,
    normalizeLoginDateKey: core.normalizeLoginDateKey,
    isYesterdayLoginDate: core.isYesterdayLoginDate,
    updateAuthUI: core.updateAuthUI,
    renderOverview: core.renderOverview,
  });

  const gamificationActions = gamificationController;
  let profilePreferencesController = null;
  const applyThemeFromProfile = (...args) => profilePreferencesController?.applyTheme?.(...args);
  const accountSyncController = createAccountSyncController({
    elements,
    state: view(state, [
      "familyInfo",
      "familyMembers",
      "familyInvitations",
      "familyMemberMap",
      "cloudDb",
      "session",
      "accountProfile",
      "gratitudeNotes",
      "weekendCloudAvailable",
      "weekendPlans",
      "cloudSyncInFlight",
      "secretDefaultFolderId",
      "foodOptionsCloudAvailable",
      "thanksColorCloudAvailable",
      "profilePreferencesCloudAvailable",
      "cloudSyncAvailable",
      "accountDataState",
      "recipes",
      "wishes",
      "shoppingItems",
      "foodOptions",
      "activeVipLevel",
      "photoFlagsCloudAvailable",
      "anniversaryCloudAvailable",
      "secretCloudAvailable",
    ]),
    householdRepository,
    photoFavorites,
    defaultFoodOptions: config.defaultFoodOptions,
    isMissingCloudSchema: core.isMissingCloudSchema,
    getProfileAvatarUrl: core.getProfileAvatarUrl,
    loadCachedAvatarUrl: shell.actions.loadCachedAvatarUrl,
    saveCachedAvatarUrl: shell.actions.saveCachedAvatarUrl,
    renderAccountAvatar: shell.actions.renderAccountAvatar,
    getSessionDisplayName: shell.actions.getSessionDisplayName,
    renderSettingsSummary: shell.actions.renderSettingsSummary,
    normalizeHomeName: shell.actions.normalizeHomeName,
    loadHomeName: shell.actions.loadHomeName,
    normalizeFamilyTagline: shell.actions.normalizeFamilyTagline,
    loadFamilyTagline: shell.actions.loadFamilyTagline,
    applyHomeName: shell.actions.applyHomeName,
    applyFamilyTagline: shell.actions.applyFamilyTagline,
    renderFamilyDialog: (...args) => callLoaded(familySettingsController, "renderFamilyDialog", ...args),
    renderGratitudeNotes: (...args) => core.renderGratitudeNotes?.(...args),
    loadWeekendPlans: (...args) => {
      const value = callLoaded(weekendController, "load", ...args);
      return Array.isArray(value) ? value : [];
    },
    saveWeekendPlans: (...args) => callLoaded(weekendController, "save", ...args),
    renderWeekendPlans: (...args) => callLoaded(weekendController, "render", ...args),
    setWeekendStatus: (...args) => callLoaded(weekendController, "setStatus", ...args),
    loadRechargeTotal: gamificationActions.loadRechargeTotal,
    loadLocalExperienceAliases: gamificationActions.loadLocalExperienceAliases,
    loadFoodOptions: defer("loadFoodOptions"),
    loadThanksColor: defer("loadThanksColor"),
    isVipUser: gamificationActions.isVipUser,
    normalizeNickname: core.normalizeNickname,
    getSessionLoginName: shell.actions.getSessionLoginName,
    getLocalDateKey: core.getLocalDateKey,
    normalizeLoginDateKey: core.normalizeLoginDateKey,
    normalizeTheme: core.normalizeTheme,
    loadTheme: core.loadTheme,
    normalizeThanksColor: core.normalizeThanksColor,
    getDailyLoginReward: gamificationActions.getDailyLoginReward,
    isYesterdayLoginDate: core.isYesterdayLoginDate,
    updateSessionDisplayName: shell.actions.updateSessionDisplayName,
    applyTheme: applyThemeFromProfile,
    saveThanksColorPreference: defer("saveThanksColorPreference"),
    setSelectedThanksColor: defer("setSelectedThanksColor"),
    saveRechargeTotal: gamificationActions.saveRechargeTotal,
    saveExperience: gamificationActions.saveExperience,
    getTodayExperienceStorageKey: gamificationActions.getTodayExperienceStorageKey,
    saveRecipes: (...args) => callLoaded(recipeController, "save", ...args),
    saveFoodOptionsCache: defer("saveFoodOptionsCache"),
    renderExperience: gamificationActions.renderExperience,
    renderVipCenter: gamificationActions.renderVipCenter,
    renderRecipes: (...args) => callLoaded(recipeController, "render", ...args),
    renderWishes: (...args) => callLoaded(wishlistController, "render", ...args),
    renderShopping: (...args) => callLoaded(shoppingController, "render", ...args),
    renderFoodWheel: defer("renderFoodWheel"),
    synchronizeAnniversaries: defer("synchronizeAnniversaries"),
    loadPhotos: core.loadPhotos,
    loadSecretItems: (...args) => secretDataService.load(...args),
    loadNotifications: core.loadNotifications,
    refreshStorage: core.refreshStorage,
    cloudflareRequest: cloudflareBackend.request,
    isAdminAccount: shell.actions.isAdminAccount,
    setGlobalStatus: shell.actions.setGlobalStatus,
    awardDailyExperience: gamificationActions.awardDailyExperience,
    health: healthMonitor,
  });
  const {
    loadFamilyContext,
    loadGratitudeNotes,
    synchronizeWeekendPlans,
    synchronizeAccountData,
    updateCloudSyncStatus,
  } = accountSyncController;

  profilePreferencesController = createProfilePreferencesController({
    elements,
    preferenceStore: services.preferenceStore,
    householdRepository,
    assets: assetController,
    keys: { theme: config.themeKey },
    state: view(state, [
      "session",
      "accountProfile",
      "activeVipLevel",
      "cloudSyncAvailable",
      "cloudDb",
      "familyInfo",
      "familyMemberMap",
      "familyMembers",
      "familyLevelProfiles",
    ]),
    normalizeHomeName: shell.actions.normalizeHomeName,
    applyHomeName: shell.actions.applyHomeName,
    normalizeNickname: core.normalizeNickname,
    getSessionDisplayName: shell.actions.getSessionDisplayName,
    updateSessionDisplayName: shell.actions.updateSessionDisplayName,
    isMissingCloudSchema: core.isMissingCloudSchema,
    loadFamilyContext,
    renderGallery: core.renderGallery,
    renderAccountAvatar: shell.actions.renderAccountAvatar,
    renderSettingsSummary: shell.actions.renderSettingsSummary,
    renderPhotoComments: shell.actions.renderPhotoComments,
    saveCachedAvatarUrl: shell.actions.saveCachedAvatarUrl,
  });

  const secretPinController = createSecretPinController({
    elements,
    pinKey: config.secretPinKey,
    unlockKey: config.secretUnlockKey,
    maxUnlockMs: config.secretUnlockMaxMs,
    getSession: () => state.session,
    openSecretPage: () => core.switchPage("secret", { skipSecretGate: true }),
  });

  const actions = Object.freeze({
    ...gamificationController,
    ...accountSyncController,
    ...profilePreferencesController,
    ...secretPinController,
    isSecretUnlocked: secretPinController.isUnlocked,
    markSecretLeft: secretPinController.markLeft,
    openSecretPinDialog: secretPinController.openDialog,
    openSecretPinSettings: secretPinController.openSettings,
    updateCloudSyncStatus,
    appLifecycleController,
  });

  return Object.freeze({
    appLifecycleController,
    gamificationController,
    accountSyncController,
    profilePreferencesController,
    secretPinController,
    actions,
  });
}
