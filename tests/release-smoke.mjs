import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createCloudflareApiFixture, cloudflareFixtureWorkerUrl } from "./fixtures/cloudflare-api-fixture.mjs";

const baseUrl = (process.env.RELEASE_BASE_URL || "https://life-vlog-site.pages.dev").replace(/\/+$/, "");
const authenticatedGalleryRequestBudget = 35;
const pseudoSession = {
  access_token: "fixture-token",
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  user: { id: "fixture-user", email: "fixture-user@life-vlog.local", user_metadata: { username: "fixture-user" } },
};
const adminPseudoSession = {
  ...pseudoSession,
  user: {
    ...pseudoSession.user,
    user_metadata: { ...pseudoSession.user.user_metadata, username: "xiudan320", login_username: "xiudan320" },
  },
};

function runtimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function installFeedMotionMediaFixture(page) {
  await page.addInitScript(() => {
    const sourceDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
    const currentSourceDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentSrc");
    const durationDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "duration");
    const isFeedMotion = (element) => element?.classList?.contains("feed-motion-preview");
    const isDiaryDetailMotion = (element) => element?.id === "dialogVideo" || element?.classList?.contains("mobile-diary-video");
    const isFixtureMotion = (element) => isFeedMotion(element) || isDiaryDetailMotion(element);
    const setPaused = (element, value) => Object.defineProperty(element, "paused", { configurable: true, get: () => value });
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      configurable: true,
      get() { return isFixtureMotion(this) ? this.__fixtureMotionSrc || sourceDescriptor?.get?.call(this) || currentSourceDescriptor?.get?.call(this) || "" : currentSourceDescriptor?.get?.call(this) || ""; },
      set(value) {
        if (isFixtureMotion(this)) this.__fixtureMotionSrc = String(value || "");
        else sourceDescriptor?.set?.call(this, value);
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "currentSrc", {
      configurable: true,
      get() { return isFixtureMotion(this) ? this.__fixtureMotionSrc || "" : currentSourceDescriptor?.get?.call(this) || ""; },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      configurable: true,
      get() {
        if (isFixtureMotion(this) && this.__fixtureMotionDuration !== undefined) return this.__fixtureMotionDuration;
        return durationDescriptor?.get?.call(this) ?? NaN;
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
  });
}

async function openFixturePage(browser, {
  path = "/",
  authenticated = true,
  scenario = "ok",
  delayMs = 0,
  serviceWorkers = "block",
  corrupt = false,
  corruptSession = false,
  expired = false,
  reducedMotion = "no-preference",
  saveData = false,
  viewport = { width: 390, height: 844 },
  session = pseudoSession,
  secretUnlocked = false,
  seedSecretPhoto = false,
  mockFeedMotion = false,
  notifications = [],
  notificationDelayMs = 0,
  notificationFailureCount = 0,
  notificationFailureMode = "server",
} = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers, reducedMotion });
  const fixture = createCloudflareApiFixture({
    scenario,
    delayMs,
    seedSecretPhoto,
    notifications,
    notificationDelayMs,
    notificationFailureCount,
    notificationFailureMode,
  });
  await fixture.install(context);
  if (saveData) {
    await context.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true, effectiveType: "4g", type: "wifi" } }));
  }
  const page = await context.newPage();
  const errors = runtimeErrors(page);
  const scripts = [];
  const requests = [];
  page.on("request", (request) => {
    requests.push({ url: request.url(), type: request.resourceType() });
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  if (authenticated || corruptSession) {
    await page.addInitScript(({ session, broken, invalidSession, secretUnlocked: shouldUnlock }) => {
      localStorage.setItem("life-vlog-cloudflare-auth", invalidSession ? "{" : JSON.stringify(session));
      localStorage.setItem("life-vlog-recipes:fixture-user", broken ? "{" : JSON.stringify([]));
      localStorage.setItem("life-vlog-weekend-plans:fixture-user", broken ? "{" : JSON.stringify([]));
      if (shouldUnlock) sessionStorage.setItem("life-vlog-secret-unlock:fixture-user", JSON.stringify({ unlockedAt: Date.now(), leftAt: 0 }));
    }, {
      session: { ...session, expires_at: expired ? new Date(Date.now() - 1000).toISOString() : session.expires_at },
      broken: corrupt,
      invalidSession: corruptSession,
      secretUnlocked,
    });
  }
  if (mockFeedMotion) await installFeedMotionMediaFixture(page);
  const started = Date.now();
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 3000 });
  return { context, page, fixture, errors, scripts, requests, splashMs: Date.now() - started };
}

