export function fitVideoToContainer(video, container) {
  if (!video || video.hidden || !container || !video.videoWidth || !video.videoHeight) return;
  const style = getComputedStyle(container);
  const width = Math.max(
    1,
    container.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0),
  );
  const height = Math.max(
    1,
    container.clientHeight - parseFloat(style.paddingTop || 0) - parseFloat(style.paddingBottom || 0),
  );
  const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
  video.style.setProperty("width", `${Math.max(1, video.videoWidth * scale)}px`, "important");
  video.style.setProperty("height", `${Math.max(1, video.videoHeight * scale)}px`, "important");
}

const videoCleanups = new WeakMap();

function getStatusParts(statusElement, statusTextElement, retryButton) {
  return {
    status: statusElement,
    text: statusTextElement || statusElement?.querySelector?.("[data-media-status-text]"),
    retry: retryButton || statusElement?.querySelector?.("[data-media-retry]"),
  };
}

function setVideoStatus(parts, state, message) {
  const { status, text, retry } = parts;
  if (text) text.textContent = message || "";
  else if (status) status.textContent = message || "";
  if (status) {
    status.hidden = !message;
    status.dataset.state = state || "";
  }
  if (retry) retry.hidden = !["error", "stalled"].includes(state);
}

export function startDiaryMotionVideo(
  video,
  container,
  {
    audible = false,
    controlsOnTap = false,
    statusElement = null,
    statusTextElement = null,
    retryButton = null,
    onStateChange = null,
  } = {},
) {
  if (!video) return;

  videoCleanups.get(video)?.();
  video.preload = "metadata";
  const autoplay = !audible;
  video.autoplay = autoplay;
  video.defaultMuted = autoplay;
  video.muted = autoplay;
  video.loop = autoplay;
  video.playsInline = true;
  // Ordinary VLOG video is user-started and must expose controls immediately.
  // `controlsOnTap` is retained in the call shape for existing Live Photo
  // callers, but never hides controls for an audible video.
  video.controls = Boolean(audible);
  video.onclick = null;
  const parts = getStatusParts(statusElement, statusTextElement, retryButton);
  const notify = (state, message) => {
    setVideoStatus(parts, state, message);
    try { onStateChange?.(state, message); } catch { /* status hooks are non-critical */ }
  };

  const playPreview = () => {
    if (!autoplay || video.hidden || (!video.currentSrc && !video.src)) return;
    const promise = video.play?.();
    promise?.catch?.(() => {
      video.autoplay = false;
      video.controls = true;
      notify("error", "视频无法自动播放，请点击播放。",);
    });
  };
  const onLoadedMetadata = () => fitVideoToContainer(video, container);
  const onCanPlay = () => {
    notify("ready", "");
    playPreview();
  };
  const onLoadedData = () => playPreview();
  const onPlay = () => notify("ready", "");
  const onError = () => notify("error", "视频加载失败，请重试。",);
  const onAbort = () => notify("error", "视频加载被中断，请重试。",);
  const onStalled = () => notify("stalled", "视频加载较慢，可以重试。",);
  const onWaiting = () => notify("loading", "正在加载视频…",);
  const retry = () => {
    notify("loading", "正在加载视频…",);
    video.load?.();
    playPreview();
  };
  const listeners = [
    ["loadedmetadata", onLoadedMetadata],
    ["canplay", onCanPlay],
    ["loadeddata", onLoadedData],
    ["play", onPlay],
    ["error", onError],
    ["abort", onAbort],
    ["stalled", onStalled],
    ["waiting", onWaiting],
  ];
  listeners.forEach(([type, handler]) => video.addEventListener?.(type, handler));
  if (parts.retry) parts.retry.addEventListener("click", retry);
  const cleanup = () => {
    listeners.forEach(([type, handler]) => video.removeEventListener?.(type, handler));
    parts.retry?.removeEventListener("click", retry);
    setVideoStatus(parts, "stopped", "");
    if (videoCleanups.get(video) === cleanup) videoCleanups.delete(video);
  };
  videoCleanups.set(video, cleanup);
  notify("loading", "正在加载视频…");
  video.load?.();
  if (video.readyState >= 3) {
    notify("ready", "");
    playPreview();
  }
}

export function stopDiaryMotionVideo(video) {
  if (!video) return;
  videoCleanups.get(video)?.();
  video.onclick = null;
  video.pause();
  video.removeAttribute("src");
  video.removeAttribute("poster");
  video.style.removeProperty("width");
  video.style.removeProperty("height");
  video.load();
}
