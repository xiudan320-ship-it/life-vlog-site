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
const adminPseudoSession = {
  ...pseudoSession,
  user: {
    ...pseudoSession.user,
    user_metadata: { ...pseudoSession.user.user_metadata, username: "xiudan320", login_username: "xiudan320" },
  },
};

function scriptUrls(page) {
  return page.__cScriptUrls || [];
}

async function installFeedMotionMediaFixture(page) {
  await page.addInitScript(() => {
    const mediaSrc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
    const currentSrc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentSrc");
    const paused = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "paused");
    const duration = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "duration");
    const isFeedMotion = (element) => element?.classList?.contains("feed-motion-preview");
    const isDiaryDetailMotion = (element) => element?.id === "dialogVideo" || element?.classList?.contains("mobile-diary-video");
    const isFixtureMotion = (element) => isFeedMotion(element) || isDiaryDetailMotion(element);
    const setPaused = (element, value) => {
      Object.defineProperty(element, "paused", { configurable: true, get: () => value });
    };
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      configurable: true,
      get() {
        return isFixtureMotion(this) && this.__fixtureMotionSrc !== undefined
          ? this.__fixtureMotionSrc
          : mediaSrc?.get?.call(this) || currentSrc?.get?.call(this) || "";
      },
      set(value) {
        if (isFixtureMotion(this)) {
          this.__fixtureMotionSrc = String(value || "");
          return;
        }
        mediaSrc?.set?.call(this, value);
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "currentSrc", {
      configurable: true,
      get() {
        return isFixtureMotion(this) ? this.__fixtureMotionSrc || "" : currentSrc?.get?.call(this) || "";
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      configurable: true,
      get() {
        if (isFixtureMotion(this) && this.__fixtureMotionDuration !== undefined) return this.__fixtureMotionDuration;
        return duration?.get?.call(this) ?? NaN;
      },
    });
    const nativeRemoveAttribute = Element.prototype.removeAttribute;
    Element.prototype.removeAttribute = function removeAttribute(name) {
      if (name === "src" && isFixtureMotion(this)) this.__fixtureMotionSrc = "";
      return nativeRemoveAttribute.call(this, name);
    };
    const nativeLoad = HTMLMediaElement.prototype.load;
    HTMLMediaElement.prototype.load = function load() {
      if (!isFixtureMotion(this)) return nativeLoad.call(this);
      if (!this.getAttribute("src") && !this.__fixtureMotionSrc) {
        setPaused(this, true);
        Object.defineProperty(this, "networkState", { configurable: true, get: () => HTMLMediaElement.NETWORK_EMPTY });
        return;
      }
      this.__fixtureMotionDuration = this.__fixtureMotionSrc?.includes("fixture-long-video") ? 8.01 : 4;
      queueMicrotask(() => {
        this.dispatchEvent(new Event("loadedmetadata"));
        this.dispatchEvent(new Event("canplay"));
      });
    };
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play() {
      if (!isFixtureMotion(this)) return nativePlay.call(this);
      setPaused(this, false);
      return Promise.resolve();
    };
    const nativePause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function pause() {
      if (!isFixtureMotion(this)) return nativePause.call(this);
      setPaused(this, true);
    };
    void paused;
  });
}

async function openFixturePage({ viewport, authenticated = true, path = "/", fixtureOptions = {}, session = pseudoSession, secretUnlocked = false, mockFeedMotion = false } = {}) {
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
    await page.addInitScript(({ session: initialSession, secretUnlocked: shouldUnlock }) => {
      localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(initialSession));
      if (shouldUnlock) {
        sessionStorage.setItem("life-vlog-secret-unlock:fixture-user", JSON.stringify({ unlockedAt: Date.now(), leftAt: 0 }));
      }
    }, { session, secretUnlocked });
  }
  if (mockFeedMotion) await installFeedMotionMediaFixture(page);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  if (path === "/") {
    await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  }
  await page.waitForFunction(
    () => performance.getEntriesByName("remote-sync-complete").length > 0,
    null,
    { timeout: 10000 },
  );
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