async function assertReady(result, label, { authenticated = true, allowHttpErrors = false } = {}) {
  const state = await result.page.evaluate(() => ({
    busy: document.body.getAttribute("aria-busy"),
    inert: document.body.inert,
    authHidden: document.querySelector("#authCard")?.hidden,
    userHidden: document.querySelector("#userMenu")?.hidden,
  }));
  assert.ok(result.splashMs <= 2000, `${label} splash took ${result.splashMs}ms`);
  assert.equal(state.busy, null, `${label} remained aria-busy`);
  assert.equal(state.inert, false, `${label} remained inert`);
  if (authenticated) {
    assert.equal(state.authHidden, true, `${label} still shows auth UI`);
    assert.equal(state.userHidden, false, `${label} did not expose user UI`);
  }
  const unexpected = allowHttpErrors ? result.errors.filter((error) => error.startsWith("pageerror:")) : result.errors;
  assert.deepEqual(unexpected, [], `${label} runtime errors: ${result.errors.join(" | ")}`);
}

function routeScripts(result) {
  return result.scripts;
}

async function testPublicShell(browser) {
  const shell = await openFixturePage(browser, { authenticated: false, viewport: { width: 1440, height: 900 } });
  try {
    await assertReady(shell, "anonymous shell", { authenticated: false });
    const manifest = await (await fetch(`${baseUrl}/manifest.webmanifest`, { cache: "no-store" })).json();
    assert.ok(manifest.icons?.some((icon) => icon.purpose === "maskable"), "maskable icon missing");
    const sw = await fetch(`${baseUrl}/sw.js`, { cache: "no-store" });
    assert.equal(sw.status, 200, "Service Worker unavailable");
    assert.match(sw.headers.get("cache-control") || "", /no-cache|no-store/);
    assert.equal(routeScripts(shell).some((url) => /(?:recipes|weekend|wardrobe|secret|settings)-route-/.test(url)), false, "anonymous gallery loaded page routes");
  } finally { await shell.context.close(); }
}

