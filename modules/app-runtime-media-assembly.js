import { createPhotoDetailController } from "./photo-detail-controller.js";
import { createRuntimeStateView } from "./app-runtime-state.js";

const MEDIA_STATE_NAMES = [
  "cloudDb",
  "session",
  "accountProfile",
  "activePage",
  "activeWishView",
  "photos",
  "secretItems",
  "secretFolders",
  "secretCloudAvailable",
  "activeDialogPhoto",
  "secretLoadPromise",
  "lastSecretSyncAt",
  "dialogRestoreScrollY",
  "dialogRestorePhotoId",
  "dialogRestorePhotoTop",
  "dialogRestoreSecretImageUrl",
  "dialogRestoreElementTop",
  "activeFilter",
  "visiblePhotoCount",
  "diarySearchQuery",
  "activeSecretFilter",
  "activeSecretAlbumId",
  "activeSecretFolderId",
  "secretDefaultFolderId",
  "secretFolderContextMenu",
  "secretAlbumContextMenu",
  "secretSearchQuery",
  "secretSelectionMode",
  "selectedSecretImageIndexes",
  "secretAlbumEditing",
  "secretAppendExpanded",
  "secretMobileToolsExpanded",
  "dialogImages",
  "dialogImageIndex",
  "dialogImageRequestId",
  "dialogSwipeStart",
  "desktopImagePan",
  "dialogBackSwipeStart",
  "secretImageGesture",
  "secretImageZoom",
  "diaryImageRotation",
  "secretViewerReturnFocus",
  "secretViewerInfoOpen",
  "secretViewerResizeTimer",
  "suppressDialogImageClickUntil",
  "suppressDialogSwipeUntil",
  "dialogWheelAccumulator",
  "dialogWheelResetTimer",
  "dialogWheelLockedUntil",
  "lockedDialogScrollY",
  "dialogLockUsesFixed",
  "dialogRandomMode",
  "dialogSecretSourceItem",
  "activeSecretDialogItem",
  "familyMemberMap",
  "mobileDiaryPhoto",
  "mobileDiaryPage",
  "mobileDiaryRestoreScrollY",
  "mobileDiaryImageIndex",
  "mobileDiaryReplyToId",
  "mobileDiaryBackSwipeStart",
  "mobileDiaryImageSwipeStart",
  "mobileDiarySuppressImageClickUntil",
  "photoComments",
  "editingPhoto",
  "editingImages",
  "editingImageFiles",
  "editingRemovedPaths",
  "editingReplaceIndex",
  "editingPreviewUrls",
  "photoDialogBackdrop",
  "mobileDiaryImageViewerOpen",
];

export function createMediaRuntimeState(state) {
  return createRuntimeStateView(state, MEDIA_STATE_NAMES);
}

/**
 * Assemble the photo viewer/detail pair. They intentionally share a small
 * bridge because the viewer opens and closes detail dialogs, while detail
 * delegates media rendering and zoom state to the viewer.
 */
