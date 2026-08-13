const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  await page.goto("https://life-vlog-site.pages.dev/?offline-test=156", { waitUntil: "networkidle" });
  await page.waitForFunction(() => navigator.serviceWorker?.ready);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector("#brandName", { state: "visible", timeout: 10000 });
  console.log(await page.evaluate(() => JSON.stringify({
    title: document.title,
    brand: document.querySelector("#brandName")?.textContent?.trim(),
    controlled: Boolean(navigator.serviceWorker?.controller),
    online: navigator.onLine,
  })));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
