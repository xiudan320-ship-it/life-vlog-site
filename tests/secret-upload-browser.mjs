import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const template = await readFile(new URL("../modules/routes/templates/secret.html", import.meta.url), "utf8");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://fixture").pathname);
    if (pathname === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/tests/test-redesign.css"><title>秘藏批量上传验收</title></head><body><main style="max-width:1100px;margin:auto;padding:16px">${template}<script type="module" src="/tests/fixtures/secret-upload-browser-fixture.mjs"></script></body></html>`);
      return;
    }
    const path = resolve(root, `.${pathname}`);
    if (!path.startsWith(resolve(root) + sep)) { response.writeHead(403).end(); return; }
    response.setHeader("content-type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const output = resolve(root, "artifacts/secret-upload");
await mkdir(output, { recursive: true });
const consoleErrors = [];

async function ready(page) {
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto(base);
  await page.waitForFunction(() => window.fixture?.ready);
}
const panel = "[data-secret-upload-progress]";
async function idle(page) {
  await page.waitForFunction(() => document.querySelector("#secretForm").getAttribute("aria-busy") === "false", null, { timeout: 30_000 });
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await ready(page);
  await page.fill("#secretTitleInput", "批量验收");
  await page.evaluate(() => { fixture.failName = "photo-47"; fixture.hold = true; fixture.selectFiles("#secretImageInput", 500); });
  assert.equal(await page.evaluate(() => fixture.urls.size), 9, "large selections only create nine preview URLs");
  await page.click("#secretSubmitButton");
  await page.waitForFunction(() => Boolean(fixture.release));
  assert.equal(await page.locator(`${panel} progress`).getAttribute("value"), "0");
  assert.equal(await page.locator(".secret-upload-indicator").evaluate((element) => getComputedStyle(element, "::before").animationName), "secret-upload-spin");
  assert.equal(await page.locator(".secret-upload-scan").evaluate((element) => getComputedStyle(element).animationName), "secret-upload-scan");
  await page.locator(`${panel} progress`).evaluate((element) => { window.progressNode = element; });
  await noOverflow(page);
  await page.locator(panel).screenshot({ path: resolve(output, "desktop-upload-active.png") });
  assert.equal(await page.locator("#secretForm").evaluate((form) => form.inert), true);
  await page.evaluate(() => { document.querySelector("#secretForm").dispatchEvent(new Event("submit", { cancelable: true })); fixture.hold = false; fixture.release(); });
  await idle(page);
  assert.equal(await page.locator(`${panel} [data-secret-upload-retry]`).count(), 1);
  assert.match(await page.locator(panel).textContent(), /499\/500 张已保存/);
  assert.match(await page.locator(panel).textContent(), /fixture-47.svg/);
  assert.match(await page.locator(panel).textContent(), /图片格式无法上传/);
  assert.equal(await page.locator(`${panel} progress`).getAttribute("value"), "499", "failed files never count as saved progress");
  assert.match(await page.locator("[data-secret-upload-percent]").textContent(), /99% 已保存/);
  assert.equal(await page.locator(`${panel} progress`).evaluate((element) => element === window.progressNode), true, "progress DOM survives all file and status updates");
  assert.equal(await page.locator(".secret-upload-indicator").evaluate((element) => getComputedStyle(element, "::before").animationName), "none");
  assert.deepEqual(await page.evaluate(() => ({ count: fixture.rows.size, images: [...fixture.rows.values()][0].images.length, uploads: fixture.uploads.length })), { count: 1, images: 499, uploads: 500 });
  await noOverflow(page);
  await page.locator(`${panel} details`).evaluate((element) => { element.open = true; });
  await page.locator(panel).screenshot({ path: resolve(output, "desktop-partial.png") });
  await page.evaluate(() => { fixture.failName = ""; });
  await page.click("[data-secret-upload-retry]");
  await idle(page);
  assert.match(await page.locator(panel).textContent(), /500 张已保存/);
  assert.equal(await page.evaluate(() => fixture.uploads.length), 501);
  assert.equal(await page.evaluate(() => new Set([...fixture.rows.values()][0].images.map((image) => image.image_path)).size), 500);
  assert.equal(await page.evaluate(() => fixture.urls.size), 0, "preview and compression URLs released after success");
  assert.equal(await page.locator(panel).evaluate((element) => element === document.activeElement), true, "retry preserves focus on the progress region");
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block" });
  await ready(mobile);
  await mobile.evaluate(() => { document.body.classList.add("theme-dark"); fixture.seedAlbum(); fixture.failSave = true; fixture.hold = true; fixture.selectFiles("[data-secret-append-files]", 125, true); });
  await mobile.waitForFunction(() => Boolean(fixture.release));
  assert.equal(await mobile.locator(".secret-upload-indicator").evaluate((element) => getComputedStyle(element, "::before").animationName), "none", "reduced motion disables rotation during uploads");
  assert.equal(await mobile.locator(".secret-upload-scan").evaluate((element) => getComputedStyle(element).display), "none");
  await noOverflow(mobile);
  await mobile.locator(panel).screenshot({ path: resolve(output, "mobile-upload-reduced-motion-dark.png") });
  await mobile.evaluate(() => { fixture.hold = false; fixture.release(); });
  await idle(mobile);
  assert.equal(await mobile.evaluate(() => fixture.uploads.length), 10);
  assert.match(await mobile.locator(panel).textContent(), /10 张等待保存/);
  assert.match(await mobile.locator(panel).textContent(), /相册保存暂时失败/);
  assert.equal(await mobile.locator("[data-secret-upload-clear]").isVisible(), false, "unsaved assets cannot be silently discarded");
  await noOverflow(mobile);
  await mobile.locator(panel).screenshot({ path: resolve(output, "mobile-save-error-dark.png") });
  await mobile.evaluate(() => { fixture.failSave = false; });
  await mobile.click("[data-secret-upload-retry]");
  await idle(mobile);
  assert.equal(await mobile.evaluate(() => fixture.uploads.length), 125);
  assert.equal(await mobile.evaluate(() => fixture.rows.get("fixture-existing").images.length), 126);
  assert.match(await mobile.locator(panel).textContent(), /125 张已保存/);
  assert.equal(await mobile.locator("#secretGallery").evaluate((element) => element.inert), false);
  await mobile.click("[data-secret-upload-clear]");
  await mobile.evaluate(() => { fixture.selectFiles("[data-secret-append-files]", 500); });
  assert.match(await mobile.locator("#secretStatus").textContent(), /还可添加 374 张/);
  assert.equal(await mobile.evaluate(() => fixture.uploads.length), 125, "over-limit selections are explicitly rejected before any upload");
  await noOverflow(mobile);
  await mobile.close();

  const mixed = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await ready(mixed);
  await mixed.fill("#secretTitleInput", "mixed-fixture");
  await mixed.evaluate(() => {
    fixture.selectFiles("#secretImageInput", 2);
    fixture.selectFiles("#secretCoverInput", 1);
    document.querySelector("#secretImageLinkInput").value = "https://synthetic.fixture/image.jpg";
    fixture.rateLimit = true;
  });
  await mixed.click("#secretSubmitButton");
  await mixed.waitForFunction(() => Boolean(fixture.retryWait));
  assert.match(await mixed.locator(panel).textContent(), /等待 60 秒后自动继续/);
  assert.equal(await mixed.evaluate(() => fixture.retryDelay), 60_000);
  assert.equal(await mixed.locator(".secret-upload-scan").evaluate((element) => getComputedStyle(element).animationName), "secret-upload-scan", "rate limit waits keep an activity indicator without increasing saved progress");
  await mixed.locator(panel).screenshot({ path: resolve(output, "mobile-rate-limit-wait.png") });
  await mixed.evaluate(() => { fixture.retryWait(); });
  await idle(mixed);
  assert.deepEqual(await mixed.evaluate(() => {
    const row = [...fixture.rows.values()][0];
    return { count: row.images.length, cover: row.cover_path, links: row.images.filter((image) => image.image_path.includes("-link-")).length, extraCoverFlag: row.images.some((image) => "isUploadCover" in image) };
  }), { count: 3, cover: "r2:fixture-user/secrets/mixed-fixture-cover.jpg", links: 1, extraCoverFlag: false });
  await mixed.click("[data-secret-upload-clear]");
  await mixed.click("#secretToggle");
  await mixed.fill("#secretTitleInput", "failure-fixture");
  await mixed.evaluate(() => { fixture.failName = "failure-fixture-1"; fixture.selectFiles("#secretImageInput", 1, true); });
  await mixed.click("#secretSubmitButton");
  await idle(mixed);
  await mixed.locator(`${panel} details`).evaluate((element) => { element.open = true; });
  await noOverflow(mixed);
  await mixed.locator(panel).screenshot({ path: resolve(output, "mobile-file-error-light.png") });
  const keyboardButton = mixed.locator("[data-secret-upload-retry]");
  await keyboardButton.focus();
  await mixed.evaluate(() => { fixture.failName = ""; });
  await keyboardButton.press("Enter");
  await idle(mixed);
  assert.match(await mixed.locator(panel).textContent(), /上传完成/);
  await mixed.close();

  const review = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await ready(review);
  await review.evaluate(() => {
    const titles = ["旅行灵感", "想收藏的房间", "光影练习", "穿搭记录", "海边日落", "展览随记"];
    fixture.state.secretFolders = [{ id: "inspiration", name: "灵感素材" }, { id: "memories", name: "生活记录" }];
    fixture.state.secretItems = titles.map((title, index) => {
      const url = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="hsl(${index * 45 + 20},25%,75%)"/><circle cx="360" cy="280" r="140" fill="hsl(${index * 45 + 20},35%,60%)"/><path d="M0 600L220 400L600 700V800H0" fill="hsl(${index * 45 + 20},25%,45%)"/></svg>`)}`;
      return { id: `review-${index}`, title, folderId: index % 2 ? "inspiration" : "memories", note: "合成图片用于布局评审", coverImage: url, createdAt: "2030-01-01", images: Array.from({ length: 12 }, (_, imageIndex) => ({ image_url: url, thumbnail_url: url, width: 600, height: 800, uploadedAt: `2030-01-${String(imageIndex + 1).padStart(2, "0")}` })) };
    });
    fixture.controller.setSecretExpanded(false);
    fixture.controller.renderSecretGallery();
  });
  await review.screenshot({ path: resolve(output, "layout-review-desktop.png"), fullPage: true });
  await review.setViewportSize({ width: 390, height: 844 });
  await review.screenshot({ path: resolve(output, "layout-review-mobile.png"), fullPage: true });
  await review.locator("[data-secret-index]").first().click();
  await review.screenshot({ path: resolve(output, "album-review-mobile.png"), fullPage: true });
  await review.close();
  assert.deepEqual(consoleErrors, []);
  console.log("Secret browser checks passed: 500-image creation, partial failure/retry, 125-image append, save recovery, persistent progress, activity animation, reduced motion, focus, limits and desktop/mobile layout.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