async function testAuthenticatedGallery(browser) {
  const result = await openFixturePage(browser, { corrupt: true, delayMs: 150, mockFeedMotion: true });
  try {
    await assertReady(result, "authenticated gallery");
    const page = result.page;
    await page.waitForTimeout(800);
    const initialRequestCount = result.requests.length;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const reads = result.fixture.requests.filter(({ method, path }) => method === "GET" && ["/api/table/secret_items", "/api/table/secret_folders"].includes(path));
      if (reads.length >= 2) break;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    const secretReads = result.fixture.requests.filter(({ method, path }) => method === "GET" && ["/api/table/secret_items", "/api/table/secret_folders"].includes(path));
    assert.equal(secretReads.length, 2, `gallery account sync did not read both secret tables: ${JSON.stringify(secretReads)}`);
    assert.equal(routeScripts(result).some((url) => /secret-route-/.test(url)), false, "gallery account sync loaded the secret UI route");
    assert.ok(initialRequestCount <= authenticatedGalleryRequestBudget, `authenticated gallery made ${initialRequestCount} initial requests (budget ${authenticatedGalleryRequestBudget})`);
    const initialMotionRequests = result.fixture.requests.filter(({ path }) => path === "/fixture-live.mov").length;
    assert.ok(initialMotionRequests <= 1, `initial live media requested ${initialMotionRequests} times`);
    assert.ok(result.fixture.requests.filter(({ path }) => path === "/fixture-camera-talent.mp4").length <= 1, "ordinary VLOG video was requested more than once in the feed");
    assert.equal(await page.locator('[data-photo-id="fixture-camera-talent-video"] .live-photo-badge').textContent(), "VIDEO");
    const initialMediaState = await page.evaluate(() => ({
      viewportBottom: window.innerHeight,
      status: document.querySelector("#globalStatus")?.textContent || "",
      cards: document.querySelectorAll(".photo-card").length,
      galleryText: document.querySelector("#gallery")?.textContent?.trim().slice(0, 200) || "",
      activeChips: [...document.querySelectorAll(".chip.active")].map((chip) => chip.dataset.filter || chip.textContent.trim()),
      motions: [...document.querySelectorAll("img.feed-image[data-motion-src]")].map((image) => ({
        id: image.closest("[data-photo-id]")?.dataset.photoId || "",
        overlay: Boolean(image.closest("[data-photo-id]")?.querySelector("video.feed-motion-preview")),
        top: Math.round(image.getBoundingClientRect().top),
      })),
    }));
    const farMotions = initialMediaState.motions.filter(({ top }) => top > initialMediaState.viewportBottom + 180);
    assert.ok(farMotions.length > 0, `fixture did not place live media beyond the near viewport: ${JSON.stringify({ ...initialMediaState, requests: result.fixture.requests })}`);
    assert.ok(farMotions.every(({ overlay }) => !overlay), `offscreen live media activated: ${JSON.stringify(initialMediaState)}`);
    assert.ok(result.fixture.requests.some(({ path }) => ["/fixture-far.mov", "/fixture-remote.mov"].includes(path)) === false, "far feed video was requested before entering its viewport");
    await page.evaluate(() => {
      for (let index = 0; index < 20; index += 1) window.scrollTo(0, index % 2 ? 2400 : 0);
    });
    await page.waitForTimeout(300);
    const mediaState = await page.evaluate(() => [...document.querySelectorAll("video.feed-motion-preview")].map((video) => ({
      currentSrc: video.currentSrc || "",
      paused: video.paused,
    })));
    assert.ok(mediaState.filter(({ paused, currentSrc }) => !paused && currentSrc).length <= 1, "more than one feed video is active");
    for (const path of ["/fixture-live.mov", "/fixture-offscreen.mov", "/fixture-far.mov", "/fixture-remote.mov", "/fixture-deep.mov", "/fixture-last.mov"]) {
      assert.ok(result.fixture.requests.filter((request) => request.path === path).length <= 1, `${path} was requested more than once`);
    }
    assert.equal(await page.locator('[data-primary-nav-id="gallery"]').isEnabled(), true, "gallery navigation is disabled");
    const forbidden = routeScripts(result).filter((url) => /(?:recipes|weekend|wardrobe|secret|settings)-route-/.test(url));
    assert.equal(forbidden.length, 0, `gallery cold start loaded route chunks: ${forbidden.join(", ")}`);
    await page.click('[data-primary-nav-id="wishlist"]');
    await page.waitForSelector("#wishlistPage:not([hidden])");
    await page.waitForSelector('[data-wish-id="fixture-wish"]', { timeout: 5000 });
    assert.equal(result.errors.some((error) => error.includes('Page controller "recipe" is not loaded')), false, "wishlist hit unloaded recipe controller");
    assert.equal(routeScripts(result).filter((url) => /recipes-route-/.test(url)).length, 0, "wishlist loaded recipe route");
    await page.click('[data-wishlist-module="shopping"]');
    await page.waitForSelector("#shoppingContent:not([hidden])");
    await page.waitForSelector('[data-toggle-shopping="fixture-shopping"]', { timeout: 5000 });
    await page.click('[data-toggle-shopping="fixture-shopping"]');
    await page.click('[data-shopping-filter="done"]');
    await page.waitForSelector('.shopping-card.completed[data-shopping-id="fixture-shopping"]');
    await page.click('[data-primary-nav-id="wardrobe"]');
    await page.waitForSelector('#wardrobePage:not([hidden]) [data-page-heading="wardrobe"]', { state: "visible", timeout: 10000 });
    assert.equal(result.errors.some((error) => error.includes("Wardrobe root is required")), false, "wardrobe route used an unmounted root");
    await page.click('[data-primary-nav-id="gallery"]');
    await page.waitForSelector("#gallery");
    assert.ok(result.fixture.requests.filter(({ path }) => path === "/fixture-live.mov").length <= 1, "returning to gallery requested the same live media twice");
    await page.click("#avatarButton");
    await page.click("#accountSettingsButton");
    await page.waitForSelector("#settingsDialog[open]");
    await page.click("#closeSettingsDialog");
    await page.click("#avatarButton");
    await page.click("#logoutButton");
    await page.waitForTimeout(500);
    const logoutState = await page.evaluate(() => ({
      authHidden: document.querySelector("#authCard")?.hidden ?? true,
      signedIn: document.body.classList.contains("signed-in"),
      status: document.querySelector("#globalStatus")?.textContent || "",
      hasSession: Boolean(localStorage.getItem("life-vlog-cloudflare-auth")),
    }));
    logoutState.errors = result.errors;
    assert.equal(logoutState.authHidden, false, `logout did not restore the auth card: ${JSON.stringify(logoutState)}`);
  } finally { await result.context.close(); }
}

