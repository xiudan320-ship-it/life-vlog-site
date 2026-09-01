import {
  MOOD_META,
  MOOD_TYPES,
  getMoodAsset,
  getMonthRange,
  normalizeDiaryDate,
  normalizeMood,
} from "./mood-diary-shared.js";

export const MOOD_TREND_LEVELS = Object.freeze({
  high: Object.freeze({ key: "high", label: "高涨", value: 2 }),
  steady: Object.freeze({ key: "steady", label: "平稳", value: 1 }),
  low: Object.freeze({ key: "low", label: "低落", value: 0 }),
});

const MOOD_LEVEL_BY_TYPE = Object.freeze({
  happy: MOOD_TREND_LEVELS.high,
  heart: MOOD_TREND_LEVELS.high,
  excited: MOOD_TREND_LEVELS.high,
  calm: MOOD_TREND_LEVELS.steady,
  tired: MOOD_TREND_LEVELS.steady,
  annoyed: MOOD_TREND_LEVELS.low,
  sad: MOOD_TREND_LEVELS.low,
  angry: MOOD_TREND_LEVELS.low,
});

const MAX_JAR_ITEMS = 62;

const TREND_LAYOUTS = Object.freeze({
  compact: Object.freeze({
    width: 390,
    height: 360,
    plotLeft: 70,
    plotRight: 374,
    highY: 72,
    steadyY: 180,
    lowY: 288,
  }),
  regular: Object.freeze({
    width: 720,
    height: 320,
    plotLeft: 88,
    plotRight: 696,
    highY: 64,
    steadyY: 150,
    lowY: 236,
  }),
});

function participantId(participant) {
  return String(participant?.userId || participant?.user_id || "").trim();
}

function normalizeParticipants(participants) {
  const seen = new Set();
  const result = [];
  for (const participant of Array.isArray(participants) ? participants : []) {
    const userId = participantId(participant);
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    result.push({
      ...participant,
      userId,
      shape: result.length === 0 ? "square" : "circle",
    });
    if (result.length === 2) break;
  }
  return result;
}

function normalizeEntries(entries, monthKey, participants) {
  const { start, nextMonthStart } = getMonthRange(monthKey);
  const allowedIds = new Set(participants.map(({ userId }) => userId));
  const candidates = (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const dateKey = normalizeDiaryDate(entry?.diary_date);
      const mood = normalizeMood(entry?.mood);
      const userId = String(entry?.user_id || "").trim();
      if (!entry?.id || !dateKey || !mood || !allowedIds.has(userId)) return null;
      if (dateKey < start || dateKey >= nextMonthStart) return null;
      return {
        ...entry,
        id: String(entry.id),
        user_id: userId,
        diary_date: dateKey,
        mood,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const dateDifference = left.diary_date.localeCompare(right.diary_date);
      if (dateDifference) return dateDifference;
      const userDifference = left.user_id.localeCompare(right.user_id);
      if (userDifference) return userDifference;
      return left.id.localeCompare(right.id);
    });

  const uniqueByDay = new Map();
  for (const entry of candidates) {
    const key = `${entry.user_id}:${entry.diary_date}`;
    if (!uniqueByDay.has(key)) uniqueByDay.set(key, entry);
  }
  return [...uniqueByDay.values()];
}

