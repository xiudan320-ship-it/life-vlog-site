import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.RELEASE_BASE_URL || "https://life-vlog-site.pages.dev").replace(/\/+$/, "");
const backendUrl = "https://life-vlog-r2-upload.xiudan320-life.workers.dev";
const username = process.env.RELEASE_TEST_USERNAME;
const password = process.env.RELEASE_TEST_PASSWORD;
const displayName = process.env.RELEASE_TEST_DISPLAY_NAME || "呱噗救火大队";
const favoriteFixturePhotoId = process.env.RELEASE_TEST_FAVORITE_PHOTO_ID;
const favoriteFixtureTitle = process.env.RELEASE_TEST_FAVORITE_TITLE;
const screenshotDir = join(process.env.TEMP || process.cwd(), "life-vlog-release-qa");

if (!username || !password || !favoriteFixturePhotoId || !favoriteFixtureTitle) {
  console.error("Missing release test credentials or favorite fixture. Run test-release.ps1.");
  process.exit(1);
}

async function enableLocalBackendProxy(context) {
  if (!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(baseUrl)) return;
  const corsHeaders = {
    "access-control-allow-origin": baseUrl,
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
  };
  await context.route(`${backendUrl}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), ...corsHeaders },
    });
  });
}

const browser = await chromium.launch({ headless: true });

function attachRuntimeChecks(page, label) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label} console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "unknown";
    if (errorText === "net::ERR_ABORTED") return;
    errors.push(`${label} request failed: ${request.method()} ${request.url()} (${errorText})`);
  });
  return errors;
}

async function login(page, runtimeErrors) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#loginButton", { state: "visible", timeout: 30000 });
  await page.fill("#usernameInput", username);
  await page.fill("#passwordInput", password);
  const initialHint = await page.locator("#authHint").textContent();
  await page.click("#loginButton");
  try {
    await page.waitForFunction(
      (previousHint) => {
        const signedIn =
          document.querySelector("#loginButton")?.hidden === true &&
          document.querySelector("#logoutButton")?.hidden === false;
        const hint = document.querySelector("#authHint")?.textContent?.trim() || "";
        return signedIn || (
          hint &&
          hint !== previousHint &&
          hint !== "正在登录..." &&
          hint !== "登录成功。"
        );
      },
      initialHint?.trim() || "",
      { timeout: 30000 }
    );
  } catch (error) {
    const timedOutState = await page.evaluate(() => ({
      hint: document.querySelector("#authHint")?.textContent?.trim() || "",
      loginHidden: document.querySelector("#loginButton")?.hidden ?? true,
      logoutHidden: document.querySelector("#logoutButton")?.hidden ?? true,
    }));
    assert.fail(
      `test account login timed out: ${JSON.stringify(timedOutState)}` +
      (runtimeErrors.length ? `; ${runtimeErrors.slice(-5).join(" | ")}` : "") +
      `; ${error.message}`
    );
  }
  const loginState = await page.evaluate(() => ({
    signedIn:
      document.querySelector("#loginButton")?.hidden === true &&
      document.querySelector("#logoutButton")?.hidden === false,
    hint: document.querySelector("#authHint")?.textContent?.trim() || "",
  }));
  assert.ok(
    loginState.signedIn,
    `test account login failed: ${loginState.hint || "unknown"}` +
    (runtimeErrors.length ? `; ${runtimeErrors.slice(-5).join(" | ")}` : "")
  );
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.document <= dimensions.viewport + 1,
    `${label} horizontal overflow: ${dimensions.document}px > ${dimensions.viewport}px`
  );
}

async function assertAccountIdentity(page, label) {
  await page.waitForFunction(
    () => {
      const avatar = document.querySelector("#avatarImage");
      return avatar && !avatar.hidden && avatar.complete && avatar.naturalWidth > 0;
    },
    undefined,
    { timeout: 20000 }
  );
  const identity = await page.evaluate(() => ({
    displayName: document.querySelector("#profileName")?.textContent?.trim() || "",
    avatarHidden: document.querySelector("#avatarImage")?.hidden ?? true,
    avatarLoaded: (document.querySelector("#avatarImage")?.naturalWidth || 0) > 0,
  }));
  assert.equal(identity.displayName, displayName, `${label} display name mismatch`);
  assert.equal(identity.avatarHidden, false, `${label} avatar is hidden`);
  assert.equal(identity.avatarLoaded, true, `${label} avatar did not load`);
}

async function assertWeekendAlbumFlow(page, label) {
  await page.click("#weekendNav");
  await page.waitForSelector("#weekendPage:not([hidden])");
  await page.waitForSelector(".weekend-scenes [data-weekend-gallery]", { state: "visible", timeout: 20000 });
  const target = await page.evaluate(() => {
    const scenes = [...document.querySelectorAll(".weekend-scenes")];
    return scenes
      .map((scene, sceneIndex) => ({
        sceneIndex,
        photoCount: scene.querySelectorAll("[data-weekend-gallery]").length,
      }))
      .sort((left, right) => right.photoCount - left.photoCount)[0];
  });
  assert.ok(target?.photoCount > 0, `${label} weekend album has no photos`);
  await page.locator(".weekend-scenes").nth(target.sceneIndex).locator("[data-weekend-gallery]").first().click();
  await page.waitForSelector("#weekendAlbumDialog[open]", { timeout: 10000 });
  assert.equal(
    await page.locator("[data-weekend-album-image]").count(),
    target.photoCount,
    `${label} weekend album window is incomplete`
  );
  assert.equal(await page.locator("#photoDialog").evaluate((dialog) => dialog.open), false, `${label} first click opened the lightbox`);
  await page.waitForFunction(
    () => [...document.querySelectorAll("#weekendAlbumDialog img")]
      .filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      })
      .every((image) => image.complete && image.naturalWidth > 0),
    undefined,
    { timeout: 20000 }
  );
  await page.waitForTimeout(250);
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: join(screenshotDir, `weekend-album-${label}.png`) });
  await page.locator("[data-weekend-album-image]").first().click();
  await page.waitForSelector("#photoDialog[open]", { timeout: 10000 });
  await page.click("#closeDialog");
}

async function assertWishlistReceiptFlow(page, label, runtimeErrors) {
  await page.click("#wishlistNav");
  await page.waitForSelector("#wishlistPage:not([hidden])");
  await page.click('[data-wish-view="done"]');
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#wishlistList .wish-card.done").length > 0 ||
      !document.querySelector("#wishlistList [data-account-sync-loading]"),
    undefined,
    { timeout: 30000 }
  );

  const completedWishCount = await page.locator("#wishlistList .wish-card.done").count();
  if (!completedWishCount) {
    const syncMessage = await page.evaluate(() => ({
      wishlist: document.querySelector("#wishlistList")?.textContent?.trim() || "",
      status: document.querySelector("#globalStatus")?.textContent?.trim() || "",
    }));
    assert.fail(
      `${label} completed wishes unavailable: ${syncMessage.wishlist || "empty"}` +
      (syncMessage.status ? `; ${syncMessage.status}` : "") +
      (runtimeErrors.length ? `; ${runtimeErrors.slice(-5).join(" | ")}` : "")
    );
  }

  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  const state = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll("#wishTabs [data-wish-view]")].map((button) => ({
      view: button.dataset.wishView,
      active: button.classList.contains("active"),
      selected: button.getAttribute("aria-selected"),
      background: getComputedStyle(button).backgroundColor,
    })),
    activeBackground: (() => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--accent-strong)";
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    })(),
    cards: [...document.querySelectorAll("#wishlistList .wish-card.done")].map((card) => {
      const receipt = card.querySelector(".wish-completion-note");
      const header = receipt?.querySelector(".wish-completion-header");
      const body = receipt?.querySelector(":scope > p");
      const actions = card.querySelector(".wish-actions");
      const cardRect = card.getBoundingClientRect();
      const receiptRect = receipt?.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      const bodyRect = body?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();
      return {
        hasReceipt: Boolean(receipt),
        receiptInside:
          Boolean(receiptRect) &&
          receiptRect.left >= cardRect.left - 1 &&
          receiptRect.right <= cardRect.right + 1 &&
          receiptRect.bottom <= cardRect.bottom + 1,
        headerBodyOverlap: Boolean(headerRect && bodyRect && headerRect.bottom > bodyRect.top + 1),
        actionsInside: !actionsRect || actionsRect.bottom <= cardRect.bottom + 1,
      };
    }),
    loadingVisible: Boolean(document.querySelector("#wishlistList [data-account-sync-loading]")),
  }));

  const openTab = state.tabs.find((tab) => tab.view === "open");
  const doneTab = state.tabs.find((tab) => tab.view === "done");
  assert.equal(openTab?.active, false, `${label} unfinished tab remained active`);
  assert.equal(openTab?.selected, "false", `${label} unfinished tab aria state mismatch`);
  assert.equal(doneTab?.active, true, `${label} completed tab is not active`);
  assert.equal(doneTab?.selected, "true", `${label} completed tab aria state mismatch`);
  assert.equal(doneTab?.background, state.activeBackground, `${label} completed tab active color mismatch`);
  assert.notEqual(openTab?.background, doneTab?.background, `${label} wishlist tabs are visually indistinguishable`);
  assert.ok(state.cards.length > 0, `${label} completed wishlist is empty`);
  assert.equal(state.loadingVisible, false, `${label} wishlist still shows a loading state`);
  state.cards.forEach((card, index) => {
    assert.equal(card.hasReceipt, true, `${label} wish ${index + 1} has no completion receipt`);
    assert.equal(card.receiptInside, true, `${label} wish ${index + 1} receipt overflows its card`);
    assert.equal(card.headerBodyOverlap, false, `${label} wish ${index + 1} receipt text overlaps`);
    assert.equal(card.actionsInside, true, `${label} wish ${index + 1} actions overflow its card`);
  });

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: join(screenshotDir, `wishlist-done-${label}.png`), fullPage: true });
  await page.locator("[data-view-wish-detail]").first().click();
  try {
    await page.waitForSelector("#photoDialog.wish-detail-dialog[open]", { timeout: 10000 });
  } catch (error) {
    assert.fail(
      `${label} wish detail did not open` +
      (runtimeErrors.length ? `; ${runtimeErrors.slice(-5).join(" | ")}` : "") +
      `; ${error.message}`
    );
  }
  const feedback = await page.evaluate(() => ({
    visible: !document.querySelector("#wishDialogFeedback")?.hidden,
    text: document.querySelector("#wishDialogFeedbackText")?.textContent?.trim() || "",
  }));
  assert.equal(feedback.visible, true, `${label} completion feedback is hidden in the detail view`);
  assert.ok(feedback.text, `${label} completion feedback is blank in the detail view`);
  await page.click("#closeDialog");
}

async function waitForSignedInAccount(page, label) {
  await page.waitForFunction(
    (expectedName) =>
      document.querySelector("#logoutButton")?.hidden === false &&
      document.querySelector("#profileName")?.textContent?.trim() === expectedName,
    displayName,
    { timeout: 30000 }
  );
  await assertAccountIdentity(page, `${label} account after reload`);
}

async function findFavoriteFixture(page) {
  await page.click("#galleryNav");
  await page.waitForSelector("#galleryFilters");
  await page.fill("#diarySearchInput", favoriteFixtureTitle);
  const card = page.locator(`[data-photo-id="${favoriteFixturePhotoId}"]`);
  await card.waitFor({ state: "visible", timeoutMs: 30000 });
  return card;
}

async function assertFavoriteRoundTrip(page, label) {
  let card = await findFavoriteFixture(page);
  let button = card.locator("[data-favorite-index]", {});
  assert.equal(await button.getAttribute("aria-pressed"), "false", `${label} fixture starts favorited`);
  await button.click();
  await page.waitForFunction(
    (photoId) => document.querySelector(`[data-photo-id="${photoId}"] [data-favorite-index]`)?.getAttribute("aria-pressed") === "true",
    favoriteFixturePhotoId,
    { timeout: 10000 }
  );

  await page.reload();
  await waitForSignedInAccount(page, label);
  await page.click('[data-filter="favorites"]');
  await page.fill("#diarySearchInput", favoriteFixtureTitle);
  card = page.locator(`[data-photo-id="${favoriteFixturePhotoId}"]`);
  await card.waitFor({ state: "visible", timeoutMs: 30000 });
  button = card.locator("[data-favorite-index]", {});
  assert.equal(await button.getAttribute("aria-pressed"), "true", `${label} favorite did not persist after reload`);
  await button.click();
  await page.waitForFunction(
    (photoId) => !document.querySelector(`[data-photo-id="${photoId}"]`),
    favoriteFixturePhotoId,
    { timeout: 10000 }
  );

  await page.click('[data-filter="全部"]');
  card = page.locator(`[data-photo-id="${favoriteFixturePhotoId}"]`);
  await card.waitFor({ state: "visible", timeoutMs: 30000 });
  assert.equal(
    await card.locator("[data-favorite-index]", {}).getAttribute("aria-pressed"),
    "false",
    `${label} favorite was not removed`
  );
  await page.fill("#diarySearchInput", "");
}

async function assertModularViews(page, label) {
  await page.click("#recipesToolOpen");
  await page.waitForSelector("#recipesPage:not([hidden])");
  await page.waitForFunction(() => (document.querySelector("#recipesList")?.textContent || "").trim().length > 0);
  await assertNoHorizontalOverflow(page, `${label} recipes`);
  await page.screenshot({ path: join(screenshotDir, `modules-recipes-${label}.png`), fullPage: true });

  await page.click("#foodWheelOpen");
  await page.waitForSelector("#foodWheelDialog[open]");
  assert.ok(await page.locator("#foodOptions [data-remove-food]").count() >= 2, `${label} food wheel has too few options`);
  await assertNoHorizontalOverflow(page, `${label} food wheel`);
  await page.screenshot({ path: join(screenshotDir, `modules-food-wheel-${label}.png`) });
  await page.click("#foodWheelClose");

  await page.click("#anniversaryOpen");
  await page.waitForSelector("#anniversaryDialog[open]");
  await page.waitForFunction(() => Boolean(document.querySelector("#anniversaryList")));
  await assertNoHorizontalOverflow(page, `${label} anniversaries`);
  await page.screenshot({ path: join(screenshotDir, `modules-anniversary-${label}.png`) });
  await page.click("#anniversaryClose");

  await page.click("#thanksOpen");
  await page.waitForSelector("#thanksPage:not([hidden])");
  await page.waitForFunction(() => (document.querySelector("#thanksBoard")?.textContent || "").trim().length > 0);
  await assertNoHorizontalOverflow(page, `${label} gratitude`);

  await page.click("#notificationButton");
  await page.waitForSelector("#notificationDialog[open]");
  await page.waitForFunction(() => (document.querySelector("#notificationList")?.textContent || "").trim().length > 0);
  await page.click("#closeNotificationDialog");

  await page.click("#avatarButton");
  await page.waitForSelector("#vipPopoverBadge", { state: "visible" });
  await page.click("#vipPopoverBadge");
  await page.waitForSelector("#vipDialog[open]");
  assert.equal(await page.locator("#vipLevels .vip-level").count(), 5, `${label} VIP levels are incomplete`);
  await assertNoHorizontalOverflow(page, `${label} VIP center`);
  await page.screenshot({ path: join(screenshotDir, `modules-vip-${label}.png`) });
  await page.click("#closeVipDialog");
}

try {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
  });
  await enableLocalBackendProxy(desktopContext);
  const desktop = await desktopContext.newPage();
  const desktopErrors = attachRuntimeChecks(desktop, "desktop");
  await login(desktop, desktopErrors);
  await desktop.waitForSelector(".topbar");
  await desktop.waitForSelector("#userMenu:not([hidden])");
  await assertAccountIdentity(desktop, "desktop account");
  await desktop.click("#avatarButton");
  await desktop.waitForSelector("#accountSettingsButton", { state: "visible" });
  await desktop.click("#avatarButton");
  await desktop.waitForSelector("#accountSettingsButton", { state: "hidden" });
  await assertNoHorizontalOverflow(desktop, "desktop home");

  await assertModularViews(desktop, "desktop");
  await assertWishlistReceiptFlow(desktop, "desktop", desktopErrors);
  await assertFavoriteRoundTrip(desktop, "desktop");
  await desktop.click("#galleryNav");
  await desktop.waitForSelector("#galleryFilters");
  await assertWeekendAlbumFlow(desktop, "desktop");
  await assertNoHorizontalOverflow(desktop, "desktop navigation");
  assert.deepEqual(desktopErrors, [], desktopErrors.join("\n"));
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  await enableLocalBackendProxy(mobileContext);
  const mobile = await mobileContext.newPage();
  const mobileErrors = attachRuntimeChecks(mobile, "mobile");
  await login(mobile, mobileErrors);
  await mobile.waitForSelector(".topbar");
  await mobile.waitForSelector("#userMenu:not([hidden])");
  await assertAccountIdentity(mobile, "mobile account");
  await mobile.click("#avatarButton");
  await mobile.waitForSelector("#accountSettingsButton", { state: "visible" });
  await mobile.click("#avatarButton");
  await mobile.waitForSelector("#accountSettingsButton", { state: "hidden" });
  await assertModularViews(mobile, "mobile");
  await assertWishlistReceiptFlow(mobile, "mobile", mobileErrors);
  await assertFavoriteRoundTrip(mobile, "mobile");
  await mobile.click("#galleryNav");
  await mobile.waitForSelector("#galleryFilters");
  await assertWeekendAlbumFlow(mobile, "mobile");
  await assertNoHorizontalOverflow(mobile, "mobile navigation");
  assert.deepEqual(mobileErrors, [], mobileErrors.join("\n"));
  await mobileContext.close();

  console.log(`Release smoke checks passed: ${baseUrl} (desktop + mobile). Screenshots: ${screenshotDir}`);
} finally {
  await browser.close();
}
