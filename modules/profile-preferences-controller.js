import { getVipLevel } from "./vip-center.js";
import { getInitial } from "./ui-formatters.js";
import { renderListIcon } from "./list-icons.js";

export function createProfilePreferencesController({
  elements,
  preferenceStore,
  householdRepository,
  assets,
  keys,
  state,
  normalizeHomeName,
  applyHomeName,
  normalizeNickname,
  getSessionDisplayName,
  updateSessionDisplayName,
  isMissingCloudSchema,
  loadFamilyContext,
  renderGallery,
  renderAccountAvatar,
  renderSettingsSummary,
  renderPhotoComments,
  saveCachedAvatarUrl,
}) {
  const els = elements;
  let avatarPreviewUrl = "";

  function normalizeTheme(theme) {
    return theme === "dark" || theme === "light" ? theme : "";
  }

  function getThemeStorageKey(userId = state.session?.user?.id || null) {
    return preferenceStore.scopedKey(keys.theme, userId || "guest");
  }

  function loadTheme(userId = state.session?.user?.id || null) {
    const fallback = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return preferenceStore.readEnum(keys.theme, ["dark", "light"], fallback, {
      scope: userId || "guest",
      legacyKey: keys.theme,
    });
  }

  function applyTheme(
    theme,
    { persist = true, userId = state.session?.user?.id || null, syncCloud = false } = {}
  ) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("theme-dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    if (persist) {
      localStorage.setItem(getThemeStorageKey(userId), nextTheme);
      if (userId && state.session?.user?.id === userId) {
        state.accountProfile.themePreference = nextTheme;
      }
    }
    els.themeToggle.querySelector("span").innerHTML = renderListIcon(nextTheme === "dark" ? "sun" : "moon", "ui-icon");
    els.themeToggle.title = nextTheme === "dark" ? "切换白天模式" : "切换黑夜模式";
    if (syncCloud) void persistThemeToCloud(nextTheme);
  }

  function toggleTheme() {
    applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark", {
      syncCloud: Boolean(state.session),
    });
  }

  async function persistThemeToCloud(theme) {
    const nextTheme = normalizeTheme(theme);
    if (!nextTheme || !state.cloudDb || !state.session || !state.cloudSyncAvailable) return;
    const userId = state.session.user.id;
    const { error } = await householdRepository.update(
      "user_profiles",
      { theme_preference: nextTheme, updated_at: new Date().toISOString() },
      { user_id: userId }
    );
    if (!error && state.session?.user?.id === userId) {
      state.accountProfile.themePreference = nextTheme;
    }
  }

  async function persistHomeNameToCloud(homeName) {
    if (!state.cloudDb || !state.session) return false;
    const { error } = await state.cloudDb.rpc("update_family_name", { p_name: homeName });
    if (error) {
      els.homeNameStatus.textContent = `云端保存失败：${error.message}`;
      return false;
    }
    state.accountProfile.homeName = homeName;
    if (state.familyInfo) state.familyInfo.name = homeName;
    state.familyMembers = state.familyMembers.map((member) => ({ ...member, family_name: homeName }));
    return true;
  }

  async function saveProfileNickname(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session) return;
    const nickname = normalizeNickname(els.profileNicknameInput.value);
    if (!nickname) {
      els.profileNicknameStatus.textContent = "昵称不能为空。";
      return;
    }
    els.profileNicknameStatus.textContent = "正在保存昵称...";
    const { error: authError } = await state.cloudDb.auth.updateUser({ data: { username: nickname } });
    if (authError) {
      els.profileNicknameStatus.textContent = `保存失败：${authError.message}`;
      return;
    }
    const { error: profileError } = await householdRepository.update(
      "user_profiles",
      { username: nickname, updated_at: new Date().toISOString() },
      { user_id: state.session.user.id }
    );
    els.profileNicknameStatus.textContent = profileError
      ? isMissingCloudSchema(profileError)
        ? "昵称已更新，运行最新版数据库脚本后家庭账户也会同步显示。"
        : `资料保存失败：${profileError.message}`
      : "昵称已保存。";
    updateSessionDisplayName(nickname);
    await loadFamilyContext();
    renderGallery();
    setTimeout(() => els.renameProfileDialog.close(), 500);
  }

  function setAvatarPreview(src = "") {
    const hasImage = Boolean(src);
    els.avatarPreview.hidden = !hasImage;
    els.avatarPreviewInitial.hidden = hasImage;
    if (hasImage) els.avatarPreview.src = src;
    else els.avatarPreview.removeAttribute("src");
    els.avatarPreviewInitial.textContent = getInitial(getSessionDisplayName());
  }

  function updateAvatarPreview() {
    const file = els.avatarInput.files?.[0];
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    avatarPreviewUrl = file ? URL.createObjectURL(file) : "";
    setAvatarPreview(avatarPreviewUrl || state.accountProfile.avatarUrl);
  }

  function clearAvatarPreviewUrl() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    avatarPreviewUrl = "";
  }

  async function saveAvatar(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session) return;
    const file = els.avatarInput.files?.[0];
    if (!file) {
      els.avatarStatus.textContent = "先选择一张图片。";
      return;
    }
    els.avatarStatus.textContent = "正在压缩头像...";
    let compressed;
    try {
      compressed = await assets.compressImage(file, {
        maxSide: 640,
        jpeg: 0.86,
        minJpeg: 0.68,
        targetBytes: 220000,
      });
    } catch (error) {
      els.avatarStatus.textContent = `头像处理失败：${error.message}`;
      return;
    }
    els.avatarStatus.textContent = "正在上传头像...";
    let uploaded;
    try {
      uploaded = await assets.uploadToR2(compressed.blob, "avatar", "avatars");
    } catch (error) {
      els.avatarStatus.textContent = `上传失败：${error.message}`;
      return;
    }
    const avatarUrl = uploaded.url;
    const path = `r2:${uploaded.key}`;
    const previousPath = state.accountProfile.avatarPath;
    const { error } = await householdRepository.update(
      "user_profiles",
      { avatar_url: avatarUrl, avatar_path: path, updated_at: new Date().toISOString() },
      { user_id: state.session.user.id }
    );
    if (error) {
      await assets.cleanupStoredImagePaths([path]).catch(() => {});
      els.avatarStatus.textContent = isMissingCloudSchema(error)
        ? "请先运行本次头像数据库补丁。"
        : `资料保存失败：${error.message}`;
      return;
    }
    state.accountProfile.avatarUrl = avatarUrl;
    state.accountProfile.avatarPath = path;
    saveCachedAvatarUrl(state.session.user.id, avatarUrl);
    renderAccountAvatar(avatarUrl);
    renderSettingsSummary();
    await loadFamilyContext();
    renderPhotoComments();
    if (previousPath && previousPath !== path) void assets.cleanupStoredImagePaths([previousPath]);
    els.avatarStatus.textContent = "头像已保存。";
    setTimeout(() => els.avatarDialog.close(), 500);
  }

  async function saveHomeName(event) {
    event.preventDefault();
    if (!state.session) return;
    const homeName = normalizeHomeName(els.homeNameInput.value);
    if (!homeName) {
      els.homeNameStatus.textContent = "请先输入一个名称。";
      return;
    }
    els.homeNameStatus.textContent = "正在保存…";
    if (await persistHomeNameToCloud(homeName)) {
      applyHomeName(homeName, { persist: true, userId: state.session.user.id });
      els.vipPopoverBadge.textContent = state.activeVipLevel > 0
        ? `${homeName} ${getVipLevel(state.activeVipLevel).label}`
        : `开通 ${homeName} VIP`;
      els.homeNameStatus.textContent = "名称已保存并同步。";
      window.setTimeout(() => els.renameHomeDialog.close(), 450);
    }
  }

  async function restoreDefaultHomeName() {
    if (!state.session) return;
    els.homeNameInput.value = "咻蛋之家";
    els.homeNameStatus.textContent = "正在恢复默认名称…";
    if (await persistHomeNameToCloud("咻蛋之家")) {
      applyHomeName("咻蛋之家", { persist: true, userId: state.session.user.id });
      els.vipPopoverBadge.textContent = state.activeVipLevel > 0
        ? `咻蛋之家 ${getVipLevel(state.activeVipLevel).label}`
        : "开通 咻蛋之家 VIP";
      els.homeNameStatus.textContent = "已恢复默认名称。";
    }
  }

  return {
    applyTheme,
    clearAvatarPreviewUrl,
    loadTheme,
    normalizeTheme,
    persistHomeNameToCloud,
    restoreDefaultHomeName,
    saveAvatar,
    saveHomeName,
    saveProfileNickname,
    setAvatarPreview,
    toggleTheme,
    updateAvatarPreview,
  };
}
