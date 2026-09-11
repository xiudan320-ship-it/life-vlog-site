import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import assert from "node:assert/strict";
import { readWorkboxManifest } from "../scripts/workbox-manifest.mjs";

const dist = join(process.cwd(), "dist");
const files = await readdir(join(dist, "assets"));
const indexHtml = await readFile(join(dist, "index.html"), "utf8");
const precacheEntries = await readWorkboxManifest(join(dist, "sw.js"));
const js = files.find((name) => /^index-[^/]+\.js$/.test(name));
const css = files.find((name) => /^index-[^/]+\.css$/.test(name));
assert.ok(js, "missing hashed entry JS");
assert.ok(css, "missing hashed entry CSS");
assert.ok(!indexHtml.includes("?v="), "manual query version remains in built HTML");
const precacheUrls = precacheEntries.map(({ url }) => url);
for (const url of precacheUrls) {
  const relativeUrl = url.replace(/^\/+/, "").split(/[?#]/, 1)[0];
  assert.ok(relativeUrl && await stat(join(dist, relativeUrl)).then(() => true, () => false), `precache resource is missing from dist: ${url}`);
}
assert.ok(!precacheUrls.some((url) => /-route-[^/]+\.(?:js|css)$/.test(url)), `route chunks were included in the precache manifest: ${precacheUrls.join(", ")}`);
const nonCoreChunkPrefixes = [
  "content-form-event-bindings-",
  "controller-options-",
  "diary-feed-motion-coordinator-",
  "gamification-",
  "media-gesture-domain-",
  "mood-entry-overlay-controller-",
  "photo-editor-controller-",
  "mobile-diary-controller-",
  "photo-viewer-controller-",
  "settings-event-bindings-",
  "virtual_pwa-register-",
  "web-vitals-",
  "workbox-window",
];
for (const prefix of nonCoreChunkPrefixes) {
  assert.ok(
    !precacheUrls.some((url) => url.includes(`/assets/${prefix}`)),
    `non-core chunk ${prefix} was included in the precache manifest`
  );
}
const todayMoodChunk = files.find((name) => name.startsWith("today-mood-") && name.endsWith(".js"));
assert.ok(todayMoodChunk, "home mood chunk is missing");
assert.ok(precacheUrls.includes(`assets/${todayMoodChunk}`), "home mood chunk missing from precache");
for (const feature of ["photo-editor-controller", "mobile-diary-controller", "photo-viewer-controller"]) {
  assert.ok(files.some((name) => name.startsWith(`${feature}-`) && name.endsWith(".js")), `dynamic feature chunk ${feature} is missing`);
  assert.ok(!precacheUrls.some((url) => url.includes(`/${feature}-`) && url.endsWith(".js")), `dynamic feature chunk ${feature} was included in the precache manifest`);
}
const jsGzip = gzipSync(await readFile(join(dist, "assets", js))).byteLength;
const cssGzip = gzipSync(await readFile(join(dist, "assets", css))).byteLength;
const htmlBytes = Buffer.byteLength(indexHtml);
const cssBytes = (await stat(join(dist, "assets", css))).size;
assert.ok(htmlBytes <= 55 * 1024, `initial HTML ${htmlBytes} exceeds 55 KiB`);
assert.ok(jsGzip <= 121 * 1024, `entry JS gzip ${jsGzip} exceeds 121 KiB`);
// Includes the former always-loaded gallery CSS, now in the cached entry.
assert.ok(cssBytes <= 256 * 1024, `shell plus gallery CSS ${cssBytes} exceeds 256 KiB`);
assert.ok(cssGzip <= 46 * 1024, `shell plus gallery CSS gzip ${cssGzip} exceeds 46 KiB`);
assert.ok(!files.some(name => /^gallery-route-/.test(name)), "home route must not require a late chunk");
assert.ok(precacheUrls.includes(`assets/${css}`), "home styles missing from precache");
assert.ok((await readFile(join(dist, "assets", css), "utf8")).includes(".mobile-diary-more-sheet"), "gallery styles missing from shell");
const generated = await readdir(join(dist, "assets", "generated"));
assert.ok(generated.includes("maskable-512.png"), "maskable icon missing from dist");
assert.ok(generated.includes("app-icon-512.png"), "PWA icon missing from dist");
const toolIconFiles = ["today-food.svg", "recipe.svg", "time-album.svg", "random-memory.svg", "weekly-review.svg", "secret-vault.svg", "message.svg"];
for (const toolIconFile of toolIconFiles) {
  assert.ok(await stat(join(dist, "assets", "tool-icons", toolIconFile)).then(() => true, () => false), `${toolIconFile} missing from dist`);
  assert.ok(precacheUrls.some((url) => url.replace(/^\/+/, "") === `assets/tool-icons/${toolIconFile}`), `${toolIconFile} missing from Workbox precache`);
}
assert.ok((await stat(join(dist, "_headers"))).isFile(), "_headers missing from dist");
assert.ok(!precacheUrls.some((url) => url.includes("assets-source")), "source asset directory leaked into the precache manifest");
console.log(JSON.stringify({ htmlBytes, entryJs: js, entryJsGzip: jsGzip, entryCss: css, entryCssBytes: cssBytes, entryCssGzip: cssGzip, precacheEntries: precacheUrls.length, homeMoodChunk: todayMoodChunk, generatedAssets: generated.length, toolIconAssets: toolIconFiles.length }, null, 2));
