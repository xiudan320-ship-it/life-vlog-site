import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare-worker/src/worker.js";
import { createCloudflareBackend } from "../modules/cloudflare-client.js";
import { createDiaryRepository, createSecretRepository } from "../modules/data-repositories.js";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";
import { secretFromCloudRow, secretToCloudRow } from "../modules/cloud-models.js";
import { sortSecretDisplayEntries } from "../modules/secret-filter-domain.js";

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

test("secret upload checkpoints upsert one owned album across retries and 500 images", async () => {
  const fixture = createWorkerFixture();
  try {
    const { database } = createRepository(fixture, "owner");
    const repository = createSecretRepository({ getDatabase: () => database, getSession: () => ({ user: { id: "owner" } }) });
    const record = { id: "fixture-secret-batch", user_id: "owner", title: "Batch fixture", images: [] };
    for (const count of [10, 10, 500]) {
      record.images = Array.from({ length: count }, (_, index) => ({ image_url: `https://cdn.fixture/${index}.jpg`, image_path: `r2:owner/secrets/${index}.jpg` }));
      const result = await repository.saveItem(record);
      assert.equal(result.error, null, JSON.stringify(result));
    }
    const { data, error } = await repository.listItems();
    assert.equal(error, null);
    assert.equal(data.length, 1);
    assert.equal(data[0].images.length, 500);
  } finally { fixture.close(); }
});

test("secret sort mode and manual order persist through the client, Worker and D1", async () => {
  const fixture = createWorkerFixture();
  try {
    const { database } = createRepository(fixture, "owner");
    const repository = createSecretRepository({ getDatabase: () => database, getSession: () => ({ user: { id: "owner" } }) });
    const images = [
      { image_url: "https://cdn.fixture/two.jpg", tags: ["2"], uploadedAt: "2030-01-01" },
      { image_url: "https://cdn.fixture/one.jpg", tags: ["1"], uploadedAt: "2030-01-02" },
    ];
    const item = { id: "00000000-0000-4000-8000-000000000011", title: "排序", images, photoSortMode: "manual" };
    assert.equal((await repository.saveItem(secretToCloudRow(item, "owner"))).error, null);
    for (const [mode, expected] of [["manual", [0, 1]], ["number", [1, 0]], ["time", [1, 0]]]) {
      assert.equal((await repository.updateOwnedItem(item.id, { photo_sort_mode: mode, photo_sort_descending: 1 })).error, null);
      const { data, error } = await repository.listItems();
      assert.equal(error, null);
      const loaded = secretFromCloudRow(data[0]);
      assert.equal(loaded.photoSortMode, mode);
      assert.deepEqual(sortSecretDisplayEntries(loaded.images.map((image, index) => ({ image, index })), loaded).map(({ index }) => index), expected);
      assert.deepEqual(loaded.images.map(({ image_url }) => image_url), images.map(({ image_url }) => image_url));
    }
  } finally { fixture.close(); }
});

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
