import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";

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
  const fixtureAssetPath = relativePath.startsWith("tests/assets/")
    ? relativePath.slice("tests/".length)
    : relativePath;
  const primaryRoot = relativePath.startsWith("tests/") ? sourceRoot : root;
  const primaryPath = normalize(join(primaryRoot, fixtureAssetPath));
  const sourceFallbackPath = normalize(join(sourceRoot, fixtureAssetPath));
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

const localRegressionPort = 61234;
await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(localRegressionPort, "127.0.0.1", resolveListen);
});
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.document <= dimensions.viewport + 1,
    `${label} has horizontal overflow: ${dimensions.document}px > ${dimensions.viewport}px`
  );
}

async function testHomeShell(viewport, label, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__appSplashTrace = { seen: false, firstSeenVisible: false };
    const recordSplash = () => {
      const splash = document.querySelector("#appSplash");
      if (!splash) return;
      window.__appSplashTrace.seen = true;
      if (!splash.hidden && getComputedStyle(splash).display !== "none") {
        window.__appSplashTrace.firstSeenVisible = true;
      }
    };
    new MutationObserver(recordSplash).observe(document, {
      attributes: true,
      attributeFilter: ["class", "hidden"],
      childList: true,
      subtree: true,
    });
    recordSplash();
  });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const splashTrace = await page.evaluate(() => ({
    ...window.__appSplashTrace,
    role: document.querySelector("#appSplash")?.getAttribute("role") || "",
  }));
  assert.equal(splashTrace.seen, true, `${label} splash was not mounted in the initial shell`);
  assert.equal(splashTrace.firstSeenVisible, true, `${label} splash was not visible before app initialization`);
  assert.equal(splashTrace.role, "status", `${label} splash status semantics are missing`);
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
  if (reducedMotion === "reduce") {
    const splashMotion = await page.evaluate(() => ({
      mark: getComputedStyle(document.querySelector(".app-splash-mark")).animationName,
      copy: getComputedStyle(document.querySelector(".app-splash-copy")).animationName,
      progress: getComputedStyle(document.querySelector(".app-splash-progress i")).animationName,
    }));
    assert.equal(splashMotion.mark, "none", `${label} splash mark still animates with reduced motion`);
    assert.equal(splashMotion.copy, "none", `${label} splash copy still animates with reduced motion`);
    assert.equal(splashMotion.progress, "none", `${label} splash progress still animates with reduced motion`);
  }
  await page.waitForSelector(".topbar");
  assert.deepEqual(pageErrors, [], `${label} home shell runtime errors:\n${pageErrors.join("\n")}`);
  assert.equal(await page.locator("#brandName").textContent(), "咻蛋之家");
  assert.equal(await page.locator("body").getAttribute("aria-busy"), null, `${label} app stayed busy after boot`);
  const shellIsInteractive = await page.evaluate(() => ({
    header: document.querySelector("header")?.inert ?? true,
    main: document.querySelector("main")?.inert ?? true,
  }));
  assert.equal(shellIsInteractive.header, false, `${label} header stayed inert after boot`);
  assert.equal(shellIsInteractive.main, false, `${label} main stayed inert after boot`);
  await assertNoHorizontalOverflow(page, `${label} home shell`);

  const topbar = await page.locator(".topbar").boundingBox();
  assert.ok(topbar && topbar.width <= viewport.width + 1, `${label} topbar must fit viewport`);
  assert.ok(topbar && topbar.height >= 48 && topbar.height <= 190, `${label} topbar height is unstable`);
  await context.close();
}

