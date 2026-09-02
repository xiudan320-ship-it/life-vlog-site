import { getMonthRange, groupMoodDiariesByDate, isFutureLocalDate, normalizeDiaryDate, normalizeMood, normalizeMoodTags, resolveMoodParticipants, sortMoodDiaries } from "./mood-diary-domain.js";
import { createMoodDiaryView } from "./mood-diary-view.js";
import { buildMoodMonthSummary } from "./mood-month-summary-domain.js";

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

export function createMoodDiaryController({ elements, repository, overlayController, getSession = () => null, getFamilyInfo = () => null, getFamilyMembers = () => [], getAuthorName, getAuthorAvatar, showToast = () => {}, openFamilySettings = () => {}, storage = globalThis.localStorage, now = () => new Date(), getTodayKey, windowTarget = globalThis.window, view: injectedView } = {}) {
  const state = { currentMonthKey: "", todayKey: "", todayMonthKey: "", currentUserId: "", participants: [], seatByUserId: new Map(), monthEntries: [], monthSummary: null, entriesByDate: new Map(), listEntries: [], activeView: "calendar", loadingMonth: false, monthSyncing: false, loadingList: false, listOffset: 0, listHasMore: false, listInitialized: false, loadedMonthKey: "", monthRenderReason: "initial", changedEntryId: "", statusMessage: "", statusKind: "", hasFamily: false, familyMemberCount: 0 };
  let monthRequestId = 0;
  let listRequestId = 0;
  let calendarScrollY = 0;
  let monthScrollAnchor = null;

  const cacheKey = (monthKey = state.currentMonthKey) => `${MONTH_CACHE_PREFIX}${state.currentUserId}:${monthKey}`;
  const visible = (entries) => (entries || []).map(normalizeEntry).filter((entry) => entry && state.seatByUserId.has(entry.user_id));

  function rebuild() {
    state.monthEntries = sortMoodDiaries(visible(state.monthEntries), { seatByUserId: state.seatByUserId });
    state.entriesByDate = groupMoodDiariesByDate(state.monthEntries);
    state.listEntries = sortMoodDiaries(visible(state.listEntries), { seatByUserId: state.seatByUserId });
    const summaryMonthKey = state.currentMonthKey || state.todayMonthKey;
    state.monthSummary = summaryMonthKey
      ? buildMoodMonthSummary({ monthKey: summaryMonthKey, entries: state.monthEntries, participants: state.participants })
      : null;
  }

  function updateContext() {
    state.currentUserId = String(getSession?.()?.user?.id || "").trim();
    state.todayKey = normalizeDiaryDate(getTodayKey?.()) || getTokyoDateKey(now());
    state.todayMonthKey = state.todayKey.slice(0, 7);
    const members = getFamilyMembers?.() || [];
    state.hasFamily = Boolean(getFamilyInfo?.() || members.length);
    state.familyMemberCount = members.length;
    state.participants = resolveMoodParticipants({ currentUserId: state.currentUserId, familyInfo: getFamilyInfo?.(), familyMembers: members })
      .map((participant) => ({ ...participant, name: getAuthorName?.(participant.userId) || participant.userId }));
    state.seatByUserId = new Map(state.participants.map((participant, index) => [participant.userId, index]));
    rebuild();
  }

  function captureMonthScrollAnchor(trigger) {
    const element = trigger?.closest?.("#moodJarSummarySection, #moodCalendarView");
    const rect = element?.getBoundingClientRect?.();
    if (!element || !rect || !Number.isFinite(rect.top)) return null;
    return {
      element,
      top: rect.top,
      left: Number(windowTarget?.scrollX) || 0,
      scrollY: Number(windowTarget?.scrollY) || 0,
    };
  }

  function restoreMonthScrollAnchor() {
    const anchor = monthScrollAnchor;
    if (!anchor?.element || anchor.element.isConnected === false) return;
    const rect = anchor.element.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.top)) return;
    const delta = rect.top - anchor.top;
    if (Math.abs(delta) < 0.5) return;
    const currentScrollY = Number(windowTarget?.scrollY);
    const documentTarget = windowTarget?.document;
    const root = documentTarget?.documentElement;
    const previousScrollBehavior = root?.style?.scrollBehavior;
    if (root) root.style.scrollBehavior = "auto";
    try {
      windowTarget?.scrollTo?.({
        top: Math.max(0, (Number.isFinite(currentScrollY) ? currentScrollY : anchor.scrollY) + delta),
        left: anchor.left,
        behavior: "auto",
      });
    } finally {
      if (root) root.style.scrollBehavior = previousScrollBehavior || "";
    }
  }

  function render() {
    injectedView?.render?.({ ...state, isFutureDate: (dateKey) => isFutureLocalDate(dateKey, state.todayKey) });
    restoreMonthScrollAnchor();
  }

  function readCache(key) {
    try { const parsed = JSON.parse(storage?.getItem?.(key) || "null"); return Array.isArray(parsed) ? parsed : null; } catch { return null; }
  }

  function writeCache(monthKey = state.currentMonthKey, entries = state.monthEntries) {
    try { storage?.setItem?.(cacheKey(monthKey), JSON.stringify(entries)); } catch {}
  }

  async function loadMonth(monthKey, { force = false, reason = "passive", changedEntryId = "" } = {}) {
    if (!state.currentUserId || !repository?.listMonth) return false;
    const normalizedMonth = getMonthRange(monthKey).monthKey;
    if (!force && state.loadedMonthKey === normalizedMonth && !state.statusKind) return false;
    state.currentMonthKey = normalizedMonth;
    state.loadingMonth = true;
    state.monthSyncing = true;
    state.statusKind = "";
    state.statusMessage = reason === "mutation" ? "正在同步本月心情…" : "正在读取本月心情…";
    state.monthRenderReason = reason;
    state.changedEntryId = changedEntryId;
    const requestId = ++monthRequestId;
    const cached = readCache(cacheKey(normalizedMonth));
    if (cached) {
      state.monthEntries = cached;
      rebuild();
      state.monthRenderReason = reason === "month-change" ? reason : "passive";
      state.changedEntryId = "";
    }
    render();
    try {
      const rows = await repository.listMonth(normalizedMonth);
      if (requestId !== monthRequestId) return false;
      state.monthEntries = rows;
      rebuild();
      state.loadedMonthKey = normalizedMonth;
      state.loadingMonth = false;
      state.monthSyncing = false;
      state.statusMessage = "";
      state.statusKind = "";
      writeCache();
      state.monthRenderReason = reason;
      state.changedEntryId = changedEntryId;
      render();
      state.monthRenderReason = "passive";
      state.changedEntryId = "";
      return true;
    } catch (error) {
      if (requestId !== monthRequestId) return false;
      state.loadingMonth = false;
      state.monthSyncing = false;
      const hasLocalResult = Boolean(cached) || state.monthEntries.length > 0;
      state.statusMessage = hasLocalResult ? "云端暂时不可用，当前显示的是最近结果；可重试同步。" : "本月心情读取失败，请重试。";
      state.statusKind = "error";
      state.monthRenderReason = "passive";
      state.changedEntryId = "";
      render();
      showToast(`心情读取失败：${error?.message || "请重试"}`, { kind: "error" });
      return false;
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
      case "next-month": {
        const scrollAnchor = captureMonthScrollAnchor(action.trigger);
        if (scrollAnchor) monthScrollAnchor = scrollAnchor;
        try {
          state.currentMonthKey = shiftMonth(state.currentMonthKey, action.type === "previous-month" ? -1 : 1);
          state.monthEntries = [];
          state.loadedMonthKey = "";
          state.monthRenderReason = "month-change";
          state.changedEntryId = "";
          rebuild();
          render();
          await loadMonth(state.currentMonthKey, { force: true, reason: "month-change" });
        } finally {
          if (scrollAnchor && monthScrollAnchor === scrollAnchor) {
            const releaseAnchor = () => {
              if (monthScrollAnchor !== scrollAnchor) return;
              restoreMonthScrollAnchor();
              const finishRelease = () => {
                if (monthScrollAnchor !== scrollAnchor) return;
                restoreMonthScrollAnchor();
                monthScrollAnchor = null;
              };
              if (typeof windowTarget?.requestAnimationFrame === "function") windowTarget.requestAnimationFrame(finishRelease);
              else windowTarget?.setTimeout?.(finishRelease, 0);
            };
            if (typeof windowTarget?.requestAnimationFrame === "function") windowTarget.requestAnimationFrame(releaseAnchor);
            else windowTarget?.setTimeout?.(releaseAnchor, 0);
          }
        }
        break;
      }
      case "retry-month": await loadMonth(state.currentMonthKey, { force: true, reason: "passive" }); break;
      case "open-list":
        calendarScrollY = Number(windowTarget?.scrollY) || 0;
        state.activeView = "list";
        render();
        await loadHistory();
        break;
      case "open-calendar":
        state.activeView = "calendar";
        render();
        windowTarget?.setTimeout?.(() => windowTarget?.scrollTo?.({ top: calendarScrollY, left: 0, behavior: "instant" }), 0);
        break;
      case "load-more": await loadHistory({ append: true }); break;
      case "open-family-settings": openFamilySettings(); break;
      default: break;
    }
  }

  async function handleMutation({ type, entry }) {
    const normalized = normalizeEntry(entry);
    if (!normalized) return false;
    const matches = (item) => item.id === normalized.id || (item.user_id === normalized.user_id && item.diary_date === normalized.diary_date);
    const affectedMonthKey = normalized.diary_date.slice(0, 7);
    const affectsCurrentMonth = state.currentMonthKey === affectedMonthKey;
    if (type === "delete") {
      if (affectsCurrentMonth) state.monthEntries = state.monthEntries.filter((item) => !matches(item));
      if (state.listInitialized) state.listEntries = state.listEntries.filter((item) => !matches(item));
    } else {
      if (affectsCurrentMonth) state.monthEntries = [normalized, ...state.monthEntries.filter((item) => !matches(item))];
      if (state.listInitialized) state.listEntries = [normalized, ...state.listEntries.filter((item) => !matches(item))];
    }
    rebuild();
    if (affectsCurrentMonth) writeCache();
    state.monthRenderReason = affectsCurrentMonth ? "mutation" : "passive";
    state.changedEntryId = affectsCurrentMonth ? normalized.id : "";
    render();
    if (!affectsCurrentMonth) return true;
    return loadMonth(state.currentMonthKey, { force: true, reason: "mutation", changedEntryId: normalized.id });
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
      state.monthRenderReason = "initial";
      state.changedEntryId = "";
      rebuild();
    }
    render();
    if (state.currentUserId) await loadMonth(state.currentMonthKey, { reason: "initial" });
  }

  async function refreshContext() {
    const previousSeatKey = state.participants.map(({ userId, shape }) => `${userId}:${shape}`).join("|");
    updateContext();
    const nextSeatKey = state.participants.map(({ userId, shape }) => `${userId}:${shape}`).join("|");
    render();
    if (state.currentUserId && state.currentMonthKey && previousSeatKey !== nextSeatKey) {
      return loadMonth(state.currentMonthKey, { force: true, reason: "passive" });
    }
    return false;
  }

  const view = injectedView || createMoodDiaryView({ elements, getAuthorName, getAuthorAvatar, onAction: (action) => { void dispatch(action); } });
  injectedView = view;
  return Object.freeze({
    activate,
    bind: () => view.bind(),
    render,
    refreshContext,
    getState: () => state,
    dispatch,
    loadMonth,
    loadHistory,
    selectDate: openEntry,
    beforeLeave: async () => {
      const canLeave = await (overlayController?.close?.() ?? true);
      if (canLeave !== false) view.destroy?.();
      return canLeave;
    },
    handleMutation,
  });
}
