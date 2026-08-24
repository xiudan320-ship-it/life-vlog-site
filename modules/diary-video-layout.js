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

export function startDiaryMotionVideo(video, container, { audible = false } = {}) {
  if (!video) return;
  video.preload = "metadata";
  video.autoplay = true;
  video.defaultMuted = !audible;
  video.muted = !audible;
  video.loop = !audible;
  video.playsInline = true;
  if (audible) video.controls = true;
  const play = () => {
    if (video.hidden || (!video.currentSrc && !video.src)) return;
    const promise = video.play();
    promise?.catch(() => {});
  };
  video.onloadeddata = play;
  video.oncanplay = play;
  video.onloadedmetadata = () => fitVideoToContainer(video, container);
  video.load();
  play();
}

export function stopDiaryMotionVideo(video) {
  if (!video) return;
  video.onloadeddata = null;
  video.oncanplay = null;
  video.onloadedmetadata = null;
  video.pause();
  video.removeAttribute("src");
  video.removeAttribute("poster");
  video.style.removeProperty("width");
  video.style.removeProperty("height");
  video.load();
}