async function testNavigationAndAuth(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
  await page.waitForSelector("#authCard:not([hidden])", { state: "visible", timeout: 30000 });

  const initialAuth = await page.evaluate(() => ({
    inviteHidden: document.querySelector("#inviteCodeField")?.hidden ?? false,
    loginHidden: document.querySelector("#loginButton")?.hidden ?? true,
    signupHidden: document.querySelector("#signupButton")?.hidden ?? true,
    forgotHidden: document.querySelector("#forgotPasswordButton")?.hidden ?? true,
    passwordAutocomplete: document.querySelector("#passwordInput")?.getAttribute("autocomplete") || "",
    labels: [...document.querySelectorAll(".auth-field > label")].map((label) => label.textContent.trim()),
  }));
  assert.equal(initialAuth.inviteHidden, true, `${label} invite field should be hidden in login mode`);
  assert.equal(initialAuth.loginHidden, false, `${label} login action should be visible by default`);
  assert.equal(initialAuth.signupHidden, true, `${label} signup action should be hidden by default`);
  assert.equal(initialAuth.forgotHidden, false, `${label} forgot-password action should be visible in login mode`);
  assert.equal(initialAuth.passwordAutocomplete, "current-password", `${label} login password autocomplete is incorrect`);
  assert.deepEqual(initialAuth.labels.slice(0, 2), ["用户名", "密码"], `${label} auth fields are missing visible labels`);

  await page.fill("#usernameInput", "luna");
  await page.fill("#passwordInput", "secret-password");
  await page.click("#authModeToggle");
  const signupAuth = await page.evaluate(() => ({
    inviteHidden: document.querySelector("#inviteCodeField")?.hidden ?? true,
    loginHidden: document.querySelector("#loginButton")?.hidden ?? true,
    signupHidden: document.querySelector("#signupButton")?.hidden ?? true,
    forgotHidden: document.querySelector("#forgotPasswordButton")?.hidden ?? true,
    passwordAutocomplete: document.querySelector("#passwordInput")?.getAttribute("autocomplete") || "",
    username: document.querySelector("#usernameInput")?.value || "",
    password: document.querySelector("#passwordInput")?.value || "",
    mode: document.querySelector("#authCard")?.dataset.authMode || "",
  }));
  assert.equal(signupAuth.inviteHidden, false, `${label} signup mode did not reveal invite field`);
  assert.equal(signupAuth.loginHidden, true, `${label} login action should hide in signup mode`);
  assert.equal(signupAuth.signupHidden, false, `${label} signup action should show in signup mode`);
  assert.equal(signupAuth.forgotHidden, true, `${label} forgot-password action should hide in signup mode`);
  assert.equal(signupAuth.passwordAutocomplete, "new-password", `${label} signup password autocomplete is incorrect`);
  assert.equal(signupAuth.username, "luna", `${label} auth mode switch cleared the username`);
  assert.equal(signupAuth.password, "secret-password", `${label} auth mode switch cleared the password`);
  assert.equal(signupAuth.mode, "signup", `${label} auth mode state is incorrect`);

  await page.click("#passwordToggle");
  const visiblePassword = await page.evaluate(() => ({
    type: document.querySelector("#passwordInput")?.type || "",
    pressed: document.querySelector("#passwordToggle")?.getAttribute("aria-pressed") || "",
    label: document.querySelector("#passwordToggle")?.getAttribute("aria-label") || "",
  }));
  assert.deepEqual(visiblePassword, {
    type: "text",
    pressed: "true",
    label: "隐藏密码",
  }, `${label} password visibility control did not enter visible state`);
  await page.click("#passwordToggle");
  await page.click("#authModeToggle");
  const loginAuth = await page.evaluate(() => ({
    inviteHidden: document.querySelector("#inviteCodeField")?.hidden ?? false,
    passwordType: document.querySelector("#passwordInput")?.type || "",
    passwordAutocomplete: document.querySelector("#passwordInput")?.getAttribute("autocomplete") || "",
    forgotHeight: Math.round(document.querySelector("#forgotPasswordButton")?.getBoundingClientRect().height || 0),
    mode: document.querySelector("#authCard")?.dataset.authMode || "",
  }));
  assert.equal(loginAuth.inviteHidden, true, `${label} login mode did not hide invite field again`);
  assert.equal(loginAuth.passwordType, "password", `${label} password input did not return to masked state`);
  assert.equal(loginAuth.passwordAutocomplete, "current-password", `${label} login password autocomplete did not restore`);
  assert.ok(loginAuth.forgotHeight >= 44, `${label} forgot-password target is too small: ${loginAuth.forgotHeight}px`);
  assert.equal(loginAuth.mode, "login", `${label} auth mode did not return to login`);

  await page.evaluate(() => {
    document.body.style.minHeight = "3200px";
    window.scrollTo({ top: 1800, behavior: "instant" });
  });
  assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 1800, `${label} navigation fixture could not reach the source scroll position`);

  await page.click("#wishlistNav");
  await page.waitForFunction(() => document.activeElement?.dataset.pageHeading === "wishlist");
  const firstWishlist = await page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    current: [...document.querySelectorAll("#galleryNav, #wishlistNav, #weekendNav, #wardrobeNav")]
      .filter((button) => button.getAttribute("aria-current") === "page")
      .map((button) => button.id),
  }));
  assert.equal(firstWishlist.scrollY, 0, `${label} first wishlist visit did not start at the top`);
  assert.deepEqual(firstWishlist.current, ["wishlistNav"], `${label} wishlist aria-current state is incorrect`);

  await page.evaluate(() => window.scrollTo({ top: 640, behavior: "instant" }));
  await page.click("#weekendNav");
  await page.waitForFunction(() => document.activeElement?.dataset.pageHeading === "weekend");
  assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 0, `${label} first weekend visit did not start at the top`);

  await page.click("#wardrobeNav");
  await page.waitForSelector('#wardrobePage:not([hidden]) [data-page-heading="wardrobe"]', { state: "visible" });
  assert.equal(await page.locator("#wardrobePage").isVisible(), true, `${label} wardrobe page did not open`);

  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "instant" }));
  await page.click("#wishlistNav");
  await page.waitForFunction(() => document.activeElement?.dataset.pageHeading === "wishlist");
  assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 640, `${label} wishlist scroll position was not restored`);

  await page.click("#galleryNav");
  await page.waitForFunction(() => document.activeElement?.dataset.pageHeading === "gallery");
  assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 1800, `${label} diary scroll position was not restored`);
  assert.deepEqual(
    await page.evaluate(() => [...document.querySelectorAll("#galleryNav, #wishlistNav, #weekendNav, #wardrobeNav")]
      .filter((button) => button.getAttribute("aria-current") === "page")
      .map((button) => button.id)),
    ["galleryNav"],
    `${label} diary aria-current state is incorrect`
  );
  assert.deepEqual(pageErrors, [], `${label} navigation/auth runtime errors:\n${pageErrors.join("\n")}`);
  await assertNoHorizontalOverflow(page, `${label} navigation/auth`);
  await context.close();
}

