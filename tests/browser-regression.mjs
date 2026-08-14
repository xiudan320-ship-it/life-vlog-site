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
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".topbar");
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

async function testComponentStates(viewport, label) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/tests/component-regression.html`, { waitUntil: "load" });
  await assertNoHorizontalOverflow(page, `${label} component states`);

  const wishCards = await page.locator(".wish-card").evaluateAll((cards) =>
    cards.map((card) => ({
      height: Math.round(card.getBoundingClientRect().height),
      imageHeight: Math.round(card.querySelector(".wish-card-image-button").getBoundingClientRect().height),
      actionsBottom: Math.round(card.querySelector(".wish-actions").getBoundingClientRect().bottom),
      cardBottom: Math.round(card.getBoundingClientRect().bottom),
    }))
  );
  assert.equal(wishCards.length, 2, `${label} wish fixture is incomplete`);
  assert.ok(
    Math.abs(wishCards[0].imageHeight - wishCards[1].imageHeight) <= 1,
    `${label} wishlist image regions have different heights`
  );
  if (viewport.width <= 700) {
    assert.ok(
      Math.abs(wishCards[0].height - wishCards[1].height) <= 1,
      `${label} wishlist cards have different heights`
    );
    const receipt = await page.locator(".wish-completion-note").boundingBox();
    assert.ok(receipt && receipt.height >= 24, `${label} completion receipt is collapsed`);
  }
  for (const card of wishCards) {
    assert.ok(
      card.actionsBottom <= card.cardBottom + 1,
      `${label} wishlist actions overlap card boundary: ${JSON.stringify(card)}`
    );
  }

  const toolbar = await page.locator(".secret-album-toolbar").boundingBox();
  assert.ok(toolbar && toolbar.width > 0 && toolbar.height > 0, `${label} secret selection toolbar is missing`);
  assert.ok(toolbar && toolbar.width <= viewport.width, `${label} secret selection toolbar overflows`);
  await context.close();
}

try {
  await testHomeShell({ width: 1440, height: 900 }, "desktop");
  await testHomeShell({ width: 390, height: 844 }, "mobile");
  await testDiaryDetail({ width: 1440, height: 900 }, "desktop");
  await testDiaryDetail({ width: 390, height: 844 }, "mobile");
  await testComponentStates({ width: 1440, height: 900 }, "desktop");
  await testComponentStates({ width: 390, height: 844 }, "mobile");
  console.log("Browser regression checks passed for desktop and mobile.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
