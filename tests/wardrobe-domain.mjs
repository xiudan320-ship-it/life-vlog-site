import assert from "node:assert/strict";
import test from "node:test";

import {
  filterItems,
  normalizeImage,
  normalizeItem,
} from "../modules/wardrobe-domain.js";

test("wardrobe domain normalizes legacy list and image shapes", () => {
  const item = normalizeItem({
    id: "item-1",
    seasons: '["春", "秋"]',
    occasions: "通勤，约会",
    style_tags: ["复古", ""],
    color_tags: null,
    images: [{ image_url: "https://fixture/image.jpg", image_path: "r2:item-1" }],
    is_favorite: 1,
    wear_count: "3",
  });

  assert.deepEqual(item.seasons, ["春", "秋"]);
  assert.deepEqual(item.occasions, ["通勤", "约会"]);
  assert.deepEqual(item.style_tags, ["复古"]);
  assert.deepEqual(item.color_tags, []);
  assert.equal(item.images[0].url, "https://fixture/image.jpg");
  assert.equal(item.images[0].path, "r2:item-1");
  assert.equal(item.images[0].role, "cover");
  assert.equal(item.is_favorite, true);
  assert.equal(item.wear_count, 3);
});

test("wardrobe filtering composes location, metadata, status, favorite, and search constraints", () => {
  const items = [
    normalizeItem({ id: "green", name: "森林绿开衫", category: "上装", location_id: "bedroom", status: "available", seasons: ["秋"], style_tags: ["复古"], color_tags: ["绿色"], is_favorite: true }),
    normalizeItem({ id: "white", name: "奶油白连衣裙", category: "连衣裙", location_id: "entry", status: "laundry", seasons: ["夏"], style_tags: ["法式"], color_tags: ["白色"], is_favorite: false }),
  ];

  assert.deepEqual(filterItems(items), [items[0]]);
  assert.deepEqual(filterItems(items, { status: "all", search: "白色" }), [items[1]]);
  assert.deepEqual(filterItems(items, { status: "all", currentLocation: "entry", favoritesOnly: true }), []);
  assert.deepEqual(filterItems(items, { status: "all", season: "冬" }), []);
});

test("wardrobe image normalization keeps the first image as cover and later images as details", () => {
  assert.equal(normalizeImage({ id: "first", url: "/first" }).role, "cover");
  assert.equal(normalizeImage({ id: "second", url: "/second" }, 1).role, "detail");
});

console.log("Wardrobe domain tests passed.");
