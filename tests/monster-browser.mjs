import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readWorkboxManifest } from "../scripts/workbox-manifest.mjs";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";
import { createWorkerFixture } from "./fixtures/memory-d1.mjs";
import worker from "../cloudflare-worker/src/worker.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createCatalogEquipment } from "../modules/monster/item-domain.js";

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
const iphone13 = process.argv.includes("--iphone13");
const key = "life-vlog-cloudflare-auth";
const fixtures = new Map();
const errors = [];
const requestFailures = [];
const external = [];
const contexts = [];
let keyboardChecked = false;
const artifacts = resolve("artifacts/monster");
await mkdir(artifacts, { recursive: true });

async function pageFor({ roll = 0x13579bdf, corrupt = false, blocked = false, saveStatus = 0, defeat = false, trial = false, trialRewards = false, workshop = false, navigation = false, colorScheme = "dark", reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ ...(iphone13 ? devices["iPhone 13"] : {}), viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, colorScheme, reducedMotion });
  contexts.push(context);
  context.on("requestfailed", (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  const fixture = createWorkerFixture({ origin });
  if (trial || workshop || navigation) {
    const [items, skills] = await Promise.all(["item", "skill"].map(async (name) => JSON.parse(await readFile(resolve(root, `monster/data/${name}.json`), "utf8"))));
    const seed = createNewGame({ items, skills }); seed.player.name = "功能测试勇者";
    if (trial || navigation) { seed.player.level = 80; seed.player.equipmentSets[0][0].attributes.push(...[1, 2, 3, 4].map((type) => ({ type, value: 10000000 }))); }
    if (navigation) { seed.progress.chapterId = 3; seed.progress.levelId = 1; }
    if (workshop) {
      seed.gold = 10000000; seed.money = 10000;
      seed.inventory.goods.push(...[5003, 5004, 5038, 5046, 5048, 5092, 5040, 5052, 5044, 5058, 5042, 5065, 5063].map((id) => ({ id, type: 1, quantity: 1000 })), { id: 5002, type: 1, quantity: 100 });
      const artifact = { ...seed.player.equipmentSets[0][0], equipped: false, quality: 6, godLevel: 1, godOffset: 0, godUpgradeCount: 0, attributes: [{ type: 16, value: 1 }] };
      const templates = JSON.parse(await readFile(resolve(root, "monster/data/equipment-templates.json"), "utf8"));
      seed.inventory.equipment.push(artifact, structuredClone(artifact), createCatalogEquipment({ row: items.find((item) => item.id === 6802), template: templates[6802] }));
    }
    if (trialRewards) seed.trial = { hard: 3, level: 14, score: 4000, status: "ended", bestScores: { 3: 4000 }, rewards: [] };
    fixture.DB.database.prepare("insert into monster_saves values (?, ?, ?, ?)").run("owner", JSON.stringify(seed), 1, "2030-01-01T00:00:00Z");
    await context.addInitScript(() => {
      const schedule = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => schedule(callback, [550, 450].includes(delay) ? 0 : delay, ...args);
    });
  }
  if (corrupt) fixture.DB.database.prepare("insert into monster_saves values (?, ?, ?, ?)").run("owner", "{}", 1, "2030-01-01T00:00:00Z");
  let page;
  await context.route("**/*", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (defeat && ["/monster/data/copy.json", "/monster/data/enemy.json"].includes(pathname)) {
      const response = await route.fetch(); const data = await response.json();
      if (pathname.endsWith("/copy.json")) data.find((row) => row.id === 1001).enemyid2 = 900001;
      else data.push({ ...data.find((row) => row.id === 4001), id: 900001, name: "测试强敌", hp: 1000000, att: 1000000, def: 100000, hit: 1000000, spo: 0, skillid1: 0, skillid2: 0 });
      return route.fulfill({ response, json: data });
    }
    if (iphone13 && /\/assets\/monster-[^/]+\.css$/.test(new URL(route.request().url()).pathname)) {
      const response = await route.fetch();
      const css = (await response.text()).replaceAll("env(safe-area-inset-top)", "47px").replaceAll("env(safe-area-inset-bottom)", "34px").replaceAll("env(safe-area-inset-left)", "0px").replaceAll("env(safe-area-inset-right)", "0px");
      return route.fulfill({ response, body: css });
    }
    if (new URL(route.request().url()).pathname === "/api/monster/save") {
      const request = route.request();
      if (request.method() === "PUT" && saveStatus) return route.fulfill({ status: saveStatus, headers: { "access-control-allow-origin": origin }, contentType: "application/json", body: JSON.stringify({ error: "fixture account/version recovery" }) });
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
  if (iphone13) await context.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
  page = await context.newPage();
  fixtures.set(page, fixture);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("503") && !(saveStatus && message.text().includes(String(saveStatus)))) errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400 && response.status() !== 503 && !(saveStatus && response.status() === saveStatus && new URL(response.url()).pathname === "/api/monster/save")) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${origin}/monster.html`);
  await page.waitForFunction(() => ["menu", "error"].includes(document.body.dataset.monsterStage));
  return page;
}
const stage = (page, value) => page.waitForFunction((value) => document.body.dataset.monsterStage === value, value);
async function tapNative(page, name) {
  const point = await page.evaluate((name) => {
    function find(node) { if (node.getName?.() === name) return node; for (const child of node.getChildren?.() || []) { const found = find(child); if (found) return found; } }
    const node = find(cc.director.getRunningScene());
    const p = node.convertToWorldSpace(cc.p(node.width / 2, node.height / 2));
    const frame = document.getElementById("monsterFrame").getBoundingClientRect();
    return { x: frame.left + p.x / cc.winSize.width * frame.width, y: frame.top + (cc.winSize.height - p.y) / cc.winSize.height * frame.height };
  }, name);
  if (iphone13) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
const saved = async (page, user = "owner") => {
  const row = fixtures.get(page).DB.database.prepare("select state_json from monster_saves where user_id = ?").get(user);
  return row ? JSON.parse(row.state_json) : undefined;
};
async function create(page) {
  await page.locator("#monsterEnter").click();
  if (iphone13 && !keyboardChecked) {
    await page.evaluate(() => document.documentElement.style.setProperty("--monster-visible-height", "460px"));
    await page.locator('#monsterNewGameForm button[type="submit"]').scrollIntoViewIfNeeded();
    const box = await page.locator("#monsterNewGame").boundingBox();
    assert.ok(box.y >= 47 && box.y + box.height <= 460 - 34, `keyboard covered the role form: ${JSON.stringify(box)}`);
    await page.screenshot({ path: resolve(artifacts, "iphone13-keyboard.png") });
    await page.evaluate(() => document.documentElement.style.setProperty("--monster-visible-height", `${visualViewport.height}px`));
    keyboardChecked = true;
  }
  await page.locator("#monsterName").fill("验证勇者");
  await page.locator('#monsterNewGameForm button[type="submit"]').click();
  await stage(page, "home");
}
async function fight(page, copyId = 1001) {
  await page.locator("#monsterAdventure").click();
  await page.locator(`[data-copy-id="${copyId}"]`).click();
  await stage(page, "battle");
  if (iphone13) {
    const top = await page.evaluate(() => {
      const tops = []; function walk(node) { if (node.getString?.().startsWith("Lv.")) { const p = node.convertToWorldSpace(cc.p(0, node.height)); tops.push((cc.winSize.height - p.y) / cc.winSize.height * innerHeight); } for (const child of node.getChildren?.() || []) walk(child); }
      walk(cc.director.getRunningScene()); return Math.min(...tops);
    });
    const back = await page.locator(".monster-host-header a").boundingBox();
    assert.ok(Number.isFinite(top) && top >= back.y + back.height + 7, `battle HUD entered the notch/header: ${top}`);
    await page.screenshot({ path: resolve(artifacts, "iphone13-battle.png") });
  }
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
  if (iphone13) {
    const layout = await page.evaluate(() => {
      function find(node) { if (node.getName?.() === "text_level") return node; for (const child of node.getChildren?.() || []) { const found = find(child); if (found) return found; } }
      const level = find(cc.director.getRunningScene());
      const p = level.convertToWorldSpace(cc.p(0, level.height));
      const frame = document.getElementById("monsterFrame").getBoundingClientRect();
      const back = document.querySelector(".monster-host-header a").getBoundingClientRect();
      const nav = document.querySelector(".monster-controls").getBoundingClientRect();
      return { levelTop: frame.top + (cc.winSize.height - p.y) / cc.winSize.height * frame.height, backBottom: back.bottom, navBottom: nav.bottom, screen: innerHeight, dpr: devicePixelRatio };
    });
    assert.equal(layout.dpr, 3);
    assert.ok(layout.levelTop >= layout.backBottom + 7, JSON.stringify(layout));
    await page.screenshot({ path: resolve(artifacts, "iphone13-standalone-home.png") });
    const bounds = await page.locator("#monsterEnter").boundingBox();
    assert.ok(bounds.y + bounds.height <= 844 - 34, "navigation entered the home-indicator area");
  }
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
  assert.ok(levelText.top >= 0 && levelText.top < (iphone13 ? 160 : 100), `HUD moved away from the safe top: ${levelText.top}`);
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
  await page.locator('[data-copy-type="6"]').click();
  assert.equal(await page.locator(".monster-trial-panel").count(), 1);
  assert.equal(await page.locator('[data-copy-id="3101"]').isDisabled(), true);
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
  await page.evaluate(() => { window.monsterFixtureBlockSave = true; });
  await page.getByRole("checkbox", { name: "重击", exact: true }).uncheck();
  await page.locator("#monsterDetails > #monsterToast").waitFor({ state: "visible" });
  assert.match(await page.locator("#monsterToast").textContent(), /保存失败/);
  assert.ok((await saved(page)).player.equippedSkillIds.includes(2));
  await page.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await page.locator("#monsterDetailsClose").click();
  await page.locator("#monsterSaveRetry").click();
  await page.locator("#monsterSaveRetry").waitFor({ state: "hidden" });
  assert.ok(!(await saved(page)).player.equippedSkillIds.includes(2));

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
  const defeated = await pageFor({ defeat: true }); await create(defeated);
  await defeated.locator("#monsterAdventure").click();
  await defeated.getByLabel("连续自动战斗").check();
  await defeated.locator('[data-copy-id="1001"]').click();
  await stage(defeated, "result");
  assert.match(await defeated.locator("#monsterStatus").textContent(), /战败，已保留 1 只怪物收益/);
  const retained = await saved(defeated);
  assert.deepEqual([retained.gold, retained.player.experience, retained.progress.levelId], [1117, 15, 1]);
  assert.ok(!retained.progress.copies.some((row) => row.id === 1001));
  await defeated.locator("#monsterStop").waitFor({ state: "hidden" });
  await defeated.screenshot({ path: resolve(artifacts, "defeat-retained.png") });
  await defeated.reload(); await stage(defeated, "menu");
  assert.deepEqual(await saved(defeated), retained);
  const auto = await pageFor(); await create(auto);
  await auto.locator("#monsterAdventure").click();
  await auto.getByLabel("连续自动战斗").check();
  await auto.locator('[data-copy-id="1001"]').click();
  await stage(auto, "result");
  await stage(auto, "battle");
  await auto.locator("#monsterStop").click();
  await stage(auto, "result");
  assert.equal((await saved(auto)).progress.copies.find((row) => row.id === 1001).value, 2);
  // Exercise the result canvas itself, including restoring a non-default chapter
  // and both scroll positions after a real map challenge.
  const navigationPage = await pageFor({ navigation: true, roll: 4, reducedMotion: "reduce" });
  await navigationPage.locator("#monsterEnter").click(); await stage(navigationPage, "home");
  await navigationPage.locator("#monsterAdventure").click();
  await navigationPage.locator('[data-chapter-id="2"]').click();
  const challenge = navigationPage.locator('[data-copy-id="1010"]');
  await challenge.scrollIntoViewIfNeeded();
  await navigationPage.locator(".monster-chapter-rail").evaluate((rail) => { rail.scrollLeft = 400; });
  const mapPosition = await navigationPage.evaluate(() => ({
    top: document.querySelector(".monster-adventure-content").scrollTop,
    left: document.querySelector(".monster-chapter-rail").scrollLeft,
  }));
  assert.ok(mapPosition.top > 0 && mapPosition.left > 0, JSON.stringify(mapPosition));
  await challenge.click(); await stage(navigationPage, "result");
  await tapNative(navigationPage, "text_backtips");
  await navigationPage.locator(".monster-adventure-content").waitFor();
  assert.equal(await navigationPage.locator('[data-copy-type="1"]').getAttribute("aria-pressed"), "true");
  assert.equal(await navigationPage.locator('[data-chapter-id="2"]').getAttribute("aria-current"), "true");
  const restoredPosition = await navigationPage.evaluate(() => ({
    top: document.querySelector(".monster-adventure-content").scrollTop,
    left: document.querySelector(".monster-chapter-rail").scrollLeft,
  }));
  assert.deepEqual(restoredPosition, mapPosition);
  await navigationPage.locator("#monsterDetailsClose").click(); await stage(navigationPage, "home");

  const trialPage = await pageFor({ trial: true, roll: 4, reducedMotion: "reduce" });
  await trialPage.locator("#monsterEnter").click(); await stage(trialPage, "home");
  async function openTrial() {
    await trialPage.locator("#monsterAdventure").click();
    await trialPage.locator('[data-copy-type="6"]').click();
  }
  await openTrial();
  await trialPage.locator('[data-trial-hard="2"]').click();
  await noOverflow(trialPage); await accessible(trialPage);
  await trialPage.locator('[data-copy-id="3101"]').click();
  await trialPage.locator(".monster-trial-panel h2").filter({ hasText: "第 2 层" }).waitFor();
  assert.deepEqual([(await saved(trialPage)).trial.level, (await saved(trialPage)).trial.score, (await saved(trialPage)).trial.hard], [2, 86, 2]);
  await trialPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-trial-next.png" : "trial-next.png") });
  await trialPage.reload(); await stage(trialPage, "menu");
  await trialPage.locator("#monsterEnter").click(); await stage(trialPage, "home"); await openTrial();
  assert.match(await trialPage.locator(".monster-trial-panel h2").textContent(), /第 2 层/);
  assert.equal(await trialPage.locator('[data-trial-hard="1"]').isDisabled(), true);
  await trialPage.locator('[data-copy-id="3101"]').click();
  await trialPage.locator(".monster-trial-panel h2").filter({ hasText: "第 3 层" }).waitFor();
  assert.equal((await saved(trialPage)).trial.score, 184);
  await trialPage.evaluate(() => { window.monsterFixtureBlockSave = true; });
  await trialPage.locator("[data-trial-claim]").click();
  await trialPage.locator(".monster-trial-receipt").waitFor();
  assert.equal((await saved(trialPage)).trial.status, "ready");
  assert.match(await trialPage.locator("#monsterSaveStatus").textContent(), /保存失败/);
  await trialPage.locator("#monsterDetailsClose").click();
  await trialPage.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await trialPage.locator("#monsterSaveRetry").click(); await trialPage.locator("#monsterSaveRetry").waitFor({ state: "hidden" });
  const trialClaimed = await saved(trialPage);
  assert.equal(trialClaimed.trial.status, "claimed");
  assert.ok(trialClaimed.inventory.goods.some((item) => item.id === 5116 && item.quantity === 2));
  await trialPage.reload(); await stage(trialPage, "menu");
  await trialPage.locator("#monsterEnter").click(); await stage(trialPage, "home"); await openTrial();
  assert.equal(await trialPage.locator("[data-trial-claim]").count(), 0);
  assert.match(await trialPage.locator(".monster-trial-receipt").textContent(), /已入背包/);
  assert.deepEqual(await saved(trialPage), trialClaimed);
  await accessible(trialPage); await noOverflow(trialPage);
  await trialPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-trial-rewards.png" : "trial-rewards.png") });
  const prizePage = await pageFor({ trial: true, trialRewards: true, roll: 0, reducedMotion: "reduce" });
  await prizePage.locator("#monsterEnter").click(); await stage(prizePage, "home");
  await prizePage.locator("#monsterAdventure").click(); await prizePage.locator('[data-copy-type="6"]').click();
  assert.equal(await prizePage.locator('[data-copy-id="3101"]').count(), 0);
  await prizePage.locator("[data-trial-claim]").click(); await prizePage.locator(".monster-trial-receipt").waitFor();
  assert.equal((await saved(prizePage)).inventory.pets.length, 2);
  assert.equal(await prizePage.locator(".monster-trial-receipt .monster-pet").count(), 2);
  await prizePage.locator(".monster-trial-receipt img").evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await accessible(prizePage); await noOverflow(prizePage);
  await prizePage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-trial-all-prizes.png" : "trial-all-prizes.png"), fullPage: true });
  await prizePage.locator("#monsterDetailsClose").click(); await prizePage.locator("#monsterBag").click();
  await prizePage.getByRole("button", { name: "宠物", exact: true }).click();
  assert.equal(await prizePage.locator("#monsterDetailsContent .monster-pet").count(), 2);
  const smithPage = await pageFor({ workshop: true, roll: 0, reducedMotion: "reduce" });
  await smithPage.locator("#monsterEnter").click(); await stage(smithPage, "home");
  await tapNative(smithPage, "btn_task"); await smithPage.locator("[data-task-id='64']").waitFor();
  await smithPage.locator("[data-task-id='64'] button").click();
  await smithPage.waitForFunction(() => document.querySelector("[data-task-id='64'] button").textContent === "已领取");
  assert.equal((await saved(smithPage)).inventory.goods.find((item) => item.id === 5003).quantity, 990);
  await smithPage.locator("[data-daily-reward]").click();
  await smithPage.waitForFunction(() => document.querySelector("[data-daily-reward]").disabled);
  assert.equal((await saved(smithPage)).inventory.goods.find((item) => item.id === 5009).quantity, 5);
  await accessible(smithPage); await noOverflow(smithPage);
  await smithPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-tasks.png" : "tasks.png") });
  await smithPage.locator("#monsterDetailsClose").click();
  await tapNative(smithPage, "btn_blacksmith"); await smithPage.locator(".monster-workshop-content").waitFor();
  await smithPage.locator(".monster-workshop-content .monster-item").first().click();
  await smithPage.locator('[data-upgrade="strength"]').click();
  await smithPage.locator(".monster-upgrade-summary h3").filter({ hasText: "+1" }).waitFor();
  assert.equal((await saved(smithPage)).player.equipmentSets[0][0].strength, 1);
  await smithPage.locator('[data-upgrade="reforge"]').click();
  await smithPage.locator(".monster-upgrade-summary").filter({ hasText: "普通 · 1" }).waitFor();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = true; });
  await smithPage.locator('[data-upgrade="enchantGold"]').click();
  await smithPage.locator(".monster-upgrade-summary").filter({ hasText: "攻击 +25" }).waitFor();
  assert.equal((await saved(smithPage)).player.equipmentSets[0][0].enchantment, undefined);
  await smithPage.locator('[data-upgrade="strength"]').click();
  await smithPage.locator("#monsterToast").filter({ hasText: "请先重试保存当前进度" }).waitFor();
  assert.equal(await smithPage.locator('[data-upgrade="strength"]').isEnabled(), true);
  await smithPage.locator("#monsterDetailsClose").click();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await smithPage.locator("#monsterSaveRetry").click(); await smithPage.locator("#monsterSaveRetry").waitFor({ state: "hidden" });
  await tapNative(smithPage, "btn_blacksmith"); await smithPage.locator(".monster-workshop-content .monster-item").first().click();
  assert.equal(await smithPage.locator('[data-upgrade="strength"]').isEnabled(), true);
  await smithPage.locator('[data-upgrade="strength"]').click();
  await smithPage.locator(".monster-upgrade-summary h3").filter({ hasText: "+2" }).waitFor();
  const upgraded = await saved(smithPage);
  assert.equal(upgraded.player.equipmentSets[0][0].strength, 2);
  assert.equal(upgraded.player.equipmentSets[0][0].enchantment.value, 25);
  await smithPage.reload(); await stage(smithPage, "menu");
  assert.deepEqual(await saved(smithPage), upgraded);
  await smithPage.locator("#monsterEnter").click(); await stage(smithPage, "home");
  await tapNative(smithPage, "btn_blacksmith"); await smithPage.locator(".monster-workshop-content .monster-item").first().click();
  await accessible(smithPage); await noOverflow(smithPage);
  await smithPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-upgrades.png" : "upgrades.png") });
  await smithPage.locator("#monsterDetailsClose").click();
  await tapNative(smithPage, "btn_strength"); await smithPage.locator(".monster-workshop-content").waitFor();
  const beforeCraft = await saved(smithPage);
  await smithPage.getByRole("button", { name: "打造与合成" }).click();
  await smithPage.locator("[data-recipe-id='6002']").click();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = true; });
  await smithPage.locator("[data-craft-item='6002']").click();
  await smithPage.locator(".monster-upgrade-receipt").waitFor();
  assert.deepEqual(await saved(smithPage), beforeCraft);
  await smithPage.locator("#monsterDetailsClose").click();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await smithPage.locator("#monsterSaveRetry").click(); await smithPage.locator("#monsterSaveRetry").waitFor({ state: "hidden" });
  const crafted = await saved(smithPage);
  assert.equal(crafted.gold, beforeCraft.gold - 1);
  for (const [id, cost] of [[5038, 5], [5046, 3], [5048, 2]]) assert.equal(crafted.inventory.goods.find((item) => item.id === id).quantity, beforeCraft.inventory.goods.find((item) => item.id === id).quantity - cost);
  assert.equal(crafted.inventory.equipment.filter((item) => item.id === 6002).length, 1);
  await tapNative(smithPage, "btn_blacksmith"); await smithPage.getByRole("button", { name: "熔炼", exact: true }).click();
  await smithPage.locator("[data-smelt-mode='goods']").click();
  await smithPage.locator("[data-smelt-goods='5002']").fill("10");
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = true; });
  await smithPage.locator("[data-smelt-confirm]").click();
  await smithPage.locator(".monster-smelt-summary").filter({ hasText: "产物已入背包" }).waitFor();
  assert.deepEqual(await saved(smithPage), crafted);
  await smithPage.locator("#monsterDetailsClose").click();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await smithPage.locator("#monsterSaveRetry").click(); await smithPage.locator("#monsterSaveRetry").waitFor({ state: "hidden" });
  const materialSmelt = await saved(smithPage);
  assert.equal(materialSmelt.gold, crafted.gold - 80000);
  assert.equal(materialSmelt.inventory.goods.find((item) => item.id === 5002).quantity, 90);
  assert.equal(materialSmelt.inventory.goods.find((item) => item.id === 5104).quantity, 1);
  await tapNative(smithPage, "btn_blacksmith"); await smithPage.getByRole("button", { name: "熔炼", exact: true }).click();
  await smithPage.locator("[data-smelt-equipment='0']").check();
  await smithPage.locator("[data-smelt-confirm]").click();
  await smithPage.locator(".monster-smelt-summary").filter({ hasText: "产物已入背包" }).waitFor();
  const equipmentSmelt = await saved(smithPage);
  assert.equal(equipmentSmelt.gold, materialSmelt.gold - 20000);
  assert.equal(equipmentSmelt.inventory.equipment.filter((item) => item.id === 6001 && item.godLevel === 1).length, 1);
  assert.equal(equipmentSmelt.inventory.equipment.some((item) => item.id === 6913), true);
  await accessible(smithPage); await noOverflow(smithPage);
  await smithPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-smelt.png" : "smelt.png") });
  await smithPage.reload(); await stage(smithPage, "menu");
  assert.deepEqual(await saved(smithPage), equipmentSmelt);
  await smithPage.locator("#monsterEnter").click(); await stage(smithPage, "home");
  await smithPage.evaluate(() => { let next = 1; crypto.getRandomValues = (array) => { array.fill(next++); return array; }; });
  await tapNative(smithPage, "btn_blacksmith");
  await smithPage.locator(".monster-bag-grid").last().locator('button[title="新手铁剑"]').click();
  await smithPage.locator("[data-open-god-upgrade]").click();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = true; });
  await smithPage.locator("[data-god-upgrade='upgrade']").click();
  await smithPage.locator(".monster-upgrade-summary h3").filter({ hasText: "2 星" }).waitFor();
  await smithPage.locator(".monster-upgrade-summary").filter({ hasText: "伤害减免 +1" }).waitFor();
  assert.deepEqual(await saved(smithPage), equipmentSmelt);
  await smithPage.locator("#monsterDetailsClose").click();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await smithPage.locator("#monsterSaveRetry").click(); await smithPage.locator("#monsterSaveRetry").waitFor({ state: "hidden" });
  let godState = await saved(smithPage);
  assert.deepEqual(godState.inventory.equipment.find((item) => item.godLevel === 2).attributes.slice(-2).map((item) => item.type), [16, 17]);
  await tapNative(smithPage, "btn_blacksmith");
  await smithPage.locator(".monster-bag-grid").last().locator('button[title="新手铁剑"]').click();
  await smithPage.locator("[data-open-god-upgrade]").click();
  await smithPage.locator("[data-god-upgrade='reset']").click();
  await smithPage.locator(".monster-upgrade-summary").filter({ hasText: "暴击 +1" }).waitFor();
  await smithPage.locator("[data-god-upgrade='upgrade']").click();
  await smithPage.getByRole("button", { name: "确认升星" }).click();
  await smithPage.locator(".monster-upgrade-summary h3").filter({ hasText: "3 星" }).waitFor();
  godState = await saved(smithPage);
  assert.deepEqual(godState.inventory.equipment.find((item) => item.godLevel === 3).attributes.slice(-3).map((item) => item.type), [16, 23, 24]);
  await smithPage.locator("#monsterDetailsClose").click();
  godState.player.level = 30;
  fixtures.get(smithPage).DB.database.prepare("update monster_saves set state_json = ? where user_id = ?").run(JSON.stringify(godState), "owner");
  await smithPage.reload(); await stage(smithPage, "menu");
  await smithPage.locator("#monsterEnter").click(); await stage(smithPage, "home");
  await tapNative(smithPage, "btn_blacksmith");
  await smithPage.locator(".monster-bag-grid").last().locator('button[title="经验卷轴"]').click();
  await smithPage.locator("[data-special-upgrade]").click();
  await smithPage.locator(".monster-upgrade-summary h3").filter({ hasText: "+1" }).waitFor();
  const badgeBefore = await saved(smithPage);
  assert.equal(badgeBefore.inventory.equipment.find((item) => item.id === 6802).strength, 1);
  await smithPage.locator("#monsterDetailsClose").click();
  await smithPage.locator("#monsterBag").click();
  await smithPage.getByRole("button", { name: "装备", exact: true }).click();
  await smithPage.locator('.monster-bag-grid button[title="铁匠徽章"]').click();
  await smithPage.locator("#monsterItemDetails").getByRole("button", { name: "穿戴" }).click();
  await smithPage.locator(".monster-bag-grid button[title='铁匠徽章']").waitFor({ state: "detached" });
  const equipped = await saved(smithPage);
  assert.ok(equipped.player.attack > badgeBefore.player.attack);
  assert.equal(equipped.player.equipmentSets[equipped.player.equipmentSetIndex].some((item) => item.id === 6913), true);
  await smithPage.locator("#monsterDetailsClose").click(); await smithPage.locator("#monsterRole").click();
  assert.equal(await smithPage.locator(".monster-gem-equipment > div").count(), 4);
  assert.equal(await smithPage.locator('.monster-gem-equipment button[title="铁匠徽章"]').count(), 1);
  await accessible(smithPage); await noOverflow(smithPage);
  await smithPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-badges.png" : "badges.png") });
  await smithPage.locator("#monsterDetailsClose").click(); await smithPage.locator("#monsterBag").click();
  await smithPage.locator('.monster-bag-grid button[title="普通强化石"]').click();
  await smithPage.locator("[data-manage-bag-item]").click();
  const saleBefore = await saved(smithPage);
  await smithPage.locator("[data-sale-quantity]").fill("0");
  assert.equal(await smithPage.locator("[data-sell-item]").isDisabled(), true);
  await smithPage.locator("[data-sale-quantity]").fill("1.5");
  assert.equal(await smithPage.locator("[data-sell-item]").isDisabled(), true);
  await smithPage.locator("[data-sale-quantity]").fill("7");
  assert.match(await smithPage.locator(".monster-bag-item-preview").textContent(), /金币 700/);
  await accessible(smithPage); await noOverflow(smithPage);
  await smithPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-bag-sale.png" : "bag-sale.png") });
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = true; });
  await smithPage.locator("[data-sell-item]").click();
  await smithPage.locator("[data-bag-save-retry]").waitFor();
  assert.deepEqual(await saved(smithPage), saleBefore);
  await smithPage.locator("[data-bag-save-retry]").click();
  await smithPage.locator(".monster-upgrade-receipt").filter({ hasText: "保存失败" }).waitFor();
  await smithPage.evaluate(() => { window.monsterFixtureBlockSave = false; });
  await smithPage.locator("[data-bag-save-retry]").click();
  await smithPage.locator("[data-bag-save-retry]").waitFor({ state: "detached" });
  const sold = await saved(smithPage);
  assert.equal(sold.gold, saleBefore.gold + 700);
  assert.equal(sold.inventory.goods.find((item) => item.id === 5003).quantity, saleBefore.inventory.goods.find((item) => item.id === 5003).quantity - 7);
  await smithPage.locator('.monster-bag-grid button[title="5魔石"]').click();
  await smithPage.locator("[data-manage-bag-item]").click();
  await smithPage.locator("[data-sale-quantity]").fill("2");
  assert.match(await smithPage.locator(".monster-bag-item-preview").textContent(), /魔石 10/);
  await smithPage.locator("[data-sell-item]").click();
  await smithPage.locator(".monster-upgrade-receipt").filter({ hasText: "出售完成" }).waitFor();
  assert.equal((await saved(smithPage)).money, sold.money + 10);
  await smithPage.locator("#monsterDetailsClose").click();
  const balances = await smithPage.evaluate(() => {
    function find(node, name) { if (node.getName?.() === name) return node; for (const child of node.getChildren?.() || []) { const found = find(child, name); if (found) return found; } }
    return ["label_gold", "label_money"].map((name) => find(cc.director.getRunningScene(), name).getString());
  });
  assert.deepEqual(balances, [String(sold.gold), String(sold.money + 10)]);
  await smithPage.locator("#monsterBag").click();
  await smithPage.getByRole("button", { name: "装备", exact: true }).click();
  await smithPage.locator('.monster-bag-grid button[title="新手铁剑"]').click();
  await smithPage.locator("[data-manage-bag-item]").click();
  assert.equal(await smithPage.locator("[data-sell-item]").isDisabled(), true);
  await smithPage.locator("[data-toggle-item-lock]").click();
  await smithPage.locator('[data-toggle-item-lock][aria-pressed="true"]').waitFor();
  await smithPage.locator("[data-sale-confirm]").check();
  assert.equal(await smithPage.locator("[data-sell-item]").isDisabled(), true);
  assert.equal((await saved(smithPage)).inventory.equipment.find((item) => item.id === 6001).locked, true);
  await accessible(smithPage); await noOverflow(smithPage);
  await smithPage.screenshot({ path: resolve(artifacts, iphone13 ? "iphone13-bag-lock.png" : "bag-lock.png") });
  await smithPage.reload(); await stage(smithPage, "menu");
  await smithPage.locator("#monsterEnter").click(); await stage(smithPage, "home");
  await smithPage.locator("#monsterBag").click(); await smithPage.getByRole("button", { name: "装备", exact: true }).click();
  await smithPage.locator('.monster-bag-grid button[title="新手铁剑"]').click(); await smithPage.locator("[data-manage-bag-item]").click();
  assert.equal(await smithPage.locator("[data-toggle-item-lock]").getAttribute("aria-pressed"), "true");
  await smithPage.locator("[data-toggle-item-lock]").click();
  await smithPage.locator('[data-toggle-item-lock][aria-pressed="false"]').waitFor();
  assert.equal(await smithPage.locator("[data-sale-confirm]").isChecked(), false);
  const decompositionBefore = await saved(smithPage);
  await smithPage.locator("[data-sale-confirm]").check(); await smithPage.locator("[data-sell-item]").click();
  await smithPage.locator(".monster-upgrade-receipt").filter({ hasText: "分解完成" }).waitFor();
  const decomposed = await saved(smithPage);
  assert.equal(decomposed.inventory.equipment.some((item) => item.id === 6001), false);
  assert.equal(decomposed.inventory.goods.find((item) => item.id === 5092).quantity, decompositionBefore.inventory.goods.find((item) => item.id === 5092).quantity + 3);
  assert.equal(decomposed.gold, decompositionBefore.gold);
  assert.equal(await smithPage.getByRole("button", { name: "装备", exact: true }).getAttribute("aria-pressed"), "true");
  await smithPage.reload(); await stage(smithPage, "menu");
  assert.deepEqual(await saved(smithPage), decomposed);
  for (const [saveStatus, recovery] of [[401, "返回登录"], [409, "重载云存档"]]) {
    const recoveryPage = await pageFor({ workshop: true, saveStatus });
    const before = await saved(recoveryPage);
    await recoveryPage.locator("#monsterEnter").click(); await stage(recoveryPage, "home");
    await recoveryPage.locator("#monsterBag").click();
    await recoveryPage.locator('.monster-bag-grid button[title="普通强化石"]').click();
    await recoveryPage.locator("[data-manage-bag-item]").click(); await recoveryPage.locator("[data-sell-item]").click();
    await recoveryPage.locator("#monsterDetails").getByRole("button", { name: recovery, exact: true }).waitFor();
    assert.equal(await recoveryPage.locator("[data-bag-save-retry]").count(), 0);
    assert.deepEqual(await saved(recoveryPage), before);
    if (saveStatus === 409) { await recoveryPage.locator("#monsterDetails").getByRole("button", { name: recovery, exact: true }).click(); await stage(recoveryPage, "menu"); assert.deepEqual(await saved(recoveryPage), before); }
    await recoveryPage.close();
  }
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
  console.log(`Monster ${browserType.name()} passed: bag sales/decomposition/locking, trial, tasks, workshop upgrades, crafting, smelting, badges, god upgrades, result navigation, cloud save and retry, responsive layout, accessibility, CSP and resource isolation.`);
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
