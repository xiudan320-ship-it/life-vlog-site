import { renderRecipesView } from "./recipe-view.js";
import { recipeFromCloudRow, recipeToCloudRow } from "./cloud-models.js";

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createRecipeController({
  elements,
  storageKey,
  repository,
  getSession,
  getDisplayName,
  getRecipes,
  setRecipes,
  canSync,
  getAuthorName,
  canManageItem,
  normalizeUuid,
  getClipboardFiles,
  getClipboardImageUrl,
  copyUrlToR2,
  compressImage,
  uploadToR2,
  slugify,
  awardExperience,
  renderFoodWheel,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
}) {
  let editingId = null;
  let existingCover = "";
  let coverLink = "";
  let coverPreviewUrl = "";
  let isSubmitting = false;
  let submitSequence = 0;
  let submitLabel = "保存菜谱";

  function getStorageKey() {
    const name = getSession() ? getDisplayName() : "guest";
    return `${storageKey}:${String(name).toLowerCase()}`;
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
    localStorage.setItem(getStorageKey(), JSON.stringify(getRecipes()));
  }

  function setExpanded(expanded) {
    elements.recipeComposer.classList.toggle("expanded", expanded);
    elements.recipeForm.hidden = !expanded;
    elements.recipeToggle.setAttribute("aria-expanded", String(expanded));
  }

  function getSelectedSeasonings() {
    return Array.from(document.querySelectorAll('input[name="recipeSeasoning"]:checked')).map(
      (input) => input.value
    );
  }

  function setSelectedSeasonings(values = []) {
    const selected = new Set(values);
    document.querySelectorAll('input[name="recipeSeasoning"]').forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function setStatus(message) {
    if (elements.recipeStatus) elements.recipeStatus.textContent = message;
    if (elements.recipeFormStatus) elements.recipeFormStatus.textContent = message;
  }

  async function compressCover(file) {
    const compressed = await compressImage(file, {
      maxSide: 1200,
      jpeg: 0.82,
      minJpeg: 0.62,
      targetBytes: 360_000,
      rotatePortrait: true,
    });
    const uploaded = await uploadToR2(
      compressed.blob,
      slugify(file.name || "recipe-cover"),
      "recipes"
    );
    return uploaded.url;
  }

  async function getCoverForSave() {
    const file = elements.recipeCoverInput.files?.[0];
    if (!file && coverLink) {
      setStatus("正在把封面链接复制到 R2…");
      const copied = await copyUrlToR2(
        coverLink,
        `${slugify(elements.recipeNameInput.value || "recipe-cover")}-link`,
        "recipes"
      );
      coverLink = "";
      return copied.url;
    }
    if (!file) return existingCover;
    return compressCover(file);
  }

  function updateCoverPreview() {
    const file = elements.recipeCoverInput.files?.[0];
    if (!file) {
      if (!existingCover) clearCoverPreview();
      return;
    }
    coverLink = "";
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    coverPreviewUrl = URL.createObjectURL(file);
    elements.recipeCoverPreview.src = coverPreviewUrl;
    elements.recipeCoverPreview.hidden = false;
    elements.recipeCoverName.textContent = file.name;
  }

  function setCoverPreview(src, name = "已保留原封面") {
    clearCoverPreview();
    if (!src) return;
    elements.recipeCoverPreview.src = src;
    elements.recipeCoverPreview.hidden = false;
    elements.recipeCoverName.textContent = name;
  }

  function clearCoverPreview() {
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      coverPreviewUrl = "";
    }
    elements.recipeCoverPreview.removeAttribute("src");
    elements.recipeCoverPreview.hidden = true;
    elements.recipeCoverName.textContent = "还没有选择封面";
  }

  function applyCoverUrl(rawUrl) {
    const url = String(rawUrl || "").trim();
    if (!url) return false;
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      coverLink = parsed.href;
      elements.recipeCoverInput.value = "";
      setCoverPreview(parsed.href, "已从剪贴板导入图片链接");
      if (elements.recipeCoverLinkInput) elements.recipeCoverLinkInput.value = "";
      setStatus("已添加图片链接，保存时会复制到 R2。");
      return true;
    } catch {
      setStatus("剪贴板里的图片链接格式不正确。");
      return false;
    }
  }

  function handleCoverPaste(event) {
    const files = getClipboardFiles(event, "recipe-cover-pasted");
    if (files.length) {
      event.preventDefault();
      const transfer = new DataTransfer();
      transfer.items.add(files[0]);
      elements.recipeCoverInput.files = transfer.files;
      existingCover = "";
      coverLink = "";
      updateCoverPreview();
      setStatus("已读取剪贴板图片。");
      return;
    }
    const pastedUrl = getClipboardImageUrl(event.clipboardData);
    if (applyCoverUrl(pastedUrl)) event.preventDefault();
  }

  function resetForm() {
    elements.recipeForm.reset();
    editingId = null;
    existingCover = "";
    coverLink = "";
    clearCoverPreview();
    setSelectedSeasonings([]);
    elements.recipeFormTitle.textContent = "添加菜谱";
    submitLabel = "保存菜谱";
    elements.recipeSubmitButton.textContent = submitLabel;
    elements.recipeCancelEdit.hidden = true;
  }

  async function submit(event) {
    if (isSubmitting) {
      event.preventDefault();
      setStatus("正在保存，先别重复提交。");
      return;
    }
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setStatus("请先登录后再保存菜谱。");
      return;
    }
    if (!canSync()) {
      setStatus("Cloudflare D1 尚未升级，菜谱没有保存。请先部署最新版数据库结构。");
      return;
    }
    const name = elements.recipeNameInput.value.trim();
    if (!name) {
      setStatus("先写一个菜名。");
      return;
    }

    const submitUserId = String(session.user.id || "");
    const submitEditingId = editingId;
    const operationId = ++submitSequence;
    const isCurrentOperation = () => operationId === submitSequence && String(getSession()?.user?.id || "") === submitUserId;
    isSubmitting = true;
    setSubmitting(true);
    setStatus("正在保存菜谱…");
    try {
      const coverImage = await getCoverForSave();
      if (!isCurrentOperation() || editingId !== submitEditingId) return;
      const recipes = getRecipes();
      const previous = recipes.find((item) => item.id === submitEditingId);
      let recipe = {
        id: normalizeUuid(submitEditingId),
        userId: previous?.userId || submitUserId,
        name,
        category: elements.recipeCategoryInput.value,
        time: elements.recipeTimeInput.value.trim(),
        servings: elements.recipeServingsInput.value.trim(),
        coverImage,
        seasonings: getSelectedSeasonings(),
        ingredients: splitLines(elements.recipeIngredientsInput.value),
        steps: splitLines(elements.recipeStepsInput.value),
        note: elements.recipeNoteInput.value.trim(),
        createdAt: previous?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const wasEditing = Boolean(submitEditingId);
      const { data, error } = await repository.upsert(
        "recipes",
        recipeToCloudRow(recipe, recipe.userId),
        { select: "*", single: true }
      );
      if (!isCurrentOperation()) return;
      if (error) throw new Error(`菜谱同步失败：${error.message}`);
      recipe = recipeFromCloudRow(data);
      setRecipes(
        wasEditing
          ? recipes.map((item) => (item.id === submitEditingId ? recipe : item))
          : [recipe, ...recipes]
      );
      save();
      resetForm();
      setExpanded(false);
      const successMessage = wasEditing ? "菜谱已更新。" : "菜谱已保存。";
      setStatus(successMessage);
      render(recipe.id);
      try {
        const gainedExp = await awardExperience(wasEditing ? "recipeEdit" : "recipe");
        if (isCurrentOperation()) setStatus(`${successMessage}${gainedExp ? ` 修为 +${gainedExp}` : ""}`);
      } catch {
        if (isCurrentOperation()) setStatus(`${successMessage} 修为奖励稍后补发。`);
      }
    } catch (error) {
      if (isCurrentOperation()) setStatus(error.message || "保存菜谱失败，请重试。");
    } finally {
      if (operationId === submitSequence) {
        isSubmitting = false;
        setSubmitting(false);
      }
    }
  }

  function setSubmitting(value) {
    const submitting = Boolean(value);
    elements.recipeForm?.setAttribute("aria-busy", String(submitting));
    elements.recipeSubmitButton.disabled = submitting;
    elements.recipeSubmitButton.textContent = submitting ? "保存中…" : submitLabel;
  }

  /*
   * The submit handler above owns the complete write transaction. Keeping the
   * cover upload inside that transaction means a failed cover never reaches
   * the recipe upsert with a silently reused URL.
   */

  function render(updatedId = "") {
    renderFoodWheel();
    if (!getSession()) setStatus("");
    renderRecipesView({
      listElement: elements.recipesList,
      recipes: getRecipes(),
      signedIn: Boolean(getSession()),
      getAuthorName,
      canManageItem,
      onEdit: edit,
      onDelete: remove,
      updatedId,
    });
  }

  function edit(id) {
    const recipe = getRecipes().find((item) => item.id === id);
    if (!recipe || !canManageItem(recipe)) return;
    editingId = id;
    existingCover = recipe.coverImage || "";
    coverLink = "";
    elements.recipeNameInput.value = recipe.name || "";
    elements.recipeCategoryInput.value = recipe.category || "家常菜";
    elements.recipeTimeInput.value = recipe.time || "";
    elements.recipeServingsInput.value = recipe.servings || "";
    elements.recipeIngredientsInput.value = (recipe.ingredients || []).join("\n");
    elements.recipeStepsInput.value = (recipe.steps || []).join("\n");
    elements.recipeNoteInput.value = recipe.note || "";
    setSelectedSeasonings(recipe.seasonings || []);
    setCoverPreview(existingCover);
    elements.recipeFormTitle.textContent = "编辑菜谱";
    submitLabel = "保存修改";
    elements.recipeSubmitButton.textContent = submitLabel;
    elements.recipeCancelEdit.hidden = false;
    setExpanded(true);
    setStatus(`正在编辑：${recipe.name}`);
    elements.recipeComposer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function remove(id) {
    const session = getSession();
    const recipe = getRecipes().find((item) => item.id === id);
    if (!session || !recipe || !canManageItem(recipe)) return;
    const confirmed = await confirmAction({
      eyebrow: "移到回收站",
      title: "删除这个菜谱？",
      message: `“${recipe.name}”会保留 30 天，期间可以恢复。`,
      confirmLabel: "删除菜谱",
      cancelLabel: "先保留",
      danger: true,
    });
    if (!confirmed) return;
    if (!canSync()) {
      setStatus("数据库尚未连接，不能删除菜谱。");
      return;
    }
    const trashSaved = await createTrashItem(
      "recipe",
      recipe.id,
      recipe.name,
      recipeToCloudRow(recipe, recipe.userId || session.user.id)
    );
    if (!trashSaved) {
      setStatus("无法写入回收站，已取消删除。");
      return;
    }
    const { error } = await repository.remove("recipes", { id });
    if (error) {
      await rollbackTrashItem(trashSaved);
      setStatus(`删除同步失败：${error.message}`);
      return;
    }
    setRecipes(getRecipes().filter((item) => item.id !== id));
    save();
    setStatus("菜谱已移到回收站，30 天内可以恢复。");
    render();
  }

  return {
    applyCoverUrl,
    edit,
    handleCoverPaste,
    load,
    remove,
    render,
    resetForm,
    save,
    setExpanded,
    setStatus,
    submit,
    updateCoverPreview,
    isSubmitting: () => isSubmitting,
  };
}
