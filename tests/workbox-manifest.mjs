import assert from "node:assert/strict";
import test from "node:test";

import { parseWorkboxPrecacheManifest } from "../scripts/workbox-manifest.mjs";

test("AST Workbox parser ignores variable names, whitespace, and quote style", () => {
  const source = `
    const unrelated = [{ url: "runtime-only.js" }];
    const precacheAndRoute = (entries) => entries;
    precacheAndRoute([
      { "url": 'index.html', "revision": "abc123" },
      { url: "assets/app.js", revision: null, integrity: "sha256-test" }
    ]);
  `;
  assert.deepEqual(parseWorkboxPrecacheManifest(source), [
    { url: "index.html", revision: "abc123" },
    { url: "assets/app.js", revision: null },
  ]);
});

test("AST Workbox parser rejects missing, malformed, and ambiguous manifests", () => {
  assert.throws(() => parseWorkboxPrecacheManifest("self.addEventListener('fetch', () => {});"), /found 0/);
  assert.throws(() => parseWorkboxPrecacheManifest("precacheAndRoute([{ url: 'index.html', revision: 1 }]);"), /found 0/);
  assert.throws(() => parseWorkboxPrecacheManifest("precacheAndRoute([{ url: 'index.html', revision: null }, { url: 'index.html', revision: null }]);"), /duplicate URLs/);
  assert.throws(() => parseWorkboxPrecacheManifest("a([{ url: 'a', revision: null }]); b([{ url: 'b', revision: null }]);"), /found 2/);
});
