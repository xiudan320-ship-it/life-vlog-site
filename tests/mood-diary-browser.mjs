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

function shiftMonthKey(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pngDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", "screenshot must be a PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function dateInMonth(monthKey, day) {
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function moodSummaryRows(today) {
  const currentMonth = today.slice(0, 7);
  const previousMonth = shiftMonthKey(currentMonth, -1);
  return [
    { id: "fixture-summary-owner-current", user_id: "fixture-user", diary_date: today, mood: "happy", content: "本月开心", tags: [] },
    { id: "fixture-summary-partner-current", user_id: "fixture-partner", diary_date: today, mood: "calm", content: "本月平静", tags: [] },
    { id: "fixture-summary-owner-01", user_id: "fixture-user", diary_date: dateInMonth(previousMonth, 1), mood: "happy", content: "月初开心", tags: [] },
    { id: "fixture-summary-owner-02", user_id: "fixture-user", diary_date: dateInMonth(previousMonth, 2), mood: "sad", content: "月初低落", tags: [] },
    { id: "fixture-summary-owner-10", user_id: "fixture-user", diary_date: dateInMonth(previousMonth, 10), mood: "excited", content: "月中兴奋", tags: [] },
    { id: "fixture-summary-partner-09", user_id: "fixture-partner", diary_date: dateInMonth(previousMonth, 9), mood: "calm", content: "成员平静", tags: [] },
    { id: "fixture-summary-partner-10", user_id: "fixture-partner", diary_date: dateInMonth(previousMonth, 10), mood: "annoyed", content: "成员烦恼", tags: [] },
  ];
}

function denseMoodSummaryRows(today) {
  const monthKey = today.slice(0, 7);
  return Array.from({ length: daysInMonth(monthKey) }, (_, index) => {
    const day = index + 1;
    const dateKey = dateInMonth(monthKey, day);
    return [
      { id: `fixture-dense-owner-${day}`, user_id: "fixture-user", diary_date: dateKey, mood: day % 2 ? "happy" : "tired", content: "密集测试", tags: [] },
      { id: `fixture-dense-partner-${day}`, user_id: "fixture-partner", diary_date: dateKey, mood: day % 2 ? "calm" : "sad", content: "密集测试", tags: [] },
    ];
  }).flat();
}

function moodReadCount(fixture) {
  return fixture.requests.filter(({ method, path }) => method === "GET" && path === "/api/table/mood_diaries").length;
}

async function waitForMoodReads(fixture, expected, label) {
  const deadline = Date.now() + 5000;
  while (moodReadCount(fixture) < expected && Date.now() < deadline) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  assert.ok(moodReadCount(fixture) >= expected, `${label} did not reread the canonical month after the write`);
}

async function installMoodSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify({
      access_token: "fixture-token",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      user: { id: "fixture-user", email: "fixture-user@fixture.local", user_metadata: { username: "小秀" } },
    }));
  });
}

