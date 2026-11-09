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
    assert.deepEqual((await request(fixture, "owner")).body, { userId: "owner", revision: 0, updatedAt: null, state: null });
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
