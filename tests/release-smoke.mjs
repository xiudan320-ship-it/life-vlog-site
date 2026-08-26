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
    try {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), ...corsHeaders },
      });
    } catch (error) {
      if (/context disposed|target closed/i.test(String(error?.message || error))) return;
      throw error;
    }
  });
}

const browser = await chromium.launch({ headless: true });

function attachRuntimeChecks(page, label) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      const source = location.url ? ` (${location.url}:${location.lineNumber || 0})` : "";
      errors.push(`${label} console: ${message.text()}${source}`);
    }
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

async function assertMobilePageShell(page, label) {
  if (label !== "mobile") return;
  await page.click("#galleryNav");
  await page.waitForSelector("#galleryFilters");
  const diaryShell = await page.evaluate(() => ({
    className: document.body.className,
    heroDisplay: getComputedStyle(document.querySelector(".hero")).display,
    toolDockDisplay: getComputedStyle(document.querySelector("#toolDock")).display,
  }));
  assert.match(diaryShell.className, /\bmobile-diary-shell\b/, `${label} diary shell class is missing`);
  assert.notEqual(diaryShell.heroDisplay, "none", `${label} diary hero is hidden`);
  assert.notEqual(diaryShell.toolDockDisplay, "none", `${label} diary tool dock is hidden`);

  await page.click("#wishlistNav");
  await page.waitForSelector("#wishlistPage:not([hidden])");
  const nonDiaryShell = await page.evaluate(() => ({
    className: document.body.className,
    heroDisplay: getComputedStyle(document.querySelector(".hero")).display,
    toolDockDisplay: getComputedStyle(document.querySelector("#toolDock")).display,
  }));
  assert.doesNotMatch(nonDiaryShell.className, /\bmobile-diary-shell\b/, `${label} non-diary shell class is still active`);
  assert.equal(nonDiaryShell.heroDisplay, "none", `${label} non-diary hero is still visible`);
  assert.equal(nonDiaryShell.toolDockDisplay, "none", `${label} non-diary tool dock is still visible`);

  await page.click("#vlogNav");
  await page.waitForSelector("#gallery:not([hidden])");
  const vlogShell = await page.evaluate(() => ({
    className: document.body.className,
    heroDisplay: getComputedStyle(document.querySelector(".hero")).display,
    toolDockDisplay: getComputedStyle(document.querySelector("#toolDock")).display,
  }));
  assert.doesNotMatch(vlogShell.className, /\bmobile-diary-shell\b/, `${label} VLOG shell class is still active`);
  assert.equal(vlogShell.heroDisplay, "none", `${label} VLOG hero is still visible`);
  assert.equal(vlogShell.toolDockDisplay, "none", `${label} VLOG tool dock is still visible`);

  await page.click("#galleryNav");
  await page.waitForSelector("#galleryFilters");
}

async function assertVlogAudioUi(page, label) {
  const controlsOnTap = label === "mobile";
  const state = await page.evaluate(async (hideControlsUntilTap) => {
    const preview = document.querySelector("#photoVideoPreview");
    const { startDiaryMotionVideo } = await import("./modules/diary-video-layout.js");
    const video = document.createElement("video");
    startDiaryMotionVideo(video, null, { audible: true, controlsOnTap: hideControlsUntilTap });
    const initialControls = video.controls;
    video.click();
    const result = {
      previewMuted: preview?.muted ?? true,
      previewControls: preview?.controls ?? false,
      detailMuted: video.muted,
      detailInitialControls: initialControls,
      detailRevealedControls: video.controls,
      detailAutoplay: video.autoplay,
      detailLoop: video.loop,
    };
    video.remove();
    return result;
  }, controlsOnTap);
  assert.equal(state.previewMuted, false, `${label} VLOG upload preview is muted`);
  assert.equal(state.previewControls, true, `${label} VLOG upload preview has no controls`);
  assert.equal(state.detailMuted, false, `${label} VLOG detail video is muted`);
  assert.equal(state.detailInitialControls, !controlsOnTap, `${label} VLOG initial control visibility mismatch`);
  assert.equal(state.detailRevealedControls, true, `${label} VLOG controls were not revealed by tapping`);
  assert.equal(state.detailAutoplay, true, `${label} VLOG detail video should autoplay after opening`);
  assert.equal(state.detailLoop, false, `${label} VLOG detail video should not loop`);
}

