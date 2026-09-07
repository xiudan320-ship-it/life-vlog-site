import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";

const allowedOrigins = "https://life-vlog-site.pages.dev,https://codex-preview.life-vlog-site.pages.dev,http://localhost:4173,http://127.0.0.1:4173,http://localhost:4176,http://127.0.0.1:4176,http://localhost:5173,http://127.0.0.1:5173";
const allowedOriginList = allowedOrigins.split(",");

async function corsResponse(origin, method = "GET", path = "/health", env = {}, authenticated = false) {
  const response = await worker.fetch(new Request(`https://worker.test${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(authenticated || path.includes("/api/auth") ? { Authorization: "Bearer fixture-token" } : {}),
      ...(method === "OPTIONS" ? { "Access-Control-Request-Headers": "Authorization, X-Not-Allowlisted" } : {}),
    },
    ...(method === "POST" ? { body: "{}" } : {}),
  }), { ALLOWED_ORIGINS: allowedOrigins, ...env });
  return response;
}

test("CORS allows production, fixed preview, and supported local development origins", async () => {
  for (const origin of allowedOriginList) {
    for (const method of ["GET", "OPTIONS"]) {
      const response = await corsResponse(origin, method);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
      assert.equal(response.headers.get("Vary"), "Origin");
      assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
      if (method === "OPTIONS") assert.equal(response.status, 204);
    }
  }
});

test("CORS uses the exact allow-list for success, POST, and preflight responses", async () => {
  const origin = "https://codex-preview.life-vlog-site.pages.dev";
  const getResponse = await corsResponse(origin, "GET");
  const postResponse = await corsResponse(origin, "POST", "/api/auth/register");
  const optionsResponse = await corsResponse(origin, "OPTIONS", "/api/auth/register");
  for (const response of [getResponse, postResponse, optionsResponse]) {
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    assert.notEqual(response.headers.get("Access-Control-Allow-Origin"), "*");
    assert.notEqual(response.headers.get("Access-Control-Allow-Origin"), "null");
    assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
  }
  assert.equal(optionsResponse.status, 204);
});

test("CORS rejects unknown origins without a wildcard", async () => {
  for (const origin of ["https://unknown.example", "http://127.0.0.1:9999"]) {
    const response = await corsResponse(origin);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "null");
    assert.equal(response.headers.get("Vary"), "Origin");
  }
});

test("CORS headers survive authenticated, missing-binding, not-found, and worker-error responses", async () => {
  const cases = [
    { path: "/api/auth/me", status: 401 },
    { path: "/api/auth/register", method: "POST", status: 503 },
    { path: "/missing", status: 401 },
    { path: "/missing", status: 500, env: { DB: { prepare() { throw new Error("fixture failure"); } } }, authenticated: true },
  ];
  for (const item of cases) {
    const response = await corsResponse("https://life-vlog-site.pages.dev", item.method || "GET", item.path, item.env, item.authenticated);
    assert.equal(response.status, item.status, `${item.path} status`);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://life-vlog-site.pages.dev");
    assert.equal(response.headers.get("Vary"), "Origin");
  }
});
