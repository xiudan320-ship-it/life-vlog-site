import {
  getPrimaryNavigationItem,
  PRIMARY_NAVIGATION_MAX_ENABLED,
} from "./primary-navigation-domain.js";

function getDocument(root) {
  return root?.ownerDocument || globalThis.document;
}

function isActiveItem(item, { activePage = "gallery", activeFilter = "全部" } = {}) {
  if (item.type === "mode") return item.mode === "vlog" && activePage === "gallery" && activeFilter === "VLOG";
  if (item.type === "dialog") return false;
  return item.route === activePage && (item.id !== "gallery" || activeFilter !== "VLOG");
}

export function renderPrimaryNavigation(root, items = []) {
  if (!root) return;
  const documentTarget = getDocument(root);
  const fragment = documentTarget.createDocumentFragment();
  items.forEach((item) => {
    const button = documentTarget.createElement("button");
    button.type = "button";
    button.className = "primary-nav-item";
    button.dataset.primaryNavId = item.id;
    button.textContent = item.label;
    button.setAttribute("aria-label", item.label);
    if (item.type === "mode") button.setAttribute("aria-pressed", "false");
    if (item.type === "dialog") {
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-controls", `${item.dialog}Dialog`);
    }
    fragment.append(button);
  });
  root.replaceChildren(fragment);
  delete root.dataset.primaryNavActive;
}

export function syncPrimaryNavigationState(
  root,
  { activePage = "gallery", activeFilter = "全部" } = {}
) {
  if (!root) return "";
  const buttons = [...root.querySelectorAll("[data-primary-nav-id]")];
  let activeId = "";
  buttons.forEach((button) => {
    const item = getPrimaryNavigationItem(button.dataset.primaryNavId) || {
      id: button.dataset.primaryNavId,
      type: "route",
      route: button.dataset.primaryNavId,
    };
    const itemActive = isActiveItem(
      item,
      { activePage, activeFilter }
    );
    if (itemActive) activeId = button.dataset.primaryNavId;
    button.classList.toggle("active", itemActive);
    if (item.type === "mode") {
      button.setAttribute("aria-pressed", String(itemActive));
      button.removeAttribute("aria-current");
    } else if (itemActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  const previousActiveId = root.dataset.primaryNavActive || "";
  if (activeId) root.dataset.primaryNavActive = activeId;
  else delete root.dataset.primaryNavActive;
  if (activeId && activeId !== previousActiveId) {
    root.querySelector(`[data-primary-nav-id="${activeId}"]`)?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }
  return activeId;
}

function createSettingsButton(documentTarget, label, id, direction, disabled) {
  const button = documentTarget.createElement("button");
  button.type = "button";
  button.dataset.primaryNavMove = `${id}:${direction}`;
  button.setAttribute("aria-label", `${label}${direction === "up" ? "上移" : "下移"}`);
  button.textContent = direction === "up" ? "上移" : "下移";
  button.disabled = disabled;
  return button;
}

export function renderPrimaryNavigationSettings(root, items = [], enabledIds = []) {
  if (!root) return;
  const list = root.querySelector("[data-primary-navigation-settings-list]");
  if (!list) return;
  const documentTarget = getDocument(root);
  const enabled = new Set(enabledIds);
  const enabledTotal = enabled.size;
  const fragment = documentTarget.createDocumentFragment();
  items.forEach((item, index) => {
    const enabledItem = enabled.has(item.id);
    const row = documentTarget.createElement("article");
    row.className = "settings-primary-navigation-row";
    row.dataset.primaryNavSettingId = item.id;

    const header = documentTarget.createElement("div");
    header.className = "settings-primary-navigation-row-copy";
    const copy = documentTarget.createElement("div");
    copy.className = "settings-primary-navigation-copy";
    const title = documentTarget.createElement("strong");
    title.textContent = item.label;
    const description = documentTarget.createElement("small");
    description.textContent = item.description;
    copy.append(title, description);

    const toggleLabel = documentTarget.createElement("label");
    toggleLabel.className = "settings-primary-navigation-toggle";
    const toggle = documentTarget.createElement("input");
    toggle.type = "checkbox";
    toggle.dataset.primaryNavToggle = item.id;
    toggle.checked = enabledItem;
    toggle.disabled =
      item.id === "gallery" || (!enabledItem && enabledTotal >= PRIMARY_NAVIGATION_MAX_ENABLED);
    toggle.setAttribute("aria-label", `显示${item.label}`);
    const toggleText = documentTarget.createElement("span");
    toggleText.textContent = "显示";
    toggleLabel.append(toggle, toggleText);
    header.append(copy, toggleLabel);

    const actions = documentTarget.createElement("div");
    actions.className = "settings-primary-navigation-row-actions";
    const enabledBefore = items.slice(0, index).filter((candidate) => enabled.has(candidate.id)).length;
    const enabledCount = items.filter((candidate) => enabled.has(candidate.id)).length;
    actions.append(
      createSettingsButton(documentTarget, item.label, item.id, "up", !enabledItem || enabledBefore === 0),
      createSettingsButton(documentTarget, item.label, item.id, "down", !enabledItem || enabledBefore >= enabledCount - 1)
    );

    row.append(header, actions);
    fragment.append(row);
  });
  list.replaceChildren(fragment);
}

export function setPrimaryNavigationSettingsStatus(root, message = "") {
  const status = root?.querySelector?.("[data-primary-navigation-status]");
  if (status) status.textContent = message;
}
