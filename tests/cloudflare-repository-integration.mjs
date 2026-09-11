import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";
import { createCloudflareBackend } from "../modules/cloudflare-client.js";
import { createDiaryRepository } from "../modules/data-repositories.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";

const AUTH_KEY = "fixture-repository-auth";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function createRepository(fixture, userId) {
  const session = {
    access_token: fixture.tokens.get(userId),
    expires_at: "2099-01-01T00:00:00.000Z",
    user: { id: userId, email: `${userId}@fixture.local` },
  };
  const backend = createCloudflareBackend({
    endpoint: "https://worker.test",
    authKey: AUTH_KEY,
    backupDb: "fixture-repository-backup",
    backupStore: "sessions",
    usernameToEmail: (username) => `${username}@fixture.local`,
    getActiveSession: () => session,
    storage: createStorage(),
    indexedDb: null,
    navigatorApi: {},
    fetchApi: (url, options) => worker.fetch(new Request(url, options), fixture.env),
  });
  const database = backend.createClient();
  return {
    database,
    repository: createDiaryRepository({
      getDatabase: () => database,
      getSession: () => session,
    }),
  };
}

function seed(fixture, sql, ...values) {
  fixture.DB.database.prepare(sql).run(...values);
}

test("favorite repository uses the real client-worker-SQLite upsert path", async () => {
  const fixture = createWorkerFixture();
  try {
    seed(
      fixture,
      "insert into photos (id, user_id, title, taken_at) values (?, ?, ?, ?)",
      "photo-member",
      "member",
      "Family photo",
      "2026-08-01T00:00:00.000Z",
    );
    const { repository } = createRepository(fixture, "owner");

    const first = await repository.setFavorite("photo-member", true);
    const second = await repository.setFavorite("photo-member", true);
    assert.equal(first.error, null, JSON.stringify(first));
    assert.equal(second.error, null, JSON.stringify(second));
    assert.equal(
      fixture.DB.database.prepare(
        "select count(*) as total from photo_favorites where user_id=? and photo_id=?",
      ).get("owner", "photo-member").total,
      1,
    );
    assert.equal(
      fixture.DB.database.prepare(
        "select count(*) as total from notifications where user_id=? and type='favorite' and photo_id=?",
      ).get("member", "photo-member").total,
      1,
    );

    seed(
      fixture,
      "insert into photos (id, user_id, title, taken_at) values (?, ?, ?, ?)",
      "photo-concurrent",
      "member",
      "Concurrent family photo",
      "2026-08-02T00:00:00.000Z",
    );
    const originalBatch = fixture.DB.batch.bind(fixture.DB);
    let batchCount = 0;
    let releaseBarrier;
    const barrier = new Promise((resolve) => { releaseBarrier = resolve; });
    let serialized = Promise.resolve();
    fixture.DB.batch = async (statements) => {
      batchCount += 1;
      if (batchCount <= 2) {
        if (batchCount === 2) releaseBarrier();
        await barrier;
      }
      const run = serialized.then(() => originalBatch(statements));
      serialized = run.catch(() => {});
      return run;
    };

    const [concurrentFirst, concurrentSecond] = await Promise.all([
      repository.setFavorite("photo-concurrent", true),
      repository.setFavorite("photo-concurrent", true),
    ]);
    assert.equal(concurrentFirst.error, null, JSON.stringify(concurrentFirst));
    assert.equal(concurrentSecond.error, null, JSON.stringify(concurrentSecond));
    assert.equal(
      fixture.DB.database.prepare(
        "select count(*) as total from photo_favorites where user_id=? and photo_id=?",
      ).get("owner", "photo-concurrent").total,
      1,
    );
    assert.equal(
      fixture.DB.database.prepare(
        "select count(*) as total from notifications where user_id=? and type='favorite' and photo_id=?",
      ).get("member", "photo-concurrent").total,
      1,
    );
  } finally {
    fixture.close();
  }
});
