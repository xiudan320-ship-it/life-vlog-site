import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readWorkboxManifest } from "../scripts/workbox-manifest.mjs";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";
import worker from "../cloudflare-worker/src/worker.js";

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
const origin = process.env.MONSTER_BASE_URL
  ? new URL(process.env.MONSTER_BASE_URL).origin
  : `http://127.0.0.1:${server.address().port}`;
const browserType = process.argv.includes("--webkit") ? webkit : chromium;
const browser = await browserType.launch({ headless: true });
const key = "life-vlog-cloudflare-auth";
const fixtures = new Map();
const errors = [];
const requestFailures = [];
const external = [];
const contexts = [];
const artifacts = resolve("artifacts/monster");
await mkdir(artifacts, { recursive: true });

async function pageFor({ roll = 0x13579bdf, corrupt = false, blocked = false, colorScheme = "dark", reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme, reducedMotion });
  contexts.push(context);
  context.on("requestfailed", (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  const fixture = createWorkerFixture({ origin });
  if (corrupt) fixture.DB.database.prepare("insert into monster_saves values (?, ?, ?, ?)").run("owner", "{}", 1, "2030-01-01T00:00:00Z");
  let page;
  await context.route("**/*", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/monster/save") {
      const request = route.request();
      if (request.method() === "PUT" && await page.evaluate(() => window.monsterFixtureBlockSave)) return route.fulfill({ status: 503, headers: { "access-control-allow-origin": origin }, contentType: "application/json", body: JSON.stringify({ error: "fixture save failure" }) });
      const response = await worker.fetch(new Request(request.url(), { method: request.method(), headers: request.headers(), ...(request.postData() ? { body: request.postData() } : {}) }), fixture.env);
      return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
    }
    if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await context.addInitScript(({ key, roll, blocked, token }) => {
    crypto.getRandomValues = (array) => { array.fill(roll); return array; };
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ access_token: token, user: { id: "owner" }, expires_at: "2099-01-01T00:00:00Z" }));
    window.monsterFixtureBlockSave = blocked;
  }, { key, roll, blocked, token: fixture.tokens.get("owner") });
  page = await context.newPage();
  fixtures.set(page, fixture);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("503")) errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400 && response.status() !== 503) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${origin}/monster.html`);
  await page.waitForFunction(() => ["menu", "error"].includes(document.body.dataset.monsterStage));
  return page;
}
const stage = (page, value) => page.waitForFunction((value) => document.body.dataset.monsterStage === value, value);
const saved = async (page, user = "owner") => {
  const row = fixtures.get(page).DB.database.prepare("select state_json from monster_saves where user_id = ?").get(user);
  return row ? JSON.parse(row.state_json) : undefined;
};
async function create(page) {
  await page.locator("#monsterEnter").click();
  await page.locator("#monsterName").fill("验证勇者");
  await page.locator('#monsterNewGameForm button[type="submit"]').click();
  await stage(page, "home");
}
async function fight(page, copyId = 1001) {
  await page.locator("#monsterAdventure").click();
  await page.locator(`[data-copy-id="${copyId}"]`).click();
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
  await page.screenshot({ path: resolve(artifacts, "home-game.png") });
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
    function find(node) { if (node.getName?.() === "text_level") return { value: node.getString(), top: (cc.winSize.height - node.convertToWorldSpaceAR(cc.p(0, 0)).y) / cc.winSize.height * innerHeight }; for (const child of node.getChildren?.() || []) { const value = find(child); if (value) return value; } }
    return find(cc.director.getRunningScene());
  });
  assert.equal(levelText.value, "等级2");
  assert.ok(levelText.top >= 0 && levelText.top < 100, `HUD moved away from the safe top: ${levelText.top}`);
  await accessible(page);
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    await noOverflow(page);
    if (width <= 430) {
      const frame = await page.locator("#monsterFrame").evaluate((node) => ({ top: node.getBoundingClientRect().top, width: node.clientWidth, height: node.clientHeight, viewportHeight: innerHeight }));
      assert.deepEqual(frame, { top: 0, width, height: frame.viewportHeight, viewportHeight: frame.viewportHeight });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#monsterAdventure").click();
  assert.equal(await page.locator(".monster-copy-row").count(), 6);
  assert.equal(await page.locator('[data-copy-id="1002"]').isEnabled(), true);
  assert.equal(await page.locator('[data-copy-id="1003"]').isDisabled(), true);
  await page.locator('[data-copy-type="2"]').click(); assert.equal(await page.locator(".monster-copy-row").count(), 32);
  await page.locator('[data-copy-type="5"]').click(); assert.equal(await page.locator(".monster-copy-row").count(), 114);
  assert.equal(await page.locator('[data-copy-id="5001"]').getAttribute("title"), "需要等级 30");
  await page.locator('[data-copy-type="6"]').click(); assert.equal(await page.locator(".monster-copy-row").count(), 1);
  await page.locator('[data-copy-type="3"]').click(); assert.equal(await page.locator(".monster-copy-row").count(), 24);
  await page.locator('[data-copy-type="1"]').click();
  assert.equal(await page.locator(".monster-chapter").count(), 21);
  await accessible(page);
  await page.screenshot({ path: resolve(artifacts, "copy-selection.png") });
  await page.locator("#monsterDetailsClose").click();
  await page.locator("#monsterRole").click();
  assert.equal(await page.locator(".monster-item img").count(), 9);
  await page.locator(".monster-item img").evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await page.screenshot({ path: resolve(artifacts, "role.png") });
  await page.locator(".monster-paperdoll .monster-item").first().click();
  assert.equal(await page.locator("#monsterItemDetails").evaluate((dialog) => dialog.open), true);
  await page.locator("#monsterItemClose").click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#monsterDetails").evaluate((dialog) => dialog.open), false);
  await page.waitForFunction(() => document.activeElement === document.getElementById("monsterRole"));
  assert.equal(await page.locator("#monsterRole").evaluate((button) => document.activeElement === button), true);
  await page.locator("#monsterBag").click();
  assert.match(await page.locator("#monsterDetailsContent").textContent(), /暂时没有材料/);
  await page.locator("#monsterDetailsClose").click();

  await page.locator("#monsterSkills").click();
  assert.equal(await page.locator(".monster-skill-card").count(), 16);
  await page.getByRole("checkbox", { name: "重击", exact: true }).check();
  await page.waitForFunction(() => document.getElementById("monsterSaveStatus").textContent.includes("已保存"));
  assert.ok((await saved(page)).player.equippedSkillIds.includes(2));
  await page.screenshot({ path: resolve(artifacts, "skills.png") });
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
  await quota.locator("#monsterSaveRetry").waitFor({ state: "hidden" });
  assert.equal((await saved(quota)).gold, 1000);
  assert.equal(await quota.locator("#monsterSaveRetry").isVisible(), false);

  const corrupt = await pageFor({ corrupt: true });
  assert.match(await corrupt.locator("#monsterStatus").textContent(), /存档读取失败/);
  assert.equal(await corrupt.locator("#monsterEnter").isDisabled(), true);
  assert.deepEqual(await saved(corrupt), {});
  const rare = await pageFor({ roll: 0 }); await create(rare);
  await fight(rare);
  assert.equal(await rare.locator("body").getAttribute("data-monster-stage"), "result");
  const auto = await pageFor(); await create(auto);
  await auto.locator("#monsterAdventure").click();
  await auto.getByLabel("连续自动战斗").check();
  await auto.locator('[data-copy-id="1001"]').click();
  await stage(auto, "result");
  await stage(auto, "battle");
  await auto.locator("#monsterStop").click();
  await stage(auto, "result");
  assert.equal((await saved(auto)).progress.copies.find((row) => row.id === 1001).value, 2);
  const other = await auto.context().newPage();
  await other.goto(`${origin}/monster.html`); await stage(other, "menu");
  await other.evaluate(({ key, token }) => localStorage.setItem(key, JSON.stringify({ access_token: token, user: { id: "member" }, expires_at: "2099-01-01T00:00:00Z" })), { key, token: fixtures.get(auto).tokens.get("member") });
  await stage(auto, "menu");
  assert.equal(await auto.locator("#monsterEnter").textContent(), "开始游戏");
  assert.equal(await saved(auto, "member"), undefined);
  await create(auto);
  assert.equal((await saved(auto, "member")).gold, 1000);
  assert.equal((await saved(auto)).progress.copies.find((row) => row.id === 1001).value, 2);
  const host = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  contexts.push(host);
  host.on("requestfailed", (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
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
  await stage(home, "error");
  assert.ok(!homeRequests.some((url) => /mobile-diary-controller-/.test(url)), "shortcut navigation loaded the unrelated diary gesture controller");
  assert.match(await home.locator("#monsterStatus").textContent(), /登录/);
  assert.ok(["/monster", "/monster.html"].includes(new URL(home.url()).pathname));
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(`Monster ${browserType.name()} passed: cloud save, native win, reload, level-up, selection, drops, dialogs, 6 widths, save retry, corrupt save, CSP and resource isolation.`);
} catch (error) {
  for (const page of fixtures.keys()) console.error(await page.locator("#monsterStatus").textContent());
  console.error(errors);
  console.error("Failed requests:", requestFailures);
  throw error;
} finally {
  await Promise.all(contexts.map((context) => context.close()));
  for (const fixture of fixtures.values()) fixture.close();
  await browser.close();
  await new Promise((done) => server.close(done));
}
