import assert from "node:assert/strict";
import test from "node:test";
import { createSecretDataService } from "../modules/secret-data-service.js";

test("secret data sync reads both tables without a page controller", async () => {
  const calls = [];
  const state = { items: [], folders: [], available: false, syncedAt: 0 };
  const repository = {
    async listItems() {
      calls.push("items");
      return { data: [{ id: "item-1", user_id: "user-1", title: "Secret", images: "[]", created_at: "2030-01-01" }] };
    },
    async listFolders() {
      calls.push("folders");
      return { data: [{ id: "folder-1", user_id: "user-1", name: "Folder", sort_order: 0 }] };
    },
  };
  const service = createSecretDataService({
    repository,
    getDatabase: () => ({}),
    getSession: () => ({ user: { id: "user-1" } }),
    setItems: (value) => { state.items = value; },
    setFolders: (value) => { state.folders = value; },
    setCloudAvailable: (value) => { state.available = value; },
    setLastSyncAt: (value) => { state.syncedAt = value; },
  });

  const [first, second] = await Promise.all([service.load(), service.load()]);
  assert.strictEqual(first, second);
  assert.deepEqual(calls.sort(), ["folders", "items"]);
  assert.equal(state.items[0].id, "item-1");
  assert.equal(state.folders[0].id, "folder-1");
  assert.equal(state.available, true);
  assert.ok(state.syncedAt > 0);
});

test("secret data sync reports schema errors instead of fabricating availability", async () => {
  const state = { available: true };
  const service = createSecretDataService({
    repository: {
      async listItems() { return { error: { code: "42P01", message: "secret_items is missing" } }; },
      async listFolders() { return { data: [] }; },
    },
    getDatabase: () => ({}),
    getSession: () => ({ user: { id: "user-1" } }),
    setCloudAvailable: (value) => { state.available = value; },
  });
  await assert.rejects(service.load, (error) => error?.message === "secret_items is missing");
  assert.equal(state.available, false);
});
