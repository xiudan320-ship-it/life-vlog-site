import assert from "node:assert/strict";
import test from "node:test";

import { createMoodDiaryController } from "../modules/mood-diary-controller.js";

const TODAY = "2026-08-31";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function createView() {
  let draft = { content: "", tagInput: "" };
  return {
    renders: [],
    bind() {},
    render(state) { this.renders.push(state); },
    readEditorDraft() { return { ...draft }; },
    clearTagInput() { draft = { ...draft, tagInput: "" }; },
    setDraft(next) { draft = { ...draft, ...next }; },
  };
}

function createFixture({ repository = {}, members = [] } = {}) {
  let session = { user: { id: "owner" } };
  const calls = [];
  const baseRepository = {
    listMonth: async () => [],
    listHistory: async () => [],
    upsert: async (payload) => ({ id: "cloud-new", user_id: "owner", ...payload, created_at: "2026-08-31T00:00:00.000Z", updated_at: "2026-08-31T00:00:00.000Z" }),
    update: async (id, payload) => ({ id, user_id: "owner", diary_date: TODAY, ...payload, tags: payload.tags || [] }),
    remove: async (id) => { calls.push({ type: "remove", id }); },
    ...repository,
  };
  const view = createView();
  const mutations = [];
  const controller = createMoodDiaryController({
    repository: baseRepository,
    getSession: () => session,
    getFamilyInfo: () => members.length ? { id: "family-1" } : null,
    getFamilyMembers: () => members,
    getAuthorName: (userId) => userId === "owner" ? "我" : "另一位",
    showToast: (message, options) => calls.push({ type: "toast", message, options }),
    confirmAction: async () => true,
    storage: createStorage(),
    getTodayKey: () => TODAY,
    onMutation: (mutation) => mutations.push(mutation),
    view,
  });
  return { controller, view, repository: baseRepository, calls, mutations, setSession: (next) => { session = next; } };
}

test("controller does not request cloud data when there is no session", async () => {
  let listCalls = 0;
  const fixture = createFixture({ repository: { listMonth: async () => { listCalls += 1; return []; } } });
  fixture.setSession(null);
  await fixture.controller.activate();
  assert.equal(listCalls, 0);
  assert.equal(fixture.controller.getState().currentUserId, "");
});

test("controller loads a month, chooses a mood, and keeps optimistic save state canonical", async () => {
  const monthRow = { id: "owner-1", user_id: "owner", diary_date: TODAY, mood: "calm", content: "早上的风", tags: ["早晨"] };
  const fixture = createFixture({
    repository: {
      listMonth: async (monthKey) => {
        assert.equal(monthKey, "2026-08");
        return [];
      },
      listHistory: async () => [monthRow],
      upsert: async (payload) => ({ ...payload, id: "owner-new", user_id: "owner", created_at: "2026-08-31T00:00:00.000Z", updated_at: "2026-08-31T00:00:01.000Z" }),
    },
  });
  await fixture.controller.activate();
  await fixture.controller.loadHistory({ force: true });
  fixture.controller.selectDate(TODAY);
  await fixture.controller.dispatch({ type: "pick-mood", mood: "happy" });
  fixture.view.setDraft({ content: "今天很开心 😊", tagInput: "#散步,陪伴" });
  await fixture.controller.save();

  const state = fixture.controller.getState();
  assert.equal(state.activeView, "detail");
  assert.equal(state.monthEntries[0].mood, "happy");
  assert.equal(state.monthEntries[0].content, "今天很开心 😊");
  assert.deepEqual(state.monthEntries[0].tags, ["散步", "陪伴"]);
  assert.equal(state.listEntries[0].id, "owner-new");
  assert.equal(state.entriesByDate.get(TODAY)[0].id, "owner-new");
  assert.match(fixture.calls.find((call) => call.type === "toast")?.message || "", /保存/);
  assert.deepEqual(fixture.mutations.map(({ type }) => type), ["save"]);
});

