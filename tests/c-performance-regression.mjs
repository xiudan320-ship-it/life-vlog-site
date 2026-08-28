import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createCloudflareApiFixture, cloudflareFixtureWorkerUrl } from "./fixtures/cloudflare-api-fixture.mjs";

const sourceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = join(sourceRoot, "dist");
assert.ok(existsSync(join(distRoot, "index.html")), "C performance regression requires a built dist directory");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = createServer((request, response) => {
  const rawPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const filePath = normalize(join(distRoot, relativePath));
  const safeRelative = relative(distRoot, filePath);
  if (
    safeRelative.startsWith("..") ||
    isAbsolute(safeRelative) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const pseudoSession = {
  access_token: "fixture-token",
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  user: { id: "fixture-user", user_metadata: { username: "fixture-user" } },
};

function scriptUrls(page) {
  return page.__cScriptUrls || [];
}

async function openFixturePage({ viewport, authenticated = true, path = "/", fixtureOptions = {} } = {}) {
  const browserContext = await browser.newContext({ viewport, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture(fixtureOptions);
  await fixture.install(browserContext);
  const page = await browserContext.newPage();
  const errors = [];
  const scripts = [];
  page.__cScriptUrls = scripts;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  if (authenticated) {
    await page.addInitScript((session) => {
      localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(session));
    }, pseudoSession);
  }
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  if (path === "/") {
    await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  }
  return { browserContext, page, fixture, errors };
}

async function closeFixturePage(result) {
  await result.browserContext.close();
}

async function testAnonymousColdRequestBudget(browser) {
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture();
  await fixture.install(browserContext);
  const page = await browserContext.newPage();
  const requests = new Set();
  const scripts = [];
  const errors = [];
  page.on("request", (request) => {
    requests.add(request.url());
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  await page.waitForTimeout(250);
  assert.ok(requests.size <= 40, `anonymous cold load made ${requests.size} unique requests`);
  assert.equal(errors.length, 0, `anonymous cold load page errors: ${errors.join(" | ")}`);
  assert.equal(
    scripts.some((url) => /(?:recipes|weekend|wishlist|wardrobe|secret|settings)-route-/.test(url)),
    false,
    `anonymous cold load requested non-gallery route chunks: ${scripts.join("\n")}`
  );
  await browserContext.close();
}

async function testDesktopViewerLazyBoundary(browser) {
  const result = await openFixturePage({ viewport: { width: 1440, height: 900 } });
  try {
    const before = new Set(scriptUrls(result.page));
    await result.page.locator('[data-photo-id="fixture-photo"] .photo-media button').first().click();
    await result.page.waitForSelector("#photoDialog[open]", { state: "attached", timeout: 10000 });
    const loaded = scriptUrls(result.page).filter((url) => !before.has(url));
    assert.equal(loaded.filter((url) => /photo-viewer-controller-/.test(url)).length, 1, "desktop viewer chunk did not load exactly once");
    assert.equal(loaded.filter((url) => /media-gesture-domain-/.test(url)).length, 1, "desktop viewer gesture chunk did not load exactly once");
    assert.equal(loaded.filter((url) => /mobile-diary-controller-/.test(url)).length, 0, "desktop viewer loaded the mobile diary controller");
    assert.equal(loaded.filter((url) => /photo-editor-controller-/.test(url)).length, 0, "desktop viewer loaded the photo editor controller");
    assert.deepEqual(result.errors, [], `desktop viewer page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testMobileDiaryLazyBoundary(browser) {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const before = new Set(scriptUrls(result.page));
    await result.page.locator('[data-photo-id="fixture-photo"] .photo-media button').first().click();
    await result.page.waitForSelector("body.mobile-diary-page-open", { state: "attached", timeout: 10000 });
    const afterDiary = scriptUrls(result.page).filter((url) => !before.has(url));
    assert.equal(afterDiary.filter((url) => /mobile-diary-controller-/.test(url)).length, 1, "mobile diary chunk did not load exactly once");
    assert.equal(afterDiary.filter((url) => /photo-viewer-controller-/.test(url)).length, 0, "mobile diary loaded the viewer before image interaction");
    assert.equal(afterDiary.filter((url) => /photo-editor-controller-/.test(url)).length, 0, "mobile diary loaded the editor before edit interaction");
    await result.page.locator(".mobile-diary-image-button").click();
    await result.page.waitForSelector("#photoDialog[open]", { state: "attached", timeout: 10000 });
    const loaded = scriptUrls(result.page).filter((url) => !before.has(url));
    assert.equal(loaded.filter((url) => /mobile-diary-controller-/.test(url)).length, 1, "mobile diary controller loaded more than once");
    assert.equal(loaded.filter((url) => /photo-viewer-controller-/.test(url)).length, 1, "mobile viewer chunk did not load exactly once");
    assert.equal(loaded.filter((url) => /media-gesture-domain-/.test(url)).length, 1, "mobile viewer gesture chunk did not load exactly once");
    assert.equal(loaded.filter((url) => /photo-editor-controller-/.test(url)).length, 0, "mobile viewer loaded the photo editor controller");
    assert.deepEqual(result.errors, [], `mobile diary page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testSecretSyncDoesNotDependOnRouteController(browser) {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const reads = result.fixture.requests.filter(({ method, path }) => method === "GET" && ["/api/table/secret_items", "/api/table/secret_folders"].includes(path));
      if (reads.length >= 2) break;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
    }
    const secretReads = result.fixture.requests.filter(({ method, path }) => method === "GET" && ["/api/table/secret_items", "/api/table/secret_folders"].includes(path));
    assert.equal(secretReads.length, 2, `gallery sync did not read both secret tables: ${JSON.stringify(secretReads)}`);
    assert.equal(scriptUrls(result.page).some((url) => /secret-route-/.test(url)), false, "gallery sync loaded the secret UI route chunk");
    await result.page.waitForFunction(
      () => !document.querySelector("#globalStatus")?.textContent.includes("缺少：秘藏"),
      null,
      { timeout: 10000 },
    );
    assert.equal((await result.page.locator("#globalStatus").textContent()).includes("秘藏"), false, "gallery reported a secret schema warning after successful reads");
    assert.deepEqual(result.errors, [], `gallery secret sync page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testOrdinaryVideoLifecycle(browser) {
  const desktop = await openFixturePage({ viewport: { width: 1440, height: 900 } });
  try {
    const page = desktop.page;
    const card = page.locator('[data-photo-id="fixture-camera-talent-video"]');
    await card.waitFor({ state: "visible" });
    await card.locator(".photo-media button").click();
    await page.waitForSelector("#photoDialog[open]", { state: "attached" });
    const desktopVideo = page.locator("#dialogVideo");
    assert.deepEqual(await desktopVideo.evaluate((video) => ({
      autoplay: video.autoplay,
      muted: video.muted,
      loop: video.loop,
      controls: video.controls,
      paused: video.paused,
    })), { autoplay: false, muted: false, loop: false, controls: true, paused: true });
    await page.evaluate(() => document.querySelector("#dialogVideo")?.dispatchEvent(new Event("canplay")));
    await page.waitForFunction(() => document.querySelector("#dialogVideoStatus")?.hidden === true);
    assert.equal(desktop.errors.length, 0, `desktop video page errors: ${desktop.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(desktop);
  }

  const mobile = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const page = mobile.page;
    const card = page.locator('[data-photo-id="fixture-camera-talent-video"]');
    await card.locator(".photo-media button").click();
    await page.waitForSelector("body.mobile-diary-page-open");
    const video = page.locator(".mobile-diary-video");
    assert.deepEqual(await video.evaluate((element) => ({
      autoplay: element.autoplay,
      muted: element.muted,
      controls: element.controls,
    })), { autoplay: false, muted: false, controls: true });
    assert.equal(await page.locator("[data-mobile-diary-video-status]").isHidden(), false);
    await page.evaluate(() => document.querySelector(".mobile-diary-video")?.dispatchEvent(new Event("canplay")));
    await page.waitForFunction(() => document.querySelector("[data-mobile-diary-video-status]")?.hidden === true);
    await page.click("[data-mobile-diary-close]");
    await page.waitForFunction(() => {
      const element = document.querySelector(".mobile-diary-video");
      return !element?.getAttribute("src") && element?.paused && element?.networkState === HTMLMediaElement.NETWORK_EMPTY;
    }, null, { timeout: 1000 });
    assert.deepEqual(await video.evaluate((element) => ({ src: element.getAttribute("src"), paused: element.paused, networkState: element.networkState })), { src: null, paused: true, networkState: 0 }, "mobile diary did not release the previous video on close");
    assert.equal(mobile.errors.length, 0, `mobile video page errors: ${mobile.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(mobile);
  }

  const failed = await openFixturePage({
    viewport: { width: 390, height: 844 },
    fixtureOptions: { scenario: "video-error" },
  });
  try {
    const page = failed.page;
    await page.locator('[data-photo-id="fixture-camera-talent-video"] .photo-media button').click();
    await page.waitForSelector("body.mobile-diary-page-open");
    await page.waitForFunction(() => document.querySelector("[data-mobile-diary-video-status]")?.dataset.state === "error", null, { timeout: 10000 });
    assert.equal(await page.locator("[data-mobile-diary-video-status] [data-media-retry]").isHidden(), false);
    assert.equal(failed.errors.length, 0, `failed video page errors: ${failed.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(failed);
  }
}

async function testRapidNavigationLatestWins(browser) {
  const browserContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture();
  await fixture.install(browserContext);
  await browserContext.route("**/assets/*route-*.js", async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
    await route.continue();
  });
  const page = await browserContext.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  await page.evaluate(() => {
    window.__rapidNavigationRejections = [];
    window.addEventListener("unhandledrejection", (event) => {
      window.__rapidNavigationRejections.push(String(event.reason?.message || event.reason || "unknown"));
    });
  });
  const beforeHistory = await page.evaluate(() => history.length);
  await page.evaluate((length) => { window.__rapidHistoryStart = length; }, beforeHistory);
  const sequences = [
    ["galleryNav", "vlogNav", "weekendNav"],
    ["weekendNav", "galleryNav", "vlogNav", "wishlistNav", "weekendNav"],
  ];
  for (let round = 0; round < 30; round += 1) {
    const sequence = sequences[round % sequences.length];
    await page.evaluate((ids) => {
      ids.forEach((id) => document.getElementById(id)?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    }, sequence);
  }
  await page.waitForSelector("#weekendPage:not([hidden])", { state: "attached", timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector("main")?.hasAttribute("aria-busy") && !document.querySelector("main")?.hasAttribute("data-route-busy"));
  await page.waitForFunction(() => document.querySelectorAll('[aria-current="page"]').length <= 1);
  const result = await page.evaluate(() => ({
    href: location.href,
    current: document.querySelector('[aria-current="page"]')?.id || "",
    historyDelta: history.length - window.__rapidHistoryStart,
    busy: document.querySelector("main")?.hasAttribute("aria-busy") || document.querySelector("main")?.hasAttribute("data-route-busy"),
    rejections: window.__rapidNavigationRejections,
  }));
  // The previous gallery state is the only history entry that should remain
  // behind the final intent; delayed obsolete route loads cannot push entries.
  assert.equal(result.href.includes("page=weekend"), true, `latest navigation did not win: ${JSON.stringify(result)}`);
  assert.equal(result.current, "weekendNav");
  assert.equal(result.historyDelta, 1, `obsolete navigation polluted history: ${JSON.stringify(result)}`);
  assert.equal(result.busy, false, `latest navigation left the shell busy: ${JSON.stringify(result)}`);
  assert.deepEqual(result.rejections, [], `rapid navigation rejected: ${JSON.stringify(result.rejections)}`);
  assert.deepEqual(errors, [], `rapid navigation page errors: ${errors.join(" | ")}`);
  await page.goBack();
  await page.waitForFunction(() => document.querySelector("#weekendPage")?.hidden === true && document.querySelector("#gallery")?.hidden === false, null, { timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector("main")?.hasAttribute("aria-busy"));
  await browserContext.close();
}

async function testPhotoEditorLazyBoundary(browser) {
  const result = await openFixturePage({ viewport: { width: 1440, height: 900 } });
  try {
    const before = new Set(scriptUrls(result.page));
    await result.page.locator('[data-photo-id="fixture-photo"] .edit-photo').first().click();
    await result.page.waitForSelector("#editDialog[open]", { state: "attached", timeout: 10000 });
    const loaded = scriptUrls(result.page).filter((url) => !before.has(url));
    assert.equal(loaded.filter((url) => /photo-editor-controller-/.test(url)).length, 1, "photo editor chunk did not load exactly once");
    assert.equal(loaded.filter((url) => /mobile-diary-controller-/.test(url)).length, 0, "photo editor loaded the mobile diary controller");
    assert.equal(loaded.filter((url) => /photo-viewer-controller-/.test(url)).length, 0, "photo editor loaded the viewer controller");
    assert.deepEqual(result.errors, [], `photo editor page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testWeekendComposerAndDelete(browser) {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 }, path: "/?page=weekend" });
  try {
    const page = result.page;
    await page.waitForSelector("#weekendPage:not([hidden])");
    await page.waitForSelector('[data-weekend-id="fixture-weekend"]');
    const initialCount = await page.locator("[data-weekend-id]").count();
    await page.click("#weekendToggle");
    await page.waitForFunction(() => document.querySelector("#weekendForm")?.hidden === false);
    assert.ok(await page.locator("#weekendDateInput").inputValue(), "weekend composer did not initialize a default date");
    await page.fill("#weekendTitleInput", "Fixture new weekend");
    await page.fill("#weekendLocationInput", "横滨");
    await page.fill("#weekendNoteInput", "现场回归");
    await page.click("#weekendSubmitButton");
    await page.waitForFunction(() => document.querySelector("#weekendStatus")?.textContent.includes("周末计划已保存"), null, { timeout: 10000 });
    assert.equal(await page.locator("[data-weekend-id]").count(), initialCount + 1, "saved weekend card did not render immediately");
    assert.equal(await page.locator("#weekendForm").isHidden(), true, "successful weekend save left the form open");
    assert.equal(await page.locator("#weekendToggle").getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#weekendTitleInput").inputValue(), "", "successful weekend save did not reset the form");
    assert.equal(await page.locator("#weekendStatus").getAttribute("role"), "status");
    assert.equal(await page.locator(".list-item-updated").count(), 1, "new weekend card did not receive micro-feedback");
    assert.equal(result.fixture.writes.filter(({ path, action }) => path === "/api/table/weekend_plans" && action === "upsert").length, 1);

    const deleteButton = page.locator('[data-delete-weekend="fixture-weekend"]');
    await deleteButton.click();
    await page.locator('dialog.action-confirm-dialog button[value="cancel"]').click();
    await page.waitForFunction(() => document.activeElement?.matches('[data-delete-weekend="fixture-weekend"]'));
    await deleteButton.click();
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-weekend-id="fixture-weekend"]'));
    assert.equal(await page.locator("#weekendStatus").textContent().then((text) => text.includes("回收站")), true, "weekend delete did not report success");
    const focusAfterDelete = await page.evaluate(() => ({
      card: document.activeElement?.closest("[data-weekend-id]")?.dataset.weekendId || "",
      heading: document.activeElement?.getAttribute("data-page-heading") || "",
    }));
    assert.ok(focusAfterDelete.card || focusAfterDelete.heading === "weekend", `weekend delete did not move focus to a remaining card or heading: ${JSON.stringify(focusAfterDelete)}`);
    assert.equal(result.errors.length, 0, `weekend interaction errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }

  const failed = await openFixturePage({
    viewport: { width: 390, height: 844 },
    path: "/?page=weekend",
    fixtureOptions: { scenario: "weekend-upsert-500" },
  });
  try {
    const page = failed.page;
    await page.waitForSelector("#weekendPage:not([hidden])");
    await page.click("#weekendToggle");
    await page.fill("#weekendTitleInput", "必须保留的输入");
    await page.click("#weekendSubmitButton");
    await page.waitForFunction(() => document.querySelector("#weekendStatus")?.textContent.includes("fixture weekend save failed"), null, { timeout: 10000 });
    assert.equal(await page.locator("#weekendForm").isHidden(), false, "failed weekend save collapsed the composer");
    assert.equal(await page.locator("#weekendTitleInput").inputValue(), "必须保留的输入", "failed weekend save discarded input");
    assert.equal(await page.locator("[data-weekend-id]").count(), 1, "failed weekend save changed the list");
  } finally {
    await closeFixturePage(failed);
  }
}

async function testMobileCommentComposer(browser) {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const page = result.page;
    await page.locator('[data-photo-id="fixture-photo"] .photo-media button').first().click();
    await page.waitForSelector("body.mobile-diary-page-open");
    const input = page.locator("[data-mobile-diary-comment-input]");
    await input.waitFor({ state: "visible" });
    assert.equal(await input.evaluate((element) => element.tagName), "TEXTAREA");
    assert.equal(await input.getAttribute("rows"), "3");
    assert.equal(await input.getAttribute("aria-describedby"), "mobileDiaryCommentStatus");
    await input.fill("第一行");
    await input.press("End");
    await input.press("Enter");
    await input.type("第二行");
    assert.match(await input.inputValue(), /第一行\n第二行/);
    assert.ok(await input.evaluate((element) => element.getBoundingClientRect().height >= 92), "comment textarea did not keep a comfortable mobile height");
    await page.locator('[data-mobile-diary-reply="fixture-comment"]').click();
    assert.equal(await input.inputValue(), "第一行\n第二行", "reply target change discarded the draft");
    await input.press("Control+Enter");
    await page.waitForFunction(() => document.querySelector("[data-mobile-diary-comment-status]")?.textContent.includes("留言已发送"), null, { timeout: 10000 });
    assert.equal(await input.inputValue(), "", "successful reply did not clear the draft");
    assert.equal(result.fixture.writes.filter(({ path, action }) => path === "/api/table/photo_comments" && action === "insert").length, 1, "keyboard reply did not persist");
    assert.equal(await page.locator("[data-mobile-diary-comment-submit]").isDisabled(), false);
    assert.equal(result.errors.length, 0, `mobile comment errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testFixtureSecretCrud(browser) {
  const browserContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture();
  await fixture.install(browserContext);
  const page = await browserContext.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async (workerUrl) => {
    const headers = { Authorization: "Bearer fixture-token", "Content-Type": "application/json" };
    const request = (table, payload) => fetch(`${workerUrl}/api/table/${table}`, { method: "POST", headers, body: JSON.stringify(payload) });
    const folder = { id: "fixture-secret-folder", user_id: "fixture-user", name: "Fixture folder", sort_order: 0 };
    const item = { id: "fixture-secret-item", user_id: "fixture-user", folder_id: folder.id, title: "Fixture secret", images: "[]" };
    const folderWrite = await request("secret_folders", { action: "insert", values: folder });
    const itemWrite = await request("secret_items", { action: "insert", values: item });
    const itemList = await fetch(`${workerUrl}/api/table/secret_items?filters=${encodeURIComponent(JSON.stringify([{ op: "eq", column: "user_id", value: "fixture-user" }]))}`, { headers });
    const itemUpdate = await request("secret_items", { action: "update", filters: [{ op: "eq", column: "id", value: item.id }], values: { title: "Fixture secret updated" } });
    const itemDelete = await request("secret_items", { action: "delete", filters: [{ op: "eq", column: "id", value: item.id }] });
    return {
      status: [folderWrite, itemWrite, itemList, itemUpdate, itemDelete].map((response) => response.status),
      listed: (await itemList.clone().json()).data?.length || 0,
    };
  }, cloudflareFixtureWorkerUrl);
  assert.deepEqual(result.status, [200, 200, 200, 200, 200]);
  assert.equal(result.listed, 1, "fixture secret CRUD did not return the inserted item");
  assert.equal(fixture.writes.filter(({ path }) => path === "/api/table/secret_folders").length, 1);
  assert.equal(fixture.writes.filter(({ path }) => path === "/api/table/secret_items").length, 3);
  await browserContext.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await testAnonymousColdRequestBudget(browser);
  await testDesktopViewerLazyBoundary(browser);
  await testMobileDiaryLazyBoundary(browser);
  await testSecretSyncDoesNotDependOnRouteController(browser);
  await testOrdinaryVideoLifecycle(browser);
  await testRapidNavigationLatestWins(browser);
  await testPhotoEditorLazyBoundary(browser);
  await testWeekendComposerAndDelete(browser);
  await testMobileCommentComposer(browser);
  await testFixtureSecretCrud(browser);
  console.log("C performance and interaction boundaries passed: lazy features, weekend forms, deletion focus, and mobile multiline comments.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
