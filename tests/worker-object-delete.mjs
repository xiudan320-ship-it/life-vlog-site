import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";

function createEnvironment({ familyUserIds = ["viewer", "owner"] } = {}) {
  const deletedKeys = [];
  const db = {
    prepare(sql) {
      return {
        run: async () => ({ success: true }),
        bind(...values) {
          return {
            first: async () => {
              if (sql.includes("from sessions")) return { id: "viewer", username: "viewer" };
              return null;
            },
            all: async () => {
              if (sql.includes("select family_id from family_members")) {
                return { results: [{ family_id: "family-1" }] };
              }
              if (sql.includes("select distinct user_id from family_members")) {
                return { results: familyUserIds.map((userId) => ({ user_id: userId })) };
              }
              return { results: [] };
            },
          };
        },
      };
    },
  };
  return {
    env: {
      DB: db,
      R2_BUCKET: {
        delete: async (key) => { deletedKeys.push(key); },
      },
      ALLOWED_ORIGINS: "https://life-vlog-site.pages.dev",
    },
    deletedKeys,
  };
}

async function deleteObject(env, key) {
  return worker.fetch(new Request("https://worker.test/object", {
    method: "DELETE",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key }),
  }), env);
}

test("family members can clean up shopping images uploaded by each other", async () => {
  const { env, deletedKeys } = createEnvironment();
  const response = await deleteObject(env, "r2:owner/shopping/item.jpg");

  assert.equal(response.status, 200, await response.text());
  assert.deepEqual(deletedKeys, ["owner/shopping/item.jpg"]);
});

test("cross-member cleanup cannot delete another private asset", async () => {
  const { env, deletedKeys } = createEnvironment();
  const response = await deleteObject(env, "owner/secrets/item.jpg");

  assert.equal(response.status, 400, await response.text());
  assert.deepEqual(deletedKeys, []);
});

test("owners can still clean up their own assets", async () => {
  const { env, deletedKeys } = createEnvironment({ familyUserIds: ["viewer"] });
  const response = await deleteObject(env, "viewer/secrets/item.jpg");

  assert.equal(response.status, 200, await response.text());
  assert.deepEqual(deletedKeys, ["viewer/secrets/item.jpg"]);
});
