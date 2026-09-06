import { renderListIcon } from "./list-icons.js";
import {
  getSettingsSection,
  SETTINGS_SECTION_REGISTRY,
} from "./settings-section-registry.js";

function renderSettingsNavigation() {
  return SETTINGS_SECTION_REGISTRY.map(({ id, label, icon }, index) => `
    <button id="settings-tab-${id}" type="button" data-settings-section="${id}" role="tab" aria-controls="${id}" aria-selected="${String(index === 0)}" tabindex="${index === 0 ? "0" : "-1"}">
      <span class="settings-nav-icon" aria-hidden="true">${renderListIcon(icon)}</span>
      <span class="settings-nav-copy"><strong>${label}</strong><small>进入${label}</small></span>
      <svg class="icon settings-nav-chevron" aria-hidden="true"><use href="#i-chevron-right"></use></svg>
    </button>
  `).join("");
}

function getSettingsTabs(root) {
  return [...(root?.querySelectorAll?.("[data-settings-section]") || [])];
}

export function renderSettingsShell(root) {
  if (!root) return false;
  const nav = root.querySelector("[data-settings-nav]");
  if (!nav) return false;
  if (!nav.children.length) nav.innerHTML = renderSettingsNavigation();
  root.dataset.settingsShellReady = "true";
  return true;
}

export function applySettingsShellSemantics(root, activeSection = "") {
  const mobile = root?.ownerDocument?.defaultView?.matchMedia?.("(max-width: 700px)").matches || false;
  const tabs = getSettingsTabs(root);
  const selectedSection = activeSection
    || tabs.find((button) => button.classList.contains("is-active"))?.dataset.settingsSection
    || tabs.find((button) => button.getAttribute("aria-selected") === "true")?.dataset.settingsSection
    || tabs[0]?.dataset.settingsSection
    || "";
  const nav = root?.querySelector("[data-settings-nav]");
  if (nav) {
    if (mobile) nav.removeAttribute("role");
    else nav.setAttribute("role", "tablist");
  }
  tabs.forEach((button) => {
    const sectionId = button.dataset.settingsSection;
    if (mobile) {
      button.removeAttribute("role");
      button.removeAttribute("aria-controls");
      button.removeAttribute("aria-selected");
      button.removeAttribute("tabindex");
    } else {
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", sectionId);
      button.tabIndex = sectionId === selectedSection ? 0 : -1;
      button.setAttribute("aria-selected", String(sectionId === selectedSection));
    }
    button.classList.toggle("is-active", sectionId === selectedSection);
    button.classList.toggle("active", sectionId === selectedSection);
  });
  root?.querySelectorAll?.(".settings-group").forEach((group) => {
    group.hidden = group.id !== selectedSection;
  });
  return { mobile, selectedSection };
}

export function showMobileSettingsSection(root, sectionId) {
  const section = getSettingsSection(sectionId);
  if (!root || !section) return false;
  const directory = root.querySelector("[data-settings-directory]");
  if (directory) root.dataset.settingsDirectoryScroll = String(directory.scrollTop || 0);
  root.dataset.mobileSettingsSection = section.id;
  root.dataset.settingsDirectoryVisible = "false";
  const header = root.querySelector("[data-settings-mobile-header]");
  const title = root.querySelector("[data-settings-mobile-title]");
  if (header) header.hidden = false;
  if (title) title.textContent = section.label;
  return true;
}

export function hideMobileSettingsSection(root, { focus = true } = {}) {
  if (!root) return "";
  const activeId = root.dataset.mobileSettingsSection || "";
  const directory = root.querySelector("[data-settings-directory]");
  delete root.dataset.mobileSettingsSection;
  root.dataset.settingsDirectoryVisible = "true";
  root.querySelector("[data-settings-mobile-header]")?.setAttribute("hidden", "");
  if (directory) directory.scrollTop = Number(root.dataset.settingsDirectoryScroll || 0);
  if (focus && activeId) {
    root.querySelector(`[data-settings-section="${CSS.escape(activeId)}"]`)?.focus({ preventScroll: true });
  }
  return activeId;
}

export function renderSettingsSearchResults(root, items, query) {
  const results = root?.querySelector("[data-settings-search-results]");
  const status = root?.querySelector("[data-settings-search-status]");
  const clear = root?.querySelector("#settingsSearchClear");
  const nav = root?.querySelector("[data-settings-nav]");
  const normalizedQuery = String(query || "").trim();
  const hasQuery = Boolean(normalizedQuery);
  if (!results || !status || !nav) return;
  if (clear) clear.hidden = !hasQuery;
  if (!hasQuery) {
    delete root.dataset.settingsSearchActive;
    results.hidden = true;
    results.innerHTML = "";
    status.textContent = "";
    nav.hidden = false;
    return;
  }
  root.dataset.settingsSearchActive = "true";
  nav.hidden = true;
  results.hidden = false;
  status.textContent = items.length
    ? `找到 ${items.length} 项设置`
    : "没有找到相关设置，可尝试搜索“密码、通知、缓存”。";
  results.innerHTML = items.length
    ? items.map((item) => {
      const section = getSettingsSection(item.sectionId);
      return `<button type="button" class="settings-search-result" data-settings-search-result="${item.id}"><span class="settings-search-result-copy"><strong>${item.label}</strong><small>${section.label} · ${item.description}</small></span><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"></use></svg></button>`;
    }).join("")
    : `<p class="settings-search-empty">没有找到相关设置</p>`;
}

export function focusSettingsTarget(root, targetId) {
  const target = targetId ? root?.querySelector?.(`#${CSS.escape(targetId)}`) : null;
  if (!target) return false;
  const view = root.ownerDocument?.defaultView || globalThis.window;
  const isVisible = (element) => {
    if (!element || element.hidden || element.closest("[hidden]")) return false;
    const styles = view?.getComputedStyle?.(element);
    return styles?.display !== "none" && styles?.visibility !== "hidden";
  };
  const focusableSelector = "button, input, select, textarea, summary, [tabindex]";
  const focusTarget = target.matches(focusableSelector) && isVisible(target)
    ? target
    : [...target.querySelectorAll(`${focusableSelector}, h3, h4`)].find(isVisible) || target;
  if (!focusTarget.matches(focusableSelector) && focusTarget instanceof HTMLElement && !focusTarget.hasAttribute("tabindex")) {
    focusTarget.tabIndex = -1;
  }
  const reducedMotion = view?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  focusTarget.scrollIntoView?.({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  focusTarget.focus?.({ preventScroll: true });
  target.dataset.settingsSearchTargetActive = "true";
  view?.setTimeout?.(() => delete target.dataset.settingsSearchTargetActive, 800);
  return true;
}

