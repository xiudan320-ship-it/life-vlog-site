import assert from "node:assert/strict";
import test from "node:test";
import { getDiaryGalleryEmptyState, renderFeedImage, renderPhotoMedia } from "../modules/diary-gallery-view.js";

test("diary feed renders ordinary video cards as poster plus deferred motion source", () => {
  const markup =
    renderFeedImage(
      { type: "video", video_url: "/media/diary.mov", poster_url: "/media/diary.jpg", width: 1200, height: 800 },
      "日记",
      0,
      0,
      { mobile: false }
    );
  assert.match(markup, /^<img /);
  assert.match(markup, /data-motion-src="\/media\/diary\.mov"/);
  assert.doesNotMatch(markup, /<video/);
});

test("Live Photo cards keep a poster and defer only muted motion preview", () => {
  const markup = renderFeedImage(
    { type: "live", motion_url: "/media/diary.mov", image_url: "/media/diary.jpg" },
    "日记",
    0,
    0,
    { mobile: false },
  );
  assert.match(markup, /^<img /);
  assert.match(markup, /data-motion-src="\/media\/diary\.mov"/);
  assert.doesNotMatch(markup, /<video/);
});

test("failed feed media has a stable retry tile", () => {
  const markup = renderPhotoMedia(
    [{ image_url: "/media/diary.jpg" }],
    "日记",
    0,
    { mobile: true },
  );
  assert.match(markup, /data-media-error/);
  assert.match(markup, /缩略图加载失败/);
  assert.match(markup, /data-media-retry/);
});

test("diary feed keeps late mobile cards poster-only", () => {
  const markup = renderFeedImage(
    { video_url: "/media/diary.mov", thumbnail_url: "/media/diary.jpg" },
    "日记",
    5,
    0,
    { mobile: true },
  );
  assert.match(markup, /^<img /);
  assert.match(markup, /data-motion-src="\/media\/diary\.mov"/);
});

test("static images do not opt into the motion coordinator", () => {
  const markup = renderFeedImage(
    { type: "image", image_url: "/media/photo.jpg" },
    "照片",
    0,
    0,
  );
  assert.doesNotMatch(markup, /data-motion-src/);
});

test("multiple diary images use a two-preview horizontal rail with an explicit end action", () => {
  const markup = renderPhotoMedia(
    [
      { image_url: "/media/photo.jpg" },
      { type: "video", image_url: "/media/diary.jpg", video_url: "/media/diary.mp4" },
      { image_url: "/media/third.jpg" },
    ],
    "混合日记",
    0,
    { mobile: true },
  );
  assert.match(markup, /photo-media rail/);
  assert.match(markup, /photo-media-track/);
  assert.equal((markup.match(/feed-media-rail-item/g) || []).length, 3);
  assert.match(markup, /data-open-all-media/);
  assert.match(markup, /aria-label="Video">VIDEO/);
});

test("diary empty states prioritize the source and expose recovery actions", () => {
  assert.deepEqual(
    getDiaryGalleryEmptyState({ sourceStatus: "error", search: "猫", signedIn: true }),
    { message: "日记读取失败，请重试。", loading: false, action: "retry", actionLabel: "重新加载" },
  );
  assert.deepEqual(
    getDiaryGalleryEmptyState({ sourceStatus: "ready", search: "不存在", signedIn: true }),
    { message: "没有找到匹配的日记。", loading: false, action: "clear-search", actionLabel: "清空搜索" },
  );
});
