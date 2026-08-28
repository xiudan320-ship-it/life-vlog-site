import { stat, readdir } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";

const directory = join(process.cwd(), "assets", "generated");
const files = await readdir(directory);
const bytes = async (name) => (await stat(join(directory, name))).size;
const limits = {
  "home-logo-96.webp": 30 * 1024,
  "home-logo-192.webp": 30 * 1024,
  "weekend-complete-stamp-2x.webp": 100 * 1024,
  "food-wheel-icon-2x.webp": 60 * 1024,
  "anniversary-icon-2x.webp": 60 * 1024,
  "black-cat-cover-1280.webp": 250 * 1024,
  "app-icon-512.png": 250 * 1024,
  "maskable-512.png": 250 * 1024,
};
for (const [name, limit] of Object.entries(limits)) {
  assert.ok(files.includes(name), `missing optimized asset ${name}`);
  assert.ok(await bytes(name) <= limit, `${name} exceeds ${limit} bytes`);
}
assert.ok(files.includes("maskable-512.png"));
console.log("Asset budget passed", Object.fromEntries(await Promise.all(Object.keys(limits).map(async (name) => [name, await bytes(name)]))));
