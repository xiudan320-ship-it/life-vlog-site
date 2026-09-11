import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";

function headers(fixture, token) {
  return {
    Origin: fixture.env.ALLOWED_ORIGINS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function logout(fixture, token) {
  const response = await worker.fetch(new Request("https://worker.test/api/auth/logout", {
    method: "POST",
    headers: headers(fixture, token),
    body: "{}",
  }), fixture.env);
  return { response, body: await response.json() };
}

async function me(fixture, token) {
  const response = await worker.fetch(new Request("https://worker.test/api/auth/me", {
    headers: headers(fixture, token),
  }), fixture.env);
  return { response, body: await response.json() };
}

test("logout revokes exactly the captured session and is idempotent", async () => {
  const fixture = createWorkerFixture();
  try {
    const first = await logout(fixture, fixture.tokens.get("owner"));
    assert.equal(first.response.status, 200, JSON.stringify(first.body));
    assert.deepEqual(first.body.data, true);
    assert.equal(fixture.DB.database.prepare("select count(*) as count from sessions where user_id=?").get("owner").count, 0);
    assert.equal(fixture.DB.database.prepare("select count(*) as count from sessions where user_id=?").get("member").count, 1);

    const repeated = await logout(fixture, fixture.tokens.get("owner"));
    assert.equal(repeated.response.status, 200, JSON.stringify(repeated.body));
    assert.deepEqual(repeated.body.data, true);
    assert.equal(fixture.DB.database.prepare("select count(*) as count from sessions").get().count, 2);

    assert.equal((await me(fixture, fixture.tokens.get("owner"))).response.status, 401);
    assert.equal((await me(fixture, fixture.tokens.get("member"))).response.status, 200);
  } finally {
    fixture.close();
  }
});

test("logout without a token or with an unknown token is a successful no-op", async () => {
  const fixture = createWorkerFixture();
  try {
    const missing = await logout(fixture, "");
    assert.equal(missing.response.status, 200, JSON.stringify(missing.body));
    assert.deepEqual(missing.body.data, true);
    const unknown = await logout(fixture, "unknown-token");
    assert.equal(unknown.response.status, 200, JSON.stringify(unknown.body));
    assert.deepEqual(unknown.body.data, true);
    assert.equal(fixture.DB.database.prepare("select count(*) as count from sessions").get().count, 3);
  } finally {
    fixture.close();
  }
});

test("logout maps a database failure to a safe server error", async () => {
  const fixture = createWorkerFixture();
  try {
    fixture.DB.failNext({ method: "run", includes: "delete from sessions", error: new Error("fixture database failure") });
    const result = await logout(fixture, fixture.tokens.get("owner"));
    assert.equal(result.response.status, 500);
    assert.deepEqual(result.body, { error: "Worker error. Please try again." });
  } finally {
    fixture.close();
  }
});
