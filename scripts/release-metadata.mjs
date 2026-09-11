import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readWorkboxManifest } from "./workbox-manifest.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

async function fileHash(path) {
  const contents = await readFile(path);
  return createHash("sha256").update(contents).digest("hex");
}

const html = await readFile(join(dist, "index.html"), "utf8");
const entry = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)?.[1]
  || html.match(/<script[^>]+src=["']([^"']+)["'][^>]+type=["']module["']/i)?.[1];
if (!entry) throw new Error("dist/index.html has no module entry");
const stylesheet = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/i)?.[1]
  || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/i)?.[1];
const swPath = join(dist, "sw.js");
const workboxEntries = await readWorkboxManifest(swPath);

const result = {
  entry: basename(entry),
  entrySha256: await fileHash(join(dist, entry.replace(/^\//, ""))),
  stylesheet: stylesheet ? basename(stylesheet) : null,
  stylesheetSha256: stylesheet ? await fileHash(join(dist, stylesheet.replace(/^\//, ""))) : null,
  sw: "sw.js",
  swSha256: await fileHash(swPath),
  workboxPrecacheEntries: workboxEntries.length,
  workboxPrecacheUrls: workboxEntries.map(({ url }) => url),
};
console.log(JSON.stringify(result));
