import { shoppingFromCloudRow, shoppingToCloudRow } from "./cloud-models.js";
import { renderShoppingDetail, renderShoppingItems } from "./shopping-view.js";
import { createShoppingInteractions } from "./shopping-interactions.js";

export function createShoppingController({
  elements,
  repository,
  getSession,
  getDatabase,
  getItems,
  setItems,
  getActiveFilter,
  setActiveFilter,
  getDataState,
  canSync,
  canManageItem,
  normalizeUuid,
  compressImage,
  uploadToR2,
  cleanupStoredImagePaths,
  slugify,
  formatFileSize,
  escapeHtml,
  confirmAction,
  showToast,
}) {
  let editingId = null;
  let existingImageUrl = "";
  let existingImagePath = "";
  let previewUrl = "";
  let removeImageRequested = false;
  let imageDialog = null;
  let actionDialog = null;
  let detailDialog = null;
  const deletingIds = new Set();

  function setStatus(message) {
    elements.shoppingStatus.textContent = message || "";
  }

  function setExpanded(expanded) {
    elements.shoppingComposer.classList.toggle("expanded", expanded);
    elements.shoppingForm.hidden = !expanded;
    elements.shoppingToggle.setAttribute("aria-expanded", String(expanded));
  }

  function clearPreview({ markRemoved = false } = {}) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    elements.shoppingImageInput.value = "";
    elements.shoppingImagePreview.removeAttribute("src");
    elements.shoppingImagePreview.hidden = true;
    elements.shoppingImageName.textContent = "还没有选择图片";
    elements.shoppingRemoveImage.hidden = true;
    if (markRemoved) {
      existingImageUrl = "";
      removeImageRequested = true;
    }
  }

  function updatePreview() {
    const file = elements.shoppingImageInput.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    removeImageRequested = false;
    elements.shoppingImagePreview.src = previewUrl;
    elements.shoppingImagePreview.hidden = false;
    elements.shoppingImageName.textContent = file.name;
    elements.shoppingRemoveImage.hidden = false;
  }

  function showSavedPreview(url) {
    clearPreview();
    if (!url) return;
    elements.shoppingImagePreview.src = url;
    elements.shoppingImagePreview.hidden = false;
    elements.shoppingImageName.textContent = "已保存的商品图片";
    elements.shoppingRemoveImage.hidden = false;
  }

  function resetForm() {
    elements.shoppingForm.reset();
    editingId = null;
    existingImageUrl = "";
    existingImagePath = "";
    removeImageRequested = false;
    clearPreview();
    elements.shoppingFormTitle.textContent = "添加商品";
    elements.shoppingSubmitButton.textContent = "保存商品";
    elements.shoppingCancelEdit.hidden = true;
  }

  async function cleanupImagePaths(paths) {
    if (!getDatabase() || !paths?.length) return null;
    try {
      await cleanupStoredImagePaths(paths);
      return null;
    } catch (error) {
      return error;
    }
  }

  async function uploadImage(file, name) {
    if (!file) {
      return {
        imageUrl: removeImageRequested ? "" : existingImageUrl,
        imagePath: removeImageRequested ? "" : existingImagePath,
      };
    }
    setStatus("正在压缩商品图片…");
    const compressed = await compressImage(file);
    setStatus(`已压缩 ${formatFileSize(file.size)} → ${formatFileSize(compressed.blob.size)}，正在上传…`);
    const uploaded = await uploadToR2(compressed.blob, slugify(name || "shopping-item"), "shopping");
    return { imageUrl: uploaded.url, imagePath: `r2:${uploaded.key}` };
  }

  function render() {
    renderShoppingItems({
      listElement: elements.shoppingList,
      filtersElement: elements.shoppingFilters,
      openCountElement: elements.shoppingOpenCount,
      doneCountElement: elements.shoppingDoneCount,
      summaryElement: elements.shoppingSummary,
      items: getItems(),
      activeFilter: getActiveFilter(),
      signedIn: Boolean(getSession()),
      dataState: getDataState(),
      canManageItem,
      escapeHtml,
    });
  }

  function ensureImageDialog() {
    if (imageDialog?.isConnected) return imageDialog;
    imageDialog = document.createElement("dialog");
    imageDialog.className = "shopping-image-dialog";
    imageDialog.setAttribute("aria-label", "商品图片预览");
    imageDialog.innerHTML = `
      <button class="shopping-image-dialog-close" type="button" aria-label="关闭商品图片预览">×</button>
      <img alt="商品图片大图" />
    `;
    imageDialog.addEventListener("click", (event) => {
      if (event.target === imageDialog || event.target.closest(".shopping-image-dialog-close")) {
        imageDialog.close();
      }
    });
    imageDialog.addEventListener("close", () => {
      const image = imageDialog.querySelector("img");
      image.removeAttribute("src");
      image.alt = "商品图片大图";
    });
    document.body.append(imageDialog);
    return imageDialog;
  }

  function openImage(url, alt = "商品图片") {
    if (!url) return;
    const dialog = ensureImageDialog();
    const image = dialog.querySelector("img");
    image.src = url;
    image.alt = alt || "商品图片";
    if (!dialog.open) dialog.showModal();
  }

  function ensureActionDialog() {
    if (actionDialog?.isConnected) return actionDialog;
    actionDialog = document.createElement("dialog");
    actionDialog.className = "shopping-action-dialog";
    actionDialog.setAttribute("aria-label", "商品操作");
    actionDialog.innerHTML = `
      <div class="shopping-action-dialog-head"><strong>商品操作</strong><button type="button" data-shopping-action="close" aria-label="关闭">×</button></div>
      <div class="shopping-action-dialog-actions">
        <button type="button" data-shopping-action="edit">编辑</button>
        <button type="button" data-shopping-action="toggle">标记完成</button>
        <button type="button" data-shopping-action="delete" class="is-danger">删除</button>
      </div>
    `;
    actionDialog.addEventListener("click", (event) => {
      const button = event.target.closest("[data-shopping-action]");
      if (!button) return;
      const action = button.dataset.shoppingAction;
      const id = actionDialog.dataset.shoppingItemId;
      if (action === "close") return actionDialog.close();
      actionDialog.close();
      if (!id) return;
      if (action === "edit") edit(id);
      if (action === "toggle") void toggle(id);
      if (action === "delete") void remove(id);
    });
    actionDialog.addEventListener("click", (event) => {
      if (event.target === actionDialog) actionDialog.close();
    });
    document.body.append(actionDialog);
    return actionDialog;
  }

  function openActionMenu(id) {
    const item = getItems().find((entry) => entry.id === id);
    if (!item || !canManageItem(item)) return;
    const dialog = ensureActionDialog();
    dialog.dataset.shoppingItemId = id;
    const toggleButton = dialog.querySelector('[data-shopping-action="toggle"]');
    toggleButton.textContent = item.completed ? "取消完成" : "标记完成";
    if (!dialog.open) dialog.showModal();
  }

  function ensureDetailDialog() {
    if (detailDialog?.isConnected) return detailDialog;
    detailDialog = document.createElement("dialog");
    detailDialog.className = "shopping-detail-dialog";
    detailDialog.setAttribute("aria-label", "商品详情");
    detailDialog.innerHTML = `
      <button class="shopping-detail-close" type="button" aria-label="关闭商品详情">×</button>
      <div class="shopping-detail-content"></div>
    `;
    detailDialog.addEventListener("click", (event) => {
      if (event.target === detailDialog || event.target.closest(".shopping-detail-close")) detailDialog.close();
    });
    document.body.append(detailDialog);
    return detailDialog;
  }

  function openDetail(id) {
    const item = getItems().find((entry) => entry.id === id);
    if (!item) return;
    const dialog = ensureDetailDialog();
    dialog.querySelector(".shopping-detail-content").innerHTML = renderShoppingDetail(item, { escapeHtml });
    if (!dialog.open) dialog.showModal();
  }

  async function submit(event) {
    event.preventDefault();
    const session = getSession();
    if (!session) return setStatus("请先登录后再保存商品。");
    if (!canSync()) return setStatus("数据库尚未连接，商品没有保存。");
    const name = elements.shoppingNameInput.value.trim();
    if (!name) return setStatus("请填写商品名称。");
    const link = elements.shoppingLinkInput.value.trim();
    if (link) {
      try {
        const url = new URL(link);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
      } catch {
        return setStatus("商品链接需要使用完整的 http 或 https 地址。");
      }
    }
    const items = getItems();
    const previous = items.find((item) => item.id === editingId);
    let image;
    try {
      image = await uploadImage(elements.shoppingImageInput.files?.[0], name);
    } catch (error) {
      setStatus(`图片上传失败：${error.message}`);
      return;
    }
    const rawPrice = elements.shoppingPriceInput.value.trim();
    let item = {
      id: normalizeUuid(editingId),
      userId: previous?.userId || session.user.id,
      name,
      imageUrl: image.imageUrl,
      imagePath: image.imagePath,
      price: rawPrice === "" ? null : Number(rawPrice),
      link,
      note: elements.shoppingNoteInput.value.trim(),
      completed: previous?.completed || false,
      completedAt: previous?.completedAt || "",
      sortOrder: previous?.sortOrder ?? 0,
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await repository.upsert("shopping_items", shoppingToCloudRow(item, item.userId), {
      onConflict: "id",
      select: "*",
      single: true,
    });
    if (result.error) {
      if (image.imagePath && image.imagePath !== previous?.imagePath) await cleanupImagePaths([image.imagePath]);
      setStatus(`商品同步失败：${result.error.message}`);
      return;
    }
    item = shoppingFromCloudRow(result.data);
    setItems(previous ? items.map((entry) => entry.id === item.id ? item : entry) : [item, ...items]);
    resetForm();
    setExpanded(false);
    setStatus(previous ? "商品已更新。" : "商品已加入购物车。");
    render();
    if (previous?.imagePath && previous.imagePath !== item.imagePath) {
      const cleanupError = await cleanupImagePaths([previous.imagePath]);
      if (cleanupError) setStatus("商品已更新，但旧图片清理失败。");
    }
  }

  function edit(id) {
    const item = getItems().find((entry) => entry.id === id);
    if (!item || !canManageItem(item)) return;
    editingId = id;
    existingImageUrl = item.imageUrl || "";
    existingImagePath = item.imagePath || "";
    removeImageRequested = false;
    elements.shoppingNameInput.value = item.name || "";
    elements.shoppingPriceInput.value = item.price ?? "";
    elements.shoppingLinkInput.value = item.link || "";
    elements.shoppingNoteInput.value = item.note || "";
    showSavedPreview(existingImageUrl);
    elements.shoppingFormTitle.textContent = "编辑商品";
    elements.shoppingSubmitButton.textContent = "保存修改";
    elements.shoppingCancelEdit.hidden = false;
    setExpanded(true);
    setStatus(`正在编辑：${item.name}`);
    elements.shoppingComposer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function toggle(id) {
    const item = getItems().find((entry) => entry.id === id);
    if (!item || !canManageItem(item) || !canSync()) return;
    const completed = !item.completed;
    const result = await repository.update("shopping_items", {
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { id }, { select: "*", single: true });
    if (result.error) return setStatus(`状态同步失败：${result.error.message}`);
    const saved = shoppingFromCloudRow(result.data);
    setItems(getItems().map((entry) => entry.id === id ? saved : entry));
    setActiveFilter(completed ? "done" : "open");
    setStatus(completed ? "已标记为已购买。" : "已恢复为未完成。");
    render();
  }

  async function remove(id) {
    if (deletingIds.has(id)) return;
    const item = getItems().find((entry) => entry.id === id);
    if (!item || !canManageItem(item)) return;
    const confirmed = await confirmAction({
      eyebrow: "删除商品",
      title: "确定要删除这个商品吗？",
      message: `“${item.name}”删除后将无法恢复。`,
      confirmLabel: "确认删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed || deletingIds.has(id)) return;
    deletingIds.add(id);
    try {
      const result = await repository.remove("shopping_items", { id }, { select: "id" });
      if (result.error) {
        setStatus(`删除失败：${result.error.message}`);
        return;
      }
      if (Array.isArray(result.data) && result.data.length === 0) {
        setStatus("删除失败：数据库没有删除任何记录，请稍后重试。");
        return;
      }
      setItems(getItems().filter((entry) => entry.id !== id));
      setStatus("商品已删除。");
      showToast?.("商品已删除", { kind: "success" });
      render();
      const cleanupError = await cleanupImagePaths(item.imagePath ? [item.imagePath] : []);
      if (cleanupError) setStatus("商品已删除，但图片清理失败。");
    } finally {
      deletingIds.delete(id);
    }
  }

  async function reorder(ids) {
    const previous = getItems();
    const byId = new Map(previous.map((item) => [item.id, item]));
    const visibleIds = ids.filter((id) => byId.has(id));
    const visibleSet = new Set(visibleIds);
    const visibleItems = visibleIds.map((id) => byId.get(id));
    const orderedPrevious = [...previous].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    const slots = orderedPrevious
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => visibleSet.has(item.id))
      .map(({ index }) => index);
    if (!visibleItems.length || visibleItems.length !== slots.length) return render();
    const merged = [...orderedPrevious];
    slots.forEach((slot, index) => {
      merged[slot] = visibleItems[index];
    });
    const reordered = merged.map((item, index) => ({ ...item, sortOrder: index }));
    setItems(reordered);
    render();
    if (!canSync()) return;
    const results = await Promise.all(reordered.map((item) => repository.update(
      "shopping_items",
      { sort_order: item.sortOrder, updated_at: new Date().toISOString() },
      { id: item.id },
    )));
    const failure = results.find((result) => result?.error);
    if (failure) {
      setItems(previous);
      render();
      setStatus(`排序保存失败：${failure.error.message}`);
      return;
    }
    setStatus("排序已保存。");
  }

  function bind() {
    elements.shoppingToggle.addEventListener("click", () => setExpanded(elements.shoppingForm.hidden));
    elements.shoppingImageInput.addEventListener("change", updatePreview);
    elements.shoppingRemoveImage.addEventListener("click", () => clearPreview({ markRemoved: true }));
    elements.shoppingForm.addEventListener("submit", submit);
    elements.shoppingCancelEdit.addEventListener("click", () => {
      resetForm();
      setExpanded(false);
      setStatus("");
    });
    elements.shoppingFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-shopping-filter]");
      if (!button) return;
      setActiveFilter(button.dataset.shoppingFilter);
      render();
    });
    createShoppingInteractions({
      listElement: elements.shoppingList,
      onAdd: () => {
        resetForm();
        setExpanded(true);
        elements.shoppingComposer.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      onOpenImage: openImage,
      onOpenDetail: openDetail,
      onToggle: (id) => void toggle(id),
      onOpenMenu: openActionMenu,
      onSwipeToggle: (id) => void toggle(id),
      onRemove: (id) => void remove(id),
      canReorder: (card) => {
        const item = getItems().find((entry) => entry.id === card.dataset.shoppingId);
        return Boolean(item && canManageItem(item) && canSync());
      },
      onReorder: (ids) => void reorder(ids),
    }).bind();
  }

  return { bind, edit, render, resetForm, setExpanded, setStatus, submit, toggle, remove, reorder };
}
