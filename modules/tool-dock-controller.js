import {
  buildSettingsAccountOverviewMarkup,
  buildSettingsToolOrderMarkup,
} from "./account-view.js";

export function createToolDockController({
  elements,
  state,
  preferenceStore,
  constants,
  getSessionDisplayName,
  renderAvatarMarkup,
}) {
  const els = elements;
  const {
    toolDockOrderKey,
    toolDockDefaultOrder,
    toolDockLabels,
  } = constants;

  function getToolDockOrderStorageKey(userId = state.session?.user?.id || "guest") {
    return preferenceStore.scopedKey(toolDockOrderKey, userId);
  }
  
  function normalizeToolDockOrder(order) {
    const seen = new Set();
    const normalized = Array.isArray(order)
      ? order.filter((id) => {
          const valid = toolDockDefaultOrder.includes(id) && !seen.has(id);
          if (valid) seen.add(id);
          return valid;
        })
      : [];
    return [
      ...normalized,
      ...toolDockDefaultOrder.filter((id) => !seen.has(id)),
    ];
  }
  
  function loadToolDockOrder(userId = state.session?.user?.id || "guest") {
    const order = preferenceStore.readJson(toolDockOrderKey, [], {
      scope: userId,
      legacyKey: toolDockOrderKey,
    });
    return normalizeToolDockOrder(order);
  }
  
  function writeToolDockOrder(order, userId = state.session?.user?.id || "guest") {
    preferenceStore.writeJson(toolDockOrderKey, normalizeToolDockOrder(order), {
      scope: userId,
    });
  }
  
  function saveToolDockOrder(userId = state.session?.user?.id || "guest") {
    if (!els.toolDock) return;
    const order = Array.from(els.toolDock.querySelectorAll("[data-tool-id]")).map(
      (button) => button.dataset.toolId
    );
    writeToolDockOrder(order, userId);
    renderSettingsToolOrderPanel();
  }
  
  function applyToolDockOrder(userId = state.session?.user?.id || "guest") {
    if (!els.toolDock) return;
    const buttons = new Map(
      Array.from(els.toolDock.querySelectorAll("[data-tool-id]")).map((button) => [
        button.dataset.toolId,
        button,
      ])
    );
    loadToolDockOrder(userId).forEach((id) => {
      const button = buttons.get(id);
      if (button) els.toolDock.appendChild(button);
    });
    ensureToolDockSortControls();
    renderSettingsToolOrderPanel();
  }
  
  function renderSettingsToolOrderPanel() {
    if (!els.settingsToolOrderList) return;
    const order = loadToolDockOrder();
    els.settingsToolOrderList.innerHTML = buildSettingsToolOrderMarkup(order, toolDockLabels);
    els.settingsToolOrderList
      .querySelectorAll("[data-tool-order-move]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const [id, directionText] = String(button.dataset.toolOrderMove || "").split(":");
          const direction = Number(directionText || 0);
          const nextOrder = [...loadToolDockOrder()];
          const index = nextOrder.indexOf(id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= nextOrder.length) return;
          [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];
          writeToolDockOrder(nextOrder);
          applyToolDockOrder();
        });
      });
  }
  
  function renderSettingsAccountOverview() {
    const group = document.querySelector("#settingsAccount");
    if (!group) return;
    const overview = group.querySelector(".settings-account-overview");
    if (!overview) return;
    const displayName = state.session ? getSessionDisplayName() : "未登录";
    const username = state.session?.user?.user_metadata?.username || state.session?.user?.email?.split("@")[0] || "";
    overview.innerHTML = buildSettingsAccountOverviewMarkup({
      signedIn: Boolean(state.session),
      displayName,
      username,
      avatarMarkup: renderAvatarMarkup(state.session?.user?.id, "settings-account-avatar-image"),
    });
  }
  
  function ensureToolDockSortControls() {
    if (!els.toolDock) return;
    els.toolDock.querySelectorAll(".tool-sort-controls").forEach((node) => node.remove());
  }
  
  function startToolDockPointer(event) {
    return;
  }
  
  function beginToolDockTouchSort(button) {
    if (!state.toolDockDragState || state.toolDockDragState.button !== button) return;
    ensureToolDockSortControls();
    state.suppressToolDockClick = true;
    state.toolDockDragState.dragging = false;
    state.toolDockDragState.sortingOnly = true;
    els.toolDock.classList.add("sorting", "touch-sorting");
    els.toolDock
      .querySelectorAll(".tool-dock-button.sort-selected")
      .forEach((item) => item.classList.remove("sort-selected"));
    button.classList.add("sort-selected");
  }
  
  function beginToolDockDrag(button, pointerId) {
    if (!state.toolDockDragState || state.toolDockDragState.button !== button) return;
    state.toolDockDragState.dragging = true;
    state.suppressToolDockClick = true;
    els.toolDock.classList.add("sorting");
    button.classList.add("dragging");
    button.style.width = `${button.getBoundingClientRect().width}px`;
    button.setPointerCapture?.(pointerId);
  }
  
  function moveToolDockPointer(event) {
    if (!state.toolDockDragState) return;
  
    const dx = Math.abs(event.clientX - state.toolDockDragState.startX);
    const dy = Math.abs(event.clientY - state.toolDockDragState.startY);
    if (state.toolDockDragState.sortingOnly) {
      event.preventDefault();
      return;
    }
    if (!state.toolDockDragState.dragging && Math.max(dx, dy) > 12) {
      window.clearTimeout(state.toolDockDragState.timer);
      if (state.toolDockDragState.touchMode) return;
      beginToolDockDrag(state.toolDockDragState.button, state.toolDockDragState.pointerId);
    }
    if (!state.toolDockDragState?.dragging) return;
  
    event.preventDefault();
    const draggingButton = state.toolDockDragState.button;
    const siblings = Array.from(
      els.toolDock.querySelectorAll(".tool-dock-button[data-tool-id]:not(.dragging)")
    ).filter((button) => !button.hidden);
    const pointerX = event.clientX;
    const pointerY = event.clientY;
    const nextSibling =
      siblings.find((button) => {
        const rect = button.getBoundingClientRect();
        return pointerY < rect.top + rect.height && pointerX < rect.left + rect.width / 2;
      }) ||
      siblings.find((button) => {
        const rect = button.getBoundingClientRect();
        return pointerY < rect.top + rect.height / 2;
      }) ||
      null;
    els.toolDock.insertBefore(draggingButton, nextSibling);
  }
  
  function finishToolDockPointer() {
    if (!state.toolDockDragState) return;
    window.clearTimeout(state.toolDockDragState.timer);
    if (state.toolDockDragState.dragging) {
      state.toolDockDragState.button.classList.remove("dragging");
      state.toolDockDragState.button.style.removeProperty("width");
      els.toolDock.classList.remove("sorting");
      saveToolDockOrder();
      window.setTimeout(() => {
        state.suppressToolDockClick = false;
      }, 0);
    }
    state.toolDockDragState = null;
  }
  
  function handleToolDockClick(event) {
    const sortButton = event.target.closest("[data-tool-sort]");
    if (sortButton && els.toolDock?.classList.contains("touch-sorting")) {
      event.preventDefault();
      event.stopPropagation();
      const item = sortButton.closest(".tool-dock-button[data-tool-id]");
      moveToolDockItem(item, Number(sortButton.dataset.toolSort) || 0);
      state.suppressToolDockClick = true;
      return;
    }
    if (els.toolDock?.classList.contains("touch-sorting")) {
      const item = event.target.closest(".tool-dock-button[data-tool-id]");
      if (item) {
        event.preventDefault();
        event.stopPropagation();
        els.toolDock
          .querySelectorAll(".tool-dock-button.sort-selected")
          .forEach((button) => button.classList.remove("sort-selected"));
        item.classList.add("sort-selected");
        state.suppressToolDockClick = true;
        return;
      }
    }
    if (!state.suppressToolDockClick) return;
    event.preventDefault();
    event.stopPropagation();
    state.suppressToolDockClick = false;
  }
  
  function moveToolDockItem(item, direction) {
    if (!item || !direction || !els.toolDock) return;
    const visible = Array.from(els.toolDock.querySelectorAll(".tool-dock-button[data-tool-id]")).filter(
      (button) => !button.hidden
    );
    const index = visible.indexOf(item);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= visible.length) return;
    if (direction < 0) {
      els.toolDock.insertBefore(item, visible[targetIndex]);
    } else {
      els.toolDock.insertBefore(visible[targetIndex], item);
    }
    item.classList.add("sort-selected");
    saveToolDockOrder();
  }
  
  function exitToolDockTouchSort() {
    if (!els.toolDock?.classList.contains("touch-sorting")) return;
    els.toolDock.classList.remove("sorting", "touch-sorting");
    els.toolDock
      .querySelectorAll(".tool-dock-button.sort-selected")
      .forEach((button) => button.classList.remove("sort-selected"));
    saveToolDockOrder();
    window.setTimeout(() => {
      state.suppressToolDockClick = false;
    }, 0);
  }
  
  
  return {
    getToolDockOrderStorageKey,
    normalizeToolDockOrder,
    loadToolDockOrder,
    writeToolDockOrder,
    saveToolDockOrder,
    applyToolDockOrder,
    renderSettingsToolOrderPanel,
    renderSettingsAccountOverview,
    ensureToolDockSortControls,
    startToolDockPointer,
    beginToolDockTouchSort,
    beginToolDockDrag,
    moveToolDockPointer,
    finishToolDockPointer,
    handleToolDockClick,
    moveToolDockItem,
    exitToolDockTouchSort,
  };
}
