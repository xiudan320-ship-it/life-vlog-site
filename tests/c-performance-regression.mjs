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

async function openFixturePage({ viewport, authenticated = true, path = "/", fixtureOptions = {}, session = pseudoSession } = {}) {
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
    await page.addInitScript((session) => {
      localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(session));
    }, session);
  }
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  if (path === "/") {
    await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  }
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
  const desktop = await openFixturePage({ viewport: { width: 1440, height: 900 } });
  try {
    const page = desktop.page;
    const card = page.locator('[data-photo-id="fixture-camera-talent-video"]');
    await card.waitFor({ state: "visible" });
    await card.locator(".feed-media-shell > button").click();
    await page.waitForSelector("#photoDialog[open]", { state: "attached" });
    const desktopVideo = page.locator("#dialogVideo");
    assert.deepEqual(await desktopVideo.evaluate((video) => ({
      hidden: video.hidden,
      autoplay: video.autoplay,
      muted: video.muted,
      loop: video.loop,
      controls: video.controls,
      paused: video.paused,
    })), { hidden: false, autoplay: false, muted: false, loop: false, controls: true, paused: true });
    await page.evaluate(() => document.querySelector("#dialogVideo")?.dispatchEvent(new Event("canplay")));
    await page.waitForFunction(() => document.querySelector("#dialogVideoStatus")?.hidden === true);
    assert.equal(desktop.errors.length, 0, `desktop video page errors: ${desktop.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(desktop);
  }

  const mobile = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const page = mobile.page;
    const card = page.locator('[data-photo-id="fixture-camera-talent-video"]');
    await card.locator(".feed-media-shell > button").click();
    await page.waitForSelector("body.mobile-diary-page-open");
    const video = page.locator(".mobile-diary-video");
    assert.deepEqual(await video.evaluate((element) => ({
      autoplay: element.autoplay,
      muted: element.muted,
      controls: element.controls,
    })), { autoplay: false, muted: false, controls: true });
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
    ["galleryNav", "vlogNav", "weekendNav"],
    ["weekendNav", "galleryNav", "vlogNav", "wishlistNav", "weekendNav"],
  ];
  for (let round = 0; round < 30; round += 1) {
    const sequence = sequences[round % sequences.length];
    await page.evaluate((ids) => {
      ids.forEach((id) => document.getElementById(id)?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    }, sequence);
  }
  await page.waitForSelector("#weekendPage:not([hidden])", { state: "attached", timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector("main")?.hasAttribute("aria-busy") && !document.querySelector("main")?.hasAttribute("data-route-busy"));
  await page.waitForFunction(() => document.querySelectorAll('[aria-current="page"]').length <= 1);
  const result = await page.evaluate(() => ({
    href: location.href,
    current: document.querySelector('[aria-current="page"]')?.id || "",
    historyDelta: history.length - window.__rapidHistoryStart,
    busy: document.querySelector("main")?.hasAttribute("aria-busy") || document.querySelector("main")?.hasAttribute("data-route-busy"),
    rejections: window.__rapidNavigationRejections,
  }));
  // The previous gallery state is the only history entry that should remain
  // behind the final intent; delayed obsolete route loads cannot push entries.
  assert.equal(result.href.includes("page=weekend"), true, `latest navigation did not win: ${JSON.stringify(result)}`);
  assert.equal(result.current, "weekendNav");
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
  await testFixtureSecretCrud(browser);
  console.log("C performance and interaction boundaries passed: lazy features, weekend forms, deletion focus, and mobile multiline comments.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
