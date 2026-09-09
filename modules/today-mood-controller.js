import {
  MOOD_META,
  MOOD_TYPES,
  getMoodAsset,
  normalizeDiaryDate,
  normalizeMood,
  normalizeMoodTags,
  resolveMoodParticipants,
  sortMoodDiaries,
} from "./mood-diary-shared.js";
import { createMoodDiaryRepository } from "./mood-diary-repository.js";
import { buildMoodMonthSummary } from "./mood-month-summary-domain.js";
import { createTodayMoodCache, MOOD_CACHE_TTL_MS } from "./today-mood-cache.js";
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
  overlayController,
  windowTarget = globalThis.window,
  storage = globalThis.localStorage,
  view: injectedView,
} = {}) {
  const repository = providedRepository || createMoodDiaryRepository({ getDatabase, getSession });
  const moodCache = createTodayMoodCache({ storage });
  const state = {
    currentUserId: "",
    todayKey: "",
    participants: [],
    entries: [],
    entriesByUserId: new Map(),
    monthKey: "",
    monthEntries: [],
    monthSummary: null,
    monthLoading: false,
    monthError: "",
    monthLoadedKey: "",
    participantSignature: "",
    loading: false,
    syncing: false,
    stale: false,
    hasLocalResult: false,
    error: "",
    requestRevision: 0,
  };
  let requestId = 0;
  let monthRequestId = 0;
  let monthLoadPromise = null;
  let monthLoadKey = "";
  let dayLoadPromise = null;
  let dayLoadKey = "";
  let dayContextSyncPending = false;

  function currentUserId() {
    return String(getSession?.()?.user?.id || "").trim();
  }

  function currentTodayKey() {
    return normalizeDiaryDate(getTodayKey?.()) || getTokyoDateKey();
  }

  function isDesktopViewport() {
    return Number(windowTarget?.innerWidth) >= 768;
  }

  function updateContext() {
    const previousUserId = state.currentUserId;
    const previousMonthKey = state.monthKey;
    const previousTodayKey = state.todayKey;
    const previousParticipantSignature = state.participantSignature;
    const nextUserId = currentUserId();
    const nextTodayKey = currentTodayKey();
    const nextMonthKey = nextTodayKey.slice(0, 7);
    const nextParticipants = resolveMoodParticipants({
      currentUserId: nextUserId,
      familyInfo: getFamilyInfo?.(),
      familyMembers: getFamilyMembers?.(),
    });
    const nextParticipantSignature = nextParticipants.map(({ userId }) => userId).join("|");
    const userChanged = previousUserId !== nextUserId;
    const monthChanged = previousMonthKey !== nextMonthKey;
    const contextChanged = userChanged || monthChanged;
    const dayChanged = Boolean(previousTodayKey) && previousTodayKey !== nextTodayKey;
    const participantsChanged = Boolean(previousParticipantSignature)
      && previousParticipantSignature !== nextParticipantSignature;
    const visibleUserIds = new Set(nextParticipants.map((participant) => participant.userId));
    state.currentUserId = nextUserId;
    state.todayKey = nextTodayKey;
    state.monthKey = nextMonthKey;
    state.participants = nextParticipants;
    state.participantSignature = nextParticipantSignature;
    if (contextChanged || participantsChanged) {
      if (userChanged || monthChanged) {
        state.monthEntries = [];
        state.monthSummary = null;
      } else {
        state.monthEntries = state.monthEntries.filter((entry) => (
          visibleUserIds.has(entry.user_id)
          && String(entry.diary_date || "").startsWith(`${state.monthKey}-`)
        ));
        state.monthSummary = buildMoodMonthSummary({
          monthKey: state.monthKey,
          entries: state.monthEntries,
          participants: state.participants,
        });
      }
      state.monthLoadedKey = "";
      state.monthLoading = false;
      state.monthError = "";
      monthRequestId += 1;
      monthLoadPromise = null;
      monthLoadKey = "";
    } else if (state.monthEntries.length) {
      state.monthSummary = buildMoodMonthSummary({
        monthKey: state.monthKey,
        entries: state.monthEntries,
        participants: state.participants,
      });
    }
    if (contextChanged || participantsChanged || dayChanged) {
      if (userChanged || monthChanged || dayChanged) {
        state.entries = [];
        state.entriesByUserId = new Map();
        state.hasLocalResult = false;
        state.syncing = false;
        state.stale = false;
      } else {
        // A family member can arrive after the local session. Keep the
        // already visible same-user cards while the wider participant set is
        // revalidated; filtering below still removes departed members.
        const hadLocalResult = state.hasLocalResult;
        state.entries = state.entries.filter((entry) => visibleUserIds.has(entry.user_id));
        state.entriesByUserId = new Map(state.entries.map((entry) => [entry.user_id, entry]));
        state.hasLocalResult = hadLocalResult || state.entries.length > 0;
        state.syncing = state.hasLocalResult;
        state.stale = false;
      }
      state.requestRevision += 1;
      requestId += 1;
      dayLoadPromise = null;
      dayLoadKey = "";
      dayContextSyncPending = participantsChanged || dayChanged || (contextChanged && Boolean(previousUserId));
    }
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

  async function loadMonthPreview({ force = false } = {}) {
    if (!isDesktopViewport() || !state.currentUserId || typeof repository?.listMonth !== "function") return false;
    const monthKey = state.monthKey;
    if (!force && state.monthLoadedKey === monthKey && !state.monthError) return true;
    if (!force && monthLoadPromise && monthLoadKey === monthKey) return monthLoadPromise;
    const cachedMonth = moodCache.readMonth(state.currentUserId, monthKey);
    if (cachedMonth) {
      state.monthEntries = cachedMonth.map(normalizeEntry).filter(Boolean);
      state.monthSummary = buildMoodMonthSummary({
        monthKey,
        entries: state.monthEntries,
        participants: state.participants,
      });
    }

    const freshCachedMonth = !force
      ? moodCache.readFreshMonth(state.currentUserId, monthKey, MOOD_CACHE_TTL_MS)
      : null;
    if (Array.isArray(freshCachedMonth)) {
      state.monthLoadedKey = monthKey;
      state.monthLoading = false;
      state.monthError = "";
      render();
      return true;
    }

    const currentRequestId = ++monthRequestId;
    monthLoadKey = monthKey;
    state.monthLoading = true;
    state.monthError = "";
    render();
    const request = (async () => {
      try {
        const rows = await repository.listMonth(monthKey);
        if (currentRequestId !== monthRequestId) return false;
        state.monthEntries = (Array.isArray(rows) ? rows : []).map(normalizeEntry).filter(Boolean);
        state.monthSummary = buildMoodMonthSummary({
          monthKey,
          entries: state.monthEntries,
          participants: state.participants,
        });
        state.monthLoadedKey = monthKey;
        state.monthLoading = false;
        state.monthError = "";
        moodCache.write(state.currentUserId, state.todayKey, state.monthEntries.filter((entry) => entry.diary_date === state.todayKey));
        moodCache.writeMonth(state.currentUserId, monthKey, state.monthEntries);
        render();
        return true;
      } catch {
        if (currentRequestId !== monthRequestId) return false;
        state.monthLoading = false;
        state.monthError = "本月心情暂时无法同步";
        render();
        return false;
      }
    })();
    const trackedRequest = request.finally(() => {
      if (monthLoadKey === monthKey && monthLoadPromise === trackedRequest) {
        monthLoadPromise = null;
        monthLoadKey = "";
      }
    });
    monthLoadPromise = trackedRequest;
    return trackedRequest;
  }

  async function refresh({ forceMonth = false, forceDay = false } = {}) {
    updateContext();
    const userId = state.currentUserId;
    const dateKey = state.todayKey;
    if (!userId) {
      state.requestRevision += 1;
      requestId += 1;
      dayLoadPromise = null;
      dayLoadKey = "";
      dayContextSyncPending = false;
      state.loading = false;
      state.syncing = false;
      state.hasLocalResult = false;
      state.entries = [];
      state.entriesByUserId = new Map();
      render();
      return [];
    }
    void loadMonthPreview({ force: forceMonth });
    const dayKey = `${userId}:${dateKey}`;
    if (!forceDay && dayLoadPromise && dayLoadKey === dayKey) return dayLoadPromise;
    const shouldForceDay = forceDay || dayContextSyncPending;
    dayContextSyncPending = false;
    const revision = ++state.requestRevision;
    const currentRequestId = ++requestId;
    state.error = "";
    state.stale = false;
    const cachedToday = moodCache.read(userId, dateKey);
    const hasCachedToday = Array.isArray(cachedToday);
    const seatByUserId = new Map(state.participants.map((participant, index) => [participant.userId, index]));
    if (hasCachedToday) {
      state.entries = sortMoodDiaries(
        cachedToday
          .map(normalizeEntry)
          .filter((entry) => entry && entry.diary_date === dateKey && seatByUserId.has(entry.user_id)),
        { seatByUserId },
      );
      state.entriesByUserId = new Map(state.entries.map((entry) => [entry.user_id, entry]));
      state.hasLocalResult = true;
      state.loading = false;
      state.syncing = true;
    } else {
      state.hasLocalResult = state.hasLocalResult || state.entries.length > 0;
      state.loading = !state.hasLocalResult;
      state.syncing = state.hasLocalResult;
    }
    render();
    const freshCachedToday = !shouldForceDay
      ? moodCache.readFresh(userId, dateKey, MOOD_CACHE_TTL_MS)
      : null;
    if (Array.isArray(freshCachedToday)) {
      state.loading = false;
      state.syncing = false;
      state.hasLocalResult = true;
      state.stale = false;
      render();
      return state.entries;
    }

    const request = (async () => {
      try {
        if (typeof repository?.listDay !== "function") throw new Error("今日心情仓储不可用");
        const rows = await repository.listDay(dateKey);
        if (currentRequestId !== requestId || revision !== state.requestRevision) return [];
        const normalizedRows = (Array.isArray(rows) ? rows : [])
          .map(normalizeEntry)
          .filter((entry) => entry && entry.diary_date === dateKey);
        state.entries = sortMoodDiaries(
          normalizedRows.filter((entry) => seatByUserId.has(entry.user_id)),
          { seatByUserId },
        );
        state.entriesByUserId = new Map(state.entries.map((entry) => [entry.user_id, entry]));
        state.loading = false;
        state.syncing = false;
        state.hasLocalResult = true;
        state.stale = false;
        state.error = "";
        moodCache.write(userId, dateKey, normalizedRows);
        render();
        return state.entries;
      } catch (error) {
        if (currentRequestId !== requestId || revision !== state.requestRevision) return [];
        state.loading = false;
        state.syncing = false;
        if (state.hasLocalResult) {
          state.stale = true;
          state.error = "";
        } else {
          state.stale = false;
          state.error = "今日心情暂时无法同步";
        }
        render();
        return [];
      }
    })();
    const trackedRequest = request.finally(() => {
      if (dayLoadKey === dayKey && dayLoadPromise === trackedRequest) {
        dayLoadPromise = null;
        dayLoadKey = "";
      }
    });
    dayLoadKey = dayKey;
    dayLoadPromise = trackedRequest;
    return trackedRequest;
  }

  async function openSeat(userId, trigger = null) {
    const targetUserId = String(userId || "").trim();
    if (!targetUserId || !state.participants.some((participant) => participant.userId === targetUserId)) return false;
    if (targetUserId !== state.currentUserId && !state.entriesByUserId.has(targetUserId)) return false;
    return Boolean(await overlayController?.open?.({
      dateKey: state.todayKey,
      entries: state.entries,
      preferredUserId: targetUserId,
      participants: state.participants,
      trigger,
    }));
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
      void openSeat(seat.dataset.todayMoodUser, seat);
    });
  }

  const view = injectedView || createTodayMoodView({ elements, getAuthorName });
  injectedView = view;
  bindEvents();
  const moodDomain = Object.freeze({
    MOOD_META,
    MOOD_TYPES,
    getMoodAsset,
    normalizeDiaryDate,
    normalizeMood,
    normalizeMoodTags,
    sortMoodDiaries,
  });

  return Object.freeze({
    loadMonthPreview,
    refresh,
    retry: refresh,
    render,
    openCalendar,
    openSeat,
    getRepository: () => repository,
    getMoodDomain: () => moodDomain,
    getState: () => state,
  });
}
