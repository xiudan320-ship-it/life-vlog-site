import { confirmAction } from "./confirm-dialog.js";
import {
  bindSecretAlbumActions,
  bindSecretCollectionActions,
  bindSecretFavoritesActions,
  bindSecretFilterActions,
  buildSecretAlbumMarkup,
  buildSecretCategoryOptions,
  buildSecretCollectionMarkup,
  buildSecretFavoritesMarkup,
  buildSecretFilterMarkup,
  buildSecretFolderListMarkup,
  buildSecretFolderOptions,
} from "./secret-gallery-view.js";
import {
  DEFAULT_SECRET_PHOTO_TAG,
  FAVORITE_SECRET_PHOTO_TAG,
  STORY_SECRET_PHOTO_TAG,
  addSecretImageTag,
  getDefaultSecretSortOrder,
  getSecretImageNumericOrder,
  isSecretNumericTag,
  normalizeSecretImages,
  normalizeSecretPhotoTag,
  normalizeSecretPhotoTags,
  removeSecretImageTag,
  secretImageHasTag,
  setSecretImageTags,
  sortSecretDisplayEntries as sortSecretEntriesByAlbumOrder,
  sortSecretItems,
} from "./secret-domain.js?v=20260810-004";
import { secretFolderFromCloudRow, secretFromCloudRow, secretToCloudRow } from "./cloud-models.js";
import { extractImageUrls, getClipboardImageUrl } from "./media-metadata.js";
import { prepareFeedImages } from "./diary-gallery-view.js";
import { escapeHtml, formatDate, slugify } from "./ui-formatters.js";

