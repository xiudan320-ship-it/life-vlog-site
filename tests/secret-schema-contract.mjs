import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TABLE_CONFIG } from "../cloudflare-worker/src/table-config.js";
import { createMemoryD1 } from "./fixtures/memory-d1.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const [schema, fixture] = await Promise.all([
  readFile(join(root, "cloudflare-worker", "schema.d1.sql"), "utf8"),
  readFile(join(root, "tests", "fixtures", "cloudflare-api-fixture.mjs"), "utf8"),
]);

const requiredColumns = {
  user_profiles: ["user_id", "secret_default_folder_id"],
  secret_folders: ["id", "user_id", "name", "sort_order", "created_at", "updated_at"],
  secret_items: [
    "id", "user_id", "folder_id", "title", "category", "note", "cover_image", "cover_path",
    "images", "linked_photo_id", "photo_sort_descending", "is_pinned", "sort_order", "created_at", "updated_at",
  ],
};

for (const [table, columns] of Object.entries(requiredColumns)) {
  const tableBlock = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\);`))?.[1] || "";
  assert.ok(tableBlock, `${table} schema is missing`);
  for (const column of columns) assert.match(tableBlock, new RegExp(`\\b${column}\\b`), `${table}.${column} is missing`);
  assert.match(schema, new RegExp(`CREATE INDEX IF NOT EXISTS ${table === "secret_folders" ? "secret_folders_user_sort_idx" : "secret_items_user_sort_idx"}`));
}

assert.match(schema, /secret_items_user_pinned_sort_idx/);
assert.match(schema, /secret_items_user_created_idx/);
assert.match(schema, /secret_items_user_category_idx/);
assert.match(schema, /secret_items_folder_sort_idx/);
assert.equal(TABLE_CONFIG.secret_items.scope, "own");
assert.equal(TABLE_CONFIG.secret_folders.scope, "own");
assert.equal(TABLE_CONFIG.secret_items.writeScope, "own");
assert.equal(TABLE_CONFIG.secret_folders.writeScope, "own");
assert.match(fixture, /secret_items:\s*\[\]/);
assert.match(fixture, /secret_folders:\s*\[\]/);

const memory = createMemoryD1();
try {
  memory.database.prepare("INSERT INTO users (id, username, password_hash, password_salt) VALUES (?, ?, ?, ?)")
    .run("secret-owner", "secret-owner", "fixture-hash", "fixture-salt");
  memory.database.prepare("INSERT INTO user_profiles (user_id, username) VALUES (?, ?)")
    .run("secret-owner", "secret-owner");
  await memory.prepare("UPDATE user_profiles SET secret_default_folder_id = ? WHERE user_id = ?")
    .bind("folder-1", "secret-owner").run();
  const profile = await memory.prepare("SELECT secret_default_folder_id FROM user_profiles WHERE user_id = ?")
    .bind("secret-owner").first();
  assert.equal(profile.secret_default_folder_id, "folder-1");
} finally {
  memory.close();
}

console.log("Secret D1 schema and deterministic fixture contracts passed.");
