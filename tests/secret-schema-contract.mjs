import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const [schema, worker, fixture] = await Promise.all([
  readFile(join(root, "cloudflare-worker", "schema.d1.sql"), "utf8"),
  readFile(join(root, "cloudflare-worker", "src", "worker.js"), "utf8"),
  readFile(join(root, "tests", "fixtures", "cloudflare-api-fixture.mjs"), "utf8"),
]);

const requiredColumns = {
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
assert.match(worker, /secret_items:\s*\{[\s\S]*?scope: "own"/);
assert.match(worker, /secret_folders:\s*\{[\s\S]*?scope: "own"/);
assert.match(worker, /"secret_items",\s*"secret_folders"/);
assert.match(fixture, /secret_items:\s*\[\]/);
assert.match(fixture, /secret_folders:\s*\[\]/);

console.log("Secret D1 schema and deterministic fixture contracts passed.");