async function testGlobalLevelDialogEvents(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await context.route("https://life-vlog-r2-upload.xiudan320-life.workers.dev/**", async (route) => {
    const headers = {
      "access-control-allow-origin": baseUrl,
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "content-type": "application/json",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [] }) });
  });
  await page.addInitScript(({ session }) => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(session));
  }, {
    session: {
      access_token: "level-dialog-regression-token",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      user: {
        id: "level-dialog-regression-user",
        email: "level-dialog-regression@fixture.local",
        user_metadata: { username: "level-dialog-regression" },
      },
    },
  });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
  await page.waitForSelector("#userMenu:not([hidden])", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#vipBadge:not([hidden])", { state: "visible", timeout: 30000 });

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
  assert.deepEqual(pageErrors, [], `${label} level dialog runtime errors:\n${pageErrors.join("\n")}`);
  await context.close();
}

async function testDesktopPageRails(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".topbar");
  await page.click("#wishlistNav");
  await page.waitForSelector("#wishlistPage:not([hidden])");
  await page.click("#weekendNav");
  await page.waitForSelector("#weekendPage:not([hidden])");

  const rails = await page.evaluate(() => {
    for (const selector of [
      "#wishlistPage",
      "#wishlistContent",
      "#shoppingContent",
      "#weekendPage",
      "#weekendComposer",
      "#weekendList",
    ]) {
      document.querySelector(selector)?.removeAttribute("hidden");
    }

    const main = document.querySelector("main");
    const mainStyle = getComputedStyle(main);
    const mainRect = main.getBoundingClientRect();
    const contentRail = mainRect.width - parseFloat(mainStyle.paddingLeft) - parseFloat(mainStyle.paddingRight);
    const widthOf = (selector) => document.querySelector(selector)?.getBoundingClientRect().width || 0;
    const leftOf = (selector) => document.querySelector(selector)?.getBoundingClientRect().left || 0;

    return {
      contentRail,
      wishlistHeader: widthOf(".wishlist-page-header"),
      wishlistContent: widthOf("#wishlistContent"),
      shoppingContent: widthOf("#shoppingContent"),
      wishlistTabsLeft: leftOf(".wishlist-module-tabs"),
      wishlistHeaderLeft: leftOf(".wishlist-page-header"),
      weekendHeader: widthOf(".weekend-page-header"),
      weekendComposer: widthOf(".weekend-composer"),
      weekendList: widthOf(".weekend-list"),
    };
  });

  assert.ok(rails.contentRail > 960, `${label} desktop content rail did not expand: ${JSON.stringify(rails)}`);
  for (const [name, width] of Object.entries(rails).filter(([key]) => [
    "wishlistHeader",
    "wishlistContent",
    "shoppingContent",
    "weekendHeader",
    "weekendComposer",
    "weekendList",
  ].includes(key))) {
    assert.ok(
      Math.abs(width - rails.contentRail) <= 1,
      `${label} ${name} does not align to the shared desktop rail: ${JSON.stringify(rails)}`
    );
  }
  assert.ok(
    Math.abs(rails.wishlistTabsLeft - rails.wishlistHeaderLeft) <= 1,
    `${label} wishlist module tabs are not aligned to the page rail: ${JSON.stringify(rails)}`
  );
  await assertNoHorizontalOverflow(page, `${label} desktop page rails`);
  await context.close();
}

