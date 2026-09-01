import assert from "node:assert/strict";
import test from "node:test";

import {
  MOOD_MONTH_SUMMARY_LIMIT,
  buildMoodMonthSummary,
  getMoodTrendLevel,
} from "../modules/mood-month-summary-domain.js";

const participants = [
  { userId: "owner", name: "小秀", shape: "square" },
  { userId: "member", name: "小咻", shape: "circle" },
];

function entry(id, userId, dateKey, mood) {
  return { id, user_id: userId, diary_date: dateKey, mood, content: "", tags: [] };
}

test("monthly summary filters the current family month and keeps both seats", () => {
  const summary = buildMoodMonthSummary({
    monthKey: "2026-03",
    participants,
    entries: [
      entry("inside-owner", "owner", "2026-03-01", "happy"),
      entry("inside-member", "member", "2026-03-31", "calm"),
      entry("outside", "owner", "2026-04-01", "sad"),
      entry("stranger", "stranger", "2026-03-15", "angry"),
    ],
  });
  assert.equal(summary.total, 2);
  assert.deepEqual(summary.jarItems.map(({ shape }) => shape), ["square", "circle"]);
  assert.deepEqual(summary.dominantByUser.map(({ userId, totalCount }) => [userId, totalCount]), [["owner", 1], ["member", 1]]);
  assert.deepEqual(summary.trendSeries.map(({ totalCount }) => totalCount), [1, 1]);
});

test("dominant mood uses count, then latest date, without changing the source mood", () => {
  const entries = [
    entry("owner-01", "owner", "2026-03-01", "tired"),
    entry("owner-02", "owner", "2026-03-02", "happy"),
    entry("owner-03", "owner", "2026-03-03", "happy"),
    entry("owner-04", "owner", "2026-03-04", "tired"),
    entry("member-01", "member", "2026-03-03", "angry"),
  ];
  const sourceMoods = entries.map(({ mood }) => mood);
  const summary = buildMoodMonthSummary({ monthKey: "2026-03", participants, entries });
  assert.equal(summary.dominantByUser[0].mood, "tired", "the most recent equal-count mood wins");
  assert.equal(summary.dominantByUser[0].count, 2);
  assert.deepEqual(entries.map(({ mood }) => mood), sourceMoods);
  assert.deepEqual(
    ["happy", "heart", "excited", "calm", "tired", "annoyed", "sad", "angry"].map((mood) => [mood, getMoodTrendLevel(mood).key]),
    [["happy", "high"], ["heart", "high"], ["excited", "high"], ["calm", "steady"], ["tired", "steady"], ["annoyed", "low"], ["sad", "low"], ["angry", "low"]],
  );
});

test("trend series creates real points and breaks across missing dates", () => {
  const summary = buildMoodMonthSummary({
    monthKey: "2024-02",
    participants,
    entries: [
      entry("owner-01", "owner", "2024-02-01", "happy"),
      entry("owner-02", "owner", "2024-02-02", "calm"),
      entry("owner-05", "owner", "2024-02-05", "sad"),
      entry("member-29", "member", "2024-02-29", "heart"),
    ],
  });
  assert.deepEqual(summary.trendSeries[0].points.map(({ dateKey, level }) => [dateKey, level]), [
    ["2024-02-01", 2],
    ["2024-02-02", 1],
    ["2024-02-05", 0],
  ]);
  assert.equal(summary.trendSeries[0].segments.length, 2);
  assert.equal(summary.trendSeries[0].segments[1][0].dateKey, "2024-02-05");
  assert.equal(summary.trendSeries[1].points[0].dateKey, "2024-02-29");
});

test("jar coordinates are deterministic, bounded, shaped by seat, and capped at 62", () => {
  const entries = [];
  for (let day = 1; day <= 31; day += 1) {
    const dateKey = `2026-08-${String(day).padStart(2, "0")}`;
    entries.push(entry(`owner-${day}`, "owner", dateKey, day % 2 ? "happy" : "tired"));
    entries.push(entry(`member-${day}`, "member", dateKey, day % 2 ? "calm" : "sad"));
  }
  const first = buildMoodMonthSummary({ monthKey: "2026-08", participants, entries });
  const second = buildMoodMonthSummary({ monthKey: "2026-08", participants, entries });
  assert.equal(first.total, 62);
  assert.equal(first.jarItems.length, MOOD_MONTH_SUMMARY_LIMIT);
  assert.deepEqual(first.jarItems, second.jarItems);
  assert.ok(first.jarItems.every(({ x, y }) => x >= 14.5 && x <= 85.5 && y >= 30 && y <= 86));
  assert.deepEqual(first.jarItems.slice(0, 2).map(({ shape }) => shape), ["square", "circle"]);
  assert.equal(new Set(first.jarItems.map(({ slotIndex }) => slotIndex)).size, 62);
});

test("empty or single-seat months remain explicit instead of inventing a dominant mood", () => {
  const summary = buildMoodMonthSummary({
    monthKey: "2021-02",
    participants,
    entries: [entry("owner-01", "owner", "2021-02-28", "angry")],
  });
  assert.equal(summary.dominantByUser[1].mood, null);
  assert.equal(summary.dominantByUser[1].count, 0);
  assert.equal(summary.trendSeries[1].hasData, false);
  assert.match(summary.textSummary, /小咻还没有记录/u);
  const empty = buildMoodMonthSummary({ monthKey: "2021-02", participants, entries: [] });
  assert.equal(empty.total, 0);
  assert.equal(empty.jarItems.length, 0);
  assert.equal(empty.textSummary, "这个月还没有心情记录。");
});

console.log("Mood month summary domain tests passed.");
