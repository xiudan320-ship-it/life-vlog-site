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

export function startDiaryMotionVideo(video, container) {
  if (!video) return;
  video.preload = "metadata";
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  const play = () => {
    if (video.hidden || !video.currentSrc) return;
    const promise = video.play();
    promise?.catch(() => {});
  };
  video.onloadeddata = play;
  video.oncanplay = play;
  video.onloadedmetadata = () => fitVideoToContainer(video, container);
  video.load();
  if (video.readyState >= 2) play();
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
