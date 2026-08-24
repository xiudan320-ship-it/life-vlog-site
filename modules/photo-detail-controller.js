import { confirmAction } from "./confirm-dialog.js";
import {
  buildMobileDiaryPageMarkup,
  createMobileDiaryPage,
  refreshMobileDiaryComments,
} from "./mobile-diary-view.js";
import {
  clampNumber,
  getMobileBackEdge,
  isEdgeBackSwipe,
} from "./media-gesture-domain.js";
import { composeDiaryStoredNote } from "./media-metadata.js";
import { startDiaryMotionVideo, stopDiaryMotionVideo } from "./diary-video-layout.js";
import { escapeHtml, formatDate, formatDateTime, slugify } from "./ui-formatters.js";
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
  setGlobalStatus,
  switchPage,
  toDateInputValue,
  togglePhotoFavorite,
  togglePhotoFlag,
  deletePhoto,
}) {
  const els = elements;
  const diaryRepository = repository;
  const { cleanupStoredImagePaths, uploadImageFile } = assets;
  const cssEscapeValue = (value) => CSS.escape(String(value || ""));

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
    if (state.mobileDiaryImageViewerOpen) {
      closeMobileDiaryImageViewer();
      return;
    }
    if (state.mobileDiaryPage && !state.mobileDiaryPage.hidden) {
      closeMobileDiaryPage();
      return;
    }
    if (els.dialog?.classList.contains("diary-image-fullscreen")) {
      els.dialog.classList.remove("diary-image-fullscreen");
      resetSecretImageZoom();
      els.dialog.scrollTop = 0;
      return;
    }
    if (!els.dialog.open) return;
    els.dialog.removeAttribute("open");
    ensurePhotoDialogBackdrop().hidden = true;
    document.body.classList.remove("photo-dialog-open");
    els.dialog.dispatchEvent(new Event("close"));
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
  
  function ensureMobileDiaryPage() {
    if (state.mobileDiaryPage) return state.mobileDiaryPage;
    state.mobileDiaryPage = createMobileDiaryPage({
      handlers: {
        close: closeMobileDiaryPage,
        selectImage: (index) => {
          state.mobileDiaryImageIndex = index;
          renderMobileDiaryPage();
        },
        openImage: () => {
          if (!state.mobileDiaryPhoto || Date.now() < state.mobileDiarySuppressImageClickUntil) return;
          openMobileDiaryImageViewer();
        },
        reply: startMobileDiaryReply,
        deleteComment: (id) => void deletePhotoComment(id),
        cancelReply: cancelMobileDiaryReply,
        favorite: (button) => {
          if (!state.mobileDiaryPhoto) return;
          void togglePhotoFavorite(state.mobileDiaryPhoto, button).then(() => {
            if (!state.mobileDiaryPage?.hidden && state.mobileDiaryPhoto) renderMobileDiaryPage();
          });
        },
        edit: () => {
          if (!state.mobileDiaryPhoto) return;
          const photo = state.mobileDiaryPhoto;
          closeMobileDiaryPage();
          openEditPhoto(photo);
        },
        adminCategory: () => {
          if (state.mobileDiaryPhoto) void adminUpdatePhotoCategory(state.mobileDiaryPhoto);
        },
        adminUnpin: () => {
          if (state.mobileDiaryPhoto) void togglePhotoFlag(state.mobileDiaryPhoto, "is_pinned", { adminUnpin: true });
        },
        deleteDiary: () => {
          if (!state.mobileDiaryPhoto) return;
          const photo = state.mobileDiaryPhoto;
          void deletePhoto(photo).then((deleted) => {
            if (deleted) closeMobileDiaryPage();
          });
        },
        submitComment: (event) => void saveMobileDiaryComment(event),
        beginBackSwipe: beginMobileDiaryBackSwipe,
        moveBackSwipe: moveMobileDiaryBackSwipe,
        endBackSwipe: endMobileDiaryBackSwipe,
        cancelBackSwipe: cancelMobileDiaryBackSwipe,
        beginImageSwipe: beginMobileDiaryImageSwipe,
        moveImageSwipe: moveMobileDiaryImageSwipe,
        endImageSwipe: endMobileDiaryImageSwipe,
        cancelImageSwipe: cancelMobileDiaryImageSwipe,
      },
    });
    return state.mobileDiaryPage;
  }
  function renderMobileDiaryComments() {
    refreshMobileDiaryComments({
      page: state.mobileDiaryPage,
      comments: state.photoComments,
      replyToId: state.mobileDiaryReplyToId,
      photoOwnerId: state.mobileDiaryPhoto?.user_id || "",
      currentUserId: state.session?.user?.id || "",
      getAuthorName,
      renderAvatar: renderAvatarMarkup,
    });
  }
  
  function renderMobileDiaryPage() {
    const page = ensureMobileDiaryPage();
    const photo = state.mobileDiaryPhoto;
    if (!photo) return;
    const images = getPhotoImages(photo);
    state.mobileDiaryImageIndex = Math.min(Math.max(0, state.mobileDiaryImageIndex), Math.max(0, images.length - 1));
    const canComment = Boolean(
      state.session &&
        photo &&
        (photo.user_id === state.session.user.id || state.familyMemberMap.has(photo.user_id))
    );
    page.innerHTML = buildMobileDiaryPageMarkup({
      photo,
      images,
      imageIndex: state.mobileDiaryImageIndex,
      comments: state.photoComments,
      signedIn: Boolean(state.session),
      currentUserId: state.session?.user?.id || "",
      canComment,
      admin: isAdminAccount(),
      favorite: isFavoritePhoto(photo),
      getDisplayTitle,
      getPlainNote,
      getAuthorName,
      renderAvatar: renderAvatarMarkup,
    });
    startDiaryMotionVideo(page.querySelector(".mobile-diary-motion"));
    renderMobileDiaryComments();
  }
  
  function moveMobileDiaryImage(step) {
    const images = getPhotoImages(state.mobileDiaryPhoto);
    if (images.length <= 1) return;
    state.mobileDiaryImageIndex = (state.mobileDiaryImageIndex + step + images.length) % images.length;
    renderMobileDiaryPage();
  }
  
  function openMobileDiaryPage(photo, initialImageIndex = 0, options = {}) {
    if (!photo) return;
    state.mobileDiaryRestoreScrollY = window.scrollY || window.pageYOffset || 0;
    state.mobileDiaryPhoto = photo;
    state.mobileDiaryImageIndex = Math.max(0, Number(initialImageIndex) || 0);
    state.mobileDiaryReplyToId = null;
    state.activeDialogPhoto = photo;
    state.dialogRandomMode = Boolean(options.randomMode);
    state.dialogSecretSourceItem = options.secretSourceItem || null;
    state.photoComments = [];
    if (photo.id) void acknowledgeViewedDiary(photo.id);
    ensureMobileDiaryPage().hidden = false;
    document.body.classList.add("mobile-diary-page-open");
    renderMobileDiaryPage();
    state.mobileDiaryPage.scrollTop = 0;
    requestAnimationFrame(() => {
      state.mobileDiaryPage.scrollTop = 0;
    });
    void loadPhotoComments(photo.id);
  }
  
  function closeMobileDiaryPage() {
    if (!state.mobileDiaryPage || state.mobileDiaryPage.hidden) return;
    state.mobileDiaryPage.hidden = true;
    state.mobileDiaryPhoto = null;
    state.mobileDiaryReplyToId = null;
    state.mobileDiaryBackSwipeStart = null;
    state.photoComments = [];
    state.activeDialogPhoto = null;
    state.dialogRandomMode = false;
    state.dialogSecretSourceItem = null;
    document.body.classList.remove("mobile-diary-page-open");
    state.mobileDiaryPage.classList.remove("is-back-swiping", "is-back-committing");
    state.mobileDiaryPage.style.removeProperty("--back-swipe-x");
    state.mobileDiaryPage.style.removeProperty("--back-swipe-progress");
  }
  
  function startMobileDiaryReply(commentId) {
    const comment = state.photoComments.find((item) => item.id === commentId);
    if (!comment) return;
    state.mobileDiaryReplyToId = comment.id;
    renderMobileDiaryComments();
    state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-input]")?.focus();
  }
  
  function cancelMobileDiaryReply() {
    state.mobileDiaryReplyToId = null;
    renderMobileDiaryComments();
  }
  
  async function saveMobileDiaryComment(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session || !state.mobileDiaryPhoto) return;
    const input = state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-input]");
    const status = state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-status]");
    const body = input?.value.trim() || "";
    if (!body) return;
    if (status) status.textContent = "正在发送...";
    const { error } = await diaryRepository.addComment({
      photo_id: state.mobileDiaryPhoto.id,
      user_id: state.session.user.id,
      body,
      parent_id: state.mobileDiaryReplyToId,
    });
    if (error) {
      if (status) status.textContent = isMissingCloudSchema(error) ? "请先部署最新版 Cloudflare D1 结构。" : `发送失败：${error.message}`;
      return;
    }
    if (input) input.value = "";
    state.mobileDiaryReplyToId = null;
    await loadPhotoComments(state.mobileDiaryPhoto.id);
    await loadPhotoCommentPreviews();
    const gainedExp = await awardExperience("comment");
    if (status) status.textContent = gainedExp ? `留言已发送。修为 +${gainedExp}` : "留言已发送。";
  }
  
  function beginMobileDiaryBackSwipe(event) {
    if (!state.mobileDiaryPage || state.mobileDiaryPage.hidden || event.pointerType === "mouse") return;
    if (event.target.closest(".mobile-diary-media, .mobile-diary-thumbs, button, input, textarea, select, a")) return;
    state.mobileDiaryBackSwipeStart = { id: event.pointerId, edge: "right", x: event.clientX, y: event.clientY, time: Date.now(), tracking: false };
    try {
      state.mobileDiaryPage.setPointerCapture(event.pointerId);
    } catch {
    }
  }
  
  function moveMobileDiaryBackSwipe(event) {
    if (!state.mobileDiaryBackSwipeStart || state.mobileDiaryBackSwipeStart.id !== event.pointerId) return;
    const rawDeltaX = event.clientX - state.mobileDiaryBackSwipeStart.x;
    const deltaX = state.mobileDiaryBackSwipeStart.edge === "left" ? Math.max(0, rawDeltaX) : Math.min(0, rawDeltaX);
    const deltaY = Math.abs(event.clientY - state.mobileDiaryBackSwipeStart.y);
    if (!state.mobileDiaryBackSwipeStart.tracking && Math.abs(deltaX) < 5) return;
    if (!state.mobileDiaryBackSwipeStart.tracking && deltaY > Math.abs(deltaX)) {
      state.mobileDiaryBackSwipeStart = null;
      return;
    }
    state.mobileDiaryBackSwipeStart.tracking = true;
    if (event.cancelable) event.preventDefault();
  }
  
  function endMobileDiaryBackSwipe(event) {
    if (!state.mobileDiaryBackSwipeStart) return;
    const elapsed = Math.max(1, Date.now() - state.mobileDiaryBackSwipeStart.time);
    const distance = Math.abs(event.clientX - state.mobileDiaryBackSwipeStart.x);
    const velocity = distance / elapsed;
    const shouldClose =
      isEdgeBackSwipe(state.mobileDiaryBackSwipeStart, event, { threshold: 48, ratio: 1.08, maxElapsed: 1200 }) ||
      (distance > 26 && velocity > 0.32);
    state.mobileDiaryBackSwipeStart = null;
    if (shouldClose) {
      closeMobileDiaryPage();
    }
  }
  
  function cancelMobileDiaryBackSwipe() {
    state.mobileDiaryBackSwipeStart = null;
    if (!state.mobileDiaryPage) return;
    state.mobileDiaryPage.classList.remove("is-back-swiping", "is-back-committing");
    state.mobileDiaryPage.style.removeProperty("--back-swipe-x");
    state.mobileDiaryPage.style.removeProperty("--back-swipe-progress");
  }
  
  function beginMobileDiaryImageSwipe(event) {
    if (!state.mobileDiaryPage || state.mobileDiaryPage.hidden || event.pointerType === "mouse") return;
    if (!event.target.closest(".mobile-diary-media")) return;
    if (getPhotoImages(state.mobileDiaryPhoto).length <= 1) return;
    state.mobileDiaryImageSwipeStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      tracking: false,
    };
  }
  
  function moveMobileDiaryImageSwipe(event) {
    if (!state.mobileDiaryImageSwipeStart || state.mobileDiaryImageSwipeStart.id !== event.pointerId) return;
    const deltaX = event.clientX - state.mobileDiaryImageSwipeStart.x;
    const deltaY = Math.abs(event.clientY - state.mobileDiaryImageSwipeStart.y);
    if (!state.mobileDiaryImageSwipeStart.tracking && Math.abs(deltaX) < 5) return;
    if (!state.mobileDiaryImageSwipeStart.tracking && deltaY > Math.abs(deltaX) * 1.05) {
      cancelMobileDiaryImageSwipe();
      return;
    }
    state.mobileDiaryImageSwipeStart.tracking = true;
    state.mobileDiarySuppressImageClickUntil = Date.now() + 450;
    const button = state.mobileDiaryPage?.querySelector(".mobile-diary-image-button");
    if (!button) return;
    button.classList.add("is-swiping");
    button.style.setProperty("--diary-image-swipe-x", `${clampNumber(deltaX * 0.82, -window.innerWidth, window.innerWidth)}px`);
  }
  
  function cancelMobileDiaryImageSwipe() {
    state.mobileDiaryImageSwipeStart = null;
    const button = state.mobileDiaryPage?.querySelector(".mobile-diary-image-button");
    if (!button) return;
    button.classList.remove("is-swiping");
    button.style.setProperty("--diary-image-swipe-x", "0px");
    window.setTimeout(() => button.style.removeProperty("--diary-image-swipe-x"), 180);
  }
  
  function endMobileDiaryImageSwipe(event) {
    if (!state.mobileDiaryImageSwipeStart || state.mobileDiaryImageSwipeStart.id !== event.pointerId) return;
    const deltaX = event.clientX - state.mobileDiaryImageSwipeStart.x;
    const deltaY = Math.abs(event.clientY - state.mobileDiaryImageSwipeStart.y);
    const elapsed = Date.now() - state.mobileDiaryImageSwipeStart.time;
    state.mobileDiaryImageSwipeStart = null;
    const velocity = Math.abs(deltaX) / Math.max(1, elapsed);
    const horizontal =
      Math.abs(deltaX) > 26 &&
      Math.abs(deltaX) > deltaY * 1.05 &&
      elapsed < 1200 &&
      (Math.abs(deltaX) > 42 || velocity > 0.28);
    if (!horizontal) {
      cancelMobileDiaryImageSwipe();
      return;
    }
    state.mobileDiarySuppressImageClickUntil = Date.now() + 450;
    moveMobileDiaryImage(deltaX < 0 ? 1 : -1);
  }
  
  function canStartGlobalMobileBackSwipe(event) {
    if (!isMobileViewport() || event.pointerType === "mouse") return false;
    if (state.mobileDiaryImageViewerOpen) return false;
    if (state.mobileDiaryPage && !state.mobileDiaryPage.hidden) return false;
    if (els.dialog?.open) return false;
    if (event.target.closest("button, input, textarea, select, a, .dialog-media, .mobile-diary-media, .secret-photo-grid, .diary-card-media")) return false;
    return Boolean(getMobileBackEdge(event.clientX));
  }
  
  function performGlobalMobileBack() {
    if (!els.setupPanel.hidden) {
      els.setupPanel.hidden = true;
      return true;
    }
    if (state.activePage !== "gallery") {
      switchPage("gallery");
      window.scrollTo({ top: 0, behavior: "auto" });
      return true;
    }
    if (window.history.length > 1) {
      window.history.back();
      return true;
    }
    return false;
  }
  
  function beginGlobalMobileBackSwipe(event) {
    if (!canStartGlobalMobileBackSwipe(event)) return;
    state.globalMobileBackSwipeStart = {
      id: event.pointerId,
      edge: getMobileBackEdge(event.clientX),
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      tracking: false,
    };
  }
  
  function moveGlobalMobileBackSwipe(event) {
    if (!state.globalMobileBackSwipeStart || state.globalMobileBackSwipeStart.id !== event.pointerId) return;
    if (state.globalMobileBackSwipeStart.edge !== "left") return;
    const deltaX = Math.max(0, event.clientX - state.globalMobileBackSwipeStart.x);
    const deltaY = Math.abs(event.clientY - state.globalMobileBackSwipeStart.y);
    if (!state.globalMobileBackSwipeStart.tracking && deltaX < 8) return;
    if (!state.globalMobileBackSwipeStart.tracking && deltaY > deltaX) {
      cancelGlobalMobileBackSwipe();
      return;
    }
    state.globalMobileBackSwipeStart.tracking = true;
  }
  
  function finishGlobalMobileBackSwipe(event) {
    if (!state.globalMobileBackSwipeStart || state.globalMobileBackSwipeStart.id !== event.pointerId) return;
    const shouldGoBack = isEdgeBackSwipe(state.globalMobileBackSwipeStart, event, {
      threshold: 74,
      ratio: 1.35,
      maxElapsed: 1100,
    });
    state.globalMobileBackSwipeStart = null;
    if (shouldGoBack) {
      performGlobalMobileBack();
    }
  }
  
  function cancelGlobalMobileBackSwipe() {
    state.globalMobileBackSwipeStart = null;
    document.body.classList.remove("mobile-global-back-swiping", "mobile-global-back-committing");
    document.documentElement.style.removeProperty("--global-back-swipe-x");
  }
  
  function openPhoto(photo, initialImageIndex = 0, options = {}) {
    if (isMobileViewport() && !options.forceDialog) {
      openMobileDiaryPage(photo, initialImageIndex, options);
      return;
    }
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
    renderDialogMedia();
    void loadPhotoComments(photo.id);
    if (isMobileViewport()) {
      els.dialog.classList.add("mobile-page-dialog");
      document.body.classList.add("mobile-dialog-open");
    } else {
      document.body.classList.remove("mobile-dialog-open");
    }
    showPhotoDialogPreservingScroll();
  }
  
  function openWishImage(wish) {
    if (!wish) return;
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
    renderDialogMedia();
    els.dialog.scrollTop = 0;
    showPhotoDialogPreservingScroll();
  }
  
  function openEditPhoto(photo) {
    if (!photo) return;
    resetEditImageState();
    state.editingPhoto = photo;
    state.editingImages = getPhotoImages(photo).map((image) => ({ ...image }));
    els.deleteEditingPhoto.disabled = false;
    els.deleteEditingPhoto.textContent = "删除整篇";
    els.saveEditStatus.textContent = "";
    els.editTitleInput.value = getDisplayTitle(photo);
    els.editDateInput.value = toDateInputValue(photo.taken_at);
    els.editCategoryInput.value = photo.category || "日常";
    els.editPublicInput.value = String(photo.is_public !== false);
    els.editNoteInput.value = getPlainNote(photo);
    renderEditImages();
    els.editDialog.showModal();
  }
  
  async function savePhotoEdit(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session || !state.editingPhoto || !state.editingImages.length) {
      els.saveEditStatus.textContent = "请先登录，并至少保留一张图片。";
      return;
    }
  
    const takenAt = els.editDateInput.value || toDateInputValue(new Date());
    const title = els.editTitleInput.value.trim();
    const nextImages = [];
    const newlyUploadedPaths = [];
    els.saveEditStatus.textContent = "正在处理图片...";
  
    try {
      for (const [index, image] of state.editingImages.entries()) {
        const replacement = state.editingImageFiles.get(index);
        if (!replacement) {
          nextImages.push(image);
          continue;
        }
  
        const uploaded = await uploadImageFile(
          replacement,
          `${slugify(title || "photo")}-edit-${index + 1}`,
          index + 1,
          state.editingImages.length
        );
        if (!uploaded) throw new Error("替换图片上传失败。");
        nextImages.push(uploaded);
        if (uploaded.image_path) newlyUploadedPaths.push(uploaded.image_path);
        if (uploaded.motion_path) newlyUploadedPaths.push(uploaded.motion_path);
        if (uploaded.poster_path) newlyUploadedPaths.push(uploaded.poster_path);
        if (uploaded.video_path) newlyUploadedPaths.push(uploaded.video_path);
        if (image.image_path) state.editingRemovedPaths.add(image.image_path);
        if (image.thumbnail_path) state.editingRemovedPaths.add(image.thumbnail_path);
        if (image.motion_path) state.editingRemovedPaths.add(image.motion_path);
        if (image.poster_path) state.editingRemovedPaths.add(image.poster_path);
        if (image.video_path) state.editingRemovedPaths.add(image.video_path);
      }
  
      const primaryImage = nextImages[0];
      const updates = {
        title,
        note: composeDiaryStoredNote(els.editNoteInput.value.trim(), nextImages),
        category: els.editCategoryInput.value,
        taken_at: takenAt,
        is_public: els.editPublicInput.value === "true",
        image_path: primaryImage.image_path || "",
        image_url: primaryImage.image_url,
        width: primaryImage.width,
        height: primaryImage.height,
      };
  
      els.saveEditStatus.textContent = "正在保存...";
      const { error } = await diaryRepository.updateOwned(state.editingPhoto.id, updates);
      if (error) throw error;
  
      const nextImagePaths = new Set(nextImages.flatMap(getStoredPhotoMediaPaths));
      const pathsToRemove = [...state.editingRemovedPaths].filter(
        (path) => path && !nextImagePaths.has(path)
      );
      if (pathsToRemove.length) {
        const cleanupError = await cleanupStoredImagePaths(pathsToRemove).then(() => null).catch((error) => error);
        if (cleanupError) {
          console.warn("Album saved, but old image cleanup failed:", cleanupError);
        }
      }
  
      els.editDialog.close();
      state.editingPhoto = null;
      resetEditImageState();
      await loadPhotos();
      const gainedExp = await awardExperience("diaryEdit");
      setGlobalStatus(`日记和合集内容已更新。${gainedExp ? ` 修为 +${gainedExp}` : ""}`);
    } catch (error) {
      els.saveEditStatus.textContent = error.message || "保存失败，请稍后重试。";
      if (newlyUploadedPaths.length) {
        void cleanupStoredImagePaths(newlyUploadedPaths);
      }
    }
  }
  
  function renderEditImages() {
    els.editImageCount.textContent = `${state.editingImages.length} 张`;
    els.editImageList.innerHTML = state.editingImages
      .map((image, index) => {
        const file = state.editingImageFiles.get(index);
        const previewUrl = file ? getEditPreviewUrl(file, index) : image.image_url;
        return `
          <article class="edit-image-item">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <img src="${escapeHtml(previewUrl || "")}" alt="合集第 ${index + 1} 张" />
            <div>
              <label class="edit-image-picker" for="editImageInput" data-replace-edit-image="${index}">替换</label>
              <button type="button" data-delete-edit-image="${index}">删除</button>
            </div>
          </article>
        `;
      })
      .join("");
  
    els.editImageList.querySelectorAll("[data-replace-edit-image]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        state.editingReplaceIndex = Number(trigger.dataset.replaceEditImage);
        els.editImageInput.value = "";
      });
    });
    els.editImageList.querySelectorAll("[data-delete-edit-image]").forEach((button) => {
      button.addEventListener("click", () => removeEditingImage(Number(button.dataset.deleteEditImage)));
    });
  }
  
  function getEditPreviewUrl(file, index) {
    if (state.editingPreviewUrls[index]) return state.editingPreviewUrls[index];
    const url = URL.createObjectURL(file);
    state.editingPreviewUrls[index] = url;
    return url;
  }
  
  function replaceEditingImage() {
    const files = Array.from(els.editImageInput.files || []);
    if (!files.length) return;
    if (state.editingReplaceIndex < 0) {
      appendEditingImageFiles(files);
      return;
    }
    const file = files[0];
    if (!file || !state.editingImages[state.editingReplaceIndex]) return;
    if (state.editingPreviewUrls[state.editingReplaceIndex]) {
      URL.revokeObjectURL(state.editingPreviewUrls[state.editingReplaceIndex]);
      state.editingPreviewUrls[state.editingReplaceIndex] = "";
    }
    state.editingImageFiles.set(state.editingReplaceIndex, file);
    els.saveEditStatus.textContent = `第 ${state.editingReplaceIndex + 1} 张将在保存时替换。`;
    state.editingReplaceIndex = -1;
    renderEditImages();
  }
  
  function appendEditingImageFiles(files) {
    if (!state.editingPhoto) return;
    const imageLimit = getCurrentImageLimit();
    const remaining = imageLimit - state.editingImages.length;
    if (remaining <= 0) {
      els.saveEditStatus.textContent = `当前 VIP 等级单篇最多 ${imageLimit} 张图。`;
      return;
    }
    const nextFiles = files.slice(0, remaining);
    nextFiles.forEach((file) => {
      const index = state.editingImages.length;
      state.editingImages.push({
        image_path: "",
        image_url: "",
        width: 0,
        height: 0,
      });
      state.editingImageFiles.set(index, file);
    });
    state.editingReplaceIndex = -1;
    els.saveEditStatus.textContent =
      files.length > remaining
        ? `已追加 ${nextFiles.length} 张，当前等级最多 ${imageLimit} 张。`
        : `已追加 ${nextFiles.length} 张图片，保存后上传。`;
    renderEditImages();
  }
  
  function startAppendEditingImages() {
    if (!state.editingPhoto) return;
    state.editingReplaceIndex = -1;
    els.editImageInput.value = "";
  }
  
  function handleEditImagePaste(event) {
    if (!state.editingPhoto) return;
    const items = Array.from(event.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (!imageItems.length) return;
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    const normalizedFiles = files.map((file, index) => {
      const extension = file.type?.split("/")[1] || "png";
      return new File([file], `edit-pasted-${Date.now()}-${index + 1}.${extension}`, {
        type: file.type || "image/png",
      });
    });
    appendEditingImageFiles(normalizedFiles);
  }
  
  async function removeEditingImage(index) {
    if (state.editingImages.length <= 1) {
      els.saveEditStatus.textContent = "一篇笔记至少保留一张图片。";
      return;
    }
    const image = state.editingImages[index];
    if (!image) return;
    const confirmed = await confirmAction({
      eyebrow: "编辑日记图片",
      title: `删除第 ${index + 1} 张图片？`,
      message: "保存日记修改后，这张图片才会从合集里移除。",
      confirmLabel: "移除图片",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;
    if (image.image_path) state.editingRemovedPaths.add(image.image_path);
    if (image.thumbnail_path) state.editingRemovedPaths.add(image.thumbnail_path);
    if (image.motion_path) state.editingRemovedPaths.add(image.motion_path);
    if (image.poster_path) state.editingRemovedPaths.add(image.poster_path);
    if (image.video_path) state.editingRemovedPaths.add(image.video_path);
    if (state.editingPreviewUrls[index]) URL.revokeObjectURL(state.editingPreviewUrls[index]);
    state.editingImages.splice(index, 1);
    state.editingPreviewUrls.splice(index, 1);
  
    const nextFiles = new Map();
    state.editingImageFiles.forEach((file, fileIndex) => {
      if (fileIndex < index) nextFiles.set(fileIndex, file);
      if (fileIndex > index) nextFiles.set(fileIndex - 1, file);
    });
    state.editingImageFiles = nextFiles;
    els.saveEditStatus.textContent = "图片将在保存后从合集中删除。";
    renderEditImages();
  }
  
  function resetEditImageState() {
    state.editingPreviewUrls.forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    state.editingImages = [];
    state.editingImageFiles = new Map();
    state.editingRemovedPaths = new Set();
    state.editingReplaceIndex = -1;
    state.editingPreviewUrls = [];
    if (els.editImageList) els.editImageList.innerHTML = "";
  }
  
  async function deletePhotoFromEditor() {
    if (!state.editingPhoto) return;
    const photo = state.editingPhoto;
    const deleted = await deletePhoto(photo, els.deleteEditingPhoto);
    if (deleted) {
      els.editDialog.close();
      els.deleteEditingPhoto.disabled = false;
      els.deleteEditingPhoto.textContent = "删除整篇";
      state.editingPhoto = null;
      resetEditImageState();
    }
  }

  function openWeekendImageGallery(plan, initialIndex = 0, kind = "plan") {
    const galleryImages = kind === "completion" ? plan?.completionImages : plan?.images;
    if (!galleryImages?.length) return;
    state.dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
    lockDialogBackgroundScroll(state.dialogRestoreScrollY);
    state.activeDialogPhoto = null;
    state.activeSecretDialogItem = null;
    state.dialogSecretSourceItem = null;
    els.dialog.classList.remove("mobile-page-dialog", "secret-image-dialog", "secret-image-fullscreen");
    els.dialog.classList.add("no-comments-dialog");
    state.dialogImages = galleryImages;
    state.dialogImageIndex = Math.max(0, Math.min(initialIndex, state.dialogImages.length - 1));
    els.dialogTitle.textContent = kind === "completion" ? `${plan.title || "周末"} · 完成回顾` : plan.title || "周末场景";
    els.dialogMeta.textContent = `${formatDate(plan.date)} · ${getAuthorName(plan.userId)}`;
    els.dialogNote.textContent = kind === "completion" ? plan.completionNote || "" : plan.note || "";
    els.photoCommentsSection.hidden = true;
    if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
    renderDialogMedia();
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
