import { confirmAction } from "./confirm-dialog.js";
import { composeDiaryStoredNote, getStoredPhotoMediaPaths } from "./media-metadata.js";
import { escapeHtml, slugify } from "./ui-formatters.js";

export function createPhotoEditorController({
  elements,
  state,
  repository,
  assets,
  awardExperience,
  deletePhoto,
  getCurrentImageLimit,
  getDisplayTitle,
  getPhotoImages,
  getPlainNote,
  loadPhotos,
  setGlobalStatus,
  toDateInputValue,
}) {
  const els = elements;
  const diaryRepository = repository;
  const { cleanupStoredImagePaths, uploadImageFile } = assets;

  function openEditPhoto(photo) {
    if (!photo) return;
    resetEditImageState();
    state.editingPhoto = photo;
    state.editingImages = getPhotoImages(photo).map((image) => ({ ...image }));
    els.deleteEditingPhoto.disabled = false;
    els.deleteEditingPhoto.textContent = "删除整篇";
    els.saveEditStatus.textContent = "";
    els.editTitleInput.value = getDisplayTitle(photo);
    els.editDateInput.value = toDateInputValue(photo.taken_at);
    els.editCategoryInput.value = photo.category || "日常";
    els.editPublicInput.value = String(photo.is_public !== false);
    els.editNoteInput.value = getPlainNote(photo);
    renderEditImages();
    els.editDialog.showModal();
  }

  async function savePhotoEdit(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session || !state.editingPhoto || !state.editingImages.length) {
      els.saveEditStatus.textContent = "请先登录，并至少保留一张图片。";
      return;
    }

    const takenAt = els.editDateInput.value || toDateInputValue(new Date());
    const title = els.editTitleInput.value.trim();
    const nextImages = [];
    const newlyUploadedPaths = [];
    els.saveEditStatus.textContent = "正在处理图片...";

    try {
      for (const [index, image] of state.editingImages.entries()) {
        const replacement = state.editingImageFiles.get(index);
        if (!replacement) {
          nextImages.push(image);
          continue;
        }

        const uploaded = await uploadImageFile(
          replacement,
          `${slugify(title || "photo")}-edit-${index + 1}`,
          index + 1,
          state.editingImages.length
        );
        if (!uploaded) throw new Error("替换图片上传失败。");
        nextImages.push(uploaded);
        if (uploaded.image_path) newlyUploadedPaths.push(uploaded.image_path);
        if (uploaded.motion_path) newlyUploadedPaths.push(uploaded.motion_path);
        if (uploaded.poster_path) newlyUploadedPaths.push(uploaded.poster_path);
        if (uploaded.video_path) newlyUploadedPaths.push(uploaded.video_path);
        if (image.image_path) state.editingRemovedPaths.add(image.image_path);
        if (image.thumbnail_path) state.editingRemovedPaths.add(image.thumbnail_path);
        if (image.motion_path) state.editingRemovedPaths.add(image.motion_path);
        if (image.poster_path) state.editingRemovedPaths.add(image.poster_path);
        if (image.video_path) state.editingRemovedPaths.add(image.video_path);
      }

      const primaryImage = nextImages[0];
      const updates = {
        title,
        note: composeDiaryStoredNote(els.editNoteInput.value.trim(), nextImages),
        category: els.editCategoryInput.value,
        taken_at: takenAt,
        is_public: els.editPublicInput.value === "true",
        image_path: primaryImage.image_path || "",
        image_url: primaryImage.image_url,
        width: primaryImage.width,
        height: primaryImage.height,
      };

      els.saveEditStatus.textContent = "正在保存...";
      const { error } = await diaryRepository.updateOwned(state.editingPhoto.id, updates);
      if (error) throw error;

      const nextImagePaths = new Set(nextImages.flatMap(getStoredPhotoMediaPaths));
      const pathsToRemove = [...state.editingRemovedPaths].filter(
        (path) => path && !nextImagePaths.has(path)
      );
      if (pathsToRemove.length) {
        const cleanupError = await cleanupStoredImagePaths(pathsToRemove).then(() => null).catch((error) => error);
        if (cleanupError) console.warn("Album saved, but old image cleanup failed:", cleanupError);
      }

      els.editDialog.close();
      state.editingPhoto = null;
      resetEditImageState();
      await loadPhotos();
      const gainedExp = await awardExperience("diaryEdit");
      setGlobalStatus(`日记和合集内容已更新。${gainedExp ? ` 修为 +${gainedExp}` : ""}`);
    } catch (error) {
      els.saveEditStatus.textContent = error.message || "保存失败，请稍后重试。";
      if (newlyUploadedPaths.length) void cleanupStoredImagePaths(newlyUploadedPaths);
    }
  }

  function renderEditImages() {
    els.editImageCount.textContent = `${state.editingImages.length} 张`;
    els.editImageList.innerHTML = state.editingImages
      .map((image, index) => {
        const file = state.editingImageFiles.get(index);
        const previewUrl = file ? getEditPreviewUrl(file, index) : image.image_url;
        return `
          <article class="edit-image-item">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <img src="${escapeHtml(previewUrl || "")}" alt="合集第 ${index + 1} 张" />
            <div>
              <label class="edit-image-picker" for="editImageInput" data-replace-edit-image="${index}">替换</label>
              <button type="button" data-delete-edit-image="${index}">删除</button>
            </div>
          </article>
        `;
      })
      .join("");

    els.editImageList.querySelectorAll("[data-replace-edit-image]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        state.editingReplaceIndex = Number(trigger.dataset.replaceEditImage);
        els.editImageInput.value = "";
      });
    });
    els.editImageList.querySelectorAll("[data-delete-edit-image]").forEach((button) => {
      button.addEventListener("click", () => removeEditingImage(Number(button.dataset.deleteEditImage)));
    });
  }

  function getEditPreviewUrl(file, index) {
    if (state.editingPreviewUrls[index]) return state.editingPreviewUrls[index];
    const url = URL.createObjectURL(file);
    state.editingPreviewUrls[index] = url;
    return url;
  }

  function replaceEditingImage() {
    const files = Array.from(els.editImageInput.files || []);
    if (!files.length) return;
    if (state.editingReplaceIndex < 0) {
      appendEditingImageFiles(files);
      return;
    }
    const file = files[0];
    if (!file || !state.editingImages[state.editingReplaceIndex]) return;
    if (state.editingPreviewUrls[state.editingReplaceIndex]) {
      URL.revokeObjectURL(state.editingPreviewUrls[state.editingReplaceIndex]);
      state.editingPreviewUrls[state.editingReplaceIndex] = "";
    }
    state.editingImageFiles.set(state.editingReplaceIndex, file);
    els.saveEditStatus.textContent = `第 ${state.editingReplaceIndex + 1} 张将在保存时替换。`;
    state.editingReplaceIndex = -1;
    renderEditImages();
  }

  function appendEditingImageFiles(files) {
    if (!state.editingPhoto) return;
    const imageLimit = getCurrentImageLimit();
    const remaining = imageLimit - state.editingImages.length;
    if (remaining <= 0) {
      els.saveEditStatus.textContent = `当前 VIP 等级单篇最多 ${imageLimit} 张图。`;
      return;
    }
    const nextFiles = files.slice(0, remaining);
    nextFiles.forEach((file) => {
      const index = state.editingImages.length;
      state.editingImages.push({ image_path: "", image_url: "", width: 0, height: 0 });
      state.editingImageFiles.set(index, file);
    });
    state.editingReplaceIndex = -1;
    els.saveEditStatus.textContent =
      files.length > remaining
        ? `已追加 ${nextFiles.length} 张，当前等级最多 ${imageLimit} 张。`
        : `已追加 ${nextFiles.length} 张图片，保存后上传。`;
    renderEditImages();
  }

  function startAppendEditingImages() {
    if (!state.editingPhoto) return;
    state.editingReplaceIndex = -1;
    els.editImageInput.value = "";
  }

  function handleEditImagePaste(event) {
    if (!state.editingPhoto) return;
    const items = Array.from(event.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (!imageItems.length) return;
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    const normalizedFiles = files.map((file, index) => {
      const extension = file.type?.split("/")[1] || "png";
      return new File([file], `edit-pasted-${Date.now()}-${index + 1}.${extension}`, {
        type: file.type || "image/png",
      });
    });
    appendEditingImageFiles(normalizedFiles);
  }

  async function removeEditingImage(index) {
    if (state.editingImages.length <= 1) {
      els.saveEditStatus.textContent = "一篇笔记至少保留一张图片。";
      return;
    }
    const image = state.editingImages[index];
    if (!image) return;
    const confirmed = await confirmAction({
      eyebrow: "编辑日记图片",
      title: `删除第 ${index + 1} 张图片？`,
      message: "保存日记修改后，这张图片才会从合集里移除。",
      confirmLabel: "移除图片",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;
    if (image.image_path) state.editingRemovedPaths.add(image.image_path);
    if (image.thumbnail_path) state.editingRemovedPaths.add(image.thumbnail_path);
    if (image.motion_path) state.editingRemovedPaths.add(image.motion_path);
    if (image.poster_path) state.editingRemovedPaths.add(image.poster_path);
    if (image.video_path) state.editingRemovedPaths.add(image.video_path);
    if (state.editingPreviewUrls[index]) URL.revokeObjectURL(state.editingPreviewUrls[index]);
    state.editingImages.splice(index, 1);
    state.editingPreviewUrls.splice(index, 1);

    const nextFiles = new Map();
    state.editingImageFiles.forEach((file, fileIndex) => {
      if (fileIndex < index) nextFiles.set(fileIndex, file);
      if (fileIndex > index) nextFiles.set(fileIndex - 1, file);
    });
    state.editingImageFiles = nextFiles;
    els.saveEditStatus.textContent = "图片将在保存后从合集中删除。";
    renderEditImages();
  }

  function resetEditImageState() {
    state.editingPreviewUrls.forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    state.editingImages = [];
    state.editingImageFiles = new Map();
    state.editingRemovedPaths = new Set();
    state.editingReplaceIndex = -1;
    state.editingPreviewUrls = [];
    if (els.editImageList) els.editImageList.innerHTML = "";
  }

  async function deletePhotoFromEditor() {
    if (!state.editingPhoto) return;
    const photo = state.editingPhoto;
    const deleted = await deletePhoto(photo, els.deleteEditingPhoto);
    if (deleted) {
      els.editDialog.close();
      els.deleteEditingPhoto.disabled = false;
      els.deleteEditingPhoto.textContent = "删除整篇";
      state.editingPhoto = null;
      resetEditImageState();
    }
  }

  return {
    openEditPhoto,
    savePhotoEdit,
    renderEditImages,
    getEditPreviewUrl,
    replaceEditingImage,
    appendEditingImageFiles,
    startAppendEditingImages,
    handleEditImagePaste,
    removeEditingImage,
    resetEditImageState,
    deletePhotoFromEditor,
  };
}
