export function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getTouchDistance(touches) {
  const [first, second] = touches;
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

export function getTouchCenter(touches) {
  const [first, second] = touches;
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

export function isEdgeBackSwipe(
  start,
  event,
  { threshold = 72, ratio = 1.35, maxElapsed = 1200 } = {}
) {
  if (!start) return false;
  const deltaX = event.clientX - start.x;
  const deltaY = Math.abs(event.clientY - start.y);
  const elapsed = Date.now() - start.time;
  const fromLeft = start.edge === "left" && deltaX > threshold;
  const fromRight = start.edge === "right" && deltaX < -threshold;
  return (fromLeft || fromRight) && Math.abs(deltaX) > deltaY * ratio && elapsed < maxElapsed;
}

export function getMobileBackEdge(
  clientX,
  {
    mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 920px)").matches,
    viewportWidth = globalThis.innerWidth || 0,
    edgeSize = 38,
  } = {}
) {
  if (!mobile) return "";
  if (clientX <= edgeSize) return "left";
  if (clientX >= viewportWidth - edgeSize) return "right";
  return "";
}
