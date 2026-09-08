import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

const server = await createServer({ server: { host: "127.0.0.1", port: 4176, strictPort: true } });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await page.route("**/refresh-fixture", route => route.fulfill({ contentType: "text/html", body: '<html><head><link rel="stylesheet" href="/styles/pull-refresh.css"></head><body style="--line:#d9dfda;--surface:white;--muted:#56625b;--accent:#5b9834"><main style="height:800px">日记 <button>操作</button></main></body></html>' }));
  await page.goto("http://127.0.0.1:4176/refresh-fixture");
  await page.evaluate(async () => {
    const { bindPullRefresh } = await import("/modules/pull-refresh-controller.js");
    const { createPullRefreshView } = await import("/modules/pull-refresh-view.js");
    window.calls = 0;
    bindPullRefresh({ target: document.querySelector("main"), canStart: () => scrollY <= 2,
      view: createPullRefreshView(), refresh: () => { window.calls++; return new Promise(resolve => window.finish = resolve); } });
    window.touch = (type, x, y, selector = "main", count = 1) => {
      const target = document.querySelector(selector);
      const touches = type === "touchend" || type === "touchcancel" ? [] : Array.from({ length: count }, (_, identifier) => new Touch({ identifier, target, clientX: x, clientY: y }));
      target.dispatchEvent(new TouchEvent(type, { touches, bubbles: true, cancelable: true }));
    };
  });
  const touch = (...args) => page.evaluate(args => window.touch(...args), args);
  const indicator = page.locator("#pullRefreshIndicator");
  await touch("touchstart", 100, 100);
  await touch("touchmove", 100, 150);
  assert.match(await indicator.textContent(), /下拉刷新/);
  await touch("touchmove", 100, 240);
  assert.match(await indicator.textContent(), /松开刷新/);
  await touch("touchend", 100, 240);
  assert.match(await indicator.textContent(), /正在刷新/);
  await touch("touchstart", 100, 100);
  await touch("touchmove", 100, 250);
  await touch("touchend", 100, 250);
  assert.equal(await page.evaluate(() => window.calls), 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await indicator.locator("i").evaluate(el => getComputedStyle(el).animationName), "none");
  await page.evaluate(() => window.finish(false));
  await page.waitForFunction(() => document.querySelector("#pullRefreshIndicator").textContent.includes("失败"));
  for (const end of ["touchcancel", "horizontal", "multitouch"]) {
    await touch("touchstart", 100, 100);
    await touch("touchmove", 100, 150);
    if (end === "horizontal") await touch("touchmove", 300, 160);
    else if (end === "multitouch") await touch("touchmove", 100, 200, "main", 2);
    else await touch(end, 100, 150);
    assert.equal(await indicator.evaluate(el => el.classList.contains("visible")), false);
  }
  await touch("touchstart", 100, 100, "button");
  await touch("touchmove", 100, 250, "button");
  await touch("touchend", 100, 250, "button");
  assert.equal(await page.evaluate(() => window.calls), 1);
  console.log("Pull refresh browser checks passed: progress, release, concurrency, cancellation, failure and reduced motion.");
} finally {
  await browser.close();
  await server.close();
}