async function testDiaryDetail(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/tests/diary-detail-visual.html`, { waitUntil: "load" });
  await page.waitForSelector("#photoDialog[open]");
  await assertNoHorizontalOverflow(page, `${label} diary detail`);

  const state = await page.evaluate(() => {
    const dialog = document.querySelector("#photoDialog");
    const article = dialog.querySelector("article");
    const comments = dialog.querySelector(".photo-comments");
    const image = dialog.querySelector("#dialogImage");
    const dialogRect = dialog.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    return {
      dialogHeight: dialogRect.height,
      dialogWidth: dialogRect.width,
      imageWidth: imageRect.width,
      imageHeight: imageRect.height,
      articleScrollHeight: article.scrollHeight,
      articleClientHeight: article.clientHeight,
      commentsHeight: comments.getBoundingClientRect().height,
    };
  });
  assert.ok(state.dialogWidth <= viewport.width + 1, `${label} diary dialog width overflow`);
  assert.ok(state.dialogHeight <= viewport.height + 1, `${label} diary dialog height overflow`);
  assert.ok(state.imageWidth > 0 && state.imageHeight > 0, `${label} diary image is blank`);
  assert.ok(state.commentsHeight > 100, `${label} comments must remain reachable`);

  const scrollTarget = viewport.width >= 900 ? "#photoDialog > article" : "#photoDialog";
  await page.locator(scrollTarget).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.waitForTimeout(50);
  const canReachEnd = await page.locator(scrollTarget).evaluate(
    (element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 2
  );
  assert.ok(canReachEnd, `${label} long diary cannot scroll to the end`);
  await context.close();
}

async function testWeekendLayout(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/tests/weekend-visual.html`, { waitUntil: "load" });
  await assertNoHorizontalOverflow(page, `${label} weekend layout`);
  await page.screenshot({ path: join(root, "tests", `weekend-layout-${label}.png`), fullPage: true });

  const cards = await page.locator(".weekend-card").evaluateAll((elements) =>
    elements.map((card) => {
      const main = card.querySelector(".weekend-card-main");
      const date = card.querySelector(".weekend-date");
      const body = card.querySelector(".weekend-card-body");
      const stateControl = card.querySelector(".weekend-state-control");
      const openControl = card.querySelector(".weekend-state-control.is-open");
      const stamp = card.querySelector(".weekend-state-control.is-complete, .weekend-state-stamp");
      const cardRect = card.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      const dateRect = date.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const stateControlRect = stateControl?.getBoundingClientRect();
      const stampRect = stamp?.getBoundingClientRect();
      return {
        cardDisplay: getComputedStyle(card).display,
        cardWidth: Math.round(cardRect.width),
        cardHeight: Math.round(cardRect.height),
        mainWidth: Math.round(mainRect.width),
        datePosition: getComputedStyle(date).position,
        dateWidth: Math.round(dateRect.width),
        bodyWidth: Math.round(bodyRect.width),
        stateControlWidth: stateControlRect ? Math.round(stateControlRect.width) : 0,
        stateControlHeight: stateControlRect ? Math.round(stateControlRect.height) : 0,
        stateControlText: openControl?.textContent.trim() || "",
        hasOpenControl: Boolean(openControl),
        stateControlBottom: stateControlRect ? Math.round(stateControlRect.bottom) : 0,
        stateControlRight: stateControlRect ? Math.round(stateControlRect.right) : 0,
        stampWidth: stampRect ? Math.round(stampRect.width) : 0,
        stampHeight: stampRect ? Math.round(stampRect.height) : 0,
        stampTop: stampRect ? Math.round(stampRect.top) : 0,
        stampRight: stampRect ? Math.round(stampRect.right) : 0,
        cardTop: Math.round(cardRect.top),
        cardBottom: Math.round(cardRect.bottom),
        cardRight: Math.round(cardRect.right),
      };
    })
  );
  assert.equal(cards.length, 3, `${label} weekend fixture is incomplete`);
  for (const card of cards) {
    assert.equal(card.cardDisplay, "block", `${label} weekend card inherited the legacy grid: ${JSON.stringify(card)}`);
    assert.equal(card.datePosition, "static", `${label} weekend date inherited legacy absolute positioning: ${JSON.stringify(card)}`);
    assert.ok(Math.abs(card.cardWidth - card.mainWidth) <= 1, `${label} weekend card main does not fill its card: ${JSON.stringify(card)}`);
    assert.ok(card.bodyWidth >= 130, `${label} weekend card body is squeezed: ${JSON.stringify(card)}`);
    assert.ok(card.stateControlWidth >= 44 && card.stateControlHeight >= 44, `${label} weekend completion target is too small: ${JSON.stringify(card)}`);
  }
  const openCards = cards.filter((card) => card.hasOpenControl);
  assert.equal(openCards.length, 1, `${label} open weekend card is missing its action circle`);
  assert.equal(openCards[0].stateControlText, "", `${label} open weekend action should be an empty circle: ${JSON.stringify(openCards[0])}`);
  assert.ok(openCards[0].stateControlWidth >= 44 && openCards[0].stateControlHeight >= 44, `${label} open weekend action circle is too small: ${JSON.stringify(openCards[0])}`);
  assert.ok(openCards[0].stateControlBottom > openCards[0].cardTop + openCards[0].cardHeight / 2, `${label} open weekend action circle is not placed at the lower edge: ${JSON.stringify(openCards[0])}`);
  assert.ok(openCards[0].stateControlRight < openCards[0].cardRight, `${label} open weekend action circle is not inset from the right edge: ${JSON.stringify(openCards[0])}`);
  assert.ok(cards[0].cardHeight <= (viewport.width <= 700 ? 300 : 240), `${label} simple weekend card is too tall: ${JSON.stringify(cards[0])}`);
  assert.ok(cards[0].dateWidth <= (viewport.width <= 700 ? 64 : 88), `${label} weekend date tile is oversized: ${JSON.stringify(cards[0])}`);
  const completedCards = cards.filter((card) => card.stampWidth > 0);
  assert.equal(completedCards.length, 2, `${label} completed weekend cards are missing their stamp`);
  for (const card of completedCards) {
    const minStampSize = viewport.width <= 700 ? 60 : 72;
    assert.ok(card.stampWidth >= minStampSize && card.stampHeight >= minStampSize, `${label} completion stamp is too small: ${JSON.stringify(card)}`);
    assert.ok(card.stampTop < card.cardTop, `${label} completion stamp does not rise above the card corner: ${JSON.stringify(card)}`);
    assert.ok(card.stampRight > card.cardRight, `${label} completion stamp does not reach beyond the card corner: ${JSON.stringify(card)}`);
  }
  await page.addStyleTag({ content: "html { font-size: 125%; }" });
  await assertNoHorizontalOverflow(page, `${label} weekend layout with larger text`);
  await context.close();
}

