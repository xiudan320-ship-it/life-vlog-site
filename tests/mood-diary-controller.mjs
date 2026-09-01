import assert from "node:assert/strict";
import test from "node:test";
import { createMoodDiaryController } from "../modules/mood-diary-controller.js";

const TODAY = "2026-08-31";
const members = [
  { user_id: "owner", role: "owner", joined_at: "2026-01-01T00:00:00.000Z" },
  { user_id: "member", role: "member", joined_at: "2026-02-01T00:00:00.000Z" },
];

function fixture({ session = { user: { id: "owner" } }, rows = [], overlayController } = {}) {
  const renders = [];
  const overlayCalls = [];
  const overlay = overlayController || { open: async (payload) => { overlayCalls.push(payload); return true; }, close: async () => true };
  const controller = createMoodDiaryController({
    repository: { listMonth: async () => rows, listHistory: async () => rows },
    overlayController: overlay,
    getSession: () => session,
    getFamilyInfo: () => ({ id: "family" }),
    getFamilyMembers: () => members,
    getTodayKey: () => TODAY,
    storage: { getItem: () => null, setItem() {} },
    view: { bind() {}, render: (state) => renders.push(state) },
  });
  return { controller, renders, overlayCalls };
}

test("calendar controller skips cloud reads without a session", async () => {
  let calls = 0;
  const controller = createMoodDiaryController({
    repository: { listMonth: async () => { calls += 1; return []; } },
    getSession: () => null,
    getTodayKey: () => TODAY,
    view: { bind() {}, render() {} },
  });
  await controller.activate();
  assert.equal(calls, 0);
});

test("calendar controller loads the two stable family seats", async () => {
  const rows = [
    { id: "mine", user_id: "owner", diary_date: TODAY, mood: "calm" },
    { id: "theirs", user_id: "member", diary_date: TODAY, mood: "happy" },
    { id: "third", user_id: "third", diary_date: TODAY, mood: "sad" },
  ];
  const { controller } = fixture({ rows });
  await controller.activate();
  assert.deepEqual(controller.getState().participants.map(({ userId, shape }) => [userId, shape]), [["owner", "square"], ["member", "circle"]]);
  assert.deepEqual(controller.getState().entriesByDate.get(TODAY).map(({ id }) => id), ["mine", "theirs"]);
});

test("calendar and history delegate to the one route-independent overlay", async () => {
  const rows = [{ id: "theirs", user_id: "member", diary_date: TODAY, mood: "happy" }];
  const { controller, overlayCalls } = fixture({ rows });
  await controller.activate();
  await controller.dispatch({ type: "open-today", userId: "member", trigger: { id: "fab" } });
  await controller.loadHistory({ force: true });
  await controller.dispatch({ type: "history-detail", id: "theirs", trigger: { id: "history" } });
  assert.equal(overlayCalls.length, 2);
  assert.equal(overlayCalls[0].preferredUserId, "member");
  assert.equal(overlayCalls[1].trigger.id, "history");
});

test("overlay mutations update both calendar and loaded history", async () => {
  const original = { id: "mine", user_id: "owner", diary_date: TODAY, mood: "calm", tags: [] };
  const { controller } = fixture({ rows: [original] });
  await controller.activate();
  await controller.loadHistory({ force: true });
  controller.handleMutation({ type: "save", entry: { ...original, mood: "happy" } });
  assert.equal(controller.getState().monthEntries[0].mood, "happy");
  assert.equal(controller.getState().listEntries[0].mood, "happy");
  controller.handleMutation({ type: "delete", entry: original });
  assert.equal(controller.getState().monthEntries.length, 0);
  assert.equal(controller.getState().listEntries.length, 0);
});

test("late family context refresh restores the second seat before rebuilding the summary", async () => {
  let familyMembers = [];
  let familyInfo = null;
  let reads = 0;
  const rows = [
    { id: "owner-entry", user_id: "owner", diary_date: TODAY, mood: "happy" },
    { id: "member-entry", user_id: "member", diary_date: TODAY, mood: "calm" },
  ];
  const controller = createMoodDiaryController({
    repository: { listMonth: async () => { reads += 1; return rows; } },
    getSession: () => ({ user: { id: "owner" } }),
    getFamilyInfo: () => familyInfo,
    getFamilyMembers: () => familyMembers,
    getTodayKey: () => TODAY,
    view: { bind() {}, render() {} },
  });
  await controller.activate();
  assert.deepEqual(controller.getState().participants.map(({ userId }) => userId), ["owner"]);
  familyMembers = members;
  familyInfo = { id: "family" };
  await controller.refreshContext();
  assert.deepEqual(controller.getState().participants.map(({ userId }) => userId), ["owner", "member"]);
  assert.deepEqual(controller.getState().entriesByDate.get(TODAY).map(({ id }) => id), ["owner-entry", "member-entry"]);
  assert.equal(controller.getState().monthSummary.total, 2);
  assert.equal(reads, 2);
});

test("successful month mutations adopt the canonical reread instead of the optimistic row", async () => {
  const original = { id: "mine", user_id: "owner", diary_date: TODAY, mood: "calm", content: "旧内容", tags: [] };
  const canonical = { ...original, mood: "happy", content: "服务端内容" };
  let rows = [original];
  let reads = 0;
  const controller = createMoodDiaryController({
    repository: { listMonth: async () => { reads += 1; return rows.map((row) => ({ ...row })); } },
    getSession: () => ({ user: { id: "owner" } }),
    getFamilyInfo: () => ({ id: "family" }),
    getFamilyMembers: () => members,
    getTodayKey: () => TODAY,
    view: { bind() {}, render() {} },
  });
  await controller.activate();
  rows = [canonical];
  await controller.handleMutation({ type: "save", entry: { ...original, mood: "sad", content: "暂存内容" } });
  assert.equal(controller.getState().monthEntries[0].mood, "happy");
  assert.equal(controller.getState().monthEntries[0].content, "服务端内容");
  assert.equal(reads, 2);
});

test("failed month rereads keep the local mutation and expose a retryable status", async () => {
  const original = { id: "mine", user_id: "owner", diary_date: TODAY, mood: "calm", content: "旧内容", tags: [] };
  let reads = 0;
  const controller = createMoodDiaryController({
    repository: { listMonth: async () => { reads += 1; if (reads > 1) throw new Error("network down"); return [original]; } },
    getSession: () => ({ user: { id: "owner" } }),
    getFamilyInfo: () => ({ id: "family" }),
    getFamilyMembers: () => members,
    getTodayKey: () => TODAY,
    showToast: () => {},
    view: { bind() {}, render() {} },
  });
  await controller.activate();
  await controller.handleMutation({ type: "save", entry: { ...original, mood: "happy", content: "本地结果" } });
  assert.equal(controller.getState().monthEntries[0].mood, "happy");
  assert.equal(controller.getState().monthEntries[0].content, "本地结果");
  assert.equal(controller.getState().statusKind, "error");
  assert.match(controller.getState().statusMessage, /最近结果/u);
});

console.log("Mood diary controller tests passed.");