async function assertVlogMediaBadge(page, label) {
  await page.click("#vlogNav");
  await page.waitForSelector("#gallery:not([hidden]) .photo-card", { timeout: 30000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll("#gallery .live-photo-badge")].some(
      (badge) => badge.textContent.trim() === "VIDEO"
    ),
    undefined,
    { timeout: 30000 }
  );
  const badges = await page.locator("#gallery .live-photo-badge").allTextContents();
  assert.ok(badges.includes("VIDEO"), `${label} ordinary video has no VIDEO badge`);
  await assertNoHorizontalOverflow(page, `${label} VLOG badges`);
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: join(screenshotDir, `vlog-badges-${label}.png`), fullPage: true });
  if (label === "mobile") {
    const videoBadge = page.locator("#gallery .photo-card .live-photo-badge", { hasText: "VIDEO" }).first();
    await videoBadge.locator("xpath=..").click();
    await page.waitForSelector(".mobile-diary-page:not([hidden]) .mobile-diary-media-badge");
    const detailBadge = page.locator(".mobile-diary-page:not([hidden]) .mobile-diary-media-badge");
    const box = await detailBadge.boundingBox();
    const closeBox = await page.locator(".mobile-diary-page:not([hidden]) .mobile-diary-close").boundingBox();
    assert.ok(box && box.width < 90, `mobile VIDEO badge is too wide: ${box?.width || 0}px`);
    assert.ok(box && box.height < 40, `mobile VIDEO badge is too tall: ${box?.height || 0}px`);
    assert.ok(
      box && closeBox && box.y >= closeBox.y + closeBox.height,
      `mobile VIDEO badge overlaps the back button: badge=${JSON.stringify(box)}, back=${JSON.stringify(closeBox)}`
    );
    await page.screenshot({ path: join(screenshotDir, "vlog-detail-badge-mobile.png"), fullPage: true });
    await page.click("[data-mobile-diary-close]");
  }
}

async function assertMobileUploadStatusLayout(page) {
  const message = "已发布 1 篇合集，共 2 张图。自动压缩 5.75 MB → 2.76 MB，节省 52%。修为 +30";
  const state = await page.evaluate((text) => {
    const status = document.querySelector("#uploadStatus");
    const composer = document.querySelector("#composer");
    const form = document.querySelector("#uploadForm");
    composer?.classList.remove("expanded");
    if (form) form.hidden = true;
    if (status) status.textContent = text;
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value ? { left: value.left, right: value.right, top: value.top, bottom: value.bottom } : null;
    };
    return {
      head: rect(document.querySelector("#galleryHead")),
      title: rect(document.querySelector("#galleryHead > div:first-child")),
      button: rect(document.querySelector("#galleryHead .section-heading-button")),
      status: rect(status),
    };
  }, message);
  assert.ok(state.head && state.title && state.button && state.status, "mobile upload status fixture is incomplete");
  assert.ok(
    state.status.top >= Math.max(state.title.bottom, state.button.bottom) - 1,
    `mobile upload status overlaps heading: ${JSON.stringify(state)}`
  );
  assert.ok(
    state.status.left >= state.head.left - 1 && state.status.right <= state.head.right + 1,
    `mobile upload status overflows heading: ${JSON.stringify(state)}`
  );
  await page.evaluate(() => {
    document.querySelector("#galleryHead")?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -160);
  });
  await page.waitForTimeout(100);
  await page.locator("#galleryHead").screenshot({ path: join(screenshotDir, "diary-upload-status-mobile.png") });
  await page.evaluate(() => {
    const status = document.querySelector("#uploadStatus");
    if (status) status.textContent = "";
  });
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