async function testComponentStates(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/tests/component-regression.html`, { waitUntil: "load" });
  await assertNoHorizontalOverflow(page, `${label} component states`);

  const wishlistColumns = await page.locator(".wishlist-list").evaluate(
    (list) => getComputedStyle(list).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  assert.equal(wishlistColumns, 1, `${label} wishlist must use one row per item`);
  const wishCards = await page.locator(".wish-card").evaluateAll((cards) =>
    cards.map((card) => ({
      height: Math.round(card.getBoundingClientRect().height),
      width: Math.round(card.getBoundingClientRect().width),
      imageHeight: Math.round(card.querySelector(".wish-card-image-button").getBoundingClientRect().height),
      imageWidth: Math.round(card.querySelector(".wish-card-image-button").getBoundingClientRect().width),
      actionsBottom: Math.round(card.querySelector(".wish-card-tools").getBoundingClientRect().bottom),
      cardBottom: Math.round(card.getBoundingClientRect().bottom),
    }))
  );
  assert.equal(wishCards.length, 2, `${label} wish fixture is incomplete`);
  assert.ok(
    Math.abs(wishCards[0].imageHeight - wishCards[1].imageHeight) <= 1,
    `${label} wishlist image regions have different heights`
  );
  const maxImageSize = viewport.width <= 700 ? 104 : 140;
  const maxCardHeight = viewport.width <= 700 ? 320 : 280;
  const receipt = await page.locator(".wish-completion-note").boundingBox();
  assert.ok(receipt && receipt.height >= 24, `${label} completion receipt is collapsed`);
  for (const card of wishCards) {
    assert.ok(card.imageWidth <= maxImageSize, `${label} wishlist image is too wide: ${JSON.stringify(card)}`);
    assert.ok(card.imageHeight <= maxImageSize, `${label} wishlist image is too tall: ${JSON.stringify(card)}`);
    assert.ok(card.height <= maxCardHeight, `${label} wishlist row is too tall: ${JSON.stringify(card)}`);
    assert.ok(
      card.actionsBottom <= card.cardBottom + 1,
      `${label} wishlist actions overlap card boundary: ${JSON.stringify(card)}`
    );
  }

  const weekendPreview = await page.locator(".weekend-scenes button").evaluateAll((buttons) => {
    const visible = buttons.filter((button) => getComputedStyle(button).display !== "none");
    return {
      visible: visible.length,
      rows: new Set(visible.map((button) => Math.round(button.getBoundingClientRect().top))).size,
      lastOverlay: visible.length ? getComputedStyle(visible.at(-1), "::after").content : "",
    };
  });
  assert.equal(weekendPreview.visible, viewport.width <= 700 ? 6 : 8, `${label} weekend preview is not two rows`);
  assert.equal(weekendPreview.rows, 2, `${label} weekend preview row count is incorrect`);
  assert.match(weekendPreview.lastOverlay, /查看全部/, `${label} weekend preview has no open-all cue`);

  const previewLimit = viewport.width <= 700 ? 6 : 8;
  await page.locator(".weekend-scenes button").nth(previewLimit - 1).click();
  const albumWindow = await page.locator("#weekendAlbumDialog").evaluate((dialog) => ({
    open: dialog.open,
    photos: dialog.querySelectorAll("[data-weekend-album-image]").length,
    title: dialog.querySelector("#weekendAlbumTitle")?.textContent || "",
    overflow: dialog.scrollWidth > dialog.clientWidth,
  }));
  const unchangedPreview = await page.locator(".weekend-scenes button").evaluateAll((buttons) => ({
    visible: buttons.filter((button) => getComputedStyle(button).display !== "none").length,
    opened: document.body.dataset.weekendGalleryOpened || "",
  }));
  assert.equal(albumWindow.open, true, `${label} weekend album window did not open`);
  assert.equal(albumWindow.photos, 10, `${label} weekend album window is missing images`);
  assert.match(albumWindow.title, /公园里慢慢走一圈/, `${label} weekend album title is incorrect`);
  assert.equal(albumWindow.overflow, false, `${label} weekend album window overflows horizontally`);
  assert.equal(unchangedPreview.visible, previewLimit, `${label} weekend card expanded in place`);
  assert.equal(unchangedPreview.opened, "", `${label} first weekend click opened the lightbox`);
  await page.locator("[data-weekend-album-image]").first().click();
  assert.equal(
    await page.locator("body").getAttribute("data-weekend-gallery-opened"),
    "true",
    `${label} weekend album image did not open the lightbox`
  );
  assert.equal(
    await page.locator("#weekendAlbumDialog").getAttribute("open"),
    null,
    `${label} album window stayed open behind the lightbox`
  );

  const toolbar = await page.locator(".secret-album-toolbar").boundingBox();
  assert.ok(toolbar && toolbar.width > 0 && toolbar.height > 0, `${label} secret selection toolbar is missing`);
  assert.ok(toolbar && toolbar.width <= viewport.width, `${label} secret selection toolbar overflows`);
  await context.close();
}

async function testSecretAppendLinkPaste(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/tests/component-regression.html`, { waitUntil: "load" });
  const result = await page.evaluate(async () => {
    const { bindSecretAlbumActions } = await import("../modules/secret-gallery-view.js");
    const host = document.createElement("div");
    host.innerHTML = `
      <form data-secret-append-form>
        <textarea data-secret-append-links></textarea>
        <input data-secret-append-files type="file" />
      </form>`;
    document.body.append(host);
    const calls = [];
    bindSecretAlbumActions({
      container: host,
      handlers: {
        getClipboardFiles: () => [],
        append: (payload) => calls.push({ linksText: payload.linksText || "", hasForm: payload.form === host.querySelector("[data-secret-append-form]") }),
      },
    });
    const plainClipboard = new DataTransfer();
    plainClipboard.setData("text/plain", "https://example.com/secret-image.png");
    const plainEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(plainEvent, "clipboardData", { value: plainClipboard });
    host.querySelector("[data-secret-append-form]").dispatchEvent(plainEvent);

    const richClipboard = new DataTransfer();
    richClipboard.setData("text/plain", "https://example.com/image-page");
    richClipboard.setData(
      "text/html",
      '<a href="https://example.com/image-page"><img src="https://cdn.example.com/secret-image.jpg?width=1200&amp;quality=90"></a>'
    );
    const richEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(richEvent, "clipboardData", { value: richClipboard });
    host.querySelector("[data-secret-append-form]").dispatchEvent(richEvent);
    host.remove();
    return {
      plainPrevented: plainEvent.defaultPrevented,
      richPrevented: richEvent.defaultPrevented,
      calls,
    };
  });
  assert.equal(result.plainPrevented, true, `${label} plain secret URL paste was not handled`);
  assert.equal(result.richPrevented, true, `${label} rich secret image paste was not handled`);
  assert.deepEqual(result.calls, [
    { linksText: "https://example.com/secret-image.png", hasForm: true },
    { linksText: "https://cdn.example.com/secret-image.jpg?width=1200&quality=90", hasForm: true },
  ], `${label} secret URL paste did not choose the actual image source`);
  await context.close();
}

