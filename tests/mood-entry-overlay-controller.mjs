import assert from "node:assert/strict";
import test from "node:test";
import { createMoodEntryOverlayController } from "../modules/mood-entry-overlay-controller.js";
import * as moodDomain from "../modules/mood-diary-domain.js";

const TODAY = "2026-08-31";
const participants = [{ userId: "owner", shape: "square" }, { userId: "member", shape: "circle" }];

function createFixture({ entries = [], repository = {} } = {}) {
  let draft = { content: "", tagInput: "" };
  const renders = [];
  const mutations = [];
  const listeners = new Map();
  const historyCalls = [];
  let scrollY = 321;
  const windowTarget = {
    location: { href: "https://example.test/?page=gallery" },
    history: { state: {}, pushState: (...args) => historyCalls.push(["push", ...args]), back: () => historyCalls.push(["back"]) },
    get scrollY() { return scrollY; },
    addEventListener: (type, handler) => listeners.set(type, handler),
    setTimeout: (handler) => { handler(); },
    scrollTo: ({ top }) => { scrollY = top; },
  };
  const view = {
    bind() {},
    render: (state) => renders.push(state),
    readDraft: () => ({ ...draft }),
    clearTagInput: () => { draft.tagInput = ""; },
    setDraft: (next) => { draft = { ...draft, ...next }; },
  };
  const controller = createMoodEntryOverlayController({
    elements: {},
    domain: moodDomain,
    repository: {
      listDay: async () => entries,
      upsert: async (payload) => ({ ...payload, id: "new", user_id: "owner" }),
      update: async (id, payload) => ({ ...payload, id, user_id: "owner", diary_date: TODAY }),
      remove: async () => {},
      ...repository,
    },
    getSession: () => ({ user: { id: "owner" } }),
    confirmAction: async () => true,
    onMutation: (payload) => mutations.push(payload),
    windowTarget,
    view,
  });
  return { controller, view, renders, mutations, listeners, historyCalls, getScrollY: () => scrollY };
}

test("owner empty seat opens picker while another member empty seat stays inert", async () => {
  const fixture = createFixture();
  assert.equal(await fixture.controller.open({ dateKey: TODAY, entries: [], preferredUserId: "owner", participants }), true);
  assert.equal(fixture.controller.getState().mode, "picker");
  await fixture.controller.close();
  assert.equal(await fixture.controller.open({ dateKey: TODAY, entries: [], preferredUserId: "member", participants }), false);
  assert.equal(fixture.controller.getState().mode, "closed");
});

test("recorded member opens read-only detail and owner keeps edit permission", async () => {
  const rows = [
    { id: "mine", user_id: "owner", diary_date: TODAY, mood: "calm", tags: [] },
    { id: "theirs", user_id: "member", diary_date: TODAY, mood: "happy", tags: [] },
  ];
  const fixture = createFixture({ entries: rows });
  await fixture.controller.open({ dateKey: TODAY, entries: rows, preferredUserId: "member", participants });
  assert.equal(fixture.controller.getState().activeDiary.user_id, "member");
  await fixture.controller.dispatch({ type: "edit", id: "theirs" });
  assert.equal(fixture.controller.getState().mode, "detail");
  await fixture.controller.dispatch({ type: "detail-user", userId: "owner" });
  await fixture.controller.dispatch({ type: "edit", id: "mine" });
  assert.equal(fixture.controller.getState().mode, "editor");
});

test("picker save uses the shared repository and emits one mutation", async () => {
  const fixture = createFixture();
  await fixture.controller.open({ dateKey: TODAY, entries: [], preferredUserId: "owner", participants });
  await fixture.controller.dispatch({ type: "pick", mood: "happy" });
  fixture.view.setDraft({ content: "今天很好", tagInput: "散步" });
  await fixture.controller.dispatch({ type: "save" });
  assert.equal(fixture.controller.getState().mode, "detail");
  assert.equal(fixture.controller.getState().activeDiary.mood, "happy");
  assert.deepEqual(fixture.controller.getState().activeDiary.tags, ["散步"]);
  assert.deepEqual(fixture.mutations.map(({ type }) => type), ["save"]);
});

test("delete stays owner-only and closes after the mutation succeeds", async () => {
  const mine = { id: "mine", user_id: "owner", diary_date: TODAY, mood: "calm", tags: [] };
  const fixture = createFixture({ entries: [mine] });
  await fixture.controller.open({ dateKey: TODAY, entries: [mine], preferredUserId: "owner", participants });
  await fixture.controller.dispatch({ type: "delete", id: "mine" });
  assert.equal(fixture.controller.getState().mode, "closed");
  assert.deepEqual(fixture.mutations.map(({ type }) => type), ["delete"]);
});

test("close and browser Back preserve URL context, scroll, and trigger focus", async () => {
  let focused = 0;
  const trigger = { focus: () => { focused += 1; }, isConnected: true };
  const fixture = createFixture();
  await fixture.controller.open({ dateKey: TODAY, entries: [], preferredUserId: "owner", participants, trigger });
  assert.equal(fixture.historyCalls.filter(([type]) => type === "push").length, 1);
  await fixture.controller.close();
  assert.equal(fixture.historyCalls.filter(([type]) => type === "back").length, 1);
  assert.equal(fixture.getScrollY(), 321);
  assert.equal(focused, 1);

  await fixture.controller.open({ dateKey: TODAY, entries: [], preferredUserId: "owner", participants, trigger });
  fixture.listeners.get("popstate")();
  await Promise.resolve();
  assert.equal(fixture.controller.getState().mode, "closed");
  assert.equal(focused, 2);
});
