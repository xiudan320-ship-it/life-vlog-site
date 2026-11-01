export function createMoodPickerDragController({ orbit, moodMeta, onPick }) {
  const documentTarget = orbit.ownerDocument;
  const windowTarget = documentTarget.defaultView;
  let drag = null;
  let suppressClick = false;
  let clickResetTimer = null;

  function updateTarget(inside = false) {
    const target = orbit.querySelector(".mood-picker-center");
    target?.classList.toggle("is-ready", inside);
    const label = inside ? `松开选择\n${moodMeta[drag.button.dataset.mood].label}` : "拖到这里\n选择心情";
    const labelElement = target?.querySelector(".mood-picker-center-label");
    if (labelElement && labelElement.textContent !== label) labelElement.textContent = label;
  }

  function suppressReleaseClick() {
    suppressClick = true;
    windowTarget.clearTimeout(clickResetTimer);
    // A pointer's compatibility click follows pointerup in the same task.
    clickResetTimer = windowTarget.setTimeout(() => { suppressClick = false; }, 0);
  }

  function cancel() {
    if (!drag) return;
    const previous = drag;
    drag = null;
    suppressReleaseClick();
    previous.button.classList.remove("is-dragging");
    previous.button.style.removeProperty("--mood-drag-x");
    previous.button.style.removeProperty("--mood-drag-y");
    orbit.classList.remove("is-dragging");
    updateTarget();
    if (previous.button.hasPointerCapture(previous.pointerId)) previous.button.releasePointerCapture(previous.pointerId);
  }

  function move(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    event.preventDefault();
    drag.button.classList.add("is-dragging");
    orbit.classList.add("is-dragging");
    drag.button.style.setProperty("--mood-drag-x", `${dx}px`);
    drag.button.style.setProperty("--mood-drag-y", `${dy}px`);
    const rect = orbit.querySelector(".mood-picker-center").getBoundingClientRect();
    drag.inside = Math.hypot(drag.centerX + dx - (rect.left + rect.width / 2), drag.centerY + dy - (rect.top + rect.height / 2)) <= Math.min(rect.width, rect.height) / 2;
    updateTarget(drag.inside);
  }

  orbit.addEventListener("pointerdown", (event) => {
    const button = event.target.closest?.("[data-mood]");
    if (drag || !button || !orbit.contains(button) || !event.isPrimary || event.button !== 0) return;
    const rect = button.getBoundingClientRect();
    drag = { button, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, moved: false, inside: false };
    button.setPointerCapture(event.pointerId);
  });
  orbit.addEventListener("pointermove", move);
  orbit.addEventListener("pointerup", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    move(event);
    const { button, moved, inside, pointerId } = drag;
    if (!moved) {
      drag = null;
      if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
      return;
    }
    event.preventDefault();
    cancel();
    if (inside) onPick(button.dataset.mood);
  });
  orbit.addEventListener("pointercancel", (event) => {
    if (drag?.pointerId === event.pointerId) cancel();
  });
  orbit.addEventListener("lostpointercapture", (event) => {
    if (drag?.pointerId === event.pointerId) cancel();
  });
  orbit.addEventListener("click", (event) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  orbit.addEventListener("dragstart", (event) => event.preventDefault());
  documentTarget.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !drag) return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
  }, true);
  windowTarget.addEventListener("blur", cancel);
  windowTarget.addEventListener("resize", cancel);
  documentTarget.addEventListener("visibilitychange", () => { if (documentTarget.hidden) cancel(); });
  return Object.freeze({ cancel });
}