const pseudoSession = {
  access_token: "local-regression-token",
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  user: {
    id: "local-regression-user",
    email: "luna@life-vlog.local",
    user_metadata: { username: "luna", login_username: "luna" },
  },
};

async function installPseudoSession(page, { corruptCaches = false } = {}) {
  await page.addInitScript(({ session, corrupt }) => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(session));
    localStorage.setItem(
      "life-vlog-recipes:luna",
      corrupt ? "{" : JSON.stringify([{ id: "cached-recipe", name: "本地菜谱", ingredients: [], steps: [] }])
    );
    localStorage.setItem(
      "life-vlog-weekend-plans:luna",
      corrupt ? "{" : JSON.stringify([{ id: "cached-weekend", title: "本地周末", date: "2030-01-01", images: [] }])
    );
  }, { session: pseudoSession, corrupt: corruptCaches });
}

async function testWeekendCompletionUploadAssembly() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pageErrors = [];
  const fixture = createCloudflareApiFixture();
  await fixture.install(context);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.__weekendUploadCalls = [];
    window.fetch = async (input, init) => {
      const requestUrl = typeof input === "string" ? input : input?.url || "";
      if (requestUrl.endsWith("/upload") && init?.body instanceof FormData) {
        const file = init.body.get("file");
        window.__weekendUploadCalls.push({
          fileName: file?.name || "",
          folder: init.body.get("folder") || "",
          name: init.body.get("name") || "",
        });
      }
      return nativeFetch(input, init);
    };
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify({
      access_token: "fixture-weekend-upload-token",
      expires_at: "2099-01-01T00:00:00.000Z",
      user: {
        id: "fixture-user",
        email: "fixture-user@life-vlog.local",
        user_metadata: { username: "fixture-user" },
      },
    }));
  });

  try {
    await page.goto(`${baseUrl}/?page=weekend`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
    await page.waitForSelector('#weekendPage:not([hidden]) [data-weekend-id="fixture-weekend"]', { timeout: 30000 });
    await page.locator('[data-weekend-id="fixture-weekend"] [data-toggle-weekend]').click();
    await page.waitForSelector("#weekendCompletionDialog[open]");
    await page.locator("#weekendCompletionInput").setInputFiles({
      name: "fixture-recap.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
    });
    await page.waitForSelector("#weekendCompletionPreviews:not([hidden])");
    await page.locator("#weekendCompletionSubmit").click();
    await page.waitForFunction(
      () => !document.querySelector("#weekendCompletionDialog")?.open,
      null,
      { timeout: 30000 }
    );

    const result = await page.evaluate(() => ({
      cards: [...document.querySelectorAll("[data-weekend-id]")].map((card) => ({
        id: card.dataset.weekendId,
        label: card.getAttribute("aria-label") || "",
        done: card.classList.contains("done"),
      })),
      status: document.querySelector("#weekendStatus")?.textContent || "",
      uploads: window.__weekendUploadCalls,
    }));
    assert.deepEqual(pageErrors, [], `weekend completion page errors:\n${pageErrors.join("\n")}`);
    assert.equal(result.uploads.length, 1, `expected one recap upload, got ${JSON.stringify(result.uploads)}`);
    assert.equal(result.uploads[0].folder, "weekend-recap");
    assert.match(result.uploads[0].name, /^fixture-weekend-[0-9]+-1$/);
    assert.match(result.uploads[0].fileName, /^fixture-weekend-[0-9]+-1\.jpg$/);
    assert.ok(result.cards.some((card) => card.done && /已完成/.test(card.label)), `completed weekend card missing: ${JSON.stringify(result)}`);
    assert.match(result.status, /完成回顾已保存/);
  } finally {
    await fixture.dispose(context);
    await context.close();
  }
}