async function testVideoDiaryPolicy(browser) {
  const desktop = await openFixturePage(browser, { viewport: { width: 1440, height: 900 }, mockFeedMotion: true });
  try {
    const page = desktop.page;
    await page.fill("#diarySearchInput", "摄影小天才");
    await page.waitForFunction(() => document.querySelectorAll("#gallery .photo-card").length === 1, null, { timeout: 10000 });
    const videoCard = page.locator('[data-photo-id="fixture-camera-talent-video"]');
    await videoCard.waitFor({ state: "visible" });
    await videoCard.scrollIntoViewIfNeeded();
    await page.locator('[data-photo-id="fixture-camera-talent-video"] video.feed-motion-preview').waitFor({ state: "attached", timeout: 10000 });
    assert.equal(await page.locator('[data-photo-id="fixture-camera-talent-video"] .live-photo-badge').textContent(), "VIDEO");
    assert.ok(await page.locator("video.feed-motion-preview").count() <= 1, "release feed mounted more than one preview");
    await page.getByRole("button", { name: "摄影小天才 Video" }).click();
    await page.waitForSelector("#photoDialog[open]");
    await page.waitForFunction(() => document.querySelector("#dialogVideo")?.paused === false);
    assert.deepEqual(await page.locator("#dialogVideo").evaluate((video) => ({
      hidden: video.hidden,
      autoplay: video.autoplay,
      muted: video.muted,
      controls: video.controls,
      paused: video.paused,
    })), { hidden: false, autoplay: true, muted: true, controls: true, paused: false });
  } finally { await desktop.context.close(); }

  const mobile = await openFixturePage(browser, { viewport: { width: 390, height: 844 }, mockFeedMotion: true });
  try {
    const page = mobile.page;
    await page.getByRole("button", { name: "摄影小天才 Video" }).click();
    await page.waitForSelector("body.mobile-diary-page-open");
    await page.waitForFunction(() => document.querySelector(".mobile-diary-video")?.paused === false);
    assert.deepEqual(await page.locator(".mobile-diary-video").evaluate((video) => ({
      autoplay: video.autoplay,
      muted: video.muted,
      controls: video.controls,
    })), { autoplay: true, muted: true, controls: true });
    assert.deepEqual(mobile.errors, [], `release video policy errors: ${mobile.errors.join(" | ")}`);
  } finally { await mobile.context.close(); }
}

async function testSecretPhotoViewer(browser) {
  const result = await openFixturePage(browser, {
    path: "/?page=secret",
    viewport: { width: 390, height: 844 },
    secretUnlocked: true,
    seedSecretPhoto: true,
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
    assert.equal(await page.locator("#photoDialog").isVisible(), true, "release secret photo viewer did not open");
    assert.equal(await page.locator("#secretViewerStatus").isHidden(), true, "release secret photo viewer stayed in loading state");
    await page.keyboard.press("Escape");
    await page.waitForSelector("#photoDialog:not([open])", { state: "attached", timeout: 10000 });
    await page.waitForFunction(() => document.activeElement?.matches('[data-secret-photo="0"]'), null, { timeout: 10000 });
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("dialog-scroll-locked")), false, "release secret viewer left the page locked");
    assert.deepEqual(result.errors, [], `release secret photo viewer errors: ${result.errors.join(" | ")}`);
  } finally { await result.context.close(); }
}

async function testDiaryImageUpload(browser) {
  const result = await openFixturePage(browser, { viewport: { width: 1440, height: 900 } });
  try {
    const page = result.page;
    await page.click("#uploadToggle");
    await page.setInputFiles("#photoInput", {
      name: "fixture-diary.jpg",
      mimeType: "image/jpeg",
      buffer: await readFile(new URL("../assets-source/home-logo.jpg", import.meta.url)),
    });
    await page.fill("#titleInput", "Fixture upload");
    await page.click("#uploadForm button[type=submit]");
    await page.waitForFunction(
      () => document.querySelector("#uploadStatus")?.textContent?.includes("上传完成"),
      null,
      { timeout: 10000 }
    );
    assert.ok(result.fixture.uploads.length >= 1, "fixture diary upload did not reach the Worker upload route");
    assert.equal(
      result.fixture.writes.some(({ path, action }) => path === "/api/table/photos" && action === "insert"),
      true,
      "fixture diary upload did not persist the photo row"
    );
    assert.deepEqual(result.errors, [], `diary upload runtime errors: ${result.errors.join(" | ")}`);
  } finally { await result.context.close(); }
}

async function openSettingsFromAccount(page) {
  await page.click("#avatarButton");
  await page.click("#accountSettingsButton");
  await page.waitForSelector("#settingsDialog[open]");
}

