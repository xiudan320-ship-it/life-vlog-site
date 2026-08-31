import assert from "node:assert/strict";
import test from "node:test";

import { createMoodDiaryRepository } from "../modules/mood-diary-repository.js";
import { createTodayMoodController } from "../modules/today-mood-controller.js";

const TODAY = "2026-08-31";

function createView() {
  return {
    renders: [],
    render(state) {
      this.renders.push(state);
    },
  };
}

function createFixture({ rows = [], members = [], listDay = async () => rows, sessionId = "owner", switchPage, overlayController } = {}) {
  let session = sessionId ? { user: { id: sessionId } } : null;
  const view = createView();
  const controller = createTodayMoodController({
    repository: { listDay },
    getSession: () => session,
    getFamilyInfo: () => members.length ? { id: "family-1" } : null,
    getFamilyMembers: () => members,
    getAuthorName: (userId) => ({ owner: "小秀", member: "小咻" })[userId] || "…",
    getTodayKey: () => TODAY,
    switchPage: switchPage || (async () => true),
    overlayController,
    view,
  });
  return { controller, view, setSession: (next) => { session = next; } };
}

test("today mood reads one day and resolves the same two stable seats", async () => {
  const fixture = createFixture({
    members: [
      { user_id: "member-late", role: "member", joined_at: "2026-03-01T00:00:00.000Z" },
      { user_id: "owner", role: "owner", joined_at: "2026-01-01T00:00:00.000Z" },
      { user_id: "member", role: "member", joined_at: "2026-02-01T00:00:00.000Z" },
    ],
    rows: [
      { id: "late-entry", user_id: "member-late", diary_date: TODAY, mood: "sad" },
      { id: "member-entry", user_id: "member", diary_date: TODAY, mood: "happy" },
      { id: "owner-entry", user_id: "owner", diary_date: TODAY, mood: "calm" },
      { id: "old-entry", user_id: "owner", diary_date: "2026-08-30", mood: "tired" },
    ],
  });
  await fixture.controller.refresh();
  const state = fixture.controller.getState();
  assert.deepEqual(state.participants.map(({ userId, shape }) => [userId, shape]), [
    ["owner", "square"],
    ["member", "circle"],
  ]);
  assert.deepEqual(state.entries.map(({ id }) => id), ["owner-entry", "member-entry"]);
  assert.equal(state.entriesByUserId.get("member").mood, "happy");
  assert.equal(fixture.view.renders.at(-1).loading, false);
  assert.equal(fixture.view.renders.at(-1).error, "");
});

test("today mood keeps empty data distinct from an unavailable request", async () => {
  let fail = true;
  const fixture = createFixture({ listDay: async () => {
    if (fail) throw new Error("offline");
    return [];
  } });
  await fixture.controller.refresh();
  assert.equal(fixture.controller.getState().error, "今日心情暂时无法同步");
  fail = false;
  await fixture.controller.retry();
  assert.equal(fixture.controller.getState().error, "");
  assert.deepEqual(fixture.controller.getState().entries, []);
});

test("today mood latest request wins across refreshes and session changes", async () => {
  let resolveFirst;
  let callCount = 0;
  const first = new Promise((resolve) => { resolveFirst = resolve; });
  const fixture = createFixture({
    listDay: async () => {
      callCount += 1;
      if (callCount === 1) return first;
      return [{ id: "new", user_id: "owner", diary_date: TODAY, mood: "happy" }];
    },
  });
  const firstRefresh = fixture.controller.refresh();
  const secondRefresh = fixture.controller.refresh();
  await secondRefresh;
  resolveFirst([{ id: "old", user_id: "owner", diary_date: TODAY, mood: "sad" }]);
  await firstRefresh;
  assert.equal(fixture.controller.getState().entries[0].id, "new");

  let resolveOwner;
  const ownerRequest = new Promise((resolve) => { resolveOwner = resolve; });
  let switchedCalls = 0;
  const switched = createFixture({ listDay: async () => {
    switchedCalls += 1;
    return switchedCalls === 1 ? ownerRequest : [];
  } });
  const ownerRefresh = switched.controller.refresh();
  switched.setSession({ user: { id: "member" } });
  const memberRefresh = switched.controller.refresh();
  await memberRefresh;
  resolveOwner([{ id: "owner-entry", user_id: "owner", diary_date: TODAY, mood: "sad" }]);
  await ownerRefresh;
  assert.equal(switched.controller.getState().currentUserId, "member");
  assert.deepEqual(switched.controller.getState().entries, []);
});

test("today seats open the shared overlay in place and only the calendar CTA navigates", async () => {
  const actions = [];
  const fixture = createFixture({
    members: [
      { user_id: "owner", role: "owner", joined_at: "2026-01-01T00:00:00.000Z" },
      { user_id: "member", role: "member", joined_at: "2026-02-01T00:00:00.000Z" },
    ],
    switchPage: async (...args) => {
      actions.push({ type: "switch", args });
      return true;
    },
    rows: [{ id: "member-entry", user_id: "member", diary_date: TODAY, mood: "happy" }],
    overlayController: { open: async (payload) => { actions.push({ type: "overlay", payload }); return true; } },
  });
  await fixture.controller.refresh();
  assert.equal(await fixture.controller.openSeat("member"), true);
  assert.equal(actions[0].type, "overlay");
  assert.equal(actions[0].payload.preferredUserId, "member");
  assert.equal(actions.some(({ type }) => type === "switch"), false);
  await fixture.controller.openCalendar();
  assert.equal(actions.at(-1).type, "switch");
  assert.equal(actions.at(-1).args[0], "mood");
  assert.equal(await fixture.controller.openSeat("owner"), true);
  assert.equal(await fixture.controller.openSeat("member"), true);
  assert.equal(await fixture.controller.openSeat("unknown"), false);
});

test("mood repository listDay filters one normalized date", async () => {
  const calls = [];
  const resultRows = [{ id: "today", user_id: "owner", diary_date: TODAY, mood: "happy", tags: "[\"散步\"]" }];
  const query = {
    select(fields) { calls.push({ type: "select", fields }); return this; },
    eq(column, value) { calls.push({ type: "eq", column, value }); return this; },
    order(column, options) { calls.push({ type: "order", column, options }); return this; },
    limit(value) { calls.push({ type: "limit", value }); return Promise.resolve({ data: resultRows, error: null }); },
  };
  const repository = createMoodDiaryRepository({
    getDatabase: () => ({ from: (table) => { calls.push({ type: "from", table }); return query; } }),
    getSession: () => ({ user: { id: "owner" } }),
  });
  assert.deepEqual(await repository.listDay(TODAY), [{ ...resultRows[0], id: "today", user_id: "owner", diary_date: TODAY, mood: "happy", tags: ["散步"], content: "" }]);
  assert.deepEqual(calls, [
    { type: "from", table: "mood_diaries" },
    { type: "select", fields: "*" },
    { type: "eq", column: "diary_date", value: TODAY },
    { type: "order", column: "user_id", options: { ascending: true } },
    { type: "limit", value: 500 },
  ]);
  await assert.rejects(() => repository.listDay("2026-02-30"), /YYYY-MM-DD/);
});

console.log("Today mood controller tests passed.");
