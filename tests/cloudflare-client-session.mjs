import assert from "node:assert/strict";
import test from "node:test";

import { createAuthController } from "../modules/auth-controller.js";
import { createCloudflareBackend } from "../modules/cloudflare-client.js";

const AUTH_KEY = "life-vlog-cloudflare-auth";

function makeStorage(initial = null) {
  const values = new Map(initial ? [[AUTH_KEY, JSON.stringify(initial)]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    raw: values,
  };
}

function makeSession(token, userId, expiresAt = "2099-01-01T00:00:00.000Z") {
  return {
    access_token: token,
    expires_at: expiresAt,
    user: { id: userId, email: `${userId}@fixture.local`, user_metadata: { username: userId } },
  };
}

function makeResponse(body = { data: true }, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createIndexedDbFixture({ failDelete = false, blockWrites = false, failOpen = false } = {}) {
  const backupValues = new Map();
  const pendingCompletions = [];
  let blocked = blockWrites;
  let rejectOpen = failOpen;

  function scheduleCompletion(transaction, operations) {
    const complete = () => {
      if (failDelete && operations.some(({ type }) => type === "delete")) {
        transaction.error = new Error("fixture IndexedDB delete failure");
        transaction.onerror?.();
        transaction.onabort?.();
        return;
      }
      for (const operation of operations) {
        if (operation.type === "put") backupValues.set(operation.key, operation.value);
        else backupValues.delete(operation.key);
      }
      transaction.oncomplete?.();
    };
    if (blocked) pendingCompletions.push(complete);
    else queueMicrotask(complete);
  }

  function openDatabase() {
    const storeNames = new Set();
    return {
      objectStoreNames: { contains: (name) => storeNames.has(name) },
      createObjectStore: (name) => storeNames.add(name),
      transaction: (_storeName, mode) => {
        const transaction = { mode, error: null, operations: [] };
        transaction.objectStore = () => ({
          get(key) {
            const request = {};
            queueMicrotask(() => {
              request.result = backupValues.get(key);
              request.onsuccess?.();
            });
            return request;
          },
          put(value, key) {
            transaction.operations.push({ type: "put", value, key });
            scheduleCompletion(transaction, transaction.operations);
          },
          delete(key) {
            transaction.operations.push({ type: "delete", key });
            scheduleCompletion(transaction, transaction.operations);
          },
        });
        return transaction;
      },
      close() {},
    };
  }

  return {
    open(_name, _version) {
      const request = { result: null };
      queueMicrotask(() => {
        if (rejectOpen) {
          request.error = new Error("fixture IndexedDB unavailable");
          request.onerror?.();
          return;
        }
        request.result = openDatabase();
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
    releaseWrites() {
      blocked = false;
      pendingCompletions.splice(0).forEach((complete) => queueMicrotask(complete));
    },
    setOpenFailure(value) {
      rejectOpen = Boolean(value);
    },
    values: backupValues,
  };
}

function createHarness({ session = null, fetchApi, indexedDb = null, storage = makeStorage(session) } = {}) {
  let activeSession = session;
  const calls = [];
  const backend = createCloudflareBackend({
    endpoint: "https://worker.fixture",
    publicUrl: "https://public.fixture",
    authKey: AUTH_KEY,
    backupDb: "fixture-auth-backup",
    backupStore: "sessions",
    usernameToEmail: (username) => `${username}@fixture.local`,
    getActiveSession: () => activeSession,
    storage,
    indexedDb,
    navigatorApi: {},
    fetchApi: async (url, options) => {
      calls.push({ url, options });
      return fetchApi(url, options);
    },
  });
  const client = backend.createClient();
  const events = [];
  client.auth.onAuthStateChange((event, nextSession) => {
    events.push({ event, nextSession });
    activeSession = nextSession;
  });
  return { backend, client, calls, events, storage, setActive: (value) => { activeSession = value; } };
}

test("signOut revokes the captured token, clears both stores, and deduplicates clicks", async () => {
  const session = makeSession("token-a", "user-a");
  const indexedDb = createIndexedDbFixture();
  const harness = createHarness({
    session,
    indexedDb,
    fetchApi: async (url) => {
      assert.equal(url, "https://worker.fixture/api/auth/logout");
      return makeResponse();
    },
  });
  const first = harness.client.auth.signOut();
  const second = harness.client.auth.signOut();
  assert.strictEqual(first, second);
  assert.equal(harness.storage.getItem(AUTH_KEY), null, "localStorage must clear synchronously");
  assert.equal(harness.events.length, 1);
  const result = await first;
  assert.equal(result.error, null);
  assert.equal(result.localCleared, true);
  assert.equal(result.serverRevoked, true);
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].options.headers.get("Authorization"), "Bearer token-a");
  assert.equal(indexedDb.values.has(AUTH_KEY), false);
});

test("logout without a session is local and does not make a redundant request", async () => {
  const harness = createHarness({ fetchApi: async () => { throw new Error("unexpected request"); } });
  const result = await harness.client.auth.signOut();
  assert.equal(result.error, null);
  assert.equal(result.localCleared, true);
  assert.equal(result.serverRevoked, true);
  assert.equal(harness.calls.length, 0);
});

test("server 500, network failure, timeout, and expired 401 remain distinguishable from local logout", async (t) => {
  const cases = [
    ["server", async () => makeResponse({ error: "fixture failure" }, 500), "5xx"],
    ["network", async () => { throw new TypeError("network unavailable"); }, "network"],
    ["timeout", async () => { throw new DOMException("The operation was aborted", "AbortError"); }, "timeout"],
    ["expired", async () => makeResponse({ error: "expired" }, 401), null],
  ];
  for (const [name, fetchApi, kind] of cases) {
    await t.test(name, async () => {
      const harness = createHarness({ session: makeSession(`token-${name}`, `user-${name}`), fetchApi });
      const result = await harness.client.auth.signOut();
      assert.equal(result.localCleared, true);
      assert.equal(result.serverRevoked, kind === null);
      if (kind) assert.equal(result.error.kind, kind);
      else assert.equal(result.error, null);
    });
  }
});

test("a response from a session that signed out cannot restore its backup", async () => {
  const session = makeSession("token-a", "user-a", "2000-01-01T00:00:00.000Z");
  let resolveRequest;
  const harness = createHarness({
    session,
    fetchApi: async (url) => {
      if (url.endsWith("/api/auth/logout")) return makeResponse();
      return new Promise((resolve) => { resolveRequest = resolve; });
    },
  });
  const oldRequest = harness.backend.request("/api/table/photos");
  await harness.client.auth.signOut();
  resolveRequest(makeResponse({ data: [] }));
  await oldRequest;
  assert.equal(harness.storage.getItem(AUTH_KEY), null);
  assert.equal(harness.events.at(-1).nextSession, null);
});

test("online sign-in stays coherent when the session backup is unavailable", async () => {
  const indexedDb = createIndexedDbFixture({ failOpen: true });
  const harness = createHarness({
    indexedDb,
    fetchApi: async (url) => {
      assert.equal(url, "https://worker.fixture/api/auth/login");
      return makeResponse({
        token: "token-login",
        expires_at: "2099-01-01T00:00:00.000Z",
        user: { id: "user-login", username: "user-login", email: "user-login@fixture.local" },
        profile: { username: "Login" },
      });
    },
  });

  const result = await harness.client.auth.signInWithPassword({
    email: "user-login@fixture.local",
    password: "fixture",
  });
  assert.equal(result.error, null);
  assert.equal(result.data.session.user.id, "user-login");
  assert.equal(result.backup.persisted, false);
  assert.match(result.backup.error.message, /IndexedDB unavailable/);
  assert.equal(JSON.parse(harness.storage.getItem(AUTH_KEY)).user.id, "user-login");
  assert.equal(harness.events.at(-1).event, "SIGNED_IN");
  assert.equal(harness.events.at(-1).nextSession.user.id, "user-login");

  indexedDb.setOpenFailure(false);
  await harness.backend.restoreSessionBackup();
  assert.equal(indexedDb.values.get(AUTH_KEY).user.id, "user-login");
  harness.storage.removeItem(AUTH_KEY);
  harness.setActive(null);
  const restored = await harness.backend.restoreSessionBackup();
  assert.equal(restored.user.id, "user-login");
  assert.equal(JSON.parse(harness.storage.getItem(AUTH_KEY)).user.id, "user-login");
});

test("online sign-up emits a coherent session when the session backup is unavailable", async () => {
  const indexedDb = createIndexedDbFixture({ failOpen: true });
  const harness = createHarness({
    indexedDb,
    fetchApi: async (url) => {
      assert.equal(url, "https://worker.fixture/api/auth/register");
      return makeResponse({
        token: "token-signup",
        expires_at: "2099-01-01T00:00:00.000Z",
        user: { id: "user-signup", username: "user-signup", email: "user-signup@fixture.local" },
        profile: { username: "Sign-up" },
      });
    },
  });

  const result = await harness.client.auth.signUp({
    email: "user-signup@fixture.local",
    password: "fixture",
    options: { data: { username: "user-signup", inviteCode: "fixture-invite" } },
  });
  assert.equal(result.error, null);
  assert.equal(result.data.session.user.id, "user-signup");
  assert.equal(result.backup.persisted, false);
  assert.match(result.backup.error.message, /IndexedDB unavailable/);
  assert.equal(JSON.parse(harness.storage.getItem(AUTH_KEY)).user.id, "user-signup");
  assert.deepEqual(harness.events.map(({ event }) => event), ["SIGNED_IN"]);
});

test("an old account request cannot overwrite a newly signed-in account", async () => {
  const sessionA = makeSession("token-a", "user-a", "2000-01-01T00:00:00.000Z");
  let resolveOldRequest;
  const harness = createHarness({
    session: sessionA,
    fetchApi: async (url) => {
      if (url.endsWith("/api/auth/logout")) return makeResponse();
      if (url.endsWith("/api/auth/login")) return makeResponse({
        token: "token-b",
        expires_at: "2099-01-01T00:00:00.000Z",
        user: { id: "user-b", username: "user-b", email: "user-b@fixture.local" },
        profile: { username: "B" },
      });
      return new Promise((resolve) => { resolveOldRequest = resolve; });
    },
  });
  const oldRequest = harness.backend.request("/api/table/photos");
  await harness.client.auth.signOut();
  const signedIn = await harness.client.auth.signInWithPassword({ email: "user-b@fixture.local", password: "fixture" });
  assert.equal(signedIn.error, null);
  assert.equal(harness.storage.getItem(AUTH_KEY) !== null, true);
  resolveOldRequest(makeResponse({ data: [] }));
  await oldRequest;
  assert.equal(JSON.parse(harness.storage.getItem(AUTH_KEY)).user.id, "user-b");
});

test("a pending A logout never clears B after B signs in", async () => {
  const sessionA = makeSession("token-a", "user-a");
  let resolveLogout;
  const harness = createHarness({
    session: sessionA,
    fetchApi: async (url) => {
      if (url.endsWith("/api/auth/logout")) return new Promise((resolve) => { resolveLogout = resolve; });
      return makeResponse({
        token: "token-b",
        expires_at: "2099-01-01T00:00:00.000Z",
        user: { id: "user-b", username: "user-b", email: "user-b@fixture.local" },
        profile: { username: "B" },
      });
    },
  });
  const logout = harness.client.auth.signOut();
  const login = await harness.client.auth.signInWithPassword({ email: "user-b@fixture.local", password: "fixture" });
  assert.equal(login.error, null);
  resolveLogout(makeResponse());
  const result = await logout;
  assert.equal(result.serverRevoked, true);
  assert.equal(JSON.parse(harness.storage.getItem(AUTH_KEY)).user.id, "user-b");
  assert.equal(harness.calls.find(({ url }) => url.endsWith("/api/auth/logout")).options.headers.get("Authorization"), "Bearer token-a");
});

test("backup writes are serialized before logout deletion and cleanup errors are reported", async (t) => {
  await t.test("late write cannot resurrect a cleared session", async () => {
    const indexedDb = createIndexedDbFixture({ blockWrites: true });
    const session = makeSession("token-a", "user-a");
    const harness = createHarness({ session, indexedDb, fetchApi: async () => makeResponse() });
    const pendingWrite = harness.backend.writeSession(session);
    const logout = harness.client.auth.signOut();
    indexedDb.releaseWrites();
    await Promise.all([pendingWrite, logout]);
    assert.equal(indexedDb.values.has(AUTH_KEY), false);
  });
  await t.test("cleanup failure is not reported as a successful local clear", async () => {
    const indexedDb = createIndexedDbFixture({ failDelete: true });
    const harness = createHarness({ session: makeSession("token-a", "user-a"), indexedDb, fetchApi: async () => makeResponse() });
    const result = await harness.client.auth.signOut();
    assert.equal(result.localCleared, false);
    assert.equal(result.serverRevoked, true);
    assert.match(result.error.message, /IndexedDB delete failure/);
  });
});

function authControllerHarness(signOutResult) {
  const hints = [];
  const controller = createAuthController({
    elements: { secretPinDialog: { close() {} } },
    endpoint: "https://worker.fixture",
    getDatabase: () => ({ auth: { signOut: () => Promise.resolve(signOutResult) } }),
    getSession: () => ({ user: { id: "fixture-user" } }),
    usernameToEmail: (value) => `${value}@fixture.local`,
    getRedirectUrl: () => "https://fixture.local",
    setHint: (value) => hints.push(value),
    getBoundEmail: () => "fixture-user@fixture.local",
    renderSettingsSummary() {},
    isMissingCloudSchema: () => false,
    closeMobileDiaryPage() {},
    clearSecretUnlockState() {},
  });
  return { controller, hints };
}

test("auth controller reports server revocation accurately", async () => {
  const success = authControllerHarness({ error: null, localCleared: true, serverRevoked: true });
  await success.controller.logout();
  assert.equal(success.hints.at(-1), "已退出登录");
  const uncertain = authControllerHarness({ error: new Error("offline"), localCleared: true, serverRevoked: false });
  await uncertain.controller.logout();
  assert.equal(uncertain.hints.at(-1), "已在本机退出，服务器会话撤销未确认。");
  const localFailure = authControllerHarness({ error: new Error("cleanup"), localCleared: false, serverRevoked: true });
  await localFailure.controller.logout();
  assert.equal(localFailure.hints.at(-1), "服务器会话已撤销，但本地会话清理未完成，请刷新重试。");
  const combinedFailure = authControllerHarness({ error: new Error("cleanup"), localCleared: false, serverRevoked: false });
  await combinedFailure.controller.logout();
  assert.equal(combinedFailure.hints.at(-1), "已退出当前界面，但本地会话清理和服务器撤销都未完成，请刷新重试。");
});
