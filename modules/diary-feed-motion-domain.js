export const DIARY_FEED_MOTION_LOOP_LIMIT_SECONDS = 8;
export const DIARY_FEED_MOTION_SWITCH_HYSTERESIS_PX = 48;

export function hasDiaryFeedMotionPreview({ type = "", source = "" } = {}) {
  return Boolean(source) && (type === "live" || type === "video");
}

export function shouldLoopDiaryFeedMotion(duration) {
  const seconds = Number(duration);
  return Number.isFinite(seconds)
    && seconds > 0
    && seconds <= DIARY_FEED_MOTION_LOOP_LIMIT_SECONDS;
}

export function isDiaryFeedMotionAllowed({
  pageVisible = true,
  routeActive = true,
  reducedMotion = false,
  saveData = false,
} = {}) {
  return pageVisible && routeActive && !reducedMotion && !saveData;
}

export function getDiaryFeedMotionCenterDistance(rect, viewport = {}) {
  if (!rect) return Number.POSITIVE_INFINITY;
  const left = Number(rect.left);
  const right = Number(rect.right);
  const top = Number(rect.top);
  const bottom = Number(rect.bottom);
  const width = Number(viewport.width);
  const height = Number(viewport.height);
  if (![left, right, top, bottom, width, height].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.hypot(
    (left + right) / 2 - width / 2,
    (top + bottom) / 2 - height / 2,
  );
}

export function selectDiaryFeedMotionCandidate(
  candidates = [],
  viewport = {},
  currentElement = null,
  hysteresisPx = DIARY_FEED_MOTION_SWITCH_HYSTERESIS_PX,
) {
  const ranked = candidates
    .filter((candidate) => candidate?.element && candidate?.rect)
    .map((candidate) => ({
      ...candidate,
      distance: getDiaryFeedMotionCenterDistance(candidate.rect, viewport),
    }))
    .filter(({ distance }) => Number.isFinite(distance))
    .sort((left, right) => left.distance - right.distance);
  const nearest = ranked[0];
  if (!nearest) return null;
  const current = ranked.find(({ element }) => element === currentElement);
  if (!current || current.element === nearest.element) return nearest.element;
  return nearest.distance + Math.max(0, Number(hysteresisPx) || 0) < current.distance
    ? nearest.element
    : current.element;
}