async function testGlobalLevelDialog(browser, viewport, label) {
  const result = await openFixturePage(browser, { viewport });
  try {
    const page = result.page;
    await page.click("#avatarButton");
    await page.waitForSelector("#userPopover:not([hidden])", { state: "visible" });
    await page.click("#xpPanel");
    await page.waitForSelector("#levelDialog[open]", { state: "visible" });
    await page.click("#closeLevelDialog");
    await page.waitForFunction(() => !document.querySelector("#levelDialog")?.open);

    await page.click("#vipBadge");
    await page.waitForSelector("#levelDialog[open]", { state: "visible" });
    await page.locator("#levelDialog").evaluate((dialog) => {
      dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(() => !document.querySelector("#levelDialog")?.open);

    assert.deepEqual(
      await page.evaluate(() => ({
        settingsOpen: Boolean(document.querySelector("#settingsDialog")?.open),
        levelOpen: Boolean(document.querySelector("#levelDialog")?.open),
      })),
      { settingsOpen: false, levelOpen: false },
      `${label} global level dialog flow left an unexpected dialog open`
    );
    assert.deepEqual(result.errors, [], `${label} global level dialog errors: ${result.errors.join(" | ")}`);
  } finally { await result.context.close(); }
}

async function testGlobalNotificationPanel(browser) {
  const notification = {
    notification_id: "fixture-notification",
    type: "thanks",
    actor_username: "Fixture User",
    body: "谢谢你的记录",
    is_read: false,
    created_at: "2030-01-02T00:00:00.000Z",
  };
  const slow = await openFixturePage(browser, {
    viewport: { width: 390, height: 844 },
    notifications: [notification],
    notificationDelayMs: 1200,
  });
  try {
    await assertReady(slow, "slow notification fixture");
    const page = slow.page;
    await page.waitForSelector("#notificationButton:not([hidden])", { state: "visible" });
    await page.click("#notificationButton");
    await page.waitForSelector("#notificationDialog[open]", { state: "visible" });
    await page.waitForSelector('[data-notification-state="loading"]', { state: "visible" });
    await page.click("#closeNotificationDialog");
    await page.waitForFunction(() => !document.querySelector("#notificationDialog")?.open);
    await page.waitForFunction(() => document.activeElement?.id === "notificationButton");
    await page.waitForTimeout(1500);
    assert.equal(await page.locator("#notificationDialog").isVisible(), false, "closed notification dialog reopened after loading");
    assert.ok(
      slow.fixture.requests.filter(({ method, path }) => method === "POST" && path === "/api/rpc/get_my_notifications").length <= 1,
      "slow notification loading was not deduplicated"
    );
    assert.deepEqual(slow.errors, [], `slow notification errors: ${slow.errors.join(" | ")}`);
  } finally { await slow.context.close(); }

  const success = await openFixturePage(browser, {
    viewport: { width: 390, height: 844 },
    notifications: [notification],
  });
  try {
    await assertReady(success, "successful notification fixture");
    const page = success.page;
    await page.waitForSelector("#notificationButton:not([hidden])", { state: "visible" });
    await page.locator("#notificationButton").evaluate((button) => {
      button.click();
      button.click();
    });
    await page.waitForSelector('[data-notification-id="fixture-notification"]', { state: "visible" });
    await page.locator("#notificationBadge").waitFor({ state: "hidden" });
    assert.equal(
      success.fixture.writes.some(({ path, action }) => path === "/api/table/notifications" && action === "update"),
      true,
      "notification read state was not persisted"
    );
    await page.click('[data-notification-id="fixture-notification"]');
    await page.waitForSelector("#thanksDialog[open]", { state: "visible" });
    await page.waitForFunction(() => !location.search.includes("page=thanks"));
    await page.waitForFunction(() => !document.querySelector("#notificationDialog")?.open);
    assert.deepEqual(success.errors, [], `successful notification errors: ${success.errors.join(" | ")}`);
  } finally { await success.context.close(); }

  const retry = await openFixturePage(browser, {
    viewport: { width: 390, height: 844 },
    notifications: [],
    notificationDelayMs: 900,
    notificationFailureCount: 1,
    notificationFailureMode: "offline",
  });
  try {
    await assertReady(retry, "retry notification fixture");
    const page = retry.page;
    await page.waitForSelector("#notificationButton:not([hidden])", { state: "visible" });
    await page.click("#notificationButton");
    await page.waitForSelector('[data-notification-state="error"]', { state: "visible", timeout: 10000 });
    assert.match(await page.locator('[data-notification-state="error"]').textContent(), /重试|网络/);
    await page.click("[data-notification-retry]");
    await page.waitForSelector('[data-notification-state="empty"]', { state: "visible", timeout: 10000 });
    assert.equal(
      retry.fixture.requests.filter(({ method, path }) => method === "POST" && path === "/api/rpc/get_my_notifications").length >= 2,
      true,
      "notification retry did not issue a second request"
    );
    assert.deepEqual(
      retry.errors.filter((error) => error.startsWith("pageerror:")),
      [],
      `retry notification page errors: ${retry.errors.join(" | ")}`
    );
  } finally { await retry.context.close(); }
}

async function testFilterSettingsAndActions(browser) {
  const filters = await openFixturePage(browser, { viewport: { width: 390, height: 844 } });
  try {
    const page = filters.page;
    const chips = page.locator("#diaryFilterChips .chip");
    assert.equal(await chips.count() >= 5, true, "release fixture did not render dynamic diary filters");
    const ordinary = await chips.evaluateAll((buttons) => buttons
      .filter((button) => !["全部", "featured7", "favorites"].includes(button.dataset.filter))
      .map((button) => button.getAttribute("aria-label") || ""));
    assert.equal(ordinary.every((label) => !label.endsWith("，0篇")), true, "release fixture rendered an empty ordinary category");
    await page.click('#diaryFilterChips [data-filter="旅行"]');
    await page.waitForFunction(() => document.querySelector('#diaryFilterChips [data-filter="旅行"]')?.getAttribute("aria-pressed") === "true");
    assert.equal(await page.locator("#gallery .photo-card").count(), 2, "release category filter result is incorrect");
    await page.fill("#diarySearchInput", "offscreen");
    await page.waitForFunction(() => document.querySelectorAll("#gallery .photo-card").length === 1);
    assert.equal(await page.locator("#gallery .photo-card").getAttribute("data-photo-id"), "fixture-offscreen-photo");
    await openSettingsFromAccount(page);
    assert.equal(await page.locator("#settingsDialog [data-settings-section]").count(), 5);
    await page.click("#settings-tab-settingsStorage");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsStorage"]');
    await page.click("[data-settings-back]");
    await page.waitForFunction(() => !document.querySelector("#settingsDialog")?.dataset.mobileSettingsSection);
    assert.deepEqual(filters.errors, [], `release filter/settings errors: ${filters.errors.join(" | ")}`);
  } finally { await filters.context.close(); }

  const owner = await openFixturePage(browser, { viewport: { width: 390, height: 844 } });
  try {
    const page = owner.page;
    await page.locator('[data-photo-id="fixture-photo"] .photo-media button:not([data-media-retry])').click();
    await page.waitForSelector("body.mobile-diary-page-open");
    assert.equal(await page.locator(".mobile-diary-actions > button").count(), 3);
    const actionLayout = await page.locator(".mobile-diary-actions").evaluate((container) => ({
      display: getComputedStyle(container).display,
      buttons: [...container.querySelectorAll("button")].map((button) => {
        const rect = button.getBoundingClientRect();
        return { display: getComputedStyle(button).display, width: rect.width, height: rect.height };
      }),
    }));
    assert.equal(actionLayout.display, "grid", "release mobile diary action layout CSS is missing");
    assert.ok(actionLayout.buttons.every(({ display, width, height }) => display === "flex" && width >= 100 && height >= 44), `release mobile diary action layout is misaligned: ${JSON.stringify(actionLayout)}`);
    await page.click("[data-mobile-diary-more]");
    await page.waitForSelector("[data-mobile-diary-more-sheet][open]");
    const sheetLayout = await page.locator("[data-mobile-diary-more-sheet]").evaluate((sheet) => ({
      contentDisplay: getComputedStyle(sheet.querySelector(".mobile-diary-more-content")).display,
      actionDisplay: getComputedStyle(sheet.querySelector("button")).display,
      actionWidth: sheet.querySelector("button").getBoundingClientRect().width,
      actionHeight: sheet.querySelector("button").getBoundingClientRect().height,
    }));
    assert.equal(sheetLayout.contentDisplay, "grid", "release mobile diary more sheet CSS is missing");
    assert.ok(sheetLayout.actionDisplay === "flex" && sheetLayout.actionWidth >= 300 && sheetLayout.actionHeight >= 48, `release mobile diary more sheet is misaligned: ${JSON.stringify(sheetLayout)}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("[data-mobile-diary-more-sheet]")?.open);
    assert.equal(await page.evaluate(() => document.activeElement?.matches("[data-mobile-diary-more]")), true);
    assert.deepEqual(owner.errors, [], `release mobile action errors: ${owner.errors.join(" | ")}`);
  } finally { await owner.context.close(); }

  const admin = await openFixturePage(browser, { viewport: { width: 390, height: 844 }, session: adminPseudoSession });
  try {
    const page = admin.page;
    await page.locator('[data-photo-id="fixture-admin-photo"] .photo-media button:not([data-media-retry])').click();
    await page.waitForSelector("body.mobile-diary-page-open");
    await page.click("[data-mobile-diary-admin-category]");
    await page.waitForSelector("#adminCategoryDialog[open]");
    assert.match(await page.locator(".admin-category-context").textContent(), /Fixture admin diary/);
    assert.match(await page.locator(".admin-category-context").textContent(), /当前分类：城市/);
    await page.locator('[data-category-option][value="食物"]').check();
    await page.click("[data-category-save]");
    await page.waitForFunction(() => !document.querySelector("#adminCategoryDialog")?.open);
    await page.waitForFunction(() => document.querySelector(".mobile-diary-meta")?.textContent.includes("食物"));
    assert.equal(await page.evaluate(() => document.activeElement?.matches("[data-mobile-diary-admin-category]")), true);
    await page.click("[data-mobile-diary-more]");
    await page.waitForSelector('[data-mobile-diary-more-sheet][open] [data-mobile-diary-more-action="delete"]');
    await page.click('[data-mobile-diary-more-action="delete"]');
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-photo-id="fixture-admin-photo"]'));
    await page.waitForFunction(() => !document.body.classList.contains("mobile-diary-page-open"));
    assert.equal(admin.fixture.writes.some(({ path, action }) => path === "/api/rpc/admin_delete_photo" && action === "admin_delete_photo"), true);
    assert.deepEqual(admin.errors, [], `release category picker errors: ${admin.errors.join(" | ")}`);
  } finally { await admin.context.close(); }

  const adminDesktop = await openFixturePage(browser, { viewport: { width: 1440, height: 900 }, session: adminPseudoSession });
  try {
    const page = adminDesktop.page;
    const deleteButton = page.locator('[data-photo-id="fixture-admin-photo"] [data-delete-index]');
    assert.equal(await deleteButton.count(), 1);
    await deleteButton.click();
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-photo-id="fixture-admin-photo"]'));
    assert.equal(adminDesktop.fixture.writes.some(({ path, action }) => path === "/api/rpc/admin_delete_photo" && action === "admin_delete_photo"), true);
    assert.deepEqual(adminDesktop.errors, [], `release desktop administrator deletion errors: ${adminDesktop.errors.join(" | ")}`);
  } finally { await adminDesktop.context.close(); }
}

async function testWeekendComposerAndDelete(browser) {
  const result = await openFixturePage(browser, { path: "/?page=weekend", viewport: { width: 390, height: 844 } });
  try {
    const page = result.page;
    await page.waitForSelector("#weekendPage:not([hidden])");
    await page.waitForSelector('[data-weekend-id="fixture-weekend"]');
    const initialCount = await page.locator("[data-weekend-id]").count();
    await page.click("#weekendToggle");
    await page.fill("#weekendTitleInput", "Release fixture weekend");
    await page.fill("#weekendLocationInput", "横滨");
    assert.ok(await page.locator("#weekendDateInput").inputValue(), "release weekend date was not initialized");
    await page.click("#weekendSubmitButton");
    await page.waitForFunction(() => document.querySelector("#weekendStatus")?.textContent.includes("周末计划已保存"), null, { timeout: 10000 });
    assert.equal(await page.locator("[data-weekend-id]").count(), initialCount + 1);
    assert.equal(await page.locator("#weekendForm").isHidden(), true);
    assert.equal(await page.locator(".list-item-updated").count(), 1);
    const deleteButton = page.locator('[data-delete-weekend="fixture-weekend"]');
    await deleteButton.click();
    await page.locator('dialog.action-confirm-dialog button[value="cancel"]').click();
    await page.waitForFunction(() => document.activeElement?.matches('[data-delete-weekend="fixture-weekend"]'));
    assert.deepEqual(result.errors, [], `release weekend errors: ${result.errors.join(" | ")}`);
  } finally { await result.context.close(); }
}

async function testMobileCommentComposer(browser) {
  const result = await openFixturePage(browser, { viewport: { width: 390, height: 844 } });
  try {
    const page = result.page;
    await page.waitForSelector('[data-photo-id="fixture-photo"]');
    await page.locator('[data-photo-id="fixture-photo"] .photo-media button').first().click();
    await page.waitForSelector("body.mobile-diary-page-open");
    const input = page.locator("[data-mobile-diary-comment-input]");
    await input.fill("第一行");
    await input.press("End");
    await input.press("Enter");
    await input.type("第二行");
    await page.locator('[data-mobile-diary-reply="fixture-comment"]').click();
    assert.equal(await input.inputValue(), "第一行\n第二行");
    await input.press("Control+Enter");
    await page.waitForFunction(() => document.querySelector("[data-mobile-diary-comment-status]")?.textContent.includes("留言已发送"), null, { timeout: 10000 });
    assert.equal(await input.inputValue(), "");
    assert.deepEqual(result.errors, [], `release mobile comment errors: ${result.errors.join(" | ")}`);
  } finally { await result.context.close(); }
}

async function testFixtureSecretCrud(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture();
  await fixture.install(context);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    const statuses = await page.evaluate(async (workerUrl) => {
      const headers = { Authorization: "Bearer fixture-token", "Content-Type": "application/json" };
      const request = (table, payload) => fetch(`${workerUrl}/api/table/${table}`, { method: "POST", headers, body: JSON.stringify(payload) });
      const folder = { id: "release-secret-folder", user_id: "fixture-user", name: "Release fixture folder", sort_order: 0 };
      const item = { id: "release-secret-item", user_id: "fixture-user", folder_id: folder.id, title: "Release fixture secret", images: "[]" };
      const responses = [
        await request("secret_folders", { action: "insert", values: folder }),
        await request("secret_items", { action: "insert", values: item }),
        await request("secret_items", { action: "update", filters: [{ op: "eq", column: "id", value: item.id }], values: { title: "Release fixture secret updated" } }),
        await request("secret_items", { action: "delete", filters: [{ op: "eq", column: "id", value: item.id }] }),
      ];
      return responses.map((response) => response.status);
    }, cloudflareFixtureWorkerUrl);
    assert.deepEqual(statuses, [200, 200, 200, 200]);
  } finally { await context.close(); }
}

async function testMotionPolicies(browser) {
  for (const options of [{ saveData: true }, { reducedMotion: "reduce" }]) {
    const result = await openFixturePage(browser, options);
    try {
      await assertReady(result, options.saveData ? "save-data gallery" : "reduced-motion gallery");
      await result.page.waitForTimeout(500);
      assert.equal(result.fixture.requests.filter(({ path }) => /\.(?:mov|mp4)$/.test(path)).length, 0, `${options.saveData ? "save-data" : "reduced-motion"} loaded feed video`);
      assert.equal(await result.page.locator("video.feed-motion-preview").count(), 0, `${options.saveData ? "save-data" : "reduced-motion"} activated feed video`);
      assert.ok(await result.page.locator(".live-photo-badge").count() >= 1, `${options.saveData ? "save-data" : "reduced-motion"} removed motion labels`);
    } finally { await result.context.close(); }
  }
}

async function testDeepLink(browser, pageName, delayMs) {
  const result = await openFixturePage(browser, { path: `/?page=${pageName}`, delayMs, corrupt: true });
  try {
    await assertReady(result, `${pageName} deep link`);
    await result.page.waitForSelector(`#${pageName}Page:not([hidden])`);
    const loaded = routeScripts(result).filter((url) => url.includes(`${pageName}-route-`));
    assert.equal(loaded.length, 1, `${pageName} route chunk loaded ${loaded.length} times`);
    const cacheKey = pageName === "recipes" ? "life-vlog-recipes:fixture-user" : "life-vlog-weekend-plans:fixture-user";
    assert.equal(await result.page.evaluate((key) => localStorage.getItem(key) !== null, cacheKey), true, `${pageName} cache scope missing`);
    if (pageName === "weekend") {
      await result.page.waitForSelector("[data-toggle-weekend]", { timeout: 10000 });
      await result.page.locator("[data-toggle-weekend]").first().click();
      await result.page.waitForSelector("#weekendCompletionDialog[open]");
      await result.page.click("#weekendCompletionSubmit");
      await result.page.waitForTimeout(500);
      await result.page.waitForSelector("[data-weekend-id].done", { timeout: 10000 });
    }
  } finally { await result.context.close(); }
}

async function testFailureMatrix(browser) {
  for (const scenario of ["authenticated-401", "api-500", "slow-api", "timeout"]) {
    const result = await openFixturePage(browser, { scenario, delayMs: scenario === "slow-api" ? 2200 : 0 });
    try { await assertReady(result, `${scenario} session`, { authenticated: scenario !== "authenticated-401", allowHttpErrors: true }); }
    finally { await result.context.close(); }
  }
  const expired = await openFixturePage(browser, { expired: true });
  try { await assertReady(expired, "expired session", { authenticated: false }); }
  finally { await expired.context.close(); }
  const corruptSession = await openFixturePage(browser, { authenticated: false, corruptSession: true });
  try { await assertReady(corruptSession, "corrupt session", { authenticated: false }); }
  finally { await corruptSession.context.close(); }
}

async function testOfflineReload(browser) {
  const result = await openFixturePage(browser, { authenticated: false, serviceWorkers: "allow" });
  try {
    await assertReady(result, "PWA first load", { authenticated: false });
    await result.page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).some((registration) => registration.active));
    await result.page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });
    await result.context.setOffline(true);
    await result.page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
    await result.page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 15000 });
    assert.equal(await result.page.locator("body").getAttribute("aria-busy"), null, "offline reload remained busy");
  } finally { await result.context.close(); }
}

const browser = await chromium.launch({ headless: true });
try {
  assert.match(baseUrl, /^https?:\/\//, "RELEASE_BASE_URL must be an absolute URL");
  assert.equal(cloudflareFixtureWorkerUrl, "https://life-vlog-r2-upload.xiudan320-life.workers.dev");
  await testPublicShell(browser);
  await testAuthenticatedGallery(browser);
  await testVideoDiaryPolicy(browser);
  await testSecretPhotoViewer(browser);
  await testDiaryImageUpload(browser);
  await testGlobalLevelDialog(browser, { width: 390, height: 844 }, "mobile account");
  await testGlobalLevelDialog(browser, { width: 1440, height: 900 }, "desktop account");
  await testGlobalNotificationPanel(browser);
  await testFilterSettingsAndActions(browser);
  await testWeekendComposerAndDelete(browser);
  await testMobileCommentComposer(browser);
  await testFixtureSecretCrud(browser);
  await testMotionPolicies(browser);
  await testDeepLink(browser, "recipes", 0);
  await testDeepLink(browser, "weekend", 200);
  await testFailureMatrix(browser);
  await testOfflineReload(browser);
  console.log(`Deterministic fixture release smoke passed: ${baseUrl}`);
} finally { await browser.close(); }
