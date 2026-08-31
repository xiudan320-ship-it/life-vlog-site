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

console.log("Mood diary controller tests passed.");