async function testSecretPhotoViewer(browser) {
  const result = await openFixturePage({
    viewport: { width: 390, height: 844 },
    path: "/?page=secret",
    fixtureOptions: { seedSecretPhoto: true },
    secretUnlocked: true,
  });
  try {
    const page = result.page;
    await page.waitForSelector("#secretPage:not([hidden])");
    await page.locator('[data-secret-album-card="fixture-secret-item"]').click();
    const photo = page.locator('[data-secret-photo="0"]');
    await photo.waitFor({ state: "visible" });
    await photo.click();
    await page.waitForSelector("#photoDialog[open].secret-image-dialog", { state: "attached", timeout: 10000 });
    await page.waitForFunction(() => {
      const image = document.querySelector("#dialogImage");
      return Boolean(image?.getAttribute("src") && !image.classList.contains("is-loading"));
    }, null, { timeout: 10000 });
    const openState = await page.evaluate(() => ({
      dialogOpen: document.querySelector("#photoDialog")?.open,
      secretDialog: document.querySelector("#photoDialog")?.classList.contains("secret-image-dialog"),
      imageSrc: document.querySelector("#dialogImage")?.getAttribute("src") || "",
      statusHidden: document.querySelector("#secretViewerStatus")?.hidden,
    }));
    assert.equal(openState.dialogOpen, true, "secret photo viewer did not open");
    assert.equal(openState.secretDialog, true, "secret photo opened without secret viewer mode");
    assert.ok(openState.imageSrc, "secret photo viewer did not render the image");
    assert.equal(openState.statusHidden, true, "loaded secret photo left a loading status visible");
    await page.keyboard.press("Escape");
    await page.waitForSelector("#photoDialog:not([open])", { state: "attached", timeout: 10000 });
    await page.waitForFunction(
      () => document.activeElement?.matches('[data-secret-photo="0"]'),
      null,
      { timeout: 10000 },
    );
    const closeState = await page.evaluate(() => ({
      htmlLocked: document.documentElement.classList.contains("dialog-scroll-locked"),
      bodyLocked: document.body.classList.contains("dialog-scroll-locked"),
      focusReturned: document.activeElement?.matches('[data-secret-photo="0"]'),
    }));
    assert.equal(closeState.htmlLocked, false, "closing secret viewer left the document scroll locked");
    assert.equal(closeState.bodyLocked, false, "closing secret viewer left the body scroll locked");
    assert.equal(closeState.focusReturned, true, "closing secret viewer did not restore photo focus");
    assert.deepEqual(result.errors, [], `secret photo viewer page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testDynamicDiaryFilters(browser) {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const page = result.page;
    const options = await page.locator("#diaryFilterChips .chip").evaluateAll((buttons) => buttons.map((button) => ({
      value: button.dataset.filter,
      label: button.getAttribute("aria-label") || "",
      pressed: button.getAttribute("aria-pressed"),
    })));
    assert.deepEqual(options.slice(0, 3).map(({ value }) => value), ["全部", "featured7", "favorites"]);
    assert.ok(options.filter(({ value }) => !["全部", "featured7", "favorites"].includes(value)).every(({ label }) => !label.endsWith("，0篇")), "ordinary zero-count category was rendered");

    const travel = page.locator('#diaryFilterChips [data-filter="旅行"]');
    await travel.focus();
    await travel.click();
    await page.waitForFunction(() => document.querySelector('#diaryFilterChips [data-filter="旅行"]')?.getAttribute("aria-pressed") === "true");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.filter), "旅行", "filter redraw did not preserve chip focus");
    assert.deepEqual(await page.locator("#gallery .photo-card").evaluateAll((cards) => cards.map((card) => card.dataset.photoId)), ["fixture-offscreen-photo", "fixture-last-photo"]);

    await page.fill("#diarySearchInput", "offscreen");
    await page.waitForFunction(() => document.querySelectorAll("#gallery .photo-card").length === 1);
    assert.equal(await page.locator("#gallery .photo-card").getAttribute("data-photo-id"), "fixture-offscreen-photo", "category and search did not combine with AND semantics");
    assert.equal(result.errors.length, 0, `dynamic filter page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testFeedMediaRetryLifecycle(browser) {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const page = result.page;
    await page.locator("#feedLoader").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => document.querySelector("#feedLoader")?.classList.contains("complete"),
      null,
      { timeout: 10000 },
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const image = page.locator('[data-photo-id="fixture-photo"] img.feed-image').first();
    const shell = page.locator('[data-photo-id="fixture-photo"] .feed-media-shell').first();
    await image.evaluate((element) => {
      element.dataset.canonicalSrc = "/__fixture-media/retry-fail.jpg";
      element.src = element.dataset.canonicalSrc;
    });
    await page.waitForFunction(
      () => document.querySelector('[data-photo-id="fixture-photo"] .feed-media-shell')?.dataset.mediaState === "error",
      null,
      { timeout: 10000 },
    );
    const retry = shell.locator("[data-media-retry]");
    assert.equal(await retry.isHidden(), false, "first failed image did not expose retry");
    await retry.click();
    await page.waitForFunction(
      () => document.querySelector('[data-photo-id="fixture-photo"] .feed-media-shell')?.dataset.mediaState === "error",
      null,
      { timeout: 10000 },
    );
    assert.equal(await retry.isHidden(), false, "repeated image failure lost the retry action");
    assert.equal(await image.evaluate((element) => element.classList.contains("is-loaded")), false);
    assert.equal(result.errors.length, 0, `repeated image retry page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function openSettingsFromAccount(page) {
  await page.click("#avatarButton");
  await page.click("#accountSettingsButton");
  await page.waitForSelector("#settingsDialog[open]", { state: "attached", timeout: 10000 });
}

async function testSettingsRegistryInteractions(browser) {
  const mobile = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const page = mobile.page;
    await openSettingsFromAccount(page);
    assert.equal(await page.locator("#settingsDialog [data-settings-section]").count(), 5);
    assert.equal(await page.locator("[data-settings-nav]").getAttribute("role"), null, "mobile settings retained tablist semantics");

    const initialLayout = await page.evaluate(() => {
      const dialog = document.querySelector("#settingsDialog");
      const sidebar = dialog?.querySelector(".settings-sidebar");
      const content = dialog?.querySelector(".settings-content");
      const close = dialog?.querySelector(":scope > .dialog-close");
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { width: box.width, right: box.right, bottom: box.bottom };
      };
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        dialog: rect(dialog),
        sidebar: rect(sidebar),
        content: rect(content),
        close: rect(close),
        sidebarDisplay: sidebar ? getComputedStyle(sidebar).display : "none",
        contentDisplay: content ? getComputedStyle(content).display : "none",
      };
    });
    assert.ok(initialLayout.dialog?.width <= initialLayout.viewportWidth, "mobile settings dialog exceeded the viewport");
    assert.ok(initialLayout.documentWidth <= initialLayout.viewportWidth, "mobile settings created horizontal overflow");
    assert.equal(initialLayout.sidebarDisplay, "grid", "mobile settings category list is not visible");
    assert.equal(initialLayout.contentDisplay, "none", "mobile settings opened a hidden child panel");
    assert.ok(initialLayout.sidebar?.right <= initialLayout.dialog?.right + 1, "mobile settings category list overflowed its dialog");
    assert.ok(initialLayout.close?.bottom < initialLayout.sidebar?.bottom, "mobile settings close control is not in the dialog");

    await page.click("#settings-tab-settingsTools");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsTools"]');
    assert.equal(await page.locator(".settings-sidebar").isVisible(), false);
    assert.equal(await page.locator("#settingsTools").isVisible(), true);
    assert.ok(await page.locator("#settingsToolOrderList [data-tool-order-move]").count() > 0, "mobile tools settings did not render tool order controls");
    assert.equal(mobile.errors.length, 0, `mobile tools settings emitted page errors: ${mobile.errors.join(" | ")}`);
    await page.click("[data-settings-back]");
    await page.waitForFunction(() => !document.querySelector("#settingsDialog")?.dataset.mobileSettingsSection);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "settings-tab-settingsTools", "mobile tools back did not restore category focus");

    await page.click("#settings-tab-settingsStorage");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsStorage"]');
    assert.equal(await page.locator(".settings-sidebar").isVisible(), false);
    assert.equal(await page.locator("#settingsStorage").isVisible(), true);
    const cacheLimitSummary = await page.locator("#settingsCacheLimitValue").textContent();
    assert.match(cacheLimitSummary || "", /^日记 \d+ MB · 秘藏 \d+ MB$/, `cache capacity summary is invalid: ${cacheLimitSummary}`);
    assert.equal((cacheLimitSummary || "").includes("undefined"), false, "cache capacity summary exposed an undefined limit");
    assert.equal(await page.locator("#settingsStorage [data-performance-copy]").count(), 1);
    assert.equal(await page.locator("#settingsStorage [data-run-diagnostics]").count(), 1);
    const childLayout = await page.evaluate(() => {
      const dialog = document.querySelector("#settingsDialog");
      const content = dialog?.querySelector(".settings-content");
      const header = dialog?.querySelector(".settings-mobile-header");
      const close = dialog?.querySelector(":scope > .dialog-close");
      const heading = header?.querySelector("h3");
      const back = header?.querySelector("[data-settings-back]");
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { top: box.top, right: box.right, bottom: box.bottom, width: box.width };
      };
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        dialog: rect(dialog),
        content: rect(content),
        header: rect(header),
        heading: rect(heading),
        back: rect(back),
        close: rect(close),
        contentDisplay: content ? getComputedStyle(content).display : "none",
        headerDisplay: header ? getComputedStyle(header).display : "none",
        contentClientWidth: content?.clientWidth || 0,
        contentScrollWidth: content?.scrollWidth || 0,
      };
    });
    assert.ok(childLayout.dialog?.width <= childLayout.viewportWidth, "mobile settings child dialog exceeded the viewport");
    assert.ok(childLayout.documentWidth <= childLayout.viewportWidth, "mobile settings child panel created horizontal overflow");
    assert.equal(childLayout.contentDisplay, "block", "mobile settings child content did not fill the dialog");
    assert.equal(childLayout.headerDisplay, "flex", "mobile settings child header is not visible");
    assert.ok(childLayout.content?.width > 300, "mobile settings child content was squeezed into a desktop grid column");
    assert.ok(childLayout.contentScrollWidth <= childLayout.contentClientWidth + 1, "mobile settings child content overflowed horizontally");
    assert.ok(childLayout.heading?.top >= childLayout.close?.bottom - 1, "mobile settings child title is covered by the close control");
    assert.ok(childLayout.back?.top >= childLayout.close?.bottom - 1, "mobile settings back control is covered by the close control");
    await page.click("[data-settings-back]");
    await page.waitForFunction(() => !document.querySelector("#settingsDialog")?.dataset.mobileSettingsSection);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "settings-tab-settingsStorage", "mobile settings back did not restore category focus");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => (
      document.querySelector("[data-settings-nav]")?.getAttribute("role") === "tablist"
      && document.querySelector("#settings-tab-settingsStorage")?.getAttribute("role") === "tab"
      && document.querySelector("#settings-tab-settingsStorage")?.getAttribute("aria-selected") === "true"
      && document.querySelector("#settings-tab-settingsStorage")?.getAttribute("tabindex") === "0"
    ));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => (
      document.querySelector("[data-settings-nav]")?.getAttribute("role") === null
      && document.querySelector("#settings-tab-settingsStorage")?.getAttribute("role") === null
      && document.querySelector("#settings-tab-settingsStorage")?.getAttribute("tabindex") === null
      && document.querySelector("#settings-tab-settingsStorage")?.getAttribute("aria-selected") === null
    ));
    await page.click("#settings-tab-settingsStorage");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsStorage"]');
    const policyButton = page.locator("#mediaCachePolicyButton");
    assert.equal(await policyButton.getAttribute("aria-pressed"), "true", "automatic cache did not render its enabled state");
    await policyButton.click();
    await page.waitForFunction(
      () => (
        document.querySelector("#mediaCachePolicyButton em")?.textContent === "已关闭"
        && document.querySelector("#mediaCachePolicyButton")?.getAttribute("aria-pressed") === "false"
      ),
      null,
      { timeout: 3000 },
    );
    await page.waitForSelector("#settingsDialog .mini-toast.visible", { state: "visible", timeout: 3000 });
    const policyFeedback = await page.evaluate(() => {
      const dialog = document.querySelector("#settingsDialog");
      const toast = dialog?.querySelector(".mini-toast");
      return {
        buttonLabel: dialog?.querySelector("#mediaCachePolicyButton em")?.textContent || "",
        toastVisible: Boolean(toast?.classList.contains("visible")),
        toastInsideDialog: Boolean(toast?.closest("#settingsDialog")),
      };
    });
    assert.equal(policyFeedback.buttonLabel, "已关闭", "automatic cache toggle did not update its label");
    assert.equal(policyFeedback.toastVisible, true, "automatic cache toggle did not show visible feedback");
    assert.equal(policyFeedback.toastInsideDialog, true, "settings feedback was mounted outside the open dialog");
    await page.click("#closeSettingsDialog");
    await page.waitForFunction(() => !document.querySelector("#settingsDialog")?.open);
    await page.waitForFunction(() => document.querySelectorAll(".mini-toast").length === 0, null, { timeout: 3000 });
    assert.equal(await page.locator("body > .mini-toast-host").count(), 0, "settings feedback remained behind the closed dialog");
  } finally {
    await closeFixturePage(mobile);
  }

  const desktop = await openFixturePage({ viewport: { width: 1440, height: 900 } });
  try {
    const page = desktop.page;
    await openSettingsFromAccount(page);
    assert.equal(await page.locator("[data-settings-nav]").getAttribute("role"), "tablist");
    assert.equal(await page.locator('[data-settings-section][role="tab"]').count(), 5);
    await page.locator("#settings-tab-settingsAppearance").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector("#settings-tab-settingsAccount")?.getAttribute("aria-selected") === "true");
    await page.keyboard.press("End");
    await page.waitForFunction(() => document.querySelector("#settings-tab-settingsStorage")?.getAttribute("aria-selected") === "true");
    await page.keyboard.press("Home");
    await page.waitForFunction(() => document.querySelector("#settings-tab-settingsAppearance")?.getAttribute("aria-selected") === "true");
    assert.equal(desktop.errors.length, 0, `settings page errors: ${desktop.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(desktop);
  }
}

async function testShoppingDeleteDialogAppearance(browser) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const result = await openFixturePage({ viewport, path: "/?page=wishlist" });
    try {
      const page = result.page;
      await page.click('[data-wishlist-module="shopping"]');
      await page.waitForSelector("#shoppingContent:not([hidden])");
      await page.waitForSelector('[data-shopping-id="fixture-shopping"]');
      await page.click('[data-shopping-menu="fixture-shopping"]');
      await page.waitForSelector('.shopping-action-dialog[open]');
      await page.click('[data-shopping-action="delete"]');
      const dialog = page.locator("dialog.action-confirm-dialog");
      await dialog.waitFor({ state: "visible" });
      const layout = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const symbol = element.querySelector(".wish-delete-symbol");
        const buttons = [...element.querySelectorAll(".wish-delete-actions button")].map((button) => {
          const buttonRect = button.getBoundingClientRect();
          return { width: buttonRect.width, height: buttonRect.height };
        });
        return {
          width: rect.width,
          viewportWidth: window.innerWidth,
          overflowX: element.scrollWidth > element.clientWidth,
          hasSvgIcon: Boolean(symbol?.querySelector("svg.list-icon")),
          symbolText: symbol?.textContent?.trim() || "",
          buttons,
        };
      });
      assert.ok(layout.width <= Math.min(500, layout.viewportWidth - 20), `shopping delete dialog is too wide: ${JSON.stringify(layout)}`);
      assert.equal(layout.overflowX, false, `shopping delete dialog overflowed: ${JSON.stringify(layout)}`);
      assert.equal(layout.hasSvgIcon, true, "shopping delete dialog did not use the shared SVG icon");
      assert.equal(layout.symbolText, "", "shopping delete dialog retained a structural text glyph");
      assert.ok(layout.buttons.every(({ width, height }) => width >= 120 && height >= 44), `shopping delete dialog actions are too small: ${JSON.stringify(layout)}`);
      await dialog.locator('button[value="cancel"]').click();
      await page.waitForFunction(() => !document.querySelector("dialog.action-confirm-dialog"));
      assert.equal(result.errors.length, 0, `shopping delete dialog errors: ${result.errors.join(" | ")}`);
    } finally {
      await closeFixturePage(result);
    }
  }
}

