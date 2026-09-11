import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import worker from "../cloudflare-worker/src/worker.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";

const TODAY = "2026-08-31";

function seedMood(fixture, row) {
  fixture.DB.database.prepare(
    `insert into mood_diaries
      (id, user_id, diary_date, mood, content, tags, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.user_id,
    row.diary_date,
    row.mood,
    row.content ?? "",
    JSON.stringify(row.tags ?? []),
    row.created_at ?? "2026-08-30T00:00:00.000Z",
    row.updated_at ?? "2026-08-30T00:00:00.000Z",
  );
}

function authHeaders(fixture, user, includeContentType = false) {
  return {
    Authorization: `Bearer ${fixture.tokens.get(user)}`,
    Origin: fixture.env.ALLOWED_ORIGINS,
    ...(includeContentType ? { "Content-Type": "application/json" } : {}),
  };
}

async function request(fixture, user, table, action, values, filters = []) {
  const response = await worker.fetch(new Request(`https://worker.test/api/table/${table}`, {
    method: "POST",
    headers: authHeaders(fixture, user, true),
    body: JSON.stringify({ action, values, filters }),
  }), fixture.env);
  return { response, body: await response.json() };
}

async function list(fixture, user, filters = []) {
  const url = new URL("https://worker.test/api/table/mood_diaries");
  url.searchParams.set("filters", JSON.stringify(filters));
  url.searchParams.set("order", "diary_date");
  url.searchParams.set("ascending", "false");
  url.searchParams.set("limit", "30");
  url.searchParams.set("offset", "0");
  const response = await worker.fetch(new Request(url, {
    headers: authHeaders(fixture, user),
  }), fixture.env);
  return { response, body: await response.json() };
}

test("mood D1 reads use family scope and a half-open month range", async () => {
  const fixture = createWorkerFixture();
  try {
    seedMood(fixture, { id: "owner-old", user_id: "owner", diary_date: "2026-08-30", mood: "calm", content: "owner", tags: ["quiet"] });
    seedMood(fixture, { id: "member-old", user_id: "member", diary_date: "2026-08-30", mood: "happy", content: "member" });
    seedMood(fixture, { id: "outsider-old", user_id: "outsider", diary_date: "2026-08-30", mood: "sad", content: "outside" });

    const result = await list(fixture, "owner", [
      { op: "gte", column: "diary_date", value: "2026-08-01" },
      { op: "lt", column: "diary_date", value: "2026-09-01" },
    ]);
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    assert.deepEqual(result.body.data.map(({ id }) => id).sort(), ["member-old", "owner-old"]);
  } finally {
    fixture.close();
  }
});

test("mood writes force the session owner and upsert one row per owner/date", async () => {
  const fixture = createWorkerFixture();
  try {
    const first = await request(fixture, "owner", "mood_diaries", "upsert", {
      id: "spoofed-id",
      user_id: "member",
      diary_date: TODAY,
      mood: "happy",
      content: "今天有阳光",
      tags: ["#晴天", "晴天", "散步"],
    });
    assert.equal(first.response.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.data[0].user_id, "owner");
    assert.deepEqual(first.body.data[0].tags, ["晴天", "散步"]);
    assert.equal(
      fixture.DB.database.prepare("select count(*) as count from mood_diaries where user_id=? and diary_date=?").get("owner", TODAY).count,
      1,
    );

    const second = await request(fixture, "owner", "mood_diaries", "upsert", {
      id: "new-client-id",
      user_id: "member",
      diary_date: TODAY,
      mood: "calm",
      content: "后来平静了",
      tags: [],
    });
    assert.equal(second.response.status, 200, JSON.stringify(second.body));
    assert.equal(
      fixture.DB.database.prepare("select count(*) as count from mood_diaries where user_id=? and diary_date=?").get("owner", TODAY).count,
      1,
    );
    assert.equal(second.body.data[0].mood, "calm");

    const blank = await request(fixture, "owner", "mood_diaries", "insert", {
      id: "blank-entry",
      diary_date: "2026-08-29",
      mood: "sad",
    });
    assert.equal(blank.response.status, 200, JSON.stringify(blank.body));
    assert.equal(blank.body.data[0].content, "");
    assert.deepEqual(blank.body.data[0].tags, []);
  } finally {
    fixture.close();
  }
});

test("mood write validation rejects invalid dates, future dates, unknown moods, and oversized fields", async () => {
  const fixture = createWorkerFixture();
  try {
    for (const values of [
      { diary_date: "2026-02-30", mood: "happy" },
      { diary_date: "2999-01-01", mood: "happy" },
      { diary_date: TODAY, mood: "surprised" },
      { diary_date: TODAY, mood: "happy", content: "x".repeat(5001) },
      { diary_date: TODAY, mood: "happy", tags: Array.from({ length: 9 }, (_, index) => `tag-${index}`) },
      { diary_date: TODAY, mood: "happy", tags: ["x".repeat(21)] },
    ]) {
      const result = await request(fixture, "owner", "mood_diaries", "insert", values);
      assert.equal(result.response.status, 400, JSON.stringify(result.body));
    }
  } finally {
    fixture.close();
  }
});

test("mood update and delete remain owner-only while family reads stay visible", async () => {
  const fixture = createWorkerFixture();
  try {
    seedMood(fixture, { id: "member-old", user_id: "member", diary_date: "2026-08-30", mood: "happy" });
    seedMood(fixture, { id: "outsider-old", user_id: "outsider", diary_date: "2026-08-30", mood: "sad" });

    const forbiddenUpdate = await request(fixture, "owner", "mood_diaries", "update", { mood: "angry" }, [{ op: "eq", column: "id", value: "member-old" }]);
    assert.equal(forbiddenUpdate.response.status, 403, JSON.stringify(forbiddenUpdate.body));
    const allowedUpdate = await request(fixture, "member", "mood_diaries", "update", { mood: "angry", content: "已更新" }, [{ op: "eq", column: "id", value: "member-old" }]);
    assert.equal(allowedUpdate.response.status, 200, JSON.stringify(allowedUpdate.body));
    assert.equal(allowedUpdate.body.data[0].mood, "angry");
    const forbiddenDelete = await request(fixture, "owner", "mood_diaries", "delete", null, [{ op: "eq", column: "id", value: "member-old" }]);
    assert.equal(forbiddenDelete.response.status, 403, JSON.stringify(forbiddenDelete.body));
    const allowedDelete = await request(fixture, "member", "mood_diaries", "delete", null, [{ op: "eq", column: "id", value: "member-old" }]);
    assert.equal(allowedDelete.response.status, 200, JSON.stringify(allowedDelete.body));
    const outsider = await list(fixture, "outsider");
    assert.deepEqual(outsider.body.data.map(({ id }) => id), ["outsider-old"]);
  } finally {
    fixture.close();
  }
});

test("mood schema and backup contract include the P0 table", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const schema = await readFile(`${root}/cloudflare-worker/schema.d1.sql`, "utf8");
  const tableConfig = await readFile(`${root}/cloudflare-worker/src/table-config.js`, "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS mood_diaries/);
  assert.match(schema, /UNIQUE \(user_id, diary_date\)/);
  assert.match(schema, /mood_diaries_user_date_idx/);
  assert.match(tableConfig, /mood_diaries:[\s\S]*scope: "family"[\s\S]*writeScope: "own"/);
  assert.match(tableConfig, /mood_diaries/);
});
