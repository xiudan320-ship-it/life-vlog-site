import {
  MOOD_META,
  MOOD_TYPES,
  buildCalendarWeeks,
  getMoodAsset,
} from "./mood-diary-domain.js";

const PICKER_POSITIONS = [
  [50, 7],
  [79, 19],
  [89, 50],
  [76, 80],
  [50, 92],
  [24, 80],
  [11, 50],
  [21, 19],
];

function createText(documentTarget, tagName, text = "", className = "") {
  const element = documentTarget.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function setHidden(element, hidden) {
  if (element) element.hidden = Boolean(hidden);
}

function createMoodAsset(documentTarget, mood, shape, { className = "", errorText = "素材暂不可用" } = {}) {
  const wrapper = documentTarget.createElement("span");
  wrapper.className = className;
  const image = documentTarget.createElement("img");
  image.src = getMoodAsset(mood, shape) || "";
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  const error = createText(documentTarget, "span", errorText, "mood-asset-error");
  error.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    error.hidden = false;
  }, { once: true });
  wrapper.append(image, error);
  return wrapper;
}

function createAvatar(documentTarget, userId, { getAuthorName, getAuthorAvatar } = {}) {
  const name = getAuthorName?.(userId) || "…";
  const avatar = documentTarget.createElement("span");
  avatar.className = "mood-author-avatar";
  const avatarUrl = getAuthorAvatar?.(userId) || "";
  if (avatarUrl) {
    const image = documentTarget.createElement("img");
    image.src = avatarUrl;
    image.alt = `${name}的头像`;
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.remove();
      avatar.textContent = [...name].slice(0, 1).join("") || "?";
    }, { once: true });
    avatar.append(image);
  } else {
    avatar.textContent = [...name].slice(0, 1).join("") || "?";
  }
  return avatar;
}

function createTag(documentTarget, tag, onRemove = null) {
  const item = createText(documentTarget, "span", `#${tag}`, "mood-tag");
  if (onRemove) {
    const remove = documentTarget.createElement("button");
    remove.type = "button";
    remove.className = "mood-tag-remove";
    remove.dataset.moodRemoveTag = tag;
    remove.setAttribute("aria-label", `移除标签 ${tag}`);
    remove.textContent = "×";
    item.append(remove);
  }
  return item;
}

function getParticipantName(participants, userId, getAuthorName) {
  const normalizedUserId = String(userId || "");
  return getAuthorName?.(userId)
    || participants.find((participant) => String(participant.userId || "") === normalizedUserId)?.name
    || "…";
}

