import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
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
  const rawPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const filePath = normalize(join(root, relativePath));
  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
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

async function testHomeShell(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".topbar");
  assert.deepEqual(pageErrors, [], `${label} home shell runtime errors:\n${pageErrors.join("\n")}`);
  assert.equal(await page.locator("#brandName").textContent(), "咻蛋之家");
  await assertNoHorizontalOverflow(page, `${label} home shell`);

  const topbar = await page.locator(".topbar").boundingBox();
  assert.ok(topbar && topbar.width <= viewport.width + 1, `${label} topbar must fit viewport`);
  assert.ok(topbar && topbar.height >= 48 && topbar.height <= 190, `${label} topbar height is unstable`);
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
        stampWidth: stampRect ? Math.round(stampRect.width) : 0,
        stampHeight: stampRect ? Math.round(stampRect.height) : 0,
        stampTop: stampRect ? Math.round(stampRect.top) : 0,
        stampRight: stampRect ? Math.round(stampRect.right) : 0,
        cardTop: Math.round(cardRect.top),
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
  const openCards = cards.filter((card) => card.stateControlText);
  assert.equal(openCards.length, 1, `${label} open weekend card is missing its action button`);
  assert.equal(openCards[0].stateControlText, "完成", `${label} open weekend action should say 完成: ${JSON.stringify(openCards[0])}`);
  assert.ok(openCards[0].stateControlWidth >= 60, `${label} open weekend action is too narrow: ${JSON.stringify(openCards[0])}`);
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

try {
  await testHomeShell({ width: 1440, height: 900 }, "desktop");
  await testHomeShell({ width: 390, height: 844 }, "mobile");
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
  console.log("Browser regression checks passed for desktop and mobile.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
