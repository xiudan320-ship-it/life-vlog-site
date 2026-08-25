import { createFrameScheduler } from "./app-lifecycle.js";
import { stopDiaryMotionVideo } from "./diary-video-layout.js";
import { updateReadMoreHints } from "./diary-gallery-view.js";

export function bindMediaEvents({ elements, state, pageSize, controllers, vlogMode, core }) {
  const els = elements;
  const {
    openRandomMemory,
    updateDiaryBackTopButton,
    isMobileViewport,
  } = core;
  const {
    adjustDiaryViewerZoom,
    applySecretImageZoom,
    beginDialogBackSwipe,
    beginDialogSwipe,
    beginSecretImageTouch,
    cancelDialogBackSwipe,
    cancelDialogSwipe,
    downloadCurrentDiaryImage,
    endSecretImageTouch,
    finishDialogBackSwipe,
    finishDialogSwipe,
    fitSecretViewerImage,
    handleSecretViewerWheel,
    isFittableImageDialogOpen,
    isSecretImageDialogOpen,
    isSecretImageViewerOpen,
    isZoomableImageDialogOpen,
    moveDialogImage,
    moveDialogSwipe,
    moveSecretImageTouch,
    normalizeSecretImageZoom,
    refreshSecretViewerToolbar,
    renderDialogMedia,
    resetSecretImageZoom,
    setSecretViewerStatus,
    zoomImageViewerAt,
  } = controllers.photoViewer;
  const {
    closePhotoDialog,
    unlockDialogBackgroundScroll,
    restoreDialogReturnTarget,
    savePhotoEdit,
    replaceEditingImage,
    startAppendEditingImages,
    handleEditImagePaste,
    deletePhotoFromEditor,
    resetEditImageState,
  } = controllers.photoDetail;
  const {
    createSecretFolder,
    openSecretLinkedDiary,
    renderSecretGallery,
    returnToSecretItem,
    toggleDialogImageFullscreen,
    toggleDiaryImageFullscreen,
  } = controllers.secret;
  const {
    renderGallery,
    updateFilterChips,
    updateDiarySearchUi,
    scheduleGalleryMasonryLayout,
  } = controllers.diaryFeed;
  const {
    savePhotoComment,
    cancelCommentReply,
  } = controllers.social;
  const {
    syncMobileComposerPlacement,
    updateSecretToolbarTop,
  } = controllers.layoutSettings;
  const { openDestination: openPushDestination } = controllers.push;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.dialog.open) {
      event.preventDefault();
      closePhotoDialog();
      return;
    }
    if (isSecretImageDialogOpen() && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      moveDialogImage(event.key === "ArrowLeft" ? -1 : 1, true);
      return;
    }
    if (isSecretImageDialogOpen() && event.key === "Tab") {
      const focusable = [...els.dialog.querySelectorAll(
        'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
      )].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  controllers.diaryComposer.bind();
  els.closeDialog.addEventListener("click", closePhotoDialog);
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) {
      closePhotoDialog();
    }
  });
  els.dialog.addEventListener("close", () => {
    const restoreScroll = state.dialogRestoreScrollY;
    const restorePhotoId = state.dialogRestorePhotoId;
    const restorePhotoTop = state.dialogRestorePhotoTop;
    state.activeDialogPhoto = null;
    state.dialogRandomMode = false;
    state.activeSecretDialogItem = null;
    state.dialogSecretSourceItem = null;
    state.photoComments = [];
    cancelDialogSwipe();
    cancelDialogBackSwipe();
    window.clearTimeout(state.dialogWheelResetTimer);
    state.dialogWheelResetTimer = null;
    state.dialogWheelAccumulator = 0;
    state.dialogWheelLockedUntil = 0;
    resetSecretImageZoom();
    if (els.dialogMedia) {
      els.dialogMedia.scrollTop = 0;
      els.dialogMedia.scrollLeft = 0;
    }
    els.photoCommentsSection.hidden = false;
    document.body.classList.remove("mobile-dialog-open");
    if (els.dialogRandomButton) {
      els.dialogRandomButton.hidden = true;
    }
    if (els.dialogSecretLinkButton) {
      els.dialogSecretLinkButton.hidden = true;
    }
    if (els.dialogSecretReturnButton) {
      els.dialogSecretReturnButton.hidden = true;
    }
    els.photoCommentForm.reset();
    cancelCommentReply();
    els.photoCommentStatus.textContent = "";
    els.dialog.classList.remove("no-comments-dialog", "secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen", "diary-detail-dialog", "diary-image-fullscreen", "weekend-image-dialog", "wish-detail-dialog", "wish-detail-no-image");
    if (els.wishDialogFeedback) {
      els.wishDialogFeedback.hidden = true;
      els.wishDialogFeedback.classList.remove("empty");
      els.wishDialogFeedbackText.textContent = "";
      els.wishDialogCompletedAt.textContent = "";
    }
    if (state.photoDialogBackdrop) state.photoDialogBackdrop.hidden = true;
    document.body.classList.remove("photo-dialog-open");
    unlockDialogBackgroundScroll(restoreScroll);
    state.dialogRestorePhotoId = restorePhotoId;
    state.dialogRestorePhotoTop = restorePhotoTop;
    restoreDialogReturnTarget(restoreScroll);
    state.dialogRestoreScrollY = 0;
    state.dialogRestorePhotoId = "";
    state.dialogRestorePhotoTop = 0;
    state.dialogRestoreSecretImageUrl = "";
    state.dialogRestoreElementTop = 0;
    const returnFocus = state.secretViewerReturnFocus;
    state.secretViewerReturnFocus = null;
    state.secretViewerInfoOpen = false;
    state.dialogImageRequestId += 1;
    els.dialogImage.removeAttribute("src");
    els.dialogImage.hidden = false;
    els.dialogImage.classList.remove("is-loading", "is-load-error");
    if (els.dialogVideo) {
      stopDiaryMotionVideo(els.dialogVideo);
      els.dialogVideo.hidden = true;
    }
    setSecretViewerStatus("");
    window.clearTimeout(state.secretViewerResizeTimer);
    els.dialog.removeAttribute("aria-modal");
    els.dialogImage.style.removeProperty("width");
    els.dialogImage.style.removeProperty("height");
    requestAnimationFrame(() => {
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
  });
  els.photoCommentForm.addEventListener("submit", savePhotoComment);
  els.cancelCommentReply.addEventListener("click", cancelCommentReply);
  els.dialogRandomButton?.addEventListener("click", openRandomMemory);
  els.dialogSecretLinkButton?.addEventListener("click", openSecretLinkedDiary);
  els.dialogSecretReturnButton?.addEventListener("click", returnToSecretItem);
  els.dialogPrev.addEventListener("click", () => moveDialogImage(-1));
  els.dialogNext.addEventListener("click", () => moveDialogImage(1));
  els.dialogDots?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-dialog-dot]");
    if (!button || !state.dialogImages.length) return;
    const nextIndex = Number(button.dataset.dialogDot);
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= state.dialogImages.length) return;
    const previousIndex = state.dialogImageIndex;
    state.dialogImageIndex = nextIndex;
    renderDialogMedia(nextIndex === previousIndex ? 0 : nextIndex > previousIndex ? 1 : -1);
  });
  els.diaryViewerPrev?.addEventListener("click", () => moveDialogImage(-1));
  els.diaryViewerNext?.addEventListener("click", () => moveDialogImage(1));
  els.diaryViewerZoomOut?.addEventListener("click", () => adjustDiaryViewerZoom(-0.25));
  els.diaryViewerZoomIn?.addEventListener("click", () => adjustDiaryViewerZoom(0.25));
  els.diaryViewerFit?.addEventListener("click", resetSecretImageZoom);
  els.diaryViewerRotate?.addEventListener("click", () => {
    if (!els.dialog?.classList.contains("diary-image-fullscreen")) return;
    state.diaryImageRotation = (state.diaryImageRotation + 90) % 360;
    applySecretImageZoom();
  });
  els.diaryViewerDownload?.addEventListener("click", downloadCurrentDiaryImage);
  els.secretViewerPrev?.addEventListener("click", () => moveDialogImage(-1, true));
  els.secretViewerNext?.addEventListener("click", () => moveDialogImage(1, true));
  els.secretViewerZoomOut?.addEventListener("click", () => {
    const rect = els.dialogMedia.getBoundingClientRect();
    zoomImageViewerAt(state.secretImageZoom.scale - 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  els.secretViewerZoomIn?.addEventListener("click", () => {
    const rect = els.dialogMedia.getBoundingClientRect();
    zoomImageViewerAt(state.secretImageZoom.scale + 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  els.secretViewerFit?.addEventListener("click", resetSecretImageZoom);
  els.secretViewerInfo?.addEventListener("click", () => {
    if (!isSecretImageDialogOpen()) return;
    state.secretViewerInfoOpen = !state.secretViewerInfoOpen;
    els.dialog.classList.toggle("secret-viewer-info-open", state.secretViewerInfoOpen);
    refreshSecretViewerToolbar();
  });
  els.dialogMedia.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    if (event.target === els.dialogVideo) return;
    if (
      state.activeSecretDialogItem &&
      isSecretImageViewerOpen() &&
      event.target === els.dialogImage
    ) {
      if (Date.now() >= state.suppressDialogImageClickUntil && state.secretImageZoom.scale > 1.01) {
        event.preventDefault();
        event.stopPropagation();
        resetSecretImageZoom();
      }
      return;
    }
    if (
      isMobileViewport() &&
      isZoomableImageDialogOpen() &&
      event.target === els.dialogImage &&
      state.secretImageZoom.scale > 1.01
    ) {
      if (Date.now() < state.suppressDialogImageClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
      resetSecretImageZoom();
      return;
    }
    if (state.activeSecretDialogItem) {
      if (isSecretImageViewerOpen()) {
        if (event.target === els.dialogMedia && state.secretImageZoom.scale <= 1.01) closePhotoDialog();
      } else if (event.target === els.dialogImage) {
        toggleDialogImageFullscreen();
      }
      return;
    }
    if (state.activeDialogPhoto) {
      toggleDiaryImageFullscreen();
    }
  });
  els.dialogImage.addEventListener("click", (event) => {
    if (state.activeSecretDialogItem && isSecretImageViewerOpen()) {
      event.preventDefault();
      event.stopPropagation();
      if (state.secretImageZoom.scale > 1.01 && Date.now() >= state.suppressDialogImageClickUntil) {
        resetSecretImageZoom();
      }
      return;
    }
    if (state.activeSecretDialogItem && isMobileViewport()) {
      event.preventDefault();
      event.stopPropagation();
      if (state.secretImageZoom.scale > 1.01 && Date.now() >= state.suppressDialogImageClickUntil) {
        resetSecretImageZoom();
      }
      return;
    }
    if (state.activeSecretDialogItem && !isSecretImageViewerOpen()) {
      event.preventDefault();
      event.stopPropagation();
      state.suppressDialogImageClickUntil = 0;
      toggleDialogImageFullscreen();
      return;
    }
    if (!state.activeDialogPhoto || state.activeSecretDialogItem || isMobileViewport()) return;
    event.stopPropagation();
    toggleDiaryImageFullscreen();
  });
  els.dialogExpandImage?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.suppressDialogImageClickUntil = 0;
    if (state.activeSecretDialogItem) {
      toggleDialogImageFullscreen({ bypassSuppression: true });
      return;
    }
    if (state.activeDialogPhoto) toggleDiaryImageFullscreen({ bypassSuppression: true });
  });
  els.dialogImage.addEventListener("dblclick", (event) => {
    if (!isSecretImageViewerOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.secretImageZoom.scale > 1.01) resetSecretImageZoom();
    else zoomImageViewerAt(2, event.clientX, event.clientY);
  });
  els.dialogImage.addEventListener("load", () => {
    if (isFittableImageDialogOpen()) fitSecretViewerImage();
    els.dialogImage.classList.remove("is-loading", "is-load-error");
    setSecretViewerStatus("");
    resetSecretImageZoom();
  });
  els.dialogImage.addEventListener("error", () => {
    if (!isSecretImageViewerOpen()) return;
    els.dialogImage.classList.remove("is-loading");
    els.dialogImage.classList.add("is-load-error");
    setSecretViewerStatus("error", "图片加载失败，请稍后重试");
  });
  els.dialogMedia.addEventListener("touchstart", beginSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("touchmove", moveSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("touchend", endSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("touchcancel", endSecretImageTouch, { passive: false });
  els.dialogMedia.addEventListener("wheel", handleSecretViewerWheel, { passive: false });
  els.dialog.addEventListener("pointerdown", beginDialogBackSwipe, true);
  els.dialog.addEventListener("pointerup", finishDialogBackSwipe, true);
  els.dialog.addEventListener("pointercancel", cancelDialogBackSwipe, true);
  els.dialog.addEventListener("lostpointercapture", cancelDialogBackSwipe, true);
  els.dialogMedia.addEventListener("pointerdown", beginDialogSwipe);
  els.dialogMedia.addEventListener("pointermove", moveDialogSwipe);
  els.dialogMedia.addEventListener("pointerup", finishDialogSwipe);
  els.dialogMedia.addEventListener("pointercancel", cancelDialogSwipe);
  els.dialogMedia.addEventListener("lostpointercapture", cancelDialogSwipe);
  window.addEventListener("resize", () => {
    if (!isZoomableImageDialogOpen()) return;
    window.clearTimeout(state.secretViewerResizeTimer);
    state.secretViewerResizeTimer = window.setTimeout(() => {
      fitSecretViewerImage();
      state.secretImageZoom = normalizeSecretImageZoom(state.secretImageZoom);
      applySecretImageZoom();
    }, 120);
  });
  els.editForm.addEventListener("submit", savePhotoEdit);
  els.editImageInput.addEventListener("change", replaceEditingImage);
  els.addEditImageButton?.addEventListener("click", startAppendEditingImages);
  els.editMediaManager?.addEventListener("paste", handleEditImagePaste);
  els.deleteEditingPhoto.addEventListener("click", deletePhotoFromEditor);
  els.closeEditDialog.addEventListener("click", () => {
    state.editingPhoto = null;
    resetEditImageState();
    els.editDialog.close();
  });
  els.closeVipDialog.addEventListener("click", () => els.vipDialog.close());
  els.chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      vlogMode.close();
      state.activeFilter = chip.dataset.filter;
      state.visiblePhotoCount = pageSize;
      updateFilterChips();
      renderGallery();
    });
  });
  els.diarySearchInput?.addEventListener("input", () => {
    state.diarySearchQuery = els.diarySearchInput.value;
    state.visiblePhotoCount = pageSize;
    updateDiarySearchUi();
    renderGallery();
  });
  els.secretSearchInput?.addEventListener("input", () => {
    state.secretSearchQuery = els.secretSearchInput.value;
    renderSecretGallery();
  });
  els.secretCreateFolderButton?.addEventListener("click", createSecretFolder);
  els.clearDiarySearch?.addEventListener("click", () => {
    state.diarySearchQuery = "";
    state.visiblePhotoCount = pageSize;
    updateDiarySearchUi();
    renderGallery();
    els.diarySearchInput?.focus();
  });
  const scheduleViewportLayout = createFrameScheduler(() => {
    syncMobileComposerPlacement();
    window.clearTimeout(updateReadMoreHints.resizeTimer);
    updateReadMoreHints.resizeTimer = window.setTimeout(() => updateReadMoreHints(els.gallery), 120);
    scheduleGalleryMasonryLayout();
    updateSecretToolbarTop();
    updateDiaryBackTopButton();
  });
  const scheduleScrollUiUpdate = createFrameScheduler(() => {
    updateSecretToolbarTop();
    updateDiaryBackTopButton();
  });
  window.addEventListener("resize", scheduleViewportLayout, { passive: true });
  window.addEventListener("scroll", scheduleScrollUiUpdate, { passive: true });
  
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "OPEN_PUSH_NOTIFICATION") {
      void openPushDestination(event.data.data || {});
    }
  });
}
