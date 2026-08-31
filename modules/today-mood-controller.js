import {
  normalizeDiaryDate,
  normalizeMood,
  resolveMoodParticipants,
  sortMoodDiaries,
} from "./mood-diary-shared.js";
import { createMoodDiaryRepository } from "./mood-diary-repository.js";
import { createTodayMoodView } from "./today-mood-view.js";

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

function normalizeEntry(entry) {
  const userId = String(entry?.user_id || "").trim();
  const diaryDate = normalizeDiaryDate(entry?.diary_date);
  const mood = normalizeMood(entry?.mood);
  if (!entry?.id || !userId || !diaryDate || !mood) return null;
  return {
    ...entry,
    id: String(entry.id),
    user_id: userId,
    diary_date: diaryDate,
    mood,
  };
}

export function createTodayMoodController({
  elements,
  state: runtimeState,
  repository: providedRepository,
  getDatabase = () => runtimeState?.cloudDb,
  getSession = () => runtimeState?.session || null,
  getFamilyInfo = () => runtimeState?.familyInfo || null,
  getFamilyMembers = () => runtimeState?.familyMembers || [],
  getAuthorName,
  getTodayKey,
  switchPage = async () => false,
  controllers,
  getMoodDiaryController = () => controllers?.moodDiary,
  view: injectedView,
} = {}) {
  const repository = providedRepository || createMoodDiaryRepository({ getDatabase, getSession });
  const state = {
    currentUserId: "",
    todayKey: "",
    participants: [],
    entries: [],
    entriesByUserId: new Map(),
    loading: false,
    error: "",
    requestRevision: 0,
  };
  let requestId = 0;

  function currentUserId() {
    return String(getSession?.()?.user?.id || "").trim();
  }

  function currentTodayKey() {
    return normalizeDiaryDate(getTodayKey?.()) || getTokyoDateKey();
  }

  function updateContext() {
    state.currentUserId = currentUserId();
    state.todayKey = currentTodayKey();
    state.participants = resolveMoodParticipants({
      currentUserId: state.currentUserId,
      familyInfo: getFamilyInfo?.(),
      familyMembers: getFamilyMembers?.(),
    });
    const visibleUserIds = new Set(state.participants.map((participant) => participant.userId));
    state.entries = state.entries.filter((entry) => visibleUserIds.has(entry.user_id) && entry.diary_date === state.todayKey);
    state.entriesByUserId = new Map(state.entries.map((entry) => [entry.user_id, entry]));
  }

  function render() {
    updateContext();
    injectedView?.render?.({
      ...state,
      entries: state.entries.map((entry) => ({ ...entry, tags: [...(entry.tags || [])] })),
      entriesByUserId: new Map(state.entriesByUserId),
      participants: state.participants.map((participant) => ({ ...participant })),
    });
  }

  async function refresh() {
    updateContext();
    const userId = state.currentUserId;
    const dateKey = state.todayKey;
    const revision = ++state.requestRevision;
    const currentRequestId = ++requestId;
    state.error = "";
    if (!userId) {
      state.loading = false;
      state.entries = [];
      state.entriesByUserId = new Map();
      render();
      return [];
    }
    state.loading = true;
    render();
    try {
      if (typeof repository?.listDay !== "function") throw new Error("今日心情仓储不可用");
      const rows = await repository.listDay(dateKey);
      if (currentRequestId !== requestId || revision !== state.requestRevision) return [];
      const seatByUserId = new Map(state.participants.map((participant, index) => [participant.userId, index]));
      state.entries = sortMoodDiaries(
        (Array.isArray(rows) ? rows : [])
          .map(normalizeEntry)
          .filter((entry) => entry && entry.diary_date === dateKey && seatByUserId.has(entry.user_id)),
        { seatByUserId },
      );
      state.entriesByUserId = new Map(state.entries.map((entry) => [entry.user_id, entry]));
      state.loading = false;
      state.error = "";
      render();
      return state.entries;
    } catch (error) {
      if (currentRequestId !== requestId || revision !== state.requestRevision) return [];
      state.loading = false;
      state.error = "今日心情暂时无法同步";
      render();
      return [];
    }
  }

  async function openSeat(userId) {
    const targetUserId = String(userId || "").trim();
    if (!targetUserId || !state.participants.some((participant) => participant.userId === targetUserId)) return false;
    const opened = await switchPage("mood", { restoreScroll: false, focusHeading: false });
    if (!opened) return false;
    const moodDiaryController = getMoodDiaryController?.();
    if (!moodDiaryController?.dispatch) return false;
    await moodDiaryController.dispatch({ type: "open-today", userId: targetUserId });
    return true;
  }

  function openCalendar() {
    return switchPage("mood");
  }

  function bindEvents() {
    elements?.overviewMoodCalendar?.addEventListener("click", () => {
      void openCalendar();
    });
    elements?.todayMoodRetry?.addEventListener("click", () => {
      void refresh();
    });
    elements?.todayMoodGrid?.addEventListener("click", (event) => {
      const seat = event.target.closest?.("[data-today-mood-user]");
      if (!seat) return;
      void openSeat(seat.dataset.todayMoodUser);
    });
  }

  const view = injectedView || createTodayMoodView({ elements, getAuthorName });
  injectedView = view;
  bindEvents();

  return Object.freeze({
    refresh,
    retry: refresh,
    render,
    openCalendar,
    openSeat,
    getState: () => state,
  });
}
