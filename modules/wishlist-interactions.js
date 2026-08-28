const SWIPE_OPEN_DISTANCE = 72;
const LONG_PRESS_DELAY = 450;
const GESTURE_INTENT_DISTANCE = 8;

function closestCard(target) {
  return target instanceof Element ? target.closest(".wish-card") : null;
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(
    target.closest("button, a, input, textarea, select, [data-wish-menu]")
  );
}

export function createWishlistInteractions({
  listElement,
  onAdd,
  onOpenImage,
  onOpenDetail,
  onToggle,
  onOpenMenu,
  onSwipeToggle,
  onRemove,
  canReorder = () => false,
  onReorder,
}) {
  let activeSwipeCard = null;
  let pointerState = null;
  let suppressClick = false;
  let suppressClickTimer = null;

  function setClickSuppressed() {
    suppressClick = true;
    if (suppressClickTimer) window.clearTimeout(suppressClickTimer);
    suppressClickTimer = window.setTimeout(() => {
      suppressClick = false;
      suppressClickTimer = null;
    }, 260);
  }

  function closeSwipe(card = activeSwipeCard) {
    if (!card) return;
    card.classList.remove("is-swipe-open", "is-swiping");
    card.style.removeProperty("--wish-swipe-x");
    const actions = card.querySelector(".wish-card-swipe-actions");
    actions?.setAttribute("aria-hidden", "true");
    if (actions) actions.inert = true;
    if (activeSwipeCard === card) activeSwipeCard = null;
  }

  function openSwipe(card) {
    if (activeSwipeCard && activeSwipeCard !== card) closeSwipe(activeSwipeCard);
    activeSwipeCard = card;
    card.classList.add("is-swipe-open");
    card.style.setProperty("--wish-swipe-x", `-${SWIPE_OPEN_DISTANCE}px`);
    const actions = card.querySelector(".wish-card-swipe-actions");
    actions?.setAttribute("aria-hidden", "false");
    if (actions) actions.inert = false;
  }

  function cancelLongPress() {
    if (!pointerState?.longPressTimer) return;
    window.clearTimeout(pointerState.longPressTimer);
    pointerState.longPressTimer = null;
  }

  function beginReorder() {
    if (!pointerState || !canReorder(pointerState.card)) return;
    pointerState.dragging = true;
    setClickSuppressed();
    closeSwipe();
    pointerState.card.classList.add("is-dragging");
    listElement.classList.add("is-reordering");
  }

  function moveDraggedCard(clientY) {
    if (!pointerState?.dragging) return;
    const dragged = pointerState.card;
    const cards = [...listElement.querySelectorAll(".wish-card:not(.is-dragging)")];
    const target = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    if (target) listElement.insertBefore(dragged, target);
    else listElement.append(dragged);
  }

  function finishReorder() {
    if (!pointerState?.dragging) return;
    const ids = [...listElement.querySelectorAll(".wish-card[data-wish-id]")]
      .map((card) => card.dataset.wishId)
      .filter(Boolean);
    pointerState.card.classList.remove("is-dragging");
    listElement.classList.remove("is-reordering");
    onReorder?.(ids);
  }

  function handleClick(event) {
    const target = event.target;
    const addButton = target instanceof Element ? target.closest("[data-add-wish]") : null;
    if (addButton) {
      event.preventDefault();
      onAdd?.();
      return;
    }
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const card = closestCard(target);
    if (!card) return;
    const id = card.dataset.wishId;
    const imageButton = target instanceof Element ? target.closest("[data-wish-image]") : null;
    if (imageButton) {
      event.preventDefault();
      onOpenImage?.(imageButton.dataset.wishImage || id);
      return;
    }
    const detail = target instanceof Element ? target.closest("[data-view-wish-detail]") : null;
    if (detail) {
      event.preventDefault();
      onOpenDetail?.(detail.dataset.viewWishDetail || id);
      return;
    }
    const toggleButton = target instanceof Element ? target.closest("[data-toggle-wish]") : null;
    if (toggleButton) {
      event.preventDefault();
      closeSwipe(card);
      onToggle?.(toggleButton.dataset.toggleWish || id);
      return;
    }
    const menuButton = target instanceof Element ? target.closest("[data-wish-menu]") : null;
    if (menuButton) {
      event.preventDefault();
      onOpenMenu?.(menuButton.dataset.wishMenu || id);
      return;
    }
    const swipeButton = target instanceof Element ? target.closest("[data-wish-swipe-action]") : null;
    if (swipeButton) {
      event.preventDefault();
      closeSwipe(card);
      if (swipeButton.dataset.wishSwipeAction === "toggle") onSwipeToggle?.(id);
      if (swipeButton.dataset.wishSwipeAction === "delete") onRemove?.(id);
      return;
    }
    if (isInteractiveTarget(target)) return;
    if (card.dataset.wishDetail !== "false") onOpenDetail?.(id);
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const card = closestCard(event.target);
    if (!card || isInteractiveTarget(event.target)) return;
    if (!canReorder(card) && event.pointerType !== "touch") return;
    cancelLongPress();
    pointerState = {
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      swiping: false,
      dragging: false,
      longPressTimer: canReorder(card) ? window.setTimeout(beginReorder, LONG_PRESS_DELAY) : null,
    };
  }

  function handlePointerMove(event) {
    if (!pointerState || event.pointerId !== pointerState.pointerId) return;
    const dx = event.clientX - pointerState.startX;
    const dy = event.clientY - pointerState.startY;
    if (pointerState.dragging) {
      event.preventDefault();
      moveDraggedCard(event.clientY);
      return;
    }
    if (Math.abs(dx) < GESTURE_INTENT_DISTANCE && Math.abs(dy) < GESTURE_INTENT_DISTANCE) return;
    pointerState.moved = true;
    cancelLongPress();
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx >= 0) {
      pointerState.card.classList.remove("is-swiping");
      pointerState.card.style.removeProperty("--wish-swipe-x");
      return;
    }
    pointerState.swiping = true;
    pointerState.card.classList.add("is-swiping");
    pointerState.card.style.setProperty("--wish-swipe-x", `${Math.max(dx, -SWIPE_OPEN_DISTANCE)}px`);
    event.preventDefault();
  }

  function handlePointerUp(event) {
    if (!pointerState || event.pointerId !== pointerState.pointerId) return;
    cancelLongPress();
    if (pointerState.dragging) {
      finishReorder();
      pointerState = null;
      return;
    }
    const current = pointerState;
    pointerState = null;
    if (current.swiping) {
      const dx = event.clientX - current.startX;
      if (dx <= -SWIPE_OPEN_DISTANCE / 2) openSwipe(current.card);
      else closeSwipe(current.card);
      setClickSuppressed();
      return;
    }
    if (current.moved) setClickSuppressed();
  }

  function handlePointerCancel(event) {
    if (!pointerState || event.pointerId !== pointerState.pointerId) return;
    cancelLongPress();
    if (pointerState.dragging) finishReorder();
    else closeSwipe(pointerState.card);
    pointerState = null;
  }

  function bind() {
    listElement.addEventListener("click", handleClick);
    listElement.addEventListener("pointerdown", handlePointerDown);
    listElement.addEventListener("pointermove", handlePointerMove, { passive: false });
    listElement.addEventListener("pointerup", handlePointerUp);
    listElement.addEventListener("pointercancel", handlePointerCancel);
  }

  return { bind, closeSwipe };
}
