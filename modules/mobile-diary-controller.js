import {
  buildMobileDiaryPageMarkup,
  createMobileDiaryPage,
  refreshMobileDiaryComments,
  resizeMobileDiaryCommentInput,
} from "./mobile-diary-view.js";
import { clampNumber, getMobileBackEdge, isEdgeBackSwipe } from "./media-gesture-domain.js";
import { startDiaryMotionVideo, stopDiaryMotionVideo } from "./diary-video-layout.js";

export function createMobileDiaryController({
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
  openEditPhoto,
  openMobileDiaryImageViewer,
  renderAvatarMarkup,
  switchPage,
  togglePhotoFavorite,
  togglePhotoFlag,
}) {
  const els = elements;
  const diaryRepository = repository;
  let commentDraft = "";
  let commentSubmitting = false;
  let moreActionsTrigger = null;

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
        changeCommentDraft: (value) => {
          commentDraft = value;
        },
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
        adminCategory: (trigger) => {
          if (state.mobileDiaryPhoto) void adminUpdatePhotoCategory(state.mobileDiaryPhoto, trigger);
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
        openMore: openMoreActions,
        closeMore: closeMoreActions,
        moreAction: (actionId) => void runMoreAction(actionId),
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
    closeMoreActions({ restoreFocus: false });
    const previousVideo = page.querySelector(".mobile-diary-video, .mobile-diary-motion");
    if (previousVideo) stopDiaryMotionVideo(previousVideo);
    const previousInput = page.querySelector("[data-mobile-diary-comment-input]");
    if (previousInput) commentDraft = previousInput.value;
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
    const commentInput = page.querySelector("[data-mobile-diary-comment-input]");
    if (commentInput) {
      commentInput.value = commentDraft;
      resizeMobileDiaryCommentInput(commentInput);
    }
    const vlogVideo = page.querySelector(".mobile-diary-video");
    if (vlogVideo) {
      startDiaryMotionVideo(vlogVideo, null, {
        autoplay: true,
        muted: true,
        controls: true,
        loop: false,
        statusElement: page.querySelector("[data-mobile-diary-video-status]"),
      });
    }
    else startDiaryMotionVideo(page.querySelector(".mobile-diary-motion"), null, {
      autoplay: true,
      muted: true,
      controls: false,
      loop: true,
    });
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
    commentDraft = "";
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
    closeMoreActions({ restoreFocus: false });
    const video = state.mobileDiaryPage.querySelector(".mobile-diary-video, .mobile-diary-motion");
    if (video) stopDiaryMotionVideo(video);
    state.mobileDiaryPage.hidden = true;
    state.mobileDiaryPhoto = null;
    state.mobileDiaryReplyToId = null;
    state.mobileDiaryBackSwipeStart = null;
    state.photoComments = [];
    state.activeDialogPhoto = null;
    state.dialogRandomMode = false;
    state.dialogSecretSourceItem = null;
    commentDraft = "";
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
    if (commentSubmitting || !state.cloudDb || !state.session || !state.mobileDiaryPhoto) return;
    const input = state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-input]");
    const form = state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-form]");
    const submitButton = form?.querySelector("[data-mobile-diary-comment-submit]");
    const status = form?.querySelector("[data-mobile-diary-comment-status]");
    const body = input?.value.trim() || "";
    if (!body) {
      status?.setAttribute("role", "alert");
      if (status) status.textContent = "请输入留言内容。";
      input?.focus({ preventScroll: true });
      return;
    }
    commentSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
    }
    if (status) status.textContent = "正在发送...";
    try {
      const { error } = await diaryRepository.addComment({
        photo_id: state.mobileDiaryPhoto.id,
        user_id: state.session.user.id,
        body,
        parent_id: state.mobileDiaryReplyToId,
      });
      if (error) throw error;
      commentDraft = "";
      if (input) {
        input.value = "";
        resizeMobileDiaryCommentInput(input);
      }
      state.mobileDiaryReplyToId = null;
      await loadPhotoComments(state.mobileDiaryPhoto.id);
      await loadPhotoCommentPreviews();
      const gainedExp = await awardExperience("comment");
      const nextStatus = gainedExp ? `留言已发送。修为 +${gainedExp}` : "留言已发送。";
      const nextStatusElement = state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-status]");
      if (nextStatusElement) {
        nextStatusElement.setAttribute("role", "status");
        nextStatusElement.textContent = nextStatus;
      }
    } catch (error) {
      const nextStatusElement = state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-status]") || status;
      if (nextStatusElement) {
        nextStatusElement.setAttribute("role", "alert");
        nextStatusElement.textContent = isMissingCloudSchema(error) ? "请先部署最新版 Cloudflare D1 结构。" : `发送失败：${error?.message || "请重试。"}`;
      }
    } finally {
      commentSubmitting = false;
      const nextSubmitButton = state.mobileDiaryPage?.querySelector("[data-mobile-diary-comment-submit]") || submitButton;
      if (nextSubmitButton) {
        nextSubmitButton.disabled = false;
        nextSubmitButton.removeAttribute("aria-busy");
      }
    }
  }

  function restoreMoreActionsFocus() {
    const trigger = moreActionsTrigger;
    moreActionsTrigger = null;
    if (!trigger?.isConnected || typeof trigger.focus !== "function") return;
    try {
      trigger.focus({ preventScroll: true });
    } catch {
      trigger.focus();
    }
  }

  function closeMoreActions({ restoreFocus = true } = {}) {
    const page = state.mobileDiaryPage;
    const sheet = page?.querySelector("[data-mobile-diary-more-sheet]");
    if (sheet) {
      if (sheet.open && typeof sheet.close === "function") sheet.close();
      else {
        sheet.hidden = true;
        sheet.removeAttribute("open");
      }
    }
    if (moreActionsTrigger) moreActionsTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) restoreMoreActionsFocus();
    else moreActionsTrigger = null;
  }

  function openMoreActions(trigger) {
    const sheet = state.mobileDiaryPage?.querySelector("[data-mobile-diary-more-sheet]");
    if (!sheet || !trigger) return;
    closeMoreActions({ restoreFocus: false });
    moreActionsTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    sheet.hidden = false;
    try {
      if (typeof sheet.showModal === "function") sheet.showModal();
      else sheet.setAttribute("open", "");
    } catch {
      sheet.setAttribute("open", "");
    }
    sheet.querySelector("[data-mobile-diary-more-action]")?.focus({ preventScroll: true });
  }

  async function runMoreAction(actionId) {
    const photo = state.mobileDiaryPhoto;
    const trigger = moreActionsTrigger;
    closeMoreActions();
    if (!photo) return;
    if (actionId === "unpin") {
      await togglePhotoFlag(photo, "is_pinned", { adminUnpin: true });
      return;
    }
    if (actionId === "delete") {
      const deleted = await deletePhoto(photo, trigger);
      if (deleted) closeMobileDiaryPage();
    }
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
    if (shouldClose) closeMobileDiaryPage();
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
      switchPage("gallery", { restoreScroll: false, focusHeading: false });
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
    if (shouldGoBack) performGlobalMobileBack();
  }

  function cancelGlobalMobileBackSwipe() {
    state.globalMobileBackSwipeStart = null;
    document.body.classList.remove("mobile-global-back-swiping", "mobile-global-back-committing");
    document.documentElement.style.removeProperty("--global-back-swipe-x");
  }

  return {
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
  };
}
