import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import worker from "../cloudflare-worker/src/worker.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";
import { createMonsterSaveStore } from "../modules/monster/save-store.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills] = await Promise.all([read("item"), read("skill")]);
const savedState = () => createNewGame({ items, skills });
const iso = "2026-11-21T04:03:02.123Z";

test("authenticated GET returns current server time and isolates accounts", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(iso) });
  const fixture = createWorkerFixture();
  const call = async (name) => {
    const response = await worker.fetch(new Request("https://worker.test/api/monster/save?user_id=member", {
      headers: { Origin: fixture.env.ALLOWED_ORIGINS, Authorization: `Bearer ${fixture.tokens.get(name)}` },
    }), fixture.env);
    return { status: response.status, body: await response.json(), cache: response.headers.get("Cache-Control") };
  };
  try {
    const owner = await call("owner"), member = await call("member");
    assert.equal(owner.status, 200);
    assert.equal(owner.body.userId, "owner");
    assert.equal(member.body.userId, "member");
    assert.equal(owner.body.serverTime, iso);
    assert.equal(member.body.serverTime, iso);
    assert.equal(owner.cache, "no-store");
    t.mock.timers.tick(1500);
    assert.equal((await call("owner")).body.serverTime, "2026-11-21T04:03:03.623Z");
  } finally { fixture.close(); }
});

test("time read makes a fresh authenticated GET and checks server revision", async () => {
  let revision = 3, calls = 0;
  const session = { access_token: "fixture-token", user: { id: "owner" } };
  const store = createMonsterSaveStore({ getSession: () => session, request: async (path, options, auth) => {
    calls++;
    assert.equal(path, "/api/monster/save");
    assert.deepEqual(options, {});
    assert.deepEqual(auth, { sessionOverride: session, refreshSession: false });
    return { userId: "owner", revision, state: null, serverTime: iso };
  } });
  await store.load();
  assert.equal(await store.getServerTime(), Date.parse(iso));
  assert.equal(await store.getServerTime(), Date.parse(iso));
  assert.equal(calls, 3);
  revision++;
  await assert.rejects(store.getServerTime(), { status: 409 });
});

test("time read rejects changed accounts, changed tokens, and the wrong response user", async () => {
  for (const changed of [{ access_token: "other", user: { id: "member" } }, { access_token: "other", user: { id: "owner" } }]) {
    let session = { access_token: "fixture-token", user: { id: "owner" } }, release;
    let gate = null;
    const store = createMonsterSaveStore({ getSession: () => session, request: async () => {
      if (gate) await gate;
      return { userId: "owner", revision: 0, state: null, serverTime: iso };
    } });
    await store.load();
    gate = new Promise((resolve) => { release = resolve; });
    const pending = store.getServerTime();
    session = changed;
    release();
    await assert.rejects(pending, { code: "ACCOUNT_CHANGED", status: 401 });
  }
  let userId = "owner";
  const store = createMonsterSaveStore({ getSession: () => ({ access_token: "token", user: { id: "owner" } }),
    request: async () => ({ userId, revision: 0, state: null, serverTime: iso }) });
  await store.load();
  userId = "member";
  await assert.rejects(store.getServerTime(), { code: "ACCOUNT_CHANGED", status: 401 });
});

test("late time responses cannot cross a reload or an in-flight save", async () => {
  const session = { access_token: "token", user: { id: "owner" } };
  let release, block = false, revision = 0;
  const store = createMonsterSaveStore({ getSession: () => session, request: async (_, options) => {
    if (block && !options.method) await new Promise((resolve) => { release = resolve; });
    if (options.method === "PUT") return { userId: "owner", revision: ++revision };
    return { userId: "owner", revision, state: null, serverTime: iso };
  } });
  await store.load();
  block = true;
  const pending = store.getServerTime();
  block = false;
  await store.save(savedState());
  release();
  await assert.rejects(pending, { status: 409 });

  block = true;
  const beforeReload = store.getServerTime();
  block = false;
  await store.load();
  release();
  await assert.rejects(beforeReload, { code: "ACCOUNT_CHANGED", status: 401 });
});

test("bad server times and request failures never fall back to local time", async () => {
  let response = { userId: "owner", revision: 0, state: null, serverTime: iso }, fail = false;
  const store = createMonsterSaveStore({ getSession: () => ({ access_token: "token", user: { id: "owner" } }),
    request: async () => { if (fail) throw new Error("offline"); return response; } });
  await store.load();
  for (const serverTime of [undefined, null, "", "not-a-date", "2026-11-21", "2026-02-30T00:00:00.000Z", 42]) {
    response = { ...response, serverTime };
    await assert.rejects(store.getServerTime(), /服务器时间无效/);
  }
  fail = true;
  await assert.rejects(store.getServerTime(), /offline/);
});
