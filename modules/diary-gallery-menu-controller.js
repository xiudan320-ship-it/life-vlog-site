const menuStates = new WeakMap();

function closeMenu(state, { restoreFocus = false } = {}) {
  state.container.querySelectorAll("[data-photo-menu]").forEach((menu) => {
    menu.querySelector("[data-photo-menu-trigger]")?.setAttribute("aria-expanded", "false");
    menu.querySelector(".photo-menu-panel")?.setAttribute("hidden", "");
  });
  const openId = state.openId;
  state.openId = "";
  if (restoreFocus && openId) {
    [...state.container.querySelectorAll("[data-photo-menu-trigger]")]
      .find((trigger) => trigger.dataset.photoMenuTrigger === openId)
      ?.focus?.();
  }
}

export function bindDiaryGalleryMenu(container, photos, handlers) {
  let state = menuStates.get(container);
  if (!state) {
    const documentTarget = container.ownerDocument || document;
    state = { container, photos, handlers, openId: "" };
    state.onDocumentClick = (event) => {
      if (!container.contains(event.target)) closeMenu(state);
    };
    state.onDocumentKeydown = (event) => {
      if (!state.openId) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(state, { restoreFocus: true });
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const menu = [...container.querySelectorAll("[data-photo-menu]")]
        .find((item) => item.dataset.photoMenu === state.openId);
      const items = [...(menu?.querySelectorAll("[role=menuitem]") || [])];
      if (!items.length) return;
      const currentIndex = items.indexOf(documentTarget.activeElement);
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (currentIndex + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      event.preventDefault();
      items[nextIndex]?.focus?.();
    };
    state.onClick = (event) => {
      const button = event.target.closest("button");
      if (!button || !container.contains(button)) return;
      const trigger = button.closest("[data-photo-menu-trigger]");
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        const id = trigger.dataset.photoMenuTrigger || "";
        const isOpen = state.openId === id;
        closeMenu(state);
        if (!isOpen) {
          const menu = trigger.closest("[data-photo-menu]");
          trigger.setAttribute("aria-expanded", "true");
          menu?.querySelector(".photo-menu-panel")?.removeAttribute("hidden");
          state.openId = id;
        }
        return;
      }
      const action = button.closest("[data-photo-menu-action]");
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      const photo = state.photos.find((item) => String(item?.id || "") === String(action.dataset.photoMenuPhotoId || ""));
      const actionId = action.dataset.photoMenuAction;
      closeMenu(state, { restoreFocus: true });
      if (!photo) return;
      if (actionId === "delete") void state.handlers.delete?.(photo, action);
      else if (actionId === "category") void state.handlers.adminCategory?.(photo, action);
      else if (actionId === "feature" || actionId === "unfeature") void state.handlers.flag?.(photo, "is_featured");
      else if (actionId === "pin") void state.handlers.flag?.(photo, "is_pinned");
      else if (actionId === "unpin" || actionId === "admin-unpin") void state.handlers.flag?.(photo, "is_pinned", { adminUnpin: actionId === "admin-unpin" });
      else if (actionId === "edit") state.handlers.edit?.(photo);
    };
    documentTarget.addEventListener?.("click", state.onDocumentClick);
    documentTarget.addEventListener?.("keydown", state.onDocumentKeydown);
    container.addEventListener?.("click", state.onClick);
    menuStates.set(container, state);
  }
  state.photos = photos;
  state.handlers = handlers;
  closeMenu(state, { restoreFocus: Boolean(state.openId) });
}
