import {
  clampNumber,
  getMobileBackEdge,
  getTouchCenter,
  getTouchDistance,
  isEdgeBackSwipe,
} from "./media-gesture-domain.js";
import {
  bindSecretDialogControls as bindSecretDialogControlsView,
  fitDialogMedia,
  renderDialogPagination,
  renderSecretDialogControls as buildSecretDialogControls,
  setViewerStatus,
  updateDiaryViewerToolbar,
  updateSecretViewerToolbar,
} from "./photo-dialog-view.js";
import {
  getDiaryMediaPosterUrl,
  getDiaryMediaVideoUrl,
} from "./media-metadata.js";
import { normalizeSecretPhotoTags } from "./secret-domain.js?v=20260810-004";
import { startDiaryMotionVideo, stopDiaryMotionVideo } from "./diary-video-layout.js";

export function createPhotoViewerController({
  elements,
  state,
  isMobileViewport,
  closePhotoDialog,
  getSecretAlbumFilterTags,
  updateSecretDialogImage,
}) {
  const els = elements;

  function isSecretImageDialogOpen() {
    return Boolean(els.dialog?.open && els.dialog.classList.contains("secret-image-dialog"));
  }
  
  function isSecretImageViewerOpen() {
    return Boolean(isSecretImageDialogOpen() && els.dialog.classList.contains("secret-image-fullscreen"));
  }
  
  function isZoomableImageDialogOpen() {
    return Boolean(
      els.dialog?.open &&
        (isSecretImageViewerOpen() ||
          els.dialog.classList.contains("mobile-diary-image-viewer") ||
          els.dialog.classList.contains("diary-image-fullscreen"))
    );
  }
  
  function isFittableImageDialogOpen() {
    return Boolean(
      els.dialog?.open &&
        (isZoomableImageDialogOpen() ||
          isSecretImageDialogOpen() ||
          els.dialog.classList.contains("diary-detail-dialog"))
    );
  }
  
  function applySecretImageZoom() {
    if (!els.dialogImage) return;
    const { scale, x, y } = state.secretImageZoom;
    const diaryFullscreen = Boolean(els.dialog?.classList.contains("diary-image-fullscreen"));
    const rotation = diaryFullscreen ? state.diaryImageRotation : 0;
    const mediaRect = els.dialogMedia?.getBoundingClientRect();
    const rotationFit = rotation % 180 && mediaRect
      ? Math.min(1, mediaRect.width / Math.max(1, mediaRect.height), mediaRect.height / Math.max(1, mediaRect.width))
      : 1;
    const transformScale = scale * rotationFit;
    els.dialogImage.style.transform = scale > 1.01 || rotation
      ? `translate3d(${x}px, ${y}px, 0) scale(${transformScale}) rotate(${rotation}deg)`
      : "";
    els.dialogImage.classList.toggle("is-zoomed", scale > 1.01);
    els.dialogMedia?.classList.toggle("is-zoomed", scale > 1.01);
    refreshDiaryViewerToolbar();
    refreshSecretViewerToolbar();
  }
  
  function refreshDiaryViewerToolbar() {
    updateDiaryViewerToolbar({
      toolbar: els.diaryViewerToolbar,
      counter: els.diaryViewerCounter,
      zoomValue: els.diaryViewerZoomValue,
      previousButton: els.diaryViewerPrev,
      nextButton: els.diaryViewerNext,
      open: Boolean(els.dialog?.classList.contains("diary-image-fullscreen")),
      total: state.dialogImages.length,
      index: state.dialogImageIndex,
      zoomScale: state.secretImageZoom.scale,
    });
  }
  
  function refreshSecretViewerToolbar() {
    updateSecretViewerToolbar({
      toolbar: els.secretViewerToolbar,
      counter: els.secretViewerCounter,
      zoomValue: els.secretViewerZoomValue,
      previousButton: els.secretViewerPrev,
      nextButton: els.secretViewerNext,
      zoomOutButton: els.secretViewerZoomOut,
      zoomInButton: els.secretViewerZoomIn,
      infoButton: els.secretViewerInfo,
      open: Boolean(isSecretImageDialogOpen() && els.dialog.classList.contains("secret-image-fullscreen")),
      total: state.dialogImages.length,
      index: state.dialogImageIndex,
      zoomScale: state.secretImageZoom.scale,
      infoOpen: state.secretViewerInfoOpen,
    });
  }
  
  function setSecretViewerStatus(state, message = "") {
    setViewerStatus(
      { status: els.secretViewerStatus, text: els.secretViewerStatusText },
      state,
      message
    );
  }
  
  function fitSecretViewerImage() {
    if (!isFittableImageDialogOpen()) return;
    fitDialogMedia({ image: els.dialogImage, video: els.dialogVideo, container: els.dialogMedia });
  }
  
  function normalizeSecretImageZoom(zoom) {
    const scale = clampNumber(Number(zoom.scale) || 1, 1, 6);
    if (scale <= 1.03) return { scale: 1, x: 0, y: 0 };
    const mediaStyle = els.dialogMedia ? getComputedStyle(els.dialogMedia) : null;
    const mediaWidth = Math.max(
      0,
      (els.dialogMedia?.clientWidth || 0) -
        parseFloat(mediaStyle?.paddingLeft || 0) -
        parseFloat(mediaStyle?.paddingRight || 0)
    );
    const mediaHeight = Math.max(
      0,
      (els.dialogMedia?.clientHeight || 0) -
        parseFloat(mediaStyle?.paddingTop || 0) -
        parseFloat(mediaStyle?.paddingBottom || 0)
    );
    const imageWidth = els.dialogImage?.clientWidth || 0;
    const imageHeight = els.dialogImage?.clientHeight || 0;
    const maxX = Math.max(0, (imageWidth * scale - mediaWidth) / 2);
    const maxY = Math.max(0, (imageHeight * scale - mediaHeight) / 2);
    return {
      scale,
      x: clampNumber(Number(zoom.x) || 0, -maxX, maxX),
      y: clampNumber(Number(zoom.y) || 0, -maxY, maxY),
    };
  }
  
  function zoomImageViewerAt(nextScale, clientX, clientY) {
    const currentScale = state.secretImageZoom.scale;
    const scale = clampNumber(Number(nextScale) || 1, 1, 6);
    if (scale <= 1.03) {
      resetSecretImageZoom();
      return;
    }
    const mediaRect = els.dialogMedia?.getBoundingClientRect();
    const pointX = mediaRect ? clientX - (mediaRect.left + mediaRect.width / 2) : 0;
    const pointY = mediaRect ? clientY - (mediaRect.top + mediaRect.height / 2) : 0;
    const ratio = scale / Math.max(1, currentScale);
    state.secretImageZoom = normalizeSecretImageZoom({
      scale,
      x: pointX - (pointX - state.secretImageZoom.x) * ratio,
      y: pointY - (pointY - state.secretImageZoom.y) * ratio,
    });
    applySecretImageZoom();
  }
  
  function resetSecretImageZoom() {
    state.secretImageGesture = null;
    state.secretImageZoom = { scale: 1, x: 0, y: 0 };
    state.diaryImageRotation = 0;
    applySecretImageZoom();
  }
  
  function adjustDiaryViewerZoom(delta) {
    if (!els.dialog?.classList.contains("diary-image-fullscreen")) return;
    state.secretImageZoom = normalizeSecretImageZoom({
      ...state.secretImageZoom,
      scale: state.secretImageZoom.scale + delta,
    });
    applySecretImageZoom();
  }
  
  async function downloadCurrentDiaryImage() {
    const image = state.dialogImages[state.dialogImageIndex] || {};
    const url = image.image_url || "";
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      const safeTitle = String(state.activeDialogPhoto?.title || "diary-photo").replace(/[\\/:*?\"<>|]+/g, "-");
      link.href = blobUrl;
      link.download = `${safeTitle}-${state.dialogImageIndex + 1}.jpg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (_error) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
  
  function beginSecretImageTouch(event) {
    if (!isZoomableImageDialogOpen()) return;
    if (event.touches.length === 2) {
      const touches = Array.from(event.touches);
      state.dialogSwipeStart = null;
      state.secretImageGesture = {
        type: "pinch",
        startDistance: getTouchDistance(touches),
        startCenter: getTouchCenter(touches),
        startScale: state.secretImageZoom.scale,
        startX: state.secretImageZoom.x,
        startY: state.secretImageZoom.y,
      };
      state.suppressDialogImageClickUntil = Date.now() + 450;
      state.suppressDialogSwipeUntil = Date.now() + 700;
      event.preventDefault();
      return;
    }
    if (event.touches.length === 1 && state.secretImageZoom.scale > 1.01) {
      const touch = event.touches[0];
      state.dialogSwipeStart = null;
      state.secretImageGesture = {
        type: "pan",
        startTouchX: touch.clientX,
        startTouchY: touch.clientY,
        startX: state.secretImageZoom.x,
        startY: state.secretImageZoom.y,
      };
      state.suppressDialogSwipeUntil = Date.now() + 500;
      event.preventDefault();
    }
  }
  
  function moveSecretImageTouch(event) {
    if (!isZoomableImageDialogOpen() || !state.secretImageGesture) return;
    if (state.secretImageGesture.type === "pinch" && event.touches.length >= 2) {
      const touches = Array.from(event.touches);
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      const nextScale = clampNumber(
        state.secretImageGesture.startScale * (distance / Math.max(1, state.secretImageGesture.startDistance)),
        1,
        6
      );
      const mediaRect = els.dialogMedia?.getBoundingClientRect();
      const anchorX = mediaRect
        ? state.secretImageGesture.startCenter.x - (mediaRect.left + mediaRect.width / 2)
        : 0;
      const anchorY = mediaRect
        ? state.secretImageGesture.startCenter.y - (mediaRect.top + mediaRect.height / 2)
        : 0;
      const ratio = nextScale / Math.max(1, state.secretImageGesture.startScale);
      state.secretImageZoom = normalizeSecretImageZoom({
        scale: nextScale,
        x: anchorX - (anchorX - state.secretImageGesture.startX) * ratio + (center.x - state.secretImageGesture.startCenter.x),
        y: anchorY - (anchorY - state.secretImageGesture.startY) * ratio + (center.y - state.secretImageGesture.startCenter.y),
      });
      applySecretImageZoom();
      state.suppressDialogImageClickUntil = Date.now() + 450;
      state.suppressDialogSwipeUntil = Date.now() + 800;
      event.preventDefault();
      return;
    }
    if (state.secretImageGesture.type === "pan" && event.touches.length === 1) {
      const touch = event.touches[0];
      state.secretImageZoom = normalizeSecretImageZoom({
        ...state.secretImageZoom,
        x: state.secretImageGesture.startX + touch.clientX - state.secretImageGesture.startTouchX,
        y: state.secretImageGesture.startY + touch.clientY - state.secretImageGesture.startTouchY,
      });
      applySecretImageZoom();
      state.suppressDialogImageClickUntil = Date.now() + 250;
      state.suppressDialogSwipeUntil = Date.now() + 500;
      event.preventDefault();
    }
  }
  
  function endSecretImageTouch(event) {
    if (!isZoomableImageDialogOpen()) return;
    if (event.touches.length >= 2) {
      beginSecretImageTouch(event);
      return;
    }
    if (event.touches.length === 1 && state.secretImageZoom.scale > 1.01) {
      const touch = event.touches[0];
      state.secretImageGesture = {
        type: "pan",
        startTouchX: touch.clientX,
        startTouchY: touch.clientY,
        startX: state.secretImageZoom.x,
        startY: state.secretImageZoom.y,
      };
      return;
    }
    state.secretImageGesture = null;
    state.suppressDialogSwipeUntil = Date.now() + 600;
    if (state.secretImageZoom.scale <= 1.03) resetSecretImageZoom();
  }
  
  function handleSecretViewerWheel(event) {
    if (isMobileViewport() || !els.dialog?.open || !state.dialogImages.length) return;
  
    const isDiaryDetail = els.dialog.classList.contains("diary-detail-dialog");
    const isDiaryViewer = els.dialog.classList.contains("diary-image-fullscreen");
    const isSecretDialog = isSecretImageDialogOpen();
    const isSecretViewer = isSecretImageViewerOpen();
    if (!isDiaryDetail && !isDiaryViewer && !isSecretDialog) return;
  
    if (isDiaryViewer || isSecretViewer) {
      if (state.secretImageZoom.scale > 1.01) {
        event.preventDefault();
        const step = event.deltaY > 0 ? -0.18 : 0.18;
        zoomImageViewerAt(state.secretImageZoom.scale + step, event.clientX, event.clientY);
        return;
      }
    }
  
    if (state.dialogImages.length > 1 && Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      state.dialogWheelAccumulator += event.deltaY * unit;
      window.clearTimeout(state.dialogWheelResetTimer);
      state.dialogWheelResetTimer = window.setTimeout(() => {
        state.dialogWheelAccumulator = 0;
      }, 180);
  
      const threshold = 88;
      const now = Date.now();
      if (Math.abs(state.dialogWheelAccumulator) < threshold || now < state.dialogWheelLockedUntil) return;
  
      const direction = state.dialogWheelAccumulator > 0 ? 1 : -1;
      state.dialogWheelAccumulator = 0;
      state.dialogWheelLockedUntil = now + 260;
      moveDialogImage(direction, true);
    }
  }
  
  function preloadDialogNeighbors() {
    if (state.dialogImages.length <= 1) return;
    [-1, 1].forEach((step) => {
      const index = (state.dialogImageIndex + step + state.dialogImages.length) % state.dialogImages.length;
      const url = state.dialogImages[index]?.image_url;
      if (!url) return;
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = url;
    });
  }
  
  function renderDialogMedia(entryDirection = 0) {
    resetSecretImageZoom();
    if (!isSecretImageViewerOpen()) {
      els.dialogImage.style.removeProperty("width");
      els.dialogImage.style.removeProperty("height");
    }
    if (els.dialogMedia) {
      els.dialogMedia.scrollTop = 0;
      els.dialogMedia.scrollLeft = 0;
    }
    const image = state.dialogImages[state.dialogImageIndex] || state.dialogImages[0] || {};
    const imageUrl = getDiaryMediaPosterUrl(image);
    const motionUrl = getDiaryMediaVideoUrl(image);
    const hasMotion = Boolean(motionUrl);
    const dialogVisual = hasMotion ? els.dialogVideo : els.dialogImage;
    const imageRequestId = ++state.dialogImageRequestId;
    const secretTags = normalizeSecretPhotoTags(image);
    els.dialogImage.hidden = hasMotion;
    els.dialogImage.style.display = hasMotion ? "none" : "";
    els.dialogImage.classList.toggle("is-loading", Boolean(imageUrl && !hasMotion));
    els.dialogImage.classList.remove("is-load-error");
    els.dialogImage.dataset.dialogImageRequestId = String(imageRequestId);
    els.dialogImage.removeAttribute("src");
    if (els.dialogVideo) {
      els.dialogVideo.controls = !isMobileViewport();
      stopDiaryMotionVideo(els.dialogVideo);
      els.dialogVideo.hidden = !hasMotion;
      els.dialogVideo.style.display = hasMotion ? "block" : "none";
      if (hasMotion) {
        els.dialogVideo.poster = imageUrl;
        els.dialogVideo.src = motionUrl;
        startDiaryMotionVideo(els.dialogVideo, els.dialogMedia);
      }
    }
    if (isSecretImageViewerOpen()) {
      setSecretViewerStatus(imageUrl ? "loading" : "", imageUrl ? "正在加载图片" : "");
    }
    if (imageUrl && !hasMotion) {
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.onload = () => {
        if (imageRequestId !== state.dialogImageRequestId) return;
        els.dialogImage.src = imageUrl;
        els.dialogImage.classList.remove("is-loading", "is-load-error");
        if (isSecretImageViewerOpen()) setSecretViewerStatus("");
        if (isFittableImageDialogOpen()) {
          requestAnimationFrame(() => {
            if (imageRequestId !== state.dialogImageRequestId) return;
            fitSecretViewerImage();
          });
        }
      };
      preloader.onerror = () => {
        if (imageRequestId !== state.dialogImageRequestId) return;
        els.dialogImage.classList.remove("is-loading");
        els.dialogImage.classList.add("is-load-error");
        if (isSecretImageViewerOpen()) setSecretViewerStatus("error", "图片加载失败，请稍后重试");
      };
      preloader.src = imageUrl;
    }
    if (!hasMotion && isFittableImageDialogOpen()) {
      requestAnimationFrame(() => {
        if (imageRequestId !== state.dialogImageRequestId || !isFittableImageDialogOpen() || !els.dialogImage.complete || !els.dialogImage.naturalWidth) return;
        fitSecretViewerImage();
        els.dialogImage.classList.remove("is-loading", "is-load-error");
        setSecretViewerStatus("");
      });
    }
    els.dialog?.style.setProperty("--diary-viewer-backdrop", `url(${JSON.stringify(imageUrl)})`);
    els.dialogImage.style.removeProperty("transition");
    els.dialogImage.style.removeProperty("opacity");
    els.dialogVideo?.style.removeProperty("transition");
    els.dialogVideo?.style.removeProperty("transform");
    els.dialogVideo?.style.removeProperty("opacity");
    els.dialogImage.alt = `${els.dialogTitle.textContent} ${state.dialogImageIndex + 1}`;
    if (els.dialogVideo) els.dialogVideo.setAttribute("aria-label", `${els.dialogTitle.textContent} ${state.dialogImageIndex + 1}`);
    if (entryDirection) {
      dialogVisual.style.transition = "none";
      dialogVisual.style.transform = `translate3d(${entryDirection * 24}vw, 0, 0)`;
      dialogVisual.style.opacity = "0.6";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dialogVisual.style.transition = "transform 190ms cubic-bezier(0.22, 0.78, 0.2, 1), opacity 170ms ease";
          dialogVisual.style.transform = "translate3d(0, 0, 0)";
          dialogVisual.style.opacity = "1";
        });
      });
    }
    preloadDialogNeighbors();
    if (state.activeSecretDialogItem) {
      els.dialogMeta.textContent = `${secretTags.slice(0, 2).join(" · ")} · ${state.dialogImageIndex + 1} / ${state.dialogImages.length}`;
      els.dialogNote.innerHTML = renderSecretDialogControls(image);
    } else {
      els.dialogNote.textContent = els.dialogNote.textContent || "";
    }
    renderDialogPagination({
      images: state.dialogImages,
      index: state.dialogImageIndex,
      secret: Boolean(state.activeSecretDialogItem),
      previousButton: els.dialogPrev,
      nextButton: els.dialogNext,
      counter: els.dialogCounter,
      dots: els.dialogDots,
      thumbs: els.dialogThumbs,
      onSelect: (index) => {
        state.dialogImageIndex = index;
        renderDialogMedia();
      },
    });
    refreshSecretViewerToolbar();
    bindSecretDialogControls();
  }
  
  function renderSecretDialogControls(image) {
    return buildSecretDialogControls(image);
  }
  
  function bindSecretDialogControls() {
    if (!state.activeSecretDialogItem) return;
    bindSecretDialogControlsView({
      container: els.dialogNote,
      onFavorite: () => {
        const current = state.dialogImages[state.dialogImageIndex] || {};
        void updateSecretDialogImage({ favorite: !current.favorite });
      },
      onRemoveTag: (tag) => void updateSecretDialogImage({ removeTag: tag }),
      onAddTag: (tag) => void updateSecretDialogImage({ addTag: tag }),
    });
  }
  
  function moveDialogImage(step, animate = false) {
    if (state.dialogImages.length <= 1) return;
    const nextIndex = state.activeSecretDialogItem
      ? clampNumber(state.dialogImageIndex + step, 0, state.dialogImages.length - 1)
      : (state.dialogImageIndex + step + state.dialogImages.length) % state.dialogImages.length;
    if (nextIndex === state.dialogImageIndex) {
      els.dialogImage.style.transition = "transform 160ms ease, opacity 160ms ease";
      els.dialogImage.style.transform = "";
      els.dialogImage.style.opacity = "1";
      return;
    }
    state.dialogImageIndex = nextIndex;
    renderDialogMedia(animate ? (step > 0 ? 1 : -1) : 0);
  }
  
  function beginDialogSwipe(event) {
    if (event.target.closest("button")) return;
    if (
      (els.dialog?.classList.contains("diary-image-fullscreen") || isSecretImageViewerOpen()) &&
      !isMobileViewport() &&
      state.secretImageZoom.scale > 1.01
    ) {
      state.desktopImagePan = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: state.secretImageZoom.x,
        startY: state.secretImageZoom.y,
      };
      state.suppressDialogImageClickUntil = Date.now() + 450;
      els.dialogMedia?.setPointerCapture?.(event.pointerId);
      return;
    }
    if (state.dialogImages.length <= 1) return;
    if (isZoomableImageDialogOpen()) {
      if (state.secretImageGesture || state.secretImageZoom.scale > 1.01 || Date.now() < state.suppressDialogSwipeUntil) return;
    }
    state.dialogSwipeStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      tracking: false,
    };
    els.dialogMedia?.setPointerCapture?.(event.pointerId);
  }
  
  function moveDialogSwipe(event) {
    if (state.desktopImagePan?.id === event.pointerId) {
      state.secretImageZoom = normalizeSecretImageZoom({
        ...state.secretImageZoom,
        x: state.desktopImagePan.startX + event.clientX - state.desktopImagePan.x,
        y: state.desktopImagePan.startY + event.clientY - state.desktopImagePan.y,
      });
      applySecretImageZoom();
      return;
    }
    if (!state.dialogSwipeStart || state.dialogSwipeStart.id !== event.pointerId) return;
    if (isZoomableImageDialogOpen() && (state.secretImageGesture || state.secretImageZoom.scale > 1.01)) return;
    const deltaX = event.clientX - state.dialogSwipeStart.x;
    const deltaY = Math.abs(event.clientY - state.dialogSwipeStart.y);
    if (!state.dialogSwipeStart.tracking && Math.abs(deltaX) < 7) return;
    if (!state.dialogSwipeStart.tracking && deltaY > Math.abs(deltaX)) {
      cancelDialogSwipe();
      return;
    }
    state.dialogSwipeStart.tracking = true;
    state.suppressDialogImageClickUntil = Date.now() + 450;
    els.dialogMedia?.classList.add("is-image-swiping");
    els.dialogImage.style.transition = "none";
    els.dialogImage.style.transform = `translate3d(${deltaX * 0.82}px, 0, 0)`;
    els.dialogImage.style.opacity = String(Math.max(0.72, 1 - Math.abs(deltaX) / Math.max(1, window.innerWidth * 1.8)));
  }
  
  function finishDialogSwipe(event) {
    if (state.desktopImagePan?.id === event.pointerId) {
      state.desktopImagePan = null;
      state.suppressDialogImageClickUntil = Date.now() + 180;
      return;
    }
    if (!state.dialogSwipeStart || state.dialogSwipeStart.id !== event.pointerId) return;
    if (isZoomableImageDialogOpen()) {
      if (state.secretImageGesture || state.secretImageZoom.scale > 1.01 || Date.now() < state.suppressDialogSwipeUntil) {
        state.dialogSwipeStart = null;
        return;
      }
    }
    const deltaX = event.clientX - state.dialogSwipeStart.x;
    const deltaY = event.clientY - state.dialogSwipeStart.y;
    const elapsed = Date.now() - state.dialogSwipeStart.time;
    state.dialogSwipeStart = null;
  
    const swipeThreshold = isSecretImageDialogOpen() ? 52 : 48;
    const swipeRatio = isSecretImageDialogOpen() ? 1.2 : 1.25;
    const horizontal = Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * swipeRatio;
    els.dialogMedia?.classList.remove("is-image-swiping");
    if (!horizontal || elapsed > 1200) {
      els.dialogImage.style.transition = "transform 180ms cubic-bezier(0.22, 0.78, 0.2, 1), opacity 180ms ease";
      els.dialogImage.style.transform = "translate3d(0, 0, 0)";
      els.dialogImage.style.opacity = "1";
      return;
    }
    els.dialogImage.style.transition = "transform 140ms ease, opacity 140ms ease";
    els.dialogImage.style.transform = `translate3d(${deltaX < 0 ? "-36vw" : "36vw"}, 0, 0)`;
    els.dialogImage.style.opacity = "0.55";
    window.setTimeout(() => moveDialogImage(deltaX < 0 ? 1 : -1, true), 120);
  }
  
  function cancelDialogSwipe() {
    state.desktopImagePan = null;
    state.dialogSwipeStart = null;
    els.dialogMedia?.classList.remove("is-image-swiping");
    if (state.secretImageZoom.scale <= 1.01) {
      els.dialogImage.style.transition = "transform 180ms cubic-bezier(0.22, 0.78, 0.2, 1), opacity 180ms ease";
      els.dialogImage.style.transform = "translate3d(0, 0, 0)";
      els.dialogImage.style.opacity = "1";
    }
  }
  
  function beginDialogBackSwipe(event) {
    if (!isMobileViewport() || !els.dialog.open) return;
    if (!els.dialog.classList.contains("mobile-page-dialog") && !els.dialog.classList.contains("secret-image-dialog")) return;
    if (event.target.closest("button, input, textarea, select, a")) return;
    const edge = getMobileBackEdge(event.clientX);
    if (!edge) return;
    state.dialogBackSwipeStart = {
      id: event.pointerId,
      edge,
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    };
  }
  
  function finishDialogBackSwipe(event) {
    if (!state.dialogBackSwipeStart || state.dialogBackSwipeStart.id !== event.pointerId) return;
    const edgeBack = isEdgeBackSwipe(state.dialogBackSwipeStart, event);
    state.dialogBackSwipeStart = null;
    if (edgeBack) closePhotoDialog();
  }
  
  function cancelDialogBackSwipe() {
    state.dialogBackSwipeStart = null;
  }
  
  
  return {
    isSecretImageDialogOpen,
    isSecretImageViewerOpen,
    isZoomableImageDialogOpen,
    isFittableImageDialogOpen,
    applySecretImageZoom,
    refreshDiaryViewerToolbar,
    refreshSecretViewerToolbar,
    setSecretViewerStatus,
    fitSecretViewerImage,
    normalizeSecretImageZoom,
    zoomImageViewerAt,
    resetSecretImageZoom,
    adjustDiaryViewerZoom,
    downloadCurrentDiaryImage,
    beginSecretImageTouch,
    moveSecretImageTouch,
    endSecretImageTouch,
    handleSecretViewerWheel,
    preloadDialogNeighbors,
    renderDialogMedia,
    renderSecretDialogControls,
    bindSecretDialogControls,
    moveDialogImage,
    beginDialogSwipe,
    moveDialogSwipe,
    finishDialogSwipe,
    cancelDialogSwipe,
    beginDialogBackSwipe,
    finishDialogBackSwipe,
    cancelDialogBackSwipe,
  };
}
