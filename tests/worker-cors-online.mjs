import assert from "node:assert/strict";

const workerUrl = (process.env.RELEASE_WORKER_URL || "https://life-vlog-r2-upload.xiudan320-life.workers.dev").replace(/\/+$/, "");
const productionOrigin = "https://life-vlog-site.pages.dev";
const previewOrigin = "https://codex-preview.life-vlog-site.pages.dev";

async function request(origin, path, options = {}) {
  return fetch(`${workerUrl}${path}`, {
    ...options,
    headers: {
      Origin: origin,
      ...(options.headers || {}),
    },
  });
}

for (const origin of [productionOrigin, previewOrigin]) {
  const preflight = await request(origin, "/api/auth/me", {
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Authorization, X-Not-Allowlisted",
    },
  });
  assert.equal(preflight.status, 204, `${origin} OPTIONS status`);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin, `${origin} OPTIONS origin`);
  assert.equal(preflight.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type", `${origin} OPTIONS headers`);
  assert.equal(preflight.headers.get("Vary"), "Origin", `${origin} OPTIONS Vary`);

  const health = await request(origin, "/health");
  assert.equal(health.status, 200, `${origin} health status`);
  assert.equal(health.headers.get("Access-Control-Allow-Origin"), origin, `${origin} health origin`);
  assert.equal(health.headers.get("Vary"), "Origin", `${origin} health Vary`);

  const notFound = await request(origin, "/api/auth/me");
  assert.equal(notFound.status, 401, `${origin} auth error status`);
  assert.equal(notFound.headers.get("Access-Control-Allow-Origin"), origin, `${origin} auth error origin`);
}

const unknown = await request("https://unknown.example", "/health");
assert.equal(unknown.status, 200, "unknown origin health status");
assert.equal(unknown.headers.get("Access-Control-Allow-Origin"), "null", "unknown origin must not be allowed");
assert.notEqual(unknown.headers.get("Access-Control-Allow-Origin"), "*", "wildcard CORS is forbidden");
assert.equal(unknown.headers.get("Vary"), "Origin", "unknown origin Vary");

console.log(JSON.stringify({ workerUrl, allowedOrigins: [productionOrigin, previewOrigin], unknownOrigin: "null" }));
