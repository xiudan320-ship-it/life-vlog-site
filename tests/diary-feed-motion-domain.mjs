import assert from "node:assert/strict";
import test from "node:test";
import {
  getDiaryFeedMotionCenterDistance,
  hasDiaryFeedMotionPreview,
  isDiaryFeedMotionAllowed,
  selectDiaryFeedMotionCandidate,
  shouldLoopDiaryFeedMotion,
} from "../modules/diary-feed-motion-domain.js";

test("feed motion is available only for media with a playable motion source", () => {
  assert.equal(hasDiaryFeedMotionPreview({ type: "video", source: "clip.mp4" }), true);
  assert.equal(hasDiaryFeedMotionPreview({ type: "live", source: "clip.mov" }), true);
  assert.equal(hasDiaryFeedMotionPreview({ type: "image", source: "clip.mp4" }), false);
  assert.equal(hasDiaryFeedMotionPreview({ type: "video", source: "" }), false);
});

test("feed motion loops only through the eight second limit", () => {
  assert.equal(shouldLoopDiaryFeedMotion(0), false);
  assert.equal(shouldLoopDiaryFeedMotion(7.99), true);
  assert.equal(shouldLoopDiaryFeedMotion(8), true);
  assert.equal(shouldLoopDiaryFeedMotion(8.01), false);
  assert.equal(shouldLoopDiaryFeedMotion(Number.NaN), false);
  assert.equal(shouldLoopDiaryFeedMotion(Infinity), false);
});

test("feed motion policy stops for hidden, reduced-motion, or save-data contexts", () => {
  assert.equal(isDiaryFeedMotionAllowed(), true);
  assert.equal(isDiaryFeedMotionAllowed({ pageVisible: false }), false);
  assert.equal(isDiaryFeedMotionAllowed({ routeActive: false }), false);
  assert.equal(isDiaryFeedMotionAllowed({ reducedMotion: true }), false);
  assert.equal(isDiaryFeedMotionAllowed({ saveData: true }), false);
});

test("feed motion selects the nearest visible media to the visual center", () => {
  const viewport = { width: 390, height: 844 };
  const near = { id: "near" };
  const far = { id: "far" };
  assert.equal(
    selectDiaryFeedMotionCandidate([
      { element: far, rect: { left: 0, right: 120, top: 0, bottom: 120 } },
      { element: near, rect: { left: 120, right: 270, top: 270, bottom: 574 } },
    ], viewport),
    near,
  );
  assert.ok(getDiaryFeedMotionCenterDistance({ left: 120, right: 270, top: 270, bottom: 574 }, viewport) < 200);
});

test("candidate switching uses hysteresis to avoid rapid preview churn", () => {
  const viewport = { width: 100, height: 100 };
  const current = { id: "current" };
  const next = { id: "next" };
  const candidates = [
    { element: current, rect: { left: 20, right: 80, top: 20, bottom: 80 } },
    { element: next, rect: { left: 25, right: 85, top: 20, bottom: 80 } },
  ];
  assert.equal(selectDiaryFeedMotionCandidate(candidates, viewport, current, 48), current);
  assert.equal(selectDiaryFeedMotionCandidate([
    { element: current, rect: { left: 0, right: 20, top: 0, bottom: 20 } },
    { element: next, rect: { left: 20, right: 80, top: 20, bottom: 80 } },
  ], viewport, current, 10), next);
});
