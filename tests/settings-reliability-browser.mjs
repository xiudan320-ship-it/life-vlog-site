import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";

const sourceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = join(sourceRoot, "dist");
assert.ok(existsSync(join(distRoot, "index.html")), "settings browser regression requires a built dist directory");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = createServer((request, response) => {
  const rawPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const filePath = normalize(join(distRoot, relativePath));
  const safeRelative = relative(distRoot, filePath);
  if (safeRelative.startsWith("..") || !existsSync(filePath) || !statSync(filePath).isFile()) {
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
const adminSession = {
  ...pseudoSession,
  user: {
    ...pseudoSession.user,
    user_metadata: { username: "xiudan320", login_username: "xiudan320" },
  },
};

const browser = await chromium.launch({ headless: true });

async function openFixturePage({ viewport, session = pseudoSession } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture();
  await fixture.install(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((initialSession) => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(initialSession));
  }, session);
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  await page.waitForFunction(() => performance.getEntriesByName("remote-sync-complete").length > 0, null, { timeout: 10000 });
  return { context, page, fixture, errors };
}

async function openSettings(page) {
  await page.click("#avatarButton");
  await page.click("#accountSettingsButton");
  await page.waitForSelector("#settingsDialog[open]", { state: "attached" });
}

async function closeFixturePage(result) {
  await result.context.close();
}

async function testSettingsActionsAndRetention() {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const { page } = result;
    await openSettings(page);

    await page.click("#settings-tab-settingsStorage");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsStorage"]');
    await page.evaluate(async () => {
      const response = new Response("fixture-cache-body", { headers: { "content-length": "102400", "content-type": "image/svg+xml" } });
      const cache = await caches.open("life-vlog-diary-image-cache");
      await cache.put(new Request("/settings-fixture-cache"), response);
      localStorage.setItem("life-vlog-photo-feed-cache:fixture-user", "managed-feed");
      localStorage.setItem("life-vlog-secret-items-cache:fixture-user", "managed-secret");
      localStorage.setItem("life-vlog-diary-draft", "draft-to-keep");
      localStorage.setItem("life-vlog-diary-cache-mb:fixture-user", "100");
    });
    await page.waitForFunction(() => !document.querySelector("#settingsCacheValue")?.textContent.includes("计算中"));
    await page.click("#refreshCacheInfoButton");
    await page.waitForFunction(() => {
      const value = document.querySelector("#settingsCacheValue")?.textContent || "";
      const kb = Number.parseInt(value, 10);
      return /KB/.test(value) && kb >= 100;
    });

    await page.click("#cacheLimitButton");
    await page.waitForSelector("#cacheLimitDialog[open]");
    await page.click('[data-cache-limit-preset="50"]');
    assert.deepEqual(
      await page.evaluate(() => [document.querySelector("#cacheLimitInput")?.value, document.querySelector("#secretCacheLimitInput")?.value]),
      ["50", "150"],
      "capacity preset did not update both pools",
    );
    await page.fill("#cacheLimitInput", "220");
    await page.fill("#secretCacheLimitInput", "660");
    await page.click("#cacheLimitForm button[type=submit]");
    await page.waitForFunction(() => !document.querySelector("#cacheLimitDialog")?.open);
    await page.waitForSelector("#settingsDialog[open]");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "cacheLimitButton", "capacity dialog did not restore its trigger focus");
    assert.equal(await page.locator("#settingsCacheLimitValue").textContent(), "日记 220 MB · 秘藏 660 MB");
    assert.deepEqual(
      await page.evaluate(() => [
        localStorage.getItem("life-vlog-diary-cache-mb:fixture-user"),
        localStorage.getItem("life-vlog-secret-cache-mb:fixture-user"),
      ]),
      ["220", "660"],
      "capacity save did not persist both pools",
    );

    await page.locator(".settings-danger-zone summary").click();
    await page.click("#clearAppCacheButton");
    await page.waitForSelector("dialog.action-confirm-dialog[open]");
    await page.locator('dialog.action-confirm-dialog button[value="cancel"]').click();
    assert.equal(await page.evaluate(() => localStorage.getItem("life-vlog-photo-feed-cache:fixture-user")), "managed-feed", "cancelled clear-all changed managed indexes");
    await page.click("#clearAppCacheButton");
    await page.waitForSelector("dialog.action-confirm-dialog[open]");
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.waitForFunction(async () => !(await caches.has("life-vlog-diary-image-cache")));
    const retained = await page.evaluate(() => ({
      managedFeed: localStorage.getItem("life-vlog-photo-feed-cache:fixture-user"),
      managedSecret: localStorage.getItem("life-vlog-secret-items-cache:fixture-user"),
      draft: localStorage.getItem("life-vlog-diary-draft"),
      capacity: localStorage.getItem("life-vlog-diary-cache-mb:fixture-user"),
    }));
    assert.deepEqual(retained, {
      managedFeed: null,
      managedSecret: null,
      draft: "draft-to-keep",
      capacity: "220",
    }, "clear-all removed more than managed offline content");

    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => { throw new Error("clipboard denied"); } },
      });
    });
    await page.click("[data-performance-copy]");
    const copyToast = page.locator(".mini-toast.visible").filter({ hasText: "无法复制" });
    await copyToast.waitFor();
    assert.match(await copyToast.textContent(), /无法复制/);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    });
    await page.click("[data-performance-copy]");
    const unavailableToast = page.locator(".mini-toast.visible").filter({ hasText: "当前浏览器不支持复制" });
    await unavailableToast.waitFor();
    assert.match(await unavailableToast.textContent(), /不支持复制/);
    assert.deepEqual(result.errors, [], `settings action page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testEarlyInstallPromptAndRoleSearch() {
  const ordinary = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const { page } = ordinary;
    await page.evaluate(() => {
      window.__fixturePromptCalls = 0;
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = () => { window.__fixturePromptCalls += 1; };
      event.userChoice = Promise.resolve({ outcome: "dismissed" });
      window.dispatchEvent(event);
    });
    await openSettings(page);
    await page.fill("#settingsSearchInput", "R2");
    await page.waitForFunction(() => document.querySelector("[data-settings-search-status]")?.textContent.includes("没有找到"));
    assert.equal(await page.locator('[data-settings-search-result="adminStorageMeter"]').count(), 0, "ordinary member search exposed administrator storage");
    assert.equal(ordinary.fixture.requests.some(({ path }) => path === "/api/admin/r2-usage"), false, "ordinary member triggered administrator storage request");
    await page.fill("#settingsSearchInput", "安装");
    await page.waitForSelector('[data-settings-search-result="settingsInstallApp"]');
    await page.click('[data-settings-search-result="settingsInstallApp"]');
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsAppearance"]');
    assert.equal(await page.locator("#installAppButton").isVisible(), true, "early install event was lost before settings mounted");
    await page.click("#installAppButton");
    assert.equal(await page.evaluate(() => window.__fixturePromptCalls), 1, "install prompt was not invoked by the user action");
    await page.click("[data-settings-back]");
    await page.fill("#settingsSearchInput", "");
    await page.click("#closeSettingsDialog");
    assert.deepEqual(ordinary.errors, [], `ordinary settings page errors: ${ordinary.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(ordinary);
  }

  const admin = await openFixturePage({ viewport: { width: 1440, height: 900 }, session: adminSession });
  try {
    const { page } = admin;
    await openSettings(page);
    await page.fill("#settingsSearchInput", "R2");
    await page.waitForSelector('[data-settings-search-result="adminStorageMeter"]');
    assert.equal(await page.locator('[data-settings-search-result="adminStorageMeter"]').count(), 1);
    await page.click('[data-settings-search-result="adminStorageMeter"]');
    await page.waitForTimeout(50);
    assert.equal(admin.fixture.requests.some(({ path }) => path === "/api/admin/r2-usage"), true, "administrator storage did not request usage after navigation");
    assert.deepEqual(admin.errors, [], `administrator settings page errors: ${admin.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(admin);
  }
}

async function testSettingsTouchGeometry() {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const { page } = result;
    await openSettings(page);
    const header = await page.evaluate(() => ({
      title: document.querySelector(".settings-header")?.getBoundingClientRect().height || 0,
      search: document.querySelector(".settings-search")?.getBoundingClientRect().height || 0,
      close: document.querySelector("#closeSettingsDialog")?.getBoundingClientRect().height || 0,
    }));
    assert.ok(header.title + header.search < 210, `mobile settings top area remains too tall: ${JSON.stringify(header)}`);
    await page.click("#settings-tab-settingsAppearance");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsAppearance"]');
    const navigationHeights = await page.locator(".settings-primary-navigation-row").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
    assert.ok(navigationHeights.every((height) => height >= 92 && height <= 132), `primary navigation rows are not compact: ${navigationHeights.join(", ")}`);
    await page.click("[data-settings-back]");
    await page.click("#settings-tab-settingsTools");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsTools"]');
    const toolButtonHeights = await page.locator("[data-tool-order-move]").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    assert.ok(toolButtonHeights.length > 0 && toolButtonHeights.every((height) => height >= 44), `tool sort touch targets are too small: ${toolButtonHeights.join(", ")}`);
    assert.deepEqual(result.errors, [], `settings geometry page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

try {
  await testSettingsActionsAndRetention();
  await testEarlyInstallPromptAndRoleSearch();
  await testSettingsTouchGeometry();
  console.log("Settings reliability browser checks passed: cache actions, retention, install timing, role search, focus, clipboard failure, and touch geometry.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