function seatRankFactory(participants) {
  const ranks = new Map(participants.map(({ userId }, index) => [userId, index]));
  return (userId) => ranks.get(userId) ?? Number.MAX_SAFE_INTEGER;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(seed, salt) {
  return hashString(`${seed}:${salt}`) / 4294967296;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sortJarEntries(entries, seatRank) {
  return [...entries].sort((left, right) => {
    const dateDifference = left.diary_date.localeCompare(right.diary_date);
    if (dateDifference) return dateDifference;
    const seatDifference = seatRank(left.user_id) - seatRank(right.user_id);
    if (seatDifference) return seatDifference;
    return left.id.localeCompare(right.id);
  });
}

export function getMoodTrendLevel(mood) {
  const normalizedMood = normalizeMood(mood);
  return normalizedMood ? MOOD_LEVEL_BY_TYPE[normalizedMood] || null : null;
}

export function buildJarItems(entries, { participants = [] } = {}) {
  const normalizedParticipants = normalizeParticipants(participants);
  const seatRank = seatRankFactory(normalizedParticipants);
  return sortJarEntries(entries || [], seatRank)
    .slice(0, MAX_JAR_ITEMS)
    .map((entry, index) => {
      const participant = normalizedParticipants.find(({ userId }) => userId === entry.user_id);
      const seed = `${entry.id}:${entry.user_id}:${entry.diary_date}:${entry.mood}`;
      const rotate = Number((-7 + hashUnit(seed, "rotate") * 15).toFixed(2));
      const scale = Number((0.88 + hashUnit(seed, "scale") * 0.12).toFixed(3));
      const shape = participant?.shape || "circle";
      return Object.freeze({
        entryId: entry.id,
        userId: entry.user_id,
        dateKey: entry.diary_date,
        mood: entry.mood,
        moodLabel: MOOD_META[entry.mood]?.label || entry.mood,
        shape,
        asset: getMoodAsset(entry.mood, shape),
        slotIndex: index,
        rotate,
        scale,
      });
    });
}

function normalizeRecordedDays(recordedDays, monthDays) {
  return [...new Set((Array.isArray(recordedDays) ? recordedDays : [])
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= monthDays))]
    .sort((left, right) => left - right);
}

export function getMoodTrendLayout({ compact = false, monthDays = 31, recordedDays = [] } = {}) {
  const safeMonthDays = clamp(Number.isInteger(monthDays) ? monthDays : 31, 1, 31);
  const normalizedDays = normalizeRecordedDays(recordedDays, safeMonthDays);
  const daySpan = normalizedDays.length ? normalizedDays.at(-1) - normalizedDays[0] : 0;
  const hasLeadingOrTrailingGap = normalizedDays.length > 0
    && (normalizedDays[0] > 1 || normalizedDays.at(-1) < safeMonthDays);
  const sparse = normalizedDays.length > 0 && (normalizedDays.length <= 8 || (daySpan <= 10 && hasLeadingOrTrailingGap));
  const mode = compact && sparse ? "recorded-days" : "calendar-days";
  const base = compact ? TREND_LAYOUTS.compact : TREND_LAYOUTS.regular;
  return Object.freeze({
    ...base,
    mode,
    monthDays: safeMonthDays,
    recordedDays: Object.freeze(normalizedDays),
  });
}

export function getMoodTrendX(layout, day, monthDays = layout?.monthDays || 31) {
  const safeDay = clamp(Number(day) || 1, 1, Number(monthDays) || 31);
  if (layout?.mode === "recorded-days" && layout.recordedDays?.length) {
    const exactIndex = layout.recordedDays.indexOf(safeDay);
    const index = exactIndex >= 0
      ? exactIndex
      : layout.recordedDays.reduce((closest, recordedDay, recordedIndex) => (
        Math.abs(recordedDay - safeDay) < Math.abs(layout.recordedDays[closest] - safeDay) ? recordedIndex : closest
      ), 0);
    return layout.plotLeft + (index / Math.max(1, layout.recordedDays.length - 1)) * (layout.plotRight - layout.plotLeft);
  }
  return layout.plotLeft + ((safeDay - 1) / Math.max(1, (Number(monthDays) || 31) - 1)) * (layout.plotRight - layout.plotLeft);
}

function buildDominantMood(entries, participant) {
  const moodStats = new Map();
  for (const entry of entries) {
    if (entry.user_id !== participant.userId) continue;
    const current = moodStats.get(entry.mood) || { count: 0, latestDateKey: "" };
    current.count += 1;
    if (entry.diary_date > current.latestDateKey) current.latestDateKey = entry.diary_date;
    moodStats.set(entry.mood, current);
  }
  const ranked = [...moodStats.entries()].sort(([leftMood, left], [rightMood, right]) => {
    if (left.count !== right.count) return right.count - left.count;
    if (left.latestDateKey !== right.latestDateKey) return right.latestDateKey.localeCompare(left.latestDateKey);
    return MOOD_TYPES.indexOf(leftMood) - MOOD_TYPES.indexOf(rightMood);
  });
  const [mood, stats] = ranked[0] || [];
  return Object.freeze({
    ...participant,
    mood: mood || null,
    moodLabel: mood ? MOOD_META[mood]?.label || mood : "",
    count: stats?.count || 0,
    totalCount: entries.filter((entry) => entry.user_id === participant.userId).length,
    latestDateKey: stats?.latestDateKey || "",
  });
}

function ordinal(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function trendSegment(kind, points) {
  return Object.freeze({ kind, points: Object.freeze([...points]) });
}

function splitTrendSegments(points) {
  const segments = [];
  let current = [];
  for (const point of points) {
    const previous = current.at(-1);
    if (previous && ordinal(point.dateKey) - ordinal(previous.dateKey) > 1) {
      if (current.length) segments.push(trendSegment("solid", current));
      segments.push(trendSegment("gap", [previous, point]));
      current = [point];
      continue;
    }
    current.push(point);
  }
  if (current.length) segments.push(trendSegment("solid", current));
  return Object.freeze(segments);
}

function buildTrendSeries(entries, participants) {
  return Object.freeze(participants.map((participant) => {
    const points = entries
      .filter((entry) => entry.user_id === participant.userId)
      .sort((left, right) => left.diary_date.localeCompare(right.diary_date))
      .map((entry) => {
        const level = getMoodTrendLevel(entry.mood);
        return Object.freeze({
          entryId: entry.id,
          userId: entry.user_id,
          dateKey: entry.diary_date,
          day: Number(entry.diary_date.slice(-2)),
          mood: entry.mood,
          moodLabel: MOOD_META[entry.mood]?.label || entry.mood,
          levelKey: level?.key || "steady",
          levelLabel: level?.label || "平稳",
          level: level?.value ?? 1,
          shape: participant.shape,
        });
      });
    return Object.freeze({
      ...participant,
      points: Object.freeze(points),
      segments: splitTrendSegments(points),
      totalCount: points.length,
      hasData: points.length > 0,
    });
  }));
}

function buildTextSummary(total, dominantByUser) {
  if (!total) return "这个月还没有心情记录。";
  const parts = dominantByUser.map((item) => {
    const name = String(item.name || item.username || item.userId || "成员");
    return item.mood
      ? `${name}记录 ${item.totalCount} 条，最多是${item.moodLabel}（${item.count} 次）`
      : `${name}还没有记录`;
  });
  return `本月共记录 ${total} 条心情。${parts.join("；")}。`;
}

export function buildMoodMonthSummary({ monthKey, entries = [], participants = [] } = {}) {
  const range = getMonthRange(monthKey);
  const normalizedParticipants = normalizeParticipants(participants);
  const monthEntries = normalizeEntries(entries, range.monthKey, normalizedParticipants);
  const dominantByUser = Object.freeze(normalizedParticipants.map((participant) => buildDominantMood(monthEntries, participant)));
  const trendSeries = buildTrendSeries(monthEntries, normalizedParticipants);
  const jarItems = Object.freeze(buildJarItems(monthEntries, { participants: normalizedParticipants }));
  return Object.freeze({
    monthKey: range.monthKey,
    total: monthEntries.length,
    jarItems,
    dominantByUser,
    trendSeries,
    textSummary: buildTextSummary(monthEntries.length, dominantByUser),
  });
}

export const MOOD_MONTH_SUMMARY_LIMIT = MAX_JAR_ITEMS;
