import {
  MOOD_TYPES,
  getMonthRange,
  groupMoodDiariesByDate,
  isFutureLocalDate,
  normalizeDiaryDate,
  normalizeMood,
  normalizeMoodTags,
  resolveMoodParticipants,
  sortMoodDiaries,
} from "./mood-diary-domain.js";
import { createMoodDiaryView } from "./mood-diary-view.js";

const MONTH_CACHE_PREFIX = "life-vlog-mood-month:";
const HISTORY_PAGE_SIZE = 30;

function getTokyoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function monthKeyFromDateKey(dateKey) {
  return String(dateKey).slice(0, 7);
}

function shiftMonth(monthKey, amount) {
  const { year, month } = getMonthRange(monthKey);
  const absolute = year * 12 + month - 1 + amount;
  const nextYear = Math.floor(absolute / 12);
  const nextMonth = (absolute % 12) + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

function cloneEntry(entry) {
  return entry ? { ...entry, tags: [...(entry.tags || [])] } : null;
}

function cloneEntries(entries) {
  return (entries || []).map(cloneEntry).filter(Boolean);
}

function normalizeEntry(entry) {
  const diaryDate = normalizeDiaryDate(entry?.diary_date);
  const mood = normalizeMood(entry?.mood);
  if (!entry?.id || !entry?.user_id || !diaryDate || !mood) return null;
  return {
    ...entry,
    id: String(entry.id),
    user_id: String(entry.user_id),
    diary_date: diaryDate,
    mood,
    content: String(entry.content || ""),
    tags: normalizeMoodTags(entry.tags),
  };
}

function createCacheKey(userId, monthKey) {
  return `${MONTH_CACHE_PREFIX}${userId}:${monthKey}`;
}

function readCache(storage, key) {
  try {
    const value = storage?.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeEntry).filter(Boolean) : null;
  } catch {
    return null;
  }
}

function writeCache(storage, key, entries) {
  try {
    storage?.setItem(key, JSON.stringify(entries));
  } catch {
    // A full or unavailable cache must not stop cloud truth from rendering.
  }
}

function removeCache(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {}
}

function codePointLength(value) {
  return [...String(value ?? "")].length;
}