async function waitForMoodDiaryPage(page) {
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
  await page.waitForSelector("#moodPage:not([hidden])", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#moodCalendarGrid [data-mood-date]", { state: "visible", timeout: 30000 });
}

async function assertMoodCalendarLayout(page, today, viewport, label) {
  const monthKey = today.slice(0, 7);
  const expectedDays = daysInMonth(monthKey);
  const metrics = await page.locator("#moodCalendarGrid").evaluate((grid) => {
    const children = [...grid.children];
    const buttons = [...grid.querySelectorAll("[data-mood-date]")];
    const rects = buttons.map((button) => button.getBoundingClientRect());
    return {
      currentMonthDays: buttons.length,
      weekCount: children.length / 7,
      cellWidth: rects[0]?.width || 0,
      cellHeight: Math.min(...rects.map((rect) => rect.height)),
      gridWidth: grid.getBoundingClientRect().width,
    };
  });
  assert.equal(metrics.currentMonthDays, expectedDays, `${label} calendar must render every day in the month`);
  assert.ok(metrics.weekCount >= 4 && metrics.weekCount <= 6 && Number.isInteger(metrics.weekCount), `${label} calendar must use four to six complete weeks`);
  assert.ok(metrics.cellWidth >= 44, `${label} calendar cells need a 44px touch width: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.cellHeight >= 60, `${label} calendar cells need compact vertical room: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.gridWidth <= viewport.width + 1, `${label} calendar grid exceeds the viewport: ${JSON.stringify(metrics)}`);
}

async function assertMoodMonthSummary(page, today, label) {
  assert.equal(await page.locator("#moodPage .mood-diary-header, #moodDiaryLede, #moodPage .kicker").count(), 0, `${label} retained the removed diary header`);
  assert.equal(await page.locator("#moodMonthSummary").isVisible(), true, `${label} month summary should be visible`);
  assert.equal(await page.locator("#moodListOpen").isVisible(), true, `${label} all-diary action must stay at the bottom of the summary`);
  assert.equal(await page.locator("#moodJarCount").textContent(), "2 条记录");
  assert.equal(await page.locator("#moodJarItems .mood-jar-item").count(), 2);
  const jarGeometry = await page.locator("#moodJarStage").evaluate((stage) => {
    const stageRect = stage.getBoundingClientRect();
    const viewport = stage.querySelector(".mood-jar-viewport");
    const box = (element) => {
      if (!element?.getBBox) return null;
      const value = element.getBBox();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    const screenBox = (element) => {
      const value = element?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, width: value.width, height: value.height } : null;
    };
    return {
      stage: { left: stageRect.left, top: stageRect.top, width: stageRect.width, height: stageRect.height },
      viewportPresent: Boolean(viewport),
      viewportClip: viewport ? getComputedStyle(viewport).clipPath : "",
      body: box(stage.querySelector(".mood-jar-body")),
      rim: box(stage.querySelector(".mood-jar-rim")),
      base: box(stage.querySelector(".mood-jar-base")),
      bodyScreen: screenBox(stage.querySelector(".mood-jar-body")),
      rimScreen: screenBox(stage.querySelector(".mood-jar-rim")),
      baseScreen: screenBox(stage.querySelector(".mood-jar-base")),
      items: [...stage.querySelectorAll(".mood-jar-item")].map((item) => {
        const rect = item.getBoundingClientRect();
        const x = Number.parseFloat(item.style.getPropertyValue("--jar-x"));
        const y = Number.parseFloat(item.style.getPropertyValue("--jar-y"));
        return {
          id: item.dataset.moodJarItemId,
          shape: item.className.includes("is-square") ? "square" : "circle",
          x,
          y,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          expectedCenterX: stageRect.left + stageRect.width * x / 100,
          expectedCenterY: stageRect.top + stageRect.height * y / 100,
          computedLeft: getComputedStyle(item).left,
          computedTop: getComputedStyle(item).top,
        };
      }),
    };
  });
  assert.equal(jarGeometry.viewportPresent, true, `${label} jar must have a clipped inner viewport`);
  assert.match(jarGeometry.viewportClip, /polygon|path|inset/u, `${label} jar viewport must expose a real clip path`);
  assert.ok(jarGeometry.stage.width > 0 && jarGeometry.stage.height > 0, `${label} jar stage has no layout box`);
  assert.ok(jarGeometry.body?.width > 0 && jarGeometry.rim?.width > 0 && jarGeometry.base?.width > 0, `${label} jar geometry is incomplete`);
  const jarCenter = (box) => box.x + box.width / 2;
  assert.ok(Math.abs(jarCenter(jarGeometry.body) - jarCenter(jarGeometry.rim)) <= 1.5, `${label} jar rim is not centered on the body`);
  assert.ok(Math.abs(jarCenter(jarGeometry.body) - jarCenter(jarGeometry.base)) <= 1.5, `${label} jar base is not centered on the body`);
  const screenCenter = (box) => box.left + box.width / 2;
  assert.ok(Math.abs(screenCenter(jarGeometry.bodyScreen) - screenCenter(jarGeometry.rimScreen)) <= 2, `${label} jar screen rim is not centered on the body`);
  assert.ok(Math.abs(screenCenter(jarGeometry.bodyScreen) - screenCenter(jarGeometry.baseScreen)) <= 2, `${label} jar screen base is not centered on the body`);
  const jarItems = jarGeometry.items;
  assert.deepEqual(jarItems.map(({ shape }) => shape), ["square", "circle"], `${label} jar seats must keep stable shapes`);
  assert.ok(jarItems.every(({ width, height, left, right, top, bottom, centerX, centerY, expectedCenterX, expectedCenterY, computedLeft, computedTop }) => {
    const innerLeft = jarGeometry.stage.left + jarGeometry.stage.width * 0.2;
    const innerRight = jarGeometry.stage.left + jarGeometry.stage.width * 0.8;
    const innerTop = jarGeometry.stage.top + jarGeometry.stage.height * 0.22;
    const innerBottom = jarGeometry.stage.top + jarGeometry.stage.height * 0.9;
    return width > 0 && height > 0
      && left >= innerLeft && right <= innerRight && top >= innerTop && bottom <= innerBottom
      && Math.abs(centerX - expectedCenterX) <= 1.5 && Math.abs(centerY - expectedCenterY) <= 1.5
      && computedLeft !== "auto" && computedTop !== "auto";
  }), `${label} jar item escaped the clipped glass bounds: ${JSON.stringify(jarGeometry)}`);
  if (label === "mood-390") {
    const jarScreenshot = await page.locator("#moodJarStage").screenshot({ animations: "disabled" });
    const jarScreenshotSize = pngDimensions(jarScreenshot);
    assert.ok(jarScreenshot.length > 1000 && jarScreenshotSize.width > 0 && jarScreenshotSize.height > 0, `${label} jar screenshot has no visual surface`);
  }
  const dominantText = await page.locator("#moodDominantList").textContent();
  assert.match(dominantText, /小秀/u);
  assert.match(dominantText, /小咻/u);
  assert.match(dominantText, /开心/u);
  assert.match(dominantText, /平静/u);
  const trendState = await page.locator("#moodTrendChart").evaluate((element) => ({
    hiddenAttribute: element.getAttribute("hidden"),
    pointCount: element.querySelectorAll("[data-mood-trend-point]").length,
    seriesCount: element.querySelectorAll(".mood-trend-line").length,
  }));
  assert.equal(trendState.hiddenAttribute, null, `${label} trend chart should render for recorded points: ${JSON.stringify(trendState)}`);
  assert.equal(await page.locator("#moodTrendChart [data-mood-trend-point]").count(), 2);
  assert.equal(await page.locator("#moodTrendChart [role=button][tabindex=\"0\"]").count(), 2);
  assert.equal(await page.locator("#moodTrendDetailsContent .mood-trend-data-list > li").count(), 1);
  assert.match(await page.locator("#moodTrendSummary").textContent(), /小秀.*记录 1 天/u);
  await assertMoodCalendarLayout(page, today, page.viewportSize(), label);
}

async function runMoodJarViewportAnimation() {
  const today = todayInTokyo();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "no-preference" });
  const fixture = createCloudflareApiFixture({ seedMoodFamily: true, moodDiaries: moodSummaryRows(today) });
  const page = await context.newPage();
  await fixture.install(context);
  await installMoodSession(page);
  await page.addInitScript(() => {
    window.__moodAnimationCalls = [];
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function instrumentedAnimate(keyframes, options) {
      if (this.closest?.("#moodJarStage")) {
        window.__moodAnimationCalls.push({
          className: String(this.className),
          entryId: this.closest?.(".mood-jar-item")?.dataset.moodJarItemId || "",
          keyframes,
          options: { duration: options?.duration, delay: options?.delay },
        });
      }
      return originalAnimate.call(this, keyframes, options);
    };
    const style = document.createElement("style");
    style.id = "fixture-mood-jar-offscreen";
    style.textContent = "#moodJarStage { transform: translateY(1200px) !important; }";
    document.documentElement.append(style);
  });
  try {
    await page.goto(`${baseUrl}/?page=mood`, { waitUntil: "domcontentloaded" });
    await waitForMoodDiaryPage(page);
    await page.waitForFunction(() => document.querySelector("#moodJarCount")?.textContent === "2 条记录", null, { timeout: 30000 });
    const offscreenCalls = await page.evaluate(() => window.__moodAnimationCalls.slice());
    assert.equal(offscreenCalls.length, 0, `jar animation must wait while the stage is offscreen: ${JSON.stringify(offscreenCalls)}`);

    await page.evaluate(() => document.querySelector("#fixture-mood-jar-offscreen")?.remove());
    await page.locator("#moodJarStage").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__moodAnimationCalls.length >= 2, null, { timeout: 3000 });
    const calls = await page.evaluate(() => window.__moodAnimationCalls.slice());
    assert.ok(calls.every(({ keyframes }) => keyframes.some(({ transform = "" }) => String(transform).includes("translate3d"))), `jar animation must originate from the mouth: ${JSON.stringify(calls)}`);
    assert.ok(calls.every(({ keyframes }) => String(keyframes.at(-1)?.transform || "").includes("translate3d(0px, 0px, 0px)")), `jar animation must settle at the final transform: ${JSON.stringify(calls)}`);
    assert.equal(new Set(calls.map(({ options }) => options.delay)).size, calls.length, `jar entries should fall in a visible sequence: ${JSON.stringify(calls)}`);
    await page.waitForTimeout(700);
    assert.equal(await page.locator("#moodJarItems .mood-jar-motion").evaluateAll((items) => items.every((item) => item.getAnimations().length === 0)), true, "jar animations did not settle");

    const settledCalls = await page.evaluate(() => window.__moodAnimationCalls.length);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    await page.locator("#moodJarStage").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__moodAnimationCalls.length), settledCalls, "jar animation replayed after returning to the viewport");
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runMoodJarMutationAnimation() {
  const today = todayInTokyo();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "no-preference" });
  const fixture = createCloudflareApiFixture({ seedMoodFamily: true, moodDiaries: moodSummaryRows(today) });
  const page = await context.newPage();
  await fixture.install(context);
  await installMoodSession(page);
  await page.addInitScript(() => {
    window.__moodMutationAnimationCalls = [];
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function instrumentedMutationAnimate(keyframes, options) {
      if (this.closest?.("#moodJarStage") && window.__recordMoodMutationAnimations) {
        window.__moodMutationAnimationCalls.push({
          entryId: this.closest(".mood-jar-item")?.dataset.moodJarItemId || "",
          keyframes,
          options: { duration: options?.duration, delay: options?.delay },
        });
      }
      return originalAnimate.call(this, keyframes, options);
    };
  });
  try {
    await page.goto(`${baseUrl}/?page=mood`, { waitUntil: "domcontentloaded" });
    await waitForMoodDiaryPage(page);
    await page.waitForFunction(() => document.querySelector("#moodJarCount")?.textContent === "2 条记录", null, { timeout: 30000 });
    await page.locator("#moodJarStage").scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      window.__moodMutationAnimationCalls = [];
      window.__recordMoodMutationAnimations = true;
    });
    const todayCell = page.locator(`[data-mood-date="${today}"]`);
    await todayCell.click();
    await page.waitForSelector("#moodDetailPanel:not([hidden])", { state: "visible", timeout: 30000 });
    await page.locator("#moodJarStage").scrollIntoViewIfNeeded();
    await page.click("[data-mood-delete]");
    await page.waitForSelector('.action-confirm-dialog[open]', { state: "visible", timeout: 30000 });
    await page.click('.action-confirm-dialog button[value="confirm"]');
    await page.waitForFunction(() => document.querySelector("#moodJarCount")?.textContent === "1 条记录", null, { timeout: 30000 });
    await page.waitForTimeout(250);
    const calls = await page.evaluate(() => window.__moodMutationAnimationCalls.slice());
    assert.equal(calls.length, 1, `mutation should animate only the affected jar item: ${JSON.stringify(calls)}`);
    assert.equal(calls[0].entryId, "fixture-summary-owner-current");
    assert.equal(calls[0].options.duration, 180);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runMoodJarDenseLayout() {
  const today = todayInTokyo();
  const expectedCount = daysInMonth(today.slice(0, 7)) * 2;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
  const fixture = createCloudflareApiFixture({ seedMoodFamily: true, moodDiaries: denseMoodSummaryRows(today) });
  const page = await context.newPage();
  await fixture.install(context);
  await installMoodSession(page);
  try {
    await page.goto(`${baseUrl}/?page=mood`, { waitUntil: "domcontentloaded" });
    await waitForMoodDiaryPage(page);
    await page.waitForFunction((expected) => document.querySelector("#moodJarCount")?.textContent === `${expected} 条记录`, expectedCount, { timeout: 30000 });
    const geometry = await page.locator("#moodJarStage").evaluate((stage) => {
      const stageRect = stage.getBoundingClientRect();
      const viewport = stage.querySelector(".mood-jar-viewport");
      const clipPolygon = [[34, 21], [66, 21], [66, 25], [75, 36], [77, 48], [77, 78], [75, 86], [72, 88], [28, 88], [25, 86], [23, 78], [23, 48], [25, 36], [34, 25]];
      const insideClip = (x, y) => {
        let inside = false;
        for (let index = 0, previous = clipPolygon.length - 1; index < clipPolygon.length; previous = index++) {
          const [currentX, currentY] = clipPolygon[index];
          const [previousX, previousY] = clipPolygon[previous];
          const intersects = ((currentY > y) !== (previousY > y))
            && x < (previousX - currentX) * (y - currentY) / (previousY - currentY) + currentX;
          if (intersects) inside = !inside;
        }
        return inside;
      };
      const items = [...stage.querySelectorAll(".mood-jar-item")].map((item) => {
        const rect = item.getBoundingClientRect();
        const x = Number.parseFloat(item.style.getPropertyValue("--jar-x"));
        const y = Number.parseFloat(item.style.getPropertyValue("--jar-y"));
        return {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          expectedLeft: stageRect.left + stageRect.width * x / 100 - rect.width / 2,
          expectedTop: stageRect.top + stageRect.height * y / 100 - rect.height / 2,
          cornersInsideClip: [[rect.left, rect.top], [rect.right, rect.top], [rect.right, rect.bottom], [rect.left, rect.bottom]].every(([left, top]) => insideClip(
            (left - stageRect.left) / stageRect.width * 100,
            (top - stageRect.top) / stageRect.height * 100,
          )),
        };
      });
      return {
        stage: { left: stageRect.left, top: stageRect.top, width: stageRect.width, height: stageRect.height },
        clip: viewport ? getComputedStyle(viewport).clipPath : "",
        items,
      };
    });
    assert.match(geometry.clip, /polygon|path|inset/u);
    assert.equal(geometry.items.length, expectedCount);
    assert.ok(geometry.items.every(({ width, height, left, right, top, bottom, expectedLeft, expectedTop, cornersInsideClip }) => {
      const innerLeft = geometry.stage.left + geometry.stage.width * 0.2;
      const innerRight = geometry.stage.left + geometry.stage.width * 0.8;
      const innerTop = geometry.stage.top + geometry.stage.height * 0.22;
      const innerBottom = geometry.stage.top + geometry.stage.height * 0.9;
      return width > 0 && height > 0
        && left >= innerLeft && right <= innerRight && top >= innerTop && bottom <= innerBottom
        && Math.abs(left - expectedLeft) <= 1.5 && Math.abs(top - expectedTop) <= 1.5
        && cornersInsideClip;
    }), `dense jar geometry escaped the cavity: ${JSON.stringify(geometry)}`);
    await assertNoHorizontalOverflow(page, "dense jar layout");
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runMoodMonthSummaryLayout(viewport, label, { navigate = false, dark = false, reducedMotion = "reduce" } = {}) {
  const today = todayInTokyo();
  const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion });
  const fixture = createCloudflareApiFixture({ seedMoodFamily: true, moodDiaries: moodSummaryRows(today) });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture.install(context);
  await installMoodSession(page);
  try {
    await page.goto(`${baseUrl}/?page=mood`, { waitUntil: "domcontentloaded" });
    await waitForMoodDiaryPage(page);
    try {
      await page.waitForFunction(() => document.querySelector("#moodJarCount")?.textContent === "2 条记录", null, { timeout: 30000 });
    } catch (error) {
      throw new Error(`${label} summary did not load: ${error.message}; count=${await page.locator("#moodJarCount").textContent()}; status=${await page.locator("#moodDiaryStatus").textContent()}; requests=${JSON.stringify(fixture.requests)}`);
    }
    await assertMoodMonthSummary(page, today, label);
    if (reducedMotion === "reduce") {
      assert.equal(await page.locator("#moodJarItems .mood-jar-item").evaluateAll((items) => items.every((item) => item.getAnimations().length === 0)), true, `${label} reduced-motion jar still animates`);
    }

    if (viewport.width <= 430) {
      await page.evaluate(() => { document.documentElement.style.fontSize = "130%"; });
      await assertNoHorizontalOverflow(page, `${label} at 130% text`);
      await assertMoodCalendarLayout(page, today, viewport, `${label} at 130% text`);
    }
    if (dark) {
      await page.evaluate(() => document.body.classList.add("theme-dark"));
      assert.notEqual(await page.locator("#moodMonthSummary").evaluate((element) => getComputedStyle(element).color), "", `${label} dark theme did not style the summary`);
      await assertNoHorizontalOverflow(page, `${label} dark theme`);
    }

    if (navigate) {
      const previousMonth = shiftMonthKey(today.slice(0, 7), -1);
      await page.click("#moodMonthPrevious");
      await page.waitForFunction((expected) => document.querySelector("#moodMonthLabel")?.textContent.includes(expected), `${previousMonth.split("-")[0]} 年 ${Number(previousMonth.split("-")[1])} 月`, { timeout: 30000 });
      await page.waitForFunction(() => document.querySelector("#moodJarCount")?.textContent === "5 条记录", null, { timeout: 30000 });
      assert.equal(await page.locator("#moodTrendChart [data-mood-trend-point]").count(), 5);
      assert.equal(await page.locator("#moodTrendChart .mood-trend-line.series-0.is-solid").count(), 1);
      assert.equal(await page.locator("#moodTrendChart .mood-trend-line.series-0.is-gap").count(), 1);
      assert.equal(await page.locator("#moodTrendChart .mood-trend-line.series-1.is-dashed").count(), 1);
      assert.equal(await page.locator("#moodTrendLegend .mood-trend-line-swatch.is-dashed").count(), 1);
      const trendGeometry = await page.locator("#moodTrendChart").evaluate((element) => ({
        rect: (() => {
          const value = element.getBoundingClientRect();
          return { width: value.width, height: value.height };
        })(),
        viewBox: element.viewBox?.baseVal ? {
          x: element.viewBox.baseVal.x,
          y: element.viewBox.baseVal.y,
          width: element.viewBox.baseVal.width,
          height: element.viewBox.baseVal.height,
        } : null,
        lines: [...element.querySelectorAll(".mood-trend-line")].map((path) => {
          const box = path.getBBox();
          return {
            length: path.getTotalLength(),
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            stroke: getComputedStyle(path).stroke,
          };
        }),
        points: [...element.querySelectorAll(".mood-trend-visible-point")].map((point) => {
          const box = point.getBBox();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        }),
        controls: [...element.ownerDocument.querySelectorAll("#moodTrendPointControls [data-mood-trend-point]")].map((control) => {
          const box = control.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      }));
      assert.ok(trendGeometry.rect.width > 0 && trendGeometry.rect.height > 0, `${label} trend SVG has no mobile layout box: ${JSON.stringify(trendGeometry)}`);
      assert.deepEqual(trendGeometry.viewBox && [trendGeometry.viewBox.width, trendGeometry.viewBox.height], [720, 260]);
      assert.ok(trendGeometry.lines.length >= 3 && trendGeometry.lines.every(({ length, box, stroke }) => length > 0 && box.width > 0 && box.height >= 0 && !/none|transparent/u.test(stroke)), `${label} trend path is invisible or has no geometry: ${JSON.stringify(trendGeometry)}`);
      assert.ok(trendGeometry.points.length === 5 && trendGeometry.points.every(({ width, height, x, y }) => width > 0 && height > 0 && x >= 0 && x <= 720 && y >= 0 && y <= 260), `${label} trend points escaped the SVG viewBox: ${JSON.stringify(trendGeometry)}`);
      assert.ok(trendGeometry.controls.length === 5 && trendGeometry.controls.every(({ width, height }) => width >= 44 && height >= 44), `${label} trend point controls are smaller than 44px: ${JSON.stringify(trendGeometry.controls)}`);
      if (label === "mood-landscape" || label === "mood-390") {
        const trendScreenshot = await page.locator("#moodTrendChartShell").screenshot({ animations: "disabled" });
        const trendScreenshotSize = pngDimensions(trendScreenshot);
        assert.ok(trendScreenshot.length > 1000 && trendScreenshotSize.width > 0 && trendScreenshotSize.height > 0, `${label} trend screenshot has no visual surface`);
      }
      const firstPoint = page.locator("#moodTrendPointControls [data-mood-trend-point]").first();
      await firstPoint.focus();
      await firstPoint.evaluate((element) => element.focus());
      await page.keyboard.press("Enter");
      try {
        await page.waitForFunction(() => document.querySelector("#moodTrendTooltip")?.hidden === false, null, { timeout: 3000 });
      } catch (error) {
        const focusDebug = await page.evaluate(() => ({
          active: document.activeElement?.outerHTML?.slice(0, 240) || "",
          point: document.querySelector("#moodTrendChart [data-mood-trend-point]")?.outerHTML?.slice(0, 240) || "",
          tooltip: document.querySelector("#moodTrendTooltip")?.outerHTML || "",
        }));
        throw new Error(`${label} trend point was not keyboard reachable: ${error.message}; ${JSON.stringify(focusDebug)}`);
      }
      assert.match(await page.locator("#moodTrendTooltip").textContent(), /小秀/u);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#moodTrendTooltip").getAttribute("hidden"), "");
      await page.click("#moodTrendDetails summary");
      assert.equal(await page.locator("#moodTrendDetails").getAttribute("open"), "");
      assert.equal(await page.locator("#moodTrendDetailsContent .mood-trend-data-list > li").count(), 4);

      await page.waitForTimeout(700);
      const firstJarId = await page.locator("#moodJarItems .mood-jar-item").first().getAttribute("data-mood-jar-item-id");
      await page.click("#moodListOpen");
      await page.waitForSelector("#moodListView:not([hidden])", { state: "visible", timeout: 30000 });
      await page.click("#moodCalendarOpen");
      await page.waitForSelector("#moodMonthSummary:not([hidden])", { state: "visible", timeout: 30000 });
      assert.equal(await page.locator("#moodJarItems .mood-jar-item").first().getAttribute("data-mood-jar-item-id"), firstJarId, `${label} passive render recreated jar nodes`);
      const passiveAnimations = await page.locator("#moodJarItems .mood-jar-item").evaluateAll((items) => items.map((item) => ({
        id: item.dataset.moodJarItemId,
        animations: item.getAnimations().map((animation) => ({ playState: animation.playState, currentTime: animation.currentTime })),
      })));
      assert.ok(passiveAnimations.every(({ animations }) => animations.length === 0), `${label} passive render replayed jar animation: ${JSON.stringify(passiveAnimations)}`);
    }
    await assertNoHorizontalOverflow(page, `${label} final`);
    assert.deepEqual(pageErrors, [], `${label} month summary page errors:\n${pageErrors.join("\n")}`);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
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
    assert.equal(await page.locator("#moodPage .mood-diary-header, #moodDiaryLede, #moodPage .kicker").count(), 0);
    assert.equal(await page.locator("#moodMonthSummary").isVisible(), true);
    assert.equal(await page.locator("#moodListOpen").isVisible(), true);
    assert.equal(await page.locator("#moodNav").count(), 0);
    assert.match(page.url(), /[?&]page=mood(?:&|$)/u);
    await assertNoHorizontalOverflow(page, `${label} initial mood diary`);
    await assertMoodCalendarLayout(page, todayInTokyo(), viewport, `${label} initial mood diary`);

    const future = page.locator('#moodCalendarGrid [aria-disabled="true"]').first();
    if (await future.count()) {
      assert.equal(await future.isDisabled(), true, `${label} future dates must be disabled before interaction`);
      assert.match(await future.getAttribute("aria-label"), /未来日期，不可记录/u);
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
    const readsBeforeSave = moodReadCount(fixture);
    await page.click("#moodEditorSave");
    await page.waitForSelector("#moodOverlay:not([hidden]) #moodDetailPanel:not([hidden])", { state: "visible" });
    await waitForMoodReads(fixture, readsBeforeSave + 1, `${label} save`);
    assert.equal(await page.locator("#moodDetailContent").textContent(), "今天把心情写下来 😊");
    assert.equal(await page.locator("#moodDetailTags").textContent(), "#散步");
    assert.equal(await page.locator("#moodJarCount").textContent(), "1 条记录");
    assert.equal(fixture.writes.filter(({ path, action }) => path === "/api/table/mood_diaries" && action === "upsert").length, 1);

    await page.click('[data-mood-edit]');
    await page.waitForSelector("#moodEditorPanel:not([hidden])", { state: "visible" });
    await page.fill("#moodEditorContent", "已经编辑过了");
    const readsBeforeUpdate = moodReadCount(fixture);
    await page.click("#moodEditorSave");
    await page.waitForSelector("#moodDetailPanel:not([hidden])", { state: "visible" });
    await waitForMoodReads(fixture, readsBeforeUpdate + 1, `${label} update`);
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
    const readsBeforeDelete = moodReadCount(fixture);
    await page.click('.action-confirm-dialog button[value="confirm"]');
    await page.waitForSelector("#moodOverlay[hidden]", { state: "attached" });
    await waitForMoodReads(fixture, readsBeforeDelete + 1, `${label} delete`);
    assert.equal(await page.locator(`[data-mood-date="${today}"] .mood-calendar-entry`).count(), 0);
    assert.equal(await page.locator("#moodJarCount").textContent(), "0 条记录");
    assert.equal(fixture.writes.filter(({ path, action }) => path === "/api/table/mood_diaries" && action === "delete").length, 1);
    await assertNoHorizontalOverflow(page, `${label} final mood diary`);
    assert.deepEqual(pageErrors, [], `${label} mood diary page errors:\n${pageErrors.join("\n")}`);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function runMoodMonthFailureState() {
  const today = todayInTokyo();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
  const fixture = createCloudflareApiFixture({ scenario: "api-500", seedMoodFamily: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture.install(context);
  await installMoodSession(page);
  await page.addInitScript((cache) => {
    localStorage.setItem(`life-vlog-mood-month:fixture-user:${cache.monthKey}`, JSON.stringify(cache.rows));
  }, {
    monthKey: today.slice(0, 7),
    rows: [{ id: "fixture-cached-mood", user_id: "fixture-user", diary_date: today, mood: "happy", content: "最近结果", tags: [] }],
  });
  try {
    await page.goto(`${baseUrl}/?page=mood`, { waitUntil: "domcontentloaded" });
    await waitForMoodDiaryPage(page);
    await page.waitForSelector("#moodMonthRetry:not([hidden])", { state: "visible", timeout: 30000 });
    assert.equal(await page.locator("#moodJarCount").textContent(), "1 条记录");
    assert.match(await page.locator("#moodDiaryStatus").textContent(), /最近结果/u);
    assert.equal(await page.locator("#moodMonthRetry").isEnabled(), true);
    const readsBeforeRetry = moodReadCount(fixture);
    await page.click("#moodMonthRetry");
    await waitForMoodReads(fixture, readsBeforeRetry + 1, "month retry");
    await page.waitForSelector("#moodMonthRetry:not([hidden])", { state: "visible", timeout: 30000 });
    assert.equal(await page.locator("#moodJarCount").textContent(), "1 条记录");
    assert.deepEqual(pageErrors, [], `month failure page errors:\n${pageErrors.join("\n")}`);
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
  await runMoodMonthFailureState();
  await runMoodJarViewportAnimation();
  await runMoodJarMutationAnimation();
  await runMoodJarDenseLayout();
  await runMoodMonthSummaryLayout({ width: 375, height: 812 }, "mood-375");
  await runMoodMonthSummaryLayout({ width: 390, height: 844 }, "mood-390", { navigate: true });
  await runMoodMonthSummaryLayout({ width: 430, height: 932 }, "mood-430", { dark: true });
  await runMoodMonthSummaryLayout({ width: 768, height: 1024 }, "mood-768");
  await runMoodMonthSummaryLayout({ width: 844, height: 390 }, "mood-landscape", { navigate: true });
  await runMoodMonthSummaryLayout({ width: 1440, height: 900 }, "mood-1440", { navigate: true, dark: true, reducedMotion: "no-preference" });
  await runMoodDiaryFlow({ width: 375, height: 812 }, "mobile");
  await runMoodDiaryFlow({ width: 812, height: 375 }, "landscape");
  await runMoodDiaryFlow({ width: 1440, height: 900 }, "desktop");
  console.log(`Mood diary browser checks passed; fixture endpoint ${cloudflareFixtureWorkerUrl}.`);
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
