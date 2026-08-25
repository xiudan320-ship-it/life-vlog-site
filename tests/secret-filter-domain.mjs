import assert from "node:assert/strict";
import test from "node:test";

import {
  getSecretAlbumFilterTags,
  getSecretAlbumTagCounts,
  getSecretPhotoSortDescending,
  imageMatchesSecretFilter,
  sortSecretDisplayEntries,
} from "../modules/secret-filter-domain.js";

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

test("secret display order follows album direction while honoring numeric positions", () => {
  const entries = album.images.map((image, index) => ({ image, index }));
  assert.equal(getSecretPhotoSortDescending({}), true);
  assert.equal(getSecretPhotoSortDescending({ photoSortDescending: false }), false);
  assert.deepEqual(sortSecretDisplayEntries(entries, {}).map(({ index }) => index), [0, 2, 1]);
  assert.deepEqual(
    sortSecretDisplayEntries(entries, { photoSortDescending: false }).map(({ index }) => index),
    [0, 2, 1],
  );
});