async function testMobileDiaryActionsAndCategoryPicker(browser) {
  const owner = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const page = owner.page;
    await page.locator('[data-photo-id="fixture-photo"] .feed-media-shell > button').click();
    await page.waitForSelector("body.mobile-diary-page-open");
    assert.equal(await page.locator(".mobile-diary-actions > button").count(), 3, "mobile diary exposed more than three first-level actions");
    const sizes = await page.locator(".mobile-diary-actions > button").evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return [rect.width, rect.height];
    }));
    assert.ok(sizes.every(([width, height]) => width >= 44 && height >= 44), `mobile diary action target is too small: ${JSON.stringify(sizes)}`);
    const actionLayout = await page.locator(".mobile-diary-actions").evaluate((container) => ({
      display: getComputedStyle(container).display,
      buttons: [...container.querySelectorAll("button")].map((button) => {
        const rect = button.getBoundingClientRect();
        return { display: getComputedStyle(button).display, width: rect.width, height: rect.height };
      }),
    }));
    assert.equal(actionLayout.display, "grid", "mobile diary action layout CSS was not loaded with the gallery route");
    assert.ok(actionLayout.buttons.every(({ display, width, height }) => display === "flex" && width >= 100 && height >= 44), `mobile diary action layout is misaligned: ${JSON.stringify(actionLayout)}`);
    const more = page.locator("[data-mobile-diary-more]");
    await more.click();
    await page.waitForSelector("[data-mobile-diary-more-sheet][open]");
    assert.equal(await page.locator("[data-mobile-diary-more-sheet] .mobile-diary-more-divider").count(), 1);
    assert.equal(await page.locator("[data-mobile-diary-more-sheet] button.danger").count(), 1);
    const sheetLayout = await page.locator("[data-mobile-diary-more-sheet]").evaluate((sheet) => ({
      contentDisplay: getComputedStyle(sheet.querySelector(".mobile-diary-more-content")).display,
      actionDisplay: getComputedStyle(sheet.querySelector("button")).display,
      actionWidth: sheet.querySelector("button").getBoundingClientRect().width,
      actionHeight: sheet.querySelector("button").getBoundingClientRect().height,
    }));
    assert.equal(sheetLayout.contentDisplay, "grid", "mobile diary more sheet content CSS was not loaded with the gallery route");
    assert.ok(sheetLayout.actionDisplay === "flex" && sheetLayout.actionWidth >= 300 && sheetLayout.actionHeight >= 48, `mobile diary more sheet is misaligned: ${JSON.stringify(sheetLayout)}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("[data-mobile-diary-more-sheet]")?.open);
    assert.equal(await page.evaluate(() => document.activeElement?.matches("[data-mobile-diary-more]")), true, "more sheet did not restore trigger focus");
  } finally {
    await closeFixturePage(owner);
  }

  const admin = await openFixturePage({ viewport: { width: 390, height: 844 }, session: adminPseudoSession });
  try {
    const page = admin.page;
    await page.locator('[data-photo-id="fixture-admin-photo"] .feed-media-shell > button').click();
    await page.waitForSelector("body.mobile-diary-page-open");
    await page.click("[data-mobile-diary-admin-category]");
    await page.waitForSelector("#adminCategoryDialog[open]");
    assert.match(await page.locator("#adminCategoryTitle").textContent(), /修改日记分类/);
    assert.match(await page.locator(".admin-category-context").textContent(), /Fixture admin diary/);
    assert.match(await page.locator(".admin-category-context").textContent(), /当前分类：城市/);
    assert.ok(await page.locator("[data-category-option]").count() >= 2);
    assert.equal(await page.locator('[data-category-option][value="宠物"]').count(), 1, "admin category picker did not expose the pet category");
    await page.locator('[data-category-option][value="食物"]').check();
    await page.click("[data-category-save]");
    await page.waitForFunction(() => !document.querySelector("#adminCategoryDialog")?.open);
    await page.waitForFunction(() => document.querySelector(".mobile-diary-meta")?.textContent.includes("食物"));
    assert.equal(await page.evaluate(() => document.activeElement?.matches("[data-mobile-diary-admin-category]")), true, "category picker did not restore focus after rerender");
    await page.click("[data-mobile-diary-more]");
    await page.waitForSelector('[data-mobile-diary-more-sheet][open] [data-mobile-diary-more-action="delete"]');
    await page.click('[data-mobile-diary-more-action="delete"]');
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-photo-id="fixture-admin-photo"]'));
    await page.waitForFunction(() => !document.body.classList.contains("mobile-diary-page-open"));
    assert.equal(admin.fixture.writes.some(({ path, action }) => path === "/api/rpc/admin_delete_photo" && action === "admin_delete_photo"), true, "admin diary deletion did not use the administrator RPC");
    assert.equal(admin.errors.length, 0, `category picker page errors: ${admin.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(admin);
  }

  const adminDesktop = await openFixturePage({ viewport: { width: 1440, height: 900 }, session: adminPseudoSession });
  try {
    const page = adminDesktop.page;
    const deleteButton = page.locator('[data-photo-id="fixture-admin-photo"] [data-delete-index]');
    assert.equal(await deleteButton.count(), 1, "desktop administrator cannot see the diary delete action");
    await deleteButton.click();
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-photo-id="fixture-admin-photo"]'));
    assert.equal(adminDesktop.fixture.writes.some(({ path, action }) => path === "/api/rpc/admin_delete_photo" && action === "admin_delete_photo"), true, "desktop administrator deletion did not use the administrator RPC");
    assert.deepEqual(adminDesktop.errors, [], `desktop administrator deletion errors: ${adminDesktop.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(adminDesktop);
  }
}

async function testOrdinaryVideoLifecycle(browser) {
  const desktop = await openFixturePage({ viewport: { width: 1440, height: 900 }, mockFeedMotion: true });
  try {
    const page = desktop.page;
    const card = page.locator('[data-photo-id="fixture-camera-talent-video"]');
    await card.waitFor({ state: "visible" });
    await card.scrollIntoViewIfNeeded();
    await card.locator("video.feed-motion-preview").waitFor({ state: "attached", timeout: 10000 });
    const feedState = await page.evaluate(() => {
      const videos = [...document.querySelectorAll("video.feed-motion-preview")];
      const active = videos.filter((video) => !video.paused);
      const distances = [...document.querySelectorAll("img.feed-image[data-motion-src]")]
        .map((image) => {
          const rect = image.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= innerHeight) return null;
          return {
            id: image.closest("[data-photo-id]")?.dataset.photoId || "",
            distance: Math.hypot((rect.left + rect.right) / 2 - innerWidth / 2, (rect.top + rect.bottom) / 2 - innerHeight / 2),
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.distance - right.distance);
      return {
        videoCount: videos.length,
        activeCount: active.length,
        muted: active[0]?.muted,
        controls: active[0]?.controls,
        pointerEvents: active[0] ? getComputedStyle(active[0]).pointerEvents : "",
        loop: active[0]?.loop,
        badge: document.querySelector('[data-photo-id="fixture-camera-talent-video"] .live-photo-badge')?.textContent?.trim() || "",
        activeId: active[0]?.closest("[data-photo-id]")?.dataset.photoId || "",
        distances,
      };
    });
    assert.ok(feedState.videoCount >= 1, "ordinary video did not enter the feed motion coordinator");
    assert.equal(feedState.activeCount, 1, `feed motion did not keep one active preview: ${JSON.stringify(feedState)}`);
    assert.equal(feedState.muted, true);
    assert.equal(feedState.controls, false);
    assert.equal(feedState.pointerEvents, "none");
    assert.equal(feedState.loop, true, "eight-second fixture video was not configured to loop");
    assert.equal(feedState.badge, "VIDEO");
    assert.equal(feedState.activeId, feedState.distances[0]?.id, `feed motion did not choose the visual-center candidate: ${JSON.stringify(feedState)}`);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(80);
    assert.equal(await page.locator("video.feed-motion-preview").count(), 0, "background tab kept a feed preview mounted");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.locator("video.feed-motion-preview").first().waitFor({ state: "attached", timeout: 10000 });

    const longCard = page.locator('[data-photo-id="fixture-long-video"]');
    await longCard.scrollIntoViewIfNeeded();
    await longCard.locator("video.feed-motion-preview").waitFor({ state: "attached", timeout: 10000 });
    assert.deepEqual(await longCard.locator("video.feed-motion-preview").evaluate((video) => ({ loop: video.loop, duration: video.duration })), { loop: false, duration: 8.01 });
    await longCard.locator("video.feed-motion-preview").evaluate((video) => video.dispatchEvent(new Event("ended")));
    await page.waitForTimeout(100);
    assert.equal(await longCard.locator("video.feed-motion-preview").count(), 0, "long video restarted after ended in the same mount");

    await card.locator(".feed-media-shell > button").click();
    await page.waitForSelector("#photoDialog[open]", { state: "attached" });
    const desktopVideo = page.locator("#dialogVideo");
    await page.waitForFunction(() => document.querySelector("#dialogVideo")?.paused === false);
    assert.deepEqual(await desktopVideo.evaluate((video) => ({
      hidden: video.hidden,
      autoplay: video.autoplay,
      muted: video.muted,
      loop: video.loop,
      controls: video.controls,
      paused: video.paused,
    })), { hidden: false, autoplay: true, muted: true, loop: false, controls: true, paused: false });
    await page.keyboard.press("Escape");
    await page.waitForSelector("#photoDialog:not([open])", { state: "attached" });
    await page.click('[data-primary-nav-id="weekend"]');
    await page.waitForSelector("#weekendPage:not([hidden])", { state: "attached" });
    assert.equal(await page.locator("video.feed-motion-preview").count(), 0, "route switch left a feed preview mounted");
    await page.evaluate(() => document.querySelector("#dialogVideo")?.dispatchEvent(new Event("canplay")));
    await page.waitForFunction(() => document.querySelector("#dialogVideoStatus")?.hidden === true);
    assert.equal(desktop.errors.length, 0, `desktop video page errors: ${desktop.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(desktop);
  }

  const mobile = await openFixturePage({ viewport: { width: 390, height: 844 }, mockFeedMotion: true });
  try {
    const page = mobile.page;
    const card = page.locator('[data-photo-id="fixture-camera-talent-video"]');
    await card.locator(".feed-media-shell > button").click();
    await page.waitForSelector("body.mobile-diary-page-open");
    const video = page.locator(".mobile-diary-video");
    await page.waitForFunction(() => document.querySelector(".mobile-diary-video")?.paused === false);
    assert.deepEqual(await video.evaluate((element) => ({
      autoplay: element.autoplay,
      muted: element.muted,
      controls: element.controls,
    })), { autoplay: true, muted: true, controls: true });
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
    await page.locator('[data-photo-id="fixture-camera-talent-video"] .feed-media-shell > button').click();
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
  await browserContext.addInitScript((session) => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(session));
  }, pseudoSession);
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
    ["gallery", "vlog", "weekend"],
    ["weekend", "gallery", "vlog", "wishlist", "weekend"],
  ];
  for (let round = 0; round < 30; round += 1) {
    const sequence = sequences[round % sequences.length];
    await page.evaluate((ids) => {
      ids.forEach((id) => document.querySelector(`[data-primary-nav-id="${id}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    }, sequence);
  }
  await page.waitForSelector("#weekendPage:not([hidden])", { state: "attached", timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector("main")?.hasAttribute("aria-busy") && !document.querySelector("main")?.hasAttribute("data-route-busy"));
  await page.waitForFunction(() => document.querySelectorAll('[aria-current="page"]').length <= 1);
  const result = await page.evaluate(() => ({
    href: location.href,
    current: document.querySelector('[aria-current="page"]')?.dataset.primaryNavId || "",
    historyDelta: history.length - window.__rapidHistoryStart,
    busy: document.querySelector("main")?.hasAttribute("aria-busy") || document.querySelector("main")?.hasAttribute("data-route-busy"),
    rejections: window.__rapidNavigationRejections,
  }));
  // The previous gallery state is the only history entry that should remain
  // behind the final intent; delayed obsolete route loads cannot push entries.
  assert.equal(result.href.includes("page=weekend"), true, `latest navigation did not win: ${JSON.stringify(result)}`);
  assert.equal(result.current, "weekend");
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

function deepCommentFixture() {
  return Array.from({ length: 9 }, (_, index) => ({
    id: `fixture-deep-comment-${index + 1}`,
    photo_id: "fixture-photo",
    user_id: index % 2 ? "fixture-member" : "fixture-user",
    body: index === 0
      ? "根留言：这是一段用于移动端宽度回归的中文长句。"
      : `第 ${index} 层回复：中文内容保持可读宽度，连续英文 ABCDEFGHIJKLMNOPQRSTUVWXYZ 和 URL https://fixture.example/comments/${index}/very-long-path 不应让整行横向溢出。`,
    parent_id: index ? `fixture-deep-comment-${index}` : null,
    created_at: `2030-01-02T00:0${index}:00.000Z`,
  }));
}

async function testMobileDeepCommentLayout(browser) {
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ]) {
    const result = await openFixturePage({
      viewport,
      fixtureOptions: { photoComments: deepCommentFixture() },
    });
    try {
      const page = result.page;
      await page.locator('[data-photo-id="fixture-photo"] .photo-media button').first().click();
      await page.waitForSelector("body.mobile-diary-page-open", { state: "attached", timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll(".mobile-diary-comments .photo-comment").length === 9, null, { timeout: 10000 });
      const metrics = await page.evaluate(() => {
        const section = document.querySelector(".mobile-diary-comments");
        const list = section?.querySelector(".photo-comments-list");
        const form = section?.querySelector("[data-mobile-diary-comment-form]");
        const rows = [...section?.querySelectorAll(":scope .photo-comments-list > .photo-comment") || []];
        const mainRects = rows.map((row) => row.querySelector(".photo-comment-main")?.getBoundingClientRect()).filter(Boolean);
        const body = rows[0]?.querySelector("p");
        const bodyStyle = body ? getComputedStyle(body) : null;
        const actionButtons = [...section?.querySelectorAll(".photo-comment-actions button") || []].map((button) => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
        const actionStyle = section?.querySelector(".photo-comment-actions")
          ? getComputedStyle(section.querySelector(".photo-comment-actions"))
          : null;
        const rect = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width };
        };
        return {
          viewport: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          rowCount: rows.length,
          nestedRows: list?.querySelectorAll(".photo-comment .photo-comment").length || 0,
          depthLeftDelta: mainRects.length ? Math.max(...mainRects.map(({ left }) => left)) - Math.min(...mainRects.map(({ left }) => left)) : Infinity,
          mainWidths: mainRects.map(({ width }) => width),
          bodyFontSize: bodyStyle ? Number.parseFloat(bodyStyle.fontSize) : 0,
          bodyLineHeight: bodyStyle ? Number.parseFloat(bodyStyle.lineHeight) / Number.parseFloat(bodyStyle.fontSize) : 0,
          bodyOverflowWrap: bodyStyle?.overflowWrap || "",
          bodyWordBreak: bodyStyle?.wordBreak || "",
          actionButtons,
          actionGap: actionStyle ? Number.parseFloat(actionStyle.columnGap || actionStyle.gap) : 0,
          section: rect(section),
          list: rect(list),
          form: rect(form),
          lastRow: rect(rows.at(-1)),
        };
      });
      assert.ok(metrics.documentWidth <= metrics.viewport + 1, `${viewport.width}x${viewport.height} deep comments overflowed horizontally: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.rowCount, 9, `${viewport.width}x${viewport.height} deep comments lost rows`);
      assert.equal(metrics.nestedRows, 0, `${viewport.width}x${viewport.height} deep comments still render recursively`);
      assert.ok(metrics.depthLeftDelta <= 4, `${viewport.width}x${viewport.height} reply rows drifted horizontally: ${JSON.stringify(metrics)}`);
      const minimumMainWidth = viewport.width === 320 ? 205 : viewport.width === 375 ? 260 : 0;
      if (minimumMainWidth) assert.ok(metrics.mainWidths.every((width) => width >= minimumMainWidth), `${viewport.width}px comment body became too narrow: ${JSON.stringify(metrics.mainWidths)}`);
      assert.ok(metrics.bodyFontSize >= 16 && metrics.bodyLineHeight >= 1.55 && metrics.bodyLineHeight <= 1.7, `${viewport.width}x${viewport.height} body typography regressed: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.bodyOverflowWrap, "anywhere", `${viewport.width}x${viewport.height} long text does not use anywhere wrapping`);
      assert.notEqual(metrics.bodyWordBreak, "break-all", `${viewport.width}x${viewport.height} body uses destructive break-all wrapping`);
      assert.ok(metrics.actionButtons.length > 0 && metrics.actionButtons.every(({ width, height }) => width >= 44 && height >= 44), `${viewport.width}x${viewport.height} comment actions missed the 44px target: ${JSON.stringify(metrics.actionButtons)}`);
      assert.ok(metrics.actionGap >= 8, `${viewport.width}x${viewport.height} comment actions are too close: ${metrics.actionGap}`);
      assert.ok(metrics.form && metrics.list && Math.abs(metrics.form.width - metrics.list.width) <= 1, `${viewport.width}x${viewport.height} comment form did not fill the list width: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.form && metrics.lastRow && metrics.form.top >= metrics.lastRow.bottom - 1 && metrics.form.top - metrics.lastRow.bottom <= 40, `${viewport.width}x${viewport.height} comment form left the normal list flow: ${JSON.stringify(metrics)}`);
      assert.equal(result.errors.length, 0, `${viewport.width}x${viewport.height} deep comment page errors: ${result.errors.join(" | ")}`);
    } finally {
      await closeFixturePage(result);
    }
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
  await testSecretPhotoViewer(browser);
  await testDynamicDiaryFilters(browser);
  await testFeedMediaRetryLifecycle(browser);
  await testSettingsRegistryInteractions(browser);
  await testShoppingDeleteDialogAppearance(browser);
  await testMobileDiaryActionsAndCategoryPicker(browser);
  await testOrdinaryVideoLifecycle(browser);
  await testRapidNavigationLatestWins(browser);
  await testPhotoEditorLazyBoundary(browser);
  await testWeekendComposerAndDelete(browser);
  await testMobileCommentComposer(browser);
  await testMobileDeepCommentLayout(browser);
  await testFixtureSecretCrud(browser);
  console.log("C performance and interaction boundaries passed: lazy features, weekend forms, deletion focus, and deep mobile comment layout.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