export function createMoodDiaryView({
  elements,
  getAuthorName,
  getAuthorAvatar,
  onAction = () => {},
} = {}) {
  let bound = false;
  const els = elements || {};

  function renderLegend(state) {
    if (!els.moodCalendarLegend) return;
    const documentTarget = els.moodCalendarLegend.ownerDocument;
    const fragment = documentTarget.createDocumentFragment();
    for (const participant of state.participants || []) {
      const name = getParticipantName(state.participants || [], participant.userId, getAuthorName);
      const item = documentTarget.createElement("span");
      item.title = name;
      item.setAttribute(
        "aria-label",
        `${name}，${participant.shape === "square" ? "方形" : "圆形"}席位`,
      );
      const dot = documentTarget.createElement("i");
      dot.className = `mood-seat-dot mood-seat-dot-${participant.shape}`;
      dot.setAttribute("aria-hidden", "true");
      item.append(dot, createText(documentTarget, "span", name, "mood-seat-name"));
      fragment.append(item);
    }
    els.moodCalendarLegend.replaceChildren(fragment);
  }

  function renderCalendar(state) {
    if (!els.moodCalendarGrid || !state.currentMonthKey) return;
    const fragment = els.moodCalendarGrid.ownerDocument.createDocumentFragment();
    const weeks = buildCalendarWeeks(state.currentMonthKey);
    for (const week of weeks) {
      for (const cell of week) {
        if (!cell.isCurrentMonth) {
          const outside = createText(els.moodCalendarGrid.ownerDocument, "div", "", "mood-calendar-cell is-outside");
          outside.setAttribute("aria-hidden", "true");
          fragment.append(outside);
          continue;
        }
        const documentTarget = els.moodCalendarGrid.ownerDocument;
        const dateButton = documentTarget.createElement("button");
        dateButton.type = "button";
        dateButton.className = "mood-calendar-cell";
        dateButton.dataset.moodDate = cell.dateKey;
        const isToday = cell.dateKey === state.todayKey;
        const isFuture = state.isFutureDate?.(cell.dateKey) === true;
        if (isToday) dateButton.classList.add("is-today");
        if (isFuture) {
          dateButton.classList.add("is-future");
          dateButton.setAttribute("aria-disabled", "true");
        }
        const day = documentTarget.createElement("span");
        day.className = "mood-calendar-day";
        day.append(createText(documentTarget, "span", String(cell.day)));
        if (isToday) day.append(createText(documentTarget, "span", "今天", "mood-calendar-today-label"));
        dateButton.append(day);

        const entries = state.entriesByDate?.get(cell.dateKey) || [];
        const entriesContainer = documentTarget.createElement("span");
        entriesContainer.className = "mood-calendar-entries";
        const ariaMoods = [];
        for (const entry of entries.slice(0, 2)) {
          const participant = state.participants?.find(({ userId }) => userId === entry.user_id);
          const shape = participant?.shape || "circle";
          const meta = MOOD_META[entry.mood];
          if (!meta) continue;
          ariaMoods.push(`${getParticipantName(state.participants || [], entry.user_id, getAuthorName)}：${meta.label}`);
          const entryElement = documentTarget.createElement("span");
          entryElement.className = `mood-calendar-entry is-${shape}`;
          entryElement.append(createMoodAsset(documentTarget, entry.mood, shape));
          entryElement.append(createText(documentTarget, "span", meta.label));
          entriesContainer.append(entryElement);
        }
        if (entries.length) dateButton.append(entriesContainer);
        const dateLabel = `${cell.dateKey}${isToday ? "，今天" : ""}${ariaMoods.length ? `，${ariaMoods.join("，")}` : "，暂无记录"}`;
        dateButton.setAttribute("aria-label", dateLabel);
        fragment.append(dateButton);
      }
    }
    els.moodCalendarGrid.replaceChildren(fragment);
  }

  function renderPicker() {
    if (!els.moodPickerOrbit) return;
    const documentTarget = els.moodPickerOrbit.ownerDocument;
    const fragment = documentTarget.createDocumentFragment();
    fragment.append(createText(documentTarget, "span", "选一个最接近现在的词", "mood-picker-center"));
    MOOD_TYPES.forEach((mood, index) => {
      const choice = documentTarget.createElement("button");
      choice.type = "button";
      choice.className = "mood-picker-choice";
      choice.dataset.mood = mood;
      choice.style.setProperty("--mood-left", PICKER_POSITIONS[index][0]);
      choice.style.setProperty("--mood-top", PICKER_POSITIONS[index][1]);
      choice.setAttribute("aria-label", `选择${MOOD_META[mood].label}`);
      choice.append(createMoodAsset(documentTarget, mood, "circle"));
      choice.append(createText(documentTarget, "span", MOOD_META[mood].label));
      fragment.append(choice);
    });
    els.moodPickerOrbit.replaceChildren(fragment);
  }

  function renderEditor(state) {
    if (!els.moodEditorPanel) return;
    const documentTarget = els.moodEditorPanel.ownerDocument;
    const mood = state.selectedMood && MOOD_META[state.selectedMood] ? state.selectedMood : "";
    const selected = els.moodEditorSelected;
    selected.replaceChildren();
    if (mood) {
      selected.append(createMoodAsset(documentTarget, mood, "circle"));
      selected.append(createText(documentTarget, "strong", MOOD_META[mood].label));
      selected.style.setProperty("--mood-accent", MOOD_META[mood].accent);
    }
    if (els.moodEditorContent && document.activeElement !== els.moodEditorContent) {
      els.moodEditorContent.value = state.editorDraft?.content || "";
    }
    if (els.moodEditorTags) {
      els.moodEditorTags.replaceChildren(
        ...(state.editorDraft?.tags || []).map((tag) => createTag(documentTarget, tag, true)),
      );
    }
    if (els.moodEditorSave) {
      els.moodEditorSave.disabled = Boolean(state.saving);
      els.moodEditorSave.textContent = state.saving ? "保存中…" : "保存心情";
    }
    if (els.moodEditorCancel) els.moodEditorCancel.disabled = Boolean(state.saving);
    if (els.moodEditorError) els.moodEditorError.textContent = state.editorError || "";
  }

  function renderDetail(state) {
    if (!els.moodDetailPanel) return;
    const documentTarget = els.moodDetailPanel.ownerDocument;
    const diary = state.activeDiary;
    const participants = state.detailEntries || [];
    if (els.moodDetailPersonSwitch) {
      const switcher = participants.map((entry) => {
        const choice = documentTarget.createElement("button");
        choice.type = "button";
        choice.className = "mood-person-choice";
        choice.dataset.moodDetailUser = entry.user_id;
        choice.setAttribute("aria-pressed", String(entry.user_id === diary?.user_id));
        choice.textContent = getParticipantName(state.participants || [], entry.user_id, getAuthorName);
        return choice;
      });
      els.moodDetailPersonSwitch.replaceChildren(...switcher);
      els.moodDetailPersonSwitch.hidden = participants.length < 2;
    }
    els.moodDetailMood?.replaceChildren();
    if (!diary || !MOOD_META[diary.mood]) {
      if (els.moodDetailContent) els.moodDetailContent.textContent = "找不到这篇心情日记。";
      if (els.moodDetailActions) els.moodDetailActions.replaceChildren();
      return;
    }
    const meta = MOOD_META[diary.mood];
    const participant = state.participants?.find(({ userId }) => userId === diary.user_id);
    const shape = participant?.shape || "circle";
    const detailMood = documentTarget.createElement("div");
    detailMood.style.setProperty("--mood-accent", meta.accent);
    detailMood.append(createMoodAsset(documentTarget, diary.mood, shape));
    detailMood.append(createText(documentTarget, "strong", meta.label));
    els.moodDetailMood?.append(detailMood);
    if (els.moodDetailContent) els.moodDetailContent.textContent = diary.content || "";
    if (els.moodDetailTags) {
      els.moodDetailTags.replaceChildren(...(diary.tags || []).map((tag) => createTag(documentTarget, tag)));
    }
    if (els.moodDetailAuthor) {
      els.moodDetailAuthor.replaceChildren(
        createAvatar(documentTarget, diary.user_id, { getAuthorName, getAuthorAvatar }),
        createText(documentTarget, "span", getParticipantName(state.participants || [], diary.user_id, getAuthorName)),
      );
    }
    if (els.moodDetailActions) {
      els.moodDetailActions.replaceChildren();
      if (diary.user_id === state.currentUserId) {
        const edit = documentTarget.createElement("button");
        edit.type = "button";
        edit.className = "mood-secondary-button";
        edit.dataset.moodEdit = diary.id;
        edit.textContent = "编辑";
        const remove = documentTarget.createElement("button");
        remove.type = "button";
        remove.className = "mood-primary-button";
        remove.dataset.moodDelete = diary.id;
        remove.textContent = "删除";
        els.moodDetailActions.append(edit, remove);
      } else {
        const recordMine = documentTarget.createElement("button");
        recordMine.type = "button";
        recordMine.className = "mood-primary-button";
        recordMine.dataset.moodRecordDate = diary.diary_date;
        recordMine.textContent = "记录我的心情";
        els.moodDetailActions.append(recordMine);
      }
    }
    if (els.moodDetailError) els.moodDetailError.textContent = state.detailError || "";
  }

  function renderHistory(state) {
    if (!els.moodHistoryList) return;
    const documentTarget = els.moodHistoryList.ownerDocument;
    const fragment = documentTarget.createDocumentFragment();
    for (const entry of state.listEntries || []) {
      const meta = MOOD_META[entry.mood];
      if (!meta) continue;
      const item = documentTarget.createElement("article");
      item.className = "mood-history-item";
      item.style.setProperty("--mood-accent", meta.accent);
      const participant = state.participants?.find(({ userId }) => userId === entry.user_id);
      const shape = participant?.shape || "circle";
      const [year, month, day] = entry.diary_date.split("-");
      const date = documentTarget.createElement("div");
      date.className = "mood-history-date";
      date.append(createText(documentTarget, "strong", day), createText(documentTarget, "span", `${year}.${month}`));
      const accent = createText(documentTarget, "span", "", "mood-history-accent");
      const body = documentTarget.createElement("div");
      body.className = "mood-history-body";
      const mood = documentTarget.createElement("div");
      mood.className = "mood-history-mood";
      mood.append(createMoodAsset(documentTarget, entry.mood, shape));
      mood.append(createText(documentTarget, "strong", meta.label));
      body.append(mood, createText(documentTarget, "p", entry.content || "", "mood-history-content"));
      const tags = documentTarget.createElement("div");
      tags.className = "mood-detail-tags";
      tags.append(...(entry.tags || []).map((tag) => createTag(documentTarget, tag)));
      if (entry.tags?.length) body.append(tags);
      const metaRow = documentTarget.createElement("div");
      metaRow.className = "mood-history-meta";
      metaRow.append(createAvatar(documentTarget, entry.user_id, { getAuthorName, getAuthorAvatar }));
      metaRow.append(createText(documentTarget, "span", getParticipantName(state.participants || [], entry.user_id, getAuthorName)));
      const detail = documentTarget.createElement("button");
      detail.type = "button";
      detail.className = "mood-secondary-button";
      detail.dataset.moodHistoryId = entry.id;
      detail.textContent = "查看";
      metaRow.append(detail);
      body.append(metaRow);
      item.append(date, accent, body);
      fragment.append(item);
    }
    els.moodHistoryList.replaceChildren(fragment);
    if (els.moodHistoryEmpty) els.moodHistoryEmpty.hidden = Boolean(state.loadingList || state.listEntries?.length);
    if (els.moodHistoryLoadMore) {
      els.moodHistoryLoadMore.hidden = !state.listHasMore;
      els.moodHistoryLoadMore.disabled = Boolean(state.loadingList);
      els.moodHistoryLoadMore.textContent = state.loadingList ? "加载中…" : "加载更早的日记";
    }
  }

  function render(state) {
    const signedIn = Boolean(state.currentUserId);
    const isList = state.activeView === "list";
    const overlayOpen = ["picker", "editor", "detail"].includes(state.activeView);
    setHidden(els.moodLoginState, signedIn);
    setHidden(els.moodFamilyState, !signedIn || state.hasFamily);
    if (els.moodDiaryLede) {
      els.moodDiaryLede.textContent = state.familyMemberCount > 2
        ? "心情日记当前支持两位家庭成员"
        : "把今天的心情，留给未来的自己。";
    }
    setHidden(els.moodCalendarView, !signedIn || isList);
    setHidden(els.moodListView, !signedIn || !isList);
    setHidden(els.moodFab, !signedIn || isList);
    renderLegend(state);
    if (!signedIn) {
      setHidden(els.moodOverlay, true);
      setHidden(els.moodListOpen, true);
      if (els.moodDiaryStatus) els.moodDiaryStatus.textContent = "";
      return;
    }
    if (els.moodDiaryStatus) {
      els.moodDiaryStatus.textContent = state.statusMessage || "";
      els.moodDiaryStatus.dataset.kind = state.statusKind || "";
    }
    if (els.moodMonthLabel) {
      const [year, month] = state.currentMonthKey.split("-");
      els.moodMonthLabel.textContent = `${year} 年 ${Number(month)} 月`;
    }
    if (els.moodMonthSubLabel) els.moodMonthSubLabel.textContent = state.currentMonthKey === state.todayMonthKey ? "本月" : "浏览月份";
    renderCalendar(state);
    renderHistory(state);
    renderPicker();
    renderEditor(state);
    renderDetail(state);
    setHidden(els.moodOverlay, !overlayOpen);
    setHidden(els.moodPickerPanel, state.activeView !== "picker");
    setHidden(els.moodEditorPanel, state.activeView !== "editor");
    setHidden(els.moodDetailPanel, state.activeView !== "detail");
  }

  function readEditorDraft() {
    return {
      content: String(els.moodEditorContent?.value || ""),
      tagInput: String(els.moodEditorTagInput?.value || ""),
    };
  }

  function clearTagInput() {
    if (els.moodEditorTagInput) els.moodEditorTagInput.value = "";
  }

  function bind() {
    if (bound || !els.moodPage) return;
    bound = true;
    els.moodPage.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-mood-date], [data-mood], [data-mood-close-overlay], [data-mood-open-family-settings], #moodOverlayClose, #moodListOpen, #moodCalendarOpen, #moodFab, #moodMonthPrevious, #moodMonthNext, #moodHistoryLoadMore, [data-mood-history-id], [data-mood-edit], [data-mood-delete], [data-mood-detail-user], [data-mood-record-date], [data-mood-remove-tag]");
      if (!target || !els.moodPage.contains(target)) return;
      if (target.dataset.moodDate) return onAction({ type: "date", dateKey: target.dataset.moodDate });
      if (target.dataset.mood) return onAction({ type: "pick-mood", mood: target.dataset.mood });
      if (target.dataset.moodCloseOverlay !== undefined || target.id === "moodOverlayClose") return onAction({ type: "close-overlay" });
      if (target.dataset.moodOpenFamilySettings !== undefined) return onAction({ type: "open-family-settings" });
      if (target.id === "moodListOpen") return onAction({ type: "open-list" });
      if (target.id === "moodCalendarOpen") return onAction({ type: "open-calendar" });
      if (target.id === "moodFab") return onAction({ type: "open-today" });
      if (target.id === "moodMonthPrevious") return onAction({ type: "previous-month" });
      if (target.id === "moodMonthNext") return onAction({ type: "next-month" });
      if (target.id === "moodHistoryLoadMore") return onAction({ type: "load-more" });
      if (target.dataset.moodHistoryId) return onAction({ type: "history-detail", id: target.dataset.moodHistoryId });
      if (target.dataset.moodEdit) return onAction({ type: "edit", id: target.dataset.moodEdit });
      if (target.dataset.moodDelete) return onAction({ type: "delete", id: target.dataset.moodDelete });
      if (target.dataset.moodDetailUser) return onAction({ type: "detail-user", userId: target.dataset.moodDetailUser });
      if (target.dataset.moodRecordDate) return onAction({ type: "record-date", dateKey: target.dataset.moodRecordDate });
      if (target.dataset.moodRemoveTag) return onAction({ type: "remove-tag", tag: target.dataset.moodRemoveTag });
    });
    els.moodEditorForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      onAction({ type: "save" });
    });
    els.moodEditorTagInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== "," && event.key !== "，") return;
      event.preventDefault();
      onAction({ type: "add-tag", value: event.currentTarget.value });
    });
    els.moodPage.addEventListener("keydown", (event) => {
      if (event.key === "Escape") onAction({ type: "close-overlay" });
      if (event.key !== "Tab" || els.moodOverlay?.hidden) return;
      const focusable = [...els.moodOverlay.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled])")]
        .filter((element) => !element.closest("[hidden]"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  return Object.freeze({ bind, render, readEditorDraft, clearTagInput });
}
