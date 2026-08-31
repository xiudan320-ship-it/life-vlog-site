import { createMoodEntryOverlayView } from "./mood-entry-overlay-view.js";

function normalizeEntry(entry, { normalizeDiaryDate, normalizeMood, normalizeMoodTags }) {
  const diaryDate = normalizeDiaryDate(entry?.diary_date);
  const mood = normalizeMood(entry?.mood);
  if (!entry?.id || !entry?.user_id || !diaryDate || !mood) return null;
  return { ...entry, id: String(entry.id), user_id: String(entry.user_id), diary_date: diaryDate, mood, content: String(entry.content || ""), tags: normalizeMoodTags(entry.tags) };
}

function codePointLength(value) {
  return [...String(value ?? "")].length;
}

function normalizeTagDraft(values, normalizeMoodTags) {
  const source = values.flatMap((value) => String(value ?? "").split(/[,，]/u));
  const tags = normalizeMoodTags(source, { maxTags: 100, maxLength: 1000 });
  return { tags, tooMany: tags.length > 8, tooLong: source.some((value) => codePointLength(String(value).trim().replace(/^#+/u, "").trim()) > 20) };
}

export function createMoodEntryOverlayController({
  elements,
  domain,
  repository,
  getSession = () => null,
  getFamilyMembers = () => [],
  getAuthorName,
  getAuthorAvatar,
  showToast = () => {},
  confirmAction = async () => false,
  onMutation = () => {},
  windowTarget = globalThis.window,
  view: injectedView,
} = {}) {
  const { MOOD_TYPES, MOOD_META, getMoodAsset, normalizeDiaryDate, normalizeMood, normalizeMoodTags, sortMoodDiaries } = domain;
  const state = {
    mode: "closed",
    dateKey: "",
    entries: [],
    participants: [],
    currentUserId: "",
    activeDiary: null,
    selectedMood: null,
    editorDraft: { content: "", tags: [] },
    editorBase: null,
    editorReturnMode: "detail",
    saving: false,
    deleting: false,
    error: "",
  };
  let bound = false;
  let historyOpen = false;
  let returnFocus = null;
  let returnScrollY = 0;

  function render() {
    injectedView?.render?.({ ...state, entries: state.entries.map((entry) => ({ ...entry, tags: [...entry.tags] })), editorDraft: { ...state.editorDraft, tags: [...state.editorDraft.tags] } });
  }

  function ownEntry() {
    return state.entries.find((entry) => entry.user_id === state.currentUserId) || null;
  }

  function selectDiary(userId = "") {
    state.activeDiary = state.entries.find((entry) => entry.user_id === userId)
      || ownEntry()
      || state.entries[0]
      || null;
  }

  function focusStart() {
    const target = state.mode === "picker"
      ? elements.moodPickerOrbit?.querySelector?.("button")
      : state.mode === "editor" ? elements.moodEditorContent : elements.moodDetailPanel?.querySelector?.("button") || elements.moodOverlayClose;
    windowTarget?.setTimeout?.(() => {
      try { target?.focus?.({ preventScroll: true }); } catch { target?.focus?.(); }
    }, 0);
  }

  function pushHistory() {
    if (historyOpen || !windowTarget?.history?.pushState) return;
    windowTarget.history.pushState({ ...(windowTarget.history.state || {}), moodEntryOverlay: true }, "", windowTarget.location?.href || "");
    historyOpen = true;
  }

  async function open({ dateKey, entries = null, preferredUserId = "", participants = null, trigger = null } = {}) {
    const normalizedDate = normalizeDiaryDate(dateKey);
    const currentUserId = String(getSession?.()?.user?.id || "").trim();
    if (!normalizedDate || !currentUserId) return false;
    const resolvedParticipants = Array.isArray(participants) ? participants : getFamilyMembers?.() || [];
    const visibleIds = new Set(resolvedParticipants.map((participant) => String(participant.userId || participant.user_id || "")));
    visibleIds.add(currentUserId);
    let rows = entries;
    if (!Array.isArray(rows)) rows = await repository?.listDay?.(normalizedDate);
    state.entries = sortMoodDiaries((rows || []).map((entry) => normalizeEntry(entry, { normalizeDiaryDate, normalizeMood, normalizeMoodTags })).filter((entry) => entry && entry.diary_date === normalizedDate && visibleIds.has(entry.user_id)));
    state.dateKey = normalizedDate;
    state.currentUserId = currentUserId;
    state.participants = resolvedParticipants.map((participant, index) => ({
      ...participant,
      userId: String(participant.userId || participant.user_id || ""),
      shape: participant.shape || (index === 0 ? "square" : "circle"),
    })).filter((participant) => participant.userId);
    const targetUserId = String(preferredUserId || currentUserId);
    const targetEntry = state.entries.find((entry) => entry.user_id === targetUserId);
    if (!targetEntry && targetUserId !== currentUserId) return false;
    returnFocus = trigger || elements.moodOverlay?.ownerDocument?.activeElement || null;
    returnScrollY = Number(windowTarget?.scrollY || 0);
    state.error = "";
    state.selectedMood = null;
    state.editorDraft = { content: "", tags: [] };
    state.editorBase = null;
    if (targetEntry) {
      state.activeDiary = targetEntry;
      state.mode = "detail";
    } else {
      state.activeDiary = null;
      state.mode = "picker";
    }
    pushHistory();
    render();
    focusStart();
    return true;
  }

  function beginEditor({ diary = null, mood = null, returnMode = "detail" } = {}) {
    const current = diary?.user_id === state.currentUserId ? diary : ownEntry();
    state.activeDiary = current || state.activeDiary;
    state.selectedMood = normalizeMood(mood || current?.mood);
    state.editorDraft = { content: current?.content || "", tags: [...(current?.tags || [])] };
    state.editorBase = current ? { mood: current.mood, content: current.content || "", tags: [...(current.tags || [])] } : null;
    state.editorReturnMode = returnMode;
    state.error = "";
    state.mode = "editor";
    render();
    focusStart();
  }

  function readDraft() {
    const live = injectedView?.readDraft?.() || { content: "", tagInput: "" };
    const normalized = normalizeTagDraft([...state.editorDraft.tags, live.tagInput], normalizeMoodTags);
    return { content: live.content, ...normalized };
  }

  function isDirty(draft) {
    if (!state.editorBase) return Boolean(draft.content || draft.tags.length || state.selectedMood);
    return state.editorBase.mood !== state.selectedMood || state.editorBase.content !== draft.content || JSON.stringify(state.editorBase.tags) !== JSON.stringify(draft.tags);
  }

  async function confirmLeave() {
    if (state.mode !== "editor") return true;
    const draft = readDraft();
    if (!isDirty(draft)) return true;
    return Boolean(await confirmAction({ eyebrow: "尚未保存", title: "放弃这次编辑？", message: "已经填写的内容不会被保存。", confirmLabel: "放弃编辑", cancelLabel: "继续编辑", danger: true }));
  }

  function finishClose({ fromPopstate = false } = {}) {
    state.mode = "closed";
    state.activeDiary = null;
    state.selectedMood = null;
    state.editorBase = null;
    state.error = "";
    render();
    const target = returnFocus;
    const scrollY = returnScrollY;
    returnFocus = null;
    if (!fromPopstate && historyOpen) {
      historyOpen = false;
      windowTarget?.history?.back?.();
    } else historyOpen = false;
    const restoreScroll = () => windowTarget?.scrollTo?.({ top: scrollY, left: 0, behavior: "instant" });
    windowTarget?.setTimeout?.(restoreScroll, 0);
    windowTarget?.setTimeout?.(restoreScroll, 100);
    windowTarget?.setTimeout?.(() => {
      restoreScroll();
      try { target?.focus?.({ preventScroll: true }); } catch { target?.focus?.(); }
    }, 300);
  }

  async function close({ fromPopstate = false } = {}) {
    if (state.mode === "closed") return true;
    if (!(await confirmLeave())) {
      if (fromPopstate) { historyOpen = false; pushHistory(); }
      return false;
    }
    finishClose({ fromPopstate });
    return true;
  }

  function replaceEntry(entry) {
    const normalized = normalizeEntry(entry, { normalizeDiaryDate, normalizeMood, normalizeMoodTags });
    if (!normalized) throw new Error("心情日记响应无效");
    state.entries = [normalized, ...state.entries.filter((item) => item.id !== normalized.id && item.user_id !== normalized.user_id)];
    state.activeDiary = normalized;
    return normalized;
  }

  async function save() {
    if (state.saving) return;
    const draft = readDraft();
    state.editorDraft = { content: draft.content, tags: draft.tags };
    if (!MOOD_TYPES.includes(state.selectedMood)) state.error = "请先选择一种心情。";
    else if (codePointLength(draft.content) > 5000) state.error = "心情内容最多 5000 个字符。";
    else if (draft.tooLong) state.error = "每个标签最多 20 个字符。";
    else if (draft.tooMany) state.error = "最多添加 8 个标签。";
    if (state.error) { render(); return; }
    const previous = ownEntry();
    const optimistic = { ...(previous || {}), id: previous?.id || globalThis.crypto?.randomUUID?.() || `mood-${Date.now()}`, user_id: state.currentUserId, diary_date: state.dateKey, mood: state.selectedMood, content: draft.content, tags: draft.tags };
    state.saving = true;
    replaceEntry(optimistic);
    state.mode = "detail";
    render();
    try {
      const canonical = previous?.id
        ? await repository.update(previous.id, { mood: state.selectedMood, content: draft.content, tags: draft.tags })
        : await repository.upsert({ id: optimistic.id, diary_date: state.dateKey, mood: state.selectedMood, content: draft.content, tags: draft.tags });
      replaceEntry(canonical);
      state.saving = false;
      state.editorBase = null;
      render();
      showToast("心情已保存", { kind: "success" });
      await onMutation({ type: "save", entry: { ...state.activeDiary, tags: [...state.activeDiary.tags] }, dateKey: state.dateKey });
    } catch (error) {
      state.entries = previous ? [previous, ...state.entries.filter((entry) => entry.user_id !== state.currentUserId)] : state.entries.filter((entry) => entry.user_id !== state.currentUserId);
      state.activeDiary = previous;
      state.saving = false;
      state.mode = "editor";
      state.error = `保存失败：${error?.message || "请重试"}`;
      render();
    }
  }

  async function remove(id) {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry || entry.user_id !== state.currentUserId || state.deleting) return;
    if (!(await confirmAction({ eyebrow: "删除心情日记", title: "确定删除这篇日记？", message: "删除后无法恢复。", confirmLabel: "删除", cancelLabel: "取消", danger: true }))) return;
    state.deleting = true;
    try {
      await repository.remove(id);
      state.entries = state.entries.filter((item) => item.id !== id);
      state.deleting = false;
      showToast("心情日记已删除", { kind: "success" });
      await onMutation({ type: "delete", entry, dateKey: state.dateKey });
      finishClose();
    } catch (error) {
      state.deleting = false;
      state.error = `删除失败：${error?.message || "请重试"}`;
      render();
    }
  }

  async function dispatch(action) {
    switch (action?.type) {
      case "pick": state.selectedMood = normalizeMood(action.mood); if (state.selectedMood) beginEditor({ mood: state.selectedMood, returnMode: "picker" }); break;
      case "edit": { const entry = state.entries.find((item) => item.id === action.id); if (entry?.user_id === state.currentUserId) beginEditor({ diary: entry, returnMode: "detail" }); break; }
      case "record": beginEditor({ returnMode: "detail" }); break;
      case "detail-user": selectDiary(action.userId); render(); break;
      case "add-tag": { const live = injectedView.readDraft(); state.editorDraft.content = live.content; const next = normalizeTagDraft([...state.editorDraft.tags, action.value], normalizeMoodTags); if (next.tooLong) state.error = "每个标签最多 20 个字符。"; else if (next.tooMany) state.error = "最多添加 8 个标签。"; else { state.editorDraft.tags = next.tags; state.error = ""; injectedView.clearTagInput(); } render(); break; }
      case "remove-tag": state.editorDraft.content = injectedView.readDraft().content; state.editorDraft.tags = state.editorDraft.tags.filter((value) => value !== action.tag); render(); break;
      case "save": await save(); break;
      case "delete": await remove(action.id); break;
      case "cancel-editor": if (await confirmLeave()) { state.mode = state.editorReturnMode; selectDiary(state.activeDiary?.user_id); state.editorBase = null; state.error = ""; render(); focusStart(); } break;
      case "close": await close(); break;
      default: break;
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    injectedView?.bind?.();
    windowTarget?.addEventListener?.("popstate", () => { if (historyOpen) void close({ fromPopstate: true }); });
  }

  const view = injectedView || createMoodEntryOverlayView({ elements, moodMeta: MOOD_META, moodTypes: MOOD_TYPES, getMoodAsset, getAuthorName, getAuthorAvatar, onAction: (action) => { void dispatch(action); } });
  injectedView = view;
  bind();
  render();

  return Object.freeze({ open, close, dispatch, getState: () => state });
}
