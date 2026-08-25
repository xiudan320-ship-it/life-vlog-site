import { escapeHtml, getInitial } from "./ui-formatters.js";
import { normalizeNickname } from "./app-domain.js";

export function createAppIdentityController({
  elements,
  state,
  avatarCacheKey,
  photoCategories,
  getProfileAvatarUrl,
  renderSettingsSummary,
  renderExperience,
  renderGallery,
  renderMobileDiaryPage,
  showToast,
  documentTarget = document,
  storage = localStorage,
}) {
  const els = elements;

  function getSessionDisplayName() {
    const metadataName = state.session?.user?.user_metadata?.username;
    if (metadataName) return metadataName;
    return state.session?.user?.email?.split("@")[0] || "User";
  }

  function getSessionBoundEmail() {
    const metadataEmail = String(state.session?.user?.user_metadata?.bound_email || "").trim().toLowerCase();
    if (metadataEmail) return metadataEmail;
    const sessionEmail = String(state.session?.user?.email || "").trim().toLowerCase();
    return /@life-vlog\.local$/i.test(sessionEmail) ? "" : sessionEmail;
  }

  function getAvatarCacheStorageKey(userId = state.session?.user?.id) {
    return userId ? `${avatarCacheKey}:${userId}` : "";
  }

  function loadCachedAvatarUrl(userId = state.session?.user?.id) {
    const key = getAvatarCacheStorageKey(userId);
    if (!key) return "";
    try {
      return String(storage.getItem(key) || "").trim();
    } catch {
      return "";
    }
  }

  function saveCachedAvatarUrl(userId, avatarUrl) {
    const key = getAvatarCacheStorageKey(userId);
    if (!key) return;
    try {
      if (avatarUrl) storage.setItem(key, String(avatarUrl));
      else storage.removeItem(key);
    } catch {
    }
  }

  function getSessionLoginName() {
    const metadataName = state.session?.user?.user_metadata?.login_username;
    if (metadataName) return metadataName;
    return state.session?.user?.email?.split("@")[0] || getSessionDisplayName();
  }

  function isAdminAccount() {
    if (!state.session?.user?.id) return false;
    if (state.familyInfo?.isOwner) return true;
    return [
      getSessionLoginName(),
      getSessionDisplayName(),
      state.session.user.user_metadata?.username,
      state.session.user.user_metadata?.login_username,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .includes("xiudan320");
  }

  function choosePhotoCategory(current = "日常") {
    return new Promise((resolve) => {
      let dialog = documentTarget.querySelector("#adminCategoryDialog");
      if (!dialog) {
        dialog = documentTarget.createElement("dialog");
        dialog.id = "adminCategoryDialog";
        dialog.className = "admin-category-dialog";
        documentTarget.body.append(dialog);
      }
      dialog.innerHTML = `
        <form method="dialog">
          <div><p class="kicker">Admin</p><h2>修改日记分类</h2><p>选择正确的现有分类。</p></div>
          <label>分类<select name="category">${photoCategories.map((item) => `<option value="${item}" ${item === current ? "selected" : ""}>${item}</option>`).join("")}</select></label>
          <div class="admin-category-actions"><button value="cancel" type="submit">取消</button><button class="primary" value="confirm" type="submit">保存分类</button></div>
        </form>`;
      const finish = () => {
        const value = dialog.returnValue === "confirm" ? dialog.querySelector("select")?.value || "" : "";
        dialog.removeEventListener("close", finish);
        resolve(value);
      };
      dialog.addEventListener("close", finish);
      dialog.showModal();
    });
  }

  async function adminUpdatePhotoCategory(photo) {
    if (!photo || !state.cloudDb || !state.session || !isAdminAccount()) return;
    const category = await choosePhotoCategory(photo.category || "日常");
    if (!category || category === photo.category) return;
    const { data, error } = await state.cloudDb.rpc("admin_update_photo_category", {
      p_photo_id: photo.id,
      p_category: category,
    });
    if (error) {
      showToast(`分类修改失败：${error.message}`, { kind: "error", duration: 3200 });
      return;
    }
    photo.category = data?.category || category;
    if (state.mobileDiaryPhoto?.id === photo.id) {
      state.mobileDiaryPhoto.category = photo.category;
      renderMobileDiaryPage();
    }
    renderGallery();
    showToast(`已改为“${photo.category}”`, { kind: "success" });
  }

  function renderAccountAvatar(avatarUrl = "", displayName = getSessionDisplayName()) {
    const resolvedAvatarUrl = getProfileAvatarUrl({
      avatar_url: avatarUrl || state.accountProfile.avatarUrl,
      avatar_path: state.accountProfile.avatarPath,
    }) || loadCachedAvatarUrl(state.session?.user?.id);
    const hasAvatar = Boolean(resolvedAvatarUrl);
    els.avatarImage.hidden = !hasAvatar;
    els.avatarInitial.hidden = hasAvatar;
    if (hasAvatar) {
      els.avatarImage.src = resolvedAvatarUrl;
      if (state.session?.user?.id) saveCachedAvatarUrl(state.session.user.id, resolvedAvatarUrl);
    } else {
      els.avatarImage.removeAttribute("src");
    }
    els.avatarInitial.textContent = getInitial(displayName);
  }

  function updateSessionDisplayName(nickname) {
    const nextName = normalizeNickname(nickname);
    if (!nextName || !state.session?.user) return;
    state.session.user.user_metadata = {
      ...(state.session.user.user_metadata || {}),
      username: nextName,
      login_username: getSessionLoginName(),
    };
    els.profileName.textContent = nextName;
    renderAccountAvatar(state.accountProfile.avatarUrl, nextName);
    renderSettingsSummary();
    renderExperience(nextName);
  }

  function getAuthorName(userId) {
    if (!userId) return "我";
    if (userId === state.session?.user?.id) return getSessionDisplayName();
    return state.familyMemberMap.get(userId)?.username ||
      state.familyLevelProfiles.get(userId)?.username ||
      "其他用户";
  }

  function getAuthorAvatar(userId) {
    const familyAvatar = getProfileAvatarUrl(state.familyMemberMap.get(userId) || {});
    const cloudAvatar = getProfileAvatarUrl(state.familyLevelProfiles.get(userId) || {});
    if (userId === state.session?.user?.id) {
      return getProfileAvatarUrl(state.accountProfile) ||
        cloudAvatar ||
        familyAvatar ||
        loadCachedAvatarUrl(userId);
    }
    return cloudAvatar || familyAvatar || loadCachedAvatarUrl(userId);
  }

  function renderAvatarMarkup(userId, className = "photo-comment-avatar") {
    const name = getAuthorName(userId);
    const avatarUrl = getAuthorAvatar(userId);
    return avatarUrl
      ? `<span class="${className}" data-avatar-fallback="${escapeHtml(getInitial(name))}"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}的头像" decoding="async" /></span>`
      : `<span class="${className}">${escapeHtml(getInitial(name))}</span>`;
  }

  function canManageItem(item) {
    if (!state.session) return false;
    const ownerId = item?.userId || item?.user_id || "";
    if (!ownerId) return true;
    return ownerId === state.session.user.id || state.familyMemberMap.has(ownerId);
  }

  documentTarget.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const avatar = image.closest("[data-avatar-fallback]");
    if (!avatar) return;
    avatar.textContent = avatar.dataset.avatarFallback || "";
  }, true);

  return {
    adminUpdatePhotoCategory,
    canManageItem,
    getAuthorAvatar,
    getAuthorName,
    getSessionBoundEmail,
    getSessionDisplayName,
    getSessionLoginName,
    isAdminAccount,
    loadCachedAvatarUrl,
    renderAccountAvatar,
    renderAvatarMarkup,
    saveCachedAvatarUrl,
    updateSessionDisplayName,
  };
}
