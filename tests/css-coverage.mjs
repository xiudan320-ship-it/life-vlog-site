import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";

const root = join(process.cwd(), "dist");
const mime = { ".css": "text/css", ".js": "text/javascript", ".html": "text/html", ".png": "image/png", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  const requested = decodeURIComponent((request.url || "/").split("?")[0]);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) { response.writeHead(403); response.end(); return; }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    const fallback = join(root, "index.html");
    response.writeHead(200, { "content-type": "text/html" });
    createReadStream(fallback).pipe(response);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const coverage = [];
try {
  for (const path of ["/", "/?page=recipes", "/?page=wishlist", "/?page=weekend", "/?page=wardrobe", "/?page=thanks", "/?page=secret"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const fixture = createCloudflareApiFixture();
    await fixture.install(context);
    await context.addInitScript(({ session, secretUnlock }) => {
      localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(session));
      if (secretUnlock) sessionStorage.setItem("life-vlog-secret-unlock:fixture-user", JSON.stringify({ unlockedAt: Date.now(), leftAt: 0 }));
    }, {
      session: { access_token: "fixture-token", expires_at: new Date(Date.now() + 3600000).toISOString(), user: { id: "fixture-user", email: "fixture-user@life-vlog.local", user_metadata: { username: "fixture-user" } } },
      secretUnlock: path.includes("page=secret"),
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.coverage.startCSSCoverage();
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const routeName = new URL(`${baseUrl}${path}`).searchParams.get("page") || "gallery";
    const dom = await page.evaluate(() => ({
      url: location.href,
      route: [...document.querySelectorAll("[data-page-heading]")].find((heading) => !heading.closest("[hidden]"))?.dataset.pageHeading || "gallery",
      routeCount: [...document.querySelectorAll("[data-page-heading]")].filter((heading) => !heading.closest("[hidden]" )).length,
      pages: [...document.querySelectorAll("[data-page-heading]")].map((heading) => ({ page: heading.dataset.pageHeading, hidden: Boolean(heading.closest("[hidden]")) })),
      visibleHeading: (() => {
        const heading = [...document.querySelectorAll("[data-page-heading]")].find((item) => !item.closest("[hidden]"));
        const rect = heading?.getBoundingClientRect();
        return Boolean(heading && getComputedStyle(heading).display !== "none" && rect?.width > 0 && rect?.height > 0);
      })(),
      routeRoots: [...document.querySelectorAll("[data-route-root]")].map((element) => element.dataset.routeRoot),
      status: document.querySelector("#globalStatus")?.textContent || "",
      cls: Number(window.__lifeVlogCls || 0),
    }));
    dom.errors = errors;
    coverage.push({ routeName, dom, entries: await page.coverage.stopCSSCoverage() });
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const byFile = new Map();
for (const sample of coverage) {
  for (const entry of sample.entries) {
    if (!entry.url.includes("/assets/")) continue;
    const used = entry.ranges.reduce((total, range) => total + range.end - range.start, 0);
    const current = byFile.get(entry.url) || { url: entry.url, bytes: entry.text.length, usedBytes: 0, samples: 0 };
    current.usedBytes = Math.max(current.usedBytes, used);
    current.samples += 1;
    byFile.set(entry.url, current);
  }
}
const report = [...byFile.values()].map((entry) => ({
  ...entry,
  unusedBytes: entry.bytes - entry.usedBytes,
  usedPercent: Number((entry.usedBytes / Math.max(1, entry.bytes) * 100).toFixed(2)),
}));
assert.ok(report.some((entry) => /index-[^/]+\.css$/.test(entry.url)), "core CSS was not observed by Chromium coverage");
assert.ok(
  coverage.every(({ routeName, dom }) => dom.routeCount === 1 && dom.route === routeName),
  `a route mounted duplicate or unexpected page DOM: ${JSON.stringify(coverage.map(({ routeName, dom }) => ({ routeName, route: dom.route, routeCount: dom.routeCount, pages: dom.pages, status: dom.status, errors: dom.errors })))}`
);
assert.ok(
  coverage.every(({ dom }) => !/^(?:应用启动失败|云同步失败)/.test(dom.status) && dom.errors.length === 0),
  `a route reported a startup or browser error: ${JSON.stringify(coverage.map(({ routeName, dom }) => ({ routeName, status: dom.status, errors: dom.errors })))}`
);
assert.ok(coverage.every(({ dom }) => dom.visibleHeading), "a route heading was visible before its CSS was ready");
const coreCss = report.find((entry) => /index-[^/]+\.css$/.test(entry.url));
assert.ok(coreCss, "core CSS coverage entry is missing");
const coreCssBytes = Buffer.byteLength(coverage.flatMap(({ entries }) => entries).find((entry) => /index-[^/]+\.css$/.test(entry.url))?.text || "");
assert.ok(coreCssBytes <= 170 * 1024, `core CSS ${coreCssBytes} exceeds 170 KiB`);
assert.ok(gzipSync(Buffer.from(coverage.flatMap(({ entries }) => entries).find((entry) => /index-[^/]+\.css$/.test(entry.url))?.text || "")).byteLength <= 32 * 1024, "core CSS gzip exceeds 32 KiB");
const gallerySample = coverage.find(({ routeName }) => routeName === "gallery");
assert.deepEqual(gallerySample?.dom.routeRoots || [], [], "unvisited route templates were mounted on the gallery shell");
console.log(JSON.stringify({
  pages: coverage.map(({ routeName, dom }) => ({ routeName, ...dom })),
  css: report.sort((a, b) => a.url.localeCompare(b.url)),
}, null, 2));
