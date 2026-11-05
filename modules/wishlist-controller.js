import { renderWishlist } from "./wishlist-view.js";
import { wishFromCloudRow, wishToCloudRow } from "./cloud-models.js";
import { reorderWishlistItems } from "./wishlist-domain.js";
import { createWishlistInteractions } from "./wishlist-interactions.js";
import { pulseListItem } from "./list-render-feedback.js";

export function createWishlistController({
  elements,
  repository,
  getSession,
  getDatabase,
  getWishes,
  setWishes,
  getActiveView,
  setActiveView,
  getDataState,
  canSync,
  getAuthorName,
  canManageItem,
  normalizeUuid,
  extractImageUrls,
  getClipboardImageUrl,
  copyUrlToR2,
  compressImage,
  uploadToR2,
  cleanupStoredImagePaths,
  slugify,
  formatFileSize,
  awardExperience,
  openWishImage,
  escapeHtml,
  confirmAction,
  confirmWishDeletion,
  showToast,
  synchronizeAccountData,
}) {
  let editingId = null;
  let existingImage = "";
  let existingImagePath = "";
  let imageLink = "";
  let imagePreviewUrl = "";
  let removeImageRequested = false;
  let completingId = null;
  let actionDialog = null;
  let submitting = false;
  let completionDialogVersion = 0;
  const pendingCompletions = new Set();
  const deletingIds = new Set();

  function setExpanded(expanded) {
    elements.wishlistComposer.classList.toggle("expanded", expanded);
    elements.wishlistForm.hidden = !expanded;
    elements.wishlistToggle.setAttribute("aria-expanded", String(expanded));
  }

  function setStatus(message) {
    elements.wishlistStatus.textContent = message;
  }

  function updateImagePreview() {
    const file = elements.wishImageInput.files?.[0];
    if (!file) return;
    imageLink = "";
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = URL.createObjectURL(file);
    removeImageRequested = false;
    elements.wishImagePreview.src = imagePreviewUrl;
    elements.wishImagePreview.hidden = false;
    elements.wishImageName.textContent = file.name;
    elements.wishRemoveImage.hidden = false;
  }

  function setImagePreview(src, name = "已保存的心愿图片") {
    clearImagePreview();
    if (!src) return;
    existingImage = src;
    elements.wishImagePreview.src = src;
    elements.wishImagePreview.hidden = false;
    elements.wishImageName.textContent = name;
    elements.wishRemoveImage.hidden = false;
  }

  function clearImagePreview() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      imagePreviewUrl = "";
    }
    elements.wishImageInput.value = "";
    if (elements.wishImageLinkInput) elements.wishImageLinkInput.value = "";
    imageLink = "";
    elements.wishImagePreview.removeAttribute("src");
    elements.wishImagePreview.hidden = true;
    elements.wishImageName.textContent = "还没有选择图片";
    elements.wishRemoveImage.hidden = true;
  }

  function ensureActionDialog() {
    if (actionDialog?.isConnected) return actionDialog;
    actionDialog = document.createElement("dialog");
    actionDialog.className = "wish-action-dialog";
    actionDialog.setAttribute("aria-label", "心愿操作");
    actionDialog.innerHTML = `
      <div class="wish-action-dialog-head"><strong>心愿操作</strong><button type="button" data-wish-action="close" aria-label="关闭">×</button></div>
      <div class="wish-action-dialog-actions">
        <button type="button" data-wish-action="edit">编辑</button>
        <button type="button" data-wish-action="toggle">标记完成</button>
        <button type="button" data-wish-action="delete" class="is-danger">删除</button>
      </div>`;
    actionDialog.addEventListener("click", (event) => {
      if (event.target === actionDialog) {
        actionDialog.close();
        return;
      }
      const button = event.target.closest("[data-wish-action]");
      if (!button) return;
      const action = button.dataset.wishAction;
      const id = actionDialog.dataset.wishId;
      if (action === "close") return actionDialog.close();
      actionDialog.close();
      if (!id) return;
      if (action === "edit") edit(id);
      if (action === "toggle") void toggle(id);
      if (action === "delete") void remove(id);
    });
    document.body.append(actionDialog);
    return actionDialog;
  }

  function openActionMenu(id) {
    const wish = getWishes().find((item) => item.id === id);
    if (!wish || !canManageItem(wish)) return;
    const dialog = ensureActionDialog();
    dialog.dataset.wishId = id;
    dialog.querySelector('[data-wish-action="toggle"]').textContent = wish.done ? "改回未完成" : "标记完成";
    if (!dialog.open) dialog.showModal();
  }

  function openDetail(id) {
    const wish = getWishes().find((item) => item.id === id);
    if (wish) openWishImage(wish);
  }

  function removeImage() {
    clearImagePreview();
    existingImage = "";
    removeImageRequested = true;
  }

  function handleImagePaste(event) {
    if (submitting) return;
    const imageItem = Array.from(event.clipboardData?.items || []).find((item) =>
      item.type.startsWith("image/")
    );
    if (!imageItem) {
      const pastedUrl = getClipboardImageUrl(event.clipboardData);
      if (applyImageUrl(pastedUrl)) event.preventDefault();
      return;
    }
    const file = imageItem.getAsFile();
    if (!file) return;
    event.preventDefault();
    const extension = file.type?.split("/")[1] || "png";
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([file], `wish-${Date.now()}.${extension}`, {
        type: file.type || "image/png",
      })
    );
    elements.wishImageInput.files = transfer.files;
    imageLink = "";
    updateImagePreview();
    setStatus("已读取剪切板图片。");
  }

  function applyImageUrl(rawUrl) {
    if (submitting) return false;
    const urls = extractImageUrls(rawUrl);
    if (!urls.length) {
      setStatus("请输入完整的 http 或 https 图片链接。");
      return false;
    }
    imageLink = urls[0];
    removeImageRequested = false;
    elements.wishImageInput.value = "";
    if (elements.wishImageLinkInput) elements.wishImageLinkInput.value = "";
    elements.wishImagePreview.src = imageLink;
    elements.wishImagePreview.hidden = false;
    elements.wishImageName.textContent = "已添加图片链接";
    elements.wishRemoveImage.hidden = false;
    setStatus("已添加图片链接，保存时会复制到 R2。");
    return true;
  }

  async function uploadImage(file, title, linkUrl = imageLink) {
    const userId = getSession()?.user?.id;
    if (!file && linkUrl) {
      setStatus("正在把图片链接复制到 R2…");
      const copied = await copyUrlToR2(
        linkUrl,
        `${slugify(title || "wish")}-link`,
        "wishes"
      );
      return { imageUrl: copied.url, imagePath: `r2:${copied.key}` };
    }
    if (!file) {
      return {
        imageUrl: removeImageRequested ? "" : existingImage,
        imagePath: removeImageRequested ? "" : existingImagePath,
      };
    }
    setStatus("正在压缩心愿图片…");
    const compressed = await compressImage(file);
    if (getSession()?.user?.id !== userId) throw new Error("当前账户已切换。");
    setStatus(
      `已压缩 ${formatFileSize(file.size)} → ${formatFileSize(compressed.blob.size)}，正在上传心愿图片…`
    );
    const uploaded = await uploadToR2(compressed.blob, slugify(title), "wishes");
    return { imageUrl: uploaded.url, imagePath: `r2:${uploaded.key}` };
  }

  function resetForm() {
    elements.wishlistForm.reset();
    editingId = null;
    existingImage = "";
    existingImagePath = "";
    imageLink = "";
    removeImageRequested = false;
    clearImagePreview();
    elements.wishlistFormTitle.textContent = "添加心愿";
    elements.wishSubmitButton.textContent = "保存心愿";
    elements.wishCancelEdit.hidden = true;
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const session = getSession();
    if (!session) {
      setStatus("请先登录后再保存心愿。");
      return;
    }
    if (!canSync()) {
      setStatus("Cloudflare D1 尚未升级，心愿没有保存。请先部署最新版数据库结构。");
      return;
    }
    const title = elements.wishTitleInput.value.trim();
    if (!title) {
      setStatus("先写一个心愿。");
      return;
    }
    const userId = session.user.id;
    const previous = getWishes().find((item) => item.id === editingId);
    let wish = {
      id: normalizeUuid(editingId),
      userId: previous?.userId || session.user.id,
      title,
      type: elements.wishTypeInput.value,
      date: elements.wishDateInput.value,
      priority: elements.wishPriorityInput.value,
      note: elements.wishNoteInput.value.trim(),
      completionNote: elements.wishCompletionNoteInput.value.trim(),
      done: previous?.done || false,
      completedAt: previous?.completedAt || "",
      sortOrder: previous?.sortOrder ?? 0,
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    let uploadedPath = "";
    let saved = false;
    submitting = true;
    setSubmitting(true);
    setStatus("正在保存心愿…");
    try {
      const image = await uploadImage(elements.wishImageInput.files?.[0], title, imageLink);
      uploadedPath = image.imagePath !== previous?.imagePath ? image.imagePath : "";
      if (getSession()?.user?.id !== userId) return;
      Object.assign(wish, image);
      const { data, error } = await repository.upsert(
        "wishes",
        wishToCloudRow(wish, wish.userId),
        { select: "*", single: true }
      );
      if (error) throw error;
      saved = true;
      if (getSession()?.user?.id !== userId) return;
      wish = wishFromCloudRow(data);
      const wishes = getWishes();
      setWishes(previous ? wishes.map((item) => (item.id === wish.id ? wish : item)) : [wish, ...wishes]);
      resetForm();
      setExpanded(false);
      const successMessage = previous ? "心愿已更新。" : "心愿已保存。";
      setStatus(successMessage);
      render(wish.id);
      void Promise.resolve().then(() => awardExperience(previous ? "wishEdit" : "wish")).then((gainedExp) => {
        if (getSession()?.user?.id === userId && elements.wishlistStatus.textContent === successMessage && gainedExp) setStatus(`${successMessage} 修为 +${gainedExp}`);
      }).catch(() => {
        if (getSession()?.user?.id === userId && elements.wishlistStatus.textContent === successMessage) setStatus(`${successMessage} 修为更新失败。`);
      });
      if (previous?.imagePath && previous.imagePath !== wish.imagePath && getDatabase()) {
        try {
          await cleanupStoredImagePaths([previous.imagePath]);
        } catch {
          if (getSession()?.user?.id === userId) setStatus("心愿已更新，但旧图片清理失败。");
        }
      }
    } catch (error) {
      if (getSession()?.user?.id === userId) setStatus(`心愿保存失败：${error.message}`);
    } finally {
      if (!saved && uploadedPath && getSession()?.user?.id === userId) {
        try {
          await cleanupStoredImagePaths([uploadedPath]);
        } catch {
          setStatus(`${elements.wishlistStatus.textContent} 上传图片清理失败。`);
        }
      }
      submitting = false;
      setSubmitting(false);
    }
  }

  function setSubmitting(value) {
    elements.wishlistForm.setAttribute("aria-busy", String(value));
    elements.wishlistForm.querySelectorAll("input, textarea, select, button").forEach((control) => { control.disabled = value; });
    elements.wishlistToggle.disabled = value;
    elements.wishSubmitButton.textContent = value ? "保存中…" : editingId ? "保存修改" : "保存心愿";
  }

  function render(updatedId = "") {
    if (!getSession()) setStatus("");
    renderWishlist({
      listElement: elements.wishlistList,
      tabsElement: elements.wishTabs,
      openCountElement: elements.wishOpenCount,
      doneCountElement: elements.wishDoneCount,
      summaryElement: elements.wishlistSummary,
      wishes: getWishes(),
      activeView: getActiveView(),
      signedIn: Boolean(getSession()),
      dataState: getDataState(),
      getAuthorName,
      canManageItem,
      onRetrySync: retrySync,
    });
    if (updatedId) pulseListItem(elements.wishlistList, "data-wish-id", updatedId);
  }

  let syncRetryInFlight = false;
  async function retrySync() {
    if (syncRetryInFlight) return;
    syncRetryInFlight = true;
    setStatus("正在重新同步心愿…");
    try {
      await synchronizeAccountData?.();
    } catch (error) {
      setStatus(`心愿同步失败：${error.message || "请稍后重试"}`);
    } finally {
      syncRetryInFlight = false;
      render();
    }
  }

  function edit(id) {
    if (submitting) return;
    const wish = getWishes().find((item) => item.id === id);
    if (!wish || !canManageItem(wish)) return;
    editingId = id;
    existingImage = wish.imageUrl || "";
    existingImagePath = wish.imagePath || "";
    removeImageRequested = false;
    elements.wishTitleInput.value = wish.title || "";
    elements.wishTypeInput.value = wish.type || "想做";
    elements.wishDateInput.value = wish.date || "";
    elements.wishPriorityInput.value = wish.priority || "普通";
    elements.wishNoteInput.value = wish.note || "";
    elements.wishCompletionNoteInput.value = wish.completionNote || "";
    if (existingImage) setImagePreview(existingImage);
    else clearImagePreview();
    elements.wishlistFormTitle.textContent = "编辑心愿";
    elements.wishSubmitButton.textContent = "保存修改";
    elements.wishCancelEdit.hidden = false;
    setExpanded(true);
    setStatus(`正在编辑：${wish.title}`);
    elements.wishlistComposer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openCompleteDialog(id) {
    const wish = getWishes().find((item) => item.id === id);
    if (!wish || !canManageItem(wish)) return;
    completionDialogVersion += 1;
    completingId = id;
    elements.wishCompleteTitle.textContent = wish.title || "完成心愿";
    elements.wishCompleteMeta.textContent = `${wish.type || "心愿"} · ${wish.priority || "普通"} · ${getAuthorName(wish.userId)} 发布`;
    elements.wishCompleteNoteInput.value = wish.completionNote || "";
    elements.wishCompleteStatus.textContent = "";
    elements.wishCompletePreview.innerHTML = wish.imageUrl
      ? `<img src="${escapeHtml(wish.imageUrl)}" alt="${escapeHtml(wish.title)}" />`
      : `<div><span>${escapeHtml(wish.type || "心愿")}</span><strong>${escapeHtml(wish.title || "完成心愿")}</strong></div>`;
    elements.wishCompleteDialog.showModal();
    setTimeout(() => elements.wishCompleteNoteInput.focus(), 0);
  }

  function closeCompleteDialog() {
    completionDialogVersion += 1;
    completingId = null;
    elements.wishCompleteForm.reset();
    elements.wishCompleteStatus.textContent = "";
    elements.wishCompleteDialog.close();
  }

  function setCompletionMessage(message, target, dialogVersion) {
    if (target === "dialog" && completionDialogVersion === dialogVersion && elements.wishCompleteDialog.open) elements.wishCompleteStatus.textContent = message;
    else setStatus(message);
  }

  async function saveCompletionState(current, done, completionNote = "", target = "page") {
    if (pendingCompletions.has(current.id)) return false;
    const userId = getSession()?.user?.id;
    if (!userId) return false;
    const dialogVersion = completionDialogVersion;
    if (!canSync()) {
      setCompletionMessage("数据库尚未连接，心愿状态没有修改。", target, dialogVersion);
      return false;
    }
    const next = {
      ...current,
      done,
      completionNote: done ? completionNote : current.completionNote,
      completedAt: done ? new Date().toISOString() : "",
      updatedAt: new Date().toISOString(),
    };
    pendingCompletions.add(current.id);
    try {
      const result = await repository.update(
        "wishes",
        {
          is_done: next.done,
          completion_note: next.completionNote || "",
          completed_at: next.completedAt || null,
          updated_at: next.updatedAt,
        },
        { id: current.id },
        { select: "*", single: true }
      );
      if (getSession()?.user?.id !== userId) return false;
      if (result.error) throw result.error;
      Object.assign(next, wishFromCloudRow(result.data));
      setWishes(getWishes().map((wish) => (wish.id === current.id ? next : wish)));
      setActiveView(done ? "done" : "open");
      const successMessage = done ? "心愿已完成，感想已保存。" : "已取消完成状态，感想已保留。";
      setStatus(successMessage);
      render(current.id);
      void Promise.resolve().then(() => awardExperience(done ? "wishDone" : "wishEdit")).then((gainedExp) => {
        if (getSession()?.user?.id === userId && elements.wishlistStatus.textContent === successMessage && gainedExp) setStatus(`${successMessage} 修为 +${gainedExp}`);
      }).catch(() => {
        if (getSession()?.user?.id === userId && elements.wishlistStatus.textContent === successMessage) setStatus(`${successMessage} 修为更新失败。`);
      });
      return true;
    } catch (error) {
      if (getSession()?.user?.id === userId) setCompletionMessage(`心愿同步失败：${error.message}`, target, dialogVersion);
      return false;
    } finally {
      pendingCompletions.delete(current.id);
    }
  }

  async function submitCompletion(event) {
    event.preventDefault();
    if (elements.wishCompleteSubmit.disabled) return;
    const current = getWishes().find((wish) => wish.id === completingId);
    if (!current || !canManageItem(current)) return;
    const note = elements.wishCompleteNoteInput.value.trim();
    const dialogVersion = completionDialogVersion;
    elements.wishCompleteSubmit.disabled = true;
    elements.wishCompleteSubmit.textContent = "保存中...";
    elements.wishCompleteForm.setAttribute("aria-busy", "true");
    try {
      const saved = await saveCompletionState(current, true, note, "dialog");
      if (saved && completionDialogVersion === dialogVersion) closeCompleteDialog();
    } finally {
      elements.wishCompleteSubmit.disabled = false;
      elements.wishCompleteSubmit.textContent = "保存完成感想";
      elements.wishCompleteForm.setAttribute("aria-busy", "false");
    }
  }

  async function toggle(id) {
    const current = getWishes().find((wish) => wish.id === id);
    if (!current || !canManageItem(current)) return;
    if (!current.done) {
      openCompleteDialog(id);
      return;
    }
    const confirmed = await confirmAction({
      eyebrow: "更新完成状态",
      title: "改回待实现？",
      message: `“${current.title}”的完成感想会保留，之后仍可再次标记完成。`,
      confirmLabel: "改回待实现",
      cancelLabel: "保持完成",
    });
    if (confirmed) await saveCompletionState(current, false, "");
  }

  async function remove(id, triggerButton = null) {
    if (deletingIds.has(id)) return;
    const session = getSession();
    const wish = getWishes().find((item) => item.id === id);
    if (!session || !wish || !canManageItem(wish)) return;
    deletingIds.add(id);
    const originalLabel = triggerButton?.textContent || "删除";
    try {
      if (!(await confirmWishDeletion(wish)) || getSession()?.user?.id !== session.user.id) return;
      if (!canSync()) {
        setStatus("数据库尚未连接，不能删除心愿。");
        showToast("暂时无法连接云端，请稍后再试", { kind: "error" });
        return;
      }
      if (triggerButton) {
        triggerButton.disabled = true;
        triggerButton.textContent = "处理中";
      }
      const { data, error } = await repository.rpc("move_family_item_to_trash", {
        p_item_type: "wish",
        p_item_id: wish.id,
      });
      if (getSession()?.user?.id !== session.user.id) return;
      if (error) throw error;
      if (data?.id !== id || !data.trash_id) throw new Error("云端未确认移入回收站，请重试。");
      setWishes(getWishes().filter((item) => item.id !== id));
      setStatus("心愿已移到回收站，30 天内可以恢复。");
      showToast("已移到回收站", { kind: "success" });
      render();
    } catch (error) {
      if (getSession()?.user?.id === session.user.id) {
        setStatus(`删除失败：${error.message}`);
        showToast("删除失败，请重试", { kind: "error" });
      }
    } finally {
      deletingIds.delete(id);
      if (triggerButton?.isConnected) {
        triggerButton.disabled = false;
        triggerButton.textContent = originalLabel;
      }
    }
  }

  async function reorder(ids) {
    const previous = getWishes();
    const reordered = reorderWishlistItems(previous, ids);
    if (!reordered.length || reordered.length !== previous.length) {
      render();
      return;
    }
    setWishes(reordered);
    render();
    if (!canSync()) return;
    const results = await Promise.all(reordered.map((wish) => repository.update(
      "wishes",
      { sort_order: wish.sortOrder, updated_at: new Date().toISOString() },
      { id: wish.id },
    )));
    const failure = results.find((result) => result?.error);
    if (failure) {
      setWishes(previous);
      render();
      setStatus(`排序保存失败：${failure.error.message}`);
      return;
    }
    setStatus("排序已保存。");
  }

  function bind() {
    createWishlistInteractions({
      listElement: elements.wishlistList,
      onAdd: () => {
        if (submitting) return;
        resetForm();
        setExpanded(true);
        elements.wishlistComposer.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      onOpenImage: openDetail,
      onOpenDetail: openDetail,
      onToggle: (id) => void toggle(id),
      onOpenMenu: openActionMenu,
      onSwipeToggle: (id) => void toggle(id),
      onRemove: (id) => void remove(id),
      canReorder: (card) => {
        const wish = getWishes().find((item) => item.id === card.dataset.wishId);
        return Boolean(wish && canManageItem(wish) && canSync());
      },
      onReorder: (ids) => void reorder(ids),
    }).bind();
  }

  return {
    applyImageUrl,
    bind,
    clearImagePreview,
    closeCompleteDialog,
    edit,
    handleImagePaste,
    openCompleteDialog,
    remove,
    removeImage,
    render,
    resetForm,
    saveCompletionState,
    setExpanded,
    setImagePreview,
    setStatus,
    submit,
    submitCompletion,
    toggle,
    updateImagePreview,
  };
}
