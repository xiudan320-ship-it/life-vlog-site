import assert from "node:assert/strict";
import test from "node:test";
import { formatWishDate } from "../modules/wishlist-view.js";

import {
  filterWishlistItems,
  getWishlistStats,
  normalizeWishlistFilter,
  reorderWishlistItems,
  sortWishlistItems,
} from "../modules/wishlist-domain.js";

const wishes = [
  { id: "a", done: false, priority: "普通", createdAt: "2026-08-01T00:00:00Z", sortOrder: 0 },
  { id: "b", done: true, priority: "一定要做", createdAt: "2026-08-02T00:00:00Z", sortOrder: 1 },
  { id: "c", done: false, priority: "想尽快", createdAt: "2026-08-03T00:00:00Z", sortOrder: 2 },
];

test("wishlist dates omit missing values and preserve calendar days across timezones", () => {
  for (const value of [null, undefined, "", "invalid"]) assert.equal(formatWishDate(value), "");
  const previousTimezone = process.env.TZ;
  try {
    for (const timezone of ["America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = timezone;
      assert.equal(formatWishDate("2026-09-29"), "2026年9月29日");
      assert.equal(formatWishDate("2026-09-29T02:00:00Z"),
        timezone === "America/Los_Angeles" ? "2026年9月28日" : "2026年9月29日");
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test("wishlist filters expose only unfinished and finished states", () => {
  assert.equal(normalizeWishlistFilter("all"), "open");
  assert.deepEqual(filterWishlistItems(wishes, "open").map((wish) => wish.id), ["a", "c"]);
  assert.deepEqual(filterWishlistItems(wishes, "done").map((wish) => wish.id), ["b"]);
  assert.deepEqual(getWishlistStats(wishes), { all: 3, open: 2, done: 1 });
});

test("wishlist sorting keeps persisted order and reorders visible items in place", () => {
  assert.deepEqual(sortWishlistItems(wishes).map((wish) => wish.id), ["a", "b", "c"]);
  const reordered = reorderWishlistItems(wishes, ["c", "a"]);
  assert.deepEqual(reordered.map((wish) => wish.id), ["c", "b", "a"]);
  assert.deepEqual(reordered.map((wish) => wish.sortOrder), [0, 1, 2]);
});
