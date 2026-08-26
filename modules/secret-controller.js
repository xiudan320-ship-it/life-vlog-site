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
} from "./secret-gallery-view.js";
import {
  DEFAULT_SECRET_PHOTO_TAG,
  FAVORITE_SECRET_PHOTO_TAG,
  STORY_SECRET_PHOTO_TAG,
  getSecretImageNumericOrder,
  isSecretNumericTag,
  normalizeSecretImages,
  normalizeSecretPhotoTag,
  normalizeSecretPhotoTags,
  sortSecretItems,
} from "./secret-domain.js?v=20260810-004";
import {
  getSecretAlbumFilterTags,
  getSecretAlbumTagCounts,
  getSecretPhotoSortDescending,
  imageMatchesSecretFilter,
  sortSecretDisplayEntries,
} from "./secret-filter-domain.js";
import { secretFolderFromCloudRow, secretFromCloudRow } from "./cloud-models.js";
import { prepareFeedImages } from "./diary-gallery-view.js";
import { escapeHtml } from "./ui-formatters.js";
import { createSecretFolderController } from "./secret-folder-controller.js";
import { createSecretComposerController } from "./secret-composer-controller.js";
import { createSecretAlbumActionsController } from "./secret-album-actions-controller.js?v=20260826-001";

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

  const secretFolderController = createSecretFolderController({
    elements: els,
    state,
    repository: secretRepository,
    allFolderId: SECRET_ALL_FOLDER_ID,
    favoritesFolderId: SECRET_FAVORITES_FOLDER_ID,
    getDefaultFolderId: getSecretDefaultFolderId,
    setDefaultFolderId: setSecretDefaultFolderId,
    saveItemsCache: saveSecretItemsCache,
    setStatus: setSecretStatus,
    showToast: showMiniToast,
    isMobileViewport,
    renderGallery: (...args) => renderSecretGallery(...args),
    deleteAlbum: (...args) => deleteSecretItem(...args),
  });
  const {
    closeSecretAlbumContextMenu,
    closeSecretFolderContextMenu,
    createSecretFolder,
    deleteActiveSecretFolder,
    openSecretAlbumContextMenu,
    renameActiveSecretFolder,
    renderSecretFolderControls,
  } = secretFolderController;

  const secretComposerController = createSecretComposerController({
    elements: els,
    state,
    repository: secretRepository,
    assets,
    albumImageLimit: SECRET_ALBUM_IMAGE_LIMIT,
    allFolderId: SECRET_ALL_FOLDER_ID,
    favoritesFolderId: SECRET_FAVORITES_FOLDER_ID,
    getSortedPhotos,
    getDisplayTitle,
    getPlainNote,
    setStatus: setSecretStatus,
    showToast: showMiniToast,
    dismissToast: dismissMiniToast,
    loadItems: (...args) => loadSecretItems(...args),
  });
  const {
    addSecretImageLinks,
    handleSecretPaste,
    renderSecretLinkedPhotoOptions,
    saveSecretItem,
    setSecretExpanded,
    updateSecretPreview,
  } = secretComposerController;

  const secretAlbumActionsController = createSecretAlbumActionsController({
    elements: els,
    state,
    repository: secretRepository,
    assets,
    albumImageLimit: SECRET_ALBUM_IMAGE_LIMIT,
    saveSecretItemsCache,
    setSecretStatus,
    showMiniToast,
    dismissMiniToast,
    loadSecretItems: (...args) => loadSecretItems(...args),
    renderSecretGallery: (...args) => renderSecretGallery(...args),
    renderDialogMedia,
    secretImageMatchesSearch,
    createTrashItem,
    rollbackTrashItem,
  });
  const {
    appendSecretAlbumImages,
    applySecretPhotoTag,
    deleteCurrentSecretTag,
    deleteSecretItem,
    deleteSecretDialogImage,
    deleteSelectedSecretImages,
    getImageFilesFromClipboard,
    mergeSecretAlbumInto,
    moveSecretAlbum,
    moveSelectedSecretImage,
    moveSelectedSecretImagesToAlbum,
    removeSecretPhotoTagFromSelection,
    saveSecretAlbumEdit,
    setSelectedSecretCover,
    updateSecretDialogImage,
  } = secretAlbumActionsController;

  
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
        .filter(({ image }) => imageMatchesSecretFilter(image, state.activeSecretFilter) && secretImageMatchesSearch(image)),
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
  
  
  
  return {
    addSecretImageLinks,
    appendSecretAlbumImages,
    closeSecretAlbumContextMenu,
    closeSecretFolderContextMenu,
    createSecretFolder,
    deleteActiveSecretFolder,
    deleteCurrentSecretTag,
    deleteSecretDialogImage,
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
    toggleDiaryImageFullscreen,
    toggleDialogImageFullscreen,
    updateSecretDialogImage,
    updateSecretPreview,
  };
}