function normalizeTagDraft(tags) {
  const source = (Array.isArray(tags) ? tags : [])
    .flatMap((value) => String(value ?? "").split(/[,，]/u));
  const cleaned = normalizeMoodTags(source, { maxTags: 100, maxLength: 1000 });
  const tooLong = source.some((value) => {
    const tag = String(value ?? "").trim().replace(/^#+/u, "").trim();
    return tag && codePointLength(tag) > 20;
  });
  return { cleaned, tooLong };
}

export function createMoodDiaryController({
  elements,
  repository,
  getSession = () => null,
  getFamilyInfo = () => null,
  getFamilyMembers = () => [],
  getAuthorName,
  getAuthorAvatar,
  showToast = () => {},
  confirmAction = async () => false,
  openFamilySettings = () => {},
  onMutation = () => {},
  storage = globalThis.localStorage,
  now = () => new Date(),
  getTodayKey,
  windowTarget = globalThis.window,
  view: injectedView,
} = {}) {
  const state = {
    currentMonthKey: "",
    selectedDateKey: "",
    selectedMood: null,
    monthEntries: [],
    entriesByDate: new Map(),
    activeDiary: null,
    listEntries: [],
    activeView: "calendar",
    loadingMonth: false,
    loadingList: false,
    saving: false,
    deleting: false,
    requestRevision: 0,
    currentUserId: "",
    todayKey: "",
    todayMonthKey: "",
    hasFamily: false,
    familyMemberCount: 0,
    participants: [],
    seatByUserId: new Map(),
    detailEntries: [],
    listOffset: 0,
    listHasMore: false,
    listInitialized: false,
    loadedMonthKey: "",
    statusMessage: "",
    statusKind: "",
    editorDraft: { content: "", tags: [] },
    editorBase: null,
    editorReturnView: "calendar",
    editorReturnDiary: null,
    editorError: "",
    detailError: "",
  };
  let monthRequestId = 0;
  let listRequestId = 0;
  let bound = false;
  let overlayHistoryOpen = false;
  let overlayReturnFocus = null;

  function currentSession() {
    return getSession?.() || null;
  }

  function currentUserId() {
    return String(currentSession()?.user?.id || "").trim();
  }

  function currentTodayKey() {
    const provided = getTodayKey?.();
    return normalizeDiaryDate(provided) || getTokyoDateKey(now?.());
  }

  function setStatus(message = "", kind = "") {
    state.statusMessage = String(message || "");
    state.statusKind = kind;
  }

  function showError(message) {
    setStatus(message, "error");
    try { showToast(message, { kind: "error" }); } catch {}
  }

  function rebuildMonthIndex() {
    state.monthEntries = sortMoodDiaries(state.monthEntries, { seatByUserId: state.seatByUserId });
    state.entriesByDate = groupMoodDiariesByDate(state.monthEntries);
  }

  function buildParticipants() {
    const members = getFamilyMembers?.() || [];
    const familyInfo = getFamilyInfo?.();
    state.hasFamily = Boolean(familyInfo || members.length);
    state.familyMemberCount = members.length;
    state.participants = resolveMoodParticipants({
      currentUserId: state.currentUserId,
      familyInfo,
      familyMembers: members,
    });
    state.seatByUserId = new Map(state.participants.map((participant, index) => [participant.userId, index]));
  }

  function visibleEntries(entries) {
    return (entries || [])
      .map(normalizeEntry)
      .filter((entry) => entry && state.seatByUserId.has(entry.user_id));
  }

  function syncVisibleEntries() {
    state.monthEntries = visibleEntries(state.monthEntries);
    rebuildMonthIndex();
    state.listEntries = visibleEntries(state.listEntries);
    state.listEntries = sortMoodDiaries(state.listEntries, { seatByUserId: state.seatByUserId });
  }

  function render() {
    state.todayKey = currentTodayKey();
    state.todayMonthKey = monthKeyFromDateKey(state.todayKey);
    state.hasFamily = Boolean(getFamilyInfo?.() || getFamilyMembers?.().length);
    injectedView?.render?.({
      ...state,
      entriesByDate: state.entriesByDate,
      isFutureDate: (dateKey) => isFutureLocalDate(dateKey, state.todayKey),
      participants: state.participants,
      currentUserId: state.currentUserId,
      hasFamily: state.hasFamily,
      listEntries: cloneEntries(state.listEntries),
      monthEntries: cloneEntries(state.monthEntries),
      editorDraft: { ...state.editorDraft, tags: [...state.editorDraft.tags] },
    });
  }

  function updateAfterContextChange() {
    buildParticipants();
    syncVisibleEntries();
    state.detailEntries = visibleEntries(state.entriesByDate.get(state.selectedDateKey) || []);
    if (state.activeDiary && !state.seatByUserId.has(state.activeDiary.user_id)) state.activeDiary = null;
  }

  async function loadMonth(monthKey, { force = false } = {}) {
    if (!state.currentUserId || !repository?.listMonth) return;
    const normalizedMonth = getMonthRange(monthKey).monthKey;
    if (!force && state.loadedMonthKey === normalizedMonth && !state.statusKind) return;
    state.currentMonthKey = normalizedMonth;
    state.loadingMonth = true;
    setStatus("正在读取本月心情…");
    const requestId = ++monthRequestId;
    const revision = ++state.requestRevision;
    const key = createCacheKey(state.currentUserId, normalizedMonth);
    const cached = readCache(storage, key);
    if (cached) {
      state.monthEntries = visibleEntries(cached);
      rebuildMonthIndex();
      render();
    }
    render();
    try {
      const entries = await repository.listMonth(normalizedMonth);
      if (requestId !== monthRequestId || revision !== state.requestRevision) return;
      state.monthEntries = visibleEntries(entries);
      rebuildMonthIndex();
      state.loadedMonthKey = normalizedMonth;
      state.loadingMonth = false;
      setStatus("");
      writeCache(storage, key, state.monthEntries);
      render();
    } catch (error) {
      if (requestId !== monthRequestId || revision !== state.requestRevision) return;
      state.loadingMonth = false;
      setStatus(cached ? "云端暂时不可用，当前显示的是最近缓存。" : "本月心情读取失败，请重试。", "error");
      render();
      try { showToast(`心情读取失败：${error?.message || "请重试"}`, { kind: "error" }); } catch {}
    }
  }

  async function loadHistory({ force = false, append = false } = {}) {
    if (!state.currentUserId || !repository?.listHistory || (state.listInitialized && !force && !append)) return;
    state.loadingList = true;
    setStatus("正在读取心情日记…");
    const requestId = ++listRequestId;
    const revision = ++state.requestRevision;
    const offset = force ? 0 : state.listOffset;
    if (force) state.listEntries = [];
    render();
    try {
      const entries = await repository.listHistory({ limit: HISTORY_PAGE_SIZE, offset });
      if (requestId !== listRequestId || revision !== state.requestRevision) return;
      const visible = visibleEntries(entries);
      state.listEntries = force
        ? visible
        : sortMoodDiaries([...state.listEntries, ...visible], { seatByUserId: state.seatByUserId });
      state.listOffset = offset + entries.length;
      state.listHasMore = entries.length === HISTORY_PAGE_SIZE;
      state.listInitialized = true;
      state.loadingList = false;
      setStatus("");
      render();
    } catch (error) {
      if (requestId !== listRequestId || revision !== state.requestRevision) return;
      state.loadingList = false;
      setStatus("心情日记读取失败，请重试。", "error");
      render();
      try { showToast(`心情读取失败：${error?.message || "请重试"}`, { kind: "error" }); } catch {}
    }
  }

  function pushOverlayHistory() {
    if (overlayHistoryOpen || !windowTarget?.history?.pushState) return;
    windowTarget.history.pushState({ moodOverlay: true }, "", windowTarget.location?.href || "");
    overlayHistoryOpen = true;
  }

  function closeOverlayHistory() {
    if (!overlayHistoryOpen || !windowTarget?.history?.back) return;
    overlayHistoryOpen = false;
    windowTarget.history.back();
  }

  function openOverlay() {
    if (!overlayHistoryOpen) {
      const activeElement = elements?.moodPage?.ownerDocument?.activeElement;
      if (activeElement && !elements?.moodOverlay?.contains?.(activeElement)) overlayReturnFocus = activeElement;
    }
    pushOverlayHistory();
  }

  function focusOverlayStart() {
    const target = state.activeView === "picker"
      ? elements?.moodPickerOrbit?.querySelector?.("button:not([disabled])")
      : state.activeView === "detail"
        ? elements?.moodDetailPanel?.querySelector?.("button:not([disabled])") || elements?.moodOverlayClose
        : elements?.moodEditorContent;
    windowTarget?.setTimeout?.(() => {
      try { target?.focus?.({ preventScroll: true }); } catch { target?.focus?.(); }
    }, 0);
  }

  function restoreOverlayFocus() {
    const target = overlayReturnFocus;
    overlayReturnFocus = null;
    if (!target || target.isConnected === false) return;
    windowTarget?.setTimeout?.(() => {
      try { target.focus?.({ preventScroll: true }); } catch { target.focus?.(); }
    }, 0);
  }

  function findOwnEntry(dateKey) {
    return (state.entriesByDate.get(dateKey) || []).find((entry) => entry.user_id === state.currentUserId) || null;
  }

  function setDetailForDate(dateKey, preferredUserId = "") {
    state.selectedDateKey = dateKey;
    state.detailEntries = sortMoodDiaries(
      visibleEntries(state.entriesByDate.get(dateKey) || []),
      { seatByUserId: state.seatByUserId },
    );
    state.activeDiary = state.detailEntries.find((entry) => entry.user_id === preferredUserId)
      || state.detailEntries.find((entry) => entry.user_id === state.currentUserId)
      || state.detailEntries[0]
      || null;
  }

  function openEditor({ diary = null, dateKey = state.selectedDateKey, mood = null, returnView = "detail" } = {}) {
    const normalizedDate = normalizeDiaryDate(dateKey);
    if (!normalizedDate || isFutureLocalDate(normalizedDate, state.todayKey)) {
      showError("还不能记录未来的日记");
      return false;
    }
    const current = diary && diary.user_id === state.currentUserId ? diary : findOwnEntry(normalizedDate);
    state.selectedDateKey = normalizedDate;
    state.activeDiary = current || state.activeDiary;
    state.selectedMood = normalizeMood(mood || current?.mood);
    state.editorDraft = {
      content: current?.content || "",
      tags: [...(current?.tags || [])],
    };
    state.editorBase = current
      ? { id: current.id, mood: current.mood, content: current.content || "", tags: [...(current.tags || [])] }
      : null;
    state.editorReturnView = returnView;
    state.editorReturnDiary = cloneEntry(state.activeDiary);
    state.editorError = "";
    state.activeView = "editor";
    openOverlay();
    render();
    focusOverlayStart();
    return true;
  }

  function selectDate(dateKey, { preferredUserId = "" } = {}) {
    const normalizedDate = normalizeDiaryDate(dateKey);
    if (!normalizedDate) return;
    if (isFutureLocalDate(normalizedDate, state.todayKey)) {
      showToast("还不能记录未来的日记", { kind: "info" });
      return;
    }
    const normalizedPreferredUserId = String(preferredUserId || "").trim();
    setDetailForDate(normalizedDate, normalizedPreferredUserId);
    const selectedEntry = state.detailEntries.find((entry) => (
      normalizedPreferredUserId
        ? entry.user_id === normalizedPreferredUserId
        : entry.user_id === state.currentUserId
    ));
    if (selectedEntry) {
      state.activeDiary = selectedEntry;
      state.activeView = "detail";
      openOverlay();
    } else {
      state.activeDiary = null;
      state.selectedMood = null;
      state.editorError = "";
      state.activeView = "picker";
      openOverlay();
    }
    render();
    focusOverlayStart();
  }

  function saveSnapshot() {
    const key = createCacheKey(state.currentUserId, state.currentMonthKey);
    return {
      monthEntries: cloneEntries(state.monthEntries),
      listEntries: cloneEntries(state.listEntries),
      activeDiary: cloneEntry(state.activeDiary),
      detailEntries: cloneEntries(state.detailEntries),
      selectedDateKey: state.selectedDateKey,
      selectedMood: state.selectedMood,
      activeView: state.activeView,
      editorDraft: { ...state.editorDraft, tags: [...state.editorDraft.tags] },
      editorBase: state.editorBase ? { ...state.editorBase, tags: [...state.editorBase.tags] } : null,
      cache: storage?.getItem?.(key),
    };
  }

  function restoreSnapshot(snapshot) {
    state.monthEntries = cloneEntries(snapshot.monthEntries);
    state.listEntries = cloneEntries(snapshot.listEntries);
    state.activeDiary = cloneEntry(snapshot.activeDiary);
    state.detailEntries = cloneEntries(snapshot.detailEntries);
    state.selectedDateKey = snapshot.selectedDateKey;
    state.selectedMood = snapshot.selectedMood;
    state.activeView = snapshot.activeView;
    state.editorDraft = { ...snapshot.editorDraft, tags: [...snapshot.editorDraft.tags] };
    state.editorBase = snapshot.editorBase ? { ...snapshot.editorBase, tags: [...snapshot.editorBase.tags] } : null;
    rebuildMonthIndex();
    const key = createCacheKey(state.currentUserId, state.currentMonthKey);
    if (snapshot.cache === undefined || snapshot.cache === null) removeCache(storage, key);
    else {
      try { storage?.setItem?.(key, snapshot.cache); } catch {}
    }
  }

  function replaceEntry(entry) {
    const normalized = normalizeEntry(entry);
    if (!normalized) throw new Error("心情日记响应无效");
    const replace = (entries) => {
      const next = entries.filter((item) => !(item.id === normalized.id || (
        item.user_id === normalized.user_id && item.diary_date === normalized.diary_date
      )));
      return [normalized, ...next];
    };
    state.monthEntries = replace(state.monthEntries);
    if (state.listInitialized) state.listEntries = replace(state.listEntries);
    rebuildMonthIndex();
    state.detailEntries = visibleEntries(state.entriesByDate.get(normalized.diary_date) || []);
    state.activeDiary = normalized;
    return normalized;
  }

  function removeEntryFromState(entry) {
    const predicate = (item) => item.id !== entry.id;
    state.monthEntries = state.monthEntries.filter(predicate);
    state.listEntries = state.listEntries.filter(predicate);
    rebuildMonthIndex();
    state.detailEntries = visibleEntries(state.entriesByDate.get(state.selectedDateKey) || []);
  }

  function readDraft() {
    const formDraft = injectedView?.readEditorDraft?.() || { content: "", tagInput: "" };
    const rawTags = [...(state.editorDraft.tags || []), formDraft.tagInput];
    const { cleaned, tooLong } = normalizeTagDraft(rawTags);
    return {
      content: formDraft.content,
      tags: cleaned,
      tooLong,
      tooMany: cleaned.length > 8,
    };
  }

  function isEditorDirty(draft) {
    const base = state.editorBase;
    if (!base) return Boolean(draft.content || draft.tags.length);
    return base.mood !== state.selectedMood
      || base.content !== draft.content
      || JSON.stringify(base.tags) !== JSON.stringify(draft.tags);
  }

  async function confirmLeaveIfDirty() {
    if (state.activeView !== "editor") return true;
    const draft = readDraft();
    if (!isEditorDirty(draft)) return true;
    return Boolean(await confirmAction({
      eyebrow: "尚未保存",
      title: "放弃这次编辑？",
      message: "已经填写的内容不会被保存。",
      confirmLabel: "放弃编辑",
      cancelLabel: "继续编辑",
      danger: true,
    }));
  }

  async function save() {
    if (state.saving || !state.currentUserId || !state.selectedDateKey) return;
    const draft = readDraft();
    state.editorDraft = { content: draft.content, tags: draft.tags };
    state.editorError = "";
    if (!state.selectedMood || !MOOD_TYPES.includes(state.selectedMood)) {
      state.editorError = "请先选择一种心情。";
      render();
      return;
    }
    if (codePointLength(draft.content) > 5000) {
      state.editorError = "心情内容最多 5000 个字符。";
      render();
      return;
    }
    if (draft.tooLong) {
      state.editorError = "每个标签最多 20 个字符。";
      render();
      return;
    }
    if (draft.tooMany) {
      state.editorError = "最多添加 8 个标签。";
      render();
      return;
    }
    const own = findOwnEntry(state.selectedDateKey);
    const snapshot = saveSnapshot();
    const optimistic = {
      ...(own || {}),
      id: own?.id || globalThis.crypto?.randomUUID?.() || `mood-${Date.now()}`,
      user_id: state.currentUserId,
      diary_date: state.selectedDateKey,
      mood: state.selectedMood,
      content: draft.content,
      tags: draft.tags,
      updated_at: new Date().toISOString(),
      created_at: own?.created_at || new Date().toISOString(),
    };
    state.saving = true;
    state.activeDiary = optimistic;
    state.detailEntries = [optimistic, ...state.detailEntries.filter((entry) => entry.user_id !== state.currentUserId)];
    state.activeView = "detail";
    replaceEntry(optimistic);
    state.editorDraft = { content: "", tags: [] };
    render();
    try {
      const canonical = own?.id
        ? await repository.update(own.id, { mood: draftMood(state.selectedMood), content: draft.content, tags: draft.tags })
        : await repository.upsert({ id: optimistic.id, diary_date: state.selectedDateKey, mood: draftMood(state.selectedMood), content: draft.content, tags: draft.tags });
      replaceEntry(canonical);
      state.saving = false;
      state.editorBase = null;
      state.editorError = "";
      state.activeView = "detail";
      state.detailEntries = visibleEntries(state.entriesByDate.get(state.selectedDateKey) || []);
      writeCache(storage, createCacheKey(state.currentUserId, state.currentMonthKey), state.monthEntries);
      setStatus("");
      render();
      showToast("心情已保存", { kind: "success" });
      notifyMutation({ type: "save", entry: cloneEntry(canonical), dateKey: canonical.diary_date });
    } catch (error) {
      state.saving = false;
      restoreSnapshot(snapshot);
      state.editorDraft = { content: draft.content, tags: [...draft.tags] };
      state.editorError = `保存失败：${error?.message || "请重试"}`;
      state.activeView = "editor";
      setStatus("保存失败，内容已恢复；请重试。", "error");
      render();
      try { showToast(`保存失败：${error?.message || "请重试"}`, { kind: "error" }); } catch {}
    }
  }

  function draftMood(mood) {
    const normalized = normalizeMood(mood);
    if (!normalized) throw new Error("心情类型无效");
    return normalized;
  }

  function notifyMutation(payload) {
    void onMutation?.(payload);
  }

  async function remove(id) {
    if (state.deleting || !id || !state.currentUserId) return;
    const entry = state.monthEntries.find((item) => item.id === id) || state.listEntries.find((item) => item.id === id);
    if (!entry || entry.user_id !== state.currentUserId) return;
    const confirmed = await confirmAction({
      eyebrow: "删除心情日记",
      title: "确定删除这篇日记？",
      message: "删除后无法恢复。",
      confirmLabel: "删除",
      cancelLabel: "取消",
      danger: true,
    });
    if (!confirmed) return;
    const snapshot = saveSnapshot();
    state.deleting = true;
    removeEntryFromState(entry);
    state.activeDiary = null;
    state.activeView = "calendar";
    render();
    try {
      await repository.remove(id);
      state.deleting = false;
      writeCache(storage, createCacheKey(state.currentUserId, state.currentMonthKey), state.monthEntries);
      setStatus("");
      render();
      showToast("心情日记已删除", { kind: "success" });
      notifyMutation({ type: "delete", entry: cloneEntry(entry), dateKey: entry.diary_date });
    } catch (error) {
      state.deleting = false;
      restoreSnapshot(snapshot);
      setStatus(`删除失败：${error?.message || "请重试"}`, "error");
      render();
      try { showToast(`删除失败：${error?.message || "请重试"}`, { kind: "error" }); } catch {}
    }
  }

  async function closeOverlay({ fromPopstate = false } = {}) {
    if (!(await confirmLeaveIfDirty())) {
      if (fromPopstate) {
        overlayHistoryOpen = false;
        pushOverlayHistory();
      }
      return;
    }
    if (state.activeView === "editor") {
      state.activeView = state.editorReturnView || "calendar";
      state.activeDiary = cloneEntry(state.editorReturnDiary);
      state.editorError = "";
    } else {
      state.activeView = "calendar";
      state.activeDiary = null;
    }
    state.selectedMood = null;
    if (!fromPopstate) closeOverlayHistory();
    else overlayHistoryOpen = false;
    render();
    restoreOverlayFocus();
  }

  async function beforeLeave() {
    if (!(await confirmLeaveIfDirty())) return false;
    overlayHistoryOpen = false;
    overlayReturnFocus = null;
    state.activeView = "calendar";
    state.activeDiary = null;
    state.selectedMood = null;
    state.editorBase = null;
    state.editorDraft = { content: "", tags: [] };
    state.editorError = "";
    render();
    return true;
  }

  async function handleAction(action) {
    switch (action?.type) {
      case "date":
        selectDate(action.dateKey);
        break;
      case "pick-mood":
        state.selectedMood = normalizeMood(action.mood);
        if (!state.selectedMood) return;
        openEditor({ dateKey: state.selectedDateKey, mood: state.selectedMood, returnView: "picker" });
        break;
      case "record-date":
        openEditor({ dateKey: action.dateKey, returnView: "detail" });
        break;
      case "edit": {
        const entry = state.monthEntries.find((item) => item.id === action.id) || state.listEntries.find((item) => item.id === action.id);
        if (entry?.user_id === state.currentUserId) openEditor({ diary: entry, dateKey: entry.diary_date, mood: entry.mood, returnView: "detail" });
        break;
      }
      case "delete":
        await remove(action.id);
        break;
      case "save":
        await save();
        break;
      case "close-overlay":
        await closeOverlay();
        break;
      case "open-today":
        selectDate(state.todayKey, { preferredUserId: action.userId || "" });
        break;
      case "previous-month":
      case "next-month": {
        if (!(await confirmLeaveIfDirty())) return;
        state.activeView = "calendar";
        state.activeDiary = null;
        state.currentMonthKey = shiftMonth(state.currentMonthKey, action.type === "previous-month" ? -1 : 1);
        state.monthEntries = [];
        state.entriesByDate = new Map();
        setStatus("");
        render();
        await loadMonth(state.currentMonthKey, { force: true });
        break;
      }
      case "open-list":
        if (!(await confirmLeaveIfDirty())) return;
        state.activeView = "list";
        state.activeDiary = null;
        closeOverlayHistory();
        render();
        await loadHistory();
        break;
      case "open-calendar":
        if (!(await confirmLeaveIfDirty())) return;
        state.activeView = "calendar";
        state.activeDiary = null;
        closeOverlayHistory();
        render();
        break;
      case "load-more":
        await loadHistory({ force: false, append: true });
        break;
      case "history-detail": {
        const entry = state.listEntries.find((item) => item.id === action.id);
        if (!entry) return;
        setDetailForDate(entry.diary_date, entry.user_id);
      state.activeView = "detail";
      openOverlay();
      render();
      focusOverlayStart();
      break;
      }
      case "detail-user":
        setDetailForDate(state.selectedDateKey, action.userId);
        state.detailError = "";
        render();
        break;
      case "add-tag": {
        const liveDraft = injectedView?.readEditorDraft?.() || { content: state.editorDraft.content, tagInput: "" };
        state.editorDraft.content = liveDraft.content;
        const { cleaned, tooLong } = normalizeTagDraft([...state.editorDraft.tags, action.value]);
        if (tooLong) state.editorError = "每个标签最多 20 个字符。";
        else if (cleaned.length > 8) state.editorError = "最多添加 8 个标签。";
        else {
          state.editorDraft.tags = cleaned;
          state.editorError = "";
          injectedView?.clearTagInput?.();
        }
        render();
        break;
      }
      case "remove-tag":
        state.editorDraft.content = injectedView?.readEditorDraft?.().content || state.editorDraft.content;
        state.editorDraft.tags = state.editorDraft.tags.filter((tag) => tag !== action.tag);
        render();
        break;
      case "open-family-settings":
        openFamilySettings?.();
        break;
      default:
        break;
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    injectedView?.bind?.();
    windowTarget?.addEventListener?.("popstate", () => {
      if (!overlayHistoryOpen) return;
      void closeOverlay({ fromPopstate: true });
    });
  }

  async function activate() {
    const nextUserId = currentUserId();
    const changedUser = nextUserId !== state.currentUserId;
    state.todayKey = currentTodayKey();
    state.todayMonthKey = monthKeyFromDateKey(state.todayKey);
    if (changedUser) {
      state.currentUserId = nextUserId;
      state.currentMonthKey = state.todayMonthKey;
      state.selectedDateKey = "";
      state.selectedMood = null;
      state.monthEntries = [];
      state.entriesByDate = new Map();
      state.activeDiary = null;
      state.listEntries = [];
      state.activeView = "calendar";
      state.listOffset = 0;
      state.listHasMore = false;
      state.listInitialized = false;
      state.loadedMonthKey = "";
      state.editorBase = null;
      state.editorDraft = { content: "", tags: [] };
    }
    updateAfterContextChange();
    render();
    if (!state.currentUserId) return;
    await loadMonth(state.currentMonthKey);
  }

  function getState() {
    return state;
  }

  const view = injectedView || createMoodDiaryView({
    elements,
    getAuthorName,
    getAuthorAvatar,
    onAction: (action) => { void handleAction(action); },
  });
  injectedView = view;

  return Object.freeze({
    activate,
    bind,
    render,
    getState,
    dispatch: handleAction,
    loadMonth,
    loadHistory,
    selectDate,
    save,
    remove,
    beforeLeave,
  });
}
