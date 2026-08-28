import { renderWeekendPlansView } from "./weekend-plans-view.js";
import { weekendFromCloudRow, weekendToCloudRow } from "./cloud-models.js";
import { pulseListItem } from "./list-render-feedback.js";
import { getNextWeekendDate } from "./weekend-date.js";

export function createWeekendController({
  elements,
  storageKey,
  repository,
  getSession,
  getDisplayName,
  getPlans,
  setPlans,
  canSync,
  getAuthorName,
  canManageItem,
  getClipboardFiles,
  getClipboardImageUrl,
  extractImageUrls,
  escapeHtml,
  formatDate,
  slugify,
  normalizeUuid,
  uploadImageFile,
  copyUrlToR2,
  cleanupStoredImagePaths,
  awardExperience,
  renderReminder,
  openGallery,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
}) {
  let editingId = null;
  let selectedFiles = [];
  let selectedLinks = [];
  let existingImages = [];
  let previewUrls = [];
  let completionPlanId = null;
  let completionFiles = [];
  let completionLinks = [];
  let completionExistingImages = [];
  let completionPreviewUrls = [];
  let isSubmitting = false;

  function getStorageKey() {
    const name = getSession() ? getDisplayName() : "guest";
    return `${storageKey}:${String(name).toLowerCase()}`;
  }

  function setStatus(message) {
    elements.weekendStatus.textContent = message;
  }

  function clearImageState() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
    selectedFiles = [];
    selectedLinks = [];
    existingImages = [];
    if (elements.weekendImageInput) elements.weekendImageInput.value = "";
    if (elements.weekendImageLinkInput) elements.weekendImageLinkInput.value = "";
    renderImagePreviews();
  }

  function renderImagePreviews() {
    if (!elements.weekendImagePreviews) return;
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    const entries = [
      ...existingImages.map((image, index) => ({ url: image.thumbnail_url || image.image_url, type: "existing", index })),
      ...previewUrls.map((url, index) => ({ url, type: "selected", index })),
      ...selectedLinks.map((url, index) => ({ url, type: "link", index })),
    ];
    elements.weekendImagePreviews.hidden = !entries.length;
    elements.weekendImagePreviews.innerHTML = entries
      .map((entry) => `<span><img src="${escapeHtml(entry.url)}" alt="周末场景预览" /><button type="button" data-remove-weekend-${entry.type}="${entry.index}" aria-label="删除这张场景图片">×</button></span>`)
      .join("");
  }

  function addFiles(files) {
    const next = Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));
    if (!next.length) return;
    selectedFiles = [...selectedFiles, ...next].slice(0, 20);
    renderImagePreviews();
    setStatus(`已选择 ${existingImages.length + selectedFiles.length + selectedLinks.length} 张场景图片。`);
  }

  function handleImagePaste(event) {
    const files = getClipboardFiles(event, "weekend-pasted");
    if (files.length) {
      event.preventDefault();
      addFiles(files);
      return;
    }
    const pastedUrl = getClipboardImageUrl(event.clipboardData);
    if (addImageLinks(pastedUrl)) event.preventDefault();
  }

  function addImageLinks(rawLinks = elements.weekendImageLinkInput?.value || "") {
    const urls = extractImageUrls(rawLinks);
    if (!urls.length) {
      if (String(rawLinks || "").trim()) setStatus("请输入完整的 http 或 https 图片链接。");
      return false;
    }
    selectedLinks = [...new Set([...selectedLinks, ...urls])].slice(0, 20);
    if (elements.weekendImageLinkInput) elements.weekendImageLinkInput.value = "";
    renderImagePreviews();
    setStatus(`已添加 ${urls.length} 个图片链接，保存时会复制到 R2。`);
    return true;
  }

  function clearCompletionState() {
    completionPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    completionPreviewUrls = [];
    completionFiles = [];
    completionLinks = [];
    completionExistingImages = [];
    completionPlanId = null;
    if (elements.weekendCompletionInput) elements.weekendCompletionInput.value = "";
    if (elements.weekendCompletionLinkInput) elements.weekendCompletionLinkInput.value = "";
    if (elements.weekendCompletionNote) elements.weekendCompletionNote.value = "";
    if (elements.weekendCompletionStatus) elements.weekendCompletionStatus.textContent = "";
    renderCompletionPreviews();
  }

  function renderCompletionPreviews() {
    if (!elements.weekendCompletionPreviews) return;
    completionPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    completionPreviewUrls = completionFiles.map((file) => URL.createObjectURL(file));
    const entries = [
      ...completionExistingImages.map((image, index) => ({ url: image.thumbnail_url || image.image_url, type: "existing", index })),
      ...completionPreviewUrls.map((url, index) => ({ url, type: "file", index })),
      ...completionLinks.map((url, index) => ({ url, type: "link", index })),
    ];
    elements.weekendCompletionPreviews.hidden = !entries.length;
    elements.weekendCompletionPreviews.innerHTML = entries
      .map((entry) => `<span><img src="${escapeHtml(entry.url)}" alt="完成回顾预览" /><button type="button" data-remove-weekend-completion-${entry.type}="${entry.index}" aria-label="删除这张回顾图片">×</button></span>`)
      .join("");
  }

  function addCompletionFiles(files) {
    const next = Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));
    if (!next.length) return;
    completionFiles = [...completionFiles, ...next].slice(0, 30);
    renderCompletionPreviews();
    elements.weekendCompletionStatus.textContent = `已加入 ${completionExistingImages.length + completionFiles.length + completionLinks.length} 张照片。`;
  }

  function addCompletionLinks(rawLinks = elements.weekendCompletionLinkInput?.value || "") {
    const urls = extractImageUrls(rawLinks);
    if (!urls.length) {
      if (String(rawLinks || "").trim()) elements.weekendCompletionStatus.textContent = "请输入完整的图片链接。";
      return false;
    }
    completionLinks = [...new Set([...completionLinks, ...urls])].slice(0, 30);
    elements.weekendCompletionLinkInput.value = "";
    renderCompletionPreviews();
    elements.weekendCompletionStatus.textContent = `已加入 ${urls.length} 个图片链接。`;
    return true;
  }

  function openCompletionDialog(plan) {
    if (!plan || !elements.weekendCompletionDialog) return;
    clearCompletionState();
    completionPlanId = plan.id;
    completionExistingImages = Array.isArray(plan.completionImages) ? [...plan.completionImages] : [];
    elements.weekendCompletionPlanTitle.textContent = `${plan.title} · ${formatDate(plan.date)}`;
    elements.weekendCompletionNote.value = plan.completionNote || "";
    elements.weekendCompletionSubmit.textContent = plan.done ? "保存回顾" : "完成并保存";
    renderCompletionPreviews();
    elements.weekendCompletionDialog.showModal();
    requestAnimationFrame(() => elements.weekendCompletionNote.focus({ preventScroll: true }));
  }

  function closeCompletionDialog() {
    if (elements.weekendCompletionDialog?.open) elements.weekendCompletionDialog.close();
    clearCompletionState();
  }

  async function saveCompletion(event) {
    event.preventDefault();
    const session = getSession();
    const plan = getPlans().find((item) => item.id === completionPlanId);
    if (!session || !plan || !canManageItem(plan) || !canSync()) return;
    elements.weekendCompletionSubmit.disabled = true;
    elements.weekendCompletionStatus.textContent = "正在保存这一天…";
    const uploadedImages = [];
    const newlyUploadedPaths = [];
    const previousCompletionPaths = new Set(
      (plan.completionImages || [])
        .flatMap((image) => [image.image_path, image.thumbnail_path])
        .filter(Boolean)
    );
    try {
      for (let index = 0; index < completionFiles.length; index += 1) {
        const uploaded = await uploadImageFile(
          completionFiles[index],
          `${slugify(plan.title || "weekend-recap")}-${Date.now()}-${index + 1}`,
          index + 1,
          completionFiles.length,
          { folder: "weekend-recap", statusSetter: (message) => { elements.weekendCompletionStatus.textContent = message; } }
        );
        if (!uploaded) throw new Error("照片上传失败，请重试。");
        uploadedImages.push(uploaded);
        newlyUploadedPaths.push(...[uploaded.image_path, uploaded.thumbnail_path].filter(Boolean));
      }
      for (let index = 0; index < completionLinks.length; index += 1) {
        elements.weekendCompletionStatus.textContent = `正在导入第 ${index + 1}/${completionLinks.length} 个链接…`;
        const copied = await copyUrlToR2(
          completionLinks[index],
          `${slugify(plan.title || "weekend-recap")}-link-${Date.now()}-${index + 1}`,
          "weekend-recap"
        );
        uploadedImages.push({
          image_path: `r2:${copied.key}`,
          image_url: copied.url,
          thumbnail_path: "",
          thumbnail_url: copied.url,
          width: 0,
          height: 0,
        });
        newlyUploadedPaths.push(`r2:${copied.key}`);
      }
      const next = {
        ...plan,
        done: true,
        completionNote: elements.weekendCompletionNote.value.trim(),
        completionImages: [...completionExistingImages, ...uploadedImages],
        completedAt: plan.completedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const { data, error } = await repository.upsert(
        "weekend_plans",
        weekendToCloudRow(next, next.userId || session.user.id),
        { onConflict: "id", select: "*", single: true }
      );
      if (error) throw error;
      const saved = weekendFromCloudRow(data);
      setPlans(getPlans().map((item) => (item.id === plan.id ? saved : item)));
      save();
      const retainedCompletionPaths = new Set(
        (saved.completionImages || [])
          .flatMap((image) => [image.image_path, image.thumbnail_path])
          .filter(Boolean)
      );
      const removedCompletionPaths = [...previousCompletionPaths].filter(
        (path) => !retainedCompletionPaths.has(path)
      );
      if (removedCompletionPaths.length) void cleanupStoredImagePaths(removedCompletionPaths);
      closeCompletionDialog();
      setStatus("完成回顾已保存。");
      render(plan.id);
    } catch (error) {
      if (newlyUploadedPaths.length) void cleanupStoredImagePaths(newlyUploadedPaths);
      elements.weekendCompletionStatus.textContent = error.message || "完成回顾保存失败。";
    } finally {
      elements.weekendCompletionSubmit.disabled = false;
    }
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(getStorageKey()) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save() {
    if (!getSession()) return;
    localStorage.setItem(getStorageKey(), JSON.stringify(getPlans()));
  }

  function setExpanded(expanded) {
    elements.weekendComposer.classList.toggle("expanded", expanded);
    elements.weekendForm.hidden = !expanded;
    elements.weekendToggle.setAttribute("aria-expanded", String(expanded));
  }

  function resetForm() {
    elements.weekendForm.reset();
    clearImageState();
    editingId = null;
    elements.weekendDateInput.value = getNextWeekendDate();
    elements.weekendFormTitle.textContent = "安排周末";
    elements.weekendSubmitButton.textContent = "保存计划";
    elements.weekendCancelEdit.hidden = true;
  }

  async function submit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const session = getSession();
    if (!session) {
      setStatus("请先登录后再保存周末计划。");
      return;
    }
    if (!canSync()) {
      setStatus("Cloudflare D1 尚未升级，周末计划没有保存。请先部署最新版数据库结构。");
      return;
    }
    const title = elements.weekendTitleInput.value.trim();
    if (!title) {
      setStatus("先写下周末想做什么。");
      return;
    }
    const plans = getPlans();
    const previous = plans.find((item) => item.id === editingId);
    const wasEditing = Boolean(editingId);
    const uploadedImages = [];
    const newlyUploadedPaths = [];
    const submitButton = elements.weekendSubmitButton;
    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "保存中…";
    }
    setStatus(wasEditing ? "正在保存周末计划修改…" : "正在保存周末计划…");
    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const uploaded = await uploadImageFile(
          selectedFiles[index],
          `${slugify(title || "weekend")}-${Date.now()}-${index + 1}`,
          index + 1,
          selectedFiles.length,
          { folder: "weekend", statusSetter: setStatus }
        );
        if (!uploaded) throw new Error("场景图片上传失败，请重试。");
        uploadedImages.push(uploaded);
        newlyUploadedPaths.push(...[uploaded.image_path, uploaded.thumbnail_path].filter(Boolean));
      }
      for (let index = 0; index < selectedLinks.length; index += 1) {
        setStatus(`正在导入第 ${index + 1}/${selectedLinks.length} 个图片链接…`);
        const copied = await copyUrlToR2(
          selectedLinks[index],
          `${slugify(title || "weekend")}-link-${Date.now()}-${index + 1}`,
          "weekend"
        );
        if (!copied?.key || !copied.url) throw new Error("图片链接导入失败，请重试。");
        uploadedImages.push({
          image_path: `r2:${copied.key}`,
          image_url: copied.url,
          thumbnail_path: "",
          thumbnail_url: copied.url,
          width: 0,
          height: 0,
        });
        newlyUploadedPaths.push(`r2:${copied.key}`);
      }
      let plan = {
        id: normalizeUuid(editingId),
        userId: previous?.userId || session.user.id,
        title,
        date: elements.weekendDateInput.value || getNextWeekendDate(),
        location: elements.weekendLocationInput.value.trim(),
        type: elements.weekendTypeInput.value,
        note: elements.weekendNoteInput.value.trim(),
        images: [...existingImages, ...uploadedImages],
        done: previous?.done || false,
        completionNote: previous?.completionNote || "",
        completionImages: previous?.completionImages || [],
        completedAt: previous?.completedAt || "",
        createdAt: previous?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const { data, error } = await repository.upsert(
        "weekend_plans",
        weekendToCloudRow(plan, plan.userId),
        { onConflict: "id", select: "*", single: true }
      );
      if (error) throw error;
      if (!data) throw new Error("周末计划保存没有返回结果，请重试。");
      plan = weekendFromCloudRow(data);
      const retainedPaths = new Set(
        (plan.images || []).flatMap((image) => [image.image_path, image.thumbnail_path]).filter(Boolean)
      );
      const removedPaths = (previous?.images || [])
        .flatMap((image) => [image.image_path, image.thumbnail_path])
        .filter((path) => path && !retainedPaths.has(path));
      if (removedPaths.length) void cleanupStoredImagePaths(removedPaths);
      setPlans(
        wasEditing
          ? plans.map((item) => (item.id === editingId ? plan : item))
          : [plan, ...plans]
      );
      save();
      resetForm();
      setExpanded(false);
      const successMessage = wasEditing ? "周末计划已更新。" : "周末计划已保存。";
      setStatus(successMessage);
      render(plan.id);
      void Promise.resolve()
        .then(() => awardExperience(wasEditing ? "weekendEdit" : "weekend"))
        .then((gainedExp) => {
          if (gainedExp) setStatus(`${successMessage} 修为 +${gainedExp}`);
        })
        .catch(() => {});
    } catch (error) {
      if (newlyUploadedPaths.length) void cleanupStoredImagePaths(newlyUploadedPaths);
      setExpanded(true);
      setStatus(error?.message || "周末计划保存失败，请重试。");
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.textContent = editingId ? "保存修改" : "保存计划";
      }
    }
  }

  function render(updatedId = "") {
    renderReminder();
    renderWeekendPlansView({
      listElement: elements.weekendList,
      summaryElement: elements.weekendSummary,
      plans: getPlans(),
      signedIn: Boolean(getSession()),
      getAuthorName,
      canManageItem,
      onEdit: edit,
      onToggle: toggle,
      onDelete: remove,
      onRecap: openCompletionDialog,
      onOpenGallery: openGallery,
    });
    if (updatedId) pulseListItem(elements.weekendList, "data-weekend-id", updatedId);
  }

  function edit(id) {
    const plan = getPlans().find((item) => item.id === id);
    if (!plan || !canManageItem(plan)) return;
    editingId = id;
    elements.weekendTitleInput.value = plan.title || "";
    elements.weekendDateInput.value = plan.date || getNextWeekendDate();
    elements.weekendLocationInput.value = plan.location || "";
    elements.weekendTypeInput.value = plan.type || "出门玩";
    elements.weekendNoteInput.value = plan.note || "";
    existingImages = Array.isArray(plan.images) ? [...plan.images] : [];
    selectedFiles = [];
    selectedLinks = [];
    renderImagePreviews();
    elements.weekendFormTitle.textContent = "编辑周末计划";
    elements.weekendSubmitButton.textContent = "保存修改";
    elements.weekendCancelEdit.hidden = false;
    setExpanded(true);
    setStatus(`正在编辑：${plan.title}`);
    elements.weekendComposer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function toggle(id) {
    const current = getPlans().find((item) => item.id === id);
    if (!current || !canManageItem(current)) return;
    if (!canSync()) {
      setStatus("数据库尚未连接，计划状态没有修改。");
      return;
    }
    if (!current.done) {
      openCompletionDialog(current);
      return;
    }
    const next = { ...current, done: false, updatedAt: new Date().toISOString() };
    const { data, error } = await repository.update(
      "weekend_plans",
      { is_done: next.done, updated_at: next.updatedAt },
      { id },
      { select: "*", single: true }
    );
    if (error) {
      setStatus(`状态同步失败：${error.message}`);
      return;
    }
    setPlans(getPlans().map((item) => (item.id === id ? weekendFromCloudRow(data) : item)));
    save();
    setStatus("周末计划状态已更新。");
    render(id);
  }

  async function remove(id, triggerButton = null) {
    const session = getSession();
    const plan = getPlans().find((item) => item.id === id);
    if (!session || !plan || !canManageItem(plan)) return;
    const confirmed = await confirmAction({
      eyebrow: "移到回收站",
      title: "删除这个周末计划？",
      message: `“${plan.title}”会保留 30 天，期间可以恢复。`,
      confirmLabel: "删除计划",
      cancelLabel: "先保留",
      danger: true,
    });
    if (!confirmed) {
      triggerButton?.focus({ preventScroll: true });
      return;
    }
    if (!canSync()) {
      setStatus("数据库尚未连接，不能删除周末计划。");
      return;
    }
    const trashSaved = await createTrashItem(
      "weekend",
      plan.id,
      plan.title,
      weekendToCloudRow(plan, plan.userId || session.user.id)
    );
    if (!trashSaved) {
      setStatus("无法写入回收站，已取消删除。");
      triggerButton?.focus({ preventScroll: true });
      return;
    }
    const { error } = await repository.remove("weekend_plans", { id });
    if (error) {
      await rollbackTrashItem(trashSaved);
      setStatus(`删除同步失败：${error.message}`);
      triggerButton?.focus({ preventScroll: true });
      return;
    }
    const cards = [...(elements.weekendList?.querySelectorAll("[data-weekend-id]") || [])];
    const removedIndex = cards.findIndex((card) => card.dataset.weekendId === id);
    const adjacentId = cards[removedIndex + 1]?.dataset.weekendId || cards[removedIndex - 1]?.dataset.weekendId || "";
    setPlans(getPlans().filter((item) => item.id !== id));
    save();
    setStatus("周末计划已移到回收站，30 天内可以恢复。");
    render();
    const adjacentCard = adjacentId
      ? [...(elements.weekendList?.querySelectorAll("[data-weekend-id]") || [])]
        .find((card) => card.dataset.weekendId === adjacentId)
      : null;
    const focusTarget = adjacentCard?.querySelector("[data-edit-weekend], [data-toggle-weekend], [data-delete-weekend]")
      || elements.weekendPage?.querySelector('[data-page-heading="weekend"]');
    focusTarget?.focus({ preventScroll: true });
  }

  function removeImageEntry(type, index) {
    if (type === "existing") existingImages.splice(index, 1);
    if (type === "selected") selectedFiles.splice(index, 1);
    if (type === "link") selectedLinks.splice(index, 1);
    renderImagePreviews();
  }

  function removeCompletionEntry(type, index) {
    if (type === "existing") completionExistingImages.splice(index, 1);
    if (type === "file") completionFiles.splice(index, 1);
    if (type === "link") completionLinks.splice(index, 1);
    renderCompletionPreviews();
  }

  return {
    addCompletionFiles,
    addCompletionLinks,
    addFiles,
    addImageLinks,
    clearCompletionState,
    clearImageState,
    closeCompletionDialog,
    edit,
    handleImagePaste,
    load,
    openCompletionDialog,
    remove,
    removeCompletionEntry,
    removeImageEntry,
    render,
    renderCompletionPreviews,
    renderImagePreviews,
    resetForm,
    save,
    saveCompletion,
    setExpanded,
    setStatus,
    submit,
    toggle,
  };
}
