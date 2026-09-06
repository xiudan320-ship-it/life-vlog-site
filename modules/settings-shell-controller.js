import { querySettings } from "./settings-search-domain.js";
import {
  getSettingsItem,
  isSettingsSection,
  SETTINGS_SECTION_REGISTRY,
} from "./settings-section-registry.js";
import {
  applySettingsShellSemantics,
  focusSettingsTarget,
  hideMobileSettingsSection,
  renderSettingsSearchResults,
  showMobileSettingsSection,
} from "./settings-shell-view.js";

const SETTINGS_BREAKPOINT = 700;

export function createSettingsShellController({
  elements,
  getSession = () => true,
  renderSettingsSummary,
  onSectionActivate,
  onSettingsClose,
  windowRef = globalThis.window,
} = {}) {
  const root = elements?.settingsDialog;
  let activeSection = SETTINGS_SECTION_REGISTRY[0]?.id || "settingsAppearance";
  let returnFocus = null;
  let returnToSettings = false;
  let restoreMobileDetail = false;
  let initialized = false;
  let searchResults = [];
  const listeners = [];

  const isMobile = () => Boolean(
    windowRef?.matchMedia?.(`(max-width: ${SETTINGS_BREAKPOINT}px)`).matches
  );

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    if (target?.removeEventListener) listeners.push(() => target.removeEventListener(type, handler, options));
  }

  function normalizeSection(sectionId) {
    return isSettingsSection(sectionId) ? sectionId : activeSection;
  }

  function notifySection(sectionId) {
    try {
      return Promise.resolve(onSectionActivate?.(sectionId));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function applySection(sectionId, { mobileDetail = false, targetId = "", focus = false } = {}) {
    if (!root) return "";
    activeSection = normalizeSection(sectionId);
    const mobile = isMobile();
    applySettingsShellSemantics(root, activeSection);
    if (mobile) {
      if (mobileDetail) showMobileSettingsSection(root, activeSection);
      else hideMobileSettingsSection(root, { focus: false });
    } else {
      delete root.dataset.mobileSettingsSection;
      delete root.dataset.settingsDirectoryVisible;
      root.querySelector("[data-settings-mobile-header]")?.setAttribute("hidden", "");
    }
    void notifySection(activeSection).catch((error) => {
      console.error("settings section activation failed", error);
    });
    if (targetId || focus) {
      const moveFocus = () => {
        if (targetId) focusSettingsTarget(root, targetId);
        else root.querySelector(`#settings-tab-${CSS.escape(activeSection)}`)?.focus({ preventScroll: true });
      };
      if (typeof windowRef?.requestAnimationFrame === "function") windowRef.requestAnimationFrame(moveFocus);
      else windowRef?.setTimeout?.(moveFocus, 0);
    }
    return activeSection;
  }

  function open(sectionId = activeSection, { mobileDetail = false, targetId = "", focus = false } = {}) {
    if (!root) return false;
    if (!root.open && !returnFocus) returnFocus = elements.accountSettingsButton || root.ownerDocument?.activeElement;
    renderSettingsSummary?.();
    if (!root.open) root.showModal?.();
    applySection(sectionId, { mobileDetail, targetId, focus });
    return true;
  }

  function close() {
    returnToSettings = false;
    restoreMobileDetail = false;
    if (root?.open) root.close();
    else restoreSettingsFocus();
  }

  function restoreSettingsFocus() {
    if (returnToSettings) return;
    const focusTarget = returnFocus === elements?.accountSettingsButton
      ? elements?.avatarButton
      : returnFocus;
    returnFocus = null;
    if (elements?.userPopover) elements.userPopover.hidden = true;
    windowRef?.setTimeout?.(() => focusTarget?.focus?.(), 0);
  }

  function openChildDialog(dialog, prepare = null) {
    if (!dialog) return false;
    restoreMobileDetail = isMobile() && Boolean(root?.dataset.mobileSettingsSection);
    returnToSettings = true;
    elements?.userPopover && (elements.userPopover.hidden = true);
    if (root?.open) root.close();
    if (!dialog.open) dialog.showModal?.();
    prepare?.();
    return true;
  }

  function reopenAfterChildDialog() {
    if (!returnToSettings) return false;
    returnToSettings = false;
    if (typeof getSession === "function" && !getSession()) {
      restoreMobileDetail = false;
      returnFocus = null;
      return false;
    }
    const section = activeSection;
    const mobileDetail = restoreMobileDetail;
    restoreMobileDetail = false;
    windowRef?.setTimeout?.(() => open(section, { mobileDetail }), 0);
    return true;
  }

  function goToDirectory() {
    if (!root || !isMobile() || !root.dataset.mobileSettingsSection) return false;
    const previousSection = hideMobileSettingsSection(root);
    if (previousSection) {
      root.querySelector(`[data-settings-section="${CSS.escape(previousSection)}"]`)?.focus({ preventScroll: true });
    }
    return true;
  }

  function openSearchResult(itemId) {
    const item = getSettingsItem(itemId);
    if (!item || !root) return false;
    const mobileDetail = isMobile();
    applySection(item.sectionId, { mobileDetail, targetId: item.id });
    return true;
  }

  function updateSearch(value) {
    const query = String(value || "");
    searchResults = querySettings(query);
    renderSettingsSearchResults(root, searchResults, query);
    return searchResults;
  }

  function syncViewport() {
    if (!root) return;
    applySettingsShellSemantics(root, activeSection);
    if (!isMobile()) {
      delete root.dataset.mobileSettingsSection;
      delete root.dataset.settingsDirectoryVisible;
      root.querySelector("[data-settings-mobile-header]")?.setAttribute("hidden", "");
    } else if (!root.dataset.mobileSettingsSection) {
      hideMobileSettingsSection(root, { focus: false });
    }
  }

  function handleRootClick(event) {
    if (!root?.contains(event.target)) return;
    if (event.target === root) {
      close();
      return;
    }
    if (event.target.closest("#closeSettingsDialog")) {
      close();
      return;
    }
    if (event.target.closest("[data-settings-back]")) {
      goToDirectory();
      return;
    }
    const result = event.target.closest("[data-settings-search-result]");
    if (result) {
      openSearchResult(result.dataset.settingsSearchResult);
      return;
    }
    const button = event.target.closest("[data-settings-section]");
    if (button && root.contains(button)) {
      applySection(button.dataset.settingsSection, { mobileDetail: isMobile() });
    }
  }

  function handleRootKeydown(event) {
    if (!root?.open) return;
    if (event.key === "Escape" && isMobile() && root.dataset.mobileSettingsSection) {
      event.preventDefault();
      goToDirectory();
      return;
    }
    const currentTab = event.target.closest?.("[data-settings-section][role='tab']");
    if (!currentTab || isMobile()) return;
    const tabs = [...root.querySelectorAll("[data-settings-section][role='tab']")];
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < 0) return;
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    applySection(nextTab.dataset.settingsSection);
    nextTab.focus({ preventScroll: true });
  }

  function handleCancel(event) {
    if (isMobile() && root?.dataset.mobileSettingsSection) {
      event.preventDefault();
      goToDirectory();
    }
  }

  function initialize() {
    if (!root || initialized) return initialized;
    initialized = true;
    addListener(root, "click", handleRootClick);
    addListener(root, "keydown", handleRootKeydown);
    addListener(root, "cancel", handleCancel);
    addListener(root, "close", () => {
      if (returnToSettings) return;
      hideMobileSettingsSection(root, { focus: false });
      onSettingsClose?.();
      restoreSettingsFocus();
    });
    const search = root.querySelector("#settingsSearchInput");
    addListener(search, "input", (event) => updateSearch(event.currentTarget.value));
    addListener(search, "search", (event) => updateSearch(event.currentTarget.value));
    addListener(root.querySelector("#settingsSearchClear"), "click", () => {
      if (!search) return;
      search.value = "";
      updateSearch("");
      search.focus();
    });
    const viewport = windowRef?.matchMedia?.(`(max-width: ${SETTINGS_BREAKPOINT}px)`);
    addListener(viewport, "change", syncViewport);
    addListener(windowRef, "resize", syncViewport);
    applySection(activeSection);
    return true;
  }

  function destroy() {
    listeners.splice(0).forEach((remove) => remove());
    initialized = false;
  }

  return {
    close,
    destroy,
    getActiveSection: () => activeSection,
    getSearchResults: () => [...searchResults],
    goToDirectory,
    initialize,
    open,
    openChildDialog,
    openSearchResult,
    reopenAfterChildDialog,
    setActiveSection: (sectionId, options) => applySection(sectionId, options),
    updateSearch,
  };
}

