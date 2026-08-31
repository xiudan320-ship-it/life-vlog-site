import {
  MOOD_META,
  MOOD_TYPES,
  getMoodAsset,
  getMonthRange,
  normalizeDiaryDate,
  normalizeMood,
  normalizeMoodTags,
  resolveMoodParticipants,
  sortMoodDiaries,
} from "./mood-diary-shared.js";

export {
  MOOD_META,
  MOOD_TYPES,
  getMoodAsset,
  getMonthRange,
  normalizeDiaryDate,
  normalizeMood,
  normalizeMoodTags,
  resolveMoodParticipants,
  sortMoodDiaries,
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatYear(year) {
  return String(year).padStart(4, "0");
}

function daysInMonth(year, month) {
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function makeUtcDate(year, month, day) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function formatDateKey(year, month, day) {
  return `${formatYear(year)}-${pad(month)}-${pad(day)}`;
}

export function buildCalendarWeeks(monthKey) {
  const range = getMonthRange(monthKey);
  const first = makeUtcDate(range.year, range.month, 1);
  const leadingDays = (first.getUTCDay() + 6) % 7;
  const totalDays = daysInMonth(range.year, range.month);
  const cellCount = Math.ceil((leadingDays + totalDays) / 7) * 7;
  const weeks = [];
  for (let index = 0; index < cellCount; index += 1) {
    const relativeDay = index - leadingDays + 1;
    let year = range.year;
    let month = range.month;
    let day = relativeDay;
    if (relativeDay < 1) {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      day = daysInMonth(year, month) + relativeDay;
    } else if (relativeDay > totalDays) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      day = relativeDay - totalDays;
    }
    const isCurrentMonth = relativeDay >= 1 && relativeDay <= totalDays;
    const cell = {
      dateKey: formatDateKey(year, month, day),
      day,
      monthKey: `${formatYear(year)}-${pad(month)}`,
      isCurrentMonth,
    };
    const weekIndex = Math.floor(index / 7);
    if (!weeks[weekIndex]) weeks[weekIndex] = [];
    weeks[weekIndex].push(Object.freeze(cell));
  }
  return weeks.map((week) => Object.freeze(week));
}

export function isFutureLocalDate(dateKey, todayKey) {
  const date = normalizeDiaryDate(dateKey);
  const today = normalizeDiaryDate(todayKey);
  if (!date || !today) return false;
  return date > today;
}

export function groupMoodDiariesByDate(entries) {
  const groups = new Map();
  for (const entry of entries || []) {
    const dateKey = normalizeDiaryDate(entry?.diary_date);
    if (!dateKey) continue;
    const group = groups.get(dateKey) || [];
    group.push(entry);
    groups.set(dateKey, group);
  }
  return groups;
}
