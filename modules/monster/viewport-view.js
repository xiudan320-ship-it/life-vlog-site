export function readGameInsets() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(["top", "right", "bottom", "left"].map((edge) => [edge, parseFloat(style.getPropertyValue(`--monster-safe-${edge}`)) || 0]));
}

export function nodeScreenBox(node, frame, cc) {
  const bounds = frame.getBoundingClientRect();
  const a = node.convertToWorldSpace(cc.p(0, 0));
  const b = node.convertToWorldSpace(cc.p(node.width, node.height));
  return { left: bounds.left + Math.min(a.x, b.x) / cc.winSize.width * bounds.width,
    right: bounds.left + Math.max(a.x, b.x) / cc.winSize.width * bounds.width,
    top: bounds.top + (cc.winSize.height - Math.max(a.y, b.y)) / cc.winSize.height * bounds.height,
    bottom: bounds.top + (cc.winSize.height - Math.min(a.y, b.y)) / cc.winSize.height * bounds.height };
}

// The on-screen keyboard changes the visual viewport, not always 100dvh.
// Keep the full-bleed game intact while fitting native dialogs above it.
export function observeVisibleViewport(update) {
  function refresh() {
    const viewport = window.visualViewport;
    document.documentElement.style.setProperty("--monster-visible-height", `${viewport.height}px`);
    document.documentElement.style.setProperty("--monster-visible-top", `${viewport.offsetTop}px`);
    update();
  }
  window.visualViewport.addEventListener("resize", refresh);
  window.visualViewport.addEventListener("scroll", refresh);
  window.addEventListener("resize", refresh);
  refresh();
}
