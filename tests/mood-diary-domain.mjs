import assert from "node:assert/strict";
import test from "node:test";

import {
  MOOD_META,
  MOOD_TYPES,
  buildCalendarWeeks,
  getMonthRange,
  getMoodAsset,
  groupMoodDiariesByDate,
  isFutureLocalDate,
  normalizeDiaryDate,
  normalizeMood,
  normalizeMoodTags,
  sortMoodDiaries,
} from "../modules/mood-diary-domain.js";

test("mood domain keeps the eight fixed moods and rejects unknown values", () => {
  assert.deepEqual(MOOD_TYPES, ["tired", "angry", "excited", "annoyed", "heart", "calm", "sad", "happy"]);
  assert.equal(normalizeMood(" HAPPY "), "happy");
  assert.equal(normalizeMood("surprised"), null);
  assert.equal(getMoodAsset("surprised"), null);
  assert.equal(getMoodAsset("happy", "triangle"), null);
  assert.equal(MOOD_META.happy.assets.circle, "/assets/mood-diary/happy-circle.png");
});

test("mood tags trim hashes, remove duplicates, and cap the fixed input shape", () => {
  assert.deepEqual(
    normalizeMoodTags([" #今天 ", "今天", "", "##散步", "   ", "工作"]),
    ["今天", "散步", "工作"],
  );
  assert.equal(normalizeMoodTags(Array.from({ length: 10 }, (_, index) => `tag-${index}`)).length, 8);
  assert.deepEqual(normalizeMoodTags("[\"#one\",\"two\"]"), ["one", "two"]);
});

test("mood dates are natural local dates and reject calendar overflow", () => {
  assert.equal(normalizeDiaryDate("2024-02-29"), "2024-02-29");
  assert.equal(normalizeDiaryDate("2023-02-29"), null);
  assert.equal(normalizeDiaryDate("2026-02-30"), null);
  assert.equal(normalizeDiaryDate("2026-8-1"), null);
  assert.equal(normalizeDiaryDate("2026-08-31T00:30:00+09:00"), null);
  assert.equal(isFutureLocalDate("2026-08-31", "2026-08-31"), false);
  assert.equal(isFutureLocalDate("2026-09-01", "2026-08-31"), true);
  assert.equal(isFutureLocalDate("2026-08-30", "2026-08-31"), false);
});

test("month range crosses years and calendar weeks start on Monday with 4-6 rows", () => {
  assert.deepEqual(getMonthRange("2026-12"), {
    monthKey: "2026-12",
    year: 2026,
    month: 12,
    start: "2026-12-01",
    nextMonthStart: "2027-01-01",
  });
  assert.throws(() => getMonthRange("2026-13"), /valid month/);
  for (const monthKey of ["2021-02", "2026-05", "2026-08"]) {
    const weeks = buildCalendarWeeks(monthKey);
    assert.ok(weeks.length >= 4 && weeks.length <= 6);
    assert.equal(weeks.every((week) => week.length === 7), true);
  }
  assert.equal(buildCalendarWeeks("2026-08")[0][0].dateKey, "2026-07-27");
  assert.equal(buildCalendarWeeks("2026-08")[0][0].isCurrentMonth, false);
  assert.equal(buildCalendarWeeks("2026-08")[0][5].dateKey, "2026-08-01");
});

test("diaries sort newest first and put the circle seat before the square seat", () => {
  const entries = [
    { id: "square", user_id: "member", diary_date: "2026-08-31" },
    { id: "older", user_id: "owner", diary_date: "2026-08-30" },
    { id: "circle", user_id: "owner", diary_date: "2026-08-31" },
  ];
  const sorted = sortMoodDiaries(entries, { seatByUserId: new Map([["owner", 0], ["member", 1]]) });
  assert.deepEqual(sorted.map(({ id }) => id), ["circle", "square", "older"]);
  const grouped = groupMoodDiariesByDate(sorted);
  assert.deepEqual(grouped.get("2026-08-31").map(({ id }) => id), ["circle", "square"]);
});

console.log("Mood diary domain tests passed.");