export function createMediaControllerAssembly({ elements, state, dependencies, hooks }) {
  const {
    isMobileViewport,
    getSecretAlbumFilterTags,
    deleteSecretDialogImage,
    updateSecretDialogImage,
    acknowledgeViewedDiary,
    adminUpdatePhotoCategory,
    awardExperience,
    deletePhotoComment,
    getAuthorName,
    getCurrentImageLimit,
    getDisplayTitle,
    getPhotoImages,
    getPlainNote,
    isAdminAccount,
    isFavoritePhoto,
    isMissingCloudSchema,
    loadPhotoCommentPreviews,
    loadPhotoComments,
    loadPhotos,
    renderAvatarMarkup,
    setGlobalStatus,
    switchPage,
    toDateInputValue,
    togglePhotoFavorite,
    togglePhotoFlag,
  } = dependencies;
  let detailActions = {};
  let photoViewerInstance = null;
  let photoViewerPromise = null;
  const viewerMethods = [
    "isSecretImageDialogOpen",
    "isSecretImageViewerOpen",
    "isZoomableImageDialogOpen",
    "isFittableImageDialogOpen",
    "applySecretImageZoom",
    "refreshDiaryViewerToolbar",
    "refreshSecretViewerToolbar",
    "setSecretViewerStatus",
    "fitSecretViewerImage",
    "normalizeSecretImageZoom",
    "zoomImageViewerAt",
    "resetSecretImageZoom",
    "adjustDiaryViewerZoom",
    "downloadCurrentDiaryImage",
    "beginSecretImageTouch",
    "moveSecretImageTouch",
    "endSecretImageTouch",
    "handleSecretViewerWheel",
    "preloadDialogNeighbors",
    "renderDialogMedia",
    "renderSecretDialogControls",
    "bindSecretDialogControls",
    "moveDialogImage",
    "beginDialogSwipe",
    "moveDialogSwipe",
    "finishDialogSwipe",
    "cancelDialogSwipe",
    "beginDialogBackSwipe",
    "finishDialogBackSwipe",
    "cancelDialogBackSwipe",
  ];
  const syncViewerMethods = new Set([
    "isSecretImageDialogOpen",
    "isSecretImageViewerOpen",
    "isZoomableImageDialogOpen",
    "isFittableImageDialogOpen",
  ]);
  function loadPhotoViewer() {
    if (photoViewerPromise) return photoViewerPromise;
    photoViewerPromise = import("./photo-viewer-controller.js")
      .then(({ createPhotoViewerController }) => {
        photoViewerInstance = createPhotoViewerController({
          elements,
          state,
          isMobileViewport,
          closePhotoDialog: (...args) => detailActions.closePhotoDialog?.(...args),
          getSecretAlbumFilterTags: (...args) => getSecretAlbumFilterTags?.(...args),
          deleteSecretDialogImage: (...args) => deleteSecretDialogImage?.(...args),
          updateSecretDialogImage: (...args) => updateSecretDialogImage?.(...args),
        });
        return photoViewerInstance;
      })
      .catch((error) => {
        photoViewerPromise = null;
        throw error;
      });
    return photoViewerPromise;
  }
  const viewerActions = Object.freeze(Object.fromEntries(viewerMethods.map((method) => [
    method,
    (...args) => {
      if (syncViewerMethods.has(method)) return photoViewerInstance?.[method]?.(...args) || false;
      return loadPhotoViewer().then((controller) => controller[method](...args));
    },
  ])));
  const photoViewerController = viewerActions;
  const photoDetailController = createPhotoDetailController({
    elements,
    state,
    repository: dependencies.diaryRepository,
    assets: dependencies.assetController,
    acknowledgeViewedDiary,
    adminUpdatePhotoCategory,
    awardExperience,
    deletePhotoComment: (...args) => deletePhotoComment?.(...args),
    getAuthorName,
    getCurrentImageLimit,
    getDisplayTitle,
    getPhotoImages,
    getPlainNote,
    isAdminAccount,
    isFavoritePhoto,
    isMissingCloudSchema,
    isMobileViewport,
    loadPhotoCommentPreviews,
    loadPhotoComments: (...args) => loadPhotoComments?.(...args),
    loadPhotos,
    renderAvatarMarkup,
    renderDialogMedia: viewerActions.renderDialogMedia,
    resetSecretImageZoom: viewerActions.resetSecretImageZoom,
    setGlobalStatus,
    switchPage,
    toDateInputValue,
    togglePhotoFavorite,
    togglePhotoFlag,
    deletePhoto: (...args) => hooks.deletePhoto?.(...args),
  });
  detailActions = photoDetailController;
  return Object.freeze({
    photoViewerController,
    photoDetailController,
    actions: Object.freeze({ ...viewerActions, ...detailActions }),
  });
}
