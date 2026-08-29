import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";

function createEnvironment({ username = "xiudan320", familyUserIds = ["admin", "member"], targetOwner = "member" } = {}) {
  const photos = new Map([
    ["member-photo", { id: "member-photo", user_id: targetOwner, title: "Member diary", is_public: 1 }],
  ]);
  const calls = [];
  const db = {
    prepare(sql) {
      const statement = {
        run: async (...values) => {
          calls.push({ sql, values });
          return { success: true, meta: { changes: 1 } };
        },
        bind(...values) {
          return {
            async first() {
              if (sql.includes("from sessions")) return { id: "admin", username };
              if (sql.includes("select families.*")) return { id: "family-1", owner_id: "owner" };
              if (sql.includes("select * from photos")) {
                const [photoId, ...allowedOwners] = values;
                const photo = photos.get(photoId);
                return photo && allowedOwners.includes(photo.user_id) ? { ...photo } : null;
              }
              return null;
            },
            async all() {
              if (sql.includes("select family_id from family_members")) {
                return { results: [{ family_id: "family-1" }] };
              }
              if (sql.includes("select distinct user_id from family_members")) {
                return { results: familyUserIds.map((userId) => ({ user_id: userId })) };
              }
              if (sql.includes("from family_members")) {
                return { results: familyUserIds.map((userId) => ({ user_id: userId, role: userId === "owner" ? "owner" : "member" })) };
              }
              return { results: [] };
            },
            async run() {
              calls.push({ sql, values });
              if (sql.startsWith("delete from photos")) {
                const [photoId, ...allowedOwners] = values;
                const photo = photos.get(photoId);
                if (photo && allowedOwners.includes(photo.user_id)) photos.delete(photoId);
              }
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
      return statement;
    },
  };
  return {
    env: { DB: db, ALLOWED_ORIGINS: "https://life-vlog-site.pages.dev" },
    calls,
    photos,
  };
}

async function callAdminDelete(env, photoId = "member-photo") {
  return worker.fetch(new Request("https://worker.test/api/rpc/admin_delete_photo", {
    method: "POST",
    headers: {
      Authorization: "Bearer fixture-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_photo_id: photoId }),
  }), env);
}

test("family administrator can delete another member diary through the scoped RPC", async () => {
  const fixture = createEnvironment();
  const response = await callAdminDelete(fixture.env);
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.deepEqual(body.data.map(({ id }) => id), ["member-photo"]);
  assert.equal(fixture.photos.has("member-photo"), false);
  assert.equal(fixture.calls.some(({ sql }) => sql.startsWith("delete from photos")), true);
});

test("non-administrator cannot use the administrator diary delete RPC", async () => {
  const fixture = createEnvironment({ username: "member" });
  const response = await callAdminDelete(fixture.env);
  const body = await response.json();

  assert.equal(response.status, 403, JSON.stringify(body));
  assert.equal(fixture.photos.has("member-photo"), true);
  assert.equal(fixture.calls.some(({ sql }) => sql.startsWith("delete from photos")), false);
});

test("administrator delete stays inside the current family", async () => {
  const fixture = createEnvironment({ familyUserIds: ["admin", "member"], targetOwner: "outsider" });
  const response = await callAdminDelete(fixture.env);
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.deepEqual(body.data, []);
  assert.equal(fixture.photos.has("member-photo"), true);
  assert.equal(fixture.calls.some(({ sql }) => sql.startsWith("delete from photos")), false);
});
