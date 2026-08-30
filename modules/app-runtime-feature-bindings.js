/**
 * Normalize feature-controller outputs for the runtime graph.
 *
 * Feature controllers own their domain actions. This module only exposes the
 * small set of cross-runtime bridges needed by shell, media, and startup
 * assembly, keeping the core assembler free of feature-specific destructuring.
 */
export function createFeatureRuntimeBindings(featureRuntime) {
  const {
    secretActions,
    familySettingsActions,
    dataSafetyActions,
    trashActions,
    diaryComposerActions,
    offlineCacheActions,
    foodWheelActions,
    pushActions,
    anniversaryActions,
    gratitudeActions,
  } = featureRuntime;

  return Object.freeze({
    secret: Object.freeze({
      renderSecretFolderControls: secretActions.renderSecretFolderControls,
    }),
    familySettings: Object.freeze({
      openSettingsChildDialog: familySettingsActions.openSettingsChildDialog,
      reopenSettingsAfterChildDialog: familySettingsActions.reopenSettingsAfterChildDialog,
    }),
    dataSafety: Object.freeze({
      renderUploadCenter: dataSafetyActions.renderUploadCenter,
    }),
    trash: Object.freeze({
      createTrashItem: trashActions.createTrashItem,
      rollbackTrashItem: trashActions.rollbackTrashItem,
      deletePhoto: trashActions.deletePhoto,
    }),
    diaryComposer: Object.freeze({
      processDiaryUploadQueue: diaryComposerActions.processDiaryUploadQueue,
      setUploadExpanded: diaryComposerActions.setUploadExpanded,
    }),
    offlineCache: Object.freeze({
      loadCacheCapacityMb: offlineCacheActions.loadCacheCapacityMb,
      loadMediaCachePolicy: offlineCacheActions.loadMediaCachePolicy,
      refreshCacheInfo: offlineCacheActions.refreshCacheInfo,
      savePhotoFeedCache: offlineCacheActions.savePhotoFeedCache,
    }),
    foodWheel: Object.freeze({
      renderFoodWheel: foodWheelActions.renderFoodWheel,
      loadFoodOptions: foodWheelActions.loadFoodOptions,
      saveFoodOptionsCache: foodWheelActions.saveFoodOptionsCache,
    }),
    push: Object.freeze({
      syncExistingPushSubscription: pushActions.syncExistingPushSubscription,
      registerAppShellWorker: pushActions.registerAppShellWorker,
    }),
    anniversary: Object.freeze({
      synchronizeAnniversaries: anniversaryActions.synchronizeAnniversaries,
    }),
    gratitude: Object.freeze({
      renderGratitudeNotes: gratitudeActions.renderGratitudeNotes,
      saveThanksColorPreference: gratitudeActions.saveThanksColorPreference,
      loadThanksColor: gratitudeActions.loadThanksColor,
      setSelectedThanksColor: gratitudeActions.setSelectedThanksColor,
    }),
  });
}
