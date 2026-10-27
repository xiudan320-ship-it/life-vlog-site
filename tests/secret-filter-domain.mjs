import assert from "node:assert/strict";
import test from "node:test";

import {
  getSecretAlbumFilterTags,
  getSecretAlbumTagCounts,
  getSecretPhotoSortDescending,
  imageMatchesSecretFilter,
  sortSecretDisplayEntries,
  getSecretSearchResults,
} from "../modules/secret-filter-domain.js";
import { sortSecretItems } from "../modules/secret-domain.js";
import { secretFromCloudRow, secretToCloudRow } from "../modules/cloud-models.js";
import { sanitizeSecretRecord } from "../modules/offline-records.js";

const album = {
  images: [
    { image_url: "one.jpg", tags: ["旅行", "1"], favorite: true },
    { image_url: "two.jpg", tags: ["旅行", "朋友"] },
    { image_url: "three.jpg", tags: ["朋友", "3"], favorite: true },
  ],
};

test("secret album filters count descriptive and favorite tags only", () => {
  assert.deepEqual(getSecretAlbumTagCounts(album), [
    { tag: "全部", count: 3 },
    { tag: "旅行", count: 2 },
    { tag: "朋友", count: 2 },
    { tag: "收藏", count: 2 },
  ]);
  assert.deepEqual(getSecretAlbumFilterTags(album), ["旅行", "朋友", "收藏"]);
});

test("secret image matching treats favorites separately from normal tags", () => {
  assert.equal(imageMatchesSecretFilter(album.images[0], "全部"), true);
  assert.equal(imageMatchesSecretFilter(album.images[0], "收藏"), true);
  assert.equal(imageMatchesSecretFilter(album.images[1], "收藏"), false);
  assert.equal(imageMatchesSecretFilter(album.images[1], "朋友"), true);
  assert.equal(imageMatchesSecretFilter(album.images[1], "旅行"), true);
});

test("secret time mode does not let numeric tags override missing timestamps", () => {
  const entries = album.images.map((image, index) => ({ image, index }));
  assert.equal(getSecretPhotoSortDescending({}), true);
  assert.equal(getSecretPhotoSortDescending({ photoSortDescending: false }), false);
  assert.deepEqual(sortSecretDisplayEntries(entries, {}).map(({ index }) => index), [0, 1, 2]);
  assert.deepEqual(
    sortSecretDisplayEntries(entries, { photoSortDescending: false }).map(({ index }) => index),
    [0, 1, 2],
  );
});

test("pinned albums stay ahead of the regular album order", () => {
  const items = [
    { id: "regular", isPinned: false, sortOrder: 0 },
    { id: "pinned", isPinned: true, sortOrder: 999 },
    { id: "pinned-first", isPinned: true, sortOrder: 1 },
  ];
  assert.deepEqual(sortSecretItems(items).map(({ id }) => id), ["pinned-first", "pinned", "regular"]);
});

test("each sort mode is independent, stable, and survives the cloud row roundtrip", () => {
  const item = { id: "00000000-0000-4000-8000-000000000001", images: [
    { image_url: "ten", tags: ["10"], uploadedAt: "2030-01-03" },
    { image_url: "two", tags: ["02"], uploadedAt: "2030-01-01" },
    { image_url: "one", tags: ["1"], uploadedAt: "2030-01-02" },
    { image_url: "unknown", tags: ["风景"] },
    { image_url: "tie", tags: ["02"], uploadedAt: "2030-01-01" },
  ] };
  const entries = item.images.map((image, index) => ({ image, index }));
  const expectations = [
    ["time", true, [0, 2, 1, 4, 3]],
    ["time", false, [3, 1, 4, 2, 0]],
    ["number", true, [2, 1, 4, 0, 3]],
    ["manual", true, [0, 1, 2, 3, 4]],
  ];
  for (const [photoSortMode, photoSortDescending, expected] of expectations) {
    const loaded = secretFromCloudRow(secretToCloudRow({ ...item, photoSortMode, photoSortDescending }, "fixture-user"));
    assert.equal(loaded.photoSortMode, photoSortMode);
    assert.deepEqual(sortSecretDisplayEntries(entries, loaded).map(({ index }) => index), expected);
    assert.deepEqual(loaded.images.map(({ uploadedAt }) => uploadedAt), item.images.map((image) => image.uploadedAt || ""));
    const cached = JSON.parse(JSON.stringify(sanitizeSecretRecord({ ...loaded, folderId: "travel" }, { images: loaded.images })));
    assert.equal(cached.folderId, "travel");
    assert.equal(cached.photoSortMode, photoSortMode);
    assert.equal(cached.photoSortDescending, photoSortDescending);
    assert.deepEqual(sortSecretDisplayEntries(cached.images.map((image, index) => ({ image, index })), cached).map(({ index }) => index), expected);
  }
});

test("search returns actual matching photos and respects folder and favorite scope", () => {
  const items = [
    { id: "a", title: "海边", folderId: "travel", images: [
      { image_url: "a0", tags: ["日落", "10"], favorite: true },
      { image_url: "a1", tags: ["日落"] },
    ] },
    { id: "b", title: "日落相册", folderId: "home", images: [{ image_url: "b0", tags: ["室内"], favorite: true }] },
  ];
  const all = getSecretSearchResults(items, " 日落 ");
  assert.deepEqual(all.albums.map(({ id }) => id), ["b"]);
  assert.deepEqual(all.photos.map(({ item, index }) => [item.id, index]), [["a", 0], ["a", 1]]);
  assert.equal(getSecretSearchResults(items, "日落", { folderId: "home" }).photos.length, 0);
  assert.deepEqual(getSecretSearchResults(items, "日落", { favorites: true }).photos.map(({ image }) => image.image_url), ["a0", "b0"]);
  assert.deepEqual(getSecretSearchResults(items, "海边", { favorites: true }).photos.map(({ image }) => image.image_url), ["a0"]);
  assert.equal(getSecretSearchResults(items, "10").photos[0].image.image_url, "a0");
  assert.deepEqual(getSecretSearchResults(items, "不存在"), { albums: [], photos: [] });
});
