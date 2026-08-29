export function createLayoutSettingsController({
  elements,
  state,
  preferenceStore,
  constants,
  scheduleGalleryMasonryLayout,
  openSettingsChildDialog,
  reopenSettingsAfterChildDialog,
  loadFamilyTagline,
  normalizeFamilyTagline,
  applyFamilyTagline,
  ensureCacheManagementUi,
  ensureDataSafetyUi,
  ensureStabilitySettingsUi,
  renderSettingsAccountOverview,
  loadHomeName,
  getSessionDisplayName,
  getSessionBoundEmail,
  loadCacheCapacityMb,
  loadMediaCachePolicy,
}) {
  const els = elements;
  const {
    mobileFeedLayoutKey,
    mobileSecretLayoutKey,
    mobileDialogBreakpoint,
    defaultFamilyTagline,
  } = constants;

  function getMobileFeedLayoutKey(userId = state.session?.user?.id || "guest") {
    return preferenceStore.scopedKey(mobileFeedLayoutKey, userId || "guest");
  }
  
  function loadMobileFeedLayout(userId = state.session?.user?.id || "guest") {
    return preferenceStore.readEnum(
      mobileFeedLayoutKey,
      ["single", "double"],
      "double",
      { scope: userId || "guest" }
    );
  }
  
  function applyMobileFeedLayout(layout = loadMobileFeedLayout()) {
    const nextLayout = layout === "single" ? "single" : "double";
    document.body.classList.toggle("mobile-feed-single", nextLayout === "single");
    document.body.classList.toggle("mobile-feed-double", nextLayout === "double");
    if (els.settingsFeedLayoutValue) {
      els.settingsFeedLayoutValue.textContent = nextLayout === "single" ? "单列" : "双列";
    }
    scheduleGalleryMasonryLayout();
  }
  
  function setMobileFeedLayout(layout) {
    const nextLayout = layout === "single" ? "single" : "double";
    preferenceStore.write(getMobileFeedLayoutKey(), nextLayout);
    applyMobileFeedLayout(nextLayout);
    renderSettingsSummary();
  }
  
  function getMobileSecretLayoutKey(userId = state.session?.user?.id || "guest") {
    return preferenceStore.scopedKey(mobileSecretLayoutKey, userId || "guest");
  }
  
  function loadMobileSecretLayout(userId = state.session?.user?.id || "guest") {
    return preferenceStore.readEnum(
      mobileSecretLayoutKey,
      ["single", "double"],
      "double",
      { scope: userId || "guest" }
    );
  }
  
  function ensureSecretLayoutToggle() {
    if (!els.secretPage) return null;
    let button = els.secretPage.querySelector("[data-secret-layout-toggle]");
    if (button) return button;
    const head = els.secretPage.querySelector(".secret-head");
    if (!head) return null;
    button = document.createElement("button");
    button.className = "secret-layout-toggle";
    button.type = "button";
    button.dataset.secretLayoutToggle = "true";
    button.addEventListener("click", () => {
      setMobileSecretLayout(loadMobileSecretLayout() === "single" ? "double" : "single");
    });
    head.append(button);
    return button;
  }
  
  function applyMobileSecretLayout(layout = loadMobileSecretLayout()) {
    const nextLayout = layout === "single" ? "single" : "double";
    document.body.classList.toggle("mobile-secret-single", nextLayout === "single");
    document.body.classList.toggle("mobile-secret-double", nextLayout === "double");
    const button = ensureSecretLayoutToggle();
    if (button) {
      button.textContent = nextLayout === "single" ? "单列" : "双列";
      button.title = nextLayout === "single" ? "秘藏当前为单列显示" : "秘藏当前为双列显示";
      button.setAttribute("aria-label", button.title);
      button.setAttribute("aria-pressed", nextLayout === "single" ? "true" : "false");
    }
  }
  
  function setMobileSecretLayout(layout) {
    const nextLayout = layout === "single" ? "single" : "double";
    preferenceStore.write(getMobileSecretLayoutKey(), nextLayout);
    applyMobileSecretLayout(nextLayout);
  }
  
  function updateSecretToolbarTop() {
    const toolbar = els.secretGallery?.querySelector(".secret-album-toolbar");
    const head = els.secretGallery?.querySelector(".secret-album-head");
    if (!toolbar || !head) return;
    if (window.matchMedia(`(max-width: ${mobileDialogBreakpoint}px)`).matches) {
      toolbar.style.removeProperty("--secret-toolbar-top");
      const albumView = head.closest(".secret-album-view");
      const topbarBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom || 136;
      albumView?.classList.toggle("show-mobile-back", head.getBoundingClientRect().bottom < topbarBottom + 8);
      return;
    }
    const topbarBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom || 76;
    const pinnedTop = Math.ceil(topbarBottom + 78);
    toolbar.style.setProperty("--secret-toolbar-top", `${pinnedTop}px`);
  }
  
  function syncMobileComposerPlacement() {
    if (!els.composer || !els.galleryHead) return;
    const isMobile = window.matchMedia(`(max-width: ${mobileDialogBreakpoint}px)`).matches;
    const isInsideHead = els.composer.parentElement === els.galleryHead;
    if (isMobile && !isInsideHead) {
      els.galleryHead.append(els.composer);
      return;
    }
    if (!isMobile && isInsideHead) {
      els.galleryHead.parentElement?.insertBefore(els.composer, els.galleryHead);
    }
  }
  
  function ensureFamilySignatureUi() {
    const button = document.querySelector("#familyTaglineButton");
    const dialog = document.querySelector("#familyTaglineDialog");
    if (!button || !dialog) return;
    if (button.dataset.familyTaglineBound === "true") {
      applyFamilyTagline(state.accountProfile.familyTagline || loadFamilyTagline());
      return;
    }
    button.dataset.familyTaglineBound = "true";
    const input = dialog.querySelector("#familyTaglineInput");
    const status = dialog.querySelector("#familyTaglineStatus");
    button.addEventListener("click", () => openSettingsChildDialog(dialog, () => {
      input.value = state.accountProfile.familyTagline || loadFamilyTagline();
      status.textContent = "";
      input.focus();
    }));
    dialog.querySelector("[data-close-family-tagline]").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-reset-family-tagline]").addEventListener("click", () => {
      input.value = defaultFamilyTagline;
    });
    dialog.addEventListener("close", reopenSettingsAfterChildDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const tagline = normalizeFamilyTagline(input.value);
      if (!tagline || !state.cloudDb || !state.session) return;
      status.textContent = "正在同步...";
      const { error } = await state.cloudDb.rpc("update_family_tagline", { p_tagline: tagline });
      if (error) {
        status.textContent = `保存失败：${error.message}`;
        return;
      }
      if (state.familyInfo) state.familyInfo.tagline = tagline;
      applyFamilyTagline(tagline, { persist: true });
      status.textContent = "家庭签名已同步。";
      window.setTimeout(() => dialog.close(), 380);
    });
    applyFamilyTagline(state.accountProfile.familyTagline || loadFamilyTagline());
  }
  
  function renderSettingsSummary() {
    ensureCacheManagementUi();
    ensureFamilySignatureUi();
    ensureDataSafetyUi();
    ensureStabilitySettingsUi();
    renderSettingsAccountOverview();
    if (els.settingsHomeNameValue) {
      els.settingsHomeNameValue.textContent =
        state.accountProfile.homeName || loadHomeName(state.session?.user?.id) || "咻蛋之家";
    }
    if (els.settingsNicknameValue) {
      els.settingsNicknameValue.textContent = state.session ? getSessionDisplayName() : "未登录";
    }
    if (els.settingsAvatarValue) {
      els.settingsAvatarValue.textContent = state.accountProfile.avatarUrl ? "已设置头像" : "文字头像";
    }
    if (els.settingsEmailValue) {
      els.settingsEmailValue.textContent = getSessionBoundEmail() || "未绑定";
    }
    if (els.settingsFeedLayoutValue) {
      els.settingsFeedLayoutValue.textContent =
        loadMobileFeedLayout() === "single" ? "单列" : "双列";
    }
    if (els.settingsCacheLimitValue) {
      els.settingsCacheLimitValue.textContent = `日记 ${loadCacheCapacityMb("diary")} MB · 秘藏 ${loadCacheCapacityMb("secret")} MB`;
    }
    const policyButton = document.querySelector("#mediaCachePolicyButton");
    if (policyButton) {
      const wifiOnly = loadMediaCachePolicy() === "wifi";
      policyButton.innerHTML = `<span>自动缓存</span><strong><em>${wifiOnly ? "Wi-Fi · 最新 20 条" : "已关闭"}</em><small>${wifiOnly ? "自动保留最新日记；蜂窝网络和无法识别的网络不会下载" : "只通过下面按钮手动下载"}</small></strong>`;
    }
  }
  
  
  return {
    getMobileFeedLayoutKey,
    loadMobileFeedLayout,
    applyMobileFeedLayout,
    setMobileFeedLayout,
    getMobileSecretLayoutKey,
    loadMobileSecretLayout,
    ensureSecretLayoutToggle,
    applyMobileSecretLayout,
    setMobileSecretLayout,
    updateSecretToolbarTop,
    syncMobileComposerPlacement,
    ensureFamilySignatureUi,
    renderSettingsSummary,
  };
}
