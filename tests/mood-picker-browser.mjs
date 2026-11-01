import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const index = await readFile(resolve(root, "index.html"), "utf8");
const overlay = index.slice(index.indexOf('<div class="mood-overlay" id="moodOverlay"'), index.indexOf('<dialog class="anniversary-dialog"'));
const output = resolve(root, "artifacts/mood-picker");
await mkdir(output, { recursive: true });
const css = ["styles.css", "styles/redesign-foundation.css", "styles/mood-diary.css", "styles/redesign-components.css", "styles/mood-entry-overlay.css"];
const types = { ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://fixture").pathname);
    if (pathname === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>心情拖动验收</title>${css.map((path) => `<link rel="stylesheet" href="/${path}">`).join("")}</head><body><main><h1>心情选择</h1><button id="openPicker" type="button">记录心情</button></main>${overlay}<script type="module" src="/tests/fixtures/mood-picker-browser-fixture.mjs"></script></body></html>`);
      return;
    }
    const path = resolve(root, pathname.startsWith("/assets/") ? `public${pathname}` : `.${pathname}`);
    if (!path.startsWith(resolve(root) + sep)) { response.writeHead(403).end(); return; }
    response.setHeader("content-type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({ headless: true });
const errors = [];
const target = ".mood-picker-center";
const happy = '[data-mood="happy"]';
async function center(locator) {
  const rect = await locator.boundingBox();
  assert.ok(rect);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
async function startDrag(page) {
  const from = await center(page.locator(happy));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  return from;
}
async function inPicker(page) {
  assert.equal(await page.locator("#moodPickerPanel").isVisible(), true);
  assert.equal(await page.locator(".is-dragging").count(), 0);
  assert.equal(await page.locator(`${target}.is-ready`).count(), 0);
  assert.equal(await page.evaluate(() => fixture.writes.length), 0);
}
async function back(page) {
  await page.click("#moodEditorCancel");
  await page.locator("#moodPickerPanel").waitFor({ state: "visible" });
}
try {
  for (const [width, dark] of [[375, false], [390, true], [768, false], [1440, true]]) {
    const reducedMotion = width === 1440 ? "no-preference" : "reduce";
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width <= 430, reducedMotion, serviceWorkers: "block" });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.fixture?.ready);
    await page.evaluate((value) => document.body.classList.toggle("theme-dark", value), dark);
    await page.waitForFunction(() => [...document.querySelectorAll("#moodPickerOrbit img")].every((image) => image.complete && image.naturalWidth));
    assert.equal(await page.locator(happy).evaluate((element) => getComputedStyle(element).touchAction), "none");
    if (reducedMotion === "reduce") assert.ok(await page.locator(happy).evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration) <= 0.001));
    await page.locator("#moodPickerOrbit img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.screenshot({ path: resolve(output, `${width}-picker.png`) });
    const drop = await center(page.locator(target));
    const from = await startDrag(page);
    await page.mouse.move(from.x + 20, from.y + 25, { steps: 5 });
    await page.mouse.up();
    await inPicker(page);
    await startDrag(page);
    await page.mouse.move(drop.x, drop.y, { steps: 2 });
    const grabbed = await center(page.locator(happy));
    assert.ok(Math.hypot(grabbed.x - drop.x, grabbed.y - drop.y) < 3, "quickly grabbing again must keep the picture under the pointer");
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await inPicker(page);
    await page.locator(happy).evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

    await startDrag(page);
    const bounds = await page.locator(target).boundingBox();
    await page.mouse.move(bounds.x + 2, bounds.y + 2, { steps: 8 });
    assert.equal(await page.locator(`${target}.is-ready`).count(), 0, "the drop target uses its circular boundary");
    await page.mouse.up();
    await inPicker(page);

    await startDrag(page);
    await page.mouse.move(drop.x, drop.y, { steps: 10 });
    assert.equal(await page.locator(`${target}.is-ready`).count(), 1);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await inPicker(page);

    await startDrag(page);
    await page.mouse.move(drop.x, drop.y, { steps: 10 });
    await page.locator(happy).dispatchEvent("pointercancel", { pointerId: await page.evaluate(() => fixture.pointerId) });
    await page.mouse.up();
    await inPicker(page);

    await startDrag(page);
    await page.mouse.move(drop.x, drop.y, { steps: 10 });
    assert.match(await page.locator(target).textContent(), /松开选择.*开心/s);
    assert.equal(await page.locator("#moodEditorPanel").isVisible(), false, "entering the target must not select before release");
    await page.screenshot({ path: resolve(output, `${width}-drag.png`) });
    await page.mouse.up();
    await page.locator("#moodEditorPanel").waitFor({ state: "visible" });
    assert.match(await page.locator("#moodEditorSelected").textContent(), /开心/);
    assert.equal(await page.evaluate(() => fixture.writes.length), 0, "dropping only selects; saving remains explicit");
    assert.equal(await page.locator("#moodEditorContent").evaluate((element) => element === document.activeElement), true);
    await back(page);

    await page.locator('[data-mood="calm"]').click();
    assert.match(await page.locator("#moodEditorSelected").textContent(), /平静/);
    await back(page);
    await page.locator(happy).focus();
    await page.keyboard.press("Enter");
    assert.match(await page.locator("#moodEditorSelected").textContent(), /开心/);
    await back(page);

    if (width <= 430) {
      const cdp = await context.newCDPSession(page);
      const point = await center(page.locator(happy));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x + 20, y: point.y + 25 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await inPicker(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [drop] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      await inPicker(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x + (drop.x - point.x) * step / 8, y: point.y + (drop.y - point.y) * step / 8 }] });
      }
      assert.equal(await page.locator(`${target}.is-ready`).count(), 1, "native touch dragging reaches the target");
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.locator("#moodEditorPanel").waitFor({ state: "visible" });
      assert.match(await page.locator("#moodEditorSelected").textContent(), /开心/);
      await back(page);
      await cdp.detach();
    }
    await startDrag(page);
    await page.mouse.move(drop.x, drop.y, { steps: 10 });
    await page.evaluate(() => fixture.controller.close());
    await page.mouse.up();
    await page.waitForFunction(() => document.activeElement === document.querySelector("#openPicker"));
    await page.click("#openPicker");
    await inPicker(page);
    await page.evaluate(async () => { await fixture.controller.close(); await fixture.open(); });
    await page.waitForTimeout(350);
    assert.equal(await page.locator("#moodOverlay").evaluate((element) => element.contains(document.activeElement)), true, "a prior close must not restore focus outside a reopened dialog");
    const audit = await new AxeBuilder({ page }).include("#moodOverlay").analyze();
    assert.deepEqual(audit.violations.filter(({ impact }) => ["serious", "critical"].includes(impact)).map(({ id }) => id), []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator(happy).click();
    await page.fill("#moodEditorContent", "合成拖动验收");
    await page.click("#moodEditorSave");
    await page.waitForFunction(() => fixture.writes.length === 1);
    assert.equal(await page.evaluate(() => fixture.writes[0].mood), "happy");
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log("Mood picker checks passed: mouse and native touch dragging, circular drop boundary, outside/cancel/Escape recovery, explicit save, click/keyboard access, light/dark, reduced motion and Axe at 375/390/768/1440px.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
