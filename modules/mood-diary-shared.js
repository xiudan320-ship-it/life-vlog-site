const DIARY_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MOOD_TYPES = Object.freeze([
  "tired",
  "angry",
  "excited",
  "annoyed",
  "heart",
  "calm",
  "sad",
  "happy",
]);

export const MOOD_META = Object.freeze({
  tired: Object.freeze({
    label: "疲惫",
    accent: "#8b78a6",
    assets: Object.freeze({
      circle: "/assets/mood-diary/tired-circle.png",
      square: "/assets/mood-diary/tired-square.png",
    }),
  }),
  angry: Object.freeze({
    label: "生气",
    accent: "#d96b63",
    assets: Object.freeze({
      circle: "/assets/mood-diary/angry-circle.png",
      square: "/assets/mood-diary/angry-square.png",
    }),
  }),
  excited: Object.freeze({
    label: "兴奋",
    accent: "#e4a23a",
    assets: Object.freeze({
      circle: "/assets/mood-diary/excited-circle.png",
      square: "/assets/mood-diary/excited-square.png",
    }),
  }),
  annoyed: Object.freeze({
    label: "烦躁",
    accent: "#e07d52",
    assets: Object.freeze({
      circle: "/assets/mood-diary/annoyed-circle.png",
      square: "/assets/mood-diary/annoyed-square.png",
    }),
  }),
  heart: Object.freeze({
    label: "心动",
    accent: "#d65f76",
    assets: Object.freeze({
      circle: "/assets/mood-diary/heart-circle.png",
      square: "/assets/mood-diary/heart-square.png",
    }),
  }),
  calm: Object.freeze({
    label: "平静",
    accent: "#5e9a91",
    assets: Object.freeze({
      circle: "/assets/mood-diary/calm-circle.png",
      square: "/assets/mood-diary/calm-square.png",
    }),
  }),
  sad: Object.freeze({
    label: "难过",
    accent: "#6b88b5",
    assets: Object.freeze({
      circle: "/assets/mood-diary/sad-circle.png",
      square: "/assets/mood-diary/sad-square.png",
    }),
  }),
  happy: Object.freeze({
    label: "开心",
    accent: "#e69a49",
    assets: Object.freeze({
      circle: "/assets/mood-diary/happy-circle.png",
      square: "/assets/mood-diary/happy-square.png",
    }),
  }),
});

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

function parseDiaryDate(value) {
  if (typeof value !== "string") return null;
  const match = value.match(DIARY_DATE_PATTERN);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function formatDateKey(year, month, day) {
  return `${formatYear(year)}-${pad(month)}-${pad(day)}`;
}

export function normalizeMood(value) {
  const mood = String(value ?? "").trim().toLowerCase();
  return MOOD_TYPES.includes(mood) ? mood : null;
}

export function normalizeMoodTags(tags, { maxTags = 8, maxLength = 20 } = {}) {
  let source = tags;
  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source);
      source = Array.isArray(parsed) ? parsed : source.split(/[,，]/u);
    } catch {
      source = source.split(/[,，]/u);
    }
  }
  if (!Array.isArray(source)) return [];
  const seen = new Set();
  const normalized = [];
  for (const value of source) {
    const tag = String(value ?? "").trim().replace(/^#+/u, "").trim();
    if (!tag || [...tag].length > maxLength || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
  }
  return normalized.slice(0, Math.max(0, maxTags));
}

export function normalizeDiaryDate(value) {
  const parsed = parseDiaryDate(value);
  return parsed ? formatDateKey(parsed.year, parsed.month, parsed.day) : null;
}

export function getMonthRange(monthKey) {
  const normalized = String(monthKey ?? "").trim();
  const match = normalized.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new RangeError("monthKey must use YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new RangeError("monthKey must use a valid month");
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return Object.freeze({
    monthKey: `${formatYear(year)}-${pad(month)}`,
    year,
    month,
    start: formatDateKey(year, month, 1),
    nextMonthStart: formatDateKey(nextYear, nextMonth, 1),
  });
}

function joinedAtTimestamp(value) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
  }
  const text = String(value ?? "").trim();
  if (!text) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function resolveMoodParticipants({
  currentUserId = "",
  familyInfo = null,
  familyMembers = [],
} = {}) {
  const normalizedCurrentUserId = String(currentUserId || "").trim();
  const members = [];
  const seen = new Set();
  for (const member of Array.isArray(familyMembers) ? familyMembers : []) {
    const userId = String(member?.user_id || "").trim();
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    members.push({
      userId,
      role: String(member?.role || "").trim().toLowerCase(),
      joinedAt: member?.joined_at,
    });
  }

  if (!members.length) {
    return normalizedCurrentUserId
      ? [{ userId: normalizedCurrentUserId, shape: "square", role: "owner" }]
      : [];
  }

  const declaredOwnerId = String(familyInfo?.owner_id || familyInfo?.ownerId || "").trim();
  const owner = members.find((member) => member.role === "owner")
    || members.find((member) => member.userId === declaredOwnerId)
    || (familyInfo?.isOwner
      ? members.find((member) => member.userId === normalizedCurrentUserId)
      : null)
    || members[0];
  const second = members
    .filter((member) => member.userId !== owner.userId)
    .sort((left, right) => {
      const joinedAtDifference = joinedAtTimestamp(left.joinedAt) - joinedAtTimestamp(right.joinedAt);
      if (joinedAtDifference) return joinedAtDifference;
      return left.userId.localeCompare(right.userId);
    })[0];

  return [
    { userId: owner.userId, shape: "square", role: "owner" },
    ...(second ? [{ userId: second.userId, shape: "circle", role: "member" }] : []),
  ];
}

function getSeatRank(entry, seatByUserId) {
  if (typeof seatByUserId === "function") return Number(seatByUserId(entry.user_id)) || 0;
  if (seatByUserId && typeof seatByUserId.get === "function") {
    return Number(seatByUserId.get(entry.user_id)) || 0;
  }
  return 0;
}

export function sortMoodDiaries(entries, { seatByUserId } = {}) {
  return [...(Array.isArray(entries) ? entries : [])].sort((left, right) => {
    const leftDate = normalizeDiaryDate(left?.diary_date) || "";
    const rightDate = normalizeDiaryDate(right?.diary_date) || "";
    if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
    const seatDifference = getSeatRank(left, seatByUserId) - getSeatRank(right, seatByUserId);
    if (seatDifference) return seatDifference;
    const userDifference = String(left?.user_id || "").localeCompare(String(right?.user_id || ""));
    if (userDifference) return userDifference;
    return String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

export function getMoodAsset(mood, shape = "circle") {
  const normalizedMood = normalizeMood(mood);
  if (!normalizedMood || !["circle", "square"].includes(shape)) return null;
  return MOOD_META[normalizedMood].assets[shape] || null;
}
