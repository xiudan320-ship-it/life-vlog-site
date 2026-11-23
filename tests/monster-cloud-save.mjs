import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import worker from "../cloudflare-worker/src/worker.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createMonsterSaveStore } from "../modules/monster/save-store.js";
import { beginTrial } from "../modules/monster/trial-domain.js";
import { assignMainPet } from "../modules/monster/pet-domain.js";

const items = JSON.parse(await readFile(new URL("../public/monster/data/item.json", import.meta.url)));
const skills = JSON.parse(await readFile(new URL("../public/monster/data/skill.json", import.meta.url)));
const state = () => ({ ...createNewGame({ items, skills }), gold: 1117 });
const request = async (fixture, user, method = "GET", body) => {
  const response = await worker.fetch(new Request("https://worker.test/api/monster/save?user_id=owner", {
    method, headers: { Origin: fixture.env.ALLOWED_ORIGINS, Authorization: `Bearer ${fixture.tokens.get(user) || "missing"}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), fixture.env);
  return { status: response.status, body: await response.json() };
};

test("cloud game saves isolate family accounts and compare revisions atomically", async () => {
  const fixture = createWorkerFixture();
  try {
    assert.equal((await request(fixture, "missing")).status, 401);
    const first = (await request(fixture, "owner")).body;
    assert.deepEqual({ ...first, serverTime: undefined }, { userId: "owner", revision: 0, updatedAt: null, state: null, serverTime: undefined });
    assert.equal(new Date(first.serverTime).toISOString(), first.serverTime);
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: state(), userId: "member" })).status, 200);
    assert.equal((await request(fixture, "member")).body.state, null);
    assert.equal((await request(fixture, "owner")).body.state.gold, 1117);
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: state() })).status, 409);
    const writes = await Promise.all([1120, 1130].map((gold) => request(fixture, "owner", "PUT", { expectedRevision: 1, state: { ...state(), gold } })));
    assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await request(fixture, "owner")).body.revision, 2);
    assert.equal((await request(fixture, "member")).body.revision, 0);
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 2, state: {} })).status, 400);
    assert.equal((await request(fixture, "owner")).body.revision, 2);
  } finally { fixture.close(); }
});

test("offline runs and their one-time settlement are isolated and revision protected", async () => {
  const fixture = createWorkerFixture();
  try {
    const run = { ...state(), offlineRun: { copyId: 1001, hard: 1, waves: 1, startedAt: 1700000000000, seed: 12345 } };
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: run })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state.offlineRun, run.offlineRun);
    assert.equal((await request(fixture, "member")).body.state, null);
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: { ...run, offlineRun: { ...run.offlineRun, seed: 0 } } })).status, 400);
    assert.equal((await request(fixture, "owner")).body.revision, 1);
    const { offlineRun, ...completed } = run;
    const writes = await Promise.all([200, 300].map((reward) => request(fixture, "owner", "PUT", {
      expectedRevision: 1, state: { ...completed, gold: completed.gold + reward },
    })));
    assert.deepEqual(writes.map((result) => result.status).sort(), [200, 409]);
    const saved = (await request(fixture, "owner")).body;
    assert.equal(saved.revision, 2);
    assert.equal(saved.state.offlineRun, undefined);
    assert.ok([1317, 1417].includes(saved.state.gold));
    assert.equal((await request(fixture, "member")).body.state, null);
  } finally { fixture.close(); }
});

test("crafting history persists per account and malformed counts cannot replace the cloud save", async () => {
  const fixture = createWorkerFixture();
  try {
    const progress = { ...state(), crafting: { counts: { 6002: 2, 5065: 1 } } };
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: progress })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state.crafting, progress.crafting);
    assert.equal((await request(fixture, "member")).body.state, null);
    for (const crafting of [null, { counts: [] }, { counts: { 6002: 0 } }, { counts: { 6002: -1 } }, { counts: { invalid: 1 } }, { counts: { 6002: 1.5 } }]) {
      assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: { ...progress, crafting } })).status, 400);
    }
    assert.deepEqual((await request(fixture, "owner")).body.state.crafting, progress.crafting);
    assert.equal((await request(fixture, "owner")).body.revision, 1);
  } finally { fixture.close(); }
});

test("strength +30 round-trips per account and out-of-range values cannot replace it", async () => {
  const fixture = createWorkerFixture();
  try {
    const progress = state(); progress.player.equipmentSets[0][0].strength = 30;
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: progress })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state, progress);
    assert.equal((await request(fixture, "member")).body.state, null);
    for (const strength of [-1, 31, 1.5]) {
      const invalid = structuredClone(progress); invalid.player.equipmentSets[0][0].strength = strength;
      assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: invalid })).status, 400);
    }
    assert.equal((await request(fixture, "owner")).body.revision, 1);
  } finally { fixture.close(); }
});

test("cloud client refuses late results and writes after an account switch", async () => {
  let session = { access_token: "fixture-a", user: { id: "owner" } };
  let remote = null;
  let revision = 0;
  let release;
  let gate = null;
  const store = createMonsterSaveStore({ getSession: () => session, request: async (_, options) => {
    if (gate) await gate;
    if (options.method === "PUT") {
      const payload = JSON.parse(options.body);
      assert.equal(payload.expectedRevision, revision);
      remote = payload.state;
      return { userId: "owner", revision: ++revision };
    }
    return { userId: "owner", state: remote, revision };
  } });
  assert.equal(await store.load(), null);
  await store.save(state());
  assert.equal(remote.gold, 1117);
  gate = new Promise((resolve) => { release = resolve; });
  const pending = store.load();
  session = { access_token: "fixture-b", user: { id: "member" } };
  release();
  await assert.rejects(pending, { code: "ACCOUNT_CHANGED" });
  await assert.rejects(store.save(state()), { code: "ACCOUNT_CHANGED" });
});

test("trial rounds and reward receipts round-trip per account and reject invalid progress", async () => {
  const fixture = createWorkerFixture();
  try {
    const progress = beginTrial(state(), 3);
    progress.trial = { ...progress.trial, level: 7, score: 800, bestScores: { 3: 800 } };
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: progress })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state.trial, progress.trial);
    assert.equal((await request(fixture, "member")).body.state, null);
    const invalid = { ...progress, trial: { ...progress.trial, hard: 4 } };
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: invalid })).status, 400);
    progress.trial = { ...progress.trial, status: "claimed", rewards: [{ id: 5116, type: 1, quantity: 2 }] };
    progress.inventory.goods.push(progress.trial.rewards[0]);
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: progress })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state, progress);
  } finally { fixture.close(); }
});

test("main-pet flags round-trip per account and reject multiple selected owned pets", async () => {
  const fixture = createWorkerFixture();
  try {
    const pets = JSON.parse(await readFile(new URL("../public/monster/data/pet.json", import.meta.url)));
    const progress = state(); progress.player.level = 35;
    progress.inventory.pets = [0, 1].map(() => ({ id: 4026, type: 3, level: 1, quality: 4, experience: 0 }));
    const assigned = assignMainPet({ state: progress, catalog: { pets }, target: { index: 1, id: 4026 }, enabled: true });
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: assigned })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state.inventory.pets.map((pet) => pet.partyRole), [0, 1]);
    assert.equal((await request(fixture, "member")).body.state, null);
    const invalid = structuredClone(assigned); invalid.inventory.pets[0].partyRole = 1;
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: invalid })).status, 400);
    assert.deepEqual((await request(fixture, "owner")).body.state, assigned);
  } finally { fixture.close(); }
});

test("side-pet roles and preserved counters round-trip, reject overflow, and remain account isolated", async () => {
  const fixture = createWorkerFixture();
  try {
    const progress = state(); progress.player.level = 35;
    progress.inventory.pets = [1, 2, 2, 2, 2].map((partyRole, index) => ({ id: 4001 + index, type: 3, level: 1,
      quality: 2, experience: 0, partyRole, care: { loyalty: 80, killCount: index ? 1799 : 700 } }));
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: progress })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state, progress);
    assert.equal((await request(fixture, "member")).body.state, null);
    const extra = structuredClone(progress); extra.inventory.pets.push({ ...extra.inventory.pets[1] });
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: extra })).status, 400);
    const invalid = structuredClone(progress); invalid.inventory.pets[0].care.killCount = 1800;
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: invalid })).status, 400);
    assert.equal((await request(fixture, "owner")).body.revision, 1);
  } finally { fixture.close(); }
});

test("pet level and XP persist for the owning account and invalid unassigned pets cannot overwrite it", async () => {
  const fixture = createWorkerFixture();
  try {
    const progress = state(); progress.player.level = 35;
    progress.inventory.pets = [
      { id: 4001, type: 3, level: 2, quality: 1, experience: 3, partyRole: 1 },
      { id: 4026, type: 3, level: 60, quality: 4, experience: 52215000, partyRole: 0 },
    ];
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: progress })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state.inventory.pets, progress.inventory.pets);
    assert.equal((await request(fixture, "member")).body.state, null);
    for (const invalid of [{ level: 61 }, { level: 1, experience: 15000 }, { experience: -1 }, { experience: 52215001 }]) {
      const corrupt = structuredClone(progress); Object.assign(corrupt.inventory.pets[1], invalid);
      assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: corrupt })).status, 400);
    }
    assert.equal((await request(fixture, "owner")).body.revision, 1);
    assert.deepEqual((await request(fixture, "owner")).body.state.inventory.pets, progress.inventory.pets);
  } finally { fixture.close(); }
});

test("pet loyalty and kill count are isolated by account and reject malformed care records", async () => {
  const fixture = createWorkerFixture();
  try {
    const progress = state(); progress.player.level = 35;
    progress.inventory.pets = [
      { id: 4026, type: 3, level: 1, quality: 4, experience: 0, partyRole: 1, care: { loyalty: 79, killCount: 0 } },
      { id: 4026, type: 3, level: 1, quality: 4, experience: 0 },
    ];
    assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 0, state: progress })).status, 200);
    assert.deepEqual((await request(fixture, "owner")).body.state.inventory.pets, progress.inventory.pets);
    assert.equal((await request(fixture, "member")).body.state, null);
    for (const care of [null, { loyalty: 29, killCount: 0 }, { loyalty: 101, killCount: 0 },
      { loyalty: 90, killCount: -1 }, { loyalty: 90, killCount: 1800 }, { loyalty: 90, killCount: 0.5 }]) {
      const invalid = structuredClone(progress); invalid.inventory.pets[1].care = care;
      assert.equal((await request(fixture, "owner", "PUT", { expectedRevision: 1, state: invalid })).status, 400);
    }
    assert.equal((await request(fixture, "owner")).body.revision, 1);
    assert.deepEqual((await request(fixture, "owner")).body.state.inventory.pets, progress.inventory.pets);
  } finally { fixture.close(); }
});
