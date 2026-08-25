import assert from "node:assert/strict";
import test from "node:test";

import {
  getPhotoOwnerId,
  getRedirectUrl,
  isMissingCloudSchema,
  normalizeFamilyTagline,
  normalizeHomeName,
  normalizeLoginDateKey,
  normalizeNickname,
  toDateInputValue,
  usernameToEmail,
} from "../modules/app-domain.js";
import { createDiaryMetadata } from "../modules/diary-metadata.js";
import { getStoredPhotoMediaPaths } from "../modules/media-metadata.js";

test("account text and login identifiers are normalized consistently", () => {
  assert.equal(normalizeHomeName("  我   们 的 家  "), "我 们 的 家");
  assert.equal(normalizeFamilyTagline("  一起   收藏生活  "), "一起 收藏生活");
  assert.equal(normalizeNickname("  呱噗   救火大队  "), "呱噗 救火大队");
  assert.equal(usernameToEmail(" 呱噗救火大队 "), "u5471u5657u6551u706bu5927u961f@life-vlog.local");
});

test("cloud and diary identifiers keep their focused rules", () => {
  assert.equal(getPhotoOwnerId({ owner_id: " user-1 " }), "user-1");
  assert.equal(normalizeLoginDateKey("2026-08-25T10:30:00Z"), "2026-08-25");
  assert.equal(isMissingCloudSchema({ code: "PGRST205" }), true);
  assert.equal(isMissingCloudSchema({ message: "relation does not exist" }), true);
  assert.equal(isMissingCloudSchema({ code: "23505" }), false);
});

test("date input and redirect values are deterministic", () => {
  assert.equal(toDateInputValue("2026-08-25T12:30:00Z"), "2026-08-25");
  assert.equal(toDateInputValue("bad", () => new Date("2026-08-24T00:00:00Z")), "2026-08-24");
  assert.equal(
    getRedirectUrl("https://example.com/", { location: { hostname: "localhost", href: "http://localhost:4173/" } }),
    "https://example.com/",
  );
});

test("diary metadata hides generated titles and builds stable upload names", () => {
  const metadata = createDiaryMetadata({
    elements: {
      titleInput: { value: "  夏日记忆  " },
      dateInput: { value: "2026-08-25" },
    },
    generatedTitlePrefixes: ["今日小星星"],
    slugify: (value) => value.toLowerCase().replace(/\s+/g, "-"),
  });
  assert.equal(metadata.getFinalTitle(), "夏日记忆");
  assert.equal(metadata.getDisplayTitle({ title: "今日小星星 · 12:30" }), "");
  assert.equal(metadata.getPhotoLabel({ title: "" }), "无标题日记");
  assert.equal(metadata.getUploadFileNameBase("Summer Photo", 1, 3), "summer-photo-02");
});

test("stored diary media paths include every persisted variant", () => {
  assert.deepEqual(
    getStoredPhotoMediaPaths({
      image_path: "images/main.jpg",
      thumbnail_path: "images/thumb.jpg",
      motion_path: "motion/live.mov",
      poster_path: "videos/poster.jpg",
      video_path: "videos/clip.mp4",
    }),
    [
      "images/main.jpg",
      "images/thumb.jpg",
      "motion/live.mov",
      "videos/poster.jpg",
      "videos/clip.mp4",
    ],
  );
});