async function cleanupSecretAlbumFixture(page, albumId, imageUrls = []) {
  if (!albumId) return;
  const result = await page.evaluate(async ({ apiUrl, itemId, urls }) => {
    const session = JSON.parse(localStorage.getItem("life-vlog-cloudflare-auth") || "null");
    const token = session?.access_token || "";
    if (!token) return { row: false, images: false };
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const removeRow = await fetch(`${apiUrl}/api/table/secret_items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "delete",
        values: null,
        filters: [{ op: "eq", column: "id", value: itemId }],
        onConflict: "",
      }),
    });
    const keys = [...new Set(urls.map((url) => {
      try {
        return new URL(url).pathname.replace(/^\/+/, "");
      } catch {
        return "";
      }
    }).filter(Boolean))];
    const removals = await Promise.all(keys.map((key) => fetch(`${apiUrl}/object`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ key }),
    })));
    return { row: removeRow.ok, images: removals.every((response) => response.ok) };
  }, { apiUrl: backendUrl, itemId: albumId, urls: imageUrls });
  assert.equal(result.row, true, "secret album release fixture row was not cleaned up");
  assert.equal(result.images, true, "secret album release fixture images were not cleaned up");
}

async function assertSecretAlbumLinkFlow(page, runtimeErrors) {
  const title = `自动验收秘藏-${Date.now()}`;
  const sourceBaseUrl = /^https:\/\//i.test(baseUrl)
    ? baseUrl
    : "https://life-vlog-site.pages.dev";
  const sourceUrl = `${sourceBaseUrl}/assets/home-logo.jpg`;
  let albumId = "";
  let imageUrls = [];

  try {
    await page.click("#secretOpen");
    await page.waitForSelector("#secretPinDialog[open]", { timeout: 10000 });
    for (let round = 0; round < 2; round += 1) {
      for (const digit of ["1", "2", "3", "4"]) {
        await page.click(`[data-secret-pin-digit="${digit}"]`);
      }
      if (round === 0) await page.waitForTimeout(180);
    }
    await page.waitForSelector("#secretPage:not([hidden])", { timeout: 10000 });
    await page.waitForSelector("[data-secret-create-album]", { timeout: 30000 });
    await page.locator("[data-secret-create-album]").first().click();
    await page.waitForSelector("#secretForm:not([hidden])", { timeout: 10000 });
    await page.fill("#secretTitleInput", title);
    await page.fill("#secretImageLinkInput", sourceUrl);
    await page.click("#secretSubmitButton");

    const card = page.locator(".secret-card", { hasText: title });
    try {
      await card.waitFor({ state: "visible", timeout: 30000 });
    } catch (error) {
      const status = await page.locator("#secretStatus").textContent();
      assert.fail(
        `new secret album link upload failed: ${status?.trim() || "no status"}` +
        (runtimeErrors.length ? `; ${runtimeErrors.slice(-5).join(" | ")}` : "") +
        `; ${error.message}`
      );
    }
    albumId = await card.getAttribute("data-secret-album-card") || "";
    assert.ok(albumId, "new secret album has no item id");
    await card.locator("[data-secret-index]").click();
    await page.waitForSelector(".secret-album-view", { timeout: 10000 });
    assert.equal(await page.locator("[data-secret-photo]").count(), 1, "new secret album did not save its link image");
    if ((page.viewportSize()?.width || 0) >= 701) {
      const albumLayout = await page.evaluate(() => {
        const toolbar = document.querySelector(".secret-album-toolbar")?.getBoundingClientRect();
        const content = document.querySelector(".secret-album-content")?.getBoundingClientRect();
        return toolbar && content
          ? { toolbarLeft: toolbar.left, toolbarRight: toolbar.right, contentRight: content.right, viewportWidth: document.documentElement.getBoundingClientRect().right }
          : null;
      });
      assert.ok(albumLayout && albumLayout.toolbarLeft >= albumLayout.contentRight - 1, `desktop secret tools are not in the right rail: ${JSON.stringify(albumLayout)}`);
      assert.ok(albumLayout && albumLayout.toolbarRight >= albumLayout.viewportWidth - 24, `desktop secret tools are not pinned to the viewport right: ${JSON.stringify(albumLayout)}`);
    }

    await page.click("[data-secret-toggle-append]");
    await page.fill("[data-secret-append-links]", sourceUrl);
    await page.click('[data-secret-append-form] button[type="submit"]');
    try {
      await page.waitForFunction(
        () => document.querySelectorAll("[data-secret-photo]").length === 2,
        undefined,
        { timeout: 30000 }
      );
    } catch (error) {
      const status = await page.locator("#secretStatus").textContent();
      assert.fail(
        `existing secret album link append failed: ${status?.trim() || "no status"}` +
        (runtimeErrors.length ? `; ${runtimeErrors.slice(-5).join(" | ")}` : "") +
        `; ${error.message}`
      );
    }
    imageUrls = await page.locator("[data-secret-photo] img").evaluateAll(
      (images) => images.map((image) => image.getAttribute("data-full-src") || image.src).filter(Boolean)
    );

    await page.locator("[data-secret-back]").first().click();
    await page.waitForSelector(`.secret-card[data-secret-album-card="${albumId}"]`, { timeout: 10000 });
    const fixtureCard = page.locator(`.secret-card[data-secret-album-card="${albumId}"]`);
    assert.equal(await fixtureCard.locator(".secret-cover img").count(), 1, "secret album cards must only show the selected cover");
    const pinButton = fixtureCard.locator("[data-secret-album-pin]");
    assert.equal(await pinButton.getAttribute("aria-pressed"), "false", "new secret album pin state is incorrect");
    await pinButton.click();
    await page.waitForFunction(
      (id) => document.querySelector(`.secret-card[data-secret-album-card="${id}"] [data-secret-album-pin]`)?.getAttribute("aria-pressed") === "true",
      albumId,
      { timeout: 10000 }
    );
    await page.locator(`.secret-card[data-secret-album-card="${albumId}"] [data-secret-album-pin]`).click();
    await page.waitForFunction(
      (id) => document.querySelector(`.secret-card[data-secret-album-card="${id}"] [data-secret-album-pin]`)?.getAttribute("aria-pressed") === "false",
      albumId,
      { timeout: 10000 }
    );
  } finally {
    await cleanupSecretAlbumFixture(page, albumId, imageUrls);
  }
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
  if (label === "desktop" && target.photoCount > 1) {
    const initialCounter = await page.locator("#dialogCounter").textContent();
    await page.locator("#photoDialog .dialog-media").evaluate((media) => {
      media.dispatchEvent(new WheelEvent("wheel", { deltaY: 140, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(
      (previous) => document.querySelector("#dialogCounter")?.textContent !== previous,
      initialCounter,
      { timeout: 10000 }
    );
  }
  await page.click("#closeDialog");
  await page.waitForSelector("#weekendAlbumDialog[open]", { timeout: 10000 });
  assert.equal(
    await page.locator("[data-weekend-album-image]").count(),
    target.photoCount,
    `${label} weekend album was not restored after closing the lightbox`
  );
  await page.click(".weekend-album-close");
  await page.waitForSelector("#weekendAlbumDialog:not([open])", { state: "hidden", timeout: 10000 });
}

async function assertWishlistReceiptFlow(page, label, runtimeErrors) {
  await page.click("#wishlistNav");
  await page.waitForSelector("#wishlistPage:not([hidden])");
  await page.click('[data-wish-view="done"]');
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#wishlistList .wish-card.completed").length > 0 ||
      !document.querySelector("#wishlistList [data-account-sync-loading]"),
    undefined,
    { timeout: 30000 }
  );

  const completedWishCount = await page.locator("#wishlistList .wish-card.completed").count();
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
      color: getComputedStyle(button).color,
      indicator: getComputedStyle(button, "::after").opacity,
    })),
    activeColor: (() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--accent)";
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    })(),
    cards: [...document.querySelectorAll("#wishlistList .wish-card.completed")].map((card) => {
      const receipt = card.querySelector(".wish-completion-note");
      const header = receipt?.querySelector(".wish-completion-header");
      const body = receipt?.querySelector(":scope > p");
      const tools = card.querySelector(".wish-card-tools");
      const cardRect = card.getBoundingClientRect();
      const receiptRect = receipt?.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      const bodyRect = body?.getBoundingClientRect();
      const toolsRect = tools?.getBoundingClientRect();
      return {
        hasReceipt: Boolean(receipt),
        receiptInside:
          Boolean(receiptRect) &&
          receiptRect.left >= cardRect.left - 1 &&
          receiptRect.right <= cardRect.right + 1 &&
          receiptRect.bottom <= cardRect.bottom + 1,
        headerBodyOverlap: Boolean(headerRect && bodyRect && headerRect.bottom > bodyRect.top + 1),
        actionsInside: !toolsRect || toolsRect.bottom <= cardRect.bottom + 1,
        readable: getComputedStyle(card).opacity === "1" && getComputedStyle(card.querySelector("h3")).textDecorationLine === "none",
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
  assert.equal(doneTab?.color, state.activeColor, `${label} completed tab active color mismatch`);
  assert.equal(doneTab?.indicator, "1", `${label} completed tab indicator is missing`);
  assert.notEqual(openTab?.color, doneTab?.color, `${label} wishlist tabs are visually indistinguishable`);
  assert.ok(state.cards.length > 0, `${label} completed wishlist is empty`);
  assert.equal(state.loadingVisible, false, `${label} wishlist still shows a loading state`);
  state.cards.forEach((card, index) => {
    assert.equal(card.hasReceipt, true, `${label} wish ${index + 1} has no completion receipt`);
    assert.equal(card.receiptInside, true, `${label} wish ${index + 1} receipt overflows its card`);
    assert.equal(card.headerBodyOverlap, false, `${label} wish ${index + 1} receipt text overlaps`);
    assert.equal(card.actionsInside, true, `${label} wish ${index + 1} actions overflow its card`);
    assert.equal(card.readable, true, `${label} completed wish became dimmed or struck through`);
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

  await page.reload({ waitUntil: "domcontentloaded" });
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

async function assertDiaryDetailFlow(page, label, mobile, runtimeErrors) {
  const card = await findFavoriteFixture(page);
  await card.locator("[data-photo-index][data-image-index]").first().click();
  try {
    if (mobile) {
      const detail = page.locator(".mobile-diary-page:not([hidden])");
      await detail.waitFor({ state: "visible", timeout: 10000 });
      await detail.locator(".mobile-diary-article").waitFor({ state: "visible", timeout: 10000 });
      assert.equal(
        await detail.locator(".mobile-diary-article h1").textContent(),
        favoriteFixtureTitle,
        `${label} mobile diary detail title mismatch`
      );
      await page.screenshot({ path: join(screenshotDir, `diary-detail-${label}.png`) });
      await detail.locator("[data-mobile-diary-close]").click();
      await detail.waitFor({ state: "hidden", timeout: 10000 });
    } else {
      await page.waitForSelector("#photoDialog.diary-detail-dialog[open]", { timeout: 10000 });
      assert.equal(
        await page.locator("#dialogTitle").textContent(),
        favoriteFixtureTitle,
        `${label} desktop diary detail title mismatch`
      );
      await page.screenshot({ path: join(screenshotDir, `diary-detail-${label}.png`) });
      await page.click("#closeDialog");
      await page.waitForSelector("#photoDialog:not([open])", { state: "hidden", timeout: 10000 });
    }
  } catch (error) {
    assert.fail(
      `${label} diary detail did not open correctly` +
      (runtimeErrors.length ? `; ${runtimeErrors.slice(-5).join(" | ")}` : "") +
      `; ${error.message}`
    );
  } finally {
    await page.fill("#diarySearchInput", "");
  }
}

async function assertModularViews(page, label) {
  await page.click("#recipesToolOpen");
  await page.waitForSelector("#recipesPage:not([hidden])");
  await page.waitForFunction(() => (document.querySelector("#recipesList")?.textContent || "").trim().length > 0);
  await assertNoHorizontalOverflow(page, `${label} recipes`);
  await page.screenshot({ path: join(screenshotDir, `modules-recipes-${label}.png`), fullPage: true });

  await page.click("#galleryNav");
  await page.waitForSelector("#galleryFilters");
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

  await page.click("#vipBadge");
  await page.waitForSelector("#levelDialog[open]");
  assert.match(await page.locator("#levelCurrentTitle").textContent(), /期/);
  await page.click("#closeLevelDialog");
}

async function assertShoppingFlow(page, label) {
  const itemName = `自动验收商品-${label}-${Date.now()}`;
  const editedName = `${itemName}-已编辑`;
  const imagePath = join(process.cwd(), "assets", "home-logo.jpg");

  await page.click("#wishlistNav");
  await page.waitForSelector("#wishlistPage:not([hidden])");
  await page.click('[data-wishlist-module="shopping"]');
  await page.waitForSelector("#shoppingContent:not([hidden])");
  await page.click("#shoppingToggle");
  await page.fill("#shoppingNameInput", itemName);
  await page.fill("#shoppingPriceInput", "128.50");
  await page.fill("#shoppingLinkInput", "https://example.com/product");
  await page.fill("#shoppingNoteInput", "自动验收：初始备注");
  await page.setInputFiles("#shoppingImageInput", imagePath);
  await page.click("#shoppingSubmitButton");

  let card = page.locator("#shoppingList .shopping-card", { hasText: itemName });
  await card.waitFor({ state: "visible", timeout: 30000 });
  const itemImage = card.locator("img");
  assert.match(await itemImage.getAttribute("src"), /^https?:\/\//, `${label} shopping image was not uploaded`);
  await itemImage.evaluate((image) => {
    if (image.complete && image.naturalWidth > 0) return;
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", () => reject(new Error("shopping image failed to load")), { once: true });
    });
  });
  await itemImage.click();
  await page.waitForSelector(".shopping-image-dialog[open]", { timeout: 10000 });
  assert.equal(
    await page.locator(".shopping-image-dialog img").getAttribute("src"),
    await itemImage.getAttribute("src"),
    `${label} shopping image preview opened with the wrong image`
  );
  await page.locator(".shopping-image-dialog img").evaluate((image) => {
    if (image.complete && image.naturalWidth > 0) return;
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", () => reject(new Error("shopping preview image failed to load")), { once: true });
    });
  });
  const previewMetrics = await page.evaluate(() => {
    const dialog = document.querySelector(".shopping-image-dialog");
    const image = dialog?.querySelector("img");
    const dialogRect = dialog?.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    return {
      viewportCenter: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      dialogCenter: dialogRect ? { x: dialogRect.left + dialogRect.width / 2, y: dialogRect.top + dialogRect.height / 2 } : null,
      imageCenter: imageRect ? { x: imageRect.left + imageRect.width / 2, y: imageRect.top + imageRect.height / 2 } : null,
    };
  });
  for (const [name, center] of [["dialog", previewMetrics.dialogCenter], ["image", previewMetrics.imageCenter]]) {
    assert.ok(center, `${label} shopping ${name} preview has no bounds`);
    assert.ok(
      Math.abs(center.x - previewMetrics.viewportCenter.x) <= 4 &&
      Math.abs(center.y - previewMetrics.viewportCenter.y) <= 4,
      `${label} shopping ${name} preview is not centered: ${JSON.stringify(previewMetrics)}`
    );
  }
  await page.click(".shopping-image-dialog-close");
  await page.waitForFunction(() => !document.querySelector(".shopping-image-dialog")?.open);
  assert.equal(await page.locator(".shopping-image-dialog").isVisible(), false, `${label} shopping image preview stayed visible after closing`);
  assert.match(await card.textContent(), /¥128\.5/);

  await card.locator("[data-shopping-menu]").click();
  await page.waitForSelector(".shopping-action-dialog[open]");
  await page.click('[data-shopping-action="edit"]');
  await page.fill("#shoppingNameInput", editedName);
  await page.fill("#shoppingNoteInput", "自动验收：编辑成功");
  await page.click("#shoppingSubmitButton");
  card = page.locator("#shoppingList .shopping-card", { hasText: editedName });
  await card.waitFor({ state: "visible", timeout: 30000 });
  assert.match(await card.textContent(), /编辑成功/);

  await card.locator("[data-toggle-shopping]").click();
  await page.waitForFunction(
    (name) => [...document.querySelectorAll("#shoppingList .shopping-card")].some(
      (entry) => entry.textContent.includes(name) && entry.classList.contains("completed")
    ),
    editedName,
    { timeout: 30000 }
  );
  await page.click('[data-shopping-filter="open"]');
  assert.equal(await page.locator("#shoppingList .shopping-card", { hasText: editedName }).count(), 0, `${label} completed item appears in unfinished filter`);
  await page.click('[data-shopping-filter="done"]');
  card = page.locator("#shoppingList .shopping-card", { hasText: editedName });
  await card.waitFor({ state: "visible" });
  if (label === "mobile") {
    const compactMetrics = await card.evaluate((entry) => ({
      cardHeight: entry.getBoundingClientRect().height,
      imageWidth: entry.querySelector(".shopping-card-image")?.getBoundingClientRect().width || 0,
      actionWidth: entry.querySelector(".shopping-card-tools")?.getBoundingClientRect().width || 0,
    }));
    assert.ok(compactMetrics.cardHeight <= 150, `mobile shopping row is too tall: ${JSON.stringify(compactMetrics)}`);
    assert.ok(compactMetrics.imageWidth >= 86 && compactMetrics.imageWidth <= 90, `mobile shopping thumbnail is the wrong size: ${JSON.stringify(compactMetrics)}`);
    assert.ok(compactMetrics.actionWidth >= 40 && compactMetrics.actionWidth <= 52, `mobile shopping actions have the wrong width: ${JSON.stringify(compactMetrics)}`);
  }
  await assertNoHorizontalOverflow(page, `${label} shopping cart`);
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: join(screenshotDir, `shopping-${label}.png`), fullPage: true });

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForSignedInAccount(page, `${label} shopping reload`);
  await page.click("#wishlistNav");
  await page.click('[data-wishlist-module="shopping"]');
  await page.click('[data-shopping-filter="done"]');
  card = page.locator("#shoppingList .shopping-card", { hasText: editedName });
  await card.waitFor({ state: "visible", timeout: 30000 });
  await card.locator("img").evaluate((image) => {
    if (image.complete && image.naturalWidth > 0) return;
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", () => reject(new Error("persisted shopping image failed to load")), { once: true });
    });
  });
  assert.ok(await card.evaluate((entry) => entry.classList.contains("completed")), `${label} completed state did not survive reload`);

  await card.click({ position: { x: 170, y: 55 } });
  await page.waitForSelector(".shopping-detail-dialog[open]");
  assert.match(await page.locator(".shopping-detail-dialog").textContent(), new RegExp(editedName));
  await page.click(".shopping-detail-close");
  await page.waitForFunction(() => !document.querySelector(".shopping-detail-dialog")?.open);

  await card.locator("[data-toggle-shopping]").click();
  await page.waitForFunction(
    (name) => [...document.querySelectorAll("#shoppingList .shopping-card")].some(
      (entry) => entry.textContent.includes(name) && !entry.classList.contains("completed")
    ),
    editedName,
    { timeout: 30000 }
  );
  card = page.locator("#shoppingList .shopping-card", { hasText: editedName });
  const countBeforeDelete = await page.locator("#shoppingList .shopping-card").count();
  const openCountBeforeDelete = Number(await page.locator("#shoppingOpenCount").textContent());
  await card.locator("[data-shopping-menu]").click();
  await page.waitForSelector(".shopping-action-dialog[open]");
  await page.click('[data-shopping-action="delete"]');
  await page.waitForSelector(".action-confirm-dialog[open]");
  assert.match(await page.locator(".action-confirm-dialog h2").textContent(), /确定要删除这个商品吗/);
  await page.click('.action-confirm-dialog button[value="confirm"]');
  await card.waitFor({ state: "detached", timeout: 30000 });
  assert.equal(await page.locator("#shoppingList .shopping-card").count(), countBeforeDelete - 1, `${label} deleted shopping item stayed in the DOM`);
  assert.equal(Number(await page.locator("#shoppingOpenCount").textContent()), openCountBeforeDelete - 1, `${label} shopping unfinished count did not update after deletion`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForSignedInAccount(page, `${label} shopping delete reload`);
  await page.click("#wishlistNav");
  await page.click('[data-wishlist-module="shopping"]');
  await page.click('[data-shopping-filter="open"]');
  assert.equal(await page.locator("#shoppingList .shopping-card", { hasText: editedName }).count(), 0, `${label} deleted shopping item returned after reload`);
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
  await assertSecretAlbumLinkFlow(desktop, desktopErrors);
  await assertVlogAudioUi(desktop, "desktop");
  await assertVlogMediaBadge(desktop, "desktop");
  await desktop.click("#avatarButton");
  await desktop.waitForSelector("#accountSettingsButton", { state: "visible" });
  await desktop.click("#avatarButton");
  await desktop.waitForSelector("#accountSettingsButton", { state: "hidden" });
  await assertNoHorizontalOverflow(desktop, "desktop home");

  await assertModularViews(desktop, "desktop");
  await assertWishlistReceiptFlow(desktop, "desktop", desktopErrors);
  await assertShoppingFlow(desktop, "desktop");
  await assertFavoriteRoundTrip(desktop, "desktop");
  await assertDiaryDetailFlow(desktop, "desktop", false, desktopErrors);
  await desktop.click("#galleryNav");
  await desktop.waitForSelector("#galleryFilters");
  await assertWeekendAlbumFlow(desktop, "desktop");
  await assertNoHorizontalOverflow(desktop, "desktop navigation");
  assert.deepEqual(desktopErrors, [], desktopErrors.join("\n"));
  await desktopContext.unrouteAll({ behavior: "ignoreErrors" });
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
  await assertSecretAlbumLinkFlow(mobile, mobileErrors);
  await assertVlogAudioUi(mobile, "mobile");
  await assertVlogMediaBadge(mobile, "mobile");
  await assertMobileUploadStatusLayout(mobile);
  await assertMobilePageShell(mobile, "mobile");
  await mobile.click("#avatarButton");
  await mobile.waitForSelector("#accountSettingsButton", { state: "visible" });
  await mobile.click("#avatarButton");
  await mobile.waitForSelector("#accountSettingsButton", { state: "hidden" });
  await assertModularViews(mobile, "mobile");
  await assertWishlistReceiptFlow(mobile, "mobile", mobileErrors);
  await assertShoppingFlow(mobile, "mobile");
  await assertFavoriteRoundTrip(mobile, "mobile");
  await assertDiaryDetailFlow(mobile, "mobile", true, mobileErrors);
  await mobile.click("#galleryNav");
  await mobile.waitForSelector("#galleryFilters");
  await assertWeekendAlbumFlow(mobile, "mobile");
  await assertNoHorizontalOverflow(mobile, "mobile navigation");
  assert.deepEqual(mobileErrors, [], mobileErrors.join("\n"));
  await mobileContext.unrouteAll({ behavior: "ignoreErrors" });
  await mobileContext.close();

  console.log(`Release smoke checks passed: ${baseUrl} (desktop + mobile). Screenshots: ${screenshotDir}`);
} finally {
  await browser.close();
}
