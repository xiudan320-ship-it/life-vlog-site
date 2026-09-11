import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const schemaPath = fileURLToPath(new URL("../../cloudflare-worker/schema.d1.sql", import.meta.url));

function normalizeValues(values) {
  return values.map((value) => value === undefined ? null : value);
}

function createD1Result(result) {
  const changes = Number(result.changes || 0);
  return {
    success: true,
    meta: {
      changes,
      last_row_id: Number(result.lastInsertRowid || 0),
      rows_read: 0,
      rows_written: changes,
    },
  };
}

export function createMemoryD1({ schema = readFileSync(schemaPath, "utf8") } = {}) {
  const database = new DatabaseSync(":memory:");
  database.exec(schema);
  database.exec("PRAGMA foreign_keys = ON");
  let failure = null;

  function maybeFail(method, sql) {
    if (!failure) return;
    const methodMatches = !failure.method || failure.method === method;
    const sqlMatches = !failure.includes || sql.toLowerCase().includes(failure.includes.toLowerCase());
    if (!methodMatches || !sqlMatches) return;
    const error = failure.error;
    failure = null;
    throw error;
  }

  function statementFor(sql, boundValues = []) {
    const values = [...boundValues];
    return {
      bind(...nextValues) {
        return statementFor(sql, nextValues);
      },
      async first() {
        maybeFail("first", sql);
        return database.prepare(sql).get(...normalizeValues(values)) || null;
      },
      async all() {
        maybeFail("all", sql);
        return { results: database.prepare(sql).all(...normalizeValues(values)) };
      },
      async run() {
        maybeFail("run", sql);
        return createD1Result(database.prepare(sql).run(...normalizeValues(values)));
      },
      _sql: sql,
    };
  }

  const d1 = {
    prepare(sql) {
      return statementFor(String(sql));
    },
    async batch(statements) {
      maybeFail("batch", "batch");
      database.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    failNext({ method = "run", includes = "", error = new Error("Injected D1 failure") } = {}) {
      failure = { method, includes, error };
    },
    database,
    close() {
      database.close();
    },
  };
  return d1;
}

export function createWorkerFixture({
  users = ["owner", "member", "outsider"],
  familyId = "fixture-family",
  familyUsers = ["owner", "member"],
  expiresAt = "2099-01-01T00:00:00.000Z",
  origin = "https://fixture.local",
} = {}) {
  const DB = createMemoryD1();
  const tokens = new Map();
  for (const userId of users) {
    const token = `fixture-token-${userId}`;
    tokens.set(userId, token);
    DB.database.prepare(
      "insert into users (id, username, email, password_hash, password_salt) values (?, ?, ?, ?, ?)"
    ).run(userId, userId, `${userId}@fixture.local`, "fixture-password-hash", "fixture-password-salt");
    DB.database.prepare(
      "insert into user_profiles (user_id, username) values (?, ?)"
    ).run(userId, userId);
    DB.database.prepare(
      "insert into sessions (id, user_id, token_hash, expires_at) values (?, ?, ?, ?)"
    ).run(`${userId}-session`, userId, createHash("sha256").update(token).digest("base64url"), expiresAt);
  }
  if (familyUsers.length) {
    DB.database.prepare("insert into families (id, name, owner_id) values (?, ?, ?)").run(familyId, "Fixture family", familyUsers[0]);
    for (const [index, userId] of familyUsers.entries()) {
      DB.database.prepare(
        "insert into family_members (family_id, user_id, role, joined_at) values (?, ?, ?, ?)"
      ).run(familyId, userId, index === 0 ? "owner" : "member", `2026-01-0${index + 1}T00:00:00.000Z`);
    }
  }
  return {
    DB,
    env: { DB, ALLOWED_ORIGINS: origin },
    tokens,
    close: () => DB.close(),
  };
}
