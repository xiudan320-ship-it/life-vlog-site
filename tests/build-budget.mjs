import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import assert from "node:assert/strict";

const dist = join(process.cwd(), "dist");
const files = await readdir(join(dist, "assets"));
const indexHtml = await readFile(join(dist, "index.html"), "utf8");
const sw = await readFile(join(dist, "sw.js"), "utf8");
const js = files.find((name) => /^index-[^/]+\.js$/.test(name));
const css = files.find((name) => /^index-[^/]+\.css$/.test(name));
assert.ok(js, "missing hashed entry JS");
assert.ok(css, "missing hashed entry CSS");
assert.ok(!indexHtml.includes("?v="), "manual query version remains in built HTML");
assert.ok(!sw.includes("CORE_ASSETS"), "legacy service worker asset list remains");
const precacheCall = sw.match(/\bEe\((\[[\s\S]*?\])\)/);
assert.ok(precacheCall, "final Workbox precache call is missing");
let precacheEntries;
try {
  precacheEntries = JSON.parse(precacheCall[1]);
} catch (error) {
  assert.fail(`final Workbox precache manifest is not valid JSON: ${error.message}`);
}
assert.ok(Array.isArray(precacheEntries), "final Workbox precache manifest is not an array");
const precacheUrls = precacheEntries.map((entry) => entry?.url).filter(Boolean);
assert.ok(!precacheUrls.some((url) => /-route-[^/]+\.(?:js|css)$/.test(url)), `route chunks were included in the precache manifest: ${precacheUrls.join(", ")}`);
for (const feature of ["photo-editor-controller", "mobile-diary-controller", "photo-viewer-controller"]) {
  assert.ok(files.some((name) => name.startsWith(`${feature}-`) && name.endsWith(".js")), `dynamic feature chunk ${feature} is missing`);
  assert.ok(!precacheUrls.some((url) => url.includes(`/${feature}-`) && url.endsWith(".js")), `dynamic feature chunk ${feature} was included in the precache manifest`);
}
const jsGzip = gzipSync(await readFile(join(dist, "assets", js))).byteLength;
const cssGzip = gzipSync(await readFile(join(dist, "assets", css))).byteLength;
const htmlBytes = Buffer.byteLength(indexHtml);
const cssBytes = (await stat(join(dist, "assets", css))).size;
assert.ok(htmlBytes <= 55 * 1024, `initial HTML ${htmlBytes} exceeds 55 KiB`);
assert.ok(jsGzip <= 120 * 1024, `entry JS gzip ${jsGzip} exceeds 120 KiB`);
assert.ok(cssBytes <= 170 * 1024, `core CSS ${cssBytes} exceeds 170 KiB`);
assert.ok(cssGzip <= 32 * 1024, `core CSS gzip ${cssGzip} exceeds 32 KiB`);
const generated = await readdir(join(dist, "assets", "generated"));
assert.ok(generated.includes("maskable-512.png"), "maskable icon missing from dist");
assert.ok(generated.includes("app-icon-512.png"), "PWA icon missing from dist");
assert.ok((await stat(join(dist, "_headers"))).isFile(), "_headers missing from dist");
assert.ok(!precacheUrls.some((url) => url.includes("assets-source")), "source asset directory leaked into the precache manifest");
console.log(JSON.stringify({ htmlBytes, entryJs: js, entryJsGzip: jsGzip, entryCss: css, entryCssBytes: cssBytes, entryCssGzip: cssGzip, precacheEntries: precacheUrls.length, generatedAssets: generated.length }, null, 2));
