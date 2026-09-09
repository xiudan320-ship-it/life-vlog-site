import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 4176;
const server = await preview({
  root,
  preview: { host: "127.0.0.1", port, strictPort: true, open: false },
});
const browser = await chromium.launch({ headless: true });
const baseUrl = `http://127.0.0.1:${port}`;
const session = {
  access_token: "fixture-token",
  expires_at: "2099-01-01T00:00:00.000Z",
  user: {
    id: "fixture-user",
    email: "fixture-user@life-vlog.local",
    user_metadata: { username: "fixture-user" },
  },
};

async function readShellState(page) {
  return page.evaluate(() => ({
    splashHidden: Boolean(document.querySelector("#appSplash")?.hidden),
    bodyBusy: document.body.getAttribute("aria-busy"),
    cards: document.querySelectorAll("#gallery .photo-card").length,
    galleryStyles: [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) => rule.cssText.includes(".mobile-diary-more-sheet"));
      } catch {
        return false;
      }
    }),
  }));
}

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "allow",
  });
  const fixture = createCloudflareApiFixture({ delayMs: 1200 });
  await fixture.install(context);
  await context.addInitScript(({ session: initialSession }) => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(initialSession));
    localStorage.setItem("life-vlog-photo-feed-cache:fixture-user", JSON.stringify({
      savedAt: "2026-09-08T00:00:00.000Z",
      photos: [
        {
          id: "cached-photo-1",
          user_id: "fixture-user",
          title: "缓存日记一",
          note: "本地缓存的首屏内容",
          category: "日常",
          created_at: "2026-09-08T12:00:00.000Z",
          taken_at: "2026-09-08",
          image_url: "/assets/generated/black-cat-cover-640.webp",
          images: [],
        },
        {
          id: "cached-photo-2",
          user_id: "fixture-user",
          title: "缓存日记二",
          note: "网络同步完成前保持稳定",
          category: "旅行",
          created_at: "2026-09-07T12:00:00.000Z",
          taken_at: "2026-09-07",
          image_url: "/assets/generated/black-cat-cover-640.webp",
          images: [],
        },
      ],
      comments: [],
    }));
  }, { session });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  const warm = await readShellState(page);
  assert.equal(warm.splashHidden, true, "warm start did not finish splash");
  assert.equal(warm.bodyBusy, null, "warm start remained busy");
  assert.equal(warm.cards, 2, `cached cards were not ready with the splash: ${JSON.stringify(warm)}`);
  assert.equal(warm.galleryStyles, true, "warm start did not apply gallery styles");

  await page.waitForFunction(() => navigator.serviceWorker?.ready);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 15000 });
  await context.setOffline(true);

  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 15000 });
  const offline = await readShellState(page);
  assert.equal(offline.splashHidden, true, "offline cold start did not finish splash");
  assert.equal(offline.bodyBusy, null, "offline cold start remained busy");
  assert.equal(offline.cards, 2, `offline cold start lost cached cards: ${JSON.stringify(offline)}`);
  assert.equal(offline.galleryStyles, true, "offline cold start lost gallery styles");

  await page.goto(`${baseUrl}/?page=wishlist`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 15000 });
  const offlineDeepLink = await readShellState(page);
  assert.equal(offlineDeepLink.splashHidden, true, "offline deep-link shell did not render");
  assert.equal(offlineDeepLink.cards, 2, "offline deep-link shell lost cached gallery content");
  assert.deepEqual(errors, [], `mobile cold-start runtime errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ warm, offline, offlineDeepLink, serviceWorkerControlled: true }));

  await fixture.dispose(context);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
