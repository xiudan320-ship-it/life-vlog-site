import assert from "node:assert/strict";
import test from "node:test";
import { getDiaryGalleryEmptyState, getPhotoAspectRatio, renderFeedImage, renderPhotoMedia } from "../modules/diary-gallery-view.js";

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

test("mobile single-column diaries render adaptive grids with no more than six indexed previews", () => {
  const cases = [
    { total: 2, className: "count-2", previews: 2 },
    { total: 3, className: "count-3", previews: 3 },
    { total: 4, className: "count-4", previews: 4 },
    { total: 5, className: "count-5", previews: 5 },
    { total: 6, className: "count-6", previews: 6 },
    { total: 7, className: "count-7-plus", previews: 6 },
    { total: 10, className: "count-7-plus", previews: 6 },
  ];
  for (const { total, className, previews } of cases) {
    const images = Array.from({ length: total }, (_, index) => ({ image_url: `/media/photo-${index + 1}.jpg` }));
    const markup = renderPhotoMedia(images, "多图日记", 3, { mobile: true, layout: "single" });
    assert.match(markup, new RegExp(`photo-media-grid ${className}`), `${total} images chose the wrong grid shape`);
    assert.equal((markup.match(/class="feed-media-grid-item"/g) || []).length, previews);
    for (let index = 0; index < previews; index += 1) {
      assert.match(markup, new RegExp(`data-image-index="${index}"`), `${total} images lost preview index ${index}`);
    }
    if (total > 6) {
      assert.match(markup, new RegExp(`data-open-all-media data-photo-index="3" data-image-index="5" aria-label="查看全部 ${total} 张图片，从第 6 张开始"`));
      assert.match(markup, new RegExp(`>\\s*<span aria-hidden="true">\\+${total - 6}<\\/span>`));
    } else {
      assert.doesNotMatch(markup, /feed-media-grid-more/);
    }
  }
});

test("mobile double-column diaries load only the cover and expose the total image count", () => {
  const markup = renderPhotoMedia(
    Array.from({ length: 10 }, (_, index) => ({ image_url: `/media/photo-${index + 1}.jpg` })),
    "多图日记",
    2,
    { mobile: true, layout: "double" },
  );
  assert.match(markup, /photo-media double-cover/);
  assert.match(markup, /class="photo-media-count" aria-hidden="true">10 张/);
  assert.equal((markup.match(/class="feed-media-shell"/g) || []).length, 1);
  assert.match(markup, /data-photo-index="2" data-image-index="0"/);
  assert.doesNotMatch(markup, /photo-media-grid|photo-media-track|data-image-index="1"/);
});

test("desktop multi-image diaries retain their horizontal rail and complete-album action", () => {
  const markup = renderPhotoMedia(
    [
      { image_url: "/media/photo.jpg" },
      { type: "video", image_url: "/media/diary.jpg", video_url: "/media/diary.mp4" },
      { image_url: "/media/third.jpg" },
    ],
    "混合日记",
    0,
    { mobile: false, layout: "single" },
  );
  assert.match(markup, /photo-media rail/);
  assert.match(markup, /photo-media-track/);
  assert.equal((markup.match(/feed-media-rail-item/g) || []).length, 3);
  assert.match(markup, /data-open-all-media/);
  assert.match(markup, /aria-label="Video">VIDEO/);
});

test("photo media with no images has no placeholder and aspect ratios remain bounded", () => {
  assert.equal(renderPhotoMedia([], "空日记", 0, { mobile: true, layout: "single" }), "");
  assert.equal(getPhotoAspectRatio({ width: 600, height: 800 }), "0.750");
  assert.equal(getPhotoAspectRatio({ width: 4000, height: 100 }), "1.550");
  assert.equal(getPhotoAspectRatio({ width: 100, height: 4000 }), "0.720");
  assert.equal(getPhotoAspectRatio({}), "0.8");
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
