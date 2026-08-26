import { secretToCloudRow } from "./cloud-models.js";
import { DEFAULT_SECRET_PHOTO_TAG } from "./secret-domain.js?v=20260810-004";
import { extractImageUrls, getClipboardImageUrl } from "./media-metadata.js";
import { escapeHtml, formatDate, slugify } from "./ui-formatters.js";

export function createSecretComposerController({
  elements,
  state,
  repository,
  assets,
  albumImageLimit,
  allFolderId,
  favoritesFolderId,
  getSortedPhotos,
  getDisplayTitle,
  getPlainNote,
  setStatus,
  showToast,
  dismissToast,
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
    const entries = [
      ...files.map((file) => ({ url: URL.createObjectURL(file), label: file.name })),
      ...selectedLinks.map((url) => ({ url, label: "图片链接" })),
    ];
    if (!entries.length) {
      els.secretImagePreview.removeAttribute("src");
      els.secretImagePreview.hidden = true;
      els.secretPreviewStrip.innerHTML = "";
      els.secretPreviewStrip.hidden = true;
      els.secretImageName.textContent = "还没有选择图片";
      return;
    }
    previewObjectUrls = entries.slice(0, 9).map((entry) => entry.url);
    els.secretImagePreview.src = previewObjectUrls[0];
    els.secretImagePreview.hidden = false;
    els.secretImageName.textContent = entries.length > 1 ? `已选择 ${entries.length} 张图片` : entries[0].label;
    renderSecretPreviewStrip(entries, previewObjectUrls);
  }

  function addSecretImageLinks(rawLinks = els.secretImageLinkInput?.value || "") {
    const urls = extractImageUrls(rawLinks);
    if (!urls.length) {
      if (String(rawLinks || "").trim()) setStatus("请输入完整的 http 或 https 图片链接。");
      return false;
    }
    selectedLinks = [...new Set([...selectedLinks, ...urls])].slice(0, albumImageLimit);
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
    const coverFile = els.secretCoverInput?.files?.[0] || null;
    els.secretSubmitButton.disabled = true;
    const images = [];
    let loadingToast = null;
    try {
      loadingToast = showToast("秘藏上传中...", { kind: "loading", persist: true, placement: "center" });
      for (const [index, file] of files.entries()) {
        const base = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret");
        const uploaded = await assets.uploadImageFile(file, `${base}-${index + 1}`, index + 1, files.length, {
          folder: "secrets",
          statusSetter: setStatus,
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
        setStatus(`正在导入第 ${index + 1}/${links.length} 个图片链接…`);
        const base = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret-link");
        const copied = await assets.copyUrlToR2(url, `${base}-link-${index + 1}`, "secrets");
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
        const uploadedCover = await assets.uploadImageFile(coverFile, `${coverBase}-cover`, 1, 1, {
          folder: "secret-covers",
          statusSetter: setStatus,
        });
        if (!uploadedCover) throw new Error("秘藏封面上传失败。");
        coverImage = uploadedCover.image_url;
        coverPath = uploadedCover.image_path;
      }
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
        coverImage,
        coverPath,
        images,
        linkedPhotoId: els.secretLinkedPhotoInput.value || "",
        createdAt: now,
        updatedAt: now,
      };
      const { error } = await repository.insertItem(secretToCloudRow(item, state.session.user.id));
      if (error) throw error;
      els.secretForm.reset();
      selectedLinks = [];
      updateSecretPreview();
      setSecretExpanded(false);
      setStatus("相册已保存到秘藏。");
      dismissToast(loadingToast);
      showToast("秘藏已保存", { kind: "success" });
      await loadItems();
    } catch (error) {
      dismissToast(loadingToast);
      showToast("上传失败", { kind: "error", duration: 2600 });
      setStatus(error.message || "保存秘藏失败。");
    } finally {
      dismissToast(loadingToast);
      els.secretSubmitButton.disabled = false;
    }
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
