import {
  commaList,
  filterItems,
  normalizeImage,
  normalizeItem,
  resultData,
  uid,
} from "./wardrobe-domain.js";
import { renderListIcon } from "./list-icons.js";
import {
  createWardrobeDialogs,
  renderWardrobeDetail,
  renderWardrobeFamilyOptions,
  renderWardrobeGrid,
  renderWardrobeLocationChips,
  renderWardrobeLocationOptions,
  renderWardrobeLocations,
  renderWardrobeMediaPreviews,
  renderWardrobeOverview,
  renderWardrobeRandomResult,
  renderWardrobeShell,
} from "./wardrobe-view.js";

export function createWardrobeController({
  root,
  repository,
  getSession,
  getFamilyMembers = () => [],
  uploadFile,
  importUrl,
  deleteAsset,
  confirmAction,
  notify = () => {},
  onExperience = async () => {},
} = {}) {
  let items = [];
  let locations = [];
  let wearLogs = [];
  let loaded = false;
  let loading = false;
  let activeItem = null;
  let editorImages = [];
  let pendingFiles = [];
  let pendingUrls = [];
  let removedPaths = [];
  let detailIndex = 0;
  let currentLocation = "all";
  let search = "";
  let category = "all";
  let season = "all";
  let status = "available";
  let favoritesOnly = false;
  let editingLocationId = "";
  const objectUrls = new Set();
  const cacheKey = () => `life-vlog-wardrobe:${getSession?.()?.user?.id || "guest"}`;

  if (!root) throw new Error("Wardrobe root is required.");

  renderWardrobeShell(root);
  const { editor, detail, locationDialog, randomDialog } = createWardrobeDialogs({
    documentTarget: root.ownerDocument || globalThis.document,
  });

  function setStatus(message = "") {
    root.querySelector("[data-wardrobe-status-line]").textContent = message;
  }

  function saveCache() {
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({ items, locations, savedAt: Date.now() }));
    } catch {
      // The cloud copy remains authoritative when local storage is full.
    }
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey()) || "null");
      if (!cached) return false;
      items = (cached.items || []).map(normalizeItem);
      locations = cached.locations || [];
      render();
      return true;
    } catch {
      return false;
    }
  }

  async function load({ force = false } = {}) {
    if (!getSession?.()) {
      items = [];
      locations = [];
      render();
      setStatus("登录后使用家庭衣柜。");
      return;
    }
    if (loading || (loaded && !force)) return;
    if (!loaded) readCache();
    loading = true;
    setStatus(items.length ? "正在同步衣柜…" : "正在打开衣柜…");
    try {
      const [itemResult, locationResult, logResult] = await Promise.all([
        repository.listItems(),
        repository.listLocations(),
        repository.listWearLogs(),
      ]);
      items = (resultData(itemResult, []) || []).map(normalizeItem);
      locations = resultData(locationResult, []) || [];
      wearLogs = resultData(logResult, []) || [];
      loaded = true;
      saveCache();
      setStatus("");
      render();
    } catch (error) {
      setStatus(items.length ? "当前离线，正在显示上次同步的衣柜。" : `衣柜读取失败：${error.message}`);
    } finally {
      loading = false;
    }
  }

  function filteredItems() {
    return filterItems(items, { currentLocation, search, category, season, status, favoritesOnly });
  }

  function locationName(id) {
    return locations.find((location) => location.id === id)?.name || "还没标位置";
  }

  function memberFor(id) {
    return getFamilyMembers().find((member) => member.user_id === id) || null;
  }

  function render() {
    renderWardrobeOverview(root, items, locations);
    renderWardrobeLocationChips(root, items, locations, currentLocation);
    renderWardrobeGrid(root, filteredItems(), {
      totalItems: items.length,
      locationName,
      memberFor,
    });
  }

  function familyOptions(selected = "") {
    return renderWardrobeFamilyOptions(selected, getSession?.(), getFamilyMembers());
  }

  function locationOptions(selected = "") {
    return renderWardrobeLocationOptions(selected, locations);
  }

  function resetEditorMedia() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
    editorImages = [];
    pendingFiles = [];
    pendingUrls = [];
    removedPaths = [];
  }

  function openEditor(item = null) {
    activeItem = item ? normalizeItem(item) : null;
    resetEditorMedia();
    editorImages = activeItem?.images.map((image) => ({ ...image })) || [];
    const form = editor.querySelector("[data-wardrobe-editor-form]");
    form.reset();
    form.elements.name.value = activeItem?.name || "";
    form.elements.item_type.value = activeItem?.item_type || "item";
    form.elements.category.value = activeItem?.category || "上装";
    form.elements.status.value = activeItem?.status || "available";
    form.elements.fit_note.value = activeItem?.fit_note || "";
    form.elements.description.value = activeItem?.description || "";
    form.elements.color_tags.value = activeItem?.color_tags.join("、") || "";
    form.elements.style_tags.value = activeItem?.style_tags.join("、") || "";
    editor.querySelector("[data-wardrobe-wearer]").innerHTML = familyOptions(activeItem?.wearer_user_id || "");
    editor.querySelector("[data-wardrobe-location-select]").innerHTML = locationOptions(activeItem?.location_id || "");
    form.querySelectorAll('[name="seasons"]').forEach((input) => { input.checked = activeItem?.seasons.includes(input.value) || false; });
    form.querySelectorAll('[name="occasions"]').forEach((input) => { input.checked = activeItem?.occasions.includes(input.value) || false; });
    editor.querySelector("[data-wardrobe-editor-title]").textContent = activeItem ? "编辑衣柜卡" : "添加衣服";
    editor.querySelector("[data-wardrobe-delete]").hidden = !activeItem;
    editor.querySelector("[data-wardrobe-form-status]").textContent = "";
    renderMediaPreviews();
    editor.showModal();
    setTimeout(() => form.elements.name.focus(), 80);
  }

  function addFiles(files) {
    [...files].filter((file) => file.type.startsWith("image/")).forEach((file) => {
      const preview = URL.createObjectURL(file);
      objectUrls.add(preview);
      pendingFiles.push({ id: uid(), file, preview, role: editorImages.length || pendingFiles.length ? "detail" : "cover" });
    });
    renderMediaPreviews();
  }

  function addPendingUrl(value) {
    const url = String(value || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      editor.querySelector("[data-wardrobe-form-status]").textContent = "请输入完整的图片链接。";
      return;
    }
    pendingUrls.push({ id: uid(), url, role: editorImages.length || pendingFiles.length || pendingUrls.length ? "detail" : "cover" });
    editor.querySelector("[data-wardrobe-url]").value = "";
    renderMediaPreviews();
  }

  function renderMediaPreviews() {
    renderWardrobeMediaPreviews(editor, editorImages, pendingFiles, pendingUrls);
  }

  async function saveItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const saveButton = form.querySelector("[data-wardrobe-save]");
    const statusLine = form.querySelector("[data-wardrobe-form-status]");
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    statusLine.textContent = "正在整理照片…";
    try {
      const uploaded = [];
      const total = pendingFiles.length + pendingUrls.length;
      let current = 0;
      for (const pending of pendingFiles) {
        current += 1;
        const media = await uploadFile(pending.file, `wardrobe-${Date.now()}-${current}`, current, total, (message) => { statusLine.textContent = message; });
        if (!media) throw new Error("照片上传失败，请重试。");
        uploaded.push(normalizeImage({ ...media, role: pending.role, name: pending.file.name }, editorImages.length + uploaded.length));
      }
      for (const pending of pendingUrls) {
        current += 1;
        statusLine.textContent = `${current}/${total} · 正在导入图片链接…`;
        const media = await importUrl(pending.url, `wardrobe-link-${Date.now()}-${current}`);
        uploaded.push(normalizeImage({ image_url: media.url, image_path: `r2:${media.key}`, thumbnail_url: media.url, role: pending.role }, editorImages.length + uploaded.length));
      }
      const formData = new FormData(form);
      const images = [...editorImages, ...uploaded];
      const record = {
        name: String(formData.get("name") || "").trim(),
        item_type: formData.get("item_type") || "item",
        category: formData.get("category") || "上装",
        wearer_user_id: formData.get("wearer_user_id") || null,
        location_id: formData.get("location_id") || null,
        status: formData.get("status") || "available",
        fit_note: String(formData.get("fit_note") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        seasons: formData.getAll("seasons"),
        occasions: formData.getAll("occasions"),
        color_tags: commaList(formData.get("color_tags")),
        style_tags: commaList(formData.get("style_tags")),
        images,
        updated_at: new Date().toISOString(),
      };
      if (!record.name) throw new Error("请给这件衣服起个名字。");
      const result = activeItem
        ? await repository.updateItem(activeItem.id, record)
        : await repository.insertItem({ id: uid(), ...record, is_favorite: false, wear_count: 0, created_at: new Date().toISOString() });
      const saved = normalizeItem(resultData(result, activeItem ? { ...activeItem, ...record } : record));
      if (activeItem) items = items.map((item) => item.id === activeItem.id ? saved : item);
      else items.unshift(saved);
      for (const path of removedPaths) await deleteAsset(path).catch(() => {});
      saveCache();
      render();
      editor.close();
      notify(activeItem ? "衣柜卡已更新" : "衣服已收入衣柜", { kind: "success" });
      await onExperience(activeItem ? "wardrobeEdit" : "wardrobe");
    } catch (error) {
      statusLine.textContent = error.message || "保存失败，请稍后重试。";
    } finally {
      saveButton.disabled = false;
    }
  }

  function openDetail(item, index = 0) {
    activeItem = normalizeItem(item);
    detailIndex = Math.min(Math.max(0, index), Math.max(0, activeItem.images.length - 1));
    renderDetail();
    detail.showModal();
  }

  function renderDetail() {
    if (!activeItem) return;
    renderWardrobeDetail(detail, activeItem, {
      detailIndex,
      member: memberFor(activeItem.wearer_user_id),
      locationName,
      locationCount: locations.length,
    });
  }

  async function toggleFavorite(item) {
    const next = !item.is_favorite;
    const result = await repository.updateItem(item.id, { is_favorite: next, updated_at: new Date().toISOString() });
    const saved = normalizeItem(resultData(result, { ...item, is_favorite: next }));
    items = items.map((entry) => entry.id === item.id ? saved : entry);
    activeItem = activeItem?.id === saved.id ? saved : activeItem;
    saveCache();
    render();
    if (detail.open) renderDetail();
  }

  async function recordWear(item) {
    const now = new Date();
    const wornOn = now.toISOString().slice(0, 10);
    const [logResult, updateResult] = await Promise.all([
      repository.insertWearLog({ id: uid(), wardrobe_item_id: item.id, worn_on: wornOn, note: "" }),
      repository.updateItem(item.id, { wear_count: item.wear_count + 1, last_worn_at: now.toISOString(), updated_at: now.toISOString() }),
    ]);
    resultData(logResult, null);
    const saved = normalizeItem(resultData(updateResult, { ...item, wear_count: item.wear_count + 1, last_worn_at: now.toISOString() }));
    items = items.map((entry) => entry.id === item.id ? saved : entry);
    activeItem = saved;
    saveCache();
    render();
    if (detail.open) renderDetail();
    notify("今天的穿着已记下", { kind: "success" });
    await onExperience("wardrobeWear");
  }

  async function removeItem(item) {
    const confirmed = await confirmAction({ eyebrow: "移出衣柜", title: `删除“${item.name}”？`, message: "衣服卡和穿着记录会删除，上传的照片也会从云端移除。", confirmLabel: "删除", danger: true });
    if (!confirmed) return;
    resultData(await repository.removeItem(item.id), []);
    for (const image of item.images) {
      for (const path of [image.path, image.thumbnailPath]) if (path) await deleteAsset(path).catch(() => {});
    }
    items = items.filter((entry) => entry.id !== item.id);
    saveCache();
    render();
    editor.close();
    detail.close();
    notify("衣服卡已删除", { kind: "success" });
  }

  function renderLocations() {
    renderWardrobeLocations(locationDialog, locations, items, editingLocationId);
  }

  async function addLocation(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (!name) return;
    const record = resultData(await repository.insertLocation({ id: uid(), name, note: form.elements.note.value.trim(), sort_order: locations.length, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }), null);
    locations.push(record);
    form.reset();
    saveCache();
    renderLocations();
    render();
  }

  async function updateLocation(event, location) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (!name) return;
    const note = form.elements.note.value.trim();
    const updated = resultData(await repository.updateLocation(location.id, { name, note, updated_at: new Date().toISOString() }), { ...location, name, note });
    locations = locations.map((entry) => entry.id === location.id ? updated : entry);
    editingLocationId = "";
    saveCache();
    renderLocations();
    render();
  }

  async function removeLocation(location) {
    const count = items.filter((item) => item.location_id === location.id).length;
    const confirmed = await confirmAction({ eyebrow: "删除收纳位置", title: `删除“${location.name}”？`, message: count ? `这里的 ${count} 件衣服会变成“还没标位置”，衣服本身不会删除。` : "衣服本身不会受到影响。", confirmLabel: "删除位置", danger: true });
    if (!confirmed) return;
    resultData(await repository.removeLocation(location.id), []);
    locations = locations.filter((entry) => entry.id !== location.id);
    items = items.map((item) => item.location_id === location.id ? { ...item, location_id: null } : item);
    if (currentLocation === location.id) currentLocation = "all";
    saveCache();
    renderLocations();
    render();
  }

  function openRandom() {
    randomDialog.querySelector("[data-random-wearer]").innerHTML = `<option value="all">全家都可以</option>${familyOptions().replace('<option value="">家庭共用</option>', "")}`;
    drawRandom();
    randomDialog.showModal();
  }

  function drawRandom() {
    const wearer = randomDialog.querySelector("[data-random-wearer]").value || "all";
    const selectedSeason = randomDialog.querySelector("[data-random-season]").value || "all";
    const occasion = randomDialog.querySelector("[data-random-occasion]").value || "all";
    let candidates = items.filter((item) => item.status === "available");
    if (wearer !== "all") candidates = candidates.filter((item) => !item.wearer_user_id || item.wearer_user_id === wearer);
    if (selectedSeason !== "all") candidates = candidates.filter((item) => !item.seasons.length || item.seasons.includes("四季") || item.seasons.includes(selectedSeason));
    if (occasion !== "all") candidates = candidates.filter((item) => !item.occasions.length || item.occasions.includes(occasion));
    candidates.sort((a, b) => new Date(a.last_worn_at || 0) - new Date(b.last_worn_at || 0));
    const pool = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
    const picked = pool[Math.floor(Math.random() * pool.length)];
    renderWardrobeRandomResult(randomDialog, picked, locationName);
  }

  root.addEventListener("click", (event) => {
    const add = event.target.closest("[data-wardrobe-add]");
    if (add) return openEditor();
    if (event.target.closest("[data-wardrobe-random]")) return openRandom();
    if (event.target.closest("[data-wardrobe-manage-locations]")) { renderLocations(); locationDialog.showModal(); return; }
    const filter = event.target.closest("[data-location-filter]");
    if (filter) { currentLocation = filter.dataset.locationFilter; render(); return; }
    const favorite = event.target.closest("[data-wardrobe-favorite]");
    if (favorite) { event.stopPropagation(); void toggleFavorite(items.find((item) => item.id === favorite.dataset.wardrobeFavorite)); return; }
    const card = event.target.closest("[data-wardrobe-item]");
    if (card) openDetail(items.find((item) => item.id === card.dataset.wardrobeItem));
  });
  root.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-wardrobe-item]")) {
      event.preventDefault();
      openDetail(items.find((item) => item.id === event.target.dataset.wardrobeItem));
    }
  });
  root.querySelector("[data-wardrobe-search]").addEventListener("input", (event) => { search = event.target.value; render(); });
  root.querySelector("[data-wardrobe-category]").addEventListener("change", (event) => { category = event.target.value; render(); });
  root.querySelector("[data-wardrobe-season]").addEventListener("change", (event) => { season = event.target.value; render(); });
  root.querySelector("[data-wardrobe-status]").addEventListener("change", (event) => { status = event.target.value; render(); });
  root.querySelector("[data-wardrobe-favorites]").addEventListener("click", (event) => { favoritesOnly = !favoritesOnly; event.currentTarget.setAttribute("aria-pressed", String(favoritesOnly)); event.currentTarget.innerHTML = renderListIcon("heart"); render(); });

  editor.querySelector("[data-wardrobe-file-input]").addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
  editor.querySelector("[data-wardrobe-url-add]").addEventListener("click", () => addPendingUrl(editor.querySelector("[data-wardrobe-url]").value));
  editor.addEventListener("paste", (event) => {
    if (!editor.open) return;
    const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
    if (files.length) { event.preventDefault(); addFiles(files); return; }
    const text = event.clipboardData?.getData("text/plain")?.trim();
    if (/^https?:\/\//i.test(text || "") && event.target !== editor.querySelector("[data-wardrobe-url]")) { event.preventDefault(); addPendingUrl(text); }
  });
  editor.querySelector("[data-wardrobe-media-previews]").addEventListener("change", (event) => {
    const row = event.target.closest("[data-media-id]");
    if (!row || !event.target.matches("[data-media-role]")) return;
    const groups = { stored: editorImages, file: pendingFiles, url: pendingUrls };
    const entry = groups[row.dataset.mediaKind]?.find((image) => image.id === row.dataset.mediaId);
    if (entry) entry.role = event.target.value;
  });
  editor.querySelector("[data-wardrobe-media-previews]").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-media]");
    if (!remove) return;
    const row = remove.closest("[data-media-id]");
    if (row.dataset.mediaKind === "stored") {
      const found = editorImages.find((image) => image.id === row.dataset.mediaId);
      if (found) removedPaths.push(found.path, found.thumbnailPath);
      editorImages = editorImages.filter((image) => image.id !== row.dataset.mediaId);
    } else if (row.dataset.mediaKind === "file") {
      const found = pendingFiles.find((image) => image.id === row.dataset.mediaId);
      if (found?.preview) { URL.revokeObjectURL(found.preview); objectUrls.delete(found.preview); }
      pendingFiles = pendingFiles.filter((image) => image.id !== row.dataset.mediaId);
    } else pendingUrls = pendingUrls.filter((image) => image.id !== row.dataset.mediaId);
    renderMediaPreviews();
  });
  editor.querySelector("[data-wardrobe-editor-form]").addEventListener("submit", saveItem);
  editor.querySelector("[data-wardrobe-delete]").addEventListener("click", () => activeItem && void removeItem(activeItem));
  editor.addEventListener("close", resetEditorMedia);

  detail.addEventListener("click", (event) => {
    if (event.target.closest("[data-detail-prev]") && detailIndex > 0) { detailIndex -= 1; renderDetail(); }
    if (event.target.closest("[data-detail-next]") && detailIndex < activeItem.images.length - 1) { detailIndex += 1; renderDetail(); }
    const thumb = event.target.closest("[data-detail-index]");
    if (thumb) { detailIndex = Number(thumb.dataset.detailIndex); renderDetail(); }
    if (event.target.closest("[data-detail-edit]")) { detail.close(); openEditor(activeItem); }
    if (event.target.closest("[data-detail-favorite]")) void toggleFavorite(activeItem);
    if (event.target.closest("[data-detail-wear]")) void recordWear(activeItem);
    if (event.target.closest("[data-open-locations]")) { renderLocations(); locationDialog.showModal(); }
  });
  let detailTouchX = 0;
  detail.addEventListener("touchstart", (event) => { detailTouchX = event.touches[0]?.clientX || 0; }, { passive: true });
  detail.addEventListener("touchend", (event) => {
    const delta = (event.changedTouches[0]?.clientX || 0) - detailTouchX;
    if (Math.abs(delta) < 55) return;
    if (delta < 0 && detailIndex < activeItem.images.length - 1) detailIndex += 1;
    if (delta > 0 && detailIndex > 0) detailIndex -= 1;
    renderDetail();
  }, { passive: true });

  locationDialog.querySelector("[data-wardrobe-location-form]").addEventListener("submit", addLocation);
  locationDialog.querySelector("[data-wardrobe-location-list]").addEventListener("click", (event) => {
    const row = event.target.closest("[data-location-row]");
    if (!row) return;
    const location = locations.find((entry) => entry.id === row.dataset.locationRow);
    if (event.target.closest("[data-location-rename]")) { editingLocationId = location.id; renderLocations(); }
    if (event.target.closest("[data-location-edit-cancel]")) { editingLocationId = ""; renderLocations(); }
    if (event.target.closest("[data-location-delete]")) void removeLocation(location);
  });
  locationDialog.querySelector("[data-wardrobe-location-list]").addEventListener("submit", (event) => {
    const form = event.target.closest("[data-location-edit-form]");
    if (!form) return;
    const row = form.closest("[data-location-row]");
    const location = locations.find((entry) => entry.id === row?.dataset.locationRow);
    if (location) void updateLocation(event, location);
  });
  randomDialog.addEventListener("change", (event) => { if (event.target.closest(".wardrobe-random-filters")) drawRandom(); });
  randomDialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-random-again]")) drawRandom();
    const wear = event.target.closest("[data-random-wear]");
    if (wear) void recordWear(items.find((item) => item.id === wear.dataset.randomWear));
  });

  return {
    load,
    refresh: () => load({ force: true }),
    clear() {
      loaded = false;
      loading = false;
      items = [];
      locations = [];
      wearLogs = [];
      render();
    },
    destroy() {
      resetEditorMedia();
      [editor, detail, locationDialog, randomDialog].forEach((dialog) => dialog.remove());
    },
  };
}
