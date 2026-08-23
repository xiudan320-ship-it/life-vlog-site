import {
  createDiaryUploadPayload,
  getDiaryUploadEntryCount,
  getDiaryUploadFileKey,
  getDiaryUploadPreviewItems,
  isDiaryUploadMotionFile,
  isDiaryUploadStillFile,
  pairDiaryUploadFiles,
} from "./diary-upload-domain.js";
import { composeDiaryStoredNote, extractImageUrls, getClipboardImageUrl } from "./media-metadata.js";
import { createVideoPosterFile, getVideoContentType } from "./image-service.js";
import { validateVlogUpload } from "./vlog-mode.js";

export function createDiaryComposerController({
  elements,
  queue,
  repository,
  assets,
  vlogMode,
  draftKey,
  getCloudDatabase,
  getSession,
  getCurrentImageLimit,
  getFinalTitle,
  getUploadFileNameBase,
  formatFileSize,
  escapeHtml,
  setStatus,
  awardExperience,
  loadPhotos,
  switchPage,
  renderUploadCenter,
}) {
  const els = elements;
  let previewUrls = [];
  let selectedFiles = [];
  let selectedLinks = [];
  let activePreviewIndex = 0;
  let uploadInFlight = false;
  let queueProcessing = false;

  function setExpanded(expanded) {
    els.composer.classList.toggle("expanded", expanded);
    els.uploadForm.hidden = !expanded;
    els.uploadToggle.setAttribute("aria-expanded", String(expanded));
    if (expanded) restoreDraft();
  }

  function getDraftStorageKey(userId = getSession()?.user?.id || "guest") {
    return `${draftKey}:${userId}`;
  }

  function getDraftPayload() {
    return {
      title: els.titleInput.value,
      note: els.noteInput.value,
      category: els.categoryInput.value,
      takenAt: els.dateInput.value,
      isPublic: els.publicInput.value,
      savedAt: new Date().toISOString(),
    };
  }

  function saveDraft() {
    if (!getSession() || !els.uploadForm || els.uploadForm.hidden) return;
    const draft = getDraftPayload();
    const hasText = [draft.title, draft.note].some((value) => String(value || "").trim());
    const hasNonDefault =
      draft.category !== "日常" ||
      draft.isPublic !== "true" ||
      draft.takenAt !== new Date().toISOString().slice(0, 10);
    if (!hasText && !hasNonDefault) return;
    localStorage.setItem(getDraftStorageKey(), JSON.stringify(draft));
  }

  function restoreDraft() {
    if (!getSession()) return;
    try {
      const raw = localStorage.getItem(getDraftStorageKey());
      if (!raw) return;
      const draft = JSON.parse(raw);
      els.titleInput.value = draft.title || "";
      els.noteInput.value = draft.note || "";
      els.categoryInput.value = draft.category || "日常";
      els.dateInput.value = draft.takenAt || els.dateInput.value || new Date().toISOString().slice(0, 10);
      els.publicInput.value = draft.isPublic || "true";
      setStatus("已恢复上次未发布的日记草稿。");
    } catch {
      localStorage.removeItem(getDraftStorageKey());
    }
  }

  function clearDraft() {
    localStorage.removeItem(getDraftStorageKey());
  }

  function isNetworkLikeError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return !navigator.onLine || message.includes("failed to fetch") || message.includes("network");
  }

  async function publish(payload, { queued = false } = {}) {
    const images = [];
    const mediaEntries = payload.files.map((entry) => ({
      kind: entry.kind || (entry.motionFile ? "live" : "image"),
      file: entry.file,
      motionFile: entry.motionFile || null,
    }));
    const finalTitle = payload.title || "";

    for (const [index, entry] of mediaEntries.entries()) {
      const safeName = getUploadFileNameBase(finalTitle, index, mediaEntries.length);
      if (entry.kind === "video") {
        setStatus(`${index + 1}/${mediaEntries.length} · 正在从视频提取封面...`);
        const posterFile = await createVideoPosterFile(entry.file);
        const poster = await assets.uploadImageFile(
          posterFile,
          `${safeName}-poster`,
          index + 1,
          mediaEntries.length,
          { folder: "photos-video-posters", thumbnail: false }
        );
        if (!poster) throw new Error("普通视频封面上传失败。");
        const video = await assets.uploadDiaryVideoFile(
          entry.file,
          `${safeName}-video`,
          index + 1,
          mediaEntries.length
        );
        if (!video) throw new Error("普通视频上传失败。");
        images.push({
          type: "video",
          image_path: poster.image_path,
          image_url: poster.image_url,
          thumbnail_path: poster.thumbnail_path,
          thumbnail_url: poster.thumbnail_url,
          poster_path: poster.image_path,
          poster_url: poster.image_url,
          video_path: `r2:${video.key}`,
          video_url: video.url,
          video_type: video.contentType || getVideoContentType(entry.file),
          width: poster.width,
          height: poster.height,
          original_size: poster.original_size,
          compressed_size: poster.compressed_size,
        });
        continue;
      }

      const imageData = await assets.uploadImageFile(entry.file, safeName, index + 1, mediaEntries.length);
      if (!imageData) throw new Error("图片上传失败。");
      imageData.type = entry.kind === "live" ? "live" : "image";
      if (entry.motionFile) {
        const motion = await assets.uploadDiaryMotionFile(
          entry.motionFile,
          `${safeName}-live`,
          index + 1,
          mediaEntries.length
        );
        if (!motion) throw new Error("Live Photo 动态部分上传失败。");
        imageData.motion_path = `r2:${motion.key}`;
        imageData.motion_url = motion.url;
        imageData.motion_type = motion.contentType || getVideoContentType(entry.motionFile);
        imageData.motion_size = entry.motionFile.size || 0;
      }
      images.push(imageData);
    }

    const linkUrls = Array.isArray(payload.linkUrls) ? payload.linkUrls : [];
    for (const [index, url] of linkUrls.entries()) {
      const safeName = `${getUploadFileNameBase(finalTitle, mediaEntries.length + index, mediaEntries.length + linkUrls.length)}-link`;
      const copied = await assets.copyUrlToR2(url, safeName, "photos");
      images.push({
        type: "image",
        image_path: `r2:${copied.key}`,
        image_url: copied.url,
        thumbnail_path: "",
        thumbnail_url: copied.url,
        width: 0,
        height: 0,
      });
    }

    const session = getSession();
    const primaryImage = images[0];
    const { error } = await repository.insert({
      user_id: session.user.id,
      title: payload.title || "",
      note: composeDiaryStoredNote(payload.note || "", images),
      category: payload.category || "日常",
      taken_at: payload.takenAt || new Date().toISOString().slice(0, 10),
      is_public: payload.isPublic !== false,
      image_path: primaryImage.image_path,
      image_url: primaryImage.image_url,
      width: primaryImage.width,
      height: primaryImage.height,
    });
    if (error) throw new Error(error.message);

    if (!queued) {
      els.uploadForm.reset();
      els.dateInput.valueAsDate = new Date();
      clearDraft();
      clearPreview();
      setExpanded(false);
    }
    const localImages = images.filter((image) => Number.isFinite(image.original_size));
    const originalBytes = localImages.reduce((sum, image) => sum + image.original_size, 0);
    const uploadedBytes = localImages.reduce((sum, image) => sum + image.compressed_size, 0);
    const savings = originalBytes > 0
      ? Math.max(0, Math.round((1 - uploadedBytes / originalBytes) * 100))
      : 0;
    const compressionSummary = originalBytes
      ? ` 自动压缩 ${formatFileSize(originalBytes)} → ${formatFileSize(uploadedBytes)}，节省 ${savings}%。`
      : "";
    const gainedExp = await awardExperience("diary");
    setStatus(
      `${queued ? "队列日记已发布。" : images.length > 1 ? `已发布 1 篇合集，共 ${images.length} 张图。` : "上传完成。"}${compressionSummary}${gainedExp ? ` 修为 +${gainedExp}` : ""}`
    );
    await loadPhotos();
    vlogMode.close();
    switchPage("gallery");
    els.galleryHead?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setSubmitting(isSubmitting) {
    const submitButton = els.uploadForm?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = Boolean(isSubmitting);
      submitButton.textContent = isSubmitting ? "上传中..." : "上传并发布";
    }
    els.uploadToggle.disabled = Boolean(isSubmitting);
  }

  async function submit(event) {
    event.preventDefault();
    if (uploadInFlight) {
      setStatus("正在上传，先别连点。");
      return;
    }
    const session = getSession();
    if (!getCloudDatabase() || !session) {
      setStatus("请先登录。");
      return;
    }
    const files = selectedFiles.length ? selectedFiles : Array.from(els.photoInput.files || []);
    const linkUrls = [...selectedLinks];
    if (vlogMode.isActive()) {
      const vlogError = validateVlogUpload(files, linkUrls);
      if (vlogError) {
        setStatus(vlogError);
        return;
      }
    }
    if (!files.length && !linkUrls.length) {
      setStatus("请选择图片，或粘贴图片链接。");
      return;
    }
    const pairing = pairDiaryUploadFiles(files);
    if (pairing.unsupportedFiles.length) {
      setStatus("只支持图片和视频文件。");
      return;
    }
    const imageLimit = getCurrentImageLimit();
    if (getDiaryUploadEntryCount(pairing) + linkUrls.length > imageLimit) {
      setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
      return;
    }
    uploadInFlight = true;
    setSubmitting(true);
    let payload;
    try {
      payload = createDiaryUploadPayload({
        title: getFinalTitle(),
        rawTitle: els.titleInput.value.trim(),
        note: els.noteInput.value.trim(),
        category: vlogMode.isActive() ? "VLOG" : els.categoryInput.value,
        takenAt: els.dateInput.value,
        isPublic: els.publicInput.value === "true",
        userId: session.user.id,
        files,
        linkUrls,
        pairing,
      });
      if (!navigator.onLine) {
        await queue.enqueue(payload);
        clearDraft();
        clearPreview();
        setStatus("网络不稳定，已加入上传队列。恢复网络后会自动上传。");
        return;
      }
      await publish(payload);
    } catch (error) {
      if (payload && isNetworkLikeError(error)) {
        await queue.enqueue(payload);
        clearDraft();
        clearPreview();
        setStatus("上传中断，已加入上传队列。恢复网络后会自动上传。");
        return;
      }
      setStatus(error.message || "上传失败。");
    } finally {
      uploadInFlight = false;
      setSubmitting(false);
      void processQueue();
    }
  }

  async function processQueue() {
    const session = getSession();
    if (queueProcessing || !session || !getCloudDatabase() || !navigator.onLine) return;
    queueProcessing = true;
    try {
      const items = await queue.list(session.user.id);
      if (!items.length) return;
      setStatus(`正在补传队列中的 ${items.length} 篇日记...`);
      for (const item of items) {
        await publish(item, { queued: true });
        await queue.remove(item.id);
      }
      setStatus("上传队列已清空。");
    } catch (error) {
      setStatus(`上传队列等待网络恢复：${error.message || "稍后重试"}`);
    } finally {
      queueProcessing = false;
      void renderUploadCenter();
    }
  }

  function showPreviewItem(item, url) {
    const isVideo = item?.kind === "video";
    els.photoPreview.hidden = isVideo;
    if (isVideo) els.photoPreview.removeAttribute("src");
    else els.photoPreview.src = url || "";
    if (!els.photoVideoPreview) return;
    els.photoVideoPreview.pause();
    els.photoVideoPreview.hidden = !isVideo;
    if (!isVideo) els.photoVideoPreview.removeAttribute("src");
    else {
      els.photoVideoPreview.src = url || "";
      els.photoVideoPreview.load();
    }
  }

  function revokePreviewUrls() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
  }

  function syncInputFiles() {
    const transfer = new DataTransfer();
    selectedFiles.forEach((file) => transfer.items.add(file));
    els.photoInput.files = transfer.files;
  }

  function renderPreviewStrip(items, urls) {
    if (!items.length) {
      els.previewStrip.innerHTML = "";
      els.previewStrip.hidden = true;
      return;
    }
    els.previewStrip.innerHTML = urls.map((url, index) => `
      <span class="preview-thumb" data-preview-index="${index}" role="button" tabindex="0" aria-label="预览第 ${index + 1} 张">
        ${items[index]?.kind === "video"
          ? `<video src="${escapeHtml(url)}" muted playsinline preload="metadata" aria-hidden="true"></video>`
          : `<img src="${escapeHtml(url)}" alt="" />`}
        ${items[index]?.kind === "live" ? `<small class="preview-live-badge">LIVE</small>` : ""}
        <button class="preview-remove" type="button" data-remove-preview="${index}" aria-label="删除第 ${index + 1} 张">×</button>
      </span>
    `).join("");
    els.previewStrip.hidden = false;
    els.previewStrip.querySelectorAll("[data-preview-index]").forEach((thumb) => {
      const show = (event) => {
        event.preventDefault();
        activePreviewIndex = Number(thumb.dataset.previewIndex);
        showPreviewItem(items[activePreviewIndex], urls[activePreviewIndex]);
      };
      thumb.addEventListener("click", show);
      thumb.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") show(event);
      });
    });
  }

  function clearPreview() {
    revokePreviewUrls();
    selectedFiles = [];
    selectedLinks = [];
    els.photoInput.value = "";
    if (els.photoMotionInput) els.photoMotionInput.value = "";
    if (els.photoLinkInput) els.photoLinkInput.value = "";
    activePreviewIndex = 0;
    els.photoPreview.removeAttribute("src");
    els.photoPreview.hidden = false;
    if (els.photoVideoPreview) {
      els.photoVideoPreview.pause();
      els.photoVideoPreview.removeAttribute("src");
      els.photoVideoPreview.hidden = true;
    }
    els.uploadMainPreview.hidden = true;
    els.previewStrip.innerHTML = "";
    els.previewStrip.hidden = true;
    els.fileName.textContent = "展开后直接粘贴图片，或选择图片 / Live Photo 照片";
  }

  function updatePreview() {
    const { pairing, items } = getDiaryUploadPreviewItems(selectedFiles, selectedLinks);
    if (!items.length) {
      clearPreview();
      return;
    }
    revokePreviewUrls();
    const imageLimit = getCurrentImageLimit();
    const count = getDiaryUploadEntryCount(pairing) + selectedLinks.length;
    if (pairing.unsupportedFiles.length) setStatus("只支持图片和视频文件。");
    else if (pairing.videoFiles.length) {
      const liveCount = pairing.entries.filter((entry) => entry.motionFile).length;
      setStatus(liveCount
        ? `已配对 ${liveCount} 个 Live Photo，另有 ${pairing.videoFiles.length} 个普通视频。`
        : `已读取 ${pairing.videoFiles.length} 个普通视频；只有与照片配对成功时才会按 Live Photo 保存。`);
    } else if (!pairing.motionFiles.length && selectedFiles.some((file) => /\.(heic|heif)$/i.test(file?.name || ""))) {
      setStatus("当前只读取到静态 HEIC；要保留 Live 动态，请再补充同一张照片的 .MOV 文件。");
    } else if (!pairing.motionFiles.length && pairing.entries.length) {
      setStatus("当前文件列表只有照片；如果这是 Live Photo，请点击“添加视频”补充同一组 MOV，成功配对后才会动。");
    } else if (count > imageLimit) setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
    else setStatus(count > 1 ? `将发布为 1 篇合集，共 ${count} 张图。` : "");
    syncInputFiles();
    previewUrls = items.map((item) => item.file ? URL.createObjectURL(item.file) : item.url);
    activePreviewIndex = Math.min(activePreviewIndex, items.length - 1);
    showPreviewItem(items[activePreviewIndex], previewUrls[activePreviewIndex]);
    els.uploadMainPreview.hidden = false;
    els.fileName.textContent = count > 1 ? `已选择 ${count} 个媒体` : items[0].label;
    renderPreviewStrip(items, previewUrls);
  }

  function addFiles(files, source) {
    const incoming = Array.from(files || []).filter(
      (file) => isDiaryUploadStillFile(file) || isDiaryUploadMotionFile(file)
    );
    console.info(`[Diary upload] ${source}: ${incoming.length} file(s)`, incoming.map((file) => ({
      name: file.name || "",
      type: file.type || "",
      size: file.size || 0,
    })));
    if (
      source === "照片 / Live Photo 入口" &&
      incoming.some(isDiaryUploadStillFile) &&
      !incoming.some(isDiaryUploadMotionFile)
    ) {
      console.warn("LIVE_PHOTO_MOTION_NOT_PROVIDED_BY_BROWSER");
    }
    const seen = new Set(selectedFiles.map(getDiaryUploadFileKey));
    selectedFiles = [...selectedFiles, ...incoming.filter((file) => {
      const key = getDiaryUploadFileKey(file);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })];
    updatePreview();
  }

  function addImageLinks(rawLinks = els.photoLinkInput?.value || "") {
    const urls = Array.isArray(rawLinks) ? rawLinks : extractImageUrls(rawLinks);
    if (!urls.length) {
      setStatus("请输入完整的 http 或 https 图片链接。");
      return false;
    }
    selectedLinks = [...new Set([...selectedLinks, ...urls])];
    if (els.photoLinkInput) els.photoLinkInput.value = "";
    updatePreview();
    saveDraft();
    setStatus(`已添加 ${urls.length} 个图片链接，发布时会复制到 R2。`);
    return true;
  }

  function handlePaste(event) {
    const imageItems = Array.from(event.clipboardData?.items || []).filter((item) => item.type.startsWith("image/"));
    if (imageItems.length) {
      const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
      if (!files.length) return;
      event.preventDefault();
      addFiles(files.map((file, index) => new File(
        [file],
        `pasted-${Date.now()}-${index + 1}.${file.type?.split("/")[1] || "png"}`,
        { type: file.type || "image/png" }
      )), "剪贴板");
      saveDraft();
      setStatus(files.length > 1 ? `已读取 ${files.length} 张剪贴板图片。` : "已读取剪贴板图片。");
      return;
    }
    const urls = extractImageUrls(getClipboardImageUrl(event.clipboardData));
    if (urls.length) {
      event.preventDefault();
      addImageLinks(urls);
    }
  }

  function removePreview(index) {
    const { items } = getDiaryUploadPreviewItems(selectedFiles, selectedLinks);
    if (index < 0 || index >= items.length) return;
    const item = items[index];
    if (item.kind === "link") selectedLinks = selectedLinks.filter((url) => url !== item.url);
    else {
      const removals = new Set(item.files || []);
      selectedFiles = selectedFiles.filter((file) => !removals.has(file));
    }
    const nextTotal = selectedFiles.length + selectedLinks.length;
    activePreviewIndex = Math.max(0, Math.min(activePreviewIndex, nextTotal - 1));
    if (!nextTotal) clearPreview();
    else updatePreview();
    setStatus("已移除图片。");
  }

  function bind() {
    const hint = els.photoDrop?.querySelector("[for='photoInput']");
    if (hint) els.fileName.textContent = "展开后直接粘贴图片，或选择图片 / Live Photo 照片";
    els.uploadToggle.addEventListener("click", () => setExpanded(els.uploadForm.hidden));
    els.uploadForm.addEventListener("submit", submit);
    els.uploadForm.addEventListener("input", saveDraft);
    els.uploadForm.addEventListener("change", saveDraft);
    els.photoDrop.addEventListener("paste", handlePaste);
    els.photoLinkAdd?.addEventListener("click", () => addImageLinks());
    els.photoLinkInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      addImageLinks();
    });
    els.photoInput.addEventListener("change", () => addFiles(els.photoInput.files, "照片 / Live Photo 入口"));
    els.photoMotionInput?.addEventListener("change", () => addFiles(els.photoMotionInput.files, "视频入口"));
    els.previewStrip.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-preview]");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      removePreview(Number(button.dataset.removePreview));
    }, true);
    els.removeUploadPreview?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removePreview(activePreviewIndex);
    });
    document.addEventListener("paste", (event) => {
      if (event.defaultPrevented || !getSession() || els.uploadForm.hidden) return;
      const hasImage = Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
      if (!hasImage && event.target !== els.photoLinkInput && event.target !== els.photoDrop) return;
      handlePaste(event);
    });
  }

  return {
    bind,
    getQueuedUploads: (userId = getSession()?.user?.id || "") => queue.list(userId),
    isProcessing: () => queueProcessing,
    isNetworkLikeError,
    processQueue,
    removeQueuedUpload: (id) => queue.remove(id),
    setExpanded,
  };
}