async function testAuthenticatedHomeStartup() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const pageErrors = [];
  const scripts = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.resourceType() === "script" || request.resourceType() === "stylesheet") scripts.push(request.url());
  });
  await installPseudoSession(page, { corruptCaches: true });
  const startedAt = Date.now();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 2000 });
  const boot = await page.evaluate(() => ({
    busy: document.body.getAttribute("aria-busy"),
    authHidden: document.querySelector("#authCard")?.hidden,
    userMenuHidden: document.querySelector("#userMenu")?.hidden,
    galleryDisabled: document.querySelector("#galleryNav")?.disabled,
  }));
  assert.ok(Date.now() - startedAt <= 2000, "authenticated home splash exceeded the 2 second budget");
  assert.equal(boot.busy, null, "authenticated home stayed aria-busy");
  assert.equal(boot.authHidden, true, "authenticated home still shows the auth card");
  assert.equal(boot.userMenuHidden, false, "authenticated home did not expose the user menu");
  assert.equal(boot.galleryDisabled, false, "authenticated home gallery navigation is not interactive");
  assert.deepEqual(pageErrors, [], `authenticated home page errors:\n${pageErrors.join("\n")}`);
  assert.equal(
    scripts.some((url) => /(?:recipes|weekend|wardrobe|secret|settings)-route-/.test(url)),
    false,
    `authenticated gallery cold start requested page route chunks: ${scripts.join("\n")}`
  );
  await context.close();
}

