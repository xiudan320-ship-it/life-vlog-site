import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const template = await readFile(new URL("../modules/routes/templates/secret.html", import.meta.url), "utf8");
const types = { ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://fixture").pathname);
    if (pathname === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/tests/test-redesign.css"><title>秘藏逻辑与布局验收</title></head><body><main style="max-width:1280px;margin:auto;padding:16px">${template}</main><script type="module" src="/tests/fixtures/secret-gallery-browser-fixture.mjs"></script></body></html>`);
      return;
    }
    const path = resolve(root, `.${pathname}`);
    if (!path.startsWith(resolve(root) + sep)) { response.writeHead(403).end(); return; }
    response.setHeader("content-type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({ headless: true });
const output = resolve(root, "artifacts/secret-gallery");
await mkdir(output, { recursive: true });
const errors = [];
const more = '[data-secret-album-more="a"]';
async function ready(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.fixture?.ready);
}
async function openA(page) { await page.locator('[data-secret-album-card="a"] [data-secret-index]').click(); }
async function order(page) { return page.locator("[data-secret-photo]").evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.secretPhoto))); }
async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); }
async function accessible(page) {
  const result = await new AxeBuilder({ page }).include("#secretGallery").analyze();
  assert.deepEqual(result.violations.filter(({ impact }) => ["serious", "critical"].includes(impact)).map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })), []);
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await ready(page);
  assert.match(await page.locator("#secretFolderList").textContent(), /已收藏/);
  assert.doesNotMatch(await page.locator("#secretPage").textContent(), /收藏夹/);
  await page.locator(more).focus();
  await page.locator(more).press("Enter");
  assert.equal(await page.getByRole("menuitem").count(), 4);
  assert.equal(await page.getByRole("menuitem", { name: "移动到文件夹" }).evaluate((el) => el === document.activeElement), true);
  await page.keyboard.press("End");
  assert.equal(await page.getByRole("menuitem", { name: "删除相册" }).evaluate((el) => el === document.activeElement), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(more).evaluate((el) => el === document.activeElement), true);
  await page.locator(more).click();
  await page.locator("#secretSearchInput").click();
  assert.equal(await page.getByRole("menu").count(), 0);
  await page.locator('[data-secret-album-card="a"] [data-secret-index]').click({ button: "right" });
  await page.getByRole("menuitem", { name: "置顶相册", exact: true }).click();
  await page.waitForFunction(() => fixture.rows.get("a").is_pinned === 1);
  assert.equal(await page.locator(more).evaluate((el) => el === document.activeElement), true);
  await page.locator(more).click();
  await page.getByRole("menuitem", { name: "重命名" }).click();
  assert.equal(await page.locator("[data-secret-edit-title]").evaluate((el) => el === document.activeElement), true);
  await page.locator("[data-secret-edit-title]").fill("海边回忆");
  await page.locator('[data-secret-edit-form] button[type="submit"]').click();
  await page.waitForFunction(() => fixture.rows.get("a").title === "海边回忆");
  await page.evaluate(() => fixture.seed());

  await openA(page);
  assert.deepEqual(await order(page), [0, 2, 1]);
  assert.equal(await page.locator("[data-secret-move-album]").count(), 0, "management tools appear only after selecting images");
  await page.selectOption("[data-secret-photo-sort]", "time-asc");
  assert.deepEqual(await order(page), [1, 2, 0]);
  await page.selectOption("[data-secret-photo-sort]", "number");
  assert.deepEqual(await order(page), [2, 1, 0]);
  await page.selectOption("[data-secret-photo-sort]", "manual");
  assert.deepEqual(await order(page), [0, 1, 2]);
  await page.click("[data-secret-select-mode]");
  await page.click('[data-secret-photo="1"]');
  await page.click('[data-secret-move="-1"]');
  await page.waitForFunction(() => fixture.rows.get("a").images[0].image_path === "two");
  await page.click("[data-secret-back]");
  await page.evaluate(() => fixture.controller.loadSecretItems());
  await openA(page);
  assert.equal(await page.locator("[data-secret-photo-sort]").inputValue(), "manual");
  assert.deepEqual(await page.evaluate(() => fixture.state.secretItems.find((item) => item.id === "a").images.map((image) => image.image_path)), ["two", "ten", "one"]);
  await page.evaluate(() => { fixture.failId = "a"; });
  await page.selectOption("[data-secret-photo-sort]", "number");
  await page.waitForFunction(() => document.querySelector("[data-secret-photo-sort]").value === "manual");
  assert.match(await page.locator("#secretStatus").textContent(), /失败/);
  await page.click("[data-secret-back]");

  await page.fill("#secretSearchInput", "日落");
  assert.equal(await page.locator("[data-secret-search-album]").count(), 1);
  assert.equal(await page.locator("[data-secret-search-photo]").count(), 2);
  await page.locator("[data-secret-search-photo]").first().click();
  await page.waitForFunction(() => document.querySelector("#fixtureViewer").open);
  assert.equal(await page.evaluate(() => fixture.state.dialogImages[0].image_path), "two");
  assert.equal(await page.locator("#dialogTitle").textContent(), "海边相册");
  await page.click("#closeViewer");
  assert.equal(await page.locator("[data-secret-search-photo]").first().evaluate((el) => el === document.activeElement), true);
  await page.locator("[data-secret-search-source]").first().click();
  assert.equal(await page.locator("[data-secret-photo]").count(), 3);
  assert.equal(await page.locator("#secretSearchInput").inputValue(), "");
  await page.click("[data-secret-back]");
  await page.fill("#secretSearchInput", "不存在");
  assert.equal(await page.locator("[data-secret-create-album]").count(), 0);
  assert.match(await page.locator("#secretGallery").textContent(), /没有匹配/);
  await page.click("[data-secret-clear-search]");
  await page.click('[data-secret-folder="home"]');
  await page.fill("#secretSearchInput", "日落");
  assert.equal(await page.locator("[data-secret-search-photo]").count(), 0);
  assert.equal(await page.locator("[data-secret-search-album]").count(), 1);
  await page.click('[data-secret-folder="favorites"]');
  assert.equal(await page.locator("[data-secret-search-photo]").count(), 2);
  await page.click("[data-secret-clear-search]");
  await page.click('[data-secret-folder="all"]');

  await page.locator(more).click();
  await page.getByRole("menuitem", { name: "移动到文件夹" }).click();
  await page.locator('#secretAlbumFolderDialog button[value="home"]').click();
  await page.waitForFunction(() => fixture.rows.get("a").folder_id === "home");
  assert.equal(await page.evaluate(() => fixture.rows.get("a").images.length), 3);
  await page.locator(more).click();
  await page.getByRole("menuitem", { name: "移动到文件夹" }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => fixture.rows.get("a").folder_id), "home", "Escape cannot replay a previous folder choice");
  await page.locator('[data-secret-album-more="b"]').click();
  await page.getByRole("menuitem", { name: "删除相册", exact: true }).click();
  await page.locator('.action-confirm-dialog button[value="cancel"]').click();
  assert.equal(await page.evaluate(() => fixture.rows.size), 2);
  await page.locator('[data-secret-album-more="b"]').click();
  await page.getByRole("menuitem", { name: "删除相册", exact: true }).click();
  await page.locator('.action-confirm-dialog button[value="confirm"]').click();
  await page.waitForFunction(() => fixture.rows.size === 1);
  assert.equal(await page.evaluate(() => fixture.trash[0][1]), "b");
  assert.equal(await page.evaluate(() => fixture.rows.get("a").images.length), 3);

  await page.evaluate(() => fixture.seed());
  await openA(page);
  await page.click("[data-secret-select-mode]");
  await page.click('[data-secret-photo="1"]');
  await page.selectOption("[data-secret-move-album-select]", "b");
  await page.evaluate(() => { fixture.failId = "b"; });
  await page.click("[data-secret-move-album]");
  await page.waitForFunction(() => document.querySelector("#secretStatus").textContent.includes("失败"));
  assert.equal(await page.evaluate(() => fixture.rows.get("a").images.length), 3, "failed destination writes never remove source images");
  await page.evaluate(() => { fixture.failId = "a"; });
  await page.click("[data-secret-move-album]");
  await page.waitForFunction(() => document.querySelector("#secretStatus").textContent.includes("已恢复"));
  assert.equal(await page.evaluate(() => fixture.rows.get("a").images.length), 3);
  assert.equal(await page.evaluate(() => fixture.rows.get("b").images.length), 1, "failed source writes restore the destination");
  await page.selectOption("[data-secret-move-album-select]", "b");
  await page.click("[data-secret-move-album]");
  await page.waitForFunction(() => fixture.rows.get("b").images.length === 2);
  assert.deepEqual(await page.evaluate(() => fixture.rows.get("a").images.map((image) => image.image_path)), ["ten", "one"]);
  assert.deepEqual(await page.evaluate(() => fixture.rows.get("b").images.map((image) => image.image_path)), ["indoor", "two"]);
  await page.click("[data-secret-select-mode]");
  await page.click('[data-secret-photo="0"]');
  await page.click("[data-secret-delete-selected]");
  await page.locator('.action-confirm-dialog button[value="confirm"]').click();
  await page.waitForFunction(() => fixture.rows.get("a").images.length === 1);
  assert.equal(await page.evaluate(() => fixture.rows.get("a").images[0].image_path), "one");
  assert.deepEqual(await page.evaluate(() => fixture.cleaned), ["ten"]);
  await page.close();

  for (const width of [390, 1440]) {
    const visualContext = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block" });
    const visual = await visualContext.newPage();
    await ready(visual);
    for (const dark of [false, true]) {
      await visual.evaluate((value) => { document.body.classList.toggle("theme-dark", value); }, dark);
      await noOverflow(visual);
      await visual.screenshot({ path: resolve(output, `${width}-${dark ? "dark" : "light"}-collection.png`), fullPage: true });
      if (dark) await accessible(visual);
      if (width === 390) assert.equal(await visual.locator(".secret-album-wall").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length), 2);
      await visual.locator(more).click();
      await noOverflow(visual);
      await visual.screenshot({ path: resolve(output, `${width}-${dark ? "dark" : "light"}-menu.png`) });
      await visual.keyboard.press("Escape");
      await openA(visual);
      await noOverflow(visual);
      assert.equal(await visual.locator(".secret-album-head").count(), 1);
      assert.equal(await visual.locator(more).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), true, "the album menu remains visible and clickable above the content");
      await visual.screenshot({ path: resolve(output, `${width}-${dark ? "dark" : "light"}-album.png`), fullPage: true });
      if (dark) await accessible(visual);
      await visual.click("[data-secret-select-mode]");
      await visual.locator("[data-secret-photo]").first().click();
      await noOverflow(visual);
      await visual.screenshot({ path: resolve(output, `${width}-${dark ? "dark" : "light"}-selection.png`), fullPage: true });
      if (dark) await accessible(visual);
      await visual.click("[data-secret-select-mode]");
      await visual.click("[data-secret-back]");
      await visual.fill("#secretSearchInput", "日落");
      await visual.waitForFunction(() => [...document.querySelectorAll("[data-secret-search-photo] img")].every((image) => image.complete && image.naturalWidth > 0 && getComputedStyle(image).opacity === "1"));
      await noOverflow(visual);
      await visual.screenshot({ path: resolve(output, `${width}-${dark ? "dark" : "light"}-search.png`), fullPage: true });
      if (dark) await accessible(visual);
      await visual.click("[data-secret-clear-search]");
    }
    if (width === 390) {
      const cover = visual.locator('[data-secret-album-card="a"] [data-secret-index]');
      await cover.dispatchEvent("pointerdown", { pointerType: "touch", clientX: 60, clientY: 300 });
      await visual.getByRole("menu").waitFor();
      await cover.dispatchEvent("pointerup", { pointerType: "touch" });
      await cover.dispatchEvent("click");
      assert.equal(await visual.locator(".secret-album-view").count(), 0, "long press opens the menu without opening the album");
    }
    await visualContext.close();
  }
  assert.deepEqual(errors, []);
  console.log("Secret gallery browser checks passed: sort persistence and errors, scoped photo search and source navigation, keyboard/touch menus, folder moves, safe deletion, batch actions, light/dark desktop/mobile and overflow.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