export function createSecretController({
  elements,
  state,
  repository,
  assets,
  albumImageLimit,
  allFolderId,
  favoritesFolderId,
  mobileDialogBreakpoint,
  getSecretDefaultFolderId,
  setSecretDefaultFolderId,
  saveSecretItemsCache,
  renderCachedSecretItems,
  setGlobalStatus,
  setSecretStatus,
  showMiniToast,
  dismissMiniToast,
  isMobileViewport,
  getSortedPhotos,
  getDisplayTitle,
  getPlainNote,
  isMissingCloudSchema,
  openPhoto,
  createTrashItem,
  rollbackTrashItem,
  showPhotoDialogPreservingScroll,
  renderDialogMedia,
  fitSecretViewerImage,
  refreshDiaryViewerToolbar,
  refreshSecretViewerToolbar,
  resetSecretImageZoom,
  setSecretViewerStatus,
  updateSecretToolbarTop,
}) {
  const els = elements;
  const secretRepository = repository;
  const SECRET_ALBUM_IMAGE_LIMIT = albumImageLimit;
  const SECRET_ALL_FOLDER_ID = allFolderId;
  const SECRET_FAVORITES_FOLDER_ID = favoritesFolderId;
  const MOBILE_DIALOG_BREAKPOINT = mobileDialogBreakpoint;
  const {
    cleanupStoredImagePaths,
    copyUrlToR2,
    uploadImageFile,
  } = assets;

  function setSecretExpanded(expanded) {
    if (!els.secretForm || !els.secretToggle) return;
    els.secretForm.hidden = !expanded;
    els.secretToggle.setAttribute("aria-expanded", String(expanded));
  }
  
  function getSecretPhotoSortDescending(item) {
    return item?.photoSortDescending !== false;
  }
  
  async function setSecretPhotoSortDescending(item, descending) {
    if (!item?.id || !state.cloudDb || !state.session) return false;
    const { error } = await secretRepository.updateItem(item.id, {
      photo_sort_descending: descending ? 1 : 0,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setSecretStatus(error.message || "照片顺序保存失败。");
      showMiniToast("照片顺序保存失败", { kind: "error" });
      return false;
    }
    item.photoSortDescending = Boolean(descending);
    return true;
  }
  
  function sortSecretDisplayEntries(entries, item) {
    return sortSecretEntriesByAlbumOrder(entries, getSecretPhotoSortDescending(item));
  }
  
  function getSecretPhotoTags(items = state.secretItems) {
    const tags = [];
    items.forEach((item) => {
      normalizeSecretImages(item.images).forEach((image) => {
        normalizeSecretPhotoTags(image).forEach((tag) => {
          if (!isSecretNumericTag(tag) && !tags.includes(tag)) tags.push(tag);
        });
      });
    });
    return [
      FAVORITE_SECRET_PHOTO_TAG,
      STORY_SECRET_PHOTO_TAG,
      DEFAULT_SECRET_PHOTO_TAG,
      ...tags.filter(
        (tag) =>
          tag !== FAVORITE_SECRET_PHOTO_TAG &&
          tag !== STORY_SECRET_PHOTO_TAG &&
          tag !== DEFAULT_SECRET_PHOTO_TAG
      ),
    ];
  }
  
  function getSecretAlbumFilterTags(item) {
    return getSecretAlbumTagCounts(item).map(({ tag }) => tag).filter((tag) => tag !== "全部");
  }
  
  function getSecretAlbumTagCounts(item) {
    const images = normalizeSecretImages(item?.images);
    const counts = new Map();
    images.forEach((image) => {
      normalizeSecretPhotoTags(image).forEach((tag) => {
        if (!isSecretNumericTag(tag)) {
          counts.set(tag, (counts.get(tag) || 0) + 1);
        }
      });
      if (image.favorite) {
        counts.set(FAVORITE_SECRET_PHOTO_TAG, (counts.get(FAVORITE_SECRET_PHOTO_TAG) || 0) + 1);
      }
    });
    return [
      { tag: "全部", count: images.length },
      ...[...counts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN")),
    ];
  }
  
  function imageMatchesSecretFilter(image) {
    if (state.activeSecretFilter === "全部") return true;
    if (state.activeSecretFilter === FAVORITE_SECRET_PHOTO_TAG) return Boolean(image?.favorite);
    return secretImageHasTag(image, state.activeSecretFilter);
  }
  
  function closeSecretFolderContextMenu() {
    if (!state.secretFolderContextMenu) return;
    document.removeEventListener("pointerdown", state.secretFolderContextMenu.closeOnOutside, true);
    window.removeEventListener("resize", closeSecretFolderContextMenu);
    window.removeEventListener("scroll", closeSecretFolderContextMenu, true);
    state.secretFolderContextMenu.element.remove();
    state.secretFolderContextMenu = null;
  }
  
  function closeSecretAlbumContextMenu() {
    if (!state.secretAlbumContextMenu) return;
    document.removeEventListener("pointerdown", state.secretAlbumContextMenu.closeOnOutside, true);
    window.removeEventListener("resize", closeSecretAlbumContextMenu);
    window.removeEventListener("scroll", closeSecretAlbumContextMenu, true);
    state.secretAlbumContextMenu.element.remove();
    state.secretAlbumContextMenu = null;
  }
  
  function openSecretFolderContextMenu(folder, clientX, clientY) {
    if (!folder || folder.virtual || isMobileViewport()) return;
    closeSecretFolderContextMenu();
    closeSecretAlbumContextMenu();
    const currentDefaultId = getSecretDefaultFolderId();
    const menu = document.createElement("div");
    menu.className = "secret-folder-context-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <span>${escapeHtml(folder.name)}</span>
      <button type="button" role="menuitem" data-secret-folder-default ${currentDefaultId === folder.id ? "disabled" : ""}>
        ${currentDefaultId === folder.id ? "当前默认入口" : "设为默认入口"}
      </button>
      <button class="danger" type="button" role="menuitem" data-secret-folder-delete>删除文件夹</button>
    `;
    document.body.append(menu);
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(10, Math.min(clientX, window.innerWidth - rect.width - 10))}px`;
    menu.style.top = `${Math.max(10, Math.min(clientY, window.innerHeight - rect.height - 10))}px`;
    const closeOnOutside = (event) => {
      if (!menu.contains(event.target)) closeSecretFolderContextMenu();
    };
    state.secretFolderContextMenu = { element: menu, closeOnOutside };
    document.addEventListener("pointerdown", closeOnOutside, true);
    window.addEventListener("resize", closeSecretFolderContextMenu);
    window.addEventListener("scroll", closeSecretFolderContextMenu, true);
    menu.querySelector("[data-secret-folder-default]")?.addEventListener("click", () => {
      void setSecretDefaultFolderId(folder.id);
      closeSecretFolderContextMenu();
      showMiniToast(`以后进入秘藏会先打开「${folder.name}」`, { kind: "success" });
    });
    menu.querySelector("[data-secret-folder-delete]")?.addEventListener("click", async () => {
      closeSecretFolderContextMenu();
      await deleteSecretFolder(folder);
    });
  }
  
  function openSecretAlbumContextMenu(item, clientX, clientY) {
    if (!item || isMobileViewport()) return;
    closeSecretFolderContextMenu();
    closeSecretAlbumContextMenu();
    const menu = document.createElement("div");
    menu.className = "secret-folder-context-menu secret-album-context-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <span>${escapeHtml(item.title || "未命名相册")}</span>
      <button class="danger" type="button" role="menuitem">删除相册</button>
    `;
    document.body.append(menu);
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(10, Math.min(clientX, window.innerWidth - rect.width - 10))}px`;
    menu.style.top = `${Math.max(10, Math.min(clientY, window.innerHeight - rect.height - 10))}px`;
    const closeOnOutside = (event) => {
      if (!menu.contains(event.target)) closeSecretAlbumContextMenu();
    };
    state.secretAlbumContextMenu = { element: menu, closeOnOutside };
    document.addEventListener("pointerdown", closeOnOutside, true);
    window.addEventListener("resize", closeSecretAlbumContextMenu);
    window.addEventListener("scroll", closeSecretAlbumContextMenu, true);
    menu.querySelector("button")?.addEventListener("click", async () => {
      closeSecretAlbumContextMenu();
      await deleteSecretItem(item);
    });
  }
  
  function renderSecretFolderControls() {
    if (!els.secretFolderList) return;
    const defaultFolderId = getSecretDefaultFolderId();
    const favoriteCount = state.secretItems.reduce(
      (total, item) => total + normalizeSecretImages(item.images).filter((image) => image.favorite).length,
      0
    );
    const folderButtons = [
      { id: SECRET_ALL_FOLDER_ID, name: "全部相册", count: state.secretItems.length, virtual: true, isAll: true },
      { id: SECRET_FAVORITES_FOLDER_ID, name: "收藏夹", count: favoriteCount, virtual: true, isFavorites: true },
      ...state.secretFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        count: state.secretItems.filter((item) => item.folderId === folder.id).length,
      })),
    ];
    els.secretFolderList.hidden = Boolean(state.activeSecretAlbumId);
    els.secretFolderList.innerHTML = buildSecretFolderListMarkup({
      folders: folderButtons,
      activeFolderId: state.activeSecretFolderId,
      defaultFolderId,
    });
    els.secretFolderList.querySelectorAll("[data-secret-folder]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeSecretFolderId = button.dataset.secretFolder || SECRET_ALL_FOLDER_ID;
        renderSecretGallery();
      });
      button.addEventListener("contextmenu", (event) => {
        const folder = folderButtons.find((entry) => entry.id === (button.dataset.secretFolder || SECRET_ALL_FOLDER_ID));
        if (folder?.virtual) return;
        event.preventDefault();
        openSecretFolderContextMenu(folder, event.clientX, event.clientY);
      });
    });
    if (els.secretFolderInput) {
      els.secretFolderInput.innerHTML = buildSecretFolderOptions(state.secretFolders);
    }
  }
  
  async function createSecretFolder() {
    if (!state.cloudDb || !state.session) {
      showMiniToast("请先登录后再创建收藏夹", { kind: "error" });
      return;
    }
    const name = await requestSecretFolderName();
    if (!name) return;
    const button = els.secretCreateFolderButton;
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      user_id: state.session.user.id,
      name,
      sort_order: state.secretFolders.length * 1000,
      created_at: now,
      updated_at: now,
    };
    if (button) button.disabled = true;
    setSecretStatus("正在创建收藏夹...");
    try {
      const { data, error } = await secretRepository.insertFolder(record, { select: "*", single: true });
      if (error) throw error;
      const saved = data && typeof data === "object" ? data : record;
      state.secretFolders.push(secretFolderFromCloudRow(saved));
      state.activeSecretFolderId = saved.id || record.id;
      renderSecretGallery();
      setSecretStatus("");
      showMiniToast(`已创建「${name}」`, { kind: "success" });
    } catch (error) {
      const message = error?.message || "Cloudflare 暂时没有完成创建";
      setSecretStatus(`新建文件夹失败：${message}`);
      showMiniToast("新建收藏夹失败，请稍后重试", { kind: "error" });
    } finally {
      if (button) button.disabled = false;
    }
  }
  
  async function renameActiveSecretFolder() {
    const folder = state.secretFolders.find((entry) => entry.id === state.activeSecretFolderId);
    if (!folder || !state.cloudDb || !state.session) return;
    const name = await requestSecretFolderName({
      value: folder.name,
      title: "重命名收藏夹",
      confirmLabel: "保存名称",
    });
    if (!name || name === folder.name) return;
    const updatedAt = new Date().toISOString();
    const { error } = await secretRepository.updateFolder(folder.id, {
      name,
      updated_at: updatedAt,
    });
    if (error) {
      showMiniToast(error.message || "重命名失败", { kind: "error" });
      return;
    }
    folder.name = name;
    folder.updatedAt = updatedAt;
    renderSecretGallery();
    showMiniToast("收藏夹名称已更新", { kind: "success" });
  }
  
  async function deleteSecretFolder(folder) {
    if (!folder || !state.cloudDb || !state.session) return;
    const wasActive = state.activeSecretFolderId === folder.id;
    const albums = state.secretItems.filter((item) => item.folderId === folder.id);
    const confirmed = await confirmAction({
      eyebrow: "整理收藏夹",
      title: `删除「${folder.name}」？`,
      message: albums.length
        ? `其中 ${albums.length} 个相册会移回全部相册，照片不会被删除。`
        : "这个空收藏夹会被删除，照片和相册不会受到影响。",
      confirmLabel: "删除收藏夹",
      cancelLabel: "保留",
      danger: true,
    });
    if (!confirmed) return;
    setSecretStatus("正在整理收藏夹...");
    for (const album of albums) {
      const { error } = await secretRepository.updateOwnedItem(album.id, {
        folder_id: null,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setSecretStatus(error.message || "移动相册失败，收藏夹未删除。");
        showMiniToast("收藏夹删除失败", { kind: "error" });
        return;
      }
      album.folderId = "";
    }
    const { error } = await secretRepository.removeFolder(folder.id);
    if (error) {
      setSecretStatus(error.message || "删除收藏夹失败。");
      showMiniToast("收藏夹删除失败", { kind: "error" });
      return;
    }
    state.secretFolders = state.secretFolders.filter((entry) => entry.id !== folder.id);
    if (getSecretDefaultFolderId() === folder.id) {
      await setSecretDefaultFolderId("");
    }
    if (wasActive) state.activeSecretFolderId = SECRET_ALL_FOLDER_ID;
    saveSecretItemsCache(state.session.user.id);
    renderSecretGallery();
    setSecretStatus("");
    showMiniToast("文件夹已删除，相册已移回全部相册", { kind: "success" });
  }
  
  function deleteActiveSecretFolder() {
    const folder = state.secretFolders.find((entry) => entry.id === state.activeSecretFolderId);
    return deleteSecretFolder(folder);
  }
  
  function requestSecretFolderName({ value = "", title = "新建文件夹", confirmLabel = "创建" } = {}) {
    return new Promise((resolve) => {
      let dialog = document.querySelector("#secretFolderDialog");
      if (!dialog) {
        dialog = document.createElement("dialog");
        dialog.id = "secretFolderDialog";
        dialog.className = "secret-folder-dialog";
        document.body.append(dialog);
      }
      dialog.innerHTML = `<form novalidate>
        <button class="secret-folder-dialog-close" data-action="cancel" type="button" aria-label="关闭">×</button>
        <header><span>Collection</span><h2>${escapeHtml(title)}</h2><p>用收藏夹整理相册，不会改变里面的照片。</p></header>
        <label><span>收藏夹名称</span><input name="folderName" maxlength="40" autocomplete="off" value="${escapeHtml(value)}" placeholder="例如：旅行、灵感、一起生活" required /></label>
        <p class="secret-folder-dialog-error" role="alert" hidden></p>
        <div class="secret-folder-dialog-actions"><button data-action="cancel" type="button">取消</button><button class="primary" data-action="confirm" type="submit">${escapeHtml(confirmLabel)}</button></div>
      </form>`;
      const form = dialog.querySelector("form");
      const input = dialog.querySelector("input");
      const errorLabel = dialog.querySelector(".secret-folder-dialog-error");
      let settled = false;
      const cleanup = () => {
        form.removeEventListener("submit", submit);
        dialog.removeEventListener("cancel", cancel);
        dialog.removeEventListener("close", close);
        dialog.querySelectorAll('[data-action="cancel"]').forEach((button) => button.removeEventListener("click", cancel));
      };
      const finish = (result = "") => {
        if (settled) return;
        settled = true;
        cleanup();
        if (dialog.open) dialog.close();
        resolve(result);
      };
      const submit = (event) => {
        event.preventDefault();
        const folderName = String(input.value || "").trim().slice(0, 40);
        if (!folderName) {
          errorLabel.textContent = "请先写一个收藏夹名称";
          errorLabel.hidden = false;
          input.setAttribute("aria-invalid", "true");
          input.focus();
          return;
        }
        finish(folderName);
      };
      const cancel = (event) => {
        event?.preventDefault?.();
        finish("");
      };
      const close = () => finish("");
      input.addEventListener("input", () => {
        errorLabel.hidden = true;
        input.removeAttribute("aria-invalid");
      });
      form.addEventListener("submit", submit);
      dialog.addEventListener("cancel", cancel);
      dialog.addEventListener("close", close);
      dialog.querySelectorAll('[data-action="cancel"]').forEach((button) => button.addEventListener("click", cancel));
      if (dialog.open) dialog.close();
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      };
      window.setTimeout(() => input.focus({ preventScroll: true }), 0);
    });
  }
  
  function updateSecretSearchSuggestions() {
    if (!els.secretSearchSuggestions) return;
    const suggestions = new Set();
    state.secretItems.forEach((item) => {
      if (item.title) suggestions.add(item.title);
      normalizeSecretImages(item.images).forEach((image) => {
        normalizeSecretPhotoTags(image)
          .filter((tag) => !isSecretNumericTag(tag))
          .forEach((tag) => suggestions.add(tag));
      });
    });
    els.secretSearchSuggestions.innerHTML = [...suggestions]
      .slice(0, 80)
      .map((value) => `<option value="${escapeHtml(value)}"></option>`)
      .join("");
  }
  
  function secretItemMatchesSearch(item) {
    const query = state.secretSearchQuery.trim().toLocaleLowerCase("zh-CN");
    if (!query) return true;
    const albumText = `${item.title || ""} ${item.note || ""}`.toLocaleLowerCase("zh-CN");
    if (albumText.includes(query)) return true;
    return normalizeSecretImages(item.images).some((image) =>
      normalizeSecretPhotoTags(image)
        .filter((tag) => !isSecretNumericTag(tag))
        .some((tag) => tag.toLocaleLowerCase("zh-CN").includes(query))
    );
  }
  
  function secretImageMatchesSearch(image) {
    const query = state.secretSearchQuery.trim().toLocaleLowerCase("zh-CN");
    if (!query) return true;
    return normalizeSecretPhotoTags(image)
      .filter((tag) => !isSecretNumericTag(tag))
      .some((tag) => tag.toLocaleLowerCase("zh-CN").includes(query));
  }
  
  async function loadSecretItemsInternal() {
    if (!state.cloudDb || !state.session) {
      state.secretItems = [];
      renderSecretGallery();
      return;
    }
    if (!state.secretItems.length) {
      renderCachedSecretItems(state.session.user.id);
    }
    try {
      const [itemsResponse, foldersResponse] = await Promise.all([
        secretRepository.listItems(),
        secretRepository.listFolders(),
      ]);
      if (itemsResponse.error) throw itemsResponse.error;
      if (foldersResponse.error) throw foldersResponse.error;
      state.secretCloudAvailable = true;
      state.secretItems = sortSecretItems((itemsResponse.data || []).map(secretFromCloudRow));
      state.secretFolders = (foldersResponse.data || []).map(secretFolderFromCloudRow);
      const validFolderIds = new Set([
        SECRET_ALL_FOLDER_ID,
        SECRET_FAVORITES_FOLDER_ID,
        ...state.secretFolders.map((folder) => folder.id),
      ]);
      const storedDefaultFolderId = state.secretDefaultFolderId;
      const validDefaultFolderId = state.secretFolders.some((folder) => folder.id === storedDefaultFolderId)
        ? storedDefaultFolderId
        : "";
      if (storedDefaultFolderId !== validDefaultFolderId) {
        await setSecretDefaultFolderId(validDefaultFolderId);
      }
      if (!state.activeSecretAlbumId && !validFolderIds.has(state.activeSecretFolderId)) {
        const defaultFolderId = getSecretDefaultFolderId();
        state.activeSecretFolderId = validFolderIds.has(defaultFolderId) ? defaultFolderId : SECRET_ALL_FOLDER_ID;
      }
      state.lastSecretSyncAt = Date.now();
      saveSecretItemsCache(state.session.user.id);
      renderSecretGallery();
    } catch (error) {
      state.secretCloudAvailable = false;
      const usedCache = renderCachedSecretItems(state.session.user.id);
      if (!usedCache) state.secretItems = [];
      renderSecretGallery();
      if (isMissingCloudSchema(error)) {
        setSecretStatus("秘藏表尚未初始化，请部署最新版 Cloudflare D1 结构。");
      } else {
        setSecretStatus(
          usedCache
            ? `秘藏同步失败，先显示上次缓存：${error.message || "请稍后重试"}`
            : `秘藏同步失败：${error.message || "请稍后重试"}`
        );
      }
    }
  }
  
  async function loadSecretItems() {
    if (state.secretLoadPromise) return state.secretLoadPromise;
    state.secretLoadPromise = loadSecretItemsInternal().finally(() => {
      state.secretLoadPromise = null;
    });
    return state.secretLoadPromise;
  }
  
  function renderSecretLinkedPhotoOptions() {
    if (!els.secretLinkedPhotoInput) return;
    const options = getSortedPhotos(state.photos)
      .map((photo) => {
        const title = getDisplayTitle(photo) || getPlainNote(photo).slice(0, 18) || "未命名日记";
        return `<option value="${escapeHtml(photo.id || "")}">${escapeHtml(`${formatDate(photo.taken_at)} · ${title}`)}</option>`;
      })
      .join("");
    els.secretLinkedPhotoInput.innerHTML = `<option value="">不关联</option>${options}`;
  }
  
  function updateSecretPreview() {
    const files = Array.from(els.secretImageInput?.files || []);
    revokeSecretPreviewUrls();
    const entries = [
      ...files.map((file) => ({ url: URL.createObjectURL(file), label: file.name })),
      ...secretSelectedLinks.map((url) => ({ url, label: "图片链接" })),
    ];
    if (!entries.length) {
      els.secretImagePreview.removeAttribute("src");
      els.secretImagePreview.hidden = true;
      els.secretPreviewStrip.innerHTML = "";
      els.secretPreviewStrip.hidden = true;
      els.secretImageName.textContent = "还没有选择图片";
      return;
    }
    secretPreviewUrls = entries.slice(0, 9).map((entry) => entry.url);
    els.secretImagePreview.src = secretPreviewUrls[0];
    els.secretImagePreview.hidden = false;
    els.secretImageName.textContent =
      entries.length > 1 ? `已选择 ${entries.length} 张图片` : entries[0].label;
    renderSecretPreviewStrip(entries, secretPreviewUrls);
  }
  
  function renderSecretPreviewStrip(files, urls) {
    if (files.length <= 1) {
      els.secretPreviewStrip.innerHTML = "";
      els.secretPreviewStrip.hidden = true;
      return;
    }
    els.secretPreviewStrip.hidden = false;
    els.secretPreviewStrip.innerHTML = urls
      .map((url, index) => `<button type="button" data-secret-preview-index="${index}"><img src="${url}" alt="" /></button>`)
      .join("");
    els.secretPreviewStrip.querySelectorAll("[data-secret-preview-index]").forEach((button) => {
      button.addEventListener("click", () => {
        els.secretImagePreview.src = urls[Number(button.dataset.secretPreviewIndex)];
      });
    });
  }
  
  let secretPreviewUrls = [];
  let secretSelectedLinks = [];
  function revokeSecretPreviewUrls() {
    secretPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    secretPreviewUrls = [];
  }
  
  function handleSecretPaste(event) {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (!imageItems.length) {
      const pastedUrl = getClipboardImageUrl(event.clipboardData);
      if (addSecretImageLinks(pastedUrl)) event.preventDefault();
      return;
    }
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    const transfer = new DataTransfer();
    files.forEach((file, index) => {
      const extension = file.type?.split("/")[1] || "png";
      transfer.items.add(
        new File([file], `secret-pasted-${Date.now()}-${index + 1}.${extension}`, {
          type: file.type || "image/png",
        })
      );
    });
    els.secretImageInput.files = transfer.files;
    updateSecretPreview();
    setSecretStatus(files.length > 1 ? `已读取 ${files.length} 张剪贴板图片。` : "已读取剪贴板图片。");
  }
  
  function addSecretImageLinks(rawLinks = els.secretImageLinkInput?.value || "") {
    const urls = extractImageUrls(rawLinks);
    if (!urls.length) {
      if (String(rawLinks || "").trim()) setSecretStatus("请输入完整的 http 或 https 图片链接。");
      return false;
    }
    secretSelectedLinks = [...new Set([...secretSelectedLinks, ...urls])].slice(0, SECRET_ALBUM_IMAGE_LIMIT);
    if (els.secretImageLinkInput) els.secretImageLinkInput.value = "";
    updateSecretPreview();
    setSecretStatus(`已添加 ${urls.length} 个图片链接，保存时会复制到 R2。`);
    return true;
  }
  
  async function saveSecretItem(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session) {
      setSecretStatus("请先登录。");
      return;
    }
    if (!state.secretCloudAvailable) {
      setSecretStatus("请先部署最新版 Cloudflare D1 结构，启用秘藏表。");
      return;
    }
    const files = Array.from(els.secretImageInput.files || []);
    const links = [...secretSelectedLinks];
    if (!files.length && !links.length) {
      setSecretStatus("请先选择图片或粘贴图片链接。");
      return;
    }
    const imageLimit = SECRET_ALBUM_IMAGE_LIMIT;
    if (files.length + links.length > imageLimit) {
      setSecretStatus(`一个秘藏相册最多 ${imageLimit} 张图。`);
      return;
    }
    const coverFile = els.secretCoverInput?.files?.[0] || null;
    els.secretSubmitButton.disabled = true;
    const images = [];
    let loadingToast = null;
    try {
      loadingToast = showMiniToast("秘藏上传中...", {
        kind: "loading",
        persist: true,
        placement: "center",
      });
      for (const [index, file] of files.entries()) {
        const base = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret");
        const uploaded = await uploadImageFile(file, `${base}-${index + 1}`, index + 1, files.length, {
          folder: "secrets",
          statusSetter: setSecretStatus,
        });
        if (!uploaded) throw new Error("秘藏图片上传失败。");
        images.push({
          ...uploaded,
          tag: DEFAULT_SECRET_PHOTO_TAG,
          tags: [DEFAULT_SECRET_PHOTO_TAG],
          uploadedAt: new Date().toISOString(),
        });
      }
      for (const [index, url] of links.entries()) {
        setSecretStatus(`正在导入第 ${index + 1}/${links.length} 个图片链接…`);
        const base = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret-link");
        const copied = await copyUrlToR2(url, `${base}-link-${index + 1}`, "secrets");
        images.push({
          image_path: `r2:${copied.key}`,
          image_url: copied.url,
          thumbnail_path: "",
          thumbnail_url: copied.url,
          width: 0,
          height: 0,
          tag: DEFAULT_SECRET_PHOTO_TAG,
          tags: [DEFAULT_SECRET_PHOTO_TAG],
          uploadedAt: new Date().toISOString(),
        });
      }
      let coverImage = images[0]?.image_url || "";
      let coverPath = images[0]?.image_path || "";
      if (coverFile) {
        const coverBase = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret-cover");
        const uploadedCover = await uploadImageFile(coverFile, `${coverBase}-cover`, 1, 1, {
          folder: "secret-covers",
          statusSetter: setSecretStatus,
        });
        if (!uploadedCover) throw new Error("秘藏封面上传失败。");
        coverImage = uploadedCover.image_url;
        coverPath = uploadedCover.image_path;
      }
      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID(),
        folderId: els.secretFolderInput?.value || (
          ![SECRET_ALL_FOLDER_ID, SECRET_FAVORITES_FOLDER_ID].includes(state.activeSecretFolderId)
            ? state.activeSecretFolderId
            : ""
        ),
        title: els.secretTitleInput.value.trim(),
        category: els.secretCategoryInput.value.trim() || "未分类",
        note: els.secretNoteInput.value.trim(),
        coverImage,
        coverPath,
        images,
        linkedPhotoId: els.secretLinkedPhotoInput.value || "",
        createdAt: now,
        updatedAt: now,
      };
      const { error } = await secretRepository.insertItem(
        secretToCloudRow(item, state.session.user.id)
      );
      if (error) throw error;
      els.secretForm.reset();
      secretSelectedLinks = [];
      updateSecretPreview();
      setSecretExpanded(false);
      setSecretStatus("相册已保存到秘藏。");
      dismissMiniToast(loadingToast);
      showMiniToast("秘藏已保存", { kind: "success" });
      await loadSecretItems();
    } catch (error) {
      dismissMiniToast(loadingToast);
      showMiniToast("上传失败", { kind: "error", duration: 2600 });
      setSecretStatus(error.message || "保存秘藏失败。");
    } finally {
      dismissMiniToast(loadingToast);
      els.secretSubmitButton.disabled = false;
    }
  }
  
  function getSecretFavoriteEntries() {
    const query = state.secretSearchQuery.trim().toLocaleLowerCase("zh-CN");
    const entries = [];
    sortSecretItems(state.secretItems).forEach((item) => {
      const favoriteImages = sortSecretDisplayEntries(
        normalizeSecretImages(item.images)
          .map((image, index) => ({ image, index }))
          .filter(({ image }) => image.favorite),
        item
      );
      const favoriteImageList = favoriteImages.map(({ image }) => image);
      favoriteImages.forEach(({ image, index }, favoriteIndex) => {
        if (query) {
          const albumText = `${item.title || ""} ${item.note || ""}`.toLocaleLowerCase("zh-CN");
          const imageText = normalizeSecretPhotoTags(image)
            .join(" ")
            .toLocaleLowerCase("zh-CN");
          if (!albumText.includes(query) && !imageText.includes(query)) return;
        }
        entries.push({
          item,
          image,
          index,
          favoriteIndex,
          favoriteImages: favoriteImageList,
        });
      });
    });
    return entries;
  }
  
  function renderSecretFavoritesView() {
    const entries = getSecretFavoriteEntries();
    state.activeSecretFilter = "全部";
    els.secretFilters.hidden = true;
    els.secretFilters.innerHTML = "";
    els.secretGallery.innerHTML = buildSecretFavoritesMarkup(entries);
    prepareFeedImages(els.secretGallery);
    bindSecretFavoritesActions(els.secretGallery, entries, (entry, button) => {
      openSecretItem(entry.item, entry.favoriteIndex, {
          images: entry.favoriteImages,
          returnImageUrl: entry.image.image_url,
          returnElementTop: button.getBoundingClientRect().top,
          triggerElement: button,
        });
    });
  }
  
  function renderSecretGallery() {
    if (!els.secretGallery) return;
    renderSecretLinkedPhotoOptions();
    renderSecretFolderControls();
    updateSecretSearchSuggestions();
    const activeAlbum = state.secretItems.find((item) => item.id === state.activeSecretAlbumId);
    const layoutToggle = els.secretPage?.querySelector("[data-secret-layout-toggle]");
    if (layoutToggle) layoutToggle.hidden = Boolean(activeAlbum);
    const allPhotoTags = activeAlbum
      ? getSecretAlbumTagCounts(activeAlbum).map(({ tag }) => tag)
      : [DEFAULT_SECRET_PHOTO_TAG];
    els.secretCategoryList.innerHTML = buildSecretCategoryOptions(allPhotoTags);
    if (els.secretCategoryTags) {
      els.secretCategoryTags.hidden = true;
      els.secretCategoryTags.innerHTML = "";
    }
    if (!state.session) {
      els.secretFilters.hidden = true;
      els.secretGallery.innerHTML = `<div class="empty">登录后才能进入秘藏。</div>`;
      return;
    }
    if (!state.secretCloudAvailable) {
      els.secretFilters.hidden = true;
      els.secretGallery.innerHTML = `<div class="empty">秘藏需要先初始化数据库表。</div>`;
      return;
    }
    if (activeAlbum) {
      const photoTagCounts = getSecretAlbumTagCounts(activeAlbum);
      const photoTags = photoTagCounts.map(({ tag }) => tag);
      if (!photoTags.includes(state.activeSecretFilter)) state.activeSecretFilter = "全部";
      els.secretFilters.hidden = false;
      els.secretFilters.innerHTML = buildSecretFilterMarkup(photoTagCounts, state.activeSecretFilter);
      bindSecretFilterActions(els.secretFilters, (filter) => {
        state.activeSecretFilter = filter;
        state.selectedSecretImageIndexes = new Set();
        renderSecretGallery();
      });
      renderSecretAlbumView(activeAlbum);
      return;
    }
  
    if (state.activeSecretFolderId === SECRET_FAVORITES_FOLDER_ID) {
      renderSecretFavoritesView();
      return;
    }
  
    state.activeSecretFilter = "全部";
    els.secretFilters.hidden = true;
    els.secretFilters.innerHTML = "";
    const activeFolder = state.secretFolders.find((folder) => folder.id === state.activeSecretFolderId);
    const activeFolderName = activeFolder?.name || "全部相册";
    const visible = sortSecretItems(state.secretItems).filter((item) => {
      const folderMatch = state.activeSecretFolderId === SECRET_ALL_FOLDER_ID
        ? true
        : item.folderId === state.activeSecretFolderId;
      return folderMatch && secretItemMatchesSearch(item);
    });
    els.secretGallery.innerHTML = buildSecretCollectionMarkup({
      activeFolderName,
      activeFolder,
      visible,
      getLinkedTitle: (photoId) => {
        const linkedPhoto = state.photos.find((photo) => photo.id === photoId);
        return linkedPhoto ? getDisplayTitle(linkedPhoto) || "关联日记" : "";
      },
    });
    bindSecretCollectionActions({
      container: els.secretGallery,
      items: visible,
      mobile: isMobileViewport(),
      onCreate: () => {
        if (els.secretComposer?.hidden) els.secretComposer.hidden = false;
        setSecretExpanded(true);
        if (els.secretFolderInput) {
          els.secretFolderInput.value = [SECRET_ALL_FOLDER_ID, SECRET_FAVORITES_FOLDER_ID].includes(state.activeSecretFolderId)
            ? ""
            : state.activeSecretFolderId;
        }
        els.secretComposer?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      onRename: renameActiveSecretFolder,
      onDelete: deleteActiveSecretFolder,
      onMoveToFolder: (item) => void openSecretAlbumFolderDialog(item),
      onContextMenu: openSecretAlbumContextMenu,
      onOpen: (item) => {
        state.activeSecretAlbumId = item?.id || "";
        state.activeSecretFilter = "全部";
        state.secretSelectionMode = false;
        state.selectedSecretImageIndexes = new Set();
        state.secretAlbumEditing = false;
        state.secretAppendExpanded = false;
        state.secretMobileToolsExpanded = false;
        renderSecretGallery();
      },
      onMove: moveSecretAlbum,
    });
  }
  
  async function openSecretAlbumFolderDialog(item) {
    if (!item || !state.session || !state.cloudDb) return;
    let dialog = document.querySelector("#secretAlbumFolderDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "secretAlbumFolderDialog";
      dialog.className = "secret-album-folder-dialog";
      document.body.append(dialog);
    }
    const choices = [
      { id: "", name: "不放入文件夹", count: state.secretItems.filter((entry) => !entry.folderId).length },
      ...state.secretFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        count: state.secretItems.filter((entry) => entry.folderId === folder.id).length,
      })),
    ];
    dialog.innerHTML = `<form method="dialog">
      <header><div><span>Move Album</span><h2>移动相册</h2><p>${escapeHtml(item.title || "未命名相册")}</p></div><button value="cancel" type="submit" aria-label="关闭">×</button></header>
      <div class="secret-folder-choice-list">${choices.map((folder) => {
        const current = (item.folderId || "") === folder.id;
        return `<button class="${current ? "current" : ""}" type="submit" value="${escapeHtml(folder.id || "__default__")}" ${current ? "disabled" : ""}><span><i aria-hidden="true"></i><strong>${escapeHtml(folder.name)}</strong></span><small>${folder.count} 个相册</small></button>`;
      }).join("")}</div>
      <footer>长按相册，可以随时重新整理</footer>
    </form>`;
    dialog.showModal();
    await new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
    const targetFolderId = dialog.returnValue === "__default__" ? "" : dialog.returnValue;
    if (!targetFolderId && dialog.returnValue !== "__default__") return;
    await moveSecretAlbumToFolder(item, targetFolderId);
  }
  
  async function moveSecretAlbumToFolder(item, folderId = "") {
    if (!item || !state.cloudDb || !state.session || (item.folderId || "") === folderId) return;
    setSecretStatus("正在移动相册...");
    const { error } = await secretRepository.updateOwnedItem(item.id, {
      folder_id: folderId || null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setSecretStatus(error.message || "移动相册失败。");
      showMiniToast("移动失败", { kind: "error" });
      return;
    }
    item.folderId = folderId;
    item.updatedAt = new Date().toISOString();
    saveSecretItemsCache(state.session.user.id);
    renderSecretGallery();
    setSecretStatus("相册已移动。");
    showMiniToast("相册已移动", { kind: "success" });
  }
  
  function renderSecretAlbumView(item) {
    const images = normalizeSecretImages(item.images);
    const displayEntries = sortSecretDisplayEntries(
      images
        .map((image, index) => ({ image, index }))
        .filter(({ image }) => imageMatchesSecretFilter(image) && secretImageMatchesSearch(image)),
      item
    );
    const photoSortDescending = getSecretPhotoSortDescending(item);
    const hasNumericPhotoOrder = images.some(
      (image) => getSecretImageNumericOrder(image) !== null
    );
    const linkedPhoto = state.photos.find((photo) => photo.id === item.linkedPhotoId);
    const linkedTitle = linkedPhoto ? getDisplayTitle(linkedPhoto) || "关联日记" : "";
    const validSelectedIndexes = [...state.selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
    const knownTags = getSecretAlbumTagCounts(item)
      .map(({ tag }) => tag)
      .filter((tag) => !["全部", FAVORITE_SECRET_PHOTO_TAG].includes(tag));
    const selectedTags = [...new Set(
      validSelectedIndexes.flatMap((index) => normalizeSecretPhotoTags(images[index]))
    )].filter((tag) => tag !== DEFAULT_SECRET_PHOTO_TAG);
    const moveTargets = sortSecretItems(state.secretItems).filter((entry) => entry.id !== item.id);
    els.secretGallery.innerHTML = buildSecretAlbumMarkup({
      item,
      images,
      displayEntries,
      linkedTitle,
      selectionMode: state.secretSelectionMode,
      mobileToolsExpanded: state.secretMobileToolsExpanded,
      selectedIndexes: state.selectedSecretImageIndexes,
      appendExpanded: state.secretAppendExpanded,
      albumEditing: state.secretAlbumEditing,
      activeFilter: state.activeSecretFilter,
      photoSortDescending,
      hasNumericPhotoOrder,
      knownTags,
      selectedTags,
      folders: state.secretFolders,
      moveTargets,
      mobile: isMobileViewport(),
    });
    updateSecretToolbarTop();
    requestAnimationFrame(updateSecretToolbarTop);
    prepareFeedImages(els.secretGallery);
    bindSecretAlbumActions({
      container: els.secretGallery,
      selectionMode: state.secretSelectionMode,
      selectedIndexes: state.selectedSecretImageIndexes,
      handlers: {
        back: () => {
          state.activeSecretAlbumId = "";
          state.secretSelectionMode = false;
          state.selectedSecretImageIndexes = new Set();
          state.secretAlbumEditing = false;
          state.secretAppendExpanded = false;
          state.secretMobileToolsExpanded = false;
          renderSecretGallery();
        },
        toggleAppend: () => {
          state.secretAppendExpanded = !state.secretAppendExpanded;
          renderSecretGallery();
        },
        merge: (targetId) => mergeSecretAlbumInto(item, targetId),
        toggleEdit: () => {
          state.secretAlbumEditing = !state.secretAlbumEditing;
          renderSecretGallery();
        },
        cancelEdit: () => {
          state.secretAlbumEditing = false;
          renderSecretGallery();
        },
        saveEdit: (event) => saveSecretAlbumEdit(event, item),
        append: appendSecretAlbumImages,
        getClipboardFiles: (event) => getImageFilesFromClipboard(event, "secret-append-pasted"),
        openLinked: () => {
          state.activeSecretDialogItem = item;
          openSecretLinkedDiary();
        },
        deleteCurrent: () => deleteSecretItem(item),
        toggleSort: async (button) => {
          if (button.disabled) return;
          button.disabled = true;
          const saved = await setSecretPhotoSortDescending(item, !getSecretPhotoSortDescending(item));
          if (saved) renderSecretGallery();
          else button.disabled = false;
        },
        deleteTag: () => deleteCurrentSecretTag(item),
        toggleSelection: () => {
          state.secretSelectionMode = !state.secretSelectionMode;
          state.secretMobileToolsExpanded = false;
          if (!state.secretSelectionMode) state.selectedSecretImageIndexes = new Set();
          renderSecretGallery();
        },
        toggleTools: () => {
          state.secretMobileToolsExpanded = !state.secretMobileToolsExpanded;
          renderSecretGallery();
        },
        toggleSelectAll: () => {
          if (!state.secretSelectionMode) return;
          const visibleIndexes = displayEntries.map(({ index }) => index);
          const allSelected = visibleIndexes.length > 0 && visibleIndexes.every((index) => state.selectedSecretImageIndexes.has(index));
          state.selectedSecretImageIndexes = allSelected ? new Set() : new Set(visibleIndexes);
          renderSecretGallery();
        },
        deleteSelected: () => deleteSelectedSecretImages(item),
        setCover: () => setSelectedSecretCover(item),
        moveToAlbum: (targetId) => moveSelectedSecretImagesToAlbum(item, targetId),
        applyTag: (tag) => applySecretPhotoTag(item, tag),
        removeTag: (tag) => removeSecretPhotoTagFromSelection(item, tag),
        backTop: scrollSecretAlbumToTop,
        moveSelected: async (direction, button) => {
          if (button.disabled) return;
          button.disabled = true;
          await moveSelectedSecretImage(item, direction);
        },
        enterSelection: (index) => {
          state.secretSelectionMode = true;
          state.secretMobileToolsExpanded = false;
          state.selectedSecretImageIndexes = new Set([index]);
          renderSecretGallery();
        },
        selectPhoto: (index, button, selected) => {
          if (state.secretSelectionMode) {
            if (selected) state.selectedSecretImageIndexes.delete(index);
            else state.selectedSecretImageIndexes.add(index);
            renderSecretGallery();
            return;
          }
          const visibleIndex = displayEntries.findIndex((entry) => entry.index === index);
          openSecretItem(item, Math.max(0, visibleIndex), {
            images: displayEntries.map((entry) => entry.image),
            returnImageUrl: displayEntries[Math.max(0, visibleIndex)]?.image?.image_url || "",
            returnElementTop: button.getBoundingClientRect().top,
            triggerElement: button,
          });
        },
      },
    });
  }
  
  function openSecretItem(item, initialImageIndex = 0, options = {}) {
    if (!item) return;
    state.secretViewerReturnFocus = options.triggerElement || document.activeElement;
    state.secretViewerInfoOpen = false;
    state.dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
    state.dialogRestorePhotoId = "";
    state.dialogRestorePhotoTop = 0;
    state.lockedDialogScrollY = state.dialogRestoreScrollY;
    state.dialogLockUsesFixed = false;
    document.documentElement.classList.add("dialog-scroll-locked");
    document.body.classList.add("dialog-scroll-locked");
    state.activeDialogPhoto = null;
    state.activeSecretDialogItem = item;
    state.dialogSecretSourceItem = null;
    els.dialog.classList.remove("mobile-page-dialog", "diary-detail-dialog", "diary-image-fullscreen", "secret-viewer-info-open");
    els.dialog.classList.add("no-comments-dialog", "secret-image-dialog");
    if (isMobileViewport()) els.dialog.classList.add("secret-image-fullscreen");
    els.dialog.setAttribute("aria-modal", "true");
    document.body.classList.remove("mobile-dialog-open");
    state.dialogRandomMode = false;
    state.dialogImages = Array.isArray(options.images) && options.images.length
      ? options.images
      : normalizeSecretImages(item.images);
    state.dialogImageIndex = Math.min(
      Math.max(0, Number(initialImageIndex) || 0),
      Math.max(0, state.dialogImages.length - 1)
    );
    state.dialogRestoreSecretImageUrl = options.returnImageUrl || state.dialogImages[state.dialogImageIndex]?.image_url || "";
    state.dialogRestoreElementTop = Number(options.returnElementTop) || 0;
    els.dialogTitle.textContent = item.title || item.category || "秘藏相册";
    els.dialogMeta.textContent = `${normalizeSecretPhotoTags(state.dialogImages[state.dialogImageIndex]).slice(0, 2).join(" · ")} · ${state.dialogImageIndex + 1} / ${state.dialogImages.length}`;
    els.dialogNote.textContent = item.note || "";
    els.photoCommentsSection.hidden = true;
    if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
    if (els.dialogSecretReturnButton) els.dialogSecretReturnButton.hidden = true;
    if (els.dialogSecretLinkButton) {
      els.dialogSecretLinkButton.hidden = !item.linkedPhotoId;
    }
    showPhotoDialogPreservingScroll();
    renderDialogMedia();
    requestAnimationFrame(() => {
      if (isMobileViewport()) {
        fitSecretViewerImage();
        resetSecretImageZoom();
      }
      els.closeDialog?.focus({ preventScroll: true });
    });
  }
  
  function toggleDialogImageFullscreen({ bypassSuppression = false } = {}) {
    if (state.activeSecretDialogItem && isMobileViewport()) return;
    if (!state.dialogImages.length || !els.dialog.open) return;
    if (!bypassSuppression && Date.now() < state.suppressDialogImageClickUntil) return;
    const opening = !els.dialog.classList.contains("secret-image-fullscreen");
    resetSecretImageZoom();
    els.dialog.classList.toggle("secret-image-fullscreen", opening);
    els.dialog.classList.remove("secret-viewer-info-open");
    state.secretViewerInfoOpen = false;
    if (opening) {
      requestAnimationFrame(() => {
        fitSecretViewerImage();
        resetSecretImageZoom();
        els.closeDialog?.focus({ preventScroll: true });
      });
    } else {
      els.dialogImage.style.removeProperty("width");
      els.dialogImage.style.removeProperty("height");
      setSecretViewerStatus("");
    }
    refreshSecretViewerToolbar();
  }
  
  function toggleDiaryImageFullscreen({ bypassSuppression = false } = {}) {
    if (!state.activeDialogPhoto || isMobileViewport() || !els.dialog?.open) return;
    if (!bypassSuppression && Date.now() < state.suppressDialogImageClickUntil) return;
    if (state.secretImageZoom.scale > 1.01) {
      resetSecretImageZoom();
      return;
    }
    const opening = !els.dialog.classList.contains("diary-image-fullscreen");
    els.dialog.classList.toggle("diary-image-fullscreen", opening);
    els.dialog.scrollTop = 0;
    if (opening) {
      requestAnimationFrame(() => {
        fitSecretViewerImage();
        resetSecretImageZoom();
      });
    } else {
      els.dialogImage.style.removeProperty("width");
      els.dialogImage.style.removeProperty("height");
      requestAnimationFrame(() => fitSecretViewerImage());
    }
    refreshDiaryViewerToolbar();
  }
  
  function openSecretLinkedDiary() {
    const item = state.activeSecretDialogItem;
    if (!item?.linkedPhotoId) return;
    const photo = state.photos.find((entry) => entry.id === item.linkedPhotoId);
    if (!photo) {
      setGlobalStatus("关联日记暂时没有加载到。");
      return;
    }
    openPhoto(photo, 0, { secretSourceItem: item });
  }
  
  function returnToSecretItem() {
    if (state.dialogSecretSourceItem) {
      openSecretItem(state.dialogSecretSourceItem);
    }
  }
  
  function scrollSecretAlbumToTop() {
    const target = els.secretGallery?.querySelector(".secret-album-head");
    if (!target) return;
    const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
    const mobileOffset = window.matchMedia(`(max-width: ${MOBILE_DIALOG_BREAKPOINT}px)`).matches
      ? 10
      : topbarHeight + 14;
    const targetY = target.getBoundingClientRect().top + window.scrollY - mobileOffset;
    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: "smooth",
    });
  }
  
  function getImageFilesFromClipboard(event, prefix = "pasted") {
    const items = Array.from(event.clipboardData?.items || []);
    return items
      .filter((item) => item.type.startsWith("image/"))
      .map((item, index) => {
        const file = item.getAsFile();
        if (!file) return null;
        const extension = file.type?.split("/")[1] || "png";
        return new File([file], `${prefix}-${Date.now()}-${index + 1}.${extension}`, {
          type: file.type || "image/png",
        });
      })
      .filter(Boolean);
  }
  
  async function updateSecretAlbum(item, updates, successMessage = "相册已更新。") {
    if (!item || !state.cloudDb || !state.session) {
      setSecretStatus("请先登录。");
      return false;
    }
    const nextUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { error } = await secretRepository.updateItem(item.id, nextUpdates);
    if (error) {
      setSecretStatus(error.message || "相册更新失败。");
      return false;
    }
    setSecretStatus(successMessage);
    await loadSecretItems();
    state.activeSecretAlbumId = item.id;
    return true;
  }
  
  async function moveSecretAlbum(itemId, direction, visibleItems = sortSecretItems(state.secretItems)) {
    if (!itemId || !direction || !state.cloudDb || !state.session) return;
    const ordered = sortSecretItems(visibleItems);
    const index = ordered.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const current = ordered[index];
    const targetItem = ordered[target];
    const currentOrder = Number.isFinite(Number(current.sortOrder))
      ? Number(current.sortOrder)
      : getDefaultSecretSortOrder(current.createdAt);
    const targetOrder = Number.isFinite(Number(targetItem.sortOrder))
      ? Number(targetItem.sortOrder)
      : getDefaultSecretSortOrder(targetItem.createdAt);
    setSecretStatus("正在保存相册顺序...");
    const now = new Date().toISOString();
    const [first, second] = await Promise.all([
      secretRepository.updateOwnedItem(current.id, {
        sort_order: targetOrder,
        updated_at: now,
      }),
      secretRepository.updateOwnedItem(targetItem.id, {
        sort_order: currentOrder,
        updated_at: now,
      }),
    ]);
    const error = first.error || second.error;
    if (error) {
      setSecretStatus(error.message || "相册排序保存失败。");
      return;
    }
    current.sortOrder = targetOrder;
    targetItem.sortOrder = currentOrder;
    state.secretItems = sortSecretItems(state.secretItems);
    saveSecretItemsCache(state.session.user.id);
    renderSecretGallery();
    setSecretStatus("相册顺序已保存。");
  }
  
  async function saveSecretAlbumEdit(event, item) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = form.querySelector("[data-secret-edit-title]")?.value.trim() || "";
    const sortDescending = form.querySelector("[data-secret-edit-sort]")?.value !== "asc";
    const folderId = form.querySelector("[data-secret-edit-folder]")?.value || "";
    const note = form.querySelector("[data-secret-edit-note]")?.value.trim() || "";
    const saved = await updateSecretAlbum(item, {
      title,
      note,
      folder_id: folderId || null,
      photo_sort_descending: sortDescending ? 1 : 0,
    }, "相册资料已保存。");
    if (saved) {
      state.secretAlbumEditing = false;
      renderSecretGallery();
    }
  }
  
  function getSingleSelectedSecretIndex(images) {
    const selected = [...state.selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
    return selected.length === 1 ? selected[0] : -1;
  }
  
  async function moveSelectedSecretImage(item, direction) {
    const images = normalizeSecretImages(item.images);
    const index = getSingleSelectedSecretIndex(images);
    const displayEntries = sortSecretDisplayEntries(
      images
        .map((image, imageIndex) => ({ image, index: imageIndex }))
        .filter(({ image }) => imageMatchesSecretFilter(image) && secretImageMatchesSearch(image)),
      item
    );
    const displayPosition = displayEntries.findIndex((entry) => entry.index === index);
    const targetEntry = displayEntries[displayPosition + direction];
    const target = targetEntry?.index ?? -1;
    if (index < 0 || displayPosition < 0 || target < 0 || target >= images.length) return false;
    const nextImages = [...images];
    [nextImages[index], nextImages[target]] = [nextImages[target], nextImages[index]];
    const saved = await updateSecretAlbum(
      item,
      { images: nextImages, cover_image: item.coverImage || "", cover_path: item.coverPath || "" },
      "图片位置已更新。"
    );
    if (!saved) {
      renderSecretGallery();
      return false;
    }
    state.selectedSecretImageIndexes = new Set([target]);
    renderSecretGallery();
    showMiniToast("图片位置已更新", { kind: "success" });
    return true;
  }
  
  async function setSelectedSecretCover(item) {
    const images = normalizeSecretImages(item.images);
    const index = getSingleSelectedSecretIndex(images);
    const image = images[index];
    if (!image) return;
    await updateSecretAlbum(
      item,
      { cover_image: image.image_url || "", cover_path: image.image_path || "" },
      "相册封面已更新。"
    );
    renderSecretGallery();
  }
  
  async function applySecretPhotoTag(item, rawTag) {
    const images = normalizeSecretImages(item.images);
    const selected = [...state.selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
    if (!selected.length) {
      setSecretStatus("先选择要打 tag 的图片。");
      return;
    }
    const nextTag = normalizeSecretPhotoTag(rawTag);
    const selectedSet = new Set(selected);
    const nextImages = images.map((image, index) =>
      selectedSet.has(index) ? addSecretImageTag(image, nextTag) : image
    );
    const saved = await updateSecretAlbum(item, { images: nextImages }, `已给 ${selected.length} 张图片添加「${nextTag}」tag。`);
    if (saved) {
      state.activeSecretFilter = nextTag;
      state.selectedSecretImageIndexes = new Set(selected);
      state.secretSelectionMode = true;
      renderSecretGallery();
    }
  }
  
  async function removeSecretPhotoTagFromSelection(item, rawTag) {
    const tag = normalizeSecretPhotoTag(rawTag);
    if (!item || !tag || tag === DEFAULT_SECRET_PHOTO_TAG) return;
    const images = normalizeSecretImages(item.images);
    const selected = [...state.selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
    if (!selected.length) return;
    const selectedSet = new Set(selected);
    const affectedCount = selected.filter((index) => secretImageHasTag(images[index], tag)).length;
    if (!affectedCount) return;
    const nextImages = images.map((image, index) =>
      selectedSet.has(index) && secretImageHasTag(image, tag) ? removeSecretImageTag(image, tag) : image
    );
    const saved = await updateSecretAlbum(
      item,
      { images: nextImages },
      `已从 ${affectedCount} 张选中照片移除「${tag}」。`
    );
    if (!saved) return;
    state.selectedSecretImageIndexes = new Set(selected);
    state.secretSelectionMode = true;
    renderSecretGallery();
  }
  
  async function deleteCurrentSecretTag(item) {
    const tag = normalizeSecretPhotoTag(state.activeSecretFilter);
    if (!item || ["全部", DEFAULT_SECRET_PHOTO_TAG, FAVORITE_SECRET_PHOTO_TAG].includes(tag)) return;
    const images = normalizeSecretImages(item.images);
    const affectedCount = images.filter((image) => secretImageHasTag(image, tag)).length;
    if (!affectedCount) {
      state.activeSecretFilter = "全部";
      renderSecretGallery();
      return;
    }
    const confirmed = await confirmAction({
      eyebrow: "整理照片标签",
      title: `删除「${tag}」Tag？`,
      message: `会从当前相册的 ${affectedCount} 张照片上移除，不会删除照片。`,
      confirmLabel: "删除 Tag",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;
    const nextImages = images.map((image) =>
      secretImageHasTag(image, tag) ? removeSecretImageTag(image, tag) : image
    );
    const saved = await updateSecretAlbum(
      item,
      { images: nextImages },
      `已从 ${affectedCount} 张照片移除「${tag}」tag。`
    );
    if (!saved) return;
    state.activeSecretFilter = DEFAULT_SECRET_PHOTO_TAG;
    state.selectedSecretImageIndexes = new Set();
    state.secretSelectionMode = false;
    renderSecretGallery();
  }
  
  async function updateSecretDialogImage(updates = {}) {
    const item = state.activeSecretDialogItem;
    if (!item || !state.cloudDb || !state.session) return;
    const status = els.dialogNote?.querySelector("[data-secret-dialog-status]");
    const images = normalizeSecretImages(item.images);
    const displayedImage = state.dialogImages[state.dialogImageIndex] || {};
    const matchedIndex = images.findIndex((image) =>
      (displayedImage.image_path && image.image_path === displayedImage.image_path) ||
      image.image_url === displayedImage.image_url
    );
    const index = matchedIndex >= 0
      ? matchedIndex
      : Math.min(Math.max(0, state.dialogImageIndex), Math.max(0, images.length - 1));
    if (!images[index]) return;
    let nextImage = { ...images[index] };
    if (Object.prototype.hasOwnProperty.call(updates, "tag")) {
      nextImage = setSecretImageTags(nextImage, [updates.tag]);
    }
    if (Object.prototype.hasOwnProperty.call(updates, "addTag")) {
      nextImage = addSecretImageTag(nextImage, updates.addTag);
    }
    if (Object.prototype.hasOwnProperty.call(updates, "removeTag")) {
      nextImage = removeSecretImageTag(nextImage, updates.removeTag);
    }
    if (Object.prototype.hasOwnProperty.call(updates, "favorite")) {
      nextImage.favorite = Boolean(updates.favorite);
    }
    const nextImages = images.map((image, imageIndex) => (imageIndex === index ? nextImage : image));
    if (status) status.textContent = "正在保存...";
    const { error } = await secretRepository.updateItem(item.id, {
      images: nextImages,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      if (status) status.textContent = error.message || "保存失败。";
      return;
    }
    item.images = nextImages;
    item.updatedAt = new Date().toISOString();
    const itemIndex = state.secretItems.findIndex((entry) => entry.id === item.id);
    if (itemIndex >= 0) {
      state.secretItems[itemIndex] = { ...state.secretItems[itemIndex], images: nextImages, updatedAt: item.updatedAt };
      state.activeSecretDialogItem = state.secretItems[itemIndex];
    }
    state.dialogImages = state.dialogImages.map((image) =>
      ((displayedImage.image_path && image.image_path === displayedImage.image_path) || image.image_url === displayedImage.image_url)
        ? nextImage
        : image
    );
    if (state.session?.user?.id) saveSecretItemsCache(state.session.user.id);
    renderSecretGallery();
    renderDialogMedia();
    const message = Object.prototype.hasOwnProperty.call(updates, "favorite")
      ? nextImage.favorite
        ? "已加入收藏。"
        : "已取消收藏。"
      : Object.prototype.hasOwnProperty.call(updates, "removeTag")
        ? `已移除「${normalizeSecretPhotoTag(updates.removeTag)}」。`
        : `已更新 tag。`;
    const nextStatus = els.dialogNote?.querySelector("[data-secret-dialog-status]");
    if (nextStatus) nextStatus.textContent = message;
  }
  
  async function deleteSelectedSecretImages(item) {
    const images = normalizeSecretImages(item.images);
    const selected = [...state.selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
    if (!selected.length) return;
    if (selected.length >= images.length) {
      setSecretStatus("至少保留一张图片。如果要全部删除，请删除整个相册。");
      return;
    }
    const confirmed = await confirmAction({
      eyebrow: "批量管理",
      title: `删除选中的 ${selected.length} 张图片？`,
      message: "保存后这些图片会从秘藏相册中移除。",
      confirmLabel: "删除图片",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;
    const selectedSet = new Set(selected);
    const removedImages = images.filter((_, index) => selectedSet.has(index));
    const nextImages = images.filter((_, index) => !selectedSet.has(index));
    const coverStillExists = nextImages.some((image) => image.image_url === item.coverImage);
    const cover = coverStillExists ? { cover_image: item.coverImage || "", cover_path: item.coverPath || "" } : {
      cover_image: nextImages[0]?.image_url || "",
      cover_path: nextImages[0]?.image_path || "",
    };
    const saved = await updateSecretAlbum(item, { images: nextImages, ...cover }, `已删除 ${selected.length} 张图片。`);
    if (!saved) return;
    state.selectedSecretImageIndexes = new Set();
    state.secretSelectionMode = false;
    const paths = removedImages.flatMap((image) => [image.image_path, image.thumbnail_path]).filter(Boolean);
    if (paths.length) cleanupStoredImagePaths(paths).catch(() => {});
    renderSecretGallery();
  }
  
  async function moveSelectedSecretImagesToAlbum(sourceItem, targetId) {
    if (!sourceItem || !targetId || !state.cloudDb || !state.session) return;
    const targetItem = state.secretItems.find((entry) => entry.id === targetId);
    if (!targetItem || targetItem.id === sourceItem.id) return;
    const sourceImages = normalizeSecretImages(sourceItem.images);
    const targetImages = normalizeSecretImages(targetItem.images);
    const selected = [...state.selectedSecretImageIndexes].filter((index) => index >= 0 && index < sourceImages.length);
    if (!selected.length) {
      setSecretStatus("先选择要移动的图片。");
      return;
    }
    if (selected.length >= sourceImages.length) {
      setSecretStatus("至少给当前相册保留一张图片。");
      return;
    }
    if (targetImages.length + selected.length > SECRET_ALBUM_IMAGE_LIMIT) {
      setSecretStatus(`目标相册最多 ${SECRET_ALBUM_IMAGE_LIMIT} 张图。`);
      return;
    }
    const selectedSet = new Set(selected);
    const movingImages = sourceImages.filter((_, index) => selectedSet.has(index));
    const nextSourceImages = sourceImages.filter((_, index) => !selectedSet.has(index));
    const nextTargetImages = [...targetImages, ...movingImages];
    const sourceCoverStillExists = nextSourceImages.some((image) => image.image_url === sourceItem.coverImage);
    const sourceCover = sourceCoverStillExists
      ? { cover_image: sourceItem.coverImage || "", cover_path: sourceItem.coverPath || "" }
      : {
          cover_image: nextSourceImages[0]?.image_url || "",
          cover_path: nextSourceImages[0]?.image_path || "",
        };
    const targetCover = targetItem.coverImage
      ? { cover_image: targetItem.coverImage || "", cover_path: targetItem.coverPath || "" }
      : {
          cover_image: nextTargetImages[0]?.image_url || "",
          cover_path: nextTargetImages[0]?.image_path || "",
        };
    setSecretStatus("正在移动图片...");
    const now = new Date().toISOString();
    const [sourceResult, targetResult] = await Promise.all([
      secretRepository.updateOwnedItem(sourceItem.id, {
        images: nextSourceImages,
        ...sourceCover,
        updated_at: now,
      }),
      secretRepository.updateOwnedItem(targetItem.id, {
        images: nextTargetImages,
        ...targetCover,
        updated_at: now,
      }),
    ]);
    const error = sourceResult.error || targetResult.error;
    if (error) {
      setSecretStatus(error.message || "移动图片失败。");
      return;
    }
    state.selectedSecretImageIndexes = new Set();
    state.secretSelectionMode = false;
    await loadSecretItems();
    state.activeSecretAlbumId = sourceItem.id;
    renderSecretGallery();
    setSecretStatus(`已移动 ${movingImages.length} 张到「${targetItem.title || targetItem.category || "目标相册"}」。`);
  }
  
  async function mergeSecretAlbumInto(sourceItem, targetId) {
    if (!sourceItem || !targetId || !state.cloudDb || !state.session) return;
    const targetItem = state.secretItems.find((entry) => entry.id === targetId);
    if (!targetItem || targetItem.id === sourceItem.id) return;
    const sourceImages = normalizeSecretImages(sourceItem.images);
    const targetImages = normalizeSecretImages(targetItem.images);
    if (targetImages.length + sourceImages.length > SECRET_ALBUM_IMAGE_LIMIT) {
      setSecretStatus(`合并后会超过每个相册 ${SECRET_ALBUM_IMAGE_LIMIT} 张的上限。`);
      return;
    }
    const targetName = targetItem.title || targetItem.category || "目标相册";
    const confirmed = await confirmAction({
      eyebrow: "合并秘藏相册",
      title: `移动到「${targetName}」？`,
      message: `将移动 ${sourceImages.length} 张照片，完成后删除原相册。`,
      confirmLabel: "移动并合并",
      cancelLabel: "取消",
    });
    if (!confirmed) return;
  
    const originalTargetImages = [...targetImages];
    const mergedImages = [...targetImages, ...sourceImages];
    const now = new Date().toISOString();
    setSecretStatus("正在合并相册...");
    const targetUpdates = {
      images: mergedImages,
      cover_image: targetItem.coverImage || mergedImages[0]?.image_url || "",
      cover_path: targetItem.coverPath || mergedImages[0]?.image_path || "",
      updated_at: now,
    };
    const targetResult = await secretRepository.updateOwnedItem(targetItem.id, targetUpdates);
    if (targetResult.error) {
      setSecretStatus(targetResult.error.message || "无法写入目标相册。");
      return;
    }
  
    const deleteResult = await secretRepository.removeItem(sourceItem.id);
    if (deleteResult.error) {
      await secretRepository.updateOwnedItem(targetItem.id, {
        images: originalTargetImages,
        updated_at: targetItem.updatedAt || now,
      });
      setSecretStatus(deleteResult.error.message || "删除原相册失败，合并已回滚。");
      return;
    }
  
    state.activeSecretAlbumId = targetItem.id;
    state.activeSecretFilter = "全部";
    await loadSecretItems();
    renderSecretGallery();
    setSecretStatus(`已合并到「${targetName}」。`);
    showMiniToast("相册移动完成", { kind: "success" });
  }
  
  async function appendSecretAlbumImages(options = {}) {
    const item = state.secretItems.find((entry) => entry.id === state.activeSecretAlbumId);
    const files = Array.isArray(options.files)
      ? options.files
      : [];
    const urls = extractImageUrls(options.linksText || "");
    if (!item) return;
    if (!state.cloudDb || !state.session) {
      setSecretStatus("请先登录。");
      return;
    }
    if (!files.length && !urls.length) {
      setSecretStatus("请选择图片，或粘贴至少一个图片链接。");
      return;
    }
    const currentImages = normalizeSecretImages(item.images);
    const remaining = SECRET_ALBUM_IMAGE_LIMIT - currentImages.length;
    if (remaining <= 0) {
      setSecretStatus(`这个相册已经达到 ${SECRET_ALBUM_IMAGE_LIMIT} 张上限。`);
      return;
    }
    const appendFiles = files.slice(0, remaining);
    const appendUrls = urls.slice(0, Math.max(0, remaining - appendFiles.length));
    const skippedCount = Math.max(0, files.length + urls.length - appendFiles.length - appendUrls.length);
    const uploadedImages = [];
    setSecretStatus(`正在追加 ${appendFiles.length + appendUrls.length} 张图片...`);
    let loadingToast = showMiniToast("正在添加相片...", {
      kind: "loading",
      persist: true,
      placement: "center",
    });
    try {
      for (const [index, file] of appendFiles.entries()) {
        const base = slugify(item.title || item.category || "secret");
        const uploaded = await uploadImageFile(
          file,
          `${base}-append-${currentImages.length + index + 1}`,
          index + 1,
          appendFiles.length,
          {
            folder: "secrets",
            statusSetter: setSecretStatus,
          }
        );
        if (!uploaded) throw new Error("追加图片上传失败。");
        uploadedImages.push({
          ...uploaded,
          tag: DEFAULT_SECRET_PHOTO_TAG,
          tags: [DEFAULT_SECRET_PHOTO_TAG],
          uploadedAt: new Date().toISOString(),
        });
      }
      for (const [index, url] of appendUrls.entries()) {
        const safeName = `${slugify(item.title || item.category || "secret-link")}-link-${currentImages.length + appendFiles.length + index + 1}`;
        setSecretStatus(`正在复制第 ${index + 1}/${appendUrls.length} 个链接到 R2...`);
        const copied = await copyUrlToR2(url, safeName, "secrets");
        uploadedImages.push({
          image_path: `r2:${copied.key}`,
          image_url: copied.url,
          width: 0,
          height: 0,
          tag: DEFAULT_SECRET_PHOTO_TAG,
          tags: [DEFAULT_SECRET_PHOTO_TAG],
          uploadedAt: new Date().toISOString(),
        });
      }
      const nextImages = [...uploadedImages, ...currentImages];
      const updates = {
        images: nextImages,
        updated_at: new Date().toISOString(),
      };
      if (!item.coverImage && nextImages[0]?.image_url) {
        updates.cover_image = nextImages[0].image_url;
        updates.cover_path = nextImages[0].image_path || "";
      }
      const { error } = await secretRepository.updateOwnedItem(item.id, updates);
      if (error) throw error;
      setSecretStatus(
        skippedCount
          ? `已追加 ${uploadedImages.length} 张，另有 ${skippedCount} 张超过相册上限未添加。`
          : `已追加 ${uploadedImages.length} 张图片。`
      );
      if (options.form) options.form.reset();
      await loadSecretItems();
      state.activeSecretAlbumId = item.id;
      renderSecretGallery();
      dismissMiniToast(loadingToast);
      showMiniToast("相片已加入相册", { kind: "success", placement: "center" });
    } catch (error) {
      if (uploadedImages.length) {
        cleanupStoredImagePaths(uploadedImages.map((image) => image.image_path).filter(Boolean)).catch(() => {});
      }
      dismissMiniToast(loadingToast);
      showMiniToast("追加失败", { kind: "error", duration: 2600, placement: "center" });
      setSecretStatus(error.message || "追加图片失败。");
    } finally {
      dismissMiniToast(loadingToast);
    }
  }
  
  async function deleteSecretItem(item) {
    if (!item || !state.session) return;
    const confirmed = await confirmAction({
      eyebrow: "移到回收站",
      title: "删除这个秘藏相册？",
      message: "相册会保留 30 天，期间可以从设置里的回收站恢复。",
      confirmLabel: "删除相册",
      cancelLabel: "先保留",
      danger: true,
    });
    if (!confirmed) return;
    const trashSaved = await createTrashItem(
      "secret",
      item.id,
      item.title || item.category || "秘藏相册",
      secretToCloudRow(item, item.userId || state.session.user.id)
    );
    if (!trashSaved) {
      setSecretStatus("无法写入回收站，已取消删除。");
      return;
    }
    const { error } = await secretRepository.removeItem(item.id);
    if (error) {
      await rollbackTrashItem(trashSaved);
      setSecretStatus(error.message || "删除失败。");
      return;
    }
    if (state.activeSecretAlbumId === item.id) state.activeSecretAlbumId = "";
    setSecretStatus("秘藏已移到回收站，可在设置中恢复。");
    showMiniToast("秘藏已移到回收站", { kind: "success" });
    await loadSecretItems();
  }
  
  
  return {
    addSecretImageLinks,
    appendSecretAlbumImages,
    closeSecretAlbumContextMenu,
    closeSecretFolderContextMenu,
    createSecretFolder,
    deleteActiveSecretFolder,
    deleteCurrentSecretTag,
    deleteSecretItem,
    deleteSelectedSecretImages,
    getImageFilesFromClipboard,
    getSecretAlbumFilterTags,
    getSecretFavoriteEntries,
    handleSecretPaste,
    loadSecretItems,
    moveSecretAlbum,
    moveSelectedSecretImage,
    moveSelectedSecretImagesToAlbum,
    openSecretAlbumFolderDialog,
    openSecretItem,
    openSecretLinkedDiary,
    removeSecretPhotoTagFromSelection,
    renderSecretFolderControls,
    renderSecretGallery,
    renderSecretLinkedPhotoOptions,
    returnToSecretItem,
    saveSecretAlbumEdit,
    saveSecretItem,
    setSecretExpanded,
    setSelectedSecretCover,
    toggleDialogImageFullscreen,
    updateSecretDialogImage,
    updateSecretPreview,
  };
}
