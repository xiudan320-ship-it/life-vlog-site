import { chromium } from "file:///C:/Users/xiuda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

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

const result = await page.evaluate(() => ({
  title: document.title,
  brand: document.querySelector("#brandName")?.textContent?.trim(),
  controlled: Boolean(navigator.serviceWorker?.controller),
  online: navigator.onLine,
}));
console.log(JSON.stringify(result));
await browser.close();
