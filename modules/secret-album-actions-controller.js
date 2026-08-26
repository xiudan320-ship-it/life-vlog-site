import { confirmAction } from "./confirm-dialog.js";
import { secretToCloudRow } from "./cloud-models.js";
import {
  DEFAULT_SECRET_PHOTO_TAG,
  FAVORITE_SECRET_PHOTO_TAG,
  addSecretImageTag,
  getDefaultSecretSortOrder,
  normalizeSecretImages,
  normalizeSecretPhotoTag,
  removeSecretImageTag,
  secretImageHasTag,
  setSecretImageTags,
  sortSecretItems,
} from "./secret-domain.js?v=20260810-004";
import {
  imageMatchesSecretFilter,
  sortSecretDisplayEntries,
} from "./secret-filter-domain.js";
import { extractImageUrls } from "./media-metadata.js";
import { slugify } from "./ui-formatters.js";

export function createSecretAlbumActionsController({
  elements,
  state,
  repository,
  assets,
  albumImageLimit,
  saveSecretItemsCache,
  setSecretStatus,
  showMiniToast,
  dismissMiniToast,
  loadSecretItems,
  renderSecretGallery,
  renderDialogMedia,
  secretImageMatchesSearch,
  createTrashItem,
  rollbackTrashItem,
}) {
  const els = elements;
  const secretRepository = repository;
  const SECRET_ALBUM_IMAGE_LIMIT = albumImageLimit;
  const {
    cleanupStoredImagePaths,
    copyUrlToR2,
    uploadImageFile,
  } = assets;

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
        .filter(({ image }) => imageMatchesSecretFilter(image, state.activeSecretFilter) && secretImageMatchesSearch(image)),
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

  async function deleteSecretDialogImage() {
    const item = state.activeSecretDialogItem;
    if (!item || !state.cloudDb || !state.session) return;
    const status = els.dialogNote?.querySelector("[data-secret-dialog-status]");
    const images = normalizeSecretImages(item.images);
    const displayedImage = state.dialogImages[state.dialogImageIndex] || {};
    const matchesImage = (image, target) => Boolean(
      target?.image_path && image?.image_path === target.image_path
    ) || Boolean(target?.image_url && image?.image_url === target.image_url);
    const matchedIndex = images.findIndex((image) => matchesImage(image, displayedImage));
    const index = matchedIndex >= 0
      ? matchedIndex
      : Math.min(Math.max(0, state.dialogImageIndex), Math.max(0, images.length - 1));
    if (!images[index]) return;
    if (images.length <= 1) {
      const message = "至少保留一张图片。如果要全部删除，请删除整个相册。";
      if (status) status.textContent = message;
      setSecretStatus(message);
      return;
    }

    const confirmed = await confirmAction({
      eyebrow: "秘藏相片",
      title: "确定要删除这张相片吗？",
      message: "删除后会从当前秘藏相册移除，无法在相册内恢复。",
      confirmLabel: "删除相片",
      cancelLabel: "保留",
      danger: true,
    });
    if (!confirmed) return;

    if (status) status.textContent = "正在删除...";
    const removedImage = images[index];
    const nextImages = images.filter((_, imageIndex) => imageIndex !== index);
    const coverStillExists = nextImages.some((image) => image.image_url === item.coverImage);
    const cover = coverStillExists
      ? { cover_image: item.coverImage || "", cover_path: item.coverPath || "" }
      : {
          cover_image: nextImages[0]?.image_url || "",
          cover_path: nextImages[0]?.image_path || "",
        };
    const updatedAt = new Date().toISOString();
    const { error } = await secretRepository.updateOwnedItem(item.id, {
      images: nextImages,
      ...cover,
      updated_at: updatedAt,
    });
    if (error) {
      if (status) status.textContent = error.message || "删除相片失败。";
      setSecretStatus(error.message || "删除相片失败。");
      return;
    }

    const nextDialogImages = state.dialogImages.filter((image) => !matchesImage(image, removedImage));
    const nextItem = {
      ...item,
      images: nextImages,
      coverImage: cover.cover_image,
      coverPath: cover.cover_path,
      updatedAt,
    };
    const itemIndex = state.secretItems.findIndex((entry) => entry.id === item.id);
    if (itemIndex >= 0) state.secretItems[itemIndex] = nextItem;
    state.activeSecretDialogItem = nextItem;
    state.dialogImages = nextDialogImages;
    state.dialogImageIndex = Math.min(
      state.dialogImageIndex,
      Math.max(0, nextDialogImages.length - 1)
    );
    if (state.session?.user?.id) saveSecretItemsCache(state.session.user.id);
    renderSecretGallery();

    const paths = [removedImage.image_path, removedImage.thumbnail_path].filter(Boolean);
    if (paths.length) cleanupStoredImagePaths(paths).catch(() => {});
    if (!nextDialogImages.length) {
      els.dialog?.close();
    } else {
      renderDialogMedia();
      const nextStatus = els.dialogNote?.querySelector("[data-secret-dialog-status]");
      if (nextStatus) nextStatus.textContent = "相片已删除。";
    }
    setSecretStatus("相片已删除。秘藏相册已更新。");
    showMiniToast("相片已删除", { kind: "success" });
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
    appendSecretAlbumImages,
    applySecretPhotoTag,
    deleteCurrentSecretTag,
    deleteSecretItem,
    deleteSelectedSecretImages,
    deleteSecretDialogImage,
    getImageFilesFromClipboard,
    mergeSecretAlbumInto,
    moveSecretAlbum,
    moveSelectedSecretImage,
    moveSelectedSecretImagesToAlbum,
    removeSecretPhotoTagFromSelection,
    saveSecretAlbumEdit,
    setSelectedSecretCover,
    updateSecretAlbum,
    updateSecretDialogImage,
  };
}
