import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { createCloudflareApiFixture, cloudflareFixtureWorkerUrl } from "./fixtures/cloudflare-api-fixture.mjs";

const sourceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = existsSync(join(sourceRoot, "dist", "index.html")) ? join(sourceRoot, "dist") : sourceRoot;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = createServer((request, response) => {
  const rawPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const primaryPath = normalize(join(root, relativePath));
  const sourceFallbackPath = normalize(join(sourceRoot, relativePath));
  const filePath = existsSync(primaryPath) && statSync(primaryPath).isFile() ? primaryPath : sourceFallbackPath;
  if (!(filePath.startsWith(root) || filePath.startsWith(sourceRoot)) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

const port = 61235;
await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(port, "127.0.0.1", resolveListen);
});
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

function todayInTokyo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, `${label} horizontal overflow: ${JSON.stringify(dimensions)}`);
}

function todayMoodRows(today, mode) {
  const rows = [];
  if (mode === "both" || mode === "owner") {
    rows.push({ id: "fixture-owner-mood", user_id: "fixture-user", diary_date: today, mood: "happy", content: "今天很好", tags: [] });
  }
  if (mode === "both" || mode === "member") {
    rows.push({ id: "fixture-partner-mood", user_id: "fixture-partner", diary_date: today, mood: "calm", content: "今天很平静", tags: [] });
  }
  return rows;
}

async function installTodayMoodSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify({
      access_token: "fixture-today-mood-token",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      user: { id: "fixture-user", email: "fixture-user@fixture.local", user_metadata: { username: "小秀" } },
    }));
  });
}

async function waitForTodayMoodOverview(page) {
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
  await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "attached", timeout: 30000 });
  await page.waitForSelector("#overview:not([hidden])", { state: "visible", timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelectorAll("#todayMoodGrid .today-mood-seat").length === 2
      && !document.querySelector("#todayMoodStatus")?.textContent.includes("加载"),
    null,
    { timeout: 30000 },
  );
}

