import assert from "node:assert/strict";
import test from "node:test";
import { startDiaryMotionVideo, stopDiaryMotionVideo } from "../modules/diary-video-layout.js";

class FakeTarget {
  constructor() {
    this.listeners = new Map();
    this.dataset = {};
    this.hidden = false;
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry !== listener));
  }

  dispatch(type) {
    (this.listeners.get(type) || []).slice().forEach((listener) => listener({ type, target: this }));
  }
}

function createVideo() {
  const video = new FakeTarget();
  video.src = "/fixture.mp4";
  video.currentSrc = "/fixture.mp4";
  video.readyState = 0;
  video.loadCount = 0;
  video.playCount = 0;
  video.paused = true;
  video.style = { removeProperty() {} };
  video.load = () => { video.loadCount += 1; };
  video.play = () => {
    video.playCount += 1;
    video.paused = false;
    return Promise.resolve();
  };
  video.pause = () => { video.paused = true; };
  video.removeAttribute = (name) => {
    if (name === "src") {
      video.src = "";
      video.currentSrc = "";
    }
  };
  return video;
}

function createStatus() {
  const status = new FakeTarget();
  const text = new FakeTarget();
  const retry = new FakeTarget();
  retry.hidden = true;
  return { status, text, retry };
}

test("detail video autoplays muted while exposing recoverable loading state", () => {
  const video = createVideo();
  const { status, text, retry } = createStatus();
  startDiaryMotionVideo(video, null, {
    autoplay: true,
    muted: true,
    controls: true,
    loop: false,
    statusElement: status,
    statusTextElement: text,
    retryButton: retry,
  });

  assert.equal(video.autoplay, true);
  assert.equal(video.defaultMuted, true);
  assert.equal(video.muted, true);
  assert.equal(video.loop, false);
  assert.equal(video.controls, true);
  assert.equal(video.playCount, 0);
  assert.equal(text.textContent, "正在加载视频…");
  video.dispatch("canplay");
  assert.equal(video.playCount, 1);
  assert.equal(status.hidden, true);
  video.dispatch("error");
  assert.equal(status.hidden, false);
  assert.equal(status.dataset.state, "error");
  assert.equal(retry.hidden, false);
  const loadsBeforeRetry = video.loadCount;
  retry.dispatch("click");
  assert.equal(video.loadCount, loadsBeforeRetry + 1);
  assert.equal(status.dataset.state, "loading");
  stopDiaryMotionVideo(video);
  assert.equal(video.src, "");
  assert.equal(status.hidden, true);
});

test("Live Photo detail keeps muted autoplay and looping", () => {
  const video = createVideo();
  startDiaryMotionVideo(video, null, { autoplay: true, muted: true, controls: false, loop: true });
  assert.equal(video.autoplay, true);
  assert.equal(video.defaultMuted, true);
  assert.equal(video.muted, true);
  assert.equal(video.loop, true);
  video.dispatch("canplay");
  assert.equal(video.playCount, 1);
  stopDiaryMotionVideo(video);
});
