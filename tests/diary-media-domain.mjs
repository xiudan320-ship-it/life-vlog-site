import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveDiaryR2Url,
  normalizeDiaryMediaImage,
  normalizeDiaryMediaImages,
  resolveDiaryMediaUrl,
} from "../modules/diary-media-domain.js";

const publicUrl = "https://cdn.example.test";

test("R2 paths are authoritative and encode every key segment", () => {
  const url = deriveDiaryR2Url("r2:photos/生日 相册/封面#.jpg", publicUrl);
  assert.equal(url, "https://cdn.example.test/photos/%E7%94%9F%E6%97%A5%20%E7%9B%B8%E5%86%8C/%E5%B0%81%E9%9D%A2%23.jpg");
  assert.equal(
    resolveDiaryMediaUrl("https://stale-worker.test/media.jpg", "r2:photos/current.jpg", { publicUrl }),
    "https://cdn.example.test/photos/current.jpg",
  );
});

test("missing independent thumbnail is represented by the canonical image", () => {
  const image = normalizeDiaryMediaImage({
    type: "video",
    image_url: "https://stale-worker.test/poster.jpg",
    image_path: "r2:photos/poster.jpg",
    video_url: "https://stale-worker.test/video.mp4",
    video_path: "r2:photos/video.mp4",
  }, { publicUrl, workerEndpoint: "https://stale-worker.test" });
  assert.equal(image.image_url, "https://cdn.example.test/photos/poster.jpg");
  assert.equal(image.poster_url, image.image_url);
  assert.equal(image.thumbnail_url, image.image_url);
  assert.equal(image.video_url, "https://cdn.example.test/photos/video.mp4");
});

test("media normalization is stable across list and detail consumers", () => {
  const images = normalizeDiaryMediaImages([
    { image_path: "r2:photos/a.jpg", image_url: "https://worker/a.jpg" },
    { image_path: "r2:photos/a.jpg", image_url: "https://worker/duplicate.jpg" },
    { image_path: "r2:photos/b.jpg", thumbnail_path: "r2:photos/b-thumb.jpg" },
  ], { publicUrl, workerEndpoint: "https://worker" });
  assert.equal(images.length, 2);
  assert.deepEqual(images.map(({ image_url, thumbnail_url }) => [image_url, thumbnail_url]), [
    ["https://cdn.example.test/photos/a.jpg", "https://cdn.example.test/photos/a.jpg"],
    ["https://cdn.example.test/photos/b.jpg", "https://cdn.example.test/photos/b-thumb.jpg"],
  ]);
});

test("the configured media Worker URL is never used as a diary asset", () => {
  assert.equal(resolveDiaryMediaUrl("https://life-vlog-r2-upload.test/path.jpg", "", { workerEndpoint: "https://life-vlog-r2-upload.test" }), "");
});

test("same-origin relative fixture media stays usable without widening the CSP", () => {
  assert.equal(resolveDiaryMediaUrl("/__fixture-media/poster.jpg"), "/__fixture-media/poster.jpg");
});
