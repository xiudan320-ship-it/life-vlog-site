import {
  isDiaryFeedMotionAllowed,
  selectDiaryFeedMotionCandidate,
  shouldLoopDiaryFeedMotion,
} from "./diary-feed-motion-domain.js";

function getViewport(windowTarget, documentTarget) {
  const visualViewport = windowTarget?.visualViewport;
  return {
    width: Number(visualViewport?.width) || Number(windowTarget?.innerWidth) || Number(documentTarget?.documentElement?.clientWidth) || 0,
    height: Number(visualViewport?.height) || Number(windowTarget?.innerHeight) || Number(documentTarget?.documentElement?.clientHeight) || 0,
  };
}

function isElementVisibleInViewport(element, viewport) {
  const rect = element?.getBoundingClientRect?.();
  if (!rect) return false;
  return rect.bottom > 0 && rect.right > 0 && rect.top < viewport.height && rect.left < viewport.width;
}

function isPosterReady(image) {
  if (!image || image.dataset.lazySrc) return false;
  if (image.classList?.contains("is-loaded")) return true;
  return Boolean(image.complete && Number(image.naturalWidth) > 0);
}

function isRouteActive(root, documentTarget) {
  if (!root || root.hidden || root.isConnected === false) return false;
  if (documentTarget?.hidden || documentTarget?.visibilityState === "hidden") return false;
  let current = root;
  while (current) {
    if (current.hidden || current.getAttribute?.("hidden") !== null) return false;
    current = current.parentElement;
  }
  return true;
}

function addListener(target, type, handler, options, cleanups) {
  if (!target?.addEventListener) return;
  target.addEventListener(type, handler, options);
  cleanups.push(() => target.removeEventListener?.(type, handler, options));
}