async function runTodayMoodState(viewport, mode, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion: "reduce" });
  const fixture = createCloudflareApiFixture({
    seedMoodFamily: true,
    moodDiaries: todayMoodRows(todayInTokyo(), mode),
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture.install(context);
  await installTodayMoodSession(page);
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await waitForTodayMoodOverview(page);
    await page.waitForFunction((expectedMode) => {
      const items = [...document.querySelectorAll("#todayMoodGrid .today-mood-seat")];
      const moods = items.map((item) => item.querySelector(".today-mood-seat-mood")?.textContent || "");
      if (expectedMode === "both") return moods[0] === "开心" && moods[1] === "平静";
      if (expectedMode === "owner") return moods[0] === "开心";
      if (expectedMode === "member") return moods[1] === "平静";
      return items.length === 2 && items.every((item) => item.querySelector(".today-mood-seat-mood")?.textContent === "还没记录");
    }, mode, { timeout: 30000 });
    const seats = await page.locator("#todayMoodGrid .today-mood-seat").evaluateAll((items) => items.map((item) => ({
      userId: item.dataset.todayMoodUser || "",
      tag: item.tagName,
      classes: item.className,
      name: item.querySelector(".today-mood-seat-name")?.textContent || "",
      mood: item.querySelector(".today-mood-seat-mood")?.textContent || "",
      note: item.querySelector(".today-mood-seat-note")?.textContent || "",
      label: item.getAttribute("aria-label") || "",
    })));
    assert.equal(seats.length, 2, `${label} should render two stable seats`);
    assert.deepEqual(seats.map(({ name }) => name), ["小秀", "小咻"]);
    assert.equal(seats[0].classes.includes("is-square"), true, `${label} owner seat must use square asset shape`);
    assert.equal(seats[1].classes.includes("is-circle"), true, `${label} member seat must use circle asset shape`);
    assert.equal(seats[0].label.includes("小秀"), true);
    assert.equal(seats[1].label.includes("小咻"), true);
    assert.equal(seats.filter(({ tag }) => tag === "BUTTON").length, mode === "owner" || mode === "none" ? 1 : 2, `${label} actionable seat count`);
    assert.equal(seats.filter(({ mood }) => mood).length, 2);
    if (mode === "both" || mode === "owner") assert.equal(seats[0].mood, "开心");
    else assert.equal(seats[0].note, "添加心情");
    if (mode === "both" || mode === "member") assert.equal(seats[1].mood, "平静");
    else {
      assert.equal(seats[1].userId, "");
      assert.equal(seats[1].mood, "还没记录");
      assert.equal(seats[1].label, "小咻今天还没有记录心情");
    }
    assert.equal(await page.locator("#overviewPhotos, #overviewRecipes, #overviewWishes, #overviewLevelButton").count(), 0);
    assert.equal(await page.locator(".quick-actions button").count(), 4);
    await assertNoHorizontalOverflow(page, `${label} today overview`);
    if (viewport.width <= 430 || viewport.height <= 480) {
      const metrics = await page.locator("#todayMoodGrid").evaluate((grid) => {
        const seats = [...grid.querySelectorAll(".today-mood-seat")];
        const rects = seats.map((seat) => seat.getBoundingClientRect());
        const media = seats.map((seat) => seat.querySelector(".today-mood-seat-media")?.getBoundingClientRect());
        const actions = seats.filter((seat) => seat.matches("button")).map((seat) => seat.getBoundingClientRect());
        return { topDelta: Math.abs(rects[0].top - rects[1].top), gridHeight: grid.getBoundingClientRect().height, media, actions };
      });
      assert.ok(metrics.topDelta <= 2, `${label} seats must remain on one row`);
      assert.ok(metrics.gridHeight <= 112, `${label} compact grid height`);
      assert.ok(metrics.media.every((rect) => rect.width <= 64 && rect.height <= 64), `${label} mood assets must not exceed 64px`);
      assert.ok(metrics.actions.every((rect) => rect.width >= 44 && rect.height >= 44), `${label} actionable seats need 44px touch targets`);
      await page.evaluate(() => { document.documentElement.style.fontSize = "130%"; });
      const scaledTopDelta = await page.locator("#todayMoodGrid .today-mood-seat").evaluateAll((items) => Math.abs(items[0].getBoundingClientRect().top - items[1].getBoundingClientRect().top));
      assert.ok(scaledTopDelta <= 2, `${label} seats must remain on one row at 130% text`);
      await assertNoHorizontalOverflow(page, `${label} today overview at 130% text`);
    }
    assert.deepEqual(pageErrors, [], `${label} today overview page errors:\n${pageErrors.join("\n")}`);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runTodayMoodOverviewFlow() {
  const today = todayInTokyo();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
  const fixture = createCloudflareApiFixture({
    seedMoodFamily: true,
    moodDiaries: todayMoodRows(today, "both"),
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture.install(context);
  await installTodayMoodSession(page);
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await waitForTodayMoodOverview(page);
    const initialPosition = await page.evaluate(() => {
      const overview = document.querySelector("#overview").getBoundingClientRect();
      const firstDiary = document.querySelector("#gallery .photo-card")?.getBoundingClientRect();
      return { overviewTop: overview.top, firstDiaryTop: firstDiary?.top || 0, scrollY: window.scrollY };
    });
    assert.ok(initialPosition.overviewTop >= -1 && initialPosition.overviewTop < 230, `cold start did not land on overview: ${JSON.stringify(initialPosition)}`);
    assert.ok(initialPosition.firstDiaryTop > initialPosition.overviewTop + 300, `cold start still landed on the first diary: ${JSON.stringify(initialPosition)}`);

    await page.locator("#overviewMoodCalendar").evaluate((element) => element.click());
    await page.waitForSelector("#moodPage:not([hidden])", { state: "visible", timeout: 30000 });
    await page.waitForSelector("#moodCalendarLegend .mood-seat-name", { state: "visible", timeout: 30000 });
    assert.deepEqual(await page.locator("#moodCalendarLegend .mood-seat-name").allTextContents(), ["小秀", "小咻"]);
    assert.equal(await page.locator("#moodCalendarLegend").textContent().then((text) => /家庭成员\s*[12]/u.test(text)), false);

    await page.click('[data-primary-nav-id="gallery"]');
    await page.waitForSelector("#overview:not([hidden])", { state: "visible", timeout: 30000 });
    await page.waitForFunction(() => document.activeElement?.dataset.pageHeading === "gallery", null, { timeout: 30000 });
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "3200px";
      spacer.setAttribute("aria-hidden", "true");
      document.body.append(spacer);
      window.scrollTo({ top: 1500, behavior: "instant" });
    });
    assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 1500);
    await page.locator("#overviewMoodCalendar").evaluate((element) => element.click());
    await page.waitForSelector("#moodPage:not([hidden])", { state: "visible", timeout: 30000 });
    await page.click('[data-primary-nav-id="gallery"]');
    await page.waitForSelector("#overview:not([hidden])", { state: "visible", timeout: 30000 });
    await page.waitForFunction(() => document.activeElement?.dataset.pageHeading === "gallery", null, { timeout: 30000 });
    assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 1500, "returning to gallery did not restore the saved scroll position");

    const detailSeat = page.locator('[data-today-mood-user="fixture-partner"]');
    await detailSeat.scrollIntoViewIfNeeded();
    const beforeDetail = { url: page.url(), scrollY: await page.evaluate(() => window.scrollY) };
    await detailSeat.click();
    await page.waitForSelector("#moodDetailPanel:not([hidden])", { state: "visible", timeout: 30000 });
    assert.equal(await page.locator("#moodPage").isVisible(), false);
    assert.equal(page.url(), beforeDetail.url);
    assert.match(await page.locator("#moodDetailAuthor").textContent(), /小咻/u);
    assert.equal(await page.locator("#moodDetailMood strong").textContent(), "平静");
    assert.equal(await page.locator("#moodDetailActions [data-mood-edit], #moodDetailActions [data-mood-delete]").count(), 0);
    await page.click("#moodOverlayClose");
    await page.waitForSelector("#moodOverlay[hidden]", { state: "attached", timeout: 30000 });
    assert.equal(page.url(), beforeDetail.url);
    await page.waitForFunction((expected) => Math.abs(window.scrollY - expected) <= 2, beforeDetail.scrollY, { timeout: 3000 });
    assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - beforeDetail.scrollY) <= 2);
    await page.waitForFunction(() => document.activeElement?.dataset.todayMoodUser === "fixture-partner", null, { timeout: 3000 });
    assert.equal(await detailSeat.evaluate((element) => document.activeElement === element), true);
    assert.deepEqual(pageErrors, [], `today overview interaction page errors:\n${pageErrors.join("\n")}`);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runTodayMoodQuickAdd() {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block", reducedMotion: "reduce" });
  const fixture = createCloudflareApiFixture({
    seedMoodFamily: true,
    moodDiaries: todayMoodRows(todayInTokyo(), "member"),
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture.install(context);
  await installTodayMoodSession(page);
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await waitForTodayMoodOverview(page);
    const ownerSeat = page.locator('[data-today-mood-user="fixture-user"]');
    assert.equal(await ownerSeat.locator(".today-mood-seat-note").textContent(), "添加心情");
    const initialUrl = page.url();
    await ownerSeat.click();
    await page.waitForSelector("#moodOverlay:not([hidden]) #moodPickerPanel:not([hidden])", { state: "visible", timeout: 30000 });
    assert.equal(await page.locator("#moodPage").isVisible(), false);
    assert.equal(page.url(), initialUrl);
    await page.click('[data-mood="happy"]');
    await page.click("#moodEditorSave");
    await page.waitForSelector("#moodDetailPanel:not([hidden])", { state: "visible", timeout: 30000 });
    await page.click("#moodOverlayClose");
    await page.waitForSelector("#moodOverlay[hidden]", { state: "attached", timeout: 30000 });
    await page.waitForFunction(
      () => document.querySelector('[data-today-mood-user="fixture-user"] .today-mood-seat-mood')?.textContent === "开心",
      null,
      { timeout: 30000 },
    );
    assert.equal(fixture.writes.filter(({ path, action }) => path === "/api/table/mood_diaries" && action === "upsert").length, 1);
    assert.deepEqual(pageErrors, [], `today mood quick add page errors:\n${pageErrors.join("\n")}`);
    await assertNoHorizontalOverflow(page, "today mood quick add");
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runMoodDiaryFlow(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion: "reduce" });
  const fixture = createCloudflareApiFixture();
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture.install(context);
  await page.addInitScript(() => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify({
      access_token: "fixture-token",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      user: { id: "fixture-user", email: "fixture-user@fixture.local", user_metadata: { username: "fixture-user" } },
    }));
  });
  try {
    await page.goto(`${baseUrl}/?page=mood`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
    await page.waitForSelector("#moodPage:not([hidden])", { state: "attached", timeout: 30000 });
    await page.waitForSelector("#moodCalendarGrid [data-mood-date]", { state: "visible", timeout: 30000 });
    assert.equal(await page.locator("#moodDiaryHeading").textContent(), "心情日记");
    assert.equal(await page.locator("#moodNav").count(), 0);
    assert.match(page.url(), /[?&]page=mood(?:&|$)/u);
    await assertNoHorizontalOverflow(page, `${label} initial mood diary`);

    const future = page.locator('#moodCalendarGrid [aria-disabled="true"]').first();
    if (await future.count()) {
      await future.click({ force: true });
      await page.waitForSelector('.mini-toast-text:has-text("还不能记录未来的日记")', { state: "visible", timeout: 3000 });
    }

    const today = todayInTokyo();
    await page.locator(`[data-mood-date="${today}"]`).click();
    await page.waitForSelector("#moodOverlay:not([hidden]) #moodPickerPanel:not([hidden])", { state: "visible" });
    assert.equal(await page.locator("#moodPickerOrbit [data-mood]").count(), 8);
    await page.waitForFunction(() => [...document.querySelectorAll("#moodPickerOrbit [data-mood] img")].every((image) => image.complete));
    const pickerAssets = await page.locator("#moodPickerOrbit [data-mood] img").evaluateAll((images) => images.map((image) => ({
      naturalWidth: image.naturalWidth,
      hidden: image.hidden,
    })));
    assert.equal(pickerAssets.length, 8);
    assert.ok(pickerAssets.every(({ naturalWidth, hidden }) => naturalWidth > 0 && !hidden), `${label} mood picker assets failed to load`);
    assert.equal(await page.locator("#moodPickerOrbit .mood-asset-error:not([hidden])").count(), 0);
    const pickerButtons = await page.locator("#moodPickerOrbit [data-mood]").evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }));
    for (let index = 0; index < pickerButtons.length; index += 1) {
      for (let next = index + 1; next < pickerButtons.length; next += 1) {
        const left = pickerButtons[index];
        const right = pickerButtons[next];
        const overlaps = left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
        assert.equal(overlaps, false, `${label} mood picker buttons overlap`);
      }
    }
    await page.click('[data-mood="calm"]');
    await page.waitForSelector("#moodOverlay:not([hidden]) #moodEditorPanel:not([hidden])", { state: "visible" });
    const labels = await page.locator("#moodEditorForm label").allTextContents();
    assert.deepEqual(labels.map((value) => value.trim()), ["想说的话 （可留空）", "标签 （可选）"]);
    await page.fill("#moodEditorContent", "今天把心情写下来 😊");
    await page.fill("#moodEditorTagInput", "#散步");
    await page.press("#moodEditorTagInput", "Enter");
    await page.click("#moodEditorSave");
    await page.waitForSelector("#moodOverlay:not([hidden]) #moodDetailPanel:not([hidden])", { state: "visible" });
    assert.equal(await page.locator("#moodDetailContent").textContent(), "今天把心情写下来 😊");
    assert.equal(await page.locator("#moodDetailTags").textContent(), "#散步");
    assert.equal(fixture.writes.filter(({ path, action }) => path === "/api/table/mood_diaries" && action === "upsert").length, 1);

    await page.click('[data-mood-edit]');
    await page.waitForSelector("#moodEditorPanel:not([hidden])", { state: "visible" });
    await page.fill("#moodEditorContent", "已经编辑过了");
    await page.click("#moodEditorSave");
    await page.waitForSelector("#moodDetailPanel:not([hidden])", { state: "visible" });
    assert.equal(await page.locator("#moodDetailContent").textContent(), "已经编辑过了");
    assert.equal(fixture.writes.filter(({ path, action }) => path === "/api/table/mood_diaries" && action === "update").length, 1);

    await page.click("#moodOverlayClose");
    await page.waitForSelector("#moodOverlay[hidden]", { state: "attached" });
    await page.click("#moodListOpen");
    await page.waitForSelector("#moodListView:not([hidden])", { state: "visible" });
    await page.waitForSelector("#moodHistoryList .mood-history-item", { state: "visible" });
    assert.equal(await page.locator("#moodHistoryList .mood-history-content").textContent(), "已经编辑过了");
    await page.click('[data-mood-history-id]');
    await page.waitForSelector("#moodDetailPanel:not([hidden])", { state: "visible" });
    await page.click('[data-mood-delete]');
    await page.waitForSelector(".action-confirm-dialog[open]", { state: "visible" });
    await page.click('.action-confirm-dialog button[value="confirm"]');
    await page.waitForSelector("#moodOverlay[hidden]", { state: "attached" });
    assert.equal(await page.locator(`[data-mood-date="${today}"] .mood-calendar-entry`).count(), 0);
    assert.equal(fixture.writes.filter(({ path, action }) => path === "/api/table/mood_diaries" && action === "delete").length, 1);
    await assertNoHorizontalOverflow(page, `${label} final mood diary`);
    assert.deepEqual(pageErrors, [], `${label} mood diary page errors:\n${pageErrors.join("\n")}`);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runGuestMoodDiary() {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture();
  await fixture.install(context);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/?page=mood`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
    await page.waitForSelector("#moodPage:not([hidden])", { state: "attached", timeout: 30000 });
    assert.equal(await page.locator("#moodLoginState").isVisible(), true);
    assert.equal(await page.locator("#moodListOpen").isVisible(), false);
    assert.equal(await page.locator("#moodCalendarView").isVisible(), false);
    assert.equal(fixture.requests.some(({ path }) => path === "/api/table/mood_diaries"), false);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

try {
  await runGuestMoodDiary();
  for (const mode of ["both", "owner", "member", "none"]) {
    await runTodayMoodState({ width: 375, height: 812 }, mode, `mobile-${mode}`);
  }
  for (const [viewport, label] of [
    [{ width: 390, height: 844 }, "mobile-standard"],
    [{ width: 844, height: 390 }, "mobile-landscape"],
    [{ width: 768, height: 900 }, "tablet"],
    [{ width: 1440, height: 900 }, "desktop"],
  ]) {
    await runTodayMoodState(viewport, "both", label);
  }
  await runTodayMoodOverviewFlow();
  await runTodayMoodQuickAdd();
  await runMoodDiaryFlow({ width: 375, height: 812 }, "mobile");
  await runMoodDiaryFlow({ width: 812, height: 375 }, "landscape");
  await runMoodDiaryFlow({ width: 1440, height: 900 }, "desktop");
  console.log(`Mood diary browser checks passed; fixture endpoint ${cloudflareFixtureWorkerUrl}.`);
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
