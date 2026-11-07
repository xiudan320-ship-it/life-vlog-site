import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readWorkboxManifest } from "../scripts/workbox-manifest.mjs";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";

const root = resolve("dist");
const headers = await readFile(resolve(root, "_headers"), "utf8");
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
// The fixture server uses HTTP. WebKit upgrades loopback subresources to HTTPS
// with this transport directive; production serves HTTPS and keeps it intact.
const localCsp = csp.replace(/;\s*upgrade-insecure-requests\b/, "");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (!path.startsWith(root + sep) || !await stat(path).then((file) => file.isFile(), () => false)) {
    response.writeHead(404).end("Not found"); return;
  }
  response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Content-Security-Policy": localCsp, "X-Content-Type-Options": "nosniff" });
  createReadStream(path).pipe(response);
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browserType = process.argv.includes("--webkit") ? webkit : chromium;
const browser = await browserType.launch({ headless: true });
const key = "monster-save-7.1";
const errors = [];
const external = [];
const contexts = [];
const artifacts = resolve("artifacts/monster");
await mkdir(artifacts, { recursive: true });

async function pageFor({ roll = 0x13579bdf, corrupt = false, blocked = false, colorScheme = "dark", reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme, reducedMotion });
  contexts.push(context);
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await context.addInitScript(({ key, roll, corrupt, blocked }) => {
    crypto.getRandomValues = (array) => { array.fill(roll); return array; };
    if (corrupt) localStorage.setItem(key, "{broken fixture");
    if (blocked) {
      window.monsterFixtureBlockSave = true;
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key && window.monsterFixtureBlockSave) throw new DOMException("fixture quota", "QuotaExceededError");
        return write.call(this, name, value);
      };
    }
  }, { key, roll, corrupt, blocked });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${origin}/monster.html`);
  await page.waitForFunction(() => ["menu", "error"].includes(document.body.dataset.monsterStage));
  return page;
}
const stage = (page, value) => page.waitForFunction((value) => document.body.dataset.monsterStage === value, value);
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key))?.state, key);
async function create(page) {
  await page.locator("#monsterEnter").click();
  await page.locator("#monsterName").fill("验证勇者");
  await page.locator('#monsterNewGameForm button[type="submit"]').click();
  await stage(page, "home");
}
async function fight(page) {
  await page.locator("#monsterAdventure").click();
  await stage(page, "battle");
  assert.equal(await page.locator("#monsterAdventure").isDisabled(), true);
  await stage(page, "result");
  await page.waitForTimeout(300); // Native victory ScaleTo sequence completes in 230ms.
}
async function noOverflow(page) {
  const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(size.scroll <= size.width + 1, JSON.stringify(size));
}
async function accessible(page) {
  const report = await new AxeBuilder({ page }).analyze();
  const failures = report.violations.filter(({ impact }) => ["critical", "serious"].includes(impact))
    .map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }));
  assert.deepEqual(failures, []);
}
try {
  const manifest = await readWorkboxManifest(resolve(root, "sw.js"));
  assert.ok(!manifest.some(({ url }) => /^\/?(?:monster(?:\/|\.html)|assets\/monster-)/.test(url)), "game resources must stay out of home precache");
  const index = await readFile(resolve(root, "index.html"), "utf8");
  assert.match(index, /href="\/monster.html" data-tool-id="monster"/);
  const page = await pageFor();
  await page.screenshot({ path: resolve(artifacts, "menu.png") });
  await create(page);
  assert.equal((await saved(page)).gold, 1000);
  await fight(page);
  let state = await saved(page);
  assert.deepEqual([state.gold, state.player.experience, state.player.level, state.player.hp], [1117, 15, 1, 230]);
  assert.equal(state.progress.copies.find((copy) => copy.id === 1001).value, 1);
  await page.screenshot({ path: resolve(artifacts, "victory.png") });
  await page.reload(); await stage(page, "menu");
  assert.equal(await page.locator("#monsterEnter").textContent(), "继续游戏");
  await page.locator("#monsterEnter").click(); await stage(page, "home");
  await fight(page);
  state = await saved(page);
  assert.deepEqual([state.gold, state.player.experience, state.player.level, state.player.attack, state.player.maxHp], [1234, 10, 2, 259, 259]);
  await page.locator("#monsterEnter").click(); await stage(page, "home");
  const levelText = await page.evaluate(() => {
    function find(node) { if (node.getName?.() === "text_level") return node.getString(); for (const child of node.getChildren?.() || []) { const value = find(child); if (value) return value; } }
    return find(cc.director.getRunningScene());
  });
  assert.equal(levelText, "等级2");
  await accessible(page);
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    await noOverflow(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#monsterRole").click();
  assert.equal(await page.locator(".monster-item img").count(), 9);
  await page.locator(".monster-item img").evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await page.screenshot({ path: resolve(artifacts, "role.png") });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#monsterDetails").evaluate((dialog) => dialog.open), false);
  assert.equal(await page.locator("#monsterRole").evaluate((button) => document.activeElement === button), true);
  await page.locator("#monsterBag").click();
  assert.match(await page.locator("#monsterDetailsContent").textContent(), /暂时没有材料/);
  await page.locator("#monsterDetailsClose").click();

  const drops = await pageFor({ roll: 16, colorScheme: "light", reducedMotion: "reduce" });
  await create(drops); await fight(drops);
  const goods = (await saved(drops)).inventory.goods;
  assert.ok(goods.length > 0 && goods.every((item) => item.quantity > 0));
  await drops.locator("#monsterBag").click();
  assert.equal(await drops.locator(".monster-item").count(), goods.length);
  await drops.locator(".monster-item img").evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await accessible(drops);
  await drops.screenshot({ path: resolve(artifacts, "materials-light.png") });
  await drops.reload(); await stage(drops, "menu");
  assert.deepEqual((await saved(drops)).inventory.goods, goods);

  const quota = await pageFor({ blocked: true });
  await create(quota);
  assert.equal(await saved(quota), undefined);
  assert.equal(await quota.locator("#monsterSaveRetry").isVisible(), true);
  await quota.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await quota.locator("#monsterSaveRetry").click();
  assert.equal((await saved(quota)).gold, 1000);
  assert.equal(await quota.locator("#monsterSaveRetry").isVisible(), false);

  const corrupt = await pageFor({ corrupt: true });
  assert.match(await corrupt.locator("#monsterStatus").textContent(), /存档读取失败/);
  assert.equal(await corrupt.locator("#monsterEnter").isDisabled(), true);
  assert.equal(await corrupt.evaluate((key) => localStorage.getItem(key), key), "{broken fixture");
  const rare = await pageFor({ roll: 0 }); await create(rare);
  await rare.locator("#monsterAdventure").click();
  assert.match(await rare.locator("#monsterStatus").textContent(), /特殊遭遇/);
  assert.equal((await saved(rare)).gold, 1000);
  assert.equal(await rare.locator("body").getAttribute("data-monster-stage"), "home");
  const host = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  contexts.push(host);
  await host.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await createCloudflareApiFixture().install(host);
  const home = await host.newPage();
  const homeRequests = [];
  home.on("request", (request) => homeRequests.push(request.url()));
  home.on("pageerror", (error) => errors.push(error.message));
  await home.goto(`${origin}/index.html`);
  await home.waitForSelector("#appSplash[hidden]", { state: "attached" });
  assert.ok(!homeRequests.some((url) => new URL(url).pathname.startsWith("/monster/")), "home eagerly loaded game resources");
  const dock = home.locator("#toolDock");
  await dock.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: "instant" }));
  const shortcut = await home.locator('[data-tool-id="monster"]').evaluate((element) => {
    const item = element.getBoundingClientRect();
    const rail = element.parentElement.getBoundingClientRect();
    return { visible: element.dataset.mobileToolVisible, reachable: item.left >= rail.left - 1 && item.right <= rail.right + 1 };
  });
  assert.deepEqual(shortcut, { visible: "true", reachable: true });
  await home.screenshot({ path: resolve(artifacts, "home-shortcut.png") });
  await home.locator('[data-tool-id="monster"]').click();
  await stage(home, "menu");
  assert.equal(new URL(home.url()).pathname, "/monster.html");
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(`Monster ${browserType.name()} passed: native first win, reload, level-up, drops, dialogs, 6 widths, light/dark, reduced motion, quota retry, corrupt save, rare-encounter boundary, CSP and resource isolation.`);
} finally {
  await Promise.all(contexts.map((context) => context.close()));
  await browser.close();
  await new Promise((done) => server.close(done));
}