async function testAuthenticatedDeepLink(pageName) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const pageErrors = [];
  const routeScripts = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.resourceType() === "script" && request.url().includes(`${pageName}-route-`)) routeScripts.push(request.url());
  });
  await installPseudoSession(page, { corruptCaches: true });
  await page.goto(`${baseUrl}/?page=${pageName}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`#${pageName}Page:not([hidden])`, { state: "attached", timeout: 5000 });
  await page.waitForFunction((route) => document.querySelector(`#${route}Page`)?.hidden === false, pageName, { timeout: 5000 });
  assert.equal(await page.locator("#appSplash").isHidden(), true, `${pageName} deep link left splash visible`);
  assert.equal(await page.locator("body").getAttribute("aria-busy"), null, `${pageName} deep link left body busy`);
  assert.equal(routeScripts.length, 1, `${pageName} route chunk was loaded ${routeScripts.length} times`);
  assert.deepEqual(pageErrors, [], `${pageName} deep link page errors:\n${pageErrors.join("\n")}`);
  const cacheKeys = await page.evaluate((route) => Object.keys(localStorage).filter((key) => key.startsWith(`life-vlog-${route === "recipes" ? "recipes" : "weekend-plans"}:`)), pageName);
  assert.deepEqual(cacheKeys, [`life-vlog-${pageName === "recipes" ? "recipes" : "weekend-plans"}:luna`], `${pageName} cache scope was not user-specific`);
  await context.close();
}

async function testOfflineShell() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 30000 });
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).some((registration) => registration.active), null, { timeout: 30000 });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector(".topbar", { timeout: 15000 });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 15000 });
  assert.equal(await page.locator(".topbar").count(), 1, "offline shell did not restore the topbar");
  assert.equal(await page.locator("#appSplash").isHidden(), true, "offline shell left the splash visible");
  await context.close();
}

try {
  await testAuthenticatedHomeStartup();
  await testAuthenticatedDeepLink("recipes");
  await testAuthenticatedDeepLink("weekend");
  await testWeekendCompletionUploadAssembly();
  await testHomeShell({ width: 1440, height: 900 }, "desktop");
  await testHomeShell({ width: 390, height: 844 }, "mobile");
  await testHomeShell({ width: 375, height: 812 }, "small-mobile-reduced-motion", "reduce");
  await testHomeShell({ width: 844, height: 390 }, "mobile-landscape");
  await testNavigationAndAuth({ width: 390, height: 844 }, "mobile");
  await testNavigationAndAuth({ width: 1440, height: 900 }, "desktop");
  await testGlobalLevelDialogEvents({ width: 390, height: 844 }, "mobile");
  await testGlobalLevelDialogEvents({ width: 1440, height: 900 }, "desktop");
  await testDesktopPageRails({ width: 1440, height: 900 }, "desktop");
  await testDiaryDetail({ width: 1440, height: 900 }, "desktop");
  await testDiaryDetail({ width: 390, height: 844 }, "mobile");
  await testWeekendLayout({ width: 1440, height: 900 }, "desktop");
  await testWeekendLayout({ width: 390, height: 844 }, "mobile");
  await testWeekendLayout({ width: 375, height: 812 }, "small-mobile");
  await testWeekendLayout({ width: 844, height: 390 }, "mobile-landscape");
  await testComponentStates({ width: 1440, height: 900 }, "desktop");
  await testComponentStates({ width: 390, height: 844 }, "mobile");
  await testSecretAppendLinkPaste({ width: 1440, height: 900 }, "desktop");
  await testSecretAppendLinkPaste({ width: 390, height: 844 }, "mobile");
  await testOfflineShell();
  console.log("Browser regression checks passed for desktop and mobile.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
