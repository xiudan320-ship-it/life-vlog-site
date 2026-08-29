import assert from "node:assert/strict";
import test from "node:test";
import { filterDiaryPhotos, getDiaryFilterOptions } from "../modules/diary-domain.js";

const entries = [
  { id: "daily", category: "日常", title: "咖啡与晨光", taken_at: "2026-08-29", is_featured: 1 },
  { id: "travel", category: "旅行", title: "海边散步", taken_at: "2026-08-28", is_featured: 0 },
  { id: "old", category: "日常", title: "旧日记", taken_at: "2026-08-01", is_featured: 1 },
  { id: "vlog", category: "VLOG", title: "视频", taken_at: "2026-08-29" },
];

test("filter options keep fixed system filters and only show non-empty ordinary categories", () => {
  const options = getDiaryFilterOptions(entries, {
    isFavorite: (entry) => entry.id === "travel",
    isWithinSevenDays: (entry) => entry.id !== "old",
  });
  assert.deepEqual(options.map(({ value, count }) => [value, count]), [
    ["全部", 3],
    ["featured7", 1],
    ["favorites", 1],
    ["日常", 2],
    ["旅行", 1],
  ]);
  assert.equal(options.some(({ value }) => value === "食物"), false);
});

test("category, system filter, and search are combined with AND semantics", () => {
  const favorite = (entry) => entry.id === "travel";
  const recent = (entry) => entry.id !== "old";
  assert.deepEqual(filterDiaryPhotos(entries, { filter: "旅行", query: "海边", isFavorite: favorite, isWithinSevenDays: recent }).map(({ id }) => id), ["travel"]);
  assert.deepEqual(filterDiaryPhotos(entries, { filter: "favorites", query: "海边", isFavorite: favorite, isWithinSevenDays: recent }).map(({ id }) => id), ["travel"]);
  assert.deepEqual(filterDiaryPhotos(entries, { filter: "featured7", query: "咖啡", isFavorite: favorite, isWithinSevenDays: recent }).map(({ id }) => id), ["daily"]);
});
