import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";

function request(fixture, userId, table, action, values, filters = [], extra = {}) {
  const token = fixture.tokens.get(userId) || `fixture-token-${userId}`;
  return worker.fetch(new Request(`https://worker.test/api/table/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: "https://fixture.local",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, values, filters, ...extra }),
  }), fixture.env).then(async (response) => ({ response, body: await response.json() }));
}

function seed(fixture, sql, ...values) {
  fixture.DB.database.prepare(sql).run(...values);
}

test("insert never turns an existing private record into an update", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(fixture, "insert into secret_items (id, user_id, title) values (?, ?, ?)", "secret-b", "member", "B private");
    const result = await request(fixture, "owner", "secret_items", "insert", {
      id: "secret-b",
      user_id: "member",
      title: "A overwrite",
    });
    assert.equal(result.response.status, 409, JSON.stringify(result.body));
    assert.deepEqual(
      { ...fixture.DB.database.prepare("select id, user_id, title from secret_items where id=?").get("secret-b") },
      { id: "secret-b", user_id: "member", title: "B private" },
    );
  } finally {
    fixture.close();
  }
});

test("upsert enforces private ownership and preserves shared record ownership", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(fixture, "insert into secret_items (id, user_id, title) values (?, ?, ?)", "secret-b", "member", "B private");
    const privateResult = await request(fixture, "owner", "secret_items", "upsert", {
      id: "secret-b", title: "not allowed",
    });
    assert.equal(privateResult.response.status, 403, JSON.stringify(privateResult.body));

    seed(fixture, "insert into recipes (id, user_id, name, note, created_at) values (?, ?, ?, ?, ?)", "recipe-b", "member", "B recipe", "keep", "2026-01-01T00:00:00.000Z");
    const sharedResult = await request(fixture, "owner", "recipes", "upsert", {
      id: "recipe-b", name: "Edited by family",
    });
    assert.equal(sharedResult.response.status, 200, JSON.stringify(sharedResult.body));
    assert.equal(sharedResult.body.data[0].user_id, "member");
    assert.equal(sharedResult.body.data[0].created_at, "2026-01-01T00:00:00.000Z");
    assert.equal(sharedResult.body.data[0].note, "keep");
    assert.equal(
      fixture.DB.database.prepare("select user_id from recipes where id=?").get("recipe-b").user_id,
      "member",
    );

    const outsiderResult = await request(fixture, "outsider", "recipes", "upsert", { id: "recipe-b", name: "outside" });
    assert.equal(outsiderResult.response.status, 403, JSON.stringify(outsiderResult.body));
  } finally {
    fixture.close();
  }
});

test("upsert rejects a private row inserted after the preflight without leaking canonical data", async () => {
  const fixture = createWorkerFixture();
  try {
    const originalBatch = fixture.DB.batch.bind(fixture.DB);
    let injected = false;
    fixture.DB.batch = async (statements) => {
      if (!injected && statements.some(({ _sql }) => String(_sql).toLowerCase().includes("insert into secret_items"))) {
        injected = true;
        seed(
          fixture,
          "insert into secret_items (id, user_id, title, note) values (?, ?, ?, ?)",
          "race-id",
          "member",
          "B original",
          "B private text",
        );
      }
      return originalBatch(statements);
    };

    const result = await request(fixture, "owner", "secret_items", "upsert", {
      id: "race-id", title: "A changed",
    });
    assert.equal(result.response.status, 403, JSON.stringify(result.body));
    assert.doesNotMatch(JSON.stringify(result.body), /B private text/);
    assert.deepEqual(
      { ...fixture.DB.database.prepare("select id, user_id, title, note from secret_items where id=?").get("race-id") },
      { id: "race-id", user_id: "member", title: "B original", note: "B private text" },
    );
    assert.equal(fixture.DB.database.prepare("select count(*) as total from notifications").get().total, 0);
  } finally {
    fixture.close();
  }
});

test("a guarded upsert race does not emit activity notifications", async () => {
  const fixture = createWorkerFixture();
  try {
    const originalBatch = fixture.DB.batch.bind(fixture.DB);
    let injected = false;
    fixture.DB.batch = async (statements) => {
      if (!injected && statements.some(({ _sql }) => String(_sql).toLowerCase().includes("insert into photos"))) {
        injected = true;
        seed(
          fixture,
          "insert into photos (id, user_id, title, note, taken_at) values (?, ?, ?, ?, ?)",
          "race-photo",
          "outsider",
          "Private outsider photo",
          "Private outsider note",
          "2026-08-03T00:00:00.000Z",
        );
      }
      return originalBatch(statements);
    };

    const result = await request(fixture, "owner", "photos", "upsert", {
      id: "race-photo", title: "Owner overwrite", taken_at: "2026-08-03T00:00:00.000Z",
    });
    assert.equal(result.response.status, 403, JSON.stringify(result.body));
    assert.doesNotMatch(JSON.stringify(result.body), /Private outsider note/);
    assert.equal(
      fixture.DB.database.prepare("select count(*) as total from notifications where type='diary'").get().total,
      0,
    );
    assert.deepEqual(
      { ...fixture.DB.database.prepare("select user_id, title, note from photos where id=?").get("race-photo") },
      { user_id: "outsider", title: "Private outsider photo", note: "Private outsider note" },
    );
  } finally {
    fixture.close();
  }
});

test("upsert rechecks authorization when an existing row changes owner before mutation", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(fixture, "insert into secret_items (id, user_id, title, note) values (?, ?, ?, ?)", "replace-id", "owner", "A original", "A private text");
    const originalBatch = fixture.DB.batch.bind(fixture.DB);
    let replaced = false;
    fixture.DB.batch = async (statements) => {
      if (!replaced && statements.some(({ _sql }) => String(_sql).toLowerCase().includes("insert into secret_items"))) {
        replaced = true;
        fixture.DB.database.prepare("delete from secret_items where id=?").run("replace-id");
        seed(fixture, "insert into secret_items (id, user_id, title, note) values (?, ?, ?, ?)", "replace-id", "member", "B replacement", "B private text");
      }
      return originalBatch(statements);
    };

    const result = await request(fixture, "owner", "secret_items", "upsert", {
      id: "replace-id", title: "A changed",
    });
    assert.equal(result.response.status, 403, JSON.stringify(result.body));
    assert.doesNotMatch(JSON.stringify(result.body), /B private text/);
    assert.deepEqual(
      { ...fixture.DB.database.prepare("select id, user_id, title, note from secret_items where id=?").get("replace-id") },
      { id: "replace-id", user_id: "member", title: "B replacement", note: "B private text" },
    );
  } finally {
    fixture.close();
  }
});

test("new records cannot forge an owner and partial upserts keep omitted fields", async () => {
  const fixture = createWorkerFixture();
  try {
    const created = await request(fixture, "owner", "recipes", "upsert", {
      id: "recipe-new", user_id: "member", name: "New recipe", note: "original note",
    });
    assert.equal(created.response.status, 200, JSON.stringify(created.body));
    assert.equal(created.body.data[0].user_id, "owner");

    const updated = await request(fixture, "owner", "recipes", "upsert", {
      id: "recipe-new", name: "Renamed recipe",
    });
    assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data[0].name, "Renamed recipe");
    assert.equal(updated.body.data[0].note, "original note");
    assert.equal(updated.body.data[0].created_at, created.body.data[0].created_at);
  } finally {
    fixture.close();
  }
});

test("mood upsert returns a stable canonical id and rejects id collisions", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(fixture, "insert into mood_diaries (id, user_id, diary_date, mood, content) values (?, ?, ?, ?, ?)", "mood-canonical", "owner", "2026-08-30", "calm", "first");
    seed(fixture, "insert into mood_diaries (id, user_id, diary_date, mood, content) values (?, ?, ?, ?, ?)", "mood-other", "owner", "2026-08-29", "sad", "other");
    seed(fixture, "insert into mood_diaries (id, user_id, diary_date, mood, content) values (?, ?, ?, ?, ?)", "mood-member", "member", "2026-08-28", "happy", "member");

    const sameDay = await request(fixture, "owner", "mood_diaries", "upsert", {
      id: "temporary-id", diary_date: "2026-08-30", mood: "happy", content: "updated",
    });
    assert.equal(sameDay.response.status, 200, JSON.stringify(sameDay.body));
    assert.equal(sameDay.body.data[0].id, "mood-canonical");
    assert.equal(sameDay.body.data[0].content, "updated");
    assert.equal(fixture.DB.database.prepare("select count(*) as total from mood_diaries where user_id=? and diary_date=?").get("owner", "2026-08-30").total, 1);

    const sameUserOtherDay = await request(fixture, "owner", "mood_diaries", "upsert", {
      id: "mood-other", diary_date: "2026-08-27", mood: "happy",
    });
    assert.equal(sameUserOtherDay.response.status, 409, JSON.stringify(sameUserOtherDay.body));

    const otherUser = await request(fixture, "owner", "mood_diaries", "upsert", {
      id: "mood-member", diary_date: "2026-08-27", mood: "happy",
    });
    assert.equal(otherUser.response.status, 403, JSON.stringify(otherUser.body));
  } finally {
    fixture.close();
  }
});

test("favorite upsert is idempotent and only creates one notification", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(fixture, "insert into photos (id, user_id, title, taken_at) values (?, ?, ?, ?)", "photo-member", "member", "Family photo", "2026-08-01T00:00:00.000Z");
    const first = await request(fixture, "owner", "photo_favorites", "upsert", { photo_id: "photo-member" });
    const second = await request(fixture, "owner", "photo_favorites", "upsert", { photo_id: "photo-member" });
    assert.equal(first.response.status, 200, JSON.stringify(first.body));
    assert.equal(second.response.status, 200, JSON.stringify(second.body));
    assert.equal(fixture.DB.database.prepare("select count(*) as total from photo_favorites where user_id=? and photo_id=?").get("owner", "photo-member").total, 1);
    assert.equal(fixture.DB.database.prepare("select count(*) as total from notifications where user_id=? and type='favorite'").get("member").total, 1);
  } finally {
    fixture.close();
  }
});

test("invalid filters reject before delete and empty in matches no rows", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(fixture, "insert into secret_items (id, user_id, title) values (?, ?, ?)", "secret-a", "owner", "A one");
    seed(fixture, "insert into secret_items (id, user_id, title) values (?, ?, ?)", "secret-a2", "owner", "A two");
    for (const filters of [
      [{ column: "typo_id", op: "eq", value: "secret-a" }],
      [{ column: "id", op: "contains", value: "secret-a" }],
      [{ column: "id", op: "eq", value: "secret-a" }, { column: "typo_id", op: "eq", value: "secret-a2" }],
    ]) {
      const result = await request(fixture, "owner", "secret_items", "delete", null, filters);
      assert.equal(result.response.status, 400, JSON.stringify(result.body));
    }
    const empty = await request(fixture, "owner", "secret_items", "delete", null, [{ column: "id", op: "in", value: [] }]);
    assert.equal(empty.response.status, 200, JSON.stringify(empty.body));
    assert.equal(empty.body.count, 0);
    assert.equal(fixture.DB.database.prepare("select count(*) as total from secret_items where user_id=?").get("owner").total, 2);
  } finally {
    fixture.close();
  }
});

test("mixed batch writes validate all rows before committing", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(fixture, "insert into secret_items (id, user_id, title) values (?, ?, ?)", "secret-b", "member", "B private");
    const result = await request(fixture, "owner", "recipes", "upsert", [
      { id: "recipe-good", name: "Would be valid" },
    ]);
    assert.equal(result.response.status, 200, JSON.stringify(result.body));

    const batch = await request(fixture, "owner", "secret_items", "upsert", [
      { id: "secret-new", title: "must not commit" },
      { id: "secret-b", title: "forbidden" },
    ]);
    assert.equal(batch.response.status, 403, JSON.stringify(batch.body));
    assert.equal(fixture.DB.database.prepare("select count(*) as total from secret_items where id=?").get("secret-new").total, 0);
  } finally {
    fixture.close();
  }
});

test("old client conflict targets are rejected", async () => {
  const fixture = createWorkerFixture();
  try {
    const result = await request(fixture, "owner", "recipes", "upsert", { id: "recipe-old", name: "old" }, [], { onConflict: "id" });
    assert.equal(result.response.status, 400, JSON.stringify(result.body));
  } finally {
    fixture.close();
  }
});
