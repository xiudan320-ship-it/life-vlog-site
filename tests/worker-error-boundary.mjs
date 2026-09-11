import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";

function makeRequest(path, { method = "GET", token = "", origin = "https://fixture.local", body } = {}) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return new Request(`https://worker.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function jsonResult(request, env) {
  const response = await worker.fetch(request, env);
  return { response, body: await response.json() };
}

test("login failures resolve to a safe JSON 500 with precise CORS", async () => {
  const fixture = createWorkerFixture();
  try {
    fixture.DB.failNext({ method: "first", includes: "from users", error: new Error("SQL secret and token must not escape") });
    const result = await jsonResult(makeRequest("/api/auth/login", {
      method: "POST",
      origin: "https://fixture.local",
      body: { username: "owner", password: "fixture-password" },
    }), fixture.env);
    assert.equal(result.response.status, 500);
    assert.equal(result.body.error, "Worker error. Please try again.");
    assert.equal(result.body.detail, undefined);
    assert.equal(result.response.headers.get("Access-Control-Allow-Origin"), "https://fixture.local");
    assert.equal(result.response.headers.get("Vary"), "Origin");
  } finally {
    fixture.close();
  }
});
test("authenticated table failures are caught after authentication", async () => {
  const fixture = createWorkerFixture();
  try {
    fixture.DB.failNext({ method: "all", includes: "select * from secret_items", error: new Error("secret table failure") });
    const result = await jsonResult(makeRequest("/api/table/secret_items", {
      token: fixture.tokens.get("owner"),
      origin: "https://fixture.local",
    }), fixture.env);
    assert.equal(result.response.status, 500);
    assert.equal(result.body.error, "Worker error. Please try again.");
    assert.equal(result.response.headers.get("Access-Control-Allow-Origin"), "https://fixture.local");
  } finally {
    fixture.close();
  }
});

test("protected RPC and upload failures do not reject worker.fetch", async () => {
  const fixture = createWorkerFixture();
  try {
    fixture.DB.failNext({ method: "first", includes: "select families", error: new Error("family lookup failure") });
    const rpc = await jsonResult(makeRequest("/api/rpc/get_my_family_members", {
      method: "POST",
      token: fixture.tokens.get("owner"),
      body: {},
    }), fixture.env);
    assert.equal(rpc.response.status, 500);
    assert.equal(rpc.body.error, "Worker error. Please try again.");

    const uploadEnv = {
      ...fixture.env,
      PUBLIC_R2_URL: "https://fixture.r2.invalid",
      R2_BUCKET: { put: async () => { throw new Error("R2 internal failure"); } },
    };
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "fixture.jpg", { type: "image/jpeg" }));
    const uploadResponse = await worker.fetch(new Request("https://worker.test/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fixture.tokens.get("owner")}`,
        Origin: "https://fixture.local",
      },
      body: form,
    }), uploadEnv);
    const uploadBody = await uploadResponse.json();
    assert.equal(uploadResponse.status, 500);
    assert.equal(uploadBody.error, "Worker error. Please try again.");
  } finally {
    fixture.close();
  }
});

test("unexpected errors never grant wildcard CORS to a disallowed origin", async () => {
  const fixture = createWorkerFixture();
  try {
    fixture.DB.failNext({ method: "all", includes: "select * from secret_items", error: new Error("injected failure") });
    const result = await jsonResult(makeRequest("/api/table/secret_items", {
      token: fixture.tokens.get("owner"),
      origin: "https://evil.invalid",
    }), fixture.env);
    assert.equal(result.response.status, 500);
    assert.equal(result.response.headers.get("Access-Control-Allow-Origin"), "null");
    assert.equal(result.response.headers.get("Access-Control-Allow-Origin"), "null");
    assert.equal(result.response.headers.get("Vary"), "Origin");
  } finally {
    fixture.close();
  }
});
