import assert from "node:assert/strict";
import test from "node:test";
import { renderFeedImage, renderPhotoMedia, shouldAutoplayDiaryFeedMedia } from "../modules/diary-gallery-view.js";

test("diary feed keeps ordinary video cards poster-only", () => {
  assert.equal(shouldAutoplayDiaryFeedMedia(0, { mobile: false, reducedMotion: true }), false);
  assert.equal(shouldAutoplayDiaryFeedMedia(0, { mobile: false, connection: { saveData: true } }), false);
  assert.equal(shouldAutoplayDiaryFeedMedia(0, { mobile: true, connection: { saveData: true } }), false);
  const markup =
    renderFeedImage(
      { type: "video", video_url: "/media/diary.mov", poster_url: "/media/diary.jpg", width: 1200, height: 800 },
      "日记",
      0,
      0,
      { mobile: false }
    );
  assert.match(markup, /^<img /);
  assert.doesNotMatch(markup, /data-motion-src|<video|\.mov/);
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
  assert.doesNotMatch(markup, /\.mov/);
});