test("failed save restores calendar and cache snapshot while preserving typed editor input", async () => {
  const existing = { id: "owner-1", user_id: "owner", diary_date: TODAY, mood: "calm", content: "原来的内容", tags: ["旧"] };
  const fixture = createFixture({
    repository: {
      listMonth: async () => [existing],
      update: async () => { throw new Error("fixture save failed"); },
    },
  });
  await fixture.controller.activate();
  fixture.controller.selectDate(TODAY);
  await fixture.controller.dispatch({ type: "pick-mood", mood: "excited" });
  fixture.view.setDraft({ content: "还没有保存", tagInput: "新" });
  await fixture.controller.save();

  const state = fixture.controller.getState();
  assert.equal(state.activeView, "editor");
  assert.equal(state.editorDraft.content, "还没有保存");
  assert.deepEqual(state.editorDraft.tags, ["旧", "新"]);
  assert.equal(state.monthEntries[0].mood, "calm");
  assert.equal(state.monthEntries[0].content, "原来的内容");
  assert.match(state.editorError, /保存失败/);
});

test("stable family seats keep owner square first and filter unsupported third members", async () => {
  const fixture = createFixture({
    members: [
      { user_id: "member-late", role: "member", joined_at: "2026-03-01T00:00:00.000Z" },
      { user_id: "owner", role: "owner", joined_at: "2026-01-01T00:00:00.000Z" },
      { user_id: "member-early", role: "member", joined_at: "2026-02-01T00:00:00.000Z" },
    ],
    repository: {
      listMonth: async () => [
        { id: "late", user_id: "member-late", diary_date: TODAY, mood: "sad" },
        { id: "early", user_id: "member-early", diary_date: TODAY, mood: "happy" },
        { id: "circle", user_id: "owner", diary_date: TODAY, mood: "calm" },
      ],
    },
  });
  await fixture.controller.activate();
  const state = fixture.controller.getState();
  assert.deepEqual(state.participants.map(({ userId, shape }) => [userId, shape]), [["owner", "square"], ["member-early", "circle"]]);
  assert.deepEqual(state.entriesByDate.get(TODAY).map(({ id }) => id), ["circle", "early"]);
});

test("open-today can select the requested member's detail after the route activates", async () => {
  const fixture = createFixture({
    members: [
      { user_id: "owner", role: "owner", joined_at: "2026-01-01T00:00:00.000Z" },
      { user_id: "member", role: "member", joined_at: "2026-02-01T00:00:00.000Z" },
    ],
    repository: {
      listMonth: async () => [
        { id: "owner-entry", user_id: "owner", diary_date: TODAY, mood: "calm" },
        { id: "member-entry", user_id: "member", diary_date: TODAY, mood: "happy" },
      ],
    },
  });
  await fixture.controller.activate();
  await fixture.controller.dispatch({ type: "open-today", userId: "member" });
  assert.equal(fixture.controller.getState().activeView, "detail");
  assert.equal(fixture.controller.getState().activeDiary.user_id, "member");
});

test("delete is optimistic, own-only in the controller, and updates both calendar and history", async () => {
  const existing = { id: "owner-1", user_id: "owner", diary_date: TODAY, mood: "calm", content: "删除我", tags: [] };
  const fixture = createFixture({ repository: { listMonth: async () => [existing], listHistory: async () => [existing] } });
  await fixture.controller.activate();
  await fixture.controller.loadHistory({ force: true });
  fixture.controller.selectDate(TODAY);
  await fixture.controller.remove(existing.id);
  const state = fixture.controller.getState();
  assert.equal(state.monthEntries.length, 0);
  assert.equal(state.listEntries.length, 0);
  assert.equal(fixture.calls.some((call) => call.type === "remove" && call.id === existing.id), true);
  assert.deepEqual(fixture.mutations.map(({ type }) => type), ["delete"]);
});

console.log("Mood diary controller tests passed.");
