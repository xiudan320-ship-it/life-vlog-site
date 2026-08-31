import { getMonthRange, groupMoodDiariesByDate, isFutureLocalDate, normalizeDiaryDate, normalizeMood, normalizeMoodTags, resolveMoodParticipants, sortMoodDiaries } from "./mood-diary-domain.js";
import { createMoodDiaryView } from "./mood-diary-view.js";

const MONTH_CACHE_PREFIX = "life-vlog-mood-month:";
const HISTORY_PAGE_SIZE = 30;

function getTokyoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeEntry(entry) {
  const diaryDate = normalizeDiaryDate(entry?.diary_date);
  const mood = normalizeMood(entry?.mood);
  if (!entry?.id || !entry?.user_id || !diaryDate || !mood) return null;
  return { ...entry, id: String(entry.id), user_id: String(entry.user_id), diary_date: diaryDate, mood, content: String(entry.content || ""), tags: normalizeMoodTags(entry.tags) };
}

function shiftMonth(monthKey, amount) {
  const { year, month } = getMonthRange(monthKey);
  const absolute = year * 12 + month - 1 + amount;
  return `${Math.floor(absolute / 12)}-${String((absolute % 12) + 1).padStart(2, "0")}`;
}

export function createMoodDiaryController({ elements, repository, overlayController, getSession = () => null, getFamilyInfo = () => null, getFamilyMembers = () => [], getAuthorName, getAuthorAvatar, showToast = () => {}, openFamilySettings = () => {}, storage = globalThis.localStorage, now = () => new Date(), getTodayKey, view: injectedView } = {}) {
  const state = { currentMonthKey: "", todayKey: "", todayMonthKey: "", currentUserId: "", participants: [], seatByUserId: new Map(), monthEntries: [], entriesByDate: new Map(), listEntries: [], activeView: "calendar", loadingMonth: false, loadingList: false, listOffset: 0, listHasMore: false, listInitialized: false, loadedMonthKey: "", statusMessage: "", statusKind: "", hasFamily: false, familyMemberCount: 0 };
  let monthRequestId = 0;
  let listRequestId = 0;

  const cacheKey = (monthKey = state.currentMonthKey) => `${MONTH_CACHE_PREFIX}${state.currentUserId}:${monthKey}`;
  const visible = (entries) => (entries || []).map(normalizeEntry).filter((entry) => entry && state.seatByUserId.has(entry.user_id));

  function rebuild() {
    state.monthEntries = sortMoodDiaries(visible(state.monthEntries), { seatByUserId: state.seatByUserId });
    state.entriesByDate = groupMoodDiariesByDate(state.monthEntries);
    state.listEntries = sortMoodDiaries(visible(state.listEntries), { seatByUserId: state.seatByUserId });
  }

  function updateContext() {
    state.currentUserId = String(getSession?.()?.user?.id || "").trim();
    state.todayKey = normalizeDiaryDate(getTodayKey?.()) || getTokyoDateKey(now());
    state.todayMonthKey = state.todayKey.slice(0, 7);
    const members = getFamilyMembers?.() || [];
    state.hasFamily = Boolean(getFamilyInfo?.() || members.length);
    state.familyMemberCount = members.length;
    state.participants = resolveMoodParticipants({ currentUserId: state.currentUserId, familyInfo: getFamilyInfo?.(), familyMembers: members });
    state.seatByUserId = new Map(state.participants.map((participant, index) => [participant.userId, index]));
    rebuild();
  }

  function render() {
    injectedView?.render?.({ ...state, isFutureDate: (dateKey) => isFutureLocalDate(dateKey, state.todayKey) });
  }

  function readCache(key) {
    try { const parsed = JSON.parse(storage?.getItem?.(key) || "null"); return Array.isArray(parsed) ? parsed : null; } catch { return null; }
  }

  function writeCache() {
    try { storage?.setItem?.(cacheKey(), JSON.stringify(state.monthEntries)); } catch {}
  }

  async function loadMonth(monthKey, { force = false } = {}) {
    if (!state.currentUserId || !repository?.listMonth) return;
    const normalizedMonth = getMonthRange(monthKey).monthKey;
    if (!force && state.loadedMonthKey === normalizedMonth && !state.statusKind) return;
    state.currentMonthKey = normalizedMonth;
    state.loadingMonth = true;
    state.statusMessage = "正在读取本月心情…";
    const requestId = ++monthRequestId;
    const cached = readCache(cacheKey(normalizedMonth));
    if (cached) { state.monthEntries = cached; rebuild(); }
    render();
    try {
      const rows = await repository.listMonth(normalizedMonth);
      if (requestId !== monthRequestId) return;
      state.monthEntries = rows;
      rebuild();
      state.loadedMonthKey = normalizedMonth;
      state.loadingMonth = false;
      state.statusMessage = "";
      state.statusKind = "";
      writeCache();
      render();
    } catch (error) {
      if (requestId !== monthRequestId) return;
      state.loadingMonth = false;
      state.statusMessage = cached ? "云端暂时不可用，当前显示的是最近缓存。" : "本月心情读取失败，请重试。";
      state.statusKind = "error";
      render();
      showToast(`心情读取失败：${error?.message || "请重试"}`, { kind: "error" });
    }
  }

  async function loadHistory({ force = false, append = false } = {}) {
    if (!state.currentUserId || !repository?.listHistory || (state.listInitialized && !force && !append)) return;
    const requestId = ++listRequestId;
    const offset = force ? 0 : state.listOffset;
    if (force) state.listEntries = [];
    state.loadingList = true;
    state.statusMessage = "正在读取心情日记…";
    render();
    try {
      const rows = await repository.listHistory({ limit: HISTORY_PAGE_SIZE, offset });
      if (requestId !== listRequestId) return;
      state.listEntries = force ? rows : [...state.listEntries, ...rows];
      state.listOffset = offset + rows.length;
      state.listHasMore = rows.length === HISTORY_PAGE_SIZE;
      state.listInitialized = true;
      state.loadingList = false;
      state.statusMessage = "";
      state.statusKind = "";
      rebuild();
      render();
    } catch {
      if (requestId !== listRequestId) return;
      state.loadingList = false;
      state.statusMessage = "心情日记读取失败，请重试。";
      state.statusKind = "error";
      render();
    }
  }

  function openEntry(dateKey, preferredUserId = "", trigger = null) {
    const normalized = normalizeDiaryDate(dateKey);
    if (!normalized) return false;
    if (isFutureLocalDate(normalized, state.todayKey)) {
      showToast("还不能记录未来的日记", { kind: "info" });
      return false;
    }
    return overlayController?.open?.({ dateKey: normalized, entries: state.entriesByDate.get(normalized) || [], preferredUserId, participants: state.participants, trigger }) || false;
  }

  async function dispatch(action) {
    switch (action?.type) {
      case "date": await openEntry(action.dateKey, "", action.trigger); break;
      case "open-today": await openEntry(state.todayKey, action.userId || "", action.trigger); break;
      case "history-detail": { const entry = state.listEntries.find((item) => item.id === action.id); if (entry) await overlayController?.open?.({ dateKey: entry.diary_date, entries: state.listEntries.filter((item) => item.diary_date === entry.diary_date), preferredUserId: entry.user_id, participants: state.participants, trigger: action.trigger }); break; }
      case "previous-month":
      case "next-month": state.currentMonthKey = shiftMonth(state.currentMonthKey, action.type === "previous-month" ? -1 : 1); state.monthEntries = []; rebuild(); render(); await loadMonth(state.currentMonthKey, { force: true }); break;
      case "open-list": state.activeView = "list"; render(); await loadHistory(); break;
      case "open-calendar": state.activeView = "calendar"; render(); break;
      case "load-more": await loadHistory({ append: true }); break;
      case "open-family-settings": openFamilySettings(); break;
      default: break;
    }
  }

  function handleMutation({ type, entry }) {
    const normalized = normalizeEntry(entry);
    if (!normalized) return;
    const matches = (item) => item.id === normalized.id || (item.user_id === normalized.user_id && item.diary_date === normalized.diary_date);
    if (type === "delete") {
      state.monthEntries = state.monthEntries.filter((item) => !matches(item));
      state.listEntries = state.listEntries.filter((item) => !matches(item));
    } else {
      state.monthEntries = [normalized, ...state.monthEntries.filter((item) => !matches(item))];
      if (state.listInitialized) state.listEntries = [normalized, ...state.listEntries.filter((item) => !matches(item))];
    }
    rebuild();
    writeCache();
    render();
  }

  async function activate() {
    const previousUserId = state.currentUserId;
    updateContext();
    if (previousUserId !== state.currentUserId || !state.currentMonthKey) {
      state.currentMonthKey = state.todayMonthKey;
      state.monthEntries = [];
      state.listEntries = [];
      state.listOffset = 0;
      state.listInitialized = false;
      state.loadedMonthKey = "";
      rebuild();
    }
    render();
    if (state.currentUserId) await loadMonth(state.currentMonthKey);
  }

  const view = injectedView || createMoodDiaryView({ elements, getAuthorName, getAuthorAvatar, onAction: (action) => { void dispatch(action); } });
  injectedView = view;
  return Object.freeze({ activate, bind: () => view.bind(), render, getState: () => state, dispatch, loadMonth, loadHistory, selectDate: openEntry, beforeLeave: () => overlayController?.close?.() ?? true, handleMutation });
}
