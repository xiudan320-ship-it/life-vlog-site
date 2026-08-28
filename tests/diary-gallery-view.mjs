import assert from "node:assert/strict";
import test from "node:test";
import { renderFeedImage, shouldAutoplayDiaryFeedMedia } from "../modules/diary-gallery-view.js";

test("diary feed media respects reduced motion and data saver before creating motion playback", () => {
  assert.equal(shouldAutoplayDiaryFeedMedia(0, { mobile: false, reducedMotion: true }), false);
  assert.equal(shouldAutoplayDiaryFeedMedia(0, { mobile: false, connection: { saveData: true } }), false);
  assert.equal(shouldAutoplayDiaryFeedMedia(0, { mobile: true, connection: { saveData: true } }), false);
  assert.match(
    renderFeedImage(
      { video_url: "/media/diary.mov", thumbnail_url: "/media/diary.jpg", width: 1200, height: 800 },
      "日记",
      0,
      0,
      { mobile: false }
    ),
    /data-motion-src="\/media\/diary\.mov"[^>]*preload="none"/,
  );
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
