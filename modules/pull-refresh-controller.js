export function bindPullRefresh({ target, canStart, refresh, view }) {
  let gesture = null;
  let busy = false;
  let hideTimer;
  const reset = () => { gesture = null; if (!busy) view.hide(); };
  target.addEventListener("touchstart", event => {
    if (busy) return;
    clearTimeout(hideTimer);
    reset();
    if (!canStart() || event.touches.length !== 1 || document.querySelector("dialog[open]")) return;
    if (event.target.closest('input, textarea, select, button, a, [role="button"], .tool-dock, .photo-media')) return;
    const touch = event.touches[0];
    gesture = { x: touch.clientX, y: touch.clientY, distance: 0 };
  }, { passive: true });
  target.addEventListener("touchmove", event => {
    if (!gesture) return;
    if (!canStart() || event.touches.length !== 1) return reset();
    const touch = event.touches[0];
    const dy = touch.clientY - gesture.y;
    if (dy <= 0 || Math.abs(touch.clientX - gesture.x) > dy * .8) return reset();
    if (dy < 8) return;
    if (!event.cancelable) return reset();
    event.preventDefault();
    gesture.distance = Math.min(110, dy * .55);
    view.show(gesture.distance >= 64 ? "ready" : "pulling", gesture.distance);
  }, { passive: false });
  target.addEventListener("touchend", async () => {
    if (!gesture) return;
    const ready = gesture.distance >= 64 && canStart();
    gesture = null;
    if (!ready) return view.hide();
    busy = true;
    view.show("refreshing");
    try {
      const result = await refresh();
      view.show(result === false ? "error" : "success");
    } catch {
      view.show("error");
    } finally {
      busy = false;
      hideTimer = setTimeout(() => view.hide(), 900);
    }
  }, { passive: true });
  target.addEventListener("touchcancel", reset, { passive: true });
}