export function createDiaryFeedMotionCoordinator({
  root,
  windowTarget = root?.ownerDocument?.defaultView || globalThis.window,
  documentTarget = root?.ownerDocument || globalThis.document,
} = {}) {
  const images = [...root?.querySelectorAll?.("img.feed-image[data-motion-src]") || []];
  const cleanups = [];
  const records = new Map(images.map((image) => [image, {
    image,
    video: null,
    currentTime: 0,
    duration: null,
    ended: false,
    autoplayBlocked: false,
    videoCleanups: [],
  }]));
  const visibleImages = new Set();
  let activeRecord = null;
  let observer = null;
  let frame = null;
  let destroyed = false;

  const schedule = () => {
    if (destroyed || frame !== null) return;
    const run = () => {
      frame = null;
      reconcile();
    };
    if (typeof windowTarget?.requestAnimationFrame === "function") {
      frame = windowTarget.requestAnimationFrame(run);
    } else {
      frame = -1;
      queueMicrotask(run);
    }
  };

  const releaseRecord = (record, { preserveProgress = true, preserveEnded = false } = {}) => {
    if (!record?.video) return;
    const video = record.video;
    if (preserveProgress && Number.isFinite(video.currentTime)) {
      record.currentTime = Math.max(0, video.currentTime);
    }
    record.videoCleanups.splice(0).forEach((cleanup) => cleanup());
    video.pause?.();
    video.removeAttribute?.("src");
    video.load?.();
    video.remove?.();
    record.video = null;
    record.duration = null;
    if (!preserveEnded) record.ended = false;
    record.image.removeAttribute?.("data-motion-active");
    if (activeRecord === record) activeRecord = null;
  };

  const blockRecord = (record) => {
    record.autoplayBlocked = true;
    releaseRecord(record);
    schedule();
  };

  const startRecord = (record) => {
    if (!record || record.video || record.ended || record.autoplayBlocked) return false;
    const source = record.image.dataset.motionSrc;
    if (!source || !isPosterReady(record.image) || !isElementVisibleInViewport(record.image, getViewport(windowTarget, documentTarget))) return false;
    const mediaDocument = record.image.ownerDocument || documentTarget;
    const video = mediaDocument?.createElement?.("video");
    const shell = record.image.closest?.(".feed-media-shell") || record.image.parentElement;
    if (!video || !shell) return false;
    if (activeRecord && activeRecord !== record) releaseRecord(activeRecord);
    video.className = "feed-motion-preview";
    video.poster = record.image.dataset.fullSrc || record.image.currentSrc || record.image.src;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = false;
    video.playsInline = true;
    video.controls = false;
    video.preload = "metadata";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.src = source;
    const listen = (type, handler) => {
      video.addEventListener?.(type, handler);
      record.videoCleanups.push(() => video.removeEventListener?.(type, handler));
    };
    const tryPlay = () => {
      if (activeRecord !== record || record.ended || record.autoplayBlocked) return;
      const promise = video.play?.();
      promise?.catch?.(() => blockRecord(record));
    };
    listen("loadedmetadata", () => {
      record.duration = Number(video.duration);
      video.loop = shouldLoopDiaryFeedMotion(record.duration);
      if (record.currentTime > 0 && (!Number.isFinite(record.duration) || record.currentTime < record.duration)) {
        try { video.currentTime = record.currentTime; } catch { record.currentTime = 0; }
      }
      tryPlay();
    });
    listen("canplay", tryPlay);
    listen("error", () => blockRecord(record));
    listen("abort", () => blockRecord(record));
    listen("ended", () => {
      record.ended = true;
      record.currentTime = 0;
      releaseRecord(record, { preserveProgress: false, preserveEnded: true });
      schedule();
    });
    shell.append?.(video);
    record.video = video;
    record.image.dataset.motionActive = "true";
    activeRecord = record;
    video.load?.();
    tryPlay();
    return true;
  };

  function reconcile() {
    if (destroyed) return;
    const pageVisible = !(documentTarget?.hidden || documentTarget?.visibilityState === "hidden");
    const routeActive = isRouteActive(root, documentTarget);
    const reducedMotion = typeof windowTarget?.matchMedia === "function"
      && windowTarget.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = windowTarget?.navigator?.connection || globalThis.navigator?.connection;
    const allowed = isDiaryFeedMotionAllowed({
      pageVisible,
      routeActive,
      reducedMotion,
      saveData: Boolean(connection?.saveData),
    });
    if (!allowed) {
      if (activeRecord) releaseRecord(activeRecord);
      return;
    }
    const viewport = getViewport(windowTarget, documentTarget);
    const candidates = [...visibleImages]
      .map((image) => records.get(image))
      .filter((record) => record
        && !record.ended
        && !record.autoplayBlocked
        && isPosterReady(record.image)
        && isElementVisibleInViewport(record.image, viewport))
      .map((record) => ({ element: record.image, rect: record.image.getBoundingClientRect() }));
    const nextImage = selectDiaryFeedMotionCandidate(
      candidates,
      viewport,
      activeRecord?.image || null,
    );
    if (!nextImage) {
      if (activeRecord) releaseRecord(activeRecord);
      return;
    }
    if (activeRecord?.image === nextImage) return;
    startRecord(records.get(nextImage));
  }

  const refresh = () => {
    if (destroyed) return;
    schedule();
  };

  const pause = () => {
    if (activeRecord) releaseRecord(activeRecord);
  };

  const resume = () => {
    if (!destroyed) schedule();
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (frame !== null && frame !== -1) windowTarget?.cancelAnimationFrame?.(frame);
    frame = null;
    observer?.disconnect?.();
    observer = null;
    pause();
    cleanups.splice(0).forEach((cleanup) => cleanup());
    records.forEach((record) => record.videoCleanups.splice(0).forEach((cleanup) => cleanup()));
    records.clear();
    visibleImages.clear();
  };

  const Observer = windowTarget?.IntersectionObserver || globalThis.IntersectionObserver;
  if (Observer && images.length) {
    observer = new Observer((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleImages.add(entry.target);
        else visibleImages.delete(entry.target);
      });
      schedule();
    }, { rootMargin: "0px", threshold: [0, 0.2] });
    images.forEach((image) => observer.observe(image));
  }
  images.forEach((image) => {
    addListener(image, "load", refresh, undefined, cleanups);
    addListener(image, "error", refresh, undefined, cleanups);
  });
  addListener(windowTarget, "scroll", refresh, { passive: true }, cleanups);
  addListener(windowTarget, "resize", refresh, { passive: true }, cleanups);
  addListener(windowTarget?.visualViewport, "scroll", refresh, { passive: true }, cleanups);
  addListener(windowTarget?.visualViewport, "resize", refresh, { passive: true }, cleanups);
  addListener(documentTarget, "visibilitychange", () => {
    if (documentTarget?.visibilityState === "hidden" || documentTarget?.hidden) pause();
    else resume();
  }, undefined, cleanups);
  addListener(windowTarget, "pagehide", pause, undefined, cleanups);
  addListener(windowTarget, "pageshow", resume, undefined, cleanups);

  return Object.freeze({
    pause,
    resume,
    refresh,
    destroy,
    getActiveElement: () => activeRecord?.image || null,
    getState: (image) => records.get(image) || null,
  });
}
