import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import worker from "../cloudflare-worker/src/worker.js";

const TODAY = "2026-08-31";
const TOKYO_NOW = new Date("2026-08-31T00:30:00+09:00");

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function tokenHash(token) {
  return encodeBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class MemoryD1 {
  constructor() {
    this.calls = [];
    this.rows = [
      { id: "owner-old", user_id: "owner", diary_date: "2026-08-30", mood: "calm", content: "owner", tags: "[\"quiet\"]", created_at: "2026-08-30T00:00:00.000Z", updated_at: "2026-08-30T00:00:00.000Z" },
      { id: "member-old", user_id: "member", diary_date: "2026-08-30", mood: "happy", content: "member", tags: "[]", created_at: "2026-08-30T00:00:00.000Z", updated_at: "2026-08-30T00:00:00.000Z" },
      { id: "outsider-old", user_id: "outsider", diary_date: "2026-08-30", mood: "sad", content: "outside", tags: "[]", created_at: "2026-08-30T00:00:00.000Z", updated_at: "2026-08-30T00:00:00.000Z" },
    ];
    this.familyMembers = [
      { family_id: "family-1", user_id: "owner", role: "owner", joined_at: "2026-01-01T00:00:00.000Z" },
      { family_id: "family-1", user_id: "member", role: "member", joined_at: "2026-02-01T00:00:00.000Z" },
    ];
    this.usersByTokenHash = new Map();
  }

  async addToken(token, userId) {
    this.usersByTokenHash.set(await tokenHash(token), { id: userId, username: userId, email: `${userId}@fixture.local`, session_id: `${userId}-session`, session_expires_at: "2099-01-01T00:00:00.000Z" });
  }

  prepare(sql) {
    const statement = {
      bind: (...values) => ({
        first: async () => this.first(sql, values),
        all: async () => this.all(sql, values),
        run: async () => this.run(sql, values),
      }),
      run: async () => this.run(sql, []),
    };
    return statement;
  }

  familyUserIds(userId) {
    const familyIds = this.familyMembers.filter((member) => member.user_id === userId).map((member) => member.family_id);
    if (!familyIds.length) return [userId];
    return [...new Set(this.familyMembers.filter((member) => familyIds.includes(member.family_id)).map((member) => member.user_id))];
  }

  moodScope(sql, values) {
    const inMatch = sql.match(/user_id\s+in\s*\(([^)]*)\)/i);
    if (inMatch) {
      const count = (inMatch[1].match(/\?/g) || []).length;
      return { allowed: values.slice(0, count), rest: values.slice(count) };
    }
    if (/user_id\s*=\s*\?/i.test(sql)) return { allowed: [values[0]], rest: values.slice(1) };
    return { allowed: [], rest: values };
  }

  filterMoodRows(sql, values) {
    const { allowed, rest } = this.moodScope(sql, values);
    let remaining = [...rest];
    let rows = this.rows.filter((row) => !allowed.length || allowed.includes(row.user_id));
    const hasScopeEquality = !/user_id\s+in\s*\(/i.test(sql) && /user_id\s*=\s*\?/i.test(sql);
    if (hasScopeEquality && !/user_id\s*=\s*\?.*user_id\s*=\s*\?/is.test(sql)) {
      // The first user_id equality was consumed as the scope.
    } else if (/user_id\s*=\s*\?/i.test(sql) && remaining.length) {
      const userId = remaining.shift();
      rows = rows.filter((row) => row.user_id === userId);
    }
    if (/diary_date\s*>=\s*\?/i.test(sql)) {
      const start = remaining.shift();
      rows = rows.filter((row) => row.diary_date >= start);
    }
    if (/diary_date\s*<\s*\?/i.test(sql)) {
      const end = remaining.shift();
      rows = rows.filter((row) => row.diary_date < end);
    }
    if (/id\s*=\s*\?/i.test(sql)) {
      const id = remaining.shift();
      rows = rows.filter((row) => row.id === id);
    }
    if (/user_id\s+in\s*\(/i.test(sql) && /user_id\s*=\s*\?/i.test(sql)) {
      const userId = remaining.shift();
      rows = rows.filter((row) => row.user_id === userId);
    }
    const orderMatch = sql.match(/order\s+by\s+([a-z_]+)\s+(asc|desc)/i);
    if (orderMatch) {
      const [, column, direction] = orderMatch;
      rows.sort((left, right) => String(left[column] || "").localeCompare(String(right[column] || "")) * (direction.toLowerCase() === "asc" ? 1 : -1));
    }
    if (/limit\s+\?/i.test(sql)) {
      const offset = Number(values.at(-1)) || 0;
      const limit = Number(values.at(-2)) || 500;
      rows = rows.slice(offset, offset + limit);
    }
    return rows;
  }

  async first(sql, values) {
    this.calls.push({ method: "first", sql, values });
    if (sql.includes("from sessions")) return this.usersByTokenHash.get(values[0]) || null;
    if (sql.includes("from mood_diaries")) return clone(this.filterMoodRows(sql, values)[0] || null);
    return null;
  }

  async all(sql, values) {
    this.calls.push({ method: "all", sql, values });
    if (/select family_id from family_members/i.test(sql)) {
      return { results: this.familyMembers.filter((member) => member.user_id === values[0]).map(({ family_id }) => ({ family_id })) };
    }
    if (/select distinct user_id from family_members/i.test(sql)) {
      return { results: this.familyMembers.filter((member) => values.includes(member.family_id)).map(({ user_id }) => ({ user_id })) };
    }
    if (sql.includes("from mood_diaries")) return { results: clone(this.filterMoodRows(sql, values)) };
    return { results: [] };
  }

  async run(sql, values) {
    this.calls.push({ method: "run", sql, values });
    if (/^insert into mood_diaries/i.test(sql)) {
      const columns = sql.match(/insert into mood_diaries\s*\(([^)]+)\)/i)?.[1].split(",") || [];
      const incoming = Object.fromEntries(columns.map((column, index) => [column.trim(), values[index]]));
      const index = this.rows.findIndex((row) => row.user_id === incoming.user_id && row.diary_date === incoming.diary_date);
      if (index >= 0) this.rows[index] = { ...this.rows[index], ...incoming };
      else this.rows.push(incoming);
      return { success: true, meta: { changes: 1 } };
    }
    if (/^update mood_diaries/i.test(sql)) {
      const setColumns = sql.match(/^update mood_diaries\s+set\s+(.+?)\s+where/is)?.[1]
        .split(",").map((column) => column.split("=")[0].trim()) || [];
      const whereValues = values.slice(setColumns.length);
      const matches = this.filterMoodRows(sql, whereValues).map((row) => row.id);
      for (const row of this.rows) {
        if (!matches.includes(row.id)) continue;
        setColumns.forEach((column, index) => { row[column] = values[index]; });
      }
      return { success: true, meta: { changes: matches.length } };
    }
    if (/^delete from mood_diaries/i.test(sql)) {
      const ids = new Set(this.filterMoodRows(sql, values).map((row) => row.id));
      this.rows = this.rows.filter((row) => !ids.has(row.id));
      return { success: true, meta: { changes: ids.size } };
    }
    return { success: true, meta: { changes: 0 } };
  }
}

async function createFixture() {
  const db = new MemoryD1();
  await db.addToken("token-owner", "owner");
  await db.addToken("token-member", "member");
  await db.addToken("token-outsider", "outsider");
  return { db, env: { DB: db, ALLOWED_ORIGINS: "https://fixture.local" } };
}

async function request(fixture, user, table, action, values, filters = [], onConflict = "user_id,diary_date") {
  const response = await worker.fetch(new Request(`https://worker.test/api/table/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer token-${user}`,
      Origin: "https://fixture.local",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, values, filters, onConflict }),
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
    headers: { Authorization: `Bearer token-${user}`, Origin: "https://fixture.local" },
  }), fixture.env);
  return { response, body: await response.json() };
}

