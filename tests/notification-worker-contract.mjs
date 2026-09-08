import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFile(join(root, file), "utf8");
const [worker, schema, wrangler] = await Promise.all([
  read("cloudflare-worker/src/worker.js"),
  read("cloudflare-worker/schema.d1.sql"),
  read("cloudflare-worker/wrangler.toml"),
]);

assert.match(worker, /table === "wishes" \|\| table === "shopping_items"/);
assert.match(worker, /type: table === "wishes" \? "wish" : "shopping"/);
assert.match(worker, /type: "mood_reminder"/);
assert.match(worker, /createDailyMoodReminders\(env, controller\.scheduledTime\)/);
assert.match(worker, /created_at>=\? and created_at<\?/);
assert.match(schema, /'wish', 'shopping', 'mood_reminder'/);
assert.match(wrangler, /"0 9 \* \* \*"/);

console.log("Notification Worker contract tests passed.");
