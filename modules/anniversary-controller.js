import { renderAnniversariesView } from "./anniversary-view.js";
import {
  anniversaryFromCloudRow,
  anniversaryToCloudRow,
} from "./cloud-models.js";

export function createAnniversaryController({
  elements,
  storageKey,
  repository,
  getSession,
  getDatabase,
  getItems,
  setItems,
  isCloudAvailable,
  setCloudAvailable,
  getAuthorName,
  canManageItem,
  normalizeUuid,
  awardExperience,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
  isMissingCloudSchema,
}) {
  let editingId = null;

  function getStorageKey() {
    const userId = getSession()?.user?.id || "guest";
    return `${storageKey}:${String(userId).toLowerCase()}`;
  }

  function load() {
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((item) => item?.date) : [];
    } catch {
      return [];
    }
  }

  function save() {
    if (!getSession()) return;
    localStorage.setItem(getStorageKey(), JSON.stringify(getItems()));
  }

  function render() {
    renderAnniversariesView({
      listElement: elements.anniversaryList,
      peekElement: elements.anniversaryPeek,
      items: getItems(),
      signedIn: Boolean(getSession()),
      getAuthorName,
      canManageItem,
      onEdit: edit,
      onDelete: remove,
    });
  }

  function setFormExpanded(expanded) {
    elements.anniversaryForm.hidden = !expanded;
    elements.anniversaryAdd.setAttribute("aria-expanded", String(expanded));
    elements.anniversaryAdd.textContent = expanded ? "收起编辑器" : "添加纪念日";
  }

  function resetForm() {
    elements.anniversaryForm.reset();
    editingId = null;
    elements.anniversarySubmit.textContent = "保存";
    elements.anniversaryStatus.textContent = "";
  }

  function edit(id) {
    const item = getItems().find((entry) => entry.id === id);
    if (!item || !canManageItem(item)) return;
    editingId = id;
    elements.anniversaryTitleInput.value = item.title || "";
    elements.anniversaryTypeInput.value = item.type || "annual";
    elements.anniversaryDateInput.value = item.date || "";
    elements.anniversaryNoteInput.value = item.note || "";
    elements.anniversarySubmit.textContent = "保存修改";
    setFormExpanded(true);
    elements.anniversaryTitleInput.focus();
  }

  async function submit(event) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    if (!isCloudAvailable()) {
      elements.anniversaryStatus.textContent =
        "Cloudflare D1 尚未升级，纪念日没有保存。请先部署最新版数据库结构。";
      return;
    }
    const title = elements.anniversaryTitleInput.value.trim();
    const date = elements.anniversaryDateInput.value;
    if (!title || !date) {
      elements.anniversaryStatus.textContent = "请填写名称和日期。";
      return;
    }

    const items = getItems();
    const previous = items.find((item) => item.id === editingId);
    let item = {
      id: normalizeUuid(editingId),
      userId: previous?.userId || session.user.id,
      title,
      type: elements.anniversaryTypeInput.value,
      date,
      note: elements.anniversaryNoteInput.value.trim(),
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await repository.upsert(
      "anniversaries",
      anniversaryToCloudRow(item, item.userId),
      { onConflict: "id", select: "*", single: true }
    );
    if (error) {
      elements.anniversaryStatus.textContent = `同步失败：${error.message}`;
      return;
    }
    item = anniversaryFromCloudRow(data);

    setItems(
      previous
        ? items.map((entry) => (entry.id === editingId ? item : entry))
        : [item, ...items]
    );
    save();
    resetForm();
    setFormExpanded(false);
    const gainedExp = await awardExperience(previous ? "anniversaryEdit" : "anniversary");
    elements.anniversaryStatus.textContent = `${previous ? "纪念日已更新。" : "纪念日已保存。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`;
    render();
  }

  async function remove(id) {
    const session = getSession();
    const item = getItems().find((entry) => entry.id === id);
    if (!session || !item || !canManageItem(item)) return;
    const confirmed = await confirmAction({
      eyebrow: "移到回收站",
      title: "删除这个纪念日？",
      message: `“${item.title}”会保留 30 天，期间可以恢复。`,
      confirmLabel: "删除纪念日",
      cancelLabel: "先保留",
      danger: true,
    });
    if (!confirmed) return;
    if (!isCloudAvailable()) {
      elements.anniversaryStatus.textContent = "数据库尚未连接，不能删除纪念日。";
      return;
    }
    const trashSaved = await createTrashItem(
      "anniversary",
      item.id,
      item.title,
      anniversaryToCloudRow(item, item.userId || session.user.id)
    );
    if (!trashSaved) {
      elements.anniversaryStatus.textContent = "无法写入回收站，已取消删除。";
      return;
    }
    const { error } = await repository.remove("anniversaries", { id });
    if (error) {
      await rollbackTrashItem(trashSaved);
      elements.anniversaryStatus.textContent = `删除失败：${error.message}`;
      return;
    }
    setItems(getItems().filter((entry) => entry.id !== id));
    save();
    elements.anniversaryStatus.textContent = "纪念日已删除。";
    render();
  }

  async function synchronize(userId = getSession()?.user?.id) {
    if (!getDatabase() || !getSession() || !userId) return;
    try {
      const { data, error } = await repository.list("anniversaries", {
        order: [{ column: "created_at", ascending: true }],
      });
      if (error) throw error;
      setCloudAvailable(true);
      setItems((data || []).map(anniversaryFromCloudRow));
      save();
      render();
    } catch (error) {
      setCloudAvailable(false);
      setItems(load());
      render();
      elements.anniversaryStatus.textContent = isMissingCloudSchema(error)
        ? "纪念日云表尚未初始化，当前先保存在此浏览器。"
        : `纪念日同步失败：${error.message || "请稍后重试"}`;
    }
  }

  return {
    edit,
    load,
    remove,
    render,
    resetForm,
    save,
    setFormExpanded,
    submit,
    synchronize,
  };
}
