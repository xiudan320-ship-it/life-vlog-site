const PICKER_POSITIONS = [[50, 7], [79, 19], [89, 50], [76, 80], [50, 92], [24, 80], [11, 50], [21, 19]];

function text(documentTarget, tagName, value = "", className = "") {
  const element = documentTarget.createElement(tagName);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function asset(documentTarget, mood, shape, getMoodAsset) {
  const wrapper = text(documentTarget, "span", "", "mood-entry-asset");
  const image = documentTarget.createElement("img");
  image.src = getMoodAsset(mood, shape) || "";
  image.alt = "";
  image.decoding = "async";
  const error = text(documentTarget, "span", "素材暂不可用", "mood-asset-error");
  error.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    error.hidden = false;
  }, { once: true });
  wrapper.append(image, error);
  return wrapper;
}

function tag(documentTarget, value, removable = false) {
  const item = text(documentTarget, "span", `#${value}`, "mood-tag");
  if (removable) {
    const remove = text(documentTarget, "button", "×", "mood-tag-remove");
    remove.type = "button";
    remove.dataset.moodRemoveTag = value;
    remove.setAttribute("aria-label", `移除标签 ${value}`);
    item.append(remove);
  }
  return item;
}

export function createMoodEntryOverlayView({ elements = {}, moodMeta, moodTypes, getMoodAsset, getAuthorName, getAuthorAvatar, onAction = () => {} } = {}) {
  let bound = false;

  function participantName(state, userId) {
    return getAuthorName?.(userId)
      || state.participants.find((participant) => participant.userId === userId)?.name
      || "…";
  }

  function renderPicker() {
    if (!elements.moodPickerOrbit || elements.moodPickerOrbit.childElementCount) return;
    const documentTarget = elements.moodPickerOrbit.ownerDocument;
    const fragment = documentTarget.createDocumentFragment();
    fragment.append(text(documentTarget, "span", "选一个最接近现在的词", "mood-picker-center"));
    moodTypes.forEach((mood, index) => {
      const choice = documentTarget.createElement("button");
      choice.type = "button";
      choice.className = "mood-picker-choice";
      choice.dataset.mood = mood;
      choice.style.setProperty("--mood-left", PICKER_POSITIONS[index][0]);
      choice.style.setProperty("--mood-top", PICKER_POSITIONS[index][1]);
      choice.setAttribute("aria-label", `选择${moodMeta[mood].label}`);
      choice.append(asset(documentTarget, mood, "circle", getMoodAsset), text(documentTarget, "span", moodMeta[mood].label));
      fragment.append(choice);
    });
    elements.moodPickerOrbit.replaceChildren(fragment);
  }

  function renderEditor(state) {
    const documentTarget = elements.moodOverlay.ownerDocument;
    elements.moodEditorSelected?.replaceChildren();
    if (state.selectedMood && moodMeta[state.selectedMood]) {
      elements.moodEditorSelected.append(asset(documentTarget, state.selectedMood, "circle", getMoodAsset), text(documentTarget, "strong", moodMeta[state.selectedMood].label));
      elements.moodEditorSelected.style.setProperty("--mood-accent", moodMeta[state.selectedMood].accent);
    }
    if (elements.moodEditorContent && documentTarget.activeElement !== elements.moodEditorContent) {
      elements.moodEditorContent.value = state.editorDraft.content;
    }
    elements.moodEditorTags?.replaceChildren(...state.editorDraft.tags.map((value) => tag(documentTarget, value, true)));
    if (elements.moodEditorSave) {
      elements.moodEditorSave.disabled = state.saving;
      elements.moodEditorSave.textContent = state.saving ? "保存中…" : "保存心情";
    }
    if (elements.moodEditorCancel) elements.moodEditorCancel.disabled = state.saving;
    if (elements.moodEditorError) elements.moodEditorError.textContent = state.error;
  }

  function renderDetail(state) {
    const documentTarget = elements.moodOverlay.ownerDocument;
    const diary = state.activeDiary;
    const choices = state.entries.map((entry) => {
      const choice = text(documentTarget, "button", participantName(state, entry.user_id), "mood-person-choice");
      choice.type = "button";
      choice.dataset.moodDetailUser = entry.user_id;
      choice.setAttribute("aria-pressed", String(entry.user_id === diary?.user_id));
      return choice;
    });
    elements.moodDetailPersonSwitch?.replaceChildren(...choices);
    if (elements.moodDetailPersonSwitch) elements.moodDetailPersonSwitch.hidden = choices.length < 2;
    elements.moodDetailMood?.replaceChildren();
    elements.moodDetailTags?.replaceChildren();
    elements.moodDetailAuthor?.replaceChildren();
    elements.moodDetailActions?.replaceChildren();
    if (!diary || !moodMeta[diary.mood]) return;
    const participant = state.participants.find(({ userId }) => userId === diary.user_id);
    const mood = documentTarget.createElement("div");
    mood.style.setProperty("--mood-accent", moodMeta[diary.mood].accent);
    mood.append(asset(documentTarget, diary.mood, participant?.shape || "circle", getMoodAsset), text(documentTarget, "strong", moodMeta[diary.mood].label));
    elements.moodDetailMood?.append(mood);
    if (elements.moodDetailContent) elements.moodDetailContent.textContent = diary.content || "";
    elements.moodDetailTags?.append(...(diary.tags || []).map((value) => tag(documentTarget, value)));
    const avatar = text(documentTarget, "span", "", "mood-author-avatar");
    const name = participantName(state, diary.user_id);
    const avatarUrl = getAuthorAvatar?.(diary.user_id) || "";
    if (avatarUrl) {
      const image = documentTarget.createElement("img");
      image.src = avatarUrl;
      image.alt = `${name}的头像`;
      avatar.append(image);
    } else avatar.textContent = [...name][0] || "?";
    elements.moodDetailAuthor?.append(avatar, text(documentTarget, "span", name));
    if (diary.user_id === state.currentUserId) {
      const edit = text(documentTarget, "button", "编辑", "mood-secondary-button");
      edit.type = "button";
      edit.dataset.moodEdit = diary.id;
      const remove = text(documentTarget, "button", "删除", "mood-primary-button");
      remove.type = "button";
      remove.dataset.moodDelete = diary.id;
      elements.moodDetailActions?.append(edit, remove);
    } else if (!state.entries.some((entry) => entry.user_id === state.currentUserId)) {
      const record = text(documentTarget, "button", "记录我的心情", "mood-primary-button");
      record.type = "button";
      record.dataset.moodRecordDate = diary.diary_date;
      elements.moodDetailActions?.append(record);
    }
    if (elements.moodDetailError) elements.moodDetailError.textContent = state.error;
  }

  function render(state) {
    const open = ["picker", "editor", "detail"].includes(state.mode);
    elements.moodOverlay.hidden = !open;
    elements.moodPickerPanel.hidden = state.mode !== "picker";
    elements.moodEditorPanel.hidden = state.mode !== "editor";
    elements.moodDetailPanel.hidden = state.mode !== "detail";
    if (!open) return;
    renderPicker();
    renderEditor(state);
    renderDetail(state);
  }

  function readDraft() {
    return { content: String(elements.moodEditorContent?.value || ""), tagInput: String(elements.moodEditorTagInput?.value || "") };
  }

  function bind() {
    if (bound || !elements.moodOverlay) return;
    bound = true;
    elements.moodOverlay.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-mood], [data-mood-close-overlay], #moodOverlayClose, [data-mood-edit], [data-mood-delete], [data-mood-detail-user], [data-mood-record-date], [data-mood-remove-tag]");
      if (!target) return;
      if (target.dataset.mood) return onAction({ type: "pick", mood: target.dataset.mood });
      if (target.dataset.moodCloseOverlay !== undefined || target.id === "moodOverlayClose") return onAction({ type: "close" });
      if (target.dataset.moodEdit) return onAction({ type: "edit", id: target.dataset.moodEdit });
      if (target.dataset.moodDelete) return onAction({ type: "delete", id: target.dataset.moodDelete });
      if (target.dataset.moodDetailUser) return onAction({ type: "detail-user", userId: target.dataset.moodDetailUser });
      if (target.dataset.moodRecordDate) return onAction({ type: "record", dateKey: target.dataset.moodRecordDate });
      if (target.dataset.moodRemoveTag) return onAction({ type: "remove-tag", tag: target.dataset.moodRemoveTag });
    });
    elements.moodEditorForm?.addEventListener("submit", (event) => { event.preventDefault(); onAction({ type: "save" }); });
    elements.moodEditorCancel?.addEventListener("click", () => onAction({ type: "cancel-editor" }));
    elements.moodEditorTagInput?.addEventListener("keydown", (event) => {
      if (!["Enter", ",", "，"].includes(event.key)) return;
      event.preventDefault();
      onAction({ type: "add-tag", value: event.currentTarget.value });
    });
    elements.moodOverlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") onAction({ type: "close" });
      if (event.key !== "Tab") return;
      const focusable = [...elements.moodOverlay.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled])")]
        .filter((element) => !element.closest("[hidden]"));
      if (!focusable.length) return;
      const [first] = focusable;
      const last = focusable.at(-1);
      if (event.shiftKey && event.target === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && event.target === last) { event.preventDefault(); first.focus(); }
    });
  }

  return Object.freeze({ bind, render, readDraft, clearTagInput: () => { if (elements.moodEditorTagInput) elements.moodEditorTagInput.value = ""; } });
}
