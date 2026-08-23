import { renderGratitudeNotesView } from "./gratitude-view.js";

export function createGratitudeController({
  elements,
  storageKey,
  allowedColors,
  defaultColor,
  repository,
  getSession,
  getDatabase,
  getNotes,
  getProfileColor,
  setProfileColor,
  isCloudAvailable,
  setCloudAvailable,
  getAuthorName,
  canManageItem,
  loadNotes,
  awardExperience,
  isMissingCloudSchema,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
}) {
  let editingId = null;

  function normalizeColor(color) {
    return allowedColors.has(color) ? color : defaultColor;
  }

  function getColorStorageKey(userId = getSession()?.user?.id || "guest") {
    return `${storageKey}:${userId}`;
  }

  function loadColor(userId = getSession()?.user?.id || "guest") {
    const stored =
      localStorage.getItem(getColorStorageKey(userId)) ||
      localStorage.getItem(storageKey);
    return normalizeColor(stored);
  }

  function saveColor(color, { userId = getSession()?.user?.id || "guest", syncCloud = false } = {}) {
    const safeColor = normalizeColor(color);
    localStorage.setItem(getColorStorageKey(userId), safeColor);
    localStorage.setItem(storageKey, safeColor);
    if (getSession()?.user?.id === userId) setProfileColor(safeColor);
    if (syncCloud) void persistColor(safeColor);
    return safeColor;
  }

  async function persistColor(color) {
    const session = getSession();
    if (!getDatabase() || !session || !isCloudAvailable()) return;
    const safeColor = normalizeColor(color);
    const { error } = await repository.update(
      "user_profiles",
      {
        preferred_thanks_color: safeColor,
        updated_at: new Date().toISOString(),
      },
      { user_id: session.user.id }
    );
    if (error) {
      setCloudAvailable(false);
      console.warn("Thanks color preference sync failed:", error);
    }
  }

  function getSelectedColor() {
    const selected = elements.thanksForm.querySelector('input[name="thanksColor"]:checked');
    return normalizeColor(selected?.value);
  }

  function setSelectedColor(color) {
    const safeColor = normalizeColor(color);
    elements.thanksForm.querySelectorAll('input[name="thanksColor"]').forEach((input) => {
      input.checked = input.value === safeColor;
      input.closest("label")?.classList.toggle("active", input.checked);
    });
  }

  function resetForm() {
    editingId = null;
    elements.thanksForm.reset();
    setSelectedColor(getProfileColor() || loadColor());
    elements.thanksSubmitButton.textContent = "贴到留言板";
    elements.thanksCancelEdit.hidden = true;
    elements.thanksStatus.textContent = "";
  }

  function render() {
    renderGratitudeNotesView({
      boardElement: elements.thanksBoard,
      notes: getNotes(),
      signedIn: Boolean(getSession()),
      allowedColors,
      getAuthorName,
      canManageItem,
      onEdit: edit,
      onDelete: remove,
    });
  }

  async function submit(event) {
    event.preventDefault();
    const session = getSession();
    if (!getDatabase() || !session) return;
    const body = elements.thanksBodyInput.value.trim();
    if (!body) return;
    const selectedColor = getSelectedColor();
    const previousNote = getNotes().find((item) => item.id === editingId);
    const wasEditing = Boolean(editingId);
    saveColor(selectedColor, { userId: session.user.id, syncCloud: true });

    const payload = {
      user_id: previousNote?.user_id || session.user.id,
      body,
      text_color: selectedColor,
      updated_at: new Date().toISOString(),
    };
    elements.thanksStatus.textContent = "正在保存...";
    const { error } = editingId
      ? await repository.updateOwned("gratitude_notes", payload, { id: editingId })
      : await repository.insert("gratitude_notes", payload);
    if (error) {
      elements.thanksStatus.textContent = isMissingCloudSchema(error)
        ? "请先部署最新版 Cloudflare D1 结构。"
        : `保存失败：${error.message}`;
      return;
    }

    resetForm();
    await loadNotes();
    const gainedExp = await awardExperience(wasEditing ? "thanksEdit" : "thanks");
    elements.thanksStatus.textContent = `${wasEditing ? "留言已更新。" : "留言已保存。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`;
  }

  function edit(id) {
    const note = getNotes().find((item) => item.id === id);
    if (!note || !canManageItem(note)) return;
    editingId = id;
    elements.thanksBodyInput.value = note.body;
    setSelectedColor(note.text_color);
    elements.thanksSubmitButton.textContent = "保存修改";
    elements.thanksCancelEdit.hidden = false;
    elements.thanksBodyInput.focus();
  }

  async function remove(id) {
    const note = getNotes().find((item) => item.id === id);
    if (!note || !canManageItem(note)) return;
    const confirmed = await confirmAction({
      eyebrow: "移到回收站",
      title: "删除这条感谢留言？",
      message: "留言会保留 30 天，期间可以恢复。",
      confirmLabel: "删除留言",
      cancelLabel: "先保留",
      danger: true,
    });
    if (!confirmed) return;
    const trashSaved = await createTrashItem("gratitude", note.id, note.body, note);
    if (!trashSaved) {
      elements.thanksStatus.textContent = "无法写入回收站，已取消删除。";
      return;
    }
    const { error } = await repository.remove("gratitude_notes", { id });
    if (error) {
      await rollbackTrashItem(trashSaved);
      elements.thanksStatus.textContent = `删除失败：${error.message}`;
      return;
    }
    if (editingId === id) resetForm();
    await loadNotes();
  }

  return {
    edit,
    getColorStorageKey,
    getSelectedColor,
    loadColor,
    normalizeColor,
    persistColor,
    remove,
    render,
    resetForm,
    saveColor,
    setSelectedColor,
    submit,
  };
}