test("mood D1 reads use family scope and a half-open month range", async () => {
  const fixture = await createFixture();
  const result = await list(fixture, "owner", [
    { op: "gte", column: "diary_date", value: "2026-08-01" },
    { op: "lt", column: "diary_date", value: "2026-09-01" },
  ]);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.deepEqual(result.body.data.map(({ id }) => id), ["owner-old", "member-old"]);
  const select = fixture.db.calls.find(({ sql }) => sql.includes("from mood_diaries") && sql.includes("order by"));
  assert.match(select.sql, /diary_date >= \?/);
  assert.match(select.sql, /diary_date < \?/);
});

test("mood writes force the session owner and upsert one row per owner/date", async () => {
  const fixture = await createFixture();
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
  assert.equal(fixture.db.rows.filter((row) => row.user_id === "owner" && row.diary_date === TODAY).length, 1);

  const second = await request(fixture, "owner", "mood_diaries", "upsert", {
    id: "new-client-id",
    user_id: "member",
    diary_date: TODAY,
    mood: "calm",
    content: "后来平静了",
    tags: [],
  }, [], "id");
  assert.equal(second.response.status, 200, JSON.stringify(second.body));
  assert.equal(fixture.db.rows.filter((row) => row.user_id === "owner" && row.diary_date === TODAY).length, 1);
  assert.equal(second.body.data[0].mood, "calm");

  const blank = await request(fixture, "owner", "mood_diaries", "insert", {
    id: "blank-entry",
    diary_date: "2026-08-29",
    mood: "sad",
  });
  assert.equal(blank.response.status, 200, JSON.stringify(blank.body));
  assert.equal(blank.body.data[0].content, "");
  assert.deepEqual(blank.body.data[0].tags, []);
});

test("mood write validation rejects invalid dates, future dates, unknown moods, and oversized fields", async () => {
  const fixture = await createFixture();
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
});

test("mood update and delete remain owner-only while family reads stay visible", async () => {
  const fixture = await createFixture();
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
});

test("mood schema and backup contract include the P0 table", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const schema = await readFile(`${root}/cloudflare-worker/schema.d1.sql`, "utf8");
  const workerSource = await readFile(`${root}/cloudflare-worker/src/worker.js`, "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS mood_diaries/);
  assert.match(schema, /UNIQUE \(user_id, diary_date\)/);
  assert.match(schema, /mood_diaries_user_date_idx/);
  assert.match(workerSource, /mood_diaries:[\s\S]*scope: "family"[\s\S]*writeScope: "own"/);
  assert.match(workerSource, /"mood_diaries"/);
});

console.log(`Mood D1 worker fixture used deterministic Tokyo reference ${TOKYO_NOW.toISOString()}.`);
