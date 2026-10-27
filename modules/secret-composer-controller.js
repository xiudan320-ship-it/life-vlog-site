import { secretToCloudRow } from "./cloud-models.js";
import { DEFAULT_SECRET_PHOTO_TAG } from "./secret-domain.js";
import { extractImageUrls, getClipboardImageUrl } from "./media-metadata.js";
import { escapeHtml, formatDate, slugify } from "./ui-formatters.js";

export function createSecretComposerController({
  elements,
  state,
  repository,
  assets,
  uploadQueue,
  albumImageLimit,
  allFolderId,
  favoritesFolderId,
  getSortedPhotos,
  getDisplayTitle,
  getPlainNote,
  setStatus,
  loadItems,
}) {
  const els = elements;
  let previewObjectUrls = [];
  let selectedLinks = [];

  function setSecretExpanded(expanded) {
    if (!els.secretForm || !els.secretToggle) return;
    els.secretForm.hidden = !expanded;
    els.secretToggle.setAttribute("aria-expanded", String(expanded));
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

  function revokeSecretPreviewUrls() {
    previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    previewObjectUrls = [];
  }

  function renderSecretPreviewStrip(entries, urls) {
    if (entries.length <= 1) {
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

  function updateSecretPreview() {
    const files = Array.from(els.secretImageInput?.files || []);
    revokeSecretPreviewUrls();
    const count = files.length + selectedLinks.length;
    const entries = [
      ...files.slice(0, 9).map((file) => {
        const url = URL.createObjectURL(file);
        previewObjectUrls.push(url);
        return { url, label: file.name };
      }),
      ...selectedLinks.slice(0, Math.max(0, 9 - files.length)).map((url) => ({ url, label: "图片链接" })),
    ];
    if (!count) {
      els.secretImagePreview.removeAttribute("src");
      els.secretImagePreview.hidden = true;
      els.secretPreviewStrip.innerHTML = "";
      els.secretPreviewStrip.hidden = true;
      els.secretImageName.textContent = "还没有选择图片";
      return;
    }
    const urls = entries.map((entry) => entry.url);
    els.secretImagePreview.src = urls[0];
    els.secretImagePreview.hidden = false;
    els.secretImageName.textContent = count > 1 ? `已选择 ${count} 张图片（预览前 ${entries.length} 张）` : entries[0].label;
    renderSecretPreviewStrip(entries, urls);
  }

  function addSecretImageLinks(rawLinks = els.secretImageLinkInput?.value || "") {
    const urls = extractImageUrls(rawLinks);
    if (!urls.length) {
      if (String(rawLinks || "").trim()) setStatus("请输入完整的 http 或 https 图片链接。");
      return false;
    }
    const nextLinks = [...new Set([...selectedLinks, ...urls])];
    if (nextLinks.length + (els.secretImageInput?.files?.length || 0) > albumImageLimit) {
      setStatus(`一个秘藏相册最多 ${albumImageLimit} 张图，请分到多个相册上传。`);
      return false;
    }
    selectedLinks = nextLinks;
    if (els.secretImageLinkInput) els.secretImageLinkInput.value = "";
    updateSecretPreview();
    setStatus(`已添加 ${urls.length} 个图片链接，保存时会复制到 R2。`);
    return true;
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
      transfer.items.add(new File([file], `secret-pasted-${Date.now()}-${index + 1}.${extension}`, {
        type: file.type || "image/png",
      }));
    });
    els.secretImageInput.files = transfer.files;
    updateSecretPreview();
    setStatus(files.length > 1 ? `已读取 ${files.length} 张剪贴板图片。` : "已读取剪贴板图片。");
  }

  async function saveSecretItem(event) {
    event.preventDefault();
    if (!uploadQueue.canStart()) {
      setStatus("请先重试未完成项，或结束本次上传。");
      return;
    }
    if (!state.cloudDb || !state.session) {
      setStatus("请先登录。");
      return;
    }
    if (!state.secretCloudAvailable) {
      setStatus("请先部署最新版 Cloudflare D1 结构，启用秘藏表。");
      return;
    }
    const files = Array.from(els.secretImageInput.files || []);
    const pendingLinkText = els.secretImageLinkInput?.value || "";
    const pendingLinks = extractImageUrls(pendingLinkText);
    if (String(pendingLinkText).trim() && !pendingLinks.length) {
      setStatus("请输入完整的 http 或 https 图片链接。");
      return;
    }
    const links = [...new Set([...selectedLinks, ...pendingLinks])];
    if (!files.length && !links.length) {
      setStatus("请先选择图片或粘贴图片链接。");
      return;
    }
    if (files.length + links.length > albumImageLimit) {
      setStatus(`一个秘藏相册最多 ${albumImageLimit} 张图。`);
      return;
    }
    const userId = state.session.user.id;
    const ensureContext = () => {
      if (state.session?.user?.id !== userId || !state.cloudDb) throw new Error("登录状态已变化，请恢复原账号后重试。");
    };
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      folderId: els.secretFolderInput?.value || (
        ![allFolderId, favoritesFolderId].includes(state.activeSecretFolderId)
          ? state.activeSecretFolderId
          : ""
      ),
      title: els.secretTitleInput.value.trim(),
      category: els.secretCategoryInput.value.trim() || "未分类",
      note: els.secretNoteInput.value.trim(),
      images: [],
      linkedPhotoId: els.secretLinkedPhotoInput.value || "",
      createdAt: now,
      updatedAt: now,
    };
    const base = slugify(item.title || item.category || "secret");
    const coverFile = els.secretCoverInput?.files?.[0] || null;
    const entries = [
      ...files.map((file, index) => ({ label: file.name, source: { file, name: `${base}-${index + 1}` } })),
      ...links.map((url, index) => ({ label: `图片链接 ${index + 1}`, source: { url, name: `${base}-link-${index + 1}` } })),
      ...(coverFile ? [{ label: `封面：${coverFile.name}`, source: { file: coverFile, name: `${base}-cover`, cover: true } }] : []),
    ];
    await uploadQueue.start({
      title: item.title || "新建秘藏相册",
      entries,
      ensureContext,
      async upload(source, statusSetter) {
        const uploaded = source.file
          ? await assets.uploadImageFile(source.file, source.name, 1, 1, {
              folder: source.cover ? "secret-covers" : "secrets", statusSetter, throwOnError: true,
            })
          : await assets.copyUrlToR2(source.url, source.name, "secrets", { onRetry: statusSetter }).then((copied) => ({
              image_path: `r2:${copied.key}`, image_url: copied.url, thumbnail_url: copied.url, width: 0, height: 0,
            }));
        if (!uploaded) throw new Error("图片上传失败。");
        return { ...uploaded, isUploadCover: Boolean(source.cover), tag: DEFAULT_SECRET_PHOTO_TAG, tags: [DEFAULT_SECRET_PHOTO_TAG], uploadedAt: new Date().toISOString() };
      },
      async save(uploaded) {
        ensureContext();
        const cover = uploaded.find((image) => image.isUploadCover);
        const images = uploaded.filter((image) => !image.isUploadCover).map(({ isUploadCover, ...image }) => image);
        const nextItem = { ...item, images, coverImage: cover?.image_url || images[0]?.image_url || "", coverPath: cover?.image_path || images[0]?.image_path || "", updatedAt: new Date().toISOString() };
        const { error } = await repository.saveItem(secretToCloudRow(nextItem, userId));
        if (error) throw error;
      },
      async onSettled(progress) {
        if (state.session?.user?.id !== userId) return;
        if (progress.complete) {
          els.secretForm.reset();
          selectedLinks = [];
          updateSecretPreview();
          setSecretExpanded(false);
        }
        if (progress.saved) {
          try { await loadItems(); }
          catch { setStatus("照片已保存，相册列表刷新失败，请稍后刷新。"); }
        }
      },
      onClear(progress) {
        if (progress.saved && state.session?.user?.id === userId) {
          els.secretForm.reset();
          selectedLinks = [];
          updateSecretPreview();
        }
      },
    });
  }

  return {
    addSecretImageLinks,
    handleSecretPaste,
    renderSecretLinkedPhotoOptions,
    saveSecretItem,
    setSecretExpanded,
    updateSecretPreview,
  };
}
