import { stopDiaryMotionVideo } from "./diary-video-layout.js";
import { formatDate, formatDateTime } from "./ui-formatters.js";
import { formatWishDate } from "./wishlist-view.js";

export function createPhotoDetailController({
  elements,
  state,
  repository,
  assets,
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
  isMobileViewport,
  loadPhotoCommentPreviews,
  loadPhotoComments,
  loadPhotos,
  renderAvatarMarkup,
  renderDialogMedia,
  resetSecretImageZoom,
  resumeDiaryFeedMotion,
  setGlobalStatus,
  switchPage,
  stopDiaryFeedMotion,
  toDateInputValue,
  togglePhotoFavorite,
  togglePhotoFlag,
  deletePhoto,
}) {
  const els = elements;
  const cssEscapeValue = (value) => CSS.escape(String(value || ""));
  let photoEditorController = null;
  let photoEditorPromise = null;
  let mobileDiaryController = null;
  let mobileDiaryPromise = null;
  let dialogOpenToken = 0;

  const photoEditorOptions = {
    elements,
    state,
    repository,
    assets,
    awardExperience,
    deletePhoto,
    getCurrentImageLimit,
    getDisplayTitle,
    getPhotoImages,
    getPlainNote,
    loadPhotos,
    setGlobalStatus,
    toDateInputValue,
  };
  const mobileDiaryOptions = {
    elements,
    state,
    repository,
    acknowledgeViewedDiary,
    adminUpdatePhotoCategory,
    awardExperience,
    deletePhoto,
    deletePhotoComment,
    getAuthorName,
    getDisplayTitle,
    getPhotoImages,
    getPlainNote,
    isAdminAccount,
    isFavoritePhoto,
    isMissingCloudSchema,
    isMobileViewport,
    loadPhotoCommentPreviews,
    loadPhotoComments,
    openEditPhoto: (...args) => openEditPhoto(...args),
    openMobileDiaryImageViewer,
    renderAvatarMarkup,
    switchPage,
    togglePhotoFavorite,
    togglePhotoFlag,
  };

  function loadPhotoEditor() {
    if (photoEditorPromise) return photoEditorPromise;
    photoEditorPromise = import("./photo-editor-controller.js")
      .then(({ createPhotoEditorController }) => {
        photoEditorController = createPhotoEditorController(photoEditorOptions);
        return photoEditorController;
      })
      .catch((error) => {
        photoEditorPromise = null;
        throw error;
      });
    return photoEditorPromise;
  }

  function loadMobileDiaryController() {
    if (mobileDiaryPromise) return mobileDiaryPromise;
    mobileDiaryPromise = import("./mobile-diary-controller.js")
      .then(({ createMobileDiaryController }) => {
        mobileDiaryController = createMobileDiaryController(mobileDiaryOptions);
        return mobileDiaryController;
      })
      .catch((error) => {
        mobileDiaryPromise = null;
        throw error;
      });
    return mobileDiaryPromise;
  }

  function callPhotoEditor(method, ...args) {
    return loadPhotoEditor().then((controller) => {
      const action = controller?.[method];
      if (typeof action !== "function") throw new Error(`Unknown photo editor action: ${method}`);
      return action(...args);
    });
  }

  function callMobileDiary(method, ...args) {
    return loadMobileDiaryController().then((controller) => {
      const action = controller?.[method];
      if (typeof action !== "function") throw new Error(`Unknown mobile diary action: ${method}`);
      return action(...args);
    });
  }

  function openEditPhoto(...args) { return callPhotoEditor("openEditPhoto", ...args); }
  function savePhotoEdit(...args) { return callPhotoEditor("savePhotoEdit", ...args); }
  function renderEditImages(...args) { return callPhotoEditor("renderEditImages", ...args); }
  function getEditPreviewUrl(...args) { return callPhotoEditor("getEditPreviewUrl", ...args); }
  function replaceEditingImage(...args) { return callPhotoEditor("replaceEditingImage", ...args); }
  function appendEditingImageFiles(...args) { return callPhotoEditor("appendEditingImageFiles", ...args); }
  function startAppendEditingImages(...args) { return callPhotoEditor("startAppendEditingImages", ...args); }
  function handleEditImagePaste(...args) { return callPhotoEditor("handleEditImagePaste", ...args); }
  function removeEditingImage(...args) { return callPhotoEditor("removeEditingImage", ...args); }
  function resetEditImageState(...args) {
    if (!photoEditorController) return false;
    return photoEditorController.resetEditImageState(...args);
  }
  function deletePhotoFromEditor(...args) { return callPhotoEditor("deletePhotoFromEditor", ...args); }

  function ensureMobileDiaryPage(...args) { return callMobileDiary("ensureMobileDiaryPage", ...args); }
  function renderMobileDiaryComments(...args) {
    if (!mobileDiaryController && (!state.mobileDiaryPhoto || !isMobileViewport())) return false;
    return callMobileDiary("renderMobileDiaryComments", ...args);
  }
  function renderMobileDiaryPage(...args) {
    if (!mobileDiaryController && (!state.mobileDiaryPhoto || !isMobileViewport())) return false;
    return callMobileDiary("renderMobileDiaryPage", ...args);
  }
  function moveMobileDiaryImage(...args) { return callMobileDiary("moveMobileDiaryImage", ...args); }
  function openMobileDiaryPage(...args) { return callMobileDiary("openMobileDiaryPage", ...args); }
  function closeMobileDiaryPage(...args) {
    if (!mobileDiaryController) return false;
    return callMobileDiary("closeMobileDiaryPage", ...args);
  }
  function startMobileDiaryReply(...args) { return callMobileDiary("startMobileDiaryReply", ...args); }
  function cancelMobileDiaryReply(...args) { return callMobileDiary("cancelMobileDiaryReply", ...args); }
  function saveMobileDiaryComment(...args) { return callMobileDiary("saveMobileDiaryComment", ...args); }
  function beginMobileDiaryBackSwipe(...args) { return callMobileDiary("beginMobileDiaryBackSwipe", ...args); }
  function moveMobileDiaryBackSwipe(...args) { return callMobileDiary("moveMobileDiaryBackSwipe", ...args); }
  function endMobileDiaryBackSwipe(...args) { return callMobileDiary("endMobileDiaryBackSwipe", ...args); }
  function cancelMobileDiaryBackSwipe(...args) { return callMobileDiary("cancelMobileDiaryBackSwipe", ...args); }
  function beginMobileDiaryImageSwipe(...args) { return callMobileDiary("beginMobileDiaryImageSwipe", ...args); }
  function moveMobileDiaryImageSwipe(...args) { return callMobileDiary("moveMobileDiaryImageSwipe", ...args); }
  function cancelMobileDiaryImageSwipe(...args) { return callMobileDiary("cancelMobileDiaryImageSwipe", ...args); }
  function endMobileDiaryImageSwipe(...args) { return callMobileDiary("endMobileDiaryImageSwipe", ...args); }
  function canStartGlobalMobileBackSwipe(...args) {
    return mobileDiaryController?.canStartGlobalMobileBackSwipe?.(...args) || false;
  }
  function performGlobalMobileBack(...args) {
    if (!isMobileViewport()) return false;
    return callMobileDiary("performGlobalMobileBack", ...args);
  }
  function beginGlobalMobileBackSwipe(...args) {
    if (!isMobileViewport()) return false;
    return callMobileDiary("beginGlobalMobileBackSwipe", ...args);
  }
  function moveGlobalMobileBackSwipe(...args) {
    if (!isMobileViewport()) return false;
    return callMobileDiary("moveGlobalMobileBackSwipe", ...args);
  }
  function finishGlobalMobileBackSwipe(...args) {
    if (!isMobileViewport()) return false;
    return callMobileDiary("finishGlobalMobileBackSwipe", ...args);
  }
  function cancelGlobalMobileBackSwipe(...args) {
    if (!isMobileViewport()) return false;
    return callMobileDiary("cancelGlobalMobileBackSwipe", ...args);
  }

  function lockDialogBackgroundScroll(scrollY = window.scrollY || window.pageYOffset || 0) {
    state.lockedDialogScrollY = Math.max(0, Number(scrollY) || 0);
    state.dialogLockUsesFixed = isMobileViewport();
    if (!state.dialogLockUsesFixed) return;
    document.documentElement.classList.add("dialog-scroll-locked");
    document.body.classList.add("dialog-scroll-locked");
    document.body.classList.add("dialog-scroll-fixed");
    document.body.style.top = `-${state.lockedDialogScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  
  function unlockDialogBackgroundScroll(restoreScroll = state.lockedDialogScrollY) {
    const nextScroll = Math.max(0, Number(restoreScroll) || state.lockedDialogScrollY || 0);
    const shouldRestore = state.dialogLockUsesFixed;
    document.documentElement.classList.remove("dialog-scroll-locked");
    document.body.classList.remove("dialog-scroll-locked");
    document.body.classList.remove("dialog-scroll-fixed");
    document.body.style.removeProperty("top");
    document.body.style.removeProperty("left");
    document.body.style.removeProperty("right");
    document.body.style.removeProperty("width");
    state.lockedDialogScrollY = 0;
    state.dialogLockUsesFixed = false;
    if (shouldRestore) {
      window.scrollTo({ top: nextScroll, behavior: "auto" });
    }
  }
  
  function ensurePhotoDialogBackdrop() {
    if (state.photoDialogBackdrop) return state.photoDialogBackdrop;
    state.photoDialogBackdrop = document.createElement("div");
    state.photoDialogBackdrop.className = "photo-dialog-backdrop";
    state.photoDialogBackdrop.hidden = true;
    state.photoDialogBackdrop.addEventListener("click", closePhotoDialog);
    state.photoDialogBackdrop.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
    document.body.append(state.photoDialogBackdrop);
    return state.photoDialogBackdrop;
  }
  
  function closePhotoDialog() {
    dialogOpenToken += 1;
    if (state.mobileDiaryImageViewerOpen) {
      closeMobileDiaryImageViewer();
      return;
    }
    if (state.mobileDiaryPage && !state.mobileDiaryPage.hidden) {
      closeMobileDiaryPage();
      resumeDiaryFeedMotion?.();
      return;
    }
    if (els.dialog?.classList.contains("diary-image-fullscreen")) {
      els.dialog.classList.remove("diary-image-fullscreen");
      resetSecretImageZoom();
      els.dialog.scrollTop = 0;
      return;
    }
    if (!els.dialog.open) {
      resumeDiaryFeedMotion?.();
      return;
    }
    const returnToWeekendAlbum = els.dialog.classList.contains("weekend-image-dialog");
    els.dialog.removeAttribute("open");
    ensurePhotoDialogBackdrop().hidden = true;
    document.body.classList.remove("photo-dialog-open");
    els.dialog.dispatchEvent(new Event("close"));
    if (returnToWeekendAlbum) document.dispatchEvent(new Event("weekend-album-lightbox-closed"));
    resumeDiaryFeedMotion?.();
  }
  
  function openMobileDiaryImageViewer() {
    if (!state.mobileDiaryPhoto) return;
    state.mobileDiaryImageViewerOpen = true;
    resetSecretImageZoom();
    if (state.mobileDiaryPage) state.mobileDiaryPage.hidden = true;
    state.activeDialogPhoto = state.mobileDiaryPhoto;
    state.activeSecretDialogItem = null;
    state.dialogImages = getPhotoImages(state.mobileDiaryPhoto);
    state.dialogImageIndex = Math.min(Math.max(0, state.mobileDiaryImageIndex), Math.max(0, state.dialogImages.length - 1));
    els.dialog.className = "no-comments-dialog mobile-diary-image-viewer";
    els.dialogTitle.textContent = getDisplayTitle(state.mobileDiaryPhoto) || "日记图片";
    els.dialogMeta.textContent = `${state.dialogImageIndex + 1} / ${state.dialogImages.length}`;
    els.dialogNote.textContent = "";
    els.photoCommentsSection.hidden = true;
    if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
    if (els.dialogSecretReturnButton) els.dialogSecretReturnButton.hidden = true;
    if (els.dialogSecretLinkButton) els.dialogSecretLinkButton.hidden = true;
    renderDialogMedia();
    ensurePhotoDialogBackdrop().hidden = true;
    els.dialog.setAttribute("open", "");
  }
  
  function closeMobileDiaryImageViewer() {
    if (!state.mobileDiaryImageViewerOpen) return;
    state.mobileDiaryImageViewerOpen = false;
    resetSecretImageZoom();
    state.mobileDiaryImageIndex = state.dialogImageIndex;
    els.dialog.removeAttribute("open");
    els.dialog.classList.remove("mobile-diary-image-viewer", "no-comments-dialog");
    els.dialogImage.hidden = false;
    if (els.dialogVideo) {
      stopDiaryMotionVideo(els.dialogVideo);
      els.dialogVideo.hidden = true;
    }
    els.dialogImage.style.transform = "";
    els.dialogMedia?.classList.remove("is-zoomed");
    document.body.classList.remove("photo-dialog-open", "mobile-dialog-open");
    if (state.photoDialogBackdrop) state.photoDialogBackdrop.hidden = true;
    if (state.mobileDiaryPage) {
      state.mobileDiaryPage.hidden = false;
      renderMobileDiaryPage();
    }
  }
  
  function showPhotoDialogPreservingScroll() {
    const restoreScroll = state.dialogRestoreScrollY;
    ensurePhotoDialogBackdrop().hidden = false;
    document.body.classList.add("photo-dialog-open");
    if (!els.dialog.open) els.dialog.setAttribute("open", "");
    if (!state.dialogLockUsesFixed && Math.abs((window.scrollY || window.pageYOffset || 0) - restoreScroll) > 2) {
      window.scrollTo({ top: restoreScroll, behavior: "auto" });
    }
  }
  
  function captureDialogReturnTarget(photo) {
    state.dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
    state.dialogRestorePhotoId = photo?.id || "";
    state.dialogRestorePhotoTop = 0;
    state.dialogRestoreSecretImageUrl = "";
    state.dialogRestoreElementTop = 0;
    if (!state.dialogRestorePhotoId || !els.gallery) return;
    const card = els.gallery.querySelector(`[data-photo-id="${cssEscapeValue(state.dialogRestorePhotoId)}"]`);
    if (card) {
      state.dialogRestorePhotoTop = card.getBoundingClientRect().top;
    }
  }
  
  function restoreDialogReturnTarget(restoreScroll = state.dialogRestoreScrollY) {
    const photoId = state.dialogRestorePhotoId;
    const cardTop = state.dialogRestorePhotoTop;
    const secretImageUrl = state.dialogRestoreSecretImageUrl;
    const secretImageTop = state.dialogRestoreElementTop;
    const fallback = Math.max(0, Number(restoreScroll) || 0);
    const restore = () => {
      if (secretImageUrl && els.secretGallery) {
        const image = [...els.secretGallery.querySelectorAll(".secret-album-photo img[data-full-src]")]
          .find((entry) => entry.dataset.fullSrc === secretImageUrl);
        const tile = image?.closest(".secret-album-photo");
        if (tile) {
          const target = Math.max(
            0,
            (window.scrollY || window.pageYOffset || 0) + tile.getBoundingClientRect().top - secretImageTop
          );
          window.scrollTo({ top: target, behavior: "auto" });
          return;
        }
      }
      if (!photoId || !els.gallery) {
        window.scrollTo({ top: fallback, behavior: "auto" });
        return;
      }
      const card = els.gallery.querySelector(`[data-photo-id="${cssEscapeValue(photoId)}"]`);
      if (!card) {
        window.scrollTo({ top: fallback, behavior: "auto" });
        return;
      }
      const currentTop = card.getBoundingClientRect().top;
      const target = Math.max(0, (window.scrollY || window.pageYOffset || 0) + currentTop - cardTop);
      window.scrollTo({ top: target, behavior: "auto" });
    };
    requestAnimationFrame(() => {
      restore();
      window.setTimeout(restore, 80);
    });
  }
  
  async function openPhoto(photo, initialImageIndex = 0, options = {}) {
    stopDiaryFeedMotion?.();
    if (isMobileViewport() && !options.forceDialog) {
      openMobileDiaryPage(photo, initialImageIndex, options);
      return;
    }
    const openToken = ++dialogOpenToken;
    captureDialogReturnTarget(photo);
    lockDialogBackgroundScroll(state.dialogRestoreScrollY);
    state.activeDialogPhoto = photo;
    state.dialogRandomMode = Boolean(options.randomMode);
    state.activeSecretDialogItem = null;
    state.dialogSecretSourceItem = options.secretSourceItem || null;
    els.dialog.classList.remove("no-comments-dialog", "secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen", "diary-detail-dialog", "diary-image-fullscreen", "wish-detail-dialog", "wish-detail-no-image");
    els.dialog.classList.add("diary-detail-dialog");
    if (els.wishDialogFeedback) {
      els.wishDialogFeedback.hidden = true;
      els.wishDialogFeedback.classList.remove("empty");
      els.wishDialogFeedbackText.textContent = "";
      els.wishDialogCompletedAt.textContent = "";
    }
    if (photo.id) void acknowledgeViewedDiary(photo.id);
    els.photoCommentsSection.hidden = false;
    const displayTitle = getDisplayTitle(photo);
    state.dialogImages = getPhotoImages(photo);
    state.dialogImageIndex = Math.min(
      Math.max(0, Number(initialImageIndex) || 0),
      Math.max(0, state.dialogImages.length - 1)
    );
    els.dialogTitle.textContent = displayTitle || "日记";
    els.dialogMeta.textContent = `${photo.category || "日常"} · ${formatDateTime(photo.created_at)} · ${getAuthorName(photo.user_id)}`;
    els.dialogNote.textContent = getPlainNote(photo);
    if (els.dialogRandomButton) {
      els.dialogRandomButton.hidden = !state.dialogRandomMode;
    }
    if (els.dialogSecretLinkButton) {
      els.dialogSecretLinkButton.hidden = true;
    }
    if (els.dialogSecretReturnButton) {
      els.dialogSecretReturnButton.hidden = !state.dialogSecretSourceItem;
    }
    try {
      await renderDialogMedia();
    } catch {
      if (openToken === dialogOpenToken) setGlobalStatus("图片查看器加载失败，请重试。");
      return;
    }
    if (openToken !== dialogOpenToken || state.activeDialogPhoto !== photo) return;
    void loadPhotoComments(photo.id);
    if (isMobileViewport()) {
      els.dialog.classList.add("mobile-page-dialog");
      document.body.classList.add("mobile-dialog-open");
    } else {
      document.body.classList.remove("mobile-dialog-open");
    }
    showPhotoDialogPreservingScroll();
  }
  
  async function openWishImage(wish) {
    if (!wish) return;
    const openToken = ++dialogOpenToken;
    state.dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
    state.dialogRestorePhotoId = "";
    state.dialogRestorePhotoTop = 0;
    state.dialogRestoreSecretImageUrl = "";
    state.dialogRestoreElementTop = 0;
    lockDialogBackgroundScroll(state.dialogRestoreScrollY);
    state.activeDialogPhoto = null;
    state.dialogRandomMode = false;
    state.activeSecretDialogItem = null;
    state.dialogSecretSourceItem = null;
    els.dialog.classList.remove("mobile-page-dialog", "secret-image-dialog", "secret-image-fullscreen", "diary-detail-dialog", "diary-image-fullscreen", "wish-detail-no-image");
    els.dialog.classList.add("no-comments-dialog", "wish-detail-dialog");
    document.body.classList.remove("mobile-dialog-open");
    state.photoComments = [];
    state.dialogImages = wish.imageUrl ? [{ image_url: wish.imageUrl }] : [];
    state.dialogImageIndex = 0;
    els.dialog.classList.toggle("wish-detail-no-image", !wish.imageUrl);
    els.dialogTitle.textContent = wish.title || "心愿";
    els.dialogMeta.textContent = `${wish.type || "心愿"} · ${wish.priority || "普通"} · ${getAuthorName(wish.userId)} 发布`;
    els.dialogNote.textContent = wish.note || "";
    if (els.wishDialogFeedback) {
      els.wishDialogFeedback.hidden = !wish.done;
      els.wishDialogCompletedAt.textContent = wish.completedAt ? `完成于 ${formatWishDate(wish.completedAt)}` : "已经完成";
      els.wishDialogFeedbackText.textContent = wish.completionNote || "这个心愿已经完成，还没有留下完成感想。";
      els.wishDialogFeedback.classList.toggle("empty", !wish.completionNote);
    }
    if (els.dialogRandomButton) {
      els.dialogRandomButton.hidden = true;
    }
    els.photoCommentsSection.hidden = true;
    try {
      await renderDialogMedia();
    } catch {
      if (openToken === dialogOpenToken) setGlobalStatus("图片查看器加载失败，请重试。");
      return;
    }
    if (openToken !== dialogOpenToken || state.activeDialogPhoto !== null) return;
    els.dialog.scrollTop = 0;
    showPhotoDialogPreservingScroll();
  }
  
  async function openWeekendImageGallery(plan, initialIndex = 0, kind = "plan") {
    const galleryImages = kind === "completion" ? plan?.completionImages : plan?.images;
    if (!galleryImages?.length) return;
    const openToken = ++dialogOpenToken;
    state.dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
    lockDialogBackgroundScroll(state.dialogRestoreScrollY);
    state.activeDialogPhoto = null;
    state.activeSecretDialogItem = null;
    state.dialogSecretSourceItem = null;
    els.dialog.classList.remove("mobile-page-dialog", "secret-image-dialog", "secret-image-fullscreen");
    els.dialog.classList.add("no-comments-dialog", "weekend-image-dialog");
    state.dialogImages = galleryImages;
    state.dialogImageIndex = Math.max(0, Math.min(initialIndex, state.dialogImages.length - 1));
    els.dialogTitle.textContent = kind === "completion" ? `${plan.title || "周末"} · 完成回顾` : plan.title || "周末场景";
    els.dialogMeta.textContent = `${formatDate(plan.date)} · ${getAuthorName(plan.userId)}`;
    els.dialogNote.textContent = kind === "completion" ? plan.completionNote || "" : plan.note || "";
    els.photoCommentsSection.hidden = true;
    if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
    try {
      await renderDialogMedia();
    } catch {
      if (openToken === dialogOpenToken) setGlobalStatus("图片查看器加载失败，请重试。");
      return;
    }
    if (openToken !== dialogOpenToken || state.activeDialogPhoto !== null) return;
    showPhotoDialogPreservingScroll();
  }
  
  
  return {
    lockDialogBackgroundScroll,
    unlockDialogBackgroundScroll,
    ensurePhotoDialogBackdrop,
    closePhotoDialog,
    openMobileDiaryImageViewer,
    closeMobileDiaryImageViewer,
    showPhotoDialogPreservingScroll,
    captureDialogReturnTarget,
    restoreDialogReturnTarget,
    ensureMobileDiaryPage,
    renderMobileDiaryComments,
    renderMobileDiaryPage,
    moveMobileDiaryImage,
    openMobileDiaryPage,
    closeMobileDiaryPage,
    startMobileDiaryReply,
    cancelMobileDiaryReply,
    saveMobileDiaryComment,
    beginMobileDiaryBackSwipe,
    moveMobileDiaryBackSwipe,
    endMobileDiaryBackSwipe,
    cancelMobileDiaryBackSwipe,
    beginMobileDiaryImageSwipe,
    moveMobileDiaryImageSwipe,
    cancelMobileDiaryImageSwipe,
    endMobileDiaryImageSwipe,
    canStartGlobalMobileBackSwipe,
    performGlobalMobileBack,
    beginGlobalMobileBackSwipe,
    moveGlobalMobileBackSwipe,
    finishGlobalMobileBackSwipe,
    cancelGlobalMobileBackSwipe,
    openPhoto,
    openWishImage,
    openEditPhoto,
    savePhotoEdit,
    renderEditImages,
    getEditPreviewUrl,
    replaceEditingImage,
    appendEditingImageFiles,
    startAppendEditingImages,
    handleEditImagePaste,
    removeEditingImage,
    resetEditImageState,
    deletePhotoFromEditor,
    openWeekendImageGallery,
  };
}
